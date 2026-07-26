import os
import tempfile

_tmp_db_fd, _tmp_db_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_db_fd)
os.environ["MORTGAGE_DB_PATH"] = _tmp_db_path

import pytest

from app.db import Base, engine
from app.domain import models  # noqa: F401  registers the ORM mappers on Base


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
