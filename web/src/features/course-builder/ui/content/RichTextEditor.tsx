import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

import styles from "./RichTextEditor.module.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className={styles.loading}>Загрузка редактора...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("bold") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Жирный"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("italic") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Курсив"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("strike") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Зачёркнутый"
        >
          <s>S</s>
        </button>

        <span className={styles.separator} />

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("heading", { level: 1 }) ? styles.active : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Заголовок 1"
        >
          H1
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("heading", { level: 2 }) ? styles.active : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Заголовок 2"
        >
          H2
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("heading", { level: 3 }) ? styles.active : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Заголовок 3"
        >
          H3
        </button>

        <span className={styles.separator} />

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("bulletList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Маркированный список"
        >
          • Список
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("orderedList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Нумерованный список"
        >
          1. Список
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("codeBlock") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Блок кода"
        >
          {"</>"}
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("code") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Код"
        >
          {"< >"}
        </button>

        <span className={styles.separator} />

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("link") ? styles.active : ""}`}
          onClick={() => {
            const url = prompt("Введите URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          title="Ссылка"
        >
          🔗
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Убрать ссылку"
        >
          🔗✕
        </button>

        <span className={styles.separator} />

        <button
          type="button"
          className={styles.toolBtn}
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
          title="Очистить форматирование"
        >
          Очистить
        </button>
      </div>

      <div className={styles.editorWrapper}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
