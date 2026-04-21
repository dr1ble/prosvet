from uuid import uuid4

from app.modules.catalog.infra.models import Course
from app.modules.groups.domain.services import GroupsService
from app.modules.users.models import User, UserRole, UserStatus
from app.shared.auth.deps import get_current_actor
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import _create_groups_service


def test_group_qr_flow_smoke(api_client, dependency_overrider, db_session):
    admin = User(
        role=UserRole.ADMINISTRATOR,
        status=UserStatus.ACTIVE,
        login=f"admin-smoke-{uuid4().hex[:6]}",
        password_hash="hash",
        display_name="Admin Smoke",
    )
    student = User(
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        login=f"user-smoke-{uuid4().hex[:6]}",
        password_hash="hash",
        display_name="Student Smoke",
    )
    course = Course(
        slug=f"smoke-course-{uuid4().hex[:8]}",
        title="Smoke Course",
        status="active",
    )
    db_session.add(admin)
    db_session.add(student)
    db_session.add(course)
    db_session.flush()

    def _service_factory():
        return GroupsService(db_session)

    with dependency_overrider(
        {
            _create_groups_service: _service_factory,
            get_current_actor: lambda: CurrentActor(
                user_id=admin.id,
                role=UserRole.ADMINISTRATOR,
            ),
        }
    ):
        create_group = api_client.post(
            "/api/v1/groups",
            json={"name": f"Smoke Group {uuid4().hex[:6]}", "status": "active"},
        )
        assert create_group.status_code == 200
        group_id = create_group.json()["id"]

        update_members = api_client.put(
            f"/api/v1/groups/{group_id}/members",
            json={"user_ids": [str(student.id)]},
        )
        assert update_members.status_code == 200

        create_assignment = api_client.post(
            f"/api/v1/groups/{group_id}/assignments",
            json={
                "course_id": str(course.id),
                "target_user_ids": [str(student.id)],
                "start_policy": "immediate",
                "status": "active",
            },
        )
        assert create_assignment.status_code == 200

        generate_qr = api_client.post(f"/api/v1/groups/{group_id}/qr")
        assert generate_qr.status_code == 200
        deep_link_url = generate_qr.json()["deep_link_url"]
        assert deep_link_url.startswith("digitaledu://group/join/")
        qr_token = deep_link_url.rstrip("/").split("/")[-1]

    with dependency_overrider(
        {
            _create_groups_service: _service_factory,
            get_current_actor: lambda: CurrentActor(
                user_id=student.id,
                role=UserRole.USER,
            ),
        }
    ):
        resolve_qr = api_client.get(f"/api/v1/groups/qr/{qr_token}")
        assert resolve_qr.status_code == 200
        payload = resolve_qr.json()

    assert payload["group_id"] == group_id
    assert payload["course_slug"] == course.slug
