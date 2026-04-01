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
          onClose={closePublishDialog}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          title={
            pendingDelete.type === "lesson"
              ? "Удалить урок?"
              : "Удалить задачу?"
          }
          message={
            pendingDelete.type === "lesson"
              ? `Урок "${pendingDelete.title}" и все его задачи будут удалены. Это действие нельзя отменить.`
              : `Задача "${pendingDelete.title}" будет удалена. Это действие нельзя отменить.`
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
