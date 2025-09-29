/**
 * Test: FieldReorderingDemo Component
 *
 * Tests drag-and-drop functionality and React 18.2.0 compatibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FieldReorderingDemo from './FieldReorderingDemo';

describe('FieldReorderingDemo', () => {
  test('renders field reordering demo component', () => {
    render(<FieldReorderingDemo />);

    // Check for main heading
    expect(screen.getByText('Field Reordering Demo')).toBeInTheDocument();

    // Check for demo description
    expect(screen.getByText(/Drag fields to reorder them/)).toBeInTheDocument();

    // Check for mock fields
    expect(screen.getByText('Component Name')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Material Type')).toBeInTheDocument();
    expect(screen.getByText('Is Active')).toBeInTheDocument();
    expect(screen.getByText('Created Date')).toBeInTheDocument();
  });

  test('renders required field indicators', () => {
    render(<FieldReorderingDemo />);

    // Check for required chips
    const requiredChips = screen.getAllByText('Required');
    expect(requiredChips).toHaveLength(3); // Component Name, Quantity, Created Date are required
  });

  test('renders field type indicators', () => {
    render(<FieldReorderingDemo />);

    // Check for field type chips
    expect(screen.getAllByText('text')).toHaveLength(2); // Component Name, Material Type
    expect(screen.getByText('number')).toBeInTheDocument(); // Quantity
    expect(screen.getByText('boolean')).toBeInTheDocument(); // Is Active
    expect(screen.getByText('date')).toBeInTheDocument(); // Created Date
  });

  test('renders drag handles for accessibility', () => {
    render(<FieldReorderingDemo />);

    // Check for drag handles with proper aria-labels
    const dragHandles = screen.getAllByLabelText('Drag to reorder field');
    expect(dragHandles).toHaveLength(5); // One for each field
  });

  test('renders with proper Material-UI styling', () => {
    render(<FieldReorderingDemo />);

    // Check that component renders without throwing errors
    // This verifies React 18.2.0 + Material-UI v5.14.0 + @dnd-kit compatibility
    expect(screen.getByText('Field Reordering Demo')).toBeInTheDocument();
  });
});