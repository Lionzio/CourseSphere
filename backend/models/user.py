import enum
from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from core.database import Base


class Role(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    # Coluna de controle de acessos (RBAC)
    role = Column(Enum(Role), default=Role.student, nullable=False)

    # Restauração do Relacionamento com a tabela de Cursos
    courses = relationship(
        "Course", back_populates="creator", cascade="all, delete-orphan"
    )
