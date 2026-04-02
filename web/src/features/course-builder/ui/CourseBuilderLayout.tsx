import styles from "./CourseBuilderLayout.module.css";

import { useCourseBuilderStore } from "../store";

import { CourseTreeSidebar } from "./sidebar/CourseTreeSidebar";
import { ContentArea } from "./content/ContentArea";
import { CourseBuilderHeader } from "./CourseBuilderHeader";
import { MobilePreview } from "./preview/MobilePreview";
import { PublishDialog } from "./publish/PublishDialog";
import { ConfirmDialog } from "./ConfirmDialog";

export function CourseBuilderLayout() {
  const course = useCourseBuilderStore((s) => s.course);
  const previewOpen = useCourseBuilderStore((s) => s.previewOpen);
  const publishDialogOpen = useCourseBuilderStore((s) => s.publishDialogOpen);
  const pendingDelete = useCourseBuilderStore((s) => s.pendingDelete);
  const closePublishDialog = useCourseBuilderStore((s) => s.closePublishDialog);
  const publish = useCourseBuilderStore((s) => s.publish);
  const rollback = useCourseBuilderStore((s) => s.rollback);
  const selectLesson = useCourseBuilderStore((s) => s.selectLesson);
  const selectTask = useCourseBuilderStore((s) => s.selectTask);
  const confirmDelete = useCourseBuilderStore((s) => s.confirmDelete);
  const cancelDelete = useCourseBuilderStore((s) => s.cancelDelete);

  return (
    <div className={styles.layout}>
      <CourseBuilderHeader />
      <div className={styles.body}>
        <aside
          className={`${styles.sidebar} ${previewOpen ? styles.sidebarNarrow : ""}`}
        >
          <CourseTreeSidebar />
        </aside>
        <main
          className={`${styles.content} ${previewOpen ? styles.contentNarrow : ""}`}
        >
          <ContentArea />
        </main>
        {previewOpen && course && (
          <aside className={styles.previewPanel}>
            <MobilePreview course={course} />
          </aside>
        )}
      </div>

      {publishDialogOpen && course && (
        <PublishDialog
          course={course}
          onPublish={publish}
          onRollback={rollback}
          onNavigateToIssue={(lessonId, taskId) => {
            if (lessonId) {
              selectLesson(lessonId);
            }
            if (taskId) {
              selectTask(taskId);
            }
            closePublishDialog();
          }}
          onClose={closePublishDialog}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          title={
            pendingDelete.type === "lesson" ? "Удалить урок?" : "Удалить блок?"
          }
          message={
            pendingDelete.type === "lesson"
              ? `Урок "${pendingDelete.title}" и все его блоки будут удалены. Это действие нельзя отменить.`
              : `Блок "${pendingDelete.title}" будет удален. Это действие нельзя отменить.`
          }
          confirmLabel="Удалить"
          danger
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}
