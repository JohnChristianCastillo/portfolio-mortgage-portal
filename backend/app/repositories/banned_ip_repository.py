"""Plain CRUD over banned IPs; the burst-detection logic that decides WHEN to
ban lives in AbuseGuardService, not here.
"""

from sqlalchemy.orm import Session

from app.domain.models import BannedIp


class BannedIpRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, ip: str) -> BannedIp | None:
        return self.db.query(BannedIp).filter(BannedIp.ip == ip).first()

    def ban(self, ip: str, reason: str) -> BannedIp:
        row = BannedIp(ip=ip, reason=reason)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_all(self) -> list[BannedIp]:
        return self.db.query(BannedIp).order_by(BannedIp.banned_at.desc()).all()

    def unban(self, ip: str) -> bool:
        row = self.get(ip)
        if row is None:
            return False
        self.db.delete(row)
        self.db.commit()
        return True
