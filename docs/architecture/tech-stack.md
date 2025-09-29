# Engineering Drawing Index System - Tech Stack

## Current Technology Stack (AS-BUILT)

This document defines the **DEFINITIVE technology selection** for the Engineering Drawing Index System based on actual implementation analysis.

### Backend Stack

| Category | Technology | Version | Purpose | AS-BUILT Notes |
|----------|------------|---------|---------|----------------|
| **Runtime** | Python | 3.11 | Backend development | FastAPI async application |
| **Framework** | FastAPI | 0.115.0 | High-performance async API | 9 API routers, OpenAPI auto-generation |
| **Database** | PostgreSQL + PostGIS | 14 | Primary database with spatial data | Production-ready with PostGIS extension |
| **Search Engine** | Elasticsearch | 8.11.0 | Full-text search with fuzzy matching | Advanced full-text search with PostgreSQL fallback |
| **Cache/Queue** | Redis | 7 | Caching and message broker | Celery broker + API response caching |
| **Task Queue** | Celery | 5.3.4 | Distributed background processing | OCR/ML processing without blocking UI |
| **ORM** | SQLAlchemy | 2.0.23 | Database abstraction | Async support with sophisticated models |
| **Validation** | Pydantic | 2.11.0 | Data validation and serialization | Type-safe API models |
| **Migration** | Alembic | 1.12.1 | Database schema migrations | 9 migrations showing system evolution |

### AI/ML Stack

| Category | Technology | Version | Purpose | AS-BUILT Notes |
|----------|------------|---------|---------|----------------|
| **OCR Engine** | Tesseract (pytesseract) | 0.3.10 | Text extraction from drawings | Integrated with Docker |
| **Image Processing** | OpenCV | 4.8.1.78 | Image manipulation and analysis | Component detection pipeline |
| **ML Framework** | PyTorch | 2.1.1 | Component detection models | Component classification |
| **Computer Vision** | torchvision | 0.16.1 | Vision model utilities | Pre-trained model integration |
| **Numerical Computing** | NumPy | 1.26.2 | Array operations | ML pipeline support |

### Frontend Stack

| Category | Technology | Version | Purpose | AS-BUILT Notes |
|----------|------------|---------|---------|----------------|
| **Runtime** | Node.js | 18.x | Frontend build environment | React 18 with TypeScript |
| **Framework** | React | 18.2.0 | Component-based UI | Sophisticated modal editing workflows |
| **Type System** | TypeScript | 4.9.0 | Type-safe frontend development | Comprehensive type definitions |
| **UI Library** | Material-UI (MUI) | 5.14.0 | Professional engineering UI | Consistent design system |
| **State Management** | React Query | 3.39.0 | Server state management | Optimistic updates with caching |
| **Form Management** | React Hook Form | 7.45.0 | Complex form validation | Component editing workflows |
| **Routing** | React Router DOM | 6.8.0 | Client-side routing | SPA navigation |

### Development & Testing Stack

| Category | Technology | Version | Purpose | AS-BUILT Notes |
|----------|------------|---------|---------|----------------|
| **Backend Testing** | pytest + pytest-asyncio | 7.4.3 + 0.21.1 | Unit and integration testing | Async test support |
| **Frontend Testing** | Jest + React Testing Library | 29.5.0 + 13.4.0 | Component testing | Accessibility-focused testing |
| **API Testing** | httpx | 0.28.1 | HTTP client for testing | FastAPI test client |
| **Code Quality** | Black + flake8 + mypy | 23.11.0 + 6.1.0 + 1.7.1 | Python code formatting and linting | Automated code quality |
| **Build Tool** | React Scripts | 5.0.1 | Frontend build and dev server | Hot reload for development |

### Infrastructure Stack

| Category | Technology | Version | Purpose | AS-BUILT Notes |
|----------|------------|---------|---------|----------------|
| **Containerization** | Docker Compose | 3.8 | Multi-service orchestration | 7-service microarchitecture |
| **Reverse Proxy** | Nginx | alpine | Load balancing and routing | Production profile |
| **Monitoring** | Flower | 2.0.1 | Celery task monitoring | Real-time task monitoring UI |
| **File Processing** | PyMuPDF + pdf2image | 1.23.8 + 1.16.3 | PDF handling | Drawing file processing |

