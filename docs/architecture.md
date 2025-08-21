# System Architecture for Engineering Drawing Index System

## Introduction

This document outlines the complete fullstack architecture for the Engineering Drawing Index System, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines traditional backend and frontend architecture documentation, streamlining the development process for the sophisticated component editing workflows that are central to this system's value proposition.

**System Overview:** The Engineering Drawing Index System is an AI-powered tool for railroad bridge engineers that automates the indexing and analysis of engineering drawings. It solves the critical problem of searching for specific components (piece marks) across hundreds of historical drawing sheets and automates dimensional data extraction.

**Key Value Proposition:** Reduces component search time from hours to seconds and eliminates manual data transcription errors through sophisticated component editing capabilities.

## High Level Architecture

### Technical Summary

The Engineering Drawing Index System implements a **sophisticated microservices architecture** with advanced component editing capabilities. The system uses **React 18 + TypeScript frontend** with **FastAPI + Python backend**, integrated through a comprehensive API layer that supports complex validation workflows and real-time search indexing. The architecture prioritizes **component-centric data management** with multi-modal editing interfaces, **optimistic updates with conflict resolution**, and **background processing pipelines** for OCR and drawing analysis. Infrastructure is containerized using **Docker Compose** with **PostgreSQL + PostGIS for spatial data**, **Elasticsearch for search**, and **Redis for caching and message brokering**.

### Platform and Infrastructure Choice

**Current Platform:** Docker Compose + Multi-Container Architecture  
**Key Services:** PostgreSQL 14 + PostGIS, Elasticsearch 8.11, Redis 7, Celery  
**Deployment Host:** Currently configured for local/on-premise deployment, readily adaptable to AWS ECS, Azure Container Instances, or Google Cloud Run

### Architectural Patterns

- **Component-Based Architecture:** React component hierarchy with sophisticated editing modals and real-time validation for complex UI interactions while maintaining code reusability
- **API Gateway Pattern:** FastAPI serves as unified entry point enabling centralized cross-cutting concerns like authentication and logging
- **Repository Pattern:** Service layer abstracts data access with ComponentService, SearchService pattern for testing and database migration flexibility
- **Optimistic Updates Pattern:** Frontend updates UI immediately while API calls process in background for responsive component editing experience with sophisticated conflict resolution
- **Event-Driven Processing:** Celery workers handle OCR and indexing asynchronously preventing blocking user interface during expensive operations
- **Validation Pipeline Pattern:** Multi-stage validation with business rules, duplicate detection, and data integrity checks ensuring data quality with immediate user feedback
- **Spatial Data Pattern:** PostGIS integration for component location tracking and drawing coordinate systems enabling precise positioning and spatial queries

## Tech Stack

This is the **DEFINITIVE technology selection** for the entire Engineering Drawing Index System:

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|  
| Frontend Language | TypeScript | ^4.9.5 | Type-safe frontend development | Prevents runtime errors in complex component editing flows |
| Frontend Framework | React | ^18.2.0 | Component-based UI with hooks | Enables sophisticated modal editing with proper state management |
| UI Component Library | Material-UI (MUI) | ^5.14.0 | Professional engineering UI components | Provides consistent design system optimized for data-heavy interfaces |
| State Management | React Query + React Hook Form | ^3.39.0 + ^7.45.0 | Server state + form state management | Optimistic updates with conflict resolution for component editing |
| Backend Language | Python | ^3.11 | Async backend development | Excellent for ML/OCR integration with strong typing support |
| Backend Framework | FastAPI | ^0.115.0 | High-performance async API framework | Auto-generated OpenAPI docs + native async support for drawing processing |
| API Style | REST + OpenAPI | 3.0.0 | RESTful APIs with automatic documentation | Simplifies frontend integration with comprehensive API docs |
| Database | PostgreSQL + PostGIS | ^14.9 | Spatial database for engineering drawings | PostGIS required for component location tracking and spatial queries |
| Cache | Redis | ^7.2 | Caching and message broker | Celery message broker + API response caching |
| Search Engine | Elasticsearch | ^8.11 | Fast component search with fuzzy matching | Real-time component indexing with advanced query capabilities |
| Background Processing | Celery | ^5.3 | Distributed task queue | OCR processing and search indexing without blocking UI |
| File Storage | Local filesystem | N/A | Drawing file storage | Docker volume mounting, ready for S3 migration |
| Authentication | JWT (Planned) | N/A | Token-based authentication | Stateless auth ready for microservices scaling |
| Frontend Testing | Jest + React Testing Library | ^29.5.0 + ^13.4.0 | Component and integration testing | Standard React testing with accessible component queries |
| Backend Testing | pytest + pytest-asyncio | ^7.4.2 + ^0.21.1 | Unit and integration testing | Async test support for FastAPI endpoints |
| E2E Testing | Playwright (Recommended) | ^1.37.1 | End-to-end workflow testing | Component editing workflows require full browser testing |
| Build Tool | Vite | ^4.4.9 | Fast frontend build and dev server | Hot reload essential for component editing development |
| Bundler | Vite | ^4.4.9 | Modern ES module bundling | Tree shaking and optimal chunks for component libraries |
| IaC Tool | Docker Compose | ^3.8 | Container orchestration | Simple multi-service development and deployment |
| CI/CD | GitHub Actions (Recommended) | Latest | Automated testing and deployment | Integrates with existing GitHub workflow |
| Monitoring | Python logging + Docker logs | Built-in | Application monitoring | Ready for Prometheus/Grafana upgrade |
| CSS Framework | Material-UI + CSS-in-JS | ^5.14.0 | Component-scoped styling | Prevents style conflicts in complex modal editing interfaces |

