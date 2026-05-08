from pydantic import BaseModel, EmailStr, Field, ConfigDict
from models.user import Role


class UserCreate(BaseModel):
    """Schema para validação rigorosa dos dados de registro do usuário."""

    name: str = Field(
        ..., min_length=2, max_length=100, description="Nome completo do usuário"
    )
    email: EmailStr = Field(..., description="Endereço de e-mail válido e único")
    password: str = Field(
        ..., min_length=6, description="Senha com no mínimo 6 caracteres"
    )


class UserResponse(BaseModel):
    """Schema para retornar dados do usuário sem expor informações sensíveis (senha)."""

    id: int = Field(..., description="ID único do usuário no banco de dados")
    name: str = Field(..., description="Nome completo")
    email: EmailStr = Field(..., description="Endereço de e-mail")
    role: Role = Field(
        ..., description="Papel/Nível de acesso do usuário no sistema (RBAC)"
    )

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schema para o retorno do JWT de autenticação."""

    access_token: str = Field(..., description="Token JWT codificado")
    token_type: str = Field(..., description="Tipo do token (ex: bearer)")
