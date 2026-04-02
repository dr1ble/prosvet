from app.modules.users.models import UserRole

POLICY_ROLE_MAP: dict[str, set[UserRole]] = {
    "catalog.read": {
        UserRole.ADMINISTRATOR,
        UserRole.METHODOLOGIST,
        UserRole.MODERATOR,
    },
    "catalog.write": {
        UserRole.ADMINISTRATOR,
        UserRole.METHODOLOGIST,
        UserRole.MODERATOR,
    },
    "catalog.releases.read": {
        UserRole.ADMINISTRATOR,
        UserRole.METHODOLOGIST,
        UserRole.MODERATOR,
    },
    "simulation.builder": {
        UserRole.ADMINISTRATOR,
        UserRole.METHODOLOGIST,
    },
    "groups.view": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
    },
    "groups.manage": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
    },
    "progress.view": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
    },
}