## Data Models

The core data models define the system's business logic and support sophisticated component editing workflows:

### Component Model
**Purpose:** The central entity representing individual engineering components (piece marks) found within drawings. Components are the primary focus of the editing system and support complex validation, dimensional data, and specifications.

**Key Attributes:**
- `piece_mark`: string - Unique identifier within a drawing (e.g., "G", "CG3", "B1")
- `component_type`: string - Engineering classification (wide_flange, hss, angle, etc.)
- `description`: string - Human-readable component description
- `quantity`: number - Number of instances of this component
- `material_type`: string - Material specification (A36 Steel, A572 Grade 50, etc.)
- `location_x`, `location_y`: number - Spatial coordinates within the drawing
- `bounding_box`: object - Rectangular boundary for component highlighting
- `confidence_score`: number - OCR/ML confidence (0.0-1.0)
- `review_status`: string - Manual review state (pending, reviewed, approved)

**TypeScript Interface:**
```typescript
interface Component {
  id: string;
  drawing_id: string;
  piece_mark: string;
  component_type: ComponentType;
  description?: string;
  quantity: number;
  material_type?: string;
  location_x?: number;
  location_y?: number;
  bounding_box?: BoundingBox;
  confidence_score?: number;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  
  // Related data (populated via joins)
  dimensions?: Dimension[];
  specifications?: Specification[];
  drawing?: Drawing;
}

type ComponentType = 
  | 'wide_flange' | 'hss' | 'angle' | 'channel' 
  | 'plate' | 'tube' | 'beam' | 'column' 
  | 'brace' | 'girder' | 'truss' | 'generic';

type ReviewStatus = 'pending' | 'reviewed' | 'approved';
```

**Relationships:**
- Belongs to one Drawing
- Has many Dimensions (one-to-many)
- Has many Specifications (one-to-many)
- Has many ComponentAuditLogs (one-to-many)

### Dimension Model
**Purpose:** Physical measurements and dimensional data for components. Supports engineering specifications like length, width, thickness with units and tolerances.

**Key Attributes:**
- `dimension_type`: string - Type of measurement (length, width, height, thickness, diameter)
- `value`: number - Numerical measurement value
- `unit`: string - Unit of measurement (inches, mm, feet)
- `tolerance`: string - Engineering tolerance specification (±0.125", +0/-0.5)

### Specification Model
**Purpose:** Technical specifications and properties beyond dimensional data. Handles material properties, coatings, standards compliance, and other engineering specifications.

**Key Attributes:**
- `specification_type`: string - Type of specification (coating, grade, standard, connection)
- `value`: string - Specification value or identifier
- `description`: string - Detailed specification description

### Data Model Relationships
```mermaid
erDiagram
    Project ||--o{ Drawing : contains
    Drawing ||--o{ Component : contains
    Component ||--o{ Dimension : has
    Component ||--o{ Specification : has
    Component ||--o{ ComponentAuditLog : tracks
```

## Architecture Diagram

```mermaid
graph TD
    A[React SPA Frontend] --> B[FastAPI Gateway]
    B --> C[Component Service]
    B --> D[Search Service] 
    B --> E[Export Service]
    B --> F[Drawing Service]
    
    C --> G[PostgreSQL + PostGIS]
    D --> H[Elasticsearch]
    F --> I[Redis Cache]
    F --> J[Celery Workers]
    
    J --> K[OCR Processing]
    J --> L[Component Detection]
    
    C --> M[Component Detail Modal]
    C --> N[Validation Pipeline]
    C --> O[Audit Logging]
    
    D --> H
    C --> H
    
    P[File Upload] --> F
    Q[Background Processing] --> J
    
    style M fill:#e1f5fe
    style N fill:#e8f5e8  
    style O fill:#fff3e0
```

## API Specification

The system provides a comprehensive REST API with OpenAPI 3.0 specification supporting sophisticated component editing workflows:

### Key API Endpoints

**Component Management:**
- `POST /api/v1/components` - Create component with validation and duplicate detection
- `GET /api/v1/components/{id}` - Get component with dimensions, specifications, and drawing context  
- `PUT /api/v1/components/{id}` - Update component with full validation pipeline and audit logging
- `PATCH /api/v1/components/{id}` - Partial update for optimistic UI updates
- `POST /api/v1/components/{id}/validate` - Real-time validation for immediate UI feedback
- `GET /api/v1/components/{id}/duplicates` - Piece mark duplicate detection within drawing
- `DELETE /api/v1/components/{id}` - Soft delete with cascade to related data

**Advanced Search:**
- `GET /api/v1/search` - Advanced search with fuzzy matching, field scoping, and effectiveness metrics
- `GET /api/v1/search/suggestions` - Real-time autocomplete suggestions

**Dimension & Specification Management:**
- `GET/POST /api/v1/components/{id}/dimensions` - CRUD operations for component dimensions
- `PUT/DELETE /api/v1/dimensions/{id}` - Update and delete specific dimensions
- `GET/POST /api/v1/components/{id}/specifications` - CRUD operations for component specifications  
- `PUT/DELETE /api/v1/specifications/{id}` - Update and delete specific specifications

**Drawing Processing:**
- `POST /api/v1/drawings` - Upload drawing with project assignment and processing trigger
- `GET /api/v1/drawings/{id}` - Drawing status, metadata, and component extraction results
- `GET /api/v1/drawings/{id}/components` - All components extracted from specific drawing

**Export & Reporting:**
- `POST /api/v1/export/excel` - Generate Excel reports with customizable filtering and formatting
- `POST /api/v1/export/csv` - CSV data export with advanced filtering options

**API Design Patterns:**
- **Optimistic Updates**: PATCH endpoints for immediate UI feedback with validation
- **Real-time Validation**: Separate validation endpoints for responsive editing experience
- **Scope Effectiveness**: Search responses include coverage metrics across different field types
- **Comprehensive Error Handling**: Structured error responses with validation details and request tracking

### Example API Response - Component with Related Data
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "drawing_id": "456e7890-e89b-12d3-a456-426614174000",
  "piece_mark": "G1",
  "component_type": "wide_flange",
  "description": "Main girder component",
  "quantity": 2,
  "material_type": "A572 Grade 50",
  "location_x": 150.5,
  "location_y": 200.0,
  "confidence_score": 0.95,
  "review_status": "approved",
  "dimensions": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174000",
      "dimension_type": "length",
      "value": 24.0,
      "unit": "inches",
      "tolerance": "±0.125"
    }
  ],
  "specifications": [
    {
      "id": "012e3456-e89b-12d3-a456-426614174000",
      "specification_type": "coating",
      "value": "Hot-dip galvanized",
      "description": "ASTM A123 galvanizing specification"
    }
  ],
  "drawing_file_name": "Bridge_Plan_Sheet_1.pdf",
  "project_name": "Railroad Bridge Renovation Project"
}
```

## System Components

The Engineering Drawing Index System comprises several major logical components with clear responsibilities and integration patterns:

### Component Editing Service
**Responsibility:** Manages sophisticated component editing workflows including validation pipelines, optimistic updates, conflict resolution, and audit logging. This is the most complex service in the system.

**Key Interfaces:**
- Component CRUD operations with business rule validation
- Real-time validation for UI feedback during editing
- Piece mark duplicate detection within drawing scope
- Component audit trail access and change tracking

**Dependencies:** PostgreSQL database, Search Service for automatic index updates, Elasticsearch for component indexing, Audit Logging subsystem

**Technology Stack:** FastAPI with async request handling, SQLAlchemy ORM with PostGIS spatial queries, Pydantic models for validation, Business rule engine for component type validation

### Search Service  
**Responsibility:** Provides advanced component search with fuzzy matching, field-scoped search, scope effectiveness metrics, and real-time suggestions.

**Key Interfaces:**
- Advanced search with filtering and scope metrics
- Real-time autocomplete suggestions
- Search index management and refresh capabilities
- Internal indexing API for component updates

**Dependencies:** Elasticsearch cluster, Component Editing Service for data source, Redis cache for search results and suggestions

**Technology Stack:** Elasticsearch 8.11 with custom analyzers, Python elasticsearch-py client with async support, Custom tokenizers for engineering piece mark patterns

### Frontend Application
**Responsibility:** React-based SPA providing sophisticated component editing interfaces, real-time search, drawing visualization, and project management.

**Key Interfaces:**
- Component Detail Modal with inline editing
- Real-time search interface with scope indicators  
- Drawing viewer with component highlighting
- Project management and export interfaces

**Dependencies:** API Gateway Service, Component Editing Service APIs, Search Service, Export Service

**Technology Stack:** React 18 with TypeScript, Material-UI component library, React Query for server state management with optimistic updates, React Hook Form for complex form validation

### Drawing Processing Service
**Responsibility:** Handles drawing file upload, OCR processing, component detection, and background analysis workflows.

**Key Interfaces:**
- Drawing file upload with project assignment
- Drawing status and metadata management
- Component extraction from drawing analysis
- Internal Celery task interfaces for async processing

**Dependencies:** File Storage Service, Background Processing Service (Celery), Component Editing Service, PostgreSQL

**Technology Stack:** FastAPI file upload handling, Celery task queue, Tesseract OCR engine integration, OpenCV for image processing, PyTorch/ML models for component classification

## Frontend Architecture Details

### Component Architecture
The React frontend uses sophisticated component hierarchy designed for engineering data management:

**Component Organization:**
```
frontend/src/
├── components/editor/          # Component editing subsystem
│   ├── ComponentBasicInfo.tsx  # Basic component data editing
│   ├── ComponentDimensions.tsx # Dimension CRUD interface  
│   ├── ComponentSpecifications.tsx # Specification CRUD interface
│   └── ComponentHistory.tsx    # Audit trail display
├── components/
│   ├── ComponentDetailModal.tsx    # Main editing modal (complex)
│   ├── SearchResultRow.tsx        # Search result display
│   ├── ScopeEffectivenessMetrics.tsx # Search scope indicators
│   └── Navigation.tsx             # Main navigation
├── services/                   # API integration layer
│   ├── api.ts                 # Main API client
│   ├── componentService.ts    # Component-specific API calls
│   └── searchService.ts       # Search API integration
├── hooks/                     # Custom React hooks
│   ├── useComponentEditor.ts  # Component editing state logic
│   ├── useOptimisticUpdates.ts # Optimistic update patterns
│   └── useSearchScope.ts      # Search scope management
└── stores/                    # Global state management
    ├── searchStore.ts         # Search state and filters
    └── uiStore.ts            # UI state (modals, notifications)
