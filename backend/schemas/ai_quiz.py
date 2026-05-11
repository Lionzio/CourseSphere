# backend/schemas/ai_quiz.py
from typing import List
from pydantic import BaseModel, Field, ConfigDict


class AIOptionSchema(BaseModel):
    """Representa uma alternativa gerada pela IA."""

    text: str = Field(..., description="Texto completo da alternativa.")
    is_correct: bool = Field(..., description="True apenas para a alternativa correta.")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "O protocolo HTTP é stateless (sem estado).",
                "is_correct": True,
            }
        }
    )


class AIQuestionSchema(BaseModel):
    """Representa uma questão completa gerada pela IA."""

    text: str = Field(..., description="Enunciado claro e objetivo da questão.")
    question_type: str = Field(
        ..., description="Tipo da questão: 'multiple_choice' ou 'open'."
    )
    weight: float = Field(
        ..., description="Peso da questão na nota final (ex: 1.0, 2.0)."
    )
    options: List[AIOptionSchema] = Field(
        default_factory=list,
        description=(
            "Lista de alternativas. Obrigatório para 'multiple_choice'. "
            "Deve conter exatamente uma opção com is_correct=true. "
            "Vazio para questões do tipo 'open'."
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "Qual a principal vantagem da injeção de dependências no FastAPI?",
                "question_type": "multiple_choice",
                "weight": 2.0,
                "options": [
                    {
                        "text": "Acoplamento forte entre componentes.",
                        "is_correct": False,
                    },
                    {
                        "text": "Modularidade e facilidade para testes automatizados.",
                        "is_correct": True,
                    },
                ],
            }
        }
    )


class AIQuizSchema(BaseModel):
    """
    Schema completo do Quiz gerado pela IA via Structured Outputs.
    Passado como response_schema para o Gemini garantir JSON válido.
    """

    title: str = Field(..., description="Título descritivo da avaliação.")
    questions: List[AIQuestionSchema] = Field(
        ..., description="Lista de questões geradas para a avaliação."
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Avaliação Dinâmica: Arquitetura de Software",
                "questions": [
                    {
                        "text": "O que caracteriza uma API RESTful?",
                        "question_type": "multiple_choice",
                        "weight": 1.5,
                        "options": [
                            {"text": "Uso obrigatório de SOAP", "is_correct": False},
                            {"text": "Comunicação stateless", "is_correct": True},
                        ],
                    }
                ],
            }
        }
    )
