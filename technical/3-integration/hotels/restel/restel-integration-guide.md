# Restel GDS Integration — Development Guide

A step-by-step guide for understanding how the Restel GDS adapter was added to the Ergos Continental platform. Written so that a junior developer can follow through and complete the integration once credentials are available.

> **Prerequisites**: Read the [Reservation System Multi-GDS Analysis](../../../../agency-app/docs/1-RESERVATION_SYSTEM_MULTI_GDS_ANALYSIS.md) first to understand the overall adapter pattern and booking lifecycle.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Restel API Reference](#2-restel-api-reference)
3. [Critical Implementation Rules](#3-critical-implementation-rules)
4. [What Was Created](#4-what-was-created)
5. [Backend: Step-by-Step Walkthrough](#5-backend-step-by-step-walkthrough)
6. [Frontend: Step-by-Step Walkthrough](#6-frontend-step-by-step-walkthrough)
7. [Configuration & Environment Variables](#7-configuration--environment-variables)
8. [The Restel Booking Flow in Detail](#8-the-restel-booking-flow-in-detail)
9. [Testing Checklist](#9-testing-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Risks & Edge Cases](#11-risks--edge-cases)
12. [Code References](#12-code-references)

---

## 1. Overview

### What

Restel (Hotelbeds) is the fourth GDS provider integrated into the Ergos Continental booking platform, alongside Hotetec, Dingus, and Roibos (Juniper).

### Why

Expanding GDS coverage increases hotel inventory available to travel agents, improving selection and competitiveness.

### Architecture Impact

- **Backend** (`backend-service/`): New adapter implementing the existing `VendorAdapter` interface — the bulk of the work
- **Frontend** (`agency-app/`): Minimal changes — the frontend is already vendor-agnostic via `x-vendor`/`x-provider` HTTP headers

### How Restel Differs from Other Adapters

Unlike the other adapters (Hotetec is REST/JSON, Dingus/Roibos are SOAP/XML), Restel uses a custom XML protocol over HTTP with some unusual patterns:

- Credentials are sent as **URL query parameters** (not headers or XML body)
- Responses use **ISO-8859-1 encoding** (not UTF-8)
- Dates use **mm/dd/yyyy** format in requests
- An opaque `lin` token from availability must be passed through to booking
- Booking is **three-phase**: availability → pre-reservation → confirmation
- Cancellation requires **two different locator codes**

The Restel adapter follows the same `VendorAdapter` interface pattern as Dingus, Hotetec, and Roibos — so the orchestration layer (`UnifiedBookingService`) doesn't need to know about any of these quirks.

---

## 2. Restel API Reference

### Endpoint & Authentication

| Property | Value |
|----------|-------|
| **Base URL** | `https://xml.hotelresb2b.com/xml/listen_xml.jsp` |
| **Protocol** | HTTP POST with XML body |
| **Auth** | 4 URL query params: `codigousu`, `clausu`, `afiliacio`, `secacc` |
| **Required Header** | `Accept-Encoding: gzip` (or `deflate`) — uncompressed responses are **not permitted** |
| **Documentation** | http://wiki.restelhotels.com/en/home |

### XML Services

All operations use the same endpoint URL — the XML body determines the operation. Credentials are always in the URL query string.

#### Booking Flow (Strict Sequential Order)

| Operation | XML Code | Description |
|-----------|----------|-------------|
| Availability | 110 | Search available rooms — returns opaque `lin` tokens |
| Hotel Observations | 24 | Mandatory display to client (uses `lin` from 110) |
| Cancellation Costs | 144 | Pre-booking penalty info (uses `lin` from 110) |
| Pre-Reservation | 202 | Locks price for 15 minutes — returns `localizador` |
| Confirmation | 3 | Confirm (`tipo=AE`) or Deny (`tipo=AI`) — returns `localizador_corto` |
| Voucher | 12 | Printable voucher data |

#### Post-Booking Operations

| Operation | XML Code | Notes |
|-----------|----------|-------|
| List bookings | 8 | Filter by date range |
| Booking detail | 11 | Uses comma decimal separator (`30,00`) |
| Cancellation costs | 142 | Check before cancelling |
| Cancel booking | 401 | Requires both locators. Only up to 1 day before check-in |

#### Static Data

| Operation | XML Code | Notes |
|-----------|----------|-------|
| Countries | 5 | Bulk download |
| Provinces | 6 | Bulk download |
| Cities | 18 | Bulk download |
| Hotels | 17 | Bulk download |
| Hotel info | 15 | Individual hotel details |

---

## 3. Critical Implementation Rules

These rules come from the Restel API documentation and are enforced in the adapter code.

### 3.1 The `lin` Token (MOST IMPORTANT)

The `<lin>` field returned from XML 110 is an **opaque, `#`-delimited string** (example: `DB#1#C+#30.00#10.00#OB#OK#20180815#20180816#EU#2-0#0#0#201804101358#745388#`).

**Rules:**
- MUST be stored and forwarded **completely unmodified** through XML 24, XML 144, and XML 202
- **No parsing, splitting, trimming, or editing** of this token
- Store in Redis with TTL=15min after XML 110
- Retrieve from Redis when user proceeds to booking (XML 202)

| # | Rule | Where It's Enforced |
|---|---|---|
| 1 | `lin` token is opaque — pass through **unmodified** | `restel.adapter.ts` → `bookRoom()` |
| 2 | Credentials go in URL query params, NOT in XML body | `restel.adapter.ts` → `buildUrl()` |
| 3 | `Accept-Encoding: gzip` header is mandatory | `restel.adapter.ts` → `makeRequest()` |
| 4 | Request dates use mm/dd/yyyy format | `restel.transformer.ts` → `toRestelDateFormat()` |
| 5 | XML encoding is ISO-8859-1 (not UTF-8) | `restel.transformer.ts` → all XML builders |
| 6 | Pre-reservation price may differ from availability | `restel.transformer.ts` → `transformRestelPreReservation()` |
| 7 | Confirmation returns `observaciones` — must display on voucher | `restel.adapter.ts` → `confirmBooking()` |
| 8 | Cancellation requires BOTH localizador types | `restel.adapter.ts` → `cancelBooking()` |
| 9 | Prices may use comma decimals (`"1.234,56"`) | `restel.transformer.ts` → `parseRestelPrice()` |
| 10 | XML responses may return single item or array — handle both | `restel.adapter.ts` → `parseXml()` with `explicitArray: false` |

### 3.2 Dual-Locator System

After booking, the system tracks **two** 8-digit locators:
- `localizador` / `localizador_largo` — from XML 202 (pre-reservation)
- `localizador_corto` — from XML 3 (confirmation)

**Both are required** for cancellation (XML 401) and voucher retrieval (XML 12).

### 3.3 Price Change Detection

Prices can change between availability (XML 110) and pre-reservation (XML 202). The `importe_total_reserva` from XML 202 is the **final** price.

**Required behavior:**
1. Compare XML 110 price with XML 202 `importe_total_reserva`
2. If different → flag `priceChangedFromOriginal: true` in response + include both amounts
3. Frontend must warn the user before proceeding to confirmation

### 3.4 Date Format Normalization

Restel uses **5+ different date formats** across its API:

| Context | Format | Example |
|---------|--------|---------|
| Request (XML 110) | `mm/dd/yyyy` | `03/25/2026` |
| Response (availability) | `yyyymmdd` | `20260325` |
| Response (reservation detail) | `dd/mm/yyyy` | `25/03/2026` |
| Response (other) | `dd/mm/yy` | `25/03/26` |
| Response (voucher) | `yyyy-mm-dd` | `2026-03-25` |

**All dates must be normalized to ISO 8601** (`YYYY-MM-DD`) in the transformer.

### 3.5 Decimal Separator Inconsistency

- XML 11 (reservation detail) uses **commas**: `30,00`
- All other services use **dots**: `30.00`

The transformer handles both via `parseRestelPrice()`.

### 3.6 Timeout Handling

XML 202, XML 3, and XML 401 have a **60-second** timeout. If no response is received:
1. **Never assume confirmed or denied**
2. Use XML 11 to check actual status
3. Retry or report to user based on result

### 3.7 Mandatory Display Requirements

- Hotel observations from XML 24 → **MUST** be shown to the client
- Confirmation observations from XML 3 → **MUST** appear on the voucher
- City tax from XML 110/12 → **MUST** be shown separately (paid at hotel, not included in total)

### 3.8 Cancellation Constraints

- API cancellations allowed up to **1 day before check-in**
- Same-day cancellations require contacting `booking@restel.travel`
- Cancellation policies: `noches_gasto` and `estCom_gasto` are **mutually exclusive** (nights penalty OR percentage penalty, never both)

### 3.9 Payment Methods

| `forma_pago` | Description | CC Required? |
|-------------|-------------|--------------|
| `12` | Direct pay with credit card | Yes — CC fields in XML 202 |
| `25` | Credit (agency account) | No |
| `44` | Prepay | No |

---

## 4. What Was Created

### Backend Service — New Files

| File | Purpose |
|---|---|
| `src/shared/adapters/restel/restel.adapter.ts` | Main adapter class — implements `VendorAdapter` |
| `src/shared/adapters/restel/restel.transformer.ts` | XML builders + response transformers (pure functions) |
| `src/shared/adapters/restel/restel.types.ts` | TypeScript interfaces for all Restel API requests/responses |
| `src/shared/adapters/restel/index.ts` | Public exports for the module |

### Backend Service — Modified Files

| File | What Changed |
|---|---|
| `src/shared/config/index.ts` | Added `restelVendors` config block loading 5 env vars |
| `src/shared/config/vendor-mapping.ts` | Added `AdapterType.RESTEL` enum + `restel` entry in `VENDOR_REGISTRY` |
| `src/shared/adapters/index.ts` | Added `case AdapterType.RESTEL` in `AdapterFactory` switch |
| `.env.example` | Added `RESTEL_*` environment variables |

### Agency App — Modified Files

| File | What Changed |
|---|---|
| `src/api/reservations/types.ts` | Added Restel-specific response fields (`vendorShortReference`, `priceChangedFromOriginal`, etc.) |
| `src/domains/booking/pages/BookingPage.tsx` | Price change detection + warning toast for Restel |
| `src/domains/booking/pages/BookingConfirmationPage.tsx` | Display Restel observations + short reference |
| `src/domains/booking/components/VendorGuestFields.tsx` | Conditional form fields (document, address, city) for Restel bookings |
| `src/domains/booking/factories/bookingPayload.ts` | Include vendor-specific fields in booking payload |
| `src/domains/booking/__tests__/VendorGuestFields.test.ts` | Tests for vendor-specific field rendering |
| `src/domains/booking/__tests__/bookingPayload.test.ts` | Tests for payload building with Restel fields |

---

## 5. Backend: Step-by-Step Walkthrough

### Step 1: Define the Types (`restel.types.ts`)

Every adapter starts with types. This file defines TypeScript interfaces for every Restel API operation:

```
RestelConfig          — credentials (codigousu, clausu, afiliacio, secacc)
RestelAvailabilityLine — a single room result from XML 110 (contains the critical `lin` token)
RestelPreReservationRequest/Response — XML 202 booking request/response
RestelConfirmationRequest/Response   — XML 3 confirm/deny
RestelCancellationRequest/Response   — XML 401 cancel
RestelBookingDetailResponse          — XML 11 booking lookup
RestelHotelInfoResponse              — XML 15 hotel details
```

**Why this matters**: Strong typing catches integration bugs at compile time. When the Restel API returns a field with a comma-decimal price like `"1.234,56"`, the type tells you it's a `string`, not a `number` — so you know to parse it.

### Step 2: Build the Transformer (`restel.transformer.ts`)

The transformer is a collection of **pure functions** (no async, no side effects). It does two things:

**A) Build XML request bodies:**
```
buildAvailabilityXml()      → XML 110 request
buildPreReservationXml()    → XML 202 request
buildConfirmationXml()      → XML 3 request
buildCancellationXml()      → XML 401 request
buildBookingDetailXml()     → XML 11 request
buildHotelListXml()         → XML 17 request
buildHotelInfoXml()         → XML 15 request
buildHotelObservationsXml() → XML 24 request
```

Each function takes the `RestelConfig` and operation-specific parameters, and returns an XML string. All XML uses ISO-8859-1 encoding declaration.

**B) Transform responses into unified format:**
```
transformRestelAvailability()      → StandardizedRoomAvailability[]
transformRestelHotelList()         → HotelType[]
transformRestelHotelInfo()         → HotelType
transformRestelBooking()           → UnifiedBookingType
transformRestelPreReservation()    → UnifiedBookingType
```

Plus utilities:
```
parseRestelPrice("1.234,56")       → 1234.56 (handles comma decimals)
normalizeRestelDate("03/26/2026")  → "2026-03-26" (handles all 5 date formats)
toRestelDateFormat("2026-03-26")   → "03/26/2026" (for XML requests)
mapRestelStatus("00")              → ReservationStatus.CONFIRMED
```

**Why pure functions**: They're easy to unit test. You can test every XML builder and transformer in isolation without mocking HTTP or Redis.

### Step 3: Build the Adapter (`restel.adapter.ts`)

The adapter class implements `VendorAdapter` and encapsulates all Restel-specific logic:

**Constructor** — validates all 5 required credentials are present.

**Private helpers:**
- `buildUrl()` — appends credentials as URL query parameters
- `makeRequest(xmlBody, operation)` — sends POST with ISO-8859-1 content type, gzip accept-encoding, parses XML response, checks for errors
- `parseXml(xml)` — uses `xml2js` with `explicitArray: false` (critical for Restel's inconsistent array/single-item responses)
- `cacheLin(key, lin)` / `getCachedLin(key)` — Redis caching for `lin` tokens with 15-min TTL

**VendorAdapter methods:**

| Method | Restel Behavior |
|---|---|
| `getHotelList()` | Calls XML 17, returns skeleton hotel list |
| `getHotelInformation()` | Calls XML 15 + XML 24 in parallel |
| `getHotelAvailability()` | Calls XML 110, caches each `lin` token in Redis |
| `bookRoom()` | Reads cached `lin`, calls XML 202 pre-reservation |
| `completeBooking()` | **No-op** — Restel's pre-reservation is binding |
| `confirmBooking()` | Calls XML 3 with `accion="AE"`, stores `localizador_corto` |
| `cancelBooking()` | Calls XML 401 with BOTH locator types |
| `getBooking()` | Checks MongoDB first, falls back to XML 11 |
| `listBookings()` | MongoDB query filtered by `provider: "restel"` |

### Step 4: Register the Adapter

Three files needed small changes:

**`vendor-mapping.ts`** — Add the enum and registry entry:
```typescript
export enum AdapterType {
  HOTETEC = "hotetec",
  ROIBOS = "roibos",
  DINGUS = "dingus",
  RESTEL = "restel",       // ← added
}

export const VENDOR_REGISTRY = {
  // ...existing vendors...
  restel: { adapter: AdapterType.RESTEL, label: "Restel/Hotelbeds" },
}
```

**`config/index.ts`** — Load env vars:
```typescript
const restelVendors: Record<string, VendorConfig> = {
  restel: {
    name: "restel",
    baseUrl: process.env.RESTEL_BASE_URL,
    codigousu: process.env.RESTEL_CODIGOUSU,
    clausu: process.env.RESTEL_CLAUSU,
    afiliacio: process.env.RESTEL_AFILIACIO,
    secacc: process.env.RESTEL_SECACC,
  },
}
```

**`adapters/index.ts`** — Add factory case:
```typescript
case AdapterType.RESTEL:
  this.adapters[vendorLower] = new RestelAdapter(vendorConfig as RestelConfig)
  break
```

That's it for the backend. The `UnifiedBookingService` already routes by vendor code, so once the adapter is registered, booking/cancellation/retrieval all work automatically.

---

## 6. Frontend: Step-by-Step Walkthrough

### Step 1: Add Restel Response Types

In `src/api/reservations/types.ts`, add fields the backend returns for Restel bookings:

```typescript
// In ReservationResponse interface:
vendorShortReference?: string      // localizador_corto from XML 3
vendorObservations?: string        // hotel observations (must show on voucher)
priceChangedFromOriginal?: boolean // true if XML 202 price differs from XML 110
originalQuotedAmount?: number      // price from XML 110 availability
```

### Step 2: Handle Price Change Warnings

In `BookingPage.tsx`, after the booking API call returns, check for price changes:

```typescript
if (response.priceChangedFromOriginal) {
  toast.warning(`Price changed from ${originalPrice} to ${newPrice}`)
}
```

This is Restel-specific: the pre-reservation (XML 202) may return a different price than what was quoted in availability (XML 110). The user must be warned.

### Step 3: Add Vendor-Specific Guest Fields

`VendorGuestFields.tsx` renders extra form fields only for Restel (identified by provider `"roibos"` in the vendor mapping):

```typescript
if (provider !== "roibos") return null

// Render: Passport/ID Number, Address, City, Postal Code
```

These fields are required by the Restel API for guest identification.

### Step 4: Include Fields in Booking Payload

In `bookingPayload.ts`, conditionally include the vendor fields:

```typescript
document: bookingForm.document || undefined,
address: bookingForm.address || undefined,
city: bookingForm.city || undefined,
```

When these are `undefined`, they're omitted from the JSON payload — so non-Restel bookings aren't affected.

### Step 5: Display Confirmation Details

In `BookingConfirmationPage.tsx`, show Restel-specific confirmation data:
- `vendorShortReference` — the final confirmation locator (localizador_corto)
- `vendorObservations` — hotel notes that **must** appear on the voucher

### No Other Frontend Changes Needed

The frontend already:
- Routes vendor via `x-vendor`/`x-provider` headers
- Passes `vendorCode`/`vendorKey`/`provider` through booking payloads
- Displays booking references from `vendorReference`
- Shows cancellation policies from standardized response
- Handles all guest fields dynamically via `VendorGuestFields`

---

## 7. Configuration & Environment Variables

### Required Environment Variables

Add these to `backend-service/.env`:

```bash
# Restel (Hotelbeds) — credentials provided by Restel account manager
RESTEL_BASE_URL=https://xml.hotelresb2b.com/xml/listen_xml.jsp
RESTEL_CODIGOUSU=        # User code (codigousu)
RESTEL_CLAUSU=           # Password (clausu)
RESTEL_AFILIACIO=        # Affiliation code (afiliacio)
RESTEL_SECACC=           # Secondary access credential (secacc)
```

> **Note**: These are NOT yet available. The adapter will throw on initialization if any are missing. Once credentials arrive, fill them in and restart the backend.

### Redis Requirement

The adapter uses Redis to cache `lin` tokens. Ensure Redis is running:

```bash
make db-up   # starts MongoDB + Redis via Docker
```

Redis key pattern: `restel:lin:{hotelCode}_{index}` with 15-minute TTL.

### Vendor Routing

The frontend routes requests to Restel by sending these headers:

```
x-vendor: restel
x-provider: restel
```

The backend's `AdapterFactory` uses the `x-vendor` header to resolve `RestelAdapter`.

---

## 8. The Restel Booking Flow in Detail

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Availability (XML 110)                             │
│                                                             │
│  User searches → backend calls XML 110 → returns rooms     │
│  Each room has an opaque `lin` token                        │
│  lin tokens cached in Redis (15-min TTL)                    │
│  lin stored in rate.code in the unified room format         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1b: Observations + Cancellation Costs                 │
│                                                             │
│  XML 24: Hotel observations (mandatory display to client)   │
│  XML 144: Cancellation costs (pre-booking penalty info)     │
│  Both use `lin` token from XML 110                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Pre-Reservation (XML 202)                          │
│                                                             │
│  User fills booking form → backend reads cached lin         │
│  Sends XML 202 with lin token + guest info                  │
│  Returns: n_localizador (8-digit pre-reservation ID)        │
│  ⚠️ Price MAY differ from Phase 1 — flag it                │
│  Status: PENDING                                            │
│  Saved to MongoDB                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Confirmation (XML 3)                               │
│                                                             │
│  Backend calls XML 3 with accion="AE" (confirm)            │
│  Returns: localizador_corto (final confirmation code)       │
│  Returns: observaciones (MUST display on voucher)           │
│  Status: CONFIRMED                                          │
│  Updated in MongoDB                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Voucher (XML 12)                                   │
│                                                             │
│  Retrieve printable voucher data                            │
│  Requires both localizador types                            │
└─────────────────────────────────────────────────────────────┘

CANCELLATION (XML 401) — requires BOTH:
  • localizador_largo  (n_localizador from Phase 2)
  • localizador_corto  (from Phase 3)
  Only allowed up to 1 day before check-in.
  Same-day cancellations: contact booking@restel.travel
```

### What happens if the `lin` token expires?

The `lin` token has a 15-minute TTL in Redis. If the user takes too long on the booking form:

1. `bookRoom()` tries to read the cached `lin`
2. Redis returns `null` (expired)
3. Adapter throws an error
4. Frontend shows error — user must go back and search again

There is currently **no auto-refresh mechanism** for expired `lin` tokens. This is a known limitation (documented in the architecture analysis).

---

## 9. Testing Checklist

### Unit Tests (can run without credentials)

- [ ] **XML Builders**: Each `build*Xml()` function produces valid XML with correct encoding declaration
- [ ] **Date handling**: `normalizeRestelDate()` handles all 5 formats (mm/dd/yyyy, dd/mm/yyyy, yyyymmdd, dd/mm/yy, yyyy-mm-dd)
- [ ] **Date conversion**: `toRestelDateFormat("2026-03-26")` returns `"03/26/2026"`
- [ ] **Price parsing**: `parseRestelPrice("1.234,56")` returns `1234.56`; handles dot decimals too
- [ ] **Status mapping**: `mapRestelStatus("00")` → CONFIRMED, `"01"` → PENDING, `"02"` → CANCELLED
- [ ] **Booking status**: `mapRestelBookingStatus("C")` → CONFIRMED, `"N"` → PENDING, `"B"` → CANCELLED
- [ ] **Availability transform**: Maps `lin` into `rate.code`, extracts room/meal plan codes
- [ ] **Pre-reservation transform**: Detects price changes (threshold: 0.01 EUR)
- [ ] **Hotel info transform**: Handles `fotos` as single string or array; builds GeoJSON Point
- [ ] **Nested structures**: Handles `observaciones.observacion` as single item or array
- [ ] **Lin token storage and retrieval**: Redis cache/expiry behavior
- [ ] **Frontend: VendorGuestFields**: Renders for `"roibos"` provider, returns null for others
- [ ] **Frontend: bookingPayload**: Includes document/address/city when provided, omits when empty

### Integration Tests (require credentials)

- [ ] **Availability**: Search a known hotel code, verify rooms returned with `lin` tokens
- [ ] **Hotel observations**: Fetch XML 24 for a known hotel, verify observations returned
- [ ] **Cancellation costs**: Fetch XML 144, verify penalty structure
- [ ] **Hotel info**: Fetch XML 15 for a known hotel, verify images and details
- [ ] **Pre-reservation**: Book a room using cached `lin`, verify `n_localizador` returned
- [ ] **Confirmation**: Confirm with `accion="AE"`, verify `localizador_corto` returned
- [ ] **Booking detail**: Fetch XML 11, verify comma decimal handling
- [ ] **Cancellation**: Cancel using both locators, verify `estado="00"`
- [ ] **lin expiry**: Wait >15 minutes after availability, verify `bookRoom()` fails gracefully
- [ ] **Full flow**: Search → Pre-reserve → Confirm → Cancel

### End-to-End Tests

- [ ] Frontend search with `x-vendor: restel` returns results
- [ ] Room availability displays correctly with Restel data
- [ ] Booking flow completes (guest info → payment → confirmation)
- [ ] Both locators stored and displayed
- [ ] Cancellation works with both locators
- [ ] Price change warning appears when prices differ
- [ ] Hotel observations shown to agent
- [ ] Voucher includes confirmation observations
- [ ] City tax shown separately

### Build Verification

```bash
cd backend-service && bun run build   # No TypeScript errors
cd agency-app && bun run build        # No TypeScript errors
cd backend-service && bun test        # All tests pass
cd agency-app && bun test             # All tests pass
```

---

## 10. Troubleshooting

### "Configuration not found for vendor: restel"

The `RESTEL_*` env vars are missing or empty in `.env`. Fill them in and restart the backend.

### "Failed to parse RESTEL XML response"

The API returned non-XML content (HTML error page, empty response, or network error). Check:
- Is `RESTEL_BASE_URL` correct?
- Is the Restel API up? Try `curl -v <RESTEL_BASE_URL>` directly
- Check backend logs: `make logs-backend`

### "lin token not found" on booking

The `lin` token expired (15-min TTL) or was never cached. The user must search again. Check:
- Is Redis running? (`make db-up`)
- Time between search and booking — if >15 minutes, token expired

### "Cannot cancel: localizador_corto is missing"

The booking was pre-reserved (XML 202) but never confirmed (XML 3). You need both locators to cancel. Check the booking record in MongoDB — `vendorResponse` should show what stage the booking reached.

### Price mismatch warnings on confirmation page

Expected behavior. Restel's pre-reservation (XML 202) is allowed to return a different price than availability (XML 110). The `priceChangedFromOriginal` flag triggers a toast warning in the frontend.

### XML encoding errors or garbled characters

Restel uses ISO-8859-1. If you see garbled text in hotel names or observations, check that the `Content-Type` header includes `charset=ISO-8859-1` in the request.

---

## 11. Risks & Edge Cases

| Risk | Mitigation |
|------|-----------|
| `lin` token expiry (15 min) | Show "session expired" message, redirect to search |
| Price changes at pre-reservation | Frontend toast warning with both amounts |
| 60-second timeouts on booking/cancel | Fall back to XML 11 status check, never assume confirmed |
| Same-day cancellation not allowed via API | Show message to contact `booking@restel.travel` |
| Decimal separator inconsistency | `parseRestelPrice()` handles both comma and dot |
| Date format chaos (5+ formats) | `normalizeRestelDate()` with format detection |
| City tax not in total price | Display separately, note "paid at hotel" |
| Restel API downtime | Standard adapter error handling, return user-friendly error |

---

## 12. Code References

Read these files before making changes to the Restel adapter:

| File | Why |
|------|-----|
| `backend-service/src/shared/adapters/restel/` | The Restel adapter module (adapter, transformer, types) |
| `backend-service/src/shared/adapters/roibos.adapter.ts` | Best reference — also XML, similar booking flow |
| `backend-service/src/shared/adapters/dingus.adapter.ts` | Multi-vendor adapter pattern, OTA XML handling |
| `backend-service/src/shared/adapters/index.ts` | AdapterFactory — where the adapter is wired |
| `backend-service/src/shared/config/vendor-mapping.ts` | Vendor-to-adapter mapping |
| `backend-service/src/shared/config/index.ts` | Vendor config structure |
| `backend-service/src/shared/types.ts` | Shared type definitions including standardized types |
| `backend-service/src/domains/booking/models/unified-booking.model.ts` | Unified booking schema |

---

## Out of Scope

- Restel static data sync (XML 5/6/18/17/15 for countries/cities/hotels) — separate task
- Multi-room booking via Restel — confirm if Restel supports it natively
- Restel certification scenarios — separate task after adapter is built
- Modifying existing adapters (Hotetec, Dingus, Roibos)
