import os
import tempfile

_tmp_db_fd, _tmp_db_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_db_fd)
os.environ["MORTGAGE_DB_PATH"] = _tmp_db_path

import pytest

from app.db import Base, engine
from app.domain import models  # noqa: F401  registers the ORM mappers on Base
from app.services.abuse_guard_service import AbuseGuardService


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def reset_abuse_guard_state():
    # The burst window is intentionally shared class state (see
    # AbuseGuardService), not per-request - reset it between tests too.
    AbuseGuardService._recent_calls.clear()
    yield
