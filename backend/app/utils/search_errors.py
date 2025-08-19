"""
Search Error Handling Utilities

This module provides comprehensive error handling for the enhanced search system,
including user-friendly error messages, validation, and graceful degradation.
"""

import logging
from typing import List, Optional, Dict, Any, Tuple
from app.models.search import SearchError, QueryValidationResult, SearchQueryType, SearchScope
from app.utils.query_parser import QueryParseError, QueryParseResult, parse_search_query

logger = logging.getLogger(__name__)


class SearchErrorHandler:
    """
    Centralized error handling for search operations
    
    Provides:
    - User-friendly error messages
    - Query validation and sanitization  
    - Graceful fallback strategies
    - Structured error responses
    """
    
    # User-friendly error messages
    ERROR_MESSAGES = {
        'empty_query': "Please enter a search term",
        'query_too_long': "Search query is too long (maximum 500 characters)",
        'invalid_boolean_syntax': "Invalid search syntax. Check your AND/OR/NOT operators",
        'unmatched_parentheses': "Unmatched parentheses in your search query",
        'invalid_wildcard': "Invalid wildcard pattern. Use * for multiple characters or ? for single character",
        'missing_term_after_operator': "Missing search term after {operator}",
        'missing_term_before_operator': "Missing search term before {operator}",
        'sql_injection_detected': "Invalid characters detected in search query",
        'query_too_complex': "Search query is too complex. Please simplify and try again",
        'scope_required': "At least one search field must be selected",
        'invalid_scope': "Invalid search scope. Please select from available options",
        'database_error': "Search temporarily unavailable. Please try again",
        'timeout_error': "Search took too long. Please try a simpler query",
        'permission_denied': "You don't have permission to search in this context"
    }
    
    # Helpful suggestions for common errors
    ERROR_SUGGESTIONS = {
        'invalid_boolean_syntax': [
            "Use AND to find items containing both terms: steel AND beam",
            "Use OR to find items containing either term: plate OR angle", 
            "Use NOT to exclude terms: girder NOT aluminum",
            "Group terms with parentheses: (beam OR girder) AND steel"
        ],
        'unmatched_parentheses': [
            "Make sure every opening parenthesis ( has a closing one )",
            "Example: (beam OR girder) AND NOT aluminum"
        ],
        'invalid_wildcard': [
            "Use * to match multiple characters: C6* finds C63, C64, etc.",
            "Use ? to match single character: C?3 finds C63, C73, etc.",
            "Combine wildcards: W*21 finds W1221, W1821, etc."
        ],
        'query_too_complex': [
            "Try using fewer AND/OR operators",
            "Simplify parentheses grouping",
            "Break complex queries into multiple simpler searches"
        ]
    }
    
    def validate_query(self, query: str, scope: List[SearchScope]) -> QueryValidationResult:
        """
        Validate and analyze search query
        
        Args:
            query: Raw search query string
            scope: List of search scopes to apply
            
        Returns:
            QueryValidationResult with validation status and metadata
        """
        warnings = []
        
        # Basic validation
        if not query or not query.strip():
            return QueryValidationResult(
                is_valid=False,
                query_type=SearchQueryType.SIMPLE,
                complexity_score=0,
                sanitized_query="",
                scope_applied=scope or [SearchScope.PIECE_MARK],
                error=SearchError(
                    error_type="validation",
                    message=self.ERROR_MESSAGES['empty_query'],
                    suggestions=["Enter a component name, piece mark, or description"]
                )
            )
        
        # Validate scope
        if not scope or len(scope) == 0:
            return QueryValidationResult(
                is_valid=False,
                query_type=SearchQueryType.SIMPLE,
                complexity_score=0,
                sanitized_query=query.strip(),
                scope_applied=[SearchScope.PIECE_MARK],
                error=SearchError(
                    error_type="validation",
                    message=self.ERROR_MESSAGES['scope_required'],
                    suggestions=["Select at least one search field (Piece Marks, Component Types, or Descriptions)"]
                )
            )
        
        try:
            # Parse query using our enhanced parser
            parsed_result = parse_search_query(query)
            
            if not parsed_result.is_valid:
                # Convert parse error to user-friendly error
                error_type, message, suggestions = self._convert_parse_error(parsed_result.error_message)
                
                return QueryValidationResult(
                    is_valid=False,
                    query_type=SearchQueryType.SIMPLE,
                    complexity_score=0,
                    sanitized_query=query.strip(),
                    scope_applied=scope,
                    error=SearchError(
                        error_type=error_type,
                        message=message,
                        suggestions=suggestions
                    )
                )
            
            # Calculate complexity and add warnings if needed
            from app.utils.query_parser import _query_parser
            complexity_score = _query_parser.get_query_complexity_score(parsed_result)
            
            if complexity_score > 80:
                warnings.append("This is a complex query that may take longer to execute")
            
            if len(parsed_result.tokens) > 10:
                warnings.append("Large queries may return too many results. Consider being more specific")
            
            # Convert query type enum
            query_type_mapping = {
                "simple": SearchQueryType.SIMPLE,
                "boolean": SearchQueryType.BOOLEAN,
                "wildcard": SearchQueryType.WILDCARD,
                "quoted": SearchQueryType.QUOTED,
                "complex": SearchQueryType.COMPLEX
            }
            
            search_query_type = query_type_mapping.get(
                parsed_result.query_type.value, 
                SearchQueryType.SIMPLE
            )
            
            return QueryValidationResult(
                is_valid=True,
                query_type=search_query_type,
                complexity_score=complexity_score,
                sanitized_query=query.strip(),
                scope_applied=scope,
                warnings=warnings
            )
            
        except QueryParseError as e:
            # Handle specific query parsing errors
            error_type, message, suggestions = self._convert_parse_error(str(e))
            
            return QueryValidationResult(
                is_valid=False,
                query_type=SearchQueryType.SIMPLE,
                complexity_score=0,
                sanitized_query=query.strip(),
                scope_applied=scope,
                error=SearchError(
                    error_type=error_type,
                    message=message,
                    position=getattr(e, 'position', None),
                    suggestions=suggestions
                )
            )
            
        except Exception as e:
            # Handle unexpected errors
            logger.error(f"Unexpected error validating query '{query}': {str(e)}")
            
            return QueryValidationResult(
                is_valid=False,
                query_type=SearchQueryType.SIMPLE,
                complexity_score=0,
                sanitized_query=query.strip(),
                scope_applied=scope,
                error=SearchError(
                    error_type="validation",
                    message="Unable to process search query. Please try a simpler search",
                    details=str(e) if logger.isEnabledFor(logging.DEBUG) else None,
                    suggestions=["Try a simple text search without special characters"]
                )
            )
    
    def _convert_parse_error(self, error_message: str) -> Tuple[str, str, List[str]]:
        """
        Convert technical parse error to user-friendly message
        
        Returns:
            Tuple of (error_type, user_message, suggestions)
        """
        error_lower = error_message.lower()
        
        if "sql injection" in error_lower or "invalid characters" in error_lower:
            return (
                "security",
                self.ERROR_MESSAGES['sql_injection_detected'],
                ["Remove special characters like <, >, quotes", "Use only letters, numbers, and basic punctuation"]
            )
        
        if "unmatched parentheses" in error_lower or "unexpected closing parenthesis" in error_lower:
            return (
                "parsing",
                self.ERROR_MESSAGES['unmatched_parentheses'],
                self.ERROR_SUGGESTIONS['unmatched_parentheses']
            )
        
        if "boolean operator" in error_lower:
            operator = self._extract_operator_from_error(error_message)
            message = self.ERROR_MESSAGES['missing_term_after_operator'].format(operator=operator)
            
            return (
                "parsing", 
                message,
                self.ERROR_SUGGESTIONS['invalid_boolean_syntax']
            )
        
        if "needs a term before" in error_lower:
            operator = self._extract_operator_from_error(error_message) 
            message = self.ERROR_MESSAGES['missing_term_before_operator'].format(operator=operator)
            
            return (
                "parsing",
                message, 
                self.ERROR_SUGGESTIONS['invalid_boolean_syntax']
            )
        
        if "not operator" in error_lower:
            return (
                "parsing",
                "NOT operator must be followed by a search term",
                ["Use NOT like this: steel NOT aluminum", "NOT must come before the term to exclude"]
            )
        
        # Generic boolean syntax error
        if any(word in error_lower for word in ['and', 'or', 'not', 'operator']):
            return (
                "parsing",
                self.ERROR_MESSAGES['invalid_boolean_syntax'],
                self.ERROR_SUGGESTIONS['invalid_boolean_syntax']
            )
        
        # Default case
        return (
            "parsing",
            "Invalid search syntax. Please check your query and try again",
            ["Use simple text search", "Add quotes around exact phrases", "Check boolean operators (AND, OR, NOT)"]
        )
    
    def _extract_operator_from_error(self, error_message: str) -> str:
        """Extract the problematic operator from error message"""
        import re
        
        # Look for quoted operators in error message
        match = re.search(r"'(AND|OR|NOT)'", error_message, re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Look for unquoted operators
        for op in ['AND', 'OR', 'NOT']:
            if op in error_message.upper():
                return op
        
        return "operator"
    
    def create_database_error(self, original_error: Exception) -> SearchError:
        """Create user-friendly error for database issues"""
        logger.error(f"Database error in search: {str(original_error)}")
        
        return SearchError(
            error_type="execution",
            message=self.ERROR_MESSAGES['database_error'],
            details=str(original_error) if logger.isEnabledFor(logging.DEBUG) else None,
            suggestions=["Wait a moment and try again", "Try a simpler search query"]
        )
    
    def create_timeout_error(self, query: str, elapsed_ms: int) -> SearchError:
        """Create error for search timeouts"""
        logger.warning(f"Search timeout after {elapsed_ms}ms for query: {query[:50]}...")
        
        return SearchError(
            error_type="execution", 
            message=self.ERROR_MESSAGES['timeout_error'],
            details=f"Query took {elapsed_ms}ms (limit: 10000ms)",
            suggestions=self.ERROR_SUGGESTIONS['query_too_complex']
        )
    
    def create_permission_error(self, context: str) -> SearchError:
        """Create error for permission issues"""
        return SearchError(
            error_type="permission",
            message=self.ERROR_MESSAGES['permission_denied'],
            details=f"Access denied for context: {context}",
            suggestions=["Contact your administrator for access", "Try searching in a different project"]
        )
    
    def get_search_help(self) -> Dict[str, Any]:
        """
        Get comprehensive search help information
        
        Returns:
            Dictionary with search syntax help and examples
        """
        return {
            "basic_search": {
                "description": "Enter any text to search across piece marks, component types, and descriptions",
                "examples": [
                    "C63 - Find exact piece mark",
                    "girder - Find all girders", 
                    "steel - Find components containing 'steel'"
                ]
            },
            "boolean_operators": {
                "description": "Use AND, OR, NOT to combine search terms",
                "examples": [
                    "steel AND beam - Must contain both terms",
                    "plate OR angle - Contains either term",
                    "girder NOT aluminum - Contains 'girder' but not 'aluminum'"
                ]
            },
            "wildcards": {
                "description": "Use * for multiple characters, ? for single character",
                "examples": [
                    "C6* - All piece marks starting with C6",
                    "W?21 - W followed by any character then 21",
                    "*beam* - Contains 'beam' anywhere"
                ]
            },
            "quoted_phrases": {
                "description": "Use quotes for exact phrases",
                "examples": [
                    '"wide flange beam" - Exact phrase match',
                    '"steel plate" - Must appear exactly as written'
                ]
            },
            "grouping": {
                "description": "Use parentheses to group terms",
                "examples": [
                    "(beam OR girder) AND steel - Either beam or girder, plus steel",
                    "(C6* OR C7*) AND NOT aluminum - C6 or C7 series, excluding aluminum"
                ]
            },
            "scope_selection": {
                "description": "Choose which fields to search in",
                "options": [
                    "Piece Marks - Component identifiers (recommended for precision)",
                    "Component Types - Structural element types (girder, beam, etc.)",
                    "Descriptions - Detailed component descriptions"
                ]
            }
        }


# Global error handler instance
_error_handler = SearchErrorHandler()


def validate_search_query(query: str, scope: List[SearchScope]) -> QueryValidationResult:
    """
    Convenience function to validate search query
    
    Args:
        query: Search query string
        scope: List of search scopes
        
    Returns:
        QueryValidationResult with validation status
    """
    return _error_handler.validate_query(query, scope)


def get_search_help() -> Dict[str, Any]:
    """
    Get comprehensive search help information
    
    Returns:
        Dictionary with search syntax help and examples
    """
    return _error_handler.get_search_help()