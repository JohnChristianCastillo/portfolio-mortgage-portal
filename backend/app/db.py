from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _make_engine():
    Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(
        settings.sqlalchemy_url, connect_args={"check_same_thread": False}
    )


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.domain import models  # noqa: F401  (registers mappers on Base)

    Base.metadata.create_all(bind=engine)
