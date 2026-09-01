# Claude Code at Ergos — shared team setup

One setup for everyone so Claude behaves the same on every machine. Two layers:

| Layer | Lives in | How you get it |
|---|---|---|
| **User-level** (hooks, guardrails, agents, skill) | `~/.claude/` | `./install.sh` from this folder — re-run after `git pull` |
| **Repo-level** (CLAUDE.md, `.github/copilot-instructions.md`, docs-check hooks, permissions) | each repo | automatic with `git clone` |

## Install

```bash
cd documentation/claude && ./install.sh
```

Then enable the plugins it lists (`/plugin`) and restart your session.

## What the user-level pieces do

- **`hooks/karpathy-reminder.sh`** (PreToolUse on Edit/Write) + **`skills/karpathy-guidelines`** (every prompt): inject the 12 LLM-coding rules — think before coding, surgical changes, fail loud, verify with evidence before claiming done.
- **`hooks/gate-bash.sh`** (PreToolUse on Bash): auto-approves non-destructive commands; forces a confirmation prompt on destructive/outward-facing ones (`rm`, `terraform apply`, `git push`, `sudo`, …). Fail-safe: unparseable → normal prompt.
- **`agents/`** — the five house agents:
  - `infra-expert` — Terraform / K8s / CI work
  - `ui-architect-designer` — React/TS component and UI-architecture work
  - `review-robustness` + `review-testquality` — the **mandatory pre-PR review pair** (correctness/security lens + test-quality/UX lens)
  - `business-aware-qa-analyst` — validates behavior against business rules, spec-vs-artifact sync reviews

## The working agreement (how we drive Claude here)

1. **Spec first.** No implementation task — human or agent — without citing the spec section and the Gherkin AC it implements (e.g. F1: spec §3 / AC2). If there is no spec, the first deliverable is one.
2. **Verify locally before commit/push.** Run the thing (tests, build, boot) and show evidence. Syntax/type checks alone don't count. For docs: build the portal locally (`technical-docs/site: make html`) and grep `dist/` before pushing.
3. **Per-PR agent pipeline — ENFORCED**: code → `code-simplifier` (cleaner) → `review-robustness` + `review-testquality` (hardener/QA) → local tests **and an end-to-end run** → one Copilot round. A PreToolUse hook (`pre-pr-gate.sh`) **blocks `gh pr create`** unless `.claude/pr-evidence/<branch>.md` exists with the two agent verdicts, the local run evidence, and a `HEAD: <sha>` line matching the current commit (stale evidence = denied). Paste the evidence into the PR body. Copilot findings: mechanics applied, business-logic re-derived against the spec, never applied blind.
4. **Commit hygiene**: commitlint — subject starts lowercase, ≤100 chars; succinct body (~3 lines); **no AI attribution lines**. After any scripted commit, check `git log` — a failed commit followed by `git push` masks silently.
5. **Docs are part of Definition of Done**: update the change's doc surface in the same stream, timestamped newest-first. Diagrams are drawio → exported PNG (never mermaid); rename the exported file on every revision (caches serve stale PNGs at the same URL).
6. **Money/vendor code rules** (backend non-negotiables, enforced in `copilot-instructions.md`): route → service → repository → model layering; vendor data is untrusted; non-idempotent vendor writes use `maxRetries: 0`; percentages are 0–100 via `@shared/kernel/percent`; log via the shared logger.
7. **Decisions**: present as a literal question + short lettered options + "My pick: (x)" — never buried in prose. Destructive or outward-facing actions (publish, push to a ticket, infra mutation) wait for a human go unless pre-authorized.
8. **TDD for new business logic**: handlers, derivations, and validations ship with a test written FROM the AC before or with the implementation — tests that trail the code are a review finding. Refactors with before/after proof are exempt. For new pure-logic modules, close the story with a scoped **mutation audit** (Stryker on those files once green; kill survivors; record the score in the PR evidence file).
9. **Never bypass gates**: `--no-verify` is never suggested or used — if a hook blocks wrongly, fix the hook, don't skip it.
10. **Don't invent product scenarios.** When a spec gap tempts you (or Claude) to design a state/notification/UX nobody asked for: stop and ask, with options. Default = fewest states, close the flow asap.

## Keeping it in sync

The canonical copies live here. Changing a hook/agent/rule = PR to this folder, everyone re-runs `install.sh`. Don't hand-edit `~/.claude` copies — they'll be overwritten.
