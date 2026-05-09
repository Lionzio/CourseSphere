# backend/schemas/enrollment.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EnrollmentCreate(BaseModel):
    """Schema para matricular um aluno em um curso."""

    course_id: int


class EnrollmentResponse(BaseModel):
    """Schema de resposta da matrícula com dados calculados."""

    id: int
    user_id: int
    course_id: int
    enrolled_at: datetime
    # Percentagem de conclusão calculada via query otimizada (0.0 a 100.0)
    completion_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class LessonProgressCreate(BaseModel):
    """Schema para marcar uma aula como concluída."""

    lesson_id: int


class LessonProgressResponse(BaseModel):
    """Schema de resposta do progresso de uma aula."""

    id: int
    enrollment_id: int
    lesson_id: int
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)
