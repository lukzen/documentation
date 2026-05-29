# Hotetec GDS Integration — Development Guide

A step-by-step guide for understanding how the Hotetec GDS adapter is wired into the Ergos Continental booking platform. Written so a junior developer can follow through and extend it.

> **Prerequisites:** Read [Reservation System Multi-GDS Analysis](../../../2-architecture/6-RESERVATION_SYSTEM_MULTI_GDS_ANALYSIS.md) first to understand the `VendorAdapter` interface and the booking orchestration layer.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Hotetec API Reference](#2-hotetec-api-reference)
3. [Critical Implementation Rules](#3-critical-implementation-rules)
4. [What Was Created](#4-what-was-created)
5. [Backend Walkthrough](#5-backend-walkthrough)
6. [Configuration & Environment Variables](#6-configuration--environment-variables)
7. [Session Lifecycle](#7-session-lifecycle)
8. [The Hotetec Booking Flow](#8-the-hotetec-booking-flow)
9. [Testing Checklist](#9-testing-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Risks & Edge Cases](#11-risks--edge-cases)
12. [Code References](#12-code-references)

---

## 1. Overview

### What

Hotetec is one of the four production GDS adapters in Ergos Continental (alongside Dingus, Restel, and Roibos). It uses a **REST/JSON** protocol over HTTPS with a stateful session-token model. It serves several Cuba-focused sub-feeds (the generic "hotetec" feed plus chain sub-feeds like Domina, GHGC, GAVI).

### Why

Hotetec brings strong Cuba inventory (Domina, Gran Caribe / GHGC, HTL Gaviota / GAVI) — these chains are core to the Ergos Continental Cuban-market value proposition. Hotetec also supplies a number of independent Cuban properties.

### How Hotetec Differs from Other Adapters

| Trait | Hotetec | Dingus | Restel | Roibos |
|---|---|---|---|---|
| Protocol | **REST / JSON** | SOAP/XML | Custom XML | SOAP/XML |
| Auth | session token (POST `/pull/openSession`) | shared creds in XML body | URL query params | per-vendor creds |
| Date format | midnight UTC ISO 8601 | typically date-only | `mm/dd/yyyy` | ISO 8601 |
| Session lifetime | 30 min (cached + auto-refresh) | per-request | per-request | per-request |
| Sub-vendors | yes (Cuban chains) | yes (6+) | no | yes |

The adapter implements `VendorAdapter` — `UnifiedBookingService` doesn't see Hotetec specifics.

---

## 2. Hotetec API Reference

### Endpoint & Authentication

| Property | Value |
|---|---|
| **Protocol** | HTTPS REST + JSON |
| **Base URL** | `HOTETEC_BASE_URL` (per environment) |
| **Auth** | POST `/pull/openSession` with `{ clientCode, systemCode, username, password }` → returns `sessionId` |
| **Session passed via** | `sessionId` field in subsequent POST bodies |
| **Required header** | `Content-Type: application/json` |

### Core operations (all under `/pull/`)

| Endpoint | Method | Purpose |
|---|---|---|
| `/pull/openSession` | POST | Authenticate — returns `sessionId` valid ~30min |
| `/pull/hotelAvailability` | POST | Search rooms for a date range + guests |
| `/pull/hotelInformation` | POST | Fetch hotel details (rooms, amenities, photos) |
| `/pull/bookRoom` | POST | Create a booking (single-room) |
| `/pull/bookMultiRoom` | POST | Create a booking (multiple rooms in one transaction) |
| `/pull/bookingInformation` | GET | Retrieve a booking by locator |
| `/pull/listBookings?...` | GET | List bookings with filters |
| `/pull/cancelBooking` | POST | Cancel a booking |

The naming convention (`pull/` for read operations including writes-from-Ergos-side) reflects Hotetec's terminology — "pull" means data flows from supplier to Ergos.

---

## 3. Critical Implementation Rules

These are encoded in `hotetec.adapter.ts`. Breaking them silently produces booking failures or session-expiry retries.

### 3.1 Dates must be normalized to midnight UTC

`toMidnightUTC(date)` (exported from the adapter) strips the time component and re-emits the ISO string. Hotetec rejects dates with non-zero hours/minutes — they treat dates as calendar days, not instants. Every date sent to a Hotetec endpoint must pass through this helper.

### 3.2 Session caching and the 5-minute safety margin

The adapter caches the session token in instance memory for 30 minutes. Before each request it checks if the remaining lifetime is **> 5 minutes** — if not, it transparently reopens a session. This prevents a request from being signed with a session that expires mid-request.

The 5-minute margin is intentional — it's larger than the typical request timeout, so an in-flight request cannot lose its session.

### 3.3 Per-vendor sessions are NOT cached

The `getSession()` function only caches the session for the *default* config. When a per-vendor `VendorConfig` is supplied (for sub-vendors like Domina), a fresh session is opened each time. This is intentional — sub-vendors may have different credentials and the cache key isn't multi-vendor-aware. If you add a high-traffic sub-vendor, consider extending the cache to `Map<vendorName, { token, expiresAt }>`.

### 3.4 The booking response carries the supplier locator + price reconciliation

After `bookRoom`, the adapter calls `applyPriceAdjustment()` (from `../types`) to reconcile what was quoted vs what Hotetec actually charged. Some chains adjust the final price by small amounts at booking time (currency conversion, tax rounding); the adapter captures both values for the booking snapshot.

### 3.5 The supplier sometimes returns nested JSON as strings

Some Hotetec response fields ship as JSON-encoded strings (e.g., room amenities as a string-JSON array). The transformer (`hotetec.transformer.ts`) handles the double-parse. Don't trust types at the network boundary — always validate.

### 3.6 vendorHttpRequest wrapper

All HTTP calls go through `vendorHttpRequest` (from `@shared/http/vendor-http-client`), which gives us logging, retry-on-network-error, and timing telemetry uniformly across all GDS adapters. Don't call `axios` directly.

---

## 4. What Was Created

```
backend-service/src/shared/adapters/hotetec/
├── hotetec.adapter.ts          ← VendorAdapter implementation (~850 LOC)
├── hotetec.transformer.ts      ← Hotetec response → unified shapes
├── hotetec.types.ts            ← All request/response type definitions
├── index.ts                    ← Public exports
└── __tests__/                  ← Unit tests for transformer
```

No frontend changes — the agency app is vendor-agnostic via `x-vendor` HTTP header.

---

## 5. Backend Walkthrough

### 5.1 Adapter registration

The `HotetecAdapter` is instantiated in `shared/adapters/index.ts` and registered with `UnifiedBookingService` under each Hotetec sub-vendor name. When a request comes in with `x-vendor: domina` (or `ghgc`, `gavi`, `hotetec`), it dispatches to the right `HotetecAdapter` instance (or the shared instance with a per-vendor config).

### 5.2 Catalog sync — `getHotelList()`

Called by the cron job `hotelSyncService.syncAllHotels()` daily. Sends `POST /pull/hotelInformation` (with a list selector) and `POST /pull/hotelAvailability` (for capacity hints). Transforms via `transformHotetecListResponse()` and upserts into `hotels` MongoDB collection.

### 5.3 Search — `getHotelAvailability()`

```ts
this.request("/pull/hotelAvailability", "POST", {
  sessionId, checkIn: toMidnightUTC(...), checkOut: toMidnightUTC(...),
  hotelCode, guests, ...
})
```

Returns rate plans + room types + cancellation policy per option. `flattenRoomAvailabilityOptions()` produces the standardized `StandardizedRoomAvailability[]`.

### 5.4 Book — `bookRoom()`

```ts
const result = await this.request("/pull/bookRoom", "POST", vendorData)
const adjusted = applyPriceAdjustment(quote, result.price)
const booking = transformToUnifiedBooking(result, adjusted)
```

Persists as `UnifiedBookingModel` with `vendor`, `vendorKey: "hotetec"`, locator, full request/response for forensic replay.

### 5.5 Multi-room — `bookMultiRoom()`

Hotetec supports atomic multi-room bookings in a single transaction (vs. Dingus where multi-room means N sequential single bookings). The `bookMultiRoom()` method sends one `POST /pull/bookMultiRoom` with the array of rooms; either all succeed or all fail. This is preferable when offered — it eliminates the partial-success rollback complexity.

### 5.6 Cancel — `cancelBooking()`

`POST /pull/cancelBooking` with the supplier locator. The response includes the cancellation penalty (if any). The penalty is whatever the rate plan's cancellation-policy returned at booking time — Hotetec doesn't re-negotiate it.

---

## 6. Configuration & Environment Variables

Required `.env` keys:

```bash
HOTETEC_BASE_URL=https://hotetec-api.example.com
HOTETEC_CLIENT_CODE=your_client_code
HOTETEC_SYSTEM_CODE=your_system_code
HOTETEC_USERNAME=your_user
HOTETEC_PASSWORD=your_pass
```

For sub-vendor overrides, the same env-var pattern as Dingus: `DOMINA_BASE_URL`, `GHGC_BASE_URL`, etc. — sub-vendors inherit `HOTETEC_USERNAME`/`PASSWORD` if not overridden.

The vendor config flows: `dev.config.ts` → `config/index.ts` → `HotetecAdapter` constructor.

---

## 7. Session Lifecycle

```
1. First request                      Adapter
                                      ───────
                                      sessionToken = null
   ─────────────────────────────▶     getSession()
                                       │
                                       └─ POST /pull/openSession
                                          └─ { sessionId, expiresAt+30min }
                                       cache: { token, expiresAt }
                                       return token

2. Subsequent request (within 25 min) Adapter
                                      ───────
                                      cached, > 5min lifetime?
                                       └─ yes → return cached token
   ─────────────────────────────▶     POST /pull/hotelAvailability { sessionId, ... }

3. Subsequent request (within 5 min   Adapter
   of expiration, OR after expiry)    ───────
                                      cached, > 5min lifetime?
                                       └─ no → re-open session
                                       cache: { newToken, newExpiresAt }
   ─────────────────────────────▶     POST /pull/hotelAvailability { newSessionId, ... }
```

The 5-min safety margin is the only thing protecting against "session expired mid-request" failures. Tests should not stub it out.

---

## 8. The Hotetec Booking Flow

```
1. Agency app                        Backend (HotetecAdapter)
   search Havana May 7-9             ──▶ getHotelAvailability
                                     ──◀ rate plans + cancel policies

2. Agency app                        Backend
   user picks room, confirms         ──▶ bookRoom(reservation)
                                          │
                                          ├── getSession() (cached or fresh)
                                          │
                                          ├── POST /pull/bookRoom
                                          │   ↳ supplier locator + final price
                                          │
                                          ├── applyPriceAdjustment(quote, final)
                                          │
                                          └── persist UnifiedBookingModel
                                     ──◀ UnifiedBookingType { locator, ... }

3. Backend writes booking + commissionSnapshot to MongoDB.
4. Voucher + Invoice generated from the unified shape.
```

If the customer cancels: `POST /pull/cancelBooking` with the locator; penalty is computed against the rate plan's cancellation policy captured at booking time.

---

## 9. Testing Checklist

- [ ] `getSession()` returns a token; second call within 25 min returns the cached token.
- [ ] `getHotelList()` returns a non-empty array against the test env.
- [ ] `getHotelInformation()` returns address + photos for a known hotel (Domina, Meliá, etc.).
- [ ] `getHotelAvailability()` returns at least one rate plan for a known bookable date range.
- [ ] `bookRoom()` returns a locator; the `applyPriceAdjustment` step captures both quote + final price.
- [ ] `cancelBooking()` succeeds for a recently-created sandbox booking.
- [ ] `bookMultiRoom()` atomic-multi: two rooms booked or zero rooms booked.
- [ ] Sub-vendor dispatch: `x-vendor: domina` routes to Hotetec.
- [ ] Session forced-refresh: kill the cached token in tests; next call rebuilds it.

Test command (existing): `bun test src/shared/adapters/hotetec`.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Failed to get session: 401" | Bad creds | Verify `HOTETEC_CLIENT_CODE`, `HOTETEC_SYSTEM_CODE`, `HOTETEC_USERNAME`, `HOTETEC_PASSWORD` |
| All requests fail intermittently with session-expired | Cache window misconfigured | Confirm the 5-min margin (rule 3.2) hasn't been edited to a smaller value |
| Booking returns no locator | `applyPriceAdjustment` threw because supplier price was wildly different from quote | Check log; either a stale availability cache on supplier side or a chain discount that wasn't applied. Re-quote and retry |
| Date filtering returns nothing for a known-bookable range | Date not normalized via `toMidnightUTC` | Use the helper everywhere; never pass `new Date().toISOString()` directly |
| Multi-room atomic guarantee violated | Adapter falling back to per-room bookings instead of `bookMultiRoom` | The supplier may not support multi-room on certain chains; check the response and consider rolling back the first room manually |
| Hotetec hotel missing address | Catalog sync ran when Hotetec was partially down | Re-run `hotelSyncService.syncAllHotels()` or the specific Hotetec-only sync; address gets repopulated |

---

## 11. Risks & Edge Cases

- **Session storage:** the cached `sessionToken` lives in adapter-instance memory only. If the backend has multiple replicas, each replica opens its own session — fine for low traffic, but at scale consider externalizing to Redis with a per-vendor key. Currently OK because the backend is single-replica in production.
- **Stale availability:** Hotetec is fast (< 1s typical) but its availability response is a snapshot. A user can quote at T0 and book at T0 + 30s with the room sold; the supplier returns an error at book time. The adapter currently logs + bubbles the error; the agency-app shows a "Please retry" message. No partial state.
- **Price adjustment magnitude:** `applyPriceAdjustment` accepts small (< 5%) divergence as a tax/rounding update and silently corrects. Anything larger is treated as a possible error and aborts the booking — review threshold if you see false positives.
- **Cuba-specific data:** Hotetec's chain sub-feeds (Domina, GHGC, GAVI) frequently have incomplete `lat`/`lng`/`address` fields in the catalog. The map view and country filter both degrade gracefully but UX is worse for these properties. Don't design features that depend on accurate geo data for Hotetec without explicit data backfill.
- **No streaming responses:** unlike Restel/Roibos which can take ~14 round-trips per search, Hotetec is single-roundtrip — but its `hotelAvailability` for an entire city can be heavy. Use per-hotel availability when possible.

---

## 12. Code References

| File | Role |
|---|---|
| `backend-service/src/shared/adapters/hotetec/hotetec.adapter.ts` | `VendorAdapter` implementation |
| `backend-service/src/shared/adapters/hotetec/hotetec.transformer.ts` | Hotetec response → unified shapes |
| `backend-service/src/shared/adapters/hotetec/hotetec.types.ts` | All JSON request/response types |
| `backend-service/src/shared/config/index.ts` (HOTETEC block) | Default Hotetec config |
| `backend-service/src/shared/http/vendor-http-client.ts` | Shared HTTP wrapper (logging + retry) |
| `backend-service/src/shared/adapters/types.ts` → `applyPriceAdjustment` | Price reconciliation helper (rule 3.4) |
| `backend-service/src/domains/hotel/services/sync.service.ts` | Calls `getHotelList()` daily |
| `backend-service/src/shared/adapters/hotetec/__tests__/` | Unit tests |

---

**Last verified against code:** 2026-05-29.
**Maintainer:** integrations team.
