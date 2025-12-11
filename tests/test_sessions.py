"""Session tests"""

import pytest


def test_create_session(client):
    """Test creating a session"""
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User",
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "testpassword123"},
    )
    token = login_response.json()["access_token"]

    # Create session
    response = client.post(
        "/api/v1/sessions/",
        json={
            "name": "Sprint 1 Planning",
            "description": "Planning for sprint 1",
            "project_key": "PROJ",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Sprint 1 Planning"


def test_list_sessions(client):
    """Test listing sessions"""
    response = client.get("/api/v1/sessions/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
