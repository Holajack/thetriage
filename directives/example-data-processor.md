# Directive: Data Processor

## Goal
Process input data and output structured results to demonstrate the agentic framework.

## Inputs
- **Required:**
  - `input_text`: The text to process
- **Optional:**
  - `output_format`: json or csv (default: json)

## Execution Scripts
1. `execution/_example.py` - Processes input text and returns structured data

## Process
1. Receive input text from user
2. Run `python execution/_example.py --input "user text"`
3. Script saves output to `.tmp/`
4. Return the processed result to user

## Outputs
- **Primary:** Processed data structure (displayed in chat)
- **Intermediate:** `.tmp/example_output_*.json`

## Error Handling
- **Invalid input:** Return error message explaining expected format
- **Script failure:** Read error, fix script, retry

## Edge Cases
- Empty input: Return helpful message asking for input
- Very long input: Works fine, no limit

## Learnings
> Add discoveries here as you use this directive

- [Initial]: This is a demo directive showing the pattern
