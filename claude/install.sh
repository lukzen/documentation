#!/usr/bin/env bash
# Ergos team Claude Code setup — idempotent installer.
# Copies the shared hooks, skill and agents into ~/.claude and merges the hook
# wiring into ~/.claude/settings.json (backing it up first). Safe to re-run
# after every `git pull` of the documentation repo.
set -euo pipefail
cd "$(dirname "$0")"

CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/skills/karpathy-guidelines" "$CLAUDE_DIR/agents" \
         "$CLAUDE_DIR/agent-memory/infra-expert" "$CLAUDE_DIR/agent-memory/ui-architect-designer" \
         "$CLAUDE_DIR/agent-memory/business-aware-qa-analyst"

echo "→ hooks"
cp -f hooks/gate-bash.sh hooks/karpathy-reminder.sh hooks/pre-pr-gate.sh "$CLAUDE_DIR/hooks/"
chmod +x "$CLAUDE_DIR/hooks/"*.sh

echo "→ karpathy-guidelines skill"
cp -f skills/karpathy-guidelines/SKILL.md "$CLAUDE_DIR/skills/karpathy-guidelines/"

echo "→ agents (5)"
cp -f agents/*.md "$CLAUDE_DIR/agents/"

echo "→ merging hooks into settings.json (backup kept)"
python3 - <<'PY'
import json, os, shutil, time
home = os.path.expanduser("~")
settings_path = os.path.join(home, ".claude", "settings.json")
fragment = json.load(open("settings/hooks-fragment.json"))
# expand ~ in commands so settings carry absolute paths (hooks run non-interactively)
def expand(o):
    if isinstance(o, dict):  return {k: expand(v) for k, v in o.items()}
    if isinstance(o, list):  return [expand(v) for v in o]
    if isinstance(o, str):   return o.replace("~/", home + "/")
    return o
fragment = expand(fragment)
settings = {}
if os.path.exists(settings_path):
    shutil.copy(settings_path, settings_path + ".bak." + time.strftime("%Y%m%d%H%M%S"))
    settings = json.load(open(settings_path))
hooks = settings.setdefault("hooks", {})
for event, entries in fragment["hooks"].items():
    existing = hooks.setdefault(event, [])
    for entry in entries:
        cmds = {h["command"] for e in existing for h in e.get("hooks", [])}
        if not any(h["command"] in cmds for h in entry["hooks"]):
            existing.append(entry)
json.dump(settings, open(settings_path, "w"), indent=2)
print("   settings.json merged")
PY

cat <<'EOF'

✔ Installed. Two manual steps remain:

1. PLUGINS — in any Claude Code session run /plugin and enable (marketplace: claude-plugins-official):
   playwright · superpowers · code-simplifier · security-guidance · code-review ·
   explanatory-output-style · remember · frontend-design

2. RESTART your Claude Code session so hooks and agents load.

Per-repo rules (CLAUDE.md, .github/copilot-instructions.md, docs-check hooks)
arrive automatically when you clone the repos — nothing to install for those.
Read claude/README.md for the working agreement.
EOF
