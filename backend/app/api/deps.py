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


def require_invited_or_admin(tier: str | None = Depends(session_tier)) -> str | None:
    """Gate for account creation: only invited/admin visitors may sign up, so an
    open anonymous demo does not turn into free-for-all database growth.

    A tier of None means there is no gateway in front at all (local dev,
    standalone Docker) rather than a real anonymous visitor, so this gate is a
    no-op there - this app is meant to behave as always-admitted without a
    gateway, and only enforce the invite requirement once a real gateway is
    actually forwarding a tier.
    """
    if tier is not None and tier not in ("invited", "admin"):
        raise ForbiddenError("sign-up requires an invite")
    return tier


def require_admin(tier: str | None = Depends(session_tier)) -> str | None:
    """Gate for owner-only endpoints (e.g. managing auto-banned IPs). Same
    None-means-no-gateway exception as require_invited_or_admin above."""
    if tier is not None and tier != "admin":
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
