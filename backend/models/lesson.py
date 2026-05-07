from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)  # [cite: 38]
    status = Column(String(50), default="draft", nullable=False)  # [cite: 39]
    video_url = Column(String, nullable=True)  # [cite: 40]
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)  # [cite: 41]

    course = relationship("Course", back_populates="lessons")
