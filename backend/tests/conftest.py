import os
import tempfile

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.mkdtemp()}/test.db")
os.environ.setdefault("SECRET_KEY", "test-secret")


@pytest.fixture()
def client():
    import models.models  # noqa: F401
    from core.database import Base, engine
    from main import app

    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)
