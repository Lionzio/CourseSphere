from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from schemas.lesson import LessonCreate, LessonResponse, LessonUpdate
from crud import lesson as crud_lesson
from crud import course as crud_course
from api.deps import get_current_user
from models.user import User

# Importação do serviço de Inteligência Artificial
from services.ai_service import generate_lesson_summary

router = APIRouter()


# Função auxiliar para garantir o princípio DRY
async def verify_course_ownership(course_id: int, user_id: int, db: AsyncSession):
    course = await crud_course.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso não encontrado.")
    if course.creator_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Apenas o criador do curso pode gerenciar suas aulas.",
        )
    return course


@router.post(
    "/courses/{course_id}/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lesson(
    course_id: int,
    lesson: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_course_ownership(course_id, current_user.id, db)
    return await crud_lesson.create_lesson(db=db, lesson=lesson, course_id=course_id)


@router.get("/courses/{course_id}/lessons", response_model=List[LessonResponse])
async def read_lessons(
    course_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = await crud_course.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso não encontrado.")
    return await crud_lesson.get_lessons_by_course(
        db=db, course_id=course_id, skip=skip, limit=limit
    )


@router.put("/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    lesson_update: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada.")
    await verify_course_ownership(lesson.course_id, current_user.id, db)
    return await crud_lesson.update_lesson(
        db=db, db_lesson=lesson, lesson_update=lesson_update
    )


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada.")
    await verify_course_ownership(lesson.course_id, current_user.id, db)
    await crud_lesson.delete_lesson(db=db, db_lesson=lesson)


# ==========================================
# MOTOR DE INTELIGÊNCIA ARTIFICIAL (SPRINT 6)
# ==========================================
@router.post("/lessons/{lesson_id}/ai-summary", response_model=LessonResponse)
async def generate_smart_summary(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera e salva em cache um Smart Summary em Markdown usando o LLM Router."""
    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada.")

    # Overdelivering de Segurança: Apenas administradores ou o dono do curso podem gastar tokens da API
    await verify_course_ownership(lesson.course_id, current_user.id, db)

    # Sistema de Cache: Se já existe, devolvemos sem bater na API novamente
    if lesson.ai_summary:
        return lesson

    # Prevenção contra falhas: Se a aula não tiver conteúdo, usamos um prompt instrucional de segurança
    # String quebrada em múltiplas linhas para respeitar o limite de caracteres do flake8 (PEP8)
    content_to_use = (
        lesson.content
        if lesson.content and len(lesson.content.strip()) > 10
        else (
            f"Aula introdutória e explicativa sobre o tema: {lesson.title}. "
            "Aborde conceitos fundamentais, teorias e exemplos práticos para os alunos."
        )
    )

    try:
        # Aciona a Chain of Responsibility (Gemini 2.5 -> Fallback Groq)
        summary_markdown = await generate_lesson_summary(lesson.title, content_to_use)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Atualiza a aula com o resumo salvo no banco de dados
    lesson_update = LessonUpdate(ai_summary=summary_markdown)
    updated_lesson = await crud_lesson.update_lesson(
        db, db_lesson=lesson, lesson_update=lesson_update
    )

    return updated_lesson
