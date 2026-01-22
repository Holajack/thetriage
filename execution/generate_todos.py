"""
Todo Generation Script using OpenAI GPT-4.

Analyzes video transcripts to generate structured, actionable todos
for app development and enhancement.

Usage:
    python execution/generate_todos.py \
        --transcript .tmp/transcripts/video_20240115.json \
        --context "React Native hiking app with premium features" \
        --format markdown
"""

import argparse
import json
from pathlib import Path
from typing import List, Optional

from openai import OpenAI

from utils import (
    load_env,
    log,
    save_json,
    load_json,
    get_tmp_path,
    timestamp,
    ExecutionResult
)


# GPT-4 context window considerations
MAX_TRANSCRIPT_CHARS = 100000  # Leave room for prompt and response
CHUNK_SIZE = 80000  # Size for transcript chunks if too long


SYSTEM_PROMPT = """You are an expert software development analyst. Your job is to analyze video transcripts (from tutorials, feature demos, bug reports, user feedback sessions, etc.) and extract actionable development todos.

For each todo you identify, provide:
1. A clear, actionable title
2. Priority (1-5, where 1 is highest priority)
3. Category: feature, bug, enhancement, performance, ui, security, documentation, testing
4. The timestamp range where this was discussed (if identifiable)
5. A detailed description of what needs to be done
6. Specific acceptance criteria (as a checklist)
7. Suggested files/components that might be affected (if you can infer from context)

Focus on:
- New feature requests or ideas
- Bug reports or issues mentioned
- UI/UX improvements suggested
- Performance optimizations
- Architecture recommendations
- Security concerns
- Testing needs

Be thorough but avoid duplicates. If the same topic is mentioned multiple times, consolidate into one todo with higher priority.

Output your response as valid JSON matching this schema:
{
  "todos": [
    {
      "id": "todo_001",
      "title": "string",
      "priority": 1-5,
      "category": "feature|bug|enhancement|performance|ui|security|documentation|testing",
      "timestamp": "HH:MM:SS - HH:MM:SS or null",
      "description": "string",
      "acceptance_criteria": ["string", "string"],
      "suggested_files": ["string"] or [],
      "raw_quotes": ["relevant quote from transcript"]
    }
  ],
  "summary": "Brief summary of main themes",
  "total_todos": number,
  "priority_breakdown": {
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  }
}"""


def format_transcript_for_llm(transcript: dict) -> str:
    """Format transcript data for LLM consumption."""
    segments = transcript.get("segments", [])

    if segments:
        # Include timestamps if available
        formatted_parts = []
        for segment in segments:
            start = segment.get("start", 0)
            minutes = int(start // 60)
            seconds = int(start % 60)
            timestamp_str = f"[{minutes:02d}:{seconds:02d}]"
            text = segment.get("text", "").strip()
            if text:
                formatted_parts.append(f"{timestamp_str} {text}")
        return "\n".join(formatted_parts)
    else:
        # Fall back to plain text
        return transcript.get("text", "")


def chunk_transcript(transcript_text: str, chunk_size: int = CHUNK_SIZE) -> List[str]:
    """Split transcript into manageable chunks for API."""
    if len(transcript_text) <= chunk_size:
        return [transcript_text]

    chunks = []
    words = transcript_text.split()
    current_chunk = []
    current_size = 0

    for word in words:
        word_size = len(word) + 1  # +1 for space
        if current_size + word_size > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_size = word_size
        else:
            current_chunk.append(word)
            current_size += word_size

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def analyze_transcript_chunk(
    client: OpenAI,
    transcript_text: str,
    app_context: str,
    focus_areas: Optional[List[str]] = None,
    chunk_index: int = 0,
    total_chunks: int = 1,
    model: str = "gpt-4o"
) -> dict:
    """Analyze a transcript chunk with GPT-4."""

    focus_instruction = ""
    if focus_areas:
        focus_instruction = f"\n\nPay special attention to these areas: {', '.join(focus_areas)}"

    chunk_note = ""
    if total_chunks > 1:
        chunk_note = f"\n\nThis is chunk {chunk_index + 1} of {total_chunks}. Focus on this portion but maintain consistency with overall themes."

    user_prompt = f"""Analyze this video transcript and extract development todos for the following app:

**App Context:** {app_context}
{focus_instruction}
{chunk_note}

**Transcript:**
{transcript_text}

Extract all actionable development items as structured todos. Return valid JSON only."""

    log(f"Analyzing transcript chunk {chunk_index + 1}/{total_chunks} with {model}")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,  # Lower temp for more consistent extraction
        response_format={"type": "json_object"}
    )

    result_text = response.choices[0].message.content
    return json.loads(result_text)


