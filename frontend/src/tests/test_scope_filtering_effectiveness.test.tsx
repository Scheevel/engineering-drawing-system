/**
 * QA Test-Driven Development: Scope Filtering Effectiveness Issue
 * 
 * QA Issue Reported: "When I change scope from 'Piece Marks' to 'Component Types' 
 * nothing changes except for the highlighting on screen. I still see results shown 
 * that don't match that scope of search. Same for 'descriptions'"
 * 
 * QA Analysis:
 * 1. UI correctly updates scope selection and highlighting ✅
 * 2. Search results don't change when scope changes ❌
 * 3. Backend filtering appears broken - results don't match selected scope ❌
 * 4. Users see same results regardless of scope, defeating the purpose of scope filtering
 * 
 * This suggests either:
 * - Frontend not passing correct scope parameters to API
 * - Backend not properly filtering by scope
 * - Search logic ignoring scope parameters
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';

// Mock different results for different scopes to test filtering
const MOCK_PIECE_MARK_RESULTS = [
  { 
    id: '1', 
    piece_mark: 'A201', 
    component_type: 'beam', 
    description: 'Main support beam',
    confidence: 0.95 
  },
  { 
    id: '2', 
    piece_mark: 'B150', 
    component_type: 'column', 
    description: 'Vertical support column',
    confidence: 0.90 
  }
];

const MOCK_COMPONENT_TYPE_RESULTS = [
  { 
    id: '3', 
    piece_mark: 'C300', 
    component_type: 'wide_flange', 
    description: 'Wide flange structural member',
    confidence: 0.88 
  },
  { 
    id: '4', 
    piece_mark: 'D400', 
    component_type: 'angle', 
    description: 'L-shaped angle iron',
    confidence: 0.85 
  }
];

const MOCK_DESCRIPTION_RESULTS = [
  { 
    id: '5', 
    piece_mark: 'E500', 
    component_type: 'plate', 
    description: 'Heavy duty steel plate reinforcement',
    confidence: 0.82 
  },
  { 
    id: '6', 
    piece_mark: 'F600', 
    component_type: 'brace', 
    description: 'Diagonal cross bracing member',
    confidence: 0.80 
  }
];

// Mock API with scope-aware responses
const createScopeAwareMock = () => {
  return jest.fn((params: any) => {
    console.log('🔍 API called with scope:', params.scope, 'query:', params.query);
    
    // Return different results based on scope to test filtering
    if (params.scope.includes('piece_mark') && params.scope.length === 1) {
      console.log('📋 Returning piece_mark specific results');
      return Promise.resolve({
        results: MOCK_PIECE_MARK_RESULTS,
        total: MOCK_PIECE_MARK_RESULTS.length,
        search_time_ms: 25
      });
    }
    
    if (params.scope.includes('component_type') && params.scope.length === 1) {
      console.log('🔧 Returning component_type specific results');
      return Promise.resolve({
        results: MOCK_COMPONENT_TYPE_RESULTS,
        total: MOCK_COMPONENT_TYPE_RESULTS.length,
        search_time_ms: 30
      });
    }
    
    if (params.scope.includes('description') && params.scope.length === 1) {
      console.log('📝 Returning description specific results');
      return Promise.resolve({
        results: MOCK_DESCRIPTION_RESULTS,
        total: MOCK_DESCRIPTION_RESULTS.length,
        search_time_ms: 35
      });
    }
    
    // Mixed scopes - return combined results
    console.log('🔀 Returning mixed scope results');
    return Promise.resolve({
      results: [...MOCK_PIECE_MARK_RESULTS, ...MOCK_COMPONENT_TYPE_RESULTS],
      total: MOCK_PIECE_MARK_RESULTS.length + MOCK_COMPONENT_TYPE_RESULTS.length,
      search_time_ms: 40
    });
  });
};

// Mock the API functions with scope-aware behavior
let mockSearchComponents: jest.Mock;

jest.mock('../services/api', () => ({
  searchComponents: jest.fn(),
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

describe('QA: Scope Filtering Effectiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { searchComponents } = require('../services/api');
    mockSearchComponents = searchComponents;
    mockSearchComponents.mockImplementation(createScopeAwareMock());
  });

  describe('Core Scope Filtering Issues', () => {
    test('QA-SF-001: Should return different results for different scopes', async () => {
      console.log('🧪 QA TEST: Scope filtering effectiveness - different results per scope');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      // Enter search query to activate searching
      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'steel' } });

      // Wait for initial search (default: piece_mark scope)
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ scope: ['piece_mark'] })
        );
      });

      // Should show piece_mark specific results
      await waitFor(() => {
        expect(screen.getByText('A201')).toBeInTheDocument();
        expect(screen.getByText('B150')).toBeInTheDocument();
      });

      console.log('✅ Initial piece_mark results displayed');
      mockSearchComponents.mockClear();

      // Expand scope selector and switch to component_type only
      const scopeButton = screen.getByText(/search scope/i);
      fireEvent.click(scopeButton);

      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);

      // Switch from piece_mark to component_type
      fireEvent.click(pieceMarkCheckbox); // Uncheck piece_mark
      fireEvent.click(componentTypeCheckbox); // Check component_type

      // 🚨 CRITICAL TEST: Should get different results for component_type scope
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ 
            scope: ['component_type'],
            query: 'steel'
          })
        );
      }, { timeout: 3000 });

      // 🚨 THE BUG: Results should change to component_type specific results
      await waitFor(() => {
        // Should no longer see piece_mark results
        expect(screen.queryByText('A201')).not.toBeInTheDocument();
        expect(screen.queryByText('B150')).not.toBeInTheDocument();
        
        // Should see component_type results
        expect(screen.getByText('C300')).toBeInTheDocument();
        expect(screen.getByText('D400')).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log('✅ QA EXPECTATION: Different scope should return different results');
    });

    test('QA-SF-002: Should filter results for description scope', async () => {
      console.log('🧪 QA TEST: Description scope filtering');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'reinforcement' } });

      // Wait for initial search
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalled();
      });

      mockSearchComponents.mockClear();

      // Switch to description scope only
      const scopeButton = screen.getByText(/search scope/i);
      fireEvent.click(scopeButton);

      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const descriptionCheckbox = screen.getByLabelText(/descriptions/i);

      fireEvent.click(pieceMarkCheckbox); // Uncheck piece_mark
      fireEvent.click(descriptionCheckbox); // Check description

      // Should search in description scope
      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({ 
            scope: ['description'],
            query: 'reinforcement'
          })
        );
      });

      // Should show description-specific results
      await waitFor(() => {
        expect(screen.getByText('E500')).toBeInTheDocument();
        expect(screen.getByText('F600')).toBeInTheDocument();
        expect(screen.getByText(/Heavy duty steel plate reinforcement/)).toBeInTheDocument();
      });

      console.log('✅ QA EXPECTATION: Description scope should return description-focused results');
    });

    test('QA-SF-003: Should call API with correct scope parameters when switching', async () => {
      console.log('🧪 QA TEST: API scope parameter verification');

      const apiCallLog: any[] = [];
      mockSearchComponents.mockImplementation((params) => {
        apiCallLog.push({
          scope: [...params.scope], // Copy array to avoid reference issues
          query: params.query,
          timestamp: Date.now()
        });
        return createScopeAwareMock()(params);
      });

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait for initial search
      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Switch scopes multiple times
      const scopeButton = screen.getByText(/search scope/i);
      fireEvent.click(scopeButton);

      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      const descriptionCheckbox = screen.getByLabelText(/descriptions/i);

      // Test sequence: piece_mark → component_type → description → mixed
      fireEvent.click(componentTypeCheckbox); // Add component_type
      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      fireEvent.click(pieceMarkCheckbox); // Remove piece_mark (now only component_type)
      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      fireEvent.click(descriptionCheckbox); // Add description
      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Analyze API call sequence
      console.log('📊 API Call Sequence:');
      apiCallLog.forEach((call, index) => {
        console.log(`  ${index + 1}. Scope: [${call.scope.join(', ')}] Query: "${call.query}"`);
      });

      // Verify scope parameters change correctly
      expect(apiCallLog.length).toBeGreaterThan(1);
      
      // Should have different scope arrays in different calls
      const scopes = apiCallLog.map(call => call.scope.sort().join(','));
      const uniqueScopes = [...new Set(scopes)];
      
      expect(uniqueScopes.length).toBeGreaterThan(1);
      console.log('✅ QA VERIFICATION: Multiple different scope parameters sent to API');
    });

    test('QA-SF-004: Should show visually different results for each scope (UI validation)', async () => {
      console.log('🧪 QA TEST: Visual result differences per scope');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'structural' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Record initial results (piece_mark scope)
      const initialResults = screen.getAllByRole('row').length;
      const initialPieceMarks = screen.queryAllByText(/^[A-Z]\d+$/);

      console.log(`📋 Initial results count: ${initialResults}, piece marks found: ${initialPieceMarks.length}`);

      // Switch to component_type scope
      const scopeButton = screen.getByText(/search scope/i);
      fireEvent.click(scopeButton);

      const pieceMarkCheckbox = screen.getByLabelText(/piece marks/i);
      const componentTypeCheckbox = screen.getByLabelText(/component types/i);

      fireEvent.click(pieceMarkCheckbox);
      fireEvent.click(componentTypeCheckbox);

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Record component_type results
      const componentTypeResults = screen.getAllByRole('row').length;
      const componentTypePieceMarks = screen.queryAllByText(/^[A-Z]\d+$/);

      console.log(`🔧 Component type results count: ${componentTypeResults}, piece marks: ${componentTypePieceMarks.length}`);

      // 🚨 CRITICAL VALIDATION: Results should be visually different
      const resultsChanged = initialResults !== componentTypeResults || 
                            initialPieceMarks.length !== componentTypePieceMarks.length;

      if (!resultsChanged) {
        console.log('❌ BUG DETECTED: Results appear identical across different scopes');
        console.log('❌ This confirms the user\'s report - scope changes but results don\'t');
      }

      expect(resultsChanged).toBe(true);
      console.log('✅ QA EXPECTATION: Visual results should differ between scopes');
    });
  });

  describe('Scope Parameter Integration', () => {
    test('QA-SF-005: Backend integration - scope parameter format validation', async () => {
      console.log('🧪 QA TEST: Backend scope parameter format');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());

      // Get the actual API call parameters
      const lastCall = mockSearchComponents.mock.calls[mockSearchComponents.mock.calls.length - 1][0];
      
      console.log('🔍 Actual API parameters:', lastCall);

      // Validate scope parameter structure
      expect(lastCall).toHaveProperty('scope');
      expect(Array.isArray(lastCall.scope)).toBe(true);
      expect(lastCall.scope.length).toBeGreaterThan(0);
      
      // Validate scope values are correct
      const validScopeValues = ['piece_mark', 'component_type', 'description'];
      lastCall.scope.forEach((scope: string) => {
        expect(validScopeValues).toContain(scope);
      });

      console.log('✅ QA VALIDATION: Scope parameters properly formatted for backend');
    });

    test('QA-SF-006: Should handle multiple scope combinations correctly', async () => {
      console.log('🧪 QA TEST: Multiple scope combinations');

      render(
        <TestWrapper>
          <SearchPage />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/search piece marks, components, or descriptions/i);
      fireEvent.change(searchInput, { target: { value: 'steel' } });

      await waitFor(() => expect(mockSearchComponents).toHaveBeenCalled());
      mockSearchComponents.mockClear();

      // Enable all scopes
      const scopeButton = screen.getByText(/search scope/i);
      fireEvent.click(scopeButton);

      const componentTypeCheckbox = screen.getByLabelText(/component types/i);
      const descriptionCheckbox = screen.getByLabelText(/descriptions/i);

      fireEvent.click(componentTypeCheckbox); // Add component_type
      fireEvent.click(descriptionCheckbox); // Add description

      await waitFor(() => {
        expect(mockSearchComponents).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: expect.arrayContaining(['piece_mark', 'component_type', 'description'])
          })
        );
      });

      // Should show combined results from multiple scopes
      await waitFor(() => {
        const allRows = screen.getAllByRole('row');
        expect(allRows.length).toBeGreaterThan(3); // Header + multiple results
      });

      console.log('✅ QA VALIDATION: Multiple scope combinations work correctly');
    });
  });
});

/**
 * QA Analysis Summary for Scope Filtering Issue
 */
