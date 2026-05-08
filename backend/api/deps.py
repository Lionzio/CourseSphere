import jwt
from jwt.exceptions import InvalidTokenError
from typing import List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from models.user import User
from crud.user import get_user_by_id

# Aponta para a rota de login do Swagger/OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    """Valida o token JWT e retorna o utilizador autenticado."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais de autenticação inválidas ou expiradas.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Descodifica o token usando PyJWT
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    user = await get_user_by_id(db, user_id=int(user_id))
    if user is None:
        raise credentials_exception
    return user


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Fábrica de dependências (Dependency Factory) para o RBAC.
    Garante que o utilizador autenticado possui um dos papéis (roles) permitidos.
    """

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Comparamos o valor do Enum (ex: "student") com a lista de papéis autorizados
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissões insuficientes para realizar esta ação.",
            )
        return current_user

    return role_checker


# Dependências de Permissão pré-instanciadas para uso limpo e modular nas rotas
get_current_admin = require_roles(["admin"])
get_current_teacher = require_roles(["teacher", "admin"])
