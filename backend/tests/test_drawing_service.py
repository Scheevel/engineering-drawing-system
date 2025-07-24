import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestDrawingService:
    def test_upload_drawing(self):
        """Test drawing upload endpoint"""
        with open("test_drawing.pdf", "rb") as f:
            response = client.post(
                "/api/v1/drawings/upload",
                files={"file": ("test.pdf", f, "application/pdf")}
            )
        assert response.status_code == 200
        assert "drawing_id" in response.json()
        
    def test_get_drawing(self):
        """Test get drawing by ID"""
        response = client.get("/api/v1/drawings/123")
        assert response.status_code in [200, 404]
        
    def test_list_drawings(self):
        """Test list drawings with pagination"""
        response = client.get("/api/v1/drawings?page=1&limit=10")
        assert response.status_code == 200
        assert "items" in response.json()
