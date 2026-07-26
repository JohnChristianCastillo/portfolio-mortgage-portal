"""Covers document upload: the happy path, the two rejection cases (oversized,
disallowed content-type), and that uploads/listings are scoped to the
uploading user's own application.
"""

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def _application_headers(email: str) -> tuple[dict[str, str], int]:
    signup = client.post("/api/auth/signup", json={"email": email, "password": "supersecret"})
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    application = client.post("/api/applications", json={}, headers=headers).json()
    return headers, application["id"]


def test_upload_document_happy_path():
    headers, application_id = _application_headers("uploader@example.com")
    response = client.post(
        f"/api/applications/{application_id}/documents",
        data={"document_type": "EPC Certificate"},
        files={"file": ("epc.pdf", b"%PDF-1.4 fake content", "application/pdf")},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["document_type"] == "EPC Certificate"
    assert body["filename"] == "epc.pdf"
    assert body["size_bytes"] == len(b"%PDF-1.4 fake content")


def test_upload_rejects_disallowed_content_type():
    headers, application_id = _application_headers("badtype@example.com")
    response = client.post(
        f"/api/applications/{application_id}/documents",
        data={"document_type": "Other"},
        files={"file": ("virus.exe", b"MZ fake exe", "application/x-msdownload")},
        headers=headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_upload_rejects_oversized_file(monkeypatch):
    monkeypatch.setattr(settings, "max_document_size_bytes", 10)
    headers, application_id = _application_headers("toobig@example.com")
    response = client.post(
        f"/api/applications/{application_id}/documents",
        data={"document_type": "Other"},
        files={"file": ("big.pdf", b"x" * 100, "application/pdf")},
        headers=headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_list_documents_returns_uploaded_ones():
    headers, application_id = _application_headers("lister@example.com")
    client.post(
        f"/api/applications/{application_id}/documents",
        data={"document_type": "ID Document"},
        files={"file": ("id.pdf", b"fake id", "application/pdf")},
        headers=headers,
    )
    response = client.get(f"/api/applications/{application_id}/documents", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["document_type"] == "ID Document"


def test_cannot_upload_to_another_users_application():
    _, application_id = _application_headers("owner2@example.com")
    other_headers, _ = _application_headers("intruder@example.com")

    response = client.post(
        f"/api/applications/{application_id}/documents",
        data={"document_type": "Other"},
        files={"file": ("sneaky.pdf", b"fake", "application/pdf")},
        headers=other_headers,
    )
    assert response.status_code == 404
