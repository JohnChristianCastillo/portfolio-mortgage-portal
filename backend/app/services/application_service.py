from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.domain.models import Application, User
from app.repositories.application_repository import ApplicationRepository

DRAFT = "draft"
SUBMITTED = "submitted"
WITHDRAWN = "withdrawn"


class ApplicationService:
    """Owns the application draft-to-submitted lifecycle and ownership checks.

    Ownership failures are reported as NotFoundError, not an authorization
    error, so a borrower cannot even tell that another user's application id
    exists.
    """

    def __init__(self, db: Session):
        self.db = db
        self.applications = ApplicationRepository(db)

    def create(self, user: User, **fields) -> Application:
        return self.applications.create(user_id=user.id, status=DRAFT, **fields)

    def list_for_user(self, user: User) -> list[Application]:
        return self.applications.list_for_user(user.id)

    def get_owned(self, application_id: int, user: User) -> Application:
        application = self.applications.get(application_id)
        if application is None or application.user_id != user.id:
            raise NotFoundError("application not found")
        return application

    def update(self, application_id: int, user: User, **fields) -> Application:
        application = self.get_owned(application_id, user)
        if application.status != DRAFT:
            raise ConflictError("cannot edit an application after it has been submitted")
        for key, value in fields.items():
            setattr(application, key, value)
        return self.applications.save(application)

    def submit(self, application_id: int, user: User) -> Application:
        application = self.get_owned(application_id, user)
        if application.status != DRAFT:
            raise ConflictError("application has already been submitted")
        application.status = SUBMITTED
        return self.applications.save(application)

    def withdraw(self, application_id: int, user: User) -> Application:
        """Withdrawing is a one-way step, like submitting: only a submitted
        application can be withdrawn, and a withdrawn one stays withdrawn. A
        draft is already freely editable, and can simply be left unsubmitted
        rather than withdrawn.
        """
        application = self.get_owned(application_id, user)
        if application.status != SUBMITTED:
            raise ConflictError("only a submitted application can be withdrawn")
        application.status = WITHDRAWN
        return self.applications.save(application)
