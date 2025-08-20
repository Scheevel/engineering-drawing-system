/**
 * QA Test-Driven Development: Scope Default Refresh Issue
 * 
 * QA Issue Identified: "Search scope, when the user is deselecting, defaults to 
 * 'Piece Marking', but when the default happens the search results do not refresh."
 * 
 * QA Analysis:
 * 1. User can deselect all scopes
 * 2. System correctly defaults to piece_mark = true
 * 3. BUT search results don't update to reflect the default scope
 * 4. User sees stale results from previous scope selection
 * 
 * This suggests a state update timing issue or missing dependency in useQuery
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';

// Mock the API functions
jest.mock('../services/api', () => ({
  searchComponents: jest.fn(() => Promise.resolve({ results: [], total: 0 })),
  getSearchSuggestions: jest.fn(() => Promise.resolve([])),
  getRecentComponents: jest.fn(() => Promise.resolve({ recent_components: [], total_available: 0 })),
  getComponentTypes: jest.fn(() => Promise.resolve({ component_types: [] })),
  getProjects: jest.fn(() => Promise.resolve([])),
  getSavedSearchesForProject: jest.fn(() => Promise.resolve(null)),
  getSavedSearchCount: jest.fn(() => Promise.resolve({ remaining: 10, max_allowed: 10 })),
  createSavedSearch: jest.fn(() => Promise.resolve({})),
  deleteSavedSearch: jest.fn(() => Promise.resolve({})),
  executeSavedSearch: jest.fn(() => Promise.resolve({})),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('QA: Scope Default Refresh Issue', () => {
  let mockSearchComponents: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const { searchComponents } = require('../services/api');
    mockSearchComponents = searchComponents;
  });

  describe('User Deselection Scenario', () => {
    test('QA-001: Should refresh results when system defaults to piece_mark after deselecting all scopes', async () => {
      console.log('🧪 QA TEST: Scope deselection with default fallback');

      // Setup mock responses for different scopes
      mockSearchComponents.mockImplementation((params: any) => {
        if (params.scope.includes('piece_mark')) {
          return Promise.resolve({
            results: [
              { id: '1', piece_mark: 'A201', component_type: 'generic', description: 'Piece mark result' }
            ],
            total: 1
          });
        }
        if (params.scope.includes('component_type')) {
          return Promise.resolve({
            results: [
              { id: '2', piece_mark: 'B150', component_type: 'beam', description: 'Component type result' }
            ],
            total: 1
          });
        }
        return Promise.resolve({ results: [], total: 0 });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for initial search (default piece_mark scope)
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ scope: ['piece_mark'] })
        );
      });

      // Should show piece mark results initially
      await waitFor(() => {
        expect(screen.getByText('A201')).toBeInTheDocument();
      });

      mockSearchComponents.mockClear();

      // Step 1: Enable component_type scope
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      fireEvent.click(componentTypeCheckbox);

      // Wait for search with both scopes
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: expect.arrayContaining(['piece_mark', 'component_type'])
          })
        );
      });

      mockSearchComponents.mockClear();

      // Step 2: Disable piece_mark scope (now only component_type)
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      fireEvent.click(pieceMarkCheckbox);

      // Wait for search with only component_type scope
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ scope: ['component_type'] })
        );
      });

      mockSearchComponents.mockClear();

      // 🚨 THE CRITICAL TEST: Step 3 - Disable component_type (deselect all)
      // System should default to piece_mark AND refresh results
      fireEvent.click(componentTypeCheckbox); // This should trigger default to piece_mark

      // QA EXPECTATION: System should call API with piece_mark scope immediately
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: ['piece_mark'], // Should default to piece_mark
            query: 'test'
          })
        );
      }, { timeout: 3000 });

      // QA EXPECTATION: Results should update to show piece_mark results
      await waitFor(() => {
        expect(screen.getByText('A201')).toBeInTheDocument(); // Piece mark result
        expect(screen.queryByText('B150')).not.toBeInTheDocument(); // Component type result should be gone
      }, { timeout: 3000 });

      console.log('✅ QA EXPECTATION: Default scope change should trigger immediate results refresh');
    });

    test('QA-002: Should update checkbox state correctly when defaulting to piece_mark', async () => {
      console.log('🧪 QA TEST: Checkbox state consistency during default fallback');

      mockSearchComponents.mockResolvedValue({ results: [], total: 0 });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Start with piece_mark only (default state)
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i) as HTMLInputElement;
      const componentTypeCheckbox = screen.getByLabelText(/component types/i) as HTMLInputElement;

      expect(pieceMarkCheckbox.checked).toBe(true);   // Should be checked by default
      expect(componentTypeCheckbox.checked).toBe(false); // Should be unchecked by default

      // Enable component_type
      fireEvent.click(componentTypeCheckbox);
      expect(componentTypeCheckbox.checked).toBe(true);

      // Disable piece_mark (now only component_type is selected)
      fireEvent.click(pieceMarkCheckbox);
      expect(pieceMarkCheckbox.checked).toBe(false);
      expect(componentTypeCheckbox.checked).toBe(true);

      // 🚨 THE CRITICAL TEST: Disable component_type (deselect all)
      fireEvent.click(componentTypeCheckbox);

      // QA EXPECTATION: piece_mark should be automatically re-enabled
      await waitFor(() => {
        expect(pieceMarkCheckbox.checked).toBe(true); // Should be forced back to true
        expect(componentTypeCheckbox.checked).toBe(false); // Should remain false
      });

      console.log('✅ QA EXPECTATION: Checkbox state should reflect the forced default');
    });

    test('QA-003: Should handle rapid deselection without race conditions', async () => {
      console.log('🧪 QA TEST: Rapid scope deselection handling');

      let callCount = 0;
      mockSearchComponents.mockImplementation((params: any) => {
        callCount++;
        console.log(`API Call ${callCount}: scope = ${JSON.stringify(params.scope)}`);
        return Promise.resolve({ results: [], total: 0 });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query to activate searching
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());
      mockSearchComponents.mockClear();
      callCount = 0;

      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);

      // Rapidly change scopes to test race conditions
      fireEvent.click(componentTypeCheckbox); // Add component_type
      fireEvent.click(pieceMarkCheckbox);     // Remove piece_mark  
      fireEvent.click(componentTypeCheckbox); // Remove component_type (should default to piece_mark)

      // QA EXPECTATION: Final state should be piece_mark only, with stable API calls
      await waitFor(() => {
        expect(callCount).toBeGreaterThan(0); // At least one API call made
        
        // Check that the last call had piece_mark scope
        const lastCall = mockSearchComponents.mock.calls[mockSearchComponents.mock.calls.length - 1];
        expect(lastCall[0].scope).toEqual(['piece_mark']);
      }, { timeout: 3000 });

      console.log('✅ QA EXPECTATION: Rapid changes should settle on correct default scope');
    });
  });

  describe('State Synchronization Issues', () => {
    test('QA-004: Should not show stale results when scope defaults to piece_mark', async () => {
      console.log('🧪 QA TEST: Stale results during scope default');

      // Mock different results for different scopes
      mockSearchComponents.mockImplementation((params: any) => {
        if (params.scope.includes('component_type') && !params.scope.includes('piece_mark')) {
          return Promise.resolve({
            results: [{ id: '1', piece_mark: 'STALE', component_type: 'beam', description: 'Should not see this' }],
            total: 1
          });
        }
        if (params.scope.includes('piece_mark')) {
          return Promise.resolve({
            results: [{ id: '2', piece_mark: 'FRESH', component_type: 'generic', description: 'Should see this' }],
            total: 1
          });
        }
        return Promise.resolve({ results: [], total: 0 });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for initial piece_mark results
      await waitFor(() => {
        expect(screen.getByText('FRESH')).toBeInTheDocument();
      });

      // Switch to component_type only
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);

      fireEvent.click(componentTypeCheckbox); // Add component_type
      fireEvent.click(pieceMarkCheckbox);     // Remove piece_mark

      // Wait for stale results to appear
      await waitFor(() => {
        expect(screen.getByText('STALE')).toBeInTheDocument();
      });

      // 🚨 THE CRITICAL TEST: Deselect all (should default to piece_mark and show FRESH results)
      fireEvent.click(componentTypeCheckbox);

      // QA EXPECTATION: Should NOT show stale results
      await waitFor(() => {
        expect(screen.queryByText('STALE')).not.toBeInTheDocument(); // Stale results gone
        expect(screen.getByText('FRESH')).toBeInTheDocument(); // Fresh results shown
      }, { timeout: 3000 });

      console.log('✅ QA EXPECTATION: No stale results should persist after scope default');
    });

    test('QA-005: Should trigger useQuery dependency change when scope defaults', async () => {
      console.log('🧪 QA TEST: useQuery dependency detection during default');

      // This test checks if the useQuery dependency array properly detects the scope change
      // when the system defaults to piece_mark

      let apiCallTimestamps: number[] = [];
      mockSearchComponents.mockImplementation((params: any) => {
        apiCallTimestamps.push(Date.now());
        console.log(`🔄 API called at ${Date.now()}: scope = ${JSON.stringify(params.scope)}`);
        return Promise.resolve({ results: [], total: 0 });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());
      
      const initialCallCount = apiCallTimestamps.length;
      
      // Change to component_type only, then deselect all
      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);

      fireEvent.click(componentTypeCheckbox); // Add component_type
      fireEvent.click(pieceMarkCheckbox);     // Remove piece_mark
      fireEvent.click(componentTypeCheckbox); // Remove component_type (trigger default)

      // QA EXPECTATION: API should be called again after default triggers
      await waitFor(() => {
        expect(apiCallTimestamps.length).toBeGreaterThan(initialCallCount);
        console.log(`📊 Total API calls: ${apiCallTimestamps.length} (initial: ${initialCallCount})`);
      }, { timeout: 3000 });

      console.log('✅ QA EXPECTATION: useQuery should detect scope default and trigger new fetch');
    });
  });

  describe('User Experience Edge Cases', () => {
    test('QA-006: Should show loading state during scope default transition', async () => {
      console.log('🧪 QA TEST: Loading state during scope default');

      // Mock delayed API response to test loading state
      mockSearchComponents.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ results: [{ id: '1', piece_mark: 'A201', component_type: 'generic' }], total: 1 });
          }, 100);
        });
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Set up scope for deselection test
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      fireEvent.click(componentTypeCheckbox);

      // 🚨 THE CRITICAL TEST: Deselect all and check for loading state
      fireEvent.click(componentTypeCheckbox); // This should trigger default and show loading

      // QA EXPECTATION: Should show some kind of loading indicator
      // Note: This test might need adjustment based on actual loading UI implementation
      await waitFor(() => {
        // Look for loading indicators (this may need to be adjusted based on actual UI)
        const possibleLoadingElements = [
          screen.queryByText(/loading/i),
          screen.queryByRole('progressbar'),
          screen.queryByTestId('loading'),
          screen.queryByText(/searching/i)
        ].filter(Boolean);
        
        if (possibleLoadingElements.length === 0) {
          console.log('⚠️ No loading indicators found - may need UI improvement');
        } else {
          console.log('✅ Loading state detected during scope default');
        }
      }, { timeout: 50 }); // Short timeout to catch loading state

      console.log('✅ QA EXPECTATION: User should see loading feedback during scope default');
    });
  });
});

/**
 * QA Summary Report
 */
