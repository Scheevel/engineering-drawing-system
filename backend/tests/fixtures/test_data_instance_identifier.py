"""
Test data fixtures for instance_identifier integration tests.

Provides standardized test data for comprehensive integration testing
of multiple piece mark instances across all test scenarios.
"""

from uuid import uuid4
from typing import Dict, List, Any


class InstanceIdentifierTestData:
    """Centralized test data management for instance_identifier testing."""
    
    @staticmethod
    def get_test_drawing_data() -> Dict[str, Any]:
        """Standard test drawing data."""
        return {
            "id": uuid4(),
            "file_name": "test_integration_drawing.pdf",
            "title": "Integration Test Drawing",
            "project_id": uuid4(),
            "status": "completed"
        }
    
    @staticmethod
    def get_component_base_data(drawing_id: str) -> Dict[str, Any]:
        """Base component data for testing."""
        return {
            "drawing_id": drawing_id,
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0
        }
    
    @staticmethod
    def get_multiple_instance_scenarios(drawing_id: str) -> List[Dict[str, Any]]:
        """Test scenarios for multiple instances of same piece mark."""
        base_data = InstanceIdentifierTestData.get_component_base_data(drawing_id)
        
        return [
            {
                **base_data,
                "piece_mark": "G1",
                "instance_identifier": "A",
                "location_x": 10.0,
                "location_y": 20.0
            },
            {
                **base_data,
                "piece_mark": "G1",
                "instance_identifier": "B", 
                "location_x": 30.0,
                "location_y": 40.0
            },
            {
                **base_data,
                "piece_mark": "G1",
                "instance_identifier": "C",
                "location_x": 50.0,
                "location_y": 60.0
            }
        ]
    
    @staticmethod
    def get_constraint_violation_scenarios(drawing_id: str) -> List[Dict[str, Any]]:
        """Test scenarios for constraint violations."""
        base_data = InstanceIdentifierTestData.get_component_base_data(drawing_id)
        
        return [
            {
                **base_data,
                "piece_mark": "C1",
                "instance_identifier": "A",
                "description": "Original component"
            },
            {
                **base_data,
                "piece_mark": "C1", 
                "instance_identifier": "A",  # Duplicate
                "location_x": 100.0,
                "description": "Duplicate - should fail"
            }
        ]
    
    @staticmethod
    def get_backward_compatibility_scenarios(drawing_id: str) -> List[Dict[str, Any]]:
        """Test scenarios for backward compatibility (NULL instance_identifier)."""
        base_data = InstanceIdentifierTestData.get_component_base_data(drawing_id)
        
        return [
            {
                **base_data,
                "piece_mark": "L1",
                # No instance_identifier - should default to NULL
                "description": "Legacy component without instance_identifier"
            },
            {
                **base_data,
                "piece_mark": "L2",
                "instance_identifier": None,  # Explicit NULL
                "description": "Explicit NULL instance_identifier"
            }
        ]
    
    @staticmethod
    def get_mixed_scenarios(drawing_id: str) -> List[Dict[str, Any]]:
        """Test scenarios mixing components with and without instance_identifier."""
        base_data = InstanceIdentifierTestData.get_component_base_data(drawing_id)
        
        return [
            {
                **base_data,
                "piece_mark": "M1",
                "instance_identifier": "A",
                "location_x": 10.0
            },
            {
                **base_data,
                "piece_mark": "M1", 
                # No instance_identifier for same piece mark
                "location_x": 20.0
            },
            {
                **base_data,
                "piece_mark": "M2",
                "instance_identifier": "B",
                "location_x": 30.0
            }
        ]
    
    @staticmethod
    def get_update_scenarios() -> List[Dict[str, Any]]:
        """Test scenarios for component updates with instance_identifier."""
        return [
            {
                "instance_identifier": "UPDATED",
                "description": "Update instance_identifier"
            },
            {
                "instance_identifier": None,
                "description": "Set instance_identifier to NULL"
            },
            {
                "piece_mark": "UPDATED",
                "instance_identifier": "NEW",
                "description": "Update both piece_mark and instance_identifier"
            }
        ]
    
    @staticmethod
    def get_validation_error_scenarios() -> List[Dict[str, Any]]:
        """Test scenarios for validation errors."""
        return [
            {
                "instance_identifier": "12345678901",  # Too long (11 chars)
                "expected_error": "String should have at most 10 characters"
            },
            {
                "instance_identifier": "",  # Empty string
                "expected_error": "String should have at least 1 characters"
            }
        ]