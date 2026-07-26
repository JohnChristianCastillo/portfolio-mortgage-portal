from sqlalchemy.orm import Session

from app.domain.models import Application


class ApplicationRepository:
    """Plain CRUD over the applications table; state-machine rules live in ApplicationService."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, **fields) -> Application:
        application = Application(user_id=user_id, **fields)
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        return application

    def get(self, application_id: int) -> Application | None:
        return self.db.get(Application, application_id)

    def list_for_user(self, user_id: int) -> list[Application]:
        return (
            self.db.query(Application)
            .filter(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
            .all()
        )

    def save(self, application: Application) -> Application:
        self.db.commit()
        self.db.refresh(application)
        return application
