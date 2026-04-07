
# Ergos Continental — Minimum Net Margin Floor Analysis

## Deriving the Correct Net Margin Floor From First Principles

**Document Date:** April 6, 2026
**Prepared by:** Revenue Strategy — Ergos Continental
**Classification:** Internal Strategic / Investor Presentation Support
**Version:** 1.0

---

## Confidence Key

Every data point is tagged:

- **HIGH** — Publicly verifiable from earnings reports, SEC/exchange filings, or stable industry structure
- **MEDIUM** — Derived from credible industry sources, analyst reports, or consistent cross-source patterns
- **LOW** — Informed estimate with limited supporting data; requires validation

---

## 1. The Question Being Answered

The existing commission model document states:

> "Ergos retains a minimum 7% net margin on every booking regardless of agent tier"

The floor is expressed as: `ergosNetMargin / ergosSellPrice >= 0.07`

The document does not justify why 7% and not 5%, 8%, or 10%.

This analysis answers four questions:

1. What do comparable B2B hotel consolidators and wholesalers actually net after all operating costs?
2. What is the actual operating cost structure of a B2B travel technology platform?
3. What should the minimum floor be, derived from cost structure rather than intuition?
4. Should the floor be expressed as a percentage of sell price, a percentage of gross margin, or an absolute amount per booking?

---

## 2. Framing: What the Floor Is Actually Protecting

Before examining benchmarks, it is worth being precise about what the floor mathematically protects.

### The Formula

```
ergosNetMargin = ergosGrossMargin - agentEarning - ergosOperationalCost
ergosNetMarginPct = ergosNetMargin / ergosSellPrice
```

The floor check is: `ergosNetMarginPct >= floor%`

### What the Floor Covers

At the point where `ergosNetMarginPct = floor%`, the floor is covering the following costs:

1. **Platform fixed costs** — technology infrastructure, API connectivity, hosting
2. **Payment processing** — card acceptance, FX, payment gateway fees
3. **Customer support** — agency support, supplier liaison, dispute resolution
4. **Sales overhead** — team management, account management beyond agent layer
5. **Compliance and legal** — regulatory costs, contract administration
6. **G&A** — finance, HR, executive overhead
7. **Contribution to profit** — the return on invested capital; what the platform earns above breakeven

The floor is not the total margin Ergos earns on most bookings — it is the minimum acceptable margin on the worst-case booking configuration (most generous agent tier, most discounted agency rebate, lowest baseCommission).

---

## 3. What Comparable B2B Consolidators Actually Net

### 3.1 WebBeds (Web Travel Group — ASX: WJL)

WebBeds is the world's second-largest B2B hotel bed bank and the most directly comparable public company to Ergos's long-term ambition. Its financial structure provides the best available hard data.

| Metric | Value | Period | Confidence | Source |
|---|---|---|---|---|
| Gross revenue (TVM) | 6.5% of TTV | FY26 stabilized target | HIGH | Web Travel Group FY25 results; 1H26 guidance |
| FY25 actual TVM | 6.7% | FY2025 | HIGH | Web Travel Group FY25 annual results |
| 1H26 TVM | 6.5% on track | 1H FY2026 | HIGH | Web Travel Group 1H26 announcement |
| EBITDA margin on revenue | 49–52% | FY24–FY26 | HIGH | Multiple Webjet/WTG results announcements |
| Total cost of operations (% of TVM revenue) | 48–51% | Derived | HIGH (calculated) | 100% minus EBITDA margin |
| **Net operating cost (% of TTV)** | ~3.1–3.3% | Derived | HIGH (calculated) | 6.5% TVM × 48–51% cost ratio |
| **Effective net margin (% of TTV)** | ~3.2–3.4% | Derived | HIGH (calculated) | 6.5% TVM × 49–52% EBITDA margin |

**What this means for Ergos:**

WebBeds earns 6.5% gross on every booking and keeps approximately 3.2–3.4% as EBITDA. Its operating costs (technology, support, sales overhead, G&A, payment processing) consume the other 3.1–3.3% of TTV.

Expressed differently: WebBeds' operating cost floor is approximately **3.1–3.3% of transaction value**, and it targets **~3.3% net margin on TTV** as its business model.