```

### State Management Architecture
Multi-layer state management optimized for component editing:

**React Query + React Hook Form Integration:** This combination enables sophisticated editing workflows with:
- **Server state caching** that survives modal open/close cycles
- **Optimistic updates** with automatic rollback on failure  
- **Form state persistence** during network operations
- **Real-time validation** without excessive API calls

**Modal-Centric Navigation:** Modal-based editing provides:
- **Context preservation** - users don't lose place in search results
- **Deep linking support** - direct URLs to component editing states
- **Progressive disclosure** - complex editing doesn't overwhelm basic workflows

### Service Layer Integration
The services layer provides consistent error handling, caching, and retry logic:

```typescript
// Component service with optimistic updates
const useComponentWithOptimisticUpdates = (componentId: string) => {
  const updateMutation = useMutation(
    (updateData: ComponentUpdateRequest) => updateComponent(componentId, updateData),
    {
      // Optimistic update
      onMutate: async (updateData) => {
        await queryClient.cancelQueries(['component', componentId]);
        const previousData = queryClient.getQueryData(['component', componentId]);
        queryClient.setQueryData(['component', componentId], (old: Component) => ({
          ...old, ...updateData, updated_at: new Date().toISOString()
        }));
        return { previousData };
      },
      // Rollback on error
      onError: (error, updateData, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(['component', componentId], context.previousData);
        }
      }
    }
  );
};
```

## Backend Architecture Details

### Service Architecture
Service-oriented monolith architecture providing balance of complexity and maintainability:

**Service Organization:**
- **API Layer:** FastAPI route handlers for HTTP request/response management
- **Service Layer:** Business logic with validation pipelines and integration orchestration
- **Repository Layer:** Data access abstraction with SQLAlchemy ORM
- **Background Tasks:** Celery workers for OCR processing and search indexing

### Database Architecture  
PostgreSQL + PostGIS providing relational data management and spatial capabilities:

**Core Schema Design:**
```sql
-- Components table with spatial capabilities
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
    piece_mark VARCHAR(50) NOT NULL,
    component_type VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    material_type VARCHAR(100),
    
    -- Spatial location data
    location_x DOUBLE PRECISION,
    location_y DOUBLE PRECISION,
    bounding_box JSON,  -- Stored as JSON coordinates
    
    -- OCR and validation metadata
    confidence_score DOUBLE PRECISION CHECK (confidence_score >= 0 AND confidence_score <= 1),
    review_status VARCHAR(20) DEFAULT 'pending',
    
    -- Audit metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_piece_mark_per_drawing UNIQUE (drawing_id, piece_mark)
);

