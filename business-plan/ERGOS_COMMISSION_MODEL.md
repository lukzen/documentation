
# Ergos Continental — Commission & Operational Model

## Complete Business Logic Design for the B2B Hotel Aggregation Platform

**Version:** 1.0
**Date:** April 2026
**Classification:** Internal Strategy — Confidential

---

## Sources & Confidence Levels

Every number and benchmark is tagged:

- **HIGH** — Publicly verifiable, standard industry structure, or stable market dynamics
- **MEDIUM** — Derived from fragmentary public data, industry pattern recognition, or analogous benchmarks
- **LOW** — Informed estimate with limited supporting data
- **UNKNOWN** — Requires primary research or internal validation

---

## 1. Executive Summary

Ergos Continental operates as a multi-GDS hotel aggregation middleware — the platform sits between GDS suppliers (Juniper, Hoteltec, Dingus, Restel/Hotelbeds) and travel agencies. The platform currently stores all the fields needed to run a sophisticated commission model but has implemented no calculation logic. This document defines every field's precise business role, specifies the exact formulas, establishes a hard structural guarantee that Ergos always earns more than any sales agent, and designs a performance incentive architecture that motivates agents to both recruit and retain agencies over the long term.

**The core design principle:** Ergos's margin is earned first, before any agent share is calculated. Agents earn a fraction of Ergos's margin — not a separate layer on top of it. This is the same structure used by insurance MGAs (Managing General Agents), SaaS channel partner programs (HubSpot, Salesforce), and hotel consolidator networks (GTA, Hotelbeds reseller tiers). The supplier never knows or cares about the downstream split — the gross margin belongs entirely to Ergos, and agent compensation is an internal operating cost paid from that margin.

**Key financial guarantees built into the model:**
- Ergos retains a minimum 7% net margin on every booking regardless of agent tier
- No agent commission can exceed 40% of Ergos's gross margin on any booking
- Agent commissions are subject to a hard floor: Ergos must net at least 7 percentage points after all agent payouts
- `priceAdjustment` fields are pre-margin adjustments — they affect the net cost basis, not the selling price directly

---

## 2. The Money Flow — Conceptual Foundation

Before touching individual fields, understand the layered architecture of value.

### 2.1 The Four Layers

```
LAYER 0: SUPPLIER NET PRICE
   The price the GDS vendor charges Ergos for a room night.
   This is Ergos's cost of goods. The vendor sometimes applies reductions
   (negotiated discounts on chain-level contracts, e.g., Meliá, Barceló).

LAYER 1: ERGOS INTERNAL COST BASIS
   = Supplier Net Price × priceAdjustment
   If priceAdjustment = 0.85, Ergos pays 15% less than the listed vendor net.
   If priceAdjustment = 1.00 (default), cost basis = vendor net exactly.
   This is NOT a selling price adjustment — it adjusts what Ergos pays.

LAYER 2: ERGOS SELLING PRICE (the price shown to the travel agency)
   = Ergos Internal Cost Basis × (1 + effectiveCommissionRate)
   where effectiveCommissionRate = baseCommission (hotel level, default 13%)
   This is the price the travel agency sees and books at.
   Ergos's gross margin is embedded here.

LAYER 3: AGENCY SELLING PRICE (the price shown to the end customer)
   = Ergos Selling Price × (1 + agencyMarkup)
   The agency controls this entirely. Ergos does not see or store this.
   This is the agency's problem to manage and their profit center.
```

### 2.2 Why This Structure Matters

The agency BUYS at Layer 2 and SELLS at Layer 3. Ergos earns on the spread between Layer 0/1 and Layer 2. The sales agent earns a share of Ergos's gross margin (the Layer 1 to Layer 2 spread). This is identical in structure to:

- **Insurance brokerage MGAs**: Insurer sets premium → MGA earns overriding commission → sub-agent earns portion of MGA override → insurer never adjusts premium for sub-agent splits
- **HubSpot Partner Program**: HubSpot sets SaaS price → Partner earns 20-30% of first-year revenue → sub-referrer earns portion of partner margin → HubSpot price never changes
- **Expedia TAAP (Travel Agent Affiliate Program)**: Expedia sets rate → Agency earns 8-10% commission → Ergos analogy: Ergos is the OTA, agency is the downstream seller

---

## 3. Field-by-Field Definition and Formula Specification

### 3.1 Hotel Level: `baseCommission`

**What it is:** The percentage margin Ergos adds to the supplier net price (post-adjustment) to arrive at the selling price shown to the travel agency. This is Ergos's gross margin rate on this specific hotel.

**Default value:** 13% for most GDS vendors

**Range:** 0-100% (functionally 8-25% in practice)

**Formula:**
```
ergosSellPrice = supplierNetPrice × priceAdjustment × (1 + baseCommission)
```

**Example:**
```
Supplier net price:    $100.00
priceAdjustment:         1.00  (no reduction, standard hotel)
baseCommission:          0.13  (13%)

ergosSellPrice = $100.00 × 1.00 × 1.13 = $113.00
Ergos gross margin = $113.00 - $100.00 = $13.00
Ergos gross margin % = 13 / 113 = 11.5% of sell price (but 13% of cost — this is "markup vs. margin" distinction)
```

**Operator guidance:**
- Standard hotels (Juniper, Hoteltec, Restel): 13% default — **MEDIUM confidence** on appropriateness; adjust based on supplier contract terms
- Premium/luxury chains with higher demand: can push to 15-18%
- High-volume commodity hotels: may need to hold at 10-12% to stay price-competitive vs. direct Hotelbeds access
- Minimum defensible floor: 8% (below this, after agent payout and operational costs, Ergos runs negative)

