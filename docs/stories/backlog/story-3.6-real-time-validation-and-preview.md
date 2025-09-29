# Story 3.6: Real-time Validation and Preview

**Epic:** Schema Management UI
**Story Points:** 8
**Sprint:** Sprint 5-6 (Week 5-6)
**Dependencies:** Story 3.3 (Schema Creation and Basic Editing), Story 3.4 (Dynamic Field Management)
**Priority:** High (parallel development possible)

## Description

Implement real-time schema validation and live preview functionality to provide immediate feedback during schema editing. This story enhances the user experience by showing validation errors as they occur and providing a live preview of how the schema will appear to end users.

## User Story

**As a** railroad bridge engineer
**I want** immediate feedback on my schema design and a preview of how it will look
**So that** I can ensure my schema is valid and will work well for component data entry

## Acceptance Criteria

### Real-time Validation
- [ ] **Debounced Validation System**
  - Implement 500ms debounce for schema validation during editing
  - Cancel previous validation requests when new changes occur
  - Performance optimization to prevent excessive API calls
  - Configurable debounce timing via environment variables

- [ ] **Field Name Uniqueness Checking**
  - Real-time validation of field name uniqueness within schema
  - Immediate feedback when duplicate names are entered
  - Clear error messaging for name conflicts
  - Suggest alternative names when conflicts detected

- [ ] **Live Field Configuration Validation**
  - Validate field configurations as user types/selects options
  - Check min/max relationships for number fields
  - Validate select field options for completeness
  - Ensure regex patterns are valid for text fields

- [ ] **Schema-Level Validation**
  - Validate minimum field requirements (at least 1 field)
  - Check for required field distribution (warn if all fields optional)
  - Validate overall schema structure and relationships
  - Performance warnings for complex schemas (50+ fields)

### Validation Feedback Interface
- [ ] **Inline Error Messages**
  - Field-level error messages that appear immediately below fields
  - Clear, actionable error descriptions
  - Error icons and color coding following Material-UI patterns
  - Auto-dismiss errors when issues are resolved

- [ ] **Schema Validation Summary**
  - Summary panel showing all current validation issues
  - Categorized errors (critical, warnings, suggestions)
  - Click-to-navigate to specific problematic fields
  - Overall validation status indicator (valid/invalid/checking)

- [ ] **Field-Level Error Indicators**
  - Visual indicators on field cards when validation fails
  - Red borders, error icons, or other clear visual cues
  - Tooltip or popover with detailed error information
  - Consistent with existing application error patterns

- [ ] **Validation Status Indicators**
  - Loading spinner during validation API calls
  - Green checkmark for validated, error-free sections
  - Warning icons for non-critical issues
  - Clear distinction between validating, valid, and invalid states

### Schema Preview System
- [ ] **Live Form Preview**
  - Real-time preview of schema as a component data entry form
  - Updates immediately when fields are added, modified, or reordered
  - Shows exactly how engineers will see the form when creating components
  - Responsive preview that adapts to different screen sizes

- [ ] **Example Data Population**
  - Auto-populate preview form with realistic example data
  - Different example data for different field types
  - User option to customize example data for better preview accuracy
  - Clear indication that data is for preview only

- [ ] **Preview Styling Accuracy**
  - Preview matches actual form styling from existing components
  - Material-UI theme consistency with rest of application
  - Proper spacing, typography, and visual hierarchy
  - Mobile and desktop preview options

- [ ] **Preview Mode Toggle**
  - Easy toggle between edit mode and preview mode
  - Split-screen option showing edit and preview simultaneously
  - Full-screen preview mode for detailed review
  - Keyboard shortcuts for quick mode switching

### Validation API Integration
- [ ] **Server-Side Validation Calls**
  - API endpoints for comprehensive schema validation
  - Validation includes business logic not possible on frontend
  - Check for conflicts with existing component data
  - Validate against project-specific constraints

- [ ] **Validation Result Caching**
  - Cache validation results to prevent repeated identical calls
  - Smart cache invalidation when schema changes
  - Cache expiration for time-sensitive validations
  - Memory management for validation cache

- [ ] **Graceful API Failure Handling**
  - Continue with client-side validation when API unavailable
  - Clear indication when server validation is unavailable
  - Retry logic for temporary network failures
  - Fallback validation modes for offline scenarios

- [ ] **Mock Validation Support**
  - Mock validation responses for development and testing
  - Configurable mock scenarios for different validation states
  - Environment flag to enable/disable mock validation
  - Realistic mock data that covers edge cases

## Technical Implementation

### Components to Create

**Preview Components:**
- `src/components/schema-management/SchemaPreview.tsx` - Main preview interface
- `src/components/schema-management/SchemaFormPreview.tsx` - Form rendering preview
- `src/components/schema-management/ValidationFeedbackPanel.tsx` - Validation results display

**Validation Components:**
- `src/components/schema-management/ValidationStatusIndicator.tsx` - Status indicators
- `src/components/schema-management/InlineValidationError.tsx` - Field-level errors

### Hooks to Create
- `src/hooks/schema/useSchemaValidation.ts` - Enhanced validation logic
- `src/hooks/schema/useSchemaPreview.ts` - Preview state management
- `src/hooks/schema/useDebounce.ts` - Debouncing utility (if not existing)

