from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import get_db
from models.user import User, Role
from schemas.user import UserResponse
from api.deps import get_current_admin
from crud.user import get_user_by_id

# Nova Importação: O nosso módulo de auditoria
from crud.audit import log_audit_action

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),  # Proteção rigorosa: só Admin
):
    """
    Endpoint exclusivo do Administrador.
    Retorna a lista de todos os utilizadores registados no sistema para exibição no Painel.
    """
    result = await db.execute(select(User).order_by(User.id).offset(skip).limit(limit))
    return result.scalars().all()


@router.put("/users/{user_id}/role", response_model=dict)
async def promote_user(
    user_id: int,
    role: Role,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Endpoint exclusivo do Administrador (RBAC).
    Permite alterar o papel (Role) de qualquer utilizador registado no sistema, com registo de auditoria.
    """
    # 1. Busca o utilizador alvo
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado."
        )

    # 2. BLINDAGEM MÁXIMA: Proteção da Conta Mestre
    if user.email == "viniciusleoncio3267@gmail.com" and role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operação bloqueada: A conta mestre é imutável e não pode perder o status de Administrador.",
        )

    # 3. Blindagem de Segurança: Impede que o Admin se auto-despromova
    if user.id == admin.id and role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operação inválida: Não pode remover os seus próprios privilégios de administrador.",
        )

    # 4. Captura o estado anterior para o Log de Auditoria
    old_role = user.role.value
    new_role = role.value

    # Se não houve alteração real, não precisamos gastar processamento ou poluir o log
    if old_role == new_role:
        return {
            "status": "success",
            "message": f"O utilizador já possui o papel '{new_role}'.",
        }

    # 5. Atualização do estado na base de dados
    user.role = role
    await db.commit()

    # 6. Registo de Auditoria (Fire and Forget)
    # Aqui passamos 'admin.id' porque foi o Admin quem executou a ação,
    # e 'user.id' como a entidade afetada.
    await log_audit_action(
        db=db,
        user_id=admin.id,
        action="UPDATE_ROLE",
        entity_name="User",
        entity_id=user.id,
        details={
            "target_email": user.email,
            "old_role": old_role,
            "new_role": new_role,
        },
    )

    return {
        "status": "success",
        "message": f"O papel do utilizador {user.email} foi atualizado de '{old_role}' para '{new_role}'.",
    }
