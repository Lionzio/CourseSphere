# backend/schemas/lesson.py
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

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Introdução à Inteligência Artificial",
                "status": "published",
                "video_url": "https://youtube.com/watch?v=exemplo",
                "content": "Nesta aula abordaremos as fundações de IA generativa...",
            }
        }
    )


class LessonUpdate(BaseModel):
    """Schema para atualização parcial (Patch/Put) da aula."""

    title: Optional[str] = Field(None, min_length=3, max_length=255)
    status: Optional[Literal["draft", "published"]] = None
    video_url: Optional[str] = Field(None, pattern=r"^https?://.*")
    content: Optional[str] = None
    ai_summary: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "published",
                "ai_summary": (
                    "**Resumo da Aula:**\n"
                    "1. IA Generativa cria conteúdos novos.\n"
                    "2. Modelos de Linguagem são treinados em grandes volumes de texto."
                ),
            }
        }
    )


class LessonResponse(LessonBase):
    """Schema de saída (Output) mascarando dados para o Frontend."""

    id: int = Field(..., description="ID único da aula")
    course_id: int = Field(..., description="ID do curso ao qual esta aula pertence")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 15,
                "course_id": 3,
                "title": "Introdução à Inteligência Artificial",
                "status": "published",
                "video_url": "https://youtube.com/watch?v=exemplo",
                "content": "Nesta aula abordaremos as fundações de IA generativa...",
                "ai_summary": "**Resumo da Aula:**\n1. IA Generativa...",
            }
        },
    )
