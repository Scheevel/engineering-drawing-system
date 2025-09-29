# Engineering Drawing Index System Brownfield Enhancement PRD

## Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial Creation | 2025-01-19 | v1.0 | Advanced Search Enhancement PRD | John (PM) |

---

## Intro Project Analysis and Context

### Analysis Source
**IDE-based fresh analysis** using available project documentation and FEATURE-REQUESTS.md specification

### Current Project State
The Engineering Drawing Index System is an AI-powered tool for railroad bridge engineers that automates the indexing and analysis of engineering drawings. The system solves the critical problem of searching for specific components (piece marks) across hundreds of historical drawing sheets and automates dimensional data extraction.

**Key Value Proposition:** Reduces component search time from hours to seconds and eliminates manual data transcription errors.

**Current Architecture:**
- **Frontend**: React 18 + TypeScript + Material-UI (port 3000)
- **Backend API**: FastAPI + Python 3.11 with async support (port 8000 internally, exposed as 8001)
- **Database**: PostgreSQL 14 with PostGIS for spatial data
- **Search Engine**: Elasticsearch 8.11 for fast component search
- **Cache/Queue**: Redis 7 for caching and Celery message broker
- **Background Processing**: Celery 5.3 workers for OCR and analysis

### Available Documentation Analysis

**Available Documentation:**
- ✅ Tech Stack Documentation (CLAUDE.md)
- ✅ Source Tree/Architecture (detailed in CLAUDE.md)
- ✅ Coding Standards (noted in CLAUDE.md)
- ✅ API Documentation (OpenAPI at /docs endpoint)
- ✅ External API Documentation (detailed service architecture)
- ⚠️ UX/UI Guidelines (limited)
- ✅ Technical Debt Documentation (noted in CLAUDE.md)

### Enhancement Scope Definition

**Enhancement Type:**
- ✅ New Feature Addition
- ✅ Major Feature Modification

**Enhancement Description:**
Enhance the existing search functionality with scoped field selection, boolean operators (AND/OR/NOT), wildcard patterns, and project-based saved searches to improve search precision and workflow efficiency for railroad bridge engineers.

**Impact Assessment:**
- ✅ Moderate Impact (some existing code changes)

### Goals and Background Context

**Goals:**
• Provide precise piece mark searching with field scope control
• Enable complex queries using boolean operators and wildcard patterns  
• Reduce repetitive search work through project-based saved searches
• Maintain simple interface while adding power user capabilities
• Eliminate false positives through targeted field searching

**Background Context:**
The current search system provides basic text search across piece_mark, component_type, and description fields simultaneously, which can generate false positives. Engineers frequently perform repetitive searches for component verification and quality control workflows. The enhancement will add precision controls and workflow optimization while maintaining the existing simple search experience for basic users.

---

## Requirements

### Functional Requirements

**FR1:** The system shall provide scoped search control allowing users to limit searches to specific fields (piece_mark, component_type, description) with piece_mark as the default scope.

**FR2:** The system shall support boolean operators (AND, OR, NOT) in search queries while maintaining backward compatibility with simple text searches.

**FR3:** The system shall support wildcard pattern matching using * and ? characters (e.g., "C6*" matches all piece marks starting with C6).

**FR4:** The system shall provide project-based saved searches allowing users to save, name, and reuse search configurations within project contexts.

**FR5:** The search interface shall display active search scope in results headers and provide intuitive controls for scope selection.

**FR6:** The system shall provide search syntax help and real-time query validation feedback through UI tooltips and indicators.

**FR7:** Saved searches shall be executable with one-click access and include search parameters, scope, and filters.

**FR8:** The system shall track search usage analytics to measure efficiency improvements and identify common search patterns for continuous optimization.

**FR9:** The system shall provide query syntax validation with helpful error messages for malformed boolean expressions and graceful handling of invalid syntax.

**FR10:** Saved searches shall include result preview functionality and handle cases where saved filters no longer match any data due to project changes.

### Non-Functional Requirements

**NFR1:** Search response times must not exceed current performance baseline (maintain sub-500ms response for typical queries).

