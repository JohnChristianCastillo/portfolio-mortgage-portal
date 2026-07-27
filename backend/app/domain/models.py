"""SQLAlchemy ORM models for the three persisted entities: User, Application,
and Document. One borrower has many applications; one application has many
uploaded documents.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    applications: Mapped[list["Application"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")

    property_value: Mapped[float] = mapped_column(default=0.0)
    loan_amount: Mapped[float] = mapped_column(default=0.0)
    monthly_income: Mapped[float] = mapped_column(default=0.0)
    monthly_expenses: Mapped[float] = mapped_column(default=0.0)
    term_years: Mapped[int] = mapped_column(default=25)
    interest_rate: Mapped[float] = mapped_column(default=0.0)
    employment_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    user: Mapped["User"] = relationship(back_populates="applications")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), index=True)
    document_type: Mapped[str] = mapped_column(String(50))
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(default=0)
    storage_path: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    application: Mapped["Application"] = relationship(back_populates="documents")


class BannedIp(Base):
    """An IP auto-banned for bursting the simulation endpoint (anonymous tier
    only - see AbuseGuardService). Kept until an admin manually unbans it.
    """

    __tablename__ = "banned_ips"

    id: Mapped[int] = mapped_column(primary_key=True)
    ip: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    reason: Mapped[str] = mapped_column(String(255))
    banned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
