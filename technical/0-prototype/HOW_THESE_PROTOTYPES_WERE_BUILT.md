# How These Prototypes Were Built — A Guide for Reuse

This document explains how the two Ergos Continental UI prototypes (Agency Booking App + Backoffice Admin) were built using Claude Code, so you can replicate and extend the approach for your own projects.

---

## What Was Produced

### 1. Agency Booking App (`agencyapp-prototype/3-prototype/`)

A fully interactive 11-screen hotel booking flow:

| Screen | What It Does |
|--------|-------------|
| Home / Search | Unified search with autocomplete, date picker, multi-room occupancy selector, trending destination chips |
| Search Results | Hotel cards with meal plan, cancellation policy, price. Sidebar filters (stars, price, meal, cancellation). Sort options |
| Hotel Detail | Photo gallery, amenities, review scores, multiple room/rate combinations per room type |
| Guest Info | Lead guest form, special requests, terms acceptance |
| Add Services | Airport transfer cross-sell with vehicle search (6 types), one-way/round-trip, markup preview |
| Payment | Order summary, payment method selection, price breakdown |
| Confirmation | Booking reference, confetti animation, full summary, email confirmation |
| My Bookings | Persistent booking list across sessions, status badges, combined trip display |
| Booking Detail | Full info, timeline, modify/cancel actions |
| Voucher Preview | Printable voucher, EN/ES language toggle, PDF download |
| Invoice Preview | Professional invoice with line items, EN/ES toggle, PDF download |

Plus: Modify Booking modal (dates, rooms, transfers) and 2-step Cancel flow (policy review, reason, confirmation).

### 2. Backoffice Admin (`backoffice-prototype/`)

An admin panel with these screens:

| Screen | What It Does |
|--------|-------------|
| Login | Role-based login (Admin, Agency, Sales Agent) |
| Dashboard | KPIs with charts (uses Chart.js) |
| BO Users | Backoffice user management |
| Roles | Role and permission management |
| Agencies | Travel agency management |
| Employees | Agency employee management |
| Hotels | Hotel inventory management |
| Reservations | Booking/reservation list and management |
| Sales Agents | Sales agent management |
| Commission Policy | Commission configuration |

### Tech Stack

Both prototypes are **vanilla HTML + CSS + JS** — no frameworks, no build step. Each prototype is 3 files:

```
index.html   — all screens in one file, shown/hidden via JS
styles.css   — all styling
app.js       — all interactivity, state management, mock data
```

This was intentional: a single HTML file can be opened in any browser, zipped and emailed, or deployed to any static host. No `npm install`, no bundler, no dependencies (except Google Fonts CDN and Chart.js CDN for the backoffice charts).

---

## The Process — How to Reproduce This

### Prerequisites

