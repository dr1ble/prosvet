from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class _BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PolicyRuleOut(_BaseSchema):
    id: UUID
    policy_key: str
    role: str
    enabled: bool


class PolicyRuleCreateIn(_BaseSchema):
    policy_key: str = Field(min_length=1, max_length=128)
    role: str = Field(min_length=1, max_length=64)
    enabled: bool = True


class PolicyRuleUpdateIn(_BaseSchema):
    enabled: bool


class PolicyMatrixOut(_BaseSchema):
    policy_key: str
    rules: list[PolicyRuleOut]


class PolicyMatrixUpdateIn(_BaseSchema):
    roles: list[str] = Field(default_factory=list, max_length=20)


class BulkPolicyRuleUpdateIn(_BaseSchema):
    updates: list[PolicyRuleCreateIn] = Field(default_factory=list, max_length=200)


class EffectivePoliciesOut(_BaseSchema):
    policies: dict[str, list[str]]
