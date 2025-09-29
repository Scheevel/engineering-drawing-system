# Engineering Drawing Index System - Coding Standards

## Code Style and Conventions (AS-BUILT)

This document captures the **ACTUAL coding patterns** observed in the Engineering Drawing Index System codebase, establishing standards for consistent development.

## Backend Python Standards

### Code Formatting and Style

**Formatter**: Black (23.11.0) - Auto-formatting enforced
```bash
black .  # Format all Python files
```

**Linting**: flake8 (6.1.0) - Style guide enforcement
```bash
flake8 .  # Check code style
```

**Type Checking**: mypy (1.7.1) - Static type analysis
```bash
mypy .  # Type checking
```

### File and Module Organization

**Observed Pattern**:
```
backend/app/
├── api/           # FastAPI router modules
├── core/          # Configuration and database setup
├── models/        # Pydantic and SQLAlchemy models
├── services/      # Business logic layer
├── tasks/         # Celery background tasks
├── utils/         # Utility functions and helpers
└── main.py        # Application entry point
```

**Naming Conventions** (AS-BUILT patterns):
- **Files**: `snake_case.py` (e.g., `search_service.py`, `saved_search_service.py`)
- **Classes**: `PascalCase` (e.g., `SearchService`, `ComponentAuditLog`)
- **Functions/Methods**: `snake_case` (e.g., `search_components`, `validate_component`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_SEARCHES_PER_PROJECT`)
- **Database Models**: `PascalCase` (e.g., `Component`, `SavedSearch`)

### Import Organization

**Observed Standard Pattern**:
```python
# 1. Standard library imports
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

# 2. Third-party imports
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from celery import Task

# 3. Local application imports
from app.core.database import get_db
from app.models.database import Component, Drawing
from app.services.search_service import SearchService
from app.utils.query_parser import parse_search_query
```

### Error Handling Patterns

**Standard Exception Pattern** (observed in codebase):
```python
async def search_components(request: SearchRequest, db: Session) -> SearchResponse:
    """Search for components with comprehensive error handling"""
    try:
        # Validate input
        validation_result = validate_search_query(request.query, request.scope)
        if not validation_result.is_valid:
            return SearchResponse(
                # ... error response structure
                warnings=[validation_result.error.message] if validation_result.error else []
            )

        # Business logic implementation
        results = await self._execute_search(request, db)
        return results

    except Exception as e:
        logger.error(f"Error searching components: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Logging Standards

**Logger Configuration Pattern**:
```python
import logging

logger = logging.getLogger(__name__)

# Usage patterns observed:
logger.info(f"Starting processing for drawing {drawing_id}")
logger.warning(f"Enhanced search failed, falling back to simple search: {e}")
logger.error(f"Error searching components: {str(e)}")
logger.debug(f"Searching query '{request.query}' in scope fields: {scope_field_names}")
```

### Database Patterns

**SQLAlchemy Model Standards**:
```python
class Component(Base):
    __tablename__ = "components"

    # Primary key pattern
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key pattern
    drawing_id = Column(UUID(as_uuid=True), ForeignKey("drawings.id"), nullable=False)

    # Timestamp pattern
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship pattern
    drawing = relationship("Drawing", back_populates="components")
```

**Query Patterns**:
```python
# Observed pattern with joins and eager loading
query = db.query(Component).join(Drawing).outerjoin(Project)
components = query.options(
    joinedload(Component.drawing).joinedload(Drawing.project),
    joinedload(Component.dimensions),
    joinedload(Component.specifications)
).offset(offset).limit(request.limit).all()
```

### API Standards

**FastAPI Router Pattern**:
```python
from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Optional

router = APIRouter()

@router.get("/components", response_model=SearchResponse)
async def search_components(
    query: str = Query("*", min_length=1),
    scope: Optional[List[str]] = Query(None),
    component_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search for components across all drawings"""
    # Implementation
```

**Response Model Pattern**:
```python
# Consistent error handling with structured responses
try:
    results = await search_service.search_components(search_request, db)
    return results
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

## Frontend TypeScript Standards

### File and Component Organization

**Observed Structure**:
```
frontend/src/
├── components/        # Reusable UI components
│   ├── flexible/     # Flexible schema components
│   └── schema-management/  # Schema management UI
├── pages/            # Route-level components
├── services/         # API integration
├── hooks/            # Custom React hooks
└── types/            # TypeScript type definitions
```

**Naming Conventions** (AS-BUILT patterns):
- **Files**: `PascalCase.tsx` for components (e.g., `SearchPage.tsx`, `ComponentDetailModal.tsx`)
- **Services**: `camelCase.ts` (e.g., `api.ts`, `searchService.ts`)
- **Components**: `PascalCase` (e.g., `SearchPage`, `FlexibleComponentCard`)
- **Hooks**: `camelCase` with `use` prefix (e.g., `useDebounce`, `useComponentEditor`)

### Import Organization

**Standard TypeScript Import Pattern**:
```typescript
// 1. React and core libraries
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// 2. Material-UI imports
import {
  Box, Paper, TextField, Button, Grid, Typography,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

// 3. Local imports
import {
  searchComponents,
  getSearchSuggestions,
  type SearchResponse,
  type Component
} from '../services/api.ts';
import FlexibleComponentCard from '../components/flexible/FlexibleComponentCard.tsx';
```

### TypeScript Interface Standards

**Interface Naming and Structure**:
```typescript
// API Response interfaces
export interface SearchResponse {
  query: string;
  scope?: string[];
  results: Component[];
  total: number;
  // ... other fields
}

// Component Props interfaces
interface ComponentDetailModalProps {
  componentId: string;
  onClose: () => void;
  onSave?: (component: Component) => void;
}

// API Request interfaces
export interface SavedSearchCreate {
  name: string;
  description?: string;
  query: string;
  scope: string[];
  project_id: string;
}
```

### React Component Patterns

**Functional Component with Hooks Pattern**:
```typescript
const SearchPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [filters, setFilters] = useState<SearchFilters>({
    componentType: '',
    projectId: '',
    instanceIdentifier: ''
  });

  // React Query for server state
  const { data: searchResults, isLoading, error } = useQuery(
    ['search', query, filters],
    () => searchComponents({ query, ...filters }),
    { enabled: query.length > 0 }
  );

  // Component implementation
  return (
    // JSX implementation
  );
};
```

### State Management Patterns

**React Query Pattern** (observed throughout codebase):
```typescript
// Query with optimistic updates
const updateMutation = useMutation(
  (updateData: ComponentUpdateRequest) => updateComponent(componentId, updateData),
  {
    onMutate: async (updateData) => {
      // Optimistic update logic
      await queryClient.cancelQueries(['component', componentId]);
      const previousData = queryClient.getQueryData(['component', componentId]);
      queryClient.setQueryData(['component', componentId], (old: Component) => ({
        ...old, ...updateData
      }));
      return { previousData };
    },
    onError: (error, updateData, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['component', componentId], context.previousData);
      }
    }
  }
);
```

## Database Standards

### Migration Patterns

**Alembic Migration Standards** (observed in migrations/versions/):
```python
"""Add flexible component schema support

Revision ID: add_flexible_schemas
Revises: 9bc6a98f1c12
Create Date: 2025-09-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    # Table creation with proper constraints
    op.create_table(
        'component_schemas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True),
                 sa.ForeignKey('projects.id'), nullable=True),
        # ... other columns

        # Performance indexes
        sa.UniqueConstraint('project_id', 'name', 'version')
    )

    # Create indexes for performance
    op.create_index('idx_components_schema_id', 'components', ['schema_id'])
```

### Index Strategy

**Performance Index Patterns** (observed):
```sql
-- Spatial indexes for component locations
CREATE INDEX CONCURRENTLY idx_components_location ON components(location_x, location_y);

-- Composite indexes for common queries
CREATE INDEX idx_components_piece_mark_drawing ON components(drawing_id, piece_mark);

-- JSONB indexes for flexible schema data
CREATE INDEX idx_components_dynamic_data_gin ON components
USING gin(dynamic_data);
```

## Testing Standards

### Backend Testing Patterns

**pytest Standards**:
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

@pytest.mark.asyncio
async def test_search_components_with_scope():
    """Test component search with scope parameter"""
    # Arrange
    search_request = SearchRequest(
        query="girder",
        scope=[SearchScope.COMPONENT_TYPE],
        page=1,
        limit=20
    )

    # Act
    response = await search_service.search_components(search_request, db)

    # Assert
    assert response.total > 0
    assert all(comp.component_type == "girder" for comp in response.results)
```

### Frontend Testing Patterns

**React Testing Library Standards**:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ComponentDetailModal', () => {
  it('should handle optimistic updates with error rollback', async () => {
    // Mock API
    jest.spyOn(componentAPI, 'updateComponent').mockRejectedValue(
      new Error('Network error')
    );

    render(<ComponentDetailModal componentId="test-id" />);

    // User interaction
    const pieceMarkInput = screen.getByLabelText('Piece Mark');
    fireEvent.change(pieceMarkInput, { target: { value: 'NEW_MARK' } });

    // Assertions with proper waiting
    await waitFor(() => {
      expect(screen.getByText('Failed to save changes')).toBeInTheDocument();
    });
  });
});
```

## Documentation Standards

### Code Documentation

**Docstring Pattern** (observed):
```python
async def search_components(self, request: SearchRequest, db: Session) -> SearchResponse:
    """
    Search for components across all drawings with enhanced query parsing.

    Args:
        request: Search request containing query, scope, and filters
        db: Database session for queries

    Returns:
        SearchResponse with results, pagination, and metadata

    Raises:
        HTTPException: When search validation fails
    """
```

### Comment Standards

**Inline Comment Patterns**:
```python
# Validate and parse the search query
validation_result = validate_search_query(request.query, request.scope)

# Apply scope-based text search (skip if query is wildcard for filter-only searches)
if request.query and request.query != "*":
    # Build enhanced search filter
    try:
        text_filter = build_search_filter(parsed_query, search_fields)
    except Exception as e:
        logger.warning(f"Enhanced search failed, falling back to simple search: {e}")
        # Fallback implementation
```

## Performance Standards

### Query Optimization

**Database Query Patterns**:
```python
# Use eager loading to prevent N+1 queries
components = query.options(
    joinedload(Component.drawing).joinedload(Drawing.project),
    joinedload(Component.dimensions),
    joinedload(Component.specifications)
).all()

# Use select_related equivalent for performance
```

### Caching Strategies

**Redis Caching Pattern**:
```python
# Cache frequent component queries (15-minute TTL)
cache_key = f"component:{component_id}"
cached_result = redis_client.get(cache_key)
if cached_result:
    return json.loads(cached_result)

# Store with TTL
redis_client.setex(cache_key, 900, json.dumps(result))
```

## Security Standards

### Input Validation

**Pydantic Validation Pattern**:
```python
class ComponentUpdateRequest(BaseModel):
    piece_mark: Optional[str] = Field(None, max_length=100, regex=r'^[A-Z0-9_-]+$')
    component_type: Optional[str] = Field(None, max_length=100)
    quantity: Optional[int] = Field(None, gt=0, le=10000)

    @validator('piece_mark')
    def validate_piece_mark(cls, v):
        if v and not v.strip():
            raise ValueError('Piece mark cannot be empty')
        return v.upper() if v else v
```

### SQL Injection Prevention

**SQLAlchemy ORM Pattern** (observed throughout):
```python
# Always use parameterized queries via ORM
components = db.query(Component).filter(
    Component.piece_mark == piece_mark,  # Parameterized
    Component.drawing_id == drawing_id
).all()

# Never use string interpolation for SQL
# WRONG: f"SELECT * FROM components WHERE piece_mark = '{piece_mark}'"
```

These coding standards reflect the **actual patterns** implemented in the Engineering Drawing Index System, providing a foundation for consistent development practices.