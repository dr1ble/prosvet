from app.modules.users.models import UserRole

POLICY_ROLE_MAP: dict[str, set[UserRole]] = {
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
}
