/**
 * Bulk Delete Confirmation Dialog Tests
 *
 * Tests for the BulkDeleteConfirmationDialog component including
 * dialog behavior, impact analysis display, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BulkDeleteConfirmationDialog } from './BulkDeleteConfirmationDialog';
import { ComponentSchemaField } from '../../types/schema';

// Mock data
const mockFields: ComponentSchemaField[] = [
  {
    id: 'field1',
    field_name: 'Component Name',
    field_type: 'text',
    field_config: {},
    help_text: 'Name of the component',
    display_order: 1,
    is_required: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'field2',
    field_name: 'Material',
    field_type: 'select',
    field_config: { options: ['Steel', 'Aluminum'] },
    help_text: 'Material type',
    display_order: 2,
    is_required: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'field3',
    field_name: 'Weight',
    field_type: 'number',
    field_config: { min: 0, unit: 'kg' },
    help_text: 'Weight in kilograms',
    display_order: 3,
    is_required: true,
    is_active: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockImpactAnalysis = {
  totalFields: 3,
  totalComponentsAffected: 5,
  fieldsWithData: 2,
  requiredFields: 2,
  fieldImpacts: [
    {
      fieldId: 'field1',
      fieldName: 'Component Name',
      componentsUsingField: [
        {
          componentId: 'comp1',
          pieceMark: 'C1',
          hasData: true,
          lastModified: '2024-01-01T00:00:00Z',
        },
        {
          componentId: 'comp2',
          pieceMark: 'C2',
          hasData: false,
          lastModified: '2024-01-01T00:00:00Z',
        },
      ],
      isRequired: true,
      dependentFields: [],
    },
    {
      fieldId: 'field2',
      fieldName: 'Material',
      componentsUsingField: [
        {
          componentId: 'comp3',
          pieceMark: 'C3',
          hasData: true,
          lastModified: '2024-01-01T00:00:00Z',
        },
      ],
      isRequired: false,
      dependentFields: ['field3'],
    },
    {
      fieldId: 'field3',
      fieldName: 'Weight',
      componentsUsingField: [],
      isRequired: true,
      dependentFields: [],
    },
  ],
  hasSignificantImpact: true,
  riskLevel: 'medium' as const,
  warnings: [
    '2 required fields will be deleted, potentially breaking form validation',
    '2 fields contain existing data that will be permanently lost',
  ],
};

describe('BulkDeleteConfirmationDialog', () => {
  const defaultProps = {
    open: true,
    selectedFields: mockFields,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render dialog when open', () => {
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Confirm Bulk Field Deletion')).toBeInTheDocument();
      expect(screen.getByText('3 fields')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(<BulkDeleteConfirmationDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Confirm Bulk Field Deletion')).not.toBeInTheDocument();
    });

    it('should display all selected fields', () => {
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Component Name')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
      expect(screen.getByText('Weight')).toBeInTheDocument();
    });

    it('should show required fields with chip', () => {
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      const requiredChips = screen.getAllByText('Required');
      expect(requiredChips).toHaveLength(2); // field1 and field3 are required
    });
  });

  describe('Impact Analysis', () => {
    const propsWithAnalysis = {
      ...defaultProps,
      getImpactAnalysis: jest.fn().mockResolvedValue(mockImpactAnalysis),
    };

    it('should show loading state during analysis', async () => {
      const slowAnalysis = jest.fn(() =>
        new Promise(resolve => setTimeout(() => resolve(mockImpactAnalysis), 100))
      );

      render(
        <BulkDeleteConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={slowAnalysis}
        />
      );

      expect(screen.getByText('Analyzing deletion impact...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Analyzing deletion impact...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should display impact analysis when available', async () => {
      render(<BulkDeleteConfirmationDialog {...propsWithAnalysis} />);

      await waitFor(() => {
        expect(screen.getByText(/Impact Analysis - MEDIUM Risk/)).toBeInTheDocument();
      });

      expect(screen.getByText(/This deletion will affect 5 components/)).toBeInTheDocument();
      expect(screen.getByText(/2 fields contain existing data/)).toBeInTheDocument();
      expect(screen.getByText(/2 required fields will be removed/)).toBeInTheDocument();
    });

    it('should show warnings when present', async () => {
      render(<BulkDeleteConfirmationDialog {...propsWithAnalysis} />);

      await waitFor(() => {
        expect(screen.getByText('Warnings')).toBeInTheDocument();
      });

      expect(screen.getByText(/required fields will be deleted/)).toBeInTheDocument();
      expect(screen.getByText(/contain existing data that will be permanently lost/)).toBeInTheDocument();
    });

    it('should handle analysis errors gracefully', async () => {
      const errorAnalysis = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      render(
        <BulkDeleteConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={errorAnalysis}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Analysis Failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Analysis failed')).toBeInTheDocument();
    });

    it('should allow retry after analysis failure', async () => {
      const retryAnalysis = jest.fn()
        .mockRejectedValueOnce(new Error('Analysis failed'))
        .mockResolvedValueOnce(mockImpactAnalysis);

      render(
        <BulkDeleteConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={retryAnalysis}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry Analysis')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry Analysis');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Impact Analysis - MEDIUM Risk/)).toBeInTheDocument();
      });

      expect(retryAnalysis).toHaveBeenCalledTimes(2);
    });
  });

  describe('Detailed Impact Display', () => {
    const propsWithAnalysis = {
      ...defaultProps,
      getImpactAnalysis: jest.fn().mockResolvedValue(mockImpactAnalysis),
    };

    it('should expand detailed impact analysis', async () => {
      render(<BulkDeleteConfirmationDialog {...propsWithAnalysis} />);

      await waitFor(() => {
        expect(screen.getByText('Detailed Impact Analysis')).toBeInTheDocument();
      });

      const expandButton = screen.getByText('Detailed Impact Analysis');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Components using this field:')).toBeInTheDocument();
      });

      expect(screen.getByText('C1 (contains data)')).toBeInTheDocument();
      expect(screen.getByText('C2')).toBeInTheDocument();
    });

    it('should show dependent fields warning', async () => {
      render(<BulkDeleteConfirmationDialog {...propsWithAnalysis} />);

      const expandButton = await screen.findByText('Detailed Impact Analysis');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Dependent fields: field3')).toBeInTheDocument();
      });
    });
  });

  describe('Risk Level Handling', () => {
    it('should block deletion for high risk', async () => {
      const highRiskAnalysis = {
        ...mockImpactAnalysis,
        riskLevel: 'high' as const,
        hasSignificantImpact: true,
      };

      const propsWithHighRisk = {
        ...defaultProps,
        getImpactAnalysis: jest.fn().mockResolvedValue(highRiskAnalysis),
      };

      render(<BulkDeleteConfirmationDialog {...propsWithHighRisk} />);

      await waitFor(() => {
        expect(screen.getByText(/Deletion Blocked - High Risk/)).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /Delete 3 Fields/ });
      expect(deleteButton).toBeDisabled();
    });

    it('should allow deletion for low/medium risk', async () => {
      const lowRiskAnalysis = {
        ...mockImpactAnalysis,
        riskLevel: 'low' as const,
        hasSignificantImpact: false,
      };

      const propsWithLowRisk = {
        ...defaultProps,
        getImpactAnalysis: jest.fn().mockResolvedValue(lowRiskAnalysis),
      };

      render(<BulkDeleteConfirmationDialog {...propsWithLowRisk} />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /Delete 3 Fields/ });
        expect(deleteButton).not.toBeDisabled();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with field IDs when delete is confirmed', async () => {
      const user = userEvent.setup();
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /Delete 3 Fields/ });
      await user.click(deleteButton);

      expect(defaultProps.onConfirm).toHaveBeenCalledWith(['field1', 'field2', 'field3']);
    });

    it('should show loading state during deletion', () => {
      render(
        <BulkDeleteConfirmationDialog
          {...defaultProps}
          isDeleting={true}
        />
      );

      expect(screen.getByText('Deleting...')).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /Deleting/ });
      expect(deleteButton).toBeDisabled();

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      expect(cancelButton).toBeDisabled();
    });

    it('should disable buttons during analysis', async () => {
      const slowAnalysis = jest.fn(() =>
        new Promise(resolve => setTimeout(() => resolve(mockImpactAnalysis), 100))
      );

      render(
        <BulkDeleteConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={slowAnalysis}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /Delete 3 Fields/ });
      expect(deleteButton).toBeDisabled();

      await waitFor(() => {
        expect(deleteButton).not.toBeDisabled();
      }, { timeout: 200 });
    });
  });

  describe('Empty States', () => {
    it('should handle empty field list', () => {
      render(
        <BulkDeleteConfirmationDialog
          {...defaultProps}
          selectedFields={[]}
        />
      );

      expect(screen.getByText('0 fields')).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /Delete 0 Fields/ });
      expect(deleteButton).toBeDisabled();
    });

    it('should work without impact analysis function', () => {
      render(
        <BulkDeleteConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={undefined}
        />
      );

      expect(screen.getByText('Confirm Bulk Field Deletion')).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /Delete 3 Fields/ });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete 3 Fields/ })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      // Tab should move between buttons
      await user.tab();
      expect(screen.getByRole('button', { name: /Cancel/ })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /Delete 3 Fields/ })).toHaveFocus();
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      render(<BulkDeleteConfirmationDialog {...defaultProps} />);

      await user.keyboard('{Escape}');
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });
});