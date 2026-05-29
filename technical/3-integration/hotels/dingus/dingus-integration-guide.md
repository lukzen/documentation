# Dingus GDS Integration — Development Guide

A step-by-step guide for understanding how the Dingus GDS adapter is wired into the Ergos Continental booking platform. Written so a junior developer can follow through and extend it.

> **Prerequisites:** Read [Reservation System Multi-GDS Analysis](../../../2-architecture/6-RESERVATION_SYSTEM_MULTI_GDS_ANALYSIS.md) first to understand the `VendorAdapter` interface and the booking orchestration layer.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Dingus API Reference](#2-dingus-api-reference)
3. [Critical Implementation Rules](#3-critical-implementation-rules)
4. [What Was Created](#4-what-was-created)
5. [Backend Walkthrough](#5-backend-walkthrough)
6. [Configuration & Environment Variables](#6-configuration--environment-variables)
7. [Multi-Vendor Sub-Feed Model](#7-multi-vendor-sub-feed-model)
8. [The Dingus Booking Flow](#8-the-dingus-booking-flow)
9. [Testing Checklist](#9-testing-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Risks & Edge Cases](#11-risks--edge-cases)
12. [Code References](#12-code-references)

---

## 1. Overview

### What

Dingus is one of the four production GDS adapters in Ergos Continental (alongside Hotetec, Restel, and Roibos). It uses a **SOAP/XML** protocol over HTTPS and serves multiple sub-vendor catalogues (Meliá, Iberostar, Roxa, Archipelago, SFRV, and the generic "dingus" feed itself).

### Why

Dingus brings the Cuban-national-chain inventory (Meliá Cuba, Iberostar Cuba, etc.) plus several smaller Latin American chains. It is the primary supplier for the Cuba market on the platform.

### How Dingus Differs from Other Adapters

| Trait | Dingus | Hotetec | Restel | Roibos |
|---|---|---|---|---|
| Protocol | SOAP/XML | REST/JSON | Custom XML | SOAP/XML |
| Auth | shared creds in XML body | session token (REST POST) | URL query params | per-vendor creds |
| Sub-vendors | **yes** (6+ feeds under one adapter) | yes | no | yes (juniper-based) |
| Hotel name match | depends on sub-feed | name regex | name + city | name |
| Cancellation policy | per-rate, returned in availability | per-rate | three-phase + dual locators | per-rate |

The adapter implements `VendorAdapter` so `UnifiedBookingService` doesn't see Dingus-specific quirks.

---

## 2. Dingus API Reference

### Endpoint & Authentication

| Property | Value |
|---|---|
| **Protocol** | SOAP 1.1 over HTTPS |
| **Body format** | XML (xml2js-parsed/built) |
| **Base URL** | Per-vendor (`${VENDOR}_BASE_URL` env var) |
| **Auth** | `<RequestorID>` element in every SOAP envelope, with shared `username` + `password` |
| **Required header** | `Content-Type: text/xml; charset=utf-8` |

### Core operations

| Operation | SOAP request body | Returns |
|---|---|---|
| Hotel list | `<HotelDescriptiveInfoRQ>` (full catalogue dump) | `DingusHotelListResponse` |
| Hotel details | `<HotelDescriptiveInfoRQ>` with HotelCode filter | `DingusHotelInformation` |
| Availability | `<OTA_HotelAvailRQ>` with date range + guests | `DingusHotelAvailabilityResponse` (rate plans + room types + cancellation policy per option) |
| Pre-book (simulate) | `<OTA_HotelResRQ ResStatus="Quote">` | Confirms inventory still available; not a binding hold |
| Book (commit) | `<OTA_HotelResRQ ResStatus="Commit">` | `DingusReservationResponse` with locator |
| Retrieve booking | `<OTA_HotelResRetrieveRQ>` by ResIDValue | Full booking detail |
| Cancel booking | `<OTA_CancelRQ>` with two-step (RQ + RSCancel) | Cancellation confirmation |

---

## 3. Critical Implementation Rules

These are encoded in `dingus.adapter.ts` and `dingus.soap-client.ts`. Breaking any of them silently produces booking failures.

### 3.1 Guest counts must be built from persons, not from numeric rooms

The `<GuestCounts>` block accepts ages per guest. Dingus rejects requests when child ages are missing — or when the total adults+children count disagrees with the room-level `Quantity` attribute. Always use `buildResGuests()` and `buildGuestCountsFromPersons()` from `dingus.guest-utils.ts` to construct these — they handle the age requirement.

### 3.2 The two-phase booking — simulate then commit

```
bookRoom()  ──▶  simulateBooking()  ──▶  commitBooking()  ──▶  return locator
                  (ResStatus=Quote)        (ResStatus=Commit)
```

- `simulateBooking()` verifies the price + availability one more time before charging the customer. If the supplier returns a different price, the commit step is aborted.
- `commitBooking()` is the binding action. The locator returned is the only proof of booking.

### 3.3 ResIDValue must be unique per booking

`generateResIdValue()` produces a UUID-style id. The same value is sent in both phases — Dingus uses it to dedupe accidental retries. Never reuse a ResIDValue across bookings.

### 3.4 Sub-vendor `vendor` field on Hotel determines which credentials to use

The adapter holds a `Map<string, DingusConfig>` keyed on sub-vendor name (`melia`, `iberostar`, `dingus`, `roxa`, `archipelago`, `sfrv`). When booking, the orchestration layer must pass the correct `vendor` so the right base URL + credentials get selected. See §7.

### 3.5 Rate plan code can opt-in to currency filtering

A few sub-vendors (dingus, roxa, sfrv) require `ratePlanCode: "USD"` in the request to filter inventory to USD-denominated rates. Defined per-vendor in `DINGUS_OVERRIDES` in `shared/config/index.ts`. New sub-vendors default to `undefined` (no filter) — opt in explicitly.

### 3.6 Address resolution falls back to Google Maps

When the hotel detail response is missing address fields, `resolveHotelCountry()` calls Google Maps' geocoder to fill them. Requires `GOOGLE_MAPS_API_KEY`. Without it, the hotel sync still works but some hotels end up with empty `country`/`address` fields, which break the country filter in search.

---

## 4. What Was Created

```
backend-service/src/shared/adapters/dingus/
├── dingus.adapter.ts             ← VendorAdapter implementation (~750 LOC)
├── dingus.soap-client.ts         ← xml2js wrapper + XML build/parse helpers
├── dingus.transformer.ts         ← Dingus response → unified internal shapes
├── dingus.types.ts               ← Type definitions for all SOAP request/response shapes
├── dingus.guest-utils.ts         ← Guest-counts construction helpers (rule 3.1)
├── index.ts                      ← Public exports
└── __tests__/                    ← Unit tests for transformer + guest-utils
```

No frontend changes required — the agency app sends `x-vendor` HTTP header and the platform dispatches to the right adapter.

---

## 5. Backend Walkthrough

### 5.1 Adapter registration

The `DingusAdapter` is instantiated in `shared/adapters/index.ts` and registered with `UnifiedBookingService` under each sub-vendor's name. The service holds a registry `Map<vendorName, VendorAdapter>` — when a request comes in with `x-vendor: melia`, it dispatches to `DingusAdapter`.

### 5.2 Catalog sync — `getHotelList()`

Called by the cron job `hotelSyncService.syncAllHotels()` daily. Fetches every hotel from the `<HotelDescriptiveInfoRQ>` endpoint, transforms to the unified `HotelType` shape, and upserts into the `hotels` collection. Sub-vendor identity is stored on `Hotel.vendor` (e.g., `"melia"`, `"iberostar"`) and `Hotel.vendorKey: "dingus"` (the adapter type).

### 5.3 Search — `getHotelAvailability()`

Called per-request when a travel agency searches. Builds `<OTA_HotelAvailRQ>` with the date range + guests, sends, parses, and flattens to `StandardizedRoomAvailability[]` via `flattenRoomAvailabilityOptions()`. Each room option carries its own rate plan, cancellation policy, and refundability flag.

### 5.4 Book — `bookRoom()`

1. Build the `<OTA_HotelResRQ>` envelope from the reservation payload.
2. Call `simulateBooking()` (`ResStatus=Quote`). If price/availability changed, abort.
3. Call `commitBooking()` (`ResStatus=Commit`). Capture the locator.
4. Persist the booking as `UnifiedBookingModel` with `vendor`, `vendorKey: "dingus"`, locator, full request/response XML for forensic replay.

### 5.5 Cancel — `cancelBooking()`

Sends `<OTA_CancelRQ>` with the supplier locator. Confirmation comes back as `<OTA_CancelRS>` with status. Cancellation penalty depends on the rate's policy and the time relative to check-in — read this before calling.

---

## 6. Configuration & Environment Variables

Required `.env` keys (per sub-vendor):

```bash
# Generic dingus feed
DINGUS_BASE_URL=https://dingus-api.example.com/soap
DINGUS_USERNAME=shared_user
DINGUS_PASSWORD=shared_pass

# Meliá Cuba sub-feed (inherits username/password if missing)
MELIA_BASE_URL=https://melia-dingus.example.com/soap
# MELIA_USERNAME=  ← falls back to DINGUS_USERNAME
# MELIA_PASSWORD=  ← falls back to DINGUS_PASSWORD

# Iberostar
IBEROSTAR_BASE_URL=https://iberostar-dingus.example.com/soap

# Add more sub-vendors as needed: ROXA_BASE_URL, ARCHIPELAGO_BASE_URL, SFRV_BASE_URL
```

Additional:
- `GOOGLE_MAPS_API_KEY` — for address fallback (rule 3.6)

Per-vendor overrides (`ratePlanCode`, `chainDiscountPct`, etc.) live in `DINGUS_OVERRIDES` in `shared/config/index.ts`.

---

## 7. Multi-Vendor Sub-Feed Model

Dingus is unique in that **one adapter serves many independent sub-feeds**. Each sub-feed:

- has its own base URL and (optionally) its own credentials
- represents a different hotel chain or operator (Meliá Cuba, Iberostar, etc.)
- is registered with `UnifiedBookingService` under its own vendor name
- contributes hotels to the catalogue with `Hotel.vendor = <sub-feed name>`, `Hotel.vendorKey = "dingus"`

To onboard a new Dingus sub-feed:

1. Add the sub-vendor name to `AdapterType.DINGUS` mapping in `shared/config/vendor-mapping.ts`.
2. Add an entry in `DINGUS_OVERRIDES` if it needs a custom ratePlanCode or chainDiscount.
3. Add the `_BASE_URL`, `_USERNAME`, `_PASSWORD` env vars (only `_BASE_URL` is mandatory — the others fall back to the shared `DINGUS_USERNAME`/`PASSWORD`).
4. Restart the backend; the sub-feed is automatically synced on next cron tick.

---

## 8. The Dingus Booking Flow

```
1. Agency app                                  Backend (DingusAdapter)
   search Cuba May 7-9                         ──▶ getHotelAvailability
                                               ──◀ rate plans + cancel policies

2. Agency app                                  Backend
   user picks room                             ──▶ bookRoom(reservation)
                                                     │
                                                     ├── simulateBooking (Quote)
                                                     │   verify price + inventory
                                                     │
                                                     └── commitBooking (Commit)
                                                         locator returned
                                               ──◀ UnifiedBookingType { locator, ... }

3. Backend writes the booking + commissionSnapshot to MongoDB.
4. Voucher + Invoice generated from the unified shape (no Dingus knowledge needed).
```

If the customer cancels later: `cancelBooking()` sends OTA_CancelRQ; the penalty (if any) is computed against the rate plan's cancellation policy.

---

## 9. Testing Checklist

- [ ] `getHotelList()` returns a non-empty array against the test sub-feed.
- [ ] `getHotelInformation()` returns address + photos for a known hotel.
- [ ] `getHotelAvailability()` returns at least one rate plan for a known-bookable date range.
- [ ] `bookRoom()` two-phase flow completes and returns a locator (test with sandbox creds; do NOT run against prod).
- [ ] `cancelBooking()` succeeds for a recently-created sandbox booking.
- [ ] Sub-vendor dispatch works: `x-vendor: melia` routes to `DingusAdapter`.
- [ ] Address fallback: a hotel with missing address gets filled via Google Maps.
- [ ] Race-safe `ResIDValue`: a duplicate booking attempt with the same id returns the same booking (idempotent).

Test command (existing): `bun test src/shared/adapters/dingus`.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Failed to parse XML response" | Supplier returned HTML (auth failure page) | Check `DINGUS_USERNAME` / `DINGUS_PASSWORD` env vars; verify base URL |
| Booking returns no locator | `ResStatus=Commit` failed silently | Check Dingus dashboard for the request; look for guest-counts mismatch (rule 3.1) |
| All rate plans missing from availability | `ratePlanCode: "USD"` set on a sub-feed that doesn't have USD rates | Remove the override from `DINGUS_OVERRIDES` for that sub-feed |
| Country filter shows no Cuban hotels even though they were synced | Address resolution failed (rule 3.6) | Set `GOOGLE_MAPS_API_KEY` and re-sync; or backfill country via `migrate-resolve-dingus-countries.ts` script |
| Duplicate bookings | Frontend retried before the first response | The adapter is idempotent via `ResIDValue` — but the frontend must reuse the same id on retry. Check the agency-app retry logic |

---

## 11. Risks & Edge Cases

- **Hard cutoff for cancellation:** most Dingus rate plans don't allow cancellation within 24h of check-in. Always show the policy to the customer before they pay.
- **Hotel data quality varies by sub-feed:** the Hotetec/Dingus feeds in practice often lack lat/lng, address, and category — don't design features that depend on these without confirming with stakeholders. The catalog sync stores whatever is returned.
- **Cuban national chains close in low season:** availability returning empty for July/August doesn't always mean an error — many properties are seasonal.
- **Sub-vendor inventory overlap:** the same hotel can appear under multiple sub-feeds (e.g., a Meliá hotel under both `melia` and the generic `dingus` feed). The catalog sync dedupes by `(vendor, hotelCode)`, but the same hotel may surface twice in search. The Pricing Policy module's `markup_rules[scope=hotel]` is keyed by `_id`, so a sub-vendor duplicate gets a different markup row — investigate before manual overrides.

---

## 12. Code References

| File | Role |
|---|---|
| `backend-service/src/shared/adapters/dingus/dingus.adapter.ts` | `VendorAdapter` implementation |
| `backend-service/src/shared/adapters/dingus/dingus.soap-client.ts` | xml2js wrapper, request signing, retry logic |
| `backend-service/src/shared/adapters/dingus/dingus.transformer.ts` | Dingus response → unified shapes |
| `backend-service/src/shared/adapters/dingus/dingus.guest-utils.ts` | Guest-counts builders (rule 3.1) |
| `backend-service/src/shared/adapters/dingus/dingus.types.ts` | All SOAP request/response type definitions |
| `backend-service/src/shared/config/index.ts` (DINGUS_OVERRIDES) | Per-sub-vendor overrides |
| `backend-service/src/shared/config/vendor-mapping.ts` (AdapterType.DINGUS) | Sub-vendor → adapter mapping |
| `backend-service/src/domains/hotel/services/sync.service.ts` | Calls `getHotelList()` daily |
| `backend-service/src/shared/adapters/dingus/__tests__/` | Unit tests |

---

**Last verified against code:** 2026-05-29.
**Maintainer:** integrations team.
