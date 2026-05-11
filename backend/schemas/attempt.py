# backend/schemas/attempt.py
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from models.attempt import AttemptStatus


# ==========================================
# RESPOSTAS DO ALUNO
# ==========================================
class StudentAnswerCreate(BaseModel):
    """Representa a resposta de um aluno para uma única questão."""

    question_id: int = Field(..., description="ID da questão respondida")
    selected_option_id: Optional[int] = Field(
        None, description="ID da opção selecionada (se for múltipla escolha)"
    )
    text_answer: Optional[str] = Field(
        None, description="Texto da resposta (se for questão aberta)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question_id": 50,
                "selected_option_id": 100,
                "text_answer": None,
            }
        }
    )


class StudentAnswerResponse(BaseModel):
    """Como a resposta é devolvida (incluindo correção automática e manual)."""

    id: int
    question_id: int
    selected_option_id: Optional[int] = None
    text_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    manual_score: Optional[float] = None
    teacher_feedback: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 200,
                "question_id": 50,
                "selected_option_id": 100,
                "text_answer": None,
                "is_correct": True,
                "manual_score": 100.0,
                "teacher_feedback": "Excelente!",
            }
        },
    )


# ==========================================
# TENTATIVA (QUIZ ATTEMPT)
# ==========================================
class QuizAttemptCreate(BaseModel):
    """Payload enviado pelo frontend quando o aluno finaliza a prova."""

    answers: List[StudentAnswerCreate]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "answers": [
                    {
                        "question_id": 50,
                        "selected_option_id": 100,
                        "text_answer": None,
                    },
                    {
                        "question_id": 51,
                        "selected_option_id": None,
                        "text_answer": "A IA generativa cria novos dados.",
                    },
                ]
            }
        }
    )


class QuizAttemptResponse(BaseModel):
    """O Boletim final do aluno (Aguardando Correção ou Corrigido)."""

    id: int
    user_id: int
    quiz_id: int
    score: Optional[float] = Field(None, description="Nota Final da Prova (NFP)")
    status: AttemptStatus = Field(..., description="Estado atual na Máquina de Estados")
    started_at: datetime
    completed_at: Optional[datetime] = None
    answers: List[StudentAnswerResponse] = []

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 10,
                "user_id": 42,
                "quiz_id": 5,
                "score": 85.5,
                "status": "graded",
                "started_at": "2026-05-11T10:00:00Z",
                "completed_at": "2026-05-11T10:45:00Z",
                "answers": [],
            }
        },
    )


# ==========================================
# SCHEMAS DE CORREÇÃO (PARA O PROFESSOR)
# ==========================================
class AnswerGradeUpdate(BaseModel):
    """Schema para o professor atribuir nota a uma questão aberta específica."""

    question_id: int = Field(..., description="ID da questão que está sendo corrigida")
    manual_score: float = Field(
        ..., ge=0, le=100, description="Nota atribuída de 0 a 100"
    )
    teacher_feedback: Optional[str] = Field(
        None, description="Justificativa ou sugestão de melhoria"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question_id": 51,
                "manual_score": 80.0,
                "teacher_feedback": "Boa resposta, mas faltou mencionar redes neurais.",
            }
        }
    )

    @model_validator(mode="after")
    def validate_feedback(self) -> "AnswerGradeUpdate":
        """
        Garante que o professor não dê uma nota baixa sem explicar o motivo.
        O .strip() evita feedbacks compostos apenas por espaços.
        """
        if self.manual_score < 100:
            if not self.teacher_feedback or not self.teacher_feedback.strip():
                raise ValueError(
                    "O feedback (justificativa/sugestões) é obrigatório para "
                    "notas menores que 100."
                )
        return self


class QuizGradeUpdate(BaseModel):
    """Payload que o professor envia ao finalizar a correção de uma prova."""

    grades: List[AnswerGradeUpdate] = Field(
        ..., description="Lista de notas manuais atribuídas"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "grades": [
                    {
                        "question_id": 51,
                        "manual_score": 80.0,
                        "teacher_feedback": "Boa resposta, mas faltou aprofundar.",
                    }
                ]
            }
        }
    )
