from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Ação realizada (ex: "DELETE_COURSE", "PROMOTE_USER", "CREATE_LESSON")
    action = Column(String, nullable=False, index=True)

    # Tabela/Entidade afetada (ex: "Course", "User")
    entity_name = Column(String, nullable=False)

    # ID do registro afetado na tabela correspondente
    entity_id = Column(Integer, nullable=True)

    # Detalhes adicionais em formato de texto estruturado ou JSON
    details = Column(Text, nullable=True)

    # Data e hora exata da ocorrência usando timezone-aware datetime (Padrão Enterprise)
    timestamp = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relacionamento de leitura com o usuário que executou a ação
    user = relationship("User")
