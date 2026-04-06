"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toDataURL } from "qrcode";

import {
  archiveGroup,
  createGroup,
  createGroupAssignment,
  generateGroupQr,
  replaceGroupMembers,
  restoreGroup,
  updateGroup,
  updateGroupAssignment,
} from "@/features/groups/api";
import type {
  AssignmentStartPolicy,
  AssignmentStatus,
  GroupAssignmentDto,
  GroupDto,
  GroupMemberDto,
  GroupQrDto,
  GroupUserOptionDto,
} from "@/features/groups/types";
import type { CourseDto } from "@/features/catalog/types";
import { toUserErrorMessage } from "@/shared/lib/api-error";
import { DataState } from "@/shared/ui/data-state";

import styles from "./groups-workspace.module.css";

type GroupsWorkspaceProps = {
  language: "ru" | "en";
  initialGroups: GroupDto[];
  initialUsers: GroupUserOptionDto[];
  initialMembers: GroupMemberDto[];
  initialAssignments: GroupAssignmentDto[];
  initialSelectedGroupId: string | null;
  courses: CourseDto[];
};

export function GroupsWorkspace({
  language,
  initialGroups,
  initialUsers,
  initialMembers,
  initialAssignments,
  initialSelectedGroupId,
  courses,
}: GroupsWorkspaceProps) {
  const router = useRouter();
  const isRu = language === "ru";

  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialSelectedGroupId,
  );
  const [members, setMembers] = useState(initialMembers);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editName, setEditName] = useState(
    initialGroups.find((group) => group.id === initialSelectedGroupId)?.name ??
      "",
  );
  const [editDescription, setEditDescription] = useState(
    initialGroups.find((group) => group.id === initialSelectedGroupId)
      ?.description ?? "",
  );

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(initialMembers.map((member) => member.user_id)),
  );

  const [courseId, setCourseId] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"all" | "selected">(
    "all",
  );
  const [assignmentUserIds, setAssignmentUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );
  const [editingAssignmentUserIds, setEditingAssignmentUserIds] = useState<
    Set<string>
  >(new Set());
  const [editingAssignmentSearch, setEditingAssignmentSearch] = useState("");
  const [startPolicy, setStartPolicy] =
    useState<AssignmentStartPolicy>("immediate");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<
    "all" | "selected" | "unselected"
  >("all");
  const [assignmentFilter, setAssignmentFilter] = useState<
    "all" | "selected" | "unselected"
  >("all");
  const [groupSavedHint, setGroupSavedHint] = useState<string | null>(null);
  const [groupQr, setGroupQr] = useState<GroupQrDto | null>(null);
  const [groupQrImageUrl, setGroupQrImageUrl] = useState<string | null>(null);
  const [groupQrModalOpen, setGroupQrModalOpen] = useState(false);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const uniqueUsers = useMemo(() => {
    const seen = new Set<string>();
    return initialUsers.filter((user) => {
      if (seen.has(user.user_id)) {
        return false;
      }
      seen.add(user.user_id);
      return true;
    });
  }, [initialUsers]);

  const text = {
    groupsTitle: isRu ? "Учебные группы" : "Learning groups",
    createGroup: isRu ? "Создать группу" : "Create group",
    updateGroup: isRu ? "Сохранить группу" : "Save group",
    archive: isRu ? "В архив" : "Archive",
    restore: isRu ? "Восстановить" : "Restore",
    members: isRu ? "Участники" : "Members",
    saveMembers: isRu ? "Сохранить участников" : "Save members",
    assignments: isRu ? "Назначения" : "Assignments",
    createAssignment: isRu ? "Создать назначение" : "Create assignment",
    createQr: isRu ? "QR для входа в группу" : "Group join QR",
    regenerateQr: isRu ? "Обновить QR" : "Regenerate QR",
    qrScansHint: isRu
      ? "Покажите QR участникам: после сканирования они откроют обучение для своей группы."
      : "Show this QR to members: scanning opens learning for their group.",
    selectGroup: isRu
      ? "Выберите группу в списке слева."
      : "Select a group from the list.",
  };

  function groupStatusLabel(status: string): string {
    if (isRu) {
      return status === "archived" ? "Архив" : "Активна";
    }
    return status === "archived" ? "Archived" : "Active";
  }

  function formatDateTime(value: string | null | undefined): string {
    if (!value) return "-";
    return new Date(value).toLocaleString(isRu ? "ru-RU" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function assignmentStatusLabel(status: AssignmentStatus): string {
    if (status === "draft") return isRu ? "Черновик" : "Draft";
    if (status === "scheduled") return isRu ? "Запланировано" : "Scheduled";
    if (status === "active") return isRu ? "Активно" : "Active";
    if (status === "completed") return isRu ? "Завершено" : "Completed";
    return isRu ? "Отменено" : "Cancelled";
  }

  function startPolicyLabel(policy: AssignmentStartPolicy): string {
    if (policy === "scheduled") {
      return isRu ? "По расписанию" : "Scheduled";
    }
    return isRu ? "Сразу" : "Immediate";
  }

  const filteredUsers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return uniqueUsers.filter((user) => {
      const selected = selectedUserIds.has(user.user_id);
      if (memberFilter === "selected" && !selected) return false;
      if (memberFilter === "unselected" && selected) return false;
      const label =
        `${user.display_name ?? ""} ${user.login ?? ""}`.toLowerCase();
      return !query || label.includes(query);
    });
  }, [memberFilter, memberSearch, selectedUserIds, uniqueUsers]);

  const filteredAssignmentUsers = useMemo(() => {
    const query = assignmentSearch.trim().toLowerCase();
    return uniqueUsers.filter((user) => {
      const selected = assignmentUserIds.has(user.user_id);
      if (assignmentFilter === "selected" && !selected) return false;
      if (assignmentFilter === "unselected" && selected) return false;
      const label =
        `${user.display_name ?? ""} ${user.login ?? ""}`.toLowerCase();
      return !query || label.includes(query);
    });
  }, [assignmentFilter, assignmentSearch, assignmentUserIds, uniqueUsers]);

  const selectedMemberLabels = useMemo(
    () =>
      uniqueUsers
        .filter((user) => selectedUserIds.has(user.user_id))
        .map((user) => user.display_name || user.login || user.user_id),
    [selectedUserIds, uniqueUsers],
  );

  const selectedAssignmentLabels = useMemo(
    () =>
      uniqueUsers
        .filter((user) => assignmentUserIds.has(user.user_id))
        .map((user) => user.display_name || user.login || user.user_id),
    [assignmentUserIds, uniqueUsers],
  );

  const editingAssignment = useMemo(
    () =>
      assignments.find((assignment) => assignment.id === editingAssignmentId) ??
      null,
    [assignments, editingAssignmentId],
  );

  const filteredEditingAssignmentUsers = useMemo(() => {
    const query = editingAssignmentSearch.trim().toLowerCase();
    if (!query) return uniqueUsers;
    return uniqueUsers.filter((user) => {
      const label =
        `${user.display_name ?? ""} ${user.login ?? ""}`.toLowerCase();
      return label.includes(query);
    });
  }, [editingAssignmentSearch, uniqueUsers]);

  const activeAssignmentsCount = useMemo(
    () =>
      assignments.filter((assignment) => assignment.status === "active").length,
    [assignments],
  );

  const targetedAssignmentsCount = useMemo(
    () =>
      assignments.filter((assignment) => assignment.target_users_count > 0)
        .length,
    [assignments],
  );

  const nextStep = useMemo(() => {
    if (!selectedGroup) {
      return null;
    }

    if (members.length === 0) {
      return {
        step: isRu ? "Добавьте участников" : "Add members",
        text: isRu
          ? "Группа создана, но в ней пока нет участников. Отметьте пользователей и сохраните состав."
          : "The group exists, but it has no members yet. Select users and save the roster.",
      };
    }

    if (assignments.length === 0) {
      return {
        step: isRu ? "Создайте первое назначение" : "Create first assignment",
        text: isRu
          ? "Участники уже добавлены. Выберите курс и откройте группе доступ к обучению."
          : "Members are already added. Pick a course and open access to learning.",
      };
    }

    if (activeAssignmentsCount === 0) {
      return {
        step: isRu ? "Активируйте назначение" : "Activate assignment",
        text: isRu
          ? "Назначения есть, но сейчас нет ни одного активного. Проверьте статус и даты старта."
          : "Assignments exist, but none are active right now. Check status and start dates.",
      };
    }

    return {
      step: isRu ? "Группа настроена" : "Group is set up",
      text: isRu
        ? "Состав группы и назначение курса уже готовы. Можно контролировать индивидуальные цели и сроки."
        : "Members and course assignments are already configured. You can now manage targets and deadlines.",
    };
  }, [
    activeAssignmentsCount,
    assignments.length,
    isRu,
    members.length,
    selectedGroup,
  ]);

  const readiness = useMemo(() => {
    if (!selectedGroup) return 0;
    let score = 0;
    if (selectedGroup.name.trim()) score += 1;
    if (members.length > 0) score += 1;
    if (assignments.length > 0) score += 1;
    if (activeAssignmentsCount > 0) score += 1;
    return Math.round((score / 4) * 100);
  }, [
    activeAssignmentsCount,
    assignments.length,
    members.length,
    selectedGroup,
  ]);

  const activeStep = useMemo(() => {
    if (!selectedGroup) return 0;
    if (members.length === 0) return 2;
    if (assignments.length === 0 || activeAssignmentsCount === 0) return 3;
    return 1;
  }, [
    activeAssignmentsCount,
    assignments.length,
    members.length,
    selectedGroup,
  ]);

  function pickGroup(groupId: string) {
    setSelectedGroupId(groupId);
    const group = groups.find((item) => item.id === groupId);
    setEditName(group?.name ?? "");
    setEditDescription(group?.description ?? "");
    setMemberSearch("");
    setAssignmentSearch("");
    setError(null);
    setSuccess(null);
    router.push(`/groups?groupId=${groupId}&lang=${language}`);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        status: "active",
      });
      setGroups((prev) => [created, ...prev]);
      setNewGroupName("");
      setNewGroupDescription("");
      setCreateModalOpen(false);
      setSuccess(isRu ? "Группа создана" : "Group created");
      pickGroup(created.id);
      router.refresh();
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu ? "Не удалось создать группу" : "Failed to create group",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateGroup() {
    if (!selectedGroupId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateGroup(selectedGroupId, {
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
      });
      setGroups((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setGroupSavedHint(isRu ? "Изменения сохранены" : "Changes saved");
      setSuccess(isRu ? "Данные группы обновлены" : "Group details updated");
      router.refresh();
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu ? "Не удалось обновить группу" : "Failed to update group",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoSaveGroup() {
    if (!selectedGroupId || !selectedGroup) return;
    const nextName = editName.trim();
    const nextDescription = editDescription.trim();
    const currentName = selectedGroup.name.trim();
    const currentDescription = (selectedGroup.description ?? "").trim();
    if (
      !nextName ||
      (nextName === currentName && nextDescription === currentDescription)
    ) {
      return;
    }
    await handleUpdateGroup();
  }

  async function handleToggleArchive() {
    if (!selectedGroupId || !selectedGroup) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next =
        selectedGroup.status === "archived"
          ? await restoreGroup(selectedGroupId)
          : await archiveGroup(selectedGroupId);
      setGroups((prev) =>
        prev.map((item) => (item.id === next.id ? next : item)),
      );
      setSuccess(
        selectedGroup.status === "archived"
          ? isRu
            ? "Группа восстановлена"
            : "Group restored"
          : isRu
            ? "Группа отправлена в архив"
            : "Group archived",
      );
      router.refresh();
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu
            ? "Не удалось изменить статус группы"
            : "Failed to change group status",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMembers() {
    if (!selectedGroupId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await replaceGroupMembers(
        selectedGroupId,
        Array.from(selectedUserIds),
      );
      setMembers(updated);
      setSuccess(isRu ? "Состав группы сохранен" : "Members saved");
      router.refresh();
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu ? "Не удалось сохранить участников" : "Failed to save members",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAssignment() {
    if (!selectedGroupId || !courseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createGroupAssignment(selectedGroupId, {
        course_id: courseId,
        target_user_ids:
          assignmentMode === "selected" ? Array.from(assignmentUserIds) : [],
        start_policy: startPolicy,
        starts_at: startsAt || undefined,
        ends_at: endsAt || undefined,
        status: startPolicy === "scheduled" ? "scheduled" : "active",
      });
      setAssignments((prev) => [created, ...prev]);
      setCourseId("");
      setAssignmentMode("all");
      setAssignmentUserIds(new Set());
      setStartsAt("");
      setEndsAt("");
      setAssignmentSearch("");
      setSuccess(isRu ? "Назначение создано" : "Assignment created");
      router.refresh();
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu
            ? "Не удалось создать назначение"
            : "Failed to create assignment",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignmentStatusChange(
    assignmentId: string,
    status: AssignmentStatus,
  ) {
    if (!selectedGroupId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateGroupAssignment(
        selectedGroupId,
        assignmentId,
        { status },
      );
      setAssignments((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess(
        isRu ? "Статус назначения обновлен" : "Assignment status updated",
      );
      router.refresh();
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu
            ? "Не удалось обновить назначение"
            : "Failed to update assignment",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAssignmentTargets(assignmentId: string) {
    if (!selectedGroupId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateGroupAssignment(
        selectedGroupId,
        assignmentId,
        {
          target_user_ids: Array.from(editingAssignmentUserIds),
        },
      );
      setAssignments((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingAssignmentId(null);
      setEditingAssignmentUserIds(new Set());
      setEditingAssignmentSearch("");
      setSuccess(isRu ? "Индивидуальные цели сохранены" : "Targets saved");
      router.refresh();
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu
            ? "Не удалось обновить индивидуальные цели"
            : "Failed to update assignment targets",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateGroupQr() {
    if (!selectedGroupId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const qrPayload = await generateGroupQr(selectedGroupId);
      const imageUrl = await toDataURL(qrPayload.deep_link_url, {
        width: 320,
        margin: 1,
      });
      setGroupQr(qrPayload);
      setGroupQrImageUrl(imageUrl);
      setGroupQrModalOpen(true);
      setSuccess(isRu ? "QR-код готов" : "QR code is ready");
    } catch (err) {
      setError(
        toUserErrorMessage(
          err,
          isRu ? "Не удалось сформировать QR" : "Failed to generate QR",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.workspace}>
      <aside className={styles.panel}>
        <div className={styles.sidebarHead}>
          <div>
            <h2 className={styles.sectionTitle}>{text.groupsTitle}</h2>
          </div>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            type="button"
            onClick={() => setCreateModalOpen(true)}
          >
            {isRu ? "+ Новая группа" : "+ New group"}
          </button>
        </div>

        <ul className={styles.list}>
          {groups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                className={`${styles.itemButton} ${selectedGroupId === group.id ? styles.itemButtonActive : ""}`}
                onClick={() => pickGroup(group.id)}
              >
                <div className={styles.itemRow}>
                  <p className={styles.itemName}>{group.name}</p>
                  <span className={styles.itemStatus}>
                    {groupStatusLabel(group.status)}
                  </span>
                </div>
                <p className={styles.itemMeta}>
                  {isRu ? "Обновлено" : "Updated"}:{" "}
                  {formatDateTime(group.updated_at)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className={styles.panel}>
        {!selectedGroup ? (
          <DataState
            title={text.selectGroup}
            description={
              isRu
                ? "После выбора группы здесь появится полный сценарий: данные, участники и назначения."
                : "After selecting a group, the full workflow will appear here: details, members, and assignments."
            }
            className={styles.emptyStateCard}
          />
        ) : (
          <>
            <div className={styles.headerRow}>
              <h2 className={styles.sectionTitle}>{selectedGroup.name}</h2>
              <span className={styles.statusBadge}>
                {groupStatusLabel(selectedGroup.status)}
              </span>
            </div>

            <div className={styles.kpiRow}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  {isRu ? "Готовность" : "Readiness"}
                </span>
                <strong className={styles.kpiValue}>{readiness}%</strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  {isRu ? "Участников" : "Members"}
                </span>
                <strong className={styles.kpiValue}>{members.length}</strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  {isRu ? "Назначений" : "Assignments"}
                </span>
                <strong className={styles.kpiValue}>
                  {assignments.length}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  {isRu ? "Активных" : "Active"}
                </span>
                <strong className={styles.kpiValue}>
                  {activeAssignmentsCount}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  {isRu ? "Индивид. целей" : "Targeted"}
                </span>
                <strong className={styles.kpiValue}>
                  {targetedAssignmentsCount}
                </strong>
              </article>
            </div>

            <div className={styles.progressRail}>
              <div
                className={`${styles.progressStep} ${selectedGroup?.name ? styles.progressStepDone : ""}`}
              >
                <span>1</span>
                <p>{isRu ? "Группа создана" : "Group created"}</p>
              </div>
              <div
                className={`${styles.progressStep} ${members.length > 0 ? styles.progressStepDone : activeStep === 2 ? styles.progressStepCurrent : ""}`}
              >
                <span>2</span>
                <p>{isRu ? "Участники добавлены" : "Members added"}</p>
              </div>
              <div
                className={`${styles.progressStep} ${assignments.length > 0 ? styles.progressStepDone : activeStep === 3 ? styles.progressStepCurrent : ""}`}
              >
                <span>3</span>
                <p>{isRu ? "Назначения созданы" : "Assignments created"}</p>
              </div>
            </div>

            {nextStep ? (
              <div className={styles.nextStepCard}>
                <span className={styles.nextStepLabel}>
                  {isRu ? "Следующий шаг" : "Next step"}
                </span>
                <strong className={styles.nextStepTitle}>
                  {nextStep.step}
                </strong>
                <p className={styles.nextStepText}>{nextStep.text}</p>
              </div>
            ) : null}

            <section
              className={`${styles.workflowSection} ${activeStep === 1 ? styles.workflowSectionActive : ""}`}
            >
              <div className={styles.stepHead}>
                <span className={styles.stepNumber}>1</span>
                <div className={styles.stepContent}>
                  <h3 className={styles.sectionTitle}>
                    {isRu ? "Данные группы" : "Group details"}
                  </h3>
                  <p className={styles.muted}>
                    {isRu
                      ? "Название, описание и рабочий статус группы."
                      : "Group name, description, and working status."}
                  </p>
                </div>
              </div>
              <div className={styles.formGrid}>
                <input
                  className={styles.input}
                  value={editName}
                  onChange={(event) => {
                    setEditName(event.target.value);
                    setGroupSavedHint(null);
                  }}
                  onBlur={() => void handleAutoSaveGroup()}
                />
                <textarea
                  className={styles.textarea}
                  value={editDescription}
                  onChange={(event) => {
                    setEditDescription(event.target.value);
                    setGroupSavedHint(null);
                  }}
                  onBlur={() => void handleAutoSaveGroup()}
                />
                {groupSavedHint ? (
                  <p className={styles.savedHint}>{groupSavedHint}</p>
                ) : null}
                <div className={styles.row}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    type="button"
                    onClick={() => void handleUpdateGroup()}
                    disabled={saving || !editName.trim()}
                  >
                    {text.updateGroup}
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    type="button"
                    onClick={() => void handleToggleArchive()}
                    disabled={saving}
                  >
                    {selectedGroup.status === "archived"
                      ? text.restore
                      : text.archive}
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    type="button"
                    onClick={() => void handleGenerateGroupQr()}
                    disabled={saving || selectedGroup.status !== "active"}
                  >
                    {groupQr ? text.regenerateQr : text.createQr}
                  </button>
                </div>
              </div>
            </section>

            <section
              className={`${styles.workflowSection} ${activeStep === 2 ? styles.workflowSectionActive : ""}`}
            >
              <div className={styles.stepHead}>
                <span className={styles.stepNumber}>2</span>
                <div className={styles.stepContent}>
                  <h3 className={styles.sectionTitle}>{text.members}</h3>
                  <p className={styles.muted}>
                    {isRu
                      ? "Отметьте пользователей, которые должны входить в группу."
                      : "Select users who should belong to the group."}
                  </p>
                </div>
                <span className={styles.stepHint}>
                  {isRu ? "Выбрано" : "Selected"}: {selectedUserIds.size}
                </span>
              </div>

              {selectedMemberLabels.length > 0 ? (
                <div className={styles.selectionSummary}>
                  {selectedMemberLabels.slice(0, 8).map((label) => (
                    <span key={label} className={styles.summaryChip}>
                      {label}
                    </span>
                  ))}
                  {selectedMemberLabels.length > 8 ? (
                    <span className={styles.summaryChip}>
                      +{selectedMemberLabels.length - 8}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {uniqueUsers.length === 0 ? (
                <DataState
                  compact
                  title={
                    isRu ? "Нет доступных пользователей" : "No users available"
                  }
                  description={
                    isRu
                      ? "Добавьте пользователей в систему, затем вернитесь к набору участников группы."
                      : "Add users to the system, then return to group membership setup."
                  }
                />
              ) : (
                <>
                  <input
                    className={styles.input}
                    placeholder={isRu ? "Поиск участника" : "Search member"}
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                  />
                  <div className={styles.filterRow}>
                    <button
                      type="button"
                      className={`${styles.filterChip} ${memberFilter === "all" ? styles.filterChipActive : ""}`}
                      onClick={() => setMemberFilter("all")}
                    >
                      {isRu ? "Все" : "All"}
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterChip} ${memberFilter === "selected" ? styles.filterChipActive : ""}`}
                      onClick={() => setMemberFilter("selected")}
                    >
                      {isRu ? "Выбраны" : "Selected"}
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterChip} ${memberFilter === "unselected" ? styles.filterChipActive : ""}`}
                      onClick={() => setMemberFilter("unselected")}
                    >
                      {isRu ? "Не выбраны" : "Unselected"}
                    </button>
                  </div>
                  <div className={styles.membersList}>
                    {filteredUsers.map((user) => {
                      const checked = selectedUserIds.has(user.user_id);
                      const label =
                        user.display_name || user.login || user.user_id;
                      return (
                        <label key={user.user_id} className={styles.memberRow}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked)
                                  next.add(user.user_id);
                                else next.delete(user.user_id);
                                return next;
                              });
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {filteredUsers.length === 0 ? (
                    <DataState
                      compact
                      title={isRu ? "Ничего не найдено" : "No matches"}
                      description={
                        isRu
                          ? "Измените фильтр или строку поиска, чтобы увидеть участников."
                          : "Adjust filters or search query to see members."
                      }
                    />
                  ) : null}
                </>
              )}
              <div className={styles.actionBar}>
                <span className={styles.actionHint}>
                  {isRu
                    ? "Сначала отметьте нужных участников, затем сохраните состав группы."
                    : "Select members first, then save the group roster."}
                </span>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="button"
                  onClick={() => void handleSaveMembers()}
                  disabled={saving}
                >
                  {text.saveMembers}
                </button>
              </div>
            </section>

            <section
              className={`${styles.workflowSection} ${activeStep === 3 ? styles.workflowSectionActive : ""}`}
            >
              <div className={styles.stepHead}>
                <span className={styles.stepNumber}>3</span>
                <div className={styles.stepContent}>
                  <h3 className={styles.sectionTitle}>{text.assignments}</h3>
                  <p className={styles.muted}>
                    {isRu
                      ? "Назначьте курс всей группе или выбранным участникам."
                      : "Assign a course to the whole group or to selected members."}
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <select
                  className={styles.select}
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                >
                  <option value="">
                    {isRu ? "Выберите курс" : "Select course"}
                  </option>
                  {courses
                    .filter((course) => course.status !== "archived")
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                </select>

                <div className={styles.choiceRow}>
                  <label className={styles.choiceCard}>
                    <input
                      type="radio"
                      checked={assignmentMode === "all"}
                      onChange={() => setAssignmentMode("all")}
                    />
                    <span>
                      {isRu ? "Назначить всей группе" : "Assign to whole group"}
                    </span>
                  </label>
                  <label className={styles.choiceCard}>
                    <input
                      type="radio"
                      checked={assignmentMode === "selected"}
                      onChange={() => setAssignmentMode("selected")}
                    />
                    <span>
                      {isRu
                        ? "Только выбранным участникам"
                        : "Assign to selected members"}
                    </span>
                  </label>
                </div>

                <select
                  className={styles.select}
                  value={startPolicy}
                  onChange={(event) =>
                    setStartPolicy(event.target.value as AssignmentStartPolicy)
                  }
                >
                  <option value="immediate">
                    {isRu ? "Старт сразу" : "Start immediately"}
                  </option>
                  <option value="scheduled">
                    {isRu ? "Старт по расписанию" : "Scheduled start"}
                  </option>
                </select>

                <div className={styles.row}>
                  <div className={styles.fieldCol}>
                    <span className={styles.fieldLabel}>
                      {isRu ? "Начало (опционально)" : "Start (optional)"}
                    </span>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                    />
                  </div>
                  <div className={styles.fieldCol}>
                    <span className={styles.fieldLabel}>
                      {isRu ? "Окончание (опционально)" : "End (optional)"}
                    </span>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                    />
                  </div>
                </div>

                {assignmentMode === "selected" ? (
                  <>
                    {selectedAssignmentLabels.length > 0 ? (
                      <div className={styles.selectionSummary}>
                        {selectedAssignmentLabels.slice(0, 8).map((label) => (
                          <span key={label} className={styles.summaryChip}>
                            {label}
                          </span>
                        ))}
                        {selectedAssignmentLabels.length > 8 ? (
                          <span className={styles.summaryChip}>
                            +{selectedAssignmentLabels.length - 8}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <input
                      className={styles.input}
                      placeholder={
                        isRu
                          ? "Поиск участника для назначения"
                          : "Search member for assignment"
                      }
                      value={assignmentSearch}
                      onChange={(event) =>
                        setAssignmentSearch(event.target.value)
                      }
                    />
                    <div className={styles.filterRow}>
                      <button
                        type="button"
                        className={`${styles.filterChip} ${assignmentFilter === "all" ? styles.filterChipActive : ""}`}
                        onClick={() => setAssignmentFilter("all")}
                      >
                        {isRu ? "Все" : "All"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.filterChip} ${assignmentFilter === "selected" ? styles.filterChipActive : ""}`}
                        onClick={() => setAssignmentFilter("selected")}
                      >
                        {isRu ? "Выбраны" : "Selected"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.filterChip} ${assignmentFilter === "unselected" ? styles.filterChipActive : ""}`}
                        onClick={() => setAssignmentFilter("unselected")}
                      >
                        {isRu ? "Не выбраны" : "Unselected"}
                      </button>
                    </div>
                    <div className={styles.membersList}>
                      {filteredAssignmentUsers.map((user) => {
                        const checked = assignmentUserIds.has(user.user_id);
                        const label =
                          user.display_name || user.login || user.user_id;
                        return (
                          <label
                            key={`assignment-${user.user_id}`}
                            className={styles.memberRow}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setAssignmentUserIds((prev) => {
                                  const next = new Set(prev);
                                  if (event.target.checked)
                                    next.add(user.user_id);
                                  else next.delete(user.user_id);
                                  return next;
                                });
                              }}
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {filteredAssignmentUsers.length === 0 ? (
                      <DataState
                        compact
                        title={isRu ? "Ничего не найдено" : "No matches"}
                        description={
                          isRu
                            ? "Измените фильтр целевых участников или строку поиска."
                            : "Adjust target-user filter or search query."
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </div>

              <ul className={styles.list}>
                {assignments.length === 0 ? (
                  <li className={styles.assignmentEmpty}>
                    <DataState
                      compact
                      title={
                        isRu ? "Назначений пока нет" : "No assignments yet"
                      }
                      description={
                        isRu
                          ? "Выберите курс и сохраните первое назначение, чтобы открыть обучение для группы."
                          : "Choose a course and save the first assignment to open learning for the group."
                      }
                    />
                  </li>
                ) : (
                  assignments.map((assignment) => (
                    <li key={assignment.id} className={styles.assignmentItem}>
                      <div className={styles.assignmentHeader}>
                        <strong className={styles.assignmentTitle}>
                          {assignment.course_title}
                        </strong>
                        <span className={styles.assignmentDate}>
                          {isRu ? "Окно" : "Window"}:{" "}
                          {assignment.starts_at
                            ? formatDateTime(assignment.starts_at)
                            : "-"}{" "}
                          -{" "}
                          {assignment.ends_at
                            ? formatDateTime(assignment.ends_at)
                            : "-"}
                        </span>
                      </div>
                      <div className={styles.assignmentMeta}>
                        <span
                          className={`${styles.assignmentStatus} ${styles[`assignmentStatus_${assignment.status}`] || ""}`}
                        >
                          {assignmentStatusLabel(assignment.status)}
                        </span>
                        <span className={styles.itemMeta}>
                          {isRu ? "Старт" : "Start"}:{" "}
                          {startPolicyLabel(assignment.start_policy)}
                        </span>
                        <span className={styles.itemMeta}>
                          {isRu ? "Индивид. целей" : "Targets"}:{" "}
                          {assignment.target_users_count}
                        </span>
                        <span className={styles.itemMeta}>
                          {isRu ? "Обновлено" : "Updated"}:{" "}
                          {formatDateTime(assignment.updated_at)}
                        </span>
                      </div>
                      <div className={styles.row}>
                        <select
                          className={styles.select}
                          value={assignment.status}
                          onChange={(event) =>
                            void handleAssignmentStatusChange(
                              assignment.id,
                              event.target.value as AssignmentStatus,
                            )
                          }
                        >
                          <option value="draft">
                            {assignmentStatusLabel("draft")}
                          </option>
                          <option value="scheduled">
                            {assignmentStatusLabel("scheduled")}
                          </option>
                          <option value="active">
                            {assignmentStatusLabel("active")}
                          </option>
                          <option value="completed">
                            {assignmentStatusLabel("completed")}
                          </option>
                          <option value="cancelled">
                            {assignmentStatusLabel("cancelled")}
                          </option>
                        </select>
                        <button
                          className={styles.btn}
                          type="button"
                          onClick={() => {
                            if (editingAssignmentId === assignment.id) {
                              setEditingAssignmentId(null);
                              setEditingAssignmentUserIds(new Set());
                              setEditingAssignmentSearch("");
                              return;
                            }
                            setEditingAssignmentId(assignment.id);
                            setEditingAssignmentUserIds(
                              new Set(assignment.target_user_ids),
                            );
                            setEditingAssignmentSearch("");
                          }}
                          disabled={saving}
                        >
                          {isRu ? "Индивид. цели" : "Target users"}
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <div className={styles.actionBar}>
                <span className={styles.actionHint}>
                  {isRu
                    ? "Создайте назначение после выбора курса и параметров старта."
                    : "Create the assignment after choosing the course and start settings."}
                </span>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="button"
                  onClick={() => void handleCreateAssignment()}
                  disabled={
                    saving ||
                    !courseId ||
                    (assignmentMode === "selected" &&
                      assignmentUserIds.size === 0)
                  }
                >
                  {text.createAssignment}
                </button>
              </div>
            </section>

            {error ? (
              <DataState
                tone="error"
                role="alert"
                title={isRu ? "Операция не выполнена" : "Operation failed"}
                description={error}
              />
            ) : null}
            {success ? <p className={styles.success}>{success}</p> : null}
            <p className={styles.muted}>
              {isRu
                ? `Участников в группе: ${members.length}`
                : `Members in group: ${members.length}`}
            </p>
          </>
        )}
      </div>

      {createModalOpen ? (
        <div className={styles.modalOverlay}>
          <section className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.sectionTitle}>{text.createGroup}</h3>
              <button
                className={styles.modalClose}
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label={isRu ? "Закрыть" : "Close"}
              >
                ×
              </button>
            </div>
            <div className={styles.formGrid}>
              <input
                className={styles.input}
                placeholder={isRu ? "Название группы" : "Group name"}
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
              />
              <textarea
                className={styles.textarea}
                placeholder={
                  isRu ? "Описание (необязательно)" : "Description (optional)"
                }
                value={newGroupDescription}
                onChange={(event) => setNewGroupDescription(event.target.value)}
              />
              <div className={styles.modalActions}>
                <button
                  className={styles.btn}
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                >
                  {isRu ? "Отмена" : "Cancel"}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="button"
                  onClick={() => void handleCreateGroup()}
                  disabled={saving || !newGroupName.trim()}
                >
                  {text.createGroup}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {groupQrModalOpen && groupQr && groupQrImageUrl ? (
        <div className={styles.modalOverlay}>
          <section className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.sectionTitle}>{text.createQr}</h3>
              <button
                className={styles.modalClose}
                type="button"
                onClick={() => setGroupQrModalOpen(false)}
                aria-label={isRu ? "Закрыть" : "Close"}
              >
                ×
              </button>
            </div>

            <p className={styles.muted}>{text.qrScansHint}</p>
            <div className={styles.qrImageWrap}>
              <Image
                src={groupQrImageUrl}
                alt={isRu ? "QR-код входа в группу" : "Group join QR code"}
                className={styles.qrImage}
                width={320}
                height={320}
              />
            </div>
            <p className={styles.qrLink}>{groupQr.deep_link_url}</p>
            <p className={styles.muted}>
              {isRu ? "Действует до" : "Valid until"}:{" "}
              {formatDateTime(groupQr.expires_at)}
            </p>

            <div className={styles.modalActions}>
              <button
                className={styles.btn}
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(groupQr.deep_link_url);
                  setSuccess(
                    isRu
                      ? "Ссылка для сканирования скопирована"
                      : "QR link copied",
                  );
                }}
              >
                {isRu ? "Скопировать ссылку" : "Copy link"}
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="button"
                onClick={() => void handleGenerateGroupQr()}
                disabled={saving}
              >
                {text.regenerateQr}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {editingAssignment ? (
        <div className={styles.modalOverlay}>
          <section className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.sectionTitle}>
                {isRu ? "Индивидуальные цели" : "Target users"}
              </h3>
              <button
                className={styles.modalClose}
                type="button"
                onClick={() => {
                  setEditingAssignmentId(null);
                  setEditingAssignmentUserIds(new Set());
                  setEditingAssignmentSearch("");
                }}
                aria-label={isRu ? "Закрыть" : "Close"}
              >
                ×
              </button>
            </div>

            <p className={styles.muted}>
              {editingAssignment.course_title} ·{" "}
              {isRu ? "сейчас выбрано" : "currently selected"}:{" "}
              {editingAssignmentUserIds.size}
            </p>

            <input
              className={styles.input}
              placeholder={isRu ? "Поиск участника" : "Search member"}
              value={editingAssignmentSearch}
              onChange={(event) =>
                setEditingAssignmentSearch(event.target.value)
              }
            />

            <div className={styles.membersList}>
              {filteredEditingAssignmentUsers.map((user) => {
                const checked = editingAssignmentUserIds.has(user.user_id);
                const label = user.display_name || user.login || user.user_id;
                return (
                  <label
                    key={`edit-assignment-${editingAssignment.id}-${user.user_id}`}
                    className={styles.memberRow}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setEditingAssignmentUserIds((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) next.add(user.user_id);
                          else next.delete(user.user_id);
                          return next;
                        });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>

            {filteredEditingAssignmentUsers.length === 0 ? (
              <DataState
                compact
                title={isRu ? "Ничего не найдено" : "No matches"}
                description={
                  isRu
                    ? "Измените поиск в модальном окне индивидуальных целей."
                    : "Adjust search in the target users modal."
                }
              />
            ) : null}

            <div className={styles.modalActions}>
              <button
                className={styles.btn}
                type="button"
                onClick={() => {
                  setEditingAssignmentId(null);
                  setEditingAssignmentUserIds(new Set());
                  setEditingAssignmentSearch("");
                }}
              >
                {isRu ? "Отмена" : "Cancel"}
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="button"
                onClick={() =>
                  void handleSaveAssignmentTargets(editingAssignment.id)
                }
                disabled={saving}
              >
                {isRu ? "Сохранить цели" : "Save targets"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
