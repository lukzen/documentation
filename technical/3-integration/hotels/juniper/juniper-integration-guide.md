# Juniper Integration — Development Guide

A guide for understanding how Juniper integration works at Ergos Continental. **The key fact to absorb first**: Juniper is *not* a separate adapter — it is the XML protocol underneath the `Roibos` adapter. Roibos is a booking-engine product built on Juniper's API.

> **Prerequisites:** Read [Reservation System Multi-GDS Analysis](../../../2-architecture/6-RESERVATION_SYSTEM_MULTI_GDS_ANALYSIS.md) first for the `VendorAdapter` pattern.

---

## Table of Contents

1. [Overview — Juniper vs Roibos](#1-overview--juniper-vs-roibos)
2. [Juniper XML API Reference](#2-juniper-xml-api-reference)
3. [Critical Implementation Rules (Juniper Certification)](#3-critical-implementation-rules-juniper-certification)
4. [What Exists Today](#4-what-exists-today)
5. [Backend Walkthrough](#5-backend-walkthrough)
6. [Configuration & Environment Variables](#6-configuration--environment-variables)
7. [Adding a New Juniper-based Vendor](#7-adding-a-new-juniper-based-vendor)
8. [The Juniper Booking Flow](#8-the-juniper-booking-flow)
9. [Testing Checklist](#9-testing-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Risks & Edge Cases](#11-risks--edge-cases)
12. [Code References](#12-code-references)

---

## 1. Overview — Juniper vs Roibos

### What

**Juniper** is an XML-based hotel booking API standard, used by many booking-engine vendors (Roibos being one of them). The Juniper certification spec defines required field ordering, timeout handling, the `@Status` polling pattern, the `PriceRange` price-drift handling, etc.

**Roibos** is one specific Juniper-based vendor. At Ergos Continental, our `RoibosAdapter` implements the Juniper protocol — so anything Juniper-compliant (Roibos today, other tenants in the future) can be onboarded by reusing this adapter with a different config.

### Why

Many smaller and mid-tier global hotel-booking engines speak Juniper natively. Building one Juniper-compliant adapter and dispatching to different upstream tenants gives us low-friction expansion across the Juniper ecosystem.

### The Mapping (vendor → adapter)

| Vendor name (catalog) | Adapter | What it actually is |
|---|---|---|
| `roibos` | `RoibosAdapter` | A Juniper-protocol booking engine (current implementation reference) |
| *(future)* | `RoibosAdapter` with different config | Any other Juniper-compliant tenant; same code, different `baseUrl` + creds |

The catalog stores `Hotel.vendor = "roibos"` and `Hotel.vendorKey = "roibos"` for hotels coming from the current Juniper integration. The vendor label in `vendor-mapping.ts` reads `"Roibos/Juniper"` to remind operators of the relationship.

### How Juniper Differs from the Other Adapters

| Trait | Juniper (Roibos) | Dingus | Hotetec | Restel |
|---|---|---|---|---|
| Protocol | SOAP / XML, very strict envelope | SOAP / XML | REST / JSON | Custom XML |
| Endpoint shape | `/JP/Operations/{op}.asmx` | one SOAP endpoint | `/pull/*` REST | one URL, op decided by XML body |
| Booking-status polling | **mandatory** — read `@Status` from every booking response | sync | sync | three-phase |
| Price-drift handling | **mandatory** — send `PriceRange` (min 25%, max 100% of quote) | trust the supplier | `applyPriceAdjustment` (small drift only) | re-quote on confirm |
| `ExternalBookingReference` required | **yes** — our locator, sent every time | no | no | no |
| Nationality must match across the flow | **yes** | no | no | no |

The certification-required rules are non-trivial. Most Juniper booking failures trace back to violating one of them.

---

## 2. Juniper XML API Reference

### Endpoint & Authentication

| Property | Value |
|---|---|
| **Protocol** | SOAP 1.2 over HTTPS |
| **Base URL pattern** | `${ROIBOS_BASE_URL}/JP/Operations/{operation}.asmx` |
| **Auth** | `username` + `password` embedded in every SOAP envelope's `Login` block |
| **WSDL** | `ROIBOS_WSDL_URL` (cached locally for SOAP-client construction) |

### Core operations

| Operation | Path (`.asmx`) | Purpose |
|---|---|---|
| HotelListLastUpdate | `hotellistlastupdate` | Bulk hotel-list refresh marker |
| HotelContent | `hotelcontent` | Catalog: hotel descriptions, amenities, photos |
| HotelAvail | `hotelavail` | Search availability (hotel-code-based; max 500 codes per request) |
| HotelBookingRules | `hotelbookingrules` | Pre-book: get required-fields list + price-confirm |
| HotelBooking | `hotelbooking` | Commit the booking (sends `PriceRange` + `ExternalBookingReference`) |
| HotelBookingList | `hotelbookinglist` | List bookings by filter (locator, date range, status) |
| HotelBookingDetail | `hotelbookingdetail` | Retrieve a single booking |
| HotelBookingCancel | `hotelbookingcancel` | Cancel |

---

## 3. Critical Implementation Rules (Juniper Certification)

These come directly from the Juniper certification spec and are encoded in `roibos.adapter.ts`. Breaking any of them fails certification AND causes silent booking failures.

### 3.1 Always read `@Status` from `HotelBookingRS`

Never assume a booking is confirmed because the request succeeded. Read the status attribute:

| Status code | Meaning |
|---|---|
| `CON` / `OK` / `PAG` | CONFIRMED |
| `PRE` / `PDI` / `RQ` | PENDING (on-request — supplier hasn't confirmed yet) |
| `CAN` / `CAC` | CANCELLED |

`mapJuniperStatusToUnified()` in the adapter does this mapping. Don't bypass it.

### 3.2 Validate `RequiredFields` before booking

`HotelBookingRulesRS` returns a `RequiredFields` block. Parse it; verify that every required guest data field (email, phone, document number, document type, etc.) is present before sending `HotelBooking`. Sending an incomplete request returns a non-obvious error.

### 3.3 Always send `PriceRange` on `HotelBooking`

Juniper expects:

```xml
<PriceRange Minimum="..." Maximum="..." />
```

- `Minimum` = **25% of total** → accept price drops up to 75% (this is intentionally lenient; suppliers occasionally apply post-quote discounts)
- `Maximum` = **100% of total** → reject any price increase

Without `PriceRange`, the booking is rejected by the supplier's certification checker.

### 3.4 Always send `ExternalBookingReference`

Send our own internal booking reference on every `HotelBooking`. If the supplier's response is lost mid-flight, we can match the booking back to our records by this reference.

### 3.5 `@Context` on `HotelAvail`

Set on every `HotelAvail` request:

- `Context="SINGLEAVAIL"` → for a single hotel code
- `Context="FULLAVAIL"` → for multiple hotel codes or destination search

Wrong context returns inconsistent results.

### 3.6 `<TimeOut>` element on every `HotelAvail`

```xml
<TimeOut>8000</TimeOut>
```

8000 ms is the certification default. Without this element, the supplier may either return partial results or time out without an error envelope.

### 3.7 Hotel-code-based availability only

Never send destination-based availability requests in production. Always map destinations → hotel codes first, then send a hotel-code list. **Max 500 codes per request** — split into batches above that. `ROIBOS_MAX_HOTELS_PER_REQUEST` caps this at 500 by default.

### 3.8 Nationality must stay consistent across the flow

Whatever nationality value is sent on `HotelAvail` MUST also be sent on `HotelBookingRules` and `HotelBooking`. Mismatched nationality is one of the most common silent-failure modes.

### 3.9 SOAP envelope strictness

Juniper rejects requests with unexpected fields, wrong field ordering, or unknown XML namespaces. The adapter uses a strict envelope builder; don't bolt new fields onto it without checking the WSDL first.

---

## 4. What Exists Today

```
backend-service/src/shared/adapters/roibos/
├── roibos.adapter.ts          ← VendorAdapter implementation; speaks Juniper XML (~900 LOC)
├── roibos.transformer.ts      ← Juniper response → unified shapes
├── roibos.types.ts            ← Juniper SOAP request/response type definitions
├── index.ts                   ← Public exports
└── __tests__/                 ← Unit tests for transformer + status mapping

backend-service/src/shared/config/vendor-mapping.ts
   roibos: { adapter: AdapterType.ROIBOS, label: "Roibos/Juniper" }

backend-service/src/shared/config/index.ts
   roibos: {
     baseUrl: ROIBOS_BASE_URL,
     username: ROIBOS_USERNAME,
     password: ROIBOS_PASSWORD,
     wsdlUrl: ROIBOS_WSDL_URL,
     defaultLanguage: "en",
     defaultCountry: "ES",
     maxHotelsPerAvailRequest: 500,
   }
```

The Juniper-protocol logic is concentrated in `roibos.adapter.ts`. The XML build/parse helpers (xml2js wrapper, status mapping, envelope construction) are internal to that file but written generically — they don't hardcode "Roibos" anywhere that would prevent reuse.

---

## 5. Backend Walkthrough

### 5.1 Adapter registration

`RoibosAdapter` is instantiated in `shared/adapters/index.ts` and registered with `UnifiedBookingService` under the vendor name `"roibos"`. Requests carrying `x-vendor: roibos` dispatch to it.

### 5.2 Catalog sync — `getHotelList()` + `getHotelInformationBatch()`

```ts
const hotels = await client.getHotelList({ language, country, since })
const batched = chunk(hotels, MAX_HOTELS_PER_REQUEST)
for (const batch of batched) {
  const info = await client.getHotelInformationBatch(batch.map(h => h.code))
  // upsert into hotels collection
}
```

Two-step because `HotelList` only returns codes + names; `HotelContent` returns the rich data.

### 5.3 Search — `getHotelAvailability()`

```ts
const xml = buildHotelAvailXml({
  hotelCodes,                    // max 500 codes per request (rule 3.7)
  checkIn, checkOut, guests,
  nationality,                   // pin this value (rule 3.8)
  context: "FULLAVAIL",          // (rule 3.5)
  timeoutMs: 8000,               // (rule 3.6)
})
```

Returns rate plans + cancellation policies per hotel.

### 5.4 Pre-book — `HotelBookingRules`

Validate `RequiredFields` and re-confirm the price. If any required guest field is missing → fail fast with a clear message; don't even attempt `HotelBooking`.

### 5.5 Book — `bookRoom()`

```ts
const externalRef = generateInternalBookingRef()  // (rule 3.4)
const xml = buildHotelBookingXml({
  ...quote,
  nationality,                   // same as in HotelAvail (rule 3.8)
  priceRange: {
    min: quote.total * 0.25,     // (rule 3.3)
    max: quote.total,
  },
  externalBookingReference: externalRef,
})
const response = await client.send("hotelbooking", xml)
const status = mapJuniperStatusToUnified(response.HotelBookingRS["@Status"])  // (rule 3.1)
// CONFIRMED / PENDING / CANCELLED
```

Persist with the supplier locator + `externalRef` + raw XML for forensics.

### 5.5b Multi-room book — `bookMultiRoom()`

**One `HotelBookingRQ`, ONE `<HotelElement>`, ONE `<BookingCode>`, N `<RelPaxDist>` siblings** — one per room within the same HotelOption combination.

Quoting the Juniper docs (https://api-edocs.ejuniper.com/en/api/jp/hotel-api) verbatim:

> "RatePlanCode — Encoded data obtained from either the HotelAvail or HotelCheckAvail response. **Identifies a unique combination of rooms from an specific hotel.**"

> "`RelPaxesDist/RelPaxDist` — Distribution list. **Each one of them corresponds to a room.**"

> "Additionally, this transaction also allows for the confirmation of multiple combinations under the same `@Locator`, either by [...] **Simultaneously confirming them through the use of multiple HotelElement nodes** from the same HotelBooking request."

So for a multi-room search (e.g. 2A + 2A on the same hotel), Juniper returns ONE HotelOption whose ONE BookingCode covers ALL rooms. The right XML:

```xml
<HotelBookingRQ Version="1.1" Language="en">
  <Login Password="..." Email="..." />
  <Paxes>
    <Pax IdPax="1">Carlos</Pax>
    <Pax IdPax="2">Maria</Pax>
    <Pax IdPax="3">Pedro</Pax>
    <Pax IdPax="4">Sofia</Pax>
  </Paxes>
  <Holder><RelPax IdPax="1"/></Holder>
  <ExternalBookingReference>EC-...</ExternalBookingReference>
  <Elements>
    <HotelElement>
      <BookingCode>...one code for the whole multi-room combination...</BookingCode>
      <RelPaxesDist>
        <RelPaxDist>                          <!-- Room 1 -->
          <RelPaxes><RelPax IdPax="1"/><RelPax IdPax="2"/></RelPaxes>
        </RelPaxDist>
        <RelPaxDist>                          <!-- Room 2 -->
          <RelPaxes><RelPax IdPax="3"/><RelPax IdPax="4"/></RelPaxes>
        </RelPaxDist>
      </RelPaxesDist>
      <HotelBookingInfo Start="..." End="...">
        <Price><PriceRange Minimum="25%" Maximum="100%" Currency="USD"/></Price>
        <HotelCode>...</HotelCode>
      </HotelBookingInfo>
    </HotelElement>
  </Elements>
</HotelBookingRQ>
```

**Multiple `<HotelElement>` siblings ARE allowed by the WSDL but reserved for "multiple combinations under the same @Locator"** — e.g. grouping two separate HotelBookingRules valuations into one booking. Not used for N rooms within one combination.

**Pax holder rule** — `<Holder><RelPax IdPax="1"/></Holder>`. The first pax is the holder; all paxes across all rooms are listed in one `<Paxes>` block with sequential `IdPax`.

**Failure modes observed during investigation:**

| Wrong shape | Roibos response |
|---|---|
| N standalone single-room `HotelBookingRQ` (per-room loop) | `400 "XML seems to be incomplete or wrong. Please check the occupancy consistency"` |
| ONE `HotelBookingRQ` with N `<HotelElement>` blocks (one rate per room) | Same `occupancy consistency` |
| ONE `<HotelElement>` with ONE `<BookingCode>` + N `<RelPaxDist>` (this section's shape) | XML accepted — but `400 "The BookingCode expired"` if the BookingCode was issued for a single-room context |

**Open question** — how to source the combination-level `RatePlanCode` from the agency-app's room-selection UI: the UI currently flattens rates per room TYPE (each rate card is a single rate plan), so the cypress-picked `rooms[].rateCode` values are single-room rates, not the multi-room combination code Juniper expects in `HotelBookingRules`. This needs either UI work (expose the combination code) or a backend lookup against the HotelAvail cache.

### 5.6 Cancel — `cancelBooking()`

`HotelBookingCancel` sent with the supplier locator. The cancellation policy (already frozen onto the booking at booking time) determines the penalty.

**Multi-room cancel** — sent ONCE with the multi-room booking's locator. Roibos cancels all rooms in the same transaction.

---

## 6. Configuration & Environment Variables

Required `.env` keys for the current Roibos/Juniper tenant:

```bash
ROIBOS_BASE_URL=https://roibos-juniper.example.com
ROIBOS_USERNAME=your_user
ROIBOS_PASSWORD=your_pass
ROIBOS_WSDL_URL=https://roibos-juniper.example.com/JP/jp.wsdl

# Optional, sensible defaults baked in
ROIBOS_DEFAULT_LANGUAGE=en             # default
ROIBOS_DEFAULT_COUNTRY=ES              # default — nationality value
ROIBOS_MAX_HOTELS_PER_REQUEST=500      # capped at 500 (rule 3.7)
```

---

## 7. Adding a New Juniper-based Vendor

If a future tenant exposes a Juniper-compliant XML endpoint, you do NOT need a new adapter. Steps:

1. **Pick a vendor name** (e.g., `acmebed`).
2. **Add to `vendor-mapping.ts`:**
   ```ts
   acmebed: { adapter: AdapterType.ROIBOS, label: "AcmeBed/Juniper" },
   ```
3. **Add env vars** following the Roibos pattern, prefixed by the vendor name (`ACMEBED_BASE_URL`, `ACMEBED_USERNAME`, `ACMEBED_PASSWORD`, `ACMEBED_WSDL_URL`).
4. **Add a config block** in `shared/config/index.ts` that mirrors the Roibos block but reads the new env vars.
5. **Register the adapter instance** in `shared/adapters/index.ts` with the new vendor name and the new config.
6. **Sync the catalog** — the daily `hotelSyncService.syncAllHotels()` picks it up automatically once registered.

The certification rules (§3) automatically apply because they live inside the shared adapter code.

If the new tenant has a quirk that doesn't fit the existing adapter (e.g., a non-standard `@Status` mapping or an extra required field), consider:
- A small adapter shim that wraps `RoibosAdapter` with per-tenant overrides, OR
- Introducing per-tenant config flags inside the existing adapter — preferable if the quirk is small.

---

## 8. The Juniper Booking Flow

```
1. Agency app                                  Backend (RoibosAdapter)
   search Spain May 7-9                        ──▶ getHotelAvailability
                                                   (hotel-code list, max 500,
                                                    Context=FULLAVAIL, TimeOut=8000)
                                               ──◀ rate plans + cancel policies

2. Agency app                                  Backend
   user picks room                             ──▶ HotelBookingRules
                                                   (parse RequiredFields,
                                                    re-confirm price)
                                               ──◀ requiredFields + final price

3. Agency app                                  Backend
   user enters guest data, confirms            ──▶ HotelBooking
                                                   (with PriceRange 25%–100%,
                                                    ExternalBookingReference,
                                                    same nationality as step 1)
                                                     │
                                                     └── read @Status:
                                                         CON / OK / PAG → CONFIRMED
                                                         PRE / PDI / RQ → PENDING
                                                         CAN / CAC      → CANCELLED
                                               ──◀ UnifiedBookingType { locator, status, ... }

4. If PENDING:
   Background worker re-polls HotelBookingDetail until status flips.
   Never mark the booking CONFIRMED in our DB without seeing CON/OK/PAG.

5. Voucher + Invoice generated from the unified shape (no Juniper knowledge needed).
```

---

## 9. Testing Checklist

- [ ] `getHotelList()` returns codes from the test env.
- [ ] `getHotelInformationBatch()` returns rich data for a 500-code batch.
- [ ] `getHotelAvailability()` returns at least one rate plan with `Context=FULLAVAIL` + `TimeOut=8000`.
- [ ] `HotelBookingRules` returns a `RequiredFields` list that the adapter validates before book.
- [ ] `bookRoom()` sends `PriceRange` (min 25%, max 100% of total) and `ExternalBookingReference`.
- [ ] `bookRoom()` reads `@Status` and maps CON/OK/PAG → CONFIRMED, PRE/PDI/RQ → PENDING, CAN/CAC → CANCELLED.
- [ ] Nationality is pinned across HotelAvail, HotelBookingRules, HotelBooking.
- [ ] PENDING-status re-poll job moves the booking to CONFIRMED on subsequent ticks.
- [ ] Hotel-code batching: 1000 hotels split into two 500-code requests.
- [ ] Test command: `bun test src/shared/adapters/roibos`.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Booking returns 200 but our DB has CANCELLED | We didn't read `@Status` (rule 3.1) | Re-check the response parser; `mapJuniperStatusToUnified()` must run |
| `RequiredFields` validation rejects every booking | Frontend isn't capturing email/phone/document fields | Compare the `RequiredFields` block to the booking form schema; add fields |
| Sporadic price-mismatch failures | `PriceRange` not sent or set too tight (rule 3.3) | Verify `min = 25% of total` (NOT 75%); review log of recent rejections |
| Bookings disappear from supplier dashboard | Our locator wasn't sent as `ExternalBookingReference` (rule 3.4) | Cross-reference our `externalRef` with supplier-side reports |
| Inconsistent availability results | `@Context` wrong or missing (rule 3.5) | Set `SINGLEAVAIL` for single-hotel, `FULLAVAIL` for multi-hotel/destination |
| Frequent timeouts on HotelAvail | `<TimeOut>` missing or batch > 500 hotels | Set 8000 ms; split into batches of ≤ 500 |
| Booking rejected after a successful avail | Nationality changed between steps (rule 3.8) | Pin nationality from the first request; don't recompute |

---

## 11. Risks & Edge Cases

- **PENDING is a real state, not a failure.** Some Juniper tenants take 5–10 minutes to confirm. The PENDING-status re-poll worker is critical; without it, agencies see "booked but supplier never confirmed" forever.
- **WSDL caching:** the SOAP client caches the WSDL at startup. If the supplier updates their WSDL (rare but happens), restart the backend to pick up the new schema.
- **500-code limit:** if you want to search "all hotels in Cuba", that's potentially > 500 codes — must batch. The orchestration layer handles this transparently today, but adding a new "search by region" endpoint must respect the cap.
- **`PriceRange` Minimum is intentionally lenient (25%).** This is per Juniper certification — they want bookings to succeed even on aggressive promotional drops. The frontend is responsible for showing the customer the FINAL price, not the quoted price; the engine reconciles by reading the response.
- **The `ExternalBookingReference` is our last line of defense if a response is lost in flight.** Always include it. The current implementation uses our internal booking id; if you ever change the id format, ensure both supplier-search and our re-bind path keep working.
- **Adding new Juniper tenants:** the Roibos adapter assumes one tenant per process. If you instantiate two `RoibosAdapter` instances (one per tenant) the WSDL cache, session handling, and logging are independent — fine, but watch memory if you have many tenants.

---

## 12. Code References

| File | Role |
|---|---|
| `backend-service/src/shared/adapters/roibos/roibos.adapter.ts` | The Juniper-protocol adapter (Roibos is one tenant) |
| `backend-service/src/shared/adapters/roibos/roibos.transformer.ts` | Juniper response → unified shapes |
| `backend-service/src/shared/adapters/roibos/roibos.types.ts` | All Juniper SOAP request/response type definitions |
| `backend-service/src/shared/config/vendor-mapping.ts` | `roibos → AdapterType.ROIBOS, label "Roibos/Juniper"` |
| `backend-service/src/shared/config/index.ts` (ROIBOS block) | Tenant config (env vars → adapter config) |
| `backend-service/src/shared/http/vendor-http-client.ts` | Shared HTTP wrapper |
| `backend-service/src/domains/hotel/services/sync.service.ts` | Calls `getHotelList()` + `getHotelInformationBatch()` daily |
| `backend-service/src/shared/adapters/roibos/__tests__/` | Unit tests |
| `backend-service/src/domains/hotel/__tests__/integration/roibos/` | Integration tests (test-credit-a/b, test-e2e) |

---

## 13. If You Came Looking for a Standalone "Juniper Adapter"

There isn't one and there shouldn't be. The Juniper protocol's implementation lives at `shared/adapters/roibos/` and is reused for every Juniper-compliant tenant. The Roibos folder name is historical (Roibos was the first Juniper tenant); the code inside is Juniper-protocol-generic. See §7 for how to add another Juniper tenant on top.

---

**Last verified against code:** 2026-05-29.
**Maintainer:** integrations team.