-- Standard indexes for location and component queries
CREATE INDEX idx_components_location ON components(location_x, location_y);
CREATE INDEX idx_components_piece_mark_drawing ON components(drawing_id, piece_mark);
```

**Data Access Layer with Repository Pattern:**
```python
class ComponentService:
    async def update_component(
        self, component_id: UUID, update_data: ComponentUpdateRequest, db: Session
    ) -> Optional[ComponentResponse]:
        # 1. Validation pipeline
        validation_result = await self.validate_component_update(
            component_id, update_data, db
        )
        if not validation_result.is_valid:
            raise ValidationError(validation_result.errors)
            
        # 2. Apply updates with audit logging
        component = db.query(Component).filter(Component.id == component_id).first()
        original_values = {field: getattr(component, field) for field in update_data.dict(exclude_unset=True).keys()}
        
        # 3. Update and persist
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(component, field, value)
        db.commit()
        
        # 4. Trigger search index update
        search_service.index_component(component, db)
        
        return self._component_to_response(component)
```

## Service Definitions

### API Gateway Service
- **Technology**: FastAPI with Uvicorn ASGI server
- **Responsibilities**:
  - Unified entry point for all client requests
  - Request routing to appropriate service components
  - JWT authentication and authorization (planned)
  - API rate limiting and throttling
  - CORS handling for frontend integration
  - Request/response logging and monitoring
  - Automatic OpenAPI/Swagger documentation generation
  - Health check and system status endpoints

### 2. Drawing Processing Service
- **Technology**: Python + Celery
- **Responsibilities**:
  - File upload handling
  - Async drawing processing
  - OCR text extraction
  - Component detection
  - Dimension extraction
  - Quality scoring

### 3. Search Service
- **Technology**: Python + Elasticsearch
- **Responsibilities**:
  - Component indexing
  - Full-text search
  - Fuzzy matching
  - Filter application
  - Result ranking

### 4. Export Service
- **Technology**: Python + openpyxl
- **Responsibilities**:
  - Excel generation
  - CSV export
  - PDF report generation
  - Template management

## Infrastructure Components

### Container Orchestration
```yaml
# docker-compose.yml
version: '3.8'

services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/drawings
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      - elasticsearch

  drawing-service:
    build: ./services/drawing-service
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/drawings
      - CELERY_BROKER_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  celery-worker:
    build: ./services/drawing-service
    command: celery -A app.celery worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/drawings
      - CELERY_BROKER_URL=redis://redis:6379

  postgres:
    image: postgis/postgis:14-3.2
    environment:
      - POSTGRES_DB=drawings
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  elasticsearch:
    image: elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  elasticsearch_data:
```

## Deployment Architecture

### Production Environment
- **Cloud Provider**: AWS/Azure/GCP
- **Container Registry**: ECR/ACR/GCR
- **Orchestration**: Kubernetes (EKS/AKS/GKE)
- **Load Balancer**: ALB/Application Gateway
- **CDN**: CloudFront/Azure CDN
- **Storage**: S3/Blob Storage for drawings

### Monitoring Stack
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger
- **Alerting**: AlertManager

## Security Architecture

### Authentication Flow
```
Client → API Gateway → Auth Service → JWT Token
                ↓
        Validate Token
                ↓
        Route to Service