def merge_todo_results(results: List[dict]) -> dict:
    """Merge todos from multiple chunks, deduplicating similar items."""
    all_todos = []
    seen_titles = set()

    for result in results:
        for todo in result.get("todos", []):
            # Simple deduplication by similar titles
            title_lower = todo["title"].lower()

            # Check for duplicates (fuzzy match)
            is_duplicate = False
            for seen in seen_titles:
                # If titles share 70% of words, consider duplicate
                title_words = set(title_lower.split())
                seen_words = set(seen.split())
                if len(title_words & seen_words) / max(len(title_words), len(seen_words)) > 0.7:
                    is_duplicate = True
                    break

            if not is_duplicate:
                seen_titles.add(title_lower)
                all_todos.append(todo)

    # Re-sort by priority
    all_todos.sort(key=lambda x: x.get("priority", 5))

    # Re-assign IDs
    for i, todo in enumerate(all_todos):
        todo["id"] = f"todo_{i+1:03d}"

    # Calculate priority breakdown
    priority_breakdown = {
        "critical": len([t for t in all_todos if t.get("priority") == 1]),
        "high": len([t for t in all_todos if t.get("priority") == 2]),
        "medium": len([t for t in all_todos if t.get("priority") == 3]),
        "low": len([t for t in all_todos if t.get("priority", 5) >= 4])
    }

    return {
        "todos": all_todos,
        "summary": f"Extracted {len(all_todos)} actionable todos from video transcript",
        "total_todos": len(all_todos),
        "priority_breakdown": priority_breakdown
    }


def format_as_markdown(todos_data: dict, video_name: str) -> str:
    """Convert todo data to markdown format."""
    lines = [
        f"# Development Todos from: {video_name}",
        "",
        f"**Total Items:** {todos_data['total_todos']}",
        f"**Priority Breakdown:** Critical: {todos_data['priority_breakdown']['critical']}, "
        f"High: {todos_data['priority_breakdown']['high']}, "
        f"Medium: {todos_data['priority_breakdown']['medium']}, "
        f"Low: {todos_data['priority_breakdown']['low']}",
        "",
        "---",
        ""
    ]

    priority_labels = {1: "Critical", 2: "High", 3: "Medium", 4: "Low", 5: "Low"}

    for todo in todos_data["todos"]:
        priority = todo.get("priority", 3)
        priority_label = priority_labels.get(priority, "Medium")

        lines.extend([
            f"## {todo['id'].upper()}: {todo['title']}",
            "",
            f"**Priority:** {priority_label} ({priority}/5)",
            f"**Category:** {todo.get('category', 'enhancement')}",
        ])

        if todo.get("timestamp"):
            lines.append(f"**Timestamp:** {todo['timestamp']}")

        lines.extend([
            "",
            "### Description",
            todo.get("description", "No description provided."),
            "",
            "### Acceptance Criteria",
        ])

        for criterion in todo.get("acceptance_criteria", []):
            lines.append(f"- [ ] {criterion}")

        if todo.get("suggested_files"):
            lines.extend([
                "",
                "### Suggested Files",
            ])
            for file in todo["suggested_files"]:
                lines.append(f"- `{file}`")

        if todo.get("raw_quotes"):
            lines.extend([
                "",
                "### Source Quotes",
            ])
            for quote in todo["raw_quotes"]:
                lines.append(f"> {quote}")

        lines.extend(["", "---", ""])

    return "\n".join(lines)