**NFR2:** The enhancement must maintain 100% backward compatibility with existing search functionality and API endpoints.

**NFR3:** Boolean query parsing must handle malformed queries gracefully with clear error messages.

**NFR4:** The system must support concurrent saved search operations without data corruption.

**NFR5:** Search scope selection must be persistent per user session but not override saved search configurations.

**NFR6:** Boolean query parser must sanitize input to prevent SQL injection vulnerabilities and ensure secure query execution.

**NFR7:** The system must maintain query performance with proper database indexing strategy for wildcard searches and complex boolean operations.

### Compatibility Requirements

**CR1:** All existing search API endpoints must continue functioning without modification for current integrations.

**CR2:** Database schema changes must be additive only (new saved_searches table) without modifying existing component tables.

**CR3:** Frontend search interface must maintain existing Material-UI design patterns and accessibility standards.

**CR4:** Integration with existing Elasticsearch and PostgreSQL fallback search must remain intact.

---

## User Interface Enhancement Goals

### Integration with Existing UI

**Current Search Interface Analysis:**
The existing system uses React 18 + TypeScript + Material-UI with TextField components for search input, Select/Dropdown components for filtering, and Card/Paper components for results display, maintaining consistent spacing and typography from the Material-UI theme.

**New UI Integration Strategy:**
The enhanced search features will integrate using existing Material-UI components:
- **Search Scope Controls:** FormGroup with Checkbox components maintaining existing form patterns
- **Boolean Query Input:** Enhanced TextField with InputAdornment for syntax help icon
- **Saved Searches:** Collapsible Panel using Accordion component, consistent with existing expandable content
- **Query Validation:** Alert/Snackbar components for error feedback using existing notification patterns

### Modified/New Screens and Views

**Enhanced SearchPage.tsx:**
- **Search Control Panel:** New collapsible section above existing search input with scope selection checkboxes and query syntax help tooltip integration
- **Saved Searches Sidebar:** New collapsible panel with project-based saved search list, quick execute buttons, and save/edit/delete operations
- **Enhanced Results Header:** Modified existing results display with active search scope indicators and save search button when results exist

**No New Pages Required:** All enhancements integrate into existing SearchPage.tsx structure

### UI Consistency Requirements

**Material-UI Theme Compliance:**
- All new components must use existing theme colors, typography, and spacing
- Maintain consistent component sizing (48px button heights, 8px spacing grid)
- Follow existing elevation patterns for panels and modals
- Use consistent icon library (Material Icons) for new interface elements

**Accessibility Standards:**
- Scope selection checkboxes must have proper ARIA labels
- Boolean query syntax help must be screen reader compatible  
- Saved search operations must support keyboard navigation
- Query validation errors must announce properly to assistive technology

**Responsive Design Integration:**
- Search scope controls must adapt to mobile viewport constraints
- Saved searches panel must be mobile-friendly (drawer behavior on small screens)
- Enhanced search input must maintain usability on tablet/mobile devices

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages:** Python 3.11, TypeScript, SQL  
**Frameworks:** FastAPI (backend), React 18 (frontend), Material-UI (UI components)  
**Database:** PostgreSQL 14 + PostGIS (spatial data), Elasticsearch 8.11 (search engine)  
**Infrastructure:** Docker Compose, Redis 7 (cache/queue), Celery 5.3 (background processing)  
**External Dependencies:** Tesseract (OCR), OpenCV (image processing), PyTorch (ML models)

### Integration Approach

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

### Code Organization and Standards

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

### Deployment and Operations

**Build Process Integration:**
- Docker Compose: No changes required - enhancement uses existing services
- Database migration: Single Alembic migration adds saved_searches table and indexes
- Frontend build: Integrates with existing `npm run build` process
- API documentation: Auto-generates updated OpenAPI schema at `/docs`

**Configuration Management:**
```python
# Environment variables for new features
ENABLE_BOOLEAN_SEARCH=true
ENABLE_SAVED_SEARCHES=true
MAX_SAVED_SEARCHES_PER_PROJECT=50
SEARCH_ANALYTICS_ENABLED=true
```