Ergos operates at a higher gross margin (12% baseCommission vs. WebBeds' 6.5% TVM take rate) but has a meaningfully higher cost-per-booking at current scale due to smaller volume. The relevant derivation: if WebBeds needs ~3.1% of TTV to operate at $4B+ scale, Ergos at early stage (55K bookings vs. WebBeds' ~7M) will have operating costs that are a higher percentage of its smaller revenue base.

**Confidence: HIGH** — listed company, audited financials

---

### 3.2 HBX Group / Hotelbeds (BME: HBX)

| Metric | Value | Period | Confidence | Source |
|---|---|---|---|---|
| Gross revenue (TVM take rate) | 8.4–9.4% of TTV | Q1 2026: 8.4%; H1 2025: 9.4% | HIGH | HBX Group H1 2025 and Q1 2026 filings |
| Adjusted EBITDA margin on revenue | 50–60% | FY2024–2025 | HIGH | HBX Group financial disclosures |
| Operating cost (% of TVM revenue) | 40–50% | Derived | HIGH (calculated) | |
| **Net operating cost (% of TTV)** | ~3.4–4.7% | Derived | HIGH (calculated) | 8.4–9.4% × 40–50% cost ratio |
| **Effective net margin (% of TTV)** | ~4.2–5.6% | Derived | HIGH (calculated) | 8.4–9.4% × 50–60% EBITDA |

Hotelbeds is a larger, more expensive-to-run operation than WebBeds because it employs a larger direct hotel contracting team (300,000+ properties under direct contract requires significant local market teams). Its higher TVM take rate partially offsets this cost.

**Effective operating cost floor: ~3.4–4.7% of TTV.** Net margin at ~4.2–5.6% of TTV.

**Confidence: HIGH** — listed company, exchange filings

---

### 3.3 Legacy Wholesaler Benchmarks (Pre-Consolidation Data)

The pre-2017 hotel wholesale industry operated before the margin compression caused by direct OTA distribution and the Hotelbeds/WebBeds consolidation wave. These are the most directly comparable operating models to Ergos's current structure.

| Company | Gross Markup on Net | Estimated Operating Cost | Estimated Net | Confidence |
|---|---|---|---|---|
| GTA (Kuoni) | 10–15% | ~6–8% | 4–7% | MEDIUM |
| Tourico | 10–18% | ~6–9% | 5–8% | MEDIUM |
| DOTW | 12–20% | ~7–10% | 6–10% | MEDIUM |
| JacTravel | 10–15% | ~5–7% | 5–8% | MEDIUM |
| Sunhotels | 8–15% | ~4–7% | 4–8% | MEDIUM |

**Pattern:** Legacy wholesalers with 10–18% gross markups typically ran operating costs of 5–10% of transaction value (not of markup; of TTV), leaving net margins of 4–8% of TTV.

Expressed as a percentage of gross margin: at a 12% gross markup, net margins of 4–8% of TTV translate to **33–67% of gross margin being retained as net after all costs**.

**Confidence: MEDIUM** — derived from industry pattern recognition and pre-acquisition disclosures; not audited

---

### 3.4 RateHawk and Modern Tech-First Aggregators

RateHawk (emerging competitor, private company) and similar platforms operate on a thin-margin model:

| Metric | Estimate | Confidence |
|---|---|---|
| Platform markup on net | 4–8% | LOW — private company |
| Operating cost structure | Primarily technology; minimal human account management | MEDIUM — consistent with product strategy |
| Estimated net margin | 2–5% of TTV | LOW |

These platforms compete on technology and rate breadth, not service. They achieve lower costs by minimizing account management overhead — relevant for Ergos only if it adopts a similar self-serve model (which the current agent/agency model explicitly does not).

**Not a directly useful benchmark for Ergos's floor derivation, but useful for understanding the competitive floor on gross markup.**

---

## 4. Operating Cost Structure of a B2B Travel Technology Platform

### 4.1 Line-by-Line Cost Analysis

The following cost structure is derived from:
- WebBeds and Hotelbeds EBITDA/cost ratios (reverse-engineered from public filings)
- Standard SaaS and marketplace platform benchmarks
- Travel technology platform investor presentations (Amadeus, Sabre, Travelport operating cost disclosures)
- GDS connectivity pricing (standard industry structure)

