"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SearchBar } from "@/features/search/components/search-bar";
import { SearchResults } from "@/features/search/components/search-results";
import { searchViaProxy } from "@/features/search/api";
import { SearchResult, SearchEntityType } from "@/features/search/types";
import styles from "./search-page.module.css";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalByType, setTotalByType] = useState<
    Record<string, number> | undefined
  >();
  const [activeFilter, setActiveFilter] = useState<SearchEntityType | "all">(
    "all",
  );

  const initialQuery = searchParams.get("q") || "";

  const updateUrl = useCallback(
    (newQuery: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newQuery) {
        params.set("q", newQuery);
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalByType(undefined);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchViaProxy(searchQuery);
      setResults(response.results);
      setTotalByType(response.total_by_type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка поиска");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      updateUrl(newQuery);
      if (newQuery.trim()) {
        performSearch(newQuery);
      }
    },
    [updateUrl, performSearch],
  );

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, query, performSearch]);

  const handleFilterChange = useCallback((type: SearchEntityType | "all") => {
    setActiveFilter(type);
  }, []);

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
