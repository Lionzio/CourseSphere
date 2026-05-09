# backend/crud/enrollment.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from models.enrollment import Enrollment
from models.lesson_progress import LessonProgress
from models.lesson import Lesson
from schemas.enrollment import EnrollmentCreate


async def get_enrollment(
    db: AsyncSession, user_id: int, course_id: int
) -> Enrollment | None:
    """Verifica se um aluno já está matriculado em um curso."""
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id,
        )
    )
    return result.scalars().first()


async def get_enrollment_by_id(
    db: AsyncSession, enrollment_id: int
) -> Enrollment | None:
    """Busca uma matrícula pelo seu ID."""
    result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    return result.scalars().first()


async def get_enrollments_by_user(db: AsyncSession, user_id: int) -> list[Enrollment]:
    """Lista todos os cursos em que um aluno está matriculado."""
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.user_id == user_id)
        .order_by(Enrollment.enrolled_at.desc())
    )
    return list(result.scalars().all())


async def create_enrollment(
    db: AsyncSession, enrollment: EnrollmentCreate, user_id: int
) -> Enrollment:
    """Cria uma nova matrícula. A UniqueConstraint no BD impede duplicatas."""
    db_enrollment = Enrollment(user_id=user_id, course_id=enrollment.course_id)
    db.add(db_enrollment)
    await db.commit()
    await db.refresh(db_enrollment)
    return db_enrollment


async def calculate_completion_percentage(
    db: AsyncSession, enrollment_id: int
) -> float:
    """
    Calcula a percentagem de conclusão de um curso para uma matrícula.

    Usa duas subqueries SQL otimizadas com func.count para evitar
    carregar listas completas em memória — solução O(1) em termos de memória.

    Returns:
        float: Valor de 0.0 a 100.0 representando a percentagem concluída.
    """
    # Subquery 1: Total de aulas publicadas do curso desta matrícula
    enrollment = await get_enrollment_by_id(db, enrollment_id)
    if not enrollment:
        return 0.0

    total_lessons_result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.course_id == enrollment.course_id,
            Lesson.status == "published",
        )
    )
    total_lessons: int = total_lessons_result.scalar_one_or_none() or 0

    if total_lessons == 0:
        return 0.0

    # Subquery 2: Total de aulas concluídas pelo aluno nesta matrícula
    completed_lessons_result = await db.execute(
        select(func.count(LessonProgress.id)).where(
            LessonProgress.enrollment_id == enrollment_id
        )
    )
    completed_lessons: int = completed_lessons_result.scalar_one_or_none() or 0

    return round((completed_lessons / total_lessons) * 100, 1)


async def mark_lesson_complete(
    db: AsyncSession, enrollment_id: int, lesson_id: int
) -> LessonProgress:
    """Marca uma aula como concluída para uma matrícula específica."""
    progress = LessonProgress(enrollment_id=enrollment_id, lesson_id=lesson_id)
    db.add(progress)
    await db.commit()
    await db.refresh(progress)
    return progress


async def get_completed_lesson_ids(db: AsyncSession, enrollment_id: int) -> list[int]:
    """Retorna a lista de IDs das aulas já concluídas numa matrícula."""
    result = await db.execute(
        select(LessonProgress.lesson_id).where(
            LessonProgress.enrollment_id == enrollment_id
        )
    )
    return list(result.scalars().all())
