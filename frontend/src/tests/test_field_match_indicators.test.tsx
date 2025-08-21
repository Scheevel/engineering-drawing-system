/**
 * Test suite for Story 1.1: Field-Specific Match Indicators
 * Tests the field match indicator functionality in SearchResultRow
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import SearchResultRow from '../components/SearchResultRow';

// Mock component data for testing
const mockComponent = {
  id: '1',
  piece_mark: 'BEAM-W12-101',
  component_type: 'beam',
  description: 'Steel beam structure',
  quantity: 1,
  material_type: 'steel',
  confidence_score: 0.95,
  drawing_file_name: 'drawing1.pdf',
  sheet_number: '1',
  project_name: 'Test Project',
  location_x: 100,
  location_y: 200,
  dimensions: [],
  specifications: []
};

describe('Field Match Indicators', () => {
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays field match indicators for matching fields', () => {
    render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark', 'component_type', 'description']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Should show indicators for all fields that contain "beam"
    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('only shows indicators for fields that actually contain the search term', () => {
    const componentWithPartialMatch = {
      ...mockComponent,
      piece_mark: 'PL-6x12', // No "beam"
      component_type: 'plate', // No "beam"
      description: 'Plate for beam connection' // Contains "beam"
    };

    render(
      <table>
        <tbody>
          <SearchResultRow
            component={componentWithPartialMatch}
            searchTerm="beam"
            searchScope={['piece_mark', 'component_type', 'description']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Should only show indicator for description field
    expect(screen.queryByText('Piece Mark')).not.toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('updates indicators when search term changes', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark', 'component_type', 'description']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Initially shows indicators for "beam"
    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();

    // Change search term to something that only matches piece_mark
    rerender(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="W12"
            searchScope={['piece_mark', 'component_type', 'description']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Should only show indicator for piece_mark now
    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('updates indicators when search scope changes', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark']} // Only piece_mark scope
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Should only show piece_mark indicator (even though other fields contain "beam")
    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();

    // Change scope to include all fields
    rerender(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark', 'component_type', 'description']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Now should show all matching indicators
    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('handles empty search term gracefully', () => {
    render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm=""
            searchScope={['piece_mark', 'component_type', 'description']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Should not show any indicators for empty search term
    expect(screen.queryByText('Piece Mark')).not.toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('handles case-insensitive matching', () => {
    render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="BEAM" // Uppercase
            searchScope={['piece_mark', 'component_type', 'description']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Should match case-insensitively
    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    const indicator = screen.getByLabelText('Field contains search match: Piece Mark');
    expect(indicator).toBeInTheDocument();
  });

  it('follows Material-UI chip styling patterns', () => {
    render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    const indicator = screen.getByText('Piece Mark');
    expect(indicator.closest('.MuiChip-root')).toBeInTheDocument();
    expect(indicator.closest('.MuiChip-sizeSmall')).toBeInTheDocument();
  });

  it('preserves existing search result layout', () => {
    render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark']}
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Verify main content is still present
    expect(screen.getByText(/BEAM/)).toBeInTheDocument(); // Part of highlighted piece mark
    expect(screen.getByText(/W12-101/)).toBeInTheDocument(); // Non-highlighted part
    expect(screen.getByText('1')).toBeInTheDocument(); // quantity
    expect(screen.getByText('drawing1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument(); // confidence score
    
    // Verify the field match indicator is also present
    expect(screen.getByText('Piece Mark')).toBeInTheDocument(); // The new indicator
  });

  it('does not show indicators when not in searched scope', () => {
    // Component has "beam" in description but description is not in search scope
    render(
      <table>
        <tbody>
          <SearchResultRow
            component={mockComponent}
            searchTerm="beam"
            searchScope={['piece_mark']} // Only searching piece_mark
            onViewDetails={mockOnViewDetails}
          />
        </tbody>
      </table>
    );

    // Should show indicator for piece_mark (which contains "BEAM")
    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    
    // Should NOT show indicators for fields not in search scope, even if they contain the term
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });
});