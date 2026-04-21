import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

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
  const sanitizeHtml = (html: string): string =>
    html
      .replace(/<hr\b[^>]*>/gi, "")
      .replace(/\sstyle=("[^"]*"|'[^']*')/gi, "")
      .replace(/<p>\s*<\/p>/gi, "<p></p>");

  const plainText = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const metrics = {
    words: plainText ? plainText.split(" ").length : 0,
    chars: plainText.replace(/\s+/g, "").length,
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
        gapcursor: false,
        dropcursor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
    ],
    content: sanitizeHtml(value),
    onUpdate: ({ editor }) => {
      const html = sanitizeHtml(editor.getHTML());
      onChange(html);
    },
    editorProps: {
      attributes: {
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        "data-gramm": "false",
        "data-gramm_editor": "false",
        "data-enable-grammarly": "false",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    const safeValue = sanitizeHtml(value);
    if (editor && editor.getHTML() !== safeValue) {
      editor.commands.setContent(safeValue);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const dom = editor.view.dom;
    dom.setAttribute("spellcheck", "false");
    dom.setAttribute("autocorrect", "off");
    dom.setAttribute("autocapitalize", "off");
    dom.setAttribute("autocomplete", "off");
    dom.setAttribute("data-gramm", "false");
    dom.setAttribute("data-gramm_editor", "false");
    dom.setAttribute("data-enable-grammarly", "false");
  }, [editor]);

  if (!editor) {
    return <div className={styles.loading}>Загрузка редактора...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("bold") ? styles.active : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Жирный"
            aria-label="Жирный"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("italic") ? styles.active : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Курсив"
            aria-label="Курсив"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("strike") ? styles.active : ""}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Зачеркнутый"
            aria-label="Зачеркнутый"
          >
            <s>S</s>
          </button>
        </div>

        <span className={styles.separator} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("heading", { level: 1 }) ? styles.active : ""}`}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="Заголовок 1"
            aria-label="Заголовок 1"
          >
            T1
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("heading", { level: 2 }) ? styles.active : ""}`}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="Заголовок 2"
            aria-label="Заголовок 2"
          >
            T2
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("heading", { level: 3 }) ? styles.active : ""}`}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            title="Заголовок 3"
            aria-label="Заголовок 3"
          >
            T3
          </button>
        </div>

        <span className={styles.separator} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("bulletList") ? styles.active : ""}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Маркированный список"
            aria-label="Маркированный список"
          >
            •
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("orderedList") ? styles.active : ""}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Нумерованный список"
            aria-label="Нумерованный список"
          >
            1.
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("codeBlock") ? styles.active : ""}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Блок кода"
            aria-label="Блок кода"
          >
            {"</>"}
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("code") ? styles.active : ""}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Код"
            aria-label="Код"
          >
            {"< >"}
          </button>
        </div>

        <span className={styles.separator} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive("link") ? styles.active : ""}`}
            onClick={() => {
              const url = prompt("Введите URL:");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="Добавить ссылку"
            aria-label="Добавить ссылку"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              role="presentation"
              aria-hidden="true"
            >
              <path
                d="M8 12.8 12 8.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M6.2 10.6 4.8 12a2.2 2.2 0 0 0 3.1 3.1l1.4-1.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.8 9.4 15.2 8a2.2 2.2 0 0 0-3.1-3.1l-1.4 1.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Убрать ссылку"
            aria-label="Убрать ссылку"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              role="presentation"
              aria-hidden="true"
            >
              <path
                d="M8 12.8 12 8.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M6.2 10.6 4.8 12a2.2 2.2 0 0 0 3.1 3.1l1.4-1.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.8 9.4 15.2 8a2.2 2.2 0 0 0-3.1-3.1l-1.4 1.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 5l10 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => {
              const src = prompt("Введите URL изображения:");
              if (src) {
                editor.chain().focus().setImage({ src }).run();
              }
            }}
            title="Добавить изображение"
            aria-label="Добавить изображение"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              role="presentation"
              aria-hidden="true"
            >
              <rect
                x="3.5"
                y="4.5"
                width="13"
                height="11"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="8" cy="8.5" r="1.2" fill="currentColor" />
              <path
                d="M6 14l3.2-3 2.5 2 2.3-2.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <span className={styles.separator} />

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
            title="Очистить форматирование"
            aria-label="Очистить форматирование"
          >
            Cx
          </button>
        </div>
      </div>

      <div className={styles.editorWrapper}>
        <EditorContent editor={editor} spellCheck={false} />
      </div>

      <div className={styles.metricsBar}>
        <span>Слов: {metrics.words}</span>
        <span>Символов: {metrics.chars}</span>
      </div>
    </div>
  );
}
