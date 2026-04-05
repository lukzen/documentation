# Restel GDS Integration — Development Guide

**Document Version:** 1.0
**Date:** March 24, 2026
**Branch:** `feature/restel-integration` (off `master`)
**Author:** Engineering Team

---

## 1. Overview

### What
Integrate Restel (Hotelbeds) as a new GDS provider into the Ergos Continental booking platform, alongside the existing providers: Hotetec, Dingus, and Roibos (Juniper).

### Why
Expanding our GDS coverage increases hotel inventory available to travel agents, improving selection and competitiveness.

### Architecture Impact
- **Backend** (`backend-service/`): New adapter implementing the existing `VendorAdapter` interface — the bulk of the work
- **Frontend** (`agency-app/`): Minimal changes — the frontend is already vendor-agnostic via `x-vendor`/`x-provider` HTTP headers

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

### Booking Flow (Strict Sequential Order)

```
┌─────────────────────────────────────────────────────────────┐
│  XML 110: Availability Search                                │
│  Returns: hotel/room options + opaque `lin` tokens           │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  XML 24: Hotel Observations (mandatory display to client)    │
│  XML 144: Cancellation Costs (pre-booking penalty info)      │
│  (Both use `lin` token from XML 110)                         │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  XML 202: Pre-reservation                                    │
│  Locks price for 15 minutes                                  │
│  Returns: localizador (8-digit), final price                 │
│  ⚠️ Price may differ from XML 110 — must detect & handle     │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  XML 3: Confirm (tipo=AE) or Deny (tipo=AI)                 │
│  Returns: localizador_corto (confirmation locator)           │
│  ✅ Confirmed when: estado == "00" AND localizador_corto set │
└─────────────┬───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  XML 12: Voucher Retrieval                                   │
│  Returns: printable voucher data                             │
└─────────────────────────────────────────────────────────────┘
```

### Post-Booking Operations
| Operation | XML Service | Notes |
|-----------|------------|-------|
| List bookings | XML 8 | Filter by date range |
| Booking detail | XML 11 | ⚠️ Uses comma decimal separator (`30,00`) |
| Cancellation costs | XML 142 | Check before cancelling |
| Cancel booking | XML 401 | Requires both locators. Only up to 1 day before check-in |
| Static: Countries | XML 5 | Bulk download |
| Static: Provinces | XML 6 | Bulk download |
| Static: Cities | XML 18 | Bulk download |
| Static: Hotels | XML 17 | Bulk download |
| Static: Hotel info | XML 15 | Individual hotel details |

---

## 3. Critical Implementation Rules

### 3.1 The `lin` Token (MOST IMPORTANT)
The `<lin>` field returned from XML 110 is an **opaque, `#`-delimited string** (example: `DB#1#C+#30.00#10.00#OB#OK#20180815#20180816#EU#2-0#0#0#201804101358#745388#`).

**Rules:**
- MUST be stored and forwarded **completely unmodified** through XML 24, XML 144, and XML 202
- **No parsing, splitting, trimming, or editing** of this token
- Store in Redis with TTL=15min (keyed by distributionId) after XML 110
- Retrieve from Redis when user proceeds to booking (XML 202)

### 3.2 Dual-Locator System
After booking, the system tracks **two** 8-digit locators:
- `localizador` / `localizador_largo` — from XML 202 (pre-reservation)
- `localizador_corto` — from XML 3 (confirmation)

**Both are required** for cancellation (XML 401) and voucher retrieval (XML 12).

### 3.3 Price Change Detection
Prices can change between availability (XML 110) and pre-reservation (XML 202). The `importe_total_reserva` from XML 202 is the **final** price.

**Required behavior:**
1. Compare XML 110 price with XML 202 `importe_total_reserva`
2. If different → flag `priceChanged: true` in response + include `newTotalAmount`
3. Frontend must prompt user to accept/reject the new price before calling XML 3

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

The transformer must handle both.

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

## 4. Backend Implementation Plan

### 4.1 Files to Modify

| File | Change |
|------|--------|
| `src/config/index.ts` | Add `restel` entry to `ServiceConfigType.vendor` and config object |
| `src/config/vendor-mapping.ts` | Add `RESTEL` to `AdapterType` enum + `VENDOR_TO_ADAPTER_MAP` |
| `.env` | Add `RESTEL_BASE_URL`, `RESTEL_CODIGOUSU`, `RESTEL_CLAUSU`, `RESTEL_AFILIACIO`, `RESTEL_SECACC` |
| `src/adapters/transformers/types.ts` | Add Restel request/response TypeScript interfaces |
| `src/adapters/index.ts` | Import `RestelAdapter`, add to `AdapterFactory.getAdapter()` switch |
| `src/models/unified-booking.model.ts` | Add `vendorShortReference`, `vendorObservations`, `priceChangedFromOriginal`, `originalQuotedAmount` fields |

### 4.2 New Files to Create

#### `src/adapters/restel.adapter.ts` (~500-700 lines)

Implements `VendorAdapter` interface:

