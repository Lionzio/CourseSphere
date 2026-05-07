from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  
    description = Column(Text, nullable=True)  
    start_date = Column(Date, nullable=False)  
    end_date = Column(Date, nullable=False)  
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False) 

    creator = relationship("User", back_populates="courses")
    lessons = relationship(
        "Lesson", back_populates="course", cascade="all, delete-orphan"
    )
