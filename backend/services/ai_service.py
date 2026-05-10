import logging
import textwrap
from google import genai
from groq import AsyncGroq
from core.config import settings

# Configuração de Logs para monitoramento do Router
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Configuração Global dos Clientes (Novo SDK do Google e Groq)
genai_client = (
    genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None
)

groq_client = (
    AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
)


async def generate_lesson_summary(lesson_title: str, content: str) -> str:
    """
    LLM Router utilizando padrão Chain of Responsibility.
    Tenta a API primária (Gemini 2.5 Flash). Em caso de Rate Limit ou erro,
    faz um fallback automático e invisível para o Groq (Llama 3.3).
    """
    # Utilizando dedent para manter o código limpo, legível e sem trailing whitespaces
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

    # 1º Elo da Corrente: Google Gemini 2.5 Flash (Primário)
    try:
        if not genai_client:
            raise ValueError("GEMINI_API_KEY ausente.")

        logger.info("[AI Router] Tentando inferência primária com Google Gemini...")

        # Nova sintaxe assíncrona do SDK google-genai
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash", contents=prompt
        )

        if response.text:
            return response.text

    except Exception as e:
        logger.warning(
            f"[AI Router] Falha no Gemini ({e}). Acionando Fallback para Groq..."
        )

    # 2º Elo da Corrente: Groq (Fallback Resiliente)
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
