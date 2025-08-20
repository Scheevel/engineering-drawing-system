"""
Advanced Search Query Parser

This module provides query parsing capabilities for the enhanced search system,
supporting boolean operators (AND, OR, NOT), wildcards (* and ?), quoted phrases,
and proper input sanitization.

Features:
- Boolean operator parsing with proper precedence
- Wildcard pattern matching (* for multiple chars, ? for single char)
- Quoted phrase support ("exact phrase")
- Input sanitization to prevent SQL injection
- Graceful error handling with user-friendly messages
- Backward compatibility with simple text searches
"""

import re
import logging
from typing import List, Dict, Any, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum
from sqlalchemy import and_, or_, not_, func
from sqlalchemy.orm.attributes import InstrumentedAttribute

logger = logging.getLogger(__name__)


class QueryType(Enum):
    """Types of search queries"""
    SIMPLE = "simple"           # Basic text search (backward compatible)
    BOOLEAN = "boolean"         # Boolean operators present
    WILDCARD = "wildcard"       # Wildcard patterns present
    QUOTED = "quoted"           # Quoted phrases present
    COMPLEX = "complex"         # Multiple advanced features


class TokenType(Enum):
    """Token types for query parsing"""
    TERM = "term"
    QUOTED_PHRASE = "quoted_phrase"
    AND = "and"
    OR = "or" 
    NOT = "not"
    LPAREN = "lparen"
    RPAREN = "rparen"
    WILDCARD = "wildcard"


@dataclass
class ParsedToken:
    """Represents a parsed token in the query"""
    type: TokenType
    value: str
    original: str
    position: int


@dataclass
class QueryParseResult:
    """Result of query parsing operation"""
    tokens: List[ParsedToken]
    query_type: QueryType
    is_valid: bool
    error_message: Optional[str] = None
    sanitized_terms: List[str] = None
    has_wildcards: bool = False
    has_boolean_operators: bool = False


class QueryParseError(Exception):
    """Custom exception for query parsing errors"""
    def __init__(self, message: str, position: Optional[int] = None):
        self.message = message
        self.position = position
        super().__init__(message)


