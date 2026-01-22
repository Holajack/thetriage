"""
Core utilities for the execution layer.
All execution scripts should import from here.
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from dotenv import load_dotenv

# Project root (parent of execution/)
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
ENV_FILE = PROJECT_ROOT / ".env"

# Ensure .tmp exists
TMP_DIR.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("execution")


def load_env() -> dict:
    """
    Load environment variables from .env file.
    Returns dict of all env vars for easy access.
    """
    load_dotenv(ENV_FILE)
    return dict(os.environ)


def get_tmp_path(filename: str) -> Path:
    """
    Get path to a file in the .tmp directory.
    Creates .tmp if it doesn't exist.

    Args:
        filename: Name of the file (can include subdirectories)

    Returns:
        Full path to the file in .tmp/
    """
    path = TMP_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def log(message: str, level: str = "info") -> None:
    """
    Log a message with timestamp.

    Args:
        message: The message to log
        level: Log level (info, warning, error, debug)
    """
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(message)


def save_json(data: Any, filename: str, indent: int = 2) -> Path:
    """
    Save data as JSON to .tmp directory.

    Args:
        data: Data to serialize
        filename: Output filename
        indent: JSON indent level

    Returns:
        Path to saved file
    """
    path = get_tmp_path(filename)
    with open(path, "w") as f:
        json.dump(data, f, indent=indent, default=str)
    log(f"Saved JSON to {path}")
    return path


def load_json(filename: str) -> Any:
    """
    Load JSON from .tmp directory.

    Args:
        filename: File to load

    Returns:
        Parsed JSON data
    """
    path = get_tmp_path(filename)
    with open(path, "r") as f:
        return json.load(f)


def timestamp() -> str:
    """Return current timestamp string for filenames."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


class ExecutionResult:
    """
    Standard result object for execution scripts.
    Makes it easy for orchestration layer to handle outcomes.
    """

    def __init__(
        self,
        success: bool,
        data: Any = None,
        error: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        self.success = success
        self.data = data
        self.error = error
        self.metadata = metadata or {}
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "metadata": self.metadata,
            "timestamp": self.timestamp
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, default=str)

    @classmethod
    def ok(cls, data: Any = None, **metadata) -> "ExecutionResult":
        """Create a successful result."""
        return cls(success=True, data=data, metadata=metadata)

    @classmethod
    def fail(cls, error: str, **metadata) -> "ExecutionResult":
        """Create a failed result."""
        return cls(success=False, error=error, metadata=metadata)


# Example usage pattern for execution scripts:
#
# from utils import load_env, log, save_json, ExecutionResult
#
# def main():
#     env = load_env()
#     api_key = env.get("API_KEY")
#
#     try:
#         # Do work...
#         result = {"items": [...]}
#         save_json(result, "output.json")
#         return ExecutionResult.ok(result)
#     except Exception as e:
#         log(f"Error: {e}", level="error")
#         return ExecutionResult.fail(str(e))
#
# if __name__ == "__main__":
#     result = main()
#     print(result.to_json())
