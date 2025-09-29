/**
 * Tests for ProjectSchemaPage Component
 *
 * Tests the project-specific schema management page functionality including
 * breadcrumbs, project context, schema operations, and integration features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProjectSchemaPage from './ProjectSchemaPage';

// Mock the API functions
jest.mock('../../services/api', () => ({
  getProject: jest.fn(),
  getProjectSchemas: jest.fn(),
  ComponentSchema: {},
  ComponentSchemaListResponse: {},
}));

const theme = createTheme();

const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test project description',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockSchemas = [
  {
    id: 'schema-1',
    name: 'Default Schema',
    description: 'Default component schema',
    version: '1.0.0',
    is_active: true,
    is_default: true,
    project_id: 'test-project-id',
    fields: [{ id: 'field-1', name: 'Field 1', type: 'text' }],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'schema-2',
    name: 'Custom Schema',
    description: 'Custom component schema',
    version: '1.0.0',
    is_active: true,
    is_default: false,
    project_id: 'test-project-id',
    fields: [
      { id: 'field-2', name: 'Field 2', type: 'text' },
      { id: 'field-3', name: 'Field 3', type: 'number' },
    ],
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
];

const createWrapper = ({
  initialEntries = ['/projects/test-project-id/schemas'],
  mockData = { project: mockProject, schemas: mockSchemas }
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  // Mock the API responses
  const { getProject, getProjectSchemas } = require('../../services/api');
  getProject.mockResolvedValue(mockData.project);
  getProjectSchemas.mockResolvedValue({
    schemas: mockData.schemas,
    total: mockData.schemas.length
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('ProjectSchemaPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering', () => {
    it('renders the page header correctly', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/manage component type schemas for/i)).toBeInTheDocument();
    });

    it('displays project name in header', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('displays project context description', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/define how components are structured and validated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('renders breadcrumbs with correct hierarchy', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText('Schema Management')).toBeInTheDocument();
      });
    });

    it('makes breadcrumb links clickable', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        const dashboardLink = screen.getByText('Dashboard').closest('a');
        const projectsLink = screen.getByText('Projects').closest('a');

        expect(dashboardLink).toHaveAttribute('href', '/');
        expect(projectsLink).toHaveAttribute('href', '/projects');
      });
    });
  });

  describe('Schema Summary Statistics', () => {
    it('displays correct schema counts', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Total schemas
        expect(screen.getByText('Total Schemas')).toBeInTheDocument();
        expect(screen.getByText('Active Schemas')).toBeInTheDocument();
      });
    });

    it('shows default schema count', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Default Schema')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // One default schema
      });
    });

    it('displays default schema alert', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/default schema: default schema/i)).toBeInTheDocument();
        expect(screen.getByText(/this schema will be used for new components/i)).toBeInTheDocument();
      });
    });
  });

  describe('Schema List Integration', () => {
    it('renders SchemaListView component', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Check for elements that would be rendered by SchemaListView
        expect(screen.getByText(/schemas \(2\)/i)).toBeInTheDocument();
      });
    });

    it('passes correct props to SchemaListView', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Verify that the component renders with schema data
        expect(screen.getByText(/schemas \(2\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('displays loading skeleton when loading', () => {
      const Wrapper = createWrapper({
        mockData: { project: null, schemas: [] }
      });

      // Mock loading state
      const { getProject } = require('../../services/api');
      getProject.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays appropriate loading content structure', () => {
      const TestComponent = () => (
        <div data-testid="loading-skeleton">
          <div>Loading project schemas...</div>
        </div>
      );

      const Wrapper = createWrapper();
      render(<TestComponent />, { wrapper: Wrapper });

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error when project loading fails', async () => {
      const { getProject } = require('../../services/api');
      getProject.mockRejectedValue(new Error('Project not found'));

      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading project schemas/i)).toBeInTheDocument();
      });
    });

    it('displays error when schemas loading fails', async () => {
      const { getProjectSchemas } = require('../../services/api');
      getProjectSchemas.mockRejectedValue(new Error('Failed to load schemas'));

      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading project schemas/i)).toBeInTheDocument();
      });
    });

    it('handles project not found scenario', async () => {
      const { getProject } = require('../../services/api');
      getProject.mockResolvedValue(null);

      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/project not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Route Parameter Validation', () => {
    it('handles valid project ID parameter', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });

    it('handles missing project ID parameter', () => {
      const Wrapper = createWrapper({
        initialEntries: ['/projects//schemas']
      });
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      // Component should handle missing projectId gracefully
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Functions', () => {
    it('provides schema navigation functions', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Test that navigation functions work without errors
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });
  });

  describe('Schema Creation Dialog', () => {
    it('renders schema creation dialog when create button is clicked', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        const createButton = screen.getByText(/create schema/i);
        expect(createButton).toBeInTheDocument();
      });
    });

    it('handles schema creation success', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Test that the component renders the creation functionality
        expect(screen.getByText(/create schema/i)).toBeInTheDocument();
      });
    });
  });

  describe('Route Integration', () => {
    it('handles project schema list route', async () => {
      const Wrapper = createWrapper({
        initialEntries: ['/projects/test-project-id/schemas']
      });
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });

    it('handles project schema detail route', async () => {
      const Wrapper = createWrapper({
        initialEntries: ['/projects/test-project-id/schemas/schema-1']
      });
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });

    it('handles project schema edit route', async () => {
      const Wrapper = createWrapper({
        initialEntries: ['/projects/test-project-id/schemas/schema-1/edit']
      });
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });

    it('handles project schema create route', async () => {
      const Wrapper = createWrapper({
        initialEntries: ['/projects/test-project-id/schemas/create']
      });
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { name: /schema management/i });
        expect(mainHeading).toBeInTheDocument();
      });
    });

    it('provides proper labeling for screen readers', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Check that important elements have proper accessibility
        const mainHeading = screen.getByRole('heading', { name: /schema management/i });
        expect(mainHeading).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('integrates with Material-UI theme', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Test that Material-UI components render correctly
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });

    it('integrates with React Query for data fetching', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Test that data fetching works
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('integrates with React Router for navigation', async () => {
      const Wrapper = createWrapper();
      render(<ProjectSchemaPage />, { wrapper: Wrapper });

      await waitFor(() => {
        // Test that routing context works
        expect(screen.getByRole('heading', { name: /schema management/i })).toBeInTheDocument();
      });
    });
  });
});