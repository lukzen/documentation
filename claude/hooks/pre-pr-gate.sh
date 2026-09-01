#!/usr/bin/env bash
# PreToolUse(Bash) gate: refuses `gh pr create` unless pre-PR evidence exists
# and is FRESH for the current HEAD. Evidence = .claude/pr-evidence/<branch>.md
# in the repo, containing the review-agent verdicts and local end-to-end run
# output. Enforces the Ergos pipeline: code -> code-simplifier ->
# review-robustness + review-testquality -> local e2e evidence -> PR.
# Fail-safe: unparseable input or non-PR commands emit nothing (normal flow).

input=$(cat)

parsed=$(printf '%s' "$input" | python3 -c 'import sys,json
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input",{}).get("command","").replace("\n"," "))
    print(d.get("cwd",""))
except Exception:
    pass' 2>/dev/null)
cmd=$(printf '%s' "$parsed" | sed -n 1p)
cwd=$(printf '%s' "$parsed" | sed -n 2p)

# Only gate PR creation.
case "$cmd" in
  *"gh pr create"*) ;;
  *) exit 0 ;;
esac

deny() {
  printf '%s' "$1" | python3 -c 'import sys,json
print(json.dumps({"hookSpecificOutput":{"hookEventName":"PreToolUse",
  "permissionDecision":"deny",
  "permissionDecisionReason":sys.stdin.read()}}))'
  exit 0
}

[ -n "$cwd" ] && cd "$cwd" 2>/dev/null
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0   # not a repo -> normal flow
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
head=$(git rev-parse HEAD 2>/dev/null) || exit 0
evfile="$root/.claude/pr-evidence/$(printf '%s' "$branch" | tr '/' '-').md"

if [ ! -f "$evfile" ]; then
  deny "PRE-PR GATE: no evidence file at $evfile. Before opening a PR: (1) run code-simplifier, (2) run review-robustness and review-testquality to GO, (3) run the tests + an end-to-end check locally, then write the evidence file with sections 'review-robustness', 'review-testquality', 'Local run evidence' and the line 'HEAD: $head'. Paste its content into the PR body."
fi

missing=""
grep -qi "review-robustness" "$evfile" || missing="$missing review-robustness-verdict"
grep -qi "review-testquality" "$evfile" || missing="$missing review-testquality-verdict"
grep -qi "local run evidence" "$evfile" || missing="$missing local-run-evidence"
if [ -n "$missing" ]; then
  deny "PRE-PR GATE: evidence file $evfile is missing sections:$missing. Complete the pipeline before opening the PR."
fi

if ! grep -q "HEAD: $head" "$evfile"; then
  deny "PRE-PR GATE: evidence is STALE — it does not reference the current commit ($head). Code changed after review/testing: re-run the review agents and the local end-to-end check against HEAD, update the evidence file, then retry."
fi

exit 0   # evidence present and fresh -> normal permission flow
