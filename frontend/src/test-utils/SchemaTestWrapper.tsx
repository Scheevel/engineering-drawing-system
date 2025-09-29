/**
 * Schema Test Wrapper
 *
 * Comprehensive test wrapper for schema management components
 * Provides all necessary providers and mock data for testing
 */

import React from 'react';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ComponentSchema } from '../types/schema';

// Mock schema editing state (will be replaced when context is implemented)
export interface SchemaEditingState {
  selectedSchema?: ComponentSchema;
  isDirty: boolean;
  isLoading: boolean;
  errors: Record<string, string[]>;
}

export interface SchemaTestWrapperProps {
  children: ReactNode;
  initialSchemas?: ComponentSchema[];
  mockApiResponses?: Record<string, any>;
  routerInitialEntries?: string[];
  contextInitialState?: Partial<SchemaEditingState>;
  useMemoryRouter?: boolean;
  queryClientOptions?: {
    defaultOptions?: {
      queries?: Record<string, any>;
      mutations?: Record<string, any>;
    };
  };
  themeOptions?: Record<string, any>;
}

/**
 * Mock Schema Editing Provider
 * Temporary provider until SchemaEditingContext is implemented
 */
const MockSchemaEditingProvider: React.FC<{
  children: ReactNode;
  initialState?: Partial<SchemaEditingState>;
}> = ({ children, initialState = {} }) => {
  const mockState: SchemaEditingState = {
    selectedSchema: undefined,
    isDirty: false,
    isLoading: false,
    errors: {},
    ...initialState,
  };

  // Mock context value - will be replaced with actual context implementation
  return <>{children}</>;
};

export const SchemaTestWrapper: React.FC<SchemaTestWrapperProps> = ({
  children,
  initialSchemas = [],
  mockApiResponses = {},
  routerInitialEntries = ['/'],
  contextInitialState = {},
  useMemoryRouter = true,
  queryClientOptions = {},
  themeOptions = {},
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
        ...queryClientOptions.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...queryClientOptions.defaultOptions?.mutations,
      },
    },
    ...queryClientOptions,
  });

  const theme = createTheme({
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
    ...themeOptions,
  });

  const RouterComponent = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter
    ? { initialEntries: routerInitialEntries }
    : {};

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterComponent {...routerProps}>
          <MockSchemaEditingProvider initialState={contextInitialState}>
            {children}
          </MockSchemaEditingProvider>
        </RouterComponent>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

/**
 * Minimal test wrapper for unit tests that don't need full providers
 */
export const MinimalTestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

/**
 * Test wrapper specifically for hook testing
 */
export const HookTestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default SchemaTestWrapper;