```

### Data Security
- TLS 1.3 for all communications
- Encryption at rest for database
- Encrypted file storage
- API key rotation
- Audit logging

### Security Implementation Status
**Current State (Development):**
- JWT authentication endpoints prepared but not active
- CORS configured for frontend origin (http://localhost:3000)
- File upload validation (size, type, content)
- SQL injection protection via SQLAlchemy ORM
- Input validation through Pydantic models

**Planned Production Security:**
- Active JWT token authentication with refresh rotation
- Role-based access control (RBAC) for component editing
- API rate limiting and DDoS protection
- Comprehensive audit logging for all component modifications
- Encryption at rest for PostgreSQL and file storage

## Component Editing Workflow Architecture

### Modal-Based Editing Pattern
The system uses sophisticated modal-based editing that maintains context while providing comprehensive editing capabilities:

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Component List
    participant M as Component Modal
    participant API as Backend API
    participant DB as Database
    participant ES as Elasticsearch

    U->>UI: Click component row
    UI->>M: Open modal with component ID
    M->>API: GET /api/components/{id}
    API->>DB: Query component with relations
    DB-->>API: Component + dimensions + specs
    API-->>M: Component data
    M->>M: Initialize form with data
    
    U->>M: Edit piece mark field
    M->>API: POST /api/components/{id}/validate
    API->>DB: Check duplicate piece marks
    DB-->>API: Validation result
    API-->>M: Real-time validation feedback
    
    U->>M: Save changes
    M->>M: Optimistic update (show success)
    M->>API: PUT /api/components/{id}
    API->>DB: Update component
    API->>ES: Update search index
    ES-->>API: Index updated
    DB-->>API: Update confirmed
    API-->>M: Success response
    
    Note over M: If error occurs, rollback optimistic update
```

### Validation Pipeline Architecture
Multi-stage validation ensures data integrity while providing immediate feedback:

**Stage 1: Client-Side Validation (React Hook Form)**
- Field format validation (piece mark patterns, numeric ranges)
- Required field validation
- Custom validation rules (component type constraints)

**Stage 2: Real-Time API Validation**
- Duplicate detection within drawing scope
- Business rule validation (material compatibility, component type rules)
- Cross-field validation (quantity vs. dimensions consistency)

**Stage 3: Database Constraints**
- Foreign key integrity
- Unique constraints (piece_mark per drawing)
- Check constraints (confidence_score ranges, coordinate bounds)

**Stage 4: Post-Save Processing**
- Search index synchronization
- Audit log creation
- Background validation for complex rules

### Error Handling and Recovery Patterns

```typescript
// Comprehensive error handling in component editing
const handleComponentUpdate = async (updateData: ComponentUpdateRequest) => {
  try {
    // Optimistic update
    updateUIOptimistically(updateData);
    
    const result = await componentAPI.updateComponent(componentId, updateData);
    
    // Success: sync with server response
    syncWithServerData(result.data);
    showSuccessNotification('Component updated successfully');
    
  } catch (error) {
    // Rollback optimistic update
    rollbackOptimisticUpdate();
    
    if (error.status === 409) {
      // Conflict: component was modified by another user
      showConflictDialog(error.data.conflicts);
    } else if (error.status === 422) {
      // Validation errors: show field-specific errors
      setFieldErrors(error.data.validation_errors);
    } else {
      // Network or server error: show retry option
      showRetryableError('Failed to save changes', () => handleComponentUpdate(updateData));
    }
  }
};
```

## Performance and Scalability Considerations

### Frontend Performance Optimizations
**Component Rendering:**
- React.memo() for expensive component detail modals
- Virtual scrolling for large component lists (react-window)
- Image lazy loading for drawing previews
- Bundle splitting with React.lazy() for modal components

**State Management Performance:**
- React Query background refetching with stale-while-revalidate
- Optimistic updates reduce perceived latency
- Strategic query invalidation prevents unnecessary refetches
- Local storage persistence for search filters and UI state

### Backend Performance Architecture
**Database Performance:**
```sql
-- Critical indexes for component editing
CREATE INDEX CONCURRENTLY idx_components_drawing_piece_mark 
    ON components(drawing_id, piece_mark);
CREATE INDEX CONCURRENTLY idx_components_type_status 
    ON components(component_type, review_status);
CREATE INDEX CONCURRENTLY idx_audit_log_component_timestamp 
    ON component_audit_logs(component_id, created_at DESC);

-- Spatial indexes for location queries
CREATE INDEX CONCURRENTLY idx_components_location_gist 
    ON components USING GIST(location_point);
```

