import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api import (
    routes_admin,
    routes_applications,
    routes_auth,
    routes_documents,
    routes_health,
    routes_simulate,
)
from app.config import settings
from app.core.errors import register_error_handlers
from app.db import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(settings.app_name)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Mortgage Borrower Portal API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response

    register_error_handlers(app)

    # Ungated on purpose, unlike everything below: the gateway only requires an
    # admitted session for /api/* paths, and a container/gateway health check
    # must work before any session exists. Matches the other apps in this stack.
    app.include_router(routes_health.router)
    app.include_router(routes_simulate.router, prefix="/api")
    app.include_router(routes_auth.router, prefix="/api")
    app.include_router(routes_applications.router, prefix="/api")
    app.include_router(routes_documents.router, prefix="/api")
    app.include_router(routes_admin.router, prefix="/api")

    _mount_spa(app)

    return app


def _mount_spa(app: FastAPI) -> None:
    """Serves the built Angular app (production only - unset in local dev,
    where ng serve's own proxy serves the frontend instead). Angular's router
    uses real client-side paths like /apply, not hash routing, so a plain
    StaticFiles mount isn't enough: any GET that isn't a static asset or an
    /api route has to fall back to index.html for the Angular router to
    handle it, or a hard refresh on /apply would 404.
    """
    if not settings.static_dir:
        return
    static_root = Path(settings.static_dir)
    if not static_root.is_dir():
        return

    @app.get("/{full_path:path}")
    async def spa(full_path: str) -> FileResponse:
        candidate = static_root / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(static_root / "index.html")


app = create_app()
