import json
from typing import Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from models.audit_log import AuditLog


async def log_audit_action(
    db: AsyncSession,
    user_id: int,
    action: str,
    entity_name: str,
    entity_id: Optional[int] = None,
    details: Optional[Union[dict, str]] = None,
) -> AuditLog:
    """
    Regista uma ação crítica na tabela de auditoria (AuditLog).

    Parâmetros:
    - db: Sessão assíncrona da base de dados.
    - user_id: ID do utilizador que executou a ação.
    - action: Nome da ação em maiúsculas (ex: 'PROMOTE_USER', 'DELETE_COURSE').
    - entity_name: Nome da entidade afetada (ex: 'User', 'Course').
    - entity_id: ID da entidade afetada (opcional).
    - details: Contexto extra da operação. Pode ser uma string ou um dicionário.
    """

    # Tratamento automático: se os detalhes vierem como dicionário, converte para string JSON
    if isinstance(details, dict):
        details = json.dumps(details, ensure_ascii=False)

    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        details=details,
    )

    db.add(audit_entry)
    await db.commit()
    await db.refresh(audit_entry)

    return audit_entry
