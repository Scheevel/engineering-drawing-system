import uuid
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from contextvars import ContextVar
import asyncio

# Context variable to store correlation ID across async operations
correlation_id_var: ContextVar[str] = ContextVar('correlation_id', default='')

class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle correlation IDs for request tracing across services.

    This middleware:
    1. Extracts correlation ID from X-Correlation-ID header if present
    2. Generates a new correlation ID if none provided
    3. Sets the correlation ID in context for logging
    4. Adds correlation ID to response headers
    """

    def __init__(self, app, header_name: str = "X-Correlation-ID"):
        super().__init__(app)
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract correlation ID from header or generate new one
        correlation_id = request.headers.get(self.header_name)
        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        # Set correlation ID in context
        correlation_id_var.set(correlation_id)

        # Add correlation ID to request state for access in route handlers
        request.state.correlation_id = correlation_id

        # Process the request
        response = await call_next(request)

        # Add correlation ID to response headers
        response.headers[self.header_name] = correlation_id

        return response

class CorrelationLogFilter(logging.Filter):
    """
    Logging filter to add correlation ID to all log records.
    """

    def filter(self, record):
        # Add correlation ID to log record
        correlation_id = correlation_id_var.get('')
        record.correlation_id = correlation_id
        return True

def get_correlation_id() -> str:
    """
    Get the current correlation ID from context.

    Returns:
        str: Current correlation ID or empty string if not set
    """
    return correlation_id_var.get('')

def set_correlation_id(correlation_id: str) -> None:
    """
    Set the correlation ID in context.

    Args:
        correlation_id: The correlation ID to set
    """
    correlation_id_var.set(correlation_id)

def setup_correlation_logging():
    """
    Setup logging configuration to include correlation IDs.
    """
    # Create custom formatter that includes correlation ID
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Add filter to root logger
    correlation_filter = CorrelationLogFilter()

    # Get root logger and configure it
    root_logger = logging.getLogger()

    # Add filter to all existing handlers
    for handler in root_logger.handlers:
        handler.addFilter(correlation_filter)
        handler.setFormatter(formatter)

    # If no handlers exist, create a basic one
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.addFilter(correlation_filter)
        handler.setFormatter(formatter)
        root_logger.addHandler(handler)

    return root_logger