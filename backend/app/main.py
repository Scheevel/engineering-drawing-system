from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import drawings, search, export, system, components
from app.core.config import settings
import os

app = FastAPI(
    title="Engineering Drawing Index System",
    version="1.0.0",
    description="AI-powered drawing indexing and analysis"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads (optional fallback)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(drawings.router, prefix="/api/v1/drawings", tags=["drawings"])
app.include_router(components.router, prefix="/api/v1/components", tags=["components"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(export.router, prefix="/api/v1/export", tags=["export"])
app.include_router(system.router, prefix="/api/v1/system", tags=["system"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
