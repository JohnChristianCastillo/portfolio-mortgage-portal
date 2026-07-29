"""Mortgage application CRUD: create a draft, edit it, then submit it.

All routes require a logged-in borrower (get_current_user) and are scoped to
that borrower's own applications - ApplicationService.get_owned returns 404
rather than 403 for someone else's application, so ids don't leak existence.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db import get_db
from app.domain.models import User
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplicationCreate(BaseModel):
    property_value: float = Field(default=0.0, ge=0)
    loan_amount: float = Field(default=0.0, ge=0)
    monthly_income: float = Field(default=0.0, ge=0)
    monthly_expenses: float = Field(default=0.0, ge=0)
    term_years: int = Field(default=25, ge=5, le=35)
    interest_rate: float = Field(default=0.0, ge=0)
    employment_status: str | None = None


class ApplicationUpdate(BaseModel):
    property_value: float | None = Field(default=None, ge=0)
    loan_amount: float | None = Field(default=None, ge=0)
    monthly_income: float | None = Field(default=None, ge=0)
    monthly_expenses: float | None = Field(default=None, ge=0)
    term_years: int | None = Field(default=None, ge=5, le=35)
    interest_rate: float | None = Field(default=None, ge=0)
    employment_status: str | None = None


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    property_value: float
    loan_amount: float
    monthly_income: float
    monthly_expenses: float
    term_years: int
    interest_rate: float
    employment_status: str | None


@router.post("", response_model=ApplicationResponse)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    service = ApplicationService(db)
    application = service.create(current_user, **payload.model_dump())
    return ApplicationResponse.model_validate(application)


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ApplicationResponse]:
    service = ApplicationService(db)
    return [ApplicationResponse.model_validate(a) for a in service.list_for_user(current_user)]


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    service = ApplicationService(db)
    application = service.get_owned(application_id, current_user)
    return ApplicationResponse.model_validate(application)


@router.patch("/{application_id}", response_model=ApplicationResponse)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    service = ApplicationService(db)
    application = service.update(
        application_id, current_user, **payload.model_dump(exclude_unset=True)
    )
    return ApplicationResponse.model_validate(application)


@router.post("/{application_id}/submit", response_model=ApplicationResponse)
def submit_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    service = ApplicationService(db)
    application = service.submit(application_id, current_user)
    return ApplicationResponse.model_validate(application)


@router.post("/{application_id}/withdraw", response_model=ApplicationResponse)
def withdraw_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    service = ApplicationService(db)
    application = service.withdraw(application_id, current_user)
    return ApplicationResponse.model_validate(application)
