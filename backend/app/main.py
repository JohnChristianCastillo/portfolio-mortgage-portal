import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_health, routes_simulate
from app.config import settings
from app.core.errors import register_error_handlers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(settings.app_name)


def create_app() -> FastAPI:
    app = FastAPI(title="Mortgage Borrower Portal API")

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

    app.include_router(routes_health.router, prefix="/api")
    app.include_router(routes_simulate.router, prefix="/api")

    return app


app = create_app()
