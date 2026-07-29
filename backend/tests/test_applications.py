"""Covers the application draft/submit lifecycle and per-user ownership: a
borrower can create, edit, and submit their own application, cannot edit it
once submitted, and cannot see or touch another borrower's application.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _auth_headers(email: str) -> dict[str, str]:
    """Signs up a fresh borrower and returns an Authorization header for them.

    Signup itself requires an invited/admin tier (see test_auth.py); these
    tests are about application ownership, not the signup gate, so they
    always sign up as "invited" and only that response's own bearer token is
    used for the actual calls under test.
    """
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "supersecret"},
        headers={"X-Session-Tier": "invited"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_application_starts_as_draft():
    headers = _auth_headers("create@example.com")
    response = client.post("/api/applications", json={"property_value": 300000}, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "draft"
    assert body["property_value"] == 300000


def test_update_application_changes_fields():
    headers = _auth_headers("update@example.com")
    created = client.post("/api/applications", json={}, headers=headers).json()
    response = client.patch(
        f"/api/applications/{created['id']}",
        json={"property_value": 250000, "employment_status": "employee"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["property_value"] == 250000
    assert body["employment_status"] == "employee"


def test_submit_application_transitions_status():
    headers = _auth_headers("submit@example.com")
    created = client.post("/api/applications", json={}, headers=headers).json()
    response = client.post(f"/api/applications/{created['id']}/submit", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"


def test_cannot_edit_after_submit():
    headers = _auth_headers("locked@example.com")
    created = client.post("/api/applications", json={}, headers=headers).json()
    client.post(f"/api/applications/{created['id']}/submit", headers=headers)
    response = client.patch(
        f"/api/applications/{created['id']}", json={"property_value": 1}, headers=headers
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


def test_cannot_submit_twice():
    headers = _auth_headers("resubmit@example.com")
    created = client.post("/api/applications", json={}, headers=headers).json()
    client.post(f"/api/applications/{created['id']}/submit", headers=headers)
    response = client.post(f"/api/applications/{created['id']}/submit", headers=headers)
    assert response.status_code == 409


def test_withdraw_submitted_application():
    headers = _auth_headers("withdraw@example.com")
    created = client.post("/api/applications", json={}, headers=headers).json()
    client.post(f"/api/applications/{created['id']}/submit", headers=headers)
    response = client.post(f"/api/applications/{created['id']}/withdraw", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "withdrawn"


def test_cannot_withdraw_a_draft():
    headers = _auth_headers("withdraw-draft@example.com")
    created = client.post("/api/applications", json={}, headers=headers).json()
    response = client.post(f"/api/applications/{created['id']}/withdraw", headers=headers)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


def test_cannot_withdraw_twice():
    headers = _auth_headers("withdraw-twice@example.com")
    created = client.post("/api/applications", json={}, headers=headers).json()
    client.post(f"/api/applications/{created['id']}/submit", headers=headers)
    client.post(f"/api/applications/{created['id']}/withdraw", headers=headers)
    response = client.post(f"/api/applications/{created['id']}/withdraw", headers=headers)
    assert response.status_code == 409


def test_user_cannot_access_another_users_application():
    owner_headers = _auth_headers("owner@example.com")
    created = client.post("/api/applications", json={}, headers=owner_headers).json()

    other_headers = _auth_headers("other@example.com")
    response = client.get(f"/api/applications/{created['id']}", headers=other_headers)
    assert response.status_code == 404


def test_list_applications_returns_only_current_users():
    headers = _auth_headers("lister@example.com")
    client.post("/api/applications", json={}, headers=headers)
    client.post("/api/applications", json={}, headers=headers)
    response = client.get("/api/applications", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_create_and_get_require_auth():
    assert client.post("/api/applications", json={}).status_code == 401
    assert client.get("/api/applications").status_code == 401
