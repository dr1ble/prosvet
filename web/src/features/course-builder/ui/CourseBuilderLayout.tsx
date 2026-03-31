import styles from "./CourseBuilderLayout.module.css";

import { useCourseBuilderStore } from "../store";

import { CourseTreeSidebar } from "./sidebar/CourseTreeSidebar";
import { ContentArea } from "./content/ContentArea";
import { CourseBuilderHeader } from "./CourseBuilderHeader";
import { MobilePreview } from "./preview/MobilePreview";
import { PublishDialog } from "./publish/PublishDialog";

export function CourseBuilderLayout() {
  const course = useCourseBuilderStore((s) => s.course);
  const previewOpen = useCourseBuilderStore((s) => s.previewOpen);
  const publishDialogOpen = useCourseBuilderStore((s) => s.publishDialogOpen);
  const closePublishDialog = useCourseBuilderStore((s) => s.closePublishDialog);
  const publish = useCourseBuilderStore((s) => s.publish);

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
    </div>
  );
}
