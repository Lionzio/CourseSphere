from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="draft", nullable=False)
    video_url = Column(String, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    course = relationship("Course", back_populates="lessons")

    # Relação com materiais de apoio
    materials = relationship(
        "Material", back_populates="lesson", cascade="all, delete-orphan"
    )

    # Nova relação 1-para-1 com o Motor de Avaliações (uselist=False)
    quiz = relationship(
        "Quiz", back_populates="lesson", uselist=False, cascade="all, delete-orphan"
    )
