"""
Test fixtures for specification data (Story 7.5)

Provides comprehensive test data covering all edge cases:
- Components with NO specifications (sparse data test)
- Components with 1-2 specifications (common case)
- Components with ALL specification types (edge case)
- Long specification values (255 chars - boundary test)
- Special characters in values (commas, quotes - CSV escaping test)
- Components with dimensions AND specifications (integration test)
- Components with specifications but no dimensions
"""

from typing import Dict, List, Any
import pytest


# Specification type constants (from SpecificationFormDialog.tsx)
SPECIFICATION_TYPES = [
    'material', 'finish', 'grade', 'coating',
    'treatment', 'standard', 'other'
]


# ============================================================================
# Individual Specification Fixtures
# ============================================================================

@pytest.fixture
def specification_material():
    """Standard material specification"""
    return {
        'specification_type': 'material',
        'value': 'A36 Steel',
        'description': 'Standard structural steel'
    }


@pytest.fixture
def specification_finish():
    """Finish specification"""
    return {
        'specification_type': 'finish',
        'value': 'Hot-Dip Galvanized',
        'description': 'ASTM A123 galvanizing specification'
    }


@pytest.fixture
def specification_grade():
    """Grade specification"""
    return {
        'specification_type': 'grade',
        'value': 'ASTM A572 Grade 50',
        'description': None
    }


@pytest.fixture
def specification_coating():
    """Coating specification"""
    return {
        'specification_type': 'coating',
        'value': 'Powder Coated Black',
        'description': 'RAL 9005 finish'
    }


@pytest.fixture
def specification_treatment():
    """Treatment specification"""
    return {
        'specification_type': 'treatment',
        'value': 'Heat Treated',
        'description': 'Normalized and tempered'
    }


@pytest.fixture
def specification_standard():
    """Standard specification"""
    return {
        'specification_type': 'standard',
        'value': 'AISC 360-16',
        'description': 'Specification for Structural Steel Buildings'
    }


@pytest.fixture
def specification_other():
    """Other specification type"""
    return {
        'specification_type': 'other',
        'value': 'Custom Fabrication Required',
        'description': None
    }


@pytest.fixture
def specification_long_value():
    """Specification with very long value (255 chars - boundary test)"""
    long_value = 'A' * 250 + 'B' * 5  # Exactly 255 characters
    return {
        'specification_type': 'standard',
        'value': long_value,
        'description': 'Testing maximum length'
    }


@pytest.fixture
def specification_special_characters():
    """Specification with special characters (CSV escaping test)"""
    return {
        'specification_type': 'material',
        'value': 'A36, Grade "A", 36 ksi',  # Commas and quotes
        'description': 'Testing CSV special character handling'
    }


# ============================================================================
# Component Specification Set Fixtures (for export testing)
# ============================================================================

@pytest.fixture
def component_no_specifications():
    """Component with NO specifications (sparse data test)"""
    return {
        'id': 'spec-11111111-1111-1111-1111-111111111111',
        'piece_mark': 'G10',
        'component_type': 'girder',
        'specifications': []
    }


@pytest.fixture
def component_one_specification(specification_material):
    """Component with single specification (common case)"""
    return {
        'id': 'spec-22222222-2222-2222-2222-222222222222',
        'piece_mark': 'B10',
        'component_type': 'beam',
        'specifications': [specification_material]
    }


@pytest.fixture
def component_two_specifications(specification_material, specification_finish):
    """Component with two specifications (common case)"""
    return {
        'id': 'spec-33333333-3333-3333-3333-333333333333',
        'piece_mark': 'C10',
        'component_type': 'column',
        'specifications': [specification_material, specification_finish]
    }


@pytest.fixture
def component_all_specifications():
    """Component with ALL 7 specification types (edge case)"""
    return {
        'id': 'spec-44444444-4444-4444-4444-444444444444',
        'piece_mark': 'P10',
        'component_type': 'plate',
        'specifications': [
            {'specification_type': 'material', 'value': 'A36 Steel', 'description': None},
            {'specification_type': 'finish', 'value': 'Hot-Dip Galvanized', 'description': None},
            {'specification_type': 'grade', 'value': 'ASTM A572 Grade 50', 'description': None},
            {'specification_type': 'coating', 'value': 'Powder Coated Black', 'description': None},
            {'specification_type': 'treatment', 'value': 'Heat Treated', 'description': None},
            {'specification_type': 'standard', 'value': 'AISC 360-16', 'description': None},
            {'specification_type': 'other', 'value': 'Custom Fabrication', 'description': None},
        ]
    }