```typescript
import { VendorAdapter, VendorConfig } from "./base.adapter"
import { parseStringPromise, Builder } from "xml2js"
import axios from "axios"
import { redis } from "@/config/redis"

export interface RestelConfig extends VendorConfig {
  codigousu: string
  clausu: string
  afiliacio: string
  secacc: string
}

export class RestelAdapter implements VendorAdapter {
  private config: RestelConfig

  constructor(config: RestelConfig) {
    this.config = config
  }

  // Build URL with auth params
  private getAuthenticatedUrl(): string {
    const params = new URLSearchParams({
      codigousu: this.config.codigousu,
      clausu: this.config.clausu,
      afiliacio: this.config.afiliacio,
      secacc: this.config.secacc,
    })
    return `${this.config.baseUrl}?${params.toString()}`
  }

  // Send XML request with gzip header
  private async sendRequest(xmlBody: string): Promise<any> {
    const response = await axios.post(this.getAuthenticatedUrl(), xmlBody, {
      headers: {
        "Content-Type": "application/xml",
        "Accept-Encoding": "gzip, deflate",
      },
      timeout: 60000,
      decompress: true,
    })
    return parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true,
    })
  }

  // Method mapping:
  // getConfigs()          → returns [this.config]
  // getHotelList()        → XML 17 (hotel catalog)
  // getHotelInformation() → XML 15 + XML 24
  // getHotelAvailability()→ XML 110 + cache lin tokens in Redis
  // bookRoom()            → XML 202 (pre-reservation)
  // completeBooking()     → no-op (Restel has no separate step)
  // confirmBooking()      → XML 3 (tipo=AE)
  // cancelBooking()       → XML 401
  // getBooking()          → XML 11
  // listBookings()        → XML 8
}
```

#### `src/adapters/restel.transformer.ts`

```typescript
import {
  StandardizedRoomAvailability,
  RestelAvailabilityLine,
} from "./transformers/types"
import { HotelType } from "@/models/hotels.model"
import { UnifiedBookingType } from "@/models/unified-booking.model"

// Transform XML 110 lines → StandardizedRoomAvailability[]
export function transformRestelAvailability(
  lines: RestelAvailabilityLine[]
): StandardizedRoomAvailability[] { ... }

// Transform XML 17 hotels → HotelType[]
export function transformRestelHotelList(
  restelHotels: any[]
): HotelType[] { ... }

// Transform booking responses → UnifiedBookingType
export function transformRestelBooking(
  response: any,
  existingBooking?: Partial<UnifiedBookingType>
): Partial<UnifiedBookingType> { ... }

// Handle 5+ date formats → ISO 8601
export function normalizeRestelDate(
  dateStr: string,
  inputFormat?: string
): string { ... }

// Handle comma vs dot decimals
export function normalizeRestelAmount(amountStr: string): number { ... }
```

#### `src/integration-tests/restel/` (NEW directory)

| Test File | Covers |
|-----------|--------|
| `restel-availability.test.ts` | XML 110 call, response parsing, lin token extraction |
| `restel-booking.test.ts` | Full flow: availability → pre-reserve → confirm |
| `restel-cancellation.test.ts` | XML 401 with both locators |
| `restel-detail.test.ts` | XML 11 with comma decimal handling |

### 4.3 Method Implementation Details

#### `getHotelAvailability()` — The Core Flow

```
1. Build XML 110 request from GetHotelAvailabilityRequest params
   - Convert dates to mm/dd/yyyy
   - Format distribution → pax/edaNin strings

2. POST to Restel endpoint

3. Parse response → extract <lin> lines

4. For each line:
   a. Generate distributionId
   b. Store lin token in Redis: key=`restel:lin:${distributionId}`, TTL=15min
   c. Call XML 24 for hotel observations (batch if possible)
   d. Call XML 144 for detailed cancellation policy

5. Transform to StandardizedRoomAvailability[]
   - Map room code, name, meal plan
   - Map pricing (normalize decimals, extract city tax)
   - Map cancellation policies
   - Include hotel observations in response

6. Return standardized availability
```

#### `bookRoom()` — Pre-reservation

```
1. Extract distributionId from reservation request
2. Retrieve lin token from Redis: `restel:lin:${distributionId}`
   - If expired → return error "Session expired, please search again"

3. Build XML 202 request with:
   - lin token (UNMODIFIED)
   - Guest name (titular)
   - Email
   - CC details if forma_pago=12

4. POST to Restel endpoint (60s timeout)

5. Parse response → extract localizador, importe_total_reserva

6. PRICE CHANGE CHECK:
   - Compare original price (from Redis/request) with importe_total_reserva
   - If different: flag priceChanged=true, include both amounts

7. Store localizador in booking record
8. Return UnifiedBookingType with bookingToken=localizador
```

#### `confirmBooking()` — Final Confirmation

```
1. Build XML 3 request with:
   - localizador (from stored booking)
   - tipo="AE" (confirm)

2. POST to Restel (60s timeout)
   - On timeout: call XML 11 to check actual status

3. Validate: estado=="00" AND localizador_corto is non-empty
   - If not confirmed → return error with actual status

4. Store localizador_corto in vendorShortReference
5. Store observaciones in vendorObservations
6. Update booking status to CONFIRMED
```

