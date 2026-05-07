from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(
        String, unique=True, index=True, nullable=False
    )
    password = Column(String, nullable=False)

    courses = relationship(
        "Course", back_populates="creator", cascade="all, delete-orphan"
    )
