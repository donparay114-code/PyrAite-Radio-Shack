"""Structured logging configuration for PYrte Radio Shack."""

import json
import logging
import sys
from datetime import datetime
from typing import Any, Optional

from src.utils.config import settings


class JSONFormatter(logging.Formatter):
    """JSON log formatter for structured logging."""

    def __init__(
        self,
        include_timestamp: bool = True,
        include_level: bool = True,
        include_logger: bool = True,
        include_path: bool = True,
        extra_fields: Optional[dict] = None,
    ):
        super().__init__()
        self.include_timestamp = include_timestamp
        self.include_level = include_level
        self.include_logger = include_logger
        self.include_path = include_path
        self.extra_fields = extra_fields or {}

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {}

        if self.include_timestamp:
            log_data["timestamp"] = datetime.utcnow().isoformat() + "Z"

        if self.include_level:
            log_data["level"] = record.levelname

        if self.include_logger:
            log_data["logger"] = record.name

        if self.include_path:
            log_data["path"] = f"{record.pathname}:{record.lineno}"

        log_data["message"] = record.getMessage()

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "exc_info", "exc_text", "thread", "threadName",
                "message", "asctime",
            ):
                log_data[key] = value

        # Add configured extra fields
        log_data.update(self.extra_fields)

        return json.dumps(log_data, default=str)


class ColoredFormatter(logging.Formatter):
    """Colored log formatter for development."""

    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging(
    level: Optional[str] = None,
    json_format: Optional[bool] = None,
    include_request_id: bool = True,
) -> None:
    """
    Configure application logging.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON format (auto-detected from DEBUG setting if None)
        include_request_id: Include request ID in logs
    """
    log_level = level or settings.log_level
    use_json = json_format if json_format is not None else not settings.debug

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Remove existing handlers
    root_logger.handlers.clear()

    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, log_level.upper()))

    if use_json:
        formatter = JSONFormatter(
            extra_fields={
                "service": "pyrte-radio-shack",
                "environment": "production" if not settings.debug else "development",
            }
        )
    else:
        formatter = ColoredFormatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Set levels for noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.DEBUG if settings.debug else logging.WARNING
    )


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger instance."""
    return logging.getLogger(name)


class LogContext:
    """Context manager for adding extra fields to log records."""

    def __init__(self, logger: logging.Logger, **extra):
        self.logger = logger
        self.extra = extra
        self._old_factory = None

    def __enter__(self):
        self._old_factory = logging.getLogRecordFactory()

        extra = self.extra

        def factory(*args, **kwargs):
            record = self._old_factory(*args, **kwargs)
            for key, value in extra.items():
                setattr(record, key, value)
            return record

        logging.setLogRecordFactory(factory)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        logging.setLogRecordFactory(self._old_factory)


# Request ID middleware helper
class RequestIDMiddleware:
    """Middleware to add request ID to logs."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            import uuid
            request_id = str(uuid.uuid4())[:8]

            # Add to scope for access in handlers
            scope["request_id"] = request_id

        await self.app(scope, receive, send)


# Initialize logging on module import
setup_logging()