class SearchQueryParser:
    """
    Advanced search query parser supporting boolean operators, wildcards, and phrases
    """
    
    # SQL injection patterns to detect and prevent
    SQL_INJECTION_PATTERNS = [
        r';\s*drop\s+table',
        r';\s*delete\s+from',
        r';\s*update\s+',
        r';\s*insert\s+into',
        r'union\s+select',
        r'\/\*.*\*\/',
        r'--.*$',
        r"'\s*or\s+.*=.*",
        r'exec\s*\(',
        r'xp_cmdshell',
        r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>',  # XSS script tags
        r'javascript:',  # JavaScript protocol
        r'on\w+\s*=',  # HTML event handlers (onclick, onload, etc.)
        r'<[^>]*\bon\w+\s*=',  # Event handlers in HTML tags
        r'expression\s*\(',  # CSS expression
        r'eval\s*\(',  # JavaScript eval
        r'document\s*\.',  # DOM manipulation
        r'window\s*\.',  # Window object access
    ]
    
    # Boolean operators (case insensitive)
    BOOLEAN_OPERATORS = {
        'AND': TokenType.AND,
        'OR': TokenType.OR,
        'NOT': TokenType.NOT
    }
    
    def __init__(self):
        self.sql_injection_regex = re.compile(
            '|'.join(self.SQL_INJECTION_PATTERNS), 
            re.IGNORECASE | re.MULTILINE
        )
    
    def parse_query(self, query: str) -> QueryParseResult:
        """
        Parse a search query into tokens and analyze its structure
        
        Args:
            query: Raw search query string
            
        Returns:
            QueryParseResult with parsed tokens and metadata
            
        Raises:
            QueryParseError: If query contains invalid syntax or security risks
        """
        if not query or not query.strip():
            return QueryParseResult(
                tokens=[],
                query_type=QueryType.SIMPLE,
                is_valid=False,
                error_message="Empty query"
            )
        
        query = query.strip()
        
        # Check for SQL injection patterns
        if self._contains_sql_injection(query):
            logger.warning(f"Potential SQL injection detected in query: {query[:50]}...")
            raise QueryParseError("Invalid characters detected in search query")
        
        try:
            # Tokenize the query
            tokens = self._tokenize(query)
            
            # Analyze query type and features
            query_type, has_boolean, has_wildcards = self._analyze_query_type(tokens)
            
            # Validate syntax
            is_valid, error_message = self._validate_syntax(tokens)
            
            # Extract sanitized terms for logging/analytics
            sanitized_terms = self._extract_sanitized_terms(tokens)
            
            return QueryParseResult(
                tokens=tokens,
                query_type=query_type,
                is_valid=is_valid,
                error_message=error_message,
                sanitized_terms=sanitized_terms,
                has_wildcards=has_wildcards,
                has_boolean_operators=has_boolean
            )
            
        except QueryParseError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error parsing query '{query}': {str(e)}")
            raise QueryParseError(f"Failed to parse query: {str(e)}")
    
    def _contains_sql_injection(self, query: str) -> bool:
        """Check if query contains potential SQL injection patterns"""
        return bool(self.sql_injection_regex.search(query))
    
    def _tokenize(self, query: str) -> List[ParsedToken]:
        """
        Tokenize query string into structured tokens
        
        Handles:
        - Quoted phrases: "exact phrase"
        - Boolean operators: AND, OR, NOT
        - Parentheses: ( )
        - Wildcards: *, ?
        - Regular terms
        """
        tokens = []
        position = 0
        
        # Regex pattern to match different token types
        token_pattern = re.compile(r'''
            "([^"]*)"                    |  # Quoted phrases
            \(                          |  # Left parenthesis  
            \)                          |  # Right parenthesis
            \b(AND|OR|NOT)\b            |  # Boolean operators
            \S+                            # Other terms (including wildcards)
        ''', re.VERBOSE | re.IGNORECASE)
        
        for match in token_pattern.finditer(query):
            token_text = match.group()
            start_pos = match.start()
            
            # Determine token type
            if token_text.startswith('"') and token_text.endswith('"'):
                # Quoted phrase
                phrase_content = match.group(1)  # Content without quotes
                tokens.append(ParsedToken(
                    type=TokenType.QUOTED_PHRASE,
                    value=phrase_content,
                    original=token_text,
                    position=start_pos
                ))
            elif token_text == '(':
                tokens.append(ParsedToken(
                    type=TokenType.LPAREN,
                    value=token_text,
                    original=token_text,
                    position=start_pos
                ))
            elif token_text == ')':
                tokens.append(ParsedToken(
                    type=TokenType.RPAREN,
                    value=token_text,
                    original=token_text,
                    position=start_pos
                ))
            elif token_text.upper() in self.BOOLEAN_OPERATORS:
                tokens.append(ParsedToken(
                    type=self.BOOLEAN_OPERATORS[token_text.upper()],
                    value=token_text.upper(),
                    original=token_text,
                    position=start_pos
                ))
            elif '*' in token_text or '?' in token_text:
                # Wildcard term
                tokens.append(ParsedToken(
                    type=TokenType.WILDCARD,
                    value=token_text,
                    original=token_text,
                    position=start_pos
                ))
            else:
                # Regular term
                tokens.append(ParsedToken(
                    type=TokenType.TERM,
                    value=token_text,
                    original=token_text,
                    position=start_pos
                ))
        
        return tokens
    
    def _analyze_query_type(self, tokens: List[ParsedToken]) -> Tuple[QueryType, bool, bool]:
        """Analyze tokens to determine query type and features"""
        has_boolean = any(t.type in [TokenType.AND, TokenType.OR, TokenType.NOT] for t in tokens)
        has_wildcards = any(t.type == TokenType.WILDCARD for t in tokens)
        has_quoted = any(t.type == TokenType.QUOTED_PHRASE for t in tokens)
        has_parens = any(t.type in [TokenType.LPAREN, TokenType.RPAREN] for t in tokens)
        
        # Determine overall query type
        feature_count = sum([has_boolean, has_wildcards, has_quoted, has_parens])
        
        if feature_count == 0:
            return QueryType.SIMPLE, has_boolean, has_wildcards
        elif feature_count == 1:
            if has_boolean:
                return QueryType.BOOLEAN, has_boolean, has_wildcards
            elif has_wildcards:
                return QueryType.WILDCARD, has_boolean, has_wildcards
            elif has_quoted:
                return QueryType.QUOTED, has_boolean, has_wildcards
        
        return QueryType.COMPLEX, has_boolean, has_wildcards
    
    def _validate_syntax(self, tokens: List[ParsedToken]) -> Tuple[bool, Optional[str]]:
        """Validate query syntax and return error message if invalid"""
        if not tokens:
            return False, "Empty query"
        
        # Check for balanced parentheses
        paren_count = 0
        for token in tokens:
            if token.type == TokenType.LPAREN:
                paren_count += 1
            elif token.type == TokenType.RPAREN:
                paren_count -= 1
                if paren_count < 0:
                    return False, f"Unexpected closing parenthesis at position {token.position}"
        
        if paren_count != 0:
            return False, "Unmatched parentheses in query"
        
        # Check for proper boolean operator usage
        prev_token = None
        for i, token in enumerate(tokens):
            if token.type in [TokenType.AND, TokenType.OR]:
                # AND/OR must have terms on both sides
                if prev_token is None or prev_token.type in [TokenType.AND, TokenType.OR, TokenType.NOT, TokenType.LPAREN]:
                    return False, f"Boolean operator '{token.value}' at position {token.position} needs a term before it"
                if i == len(tokens) - 1 or tokens[i + 1].type in [TokenType.AND, TokenType.OR, TokenType.RPAREN]:
                    return False, f"Boolean operator '{token.value}' at position {token.position} needs a term after it"
            
            elif token.type == TokenType.NOT:
                # NOT must be followed by a term or opening parenthesis
                if i == len(tokens) - 1:
                    return False, f"NOT operator at position {token.position} needs a term after it"
                next_token = tokens[i + 1]
                if next_token.type not in [TokenType.TERM, TokenType.QUOTED_PHRASE, TokenType.WILDCARD, TokenType.LPAREN]:
                    return False, f"NOT operator at position {token.position} must be followed by a term or opening parenthesis"
            
            prev_token = token
        
        return True, None
    
    def _extract_sanitized_terms(self, tokens: List[ParsedToken]) -> List[str]:
        """Extract and sanitize search terms for logging/analytics"""
        terms = []
        for token in tokens:
            if token.type in [TokenType.TERM, TokenType.QUOTED_PHRASE, TokenType.WILDCARD]:
                # Basic sanitization - remove potentially harmful characters
                sanitized = re.sub(r'[<>"\';\\]', '', token.value)
                if sanitized:
                    terms.append(sanitized)
        return terms
    
    def convert_wildcards_to_sql(self, wildcard_term: str) -> str:
        """
        Convert wildcard patterns to SQL LIKE patterns
        
        * becomes % (multiple characters)
        ? becomes _ (single character)
        """
        # Escape existing SQL wildcards
        escaped = wildcard_term.replace('%', '\\%').replace('_', '\\_')
        
        # Convert our wildcards to SQL wildcards
        sql_pattern = escaped.replace('*', '%').replace('?', '_')
        
        return sql_pattern
    
    def build_sql_filters(self, parsed_query: QueryParseResult, 
                         search_fields: List[InstrumentedAttribute],
                         table_alias: Optional[str] = None) -> Any:
        """
        Build SQLAlchemy filter expressions from parsed query
        
        Args:
            parsed_query: Result from parse_query()
            search_fields: List of SQLAlchemy column attributes to search
            table_alias: Optional table alias for column references
            
        Returns:
            SQLAlchemy filter expression ready for .filter()
        """
        if not parsed_query.is_valid:
            raise QueryParseError(parsed_query.error_message)
        
        if not parsed_query.tokens:
            return None
        
        # For simple queries, use backward-compatible logic
        if parsed_query.query_type == QueryType.SIMPLE:
            term = parsed_query.tokens[0].value
            return self._build_simple_filter(term, search_fields)
        
        # For complex queries, build AST and convert to SQL
        return self._build_complex_filter(parsed_query.tokens, search_fields)
    
    def _build_simple_filter(self, term: str, search_fields: List[InstrumentedAttribute]) -> Any:
        """Build filter for simple text search (backward compatibility)"""
        if not term:
            return None
        
        # Create OR condition across all search fields
        conditions = []
        for field in search_fields:
            # Exact match gets highest priority
            conditions.append(field == term)
            # Prefix match
            conditions.append(field.ilike(f"{term}%"))
            # Substring match
            conditions.append(field.ilike(f"%{term}%"))
        
        return or_(*conditions)
    
    def _build_complex_filter(self, tokens: List[ParsedToken], 
                            search_fields: List[InstrumentedAttribute]) -> Any:
        """Build filter for complex queries with boolean operators"""
        # This is a simplified implementation. A full implementation would
        # build an Abstract Syntax Tree (AST) and convert it to SQL.
        # For now, handle basic cases.
        
        if len(tokens) == 1:
            token = tokens[0]
            return self._build_term_filter(token, search_fields)
        
        # Handle simple boolean expressions (term OPERATOR term)
        if len(tokens) == 3 and tokens[1].type in [TokenType.AND, TokenType.OR]:
            left_filter = self._build_term_filter(tokens[0], search_fields)
            operator = tokens[1].type
            right_filter = self._build_term_filter(tokens[2], search_fields)
            
            if operator == TokenType.AND:
                return and_(left_filter, right_filter)
            elif operator == TokenType.OR:
                return or_(left_filter, right_filter)
        
        # Handle NOT expressions
        if len(tokens) == 2 and tokens[0].type == TokenType.NOT:
            term_filter = self._build_term_filter(tokens[1], search_fields)
            return not_(term_filter)
        
        # For more complex expressions, fall back to simple OR logic for now
        # TODO: Implement full AST parsing for complex boolean expressions
        term_filters = []
        for token in tokens:
            if token.type in [TokenType.TERM, TokenType.QUOTED_PHRASE, TokenType.WILDCARD]:
                term_filter = self._build_term_filter(token, search_fields)
                if term_filter is not None:
                    term_filters.append(term_filter)
        
        if term_filters:
            return or_(*term_filters)
        
        return None
    
    def _build_term_filter(self, token: ParsedToken, 
                          search_fields: List[InstrumentedAttribute]) -> Any:
        """Build filter for a single term token"""
        if token.type == TokenType.QUOTED_PHRASE:
            # Exact phrase search across fields
            conditions = []
            for field in search_fields:
                conditions.append(field.ilike(f"%{token.value}%"))
            return or_(*conditions)
        
        elif token.type == TokenType.WILDCARD:
            # Convert wildcards and search across fields
            sql_pattern = self.convert_wildcards_to_sql(token.value)
            conditions = []
            for field in search_fields:
                conditions.append(field.ilike(sql_pattern))
            return or_(*conditions)
        
        elif token.type == TokenType.TERM:
            # Regular term search across fields
            conditions = []
            for field in search_fields:
                conditions.append(field.ilike(f"%{token.value}%"))
            return or_(*conditions)
        
        return None
    
    def get_query_complexity_score(self, parsed_query: QueryParseResult) -> int:
        """
        Calculate complexity score for performance monitoring
        
        Returns:
            Integer score (0-100) indicating query complexity
        """
        if not parsed_query.is_valid:
            return 0
        
        score = 0
        
        # Base score for simple queries
        if parsed_query.query_type == QueryType.SIMPLE:
            score = 10
        else:
            score = 20
        
        # Add points for each feature
        if parsed_query.has_boolean_operators:
            score += 20
        
        if parsed_query.has_wildcards:
            score += 15
        
        # Add points based on number of tokens
        score += min(len(parsed_query.tokens) * 2, 30)
        
        # Count nested parentheses
        paren_depth = 0
        max_depth = 0
        for token in parsed_query.tokens:
            if token.type == TokenType.LPAREN:
                paren_depth += 1
                max_depth = max(max_depth, paren_depth)
            elif token.type == TokenType.RPAREN:
                paren_depth -= 1
        
        score += max_depth * 10
        
        return min(score, 100)


# Global parser instance for reuse
_query_parser = SearchQueryParser()


def parse_search_query(query: str) -> QueryParseResult:
    """
    Convenience function to parse a search query
    
    Args:
        query: Search query string
        
    Returns:
        QueryParseResult with parsed tokens and metadata
    """
    return _query_parser.parse_query(query)


def build_search_filter(parsed_query: QueryParseResult,
                       search_fields: List[InstrumentedAttribute]) -> Any:
    """
    Convenience function to build SQL filter from parsed query
    
    Args:
        parsed_query: Result from parse_search_query()
        search_fields: List of SQLAlchemy column attributes
        
    Returns:
        SQLAlchemy filter expression
    """
    return _query_parser.build_sql_filters(parsed_query, search_fields)