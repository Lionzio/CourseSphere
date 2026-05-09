from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from core.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)

    # ondelete="CASCADE" garante que se um curso for apagado, as matrículas somem automaticamente
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    course_id = Column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )

    # Data exata em que o aluno iniciou o curso
    enrolled_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Regra de Negócio Blindada: Um utilizador só pode ter uma matrícula ativa por curso
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uix_user_course_enrollment"),
    )

    # Relacionamentos unidirecionais (seguros para inicialização isolada)
    user = relationship("User")
    course = relationship("Course")
