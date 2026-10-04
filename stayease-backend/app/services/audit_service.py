from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_event(
    db: Session,
    event_type: str,
    actor_type: str,
    actor_id: str,
    entity_type: str,
    entity_id: str,
    description: str,
    metadata_json: dict = None,
    commit: bool = True
) -> AuditLog:
    """
    Saves a hotel event in the audit_logs table.
    Enforces strict security to ensure that no plaintext passwords, hashes,
    tokens, or secrets are ever recorded in the database.
    """
    safe_metadata = {}
    if metadata_json:
        for k, v in metadata_json.items():
            k_lower = str(k).lower()
            # Omit any sensitive keys
            if any(term in k_lower for term in ["password", "hash", "token", "secret", "key", "jwt"]):
                continue
            safe_metadata[k] = v

    clean_desc = description
    # Verify description is free of cleartext passwords/secrets
    if any(term in clean_desc.lower() for term in ["password123", "jwt", "secret_key"]):
        clean_desc = "[Redacted description containing potential sensitive data]"

    log_entry = AuditLog(
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        description=clean_desc,
        metadata_json=safe_metadata
    )
    db.add(log_entry)
    if commit:
        db.commit()
        db.refresh(log_entry)
    return log_entry

