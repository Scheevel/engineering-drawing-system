/**
 * Test: FieldGroupSelector Component
 *
 * Tests the field group functionality including group browsing,
 * preview, recommendation system, and field application.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

import { FieldGroupSelector } from './FieldGroupSelector';
import { ComponentSchemaFieldCreate } from '../../types/schema';

const theme = createTheme();

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

const mockExistingFields: ComponentSchemaFieldCreate[] = [
  {
    field_name: 'Component Name',
    field_type: 'text',
    field_config: {},
    help_text: 'Name of the component',
    is_required: true,
    display_order: 1,
  },
  {
    field_name: 'Material Type',
    field_type: 'select',
    field_config: {},
    help_text: 'Type of material',
    is_required: false,
    display_order: 2,
  },
];

const defaultProps = {
  existingFields: mockExistingFields,
  onApplyGroup: jest.fn(),
  disabled: false,
  maxFields: undefined,
  currentFieldCount: 2,
  compact: false,
};

describe('FieldGroupSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders field groups interface', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Field Groups')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search field groups...')).toBeInTheDocument();
  });

  it('displays all field groups', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getAllByText('Structural Properties').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Project Information').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dimensional Properties').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Material Specifications').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inspection & Quality').length).toBeGreaterThan(0);
  });

  it('shows recommended groups when they exist', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    // Should show recommended section
    expect(screen.getByText('Recommended for this schema')).toBeInTheDocument();
  });

  it('filters groups by category', async () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    // Click on structural category tab
    const structuralTab = screen.getByText('Structural');
    fireEvent.click(structuralTab);

    await waitFor(() => {
      expect(screen.getByText('Structural Properties')).toBeInTheDocument();
      expect(screen.getByText('Dimensional Properties')).toBeInTheDocument();
    });
  });

  it('searches field groups by name', async () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText('Search field groups...');
    fireEvent.change(searchInput, { target: { value: 'structural' } });

    await waitFor(() => {
      expect(screen.getByText('Structural Properties')).toBeInTheDocument();
      // Other non-matching groups should not appear or be filtered
    });
  });

  it('opens preview dialog when preview button clicked', async () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    // Find the first Preview button that's actually a button
    const previewButtons = screen.getAllByText('Preview');
    const previewButton = previewButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    expect(previewButton).toBeTruthy();

    fireEvent.click(previewButton!);

    await waitFor(() => {
      expect(screen.getByText(/Preview$/)).toBeInTheDocument(); // Dialog title ends with "Preview"
    });
  });

  it('calls onApplyGroup when group is applied directly', async () => {
    const mockOnApplyGroup = jest.fn();
    const Wrapper = createWrapper();

    render(
      <FieldGroupSelector {...defaultProps} onApplyGroup={mockOnApplyGroup} />,
      { wrapper: Wrapper }
    );

    // Find the first "Add Group" button
    const addGroupButtons = screen.getAllByText('Add Group');
    expect(addGroupButtons.length).toBeGreaterThan(0);

    fireEvent.click(addGroupButtons[0]);

    await waitFor(() => {
      expect(mockOnApplyGroup).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            field_name: expect.any(String),
            field_type: expect.any(String),
            display_order: expect.any(Number),
          })
        ])
      );
    });
  });

  it('applies group from preview dialog', async () => {
    const mockOnApplyGroup = jest.fn();
    const Wrapper = createWrapper();

    render(
      <FieldGroupSelector {...defaultProps} onApplyGroup={mockOnApplyGroup} />,
      { wrapper: Wrapper }
    );

    // Open preview - find first working button
    const previewButtons = screen.getAllByText('Preview');
    const previewButton = previewButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    fireEvent.click(previewButton!);

    await waitFor(() => {
      expect(screen.getByText(/Preview$/)).toBeInTheDocument();
    });

    // Apply from dialog
    const addButtons = screen.getAllByText(/Add Group \(/);
    const addButton = addButtons.find(element => element.closest('button'));
    fireEvent.click(addButton!);

    await waitFor(() => {
      expect(mockOnApplyGroup).toHaveBeenCalled();
    });
  });

  it('respects field limits', () => {
    const Wrapper = createWrapper();
    render(
      <FieldGroupSelector {...defaultProps} maxFields={3} currentFieldCount={2} />,
      { wrapper: Wrapper }
    );

    // Groups with many fields should show warning (at least one)
    expect(screen.getAllByText(/Would exceed field limit/).length).toBeGreaterThan(0);
  });

  it('disables apply when disabled prop is true', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} disabled={true} />, { wrapper: Wrapper });

    // All "Add Group" buttons should be disabled
    const addGroupButtons = screen.getAllByText('Add Group');
    addGroupButtons.forEach(button => {
      expect(button.closest('button')).toBeDisabled();
    });
  });

  it('renders in compact mode correctly', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} compact={true} />, { wrapper: Wrapper });

    // In compact mode, should show minimal interface
    expect(screen.getByText('Field Groups')).toBeInTheDocument();

    // Should have expand button
    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    expect(expandButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton!);

    // Should now show full interface
    expect(screen.getByText('All Field Groups')).toBeInTheDocument();
  });

  it('shows group details in preview', async () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    // Open preview for first group - find working button
    const previewButtons = screen.getAllByText('Preview');
    const previewButton = previewButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    fireEvent.click(previewButton!);

    await waitFor(() => {
      // Should show field count
      expect(screen.getByText(/\d+ fields/)).toBeInTheDocument();
      // Should show required count
      expect(screen.getByText(/\d+ required/)).toBeInTheDocument();
      // Should show list of fields
      expect(screen.getByText('Fields in this group:')).toBeInTheDocument();
    });
  });

  it('handles empty existing fields correctly', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} existingFields={[]} />, { wrapper: Wrapper });

    expect(screen.getByText('Field Groups')).toBeInTheDocument();
    expect(screen.getByText('All Field Groups')).toBeInTheDocument();

    // Should still show field groups
    expect(screen.getByText('Structural Properties')).toBeInTheDocument();
    expect(screen.getByText('Project Information')).toBeInTheDocument();
  });

  it('shows category tabs', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Structural')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Inspection')).toBeInTheDocument();
  });

  it('displays group tags and descriptions', () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    // Should show descriptions
    expect(screen.getByText(/Essential structural engineering fields/)).toBeInTheDocument();
    expect(screen.getByText(/Standard project tracking/)).toBeInTheDocument();

    // Should show some tags (they appear as chips)
    expect(screen.getByText('structural')).toBeInTheDocument();
    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('closes preview dialog when cancel clicked', async () => {
    const Wrapper = createWrapper();
    render(<FieldGroupSelector {...defaultProps} />, { wrapper: Wrapper });

    // Open preview - find working button
    const previewButtons = screen.getAllByText('Preview');
    const previewButton = previewButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    fireEvent.click(previewButton!);

    await waitFor(() => {
      expect(screen.getByText(/Preview$/)).toBeInTheDocument();
    });

    // Close dialog
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/Preview$/)).not.toBeInTheDocument();
    });
  });
});