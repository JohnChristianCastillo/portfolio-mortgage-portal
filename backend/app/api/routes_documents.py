"""Document upload endpoints, nested under an application: a multipart
upload and a listing, both requiring ownership of the parent application
(enforced inside DocumentService, not here).
"""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.domain.models import User
from app.services.document_service import DocumentService

router = APIRouter(prefix="/applications/{application_id}/documents", tags=["documents"])


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_type: str
    filename: str
    content_type: str
    size_bytes: int


@router.post("", response_model=DocumentResponse)
async def upload_document(
    application_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    service = DocumentService(db)
    content = await file.read()
    document = service.upload(application_id, current_user, document_type, file, content)
    return DocumentResponse.model_validate(document)


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    service = DocumentService(db)
    return [
        DocumentResponse.model_validate(d)
        for d in service.list_for_application(application_id, current_user)
    ]
