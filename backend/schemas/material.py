from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class MaterialBase(BaseModel):
    title: str = Field(
        ..., min_length=3, max_length=255, description="Título do material"
    )

    # Restrição estrita de tipos para que o frontend saiba qual ícone renderizar
    type: Literal["pdf", "video", "link", "article", "doc"] = Field(
        default="link", description="Tipo do recurso de apoio"
    )

    # Expressão Regular (Regex) para garantir que é um link válido (http ou https)
    url: str = Field(..., pattern=r"^https?://.*", description="URL do material")


class MaterialCreate(MaterialBase):
    """Schema para validação no momento de anexar um material."""

    pass


class MaterialUpdate(BaseModel):
    """Schema para atualização parcial (Patch) de um material."""

    title: Optional[str] = Field(None, min_length=3, max_length=255)
    type: Optional[Literal["pdf", "video", "link", "article", "doc"]] = None
    url: Optional[str] = Field(None, pattern=r"^https?://.*")


class MaterialResponse(MaterialBase):
    """Schema de saída (Response) mascarando os dados para o Frontend."""

    id: int
    lesson_id: int

    model_config = ConfigDict(from_attributes=True)
