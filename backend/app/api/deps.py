from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.errors import UnauthorizedError
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
