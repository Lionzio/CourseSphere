# backend/services/ai_service.py
import json
import logging
import textwrap
from typing import Optional

from google import genai
from google.genai import types as genai_types
from groq import AsyncGroq

from core.config import settings
from schemas.ai_quiz import AIQuizSchema

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ==========================================
# INICIALIZAÇÃO LAZY DOS CLIENTES DE IA
# Evita falha de import quando as chaves ainda não estão no ambiente.
# ==========================================

_genai_client: Optional[genai.Client] = None
_groq_client: Optional[AsyncGroq] = None


def _get_genai_client() -> Optional[genai.Client]:
    """Retorna o cliente Gemini, inicializando-o na primeira chamada."""
    global _genai_client
    if _genai_client is None and settings.GEMINI_API_KEY:
        _genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _genai_client


def _get_groq_client() -> Optional[AsyncGroq]:
    """Retorna o cliente Groq, inicializando-o na primeira chamada."""
    global _groq_client
    if _groq_client is None and settings.GROQ_API_KEY:
        _groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _groq_client


async def generate_lesson_summary(lesson_title: str, content: str) -> str:
    """
    LLM Router utilizando padrão Chain of Responsibility.
    Tenta a API primária (Gemini 2.5 Flash). Em caso de falha,
    faz fallback automático e transparente para o Groq (Llama 3.3).

    Args:
        lesson_title: Título da aula para contextualizar o prompt.
        content: Transcrição ou conteúdo da aula a resumir.

    Returns:
        Resumo em Markdown gerado pelo modelo disponível.

    Raises:
        RuntimeError: Quando todos os nós da IA falharem.
    """
    prompt = textwrap.dedent(f"""\
        Você é um assistente educacional de IA avançado.
        Gere um 'Smart Summary' (Resumo Inteligente) incrivelmente bem estruturado
        em Markdown para a aula '{lesson_title}'.
        Baseie-se exclusivamente no seguinte conteúdo/transcrição:

        {content}

        O resumo deve obrigatoriamente conter:
        - Um parágrafo de introdução cativante.
        - Os conceitos-chave em bullet points.
        - Uma conclusão rápida ou "Takeaway" final.\
    """)

    # 1º Elo: Google Gemini 2.5 Flash (Primário)
    genai_client = _get_genai_client()
    try:
        if not genai_client:
            raise ValueError("GEMINI_API_KEY ausente.")

        logger.info("[AI Router] Tentando inferência primária com Google Gemini...")
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash", contents=prompt
        )
        if response.text:
            return response.text

    except Exception as e:
        logger.warning(
            f"[AI Router] Falha no Gemini ({e}). Acionando Fallback para Groq..."
        )

    # 2º Elo: Groq / Llama 3.3 (Fallback Resiliente)
    groq_client = _get_groq_client()
    try:
        if not groq_client:
            raise ValueError("GROQ_API_KEY ausente.")

        logger.info(
            "[AI Router] Tentando inferência secundária com Groq (Llama 3.3)..."
        )
        chat_completion = await groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            max_tokens=1024,
        )
        return chat_completion.choices[0].message.content

    except Exception as e:
        logger.error(f"[AI Router] Falha crítica. Todos os nós da IA caíram: {e}")
        raise RuntimeError(
            "Não foi possível gerar o resumo inteligente. Tente novamente mais tarde."
        )


async def generate_quiz_from_content(
    lesson_title: str, content: str, num_questions: int = 5
) -> AIQuizSchema:
    """
    Gera um questionário completo a partir do conteúdo de uma aula.

    Utiliza Structured Outputs nativos do SDK google-genai para forçar
    o modelo a retornar um JSON perfeitamente tipado conforme AIQuizSchema,
    eliminando qualquer necessidade de parsing manual ou regex.

    Fallback: Se o Gemini falhar, usa o Groq com parsing manual do JSON
    retornado em texto livre.

    Args:
        lesson_title: Título da aula para contextualizar o prompt.
        content: Conteúdo/transcrição da aula a ser avaliada.
        num_questions: Número de questões a gerar (padrão: 5).

    Returns:
        AIQuizSchema com título, questões, alternativas e pesos validados.

    Raises:
        RuntimeError: Quando todos os nós de IA falharem.
    """

    prompt = textwrap.dedent(f"""\
        Você é um especialista em design instrucional e avaliação educacional.
        Crie uma avaliação completa para a aula '{lesson_title}' com exatamente
        {num_questions} questões baseadas EXCLUSIVAMENTE no conteúdo abaixo.

        CONTEÚDO DA AULA:
        {content}

        REGRAS OBRIGATÓRIAS:
        1. Distribua entre questões de múltipla escolha ('multiple_choice') e
           discursivas ('open'), priorizando múltipla escolha (mínimo 60%).
        2. Cada questão de múltipla escolha deve ter entre 3 e 4 alternativas,
           com EXATAMENTE UMA marcada como is_correct=true.
        3. Questões discursivas ('open') devem ter options=[].
        4. Distribua pesos de forma que a soma total seja {num_questions}.0
           (cada questão com peso 1.0 por padrão, podendo variar).
        5. Questões devem cobrir diferentes partes do conteúdo — não repita tópicos.
        6. Use linguagem clara, objetiva e adequada ao nível do conteúdo fornecido.\
    """)

    # ── 1º Elo: Gemini com Structured Outputs (JSON garantido) ──────────────
    genai_client = _get_genai_client()
    try:
        if not genai_client:
            raise ValueError("GEMINI_API_KEY ausente.")

        logger.info("[AI Quiz Builder] Gerando quiz com Gemini Structured Outputs...")

        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AIQuizSchema,
            ),
        )

        if response.text:
            parsed = AIQuizSchema.model_validate_json(response.text)
            logger.info(
                f"[AI Quiz Builder] Gemini gerou {len(parsed.questions)} questões."
            )
            return parsed

    except Exception as e:
        logger.warning(
            f"[AI Quiz Builder] Falha no Gemini ({e}). "
            "Acionando Fallback para Groq..."
        )

    # ── 2º Elo: Groq com parsing manual do JSON ──────────────────────────────
    groq_client = _get_groq_client()
    try:
        if not groq_client:
            raise ValueError("GROQ_API_KEY ausente.")

        logger.info("[AI Quiz Builder] Gerando quiz com Groq (Llama 3.3)...")

        groq_prompt = (
            prompt + "\n\nRETORNE APENAS O JSON puro, sem markdown, sem ```json, "
            "sem nenhum texto antes ou depois. "
            f"Siga EXATAMENTE este schema: {AIQuizSchema.model_json_schema()}"
        )

        chat_completion = await groq_client.chat.completions.create(
            messages=[{"role": "user", "content": groq_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=2048,
        )

        raw_text = chat_completion.choices[0].message.content

        # Remove possíveis cercas de markdown que o modelo ignore
        clean_text = raw_text.strip()
        if clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:]
            clean_text = clean_text.strip()

        parsed = AIQuizSchema.model_validate(json.loads(clean_text))
        logger.info(f"[AI Quiz Builder] Groq gerou {len(parsed.questions)} questões.")
        return parsed

    except Exception as e:
        logger.error(f"[AI Quiz Builder] Falha crítica. Todos os nós de IA caíram: {e}")
        raise RuntimeError(
            "Não foi possível gerar o questionário. Tente novamente mais tarde."
        )
