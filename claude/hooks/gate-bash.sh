#!/usr/bin/env bash
# PreToolUse(Bash) gate for Claude Code.
#
# Auto-approves non-destructive commands so Claude keeps working without
# prompting, and forces the normal confirmation prompt ("ask") on destructive or
# outward-facing operations (anything that mutates live infra, publishes,
# deletes, spends money, or is hard to undo).
#
# Fail-safe: if the command can't be parsed, it emits nothing and exits 0, which
# falls back to Claude Code's normal permission flow (i.e. it will prompt) rather
# than silently allowing.
#
# Tune the DESTRUCTIVE regex below to taste. Matching is CASE-SENSITIVE so that
# env vars like AWS_ACCESS_KEY_ID don't trip the lowercase `aws` CLI pattern.

input=$(cat)

cmd=$(printf '%s' "$input" | python3 -c 'import sys,json
try:
    print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception:
    pass' 2>/dev/null)

# Couldn't extract a command -> fall through to normal permission handling.
[ -z "$cmd" ] && exit 0

# Destructive / outward-facing patterns -> ask for confirmation.
DESTRUCTIVE='(^|[;&|[:space:]])rm[[:space:]]|(^|[;&|[:space:]])rmdir[[:space:]]|[[:space:]]dd[[:space:]]+if=|mkfs|(^|[;&|[:space:]])shred[[:space:]]|chmod[[:space:]]+-R|chown[[:space:]]+-R|(^|[;&|[:space:]])sudo[[:space:]]'
DESTRUCTIVE="$DESTRUCTIVE"'|terraform.*[[:space:]](apply|destroy)([[:space:]]|$)|terraform.*state[[:space:]]+rm|terraform.*[[:space:]]import[[:space:]]'
DESTRUCTIVE="$DESTRUCTIVE"'|git[[:space:]]+push|git.*reset[[:space:]]+--hard|git.*[[:space:]]clean[[:space:]]|git[[:space:]]+rebase[[:space:]]|filter-repo'
DESTRUCTIVE="$DESTRUCTIVE"'|kubectl.*[[:space:]](delete|apply|patch|replace|scale|drain|cordon|edit|exec|cp)([[:space:]]|$)|kubectl.*rollout[[:space:]]+restart'
DESTRUCTIVE="$DESTRUCTIVE"'|docker.*[[:space:]](push|rmi)([[:space:]]|$)|docker.*[[:space:]]prune'
DESTRUCTIVE="$DESTRUCTIVE"'|helm.*[[:space:]](install|upgrade|uninstall|delete|rollback)([[:space:]]|$)'
DESTRUCTIVE="$DESTRUCTIVE"'|gh.*secret[[:space:]]+(set|delete)|gh.*variable[[:space:]]+(set|delete)|gh.*[[:space:]]delete([[:space:]]|$)|gh[[:space:]]+pr[[:space:]]+merge|gh[[:space:]]+release'
DESTRUCTIVE="$DESTRUCTIVE"'|(^|[;&|[:space:]])aws[[:space:]]'
DESTRUCTIVE="$DESTRUCTIVE"'|-X[[:space:]]*(POST|PUT|DELETE|PATCH)|--request[[:space:]]+(POST|PUT|DELETE|PATCH)|purge_cache|purge_everything'
DESTRUCTIVE="$DESTRUCTIVE"'|minikube.*[[:space:]](delete|stop)([[:space:]]|$)'

if printf '%s' "$cmd" | grep -qE "$DESTRUCTIVE"; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Destructive/outward-facing command — confirm before running."}}'
else
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Auto-approved non-destructive command."}}'
fi
exit 0