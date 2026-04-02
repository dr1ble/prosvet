from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.core.config import settings
from app.modules.auth.infra.repository import AuthRepository
from app.modules.users.models import UserRole
from app.shared.db.session import SessionLocal
from app.shared.middleware.logging import LoggingMiddleware
from app.shared.middleware.security import SecurityHeadersMiddleware
from app.shared.security.passwords import hash_password
from app.shared.security.rate_limit import limiter


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    cors_origins = settings.cors_origins_list
    allow_any_origin = "*" in cors_origins

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=not allow_any_origin,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Logging middleware
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Try again later."},
        )

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()


def _seed_admin_on_startup() -> None:
    try:
        admin_login = (settings.admin_login or "").strip().lower()
        admin_password = settings.admin_password or ""
        if not admin_login or not admin_password:
            return
        with SessionLocal() as db:
            repo = AuthRepository(db)
            existing = repo.get_user_by_login(admin_login)
            if existing is None:
                repo.create_user(
                    role=UserRole.ADMINISTRATOR,
                    login=admin_login,
                    password_hash=hash_password(admin_password),
                )
                db.commit()
    except Exception:
        # Do not crash startup; admin bootstrap will occur on first login if needed
        pass


_seed_admin_on_startup()
