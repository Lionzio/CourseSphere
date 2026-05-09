from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from core.database import Base


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

    # Nota final calculada dinamicamente com base nos pesos (Overdelivering)
    score = Column(Float, nullable=True)

    # Controle de Timer e Prevenção de Fraudes (Anti-Cheat)
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

    # Resultado isolado da correção automática (True/False)
    is_correct = Column(Boolean, nullable=True)

    # Relacionamentos
    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("Question")
    selected_option = relationship("Option")
