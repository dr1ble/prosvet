from app.modules.users.models import UserRole

ROLE_PERMISSION_TEMPLATES: dict[UserRole, tuple[str, ...]] = {
    UserRole.ADMINISTRATOR: (
        "dashboard.view",
        "catalog.view",
        "catalog.course.create",
        "catalog.course.update",
        "catalog.release.create",
        "catalog.release.submit_review",
        "catalog.release.approve",
        "catalog.release.publish",
        "catalog.release.update_published",
        "simulation.builder",
        "moderation.review",
        "groups.view",
        "groups.manage",
        "users.view",
        "users.manage",
        "rbac.manage",
        "progress.view",
        "search.view",
        "support.request.view",
        "support.request.manage",
    ),
    UserRole.METHODOLOGIST: (
        "dashboard.view",
        "catalog.view",
        "catalog.course.create",
        "catalog.course.update",
        "catalog.release.create",
        "catalog.release.submit_review",
        "simulation.builder",
        "search.view",
    ),
    UserRole.MODERATOR: (
        "dashboard.view",
        "catalog.view",
        "moderation.review",
        "catalog.release.approve",
        "catalog.release.publish",
        "groups.view",
        "groups.manage",
        "progress.view",
        "search.view",
        "support.request.view",
        "support.request.manage",
    ),
    UserRole.ASSISTANT: (
        "dashboard.view",
        "catalog.view",
        "groups.view",
        "groups.manage",
        "progress.view",
        "search.view",
        "support.request.view",
        "support.request.manage",
    ),
    UserRole.USER: (
        "dashboard.view",
        "progress.view.self",
        "support.request.create",
    ),
}


def permissions_for_role(role: UserRole) -> list[str]:
    return list(ROLE_PERMISSION_TEMPLATES.get(role, ()))
