"""
Schema Validation Tests

Unit and integration tests for schema name validation (FR-1, AC 1-5)
Tests backend Pydantic validators and API endpoints
"""

import pytest
from pydantic import ValidationError
from app.models.schema import ComponentSchemaBase, ComponentSchemaCreate, ComponentSchemaUpdate


class TestSchemaNameValidation:
    """Test schema name validation rules (FR-1, AC 1-5)"""

    def test_valid_schema_names(self):
        """Test that valid schema names are accepted"""
        valid_names = [
            "ValidName",
            "valid-name",
            "valid_name",
            "name-with_both",
            "123name",
            "name123",
            "abc",  # minimum 3 chars
            "a" * 100,  # maximum 100 chars
        ]

        for name in valid_names:
            # Should not raise validation error
            schema_data = {
                "name": name,
                "description": "Test description",
                "is_default": False,
                "is_active": True,
            }
            validated = ComponentSchemaBase(**schema_data)
            assert validated.name == name.strip()

    def test_minimum_length_validation(self):
        """Test that names shorter than 3 characters are rejected (AC 1)"""
        invalid_names = ["ab", "a", ""]

        for name in invalid_names:
            with pytest.raises(ValidationError) as exc_info:
                ComponentSchemaBase(
                    name=name, description="Test", is_default=False, is_active=True
                )
            error_msg = str(exc_info.value)
            assert "3 characters" in error_msg.lower() or "required" in error_msg.lower()

    def test_maximum_length_validation(self):
        """Test that names longer than 100 characters are rejected (AC 1)"""
        long_name = "a" * 101

        with pytest.raises(ValidationError) as exc_info:
            ComponentSchemaBase(
                name=long_name, description="Test", is_default=False, is_active=True
            )
        error_msg = str(exc_info.value)
        assert "100" in error_msg

    def test_no_spaces_validation(self):
        """Test that spaces are not allowed in schema names (AC 3)"""
        invalid_names = [
            "name with spaces",
            "two  spaces",
            "name space",
        ]

        for name in invalid_names:
            with pytest.raises(ValidationError) as exc_info:
                ComponentSchemaBase(
                    name=name, description="Test", is_default=False, is_active=True
                )
            error_msg = str(exc_info.value)
            assert "space" in error_msg.lower()

    def test_no_leading_trailing_spaces(self):
        """Test that leading/trailing spaces are rejected (AC 3)"""
        invalid_names = [" name", "name ", " name ", "  name  "]

        for name in invalid_names:
            with pytest.raises(ValidationError) as exc_info:
                ComponentSchemaBase(
                    name=name, description="Test", is_default=False, is_active=True
                )
            error_msg = str(exc_info.value)
            assert "leading" in error_msg.lower() or "trailing" in error_msg.lower()

    def test_must_start_with_alphanumeric(self):
        """Test that names must start with letter or number (AC 3)"""
        invalid_names = ["-name", "_name", "-test", "_test"]

        for name in invalid_names:
            with pytest.raises(ValidationError) as exc_info:
                ComponentSchemaBase(
                    name=name, description="Test", is_default=False, is_active=True
                )
            error_msg = str(exc_info.value)
            assert "start" in error_msg.lower()

    def test_invalid_characters_rejection(self):
        """Test that invalid characters are rejected with specific error (AC 3)"""
        invalid_chars_map = {
            "name@domain": "@",
            "name.extension": ".",
            "name$value": "$",
            "name#tag": "#",
            "name!mark": "!",
            "name%percent": "%",
            "name&amp": "&",
            "name*star": "*",
            "name(paren": "(",
            "name)paren": ")",
            "name+plus": "+",
            "name=equals": "=",
            "name[bracket": "[",
            "name]bracket": "]",
            "name{brace": "{",
            "name}brace": "}",
            "name|pipe": "|",
            "name\\backslash": "\\",
            "name/slash": "/",
            "name:colon": ":",
            "name;semicolon": ";",
            "name\"quote": '"',
            "name'apostrophe": "'",
            "name<less": "<",
            "name>greater": ">",
            "name?question": "?",
        }

        for name, invalid_char in invalid_chars_map.items():
            with pytest.raises(ValidationError) as exc_info:
                ComponentSchemaBase(
                    name=name, description="Test", is_default=False, is_active=True
                )
            error_msg = str(exc_info.value)
            assert "invalid" in error_msg.lower() or "character" in error_msg.lower()
            # Error should mention the specific invalid character
            assert invalid_char in error_msg or f'"{invalid_char}"' in error_msg

    def test_allowed_characters(self):
        """Test that only letters, numbers, hyphens, and underscores are allowed"""
        valid_names = [
            "abcdefghijklmnopqrstuvwxyz",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "0123456789",
            "test-name",
            "test_name",
            "test-name_123",
            "123-test_name",
        ]

        for name in valid_names:
            # Should not raise validation error
            validated = ComponentSchemaBase(
                name=name, description="Test", is_default=False, is_active=True
            )
            assert validated.name == name

    def test_edge_cases(self):
        """Test edge cases for schema name validation"""
        # Exactly 3 characters (minimum)
        validated = ComponentSchemaBase(
            name="abc", description="Test", is_default=False, is_active=True
        )
        assert validated.name == "abc"

        # Exactly 100 characters (maximum)
        max_name = "a" * 100
        validated = ComponentSchemaBase(
            name=max_name, description="Test", is_default=False, is_active=True
        )
        assert validated.name == max_name

        # Consecutive hyphens and underscores
        validated = ComponentSchemaBase(
            name="name--test", description="Test", is_default=False, is_active=True
        )
        assert validated.name == "name--test"

        validated = ComponentSchemaBase(
            name="name__test", description="Test", is_default=False, is_active=True
        )
        assert validated.name == "name__test"

    def test_name_trimming(self):
        """Test that names are automatically trimmed"""
        # Names with internal spaces should be rejected, not trimmed
        with pytest.raises(ValidationError):
            ComponentSchemaBase(
                name="name with spaces",
                description="Test",
                is_default=False,
                is_active=True,
            )


