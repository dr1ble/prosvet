from fastapi import APIRouter

from app.shared.metrics.store import metrics_store

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
def metrics() -> dict[str, float | int]:
    return metrics_store.snapshot()
