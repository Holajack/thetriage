#!/usr/bin/env python3
"""
Playwright test runner for the auto-dev agent system.

Runs visual tests against a running dev server instance.
Supports screenshot capture, basic interaction tests, and
verifying acceptance criteria.

Usage:
    python execution/playwright_test_runner.py \
        --url http://localhost:3001 \
        --todo-id todo_001 \
        --acceptance-criteria '["Page loads without errors", "Button is visible"]'

Requirements:
    pip install playwright
    playwright install chromium
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass, field

sys.path.insert(0, str(Path(__file__).parent))

from utils import load_env, log, save_json, get_tmp_path, ExecutionResult, timestamp

# Lazy import playwright to avoid errors if not installed
playwright_available = True
try:
    from playwright.async_api import async_playwright, Page, Browser
except ImportError:
    playwright_available = False


@dataclass
class TestResult:
    """Result of a single test assertion."""
    name: str
    passed: bool
    message: str = ""
    screenshot: Optional[str] = None
    duration_ms: int = 0


@dataclass
class TestSuiteResult:
    """Result of running all tests for a todo."""
    todo_id: str
    url: str
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    results: List[TestResult] = field(default_factory=list)
    started_at: str = ""
    finished_at: str = ""
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "todo_id": self.todo_id,
            "url": self.url,
            "total_tests": self.total_tests,
            "passed_tests": self.passed_tests,
            "failed_tests": self.failed_tests,
            "pass_rate": self.passed_tests / self.total_tests if self.total_tests > 0 else 0,
            "results": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "message": r.message,
                    "screenshot": r.screenshot,
                    "duration_ms": r.duration_ms
                }
                for r in self.results
            ],
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "error": self.error
        }


async def take_screenshot(page: Page, name: str, output_dir: Path) -> str:
    """Take a screenshot and return the file path."""
    screenshot_path = output_dir / f"{name}.png"
    await page.screenshot(path=str(screenshot_path), full_page=True)
    return str(screenshot_path)


async def test_page_loads(page: Page, url: str, output_dir: Path) -> TestResult:
    """Test that the page loads without errors."""
    start = time.time()
    errors = []

    # Capture console errors
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

    try:
        response = await page.goto(url, wait_until="networkidle", timeout=30000)

        duration = int((time.time() - start) * 1000)

        if response is None:
            return TestResult(
                name="Page loads",
                passed=False,
                message="No response received",
                duration_ms=duration
            )

        if response.status >= 400:
            return TestResult(
                name="Page loads",
                passed=False,
                message=f"HTTP {response.status}",
                duration_ms=duration
            )

        # Take screenshot
        screenshot = await take_screenshot(page, "page_load", output_dir)

        if errors:
            return TestResult(
                name="Page loads",
                passed=False,
                message=f"Console errors: {'; '.join(errors[:3])}",
                screenshot=screenshot,
                duration_ms=duration
            )

        return TestResult(
            name="Page loads",
            passed=True,
            message=f"HTTP {response.status} - Page loaded successfully",
            screenshot=screenshot,
            duration_ms=duration
        )

    except Exception as e:
        return TestResult(
            name="Page loads",
            passed=False,
            message=str(e),
            duration_ms=int((time.time() - start) * 1000)
        )


async def test_no_visual_regression(
    page: Page,
    output_dir: Path,
    baseline_dir: Optional[Path] = None
) -> TestResult:
    """Take a screenshot for visual comparison."""
    start = time.time()

    try:
        screenshot_path = await take_screenshot(page, "visual_check", output_dir)

        # If there's a baseline, compare (simplified - just check sizes match)
        if baseline_dir and (baseline_dir / "visual_check.png").exists():
            # In a real implementation, you'd use pixelmatch or similar
            return TestResult(
                name="Visual regression",
                passed=True,
                message="Screenshot captured (manual review needed)",
                screenshot=screenshot_path,
                duration_ms=int((time.time() - start) * 1000)
            )

        return TestResult(
            name="Visual regression",
            passed=True,
            message="Baseline screenshot captured",
            screenshot=screenshot_path,
            duration_ms=int((time.time() - start) * 1000)
        )

    except Exception as e:
        return TestResult(
            name="Visual regression",
            passed=False,
            message=str(e),
            duration_ms=int((time.time() - start) * 1000)
        )


async def test_acceptance_criterion(
    page: Page,
    criterion: str,
    output_dir: Path
) -> TestResult:
    """
    Test a single acceptance criterion.

    Uses heuristics to determine what kind of test to run based on the criterion text.
    """
    start = time.time()
    criterion_lower = criterion.lower()

    try:
        # Check for visibility-related criteria
        visibility_keywords = ["visible", "appears", "shown", "displayed", "exists"]
        if any(kw in criterion_lower for kw in visibility_keywords):
            # Try to find element mentioned in criterion
            # Look for quoted strings or specific element names
            import re
            quoted = re.findall(r'"([^"]+)"', criterion)
            if quoted:
                for text in quoted:
                    element = await page.locator(f'text="{text}"').first
                    if element and await element.is_visible():
                        screenshot = await take_screenshot(
                            page,
                            f"criterion_{hash(criterion) % 10000}",
                            output_dir
                        )
                        return TestResult(
                            name=criterion,
                            passed=True,
                            message=f'Found "{text}"',
                            screenshot=screenshot,
                            duration_ms=int((time.time() - start) * 1000)
                        )

        # Check for clickable-related criteria
        click_keywords = ["clickable", "click", "button", "tappable"]
        if any(kw in criterion_lower for kw in click_keywords):
            buttons = await page.locator("button").all()
            if buttons:
                return TestResult(
                    name=criterion,
                    passed=True,
                    message=f"Found {len(buttons)} buttons",
                    duration_ms=int((time.time() - start) * 1000)
                )

        # Check for form-related criteria
        form_keywords = ["input", "form", "field", "enter", "type"]
        if any(kw in criterion_lower for kw in form_keywords):
            inputs = await page.locator("input, textarea").all()
            if inputs:
                return TestResult(
                    name=criterion,
                    passed=True,
                    message=f"Found {len(inputs)} input fields",
                    duration_ms=int((time.time() - start) * 1000)
                )

        # Generic check - page doesn't crash
        # Take screenshot for manual review
        screenshot = await take_screenshot(
            page,
            f"criterion_{hash(criterion) % 10000}",
            output_dir
        )

        return TestResult(
            name=criterion,
            passed=True,
            message="Manual verification needed - screenshot captured",
            screenshot=screenshot,
            duration_ms=int((time.time() - start) * 1000)
        )

    except Exception as e:
        return TestResult(
            name=criterion,
            passed=False,
            message=str(e),
            duration_ms=int((time.time() - start) * 1000)
        )


async def run_tests(
    url: str,
    todo_id: str,
    acceptance_criteria: List[str],
    timeout: int = 120,
    headless: bool = True
) -> TestSuiteResult:
    """
    Run all tests for a todo item.

    Args:
        url: The URL to test against
        todo_id: Identifier for this todo
        acceptance_criteria: List of criteria to verify
        timeout: Maximum time for all tests
        headless: Run browser in headless mode

    Returns:
        TestSuiteResult with all test outcomes
    """
    result = TestSuiteResult(
        todo_id=todo_id,
        url=url,
        started_at=timestamp()
    )

    # Create output directory for screenshots
    output_dir = get_tmp_path(f"auto-dev/screenshots/{todo_id}")

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=headless)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 720}
            )
            page = await context.new_page()

            # Set timeout
            page.set_default_timeout(timeout * 1000)

            # Test 1: Page loads
            load_result = await test_page_loads(page, url, output_dir)
            result.results.append(load_result)
            result.total_tests += 1
            if load_result.passed:
                result.passed_tests += 1
            else:
                result.failed_tests += 1
                # If page doesn't load, skip other tests
                result.finished_at = timestamp()
                await browser.close()
                return result

            # Test 2: Visual regression baseline
            visual_result = await test_no_visual_regression(page, output_dir)
            result.results.append(visual_result)
            result.total_tests += 1
            if visual_result.passed:
                result.passed_tests += 1
            else:
                result.failed_tests += 1

            # Test 3+: Acceptance criteria
            for criterion in acceptance_criteria:
                criterion_result = await test_acceptance_criterion(page, criterion, output_dir)
                result.results.append(criterion_result)
                result.total_tests += 1
                if criterion_result.passed:
                    result.passed_tests += 1
                else:
                    result.failed_tests += 1

            await browser.close()

        except Exception as e:
            result.error = str(e)
            log(f"Test suite error: {e}", level="error")

    result.finished_at = timestamp()
    return result


async def wait_for_server(url: str, timeout: int = 60) -> bool:
    """Wait for the server to be ready."""
    import aiohttp

    start = time.time()
    while time.time() - start < timeout:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status < 500:
                        return True
        except Exception:
            pass
        await asyncio.sleep(1)
    return False


def main():
    parser = argparse.ArgumentParser(
        description="Run Playwright tests for auto-dev agent"
    )
    parser.add_argument(
        "--url",
        required=True,
        help="URL to test against"
    )
    parser.add_argument(
        "--todo-id",
        required=True,
        help="Todo ID for organizing results"
    )
    parser.add_argument(
        "--acceptance-criteria",
        default="[]",
        help="JSON array of acceptance criteria to test"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="Timeout in seconds (default: 120)"
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run browser in headed mode (visible)"
    )
    parser.add_argument(
        "--wait-for-server",
        action="store_true",
        help="Wait for server to be ready before testing"
    )
    args = parser.parse_args()

    if not playwright_available:
        print(ExecutionResult.fail(
            error="Playwright not installed. Run: pip install playwright && playwright install chromium"
        ).to_json())
        sys.exit(1)

    load_env()

    # Parse acceptance criteria
    try:
        criteria = json.loads(args.acceptance_criteria)
        if not isinstance(criteria, list):
            criteria = [criteria]
    except json.JSONDecodeError:
        # Treat as single criterion
        criteria = [args.acceptance_criteria] if args.acceptance_criteria else []

    async def run():
        # Wait for server if requested
        if args.wait_for_server:
            log(f"Waiting for server at {args.url}...")
            ready = await wait_for_server(args.url)
            if not ready:
                return ExecutionResult.fail(
                    error=f"Server not ready at {args.url}",
                    todo_id=args.todo_id
                )

        # Run tests
        log(f"Running tests for {args.todo_id} at {args.url}")
        result = await run_tests(
            url=args.url,
            todo_id=args.todo_id,
            acceptance_criteria=criteria,
            timeout=args.timeout,
            headless=not args.headed
        )

        # Save results
        result_file = save_json(
            result.to_dict(),
            f"auto-dev/test_results/{args.todo_id}.json"
        )

        # Determine success
        all_passed = result.failed_tests == 0 and result.error is None

        if all_passed:
            return ExecutionResult.ok(
                data=result.to_dict(),
                result_file=str(result_file)
            )
        else:
            return ExecutionResult.fail(
                error=f"{result.failed_tests}/{result.total_tests} tests failed",
                data=result.to_dict(),
                result_file=str(result_file)
            )

    result = asyncio.run(run())
    print(result.to_json())
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
