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

    # Nova relação bidirecional com a tabela de materiais (CASCADE garante limpeza automática)
    materials = relationship(
        "Material", back_populates="lesson", cascade="all, delete-orphan"
    )
