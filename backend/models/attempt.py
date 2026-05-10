import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from core.database import Base


# Máquina de Estados da Tentativa
class AttemptStatus(str, enum.Enum):
    in_progress = "in_progress"
    pending_correction = "pending_correction"  # Aguardando o Professor
    graded = "graded"  # Corrigida (Pode exibir nota para o aluno)


class QuizAttempt(Base):
    """Registra a tentativa de um aluno ao realizar um Quiz."""

    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    quiz_id = Column(
        Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False
    )

    # Nota final ponderada (NFP). Pode ser nula enquanto estiver pending_correction.
    score = Column(Float, nullable=True)

    # Status atual da prova na Máquina de Estados
    status = Column(
        Enum(AttemptStatus),
        default=AttemptStatus.in_progress,
        server_default="in_progress",
        nullable=False,
    )

    # Controle de Timer e Prevenção de Fraudes
    started_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relacionamentos
    user = relationship("User")
    quiz = relationship("Quiz")
    answers = relationship(
        "StudentAnswer", back_populates="attempt", cascade="all, delete-orphan"
    )


class StudentAnswer(Base):
    """Registra cada resposta individual dada pelo aluno numa tentativa."""

    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(
        Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False
    )
    question_id = Column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )

    # Para questões de Múltipla Escolha
    selected_option_id = Column(
        Integer, ForeignKey("options.id", ondelete="SET NULL"), nullable=True
    )

    # Para questões Abertas / Discursivas
    text_answer = Column(Text, nullable=True)

    # Correção Automática (Múltipla Escolha)
    is_correct = Column(Boolean, nullable=True)

    # Correção Manual (Questões Abertas)
    manual_score = Column(Float, nullable=True)  # Nota atribuída de 0 a 100
    teacher_feedback = Column(
        Text, nullable=True
    )  # Comentário/Justificativa do professor

    # Relacionamentos
    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("Question")
    selected_option = relationship("Option")
