# Directive: Video-to-Transcript-to-Todo Agent

## Goal
Process long-form videos to generate detailed transcripts, then analyze those transcripts to produce actionable LLM-ready todos for app enhancement.

## Inputs
- **Required:**
  - `video_path`: Path to video file (mp4, mov, webm, etc.) OR YouTube URL
  - `app_context`: Brief description of what the app does (used to generate relevant todos)
- **Optional:**
  - `focus_areas`: Specific areas to focus on (e.g., "UI improvements", "new features", "bug fixes") (default: all)
  - `output_format`: Format for todos - "markdown", "json", or "github_issues" (default: "markdown")
  - `max_todos`: Maximum number of todos to generate (default: 50)
  - `priority_threshold`: Only include todos above this priority (1-5, default: 1)

## Execution Scripts
1. `execution/transcribe_video.py` - Extracts audio and transcribes using OpenAI Whisper API
2. `execution/generate_todos.py` - Analyzes transcript with GPT-4 to generate structured todos

## Process
1. **Validate Input**
   - Check if video file exists OR validate YouTube URL
   - Verify OPENAI_API_KEY is set in environment

2. **Extract & Transcribe**
   - Run `execution/transcribe_video.py` with the video path
   - For videos > 25MB, script automatically chunks the audio
   - Output: `.tmp/transcripts/{video_name}_{timestamp}.json`

3. **Analyze & Generate Todos**
   - Run `execution/generate_todos.py` with:
     - Transcript path from step 2
     - App context description
     - Focus areas (if specified)
   - GPT-4 analyzes the transcript looking for:
     - Feature requests/ideas
     - Bug reports or issues mentioned
     - UI/UX improvements
     - Performance suggestions
     - Architecture recommendations
   - Output: `.tmp/todos/{video_name}_{timestamp}.{format}`

4. **Post-Process**
   - Deduplicate similar todos
   - Assign priorities based on frequency mentioned and impact
   - Group by category (feature, bug, enhancement, etc.)

## Outputs
- **Primary:** Structured todo list in requested format at `.tmp/todos/`
- **Intermediate:**
  - Raw transcript at `.tmp/transcripts/`
  - Audio chunks (if video was large) at `.tmp/audio/`

## Output Formats

### Markdown (default)
```markdown
## Feature: [Title]
**Priority:** High | Medium | Low
**Category:** feature | bug | enhancement | performance | ui
**Timestamp:** [Where in video this was mentioned]
**Description:** Detailed description of what needs to be done
**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
```

### JSON
```json
{
  "todos": [
    {
      "id": "todo_001",
      "title": "...",
      "priority": 1-5,
      "category": "feature|bug|enhancement|performance|ui",
      "timestamp": "00:12:34",
      "description": "...",
      "acceptance_criteria": ["...", "..."],
      "related_files": ["suggested/file/paths.ts"]
    }
  ]
}
```

## Error Handling
- **Video file not found:** Return clear error with expected path format
- **YouTube URL invalid:** Check URL format, suggest correct format
- **API rate limit:** Wait 60 seconds and retry (max 3 retries)
- **Audio extraction failed:** Check ffmpeg is installed, suggest `brew install ffmpeg`
- **Transcript too long for GPT-4:** Chunk transcript into sections, process each, merge results
- **No OPENAI_API_KEY:** Exit early with instructions to add key to .env

## Edge Cases
- **Silent video sections:** Skip sections with no speech detected
- **Multiple speakers:** Note speaker changes in transcript (Whisper handles this)
- **Non-English content:** Whisper auto-detects language, todos generated in English
- **Very long videos (>2 hours):** Process in 30-minute chunks to manage costs
- **YouTube age-restricted videos:** May fail - suggest downloading manually first

## Cost Estimation
- Whisper API: ~$0.006 per minute of audio
- GPT-4: ~$0.03 per 1K tokens (transcript + prompt)
- Typical 1-hour video: ~$0.50-$1.00 total

## Example Usage

```bash
# Basic usage
python execution/transcribe_video.py --video ./videos/feature_demo.mp4
python execution/generate_todos.py \
  --transcript .tmp/transcripts/feature_demo_20240115.json \
  --context "React Native hiking app with premium features" \
  --format markdown

# With YouTube URL
python execution/transcribe_video.py --video "https://youtube.com/watch?v=..."

# With focus areas
python execution/generate_todos.py \
  --transcript .tmp/transcripts/video_20240115.json \
  --context "React Native hiking app" \
  --focus "animations,premium features,performance"
```

## Learnings
> Add discoveries here as you use this directive

- [Initial]: Whisper API has 25MB file size limit - script handles chunking automatically
- [Initial]: For best results, provide specific app context rather than generic descriptions
