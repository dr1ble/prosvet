from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.auth.policy_models import RbacPolicyRule


class RbacRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all_rules(self) -> list[RbacPolicyRule]:
        stmt = select(RbacPolicyRule).order_by(RbacPolicyRule.policy_key, RbacPolicyRule.role)
        return list(self.db.scalars(stmt).all())

    def list_rules_by_policy(self, policy_key: str) -> list[RbacPolicyRule]:
        stmt = (
            select(RbacPolicyRule)
            .where(RbacPolicyRule.policy_key == policy_key)
            .order_by(RbacPolicyRule.role)
        )
        return list(self.db.scalars(stmt).all())

    def get_rule(self, policy_key: str, role: str) -> RbacPolicyRule | None:
        stmt = select(RbacPolicyRule).where(
            RbacPolicyRule.policy_key == policy_key,
            RbacPolicyRule.role == role,
        )
        return self.db.scalar(stmt)

    def upsert_rule(self, policy_key: str, role: str, enabled: bool) -> RbacPolicyRule:
        existing = self.get_rule(policy_key, role)
        if existing is not None:
            existing.enabled = enabled
            self.db.flush()
            return existing
        rule = RbacPolicyRule(policy_key=policy_key, role=role, enabled=enabled)
        self.db.add(rule)
        self.db.flush()
        return rule

    def delete_rule(self, policy_key: str, role: str) -> bool:
        rule = self.get_rule(policy_key, role)
        if rule is None:
            return False
        self.db.delete(rule)
        self.db.flush()
        return True

    def get_effective_policies(self) -> dict[str, list[str]]:
        rules = self.list_all_rules()
        result: dict[str, list[str]] = {}
        for rule in rules:
            if rule.enabled:
                result.setdefault(rule.policy_key, []).append(rule.role)
        return result
