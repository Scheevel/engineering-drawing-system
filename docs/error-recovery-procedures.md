# Error Recovery Procedures for Schema Management Components

**Author**: Claude (AI-generated documentation, Epic 3 deliverable)
**Created**: September 2025

## Overview

This document outlines error recovery procedures for schema management components, providing developers with standardized approaches to handle common error scenarios and implement graceful degradation.

## Error Recovery Implementation Guide

### 1. Using the useSchemaErrorHandling Hook

The `useSchemaErrorHandling` hook provides a centralized way to handle errors in schema management components:

```typescript
import { useSchemaErrorHandling } from '../hooks/schema/useSchemaErrorHandling';

function SchemaEditor() {
  const {
    errors,
    handleValidationError,
    handleDragDropError,
    handleNetworkError,
    clearErrors,
    retryError,
    getDragDropFallbacks
  } = useSchemaErrorHandling({
    maxErrors: 3,
    autoDismissMs: 5000,
    enableAutoRetry: true
  });

  // Component implementation
}
```

### 2. Validation Error Recovery

**Scenario**: Field validation fails
**Recovery Procedure**:
1. Display user-friendly error message
2. Highlight affected field
3. Provide clear correction guidance
4. Allow real-time validation as user corrects

```typescript
// Handle validation error
const validateField = (fieldName: string, value: any) => {
  try {
    // Validation logic
    validateFieldValue(value);
  } catch (error) {
    handleValidationError(fieldName, error.message, value);
  }
};

// Recovery implementation
{errors.map(error => (
  error.type === 'VALIDATION_ERROR' && (
    <Alert severity="error" key={error.id}>
      {error.userMessage}
      <Button onClick={() => focusField(error.field)}>
        Fix Field
      </Button>
    </Alert>
  )
))}
```

### 3. Drag-and-Drop Error Recovery

**Scenario**: Drag-and-drop operation fails
**Recovery Procedure**:
1. Detect drag-and-drop failure
2. Show error message
3. Automatically enable manual reordering fallback
4. Provide arrow buttons for reordering

```typescript
const handleFieldReorder = (fromIndex: number, toIndex: number) => {
  try {
    // Attempt drag-and-drop reordering
    reorderFields(fromIndex, toIndex);
  } catch (error) {
    // Graceful degradation
    handleDragDropError('reorder', error, () => {
      enableManualReordering();
    });
  }
};

// Fallback implementation
const fallbacks = getDragDropFallbacks(handleFieldReorder);

// Render fallback controls
{dragDropFailed && (
  <div className="manual-reorder-controls">
    <IconButton onClick={() => fallbacks.moveUp(index)}>
      <ArrowUpward />
    </IconButton>
    <IconButton onClick={() => fallbacks.moveDown(index, maxIndex)}>
      <ArrowDownward />
    </IconButton>
  </div>
)}
```

### 4. Network Error Recovery

**Scenario**: API call fails due to network issues
**Recovery Procedure**:
1. Detect network failure
2. Show connection error message
3. Implement automatic retry with backoff
4. Preserve user data during recovery

```typescript
const saveSchema = async (schemaData: Schema) => {
  try {
    await api.saveSchema(schemaData);
  } catch (error) {
    if (isNetworkError(error)) {
      handleNetworkError('saveSchema', error, async () => {
        // Retry logic
        await api.saveSchema(schemaData);
      });
    }
  }
};

// Show retry option to user
{errors.filter(e => e.type === 'NETWORK_ERROR').map(error => (
  <Alert
    severity="warning"
    key={error.id}
    action={
      <Button onClick={() => retryError(error)}>
        Retry
      </Button>
    }
  >
    {error.userMessage}
  </Alert>
))}
```

### 5. Schema Save Error Recovery

**Scenario**: Schema save operation fails
**Recovery Procedure**:
1. Preserve user changes locally
2. Display save failure message
3. Offer retry options
4. Provide alternative save methods

```typescript
const handleSaveError = (error: Error) => {
  // Preserve data locally
  localStorage.setItem('unsavedSchema', JSON.stringify(schemaData));

  handleSchemaSaveError(error, async () => {
    // Retry save operation
    await saveSchemaWithRetry(schemaData);
  });
};

// Recovery UI
{errors.some(e => e.type === 'SCHEMA_SAVE_ERROR') && (
  <Card className="save-error-recovery">
    <CardContent>
      <Typography color="error">
        Failed to save schema. Your changes are preserved locally.
      </Typography>
      <Button onClick={handleRetryAll}>Retry Save</Button>
      <Button onClick={handleExportLocal}>Export Locally</Button>
    </CardContent>
  </Card>
)}
```

## Error Recovery Patterns

