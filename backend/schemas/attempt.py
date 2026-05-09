from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class StudentAnswerCreate(BaseModel):
    """Representa a resposta de um aluno para uma única questão."""

    question_id: int
    selected_option_id: Optional[int] = None
    text_answer: Optional[str] = None


class QuizAttemptCreate(BaseModel):
    """Payload enviado pelo frontend quando o aluno finaliza o quiz."""

    answers: List[StudentAnswerCreate]


class StudentAnswerResponse(BaseModel):
    """Como a resposta é devolvida (incluindo se ele acertou ou errou)."""

    id: int
    question_id: int
    selected_option_id: Optional[int] = None
    text_answer: Optional[str] = None
    is_correct: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class QuizAttemptResponse(BaseModel):
    """O Boletim final do aluno."""

    id: int
    user_id: int
    quiz_id: int
    score: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    answers: List[StudentAnswerResponse] = []

    model_config = ConfigDict(from_attributes=True)
