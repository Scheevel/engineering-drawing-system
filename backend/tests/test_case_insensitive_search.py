"""
Test-Driven Development: Case Insensitive Search Tests

These tests define the expected behavior for case insensitive searching.
Tests should FAIL initially, then we fix the implementation to make them pass.

User Issue: Search should be case insensitive across all scopes
"""
import pytest
import asyncio
import requests


class TestCaseInsensitiveSearch:
    """Test suite for case insensitive search functionality"""
    
    def test_piece_mark_case_insensitive_api(self):
        """
        Test that piece mark searches are case insensitive via API
        
        Expected behavior:
        - Search "a201" should find piece mark "A201"  
        - Search "A201" should find piece mark "a201" (if exists)
        - Case should not matter for piece mark searches
        """
        base_url = "http://localhost:8001/api/v1/search/components"
        
        # Test lowercase search finding uppercase piece mark
        response = requests.get(base_url, params={
            "query": "a201",  # lowercase
            "scope": "piece_mark",
            "limit": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should find A201 even though we searched for a201
        piece_marks = [result["piece_mark"] for result in data["results"]]
        assert any("A201" in pm.upper() for pm in piece_marks), f"Should find A201 with lowercase search 'a201', got: {piece_marks}"
        
        # Test uppercase search
        response = requests.get(base_url, params={
            "query": "A201", 
            "scope": "piece_mark",
            "limit": 10
        })
        
        assert response.status_code == 200
        data2 = response.json()
        
        # Should get same results regardless of case
        assert data["total"] == data2["total"], "Case shouldn't matter for search results count"

    def test_component_type_case_insensitive_api(self):
        """
        Test that component type searches are case insensitive
        
        Expected behavior:
        - Search "GENERIC" should find components with type "generic"
        - Search "generic" should find components with type "GENERIC" (if exists)
        - Search "Generic" should work the same
        """
        base_url = "http://localhost:8001/api/v1/search/components"
        
        # Test different case variations
        test_cases = ["generic", "GENERIC", "Generic", "GeNeRiC"]
        results = []
        
        for query in test_cases:
            response = requests.get(base_url, params={
                "query": query,
                "scope": "component_type", 
                "limit": 5
            })
            
            assert response.status_code == 200
            data = response.json()
            results.append(data["total"])
        
        # All case variations should return the same number of results
        assert len(set(results)) <= 1, f"Case variations should return same results: {dict(zip(test_cases, results))}"
        assert all(r > 0 for r in results), "All case variations should find results"

    def test_description_case_insensitive_api(self):
        """
        Test that description searches are case insensitive
        
        This will likely fail initially since we don't have much description data,
        but it defines the expected behavior.
        """
        base_url = "http://localhost:8001/api/v1/search/components"
        
        # Test with a common word that might appear in descriptions
        test_word = "beam"  # Common in engineering descriptions
        
        response1 = requests.get(base_url, params={
            "query": "beam",
            "scope": "description",
            "limit": 10
        })
        
        response2 = requests.get(base_url, params={
            "query": "BEAM", 
            "scope": "description",
            "limit": 10
        })
        
        response3 = requests.get(base_url, params={
            "query": "Beam",
            "scope": "description", 
            "limit": 10
        })
        
        # All should return same results (might be 0 if no descriptions contain "beam")
        data1 = response1.json()
        data2 = response2.json() 
        data3 = response3.json()
        
        assert data1["total"] == data2["total"] == data3["total"], \
            f"Case shouldn't matter: beam={data1['total']}, BEAM={data2['total']}, Beam={data3['total']}"

    def test_partial_match_case_insensitive(self):
        """
        Test that partial matches work case insensitively
        
        Expected behavior:
        - Search "a" should find "A201", "A4", etc.
        - Search "A" should find "a201", "a4", etc. (if they exist)
        """
        base_url = "http://localhost:8001/api/v1/search/components"
        
        # Test single letter searches
        response_lower = requests.get(base_url, params={
            "query": "a",
            "scope": "piece_mark",
            "limit": 20
        })
        
        response_upper = requests.get(base_url, params={
            "query": "A", 
            "scope": "piece_mark",
            "limit": 20
        })
        
        data_lower = response_lower.json()
        data_upper = response_upper.json()
        
        # Should find same components regardless of case
        assert data_lower["total"] == data_upper["total"], \
            f"Single letter case insensitive failed: 'a'={data_lower['total']}, 'A'={data_upper['total']}"
        
        # Verify results actually contain the letter (case insensitive)
        for result in data_lower["results"]:
            assert "A" in result["piece_mark"].upper(), \
                f"Result '{result['piece_mark']}' should contain 'A' (case insensitive)"

    def test_special_characters_case_insensitive(self):
        """
        Test case insensitivity with special characters and numbers
        
        Engineering piece marks often have mixed case with numbers/special chars
        """
        base_url = "http://localhost:8001/api/v1/search/components"
        
        # Test mixed alphanumeric searches
        test_queries = [
            ("cg3", "CG3"),  # Common engineering notation
            ("w12", "W12"),  # Wide flange beam notation
            ("l4x4", "L4X4")  # Angle notation
        ]
        
        for lower_query, upper_query in test_queries:
            response_lower = requests.get(base_url, params={
                "query": lower_query,
                "scope": "piece_mark", 
                "limit": 10
            })
            
            response_upper = requests.get(base_url, params={
                "query": upper_query,
                "scope": "piece_mark",
                "limit": 10
            })
            
            if response_lower.status_code == 200 and response_upper.status_code == 200:
                data_lower = response_lower.json()
                data_upper = response_upper.json()
                
                # Should return same results regardless of case
                assert data_lower["total"] == data_upper["total"], \
                    f"Case insensitive failed for '{lower_query}'/'{upper_query}': {data_lower['total']} vs {data_upper['total']}"

    def test_multiple_scope_case_insensitive(self):
        """
        Test that case insensitivity works across multiple scopes
        
        When searching multiple fields, all should be case insensitive
        """
        base_url = "http://localhost:8001/api/v1/search/components"
        
        # Test with multiple scopes
        response = requests.get(base_url, params={
            "query": "a",  # lowercase
            "scope": ["piece_mark", "component_type"],
            "limit": 20
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should find results in both piece marks and component types
        # Results should include both "A..." piece marks and any component types with "a"
        assert "piece_mark" in data["scope"]
        assert "component_type" in data["scope"]
        
        # At minimum should find piece marks with "A"
        assert data["total"] > 0, "Should find results when searching 'a' in multiple scopes"


class TestCaseInsensitiveEdgeCases:
    """Test edge cases for case insensitive searching"""
    
    def test_empty_query_case_insensitive(self):
        """Test that empty/wildcard queries work regardless of case concerns"""
        base_url = "http://localhost:8001/api/v1/search/components"
        
        response = requests.get(base_url, params={
            "query": "*",
            "scope": "piece_mark",
            "limit": 5
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Wildcard should return results
        assert data["total"] > 0, "Wildcard search should return results"

    def test_unicode_case_insensitive(self):
        """
        Test case insensitivity with unicode characters
        
        This might not be immediately relevant but good to test
        """
        # This test can be skipped if not relevant
        pytest.skip("Unicode case testing not immediately needed for engineering drawings")

    def test_boolean_operators_case_insensitive(self):
        """
        Test that boolean operators work with case insensitive terms
        
        Expected: "beam AND steel" should find same results as "BEAM AND STEEL"
        """
        base_url = "http://localhost:8001/api/v1/search/components"
        
        # This test might fail initially if we don't have good description data
        # But it defines expected behavior
        
        queries = [
            "a AND generic",
            "A AND GENERIC", 
            "a and generic",
            "A and Generic"
        ]
        
        results = []
        for query in queries:
            response = requests.get(base_url, params={
                "query": query,
                "scope": ["piece_mark", "component_type"],
                "limit": 10
            })
            
            if response.status_code == 200:
                data = response.json()
                results.append(data["total"])
        
        # All variations should return same results
        if results:  # Only test if we got any responses
            assert len(set(results)) <= 1, f"Boolean operator case insensitivity failed: {dict(zip(queries, results))}"


if __name__ == "__main__":
    print("🧪 Running Case Insensitive Search Tests")
    print("These tests define expected behavior - may FAIL initially!")
    print("=" * 60)
    
    # Run basic tests
    test_class = TestCaseInsensitiveSearch()
    
    try:
        test_class.test_piece_mark_case_insensitive_api()
        print("✅ Piece mark case insensitive: PASS")
    except Exception as e:
        print(f"❌ Piece mark case insensitive: FAIL - {e}")
    
    try:
        test_class.test_component_type_case_insensitive_api()
        print("✅ Component type case insensitive: PASS")
    except Exception as e:
        print(f"❌ Component type case insensitive: FAIL - {e}")
    
    try:
        test_class.test_partial_match_case_insensitive()
        print("✅ Partial match case insensitive: PASS")
    except Exception as e:
        print(f"❌ Partial match case insensitive: FAIL - {e}")
    
    print("\n🎯 Run full test suite with: pytest test_case_insensitive_search.py -v")