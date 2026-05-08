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
        Correção Crítica de Timezone: Interceta strings ISO 8601
        (ex: 2026-05-01T03:00:00.000Z) enviadas pelo frontend e extrai
        estritamente a porção da data local intencionada pelo utilizador.
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

    pass


class CourseUpdate(BaseModel):
    """Schema para atualização parcial de um curso (método PATCH/PUT)."""

    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, v: Any) -> Any:
        if isinstance(v, str) and "T" in v:
            return v.split("T")[0]
        return v

    @model_validator(mode="after")
    def check_dates(self) -> "CourseUpdate":
        """Valida as datas apenas se ambas forem enviadas na requisição de atualização."""
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError(
                "A data de término deve ser igual ou posterior à data de início."
            )
        return self


class CourseResponse(CourseBase):
    """Schema para formatação da resposta da API (Ocultando dados internos irrelevantes)."""

    id: int = Field(..., description="Identificador único do curso")
    creator_id: int = Field(..., description="ID do professor criador do curso")

    model_config = ConfigDict(from_attributes=True)
