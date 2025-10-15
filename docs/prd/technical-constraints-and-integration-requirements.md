---
**Author:** Claude (AI-generated documentation)
**Created:** 2025 (estimated based on project timeline)
**Purpose:** Technical integration guidelines and database schemas for brownfield enhancement
---

# Technical Constraints and Integration Requirements

## Existing Technology Stack

**Languages:** Python 3.11, TypeScript, SQL  
**Frameworks:** FastAPI (backend), React 18 (frontend), Material-UI (UI components)  
**Database:** PostgreSQL 14 + PostGIS (spatial data), Elasticsearch 8.11 (search engine)  
**Infrastructure:** Docker Compose, Redis 7 (cache/queue), Celery 5.3 (background processing)  
**External Dependencies:** Tesseract (OCR), OpenCV (image processing), PyTorch (ML models)

## Integration Approach

**Database Integration Strategy:**
```sql
-- New table integrates with existing project system
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    search_query VARCHAR(500),
    search_scope JSONB DEFAULT '["piece_mark"]',
    filters JSONB DEFAULT '{}',
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_saved_searches_project ON saved_searches(project_id);
CREATE INDEX idx_saved_searches_usage ON saved_searches(last_used_at, usage_count);
```

**API Integration Strategy:**
- Extend existing search endpoints in `backend/app/api/search.py` rather than creating new routes
- Add query parameter `scope` to current `/api/search` endpoint for backward compatibility
- Implement new endpoints under `/api/search/saved/*` namespace
- Maintain existing response format while adding scope metadata to search results

**Frontend Integration Strategy:**
- Enhance SearchPage.tsx without breaking existing component structure
- Extend API client in `frontend/src/services/api.ts` with new search methods
- Integrate with existing state management patterns
- Leverage existing error handling and loading state patterns

## Code Organization and Standards

**File Structure Approach:**
```
backend/app/
├── api/search.py              # Enhanced with saved search endpoints
├── models/
│   ├── database.py           # Add SavedSearch model
│   └── search.py             # Enhanced SearchRequest with scope field
├── services/
│   ├── search_service.py     # Enhanced with boolean query parser
│   └── saved_search_service.py  # New service for saved search operations
└── utils/
    └── query_parser.py       # New utility for boolean query parsing
```

**Naming Conventions:**
- **Database models:** `SavedSearch` (PascalCase) following existing patterns
- **API endpoints:** `/api/search/saved` (kebab-case) consistent with existing REST conventions
- **Service methods:** `parse_boolean_query()`, `execute_saved_search()` (snake_case)
- **Frontend components:** `SavedSearchPanel`, `SearchScopeSelector` (PascalCase)

## Deployment and Operations

**Build Process Integration:**
- Docker Compose: No changes required - enhancement uses existing services
- Database migration: Single Alembic migration adds saved_searches table and indexes
- Frontend build: Integrates with existing `npm run build` process
- API documentation: Auto-generates updated OpenAPI schema at `/docs`

**Configuration Management:**
```python