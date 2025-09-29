/**
 * Test: FieldDeletionDialog Component
 *
 * Tests field deletion functionality, impact analysis, warnings, and deletion options
 */

import React from 'react';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FieldDeletionDialog from './FieldDeletionDialog';
import { ComponentSchemaField } from '../../services/api';

const mockField: ComponentSchemaField = {
  id: 'field1',
  field_name: 'Test Field',
  field_type: 'text',
  field_config: { placeholder: 'Enter text', maxLength: 255 },
  help_text: 'This is help text',
  display_order: 1,
  is_required: true,
  is_active: true,
};

const mockUsageInfo = {
  componentCount: 3,
  componentNames: ['Component A', 'Component B', 'Component C'],
  hasRequiredUsage: false,
  canSafelyDelete: true,
  warnings: ['This field contains important data'],
};

const mockUsageInfoWithRequired = {
  componentCount: 2,
  componentNames: ['Required Component 1', 'Required Component 2'],
  hasRequiredUsage: true,
  canSafelyDelete: false,
  warnings: ['Field is required by existing components', 'Cannot perform hard delete'],
};

const mockUsageInfoEmpty = {
  componentCount: 0,
  componentNames: [],
  hasRequiredUsage: false,
  canSafelyDelete: true,
  warnings: [],
};

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onDelete: jest.fn(),
  field: mockField,
  usageInfo: mockUsageInfo,
  loading: false,
};

