from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.lesson import Lesson
from schemas.lesson import LessonCreate, LessonUpdate


async def create_lesson(
    db: AsyncSession, lesson: LessonCreate, course_id: int
) -> Lesson:
    db_lesson = Lesson(**lesson.model_dump(), course_id=course_id)
    db.add(db_lesson)
    await db.commit()
    await db.refresh(db_lesson)
    return db_lesson


async def get_lessons_by_course(
    db: AsyncSession, course_id: int, skip: int = 0, limit: int = 100
):
    result = await db.execute(
        select(Lesson).where(Lesson.course_id == course_id).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def get_lesson_by_id(db: AsyncSession, lesson_id: int) -> Lesson | None:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    return result.scalars().first()


async def update_lesson(
    db: AsyncSession, db_lesson: Lesson, lesson_update: LessonUpdate
) -> Lesson:
    update_data = lesson_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lesson, key, value)
    await db.commit()
    await db.refresh(db_lesson)
    return db_lesson


async def delete_lesson(db: AsyncSession, db_lesson: Lesson):
    await db.delete(db_lesson)
    await db.commit()
