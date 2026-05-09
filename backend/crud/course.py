from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.course import Course
from schemas.course import CourseCreate, CourseUpdate


async def create_course(
    db: AsyncSession, course: CourseCreate, creator_id: int
) -> Course:
    """Cria um novo curso na base de dados associado ao ID do utilizador (creator_id)."""
    db_course = Course(**course.model_dump(), creator_id=creator_id)
    db.add(db_course)
    await db.commit()
    await db.refresh(db_course)
    return db_course


async def get_courses(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100):
    """
    Retorna TODOS os cursos para popular o Catálogo Global da plataforma.
    (O parâmetro user_id foi mantido na assinatura para não quebrar a rota em api/courses.py)
    """
    result = await db.execute(select(Course).offset(skip).limit(limit))
    return result.scalars().all()


async def get_course_by_id(db: AsyncSession, course_id: int) -> Course | None:
    """Busca um curso específico na base de dados através do seu ID único."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    return result.scalars().first()


async def update_course(
    db: AsyncSession, db_course: Course, course_update: CourseUpdate
) -> Course:
    """Aplica uma atualização parcial (apenas os campos enviados) num curso existente."""
    update_data = course_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    await db.commit()
    await db.refresh(db_course)
    return db_course


async def delete_course(db: AsyncSession, db_course: Course):
    """Remove permanentemente um curso da base de dados."""
    await db.delete(db_course)
    await db.commit()
