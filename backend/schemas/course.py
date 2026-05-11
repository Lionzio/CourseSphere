# backend/schemas/course.py
from datetime import date
from typing import Optional, Any
from pydantic import BaseModel, Field, model_validator, field_validator, ConfigDict


class CourseBase(BaseModel):
    """Schema base contendo as regras de negócio para as datas e dados do curso."""

    name: str = Field(..., min_length=3, max_length=255, description="Nome do curso")
    description: Optional[str] = Field(None, description="Descrição detalhada do curso")
    start_date: date = Field(..., description="Data de início do curso (YYYY-MM-DD)")
    end_date: date = Field(..., description="Data de término do curso (YYYY-MM-DD)")

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, v: Any) -> Any:
        """
        Correção de Timezone: Interceta strings ISO 8601 (ex: 2026-05-01T03:00:00Z)
        extraindo estritamente a porção da data local intencionada.
        """
        if isinstance(v, str) and "T" in v:
            return v.split("T")[0]
        return v

    @model_validator(mode="after")
    def check_dates(self) -> "CourseBase":
        """Garante a consistência temporal do curso."""
        if self.end_date < self.start_date:
            raise ValueError(
                "A data de término deve ser igual ou posterior à data de início."
            )
        return self


class CourseCreate(CourseBase):
    """Schema para validação dos dados na criação de um novo curso."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Desenvolvimento Web com FastAPI",
                "description": "Curso completo de backend moderno utilizando Python, Pydantic e Docker.",
                "start_date": "2026-06-01",
                "end_date": "2026-12-30",
            }
        }
    )


class CourseUpdate(BaseModel):
    """Schema para atualização parcial de um curso (método PATCH/PUT)."""

    name: Optional[str] = Field(
        None, min_length=3, max_length=255, description="Novo nome do curso"
    )
    description: Optional[str] = Field(None, description="Nova descrição detalhada")
    start_date: Optional[date] = Field(None, description="Nova data de início")
    end_date: Optional[date] = Field(None, description="Nova data de término")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Desenvolvimento Web Avançado",
                "description": "Atualização do conteúdo para incluir orquestração com Kubernetes.",
            }
        }
    )

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, v: Any) -> Any:
        if isinstance(v, str) and "T" in v:
            return v.split("T")[0]
        return v

    @model_validator(mode="after")
    def check_dates(self) -> "CourseUpdate":
        """Valida as datas apenas se ambas forem enviadas na requisição."""
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError(
                "A data de término deve ser igual ou posterior à data de início."
            )
        return self


class CourseResponse(CourseBase):
    """Schema para formatação da resposta da API (Ocultando dados internos irrelevantes)."""

    id: int = Field(..., description="Identificador único do curso")
    creator_id: int = Field(..., description="ID do professor criador do curso")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 10,
                "creator_id": 1,
                "name": "Desenvolvimento Web com FastAPI",
                "description": "Curso completo de backend moderno utilizando Python.",
                "start_date": "2026-06-01",
                "end_date": "2026-12-30",
            }
        },
    )
