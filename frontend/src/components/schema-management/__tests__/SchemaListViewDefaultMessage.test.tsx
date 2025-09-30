import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SchemaListView from '../SchemaListView';
import { DEFAULT_SCHEMA } from '../../../services/api';

// Mock the custom hooks
jest.mock('../../../hooks/schema/usePerformanceOptimizations', () => ({
  useSchemaConfig: () => ({
    config: {
      performance: {
        enableVirtualScrolling: false,
        virtualScrollThreshold: 100,
        virtualScrollOverscan: 5
      }
    }
  }),
  usePerformanceMonitor: () => ({ end: jest.fn() }),
  useAriaLive: () => ({ announce: jest.fn() }),
  useKeyboardShortcuts: () => {},
  useVirtualScroll: () => ({ visibleItems: [], scrollElement: null }),
  useExpensiveComputation: (fn: any) => fn()
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SchemaListView Default Schema Messaging', () => {
  // Test ID: 3.12-INT-004 - SchemaListView displays default message
  it('should display default schema information message when default schema is present', () => {
    const schemas = [DEFAULT_SCHEMA];

    renderWithTheme(
      <SchemaListView
        schemas={schemas}
        isLoading={false}
        error={null}
      />
    );

    // Check for the default schema message
    expect(screen.getByText(/Using default schema/i)).toBeInTheDocument();
    expect(screen.getByText(/Create custom schemas for your projects/i)).toBeInTheDocument();
  });

  // Test ID: 3.12-E2E-003 - User sees "Using default schema" message
  it('should not display default schema message when custom schemas are present', () => {
    const customSchema = {
      id: 'custom-1',
      name: 'Custom Schema',
      description: 'User-created schema',
      version: 1,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fields: []
    };

    renderWithTheme(
      <SchemaListView
        schemas={[customSchema]}
        isLoading={false}
        error={null}
      />
    );

    // Should not show the default schema message
    expect(screen.queryByText(/Using default schema/i)).not.toBeInTheDocument();
  });

  it('should display default chip for default schemas in table view', () => {
    const schemas = [DEFAULT_SCHEMA];

    renderWithTheme(
      <SchemaListView
        schemas={schemas}
        isLoading={false}
        error={null}
      />
    );

    // Should show "Default" chip
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('should handle mixed schemas with default and custom', () => {
    const customSchema = {
      id: 'custom-1',
      name: 'Custom Schema',
      description: 'User-created schema',
      version: 1,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fields: []
    };

    const schemas = [DEFAULT_SCHEMA, customSchema];

    renderWithTheme(
      <SchemaListView
        schemas={schemas}
        isLoading={false}
        error={null}
      />
    );

    // Should show the default schema message when default is present
    expect(screen.getByText(/Using default schema/i)).toBeInTheDocument();
    // Should show both schemas
    expect(screen.getByText('Default Schema')).toBeInTheDocument();
    expect(screen.getByText('Custom Schema')).toBeInTheDocument();
  });

  it('should render schemas with notes field structure', () => {
    const schemas = [DEFAULT_SCHEMA];

    renderWithTheme(
      <SchemaListView
        schemas={schemas}
        isLoading={false}
        error={null}
      />
    );

    // Verify default schema is displayed
    expect(screen.getByText('Default Schema')).toBeInTheDocument();
    expect(screen.getByText('Default schema for immediate use when no custom schemas exist')).toBeInTheDocument();
  });
});