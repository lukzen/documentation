# Travel Revenue Strategist — Persistent Memory

## Ergos Continental Platform

### Architecture
- Multi-GDS B2B hotel aggregation middleware
- Sits between GDS suppliers and travel agencies
- Suppliers: Juniper/Roibos, Hoteltec, Dingus, Restel (Hotelbeds product)
- Primary markets: Europe (EU/Mediterranean) and Latin America
- NOT an OTA — does not sell to end consumers directly

### Key Financial Benchmarks (validated April 2026)

#### B2B Bed Bank Take Rates (% of TTV) — HIGH confidence
- WebBeds (Webjet/Web Travel Group): **6.5% of TTV** (stabilized long-term target; confirmed FY26)
- HBX Group / Hotelbeds: **8.4–9.4% of TTV** (Q1 2026 = 8.4%, prior year ~9.3%)
- Blended industry benchmark for top-tier bed banks: **7–9%**
- These are gross takes on full TTV — everything from EBITDA to ops comes out of this

#### B2B Bed Bank EBITDA Profiles (HIGH confidence)
- WebBeds: 49–52% EBITDA on gross revenue → net ~3.2–3.4% of TTV
- Hotelbeds: 50–60% EBITDA on gross revenue → net ~4.2–5.6% of TTV
- Both retain ~50–60% of gross revenue as EBITDA after all platform costs

#### Legacy Wholesaler Markups (on net rates) — MEDIUM confidence
- GTA, Tourico, JacTravel (pre-consolidation 2015-2019): 10–18% on net
- DOTW, Bonotel (luxury focus): 12–20% on net
- Industry norm was 12–15% before margin compression

#### OTA Commission Context (B2C ceiling)
- Booking.com: 15–25% (avg ~18–20%)
- Expedia: 15–30% (chains 10–15%, independents 20–30%)
- Booking Holdings overall take rate: ~15% of gross bookings

#### GDS Context
- Hotel GDS commissions to TMCs: ~10% (embedded in commissionable rate)
- GDS commissionable rates are 15–20% above net rates
- Total GDS hotel commissions paid 2024: $2.1 billion (Skift)

#### Agency Downstream Markup (what agencies add on top of Ergos prices)
- Standard leisure: 15–25%
- Corporate TMC: 8–15%
- Tour operator / packaging: 20–30%
- Resort/all-inclusive focus: 20–30%

### baseCommission Decision (April 2026)
- **Recommended default: 12%** (down from arbitrary 13%)
- Configurable range: **8–20%** (25% absolute cap with admin gate)
- Rationale: Sits between tech-pipe aggregator (2–7%) and legacy full-service wholesaler (15–18%)
- 13% is not wrong but compresses agency margin at end-consumer level
- Caribbean/LATAM resort-heavy mix would justify 13–15%
- High-volume enterprise agency deals: offer 8–10%
- See: ERGOS_BASE_COMMISSION_ANALYSIS.md for full evidence

### Net Margin Floor Analysis (April 2026)
- **7% floor of sell price is CORRECT and derivable from first principles**
- Grounded in: fixed cost floor (~2.5–3.5% of sell price) + minimum profit contribution (~3.5–4%)
- WebBeds/Hotelbeds analogy: both retain ~50–60% of gross revenue as EBITDA
- At 12% base: gross margin = 10.7% of sell price; 7% floor = 65.4% gross margin retention
- **`operationalExpense` field (3–12%) is per-agent VARIABLE cost only — NOT total platform cost**
- Total platform operating costs = 35–69% of gross revenue (covers payment processing, tech, G&A, support, sales)
- Payment processing alone = ~1.0–2.0% of sell price (largest fixed cost item)
- Floor should scale with baseCommission tier: 4.5–5.5% for 8–10% base; 7% for 12% base; 8–10% for 15–20% base
- Secondary check recommended: Ergos must retain >= 50% of gross margin (addresses edge cases where sell price denominator distorts % check)
- Floor should be reviewed annually; will compress toward 5% at WebBeds-scale volume
- See: ERGOS_NET_MARGIN_FLOOR_ANALYSIS.md for full derivation

### Floor vs. baseCommission Co-dependency (Critical Design Constraint)
- A 7% floor is impossible to sustain at 8–10% baseCommission with any agent commission
- At 12% base + 25% agent + 8% ops: net = 7.2% (barely passes)
- At 12% base + Elite agent 32% + 8% ops: net = ~4.7% (fails)
- Elite agents + agency rebates on low-base hotels WILL breach the 7% floor — must use conflict detector

### Regional Commission Benchmarks
- Western Europe: 8–14% (competitive, many direct options)
- Mediterranean/Southern Europe: 10–16% (resort-heavy, leisure dominant)
- Caribbean/Mexico: 12–20% (all-inclusive, less agency direct access)
- Latin America: 12–18% (less digitally mature, currency complexity)
- SE Asia: 8–14% (price-sensitive, tech-first aggregators)

### Distribution Chain Math
- Full chain premium over hotel net rate must stay ~25–35% or end price exceeds OTA retail
- Formula: (1 + Ergos%) x (1 + Agency%) = end consumer multiple
- At Ergos 12% + Agency 15%: end = $128.80 on $100 net (+28.8%) — competitive
- At Ergos 13% + Agency 20%: end = $135.60 (+35.6%) — risks being above OTA retail

### Documents Produced
- ERGOS_BASE_COMMISSION_ANALYSIS.md — commission validation with full benchmark data
- ERGOS_COMMISSION_MODEL.md — complete commission and agent model design
- ERGOS_COMMISSION_MODEL_VALIDATION.md — investor-grade validation of commission model
- ERGOS_NET_MARGIN_FLOOR_ANALYSIS.md — first-principles derivation of the 7% net margin floor
- MOZIO_BUSINESS_PLAN.md — transfer ancillary revenue model

### User Preferences
- No emojis in documents
- Every number tagged with confidence level (HIGH/MEDIUM/LOW)
- Sources cited with links at end of every document
- Actionable recommendations with specific numbers, not vague ranges
- Professional tone; documents should meet investor/board standard
- Floor analysis should include: cost structure breakdown, industry analogs, formula derivations, and sensitivity tables