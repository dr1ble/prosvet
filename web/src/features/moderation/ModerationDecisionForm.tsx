"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { approveRelease, rejectRelease } from "@/features/moderation/api";

import styles from "./ModerationDecisionForm.module.css";

type ModerationDecisionFormProps = {
  releaseId: string;
  action: "approve" | "reject";
  language: string;
  moderationHref: string;
  labels: {
    submit: string;
    submitting: string;
    success: string;
    cancel: string;
    commentLabel: string;
    commentPlaceholder: string;
    commentRequiredError: string;
    commentMinLengthError: string;
  };
};

const REJECT_MIN_COMMENT_LENGTH = 10;

export function ModerationDecisionForm({
  releaseId,
  action,
  language,
  moderationHref,
  labels,
}: ModerationDecisionFormProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setDone] = useState(false);

  const locked = isSubmitting || isDone;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked) return;

    const trimmed = comment.trim();

    if (action === "reject") {
      if (!trimmed) {
        setError(labels.commentRequiredError);
        return;
      }
      if (trimmed.length < REJECT_MIN_COMMENT_LENGTH) {
        setError(labels.commentMinLengthError);
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      if (action === "approve") {
        await approveRelease(releaseId, trimmed || undefined);
      } else {
        await rejectRelease(releaseId, trimmed);
      }
      setDone(true);
      router.refresh();
      // Small timeout so the success banner is visible before navigating away.
      setTimeout(() => {
        router.push(moderationHref);
      }, 900);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : language === "ru"
            ? "Не удалось выполнить действие."
            : "Action failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.decisionForm}>
      <label className={styles.decisionLabel} htmlFor="moderation-comment">
        {labels.commentLabel}
      </label>
      <textarea
        id="moderation-comment"
        className={styles.decisionTextarea}
        rows={4}
        maxLength={5000}
        placeholder={labels.commentPlaceholder}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        disabled={locked}
        required={action === "reject"}
      />

      {error && <div className={styles.decisionError}>{error}</div>}

      {isDone && <div className={styles.decisionSuccess}>{labels.success}</div>}

      <div className={styles.decisionActions}>
        <button
          type="button"
          className={styles.decisionCancel}
          onClick={() => router.push(moderationHref)}
          disabled={locked}
        >
          {labels.cancel}
        </button>
        <button
          type="submit"
          className={
            action === "approve"
              ? styles.decisionSubmitApprove
              : styles.decisionSubmitReject
          }
          disabled={locked}
        >
          {isSubmitting ? labels.submitting : labels.submit}
        </button>
      </div>
    </form>
  );
}
