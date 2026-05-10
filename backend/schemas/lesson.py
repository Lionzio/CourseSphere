from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class LessonBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Título da aula")
    status: Literal["draft", "published"] = Field(
        default="draft", description="Estado de publicação"
    )
    video_url: Optional[str] = Field(
        None, pattern=r"^https?://.*", description="URL do vídeo da aula"
    )

    # Novos campos de Conteúdo e IA
    content: Optional[str] = Field(
        None, description="Texto completo da aula ou transcrição para a IA ler"
    )
    ai_summary: Optional[str] = Field(
        None, description="Resumo inteligente gerado em cache (Markdown)"
    )


class LessonCreate(LessonBase):
    """Schema para validação na criação de uma aula."""

    pass


class LessonUpdate(BaseModel):
    """Schema para atualização parcial (Patch/Put) da aula."""

    title: Optional[str] = Field(None, min_length=3, max_length=255)
    status: Optional[Literal["draft", "published"]] = None
    video_url: Optional[str] = Field(None, pattern=r"^https?://.*")
    content: Optional[str] = None
    ai_summary: Optional[str] = None


class LessonResponse(LessonBase):
    """Schema de saída (Output) mascarando dados para o Frontend."""

    id: int
    course_id: int

    model_config = ConfigDict(from_attributes=True)
