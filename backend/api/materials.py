from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from api.deps import get_current_user, get_current_teacher
from models.user import User, Role
from crud import material as crud_material
from crud import lesson as crud_lesson
from crud import course as crud_course
from crud import enrollment as crud_enrollment
from schemas.material import MaterialCreate, MaterialResponse

router = APIRouter()


async def verify_material_access(
    lesson_id: int, user: User, db: AsyncSession, require_ownership: bool = False
):
    """
    Motor central de autorização de materiais.
    Garante o princípio DRY e blinda as regras de negócio de leitura e escrita.
    """
    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada.")

    course = await crud_course.get_course_by_id(db, lesson.course_id)

    # Verifica se o utilizador tem direitos de gestão (é o criador ou é Admin)
    is_manager = user.role == Role.admin or course.creator_id == user.id

    # 1. Validação de Escrita (POST/DELETE)
    if require_ownership and not is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o criador do curso ou administradores podem gerir materiais.",
        )

    # 2. Validação de Leitura (GET) para Estudantes
    if not require_ownership and not is_manager:
        is_enrolled = await crud_enrollment.get_enrollment(
            db, user_id=user.id, course_id=course.id
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Matricule-se no curso para aceder aos materiais de apoio.",
            )

    return lesson


@router.post(
    "/lessons/{lesson_id}/materials",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_support_material(
    lesson_id: int,
    material: MaterialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_teacher
    ),  # Fail-Fast: Só Professores/Admins entram aqui
):
    """Anexa um novo material de apoio a uma aula."""
    await verify_material_access(lesson_id, current_user, db, require_ownership=True)
    return await crud_material.create_material(
        db=db, material=material, lesson_id=lesson_id
    )


@router.get("/lessons/{lesson_id}/materials", response_model=List[MaterialResponse])
async def list_lesson_materials(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),  # Todos autenticados podem tentar ler
):
    """Lista todos os materiais de apoio de uma aula específica (Exige Matrícula ou Posse)."""
    await verify_material_access(lesson_id, current_user, db, require_ownership=False)
    return await crud_material.get_materials_by_lesson(db, lesson_id)


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_support_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),  # Fail-Fast
):
    """Remove permanentemente um material de apoio."""
    db_material = await crud_material.get_material_by_id(db, material_id)
    if not db_material:
        raise HTTPException(status_code=404, detail="Material não encontrado.")

    # A verificação de posse é feita com base no ID da aula que o material pertence
    await verify_material_access(
        db_material.lesson_id, current_user, db, require_ownership=True
    )
    await crud_material.delete_material(db, db_material)