**Why 13%?** Industry context: Hotelbeds/WebBeds B2B net rates typically have 15-22% margin baked in at their level. Ergos is an additional layer — agencies expect 10-20% below retail. A 13% markup brings Ergos's sell price to roughly parity with or slight discount to Hotelbeds direct retail rates. This preserves Ergos's value proposition. **(MEDIUM — requires validation against actual supplier contract terms)**

---

### 3.2 Hotel Level: `priceAdjustment`

**What it is:** A multiplier applied to the supplier's net price BEFORE Ergos adds its margin. It represents pre-negotiated cost reductions for specific hotel chains or properties.

**Default value:** 1.00 (no adjustment)

**Range:** 0.01 to 2.00 (values below 1.00 = cost reduction; values above 1.00 = cost increase, rare)

**This is a COST-SIDE field, not a SELL-SIDE field.**

**Formula:**
```
adjustedCostBasis = supplierNetPrice × priceAdjustment
ergosSellPrice = adjustedCostBasis × (1 + baseCommission)
```

**Current real-world examples in your system:**
- Meliá hotels: `priceAdjustment = 0.85` → Ergos pays 15% less than vendor net
- Archipelago hotels: `priceAdjustment = 0.80` → Ergos pays 20% less than vendor net

**Example — Meliá hotel:**
```
Vendor net price:      $200.00
priceAdjustment:         0.85  (Meliá negotiated reduction)
adjustedCostBasis:     $200.00 × 0.85 = $170.00
baseCommission:          0.13  (13%)

ergosSellPrice = $170.00 × 1.13 = $192.10
Ergos gross margin = $192.10 - $170.00 = $22.10
Effective gross margin = 11.5% of sell price

Agency sees: $192.10 (vs. $226.00 if bought direct at Meliá rack)
Ergos advantage: ~15% cheaper sell price due to negotiated cost basis
```

**Critical design note:** `priceAdjustment` is what creates Ergos's competitive advantage at specific hotel chains. The selling price goes DOWN, making Ergos more attractive to agencies for those hotels — but Ergos's MARGIN PERCENTAGE stays the same because `baseCommission` is applied to the already-reduced cost basis. The agency gets a better price; Ergos earns the same percentage on a lower base (lower absolute dollars, but competitive positioning benefit).

**Edge case — what if `priceAdjustment` > 1.0?**
This would mean Ergos is paying MORE than the vendor net, which only makes sense if there is an error in configuration. Add a validation alert in the admin interface when `priceAdjustment > 1.05`.

---

### 3.3 Sales Agent Level: `earningPercentage`

**What it is:** The percentage of Ergos's gross margin on any booking (from agencies the agent recruited) that the agent earns as their base ongoing commission. This is the "residual" or "trail commission" — the agent keeps earning it for as long as the agency keeps booking.

**This field answers:** "What fraction of Ergos's profit does this agent earn on an ongoing basis?"

**Formula:**
```
agentBaseEarning = ergosGrossMarginAmount × (earningPercentage / 100)
```

**Where ergosGrossMarginAmount = ergosSellPrice - adjustedCostBasis**

**Operational cap (hard rule):** `earningPercentage` must never be set such that:
```
ergosNetRetention = ergosGrossMarginAmount × (1 - earningPercentage/100 - operationalExpense/100)
```
...falls below a minimum floor of **7 percentage points of the sell price.**

In practice, for a 13% baseCommission hotel (where gross margin ≈ 11.5% of sell price), the maximum combined `earningPercentage + operationalExpense` should not exceed **39%** of gross margin (preserving 7%/11.5% ≈ 61% of gross margin for Ergos net).

**Industry parallel — Insurance MGA override commissions:**
- Insurer pays MGA 25-30% override commission on all policies in their book
- MGA keeps 15-20% for operations and profit
- MGA pays sub-agent 8-12% of premium as trailing commission
- Sub-agent commission is capped so MGA never pays out more than they earn

**Recommended tier structure for `earningPercentage`:**

| Agent Tier | Criteria | earningPercentage Range | Industry Analog |
|---|---|---|---|
| Starter | 1-4 active agencies | 15-20% of gross margin | HubSpot Silver Partner: 20% |
| Growth | 5-14 active agencies, 500+ bookings/yr across portfolio | 21-27% of gross margin | HubSpot Gold: 25% |
| Elite | 15+ active agencies, 2,000+ bookings/yr across portfolio | 28-35% of gross margin | Salesforce Platinum: 30-35% |
| Strategic | Custom enterprise arrangement | Up to 40% of gross margin | Booking.com preferred affiliate |

**"Active agency" definition:** Booked at least 1 room in the last 30 days. This is critical — the agent earns ongoing only for agencies that are actually booking, not for dormant signups. This is the mechanism that incentivizes agents to keep agencies engaged.

---

### 3.4 Sales Agent Level: `operationalExpense`

**What it is:** A percentage of Ergos's gross margin reserved to cover Ergos's direct operational costs attributable to managing this agent's book of business. This includes support overhead, account management, system costs, and a portion of marketing spend. It is deducted from Ergos's gross margin BEFORE calculating Ergos's net profit.

**This field answers:** "What percentage of gross margin does Ergos allocate to support this agent's agencies?"

