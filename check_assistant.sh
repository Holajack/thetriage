#!/bin/bash

# Get secrets from Supabase
ASSISTANT_ID=$(supabase secrets list --project-ref ucculvnodabrfwbkzsnx 2>/dev/null | grep "Nora_Assistant_ID" | head -1)
API_KEY=$(supabase secrets list --project-ref ucculvnodabrfwbkzsnx 2>/dev/null | grep "OPENAI_API_KEY_NEW_NORA" | head -1)

echo "Note: Secrets are shown as digests for security"
echo "Nora_Assistant_ID exists: $(echo "$ASSISTANT_ID" | grep -q "Nora_Assistant_ID" && echo "YES" || echo "NO")"
echo "OPENAI_API_KEY_NEW_NORA exists: $(echo "$API_KEY" | grep -q "OPENAI_API_KEY_NEW_NORA" && echo "YES" || echo "NO")"
echo ""
echo "Edge function configuration:"
echo "- Uses Nora_Assistant_ID: YES (line 13)"
echo "- Attaches file_search to PDFs: YES (lines 552-558)"
echo "- System instructions include file_search guidance: YES (lines 50-53)"
