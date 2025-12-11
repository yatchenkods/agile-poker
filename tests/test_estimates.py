"""Estimation tests"""

import pytest


def test_create_estimate(client):
    """Test creating an estimate"""
    # Setup: register user, create session and issue
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
    session_response = client.post(
        "/api/v1/sessions/",
        json={
            "name": "Sprint 1 Planning",
            "description": "Planning for sprint 1",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    session_id = session_response.json()["id"]

    # Create issue
    issue_response = client.post(
        "/api/v1/issues/",
        json={
            "session_id": session_id,
            "jira_key": "PROJ-123",
            "title": "Implement login feature",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    issue_id = issue_response.json()["id"]
    user_id = 1  # First user

    # Create estimate
    response = client.post(
        "/api/v1/estimates/",
        json={
            "session_id": session_id,
            "issue_id": issue_id,
            "story_points": 8,
            "user_id": user_id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["story_points"] == 8
