from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class LessonBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    # Literal obriga o FastAPI a aceitar APENAS estes dois
    # valores e os documenta no Swagger
    status: Literal["draft", "published"] = "draft"
    # Adicionamos uma validação básica para garantir que,
    # se enviada, a URL tenha um formato mínimo
    video_url: Optional[str] = Field(None, pattern=r"^https?://.*")


class LessonCreate(LessonBase):
    pass


class LessonUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    status: Optional[Literal["draft", "published"]] = None
    video_url: Optional[str] = Field(None, pattern=r"^https?://.*")


class LessonResponse(LessonBase):
    id: int
    course_id: int

    model_config = ConfigDict(from_attributes=True)