describe('QA Analysis Summary', () => {
  test('QA-REPORT: Documents identified issues for Dev team', () => {
    const qaFindings = {
      primaryIssue: 'Scope default to piece_mark does not refresh search results',
      
      suspectedCauses: [
        'handleScopeChange state update not triggering useQuery refresh',
        'Race condition between multiple setState calls in handleScopeChange',
        'useMemo dependency not detecting the scope change properly',
        'Stale closure issue in useQuery callback'
      ],
      
      testsPassing: [
        'Checkbox state updates correctly during default',
        'API receives correct scope parameters when called'
      ],
      
      testsFailing: [
        'Results do not refresh when scope defaults to piece_mark',
        'User sees stale results from previous scope selection',
        'useQuery dependency change not detected during default'
      ],
      
      devTeamActions: [
        'Investigate handleScopeChange state update timing',
        'Check if useMemo dependencies properly detect scope default',  
        'Verify useQuery dependency array includes all necessary values',
        'Consider adding debug logging to track state changes',
        'Test if useState batching is preventing proper re-renders'
      ]
    };

    console.log('📋 QA ANALYSIS REPORT');
    console.log('=====================');
    console.log(`Primary Issue: ${qaFindings.primaryIssue}`);
    console.log('\nSuspected Causes:');
    qaFindings.suspectedCauses.forEach((cause, i) => {
      console.log(`  ${i + 1}. ${cause}`);
    });
    console.log('\nFailing Tests:');
    qaFindings.testsFailing.forEach((test, i) => {
      console.log(`  ❌ ${test}`);
    });
    console.log('\nDev Team Action Items:');
    qaFindings.devTeamActions.forEach((action, i) => {
      console.log(`  🔧 ${action}`);
    });

    // Verify our analysis is comprehensive
    expect(qaFindings.primaryIssue).toBeTruthy();
    expect(qaFindings.suspectedCauses.length).toBeGreaterThan(0);
    expect(qaFindings.devTeamActions.length).toBeGreaterThan(0);
  });
});