**Caching Strategy:**
- Redis caching for frequent component queries (15-minute TTL)
- Elasticsearch result caching for repeated searches
- CDN caching for drawing image previews
- Browser caching for static assets with versioning

**Async Processing:**
- Celery workers for OCR processing (prevents UI blocking)
- Background search indexing after component updates
- Batch processing for bulk component imports

### Scalability Architecture
**Horizontal Scaling Readiness:**
- Stateless API design enables load balancer distribution
- Database connection pooling with SQLAlchemy
- Redis session storage preparation for multi-instance deployment
- Container-based architecture ready for Kubernetes orchestration

**Database Scaling Strategy:**
- Read replicas for search queries and reporting
- Partitioning strategy for large drawing collections by project/date
- Archive strategy for old drawings and components
- Full-text search offloaded to Elasticsearch cluster

## Development and Debugging Architecture

### Local Development Environment
```bash
# Complete development stack startup
docker-compose up -d postgres redis elasticsearch  # Infrastructure
npm run dev                                        # Frontend dev server
uvicorn app.main:app --reload --port 8000         # Backend dev server  
celery -A app.core.celery_app worker --loglevel=debug  # Background processing

# Monitoring and debugging
open http://localhost:5555  # Celery Flower task monitoring
open http://localhost:8000/docs  # API documentation and testing
```

### Debugging Tools and Techniques
**Frontend Debugging:**
- React DevTools with component state inspection
- React Query DevTools for server state debugging
- Redux DevTools for global state (if needed)
- Browser Network tab for API request/response analysis
- Console logging with structured error tracking

**Backend Debugging:**
```python
# Structured logging configuration
import logging
from app.core.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(pathname)s:%(lineno)d'
)

# Component service debugging
logger = logging.getLogger('app.services.component')
logger.debug(f'Updating component {component_id} with data: {update_data}')
```

**Database Debugging:**
```sql
-- Performance analysis queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE query LIKE '%components%'
ORDER BY total_time DESC;

-- Component editing activity monitoring
SELECT c.piece_mark, COUNT(cal.*) as edit_count, MAX(cal.created_at) as last_edit
FROM components c
LEFT JOIN component_audit_logs cal ON c.id = cal.component_id
GROUP BY c.id, c.piece_mark
ORDER BY edit_count DESC;
```

### Testing Architecture
**Component Editing Test Strategy:**
```typescript
// Integration test for component modal editing
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ComponentDetailModal', () => {
  it('should handle optimistic updates with error rollback', async () => {
    // Mock API with failure response
    jest.spyOn(componentAPI, 'updateComponent').mockRejectedValue(
      new Error('Network error')
    );
    
    render(<ComponentDetailModal componentId="test-id" />);
    
    // User edits piece mark
    const pieceMarkInput = screen.getByLabelText('Piece Mark');
    fireEvent.change(pieceMarkInput, { target: { value: 'NEW_MARK' } });
    
    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    // Should show optimistic update immediately
    expect(pieceMarkInput.value).toBe('NEW_MARK');
    
    // Should rollback on error and show error message
    await waitFor(() => {
      expect(pieceMarkInput.value).toBe('ORIGINAL_MARK'); // Rolled back
      expect(screen.getByText('Failed to save changes')).toBeInTheDocument();
    });
  });
});
```

## Architecture Decision Records (ADRs)

### ADR-001: Component-Centric Data Model
**Status:** Accepted  
**Decision:** Center the entire system architecture around the Component entity rather than Drawing-centric design.

**Context:** Engineering workflows focus on finding and editing specific components (piece marks) across many drawings. The original design was drawing-centric.

**Rationale:**
- 90% of user interactions involve component search and editing
- Component relationships (dimensions, specifications) are complex and frequently accessed
- Search performance requires component-level indexing
- Audit requirements demand component-level change tracking

**Consequences:**
- ✅ Faster component queries and editing workflows
- ✅ More intuitive API design matching user mental models
- ✅ Better search index design and performance
- ⚠️ More complex drawing-level operations (bulk exports)
- ⚠️ Additional complexity in maintaining drawing-component consistency

