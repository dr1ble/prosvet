from threading import Lock


class MetricsStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._requests_total = 0
        self._errors_total = 0
        self._total_duration_ms = 0.0

    def record(self, duration_ms: float, is_error: bool) -> None:
        with self._lock:
            self._requests_total += 1
            if is_error:
                self._errors_total += 1
            self._total_duration_ms += duration_ms

    def snapshot(self) -> dict[str, float | int]:
        with self._lock:
            avg = self._total_duration_ms / self._requests_total if self._requests_total else 0.0
            return {
                "requests_total": self._requests_total,
                "errors_total": self._errors_total,
                "avg_duration_ms": round(avg, 2),
                "error_rate": round(self._errors_total / self._requests_total, 4)
                if self._requests_total
                else 0.0,
            }


metrics_store = MetricsStore()
