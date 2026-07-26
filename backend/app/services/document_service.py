"""Validates and stores an uploaded document on local disk, then records it
against its owning application. Ownership is delegated to ApplicationService
rather than re-implemented here, so the 404-not-403 rule stays in one place.
"""

import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.core.errors import ValidationError
from app.domain.models import Document, User
from app.repositories.document_repository import DocumentRepository
from app.services.application_service import ApplicationService

# A real bank would verify file contents, not just the declared content-type.
# For this scope, rejecting an unexpected type is enough to demonstrate the
# validation path (e.g. never accept an executable).
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
    "application/octet-stream",
}


class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.documents = DocumentRepository(db)
        self.applications = ApplicationService(db)

    def upload(
        self,
        application_id: int,
        user: User,
        document_type: str,
        upload: UploadFile,
        content: bytes,
    ) -> Document:
        self.applications.get_owned(application_id, user)

        if upload.content_type not in ALLOWED_CONTENT_TYPES:
            raise ValidationError(f"unsupported file type: {upload.content_type}")
        if len(content) > settings.max_document_size_bytes:
            raise ValidationError("file exceeds the maximum allowed size")

        directory = Path(settings.documents_dir) / str(application_id)
        directory.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}_{upload.filename}"
        storage_path = directory / stored_name
        storage_path.write_bytes(content)

        return self.documents.create(
            application_id=application_id,
            document_type=document_type,
            filename=upload.filename,
            content_type=upload.content_type,
            size_bytes=len(content),
            storage_path=str(storage_path),
        )

    def list_for_application(self, application_id: int, user: User) -> list[Document]:
        self.applications.get_owned(application_id, user)
        return self.documents.list_for_application(application_id)
