# backend/schemas/material.py
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class MaterialBase(BaseModel):
    """Schema base para materiais de apoio com validação de formato e tipo."""

    title: str = Field(
        ..., min_length=3, max_length=255, description="Título descritivo do material"
    )

    # Restrição estrita de tipos para que o frontend saiba qual ícone renderizar
    type: Literal["pdf", "video", "link", "article", "doc"] = Field(
        default="link",
        description="Tipo do recurso para fins de renderização de ícones no frontend",
    )

    # Expressão Regular (Regex) para garantir que é um link válido (http ou https)
    url: str = Field(
        ...,
        pattern=r"^https?://.*",
        description="Endereço web completo do recurso (http ou https)",
    )


class MaterialCreate(MaterialBase):
    """Schema para validação no momento de anexar um material a uma aula."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Documentação Oficial do FastAPI",
                "type": "link",
                "url": "https://fastapi.tiangolo.com/",
            }
        }
    )


class MaterialUpdate(BaseModel):
    """Schema para atualização parcial (Patch) de um material existente."""

    title: Optional[str] = Field(
        None, min_length=3, max_length=255, description="Novo título"
    )
    type: Optional[Literal["pdf", "video", "link", "article", "doc"]] = Field(
        None, description="Novo tipo de recurso de apoio"
    )
    url: Optional[str] = Field(
        None, pattern=r"^https?://.*", description="Nova URL do recurso"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "FastAPI Docs (Atualizado)",
                "type": "article",
            }
        }
    )


class MaterialResponse(MaterialBase):
    """Schema de saída para representação de materiais no frontend."""

    id: int = Field(..., description="ID único do material no banco de dados")
    lesson_id: int = Field(..., description="ID da aula à qual o material pertence")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "lesson_id": 5,
                "title": "Documentação Oficial do FastAPI",
                "type": "link",
                "url": "https://fastapi.tiangolo.com/",
            }
        },
    )
