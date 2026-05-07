from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # [cite: 19]
    email = Column(
        String, unique=True, index=True, nullable=False
    )  # [cite: 20, 21, 24]
    password = Column(String, nullable=False)  # [cite: 22]

    courses = relationship(
        "Course", back_populates="creator", cascade="all, delete-orphan"
    )
