# backend/crud/attempt.py
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from models.attempt import AttemptStatus, QuizAttempt, StudentAnswer
from models.quiz import Quiz, Question
from schemas.attempt import QuizAttemptCreate, QuizGradeUpdate

# ==========================================
# FUNÇÕES DE LEITURA
# ==========================================


async def get_attempt_by_id(db: AsyncSession, attempt_id: int) -> QuizAttempt | None:
    """
    Busca uma tentativa específica com todas as suas respostas e questões
    carregadas via eager loading (evita N+1 queries).
    """
    result = await db.execute(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.answers).joinedload(StudentAnswer.question))
        .where(QuizAttempt.id == attempt_id)
    )
    return result.unique().scalars().first()


async def get_user_attempt(
    db: AsyncSession, user_id: int, quiz_id: int
) -> QuizAttempt | None:
    """
    Verifica se o aluno já realizou esta avaliação.
    Retorna None se o aluno ainda não submeteu respostas.
    """
    result = await db.execute(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.answers).joinedload(StudentAnswer.question))
        .where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id)
    )
    return result.unique().scalars().first()


async def get_all_attempts_for_quiz(
    db: AsyncSession, quiz_id: int
) -> Sequence[QuizAttempt]:
    """
    Retorna todas as tentativas de uma avaliação ordenadas por data de conclusão
    (mais recente primeiro). Utilizado pelo Painel de Correção do professor.
    """
    result = await db.execute(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.answers).joinedload(StudentAnswer.question))
        .where(QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.completed_at.desc())
    )
    return result.unique().scalars().all()


# ==========================================
# MOTOR DO ALUNO (SUBMISSÃO E AUTO-CORREÇÃO)
# ==========================================


async def create_and_grade_attempt(
    db: AsyncSession,
    attempt_in: QuizAttemptCreate,
    quiz_id: int,
    user_id: int,
) -> QuizAttempt:
    """
    Motor de submissão e auto-correção da prova do aluno.

    Máquina de Estados:
    - Prova 100% múltipla escolha → corrige tudo, status = `graded`.
    - Prova com questões abertas → corrige as fechadas, status = `pending_correction`.

    A Nota Final Ponderada (NFP) só é calculada quando todas as questões
    tiverem notas atribuídas.

    Args:
        db: Sessão assíncrona do banco de dados.
        attempt_in: Payload de respostas submetidas pelo aluno.
        quiz_id: ID da avaliação a ser corrigida.
        user_id: ID do aluno que está submetendo.

    Returns:
        O objeto QuizAttempt persistido com respostas e nota (se aplicável).

    Raises:
        ValueError: Se a avaliação não for encontrada no sistema.
    """
    quiz_result = await db.execute(
        select(Quiz)
        .options(joinedload(Quiz.questions).joinedload(Question.options))
        .where(Quiz.id == quiz_id)
    )
    quiz = quiz_result.unique().scalars().first()

    if not quiz:
        raise ValueError("Avaliação não encontrada no sistema.")

    has_open_questions = any(q.question_type == "open" for q in quiz.questions)

    initial_status = (
        AttemptStatus.pending_correction if has_open_questions else AttemptStatus.graded
    )

    db_attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        status=initial_status,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(db_attempt)
    await db.flush()  # Garante que db_attempt.id está disponível para as respostas

    question_map = {q.id: q for q in quiz.questions}
    total_weight = sum(q.weight for q in quiz.questions)
    earned_weighted_score = 0.0

    for ans_in in attempt_in.answers:
        question = question_map.get(ans_in.question_id)
        if not question:
            continue  # Ignora respostas para questões que não pertencem a esta prova

        is_correct: bool | None = None

        if question.question_type == "multiple_choice":
            correct_option = next(
                (opt for opt in question.options if opt.is_correct), None
            )
            if correct_option and ans_in.selected_option_id == correct_option.id:
                is_correct = True
                earned_weighted_score += 100.0 * question.weight
            else:
                is_correct = False

        db.add(
            StudentAnswer(
                attempt_id=db_attempt.id,
                question_id=ans_in.question_id,
                selected_option_id=ans_in.selected_option_id,
                text_answer=ans_in.text_answer,
                is_correct=is_correct,
            )
        )

    # NFP só é calculada quando a prova é 100% auto-corrigível
    if not has_open_questions and total_weight > 0:
        db_attempt.score = round(earned_weighted_score / total_weight, 1)
    elif not has_open_questions:
        db_attempt.score = 0.0

    await db.commit()
    return await get_attempt_by_id(db, db_attempt.id)


# ==========================================
# MOTOR DO PROFESSOR (CORREÇÃO MANUAL)
# ==========================================


async def grade_attempt_manually(
    db: AsyncSession,
    attempt_id: int,
    grading_in: QuizGradeUpdate,
) -> QuizAttempt:
    """
    Aplica as notas do professor nas questões abertas e calcula a Nota Final
    Ponderada (NFP) ao fechar a correção.

    Fórmula NFP = Soma(Nota_da_Questão × Peso) / Soma(Pesos)

    Comportamento de segurança:
    - Salva o progresso parcial se o professor não corrigiu todas as questões abertas.
    - Só transita o status para `graded` quando todas as questões abertas tiverem nota.
    - Lança ValueError se a tentativa já estiver no status `graded`.

    Args:
        db: Sessão assíncrona do banco de dados.
        attempt_id: ID da tentativa a ser corrigida.
        grading_in: Payload com notas e feedbacks do professor.

    Returns:
        O objeto QuizAttempt atualizado.

    Raises:
        ValueError: Se a tentativa não existir ou já estiver corrigida,
                    ou se houver questões abertas sem nota ao tentar fechar.
    """
    db_attempt = await get_attempt_by_id(db, attempt_id)
    if not db_attempt:
        raise ValueError("Tentativa não encontrada.")

    if db_attempt.status == AttemptStatus.graded:
        raise ValueError("Esta avaliação já foi totalmente corrigida.")

    # Mapeia as notas enviadas para acesso O(1)
    grades_map = {g.question_id: g for g in grading_in.grades}

    quiz_result = await db.execute(
        select(Quiz)
        .options(joinedload(Quiz.questions))
        .where(Quiz.id == db_attempt.quiz_id)
    )
    quiz = quiz_result.unique().scalars().first()

    if not quiz:
        raise ValueError("Avaliação associada a esta tentativa não foi encontrada.")

    total_weight = sum(q.weight for q in quiz.questions)
    earned_weighted_score = 0.0
    open_questions_total = 0
    open_questions_graded = 0

    for db_answer in db_attempt.answers:
        question = db_answer.question

        if question.question_type == "multiple_choice":
            if db_answer.is_correct:
                earned_weighted_score += 100.0 * question.weight

        elif question.question_type == "open":
            open_questions_total += 1
            teacher_grade = grades_map.get(question.id)

            if teacher_grade:
                db_answer.manual_score = teacher_grade.manual_score
                db_answer.teacher_feedback = teacher_grade.teacher_feedback

            if db_answer.manual_score is not None:
                open_questions_graded += 1
                earned_weighted_score += db_answer.manual_score * question.weight

    # Salva o progresso parcial e notifica se a correção ainda está incompleta
    if open_questions_graded < open_questions_total:
        await db.commit()
        raise ValueError(
            "Progresso salvo. Há questões discursivas pendentes de correção "
            "para o fechamento da nota final."
        )

    db_attempt.score = (
        round(earned_weighted_score / total_weight, 1) if total_weight > 0 else 0.0
    )
    db_attempt.status = AttemptStatus.graded
    await db.commit()

    return db_attempt