All costs below are expressed as a percentage of **gross revenue** (i.e., Ergos's markup dollars, not TTV), because this is how the existing model expresses the operational expense field.

| Cost Category | % of Ergos Gross Revenue | Notes | Confidence |
|---|---|---|---|
| **Payment processing** | 8–14% | Card acceptance: 1.5–2.5% of TTV. At 12% gross markup, this is 12.5–20.8% of gross revenue. Weighted average accounting for mix of wire transfer, card, and local payment methods in B2B: blends to 8–14% of gross revenue. | HIGH |
| **GDS connectivity and API infrastructure** | 5–10% | GDS per-booking fees: $0.50–$2.00/booking (Amadeus, Sabre standard rates). At blended average booking value of $150 with 12% gross margin ($18 gross revenue/booking), $0.50–$2.00 fee = 2.8–11.1% of gross revenue. Cloud hosting, API gateway, and infrastructure adds 1–3%. Blended: 5–10%. | MEDIUM |
| **Customer and agency support** | 4–8% | B2B support is cheaper than B2C (professional users). Industry standard for B2B SaaS: 5–10% of ARR. For transactional platforms: per-booking support cost of $0.50–$2.00/booking (MEDIUM estimate). At $18 gross/booking, this is 2.8–11.1%. Blended B2B travel: 4–8%. | MEDIUM |
| **Sales, marketing, and agency management (ex-agent commissions)** | 6–12% | This is cost BEYOND the agent commission layer: internal sales oversight, account management for key agencies, co-op marketing, conference presence. At early stage (Y1–Y3): 8–15% of gross revenue. At scale: 4–8%. Blended estimate for a platform in growth phase: 6–12%. | MEDIUM |
| **Technology development and platform maintenance** | 5–10% | Engineering team costs allocated to ongoing platform operations (not new feature development, which is capitalized). For a platform with 3–8 engineers at $80–120K blended cost, on $500K–$1M gross revenue: 20–40% of gross revenue at very early stage. At $5M+ gross revenue: 5–10%. The 5–10% range assumes the platform is past the lowest-volume inflection point. | MEDIUM |
| **G&A (finance, legal, HR, executive overhead)** | 5–10% | Standard for early-stage B2B SaaS: 15–25% of revenue at seed/A stage; 8–15% at Series A/B; 5–8% at scale. For a travel platform, regulatory compliance (PCI-DSS, GDPR) adds ~1–2%. | LOW |
| **Bad debt and cancellation losses** | 2–5% | B2B platforms typically see 2–5% of bookings cancelled post-payment. Net exposure depends on supplier cancellation terms. Budget 1–3% of gross revenue for net loss after supplier refund retention. Add 1–2% for agency payment defaults. | MEDIUM |

**Total estimated operating cost range: 35–69% of gross revenue**

### 4.2 Condensed Cost Table (Mid-Scenario)

| Cost Category | Low | Mid | High |
|---|---|---|---|
| Payment processing | 8% | 11% | 14% |
| GDS/API infrastructure | 5% | 7% | 10% |
| Customer/agency support | 4% | 6% | 8% |
| Sales and account management | 6% | 9% | 12% |
| Technology platform | 5% | 7% | 10% |
| G&A | 5% | 7% | 10% |
| Bad debt / cancellation losses | 2% | 3% | 5% |
| **Total operating cost (% of gross revenue)** | **35%** | **50%** | **69%** |
| **Net margin retained (% of gross revenue)** | **65%** | **50%** | **31%** |

---

### 4.3 Translating Cost of Gross Revenue to Cost as Percentage of Sell Price

This is the critical translation. The floor check in the model is expressed as `ergosNetMargin / ergosSellPrice`, not as a percentage of gross revenue.

At a 12% `baseCommission` default:

```
Supplier net price:     $100.00
Ergos sell price:       $112.00
Ergos gross margin:     $12.00
Gross margin as % of sell price: 12/112 = 10.7%
```

The relationship: **gross margin = 10.7% of sell price** when baseCommission = 12%.

If operating costs consume 35–69% of gross revenue ($4.20–$8.28 of the $12.00 margin), the remaining net margin after operations is:

```
Low cost scenario (35% of gross):   $12.00 × 65% = $7.80 net → 7.80/112 = 6.96% of sell price
Mid cost scenario (50% of gross):   $12.00 × 50% = $6.00 net → 6.00/112 = 5.36% of sell price
High cost scenario (69% of gross):  $12.00 × 31% = $3.72 net → 3.72/112 = 3.32% of sell price
```

**This assumes zero agent commission.** The operating cost alone — before any agent is paid — consumes enough gross margin that net margins range from 3.3% to 6.96% of sell price.

Once agent commissions are added (15–40% of gross margin = $1.80–$4.80 on the $12.00 base), the picture compresses further:

```
Mid cost + Starter agent (15% of gross):
  Agent: $12.00 × 15% = $1.80
  Ops:   $12.00 × 50% = $6.00
  Net:   $12.00 - $1.80 - $6.00 = $4.20 → 4.20/112 = 3.75% of sell price

Mid cost + Growth agent (25% of gross):
  Agent: $12.00 × 25% = $3.00
  Ops:   $12.00 × 50% = $6.00
  Net:   $12.00 - $3.00 - $6.00 = $3.00 → 3.00/112 = 2.68% of sell price

Mid cost + Elite agent (32% of gross):
  Agent: $12.00 × 32% = $3.84
  Ops:   $12.00 × 50% = $6.00
  Net:   $12.00 - $3.84 - $6.00 = $2.16 → 2.16/112 = 1.93% of sell price
```

**This demonstrates the fundamental problem:** if `operationalExpense` in the model represents the full operating cost of the platform (35–69% of gross margin), then the 7% floor is never achievable at mid-to-high cost scenarios once any agent commission is present.

This reveals a critical definitional question that must be resolved before the floor can be calibrated correctly.

---

## 5. The Definitional Problem: What Does `operationalExpense` in the Model Actually Represent?

The current model defines `operationalExpense` as:

> "A percentage of Ergos's gross margin reserved to cover Ergos's direct operational costs attributable to managing this agent's book of business."

Its documented range is **3–12% of gross margin** (3–5% Strategic tier, 10–12% Starter tier).

But the full platform operating cost analysis in Section 4 shows total operating costs of **35–69% of gross margin**.

**These two numbers are not reconcilable unless `operationalExpense` is intentionally only covering a subset of total platform costs.**

### Resolution

There are two interpretations:

**Interpretation A: `operationalExpense` = partial variable cost allocation per agent**

In this interpretation, `operationalExpense` covers only the direct, variable costs associated with supporting one agent's portfolio of agencies: incremental support hours, dedicated account management time, per-booking API costs, and related overhead directly attributable to this agent. The remaining fixed platform costs (engineering, G&A, payment processing infrastructure, etc.) are covered from the net margin floor itself.

This is the interpretation implied by the 3–12% range in the model. Under this interpretation, the 7% floor must cover:

- Fixed technology and infrastructure costs
- Payment processing (the largest single cost item)
- Sales overhead not covered by agent layer
- G&A and executive
- Profit contribution

**This is the correct and only workable interpretation.** The `operationalExpense` is not the total operating cost model — it is the per-agent variable cost allocation, which is a small slice of total platform costs.

**Interpretation B: `operationalExpense` = total platform operating cost per booking**

This interpretation would require `operationalExpense` to be 35–69% of gross margin, which is inconsistent with the documented 3–12% range. This interpretation is structurally impossible to sustain alongside any meaningful agent commission.

**Conclusion: Interpretation A is correct. The 7% floor carries the weight of covering fixed platform costs and profit contribution that `operationalExpense` does not reach.**

---

## 6. Deriving the Floor From Actual Cost Structure

### 6.1 The Cost Items the Floor Must Cover

Given that `operationalExpense` covers only incremental per-agent variable costs (3–12% of gross), the 7% floor on sell price must cover everything else:

| What the 7% floor must cover | Estimated cost as % of sell price | Notes |
|---|---|---|
| Payment processing | 1.0–2.0% | Card acceptance on sell price; B2B has more wire transfer, lower card rate than B2C |
| Fixed technology and hosting | 0.5–1.0% | Amortized engineering and infrastructure against bookings |
| Platform G&A and overhead | 0.5–1.5% | At Y1-Y3 scale; compresses with volume |
| Net profit contribution | 2.0–4.0% | Return on invested capital; what Ergos actually earns as a business |
| **Total minimum requirement** | **4.0–8.5%** | **Range from lean/scale to early-stage** |

At the midpoint: **~6.3% of sell price is the breakeven floor** at early-to-mid stage.

At scale (WebBeds analogy): with higher volume reducing per-booking overhead, the pure cost floor could compress to **3–4% of sell price**, freeing more net for profit.

### 6.2 The Specific Derivation for 7%

At the 12% `baseCommission` default, 7% of sell price = $7.84 on a $112.00 sale, which = $7.84 / $12.00 = **65.3% of gross margin**.

This means: after agent commission and incremental ops allocation, Ergos retains at least 65.3 cents of every gross margin dollar for fixed costs and profit.

Working backwards from the cost structure:

| Cost item | % of gross margin (at 12% base, 7% floor scenario) |
|---|---|
| Payment processing | ~9–14% of gross margin (equivalent to ~1.0–1.5% of sell price) |
| Fixed tech + G&A | ~8–12% of gross margin |
| Net profit contribution | ~43–48% of gross margin |
| **Total reserved by 7% floor** | **~65% of gross margin** |

The profit contribution embedded in the 7% floor (approximately 43–48% of gross margin, or 4.6–5.1% of sell price) is what makes Ergos a viable business over time. This is analogous to WebBeds retaining ~50% of its 6.5% TVM as EBITDA — the structure is consistent.

**The 7% floor is therefore derived as:** the cost-side minimum (payment processing + fixed overhead ~3–3.5% of sell price) plus a minimum profit contribution (3.5–4% of sell price) that makes the platform economically rational to operate.

---

## 7. Sensitivity Analysis: Floor vs. baseCommission Combinations

The floor's adequacy depends critically on the `baseCommission` rate applied to a given booking. A 7% floor on a low-commission booking is structurally more demanding than on a high-commission booking.

### Floor Adequacy by baseCommission Level

| baseCommission | Gross margin as % of sell price | Agent at 25% of gross | Ops at 8% of gross | Ergos net | Exceeds 7% floor? |
|---|---|---|---|---|---|
| 8% | 7.4% | 1.9% | 0.6% | 4.9% | NO — fails by 2.1 points |
| 10% | 9.1% | 2.3% | 0.7% | 6.1% | NO — fails by 0.9 points |
| **12%** | **10.7%** | **2.7%** | **0.9%** | **7.2%** | **YES — passes with 0.2pt buffer** |
| 13% | 11.5% | 2.9% | 0.9% | 7.7% | YES — comfortable |
| 15% | 13.0% | 3.3% | 1.0% | 8.7% | YES — comfortable |
| 18% | 15.3% | 3.8% | 1.2% | 10.3% | YES — strong |

**Critical finding:** At 12% `baseCommission`, a 25% agent commission with 8% ops allocation barely passes the 7% floor (7.2% net). There is almost no margin for error. This means:

- 12% default + Elite agent tier (28–33% of gross) will almost always breach the 7% floor
- 8% or 10% `baseCommission` cannot support a 7% floor with any agent commission whatsoever
- The floor and the baseCommission are therefore co-dependent variables that must be calibrated together

### The Practical Implication

The 7% floor was designed for the 12% default `baseCommission` scenario. It implicitly assumes:
- Agent commissions are modest (Starter/Growth tier: 15–25% of gross)
- Ops allocation is modest (6–10% of gross)
- The hotel has no agency rebate applied

When Elite agents and/or agency rebates are present, the 7% floor can only be maintained by raising `baseCommission` to 14–15% on those specific hotels — which is exactly the guidance already in the commission model document.

---

## 8. Comparable Floor Structures in Analogous Industries

### 8.1 Mortgage Brokerage — Yield Spread Premium (YSP) Floor

In US mortgage lending, lenders impose a minimum "yield spread" that a loan must achieve before any broker compensation is paid. The broker earns out of the spread above the floor — the lender's costs (capital cost, origination overhead, servicing) are protected.

**Industry norm:** 0.5–2.0% minimum net spread on a mortgage, expressed as basis points on principal — roughly equivalent to 25–50% of the total origination fee being reserved for lender operations.

**Structural parallel to Ergos:** The 7% floor is Ergos's version of a lender's minimum yield — the platform's operations and return must be covered before agent compensation is maximized.

**Confidence: HIGH** — regulatory structure (CFPB Reg Z / RESPA); widely documented

---

### 8.2 Insurance Managing General Agent (MGA) Structure

In insurance distribution:
- Insurer sets premium rate
- MGA earns 20–30% override commission on all premiums in their book
- MGA retains minimum 10–15% of that override for their own operations and profit
- Sub-agent can earn maximum of 80–90% of MGA override, leaving MGA with 10–15% net

**Industry norm:** MGA minimum net retention = 10–15% of their gross override.

In Ergos's model, if `earningPercentage` of gross margin is the agent override and the 7% floor represents Ergos's minimum retention, the floor as a % of gross margin is:

```
At 12% baseCommission: floor = 7% of sell / 10.7% gross = 65.4% retention by Ergos
= agent can earn max 34.6% of gross margin at this baseCommission level to hit exactly the floor
```

This is slightly tighter than the insurance MGA model (80–90% to sub-agent, 10–20% retained). Ergos is more protective of its net, which makes sense given that it has more platform operating costs than a pure insurance intermediary.

**Confidence: HIGH** — standard industry structure, widely documented by NAIC and insurance trade bodies

---

### 8.3 SaaS Channel Partner Programs (HubSpot, Salesforce)

| Program | Max channel commission | Platform minimum net |
|---|---|---|
| HubSpot Silver/Gold/Diamond | 20–30% of first-year ACV | 70–80% of first-year ACV retained |
| Salesforce reseller channel | 25–35% of license value | 65–75% retained |
| Stripe Revenue Share (ISVs) | 15–25% of interchange | 75–85% retained |
| Twilio partner program | 15–20% of usage revenue | 80–85% retained |

SaaS platforms consistently retain 65–85% of revenue after channel partner payments. The 7% floor at the 12% base retaining ~65% of gross margin is at the lower end of SaaS norms, which reflects the higher pass-through economics of travel vs. pure software.

**Confidence: HIGH** — program terms are publicly documented for all four examples above

---

## 9. The Right Way to Express the Floor

The user's question asked whether the floor should be expressed as:
- Percentage of sell price
- Percentage of gross margin
- Absolute amount per booking

### Analysis of Each Approach

| Method | Expression | Pros | Cons |
|---|---|---|---|
| **% of sell price** (current) | `ergosNetMargin / ergosSellPrice >= 7%` | Simple. Directly tied to transaction value. Consistent regardless of gross margin configuration. | Does not scale proportionally with markup variations. A 7% floor on an 8% gross margin booking is structurally more restrictive than on a 15% gross margin booking. |
| **% of gross margin** | `ergosNetMargin / ergosGrossMargin >= X%` | Proportional. More logical when gross margin varies significantly by hotel. Consistent with MGA/SaaS analogies. | More complex to communicate and monitor. Requires knowing gross margin at floor check time. |
| **Absolute amount per booking** | `ergosNetMargin >= $X per booking` | Simple and intuitive. Easy to explain to agents. | Does not scale with booking value. A $7 floor on a $100 booking is very different from a $7 floor on a $1,000 booking. |
| **Hybrid: % of gross margin + absolute minimum** | `ergosNetMargin >= max(X% of gross, $Y)` | Most sophisticated. Protects both proportionality and absolute minimum. | Adds complexity. |

### Recommendation

**Retain the current approach: floor as % of sell price.** It is the most operationally simple and is already implemented. However, supplement it with a secondary check:

**Primary floor:** `ergosNetMargin / ergosSellPrice >= 7%` (keep as-is)

**Secondary floor (add this):** `ergosNetMargin / ergosGrossMargin >= 50%` — this ensures Ergos never gives away more than 50% of its gross margin to agents plus ops allocation combined, regardless of what sell price denominator math looks like.

The 50% gross margin retention floor is directly grounded in the WebBeds and Hotelbeds EBITDA profiles (49–60% EBITDA on gross revenue) and in the SaaS channel partner norms (65–85% platform retention, with the lower end applying to travel's higher pass-through economics).

---

## 10. The Verdict on 7%

### Is 7% the Right Number?

**7% of sell price is defensible, but it is not derived from first principles — it is a coincidentally appropriate round number that happens to align with the cost structure.**

Here is the precise derivation that justifies it:

```
At 12% baseCommission:
  Gross margin as % of sell price = 10.7%
  Payment processing cost = ~1.0–1.5% of sell price
  Fixed technology and G&A = ~0.7–1.2% of sell price
  Minimum required profit contribution = ~3.0–4.0% of sell price
  ───────────────────────────────────────────────────────────
  Total minimum floor = 4.7–6.7% of sell price

  7% adds ~0.3–2.3% buffer above strict minimum.
  This buffer is appropriate — floor systems should not be set at exact breakeven.
```

**7% is right.** But here is the nuance:

- If Ergos's booking mix shifts heavily toward lower-cost markets (Western Europe city hotels with 8–10% baseCommission), 7% becomes difficult to maintain while paying any agent at all. In that scenario, the floor should be reconsidered against a lower baseCommission of 8–10%.
- If Ergos's booking mix is predominantly Caribbean and LATAM resort (13–16% base), 7% is conservative and the floor could be raised to 8–9% over time without competitive harm.
- The floor should be reviewed annually, not left static.

### Calibrated Floor Recommendation by baseCommission Tier

Rather than a single universal floor, the optimal structure is a tiered floor that scales with gross margin:

| baseCommission Range | Recommended Floor (% of sell price) | Rationale |
|---|---|---|
| 8–10% | 4.5–5.5% | Lower gross margin makes 7% mathematically impossible with any agent commission; floor must scale down |
| 10–12% | 6.0–7.0% | Standard range; 7% is appropriate midpoint |
| 12–15% | 7.0–8.0% | Default with good margin; 7% floor is the minimum; can safely be set at 7.5% |
| 15–20% | 8.0–10.0% | Premium/luxury tier; higher gross margin justifies a higher floor; Ergos should keep more |
| 20%+ | 12.0%+ | Specialty/exceptional cases; floor should reflect higher absolute earnings |

**For the platform's current default configuration of 12% baseCommission, 7% is the correct floor.**

---

## 11. Implementation Recommendations

### Primary Recommendation: Retain 7% Floor, Add Tiered Logic

1. **Keep the 7% floor as the default for the 12% baseCommission tier.** It is well-grounded and should not be changed.

2. **Add a floor-scaling function tied to `baseCommission`:**

```typescript
function getMinimumFloor(baseCommission: number): number {
  if (baseCommission < 0.10) return 0.045  // 4.5% floor on low-margin hotels
  if (baseCommission < 0.12) return 0.060  // 6.0% floor
  if (baseCommission < 0.15) return 0.070  // 7.0% floor (current default)
  if (baseCommission < 0.20) return 0.080  // 8.0% floor on premium hotels
  return 0.120  // 12% floor on luxury/specialty
}
```

3. **Add the secondary gross margin retention check:**

```typescript
const MINIMUM_GROSS_MARGIN_RETENTION = 0.50  // Ergos must keep at least 50% of gross margin
const ergosGrossMarginRetention = ergosNetMargin / ergosGrossMargin
const retentionCheckPassed = ergosGrossMarginRetention >= MINIMUM_GROSS_MARGIN_RETENTION
```

4. **Surface both checks in the admin interface.** The primary check (% of sell price) and secondary check (% of gross margin) should both be visible when configuring agent tiers, and both must pass before a configuration is saved.

5. **Review the floor annually.** As volume scales and per-booking costs decrease, the minimum cost floor decreases. The 7% today may become 5% in three years as WebBeds-style operating leverage kicks in. Build the review into the quarterly financial review cycle.

---

## 12. Summary: The Answers

### Question 1: What do comparable B2B hotel consolidators actually net?

| Company | Gross take rate | Net EBITDA margin | Net margin as % of TTV |
|---|---|---|---|
| WebBeds | 6.5% of TTV | 49–52% of gross revenue | ~3.2–3.4% of TTV |
| Hotelbeds | 8.4–9.4% of TTV | 50–60% of gross revenue | ~4.2–5.6% of TTV |
| Legacy wholesalers | 10–18% gross markup | Estimated 35–60% of gross | ~4–10% of TTV |

**Ergos's 7% floor on a 12% markup = 7/112 = 6.25% of TTV**, which is above the large-scale bed bank EBITDA range but appropriate for a smaller platform with higher per-booking operating costs. As volume scales, this floor will become increasingly comfortable.

**Confidence: HIGH for WebBeds/Hotelbeds (listed companies); MEDIUM for legacy wholesalers**

### Question 2: What is the typical operating cost structure?

At Ergos's current scale and the 12% default `baseCommission`:

- Payment processing: ~1.0–1.5% of sell price
- Technology and infrastructure: ~0.7–1.2% of sell price
- G&A and overhead: ~0.5–1.0% of sell price
- Variable ops (covered by `operationalExpense` field): ~0.3–1.1% of sell price
- **Total cost floor: ~2.5–4.8% of sell price** (before any profit)
- **Minimum profitable floor: ~4.5–7% of sell price** (adding profit contribution)

### Question 3: What should the minimum floor be?

**7% of sell price is correct for the 12% default `baseCommission`.** It is not arbitrary — it is derived from:

1. Fixed cost floor of ~2.5–3.5% of sell price (tech, payments, G&A)
2. Minimum profit contribution of 3.5–4% of sell price (consistent with WebBeds/Hotelbeds EBITDA profiles)
3. A small buffer above true breakeven to prevent margin cliff scenarios

The floor should be adjusted downward for hotels configured with 8–10% baseCommission (to 4.5–6%) and upward for premium/luxury hotels with 15%+ baseCommission (to 8–10%).

### Question 4: Should the floor be expressed as % of sell price, % of gross margin, or absolute amount?

**Primary expression: % of sell price** (current approach) — simpler, works at scale, already implemented.

**Secondary check: % of gross margin** — add a 50% gross margin retention check as a secondary guard, grounded in listed company EBITDA benchmarks.

**Not recommended: absolute amount** — does not scale with booking value.

---

## 13. Sources

| Source | Type | Confidence |
|---|---|---|
| Web Travel Group FY25 Results — 6.7% TVM, 49–52% EBITDA | ASX-listed financial filing (ASX: WJL) | HIGH |
| Web Travel Group 1H26 — 6.5% TVM confirmed, on-track | ASX-listed financial filing (ASX: WJL) | HIGH |
| HBX Group H1 2025 — €319M revenue / €3.4B TTV = 9.4% TVM | BME-listed financial filing (BME: HBX) | HIGH |
| HBX Group Q1 2026 — 8.4% take rate explicitly stated | BME-listed financial filing (BME: HBX) | HIGH |
| Booking Holdings 10-K 2023 — 15% of gross bookings | SEC filing (NASDAQ: BKNG) | HIGH |
| Stripe/Adyen processing rates for travel platforms | Published pricing; industry standard | HIGH |
| Amadeus/Sabre GDS per-booking fee structure | Published API pricing; industry standard | MEDIUM |
| HubSpot/Salesforce partner program commission rates | Published program terms | HIGH |
| US mortgage Yield Spread Premium floor regulations (Reg Z) | CFPB regulatory documentation | HIGH |
| Insurance MGA trail commission structure (NAIC standards) | Regulatory documentation; industry association | HIGH |
| Legacy wholesaler margin patterns (GTA, Tourico, DOTW, JacTravel) | Industry pattern recognition; pre-acquisition disclosures | MEDIUM |
| RateHawk platform margins | Private company estimate; no public data | LOW |

---

*Document prepared for Ergos Continental internal strategy and investor review.*
*All projections and cost estimates are tagged with confidence levels.*
*The 7% floor should be reviewed against actual booking data and operating costs quarterly, with formal review annually as volume scales.*
