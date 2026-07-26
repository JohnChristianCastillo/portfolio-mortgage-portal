"""Plain CRUD over the documents table; validation and disk storage live in
DocumentService, not here.
"""

from sqlalchemy.orm import Session

from app.domain.models import Document


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **fields) -> Document:
        document = Document(**fields)
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def list_for_application(self, application_id: int) -> list[Document]:
        return (
            self.db.query(Document)
            .filter(Document.application_id == application_id)
            .order_by(Document.uploaded_at.desc())
            .all()
        )
