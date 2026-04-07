# Ergos Continental — B2B Hotel Commission Benchmark Analysis

## Validating the Default `baseCommission` Markup Percentage

**Document Date:** April 6, 2026
**Prepared by:** Revenue Strategy — Ergos Continental
**Classification:** Internal Strategic / Confidential

---

## Confidence Key

Every number is tagged:

- **HIGH** — Publicly verifiable from earnings reports, regulatory filings, or exchange-listed company disclosures
- **MEDIUM** — Derived from credible industry sources, analyst reporting, or consistent cross-source patterns
- **LOW** — Informed estimate with limited supporting data; requires validation

---

## 1. Executive Summary

The current `baseCommission` default of **13%** is defensible but sits at the upper boundary of what large-scale B2B hotel bed banks charge in mature markets. It is **not wrong**, but it was set without data, and that gap in reasoning creates risk — both commercially (overpricing relative to well-capitalized competitors) and strategically (leaving potential revenue on the table if the platform's value proposition justifies more).

**Bottom line recommendation: Set `baseCommission` to 12%, with a configurable range of 8–20%.**

The reasoning, evidence, and nuance follow.

---

## 2. The Distribution Stack — How Money Moves

Before examining numbers, the structural context matters. Ergos is not a bed bank and not an OTA. It is a **B2B aggregation middleware layer**. The money flow looks like this:

```
Hotel (property)
    |
    | Net rate (e.g., $100/night, all-in)
    v
GDS Supplier / Bed Bank (Juniper, Hoteltec, Dingus, Restel/Hotelbeds)
    |
    | Sells to Ergos at net rate (or with supplier-side margin already embedded)
    v
Ergos Continental  <-- THIS IS WHERE baseCommission APPLIES
    |
    | Adds baseCommission markup (currently 13%) --> Agency sees $113/night
    v
Travel Agency
    |
    | Adds agency markup (typically 10–30% more)
    v
End Customer / Traveler
```

This is critical. The 13% Ergos markup sits **on top of whatever the supplier has already taken**. The agency then adds another layer. The cumulative chain means any single layer's margin must be calibrated against the full stack the end customer experiences.

---

## 3. Benchmark Data by Layer

### 3.1 Large B2B Bed Banks (Hotelbeds / HBX Group, WebBeds)

These are the closest analogues to Ergos's direct suppliers — and, in some cases (Restel is a Hotelbeds product), Ergos is literally distributing their inventory.

#### WebBeds (Webjet Limited — ASX: WJL)

WebBeds is publicly listed, which provides the cleanest hard data available.

| Metric | Value | Confidence | Source |
|---|---|---|---|
| FY24 TTV | $4.0 billion | **HIGH** | Webjet Limited FY24 Annual Report |
| FY24 Revenue | ~$260M (WebBeds segment) | **HIGH** | Webjet Limited FY24 results |
| Revenue margin (% of TTV) | ~6.5% stabilized target | **HIGH** | Web Travel Group, Capital Brief |
| FY24 actual revenue margin | 8.2% (unusually high, one-time factors) | **HIGH** | Web Travel Group FY25 results commentary |
| FY25 revenue margin | 6.7% (normalized) | **HIGH** | Web Travel Group FY25 results |
| 1H26 revenue margin | 6.5% (on-track, confirmed) | **HIGH** | Web Travel Group 1H26 announcement |
| Medium-term TVM target | "stabilize at c. 6.5%" | **HIGH** | Web Travel Group FY26 guidance |
| EBITDA margin (on revenue) | ~49–52% | **HIGH** | Multiple Webjet results announcements |

**What this means:** WebBeds, the second-largest B2B bed bank in the world, earns approximately **6.5% of total transaction value** as its revenue. This is its gross take — the spread between what it pays suppliers and what it charges travel agency buyers. Everything from EBITDA to salaries to API infrastructure comes out of this 6.5%.

#### HBX Group (Hotelbeds — BME: HBX)

Hotelbeds is also now publicly listed on the Bolsa de Madrid.

| Metric | Value | Confidence | Source |
|---|---|---|---|
| H1 2025 TTV | €3.4 billion | **HIGH** | HBX Group H1 2025 press release |
| H1 2025 Revenue | €319 million | **HIGH** | HBX Group H1 2025 press release |
| H1 2025 implied take rate | ~9.4% (€319M / €3.4B) | **HIGH (calculated)** | HBX Group H1 2025 |
| Q1 2026 take rate | 8.4% (explicitly stated, down from 9.3%) | **HIGH** | HBX Group Q1 2026 trading update |
| Q1 2026 take rate delta | -0.9pp vs. prior year | **HIGH** | HBX Group Q1 2026 update, Morningstar |
| EBITDA margin (adjusted) | ~50–60% (on revenue) | **HIGH** | HBX Group financial disclosures |

**What this means:** Hotelbeds takes approximately **8.4–9.4% of TTV** as its gross revenue spread. This is higher than WebBeds' 6.5% target, reflecting Hotelbeds' larger direct hotel contracting base, more proprietary content, and premium positioning.

#### Summary: Top-Tier Bed Bank Take Rates

| Company | Take Rate (% of TTV) | Confidence |
|---|---|---|
| WebBeds (stabilized target) | 6.5% | HIGH |
| HBX Group / Hotelbeds | 8.4–9.4% | HIGH |
| **Blended industry benchmark (bed banks)** | **~7–9%** | HIGH |

These are the **largest, most efficient B2B hotel intermediaries in the world** — with direct hotel contracts, scale advantages, and billions in TTV. A smaller platform like Ergos, operating at earlier stage with less direct negotiating leverage, would typically command a **higher percentage**, not lower, because it lacks the volume discounts these giants have.

---

### 3.2 Traditional Wholesalers and Consolidators (GTA, Tourico, DOTW, Bonotel)

These pre-internet-era consolidators (most now absorbed or shuttered) historically operated at:

| Player | Typical Markup on Net Rates | Confidence | Notes |
|---|---|---|---|
| GTA (Kuoni) | 10–15% | MEDIUM | Industry pattern recognition; GTA absorbed into HotelBeds 2017 |
| Tourico | 10–18% | MEDIUM | Merged into HotelBeds 2017; pre-merger documentation |
| DOTW (Destinations of the World) | 12–20% | MEDIUM | More leisure/luxury focus; higher ADR justifies higher margin |
| JacTravel | 10–15% | MEDIUM | Acquired by WebBeds 2018 |
| Bonotel | 12–18% | MEDIUM | Specialty luxury focus; no longer independent |
| Sunhotels | 8–15% | MEDIUM | Technology-focused, lower margin strategy |

**Pattern:** Legacy wholesalers typically operated at **10–18% markup on net rates** when selling to travel agencies. The upper end (15–20%) applied to luxury/resort inventory; the lower end (8–12%) to high-volume, commodity hotel bookings.

The consolidation wave (2015–2019) that merged most of these players into Hotelbeds and WebBeds was partly driven by margin compression from OTA transparency. Post-merger, the combined entities operate at the lower 6.5–9.4% TTV range shown above.

---

### 3.3 GDS Systems (Amadeus, Sabre, Travelport) — Context Only

GDS systems operate under a fundamentally different model from bed banks. They are transaction pipe providers, not merchants of record.

| Metric | Value | Confidence | Source |
|---|---|---|---|
| Total hotel commissions paid through GDS (2024) | $2.1 billion | HIGH | Skift Research 2025 |
| Total GDS hotel bookings/year | ~200 million | HIGH | Skift Research 2025 |
| Typical hotel commission to travel agent (GDS) | 10% | MEDIUM | Industry standard; Skift GDS commission article |
| GDS fee structure (to hotels) | $2–4/booking + commission share | MEDIUM | Industry standard |
| GDS contribution as % of global hotel revenue | ~25% | HIGH | Skift Research 2025 |
| Typical GDS commissionable rate premium over net | 15–20% higher than net rates | MEDIUM | Industry pattern |

**Key insight:** GDS commissionable rates are inherently 15–20% richer than net rates because the gross commission (typically 10%) is built into the displayed rate. When a hotel "pays 10% commission" through a GDS, it is really embedding that in a rate that is 10–12% higher than the net rate it would offer a bed bank.

---

### 3.4 OTA Comparisons (B2C Context)

OTAs are not a direct comparator to Ergos (B2B vs. B2C), but they set the ceiling for what the distribution stack can absorb.

| OTA | Commission Range Charged to Hotels | Confidence | Source |
|---|---|---|---|
| Booking.com | 15–25%, avg ~18–20% | HIGH | Industry standard; Booking Holdings investor docs |
| Expedia | 15–30% (10–15% major chains; 20–30% independents) | HIGH | Expedia investor docs; industry reporting |
| Agoda | 15–20% | MEDIUM | Regional variation; higher in Asia |
| Booking Holdings overall take rate | ~15% of gross bookings | HIGH | BKNG 10-K; $21.4B revenue / $143B gross bookings 2023 |

**OTA merchant model take rates** (where OTA buys net and marks up) run **20–30%** according to market analysis. This is relevant because it establishes the absolute ceiling of what the total distribution chain can accommodate before hotels pull inventory.

---

### 3.5 Travel Agency Downstream Markup (What Agencies Do With Ergos Rates)

Understanding what agencies add on top of Ergos pricing is essential to calibrating Ergos's own margin without pricing the chain out.

| Agency Type | Typical Markup on B2B Net Rates | Confidence | Source |
|---|---|---|---|
| Independent leisure agency | 15–25% | MEDIUM | DMCQuote industry guide; multiple sources |
| Corporate TMC | 8–15% (less markup, more service fee) | MEDIUM | GDS commission structure analysis |
| Tour operator (packaging) | 20–30% | MEDIUM | DOTW/GTA-era industry documentation |
| Business hotel focus (3–4 star city) | 12–20% | MEDIUM | Multiple B2B platform guides |
| Resort/leisure (4–5 star) | 20–30% | MEDIUM | DMCQuote 2025/2026 commission guide |

---

## 4. The Full Distribution Chain Math

### What can the total chain support?

If a hotel offers a net rate of $100/night, here is what various intermediary configurations look like for the end consumer:

| Configuration | Ergos Markup | Agency Markup | End Price | Premium Over Net |
|---|---|---|---|---|
| Ergos 8% + Agency 15% | $108 | $124 | $124 | +24% |
| Ergos 10% + Agency 15% | $110 | $126.50 | $126.50 | +26.5% |
| **Ergos 12% + Agency 15%** | **$112** | **$128.80** | **$128.80** | **+28.8%** |
| Ergos 13% + Agency 15% | $113 | $129.95 | $129.95 | +30% |
| Ergos 15% + Agency 15% | $115 | $132.25 | $132.25 | +32.25% |
| Ergos 13% + Agency 20% | $113 | $135.60 | $135.60 | +35.6% |
| Ergos 15% + Agency 20% | $115 | $138 | $138 | +38% |
| OTA direct (Booking.com) | — | — | ~$115–125 | +15–25% |

**The critical boundary:** When the total chain premium exceeds approximately 30–35% over net, hotel inventory may display at or above OTA retail rates. This is the "rate parity breach threshold." If an agency using Ergos sees rates higher than Booking.com, they stop booking through Ergos.

At Ergos 13% + Agency 15%, the end price is $129.95 — which is within the OTA range (Booking.com at ~15–25% = $115–$125). This is competitive but tight. With a 20% agency markup, the end consumer pays $135.60 — likely above OTA rates on the same inventory.

This means **13% is workable if agency markups are controlled, but it compresses the agency's ability to compete** at the end-consumer level.

---

## 5. What Ergos Actually Is vs. Pure Bed Banks

This comparison requires nuance. Ergos is **not** a bed bank. It is a **middleware/aggregation platform** — it does not contract directly with hotels. This structural difference affects margin calibration in two directions:

**Arguments for a HIGHER margin than bed banks (6.5–9.4%):**

1. **Ergos takes on less contractual risk** — bed banks guarantee room allotments and carry inventory risk. Ergos's dynamic API model has minimal unsold inventory exposure.
2. **Platform value creation** — Ergos adds multi-GDS comparison, UX, agency tooling, and payment infrastructure. This is a service layer justifying a premium beyond raw inventory arbitrage.
3. **Early-stage volume** — without scale, Ergos cannot negotiate the rock-bottom net rates that WebBeds and Hotelbeds achieve. The margin must be wider to absorb the same absolute dollar operations.
4. **Agency relationship management** — Ergos handles the agency onboarding, support, billing, and training that bed banks delegate. This costs money.

**Arguments for a LOWER or SIMILAR margin to bed banks:**

1. **Agencies may have direct bed bank access** — agencies using Ergos to access Hotelbeds inventory (via Restel) likely also have direct Hotelbeds credentials. If Ergos's effective price is visibly higher, agencies arbitrage around it.
2. **Competitive market** — RateHawk, Dida Travel, Zentrumhub, and dozens of aggregators compete with Ergos's exact value proposition. Most offer 0–7% platform margin, pushing price competition to the net rate.
3. **Long-term LTV over short-term margin** — at early stage, agency acquisition matters more than margin maximization. A 10% markup that retains 100 agencies is worth more than a 15% markup that retains 60.

---

## 6. Regional Variation in Applicable Margins

| Region | Typical B2B Markup Range | Rationale | Confidence |
|---|---|---|---|
| Western Europe (UK, France, Germany, Benelux) | 8–14% | Highly competitive; agencies have many direct options; rate parity tightly enforced | MEDIUM |
| Southern Europe / Mediterranean (Spain, Italy, Greece, Portugal) | 10–16% | Resort-heavy; more opaque pricing; leisure booking dominant | MEDIUM |
| Caribbean / Mexico (CUN, MBJ, PUJ, CUN) | 12–20% | All-inclusive dominant; less agency direct access; higher ADR justifies higher margin | MEDIUM |
| Latin America (Colombia, Peru, Chile, Brazil) | 12–18% | Less developed direct access; B2B platforms can command more; currency complexity adds friction | MEDIUM |
| Middle East | 10–16% | Growing market; UAE and Saudi investment in direct hotel connectivity reducing intermediary value | LOW |
| Southeast Asia | 8–14% | Agoda/Booking.com dominant; very price-sensitive; many tech-first aggregators | LOW |
| North Africa | 10–18% | Less digitally mature; fewer direct channels; B2B intermediary adds genuine value | LOW |

**Implication for Ergos:** Given the platform's European and LATAM focus (per the business plan), a blended default of **10–14% is the appropriate range**, with **12% as the central default**.

---

## 7. Head-to-Head: 13% vs. Alternatives

| Scenario | Ergos Markup | Annual Revenue Impact (on 55K bookings, $150 avg booking) | Notes |
|---|---|---|---|
| Current default | 13% | $1.07M gross revenue | Baseline |
| Conservative reduction | 10% | $0.825M | $248K revenue loss but likely higher conversion/volume |
| Recommended default | 12% | $0.99M | $82K revenue loss but defensible margin; aligns with industry |
| Aggressive retention | 8% | $0.66M | $412K loss; only viable if volume increases compensate |
| Premium tier (luxury/resort) | 15–18% | $1.24–$1.49M | Only sustainable on luxury/all-inclusive segments |

**Important caveat:** These are gross revenue figures from the markup alone. Ergos also earns from subscription fees, ancillary services, and any override commissions from suppliers — so the `baseCommission` is not the only P&L lever.

---

## 8. The Definitive Recommendation

### Default `baseCommission`: 12%

**Justification by evidence tier:**

**HIGH-confidence anchors:**
- WebBeds (world's second-largest bed bank) stabilizes at 6.5% TTV take rate — Ergos, as a smaller platform with more service layer, is appropriately higher
- HBX Group / Hotelbeds runs at 8.4–9.4% TTV take rate — setting the market benchmark for a full-service B2B bed bank
- Booking Holdings OTA take rate of ~15% sets the absolute B2C ceiling

**MEDIUM-confidence anchors:**
- Legacy wholesalers (GTA, Tourico, DOTW) historically operated at 10–18% markup on net rates; the industry norm pre-consolidation was 12–15%
- Direct hotel GDS commissions run at ~10% to travel agents, with rates embedded 15–20% above net, implying an effective B2B intermediary take of 10–15% on underlying net value
- Aggregator platforms (per multiple B2B technology guides) that sit as middleware above bed banks typically operate at 2–7% platform margin — but these are tech pipes without agency management

**Synthesis:** Ergos's role combines elements of a wholesaler (price comparison, margin control), a platform (agency tools, multi-GDS aggregation), and a distribution agent (agency management, support). The appropriate margin sits between the pure tech-pipe (2–7%) and the legacy full-service wholesaler (15–18%). The center of that range, accounting for Ergos's early-stage need to acquire agencies and compete with direct bed bank access, is **10–14%**, with **12% as the defensible midpoint**.

### Why Not Stay at 13%?

13% is not wrong, but it was set without data. Now that the data is in, 12% is more defensible for three reasons:

1. It aligns with the documented historical norm of major legacy wholesalers before margin compression (10–15%), without sitting at the high end
2. It gives agencies 1 percentage point more room to compete at the consumer level — which matters more for platform growth than the marginal $150K/year revenue difference at current volume
3. It gives Ergos room to negotiate: offering "only 10% platform margin" to a large agency volume commitment is a more compelling sales argument than "we'll drop from 13% to 12%"

### Configurable Range: 8%–20%

The `baseCommission` should be a **default**, not a ceiling. The platform architecture should support:

| Tier | Markup Range | Use Case |
|---|---|---|
| Competitive entry | 8–10% | Large agency accounts; high-volume commitment; markets with direct bed bank competition |
| Standard default | 12% | General platform default for all new agency activations |
| Premium/resort | 14–16% | Caribbean, Maldives, all-inclusive resort inventory where competition is lower |
| Luxury/specialty | 16–20% | Ultra-luxury, small-group operators, bespoke itineraries with high value-add service |

---

## 9. What 13% Gets Right

To be complete: there are arguments for 13% or even higher in specific contexts:

1. **Early-stage platform operating costs** — a startup platform has higher per-booking cost than WebBeds at $4B TTV. 13% helps cover technology, support, and CAC at low volume
2. **LATAM markets** — agencies in Colombia, Peru, and Mexico often face less direct competition and will pay a higher platform margin if the UX is superior
3. **Caribbean/resort focus** — if a significant portion of Ergos bookings are Dominican Republic, Cancun, and Jamaica all-inclusives, 13–16% is entirely normal
4. **No price transparency to end customer** — in true B2B, the agency doesn't always see the net rate. If the agency finds the Ergos-displayed price competitive for their end consumer, markup is invisible

**If Ergos's current booking mix is >40% Caribbean/resort, 13% may actually be conservative.**

---

## 10. Action Items

1. **Set `baseCommission` to 12%** in the platform configuration as the new default, effective immediately for new agency accounts
2. **Audit existing agency mix** — if Caribbean/LATAM resort bookings dominate, reconsider (13–15% may be appropriate)
3. **Build tiered markup logic** — allow destination-level or hotel-category-level override of `baseCommission` (e.g., +3% on resort, -2% on large corporate accounts)
4. **Negotiate supplier override commissions** — Juniper, Hoteltec, Dingus, and Restel all offer volume-based override commissions (typically 1–3% above standard API rates at volume thresholds). At scale, these reduce Ergos's effective cost basis and allow the platform margin to expand without raising agency prices
5. **Monitor agency price competitiveness quarterly** — if agency churn signals price sensitivity, reduce to 10%; if demand is inelastic, test 14%

---

## 11. Sources

All sources cited, with confidence assessment:

| Source | Type | Confidence | URL |
|---|---|---|---|
| Web Travel Group FY24 Results | Listed company financial filing | HIGH | [webtravelgroup.com](https://www.webtravelgroup.com/news/fy24-results/) |
| Web Travel Group 1H26 Results | Listed company financial filing | HIGH | [webtravelgroup.com](https://www.webtravelgroup.com/news/1h26/) |
| Capital Brief — WebBeds margin analysis | Financial journalism | HIGH | [capitalbrief.com](https://www.capitalbrief.com/briefing/web-travel-group-reports-webbeds-growth-but-margins-subdued-01259f20-15c8-4862-888d-6d3b3963f192/) |
| HBX Group H1 2025 financial results | Listed company financial filing | HIGH | [investors.hbxgroup.com](https://investors.hbxgroup.com/English/news/news-details/2025/HBX-GROUP-H1-2025-RESULTS/default.aspx) |
| HBX Group Q1 2026 trading update | Listed company filing | HIGH | [prnewswire.com](https://www.prnewswire.com/news-releases/hbx-group-q1-trading-update-for-the-three-months-ended-31-december-2025-302672420.html) |
| Skift — GDS commissions 2025 | Industry journalism | HIGH | [skift.com](https://skift.com/2025/05/22/how-gds-commission-shares-impact-global-hotel-and-agency-revenue/) |
| Booking Holdings 10-K 2023 | SEC filing | HIGH | [sec.gov](https://www.sec.gov/Archives/edgar/data/1075531/000107553119000009/bkng1231201810k.htm) |
| DMCQuote agent commission guide | Industry platform | MEDIUM | [dmcquote.com](https://dmcquote.com/agent-commission-rates) |
| AltexSoft — bed banks explainer | Industry technology journalism | MEDIUM | [altexsoft.com](https://www.altexsoft.com/blog/bed-banks/) |
| Mize — hotel wholesalers list | Industry blog | MEDIUM | [mize.tech](https://mize.tech/blog/the-most-complete-hotel-wholesalers-and-bed-banks-list/) |
| HOTREC 2024 European Hotel Distribution Study | Industry association research | MEDIUM | [hotrec.eu / roiback summary](https://en.roiback.com/rb-academy/hotrec-study-on-european-hotel-distribution-in-2024) |
| Cloudbeds — bed banks explainer | Hotel tech platform | MEDIUM | [cloudbeds.com](https://www.cloudbeds.com/articles/bed-banks/) |
| Zentrumhub — top hotel suppliers 2025 | Industry blog | MEDIUM | [zentrumhub.com](https://www.zentrumhub.com/top-10-hotel-suppliers-in-2025-guide-for-otas/) |

---

*Document prepared for internal strategic use. Numbers should be validated against direct supplier commercial agreements as they become available.*
