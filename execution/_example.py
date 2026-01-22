#!/usr/bin/env python3
"""
Example execution script demonstrating the standard pattern.
Copy this as a starting point for new scripts.

Usage:
    python execution/_example.py --input "some value"
"""

import argparse
import sys
from pathlib import Path

# Add execution directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, ExecutionResult, timestamp


def process_data(input_value: str) -> dict:
    """
    Your core logic goes here.
    Keep it pure - input → output, no side effects.
    """
    # Example processing
    result = {
        "input": input_value,
        "processed": input_value.upper(),
        "length": len(input_value)
    }
    return result


def main():
    # Parse arguments
    parser = argparse.ArgumentParser(description="Example execution script")
    parser.add_argument("--input", required=True, help="Input value to process")
    parser.add_argument("--output", help="Output filename (default: auto-generated)")
    args = parser.parse_args()

    # Load environment variables
    env = load_env()
    log(f"Starting execution with input: {args.input}")

    try:
        # Do the work
        result = process_data(args.input)

        # Save intermediate output
        output_file = args.output or f"example_output_{timestamp()}.json"
        save_json(result, output_file)

        # Return success
        log("Execution completed successfully")
        return ExecutionResult.ok(result, output_file=output_file)

    except Exception as e:
        log(f"Execution failed: {e}", level="error")
        return ExecutionResult.fail(str(e))


if __name__ == "__main__":
    result = main()
    print(result.to_json())
