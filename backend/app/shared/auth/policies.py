from app.modules.users.models import UserRole

POLICY_ROLE_MAP: dict[str, set[UserRole]] = {
    "catalog.read": {
        UserRole.ADMINISTRATOR,
        UserRole.METHODOLOGIST,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
        UserRole.USER,
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
        UserRole.ASSISTANT,
    },
    "groups.manage": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "auth.qr.personal.issue": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "auth.qr.onboarding.issue": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "users.manage": {
        UserRole.ADMINISTRATOR,
    },
    "progress.view": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "progress.view.self": {
        UserRole.USER,
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "progress.upsert.self": {
        UserRole.USER,
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "search.view": {
        UserRole.ADMINISTRATOR,
        UserRole.METHODOLOGIST,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "catalog.release.submit_review": {
        UserRole.ADMINISTRATOR,
        UserRole.METHODOLOGIST,
    },
    "catalog.release.approve": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
    },
    "moderation.review": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
    },
    "support.request.create": {
        UserRole.USER,
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "support.request.view": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
    "support.request.manage": {
        UserRole.ADMINISTRATOR,
        UserRole.MODERATOR,
        UserRole.ASSISTANT,
    },
}
