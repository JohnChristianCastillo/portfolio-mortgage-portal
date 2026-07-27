from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Base class for errors that map to a specific HTTP status and error code."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "domain_error"

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class UnauthorizedError(DomainError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthorized"


class ConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


class ForbiddenError(DomainError):
    """The caller is identified (e.g. by the gateway's verified tier header)
    but not permitted - distinct from UnauthorizedError, which means no
    identity was presented at all."""

    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class ValidationError(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "validation_error"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )
