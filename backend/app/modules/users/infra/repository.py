from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.models import User


class UsersRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_users(self) -> list[User]:
        stmt = select(User).order_by(
            User.display_name.asc().nulls_last(), User.login.asc().nulls_last()
        )
        return list(self.db.scalars(stmt).all())

    def get_user(self, user_id: str) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.db.scalar(stmt)

    def get_user_by_login(self, login: str) -> User | None:
        stmt = select(User).where(User.login == login)
        return self.db.scalar(stmt)

    def create_user(
        self,
        *,
        login: str,
        display_name: str | None,
        password_hash: str,
        role,
        status,
    ) -> User:
        user = User(
            login=login,
            display_name=display_name,
            password_hash=password_hash,
            role=role,
            status=status,
        )
        self.db.add(user)
        self.db.flush()
        return user