---

## 5. Frontend Implementation Plan

### 5.1 Files to Modify

| File | Change |
|------|--------|
| `agency-app/src/api/reservations/types.ts` | Add optional fields: `vendorShortReference`, `vendorObservations`, `priceChanged`, `newTotalAmount` |
| `agency-app/src/domains/booking/pages/BookingPage.tsx` | Add price-change handling after reservation API response |
| `agency-app/src/domains/booking/components/VendorGuestFields.tsx` | No functional changes — Restel uses standard fields |

### 5.2 Price Change Handling (BookingPage.tsx)

After calling `createNewReservation()` or `createMultiRoomBooking()`:

```typescript
const result = await api.reservations.createNewReservation(payload)

if (result.priceChanged) {
  // Show modal: "The hotel price has changed"
  // Old price: $X → New price: $Y
  // [Accept New Price] → call confirm endpoint
  // [Cancel] → call cancel pre-reservation
  const accepted = await showPriceChangeModal(
    payload.totalAmount,
    result.newTotalAmount
  )

  if (accepted) {
    await api.reservations.confirmBooking(result.id)
  } else {
    await api.reservations.cancelBooking(result.id)
  }
}
```

### 5.3 No Other Frontend Changes Needed

The frontend already:
- Routes vendor via `x-vendor`/`x-provider` headers ✅
- Passes `vendorCode`/`vendorKey`/`provider` through booking payloads ✅
- Displays booking references from `vendorReference` ✅
- Shows cancellation policies from standardized response ✅
- Handles all guest fields dynamically via `VendorGuestFields` ✅

---

## 6. Environment Variables

Add to `backend-service/.env`:

```bash
# RESTEL GDS
RESTEL_BASE_URL=https://xml.hotelresb2b.com/xml/listen_xml.jsp
RESTEL_CODIGOUSU=<user_code>
RESTEL_CLAUSU=<password>
RESTEL_AFILIACIO=<affiliation>
RESTEL_SECACC=<access_sequence>
```

> ⚠️ Get test credentials from Restel for development. Production credentials should be stored in secure environment (not committed to repo).

---

## 7. Testing & Verification

### Unit Tests
- [ ] Restel date normalization (all 5 formats)
- [ ] Restel decimal normalization (comma and dot)
- [ ] Transformer: XML 110 → StandardizedRoomAvailability
- [ ] Transformer: booking response → UnifiedBookingType
- [ ] Lin token storage and retrieval
- [ ] Price change detection logic

### Integration Tests (against Restel test environment)
- [ ] XML 110: Search availability for a known hotel/city
- [ ] XML 24: Get hotel observations
- [ ] XML 144: Get cancellation costs
- [ ] XML 202: Create pre-reservation
- [ ] XML 3: Confirm reservation
- [ ] XML 11: Read reservation detail
- [ ] XML 401: Cancel reservation
- [ ] Full flow: Search → Pre-reserve → Confirm → Cancel

### End-to-End Tests
- [ ] Frontend search with `x-vendor: restel` returns results
- [ ] Room availability displays correctly with Restel data
- [ ] Booking flow completes (guest info → payment → confirmation)
- [ ] Both locators stored and displayed
- [ ] Cancellation works with both locators
- [ ] Price change modal appears when prices differ
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

## 8. Risks & Edge Cases

| Risk | Mitigation |
|------|-----------|
| `lin` token expiry (15 min) | Show "session expired" message, redirect to search |
| Price changes at pre-reservation | Frontend modal for accept/reject |
| 60-second timeouts on booking/cancel | Fall back to XML 11 status check |
| Same-day cancellation not allowed via API | Show message to contact `booking@restel.travel` |
| Decimal separator inconsistency | `normalizeRestelAmount()` handles both |
| Date format chaos | `normalizeRestelDate()` with format detection |
| City tax not in total price | Display separately, note "paid at hotel" |
| Restel API downtime | Standard adapter error handling, return user-friendly error |

---

## 9. Existing Code References

These are the patterns to follow — read these files before implementing:

| File | Why |
|------|-----|
| `backend-service/src/adapters/base.adapter.ts` | VendorAdapter interface to implement |
| `backend-service/src/adapters/roibos.adapter.ts` | Best reference — also XML/SOAP, similar booking flow |
| `backend-service/src/adapters/dingus.adapter.ts` | Multi-vendor adapter pattern, OTA XML handling |
| `backend-service/src/adapters/index.ts` | AdapterFactory — where to wire new adapter |
| `backend-service/src/config/vendor-mapping.ts` | Vendor-to-adapter mapping |
| `backend-service/src/config/index.ts` | Vendor config structure |
| `backend-service/src/adapters/transformers/types.ts` | All standardized types + existing vendor types |
| `backend-service/src/models/unified-booking.model.ts` | Unified booking schema |

---

## 10. Out of Scope

- Restel static data sync (XML 5/6/18/17/15 for countries/cities/hotels) — can be a separate task
- Multi-room booking via Restel — confirm if Restel supports it natively
- Restel certification scenarios — separate task after adapter is built
- Modifying existing adapters (Hotetec, Dingus, Roibos)