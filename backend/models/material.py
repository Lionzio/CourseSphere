from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)

    # Nome visível para o aluno (ex: "Slides da Aula 1", "Artigo Complementar")
    title = Column(String(255), nullable=False)

    # Tipo do material para o frontend saber como renderizar (ex: "pdf", "link", "video", "doc")
    type = Column(String(50), nullable=False, default="link")

    # URL de destino (pode ser um link externo ou caminho de storage)
    url = Column(String, nullable=False)

    # Se a aula for apagada, os materiais somem automaticamente (CASCADE)
    lesson_id = Column(
        Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )

    # Relacionamento de volta para a aula
    lesson = relationship("Lesson", back_populates="materials")
