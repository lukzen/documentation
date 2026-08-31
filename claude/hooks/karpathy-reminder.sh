#!/usr/bin/env bash
# PreToolUse hook — fires before every code-editing tool (Edit/Write/MultiEdit/
# NotebookEdit) and injects Karpathy's 12 LLM-coding rules into context at the
# moment implementation starts. Reinforces the steps most often skipped:
# think-before-coding, root-cause-before-patch, and VERIFY the full goal
# (edge cases included) before claiming done. Wired via ~/.claude/settings.json.
read -r -d '' RULES <<'EOF'
⚠️ KARPATHY GUIDELINES — a code edit is about to run. Enforce ALL 12 now:
1. Think before coding — state assumptions; surface tradeoffs; if unclear, STOP and ask.
2. Simplicity first — minimum code that solves it; nothing speculative.
3. Surgical changes — touch only what's needed; match existing style; don't refactor what isn't broken.
4. Goal-driven — define success criteria and loop until ALL are verified (not just the happy path).
5. Model only for judgment — deterministic logic belongs in plain code, not the model.
6. Token budgets aren't advisory — if over budget, summarize and surface it.
7. Surface conflicts, don't average — pick one pattern, explain why, flag the other.
8. Read before you write — read the file, its caller, and shared utils; understand the ROOT CAUSE before patching (no band-aids).
9. Tests verify intent — a test must fail when the business logic breaks.
10. Checkpoint after each step — be able to restate what's done / verified / left.
11. Match conventions even if you disagree — conformance > taste inside the codebase.
12. FAIL LOUD — "it works" is FALSE until you've verified every success criterion INCLUDING the edge cases, with evidence. Do not claim done, fixed, or verified otherwise.
EOF
jq -n --arg ctx "$RULES" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$ctx}}'
