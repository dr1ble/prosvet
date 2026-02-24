from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.modules.auth.domain.services import AuthService
from app.modules.catalog.domain.services import CatalogService
from app.modules.simulation.domain.services import SimulationService
from app.shared.db.deps import get_db


def _create_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


def _create_catalog_service(db: Session = Depends(get_db)) -> CatalogService:
    return CatalogService(db)


def _create_simulation_service(db: Session = Depends(get_db)) -> SimulationService:
    return SimulationService(db)


# Annotated dependencies for use in routers
AuthServiceDep = Annotated[AuthService, Depends(_create_auth_service)]
CatalogServiceDep = Annotated[CatalogService, Depends(_create_catalog_service)]
SimulationServiceDep = Annotated[SimulationService, Depends(_create_simulation_service)]
