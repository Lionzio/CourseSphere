from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from api.deps import get_current_user, get_current_teacher
from models.user import User, Role
from crud import quiz as crud_quiz
from crud import lesson as crud_lesson
from crud import course as crud_course
from crud import enrollment as crud_enrollment
from crud import attempt as crud_attempt  # <--- Nova Importação da Sprint 5
from schemas.quiz import QuizCreate, QuizResponse
from schemas.attempt import QuizAttemptCreate, QuizAttemptResponse  # <--- Novos Schemas

router = APIRouter()


async def verify_quiz_access(
    lesson_id: int, user: User, db: AsyncSession, require_ownership: bool = False
):
    """
    Motor central de autorização para as avaliações.
    """
    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada.")

    course = await crud_course.get_course_by_id(db, lesson.course_id)
    is_manager = user.role == Role.admin or course.creator_id == user.id

    # 1. Validação de Escrita (Professor/Admin)
    if require_ownership and not is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o professor do curso pode gerir a avaliação desta aula.",
        )

    # 2. Validação de Leitura/Execução (Estudantes Matriculados)
    if not require_ownership and not is_manager:
        is_enrolled = await crud_enrollment.get_enrollment(
            db, user_id=user.id, course_id=course.id
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Matricule-se no curso para interagir com esta avaliação.",
            )

    return lesson


# ==========================================
# ROTAS DO PROFESSOR (Gestão do Quiz)
# ==========================================


@router.post(
    "/lessons/{lesson_id}/quizzes",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz_for_lesson(
    lesson_id: int,
    quiz: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    """Cria um questionário completo (com questões e opções) para uma aula específica."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    existing_quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if existing_quiz:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta aula já possui uma avaliação ativa. Exclua-a primeiro para criar uma nova.",
        )

    return await crud_quiz.create_quiz(db=db, quiz_in=quiz, lesson_id=lesson_id)


@router.get("/lessons/{lesson_id}/quizzes", response_model=QuizResponse)
async def get_quiz_for_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca a avaliação de uma aula (Gabarito vazio para o aluno responder)."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=404, detail="Nenhuma avaliação encontrada para esta aula."
        )

    return quiz


@router.delete("/lessons/{lesson_id}/quizzes", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz_from_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    """Remove a avaliação de uma aula (Apaga o Quiz, Questões, Opções e Tentativas dos Alunos)."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Nenhuma avaliação para excluir.")

    await crud_quiz.delete_quiz(db, quiz)


# ==========================================
# ROTAS DO ALUNO (Execução e Correção) - SPRINT 5
# ==========================================


@router.post(
    "/lessons/{lesson_id}/quizzes/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_quiz_attempt(
    lesson_id: int,
    attempt: QuizAttemptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submete as respostas de um aluno para auto-correção imediata."""
    # 1. Garante que o aluno está matriculado
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    # 2. Busca a prova correspondente
    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")

    # 3. Anti-Cheat: Impede o aluno de enviar a prova duas vezes
    existing_attempt = await crud_attempt.get_user_attempt(
        db, user_id=current_user.id, quiz_id=quiz.id
    )
    if existing_attempt:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já realizou esta avaliação. Apenas uma tentativa é permitida.",
        )

    # 4. Passa os dados para o Motor de Auto-Correção
    try:
        return await crud_attempt.create_and_grade_attempt(
            db=db, attempt_in=attempt, quiz_id=quiz.id, user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/lessons/{lesson_id}/quizzes/attempts/my", response_model=QuizAttemptResponse
)
async def get_my_quiz_attempt(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca o boletim de notas de uma prova já realizada pelo aluno."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")

    attempt = await crud_attempt.get_user_attempt(
        db, user_id=current_user.id, quiz_id=quiz.id
    )
    if not attempt:
        raise HTTPException(
            status_code=404, detail="Você ainda não realizou esta avaliação."
        )

    return attempt
