"use client";

import React, { Suspense, useCallback, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SearchBar } from "@/features/search/components/search-bar";
import { SearchResults } from "@/features/search/components/search-results";
import { searchViaProxy } from "@/features/search/api";
import { SearchResult, SearchEntityType } from "@/features/search/types";
import styles from "./search-page.module.css";

const SEARCH_FILTERS: ReadonlyArray<SearchEntityType> = [
  "course",
  "user",
  "group",
];

function parseFilter(value: string | null): SearchEntityType | "all" {
  if (!value) {
    return "all";
  }
  return SEARCH_FILTERS.includes(value as SearchEntityType)
    ? (value as SearchEntityType)
    : "all";
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialFilter = parseFilter(searchParams.get("type"));

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalByType, setTotalByType] = useState<
    Record<string, number> | undefined
  >();
  const [activeFilter, setActiveFilter] = useState<SearchEntityType | "all">(
    initialFilter,
  );

  const initialQuery = searchParams.get("q") || "";

  const updateUrl = useCallback(
    (newQuery: string, filter: SearchEntityType | "all") => {
      const params = new URLSearchParams(searchParams.toString());
      if (newQuery) {
        params.set("q", newQuery);
      } else {
        params.delete("q");
      }
      if (filter === "all") {
        params.delete("type");
      } else {
        params.set("type", filter);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const performSearch = useCallback(
    async (searchQuery: string, filter: SearchEntityType | "all") => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotalByType(undefined);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchViaProxy(searchQuery, {
          types: filter === "all" ? undefined : [filter],
        });
        setResults(response.results);
        setTotalByType(response.total_by_type);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка поиска");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      updateUrl(newQuery, activeFilter);
      if (newQuery.trim()) {
        performSearch(newQuery, activeFilter);
      } else {
        setResults([]);
        setTotalByType(undefined);
      }
    },
    [activeFilter, updateUrl, performSearch],
  );

  useEffect(() => {
    const nextFilter = parseFilter(searchParams.get("type"));
    const needsQuerySync = initialQuery !== query;
    const needsFilterSync = nextFilter !== activeFilter;

    if (!needsQuerySync && !needsFilterSync) {
      return;
    }

    if (needsQuerySync) {
      setQuery(initialQuery);
    }
    if (needsFilterSync) {
      setActiveFilter(nextFilter);
    }

    if (initialQuery.trim()) {
      performSearch(initialQuery, nextFilter);
    } else {
      setResults([]);
      setTotalByType(undefined);
      setError(null);
      setIsLoading(false);
    }
  }, [activeFilter, initialQuery, performSearch, query, searchParams]);

  const handleFilterChange = useCallback(
    (type: SearchEntityType | "all") => {
      setActiveFilter(type);
      updateUrl(query, type);
      if (query.trim()) {
        performSearch(query, type);
      }
    },
    [performSearch, query, updateUrl],
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Поиск</h1>
      </div>

      <div className={styles.content}>
        <SearchBar
          initialValue={query}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        <div className={styles.resultsWrapper}>
          <SearchResults
            results={results}
            isLoading={isLoading}
            error={error}
            totalByType={totalByType}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <SearchPageContent />
    </Suspense>
  );
}
