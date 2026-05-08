from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User, Role
from api.deps import get_current_admin
from crud.user import get_user_by_id

router = APIRouter()


@router.put("/users/{user_id}/role", response_model=dict)
async def promote_user(
    user_id: int,
    role: Role,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Endpoint exclusivo do Administrador (RBAC).
    Permite alterar o papel (Role) de qualquer utilizador registado no sistema.
    Utilizado para promover manualmente 'students' a 'teachers'.
    """
    # 1. Busca o utilizador alvo
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado."
        )

    # 2. Blindagem de Segurança: Impede que o Admin se auto-despromova
    if user.id == admin.id and role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operação inválida: Não pode remover os seus próprios privilégios de administrador.",
        )

    # 3. Atualização do estado na base de dados
    user.role = role
    await db.commit()

    return {
        "status": "success",
        "message": f"O papel do utilizador {user.email} foi atualizado para '{role.value}'.",
    }