@pytest.fixture
def component_long_spec_value(specification_long_value):
    """Component with very long specification value (boundary test)"""
    return {
        'id': 'spec-55555555-5555-5555-5555-555555555555',
        'piece_mark': 'BR10',
        'component_type': 'brace',
        'specifications': [specification_long_value]
    }


@pytest.fixture
def component_special_characters(specification_special_characters):
    """Component with special characters in specification values (CSV escaping test)"""
    return {
        'id': 'spec-66666666-6666-6666-6666-666666666666',
        'piece_mark': 'T10',
        'component_type': 'truss',
        'specifications': [specification_special_characters]
    }


# ============================================================================
# Integration Test Fixtures (Dimensions + Specifications)
# ============================================================================

@pytest.fixture
def component_dimensions_and_specifications():
    """Component with both dimensions AND specifications (integration test)"""
    return {
        'id': 'integrated-77777777-7777-7777-7777-777777777777',
        'piece_mark': 'G20',
        'component_type': 'girder',
        'dimensions': [
            {'dimension_type': 'length', 'nominal_value': 20.0, 'unit': 'ft', 'tolerance': '±0.125', 'display_format': 'decimal'},
            {'dimension_type': 'width', 'nominal_value': 12.0, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
            {'dimension_type': 'height', 'nominal_value': 24.0, 'unit': 'in', 'tolerance': '±0.01', 'display_format': 'decimal'},
        ],
        'specifications': [
            {'specification_type': 'material', 'value': 'A572 Grade 50', 'description': None},
            {'specification_type': 'finish', 'value': 'Primed', 'description': None},
        ]
    }


@pytest.fixture
def component_specifications_no_dimensions():
    """Component with specifications but NO dimensions (integration test)"""
    return {
        'id': 'spec-only-88888888-8888-8888-8888-888888888888',
        'piece_mark': 'C20',
        'component_type': 'column',
        'dimensions': [],
        'specifications': [
            {'specification_type': 'material', 'value': 'A36 Steel', 'description': None},
            {'specification_type': 'coating', 'value': 'Fireproofing Required', 'description': None},
        ]
    }


@pytest.fixture
def component_dimensions_no_specifications():
    """Component with dimensions but NO specifications (integration test)"""
    return {
        'id': 'dim-only-99999999-9999-9999-9999-999999999999',
        'piece_mark': 'B20',
        'component_type': 'beam',
        'dimensions': [
            {'dimension_type': 'length', 'nominal_value': 15.5, 'unit': 'ft', 'tolerance': '±0.125', 'display_format': 'decimal'},
        ],
        'specifications': []
    }


# ============================================================================
# Complete Test Dataset (Story 7.5 Test Data Requirements)
# ============================================================================

@pytest.fixture
def export_test_dataset_specifications(
    component_no_specifications,
    component_one_specification,
    component_two_specifications,
    component_all_specifications,
    component_long_spec_value,
    component_special_characters,
    component_dimensions_and_specifications,
    component_specifications_no_dimensions
):
    """
    Complete test dataset for Story 7.5 (Export Specification Values)

    Covers all test data requirements from the story:
    - 5 components with NO specifications (we provide 1, can be duplicated)
    - 5 components with 1-2 specifications each (common case)
    - 2 components with ALL 7 specification types
    - 1 component with long specification values (255 chars)
    - 1 component with special characters in values
    - 2 components with dimensions AND specifications (integration)
    - 1 component with specifications but no dimensions

    Returns:
        List[Dict]: List of component dictionaries with specifications
    """
    return [
        component_no_specifications,
        component_one_specification,
        component_two_specifications,
        component_all_specifications,
        component_long_spec_value,
        component_special_characters,
        component_dimensions_and_specifications,
        component_specifications_no_dimensions,
    ]


# ============================================================================
# Combined Test Dataset (Story 7.4 + 7.5 Integration)
# ============================================================================

@pytest.fixture
def export_test_dataset_complete(
    component_dimensions_and_specifications,
    component_specifications_no_dimensions,
    component_dimensions_no_specifications
):
    """
    Complete test dataset for integrated dimension + specification export testing

    Tests the full export feature with components having:
    - Both dimensions AND specifications
    - Only specifications (no dimensions)
    - Only dimensions (no specifications)
    - Neither (sparse data edge case)

    Returns:
        List[Dict]: List of component dictionaries with both dimensions and specifications
    """
    return [
        component_dimensions_and_specifications,
        component_specifications_no_dimensions,
        component_dimensions_no_specifications,
        {
            'id': 'neither-00000000-0000-0000-0000-000000000000',
            'piece_mark': 'EMPTY',
            'component_type': 'other',
            'dimensions': [],
            'specifications': []
        }
    ]


# ============================================================================
# Specification Discovery Test Fixtures (for column generation logic)
# ============================================================================

@pytest.fixture
def sparse_specification_dataset():
    """
    Dataset where each component has different specification types (sparse matrix test)

    Component A: material only
    Component B: finish only
    Component C: grade only

    Expected CSV columns: Material, Finish, Grade (all 3 appear despite sparsity)
    """
    return [
        {
            'id': 'sparse-a0000000-0000-0000-0000-000000000000',
            'piece_mark': 'A10',
            'specifications': [
                {'specification_type': 'material', 'value': 'A36 Steel', 'description': None}
            ]
        },
        {
            'id': 'sparse-b0000000-0000-0000-0000-000000000000',
            'piece_mark': 'B10',
            'specifications': [
                {'specification_type': 'finish', 'value': 'Galvanized', 'description': None}
            ]
        },
        {
            'id': 'sparse-c0000000-0000-0000-0000-000000000000',
            'piece_mark': 'C10',
            'specifications': [
                {'specification_type': 'grade', 'value': 'Grade 50', 'description': None}
            ]
        },
    ]


@pytest.fixture
def empty_specification_dataset():
    """
    Dataset where NO components have specifications

    Expected behavior: No specification columns generated
    """
    return [
        {'id': 'empty-d0000000-0000-0000-0000-000000000000', 'piece_mark': 'D10', 'specifications': []},
        {'id': 'empty-e0000000-0000-0000-0000-000000000000', 'piece_mark': 'E10', 'specifications': []},
        {'id': 'empty-f0000000-0000-0000-0000-000000000000', 'piece_mark': 'F10', 'specifications': []},
    ]


# ============================================================================
# CSV Escaping Test Fixtures
# ============================================================================

@pytest.fixture
def csv_escaping_test_cases():
    """
    Test cases for CSV special character escaping

    Each case includes:
    - Input specification value (with special characters)
    - Expected CSV output (properly escaped)
    """
    return [
        {
            'input': 'A36, Grade "A", 36 ksi',
            'expected_csv': '"A36, Grade ""A"", 36 ksi"',  # Commas trigger quotes, quotes doubled
            'description': 'Commas and quotes'
        },
        {
            'input': 'Material with\nnewline',
            'expected_csv': '"Material with\nnewline"',  # Newlines trigger quotes
            'description': 'Newline character'
        },
        {
            'input': 'Simple value',
            'expected_csv': 'Simple value',  # No escaping needed
            'description': 'No special characters'
        },
        {
            'input': 'Value with "quotes" only',
            'expected_csv': '"Value with ""quotes"" only"',  # Quotes doubled
            'description': 'Quotes only'
        },
        {
            'input': 'ASTM A123, A153, A307',
            'expected_csv': '"ASTM A123, A153, A307"',  # Commas trigger quotes
            'description': 'Multiple commas'
        },
    ]


# ============================================================================
# Helper Functions
# ============================================================================

def create_component_with_specifications(piece_mark: str, specifications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Helper function to create a component with specified specifications

    Args:
        piece_mark: Component piece mark identifier
        specifications: List of specification dictionaries

    Returns:
        Component dictionary with specifications
    """
    import uuid
    return {
        'id': str(uuid.uuid4()),
        'piece_mark': piece_mark,
        'component_type': 'beam',
        'specifications': specifications
    }


def create_specification(
    specification_type: str,
    value: str,
    description: str = None
) -> Dict[str, Any]:
    """
    Helper function to create a specification dictionary

    Args:
        specification_type: Type of specification (material, finish, etc.)
        value: Text value of the specification
        description: Optional detailed description

    Returns:
        Specification dictionary
    """
    return {
        'specification_type': specification_type,
        'value': value,
        'description': description
    }


def create_integrated_component(
    piece_mark: str,
    dimensions: List[Dict[str, Any]] = None,
    specifications: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Helper function to create a component with both dimensions AND specifications

    Args:
        piece_mark: Component piece mark identifier
        dimensions: List of dimension dictionaries
        specifications: List of specification dictionaries

    Returns:
        Component dictionary with both dimensions and specifications
    """
    import uuid
    return {
        'id': str(uuid.uuid4()),
        'piece_mark': piece_mark,
        'component_type': 'beam',
        'dimensions': dimensions or [],
        'specifications': specifications or []
    }
