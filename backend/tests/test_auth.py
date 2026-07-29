from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_INVITED = {"X-Session-Tier": "invited"}


def test_signup_returns_access_token():
    response = client.post(
        "/api/auth/signup",
        json={"email": "borrower@example.com", "password": "supersecret"},
        headers=_INVITED,
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_signup_rejects_duplicate_email():
    client.post(
        "/api/auth/signup",
        json={"email": "dup@example.com", "password": "supersecret"},
        headers=_INVITED,
    )
    response = client.post(
        "/api/auth/signup",
        json={"email": "dup@example.com", "password": "supersecret"},
        headers=_INVITED,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


def test_signup_allowed_when_no_gateway_present():
    """No X-Session-Tier header at all means there is no gateway in front
    (local dev, standalone Docker), not a real anonymous visitor - so the
    invite gate must not block it."""
    response = client.post(
        "/api/auth/signup", json={"email": "nogate@example.com", "password": "supersecret"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_signup_rejects_anonymous_tier():
    response = client.post(
        "/api/auth/signup",
        json={"email": "anon@example.com", "password": "supersecret"},
        headers={"X-Session-Tier": "anonymous"},
    )
    assert response.status_code == 403


def test_signup_allows_admin_tier():
    response = client.post(
        "/api/auth/signup",
        json={"email": "admin-signup@example.com", "password": "supersecret"},
        headers={"X-Session-Tier": "admin"},
    )
    assert response.status_code == 200


def test_login_with_correct_credentials():
    client.post(
        "/api/auth/signup",
        json={"email": "login@example.com", "password": "supersecret"},
        headers=_INVITED,
    )
    response = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": "supersecret"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_rejects_wrong_password():
    client.post(
        "/api/auth/signup",
        json={"email": "wrongpass@example.com", "password": "supersecret"},
        headers=_INVITED,
    )
    response = client.post(
        "/api/auth/login", json={"email": "wrongpass@example.com", "password": "notright"}
    )
    assert response.status_code == 401


def test_me_requires_valid_token():
    signup = client.post(
        "/api/auth/signup",
        json={"email": "me@example.com", "password": "supersecret"},
        headers=_INVITED,
    )
    token = signup.json()["access_token"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_me_rejects_missing_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
