"use client";

import { useMemo, useState, useRef } from "react";
import styles from "./MediaTab.module.css";

type MediaAsset = {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
};

type MediaTabProps = {
  language: "ru" | "en";
  assets: MediaAsset[];
  onUpload: (file: File) => Promise<void>;
  onSelect: (asset: MediaAsset) => void;
  isLoading?: boolean;
};

export function MediaTab({
  language,
  assets,
  onUpload,
  onSelect,
  isLoading = false,
}: MediaTabProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Медиатека",
            upload: "Загрузить изображение",
            uploading: "Загрузка...",
            noAssets: "Нет загруженных изображений",
            select: "Выбрать",
            dropHint: "Перетащите файл сюда",
          }
        : {
            title: "Media library",
            upload: "Upload image",
            uploading: "Uploading...",
            noAssets: "No images uploaded",
            select: "Select",
            dropHint: "Drop file here",
          },
    [language],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{labels.title}</h4>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className={styles.fileInput}
      />

      <button
        className={styles.uploadButton}
        onClick={handleUploadClick}
        disabled={uploading || isLoading}
      >
        {uploading ? labels.uploading : labels.upload}
      </button>

      {assets.length === 0 ? (
        <p className={styles.empty}>{labels.noAssets}</p>
      ) : (
        <ul className={styles.list}>
          {assets.map((asset) => (
            <li key={asset.id} className={styles.item}>
              <div className={styles.thumbnail}>
                <img
                  src={asset.url}
                  alt={asset.filename}
                  className={styles.image}
                />
              </div>
              <div className={styles.info}>
                <span className={styles.filename}>{asset.filename}</span>
                <button
                  className={styles.selectButton}
                  onClick={() => onSelect(asset)}
                >
                  {labels.select}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
