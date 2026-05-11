# backend/schemas/enrollment.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EnrollmentCreate(BaseModel):
    """Schema para matricular um aluno em um curso."""

    course_id: int = Field(
        ..., description="ID do curso no qual o aluno será matriculado"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "course_id": 10,
            }
        }
    )


class EnrollmentResponse(BaseModel):
    """Schema de resposta da matrícula com dados calculados."""

    id: int = Field(..., description="ID único da matrícula")
    user_id: int = Field(..., description="ID do estudante matriculado")
    course_id: int = Field(..., description="ID do curso associado")
    enrolled_at: datetime = Field(..., description="Data e hora exata da matrícula")
    completion_percentage: float = Field(
        default=0.0,
        description="Percentagem de conclusão calculada via query otimizada (0.0 a 100.0)",
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 42,
                "course_id": 10,
                "enrolled_at": "2026-05-11T10:00:00Z",
                "completion_percentage": 45.5,
            }
        },
    )


class LessonProgressCreate(BaseModel):
    """Schema para marcar uma aula como concluída."""

    lesson_id: int = Field(..., description="ID da aula a ser marcada como concluída")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "lesson_id": 105,
            }
        }
    )


class LessonProgressResponse(BaseModel):
    """Schema de resposta do progresso de uma aula."""

    id: int = Field(..., description="ID único do registro de progresso")
    enrollment_id: int = Field(..., description="ID da matrícula correspondente")
    lesson_id: int = Field(..., description="ID da aula concluída")
    completed_at: datetime = Field(..., description="Data e hora da conclusão da aula")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 500,
                "enrollment_id": 1,
                "lesson_id": 105,
                "completed_at": "2026-05-15T14:30:00Z",
            }
        },
    )
