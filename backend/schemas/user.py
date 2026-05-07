from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema para validação dos dados de registro do usuário."""

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """Schema para retornar dados do usuário sem expor a senha."""

    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema para o retorno do JWT."""

    access_token: str
    token_type: str