- **Claude Code** (CLI subscription) — install via `npm install -g @anthropic-ai/claude-code` or see [claude.ai/claude-code](https://claude.ai/claude-code)
- A text editor / IDE (VS Code recommended — Claude Code integrates with it)
- A browser to preview the output

### Step 1: Set Up Your Project Folder

Create a working directory for your prototype:

```bash
mkdir my-prototype && cd my-prototype
```

### Step 2: Prepare Your Context Documents

This is the most important step. The quality of the prototype is directly proportional to the quality of context you feed Claude. For the Ergos prototypes, the context included:

- **Solution architecture document** — described the multi-GDS aggregator, fan-out search, vendor adapters, booking flow, multi-tenancy model
- **Existing backend API routes** — so the prototype screens matched real API endpoints
- **Business requirements** — what an agency booking agent needs to do day-to-day
- **Vendor details** — Juniper, Hotetec, Dingus, Restel integration specifics
- **Role definitions** — ADMIN, AGENCY_OWNER, TRAVEL_AGENT, SALES_AGENT and what each can access

Put these documents in your project folder or a `docs/` subfolder. Claude Code can read local files, so it will use them as context.

**Tip:** If you have an existing codebase (API, database schemas, etc.), point Claude Code at it. It will read the actual code and make the prototype match your real data structures.

### Step 3: Create a Custom Agent (Optional but Recommended)

For the Ergos prototypes, a custom agent was configured at `.claude/agents/travel-disruption-strategist.md`. This is a Claude Code feature that lets you define a specialized persona with persistent memory.

To create your own:

```bash
mkdir -p .claude/agents
```

Create a markdown file (e.g., `.claude/agents/ux-prototyper.md`) with this structure:

```markdown
---
name: ux-prototyper
description: "Use this agent for building interactive UI prototypes..."
model: opus
color: cyan
memory: project
---

You are a senior UX engineer and product designer specializing in
[your domain]. You build interactive HTML/CSS/JS prototypes that
demonstrate complete user flows.

**Context about the product**: [Describe your product, users, domain]

**Design principles**: [Your brand guidelines, design system, etc.]

**Technical constraints**:
- Output vanilla HTML/CSS/JS (no frameworks)
- Single-page apps with screen switching
- Include realistic mock data
- Mobile-responsive
```

The `memory: project` setting means the agent remembers context across sessions — so each iteration builds on the last.

### Step 4: Start Claude Code and Prompt

Open your terminal in the project directory and launch Claude Code:

```bash
claude
```

Then give it a detailed prompt. Here's the pattern that worked for the Ergos prototypes:

```
Build an interactive HTML/CSS/JS prototype for [your product name].

Context:
- Read the architecture doc at docs/solution-architecture.md
- Read the API routes at src/routes/
- This is a [describe your product] used by [describe your users]

Screens needed:
1. [Screen name] — [what it shows, key interactions]
2. [Screen name] — [what it shows, key interactions]
...

Design requirements:
- Modern, clean design with [your brand colors/fonts]
- Responsive (works on desktop and tablet)
- Realistic mock data (not "Lorem ipsum")
- Interactive: buttons navigate between screens, forms validate,
  filters actually filter, sorts actually sort
- Toast notifications for user feedback
- Loading states / skeleton screens where appropriate

Output as 3 files: index.html, styles.css, app.js
No frameworks, no build step. Must work by opening index.html in a browser.
```

### Step 5: Iterate

The first output will be good but not perfect. Iterate with follow-up prompts:

```
- "Add a transfer cross-sell step between guest info and payment"
- "The search results need sidebar filters for star rating and price range"
- "Add a 2-step cancellation flow with policy review"
- "Make the voucher bilingual (English/Spanish toggle)"
- "The booking list should persist across sessions using localStorage"
```

Each prompt refines the prototype. Claude Code edits the existing files in place — it doesn't start from scratch each time.

### Step 6: Review in Browser

After each iteration, open `index.html` in your browser to test. If something looks wrong or behaves unexpectedly, describe the issue to Claude Code and it will fix it.

---

## Key Lessons Learned

### What Worked Well

1. **Rich context = better output.** Feeding in the actual solution architecture doc and real API schemas meant the prototype naturally matched the backend data model. Screen fields, filter options, and booking states all aligned with the real system.

2. **Single-file architecture scales surprisingly far.** The agency app has 11 screens, modals, cross-sell flows, localStorage persistence, autocomplete, and bilingual support — all in 3 files. No build tooling overhead.

3. **Iterative refinement beats big-bang prompts.** Start with the core flow (search → results → detail → book → confirm), get that working, then layer on features (transfers, modify, cancel, vouchers, invoices). Each iteration took minutes.

4. **Mock data matters.** Asking for "realistic" hotel names, prices, and destinations (not placeholder text) made the prototype immediately useful for stakeholder demos and UX review.

5. **The custom agent with persistent memory** meant you didn't have to re-explain the product context every session. Start a new session, and it already knew the product, the domain, the design decisions.

### What to Watch Out For

1. **File size limits.** As the prototype grows, the JS file can get large (5000+ lines). If Claude starts truncating or losing track, consider splitting into modules or giving focused prompts ("only modify the cancellation flow, don't touch other screens").

2. **State management in vanilla JS** gets complex with many screens. The Ergos prototype uses a global state object and `showScreen()` function — simple but effective. If your prototype needs more complex state, consider asking Claude to use a minimal state management pattern up front.

3. **CSS conflicts.** With everything in one file, class names can collide. The prototypes use prefixed class names (e.g., `proto-toolbar`, `login-wrap`, `booking-card`) to avoid this.

4. **Test in multiple browsers.** Claude defaults to Chrome-friendly CSS. If you need Safari or Firefox support, mention it explicitly.

---

## File Structure Reference

```
0-prototype/
├── agencyapp-prototype/
│   ├── .claude/
│   │   └── agents/
│   │       └── travel-disruption-strategist.md    # Custom agent definition
│   ├── 3-prototype/
│   │   ├── index.html                             # All 11 screens
│   │   ├── styles.css                             # All styling
│   │   ├── app.js                                 # All logic + mock data
│   │   ├── PROTOTYPE_FEATURES.md                  # Feature list (EN/ES)
│   │   ├── ERGOS_API_PLATFORM_PLAN.md             # API monetization plan
│   │   ├── screenshots/                           # Screen captures
│   │   │   ├── 01-home-search.png
│   │   │   ├── 02-search-results.png
│   │   │   ├── ... (14 screenshots)
│   │   └── Ergos_Continental_Prototype_Features.pdf
│   ├── 3-prototype.zip                            # Packaged for sharing
│   └── 3-prototype-v1.1.zip                       # Version with transfers
│
├── backoffice-prototype/
│   ├── index.html                                 # All admin screens
│   ├── styles.css                                 # Admin styling
│   ├── app.js                                     # Admin logic + charts
│   └── commission-config.html                     # Separate commission page
│
└── HOW_THESE_PROTOTYPES_WERE_BUILT.md             # This file
```

---

## Quick-Start Template

If you want to build a similar prototype for a different product, copy-paste this into Claude Code:

```
I need an interactive HTML/CSS/JS prototype. No frameworks, no build step.
Output: index.html, styles.css, app.js — opening index.html in a browser
should show the full working prototype.

Product: [Name]
Users: [Who uses it and what they do]
Domain: [Industry/vertical]

Screens:
1. [Screen] — [Description]
2. [Screen] — [Description]
3. [Screen] — [Description]

Design:
- Font: DM Sans (Google Fonts)
- Style: Clean, modern, professional
- Colors: [Primary hex], [Secondary hex], [Accent hex]
- Responsive: Desktop + tablet
- Include realistic mock data
- Toast notifications for actions
- Loading skeletons for async operations

For each screen, make all buttons, filters, sorts, and forms
fully interactive. Navigation between screens should feel like
a real app.
```

Then iterate from there.