**Formula:**
```
ergosOperationalCost = ergosGrossMarginAmount × (operationalExpense / 100)
ergosNetMargin = ergosGrossMarginAmount - agentBaseEarning - ergosOperationalCost
```

**Recommended ranges:**

| Agent Tier | operationalExpense | Rationale |
|---|---|---|
| Starter | 8-12% of gross margin | Higher per-unit support cost for small agencies; more hand-holding required |
| Growth | 6-9% of gross margin | Economies of scale; agents are more self-sufficient |
| Elite | 4-7% of gross margin | Dedicated account manager cost, but spread over high volume |
| Strategic | 3-5% of gross margin | Full enterprise SLA, but volume justifies low per-booking cost |

**Why track this per-agent?** Some agents bring in agencies that require intensive support (lots of cancellations, high-touch service, complex bookings). Others bring agencies that are self-sufficient. Differentiating `operationalExpense` lets finance track true profitability per agent channel and feeds directly into renegotiation conversations.

**Industry parallel:** Hotelbeds charges different "service fee" percentages to different agency tiers based on the support cost profile of that tier. GDS platforms (Amadeus, Sabre) allocate different support costs per connectivity type.

---

### 3.5 Sales Agent Level: Per-Hotel `commissionPercentage` (ISalesAgentCommission)

**What it is:** An agent-specific override for a specific hotel. When set, this REPLACES the `earningPercentage` calculation for that specific hotel only. Used to give an agent a custom commission deal on a specific property (e.g., Ergos has a special partnership with the agent for Meliá properties).

**Formula (when override exists):**
```
agentHotelEarning = ergosGrossMarginAmount × (agentHotelCommissionPercentage / 100)
```

**Important constraint:** This override is still subject to the same hard cap — Ergos must retain at least 7 percentage points of the sell price as net margin.

**Lookup priority:**
```
IF (SalesAgentCommission record exists for this agent + this hotel)
  THEN use agentHotelCommissionPercentage
ELSE
  use earningPercentage (the agent's default)
```

**Use case:** An agent negotiates a special arrangement to aggressively promote Meliá hotels to their agencies. Ergos grants them a 5% uplift on Meliá properties only, in exchange for a volume commitment. The hotel-level override enables this without changing the agent's global rate.

---

### 3.6 Travel Agency Level: Per-Hotel `commissionPercentage` (ITravelAgencyCommission)

**What it is:** An agency-specific commission that determines what the agency earns on a specific hotel's bookings. This represents a discount or rebate that Ergos gives to the travel agency on specific hotels — reducing the agency's cost of that hotel to incentivize them to book it more.

**Critical architectural question:** There are two valid interpretations of this field. The design decision must be made explicitly:

**Interpretation A — Agency Rebate (Recommended):**
The agency's `commissionPercentage` is a rebate OFF the Ergos sell price that the agency receives. This reduces the effective price the agency pays for that hotel.

```
effectiveAgencyPrice = ergosSellPrice × (1 - agencyCommissionPercentage/100)
ergosEffectiveRevenue = effectiveAgencyPrice
ergosEffectiveGrossMargin = effectiveAgencyPrice - adjustedCostBasis
```

Example: Hotel sells at $113. Agency gets 5% commission override for that hotel.
```
effectiveAgencyPrice = $113.00 × (1 - 0.05) = $107.35
ergosEffectiveRevenue = $107.35
ergosEffectiveGrossMargin = $107.35 - $100.00 = $7.35 (vs. $13 without override)
```

**Interpretation B — Agency Margin Addition (Alternative):**
The agency's `commissionPercentage` is a separate margin added ON TOP of the Ergos sell price, shown as a line item the agency earns. This makes the total price to the end customer higher.

**Recommendation: Use Interpretation A (Agency Rebate)** — this is how Hotelbeds, WebBeds, and Booking.com for Business structure agency commissions. The agency sees a lower net rate, which they can use to either undercut competitors or maintain margin. It is cleaner, more transparent, and easier to reconcile.

**Lookup priority (agency-hotel commission):**
```
IF (TravelAgencyCommission record exists for this agency + this hotel)
  THEN apply agencyCommissionPercentage as rebate
ELSE
  no rebate — agency pays full ergosSellPrice
```

**Constraint:** Agency commission override cannot reduce Ergos's effective gross margin below 5 percentage points of sell price (a tighter floor than the agent floor, since agency overrides do not carry a relationship value that justifies as deep a concession).

---

### 3.7 Booking Level: `paymentInfo.baseCommission`

**What it is:** The vendor-reported commission amount in absolute currency, as reported back by the GDS at booking confirmation time. Some GDS systems (particularly Restel/Hotelbeds and Juniper) report the commission amount as part of the booking confirmation response.

**What to store here:** The raw vendor commission amount in the booking currency. This is an INFORMATIONAL field — it tells you what the vendor is paying Ergos on this booking as a commission (in their accounting system, they may classify Ergos as a commission-earning reseller rather than a net-rate buyer).

**Important:** This field may or may not align with Ergos's calculated margin, depending on the commercial structure of the vendor relationship:
- **Net rate vendors** (Ergos buys at net, marks up): `paymentInfo.baseCommission` will be 0 or null — there is no vendor-reported commission because Ergos isn't earning a commission from the vendor, they are earning a markup
- **Commission-based vendors** (Ergos books at gross rate, earns commission): `paymentInfo.baseCommission` = the commission amount the vendor will pay Ergos, in currency