describe('QA Scope Filtering Analysis', () => {
  test('QA-ANALYSIS: Documents scope filtering effectiveness issues', () => {
    const scopeFilteringIssues = {
      primaryIssue: 'Scope selection changes highlighting but not actual search results',
      
      userReportedSymptoms: [
        'Changing from "Piece Marks" to "Component Types" - no result change',
        'Same results shown regardless of scope selection',
        'Only highlighting changes, not result filtering',
        'Description scope also shows same results'
      ],
      
      suspectedCauses: [
        'Frontend not passing correct scope parameters to backend',
        'Backend search ignoring scope parameter', 
        'Search query logic not filtering by scope fields',
        'Scope parameter format incorrect for backend processing',
        'Database query not including scope-based WHERE clauses'
      ],
      
      qaTestingFindings: [
        'API calls should include different scope arrays',
        'Results should be visually different per scope',
        'Backend should filter results based on scope parameter',
        'Scope parameter format should match backend expectations'
      ],
      
      criticalBugImpact: [
        'Users cannot effectively filter search results',
        'Scope selection is essentially non-functional',
        'Search precision is compromised - users see irrelevant results', 
        'Core feature of search scope filtering is broken'
      ]
    };

    console.log('\n📋 QA SCOPE FILTERING ANALYSIS REPORT');
    console.log('=====================================');
    console.log(`🚨 PRIMARY ISSUE: ${scopeFilteringIssues.primaryIssue}`);
    
    console.log('\n👤 USER REPORTED SYMPTOMS:');
    scopeFilteringIssues.userReportedSymptoms.forEach((symptom, i) => {
      console.log(`  ${i + 1}. ${symptom}`);
    });
    
    console.log('\n🔍 SUSPECTED CAUSES:');
    scopeFilteringIssues.suspectedCauses.forEach((cause, i) => {
      console.log(`  ${i + 1}. ${cause}`);
    });
    
    console.log('\n🧪 QA TESTING APPROACH:');
    scopeFilteringIssues.qaTestingFindings.forEach((finding, i) => {
      console.log(`  ${i + 1}. ${finding}`);
    });
    
    console.log('\n💥 CRITICAL IMPACT:');
    scopeFilteringIssues.criticalBugImpact.forEach((impact, i) => {
      console.log(`  ${i + 1}. ${impact}`);
    });

    // Verify our analysis is comprehensive
    expect(scopeFilteringIssues.primaryIssue).toBeTruthy();
    expect(scopeFilteringIssues.userReportedSymptoms.length).toBeGreaterThan(0);
    expect(scopeFilteringIssues.suspectedCauses.length).toBeGreaterThan(0);
    expect(scopeFilteringIssues.criticalBugImpact.length).toBeGreaterThan(0);
  });
});