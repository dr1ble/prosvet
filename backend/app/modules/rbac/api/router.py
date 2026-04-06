from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.modules.rbac.api.schemas import (
    BulkPolicyRuleUpdateIn,
    EffectivePoliciesOut,
    PolicyMatrixOut,
    PolicyMatrixUpdateIn,
    PolicyRuleCreateIn,
    PolicyRuleOut,
    PolicyRuleUpdateIn,
)
from app.modules.rbac.domain.service import validate_role
from app.modules.rbac.infra.repository import RbacRepository
from app.shared.auth.deps import require_policy
from app.shared.auth.policy_models import RbacPolicyRule
from app.shared.db.deps import get_db

router = APIRouter()


def _repo(db: Session) -> RbacRepository:
    return RbacRepository(db)


def _rule_to_out(rule: RbacPolicyRule) -> PolicyRuleOut:
    return PolicyRuleOut(
        id=rule.id,
        policy_key=rule.policy_key,
        role=rule.role,
        enabled=rule.enabled,
    )


@router.get("/policies", response_model=list[PolicyRuleOut])
def list_policies(
    policy_key: str | None = None,
    role: str | None = None,
    enabled: bool | None = None,
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> list[PolicyRuleOut]:
    rules = _repo(db).list_all_rules()
    if policy_key:
        rules = [r for r in rules if r.policy_key == policy_key]
    if role:
        rules = [r for r in rules if r.role == role]
    if enabled is not None:
        rules = [r for r in rules if r.enabled == enabled]
    return [_rule_to_out(r) for r in rules]


@router.get("/policies/effective", response_model=EffectivePoliciesOut)
def effective_policies(
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> EffectivePoliciesOut:
    return EffectivePoliciesOut(policies=_repo(db).get_effective_policies())


@router.get("/policies/{policy_key}", response_model=PolicyMatrixOut)
def get_policy_matrix(
    policy_key: str,
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> PolicyMatrixOut:
    rules = _repo(db).list_rules_by_policy(policy_key)
    return PolicyMatrixOut(
        policy_key=policy_key,
        rules=[_rule_to_out(r) for r in rules],
    )


@router.put("/policies/{policy_key}", response_model=PolicyMatrixOut)
def update_policy_matrix(
    policy_key: str,
    payload: PolicyMatrixUpdateIn,
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> PolicyMatrixOut:
    for role in payload.roles:
        validate_role(role)

    repo = _repo(db)
    current_rules = repo.list_rules_by_policy(policy_key)
    current_role_set = {r.role for r in current_rules}
    new_role_set = set(payload.roles)

    for role_to_disable in current_role_set - new_role_set:
        repo.upsert_rule(policy_key, role_to_disable, False)

    for role_to_enable in new_role_set:
        repo.upsert_rule(policy_key, role_to_enable, True)

    rules = repo.list_rules_by_policy(policy_key)
    return PolicyMatrixOut(
        policy_key=policy_key,
        rules=[_rule_to_out(r) for r in rules],
    )


@router.patch("/policies/{policy_key}/{role}", response_model=PolicyRuleOut)
def toggle_policy_rule(
    policy_key: str,
    role: str,
    payload: PolicyRuleUpdateIn,
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> PolicyRuleOut:
    validate_role(role)
    rule = _repo(db).upsert_rule(policy_key, role, payload.enabled)
    return _rule_to_out(rule)


@router.post("/policies:bulk-update", response_model=list[PolicyRuleOut])
def bulk_update_policies(
    payload: BulkPolicyRuleUpdateIn,
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> list[PolicyRuleOut]:
    repo = _repo(db)
    results: list[PolicyRuleOut] = []
    for item in payload.updates:
        validate_role(item.role)
        rule = repo.upsert_rule(item.policy_key, item.role, item.enabled)
        results.append(_rule_to_out(rule))
    return results


@router.post("/policies", response_model=PolicyRuleOut)
def create_policy_rule(
    payload: PolicyRuleCreateIn,
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> PolicyRuleOut:
    validate_role(payload.role)
    rule = _repo(db).upsert_rule(payload.policy_key, payload.role, payload.enabled)
    return _rule_to_out(rule)


@router.delete("/policies/{policy_key}/{role}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy_rule(
    policy_key: str,
    role: str,
    db: Session = Depends(get_db),
    _actor=Depends(require_policy("rbac.manage")),
) -> None:
    validate_role(role)
    deleted = _repo(db).delete_rule(policy_key, role)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Правило политики не найдено")
