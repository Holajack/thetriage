# Directive: [Agent Name]

> Copy this template to create new agent directives. Delete this note when done.

## Goal
[One sentence describing what this agent accomplishes]

## Inputs
- **Required:**
  - `input_name`: Description of the input
- **Optional:**
  - `optional_input`: Description (default: value)

## Execution Scripts
1. `execution/script_name.py` - What it does
2. `execution/another_script.py` - What it does

## Process
1. Step one description
2. Step two description
3. Step three description

## Outputs
- **Primary:** Description of main output (e.g., Google Sheet URL)
- **Intermediate:** Files written to `.tmp/` during processing

## Error Handling
- **[Error Type]:** How to handle it
- **[API Rate Limit]:** Wait X seconds and retry

## Edge Cases
- What happens if [edge case]?
- What happens if [edge case]?

## Learnings
> Add discoveries here as you use this directive

- [Date]: Learned that X requires Y
- [Date]: API limit is actually Z per minute