### Risk Assessment and Mitigation

**Technical Risks:**
- **Query Performance:** Complex boolean queries may slow search response times
  - *Mitigation:* Implement query complexity limits and performance monitoring
- **SQL Injection:** Boolean query parsing creates potential security vulnerabilities  
  - *Mitigation:* Use parameterized queries and rigorous input sanitization

**Integration Risks:**
- **Elasticsearch Compatibility:** Advanced queries may not translate properly to Elasticsearch
  - *Mitigation:* Maintain PostgreSQL fallback for complex queries
- **Frontend State Complexity:** Search state management may become complex with new features
  - *Mitigation:* Use existing patterns and consider state management library if needed

**Mitigation Strategies:**
- Phased rollout using environment configuration
- Performance benchmarking and automated testing
- User feedback collection and monitoring

---

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision:** **Single Comprehensive Epic** - "Advanced Search Capabilities Enhancement"

**Rationale:** This enhancement should be structured as a single epic because all components work together to solve the core problem of search precision and workflow efficiency, share the same technical foundation, and integrate within typical engineer workflows.

## Epic 1: Advanced Search Capabilities Enhancement

**Epic Goal:** Enhance the existing search functionality with scoped field selection, boolean operators, wildcard patterns, and project-based saved searches to improve search precision and workflow efficiency while maintaining complete backward compatibility.

**Integration Requirements:** Must integrate seamlessly with existing Elasticsearch/PostgreSQL search infrastructure, FastAPI backend services, and React/Material-UI frontend components without disrupting current search workflows.

### Story 1.1: Enhanced Search Query Foundation

As a **railroad bridge engineer**,  
I want **the search system to support enhanced query parsing and validation**,  
so that **I can use advanced search syntax without breaking existing simple searches**.

#### Acceptance Criteria
1. **AC1:** System parses simple text queries exactly as before (backward compatibility)
2. **AC2:** System validates boolean operator syntax (AND, OR, NOT) and provides clear error messages
3. **AC3:** System sanitizes all search input to prevent SQL injection vulnerabilities
4. **AC4:** Query parser handles quoted phrases ("wide flange beam") correctly
5. **AC5:** System gracefully handles malformed queries without crashing search functionality

#### Integration Verification
**IV1:** All existing search functionality continues to work without modification  
**IV2:** Current search API endpoints return identical results for existing query patterns  
**IV3:** Search performance remains within established baseline metrics (<500ms)

### Story 1.2: Scoped Search Field Selection

As a **railroad bridge engineer**,  
I want **to limit my search to specific fields like piece marks only**,  
so that **I can find exact components without false positives from descriptions**.

#### Acceptance Criteria
1. **AC1:** Search interface displays checkboxes for "Piece Marks", "Component Types", "Descriptions"
2. **AC2:** Piece Marks checkbox is selected by default for precision
3. **AC3:** Search results show active scope in results header ("Searching in: Piece Marks")
4. **AC4:** Scope selection persists for user session but doesn't affect saved search configurations
5. **AC5:** API accepts scope parameter while maintaining backward compatibility

#### Integration Verification
**IV1:** Existing searches without scope parameter work identically to current behavior  
**IV2:** Search results UI layout remains consistent with current Material-UI patterns  
**IV3:** Component type filtering dropdown continues working alongside scope selection

### Story 1.3: Boolean Operators and Wildcard Support

As a **railroad bridge engineer**,  
I want **to use AND/OR/NOT operators and wildcard patterns in my searches**,  
so that **I can create precise queries like "C6* AND girder NOT aluminum"**.

#### Acceptance Criteria
1. **AC1:** System supports AND operator ("beam AND steel" finds components containing both terms)
2. **AC2:** System supports OR operator ("plate OR angle" finds components containing either term)
3. **AC3:** System supports NOT operator ("steel NOT aluminum" excludes aluminum components)
4. **AC4:** System supports wildcard patterns ("C6*" matches all piece marks starting with C6)
5. **AC5:** System supports grouped logic with parentheses "(beam OR girder) AND W21"
6. **AC6:** Help tooltip displays syntax examples and real-time validation feedback