def generate_todos(
    transcript_path: str,
    app_context: str,
    focus_areas: Optional[List[str]] = None,
    output_format: str = "markdown",
    max_todos: int = 50,
    openai_api_key: str = None,
    model: str = "gpt-4o"
) -> ExecutionResult:
    """
    Main todo generation function.

    Args:
        transcript_path: Path to transcript JSON file
        app_context: Description of the app for context
        focus_areas: Optional list of areas to focus on
        output_format: Output format (markdown, json, github_issues)
        max_todos: Maximum number of todos to generate
        openai_api_key: OpenAI API key
        model: OpenAI model to use

    Returns:
        ExecutionResult with generated todos
    """
    client = OpenAI(api_key=openai_api_key)

    # Load transcript
    transcript_file = Path(transcript_path)
    if not transcript_file.exists():
        return ExecutionResult.fail(f"Transcript not found: {transcript_path}")

    with open(transcript_file, "r") as f:
        transcript = json.load(f)

    video_name = transcript.get("video_name", "unknown_video")
    log(f"Analyzing transcript for: {video_name}")

    # Format transcript for LLM
    transcript_text = format_transcript_for_llm(transcript)
    log(f"Transcript length: {len(transcript_text)} characters")

    # Chunk if necessary
    chunks = chunk_transcript(transcript_text)
    log(f"Processing {len(chunks)} chunk(s)")

    # Analyze each chunk
    results = []
    for i, chunk in enumerate(chunks):
        result = analyze_transcript_chunk(
            client,
            chunk,
            app_context,
            focus_areas,
            chunk_index=i,
            total_chunks=len(chunks),
            model=model
        )
        results.append(result)

    # Merge results
    merged = merge_todo_results(results)

    # Limit todos if requested
    if len(merged["todos"]) > max_todos:
        merged["todos"] = merged["todos"][:max_todos]
        merged["total_todos"] = max_todos
        merged["note"] = f"Limited to top {max_todos} todos by priority"

    # Save outputs
    ts = timestamp()

    # Always save JSON
    json_path = save_json(merged, f"todos/{video_name}_{ts}.json")

    # Generate requested format
    if output_format == "markdown":
        markdown_content = format_as_markdown(merged, video_name)
        md_path = get_tmp_path(f"todos/{video_name}_{ts}.md")
        with open(md_path, "w") as f:
            f.write(markdown_content)
        log(f"Markdown saved to {md_path}")
        primary_output = str(md_path)
    else:
        primary_output = str(json_path)

    log(f"Generated {merged['total_todos']} todos")

    return ExecutionResult.ok(
        data=merged,
        output_path=primary_output,
        json_path=str(json_path),
        video_name=video_name,
        total_todos=merged["total_todos"],
        priority_breakdown=merged["priority_breakdown"]
    )


def main():
    parser = argparse.ArgumentParser(
        description="Generate development todos from video transcript"
    )
    parser.add_argument(
        "--transcript",
        required=True,
        help="Path to transcript JSON file"
    )
    parser.add_argument(
        "--context",
        required=True,
        help="App context description"
    )
    parser.add_argument(
        "--focus",
        help="Comma-separated focus areas (e.g., 'animations,performance')"
    )
    parser.add_argument(
        "--format",
        choices=["markdown", "json"],
        default="markdown",
        help="Output format"
    )
    parser.add_argument(
        "--max-todos",
        type=int,
        default=50,
        help="Maximum number of todos"
    )
    parser.add_argument(
        "--model",
        default="gpt-4o",
        help="OpenAI model to use (default: gpt-4o)"
    )

    args = parser.parse_args()

    # Load environment
    env = load_env()
    api_key = env.get("OPENAI_API_KEY")

    if not api_key:
        result = ExecutionResult.fail(
            "OPENAI_API_KEY not found in environment. "
            "Add it to your .env file."
        )
        print(result.to_json())
        return

    focus_areas = None
    if args.focus:
        focus_areas = [f.strip() for f in args.focus.split(",")]

    try:
        result = generate_todos(
            transcript_path=args.transcript,
            app_context=args.context,
            focus_areas=focus_areas,
            output_format=args.format,
            max_todos=args.max_todos,
            openai_api_key=api_key,
            model=args.model
        )
    except Exception as e:
        log(f"Todo generation failed: {e}", level="error")
        result = ExecutionResult.fail(str(e))

    print(result.to_json())


if __name__ == "__main__":
    main()
