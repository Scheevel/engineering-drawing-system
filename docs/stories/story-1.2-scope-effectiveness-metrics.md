# Scope Effectiveness Metrics Display - Brownfield Addition

## User Story

As a **bridge engineer performing scoped searches**,
I want **to see unique result counts per scope ("23 in Piece Marks, 15 in Types")**,
So that **I understand the effectiveness of my chosen scope and can make informed decisions about search strategy**.

## Story Context

**Existing System Integration:**

- Integrates with: Search API response structure and SearchPage.tsx search controls
- Technology: React 18 + TypeScript + Material-UI (Typography, Chip components)
- Follows pattern: Existing search result count display and status indicators
- Touch points: Search service API, search controls UI, scope selection component

## Acceptance Criteria

**Functional Requirements:**

1. **Scope Count Display**: Show unique result counts for each scope option in a compact format (e.g., "Piece Marks (23) | Types (15) | Descriptions (31)")
2. **Real-time Updates**: Metrics update immediately when search terms change, showing preview counts for all scopes
3. **Current Scope Highlight**: Emphasize the currently selected scope with its count in the metrics display

**Integration Requirements:**

4. Existing search scope selection functionality continues to work unchanged
5. New metrics display follows existing search result count styling patterns
6. Integration with search API maintains current search performance without additional backend load

**Quality Requirements (TDD Focus):**

7. **Test Coverage**: All metrics calculation and display logic covered by comprehensive unit tests
8. **Performance Tests**: Verify no measurable degradation in search response time (< 50ms additional)
9. **Data Accuracy Tests**: Ensure scope counts accurately reflect actual filterable results
10. **UI Consistency Tests**: Metrics display integrates seamlessly with existing search interface

## Technical Notes

- **Integration Approach**: Enhance search API response to include scope-specific counts, update SearchPage.tsx to display metrics
- **Existing Pattern Reference**: Follow search result count display pattern already used in search results header
- **Key Constraints**: Minimize additional API calls - compute scope counts from single search response
- **TDD Strategy**: Write tests for count calculation accuracy, UI update behavior, and edge cases (no results, single scope)

## Definition of Done

- [ ] Scope effectiveness metrics display correctly for all search terms
- [ ] Metrics update in real-time as user types and changes search parameters
- [ ] Current scope is visually distinguished in metrics display
- [ ] Existing search functionality regression tested and confirmed working
- [ ] **TDD Complete**: Unit tests for calculation logic, integration tests for API changes, UI tests for display behavior
- [ ] Performance benchmarking confirms no significant search slowdown

## Test-Driven Development Requirements

**Required Test Coverage:**

1. **Unit Tests**:
   - Scope count calculation logic accuracy
   - Edge cases (empty results, single matches)
   - Metrics display component rendering
   - Current scope highlighting logic

2. **Integration Tests**:
   - API response includes correct scope counts
   - UI updates correctly with search term changes
   - Scope selection updates metrics display
   - Performance impact measurement

3. **Data Accuracy Tests**:
   - Scope counts match actual filterable results
   - Cross-verification with existing search results
   - Handle overlapping data correctly (per Mary's analysis)

4. **User Experience Tests**:
   - Metrics are clearly visible and readable
   - Display works on mobile and desktop layouts
   - Accessibility compliance for screen readers

## Technical Implementation Strategy

**Backend Enhancement** (minimal):
```python
# Extend search_service.py to include scope counts in response
def get_search_results_with_scope_metrics(query: str, scope: SearchScope):
    # Calculate counts for all scopes in single query for efficiency
    scope_counts = {
        'piece_marks': count_matches_in_field(query, 'piece_mark'),
        'component_types': count_matches_in_field(query, 'component_type'), 
        'descriptions': count_matches_in_field(query, 'description')
    }
    # Return existing results + scope_counts
```

**Frontend Enhancement**:
```typescript
// Add to SearchPage.tsx - metrics display component
const ScopeMetrics: React.FC<{scopeCounts: ScopeCountData, currentScope: SearchScope}> = ({scopeCounts, currentScope}) => {
    // Render scope effectiveness indicators
};
```

## Risk and Compatibility Check

**Minimal Risk Assessment:**

- **Primary Risk**: Additional database queries could impact search performance
- **Mitigation**: Compute all scope counts in single optimized query, cache results briefly
- **Rollback**: Feature can be disabled via feature flag without affecting core search

**Compatibility Verification:**

- [ ] No breaking changes to existing search API contract
- [ ] Backend changes are additive only (scope_counts field optional)
- [ ] UI changes follow existing search interface patterns
- [ ] Performance impact measured and within acceptable limits (< 50ms additional response time)

---

**Development Estimate**: 3-4 hours focused development work
**Sprint Priority**: High (Phase 1 - Current Sprint)
**Dependencies**: None - can be developed independently of Story 1.1
**API Changes**: Minimal - single additional field in search response