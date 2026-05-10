from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from core.database import Base


class Quiz(Base):
    """Modelo principal da avaliação. Modificado na Sprint 8 para 1:N (múltiplas provas por aula)."""

    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)

    # Peso da prova inteira para o cálculo da Nota Final da Disciplina (NFD)
    weight = Column(Float, default=1.0, server_default="1.0", nullable=False)

    # REFACTOR SPRINT 8: unique=True removido para permitir Múltiplos Quizzes por Aula
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Atualizado para back_populates="quizzes" (no plural) para casar com o modelo Lesson
    lesson = relationship("Lesson", back_populates="quizzes")

    # cascade="all, delete-orphan" garante que ao apagar o quiz, as questões somem
    questions = relationship(
        "Question", back_populates="quiz", cascade="all, delete-orphan"
    )


class Question(Base):
    """Questões modulares pertencentes a um Quiz."""

    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(
        Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False
    )

    text = Column(Text, nullable=False)

    # Tipo da questão: 'multiple_choice' (Fechada) ou 'open' (Aberta/Texto)
    question_type = Column(String(50), nullable=False, default="multiple_choice")

    # Peso da questão para cálculo dinâmico da Nota Final da Prova (NFP)
    weight = Column(Float, default=1.0, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")
    options = relationship(
        "Option", back_populates="question", cascade="all, delete-orphan"
    )


class Option(Base):
    """Alternativas de resposta para questões de múltipla escolha."""

    __tablename__ = "options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )

    text = Column(String(255), nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)

    question = relationship("Question", back_populates="options")
