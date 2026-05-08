from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.user import User, Role
from schemas.user import UserCreate
from core.security import get_password_hash


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Busca um usuário no banco de dados através do e-mail (usado para login e validação de duplicidade)."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """Busca um usuário no banco através do ID (utilizado na validação do token JWT)."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()


async def create_user(db: AsyncSession, user: UserCreate) -> User:
    """
    Insere um novo usuário no banco com a senha hasheada.
    Implementa a regra de negócio RBAC (Role-Based Access Control),
    promovendo automaticamente o e-mail mestre a Administrador.
    """
    hashed_password = get_password_hash(user.password)

    # Regra RBAC Hardcoded para definição de privilégios
    assigned_role = (
        Role.admin if user.email == "viniciusleoncio3267@gmail.com" else Role.student
    )

    db_user = User(
        name=user.name, email=user.email, password=hashed_password, role=assigned_role
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
