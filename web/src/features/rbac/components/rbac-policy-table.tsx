"use client";

import { useCallback, useState } from "react";

import { togglePolicyRule, fetchPolicies } from "../api";
import { KNOWN_ROLES, POLICY_LABELS, ROLE_LABELS } from "../types";
import type { KnownRole, PolicyRuleOut } from "../types";

import styles from "./rbac-policy-table.module.css";

type RbacPolicyTableProps = {
  initialRules: PolicyRuleOut[];
  accessToken: string;
  language: "ru" | "en";
};

type MatrixCell = {
  policyKey: string;
  role: KnownRole;
  enabled: boolean;
  pending: boolean;
};

function buildMatrix(
  rules: PolicyRuleOut[],
): Map<string, Map<KnownRole, MatrixCell>> {
  const matrix = new Map<string, Map<KnownRole, MatrixCell>>();

  for (const policyKey of Object.keys(POLICY_LABELS)) {
    const roleMap = new Map<KnownRole, MatrixCell>();
    for (const role of KNOWN_ROLES) {
      const rule = rules.find(
        (r) => r.policy_key === policyKey && r.role === role,
      );
      roleMap.set(role, {
        policyKey,
        role,
        enabled: rule?.enabled ?? false,
        pending: false,
      });
    }
    matrix.set(policyKey, roleMap);
  }

  return matrix;
}

export function RbacPolicyTable({
  initialRules,
  accessToken,
  language,
}: RbacPolicyTableProps) {
  const [matrix, setMatrix] = useState(() => buildMatrix(initialRules));
  const [selectedRole, setSelectedRole] = useState<KnownRole | "all">("all");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleToggle = useCallback((policyKey: string, role: KnownRole) => {
    setMatrix((prev) => {
      const next = new Map(prev);
      const roleMap = new Map(next.get(policyKey)!);
      const cell = roleMap.get(role)!;
      roleMap.set(role, { ...cell, enabled: !cell.enabled });
      next.set(policyKey, roleMap);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus(null);

    try {
      const updates: Promise<unknown>[] = [];

      for (const [policyKey, roleMap] of matrix) {
        for (const [role, cell] of roleMap) {
          updates.push(
            togglePolicyRule(policyKey, role, cell.enabled).catch((err) => {
              console.error(`Failed to update ${policyKey}/${role}:`, err);
            }),
          );
        }
      }

      await Promise.all(updates);

      const refreshed = await fetchPolicies(accessToken);
      setMatrix(buildMatrix(refreshed));
      setStatus({
        type: "success",
        message:
          language === "ru"
            ? "Политики успешно обновлены"
            : "Policies updated successfully",
      });
    } catch {
      setStatus({
        type: "error",
        message:
          language === "ru"
            ? "Ошибка при сохранении политик"
            : "Failed to save policies",
      });
    } finally {
      setSaving(false);
    }
  }, [matrix, accessToken, language]);

  const saveLabel = language === "ru" ? "Сохранить" : "Save";
  const savingLabel = language === "ru" ? "Сохранение..." : "Saving...";
  const policyColumnLabel = language === "ru" ? "Политика" : "Policy";
  const roleModeLabel =
    language === "ru" ? "Редактирование роли" : "Editing role";
  const roleColumns = selectedRole === "all" ? KNOWN_ROLES : [selectedRole];

  return (
    <div className={styles.panel}>
      <div className={styles.roleFilters}>
        <span className={styles.roleFiltersLabel}>{roleModeLabel}</span>
        <button
          type="button"
          className={`${styles.roleFilterBtn} ${selectedRole === "all" ? styles.roleFilterBtnActive : ""}`}
          onClick={() => setSelectedRole("all")}
          disabled={saving}
        >
          {language === "ru" ? "Все роли" : "All roles"}
        </button>
        {KNOWN_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className={`${styles.roleFilterBtn} ${selectedRole === role ? styles.roleFilterBtnActive : ""}`}
            onClick={() => setSelectedRole(role)}
            disabled={saving}
          >
            {ROLE_LABELS[role]?.[language] ?? role}
          </button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{policyColumnLabel}</th>
              {roleColumns.map((role) => (
                <th key={role}>{ROLE_LABELS[role]?.[language] ?? role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(matrix.entries()).map(([policyKey, roleMap]) => {
              const label = POLICY_LABELS[policyKey];
              const policyDisplay = label?.[language] ?? policyKey;

              return (
                <tr key={policyKey}>
                  <td>
                    <div className={styles.policyCell}>
                      <span className={styles.policyKey}>{policyKey}</span>
                      <span className={styles.policyLabel}>
                        {policyDisplay}
                      </span>
                    </div>
                  </td>
                  {roleColumns.map((role) => {
                    const cell = roleMap.get(role)!;
                    return (
                      <td key={role}>
                        <button
                          type="button"
                          className={`${styles.toggleBtn} ${cell.enabled ? styles.enabled : ""}`}
                          onClick={() => handleToggle(policyKey, role)}
                          disabled={saving}
                          aria-label={`${policyKey} / ${role}: ${cell.enabled ? "enabled" : "disabled"}`}
                        >
                          {cell.enabled
                            ? language === "ru"
                              ? "Вкл"
                              : "On"
                            : language === "ru"
                              ? "Выкл"
                              : "Off"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? savingLabel : saveLabel}
        </button>
        {status && (
          <span
            className={`${styles.status} ${status.type === "error" ? styles.error : ""}`}
          >
            {status.message}
          </span>
        )}
      </div>
    </div>
  );
}
