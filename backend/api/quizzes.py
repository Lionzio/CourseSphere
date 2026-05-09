from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from api.deps import get_current_user, get_current_teacher
from models.user import User, Role
from crud import quiz as crud_quiz
from crud import lesson as crud_lesson
from crud import course as crud_course
from crud import enrollment as crud_enrollment
from schemas.quiz import QuizCreate, QuizResponse

router = APIRouter()


async def verify_quiz_access(
    lesson_id: int, user: User, db: AsyncSession, require_ownership: bool = False
):
    """
    Motor central de autorização para as avaliações.
    Semelhante aos materiais, mas com contexto isolado para as provas.
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

    # 2. Validação de Leitura (Estudantes Matriculados)
    if not require_ownership and not is_manager:
        is_enrolled = await crud_enrollment.get_enrollment(
            db, user_id=user.id, course_id=course.id
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Matricule-se no curso para realizar esta avaliação.",
            )

    return lesson


@router.post(
    "/lessons/{lesson_id}/quizzes",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz_for_lesson(
    lesson_id: int,
    quiz: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),  # Fail-Fast: RBAC ativo
):
    """Cria um questionário completo (com questões e opções) para uma aula específica."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    # Regra de Negócio: 1 Aula = Máximo de 1 Quiz. Prevenção de conflito no banco de dados.
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
    """Busca a avaliação de uma aula (incluindo as questões)."""
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
    """Remove a avaliação de uma aula. O CASCADE apagará todas as questões e opções."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Nenhuma avaliação para excluir.")

    await crud_quiz.delete_quiz(db, quiz)
