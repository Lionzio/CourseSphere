from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="draft", nullable=False)
    video_url = Column(String, nullable=True)

    # --- Campos da Sprint 6: Contexto e Caching de Inteligência Artificial ---
    # Armazena a transcrição do vídeo ou o texto explicativo da aula
    content = Column(Text, nullable=True)
    # Armazena o resumo gerado pela IA (evita custos repetidos de tokens na API)
    ai_summary = Column(Text, nullable=True)

    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    course = relationship("Course", back_populates="lessons")

    # Relação com materiais de apoio
    materials = relationship(
        "Material", back_populates="lesson", cascade="all, delete-orphan"
    )

    # Relação 1-para-1 com o Motor de Avaliações
    quiz = relationship(
        "Quiz", back_populates="lesson", uselist=False, cascade="all, delete-orphan"
    )
