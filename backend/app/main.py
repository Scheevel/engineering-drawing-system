from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from app.middleware.correlation import CorrelationIDMiddleware, setup_correlation_logging
from app.api import drawings, search, export, system, components, projects, saved_searches, schemas, flexible_components
from app.core.config import settings
import os

app = FastAPI(
    title="Engineering Drawing Index System",
    version="1.0.0",
    description="AI-powered drawing indexing and analysis"
)

# Setup correlation logging
setup_correlation_logging()

# Correlation ID middleware (should be first)
app.add_middleware(CorrelationIDMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics instrumentation
instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="fastapi_inprogress",
    inprogress_labels=True,
)

instrumentator.instrument(app).expose(app)

# Mount static files for uploads (optional fallback)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(drawings.router, prefix="/api/v1/drawings", tags=["drawings"])
app.include_router(components.router, prefix="/api/v1/components", tags=["components"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(saved_searches.router, prefix="/api/v1/saved-searches", tags=["saved-searches"])
app.include_router(export.router, prefix="/api/v1/export", tags=["export"])
app.include_router(system.router, prefix="/api/v1/system", tags=["system"])

# New flexible schema system routes
app.include_router(schemas.router, prefix="/api/v1/schemas", tags=["schemas"])
app.include_router(flexible_components.router, prefix="/api/v1/flexible-components", tags=["flexible-components"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