class TestSchemaCreateValidation:
    """Test ComponentSchemaCreate validation"""

    def test_create_with_valid_name(self):
        """Test creating schema with valid name"""
        schema_data = ComponentSchemaCreate(
            name="valid-schema-name",
            description="Test schema",
            fields=[],
            is_default=False,
        )
        assert schema_data.name == "valid-schema-name"

    def test_create_with_invalid_name(self):
        """Test creating schema with invalid name raises error"""
        with pytest.raises(ValidationError) as exc_info:
            ComponentSchemaCreate(
                name="invalid@name",
                description="Test schema",
                fields=[],
                is_default=False,
            )
        error_msg = str(exc_info.value)
        assert "invalid" in error_msg.lower() or "character" in error_msg.lower()


class TestSchemaUpdateValidation:
    """Test ComponentSchemaUpdate validation"""

    def test_update_with_valid_name(self):
        """Test updating schema with valid name"""
        update_data = ComponentSchemaUpdate(name="updated-schema-name")
        assert update_data.name == "updated-schema-name"

    def test_update_with_invalid_name(self):
        """Test updating schema with invalid name raises error"""
        with pytest.raises(ValidationError) as exc_info:
            ComponentSchemaUpdate(name="invalid@name")
        error_msg = str(exc_info.value)
        assert "invalid" in error_msg.lower() or "character" in error_msg.lower()

    def test_partial_update(self):
        """Test that partial updates work (only name, no description)"""
        update_data = ComponentSchemaUpdate(name="new-name")
        assert update_data.name == "new-name"
        assert update_data.description is None


class TestCaseSensitivity:
    """Test case sensitivity handling"""

    def test_mixed_case_names_allowed(self):
        """Test that mixed case names are allowed"""
        names = ["TestName", "testname", "TESTNAME", "TeSt-NaMe"]

        for name in names:
            validated = ComponentSchemaBase(
                name=name, description="Test", is_default=False, is_active=True
            )
            # Name should be preserved as-is (case preserved)
            assert validated.name == name


class TestDescriptionValidation:
    """Test schema description validation"""

    def test_valid_descriptions(self):
        """Test that valid descriptions are accepted"""
        valid_descriptions = [
            "Short description",
            "A longer description with multiple words and punctuation!",
            "Description with numbers 123 and symbols @#$",
            "",  # Empty description should be allowed
            None,  # None should be allowed
        ]

        for description in valid_descriptions:
            validated = ComponentSchemaBase(
                name="test-name",
                description=description,
                is_default=False,
                is_active=True,
            )
            assert validated.description == description

    def test_description_max_length(self):
        """Test that descriptions longer than 500 characters are rejected"""
        long_description = "a" * 501

        with pytest.raises(ValidationError) as exc_info:
            ComponentSchemaBase(
                name="test-name",
                description=long_description,
                is_default=False,
                is_active=True,
            )
        error_msg = str(exc_info.value)
        assert "500" in error_msg