#### Integration Verification
**IV1:** Simple text searches continue working without requiring operator syntax  
**IV2:** Search response format remains identical for API compatibility  
**IV3:** Boolean queries integrate properly with scope selection from previous story

### Story 1.4: Search Usage Analytics and Monitoring

As a **system administrator**,  
I want **to track search usage patterns and performance metrics**,  
so that **I can measure the enhancement's impact and optimize search capabilities**.

#### Acceptance Criteria
1. **AC1:** System logs search queries, scope selections, and response times
2. **AC2:** Analytics track boolean query usage vs simple text searches
3. **AC3:** Performance monitoring alerts when search response times exceed thresholds
4. **AC4:** Usage patterns data helps identify common search workflows
5. **AC5:** Analytics integrate with existing logging and monitoring infrastructure

#### Integration Verification
**IV1:** Analytics logging doesn't impact search performance or user experience  
**IV2:** Monitoring integrates with existing system health checks and alerting  
**IV3:** Data collection complies with existing privacy and retention policies

### Story 1.5: Project-Based Saved Searches

As a **railroad bridge engineer**,  
I want **to save my complex search configurations within project contexts**,  
so that **I can quickly rerun quality control searches without retyping complex queries**.

#### Acceptance Criteria
1. **AC1:** "Save Search" button appears when search returns results
2. **AC2:** Save dialog allows naming search and selecting project context
3. **AC3:** Saved searches panel shows project-specific searches with one-click execution
4. **AC4:** Saved searches include query, scope, filters, and execution preview
5. **AC5:** Users can edit, delete, and reorder saved searches within projects
6. **AC6:** System limits maximum saved searches per project (50) to prevent database growth

#### Integration Verification
**IV1:** Saved search execution produces identical results to manual query entry  
**IV2:** Project deletion properly cascades to remove associated saved searches  
**IV3:** Search interface remains responsive with large numbers of saved searches

### Story 1.6: Enhanced Search Interface Polish

As a **railroad bridge engineer**,  
I want **an intuitive and polished search interface that guides me through advanced features**,  
so that **I can leverage powerful search capabilities without feeling overwhelmed**.

#### Acceptance Criteria
1. **AC1:** Search interface uses progressive disclosure (advanced features collapsed by default)
2. **AC2:** Syntax help is accessible but not intrusive (tooltip with examples)
3. **AC3:** Error messages provide actionable guidance for fixing query syntax
4. **AC4:** Search scope selection is clearly labeled and easy to understand
5. **AC5:** Saved searches panel integrates smoothly with existing Material-UI design
6. **AC6:** Mobile/tablet responsive design maintains usability across devices

#### Integration Verification
**IV1:** Enhanced interface maintains existing accessibility standards and ARIA compliance  
**IV2:** Search page loading times remain within current performance expectations  
**IV3:** All existing keyboard navigation and screen reader compatibility preserved

---

## Implementation Summary

**Epic Overview:**
- **6 Stories** sequenced to minimize risk and maximize incremental value
- **Foundation First:** Query parsing and validation before user features
- **Progressive Enhancement:** Each story builds on previous capabilities
- **Risk Mitigation:** Every story includes existing functionality verification
- **User-Centered:** Stories deliver immediate value to engineers' daily workflows

**Technical Approach:**
- **Sprint Planning:** Stories sized for 1-2 day implementation cycles
- **Testing Strategy:** Each story includes unit, integration, and E2E test requirements
- **Rollback Safety:** Stories can be independently disabled via feature flags
- **Performance Focus:** Each story includes performance verification requirements

**Success Criteria:**
- **Precision:** Reduced false positives with scoped search
- **Power Users:** Complex queries via boolean operators  
- **Efficiency:** Saved searches eliminate repetitive typing
- **Organization:** Project-based search organization
- **Adoption:** Intuitive UI maintains ease of use for basic searches