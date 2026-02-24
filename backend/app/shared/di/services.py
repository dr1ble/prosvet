from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.modules.auth.domain.services import AuthService
from app.modules.catalog.domain.services import CatalogService
from app.modules.simulation.domain.services import SimulationService
from app.shared.db.deps import get_db


@lru_cache
def get_auth_service_factory():
    """Factory for AuthService with proper DI."""
    def _create(db: Session = Depends(get_db)) -> AuthService:
        return AuthService(db)
    return _create


@lru_cache
def get_catalog_service_factory():
    """Factory for CatalogService with proper DI."""
    def _create(db: Session = Depends(get_db)) -> CatalogService:
        return CatalogService(db)
    return _create


@lru_cache
def get_simulation_service_factory():
    """Factory for SimulationService with proper DI."""
    def _create(db: Session = Depends(get_db)) -> SimulationService:
        return SimulationService(db)
    return _create


# Annotated dependencies for use in routers
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service_factory)]
CatalogServiceDep = Annotated[CatalogService, Depends(get_catalog_service_factory)]
SimulationServiceDep = Annotated[SimulationService, Depends(get_simulation_service_factory)]