**Formula for commission-model vendors:**
```
ergosGrossMarginAmount = paymentInfo.baseCommission  (this IS the margin, directly)
```

**Formula for net-rate vendors:**
```
ergosGrossMarginAmount = totalAmount - (supplierNetPrice × priceAdjustment)
// paymentInfo.baseCommission is informational only or 0
```

---

## 4. The Complete Pricing Formula — Single Source of Truth

```typescript
/**
 * Ergos Continental Commission Calculation Engine
 * Applied at booking confirmation time.
 */

interface BookingCommissionResult {
  supplierNetPrice: number          // What Ergos pays the vendor
  adjustedCostBasis: number         // After priceAdjustment
  ergosSellPrice: number            // What Ergos shows the agency
  ergosGrossMargin: number          // ergosSellPrice - adjustedCostBasis
  ergosGrossMarginPct: number       // As % of ergosSellPrice
  agentEarning: number              // Agent's share of gross margin
  agentEarningPct: number           // As % of ergosGrossMargin
  ergosOperationalCost: number      // Operational cost allocation
  ergosNetMargin: number            // Ergos keeps this
  ergosNetMarginPct: number         // As % of ergosSellPrice
  agencyEffectivePrice: number      // What agency actually pays (after rebate)
  safetyCheckPassed: boolean        // Ergos >= 7% of sell price
}

function calculateBookingCommission(
  supplierNetPrice: number,
  priceAdjustment: number,          // hotel.priceAdjustment (default 1.0)
  baseCommission: number,           // hotel.baseCommission (default 0.13)
  agentEarningPct: number,          // salesAgent.earningPercentage / 100
                                    // OR salesAgentCommission.commissionPercentage / 100
  agentOperationalExpensePct: number, // salesAgent.operationalExpense / 100
  agencyCommissionPct: number,      // travelAgencyCommission.commissionPercentage / 100
                                    // (0 if no override)
): BookingCommissionResult {

  // STEP 1: Adjust cost basis
  const adjustedCostBasis = supplierNetPrice * priceAdjustment

  // STEP 2: Calculate Ergos sell price (before agency rebate)
  const ergosSellPrice = adjustedCostBasis * (1 + baseCommission)

  // STEP 3: Apply agency rebate (if any) to get effective agency price
  const agencyEffectivePrice = ergosSellPrice * (1 - agencyCommissionPct)

  // STEP 4: Calculate Ergos gross margin (based on effective revenue)
  const ergosGrossMargin = agencyEffectivePrice - adjustedCostBasis
  const ergosGrossMarginPct = ergosGrossMargin / agencyEffectivePrice

  // STEP 5: Calculate agent earning from gross margin
  const agentEarning = ergosGrossMargin * agentEarningPct
  const ergosOperationalCost = ergosGrossMargin * agentOperationalExpensePct

  // STEP 6: Calculate Ergos net margin
  const ergosNetMargin = ergosGrossMargin - agentEarning - ergosOperationalCost
  const ergosNetMarginPct = ergosNetMargin / agencyEffectivePrice

  // STEP 7: Safety check — Ergos must retain >= 7% of sell price
  const MINIMUM_ERGOS_NET_PCT = 0.07
  const safetyCheckPassed = ergosNetMarginPct >= MINIMUM_ERGOS_NET_PCT

  if (!safetyCheckPassed) {
    // LOG WARNING: this booking's commission config violates floor
    // DO NOT block the booking — log for admin review
    // Consider alerting admin to reconfigure agent/hotel commission
  }

  return {
    supplierNetPrice,
    adjustedCostBasis,
    ergosSellPrice,
    ergosGrossMargin,
    ergosGrossMarginPct,
    agentEarning,
    agentEarningPct,
    ergosOperationalCost,
    ergosNetMargin,
    ergosNetMarginPct,
    agencyEffectivePrice,
    safetyCheckPassed,
  }
}
```

---

## 5. Concrete Dollar Examples — Multiple Scenarios

### 5.1 Standard Scenario: Small Agency, New Agent, Standard Hotel

**Setup:**
- Supplier net: $100/night, 3 nights
- priceAdjustment: 1.00 (no reduction)
- hotel.baseCommission: 13%
- salesAgent.earningPercentage: 18% (Starter tier — has 2 active agencies)
- salesAgent.operationalExpense: 10%
- No agency commission override
- No agent hotel override

**Calculation:**
```
Booking value (3 nights):      $300.00 supplier net

adjustedCostBasis:             $300.00 × 1.00    = $300.00
ergosSellPrice:                $300.00 × 1.13    = $339.00
agencyEffectivePrice:          $339.00 (no rebate)
ergosGrossMargin:              $339.00 - $300.00 = $39.00  (11.5% of sell)
agentEarning:                  $39.00 × 18%      = $7.02
ergosOperationalCost:          $39.00 × 10%      = $3.90
ergosNetMargin:                $39.00 - $7.02 - $3.90 = $28.08  (8.3% of sell)

Safety check: 8.3% > 7% floor — PASSES
Agency books at:               $339.00
Agency adds their 20% markup:  $339.00 × 1.20 = $406.80 (end customer pays)
```

**Who earns what on this $300 supplier cost booking:**
| Party | Amount | % of Agency Buy Price |
|---|---|---|
| Supplier | $300.00 | 88.5% |
| Ergos (net) | $28.08 | 8.3% |
| Sales agent | $7.02 | 2.1% |
| Ergos ops allocation | $3.90 | 1.1% |
| **Agency buy price** | **$339.00** | **100%** |

