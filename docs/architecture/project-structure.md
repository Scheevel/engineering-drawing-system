# Engineering Drawing Index System - Project Structure

## Source Tree and Module Organization (AS-BUILT)

This document captures the **ACTUAL project structure** of the Engineering Drawing Index System, based on reverse-engineering the implemented codebase.

## Project Structure (AS-BUILT)

```text
engineering-drawing-system-standalone/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── api/               # 9 API router modules
│   │   │   ├── __init__.py
│   │   │   ├── components.py      # Component CRUD operations
│   │   │   ├── drawings.py        # Drawing upload and management
│   │   │   ├── export.py          # Excel, CSV, PDF export
│   │   │   ├── flexible_components.py  # New flexible schema system
│   │   │   ├── projects.py        # Project management
│   │   │   ├── saved_searches.py  # Saved search CRUD (complete)
│   │   │   ├── schemas.py         # Schema management system
│   │   │   ├── search.py          # Advanced search with scope support
│   │   │   └── system.py          # System health and statistics
│   │   ├── core/                  # Configuration and database
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py      # Celery configuration
│   │   │   ├── config.py          # Application settings
│   │   │   └── database.py        # Database session management
│   │   ├── models/                # Data models and schemas
│   │   │   ├── __init__.py
│   │   │   ├── component.py       # Component-related models
│   │   │   ├── database.py        # 14 SQLAlchemy models with JSONB
│   │   │   ├── drawing.py         # Drawing-related models
│   │   │   ├── export.py          # Export-related models
│   │   │   ├── project.py         # Project models
│   │   │   ├── schema.py          # Schema management models
│   │   │   └── search.py          # Pydantic search models
│   │   ├── services/              # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── saved_search_service.py  # Project-based saved searches
│   │   │   └── search_service.py  # 650+ line search engine
│   │   ├── tasks/                 # Celery background tasks
│   │   │   ├── __init__.py
│   │   │   └── drawing_processing.py  # OCR/ML pipeline
│   │   ├── utils/                 # Advanced utilities
│   │   │   ├── __init__.py
│   │   │   ├── query_parser.py    # Boolean query parser (200+ lines)
│   │   │   └── search_errors.py   # Search validation utilities
│   │   └── main.py                # FastAPI application entry point
│   ├── migrations/                # Alembic database migrations
│   │   ├── versions/              # 9 migration files showing evolution
│   │   │   ├── create_app_tables_initial_migration.py
│   │   │   ├── add_component_audit_logging_tables.py
│   │   │   ├── add_saved_searches_table.py  # Already implemented!
│   │   │   ├── add_instance_identifier_to_support_.py
│   │   │   ├── add_flexible_component_schemas.py
│   │   │   └── [...other migrations]
│   │   ├── env.py                 # Alembic environment configuration
│   │   └── script.py.mako         # Migration template
│   ├── tests/                     # Backend test suite
│   │   ├── __init__.py
│   │   ├── test_search_service.py # Search-specific tests
│   │   └── [...other test files]
│   ├── uploads/                   # File storage (Docker volume)
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # Python dependencies
│   ├── alembic.ini               # Alembic configuration
│   └── pytest.ini               # Test configuration
├── frontend/                      # React 18 + TypeScript
│   ├── src/
│   │   ├── components/            # Material-UI components
│   │   │   ├── editor/            # Component editing subsystem
│   │   │   │   ├── ComponentBasicInfo.tsx
│   │   │   │   ├── ComponentDimensions.tsx
│   │   │   │   ├── ComponentSpecifications.tsx
│   │   │   │   └── ComponentHistory.tsx
│   │   │   ├── flexible/          # New flexible schema UI
│   │   │   │   ├── FlexibleComponentCard.tsx
│   │   │   │   ├── SchemaAwareForm.tsx
│   │   │   │   └── TypeSelectionDropdown.tsx
│   │   │   ├── schema-management/ # Schema management UI
│   │   │   │   └── [...schema components]
│   │   │   ├── ComponentDetailModal.tsx
│   │   │   ├── Navigation.tsx     # Main navigation
│   │   │   ├── SavedSearchDialog.tsx
│   │   │   ├── ScopeEffectivenessMetrics.tsx
│   │   │   └── SearchResultRow.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── schema/            # Schema-related hooks
│   │   │   └── useDebounce.ts
│   │   ├── pages/                 # Route-level components
│   │   │   ├── schema/            # Schema management pages
│   │   │   │   ├── SchemaManagementPage.tsx
│   │   │   │   └── ProjectSchemaPage.tsx
│   │   │   ├── ComponentEditor.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DrawingViewer.tsx
│   │   │   ├── DrawingsListPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── SearchPage.tsx     # Advanced search UI (already built)
│   │   │   └── UploadPage.tsx
│   │   ├── services/              # API integration layer
│   │   │   ├── __mocks__/         # Service mocks for testing
│   │   │   ├── api.ts             # 500+ line TypeScript API client
│   │   │   ├── fieldTemplateGroups.ts
│   │   │   ├── fieldTemplates.ts
│   │   │   ├── schemaManagementService.ts
│   │   │   └── schemaQueries.ts
│   │   ├── types/                 # TypeScript type definitions
│   │   ├── utils/                 # Frontend utilities
│   │   ├── App.tsx                # Main React application
│   │   └── index.tsx              # React DOM entry point
│   ├── public/                    # Static assets
│   ├── coverage/                  # Test coverage reports
│   ├── test-results/              # Test output directory
│   ├── build/                     # Production build output
│   ├── node_modules/              # npm dependencies
│   ├── docs/                      # Frontend-specific documentation
│   ├── config/                    # Frontend configuration
│   ├── contexts/                  # React context providers
│   ├── test-utils/                # Testing utilities
│   ├── Dockerfile                 # Frontend container definition
│   ├── package.json               # npm dependencies and scripts
│   ├── package-lock.json          # Dependency lock file
│   ├── .env.development           # Development environment variables
│   ├── .env.production            # Production environment variables
│   └── .env.test                  # Test environment variables
├── docs/                          # Project documentation
│   ├── architecture/              # Architecture documentation
│   │   ├── coding-standards.md
│   │   ├── tech-stack.md
│   │   └── project-structure.md   # This file
│   ├── qa/                        # Quality assurance documentation
│   │   └── gates/                 # QA gate definitions
│   ├── stories/                   # Development stories and tasks
│   │   ├── backlog/
│   │   ├── story-3.5-advanced-field-operations.md
│   │   ├── story-3.6-real-time-validation-and-preview.md
│   │   ├── story-3.7-state-management-optimization.md
│   │   ├── story-3.8-integration-with-existing-components.md
│   │   ├── story-3.9-testing-implementation.md
│   │   └── story-3.10-styling-and-ux-polish.md
│   ├── stories-archive/           # Completed stories
│   ├── architecture.md            # Main architecture document
│   ├── as-built-architecture.md   # AS-BUILT analysis document
│   ├── prd.md                     # Product requirements document
│   └── [...other documentation]
├── .bmad-core/                    # AI agent system
│   ├── core-config.yaml           # Agent configuration
│   ├── tasks/                     # Agent task definitions
│   ├── templates/                 # Document templates
│   ├── checklists/                # Process checklists
│   └── data/                      # Reference data
├── .github/                       # GitHub configuration
│   └── workflows/                 # CI/CD pipeline definitions
├── deployment/                    # Deployment configurations
│   └── kubernetes/                # Kubernetes manifests
├── database/                      # Database initialization
│   └── init.sql                   # Database setup script
├── docker-compose.yml             # 7-service architecture
├── docker-compose-lite.yml        # Lightweight development setup
├── .gitignore                     # Git ignore patterns
├── README.md                      # Project overview
├── CLAUDE.md                      # Claude Code project instructions
└── project-default-schema-configuration.md
```

