"use client";

import React from "react";
import Link from "next/link";
import { SearchResult, SearchEntityType, SEARCH_ENTITY_LABELS } from "../types";
import styles from "./search-results.module.css";

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  error?: string | null;
  totalByType?: Record<string, number>;
  activeFilter: SearchEntityType | "all";
  onFilterChange: (type: SearchEntityType | "all") => void;
}

function EntityIcon({ type }: { type: SearchEntityType }) {
  const className = `${styles.entityIcon} ${styles[type]}`;

  if (type === "course") {
    return (
      <div className={className}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
    );
  }

  if (type === "user") {
    return (
      <div className={className}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={className}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </div>
  );
}

function ResultItem({ result }: { result: SearchResult }) {
  const label = SEARCH_ENTITY_LABELS[result.type]?.ru || result.type;

  return (
    <Link href={result.href} className={styles.resultItem}>
      <div className={styles.resultHeader}>
        <EntityIcon type={result.type} />
        <div className={styles.resultContent}>
          <div className={styles.title}>{result.title}</div>
          {result.subtitle && (
            <div className={styles.subtitle}>{result.subtitle}</div>
          )}
        </div>
      </div>
      {result.metadata && Object.keys(result.metadata).length > 0 && (
        <div className={styles.metadata}>
          {Object.entries(result.metadata).map(([key, value]) => (
            <span key={key} className={styles.metadataItem}>
              {`${label}: ${value}`}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export function SearchResults({
  results,
  isLoading = false,
  error = null,
  totalByType,
  activeFilter,
  onFilterChange,
}: SearchResultsProps) {
  const filters: Array<{ type: SearchEntityType | "all"; label: string }> = [
    { type: "all", label: "Все" },
    { type: "course", label: SEARCH_ENTITY_LABELS.course.ru },
    { type: "user", label: SEARCH_ENTITY_LABELS.user.ru },
    { type: "group", label: SEARCH_ENTITY_LABELS.group.ru },
  ];

  if (isLoading) {
    return (
      <div className={styles.searchResults}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <div>Поиск...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.searchResults}>
        <div className={styles.empty}>
          <svg
            className={styles.emptyIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>Ошибка: {error}</div>
        </div>
      </div>
    );
  }

  const filteredResults =
    activeFilter === "all"
      ? results
      : results.filter((r) => r.type === activeFilter);

  return (
    <div className={styles.searchResults}>
      <div className={styles.header}>
        <div className={styles.count}>
          {results.length > 0 ? (
            <>
              Найдено: {filteredResults.length}{" "}
              {totalByType &&
                activeFilter !== "all" &&
                totalByType[activeFilter] && (
                  <span>(из {totalByType[activeFilter]})</span>
                )}
            </>
          ) : (
            "Ничего не найдено"
          )}
        </div>
        <div className={styles.filterGroup}>
          {filters.map((filter) => (
            <button
              key={filter.type}
              type="button"
              className={styles.filterButton}
              onClick={() => onFilterChange(filter.type)}
            >
              {filter.label}
              {totalByType &&
                filter.type !== "all" &&
                totalByType[filter.type] && (
                  <span> ({totalByType[filter.type]})</span>
                )}
            </button>
          ))}
        </div>
      </div>

      {filteredResults.length > 0 ? (
        <div className={styles.resultsList}>
          {filteredResults.map((result) => (
            <ResultItem key={`${result.type}-${result.id}`} result={result} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <svg
            className={styles.emptyIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <div>По запросу ничего не найдено</div>
        </div>
      )}
    </div>
  );
}
