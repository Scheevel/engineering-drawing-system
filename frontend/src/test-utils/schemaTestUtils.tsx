/**
 * Test utilities for schema editing components and hooks
 */

import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SchemaEditingProvider } from '../contexts/SchemaEditingContext';
import { ComponentSchema, ComponentSchemaField } from '../types/schema';

// Provider wrapper for schema editing tests
interface SchemaTestProviderProps {
  children: ReactNode;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
  maxUndoStackSize?: number;
}

export const SchemaTestProvider: React.FC<SchemaTestProviderProps> = ({
  children,
  autoSaveEnabled = false, // Disable auto-save in tests
  autoSaveInterval = 30000,
  maxUndoStackSize = 50,
}) => (
  <SchemaEditingProvider
    autoSaveEnabled={autoSaveEnabled}
    autoSaveInterval={autoSaveInterval}
    maxUndoStackSize={maxUndoStackSize}
  >
    {children}
  </SchemaEditingProvider>
);

// Custom render function with schema provider
export const renderWithSchemaProvider = (
  ui: React.ReactElement,
  options: Omit<RenderOptions, 'wrapper'> = {}
) => {
  return render(ui, {
    wrapper: SchemaTestProvider,
    ...options,
  });
};

// Mock schema data for tests
export const createMockSchema = (overrides?: Partial<ComponentSchema>): ComponentSchema => ({
  id: 'schema-123',
  project_id: 'project-123',
  name: 'Test Schema',
  description: 'Test schema description',
  version: '1.0',
  fields: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockField = (overrides?: Partial<ComponentSchemaField>): ComponentSchemaField => ({
  id: 'field-123',
  schema_id: 'schema-123',
  field_name: 'test_field',
  field_type: 'text',
  display_order: 1,
  is_required: false,
  help_text: 'Test help text',
  validation_rules: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock dispatch function for testing
export const createMockDispatch = () => {
  const mockDispatch = jest.fn();

  // Add helper to get the last dispatched action
  (mockDispatch as any).getLastAction = () => {
    const calls = mockDispatch.mock.calls;
    return calls.length > 0 ? calls[calls.length - 1][0] : null;
  };

  // Add helper to get all dispatched actions
  (mockDispatch as any).getAllActions = () => {
    return mockDispatch.mock.calls.map(call => call[0]);
  };

  return mockDispatch;
};

export default {
  SchemaTestProvider,
  renderWithSchemaProvider,
  createMockSchema,
  createMockField,
  createMockDispatch,
};