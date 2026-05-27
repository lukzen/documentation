# Commission Management Guide — screenshots

This folder holds the real-app PNG screenshots referenced from
`../commission-management-guide.html`. While a file is missing, the guide
shows a diagonal-striped placeholder block, so the doc stays presentable.

## How to capture

1. Run the backoffice app (`make backoffice` from `agency-app/`).
2. Sign in as an admin and navigate to each screen below.
3. Use your OS screenshot tool to capture each panel.
4. Save under the exact filename shown — the doc references them by name.
5. Hard-refresh `commission-management-guide.html` to see the embedded images.

## Required files

| Filename | What to capture | Source screen |
|---|---|---|
| `01-commission-policy-full.png` | The full 3-panel layout — left scope rail with hotels list, center 5 layer cards, right Simulate panel | `/commission-policy` (Hotels tab, select Meliá Barcelona) |
| `02-hotel-layer-card.png` | Just the Hotel layer card (Layer 2) — show the chain dropdown, baseCommission input, priceAdjustment input, and the "Overridden" badge | `/commission-policy` (zoom into one card) |
| `03-tier-layer-locked.png` | Just the Tier card (Layer 4) — the read-only one with the 🔒 "Policy constant" badge, showing the tier's earning range and default ops | `/commission-policy` (zoom into the tier card) |
| `04-simulate-panel.png` | Right-rail Simulate panel — supplier net input at top, full waterfall (cost → sell → gross → net), then the 3 traffic-light guardrail indicators | `/commission-policy` (right rail) |
| `05-save-confirm-modal.png` | The SaveConfirmModal — diff table on top, post-edit guardrail status, reason textarea if soft guardrail breached | `/commission-policy` (edit something, click "Review and Save") |
| `06-commission-chains-grid.png` | Full Chains page — grid of chain cards with status badges, price adjustments, and linked hotel counts | `/commission-chains` |
| `07-chain-card-detail.png` | One chain card up close — Meliá or Iberostar with all 4 action buttons visible (Edit / Manage Hotels / Apply / Delete) | `/commission-chains` (zoom into one card) |
| `08-bulk-edit-drawer.png` | The Bulk Edit drawer — filter form on top, diff preview table, typed-confirm input | `/commission-policy` → click "Bulk Edit" header action |
| `09-audit-drawer.png` | The full Audit drawer — date/scope/admin filters, paginated entry list | `/commission-policy` → click "Audit Trail" header action |
| `10-agency-pnl.png` | Agency P&L screen showing markup + rebate breakdown | agency-app `/p&l` (optional — referenced in section 6.5) |

## Tips

- Use a consistent viewport (1440×900 is common). The CSS lets images
  scale down on narrow screens.
- PNG is preferred over JPG for crisp UI text. Aim for ~150-300 KB per file.
- If a screenshot needs annotations (arrows, callouts), use any image
  editor and bake them into the PNG.
- Filenames are case-sensitive and matched literally by the doc — keep
  them exactly as listed.

## What to do if you rename or add screenshots

The image paths live in `commission-management-guide.html`. Search for
`commission-screenshots/` to find every `<img>` tag and update accordingly.