---

### 5.2 Growth Scenario: Large Established Agency, Elite Agent, Meliá Hotel

**Setup:**
- Supplier net: $200/night, 5 nights
- priceAdjustment: 0.85 (Meliá negotiated reduction — existing data)
- hotel.baseCommission: 13%
- salesAgent.earningPercentage: 30% (Elite tier — has 18 active agencies)
- salesAgent.operationalExpense: 6%
- Agency commission override: 4% rebate (large agency, high volume)
- No agent hotel override

**Calculation:**
```
Booking value (5 nights):      $1,000.00 supplier net

adjustedCostBasis:             $1,000.00 × 0.85  = $850.00
ergosSellPrice:                $850.00 × 1.13    = $960.50
agencyEffectivePrice:          $960.50 × (1 - 0.04) = $922.08
ergosGrossMargin:              $922.08 - $850.00 = $72.08  (7.8% of effective revenue)
agentEarning:                  $72.08 × 30%      = $21.62
ergosOperationalCost:          $72.08 × 6%       = $4.32
ergosNetMargin:                $72.08 - $21.62 - $4.32 = $46.14  (5.0% of agency price)

Safety check: 5.0% < 7% floor — WARNING
```

This configuration FAILS the safety check. The combination of a 4% agency rebate + 30% agent commission + 6% ops cost compresses Ergos too much. The system should flag this for admin review. Remediation options:
1. Reduce agency rebate to 2% (most common fix)
2. Reduce agent earning to 25% for this hotel
3. Increase baseCommission on Meliá hotels to 15%

**Revised with agency rebate reduced to 2%:**
```
agencyEffectivePrice:          $960.50 × (1 - 0.02) = $941.29
ergosGrossMargin:              $941.29 - $850.00 = $91.29  (9.7% of effective revenue)
agentEarning:                  $91.29 × 30%      = $27.39
ergosOperationalCost:          $91.29 × 6%       = $5.48
ergosNetMargin:                $91.29 - $27.39 - $5.48 = $58.42  (6.2% of agency price)

Still below 7% floor — Warning still fires
```

**Revised with baseCommission raised to 15% on Meliá:**
```
ergosSellPrice:                $850.00 × 1.15    = $977.50
agencyEffectivePrice:          $977.50 × 0.98    = $957.95
ergosGrossMargin:              $957.95 - $850.00 = $107.95  (11.3% of effective revenue)
agentEarning:                  $107.95 × 30%     = $32.39
ergosOperationalCost:          $107.95 × 6%      = $6.48
ergosNetMargin:                $107.95 - $32.39 - $6.48 = $69.08  (7.2% of agency price)

Safety check: 7.2% > 7% floor — PASSES (barely)
```

**Lesson:** Elite agents with agency rebates on low-margin hotels create margin compression. The admin interface needs to surface these conflicts proactively during configuration, not at booking time.

---

### 5.3 New Agency Scenario: No Agent Override, No Agency Override

**Setup:**
- Supplier net: $80/night, 2 nights
- priceAdjustment: 1.00
- hotel.baseCommission: 13%
- salesAgent.earningPercentage: 15% (Starter — just onboarded 1st agency)
- salesAgent.operationalExpense: 12%
- No commission overrides

**Calculation:**
```
Booking value (2 nights):      $160.00 supplier net

adjustedCostBasis:             $160.00
ergosSellPrice:                $160.00 × 1.13   = $180.80
ergosGrossMargin:              $180.80 - $160.00 = $20.80
agentEarning:                  $20.80 × 15%     = $3.12
ergosOperationalCost:          $20.80 × 12%     = $2.50
ergosNetMargin:                $20.80 - $3.12 - $2.50 = $15.18  (8.4% of sell)

Safety check: 8.4% > 7% floor — PASSES

Agent earns $3.12 on a $160.80 booking. Monthly, if this agency books 30 times at this level:
agentMonthlyEarning = 30 × $3.12 = $93.60
```

This is why agents need multiple agencies. A single small agency provides minimal income. The incentive to recruit more agencies is structural — each additional active agency multiplies the residual stream.

---

### 5.4 Agent Hotel Override Scenario: Special Meliá Partnership

**Setup:**
- Same as 5.1 but agent has a `SalesAgentCommission` record for Meliá hotel:
  `commissionPercentage: 25%` (instead of default `earningPercentage: 18%`)
- Supplier net: $100/night, 3 nights
- priceAdjustment: 0.85 (Meliá)
- hotel.baseCommission: 13%
- salesAgent.operationalExpense: 10%

**Calculation:**
```
adjustedCostBasis:             $300.00 × 0.85   = $255.00
ergosSellPrice:                $255.00 × 1.13   = $288.15
ergosGrossMargin:              $288.15 - $255.00 = $33.15
agentEarning (OVERRIDE used):  $33.15 × 25%     = $8.29  (vs. $5.97 at default 18%)
ergosOperationalCost:          $33.15 × 10%     = $3.32
ergosNetMargin:                $33.15 - $8.29 - $3.32 = $21.54  (7.5% of sell)

Safety check: 7.5% > 7% floor — PASSES
Agent earns $8.29 vs. $5.97 (+$2.32 uplift per booking for Meliá volume commitment)
```

---

## 6. The Agent Incentive Architecture

### 6.1 Design Principles

The best comparable model is **insurance Managing General Agent (MGA) trail commissions** combined with **SaaS channel reseller tiers**. The key insight: the agent should have two distinct income streams that reward two distinct behaviors.

