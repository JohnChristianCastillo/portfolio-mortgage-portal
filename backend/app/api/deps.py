from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, UnauthorizedError
from app.db import get_db
from app.domain.models import User
from app.services.auth_service import AuthService


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("missing or malformed Authorization header")
    token = authorization.removeprefix("Bearer ")
    return AuthService(db).get_user_from_token(token)


def session_tier(x_session_tier: str | None = Header(default=None)) -> str | None:
    """The gateway's verified admission tier (admin/invited/anonymous), forwarded
    as X-Session-Tier. None when there is no gateway in front (local dev) - the
    same convention already used by portfolio-trading-helper's `_tier` dependency.
    """
    return x_session_tier


def require_invited_or_admin(tier: str | None = Depends(session_tier)) -> str:
    """Gate for account creation: only invited/admin visitors may sign up, so an
    open anonymous demo does not turn into free-for-all database growth.
    """
    if tier not in ("invited", "admin"):
        raise ForbiddenError("sign-up requires an invite")
    return tier


def require_admin(tier: str | None = Depends(session_tier)) -> str:
    """Gate for owner-only endpoints (e.g. managing auto-banned IPs)."""
    if tier != "admin":
        raise ForbiddenError("admin only")
    return tier


def client_ip(request: Request) -> str:
    """Real visitor IP. Behind Cloudflare + the gateway, the gateway forwards the
    original Cf-Connecting-IP header through untouched; mirrors the gateway's own
    client_ip() in app/hardening.py.
    """
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf
    return request.client.host if request.client else "unknown"
