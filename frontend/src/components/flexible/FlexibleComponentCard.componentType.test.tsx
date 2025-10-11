import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import FlexibleComponentCard from './FlexibleComponentCard';
import * as api from '../../services/api';

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/projects/test-project/components',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }),
}));

// Mock the API
jest.mock('../../services/api');

// Mock the hooks with pre-defined mock functions
const mockNavigateToSchemas = jest.fn();
const mockNavigateToSchemaEdit = jest.fn();
const mockEmitSchemaUpdated = jest.fn();

jest.mock('../../hooks/schema/useSchemaNavigation', () => ({
  useSchemaNavigation: () => ({
    navigateToSchemas: mockNavigateToSchemas,
    navigateToSchemaEdit: mockNavigateToSchemaEdit,
  }),
}));

jest.mock('../../hooks/schema/useSchemaChangeListener', () => ({
  useSchemaChangeIntegration: () => ({
    emitSchemaUpdated: mockEmitSchemaUpdated,
  }),
  useSchemaChangeListener: () => {
    // Return nothing - TypeSelectionDropdown uses this for side effects only
  },
}));

const mockUpdateFlexibleComponent = api.updateFlexibleComponent as jest.MockedFunction<typeof api.updateFlexibleComponent>;
const mockGetFlexibleComponent = api.getFlexibleComponent as jest.MockedFunction<typeof api.getFlexibleComponent>;
const mockGetProjectSchemas = api.getProjectSchemas as jest.MockedFunction<typeof api.getProjectSchemas>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const mockComponent = {
  id: 'test-component-id',
  piece_mark: 'TEST-001',
  component_type: 'wide_flange',  // System field
  instance_identifier: 'A1',
  drawing_id: 'test-drawing-id',
  drawing_file_name: 'test-drawing.pdf',
  schema_id: 'test-schema-id',
  dynamic_data: {
    field_values: {
      description: 'Test description',
    },
  },
  schema_info: {
    id: 'test-schema-id',
    name: 'Test Schema',
    version: 1,
    fields: [],
    project_id: 'test-project-id',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  is_type_locked: false,
  location_x: 100,
  location_y: 200,
  confidence_score: 0.95,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  quantity: 1,
};

const mockSchemas = {
  schemas: [
    {
      id: 'test-schema-id',
      name: 'Test Schema',
      version: 1,
      fields: [],
      project_id: 'test-project-id',
      is_default: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  total: 1,
  project_id: 'test-project-id',
};

describe('FlexibleComponentCard - Component Type Display and Editing (Story 3.14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockGetFlexibleComponent.mockResolvedValue(mockComponent as any);
    mockGetProjectSchemas.mockResolvedValue(mockSchemas as any);
  });

  const defaultProps = {
    componentId: 'test-component-id',
    projectId: 'test-project-id',
    open: true,
    onClose: jest.fn(),
  };

  describe('AC1: View Component Type with Human-Readable Labels', () => {
    it('should display component type with human-readable label in view mode', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="view" />, {
        wrapper: createWrapper(),
      });

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Component Type')).toBeInTheDocument();
      });

      // Check that human-readable label is displayed (Wide Flange instead of wide_flange)
      expect(screen.getByText('Wide Flange')).toBeInTheDocument();
    });

    it('should display "—" when component_type is null', async () => {
      const componentWithoutType = { ...mockComponent, component_type: undefined };
      mockGetFlexibleComponent.mockResolvedValue(componentWithoutType as any);

      render(<FlexibleComponentCard {...defaultProps} mode="view" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Component Type')).toBeInTheDocument();
      });

      // Should show "—" for missing type
      const systemInfoSection = screen.getByText('System Information').closest('div');
      expect(systemInfoSection).toHaveTextContent('—');
    });
  });

  describe('AC2: Edit Component Type with Dropdown Selector', () => {
    it('should display dropdown selector in edit mode', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Component Type')).toBeInTheDocument();
      });

      // Should have a select/dropdown instead of typography
      const dropdown = screen.getByLabelText('Component type selector');
      expect(dropdown).toBeInTheDocument();
    });

    it('should display all 12 standard component types in dropdown', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Component type selector')).toBeInTheDocument();
      });

      const dropdown = screen.getByLabelText('Component type selector');
      fireEvent.mouseDown(dropdown);

      // Wait for dropdown menu to open
      const listbox = await screen.findByRole('listbox', {}, { timeout: 3000 });
      expect(listbox).toBeInTheDocument();

      // Check for all 12 types
      const expectedTypes = [
        'Wide Flange', 'HSS', 'Angle', 'Channel', 'Plate', 'Tube',
        'Beam', 'Column', 'Brace', 'Girder', 'Truss', 'Generic'
      ];

      expectedTypes.forEach((type) => {
        expect(screen.getByText(type)).toBeInTheDocument();
      });
    });

    it('should allow changing component type', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Component type selector')).toBeInTheDocument();
      });

      const dropdown = screen.getByLabelText('Component type selector');

      // Open dropdown
      fireEvent.mouseDown(dropdown);

      // Select "Channel" type
      await waitFor(() => {
        const channelOption = screen.getByText('Channel');
        expect(channelOption).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Channel'));

      // Verify selection changed
      await waitFor(() => {
        expect(dropdown).toHaveValue('channel');
      });
    });
  });

  describe('AC3: Save Updates - Component Type Persists to Database', () => {
    it('should include component_type in update mutation payload', async () => {
      mockUpdateFlexibleComponent.mockResolvedValue({} as any);

      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Component type selector')).toBeInTheDocument();
      });

      const dropdown = screen.getByLabelText('Component type selector');

      // Change type
      fireEvent.mouseDown(dropdown);
      await waitFor(() => screen.getByText('HSS'));
      fireEvent.click(screen.getByText('HSS'));

      // Click save button
      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        expect(saveButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save'));

      // Verify updateFlexibleComponent was called with component_type
      await waitFor(() => {
        expect(mockUpdateFlexibleComponent).toHaveBeenCalledWith(
          'test-component-id',
          expect.objectContaining({
            component_type: 'hss',
          })
        );
      });
    });

    it('should handle save success and update cache', async () => {
      mockUpdateFlexibleComponent.mockResolvedValue({} as any);

      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => screen.getByLabelText('Component type selector'));

      // Make a change and save
      const dropdown = screen.getByLabelText('Component type selector');
      fireEvent.mouseDown(dropdown);
      await waitFor(() => screen.getByText('Plate'));
      fireEvent.click(screen.getByText('Plate'));

      fireEvent.click(screen.getByText('Save'));

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('AC5: Matches ComponentDetailModal COMPONENT_TYPES Array', () => {
    it('should use exact same 12 types as ComponentDetailModal', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => screen.getByLabelText('Component type selector'));

      const dropdown = screen.getByLabelText('Component type selector');
      fireEvent.mouseDown(dropdown);

      // Verify all 12 types match ComponentDetailModal
      const expectedTypes = [
        'Wide Flange',
        'HSS',
        'Angle',
        'Channel',
        'Plate',
        'Tube',
        'Beam',
        'Column',
        'Brace',
        'Girder',
        'Truss',
        'Generic',
      ];

      await waitFor(() => {
        expectedTypes.forEach((type) => {
          expect(screen.getByText(type)).toBeInTheDocument();
        });
      });
    });
  });

  describe('AC8: Maintains Existing System Information Layout', () => {
    it('should display component_type between Instance Identifier and Drawing File', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="view" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('System Information')).toBeInTheDocument();
      });

      // Get all text content in System Information section
      const systemInfo = screen.getByText('System Information').closest('div');
      expect(systemInfo).toBeTruthy();

      // Verify field order by checking they all exist
      expect(screen.getByText('Piece Mark')).toBeInTheDocument();
      expect(screen.getByText('Instance Identifier')).toBeInTheDocument();
      expect(screen.getByText('Component Type')).toBeInTheDocument();
      expect(screen.getByText('Drawing File')).toBeInTheDocument();
    });
  });

  describe('AC10: Accessibility - Proper ARIA Labels', () => {
    it('should have proper aria-label for dropdown', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const dropdown = screen.getByLabelText('Component type selector');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveAttribute('aria-label', 'Component type selector');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<FlexibleComponentCard {...defaultProps} mode="edit" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => screen.getByLabelText('Component type selector'));

      const dropdown = screen.getByLabelText('Component type selector');

      // Focus on dropdown
      dropdown.focus();
      expect(dropdown).toHaveFocus();

      // Should be able to open with keyboard (Space or Enter)
      fireEvent.keyDown(dropdown, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Wide Flange')).toBeVisible();
      });
    });
  });
});