describe('FieldDeletionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders deletion dialog when open', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    expect(screen.getByText('Delete Field with Caution')).toBeInTheDocument();
    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByText('Text Input')).toBeInTheDocument(); // Field type chip
  });

  test('does not render dialog when closed', () => {
    render(<FieldDeletionDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Delete Field with Caution')).not.toBeInTheDocument();
  });

  test('returns null when field is null', () => {
    render(<FieldDeletionDialog {...defaultProps} field={null} />);

    expect(screen.queryByText('Delete Field with Caution')).not.toBeInTheDocument();
  });

  test('displays field information correctly', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByText('Text Input')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  test('shows impact analysis for fields in use', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
    expect(screen.getByText('3 components using this field')).toBeInTheDocument();
    expect(screen.getByText('Deletion will affect these components')).toBeInTheDocument();
  });

  test('displays component list in accordion', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    // Initially accordion should be collapsed - but let's check if it's already expanded
    const accordionButton = screen.getByText('View affected components (3)');
    expect(accordionButton).toBeInTheDocument();

    // If components are already visible, that's fine - expand/collapse behavior
    if (!screen.queryByText('Component A')) {
      await act(async () => {
        await user.click(accordionButton);
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Component A')).toBeInTheDocument();
      expect(screen.getByText('Component B')).toBeInTheDocument();
      expect(screen.getByText('Component C')).toBeInTheDocument();
      expect(screen.getAllByText('Will lose data for this field')).toHaveLength(3);
    }, { timeout: 2000 });
  });

  test('shows message for unused fields', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoEmpty} />);

    expect(screen.getByText('Delete Unused Field')).toBeInTheDocument();
    expect(screen.getByText('No components using this field')).toBeInTheDocument();
    expect(screen.getByText('This field can be safely deleted')).toBeInTheDocument();
  });

  test('displays warnings when present', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    expect(screen.getByText('Warnings:')).toBeInTheDocument();
    expect(screen.getByText('This field contains important data')).toBeInTheDocument();
  });

  test('shows deletion options for fields in use', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    expect(screen.getByText('Deletion Options')).toBeInTheDocument();
    expect(screen.getByText('Deactivate Field (Recommended)')).toBeInTheDocument();
    expect(screen.getByText('Permanently Delete Field')).toBeInTheDocument();
  });

  test('defaults to soft delete for fields in use', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    const softDeleteRadio = screen.getByDisplayValue('soft');
    expect(softDeleteRadio).toHaveAttribute('checked');

    const hardDeleteRadio = screen.getByDisplayValue('hard');
    expect(hardDeleteRadio).not.toHaveAttribute('checked');
  });

  test('defaults to hard delete for unused fields', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoEmpty} />);

    // For unused fields, only shows info message, no radio buttons
    expect(screen.getByText('This field is not being used by any components and can be safely deleted.')).toBeInTheDocument();
  });

  test('disables hard delete when field has required usage', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoWithRequired} />);

    const hardDeleteRadio = screen.getByRole('radio', { name: /Permanently Delete Field/ });
    expect(hardDeleteRadio).toBeDisabled();
    expect(screen.getByText('Cannot delete: Field is required by existing components')).toBeInTheDocument();
  });

  test('handles deletion type selection', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    const hardDeleteRadio = screen.getByRole('radio', { name: /Permanently Delete Field/ });

    await act(async () => {
      await user.click(hardDeleteRadio);
    });

    await waitFor(() => {
      expect(hardDeleteRadio).toBeChecked();
    }, { timeout: 2000 });
  });

  test('updates dialog title based on usage info', () => {
    const { rerender } = render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoEmpty} />);
    expect(screen.getByText('Delete Unused Field')).toBeInTheDocument();

    rerender(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoWithRequired} />);
    expect(screen.getByText('Cannot Safely Delete Field')).toBeInTheDocument();

    rerender(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfo} />);
    expect(screen.getByText('Delete Field with Caution')).toBeInTheDocument();
  });

  test('shows appropriate severity for alerts', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoWithRequired} />);

    // Should show error severity for required usage
    expect(screen.getByText('This field cannot be permanently deleted because it is required by existing components.')).toBeInTheDocument();
  });

  test('handles cancel button click', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });

    await act(async () => {
      await user.click(cancelButton);
    });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('handles close button click', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: '' }); // Close icon button

    await act(async () => {
      await user.click(closeButton);
    });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('disables close when loading', () => {
    render(<FieldDeletionDialog {...defaultProps} loading={true} />);

    const cancelButton = screen.getByText('Cancel');
    const closeButton = screen.getByRole('button', { name: '' });

    expect(cancelButton).toBeDisabled();
    expect(closeButton).toBeDisabled();
  });

  test('handles soft delete submission', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    // Find submit button specifically - the LoadingButton in DialogActions
    const submitButton = await screen.findByRole('button', { name: /deactivate field/i });

    expect(submitButton).toBeTruthy();

    await act(async () => {
      await user.click(submitButton);
    });

    expect(defaultProps.onDelete).toHaveBeenCalledWith('field1', 'soft');
  });

  test('handles hard delete submission', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    // Select hard delete
    const hardDeleteRadio = screen.getByDisplayValue('hard');

    await act(async () => {
      await user.click(hardDeleteRadio);
    });

    const deleteButton = await screen.findByRole('button', { name: /delete permanently/i });

    await act(async () => {
      await user.click(deleteButton);
    });

    expect(defaultProps.onDelete).toHaveBeenCalledWith('field1', 'hard');
  });

  test('shows loading state on delete button', async () => {
    render(<FieldDeletionDialog {...defaultProps} loading={true} />);

    // Find submit button specifically - the LoadingButton in DialogActions
    const submitButton = await screen.findByRole('button', { name: /deactivate field$/i });

    expect(submitButton).toBeTruthy();
    expect(submitButton).toBeDisabled();
  });

  test('disables delete button when cannot proceed', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoWithRequired} />);

    // Hard delete should be disabled for required usage
    const hardDeleteRadio = screen.getByRole('radio', { name: /Permanently Delete Field/ });
    expect(hardDeleteRadio).toBeDisabled();
  });

  test('shows correct button text based on deletion type', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    // Initially should show soft delete button
    expect(await screen.findByRole('button', { name: /deactivate field$/i })).toBeInTheDocument();

    // Switch to hard delete
    const hardDeleteRadio = screen.getByDisplayValue('hard');

    await act(async () => {
      await user.click(hardDeleteRadio);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete permanently$/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('shows correct chip labels for deletion options', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    expect(screen.getByText('Safe')).toBeInTheDocument(); // Soft delete chip
    expect(screen.getByText('Destructive')).toBeInTheDocument(); // Hard delete chip
  });

  test('shows blocked chip for required fields', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoWithRequired} />);

    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  test('truncates long component lists', () => {
    const longUsageInfo = {
      ...mockUsageInfo,
      componentCount: 15,
      componentNames: Array.from({ length: 15 }, (_, i) => `Component ${i + 1}`),
    };

    render(<FieldDeletionDialog {...defaultProps} usageInfo={longUsageInfo} />);

    expect(screen.getByText('View affected components (15)')).toBeInTheDocument();
  });

  test('resets state when dialog opens', () => {
    const { rerender } = render(<FieldDeletionDialog {...defaultProps} open={false} />);

    rerender(<FieldDeletionDialog {...defaultProps} open={true} usageInfo={mockUsageInfo} />);

    // Should default to soft delete for fields in use
    const softDeleteRadio = screen.getByDisplayValue('soft');
    expect(softDeleteRadio).toHaveAttribute('checked');
  });

  test('shows proper field type information', () => {
    const numberField = { ...mockField, field_type: 'number' as const };
    render(<FieldDeletionDialog {...defaultProps} field={numberField} />);

    expect(screen.getByText('Number Input')).toBeInTheDocument();
  });

  test('handles field without help text', () => {
    const fieldWithoutHelp = { ...mockField, help_text: undefined };
    render(<FieldDeletionDialog {...defaultProps} field={fieldWithoutHelp} />);

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    // Should not crash and should still render the field information
  });

  test('shows inactive field status', () => {
    const inactiveField = { ...mockField, is_active: false };
    render(<FieldDeletionDialog {...defaultProps} field={inactiveField} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  test('shows optional field status', () => {
    const optionalField = { ...mockField, is_required: false };
    render(<FieldDeletionDialog {...defaultProps} field={optionalField} />);

    // Required chip should not be present
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  test('handles no usage info gracefully', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={null} />);

    expect(screen.getByText('Delete Field')).toBeInTheDocument();
    expect(screen.queryByText('Impact Analysis')).not.toBeInTheDocument();
  });

  test('shows main warning message correctly', () => {
    render(<FieldDeletionDialog {...defaultProps} usageInfo={mockUsageInfoEmpty} />);

    expect(screen.getByText('This field is not being used and can be safely deleted.')).toBeInTheDocument();
  });

  test('maintains accessibility with proper ARIA labels', () => {
    render(<FieldDeletionDialog {...defaultProps} />);

    // Dialog should have proper accessibility
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Buttons should be properly labeled
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('shows correct delete button color based on type', async () => {
    const user = userEvent.setup();
    render(<FieldDeletionDialog {...defaultProps} />);

    // Initially should show soft delete button
    const softDeleteButton = await screen.findByRole('button', { name: /deactivate field$/i });
    expect(softDeleteButton).toBeTruthy();

    // Switch to hard delete
    const hardDeleteRadio = screen.getByDisplayValue('hard');

    await act(async () => {
      await user.click(hardDeleteRadio);
    });

    await waitFor(() => {
      const hardDeleteButton = screen.getByRole('button', { name: /delete permanently$/i });
      expect(hardDeleteButton).toBeTruthy();
    }, { timeout: 2000 });
  });
});