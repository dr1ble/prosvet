from fastapi import APIRouter

from app.api.health import router as health_router
from app.modules.auth.api.router import router as auth_router
from app.modules.catalog.api.router import router as catalog_router
from app.modules.simulation.api.router import router as simulation_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(catalog_router, prefix="/catalog", tags=["catalog"])
api_router.include_router(simulation_router, prefix="/simulation", tags=["simulation"])
