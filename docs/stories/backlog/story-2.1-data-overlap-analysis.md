# Data Overlap Analysis Query - Brownfield Addition

## User Story

As a **system administrator managing data quality**,
I want **automated queries that identify cross-field term overlap in component data**,
So that **I can measure, monitor, and improve data quality over time while understanding user search confusion patterns**.

## Story Context

**Existing System Integration:**

- Integrates with: PostgreSQL database, existing SQLAlchemy models in `app/models/database.py`
- Technology: FastAPI + SQLAlchemy + PostgreSQL with existing async query patterns
- Follows pattern: Existing database service layer in `app/services/` directory
- Touch points: Component model, database queries, potential admin API endpoints

## Acceptance Criteria

**Functional Requirements:**

1. **Overlap Detection Query**: Create SQL function/query that identifies components where search terms appear in multiple fields
2. **Quantified Analysis**: Return overlap percentages and counts for most problematic terms (top 20 overlapping terms)
3. **Scheduled Reporting**: Enable periodic execution to track data quality trends over time

**Integration Requirements:**

4. Existing database performance remains unaffected by analysis queries
5. New analysis functions follow existing SQLAlchemy async query patterns
6. Integration with existing Component model maintains current data relationships

**Quality Requirements (TDD Focus):**

7. **Test Coverage**: All overlap detection logic covered by database integration tests
8. **Performance Tests**: Analysis queries execute within acceptable time limits (< 5 seconds for full dataset)
9. **Data Accuracy Tests**: Overlap calculations verified against manual spot-checking
10. **Edge Case Tests**: Handle empty datasets, single components, and null field values

## Technical Notes

- **Integration Approach**: Create new database service class for data quality analysis, reuse existing async patterns
- **Existing Pattern Reference**: Follow async database query patterns in `app/services/drawing_service.py`
- **Key Constraints**: Analysis must not impact production search performance - run during low-traffic periods
- **TDD Strategy**: Write tests for SQL query accuracy, performance benchmarks, and data integrity validation

## Definition of Done

- [ ] Overlap analysis SQL queries return accurate cross-field term detection
- [ ] Analysis can be executed on-demand via internal API or CLI command
- [ ] Performance benchmarking confirms queries complete within time limits
- [ ] **TDD Complete**: Database integration tests, performance tests, and accuracy validation tests pass
- [ ] Documentation includes query examples and interpretation guidelines
- [ ] Results format enables future automation and monitoring

## Test-Driven Development Requirements

**Required Test Coverage:**

1. **Database Integration Tests**:
   - Overlap detection accuracy with known test data
   - Query performance with various dataset sizes
   - Proper handling of null/empty field values
   - Concurrent query execution safety

2. **Data Accuracy Tests**:
   - Manual verification of overlap calculations for sample data
   - Cross-validation with existing search result patterns
   - Edge case handling (single character terms, special characters)

3. **Performance Tests**:
   - Query execution time benchmarks
   - Memory usage during analysis
   - Impact on concurrent database operations

4. **API Integration Tests** (if API endpoint created):
   - Proper async response handling
   - Error handling for large datasets
   - Authentication and authorization compliance

## Technical Implementation Strategy

**Core Analysis Query**:
```sql
-- Identify cross-field term overlap
WITH term_analysis AS (
    SELECT 
        component_id,
        piece_mark,
        component_type, 
        description,
        CASE 
            WHEN search_term_in_field(%s, piece_mark) THEN 'piece_mark'
            ELSE NULL 
        END as piece_mark_match,
        CASE 
            WHEN search_term_in_field(%s, component_type) THEN 'component_type'
            ELSE NULL
        END as type_match,
        CASE 
            WHEN search_term_in_field(%s, description) THEN 'description'  
            ELSE NULL
        END as desc_match
    FROM components
    WHERE piece_mark ILIKE %s 
       OR component_type ILIKE %s
       OR description ILIKE %s
)
SELECT 
    COUNT(*) as total_matches,
    COUNT(piece_mark_match) as piece_mark_matches,
    COUNT(type_match) as type_matches, 
    COUNT(desc_match) as description_matches,
    -- Calculate overlap statistics
    COUNT(CASE WHEN (piece_mark_match IS NOT NULL AND type_match IS NOT NULL) THEN 1 END) as piece_type_overlap,
    COUNT(CASE WHEN (piece_mark_match IS NOT NULL AND desc_match IS NOT NULL) THEN 1 END) as piece_desc_overlap,
    COUNT(CASE WHEN (type_match IS NOT NULL AND desc_match IS NOT NULL) THEN 1 END) as type_desc_overlap
FROM term_analysis;
```

**Service Layer Integration**:
```python
# app/services/data_quality_service.py
class DataQualityService:
    async def analyze_term_overlap(self, search_term: str) -> OverlapAnalysisResult:
        # Execute overlap analysis query
        # Return structured results for reporting
        
    async def get_top_overlapping_terms(self, limit: int = 20) -> List[TermOverlapSummary]:
        # Identify most problematic overlapping terms
        # Return ranked list for data cleanup prioritization
```

## Risk and Compatibility Check

**Minimal Risk Assessment:**

- **Primary Risk**: Analysis queries could impact database performance during execution
- **Mitigation**: Execute during off-peak hours, implement query timeouts, use read-only replica if available
- **Rollback**: Analysis queries are read-only and can be disabled without affecting core functionality

**Compatibility Verification:**

- [ ] No changes to existing database schema or production tables
- [ ] Analysis queries are read-only operations only
- [ ] Query patterns follow existing SQLAlchemy async conventions
- [ ] No impact on search API performance or user-facing functionality

---

**Development Estimate**: 4-5 hours focused development work
**Sprint Priority**: Medium (Phase 2 - Next Sprint) 
**Dependencies**: None - uses existing database and models
**Database Impact**: Read-only analysis queries, no schema changes required