from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # [cite: 28, 29]
    description = Column(Text, nullable=True)  # [cite: 30]
    start_date = Column(Date, nullable=False)  # [cite: 31]
    end_date = Column(Date, nullable=False)  # [cite: 32]
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # [cite: 34]

    creator = relationship("User", back_populates="courses")
    lessons = relationship(
        "Lesson", back_populates="course", cascade="all, delete-orphan"
    )
