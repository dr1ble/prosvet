"use client";

import { useState } from "react";

import { updateUser } from "@/features/users/api";
import type { UserOverviewItemDto } from "@/features/users/types";
import { toUserErrorMessage } from "@/shared/lib/api-error";
import { DataState } from "@/shared/ui/data-state";

import styles from "./users-admin-table.module.css";

type UsersAdminTableProps = {
  language: "ru" | "en";
  initialUsers: UserOverviewItemDto[];
  currentUserId: string;
};

function roleLabel(role: string, language: "ru" | "en"): string {
  const labels: Record<string, { ru: string; en: string }> = {
    administrator: { ru: "Администратор", en: "Administrator" },
    methodologist: { ru: "Методолог", en: "Methodologist" },
    moderator: { ru: "Модератор", en: "Moderator" },
    user: { ru: "Пользователь", en: "User" },
  };
  return language === "ru"
    ? (labels[role]?.ru ?? role)
    : (labels[role]?.en ?? role);
}

function statusLabel(status: string, language: "ru" | "en"): string {
  if (status === "active") return language === "ru" ? "Активен" : "Active";
  if (status === "blocked")
    return language === "ru" ? "Заблокирован" : "Blocked";
  return status;
}

export function UsersAdminTable({
  language,
  initialUsers,
  currentUserId,
}: UsersAdminTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePatch = async (
    userId: string,
    payload: { display_name?: string | null; role?: string; status?: string },
  ) => {
    setPendingId(userId);
    setError(null);
    try {
      const updated = await updateUser(userId, payload);
      setUsers((current) =>
        current.map((user) => (user.user_id === userId ? updated : user)),
      );
    } catch (requestError) {
      setError(
        toUserErrorMessage(
          requestError,
          language === "ru"
            ? "Не удалось обновить пользователя."
            : "Failed to update user.",
        ),
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className={styles.tableWrap}>
      {error ? (
        <DataState
          tone="error"
          role="alert"
          title={language === "ru" ? "Не удалось обновить" : "Update failed"}
          description={error}
        />
      ) : null}
      {users.length === 0 ? (
        <DataState
          title={language === "ru" ? "Нет пользователей" : "No users"}
          description={
            language === "ru"
              ? "Список пользователей пока пуст. Добавьте пользователей или проверьте источник данных."
              : "User list is empty. Add users or verify data source."
          }
        />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{language === "ru" ? "Имя" : "Name"}</th>
              <th>{language === "ru" ? "Логин" : "Login"}</th>
              <th>{language === "ru" ? "Роль" : "Role"}</th>
              <th>{language === "ru" ? "Статус" : "Status"}</th>
              <th>{language === "ru" ? "Доступы" : "Permissions"}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                {(() => {
                  const isCurrentUser = user.user_id === currentUserId;
                  return (
                    <>
                      <td>
                        <input
                          className={styles.inlineInput}
                          defaultValue={user.display_name ?? user.login ?? ""}
                          onBlur={(event) => {
                            const nextValue = event.target.value.trim();
                            if (
                              (user.display_name ?? user.login ?? "") !==
                              nextValue
                            ) {
                              void handlePatch(user.user_id, {
                                display_name: nextValue || null,
                              });
                            }
                          }}
                        />
                      </td>
                      <td>{user.login ?? "-"}</td>
                      <td>
                        <select
                          className={styles.inlineSelect}
                          value={user.role}
                          onChange={(event) =>
                            void handlePatch(user.user_id, {
                              role: event.target.value,
                            })
                          }
                          disabled={pendingId === user.user_id || isCurrentUser}
                        >
                          <option value="administrator">
                            {roleLabel("administrator", language)}
                          </option>
                          <option value="methodologist">
                            {roleLabel("methodologist", language)}
                          </option>
                          <option value="moderator">
                            {roleLabel("moderator", language)}
                          </option>
                          <option value="user">
                            {roleLabel("user", language)}
                          </option>
                        </select>
                      </td>
                      <td>
                        <button
                          className={`${styles.statusButton} ${user.status === "active" ? styles.statusActive : styles.statusBlocked}`}
                          type="button"
                          onClick={() =>
                            void handlePatch(user.user_id, {
                              status:
                                user.status === "active" ? "blocked" : "active",
                            })
                          }
                          disabled={pendingId === user.user_id || isCurrentUser}
                          title={
                            isCurrentUser
                              ? language === "ru"
                                ? "Нельзя менять собственный статус"
                                : "Cannot change your own status"
                              : undefined
                          }
                        >
                          {statusLabel(user.status, language)}
                        </button>
                      </td>
                      <td>
                        {user.permissions.length}
                        {isCurrentUser ? (
                          <span className={styles.selfBadge}>
                            {language === "ru" ? "Вы" : "You"}
                          </span>
                        ) : null}
                      </td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
