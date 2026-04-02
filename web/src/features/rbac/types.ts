export type KnownRole =
  | "administrator"
  | "methodologist"
  | "moderator"
  | "user";
export const KNOWN_ROLES: KnownRole[] = [
  "administrator",
  "methodologist",
  "moderator",
  "user",
];

export interface PolicyRuleOut {
  id: string;
  policy_key: string;
  role: string;
  enabled: boolean;
}

export interface PolicyMatrixOut {
  policy_key: string;
  rules: PolicyRuleOut[];
}

export interface EffectivePoliciesOut {
  policies: Record<string, string[]>;
}

export const POLICY_LABELS: Record<string, { ru: string; en: string }> = {
  "catalog.read": { ru: "Просмотр каталога", en: "Catalog View" },
  "catalog.write": { ru: "Редактирование каталога", en: "Catalog Edit" },
  "catalog.releases.read": { ru: "Просмотр релизов", en: "Releases View" },
  "catalog.releases.manage": {
    ru: "Управление релизами",
    en: "Releases Manage",
  },
  "simulation.builder": {
    ru: "Конструктор симуляции",
    en: "Simulation Builder",
  },
  "groups.view": { ru: "Просмотр групп", en: "Groups View" },
  "groups.manage": { ru: "Управление группами", en: "Groups Manage" },
  "progress.view": { ru: "Просмотр прогресса", en: "Progress View" },
  "users.manage": { ru: "Управление пользователями", en: "Users Manage" },
  "rbac.manage": { ru: "Управление доступом", en: "Access Management" },
};

export const ROLE_LABELS: Record<KnownRole, { ru: string; en: string }> = {
  administrator: { ru: "Администратор", en: "Administrator" },
  methodologist: { ru: "Методист", en: "Methodologist" },
  moderator: { ru: "Модератор", en: "Moderator" },
  user: { ru: "Пользователь", en: "User" },
};