### Services to Create
- `src/services/validationService.ts` - Validation API calls and caching
- `src/utils/schemaPreviewUtils.ts` - Preview generation utilities

### Implementation Examples

**Real-time Validation Hook:**
```typescript
export const useSchemaValidation = (schemaData: any, enabled: boolean = true) => {
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Use existing useDebounce hook
  const debouncedSchemaData = useDebounce(schemaData, 500);

  useEffect(() => {
    if (!enabled || !debouncedSchemaData) return;

    const validateSchema = async () => {
      setIsValidating(true);
      try {
        const result = await validateSchemaData(debouncedSchemaData);
        setValidationResult(result);
      } catch (error) {
        console.error('Schema validation failed:', error);
        setValidationResult({
          isValid: false,
          errors: ['Validation service unavailable']
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateSchema();
  }, [debouncedSchemaData, enabled]);

  return {
    validationResult,
    isValidating,
    isValid: validationResult?.isValid ?? false,
    errors: validationResult?.errors ?? [],
    warnings: validationResult?.warnings ?? [],
  };
};
```

**Schema Preview Hook:**
```typescript
export const useSchemaPreview = (schema: ComponentSchema) => {
  const [previewMode, setPreviewMode] = useState('edit');
  const [exampleData, setExampleData] = useState({});

  const generatePreviewForm = useCallback(() => {
    if (!schema?.fields) return null;

    return schema.fields
      .sort((a, b) => a.display_order - b.display_order)
      .map(field => ({
        ...field,
        value: exampleData[field.field_name] || generateExampleValue(field)
      }));
  }, [schema, exampleData]);

  const togglePreviewMode = useCallback(() => {
    setPreviewMode(prev => prev === 'edit' ? 'preview' : 'edit');
  }, []);

  return {
    previewMode,
    previewForm: generatePreviewForm(),
    togglePreviewMode,
    updateExampleData: setExampleData,
  };
};
```

**Validation Service:**
```typescript
class ValidationService {
  private cache = new Map();
  private pendingRequests = new Map();

  async validateSchema(schemaData: any): Promise<ValidationResult> {
    const cacheKey = this.generateCacheKey(schemaData);

    // Return cached result if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Return pending request if already in progress
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create new validation request
    const validationPromise = this.performValidation(schemaData);
    this.pendingRequests.set(cacheKey, validationPromise);

    try {
      const result = await validationPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async performValidation(schemaData: any): Promise<ValidationResult> {
    // Mock validation in development
    if (schemaConfig.validation.enableMocking) {
      return this.generateMockValidation(schemaData);
    }

    // Real API validation
    const response = await api.post('/schemas/validate', schemaData);
    return response.data;
  }
}
```

## Testing Requirements

### Unit Tests
- [ ] **Validation Hook Tests**
  - Debounced validation timing works correctly
  - Validation results update properly
  - Error handling for API failures
  - Cache management functions correctly

- [ ] **Preview Component Tests**
  - Preview updates when schema changes
  - Example data population works correctly
  - Mode switching functions properly
  - Preview accuracy matches actual forms

- [ ] **Validation Feedback Tests**
  - Error messages display correctly
  - Validation status indicators work
  - Field-level error highlighting functions
  - Validation summary updates appropriately

### Integration Tests
- [ ] **Real-time Validation Workflow**
  - Complete schema editing with validation feedback
  - Validation error resolution workflow
  - Preview accuracy validation

- [ ] **Performance Tests**
  - Validation performance with complex schemas
  - Debounce timing optimization
  - Cache effectiveness measurement

### Test Files to Create
- `src/hooks/schema/useSchemaValidation.test.ts`
- `src/components/schema-management/SchemaPreview.test.tsx`
- `src/services/validationService.test.ts`

## Definition of Done

- [ ] Real-time validation provides immediate, accurate feedback
- [ ] Preview accurately represents final schema form appearance
- [ ] Validation performance is acceptable for complex schemas (response < 1s)
- [ ] Validation errors guide users to correct issues effectively
- [ ] Preview mode enhances schema creation experience significantly
- [ ] API integration handles failures gracefully with fallbacks
- [ ] Debouncing prevents excessive API calls during editing
- [ ] Cache system improves performance for repeated validations
- [ ] Mock validation enables development and testing
- [ ] Test coverage meets requirements (>80% for validation logic)

## Risks & Mitigation

**Risk:** Validation API performance affecting user experience
**Mitigation:** Aggressive caching, debouncing, and fallback validation

**Risk:** Preview accuracy not matching actual forms
**Mitigation:** Shared component libraries and comprehensive testing

**Risk:** Complex validation logic affecting maintainability
**Mitigation:** Modular validation service design and clear documentation

## Dependencies

**Requires:**
- Story 3.3: Schema Creation and Basic Editing (basic forms)
- Story 3.4: Dynamic Field Management (field types and configuration)
- Validation API endpoints from backend
- Existing useDebounce hook or equivalent

**Enables:**
- Enhanced user experience for all subsequent schema management features
- Better integration with Story 3.7: State Management Optimization

**API Dependencies:**
- `validateSchemaData(schemaData)` - Comprehensive schema validation
- `validateFieldConfiguration(fieldData)` - Field-specific validation
- Schema preview generation utilities

---

**Created:** 2025-01-26
**Assigned:** Frontend Developer
**Labels:** validation, preview, real-time, user-experience