## Key Modules and Their ACTUAL Purpose

### Backend Module Responsibilities

#### API Layer (`backend/app/api/`)
- **search.py**: Advanced search with scope, boolean operators, saved searches
- **saved_searches.py**: Full CRUD for saved searches with project limits (50 per project)
- **components.py**: Component CRUD operations with validation
- **flexible_components.py**: New schema-driven component system
- **schemas.py**: Dynamic schema creation and validation
- **drawings.py**: File upload, processing status, component extraction
- **export.py**: Excel, CSV, PDF generation
- **projects.py**: Project management and drawing assignment
- **system.py**: Health checks, statistics, component types

#### Service Layer (`backend/app/services/`)
- **search_service.py**: 650+ line search engine with boolean parsing, scope effectiveness
- **saved_search_service.py**: Project-based saved searches with execution tracking

#### Models Layer (`backend/app/models/`)
- **database.py**: 14 sophisticated SQLAlchemy models with JSONB, audit logging, versioning
- **search.py**: Pydantic search models with scope enums and validation
- **component.py**: Component-related Pydantic models
- **schema.py**: Schema management models for flexible component system

#### Utils Layer (`backend/app/utils/`)
- **query_parser.py**: 200+ line boolean query parser with AND/OR/NOT operators, wildcards
- **search_errors.py**: Search validation and error handling utilities

