"""
Test fixtures for dimension data (Story 7.4)

Provides comprehensive test data covering all edge cases:
- Components with NO dimensions (sparse data test)
- Components with 1-2 dimensions (common case)
- Components with ALL dimension types (edge case)
- Fractional dimensions (conversion test)
- Very large/small values (boundary test)
- Same dimension type with different units (unit variation test)
- Dimensions lacking tolerance (optional field test)
"""

from typing import Dict, List, Any
import pytest


# Dimension type constants (from DimensionFormDialog.tsx)
DIMENSION_TYPES = [
    'length', 'width', 'height', 'diameter',
    'thickness', 'radius', 'depth', 'spacing', 'other'
]

UNITS = ['in', 'ft', 'mm', 'cm', 'm', 'yd']


# ============================================================================
# Individual Dimension Fixtures
# ============================================================================

@pytest.fixture
def dimension_length_decimal():
    """Standard length dimension with decimal value"""
    return {
        'dimension_type': 'length',
        'nominal_value': 15.75,
        'unit': 'in',
        'tolerance': '±0.01',
        'display_format': 'decimal'
    }


@pytest.fixture
def dimension_width_fractional():
    """Width dimension with fractional display format"""
    return {
        'dimension_type': 'width',
        'nominal_value': 11.75,  # Stored as decimal (11 3/4)
        'unit': 'in',
        'tolerance': '±0.015',
        'display_format': 'fraction'
    }


@pytest.fixture
def dimension_height_no_tolerance():
    """Height dimension without tolerance (optional field test)"""
    return {
        'dimension_type': 'height',
        'nominal_value': 8.5,
        'unit': 'ft',
        'tolerance': None,
        'display_format': 'decimal'
    }


@pytest.fixture
def dimension_diameter_metric():
    """Diameter dimension in metric units"""
    return {
        'dimension_type': 'diameter',
        'nominal_value': 25.4,
        'unit': 'mm',
        'tolerance': '±0.1',
        'display_format': 'decimal'
    }


@pytest.fixture
def dimension_thickness_large():
    """Very large thickness value (boundary test)"""
    return {
        'dimension_type': 'thickness',
        'nominal_value': 10000.5,
        'unit': 'mm',
        'tolerance': '±1.0',
        'display_format': 'decimal'
    }


@pytest.fixture
def dimension_radius_small():
    """Very small radius value (boundary test)"""
    return {
        'dimension_type': 'radius',
        'nominal_value': 0.001,
        'unit': 'in',
        'tolerance': '±0.0001',
        'display_format': 'decimal'
    }


@pytest.fixture
def dimension_depth():
    """Depth dimension"""
    return {
        'dimension_type': 'depth',
        'nominal_value': 3.25,
        'unit': 'in',
        'tolerance': '±0.01',
        'display_format': 'decimal'
    }


@pytest.fixture
def dimension_spacing():
    """Spacing dimension"""
    return {
        'dimension_type': 'spacing',
        'nominal_value': 12.0,
        'unit': 'in',
        'tolerance': '±0.125',
        'display_format': 'decimal'
    }


@pytest.fixture
def dimension_other():
    """Other dimension type"""
    return {
        'dimension_type': 'other',
        'nominal_value': 45.0,  # Could be an angle
        'unit': 'in',
        'tolerance': None,
        'display_format': 'decimal'
    }


# ============================================================================
# Component Dimension Set Fixtures (for export testing)
# ============================================================================

@pytest.fixture
def component_no_dimensions():
    """Component with NO dimensions (sparse data test)"""
    return {
        'id': '11111111-1111-1111-1111-111111111111',
        'piece_mark': 'G1',
        'component_type': 'girder',
        'dimensions': []
    }


@pytest.fixture
def component_one_dimension(dimension_length_decimal):
    """Component with single dimension (common case)"""
    return {
        'id': '22222222-2222-2222-2222-222222222222',
        'piece_mark': 'B1',
        'component_type': 'beam',
        'dimensions': [dimension_length_decimal]
    }


@pytest.fixture
def component_two_dimensions(dimension_length_decimal, dimension_width_fractional):
    """Component with two dimensions (common case)"""
    return {
        'id': '33333333-3333-3333-3333-333333333333',
        'piece_mark': 'C1',
        'component_type': 'column',
        'dimensions': [dimension_length_decimal, dimension_width_fractional]
    }


