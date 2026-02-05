from uuid import UUID

from pydantic import BaseModel

from app.modules.users.models import UserRole


class CurrentActor(BaseModel):
    user_id: UUID
    role: UserRole