### 1. Progressive Enhancement Pattern

Start with full functionality and gracefully degrade:

```typescript
// Primary functionality
const enableAdvancedFeatures = () => {
  if (supportsDragDrop && hasNetworkConnection) {
    return <AdvancedSchemaEditor />;
  }

  // Fallback to basic functionality
  return <BasicSchemaEditor />;
};
```

### 2. Retry with Exponential Backoff

For network operations:

```typescript
const retryWithBackoff = async (operation: () => Promise<any>, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
};
```

### 3. Local Data Preservation

Always preserve user data during errors:

```typescript
const preserveUserData = (data: any) => {
  const key = `unsaved_${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(data));
  return key;
};

const recoverUserData = (key: string) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};
```

## Component Integration Guidelines

### Error Display Component

Create a standardized error display component:

```typescript
interface ErrorDisplayProps {
  errors: SchemaError[];
  onDismiss: (errorId: string) => void;
  onRetry: (error: SchemaError) => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors, onDismiss, onRetry }) => {
  return (
    <Box className="error-display">
      {errors.map(error => (
        <Alert
          key={error.id}
          severity={getSeverityLevel(error.severity)}
          onClose={() => onDismiss(error.id!)}
          action={
            error.recoverable && (
              <Button onClick={() => onRetry(error)}>
                {error.retryAction ? 'Retry' : 'Fix'}
              </Button>
            )
          }
        >
          {error.userMessage}
        </Alert>
      ))}
    </Box>
  );
};
```

### Error Boundary Implementation

Wrap schema components with error boundaries:

```typescript
class SchemaErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('Schema component error:', error, errorInfo);

    // Report to error tracking service
    reportError(error, { context: 'schema-management', ...errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          Something went wrong with the schema editor.
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

## Testing Error Recovery

### Unit Tests for Error Scenarios

```typescript
describe('Error Recovery', () => {
  it('should gracefully handle validation errors', async () => {
    const { result } = renderHook(() => useSchemaErrorHandling());

    act(() => {
      result.current.handleValidationError('name', 'Required field');
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].recoverable).toBe(true);
  });

  it('should enable fallbacks for drag-drop failures', () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useSchemaErrorHandling());

    const fallbacks = result.current.getDragDropFallbacks(onReorder);

    fallbacks.moveUp(2);
    expect(onReorder).toHaveBeenCalledWith(2, 1);
  });
});
```

### Integration Tests for Recovery Workflows

```typescript
describe('Error Recovery Workflows', () => {
  it('should complete full error recovery workflow', async () => {
    // Simulate error condition
    mockApiFailure();

    // Attempt operation
    await triggerSchemaOperation();

    // Verify error handling
    expect(screen.getByText(/connection issue/i)).toBeInTheDocument();

    // Trigger recovery
    fireEvent.click(screen.getByText(/retry/i));

    // Verify recovery
    await waitFor(() => {
      expect(screen.queryByText(/connection issue/i)).not.toBeInTheDocument();
    });
  });
});
```

## Performance Considerations

### Error Handling Performance

1. **Debounce validation errors** to avoid excessive error state updates
2. **Limit error display count** to prevent UI overload
3. **Auto-dismiss minor errors** to maintain clean interface
4. **Use error boundaries** to prevent component crashes

### Memory Management

```typescript
// Clean up error timeouts on unmount
useEffect(() => {
  return () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
  };
}, []);
```

## Accessibility Considerations

### Error Announcements

```typescript
// Announce errors to screen readers
const announceError = (error: SchemaError) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'assertive');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.textContent = error.userMessage;

  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
};
```

### Keyboard Navigation for Recovery

```typescript
// Ensure error actions are keyboard accessible
const ErrorAction = ({ error, onRetry }: { error: SchemaError; onRetry: () => void }) => (
  <Button
    onClick={onRetry}
    onKeyDown={(e) => e.key === 'Enter' && onRetry()}
    aria-label={`Retry ${error.type.toLowerCase().replace('_', ' ')}`}
  >
    Retry
  </Button>
);
```

## Best Practices Summary

1. **Always provide recovery options** for user-facing errors
2. **Preserve user data** during error conditions
3. **Use progressive enhancement** to degrade gracefully
4. **Implement consistent error messaging** across components
5. **Test error scenarios thoroughly** in automated tests
6. **Monitor error patterns** in production for improvement opportunities
7. **Document recovery procedures** for team consistency

## Related Documentation

- [Testing Patterns for Schema Management](./testing-patterns-schema-management.md)
- [Schema Error Handling Utilities](../frontend/src/utils/schemaErrorHandling.ts)
- [Error Handling Hook](../frontend/src/hooks/schema/useSchemaErrorHandling.ts)