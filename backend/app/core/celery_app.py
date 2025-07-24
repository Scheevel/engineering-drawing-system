from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "drawing_processor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.drawing_processing"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.PROCESSING_TIMEOUT,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Task routing
celery_app.conf.task_routes = {
    "app.tasks.drawing_processing.process_drawing": {"queue": "drawing_processing"},
    "app.tasks.drawing_processing.extract_components": {"queue": "component_extraction"},
    "app.tasks.drawing_processing.extract_dimensions": {"queue": "dimension_extraction"},
}