### Data Processing Stack

| Category | Technology | Version | Purpose | AS-BUILT Notes |
|----------|------------|---------|---------|----------------|
| **Excel/CSV** | openpyxl + pandas | 3.1.2 + 2.1.3 | Data export and analysis | Report generation |
| **File Handling** | aiofiles + python-magic | 23.2.1 + 0.4.27 | Async file operations | Upload validation |
| **Security** | python-jose + passlib | 3.3.0 + 1.7.4 | JWT and password handling | Authentication (prepared) |

## Technology Decision Rationale

### Core Architecture Decisions

**FastAPI + React**: Modern async backend with component-based frontend enables sophisticated editing workflows while maintaining type safety throughout the stack.

**PostgreSQL + PostGIS**: Single database solution with spatial capabilities reduces operational complexity while providing enterprise-grade spatial queries for component locations.

**Elasticsearch Integration**: Dual search backend (ES + PostgreSQL) provides advanced search capabilities with graceful fallback for reliability.

**React Query + Material-UI**: Enables sophisticated component editing with optimistic updates, professional UI components, and server state synchronization.

### AI/ML Integration Strategy

**PyTorch + Tesseract**: Combines industry-standard OCR with flexible ML framework for component detection and classification workflows.

**Celery + Redis**: Asynchronous processing prevents UI blocking during expensive OCR/ML operations while providing reliable task queue management.

### Development Experience Optimizations

**TypeScript Throughout**: End-to-end type safety from database models to UI components reduces runtime errors and improves developer experience.

**Docker Compose Development**: All services containerized for consistent development environment and easy onboarding.

**Comprehensive Testing Stack**: pytest (backend) + React Testing Library (frontend) provides reliable test coverage for complex workflows.

## Performance Considerations

### Backend Performance
- **Async FastAPI**: Non-blocking I/O for concurrent request handling
- **SQLAlchemy 2.0**: Modern async ORM with optimized query patterns
- **Redis Caching**: Aggressive caching for frequent queries
- **Elasticsearch**: Offloaded full-text search with faceted queries

### Frontend Performance
- **React Query**: Background refetching with stale-while-revalidate patterns
- **Material-UI Optimization**: Tree shaking and bundle splitting
- **TypeScript Compilation**: Build-time optimization and error detection
- **Component Lazy Loading**: Code splitting for modal components

### Infrastructure Performance
- **PostGIS Spatial Indexes**: Optimized spatial queries for component locations
- **Celery Horizontal Scaling**: Background processing scales with worker instances
- **Docker Multi-Stage Builds**: Optimized container images for production

## Security Stack

### Current Security Implementation
- **Input Validation**: Pydantic models for API request validation
- **SQL Injection Protection**: SQLAlchemy ORM parameterized queries
- **File Upload Validation**: python-magic for content type verification
- **CORS Configuration**: Restricted origins for frontend integration

### Planned Security Enhancements
- **JWT Authentication**: python-jose prepared for token-based auth
- **Password Hashing**: passlib with bcrypt for secure password storage
- **Role-Based Access Control**: Prepared user model for RBAC implementation
- **API Rate Limiting**: FastAPI middleware for request throttling

## Development Workflow Tools

### Code Quality Pipeline
```bash
# Backend quality checks
black .                    # Code formatting
flake8 .                  # Linting
mypy .                    # Type checking

# Frontend quality checks
npm run lint              # ESLint + TypeScript
npm run type-check        # TypeScript validation
npm test                  # Jest + RTL testing
```

### Container Development
```bash
# Full stack development
docker-compose up -d      # All services
docker-compose logs -f backend  # Service monitoring

# Individual service development
uvicorn app.main:app --reload  # Backend dev server
npm start                 # Frontend dev server
```

### Database Operations
```bash
# Migration management
alembic upgrade head      # Apply migrations
alembic revision --autogenerate -m "Description"  # Create migration

# Database access
docker-compose exec postgres psql -U user -d drawing_index
```

This technology stack represents a mature, production-ready architecture with enterprise-grade capabilities for sophisticated document management and component editing workflows.