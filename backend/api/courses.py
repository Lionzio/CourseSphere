from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from schemas.course import CourseCreate, CourseResponse, CourseUpdate
from crud import course as crud_course
from api.deps import get_current_user, get_current_teacher
from models.user import User, Role

# Nova importação: Precisamos verificar a matrícula!
from crud.enrollment import get_enrollment

router = APIRouter()


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_teacher
    ),  # RBAC: Apenas Professores ou Admins
):
    """Cria um novo curso. Apenas utilizadores com o papel 'teacher' ou 'admin' têm permissão."""
    return await crud_course.create_course(
        db=db, course=course, creator_id=current_user.id
    )


@router.get("/", response_model=List[CourseResponse])
async def read_courses(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista os cursos. Retorna TODOS os cursos para popular o Catálogo Global."""
    return await crud_course.get_courses(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )


@router.get("/{course_id}", response_model=CourseResponse)
async def read_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Busca os detalhes de um curso específico.
    Regra de Negócio: Exige matrícula ativa, ou privilégios de criador/admin.
    """
    course = await crud_course.get_course_by_id(db=db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso não encontrado.")

    # 1. Se for o Admin ou o Criador do curso, acesso livre
    if current_user.role == Role.admin or course.creator_id == current_user.id:
        return course

    # 2. Se for estudante, verifica estritamente se está matriculado
    enrollment = await get_enrollment(db, user_id=current_user.id, course_id=course_id)
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Você precisa estar matriculado para aceder aos detalhes deste curso.",
        )

    return course


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_update: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),  # RBAC aplicado
):
    """Atualiza um curso. Apenas o criador (ou admin) pode editar."""
    course = await crud_course.get_course_by_id(db=db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso não encontrado.")

    # Regra de negócio: Apenas o criador ou Administradores editam
    if course.creator_id != current_user.id and current_user.role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o criador pode editar este curso.",
        )

    return await crud_course.update_course(
        db=db, db_course=course, course_update=course_update
    )


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),  # RBAC aplicado
):
    """Exclui um curso. Apenas o criador (ou admin) pode deletar."""
    course = await crud_course.get_course_by_id(db=db, course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso não encontrado.")

    # Regra de negócio: Apenas o criador ou Administradores deletam
    if course.creator_id != current_user.id and current_user.role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o criador pode excluir este curso.",
        )

    await crud_course.delete_course(db=db, db_course=course)