### Frontend Module Responsibilities

#### Components (`frontend/src/components/`)
- **editor/**: Component editing subsystem (dimensions, specifications, history)
- **flexible/**: New flexible schema UI components
- **schema-management/**: Schema creation and management interfaces
- **Navigation.tsx**: Main application navigation
- **SearchPage.tsx**: Advanced search UI (already implements scope selection)

#### Services (`frontend/src/services/`)
- **api.ts**: 500+ line TypeScript API client with comprehensive type definitions
- **schemaManagementService.ts**: Schema management operations
- **fieldTemplates.ts**: Field template management

#### Pages (`frontend/src/pages/`)
- **SearchPage.tsx**: Advanced search interface with scope indicators
- **schema/**: Schema management pages (SchemaManagementPage, ProjectSchemaPage)
- **ComponentEditor.tsx**: Component detail editing
- **Dashboard.tsx**: System overview and statistics

## Architecture Patterns Discovered

### Dual Component System
**Legacy + Modern Pattern**:
- Traditional components with fixed schema (`piece_mark`, `component_type`, etc.)
- Flexible components with JSONB storage (`dynamic_data`, `schema_id`)
- Migration in progress with both patterns coexisting

### API Router Organization
**9 Specialized Routers**:
```python
# In main.py
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(saved_searches.router, prefix="/api/v1/saved-searches", tags=["saved-searches"])
app.include_router(components.router, prefix="/api/v1/components", tags=["components"])
app.include_router(flexible_components.router, prefix="/api/v1/flexible-components", tags=["flexible-components"])
app.include_router(schemas.router, prefix="/api/v1/schemas", tags=["schemas"])
# ... other routers
```

### Migration Evolution Pattern
**9 Migrations Showing System Growth**:
1. Basic drawing index (`create_app_tables_initial_migration.py`)
2. Enterprise audit features (`add_component_audit_logging_tables.py`)
3. **Saved search functionality** (`add_saved_searches_table.py`) - **Already implemented!**
4. Multi-instance support (`add_instance_identifier_to_support_.py`)
5. Flexible schema system (`add_flexible_component_schemas.py`)

### Frontend State Management
**React Query + Material-UI Pattern**:
- Server state management with React Query
- Optimistic updates for component editing
- Material-UI design system throughout
- TypeScript for end-to-end type safety

## File Organization Conventions

### Naming Patterns (AS-BUILT)
- **Backend Files**: `snake_case.py` (e.g., `search_service.py`, `query_parser.py`)
- **Frontend Components**: `PascalCase.tsx` (e.g., `SearchPage.tsx`, `ComponentDetailModal.tsx`)
- **API Endpoints**: `/api/v1/{resource}` (e.g., `/api/v1/search/components`)
- **Database Tables**: `snake_case` (e.g., `saved_searches`, `component_audit_logs`)

### Import Organization
**Python**: Standard lib → Third-party → Local app imports
**TypeScript**: React/core → Material-UI → Local imports

### Configuration Files
- **Backend**: `requirements.txt`, `alembic.ini`, `pytest.ini`
- **Frontend**: `package.json`, `.env.*` files for environments
- **Infrastructure**: `docker-compose.yml` with 7 services
- **Development**: `.bmad-core/` for AI-powered development

## Development Environment Structure

### Docker Services (7-Service Architecture)
```yaml
services:
  - postgres        # PostgreSQL + PostGIS
  - redis          # Cache + Celery broker
  - elasticsearch  # Search engine
  - backend        # FastAPI application
  - celery-worker  # Background processing
  - celery-flower  # Task monitoring
  - frontend       # React development server
```

### Entry Points
- **Backend**: `backend/app/main.py` - FastAPI application
- **Frontend**: `frontend/src/index.tsx` - React DOM entry
- **Development**: `docker-compose up -d` - Full stack startup
- **Database**: `alembic upgrade head` - Schema migrations

### Testing Structure
- **Backend**: `pytest` with async support, located in `backend/tests/`
- **Frontend**: Jest + React Testing Library, test files alongside components
- **Coverage**: Reports generated in `frontend/coverage/`
- **Integration**: End-to-end tests possible with full Docker stack

This project structure represents a sophisticated microservices system with clear separation of concerns, enterprise-grade patterns, and comprehensive tooling for development, testing, and deployment.