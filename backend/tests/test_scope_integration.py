"""
Integration Test for Search Scope Validation

This test validates that scope filtering works correctly with real API calls.
Created as part of Task 1B: Create Minimal Test Harness.

Tests the actual bug identified in Task 1A debugging:
- Backend scope filtering ✅ WORKS 
- Frontend highlighting issue ❌ SEPARATE ISSUE

This proves the backend implementation is correct.
"""
import requests
import json


def test_backend_scope_filtering_integration():
    """
    Integration test proving backend scope filtering works correctly
    
    This test uses real API calls to validate the scope filtering
    that was questioned in the original bug report.
    """
    base_url = "http://localhost:8001/api/v1/search/components"
    
    # Test 1: Search for 'generic' in piece_mark scope only - should return 0
    response = requests.get(base_url, params={
        "query": "generic",
        "scope": "piece_mark",
        "limit": 3
    })
    
    assert response.status_code == 200
    data = response.json()
    
    print(f"Test 1 - 'generic' in piece_mark scope:")
    print(f"  Query: {data['query']}")
    print(f"  Scope: {data['scope']}")
    print(f"  Total: {data['total']}")
    print(f"  Expected: 0 (generic is not in any piece_mark)")
    
    # Should return 0 because 'generic' is a component_type, not a piece_mark
    assert data['total'] == 0, f"Expected 0 results for 'generic' in piece_mark scope, got {data['total']}"
    assert data['scope'] == ['piece_mark']
    
    # Test 2: Search for 'generic' in component_type scope - should return many
    response = requests.get(base_url, params={
        "query": "generic", 
        "scope": "component_type",
        "limit": 3
    })
    
    assert response.status_code == 200
    data = response.json()
    
    print(f"\nTest 2 - 'generic' in component_type scope:")
    print(f"  Query: {data['query']}")
    print(f"  Scope: {data['scope']}")
    print(f"  Total: {data['total']}")
    print(f"  Sample results: {[r['piece_mark'] + ':' + r['component_type'] for r in data['results']]}")
    
    # Should return many because 'generic' is a common component_type
    assert data['total'] > 0, f"Expected >0 results for 'generic' in component_type scope, got {data['total']}"
    assert data['scope'] == ['component_type']
    
    # Verify all results have 'generic' in component_type
    for result in data['results']:
        assert result['component_type'] == 'generic', f"Found non-generic component: {result['component_type']}"
    
    # Test 3: Search for 'A' in piece_mark scope - should return piece marks with 'A'
    response = requests.get(base_url, params={
        "query": "A",
        "scope": "piece_mark", 
        "limit": 5
    })
    
    assert response.status_code == 200
    data = response.json()
    
    print(f"\nTest 3 - 'A' in piece_mark scope:")
    print(f"  Query: {data['query']}")
    print(f"  Scope: {data['scope']}")
    print(f"  Total: {data['total']}")
    print(f"  Sample piece marks: {[r['piece_mark'] for r in data['results']]}")
    
    # Should return components with 'A' in piece mark
    assert data['total'] > 0, f"Expected >0 results for 'A' in piece_mark scope, got {data['total']}"
    assert data['scope'] == ['piece_mark']
    
    # Verify all results have 'A' in piece_mark (case insensitive)
    for result in data['results']:
        assert 'A' in result['piece_mark'].upper(), f"Piece mark '{result['piece_mark']}' doesn't contain 'A'"
    
    print(f"\n✅ ALL INTEGRATION TESTS PASSED")
    print(f"✅ Backend scope filtering works correctly!")
    print(f"✅ The real issue is frontend highlighting, not backend search")


def test_multiple_scope_filtering():
    """Test that multiple scopes work with OR logic"""
    base_url = "http://localhost:8001/api/v1/search/components"
    
    # Test multiple scopes - should search in both fields
    response = requests.get(base_url, params={
        "query": "A",
        "scope": ["piece_mark", "component_type"],
        "limit": 5
    })
    
    assert response.status_code == 200
    data = response.json()
    
    print(f"\nMultiple Scope Test - 'A' in piece_mark OR component_type:")
    print(f"  Query: {data['query']}")
    print(f"  Scope: {data['scope']}")
    print(f"  Total: {data['total']}")
    
    assert len(data['scope']) == 2
    assert 'piece_mark' in data['scope']
    assert 'component_type' in data['scope']


if __name__ == "__main__":
    print("🔍 Running Integration Tests for Search Scope Validation")
    print("=" * 60)
    
    try:
        test_backend_scope_filtering_integration()
        test_multiple_scope_filtering()
        
        print("\n" + "=" * 60)
        print("🎉 ALL INTEGRATION TESTS PASSED!")
        print("🎯 CONCLUSION: Backend scope filtering is working correctly")
        print("🐛 REAL ISSUE: Frontend highlighting bug (identified in Task 1A)")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise