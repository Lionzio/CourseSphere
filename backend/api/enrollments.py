# backend/api/enrollments.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from api.deps import get_current_user
from models.user import User
from crud import enrollment as crud_enrollment
from crud import course as crud_course
from schemas.enrollment import (
    EnrollmentCreate,
    EnrollmentResponse,
    LessonProgressCreate,
    LessonProgressResponse,
)

router = APIRouter()


@router.post(
    "/",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Matricular-se em um curso",
)
async def enroll_in_course(
    enrollment: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Matricula o utilizador autenticado num curso.
    Retorna 409 se já existir uma matrícula ativa para este curso.
    """
    # Verificação 1: O curso existe?
    course = await crud_course.get_course_by_id(db, enrollment.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso não encontrado.")

    # Verificação 2: Já está matriculado?
    existing = await crud_enrollment.get_enrollment(
        db, user_id=current_user.id, course_id=enrollment.course_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já está matriculado neste curso.",
        )

    db_enrollment = await crud_enrollment.create_enrollment(
        db=db, enrollment=enrollment, user_id=current_user.id
    )
    completion = await crud_enrollment.calculate_completion_percentage(
        db, db_enrollment.id
    )
    # Injetamos o campo calculado manualmente pois não é coluna do BD
    db_enrollment.completion_percentage = completion  # type: ignore[attr-defined]
    return db_enrollment


@router.get(
    "/my",
    response_model=List[EnrollmentResponse],
    summary="Listar minhas matrículas",
)
async def list_my_enrollments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna todos os cursos em que o utilizador autenticado está matriculado."""
    enrollments = await crud_enrollment.get_enrollments_by_user(
        db, user_id=current_user.id
    )
    result = []
    for e in enrollments:
        completion = await crud_enrollment.calculate_completion_percentage(db, e.id)
        e.completion_percentage = completion  # type: ignore[attr-defined]
        result.append(e)
    return result


@router.post(
    "/{enrollment_id}/progress",
    response_model=LessonProgressResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Marcar aula como concluída",
)
async def mark_lesson_as_complete(
    enrollment_id: int,
    progress: LessonProgressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marca uma aula específica como concluída para o utilizador autenticado.
    Retorna 409 se a aula já foi marcada anteriormente.
    """
    # Verifica que a matrícula pertence ao utilizador autenticado
    enrollment = await crud_enrollment.get_enrollment_by_id(db, enrollment_id)
    if not enrollment or enrollment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matrícula não encontrada ou não pertence a este utilizador.",
        )

    # Verifica se já foi marcada como concluída
    completed_ids = await crud_enrollment.get_completed_lesson_ids(db, enrollment_id)
    if progress.lesson_id in completed_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta aula já foi marcada como concluída.",
        )

    return await crud_enrollment.mark_lesson_complete(
        db=db, enrollment_id=enrollment_id, lesson_id=progress.lesson_id
    )


@router.get(
    "/{enrollment_id}/progress",
    summary="Consultar progresso de uma matrícula",
)
async def get_enrollment_progress(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna a percentagem de conclusão e as aulas concluídas de uma matrícula."""
    enrollment = await crud_enrollment.get_enrollment_by_id(db, enrollment_id)
    if not enrollment or enrollment.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Matrícula não encontrada.")

    completion = await crud_enrollment.calculate_completion_percentage(
        db, enrollment_id
    )
    completed_ids = await crud_enrollment.get_completed_lesson_ids(db, enrollment_id)

    return {
        "enrollment_id": enrollment_id,
        "course_id": enrollment.course_id,
        "completion_percentage": completion,
        "completed_lesson_ids": completed_ids,
    }
