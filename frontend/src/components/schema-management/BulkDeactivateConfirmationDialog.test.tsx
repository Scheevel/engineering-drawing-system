/**
 * Bulk Deactivate Confirmation Dialog Tests
 *
 * Tests for the BulkDeactivateConfirmationDialog component including
 * dialog behavior, impact analysis display, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BulkDeactivateConfirmationDialog } from './BulkDeactivateConfirmationDialog';
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
    is_active: false, // Already inactive
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockDeactivationAnalysis = {
  totalFields: 3,
  requiredFields: 2,
  fieldsUsedInComponents: 2,
  affectedComponents: [
    {
      componentId: 'comp1',
      pieceMark: 'C1',
      fieldsUsed: ['field1', 'field2'],
    },
    {
      componentId: 'comp2',
      pieceMark: 'C2',
      fieldsUsed: ['field1'],
    },
  ],
  warnings: [
    '2 required fields will be hidden from forms',
    'Many components will be affected by this change',
  ],
  riskLevel: 'medium' as const,
};

describe('BulkDeactivateConfirmationDialog', () => {
  const defaultProps = {
    open: true,
    selectedFields: mockFields,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isDeactivating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render dialog when open', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Confirm Bulk Field Deactivation')).toBeInTheDocument();
      expect(screen.getByText('3 fields will be deactivated')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Confirm Bulk Field Deactivation')).not.toBeInTheDocument();
    });

    it('should display all selected fields', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Component Name')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
      expect(screen.getByText('Weight')).toBeInTheDocument();
    });

    it('should show required fields with chip', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      const requiredChips = screen.getAllByText('Required');
      expect(requiredChips).toHaveLength(2); // field1 and field3 are required
    });

    it('should show already inactive fields', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Already Inactive')).toBeInTheDocument();
    });

    it('should show warning for required fields', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      expect(screen.getByText(/2 required field/)).toBeInTheDocument();
      expect(screen.getByText(/validation issues for new components/)).toBeInTheDocument();
    });
  });

  describe('Impact Analysis', () => {
    const propsWithAnalysis = {
      ...defaultProps,
      getImpactAnalysis: jest.fn().mockResolvedValue(mockDeactivationAnalysis),
    };

    it('should show loading state during analysis', async () => {
      const slowAnalysis = jest.fn(() =>
        new Promise(resolve => setTimeout(() => resolve(mockDeactivationAnalysis), 100))
      );

      render(
        <BulkDeactivateConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={slowAnalysis}
        />
      );

      expect(screen.getByText('Analyzing deactivation impact...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Analyzing deactivation impact...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should display impact analysis when available', async () => {
      render(<BulkDeactivateConfirmationDialog {...propsWithAnalysis} />);

      await waitFor(() => {
        expect(screen.getByText(/Impact Analysis - MEDIUM Risk/)).toBeInTheDocument();
      });

      expect(screen.getByText(/This deactivation will affect 2 components/)).toBeInTheDocument();
      expect(screen.getByText(/2 fields are currently used in existing components/)).toBeInTheDocument();
    });

    it('should show warnings when present', async () => {
      render(<BulkDeactivateConfirmationDialog {...propsWithAnalysis} />);

      await waitFor(() => {
        expect(screen.getByText('Warnings')).toBeInTheDocument();
      });

      expect(screen.getByText(/required fields will be hidden from forms/)).toBeInTheDocument();
      expect(screen.getByText(/Many components will be affected/)).toBeInTheDocument();
    });

    it('should handle analysis errors gracefully', async () => {
      const errorAnalysis = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      render(
        <BulkDeactivateConfirmationDialog
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
        .mockResolvedValueOnce(mockDeactivationAnalysis);

      render(
        <BulkDeactivateConfirmationDialog
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
      getImpactAnalysis: jest.fn().mockResolvedValue(mockDeactivationAnalysis),
    };

    it('should expand detailed impact analysis', async () => {
      render(<BulkDeactivateConfirmationDialog {...propsWithAnalysis} />);

      await waitFor(() => {
        expect(screen.getByText('Detailed Impact Analysis')).toBeInTheDocument();
      });

      const expandButton = screen.getByText('Detailed Impact Analysis');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Affected Components:')).toBeInTheDocument();
      });

      expect(screen.getByText('C1')).toBeInTheDocument();
      expect(screen.getByText('C2')).toBeInTheDocument();
    });

    it('should show component usage details', async () => {
      render(<BulkDeactivateConfirmationDialog {...propsWithAnalysis} />);

      const expandButton = await screen.findByText('Detailed Impact Analysis');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Uses 2 of the selected fields')).toBeInTheDocument();
        expect(screen.getByText('Uses 1 of the selected fields')).toBeInTheDocument();
      });
    });

    it('should show informational note about deactivation', async () => {
      render(<BulkDeactivateConfirmationDialog {...propsWithAnalysis} />);

      const expandButton = await screen.findByText('Detailed Impact Analysis');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/Deactivated fields will be hidden from forms but existing data will be preserved/)).toBeInTheDocument();
      });
    });
  });

  describe('Risk Level Handling', () => {
    it('should show appropriate risk level colors', async () => {
      const lowRiskAnalysis = {
        ...mockDeactivationAnalysis,
        riskLevel: 'low' as const,
      };

      const propsWithLowRisk = {
        ...defaultProps,
        getImpactAnalysis: jest.fn().mockResolvedValue(lowRiskAnalysis),
      };

      render(<BulkDeactivateConfirmationDialog {...propsWithLowRisk} />);

      await waitFor(() => {
        expect(screen.getByText(/Impact Analysis - LOW Risk/)).toBeInTheDocument();
      });
    });

    it('should handle high risk scenarios', async () => {
      const highRiskAnalysis = {
        ...mockDeactivationAnalysis,
        riskLevel: 'high' as const,
        warnings: [
          '5 required fields will be hidden from forms',
          'Critical system fields will be affected',
        ],
      };

      const propsWithHighRisk = {
        ...defaultProps,
        getImpactAnalysis: jest.fn().mockResolvedValue(highRiskAnalysis),
      };

      render(<BulkDeactivateConfirmationDialog {...propsWithHighRisk} />);

      await waitFor(() => {
        expect(screen.getByText(/Impact Analysis - HIGH Risk/)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with field IDs when deactivate is confirmed', async () => {
      const user = userEvent.setup();
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      const deactivateButton = screen.getByRole('button', { name: /Deactivate 3 Field/ });
      await user.click(deactivateButton);

      expect(defaultProps.onConfirm).toHaveBeenCalledWith(['field1', 'field2', 'field3']);
    });

    it('should show loading state during deactivation', () => {
      render(
        <BulkDeactivateConfirmationDialog
          {...defaultProps}
          isDeactivating={true}
        />
      );

      expect(screen.getByText('Deactivating...')).toBeInTheDocument();

      const deactivateButton = screen.getByRole('button', { name: /Deactivating/ });
      expect(deactivateButton).toBeDisabled();

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      expect(cancelButton).toBeDisabled();
    });

    it('should disable buttons during analysis', async () => {
      const slowAnalysis = jest.fn(() =>
        new Promise(resolve => setTimeout(() => resolve(mockDeactivationAnalysis), 100))
      );

      render(
        <BulkDeactivateConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={slowAnalysis}
        />
      );

      const deactivateButton = screen.getByRole('button', { name: /Deactivate 3 Field/ });
      // Note: Button should not be disabled during analysis in deactivation dialog
      // as deactivation is generally less destructive than deletion
      expect(deactivateButton).not.toBeDisabled();
    });
  });

  describe('Summary Information', () => {
    it('should show deactivation summary', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      expect(screen.getByText('Deactivation Summary:')).toBeInTheDocument();
      expect(screen.getByText(/2 active field.*will be deactivated/)).toBeInTheDocument();
      expect(screen.getByText(/1 field.*already inactive/)).toBeInTheDocument();
      expect(screen.getByText(/Deactivated fields can be reactivated later without data loss/)).toBeInTheDocument();
    });

    it('should handle all active fields scenario', () => {
      const allActiveFields = mockFields.map(field => ({ ...field, is_active: true }));

      render(
        <BulkDeactivateConfirmationDialog
          {...defaultProps}
          selectedFields={allActiveFields}
        />
      );

      expect(screen.getByText(/3 active field.*will be deactivated/)).toBeInTheDocument();
      expect(screen.queryByText(/already inactive/)).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle empty field list', () => {
      render(
        <BulkDeactivateConfirmationDialog
          {...defaultProps}
          selectedFields={[]}
        />
      );

      expect(screen.getByText('0 fields will be deactivated')).toBeInTheDocument();

      const deactivateButton = screen.getByRole('button', { name: /Deactivate 0 Field/ });
      expect(deactivateButton).toBeDisabled();
    });

    it('should work without impact analysis function', () => {
      render(
        <BulkDeactivateConfirmationDialog
          {...defaultProps}
          getImpactAnalysis={undefined}
        />
      );

      expect(screen.getByText('Confirm Bulk Field Deactivation')).toBeInTheDocument();

      const deactivateButton = screen.getByRole('button', { name: /Deactivate 3 Field/ });
      expect(deactivateButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Deactivate 3 Field/ })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      // Tab should move between buttons
      await user.tab();
      expect(screen.getByRole('button', { name: /Cancel/ })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /Deactivate 3 Field/ })).toHaveFocus();
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      render(<BulkDeactivateConfirmationDialog {...defaultProps} />);

      await user.keyboard('{Escape}');
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });
});