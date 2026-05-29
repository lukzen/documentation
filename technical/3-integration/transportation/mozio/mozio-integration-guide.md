# Mozio Transportation Integration — Development Guide

A step-by-step guide for understanding how the Mozio ground-transportation integration is wired into the Ergos Continental platform. Written so a junior developer can follow through and extend it.

> **Note on location:** This guide lives under `3-integration/transportation/` rather than `3-integration/hotels/` because Mozio is a **transfer / ground-transportation** provider, not a hotel GDS. The integration shape is also different from the hotel adapters — Mozio uses an async polling model and a custom `MozioClient` rather than the `VendorAdapter` interface used by Dingus / Hotetec / Restel / Roibos.

> **Prerequisites:** Read the hotel-GDS guides (e.g., [Hotetec](../../hotels/hotetec/hotetec-integration-guide.md)) first if you want the contrast with how vendor adapters typically work.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Mozio API Reference](#2-mozio-api-reference)
3. [Critical Implementation Rules](#3-critical-implementation-rules)
4. [What Was Created](#4-what-was-created)
5. [Backend Walkthrough](#5-backend-walkthrough)
6. [Configuration & Environment Variables](#6-configuration--environment-variables)
7. [The Async Polling Model](#7-the-async-polling-model)
8. [The Mozio Booking Flow](#8-the-mozio-booking-flow)
9. [Testing Checklist](#9-testing-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Risks & Edge Cases](#11-risks--edge-cases)
12. [Code References](#12-code-references)

---

## 1. Overview

### What

Mozio is the **ground-transportation provider** integrated into Ergos Continental. It supplies airport-pickup transfers, private cars, and shared shuttles — letting agencies upsell transfer services alongside a hotel booking. It uses a **REST/JSON** protocol over HTTPS with an **API-key in header** and an **asynchronous polling** model for both search and reservation.

### Why

The Cuba market and many Latin American destinations have weak ride-hailing coverage. Offering pre-arranged airport transfers improves the booking experience, captures additional margin, and gives the agency a richer product to sell to its customer. Mozio is a global aggregator of local transfer operators — one integration unlocks many cities.

### How Mozio Differs from the Hotel Adapters

| Trait | Mozio | Hotel adapters (Dingus / Hotetec / Restel / Roibos) |
|---|---|---|
| Interface | `MozioClient` (own surface) | `VendorAdapter` (shared interface) |
| Orchestration | `transportation.service.ts` calls it directly | `UnifiedBookingService` registry dispatches |
| Auth | `API-KEY` header (static) | session / shared creds / URL params |
| Search shape | **async**: start → poll until results ready | sync: one request, one response |
| Booking shape | **async**: create → poll until reservation ready | sync (or two-phase for Dingus) |
| Product unit | Trip / step / vehicle | Hotel room / rate plan |
| Domain | `domains/transportation/` | `domains/booking/` |

The async pattern is the most important shape to internalize — every search and every reservation requires the caller to **wait + poll** before the result is usable.

---

## 2. Mozio API Reference

### Endpoint & Authentication

| Property | Value |
|---|---|
| **Protocol** | HTTPS REST + JSON |
| **Base URL** | `MOZIO_BASE_URL` (default: `https://api-testing.mozio.com`) |
| **Auth** | `API-KEY: <your-key>` header on every request |
| **Required headers** | `API-KEY`, `Content-Type: application/json`, `LANG: <BCP-47 tag>` (default: `en-US`) |

### Core operations

| Endpoint | Method | Purpose |
|---|---|---|
| `/v2/search/` | POST | **Start** a transfer search — returns `searchId`. Results are NOT in this response. |
| `/v2/search/{searchId}/poll/` | GET | **Poll** for search results — returns `searchResults: [...]` + a `polling_completed` flag |
| `/v2/reservations/` | POST | **Start** a reservation — returns reservation handle |
| `/v2/reservations/{searchId}/poll/` | GET | **Poll** for reservation completion |
| `/v2/reservations-by-partner/{hashedId}/` | GET | Retrieve a confirmed reservation by partner-side id |
| `/v2/reservations/{hashedId}/` | DELETE | Cancel a reservation |

All operations use the same `API-KEY` header; no session.

---

## 3. Critical Implementation Rules

These are encoded in `mozio.client.ts` and `transportation.service.ts`. Breaking any of them silently produces lost reservations or polls that never complete.

### 3.1 Always poll until `polling_completed: true`

A single poll response can include `searchResults: []` even when more results are coming. Stopping early gives a partial list. Use the `searchPollMaxAttempts` + `searchPollIntervalMs` config and loop until `polling_completed` is `true` or you hit max attempts.

### 3.2 Poll interval and max attempts are configurable for a reason

Mozio's response time varies by region — a Havana airport search can return in ~3s; an obscure destination can take 20+s. The defaults (`searchPollIntervalMs`, `searchPollMaxAttempts`) are environment-tuned. **Don't hardcode these** at call sites — read from the client config.

### 3.3 The `searchId` is the poll handle for reservations too

When you create a reservation, the **same** `searchId` is used to poll for completion. This is unusual — most async APIs return a new reservation id. Mozio reuses the search session because the reservation is conceptually a follow-up on that search.

### 3.4 The `hashedId` returned by reservation polling is the long-term identifier

Once `pollReservation` returns `polling_completed: true`, the response contains a `hashedId`. That's the only stable identifier for the reservation — store it. It's the key for `getReservation()` and `cancelReservation()`. The `searchId` becomes useless after polling completes.

### 3.5 Failed reservations are tracked with structured error codes

`transportation.service.ts` writes failures with codes like `MOZIO_RESERVATION_FAILED` and `MOZIO_POLL_FAILED`. These are searchable in logs and surface in the admin diagnostics. When adding a new failure mode, add a new code rather than reusing an existing one — the codes are pinned in tests.

### 3.6 Currency defaults are per-deployment

`defaultCurrency` (USD by default) is set once in the client config. Mixing currencies per-request is not supported by the current integration — if you need EUR for Europe trips, configure a second `MozioClient` instance with `defaultCurrency: "EUR"` and dispatch by route region.

### 3.7 vendorHttpRequest wrapper

All HTTP goes through `vendorHttpRequest` (from `@shared/http/vendor-http-client`), same as the hotel adapters. Gives uniform logging, retry-on-network-error, and timing telemetry. Don't call `axios` directly.

---

## 4. What Was Created

```
backend-service/src/shared/adapters/mozio/
├── mozio.client.ts             ← MozioClient: 6 methods (search/poll/reserve/poll/get/cancel)
├── mozio.transformer.ts        ← Mozio response → TransportationQuote, TransformedReservation
├── mozio.types.ts              ← Zod schemas + inferred TS types for every shape
├── index.ts                    ← Public exports
└── __tests__/                  ← Unit tests for transformer

backend-service/src/domains/transportation/
├── routes/transportation.routes.ts            ← REST routes (search, reserve, get, cancel)
├── services/transportation.service.ts         ← Orchestration + polling loop + error mapping
├── repositories/transportation-booking.repository.ts  ← Persist transportation bookings
├── models/                                    ← Mongoose models
└── __tests__/                                 ← Unit tests
```

Frontend changes (agency-app):
- Prototype lives at `documentation/public/prototypes/agency-app/` (served by GitHub Pages) — shows the upsell after the hotel booking is confirmed.
- Production wiring depends on the agency-app feature flag (not yet enabled platform-wide).

---

## 5. Backend Walkthrough

### 5.1 Client instantiation

The `MozioClient` is constructed in `transportation.routes.ts` (or injected into `TransportationService`):

```ts
import { MozioClient } from "@shared/adapters/mozio"
const client = new MozioClient({
  baseUrl: appConfig.mozio.baseUrl,
  apiKey: appConfig.mozio.apiKey,
  defaultCurrency: appConfig.mozio.defaultCurrency,
  defaultLanguage: appConfig.mozio.defaultLanguage,
  searchPollIntervalMs: appConfig.mozio.searchPollIntervalMs,
  searchPollMaxAttempts: appConfig.mozio.searchPollMaxAttempts,
})
```

### 5.2 Search — `startSearch()` + `pollSearch()`

```ts
const { search_id } = await client.startSearch({ pickup, dropoff, ... })
// Wait + poll loop
let attempts = 0
let result: MozioSearchResponse
do {
  await sleep(searchPollIntervalMs)
  result = await client.pollSearch(search_id)
  attempts++
} while (!result.polling_completed && attempts < searchPollMaxAttempts)
```

`transformSearchResult()` converts the raw response into `TransportationQuote[]` (one per vehicle option / step combination). Each quote has price + cancellation policy + provider + vehicle details.

### 5.3 Reserve — `createReservation()` + `pollReservation()`

Same async pattern. `createReservation()` returns immediately; `pollReservation(searchId)` (using the **same** searchId from §3.3) returns the final `hashedId` once confirmed.

```ts
await client.createReservation({ search_id, result_id, passenger, payment, ... })
let res = await client.pollReservation(search_id)
while (!res.polling_completed && attempts < max) {
  await sleep(intervalMs)
  res = await client.pollReservation(search_id)
}
// res.hashedId is the long-term identifier
```

### 5.4 Retrieve — `getReservation()`

`GET /v2/reservations-by-partner/{hashedId}/` — synchronous, returns the full reservation incl. status, vehicle, passenger, payment summary.

### 5.5 Cancel — `cancelReservation()`

`DELETE /v2/reservations/{hashedId}/` — synchronous. Cancellation policy + penalty was captured at quote time on the `TransportationQuote` and frozen onto the reservation.

---

## 6. Configuration & Environment Variables

Required `.env` keys:

```bash
MOZIO_BASE_URL=https://api-testing.mozio.com         # or production URL
MOZIO_API_KEY=your_partner_api_key
MOZIO_DEFAULT_CURRENCY=USD                            # optional, defaults USD
MOZIO_DEFAULT_LANGUAGE=en-US                          # optional, defaults en-US
MOZIO_SEARCH_POLL_INTERVAL_MS=1000                    # optional, tune per env
MOZIO_SEARCH_POLL_MAX_ATTEMPTS=30                     # optional, tune per env
```

Config flows: `dev.config.ts` → `config/index.ts` (`mozio` block) → `MozioClient` constructor.

---

## 7. The Async Polling Model

The defining feature of the Mozio integration. Search and reservation both follow the same pattern:

```
   start                                       poll                                      poll
   ─────                                       ────                                      ────
1. POST /v2/search/                            ─▶
                                               ◀─ { searchId: "abc", ... }
                                                 (no results yet)

2. wait searchPollIntervalMs

3. GET /v2/search/abc/poll/                    ─▶
                                               ◀─ { results: [...partial], polling_completed: false }

4. wait searchPollIntervalMs

5. GET /v2/search/abc/poll/                    ─▶
                                               ◀─ { results: [...complete], polling_completed: true }
                                                 ◀── stop polling, render results
```

For reservations: replace `POST /v2/search/` with `POST /v2/reservations/`, replace `/poll/` GET endpoint accordingly, but **reuse the same `searchId`** (§3.3).

**Why polling instead of webhooks?** Mozio aggregates many local transfer operators with very different response times. Polling lets Ergos render partial results as they arrive (typical UX: show the first 3 cars in 1s while the slower operators finish behind the scenes).

---

## 8. The Mozio Booking Flow

```
1. Agency app                                  Backend
   user just confirmed a hotel booking;        ──▶ POST /transportation/search
   offered "Add airport transfer?"                  (transportation.routes.ts)
                                                     │
                                                     ├── client.startSearch
                                                     └── polling loop until results in
                                               ──◀ TransportationQuote[]

2. Agency app                                  Backend
   user picks a vehicle + transfer time        ──▶ POST /transportation/reserve
                                                     │
                                                     ├── client.createReservation
                                                     └── polling loop until hashedId
                                               ──◀ { hashedId, status, vehicle, ... }

3. Backend persists TransportationBooking with hashedId, links to the hotel booking by guestEmail or bookingId.
4. Voucher generation: transportation voucher is separate from the hotel voucher today.
```

---

## 9. Testing Checklist

- [ ] `startSearch()` returns a `searchId` against the sandbox env (`api-testing.mozio.com`).
- [ ] `pollSearch()` eventually returns `polling_completed: true` with at least one quote for a known route (e.g., HAV airport → Old Havana hotel).
- [ ] `createReservation()` against a sandbox quote returns a `hashedId` after polling.
- [ ] `getReservation()` returns the persisted reservation with status + vehicle + passenger info.
- [ ] `cancelReservation()` succeeds for a recent sandbox booking (test only against sandbox; production cancellations may incur penalty).
- [ ] Polling timeout: configure `searchPollMaxAttempts=2`, run a slow search, verify the service errors with `MOZIO_POLL_FAILED` cleanly.
- [ ] API-key failure: temporarily set a bad key, verify the structured error includes the upstream Mozio error message.
- [ ] Test runner: `bun test src/domains/transportation` and `bun test src/shared/adapters/mozio`.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Empty search results | Polled too few times, `polling_completed: false` when we stopped | Increase `MOZIO_SEARCH_POLL_MAX_ATTEMPTS` or `MOZIO_SEARCH_POLL_INTERVAL_MS` |
| 401 Unauthorized on every call | `MOZIO_API_KEY` not set or pointing at wrong env (testing key against prod URL or vice versa) | Verify env vars + base URL pair |
| Reservation poll never completes | Network blip; service should already retry within `searchPollMaxAttempts` — but check for a Mozio upstream incident | Mozio status page; retry the whole flow |
| `MOZIO_RESERVATION_FAILED` in logs | Mozio rejected the reservation post-quote (rare; usually vehicle sold out) | Re-quote and re-reserve; the partner code in the error message identifies which operator |
| Wrong currency on quote | Client constructed with wrong `defaultCurrency` | Restart with correct env or instantiate a second client for the other currency |
| Hardcoded poll interval ignored | Someone bypassed the config and called `setInterval` directly | Audit the call site — only `transportation.service.ts` should be running the loop |

---

## 11. Risks & Edge Cases

- **Async upsell UX:** the agency app can't show a final price for a transfer until polling completes. If the polling window is 10s and the user navigates away, the search is wasted. Design the UI to start polling on a non-blocking promise so the user can keep browsing while transfer prices load.
- **Per-operator failure:** Mozio aggregates many local operators. One operator timing out won't fail the whole search — `polling_completed` flips true after a per-operator deadline. But it WILL show fewer options. Log + monitor `quotes.length` over time to spot operator-specific outages.
- **Cancellation penalty:** captured on the `TransportationQuote` at quote time. Frozen onto the reservation. Customer's penalty depends on time-to-pickup — show it clearly before they pay.
- **Currency mismatch:** if the agency app shows USD prices but the customer pays in EUR (or any currency mismatch upstream), the agency P&L reconciliation gets confused. Pin currency at booking time and reject mid-flow changes.
- **No multi-leg trips:** the integration today is single-leg only. Round-trip airport transfers are modeled as two separate reservations linked by a custom field — review the data model before promoting round-trip as a UI feature.
- **Hotel-booking dependency:** the transportation upsell is offered AFTER a hotel booking is confirmed, but the data link between them is loose (matched on guestEmail or bookingId). If the user makes two hotel bookings rapidly, the transfer might attach to the wrong one. Tighten the link before this becomes a support issue.

---

## 12. Code References

| File | Role |
|---|---|
| `backend-service/src/shared/adapters/mozio/mozio.client.ts` | The `MozioClient` (6 public methods) |
| `backend-service/src/shared/adapters/mozio/mozio.transformer.ts` | Raw Mozio response → `TransportationQuote`, `TransformedReservation` |
| `backend-service/src/shared/adapters/mozio/mozio.types.ts` | Zod schemas + inferred TS types |
| `backend-service/src/domains/transportation/services/transportation.service.ts` | Orchestration + polling loop + error mapping |
| `backend-service/src/domains/transportation/routes/transportation.routes.ts` | REST routes consumed by the agency app |
| `backend-service/src/domains/transportation/repositories/transportation-booking.repository.ts` | Mongoose persistence |
| `backend-service/src/shared/config/index.ts` (mozio block) | Default config |
| `backend-service/src/shared/http/vendor-http-client.ts` | Shared HTTP wrapper |
| `backend-service/src/shared/adapters/mozio/__tests__/` | Unit tests for transformer |
| `backend-service/src/domains/transportation/services/__tests__/transportation.service.unit.test.ts` | Service-level tests (with mocked MozioClient) |

---

## Related: agency-app prototype

The interactive UX for the Mozio upsell lives at:

```
documentation/public/prototypes/agency-app/
```

It demonstrates the post-hotel-booking upsell flow, including the polling-loading state and the quote selection UI.

---

**Last verified against code:** 2026-05-29.
**Maintainer:** integrations team.
