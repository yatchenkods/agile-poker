"""Pytest configuration and fixtures"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def db():
    """Create test database"""
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    return override_get_db


@pytest.fixture
def client(db):
    """Create test client"""
    from app.database import get_db
    app.dependency_overrides[get_db] = db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
