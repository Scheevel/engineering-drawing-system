"""
Shared test configuration and fixtures for integration tests.

Provides common test setup, database fixtures, and TestClient configuration
to ensure consistent test execution across all integration test suites.
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from uuid import uuid4

# Set test environment variables BEFORE importing app
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp()
os.environ["ENVIRONMENT"] = "test" 
os.environ["DEBUG"] = "true"

from app.main import app
from app.core.database import get_db, Base
from app.models.database import Drawing, Component


# Test database configuration
TEST_DATABASE_URL = "sqlite:///./test_instance_identifier.db"


@pytest.fixture(scope="session") 
def test_engine():
    """Create test database engine."""
    # Use in-memory SQLite for fast testing
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    """Create session factory for test database."""
    from sqlalchemy.orm import sessionmaker
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def test_db_session(test_session_factory):
    """Create database session for individual tests."""
    session = test_session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def override_get_db(test_db_session):
    """Override database dependency for testing."""
    def _override_get_db():
        try:
            yield test_db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def test_client(override_get_db):
    """Create FastAPI test client with database override."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def test_drawing(test_db_session):
    """Create a test drawing for use in tests."""
    drawing = Drawing(
        id=uuid4(),
        file_name="test_integration_drawing.pdf",
        title="Integration Test Drawing",
        project_id=uuid4(),
        status="completed"
    )
    
    test_db_session.add(drawing)
    test_db_session.commit()
    test_db_session.refresh(drawing)
    
    yield drawing
    
    # Cleanup is handled by session rollback


@pytest.fixture
def cleanup_components(test_db_session):
    """Clean up test components after each test."""
    yield
    # Cleanup components
    test_db_session.query(Component).delete()
    test_db_session.commit()


# Test data helpers
class TestDataHelper:
    """Helper class for generating consistent test data."""
    
    @staticmethod
    def get_component_data(drawing_id: str, piece_mark: str = "TEST", instance_identifier: str = None):
        """Generate component data for testing."""
        return {
            "drawing_id": drawing_id,
            "piece_mark": piece_mark,
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": instance_identifier
        }
    
    @staticmethod
    def get_multiple_instances(drawing_id: str, piece_mark: str = "MULTI"):
        """Generate multiple instance test data."""
        return [
            TestDataHelper.get_component_data(drawing_id, piece_mark, "A"),
            TestDataHelper.get_component_data(drawing_id, piece_mark, "B"),
            TestDataHelper.get_component_data(drawing_id, piece_mark, "C")
        ]


@pytest.fixture
def test_data_helper():
    """Provide test data helper instance."""
    return TestDataHelper


# Pytest configuration for better error reporting
def pytest_configure(config):
    """Configure pytest with custom settings."""
    config.addinivalue_line(
        "markers", 
        "integration: mark test as integration test requiring database"
    )
    config.addinivalue_line(
        "markers",
        "api: mark test as API endpoint test"  
    )
    config.addinivalue_line(
        "markers",
        "service: mark test as service layer test"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically."""
    for item in items:
        # Add integration marker to all tests in integration test files
        if "integration" in str(item.fspath) or "api" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Add specific markers based on filename
        if "api" in str(item.fspath):
            item.add_marker(pytest.mark.api)
        elif "service" in str(item.fspath):
            item.add_marker(pytest.mark.service)