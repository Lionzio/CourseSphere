from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.course import Course
from schemas.course import CourseCreate, CourseUpdate


async def create_course(
    db: AsyncSession, course: CourseCreate, creator_id: int
) -> Course:
    db_course = Course(**course.model_dump(), creator_id=creator_id)
    db.add(db_course)
    await db.commit()
    await db.refresh(db_course)
    return db_course


async def get_courses(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Course).offset(skip).limit(limit))
    return result.scalars().all()


async def get_course_by_id(db: AsyncSession, course_id: int) -> Course | None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    return result.scalars().first()


async def update_course(
    db: AsyncSession, db_course: Course, course_update: CourseUpdate
) -> Course:
    update_data = course_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    await db.commit()
    await db.refresh(db_course)
    return db_course


async def delete_course(db: AsyncSession, db_course: Course):
    await db.delete(db_course)
    await db.commit()
