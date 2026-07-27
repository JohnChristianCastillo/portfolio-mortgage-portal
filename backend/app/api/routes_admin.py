"""Owner-only endpoints for managing IPs auto-banned by AbuseGuardService.
Gated on tier == admin (the gateway's Cloudflare Access owner), not this
app's own borrower accounts - a borrower login has nothing to do with
operating the deployment.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.errors import NotFoundError
from app.db import get_db
from app.repositories.banned_ip_repository import BannedIpRepository

router = APIRouter(prefix="/admin", tags=["admin"])


class BannedIpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ip: str
    reason: str


@router.get("/banned-ips", response_model=list[BannedIpResponse])
def list_banned_ips(
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
) -> list[BannedIpResponse]:
    return [
        BannedIpResponse.model_validate(row) for row in BannedIpRepository(db).list_all()
    ]


@router.delete("/banned-ips/{ip}")
def unban_ip(
    ip: str,
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
) -> dict:
    if not BannedIpRepository(db).unban(ip):
        raise NotFoundError("ip is not banned")
    return {"unbanned": ip}