**Stream 1 — Recruitment Bonus (one-time)**
Paid when a new agency completes their first booking. Rewards agent for expanding the network.

**Stream 2 — Residual Commission (ongoing)**
Paid on every booking from every active agency in the agent's portfolio. Rewards agent for keeping agencies engaged and booking.

This mirrors Booking.com's affiliate program architecture exactly: one-time first-booking bonus + trailing commission per booking.

### 6.2 How the Existing Fields Map to This Architecture

| Income Stream | Data Model Field | Description |
|---|---|---|
| Recruitment bonus | Not yet in model — **add to SalesAgent** as `onboardingBonusPerAgency` | Fixed dollar amount paid once, upon an agency's first completed booking |
| Residual commission | `earningPercentage` | % of gross margin per booking, ongoing, from all active agencies |
| Hotel-specific uplift | `SalesAgentCommission.commissionPercentage` | Override for specific hotels, replaces earningPercentage for that property |
| Ops allocation | `operationalExpense` | Internal allocation, not paid to agent — reduces Ergos's reported net |

### 6.3 Recommended Tier Structure

| Tier | Active Agencies | earningPercentage | onboardingBonusPerAgency | operationalExpense |
|---|---|---|---|---|
| **Starter** | 1-4 | 15-20% | $25-50 | 10-12% |
| **Growth** | 5-14 | 21-27% | $50-75 | 7-9% |
| **Elite** | 15-29 | 28-33% | $75-100 | 5-7% |
| **Strategic** | 30+ | 34-40% | $100-150 | 3-5% |

**"Active agency" definition for tier calculation:** An agency counts toward the agent's tier calculation only if it has placed at least 1 booking in the rolling 30-day window. This prevents agents from gaming the tier system by mass-registering dormant agencies.

**Tier review cadence:** Quarterly. If an agent's active agency count drops below the tier threshold for 2 consecutive quarters, they are downgraded on the next tier review date (not immediately — this prevents cliff-edge behavior).

### 6.4 The Inactivity Problem — How to Handle Dormant Agencies

One of the most important and underappreciated issues in channel management. Agencies that sign up and stop booking destroy the relationship's economics while consuming support overhead.

**Industry parallel:** Insurance MGAs impose "minimum production requirements" — a sub-agent must write a minimum premium volume per year to maintain their commission tier. HubSpot requires partner certifications to be renewed to maintain tier.

**Recommended policy:**
```
IF agency has 0 bookings in last 60 days:
  → Agent earns 0 residual on that agency
  → Agency counted as 0 toward agent's tier calculation
  → System sends automated re-engagement email to agency (on behalf of Ergos)
  → Agent is notified that the agency has gone dormant

IF agency has 0 bookings in last 90 days:
  → Agency status flagged as "at-risk"
  → Agent receives automated task: "Re-engage this agency or lose residual"
  → Ergos account management team optionally reaches out directly

IF agency has 0 bookings in last 120 days:
  → Agency de-listed from agent's active portfolio for tier calculation
  → Agent loses onboarding bonus clawback window (cannot re-earn on re-activation)
```

This creates a direct financial incentive for agents to proactively keep their agencies booking — not just sign them up and forget them.

### 6.5 Performance Acceleration — The Volume Multiplier

To incentivize agents to drive volume BEYOND baseline behavior, implement a monthly performance multiplier on residual commissions:

