from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.metrics import router as metrics_router
from app.modules.auth.api.router import router as auth_router
from app.modules.catalog.api.router import router as catalog_router
from app.modules.groups.api.router import router as groups_router
from app.modules.moderation.api.router import router as moderation_router
from app.modules.progress.api.router import router as progress_router
from app.modules.rbac.api.router import router as rbac_router
from app.modules.search.api.router import router as search_router
from app.modules.simulation.api.router import router as simulation_router
from app.modules.support.api.router import router as support_router
from app.modules.users.api.router import router as users_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(metrics_router)
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(catalog_router, prefix="/catalog", tags=["catalog"])
api_router.include_router(groups_router, prefix="/groups", tags=["groups"])
api_router.include_router(moderation_router, prefix="/moderation", tags=["moderation"])
api_router.include_router(progress_router, prefix="/progress", tags=["progress"])
api_router.include_router(simulation_router, prefix="/simulation", tags=["simulation"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(rbac_router, prefix="/rbac", tags=["rbac"])
api_router.include_router(search_router, prefix="/search", tags=["search"])
api_router.include_router(support_router, prefix="/support", tags=["support"])
