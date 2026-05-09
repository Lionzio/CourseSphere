from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from models.attempt import QuizAttempt, StudentAnswer
from models.quiz import Quiz, Question
from schemas.attempt import QuizAttemptCreate


async def get_attempt_by_id(db: AsyncSession, attempt_id: int) -> QuizAttempt | None:
    """Busca uma tentativa específica com todas as suas respostas carregadas."""
    result = await db.execute(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.answers))
        .where(QuizAttempt.id == attempt_id)
    )
    return result.unique().scalars().first()


async def get_user_attempt(
    db: AsyncSession, user_id: int, quiz_id: int
) -> QuizAttempt | None:
    """Verifica se o aluno já realizou esta avaliação (Regra: 1 tentativa por aluno)."""
    result = await db.execute(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.answers))
        .where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id)
    )
    return result.unique().scalars().first()


async def create_and_grade_attempt(
    db: AsyncSession, attempt_in: QuizAttemptCreate, quiz_id: int, user_id: int
) -> QuizAttempt:
    """
    Motor central de Auto-Correção:
    1. Busca o gabarito.
    2. Compara as respostas.
    3. Calcula a nota ponderada (0 a 100).
    4. Salva a tentativa completa.
    """
    # 1. Busca o Quiz com as respostas corretas (Gabarito)
    quiz_result = await db.execute(
        select(Quiz)
        .options(joinedload(Quiz.questions).joinedload(Question.options))
        .where(Quiz.id == quiz_id)
    )
    quiz = quiz_result.unique().scalars().first()

    if not quiz:
        raise ValueError("Avaliação não encontrada no sistema.")

    # Dicionário para acesso O(1) às questões
    question_map = {q.id: q for q in quiz.questions}

    total_earned_weight = 0.0
    total_max_weight = 0.0

    # 2. Inicia o registo da Tentativa
    db_attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(db_attempt)
    await db.flush()  # Gera o ID da tentativa de forma segura

    # 3. Processa e Corrige cada resposta submetida
    for ans_in in attempt_in.answers:
        question = question_map.get(ans_in.question_id)
        if not question:
            continue  # Prevenção contra injeção de IDs inválidos

        is_correct = None

        # Auto-correção para questões de múltipla escolha
        if question.question_type == "multiple_choice":
            total_max_weight += question.weight

            # Encontra a opção correta no gabarito
            correct_option = next(
                (opt for opt in question.options if opt.is_correct), None
            )

            if correct_option and ans_in.selected_option_id == correct_option.id:
                is_correct = True
                total_earned_weight += question.weight
            else:
                is_correct = False

        # Questões abertas ficam aguardando correção manual futura (is_correct = None)
        # não sendo somadas ao total_max_weight da auto-correção imediata.

        db_answer = StudentAnswer(
            attempt_id=db_attempt.id,
            question_id=ans_in.question_id,
            selected_option_id=ans_in.selected_option_id,
            text_answer=ans_in.text_answer,
            is_correct=is_correct,
        )
        db.add(db_answer)

    # 4. Calcula o Score Final (Regra de Três para 100%)
    if total_max_weight > 0:
        final_score = round((total_earned_weight / total_max_weight) * 100, 1)
    else:
        final_score = 0.0  # Caso só existam questões abertas na prova

    db_attempt.score = final_score

    await db.commit()

    # Retorna o objeto completamente preenchido e formatado
    return await get_attempt_by_id(db, db_attempt.id)
