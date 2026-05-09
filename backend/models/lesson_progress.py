# backend/models/lesson_progress.py
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from core.database import Base


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True)

    # ondelete="CASCADE": Se a matrícula ou aula for removida, o progresso some junto
    enrollment_id = Column(
        Integer, ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id = Column(
        Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )

    # Momento exato em que o aluno marcou a aula como concluída
    completed_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Regra de Negócio Blindada: Uma aula só pode ser marcada uma vez por matrícula
    __table_args__ = (
        UniqueConstraint(
            "enrollment_id", "lesson_id", name="uix_enrollment_lesson_progress"
        ),
    )

    # Relacionamentos unidirecionais (seguros para uso isolado)
    enrollment = relationship("Enrollment")
    lesson = relationship("Lesson")
