import { useEffect, useState } from "react";
import { ExternalLink, Library, Trash2 } from "lucide-react";

import { useCourseBuilderStore } from "../../store";
import styles from "./SimulationTaskEditor.module.css";

interface SimulationLibraryItem {
  id: string;
  title: string;
  screens_count: number;
  links_count: number;
  updated_at: string;
}

interface SimulationTaskEditorProps {
  value: { config?: { library_item_id?: string; simulation_id?: string } };
  onChange: (value: {
    config: { library_item_id?: string; simulation_id?: string };
  }) => void;
}

export function SimulationTaskEditor({
  value,
  onChange,
}: SimulationTaskEditorProps) {
  const [items, setItems] = useState<SimulationLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseId = useCourseBuilderStore((s) => s.courseId);

  useEffect(() => {
    let mounted = true;
    async function loadLibrary() {
      try {
        const scopeKeys = courseId
          ? [`course:${courseId}`, "global"]
          : ["global"];
        const responses = await Promise.all(
          scopeKeys.map(async (scopeKey) => {
            const response = await fetch(
              `/api/admin/simulation/library?scope_key=${encodeURIComponent(scopeKey)}`,
            );
            if (!response.ok) {
              throw new Error("Не удалось загрузить библиотеку");
            }
            return response.json();
          }),
        );
        const mergedItems = responses.flatMap(
          (data) => data.items || data || [],
        );
        const uniqueItems = Array.from(
          new Map(
            mergedItems.map((item: SimulationLibraryItem) => [item.id, item]),
          ).values(),
        );
        if (mounted) {
          setItems(uniqueItems);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadLibrary();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const selectedId =
    value.config?.library_item_id || value.config?.simulation_id;
  const selectedItem = items.find((item) => item.id === selectedId);

  function handleSelect(itemId: string) {
    onChange({ config: { library_item_id: itemId, simulation_id: itemId } });
  }

  function handleClear() {
    onChange({ config: {} });
  }

  const save = useCourseBuilderStore((s) => s.save);
  const isDirty = useCourseBuilderStore((s) => s.isDirty);

  async function handleOpenInEditor() {
    if (isDirty) {
      try {
        await save();
      } catch {
        // proceed even if save failed; user can retry
      }
    }
    const url = courseId
      ? `/simulation-v2?courseId=${encodeURIComponent(courseId)}`
      : `/simulation-v2`;
    window.location.assign(url);
  }

  if (loading) {
    return (
      <div className={styles.loading}>Загрузка библиотеки симуляций...</div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button
          className={styles.retryBtn}
          onClick={() => window.location.reload()}
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Симуляция</h3>
        <button className={styles.openEditorBtn} onClick={handleOpenInEditor}>
          <ExternalLink size={14} />
          Открыть редактор
        </button>
      </div>

      <div className={styles.selector}>
        <label>Выберите симуляцию из библиотеки</label>

        {items.length === 0 ? (
          <div className={styles.emptyLibrary}>
            <Library size={32} />
            <p>Библиотека пуста</p>
            <span>
              Создайте симуляцию в редакторе, чтобы использовать её здесь
            </span>
          </div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <button
                key={item.id}
                className={`${styles.listItem} ${selectedId === item.id ? styles.selected : ""}`}
                onClick={() => handleSelect(item.id)}
              >
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemMeta}>
                    {item.screens_count} экранов · {item.links_count} переходов
                  </span>
                </div>
                <span className={styles.itemDate}>
                  {new Date(item.updated_at).toLocaleDateString("ru-RU")}
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedItem && (
          <div className={styles.selectedInfo}>
            <div className={styles.selectedHeader}>
              <span className={styles.selectedTitle}>
                Выбрано: {selectedItem.title}
              </span>
              <button className={styles.clearBtn} onClick={handleClear}>
                <Trash2 size={14} />
                Убрать
              </button>
            </div>
            <div className={styles.selectedMeta}>
              <span>{selectedItem.screens_count} экранов</span>
              <span>{selectedItem.links_count} переходов</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
