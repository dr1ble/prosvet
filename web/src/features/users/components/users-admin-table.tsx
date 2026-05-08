"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Image from "next/image";
import { toDataURL } from "qrcode";

import {
  createUser,
  generateOnboardingLoginQr,
  updateUser,
} from "@/features/users/api";
import type { OnboardingQrDto } from "@/features/users/api";
import type { UserOverviewItemDto } from "@/features/users/types";
import { toUserErrorMessage } from "@/shared/lib/api-error";
import { DataState } from "@/shared/ui/data-state";

import styles from "./users-admin-table.module.css";

type UsersAdminTableProps = {
  language: "ru" | "en";
  title: string;
  summary: ReactNode;
  initialUsers: UserOverviewItemDto[];
  currentUserId: string;
};

const USER_ROLE_OPTIONS = [
  "administrator",
  "methodologist",
  "moderator",
  "assistant",
  "user",
];

const DEFAULT_CREATE_FORM = {
  displayName: "",
  login: "",
  password: "",
  role: "user",
  status: "active",
};

const DEFAULT_EDIT_FORM = {
  userId: "",
  displayName: "",
  role: "user",
  status: "active",
};

function roleLabel(role: string, language: "ru" | "en"): string {
  const labels: Record<string, { ru: string; en: string }> = {
    administrator: { ru: "Администратор", en: "Administrator" },
    methodologist: { ru: "Методолог", en: "Methodologist" },
    moderator: { ru: "Модератор", en: "Moderator" },
    assistant: { ru: "Ассистент", en: "Assistant" },
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

function formatDateTime(
  value: string | null | undefined,
  language: "ru" | "en",
): string {
  if (!value) return "-";
  return new Date(value).toLocaleString(language === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UsersAdminTable({
  language,
  title,
  summary,
  initialUsers,
  currentUserId,
}: UsersAdminTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [onboardingQr, setOnboardingQr] = useState<OnboardingQrDto | null>(
    null,
  );
  const [onboardingQrImageUrl, setOnboardingQrImageUrl] = useState<
    string | null
  >(null);
  const [onboardingQrOpen, setOnboardingQrOpen] = useState(false);
  const [onboardingQrPending, setOnboardingQrPending] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserPending, setCreateUserPending] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserPending, setEditUserPending] = useState(false);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [error, setError] = useState<string | null>(null);

  const resetCreateForm = () => {
    setCreateForm(DEFAULT_CREATE_FORM);
  };

  const handlePatch = async (
    userId: string,
    payload: { display_name?: string | null; role?: string; status?: string },
  ): Promise<boolean> => {
    setPendingId(userId);
    setError(null);
    try {
      const updated = await updateUser(userId, payload);
      setUsers((current) =>
        current.map((user) => (user.user_id === userId ? updated : user)),
      );
      return true;
    } catch (requestError) {
      setError(
        toUserErrorMessage(
          requestError,
          language === "ru"
            ? "Не удалось обновить пользователя."
            : "Failed to update user.",
        ),
      );
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const handleGenerateOnboardingQr = async () => {
    setOnboardingQrPending(true);
    setError(null);
    try {
      const qrPayload = await generateOnboardingLoginQr();
      const imageUrl = await toDataURL(qrPayload.deep_link_url, {
        width: 320,
        margin: 1,
      });
      setOnboardingQr(qrPayload);
      setOnboardingQrImageUrl(imageUrl);
      setOnboardingQrOpen(true);
    } catch (requestError) {
      setError(
        toUserErrorMessage(
          requestError,
          language === "ru"
            ? "Не удалось сформировать QR для нового пользователя."
            : "Failed to generate QR for a new user.",
        ),
      );
    } finally {
      setOnboardingQrPending(false);
    }
  };

  const handleOpenEditUser = (user: UserOverviewItemDto) => {
    setEditForm({
      userId: user.user_id,
      displayName: user.display_name ?? user.login ?? "",
      role: user.role,
      status: user.status,
    });
    setError(null);
    setEditUserOpen(true);
  };

  const handleEditUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editForm.userId) {
      return;
    }
    setEditUserPending(true);
    setError(null);
    try {
      await handlePatch(editForm.userId, {
        display_name: editForm.displayName.trim() || null,
        role: editForm.role,
        status: editForm.status,
      });
      setEditUserOpen(false);
      setEditForm(DEFAULT_EDIT_FORM);
    } finally {
      setEditUserPending(false);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateUserPending(true);
    setError(null);
    try {
      const created = await createUser({
        display_name: createForm.displayName.trim() || null,
        login: createForm.login.trim(),
        password: createForm.password,
        role: createForm.role,
        status: createForm.status,
      });
      setUsers((current) => [created, ...current]);
      setCreateUserOpen(false);
      resetCreateForm();
    } catch (requestError) {
      setError(
        toUserErrorMessage(
          requestError,
          language === "ru"
            ? "Не удалось добавить пользователя."
            : "Failed to add user.",
        ),
      );
    } finally {
      setCreateUserPending(false);
    }
  };

  const normalizedSearch = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesSearch = normalizedSearch
      ? `${user.display_name ?? ""} ${user.login ?? ""} ${user.user_id}`
          .toLowerCase()
          .includes(normalizedSearch)
      : true;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableHeader}>
        <div className={styles.titleCluster}>
          <h2 className={styles.tableTitle}>{title}</h2>
          {summary}
        </div>
        <button
          className={styles.primaryAction}
          type="button"
          onClick={() => {
            setError(null);
            setCreateUserOpen(true);
          }}
        >
          {language === "ru" ? "Добавить пользователя" : "Add user"}
        </button>
        <button
          className={styles.primaryAction}
          type="button"
          onClick={() => void handleGenerateOnboardingQr()}
          disabled={onboardingQrPending}
        >
          {onboardingQrPending
            ? language === "ru"
              ? "Формируем QR..."
              : "Generating QR..."
            : language === "ru"
              ? "QR для нового пользователя"
              : "QR for new user"}
        </button>
      </div>
      <div className={styles.filtersBar}>
        <label className={styles.searchField}>
          <span>{language === "ru" ? "Поиск" : "Search"}</span>
          <input
            className={styles.filterInput}
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder={
              language === "ru"
                ? "Поиск по имени или логину"
                : "Search by name or login"
            }
          />
        </label>
        <label className={styles.filterField}>
          <span>{language === "ru" ? "Роль" : "Role"}</span>
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">
              {language === "ru" ? "Все роли" : "All roles"}
            </option>
            {USER_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role, language)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>{language === "ru" ? "Статус" : "Status"}</span>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">
              {language === "ru" ? "Все статусы" : "All statuses"}
            </option>
            <option value="active">{statusLabel("active", language)}</option>
            <option value="blocked">{statusLabel("blocked", language)}</option>
          </select>
        </label>
      </div>
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
      ) : filteredUsers.length === 0 ? (
        <DataState
          title={language === "ru" ? "Ничего не найдено" : "No matches"}
          description={
            language === "ru"
              ? "Измените поиск, роль или статус, чтобы увидеть пользователей."
              : "Adjust search, role, or status to see users."
          }
        />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{language === "ru" ? "Имя" : "Name"}</th>
                <th>{language === "ru" ? "Логин" : "Login"}</th>
                <th>{language === "ru" ? "Роль" : "Role"}</th>
                <th>{language === "ru" ? "Статус" : "Status"}</th>
                <th>{language === "ru" ? "Доступы" : "Permissions"}</th>
                <th aria-label={language === "ru" ? "Действия" : "Actions"} />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id}>
                  {(() => {
                    const isCurrentUser = user.user_id === currentUserId;
                    return (
                      <>
                        <td>
                          <span className={styles.readOnlyValue}>
                            {user.display_name ?? user.login ?? ""}
                          </span>
                        </td>
                        <td>{user.login ?? "-"}</td>
                        <td>
                          <span className={styles.readOnlyValue}>
                            {roleLabel(user.role, language)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusButton} ${user.status === "active" ? styles.statusActive : styles.statusBlocked}`}
                          >
                            {statusLabel(user.status, language)}
                          </span>
                        </td>
                        <td>
                          {user.permissions.length}
                          {isCurrentUser ? (
                            <span className={styles.selfBadge}>
                              {language === "ru" ? "Вы" : "You"}
                            </span>
                          ) : null}
                        </td>
                        <td className={styles.actionsCell}>
                          <details className={styles.rowActionsMenu}>
                            <summary
                              className={styles.rowActionsTrigger}
                              aria-label={
                                language === "ru" ? "Действия" : "Actions"
                              }
                            >
                              ⋯
                            </summary>
                            <div className={styles.rowActionsPopover}>
                              <button
                                type="button"
                                className={styles.rowActionButton}
                                onClick={() => handleOpenEditUser(user)}
                              >
                                {language === "ru" ? "Редактировать" : "Edit"}
                              </button>
                              <button
                                type="button"
                                className={styles.rowActionButton}
                                onClick={() =>
                                  void handlePatch(user.user_id, {
                                    status:
                                      user.status === "active"
                                        ? "blocked"
                                        : "active",
                                  })
                                }
                                disabled={
                                  pendingId === user.user_id || isCurrentUser
                                }
                              >
                                {user.status === "active"
                                  ? language === "ru"
                                    ? "Заблокировать"
                                    : "Block"
                                  : language === "ru"
                                    ? "Разблокировать"
                                    : "Unblock"}
                              </button>
                            </div>
                          </details>
                        </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editUserOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <form
            className={styles.userModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            onSubmit={(event) => void handleEditUser(event)}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 id="edit-user-title" className={styles.modalTitle}>
                  {language === "ru"
                    ? "Редактировать пользователя"
                    : "Edit user"}
                </h3>
                <p className={styles.modalSubtitle}>
                  {language === "ru"
                    ? "Измените имя, роль и статус выбранного пользователя."
                    : "Update the selected user name, role, and status."}
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => {
                  setEditUserOpen(false);
                  setEditForm(DEFAULT_EDIT_FORM);
                }}
                aria-label={language === "ru" ? "Закрыть" : "Close"}
              >
                ×
              </button>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Имя" : "Name"}</span>
                <input
                  className={styles.filterInput}
                  value={editForm.displayName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Роль" : "Role"}</span>
                <select
                  className={styles.filterSelect}
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                >
                  {USER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Статус" : "Status"}</span>
                <select
                  className={styles.filterSelect}
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="active">
                    {statusLabel("active", language)}
                  </option>
                  <option value="blocked">
                    {statusLabel("blocked", language)}
                  </option>
                </select>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={() => {
                  setEditUserOpen(false);
                  setEditForm(DEFAULT_EDIT_FORM);
                }}
              >
                {language === "ru" ? "Отмена" : "Cancel"}
              </button>
              <button
                className={styles.primaryAction}
                type="submit"
                disabled={editUserPending}
              >
                {editUserPending
                  ? language === "ru"
                    ? "Сохраняем..."
                    : "Saving..."
                  : language === "ru"
                    ? "Сохранить"
                    : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {createUserOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <form
            className={styles.userModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            onSubmit={(event) => void handleCreateUser(event)}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 id="create-user-title" className={styles.modalTitle}>
                  {language === "ru" ? "Добавить пользователя" : "Add user"}
                </h3>
                <p className={styles.modalSubtitle}>
                  {language === "ru"
                    ? "Создайте учетную запись вручную, если пользователю нужен логин и пароль без QR."
                    : "Create an account manually when the user needs login and password without QR."}
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => {
                  setCreateUserOpen(false);
                  resetCreateForm();
                }}
                aria-label={language === "ru" ? "Закрыть" : "Close"}
              >
                ×
              </button>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Имя" : "Name"}</span>
                <input
                  className={styles.filterInput}
                  value={createForm.displayName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder={
                    language === "ru"
                      ? "Например, Анна Петрова"
                      : "For example, Anna Petrova"
                  }
                />
              </label>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Логин" : "Login"}</span>
                <input
                  className={styles.filterInput}
                  value={createForm.login}
                  minLength={3}
                  maxLength={120}
                  required
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      login: event.target.value,
                    }))
                  }
                  placeholder={language === "ru" ? "student01" : "student01"}
                />
              </label>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Пароль" : "Password"}</span>
                <input
                  className={styles.filterInput}
                  type="password"
                  value={createForm.password}
                  minLength={6}
                  maxLength={255}
                  required
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder={
                    language === "ru"
                      ? "Минимум 6 символов"
                      : "At least 6 characters"
                  }
                />
              </label>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Роль" : "Role"}</span>
                <select
                  className={styles.filterSelect}
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                >
                  {USER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formField}>
                <span>{language === "ru" ? "Статус" : "Status"}</span>
                <select
                  className={styles.filterSelect}
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="active">
                    {statusLabel("active", language)}
                  </option>
                  <option value="blocked">
                    {statusLabel("blocked", language)}
                  </option>
                </select>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={() => {
                  setCreateUserOpen(false);
                  resetCreateForm();
                }}
              >
                {language === "ru" ? "Отмена" : "Cancel"}
              </button>
              <button
                className={styles.primaryAction}
                type="submit"
                disabled={createUserPending}
              >
                {createUserPending
                  ? language === "ru"
                    ? "Добавляем..."
                    : "Adding..."
                  : language === "ru"
                    ? "Добавить"
                    : "Add"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {onboardingQrOpen && onboardingQr && onboardingQrImageUrl ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.qrModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-qr-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 id="onboarding-qr-title" className={styles.modalTitle}>
                  {language === "ru"
                    ? "QR для нового пользователя"
                    : "QR for a new user"}
                </h3>
                <p className={styles.modalSubtitle}>
                  {language === "ru"
                    ? "После сканирования будет создан новый пользователь и выполнен вход."
                    : "Scanning creates a new user and signs them in."}
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setOnboardingQrOpen(false)}
                aria-label={language === "ru" ? "Закрыть" : "Close"}
              >
                ×
              </button>
            </div>
            <div className={styles.qrImageBox}>
              <Image
                className={styles.qrImage}
                src={onboardingQrImageUrl}
                width={260}
                height={260}
                alt={
                  language === "ru"
                    ? "QR-код для создания нового пользователя"
                    : "QR code for creating a new user"
                }
              />
            </div>
            <p className={styles.qrLink}>{onboardingQr.deep_link_url}</p>
            <p className={styles.qrExpiry}>
              {language === "ru" ? "Действует до" : "Valid until"}:{" "}
              {formatDateTime(onboardingQr.expires_at, language)}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={() =>
                  void navigator.clipboard.writeText(onboardingQr.deep_link_url)
                }
              >
                {language === "ru" ? "Скопировать ссылку" : "Copy link"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