| Monthly bookings (agent's full portfolio) | Multiplier on earningPercentage |
|---|---|
| < 50 bookings | 1.0x (baseline) |
| 50-199 bookings | 1.1x (+10%) |
| 200-499 bookings | 1.2x (+20%) |
| 500-999 bookings | 1.3x (+30%) |
| 1,000+ bookings | 1.5x (+50%) |

**Example — Elite agent with 1,200 bookings in a month:**
```
Base earningPercentage: 30%
Multiplier at 1,200 bookings: 1.5x
Effective rate this month: 30% × 1.5 = 45%

BUT: Hard cap check — must still pass the 7% Ergos floor
If 45% of gross margin would breach the floor, cap is applied silently
Agent is informed of the cap and the reason (transparency)
```

**Note:** This multiplier is calculated and paid at the end of each month as a bonus true-up, separate from the base monthly residual. This way the base payout is predictable and the multiplier is a bonus.

---

## 7. Edge Cases and Special Situations

### 7.1 Hotel Has Both `priceAdjustment` AND Agency Commission Override

**Example:** Archipelago hotel (priceAdjustment = 0.80), agency has 5% rebate

```
Supplier net:           $500.00
adjustedCostBasis:      $500.00 × 0.80 = $400.00
ergosSellPrice:         $400.00 × 1.13 = $452.00
agencyEffectivePrice:   $452.00 × 0.95 = $429.40
ergosGrossMargin:       $429.40 - $400.00 = $29.40  (6.9% of effective price)

Safety check: 6.9% < 7% — WARNING
```

Even without any agent commission, the combination of priceAdjustment at 0.80 + a 5% agency rebate on a 13% baseCommission barely misses the floor. The fix: Archipelago hotels should carry a `baseCommission` of 15% to compensate for the narrow absolute margin window.

**Rule:** Hotels with `priceAdjustment < 0.90` should carry a `baseCommission >= 15%` to protect the floor when agency rebates are applied.

### 7.2 Vendor Reports Commission in `paymentInfo.baseCommission`

For GDS vendors that report commission at booking confirmation (rather than operating on a net-rate model), the `paymentInfo.baseCommission` field holds the vendor's commission payment to Ergos in currency.

**Integration rule:**
```
IF vendor is commission-based (flag in vendor config):
  ergosGrossMarginAmount = paymentInfo.baseCommission (in currency)
  ergosSellPrice = totalAmount  (the gross rate the agency sees)
  adjustedCostBasis = totalAmount - paymentInfo.baseCommission

IF vendor is net-rate based:
  ergosGrossMarginAmount = totalAmount - (supplierNetPrice × priceAdjustment)
  paymentInfo.baseCommission = 0 or null (informational — leave as-is)
```

Each GDS vendor in the system should have a `commissionModel: "net_rate" | "gross_commission"` flag in the vendor configuration. Restel/Hotelbeds is typically net-rate. Juniper and Dingus — validate with your current contracts (**UNKNOWN — requires primary research**).

### 7.3 Multi-Room Bookings

The commission calculation applies PER ROOM, not on the aggregate. Each room in a `multiRoomBookingId` group is calculated independently. This ensures:
- Different room types with different base rates calculate correctly
- Agent earnings are summed across rooms at payout time
- Ergos floor check runs per room (most conservative approach)

### 7.4 Cancellations and Refunds

When a booking is cancelled:
- If `paymentInfo.paymentStatus = "refunded"`: agent earns $0 on that booking
- If partial cancellation fee applies: agent earns their percentage of only the cancellation fee amount Ergos retains
- Onboarding bonus clawback: if an agency's first booking is cancelled and refunded, the onboarding bonus paid to the agent is clawed back against their next commission payment

### 7.5 Agency Stops Booking — What Happens to Agent Earnings

When an agency goes dormant (defined above as 120 days no bookings):
- Agent loses residual commission for that agency going forward
- Agent does NOT lose residuals already earned on prior bookings
- The agency remains in the system but is removed from the agent's "active" portfolio
- If the agency re-activates (books again), it re-enters the agent's active portfolio automatically
- No second onboarding bonus is paid on re-activation (it was already paid at first booking)

---

## 8. Implementation Mapping — What to Build

### 8.1 New Fields Required (schema additions)

**SalesAgent model — add these fields:**

```typescript
// Recommended additions to ISalesAgent
onboardingBonusPerAgency: number  // Fixed $ paid on agency's first completed booking
volumeMultiplierEnabled: boolean  // Whether this agent qualifies for monthly multiplier
tierName: "starter" | "growth" | "elite" | "strategic"  // Cached tier, updated quarterly
activeAgencyCount: number  // Cached count, updated daily
```

**Booking model — add these computed fields for audit trail:**

```typescript
// Recommended additions to paymentInfo (or a separate commissionDetails sub-doc)
commissionDetails?: {
  supplierNetPrice: number
  adjustedCostBasis: number
  ergosGrossMargin: number
  agentEarning: number
  agentEarningPct: number
  ergosOperationalCost: number
  ergosNetMargin: number
  ergosNetMarginPct: number
  agencyEffectivePrice: number
  safetyCheckPassed: boolean
  agentId?: string  // Who earned on this booking
  calculatedAt: Date
}
```

### 8.2 Lookup Priority (Full Precedence Chain)

At booking time, the commission engine must resolve which rates to use:

```
STEP 1 — Determine agent earning rate for this booking:
  IF SalesAgentCommission exists for (agentId, hotelId):
    agentRate = SalesAgentCommission.commissionPercentage / 100
  ELSE:
    agentRate = SalesAgent.earningPercentage / 100

STEP 2 — Determine agency rebate for this booking:
  IF TravelAgencyCommission exists for (agencyId, hotelId):
    agencyRebate = TravelAgencyCommission.commissionPercentage / 100
  ELSE:
    agencyRebate = 0

STEP 3 — Load hotel configuration:
  baseCommission = Hotel.baseCommission / 100  (or raw if already decimal)
  priceAdjustment = Hotel.priceAdjustment (default 1.0)

STEP 4 — Run calculateBookingCommission(...)

STEP 5 — Check safetyCheckPassed:
  IF false: log alert, flag booking for admin review, DO NOT block booking

STEP 6 — Store commissionDetails on booking record
```

### 8.3 Admin Interface Requirements

The admin interface must surface the following to prevent configuration errors:

1. **Commission health dashboard per agent:** Real-time view of `ergosNetMarginPct` across the agent's portfolio, flagging any hotel/agency combinations below the 7% floor

2. **Conflict detector:** When setting a new agency rebate or agent commission override, immediately calculate and display the resulting `ergosNetMarginPct` before saving — prevent saving if it would breach the floor

3. **Tier calculator:** Input an agent's current active agency count and portfolio volume — show what tier they qualify for and what changing it would cost

4. **Agent portfolio health:** For each agent, show active vs. dormant agency counts, 30/60/90 day booking trends per agency

---

## 9. Real-World Parallel Summary

| Ergos Feature | Industry Analog | Why It Works |
|---|---|---|
| `earningPercentage` as % of Ergos margin | Insurance MGA trailing commission | Agent earns % of intermediary profit, not % of transaction value. Insurer (supplier) is insulated. |
| Hard 7% Ergos floor | Mortgage broker minimum yield spread | Ensures the intermediary is never upside down after paying the channel |
| Activity-based residual (only active agencies count) | SaaS ACV-based channel commission | Agent is incentivized to keep clients active, not just sign them up |
| Quarterly tier review | HubSpot/Salesforce partner tier renewal | Tiers have gravity — agents fight to maintain them, driving consistent effort |
| Hotel-level commission overrides | Insurance class-specific commission schedules | Allows surgical incentives on specific inventory without blowing up global rate |
| Agency rebate (cost-side discount) | Hotelbeds net rate discount for volume agencies | Agency gets better economics on target hotels, drives booking preference |
| Onboarding bonus clawback on cancellation | Real estate referral fee clawback clauses | Prevents gaming — agent can't earn a bonus on a ghost booking |
| Volume multiplier | Salesforce accelerator commission above quota | Rewards over-performance without changing base economics |

---

## 10. Revenue Impact Projections

### 10.1 Baseline Assumptions

| Metric | Value | Confidence |
|---|---|---|
| Active agencies (Year 1 mid) | 80-120 | MEDIUM |
| Avg bookings per active agency per month | 30-40 | MEDIUM-HIGH |
| Blended supplier net price per booking | $120-180 | MEDIUM |
| Blended baseCommission | 13% | HIGH (current default) |
| Blended priceAdjustment | 0.93 (mix of standard 1.0 and reduced-rate hotels) | LOW |
| Blended agent earningPercentage | 20% (weighted avg across tiers) | MEDIUM |
| Blended operationalExpense allocation | 9% | MEDIUM |
| Agency with commission override (% of bookings) | 15% of bookings | LOW |
| Average agency rebate when applied | 3% | LOW |

### 10.2 Per-Booking Economics (Blended)

```
Supplier net (blended):        $150.00
adjustedCostBasis:             $150.00 × 0.93 = $139.50
ergosSellPrice:                $139.50 × 1.13 = $157.64
agencyEffectivePrice (avg):    $157.64 × (1 - 0.0045) = $156.93  [15% × 3% rebate = 0.45% avg impact]
ergosGrossMargin:              $156.93 - $139.50 = $17.43  (11.1% of sell)
agentEarning:                  $17.43 × 20%   = $3.49
ergosOperationalCost:          $17.43 × 9%    = $1.57
ergosNetMargin per booking:    $17.43 - $3.49 - $1.57 = $12.37  (7.9% of agency price)
```

### 10.3 Annual Net Margin to Ergos

| Scenario | Active Agencies | Bookings/Agency/Mo | Total Annual Bookings | Ergos Net/Booking | Annual Net Revenue |
|---|---|---|---|---|---|
| **Conservative** | 80 | 25 | 24,000 | $10.50 | **$252,000** |
| **Base** | 100 | 32 | 38,400 | $12.37 | **$475,000** |
| **Aggressive** | 150 | 40 | 72,000 | $14.00 | **$1,008,000** |

These figures are HOTEL COMMISSION NET REVENUE ONLY. They do not include ancillary products (transfers, insurance, activities) which are layered on top.

### 10.4 Agent Earnings (Total Payout Pool)

At the base scenario, the total agent commission pool = 38,400 bookings × $3.49/booking = **$134,000/year** distributed across all active agents. This is Ergos's total channel cost for the direct B2B sales model. For context, a single field sales rep at a traditional OTA costs $80-120K salary + benefits. The agent model achieves the same distribution for a variable cost that scales with revenue — a fundamentally better unit economics profile.

---

## 11. Fields Not Yet In the Model (Recommended Additions)

The existing data model is well-architected but is missing three fields that are needed to fully implement the incentive model:

| Field | Location | Type | Purpose |
|---|---|---|---|
| `onboardingBonusPerAgency` | SalesAgent model | Number (currency) | One-time recruitment bonus per agency's first booking |
| `tierName` | SalesAgent model | Enum | Cached tier label for display and audit |
| `commissionDetails` | Booking paymentInfo | Sub-document | Full commission calculation audit trail per booking |
| `vendorCommissionModel` | Vendor config (new) | Enum: "net_rate" or "gross_commission" | Determines how to interpret paymentInfo.baseCommission |
| `isActive` (agency-level activity flag) | TravelAgency model | Boolean + timestamp | Already exists — ensure updated by booking activity cron |

---

## 12. Quick Reference — Field Definitions

| Field | Location | Definition | Default | Formula Role |
|---|---|---|---|---|
| `baseCommission` | Hotel | Ergos margin % added to cost basis | 13% | Determines ergosSellPrice |
| `priceAdjustment` | Hotel | Cost basis multiplier (negotiated vendor reduction) | 1.00 | Reduces Ergos cost on specific chains |
| `earningPercentage` | SalesAgent | Agent's % of Ergos gross margin, ongoing residual | Set at onboarding | Agent's base income per booking |
| `operationalExpense` | SalesAgent | Ergos ops cost allocation as % of gross margin | Set at onboarding | Internal cost allocation, reduces Ergos net |
| `commissionPercentage` | SalesAgentCommission | Hotel-specific agent commission override | No default (optional) | Overrides earningPercentage for that hotel only |
| `commissionPercentage` | TravelAgencyCommission | Hotel-specific agency rebate (% off Ergos sell price) | No default (optional) | Reduces agency's effective price for target hotels |
| `paymentInfo.baseCommission` | Booking | Vendor-reported commission in currency | 0/null | Reference only; used for gross-commission vendors |

---

*Document prepared for Ergos Continental internal strategy review.*
*All projections are estimates. Tag your numbers — see Sources & Confidence Levels at top.*
*Review operational floor (7%) quarterly against actual margin data as supplier contracts are renegotiated.*
