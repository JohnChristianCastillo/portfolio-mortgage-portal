from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.core.errors import ConflictError, UnauthorizedError
from app.domain.models import User
from app.repositories.user_repository import UserRepository


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


class AuthService:
    """Owns password hashing, JWT issuance, and JWT verification for borrower accounts.

    This is deliberately a separate concern from the gateway's own admission tiers
    (admin/invited/anonymous): the gateway decides who can reach this app at all,
    this service decides which borrower account a session belongs to.
    """

    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def signup(self, email: str, password: str) -> User:
        if self.users.get_by_email(email):
            raise ConflictError("an account with this email already exists")
        password_hash = _hash_password(password)
        return self.users.create(email=email, password_hash=password_hash)

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if user is None or not _verify_password(password, user.password_hash):
            raise UnauthorizedError("invalid email or password")
        return user

    def create_access_token(self, user: User) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
        payload = {"sub": str(user.id), "exp": expire}
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def get_user_from_token(self, token: str) -> User:
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("invalid or expired session") from exc

        user = self.users.get_by_id(int(payload["sub"]))
        if user is None:
            raise UnauthorizedError("invalid or expired session")
        return user