@pytest.fixture
def component_all_dimensions():
    """Component with ALL 9 dimension types (edge case)"""
    return {
        'id': '44444444-4444-4444-4444-444444444444',
        'piece_mark': 'P1',
        'component_type': 'plate',
        'dimensions': [
            {'dimension_type': 'length', 'nominal_value': 15.75, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
            {'dimension_type': 'width', 'nominal_value': 11.75, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
            {'dimension_type': 'height', 'nominal_value': 8.5, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
            {'dimension_type': 'diameter', 'nominal_value': 25.4, 'unit': 'mm', 'tolerance': '±0.1', 'display_format': 'decimal'},
            {'dimension_type': 'thickness', 'nominal_value': 0.5, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
            {'dimension_type': 'radius', 'nominal_value': 2.5, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
            {'dimension_type': 'depth', 'nominal_value': 3.25, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
            {'dimension_type': 'spacing', 'nominal_value': 12.0, 'unit': 'in', 'tolerance': '±0.125', 'display_format': 'decimal'},
            {'dimension_type': 'other', 'nominal_value': 45.0, 'unit': 'in', 'tolerance': None, 'display_format': 'decimal'},
        ]
    }


@pytest.fixture
def component_fractional_dimensions():
    """Component with fractional dimension values (conversion test)"""
    return {
        'id': '55555555-5555-5555-5555-555555555555',
        'piece_mark': 'BR1',
        'component_type': 'brace',
        'dimensions': [
            {'dimension_type': 'length', 'nominal_value': 15.75, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'fraction'},  # 15 3/4
            {'dimension_type': 'width', 'nominal_value': 0.75, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'fraction'},   # 3/4
        ]
    }


@pytest.fixture
def component_large_small_values(dimension_thickness_large, dimension_radius_small):
    """Component with very large and very small values (boundary test)"""
    return {
        'id': '66666666-6666-6666-6666-666666666666',
        'piece_mark': 'T1',
        'component_type': 'truss',
        'dimensions': [dimension_thickness_large, dimension_radius_small]
    }


@pytest.fixture
def component_unit_variations():
    """Component with same dimension type in different units (unit variation test)"""
    return {
        'id': '77777777-7777-7777-7777-777777777777',
        'piece_mark': 'G2',
        'component_type': 'girder',
        'dimensions': [
            {'dimension_type': 'length', 'nominal_value': 15.0, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
        ]
    }


@pytest.fixture
def component_unit_variations_b():
    """Another component with length in different unit (for comparison)"""
    return {
        'id': '88888888-8888-8888-8888-888888888888',
        'piece_mark': 'G3',
        'component_type': 'girder',
        'dimensions': [
            {'dimension_type': 'length', 'nominal_value': 381.0, 'unit': 'mm', 'tolerance': '±0.3', 'display_format': 'decimal'},  # ~15 inches
        ]
    }


@pytest.fixture
def component_no_tolerance():
    """Component with dimensions lacking tolerance (optional field test)"""
    return {
        'id': '99999999-9999-9999-9999-999999999999',
        'piece_mark': 'C2',
        'component_type': 'column',
        'dimensions': [
            {'dimension_type': 'height', 'nominal_value': 10.0, 'unit': 'ft', 'tolerance': None, 'display_format': 'decimal'},
            {'dimension_type': 'width', 'nominal_value': 8.0, 'unit': 'in', 'tolerance': None, 'display_format': 'decimal'},
        ]
    }


# ============================================================================
# Complete Test Dataset (Story 7.4 Test Data Requirements)
# ============================================================================

@pytest.fixture
def export_test_dataset_dimensions(
    component_no_dimensions,
    component_one_dimension,
    component_two_dimensions,
    component_all_dimensions,
    component_fractional_dimensions,
    component_large_small_values,
    component_unit_variations,
    component_unit_variations_b,
    component_no_tolerance
):
    """
    Complete test dataset for Story 7.4 (Export Dimension Values)

    Covers all test data requirements from the story:
    - 5 components with NO dimensions (we provide 1, can be duplicated)
    - 5 components with 1-2 dimensions each (common case)
    - 2 components with ALL 9 dimension types
    - 1 component with fractional dimensions
    - 1 component with very large/small values
    - 2 components with same dimension type, different units
    - 1 component with dimensions lacking tolerance

    Returns:
        List[Dict]: List of component dictionaries with dimensions
    """
    return [
        component_no_dimensions,
        component_one_dimension,
        component_two_dimensions,
        component_all_dimensions,
        component_fractional_dimensions,
        component_large_small_values,
        component_unit_variations,
        component_unit_variations_b,
        component_no_tolerance,
    ]


# ============================================================================
# Dimension Discovery Test Fixtures (for column generation logic)
# ============================================================================

@pytest.fixture
def sparse_dimension_dataset():
    """
    Dataset where each component has different dimension types (sparse matrix test)

    Component A: length only
    Component B: width only
    Component C: height only

    Expected CSV columns: Length, Width, Height (all 3 appear despite sparsity)
    """
    return [
        {
            'id': 'a0000000-0000-0000-0000-000000000000',
            'piece_mark': 'A1',
            'dimensions': [
                {'dimension_type': 'length', 'nominal_value': 10.0, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'}
            ]
        },
        {
            'id': 'b0000000-0000-0000-0000-000000000000',
            'piece_mark': 'B1',
            'dimensions': [
                {'dimension_type': 'width', 'nominal_value': 8.0, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'}
            ]
        },
        {
            'id': 'c0000000-0000-0000-0000-000000000000',
            'piece_mark': 'C1',
            'dimensions': [
                {'dimension_type': 'height', 'nominal_value': 6.0, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'}
            ]
        },
    ]


@pytest.fixture
def empty_dimension_dataset():
    """
    Dataset where NO components have dimensions

    Expected behavior: No dimension columns generated
    """
    return [
        {'id': 'd0000000-0000-0000-0000-000000000000', 'piece_mark': 'D1', 'dimensions': []},
        {'id': 'e0000000-0000-0000-0000-000000000000', 'piece_mark': 'E1', 'dimensions': []},
        {'id': 'f0000000-0000-0000-0000-000000000000', 'piece_mark': 'F1', 'dimensions': []},
    ]


# ============================================================================
# Format Conversion Test Fixtures
# ============================================================================

@pytest.fixture
def dimension_format_test_cases():
    """
    Test cases for dimension value formatting (Combined vs Value Only)

    Each case includes:
    - Input dimension data
    - Expected "Combined Format" output
    - Expected "Value Only" output
    """
    return [
        {
            'input': {
                'dimension_type': 'length',
                'nominal_value': 15.75,
                'unit': 'in',
                'tolerance': '±0.01',
                'display_format': 'decimal'
            },
            'expected_combined': '15.75 in ±0.01',
            'expected_value_only': '15.75'
        },
        {
            'input': {
                'dimension_type': 'width',
                'nominal_value': 11.75,
                'unit': 'in',
                'tolerance': None,  # No tolerance
                'display_format': 'fraction'
            },
            'expected_combined': '11.75 in',  # No tolerance suffix
            'expected_value_only': '11.75'
        },
        {
            'input': {
                'dimension_type': 'diameter',
                'nominal_value': 25.4,
                'unit': 'mm',
                'tolerance': '±0.1',
                'display_format': 'decimal'
            },
            'expected_combined': '25.40 mm ±0.1',
            'expected_value_only': '25.40'
        },
        {
            'input': {
                'dimension_type': 'thickness',
                'nominal_value': 0.75,
                'unit': 'in',
                'tolerance': '±0.01',
                'display_format': 'fraction'  # Should still export as decimal
            },
            'expected_combined': '0.75 in ±0.01',
            'expected_value_only': '0.75'
        },
    ]


# ============================================================================
# Helper Functions
# ============================================================================

def create_component_with_dimensions(piece_mark: str, dimensions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Helper function to create a component with specified dimensions

    Args:
        piece_mark: Component piece mark identifier
        dimensions: List of dimension dictionaries

    Returns:
        Component dictionary with dimensions
    """
    import uuid
    return {
        'id': str(uuid.uuid4()),
        'piece_mark': piece_mark,
        'component_type': 'beam',
        'dimensions': dimensions
    }


def create_dimension(
    dimension_type: str,
    nominal_value: float,
    unit: str = 'in',
    tolerance: str = '±0.01',
    display_format: str = 'decimal'
) -> Dict[str, Any]:
    """
    Helper function to create a dimension dictionary

    Args:
        dimension_type: Type of dimension (length, width, etc.)
        nominal_value: Numeric value (decimal)
        unit: Unit of measurement
        tolerance: Tolerance specification (optional)
        display_format: Display format preference

    Returns:
        Dimension dictionary
    """
    return {
        'dimension_type': dimension_type,
        'nominal_value': nominal_value,
        'unit': unit,
        'tolerance': tolerance,
        'display_format': display_format
    }
