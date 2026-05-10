from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.modules.auth.domain.services import AuthService
from app.modules.catalog.domain.services import CatalogService
from app.modules.diagnostics.domain.services import DiagnosticsService
from app.modules.groups.domain.services import GroupsService
from app.modules.moderation.domain.services import ModerationService
from app.modules.progress.domain.services import ProgressService
from app.modules.simulation.domain.services import SimulationService
from app.modules.support.domain.services import SupportService
from app.modules.users.domain.services import UsersService
from app.shared.db.deps import get_db


def _create_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


def _create_catalog_service(db: Session = Depends(get_db)) -> CatalogService:
    return CatalogService(db)


def _create_groups_service(db: Session = Depends(get_db)) -> GroupsService:
    return GroupsService(db)


def _create_diagnostics_service(db: Session = Depends(get_db)) -> DiagnosticsService:
    return DiagnosticsService(db)


def _create_progress_service(db: Session = Depends(get_db)) -> ProgressService:
    return ProgressService(db)


def _create_simulation_service(db: Session = Depends(get_db)) -> SimulationService:
    return SimulationService(db)


def _create_support_service(db: Session = Depends(get_db)) -> SupportService:
    return SupportService(db)


def _create_moderation_service(db: Session = Depends(get_db)) -> ModerationService:
    return ModerationService(db)


def _create_users_service(db: Session = Depends(get_db)) -> UsersService:
    return UsersService(db)


# Annotated dependencies for use in routers
AuthServiceDep = Annotated[AuthService, Depends(_create_auth_service)]
CatalogServiceDep = Annotated[CatalogService, Depends(_create_catalog_service)]
DiagnosticsServiceDep = Annotated[DiagnosticsService, Depends(_create_diagnostics_service)]
GroupsServiceDep = Annotated[GroupsService, Depends(_create_groups_service)]
ModerationServiceDep = Annotated[ModerationService, Depends(_create_moderation_service)]
ProgressServiceDep = Annotated[ProgressService, Depends(_create_progress_service)]
SimulationServiceDep = Annotated[SimulationService, Depends(_create_simulation_service)]
SupportServiceDep = Annotated[SupportService, Depends(_create_support_service)]
UsersServiceDep = Annotated[UsersService, Depends(_create_users_service)]