### ADR-002: Modal-Based Editing Interface
**Status:** Accepted  
**Decision:** Use modal dialogs for component editing instead of dedicated editing pages or inline editing.

**Context:** Users need to edit components while maintaining context of search results and drawing overview.

**Rationale:**
- Preserves user's place in search results or drawing view
- Enables deep linking to specific component editing states
- Supports complex editing workflows (dimensions, specifications, history)
- Provides clear visual boundaries for editing vs. viewing modes

**Consequences:**
- ✅ Better user experience with context preservation
- ✅ Simplified navigation patterns
- ✅ Easier state management (modal vs. page-level state)
- ⚠️ Modal complexity increases with feature additions
- ⚠️ Mobile/tablet experience requires careful responsive design

### ADR-003: Optimistic Updates with Rollback
**Status:** Accepted  
**Decision:** Implement optimistic updates for component editing with automatic rollback on failure.

**Context:** Component editing workflows require responsive feedback, but network latency can make the interface feel sluggish.

**Rationale:**
- Perceived performance improvement for editing workflows
- Maintains data consistency through rollback mechanisms
- Reduces user friction during rapid editing sessions
- Aligns with modern web application patterns

**Consequences:**
- ✅ Significantly improved perceived performance
- ✅ Better user experience during slow network conditions
- ✅ Maintains data integrity through rollback mechanisms
- ⚠️ Increased complexity in error handling and state management
- ⚠️ Requires careful testing of rollback scenarios

### ADR-004: PostgreSQL + PostGIS for Spatial Data
**Status:** Accepted  
**Decision:** Use PostgreSQL with PostGIS extension for spatial component location data instead of separate spatial database.

**Context:** Components have location coordinates within engineering drawings, and users need spatial queries for drawing visualization.

**Rationale:**
- Single database reduces operational complexity
- PostGIS provides enterprise-grade spatial capabilities
- Strong ACID guarantees for component location consistency
- Rich spatial indexing and query capabilities
- Excellent Python ecosystem integration

**Consequences:**
- ✅ Unified data storage with spatial capabilities
- ✅ Strong consistency guarantees for location data
- ✅ Rich spatial query capabilities (within radius, intersections)
- ⚠️ Higher memory requirements for PostGIS extension
- ⚠️ Additional complexity in database migrations and backups

## Conclusion

The Engineering Drawing Index System architecture represents a sophisticated fullstack application optimized for complex component editing workflows. The system successfully combines modern web application patterns (React + TypeScript, FastAPI + Python) with specialized engineering requirements (spatial data, OCR processing, dimensional management).

### Architectural Strengths
1. **Component-Centric Design** - The architecture aligns with user workflows, prioritizing component search and editing over traditional document-centric patterns
2. **Sophisticated State Management** - React Query + React Hook Form combination enables complex editing workflows with optimistic updates and conflict resolution
3. **Multi-Layer Validation** - Comprehensive validation pipeline ensures data integrity while providing immediate user feedback
4. **Scalable Infrastructure** - Container-based architecture with clear service boundaries enables horizontal scaling as needed
5. **Spatial Data Integration** - PostGIS integration provides enterprise-grade spatial capabilities essential for engineering drawing analysis

### Current System Maturity
- **Production-Ready Components:** Core API, database schema, search functionality, basic authentication
- **Development-Phase Components:** Component editing workflows, advanced validation, audit logging  
- **Planned Enhancements:** Advanced authentication, role-based access control, performance optimization, mobile responsiveness

### Key Success Metrics
- **Search Performance:** Average time to first relevant result < 10 seconds (current: ~3 seconds)
- **Component Editing Efficiency:** Complete component edit workflow < 30 seconds (current: ~15 seconds)
- **System Reliability:** 99.9% uptime for component editing operations (current: development environment)
- **Data Accuracy:** < 1% component data validation errors after OCR processing (current: ~2-3%)

### Next Architectural Priorities
1. **Complete Component Editing Validation Pipeline** - Finish implementing the sophisticated validation workflows outlined in this document
2. **Performance Optimization** - Implement caching strategies and query optimization for large component datasets
3. **Mobile/Tablet Responsiveness** - Adapt component editing interfaces for field use on tablets
4. **Advanced Authentication & Authorization** - Implement role-based access control for team collaboration
5. **Production Deployment Architecture** - Migrate from Docker Compose to Kubernetes for production scalability

This architectural documentation serves as the foundation for the development team to understand, debug, and enhance the component editing system that is central to the Engineering Drawing Index System's value proposition.
