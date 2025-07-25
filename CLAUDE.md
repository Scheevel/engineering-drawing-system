# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
**remind me to git commit often, as I tend to overlook this important step**

## Project Overview

The **Engineering Drawing Index System** is an AI-powered tool for railroad bridge engineers that automates the indexing and analysis of engineering drawings. It solves the critical problem of searching for specific components (piece marks) across hundreds of historical drawing sheets and automates dimensional data extraction.

**Key Value**: Reduces component search time from hours to seconds and eliminates manual data transcription errors.

## Architecture

### System Components
- **Frontend**: React 18 + TypeScript + Material-UI (port 3000)
- **Backend API**: FastAPI + Python 3.11 with async support (port 8001)
- **Database**: PostgreSQL 14 with PostGIS for spatial data
- **Search Engine**: Elasticsearch 8.11 for fast component search
- **Cache/Queue**: Redis 7 for caching and Celery message broker
- **Background Processing**: Celery 5.3 workers for OCR and analysis
- **OCR/ML**: Tesseract, OpenCV, PyTorch for drawing analysis

### Service Architecture
```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Frontend  │────▶│  Backend API │────▶│  PostgreSQL  │
│  (React)    │     │  (FastAPI)   │     │  + PostGIS   │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐     ┌──────────────┐
                    │    Redis     │────▶│    Celery    │
                    │   (Cache)    │     │   Workers    │
                    └──────────────┘     └──────┬───────┘
                                                │
                    ┌──────────────┐            │
                    │Elasticsearch │◀───────────┘
                    │   (Search)   │
                    └──────────────┘
```

## Essential Commands

### Quick Start (Docker Compose)
```bash
cd engineering-drawing-system

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Light version (without Elasticsearch)
docker-compose -f docker-compose-lite.yml up -d

# Monitor Celery tasks with Flower
open http://localhost:5555
```

### Backend Development
```bash
cd engineering-drawing-system/backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8001

# Run tests
pytest
pytest tests/test_drawing_service.py -v

# Database migrations
alembic upgrade head                           # Apply migrations
alembic revision --autogenerate -m "Add field" # Create migration

# Code quality
black .          # Format code
flake8          # Lint
mypy .          # Type check

# Start Celery worker (in separate terminal)
celery -A app.core.celery_app worker --loglevel=info
```

### Frontend Development
```bash
cd engineering-drawing-system/frontend

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Linting
npm run lint
npm run lint:fix

```

## Key Development Workflows

### Adding a New API Endpoint
1. Create route handler in `backend/app/api/` (e.g., `drawings.py`)
2. Implement business logic in `backend/app/services/`
3. Add Pydantic models in `backend/app/models/`
4. Add API client method in `frontend/src/services/api.ts`
5. FastAPI automatically generates OpenAPI docs at `/api/v1/docs`

### Adding a New React Component
1. Create component in `frontend/src/components/`
2. Use Material-UI components and follow existing patterns
3. Add TypeScript interfaces for props
4. Import in appropriate page in `frontend/src/pages/`

### Processing a New Drawing Type
1. Update `backend/app/services/drawing_service.py` for file validation
2. Modify OCR pipeline in `backend/app/services/` if needed
3. Update component detection logic if new patterns exist
4. Add tests in `backend/tests/`

### Database Schema Changes
1. Modify SQLAlchemy models in `backend/app/models/database.py`
2. Generate migration: `alembic revision --autogenerate -m "Description"`
3. Review generated migration in `backend/migrations/versions/`
4. Apply migration: `alembic upgrade head`

## Project Structure

### Backend Structure
```
backend/
├── app/
│   ├── api/          # API route handlers
│   ├── core/         # Config, database, celery setup
│   ├── models/       # Pydantic schemas & SQLAlchemy models
│   ├── services/     # Business logic layer
│   ├── tasks/        # Celery background tasks
│   ├── utils/        # Utility functions
│   └── main.py       # FastAPI app initialization
├── tests/            # Pytest test files
├── migrations/       # Alembic database migrations
└── uploads/          # Uploaded drawing storage
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   │   ├── drawing/  # Drawing-specific components
│   │   └── editor/   # Component editor subcomponents
│   ├── pages/        # Route-level components
│   ├── services/     # API client and utilities
│   └── App.tsx       # Main app component
└── public/           # Static assets
```

## Important Implementation Details

### Drawing Processing Pipeline
1. **Upload**: Files validated and stored with UUID names
2. **Database**: Record created with status "processing"
3. **Celery Task**: Async processing task dispatched
4. **OCR**: Text extraction with Tesseract
5. **Component Detection**: ML models identify piece marks
6. **Data Extraction**: Dimensions and specifications parsed
7. **Indexing**: Data indexed in Elasticsearch
8. **Status Update**: Database updated to "completed"

### Search Implementation
- Full-text search across all extracted text
- Fuzzy matching for typos (e.g., "CG3" matches "C63")
- Filters: component type, project, drawing type
- Results include drawing preview and location coordinates

### Authentication & Security
- JWT tokens prepared (not fully implemented)
- CORS configured for frontend origin
- File upload validation (size, type)
- SQL injection protection via SQLAlchemy ORM

### Performance Considerations
- Async endpoints for non-blocking I/O
- Redis caching for frequent queries
- Pagination on all list endpoints
- Elasticsearch for fast text search
- Celery for background processing

## Testing Strategy

### Backend Testing
- **Unit Tests**: Service layer logic
- **Integration Tests**: API endpoints with TestClient
- **Async Tests**: Using pytest-asyncio
- **Database Tests**: Using test database

### Frontend Testing
- **Component Tests**: React Testing Library
- **API Mocking**: Mock service responses
- **User Interaction**: Testing user workflows

## Common Tasks
**remind me to git commit often, as I tend to overlook this important step**

### Debug Drawing Processing
```bash
# Check Celery task status
docker-compose logs celery-worker

# Monitor tasks in Flower UI (real-time task monitoring)
open http://localhost:5555
# Flower provides:
# - Active/pending/completed task counts
# - Worker status and performance metrics
# - Task execution history
# - Failed task details and tracebacks

# Check processing errors
docker-compose exec backend python -c "from app.core.database import SessionLocal; db = SessionLocal(); from app.models.database import ProcessingTask; tasks = db.query(ProcessingTask).filter_by(status='failed').all(); print([(t.id, t.error_message) for t in tasks])"
```

### Clear Development Data
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Clear uploaded files
rm -rf backend/uploads/*

# Clear Elasticsearch index
curl -X DELETE http://localhost:9200/drawings
```

### Production Deployment
- Use environment variables for all secrets
- Enable HTTPS in production
- Configure proper CORS origins
- Set up database backups
- Monitor with Celery Flower
- Use Kubernetes manifests in `deployment/kubernetes/`