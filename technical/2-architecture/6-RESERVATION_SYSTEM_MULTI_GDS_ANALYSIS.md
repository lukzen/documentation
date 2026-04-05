# Reservation System Architecture — Multi-GDS Deep Analysis

## Context
This is a technical architecture analysis (not an implementation plan) of how reservations flow through the Ergos Continental platform across all four GDS adapters: **Dingus**, **Hotetec**, **Roibos (Juniper)**, and **Restel (Hotelbeds)**. The goal is to document the end-to-end booking lifecycle for team onboarding and architectural decision-making.

---

## 1. High-Level Architecture

```
Agency App (React) → Backend Service (Express/Bun) → GDS Adapters → External GDS APIs
                                                    ↓
                                              MongoDB (backoffice.bookings)
                                              Redis (session/token cache)
```

### Key Files
| Layer | File | Purpose |
|---|---|---|
| API Routes | `backend-service/src/domains/booking/routes/booking.routes.ts` | REST endpoints for bookings |
| Orchestrator | `backend-service/src/domains/booking/services/booking.service.ts` | `UnifiedBookingService` — delegates to adapters, normalizes, persists |
| Multi-Room | `backend-service/src/domains/booking/services/multi-room.service.ts` | Multi-room orchestration with rollback |
| Cancellation | `backend-service/src/domains/booking/services/cancellation.service.ts` | Policy-based cancellation with penalty calculation |
| Model | `backend-service/src/domains/booking/models/booking.model.ts` | `UnifiedBookingType` Mongoose schema (16 indexes) |
| Validation | `backend-service/src/domains/booking/schemas/booking.schema.ts` | Zod schemas for request validation |
| DTOs | `backend-service/src/domains/booking/schemas/booking.dto.ts` | Response shaping (strips vendorResponse for non-admin) |
| Base Adapter | `backend-service/src/shared/adapters/base.adapter.ts` | `VendorAdapter` interface contract |
| Dingus | `backend-service/src/shared/adapters/dingus/dingus.adapter.ts` | SOAP/OTA XML adapter |
| Hotetec | `backend-service/src/shared/adapters/hotetec/hotetec.adapter.ts` | REST/JSON adapter |
| Roibos | `backend-service/src/shared/adapters/roibos/roibos.adapter.ts` | SOAP/Juniper XML adapter |
| Restel | `backend-service/src/shared/adapters/restel/restel.adapter.ts` | Custom XML adapter |
| Frontend Booking | `agency-app/src/domains/booking/pages/BookingPage.tsx` | Guest info + payment form |
| Frontend Confirm | `agency-app/src/domains/booking/pages/BookingConfirmationPage.tsx` | Post-booking confirmation |
| Frontend Cancel | `agency-app/src/domains/booking/components/CancellationFlow.tsx` | 3-step cancellation modal |

---

## 2. VendorAdapter Interface Contract

Defined in `base.adapter.ts`, every GDS adapter must implement:

| Method | Required | Description |
|---|---|---|
| `bookRoom()` | Yes | Create a single-room reservation |
| `cancelBooking()` | Yes | Cancel an existing reservation |
| `confirmBooking()` | Yes | Confirm/finalize a reservation |
| `getCancellationInfo()` | Yes | Retrieve cancellation policies & penalties |
| `getBookingDetails()` | Yes | Fetch reservation details by locator |
| `bookMultiRoom()` | Optional | Native multi-room booking (only Hotetec) |
| `modifyBooking()` | Optional | Modify existing reservation (only Dingus) |

---

## 3. GDS Adapter Comparison

### 3A. Protocol & Authentication

| GDS | Protocol | Auth Method | Session Management |
|---|---|---|---|
| **Dingus** | SOAP/OTA XML | API key in XML headers | Stateless (per-request credentials) |
| **Hotetec** | REST/JSON | Session token (login endpoint) | Redis-cached, 30-min TTL, auto-refresh |
| **Roibos** | SOAP/Juniper XML | Login+Password in XML headers | Stateless (per-request credentials) |
| **Restel** | Custom XML over HTTP | Credentials as URL query params | Stateless; `lin` token from availability cached in Redis (15-min TTL) |

### 3B. Booking Phases

| GDS | Phase 1 | Phase 2 | Phase 3 | Confirmation Model |
|---|---|---|---|---|
| **Dingus** | `OTA_HotelResRQ` (Initiate) | `OTA_HotelResRQ` (Commit) | — | Two-phase: Initiate gets quote, Commit finalizes |
| **Hotetec** | `bookRoom()` | `complete()` | `confirm()` | Three-phase: book → complete with guest details → confirm |
| **Roibos** | `BookingRules` (preflight) | `HotelBooking` | — | Two-phase: rules check → booking. `confirmBooking()` is a **no-op** |
| **Restel** | `XML 110` (availability/lin) | `XML 202` (pre-reservation) | `XML 3` (confirm) | Three-phase: lin token → pre-reserve → confirm with payment |

### 3C. Key Adapter Specifics

#### Dingus (SOAP/OTA)
- **Multi-vendor**: Single adapter handles multiple hotel chains via config-based credentials
- **Modify support**: Only adapter implementing `modifyBooking()` — sends OTA_HotelResModifyRQ
- **Locator structure**: Returns `ResID_Value` (vendor) + internal booking reference
- **Error handling**: Parses OTA `<Errors>` and `<Warnings>` from XML response

#### Hotetec (REST/JSON)
- **Session-based auth**: Calls `/login` endpoint, caches session token in Redis with 30-min TTL
- **Native multi-room**: Only adapter with `bookMultiRoom()` — sends all rooms in single API call
- **Three-step flow**: `bookRoom()` creates hold → `complete()` adds guest details → `confirm()` finalizes
- **Price verification**: Compares returned price against expected; logs discrepancies

#### Roibos (Juniper)
- **BookingRules preflight**: Mandatory pre-check before booking (validates availability, returns policies)
- **Price range validation**: Accepts bookings only if price is within 25%–100% of quoted price
- **Vendor-specific guest fields**: Agency app renders extra fields (nationality, document type) for Roibos bookings
- **Confirm is no-op**: `confirmBooking()` returns success without API call (booking is final after HotelBooking)
- **SOAP namespaces**: Complex XML with Juniper-specific namespace handling

#### Restel (Hotelbeds Legacy)
- **`lin` token flow**: Opaque availability token from search (XML 110) → cached in Redis (15-min TTL) → stored as `rate.code` in unified format → passed through entire booking pipeline
- **ISO-8859-1 encoding**: Only adapter not using UTF-8; requires special encoding for XML payloads
- **Credentials in URL**: API key and secret sent as query parameters (not headers)
- **Dual locator cancellation**: Cancellation requires BOTH internal locator AND vendor locator
- **Pre-reservation model**: XML 202 creates tentative booking, XML 3 confirms with payment commitment
- **Price change warnings**: Returns `priceChangedFromOriginal` flag; frontend shows warning banner on confirmation page

---

## 4. Booking Flow — End to End

### 4A. Agency App Frontend Flow

```
Search → Hotel Results → Room Detail → Booking Page → Confirmation
```

1. **Search** (`agency-app/src/domains/search/`): User enters destination, dates, guests. API call with `x-vendor` and `x-provider` headers to route to correct GDS.

2. **Room Selection** (`RoomDetailPage.tsx`): Calls availability endpoint. Displays rooms with rates. Multi-room panel allows adding multiple rooms. Rate object carries vendor-specific tokens (e.g., Restel's `lin`).

3. **Booking Page** (`BookingPage.tsx`):
   - 3-step payment flow: Guest Info → Payment Method → Card Details
   - Vendor-aware guest forms: Roibos requires nationality + document type fields
   - Single vs multi-room decision: if >1 room, calls `/bookings/multi-room` endpoint
   - Sends `vendorCode`, `providerCode`, rate details, guest info, payment info

4. **Confirmation** (`BookingConfirmationPage.tsx`):
   - Displays booking reference, vendor reference, cancellation deadline
   - Restel-specific: shows price change warning if `priceChangedFromOriginal` is true
   - Links to booking detail / my bookings

### 4B. Backend Service Flow

```
POST /bookings → Validate → Adapter.bookRoom() → Normalize → Persist → Email → Response
```

1. **Route**: `POST /bookings` or `POST /bookings/multi-room` (Zod-validated)
2. **Service** (`UnifiedBookingService.createBooking()`):
   - Resolves correct adapter from vendor/provider codes
   - Calls `adapter.bookRoom()` (vendor-specific multi-phase flow happens inside adapter)
   - Adapter returns vendor-specific response
   - Service normalizes into `UnifiedBookingType` via adapter's transformer
   - Persists to MongoDB `backoffice.bookings` collection
   - Triggers confirmation email via `EmailService`
   - Returns DTO (strips `vendorResponse` for non-admin users)

3. **Multi-Room** (`MultiRoomBookingService`):
   - If Hotetec: uses native `adapter.bookMultiRoom()`
   - If other GDS: sequential per-room `adapter.bookRoom()` calls
   - **Rollback on failure**: If room N fails, cancels rooms 1..N-1

---

## 5. Cancellation Flow

### Frontend (`CancellationFlow.tsx`)
3-step modal:
1. **Review**: Calls `GET /bookings/:id/cancellation-info` → displays policies, penalties, deadline
2. **Confirm**: User enters cancellation reason, acknowledges penalty amount
3. **Result**: Calls `PUT /bookings/:id/cancel` → shows success/failure

### Backend (`CancellationService`)
- **Policy-based penalties**: Calculates penalty based on cancellation deadline vs current date
- **Acknowledged penalty**: Validates that `acknowledgedPenaltyAmount` matches calculated penalty (prevents stale UI)
- **Multi-room atomic cancellation**: Cancels all rooms in a booking (per-room cancel calls to adapter)
- **Adapter-specific requirements**:
  - Dingus: `OTA_CancelRQ` with ResID
  - Hotetec: `DELETE` to cancellation endpoint with session token
  - Roibos: `HotelCancellation` SOAP call
  - Restel: Requires BOTH `locator` AND `vendorLocator` in cancellation XML

---

## 6. Data Model — UnifiedBookingType

Stored in `backoffice.bookings` (MongoDB). Key fields:

| Field | Description |
|---|---|
| `bookingReference` | Internal platform reference |
| `vendorBookingReference` | GDS-assigned locator |
| `vendorCode` | Which GDS (dingus/hotetec/roibos/restel) |
| `providerCode` | Which hotel provider within the GDS |
| `status` | confirmed / pending / cancelled / completed / failed |
| `guestInfo` | Name, email, phone, nationality, document (varies by GDS) |
| `hotelDetails` | Name, address, stars, images |
| `roomDetails[]` | Room type, rate, board, occupancy per room |
| `paymentInfo` | Amount, currency, method, card details (masked) |
| `cancellationPolicy` | Deadline, penalty rules, free cancellation date |
| `vendorResponse` | Raw GDS response (only exposed in admin DTO) |
| `travelAgency` | ObjectId ref to agency |
| `salesAgent` | ObjectId ref to agent |
| `createdAt` / `updatedAt` | Timestamps |

16 indexes for query performance (by reference, vendor, status, agency, agent, date ranges).

---

## 7. Key Architectural Observations

### Strengths
- **Clean adapter pattern**: `VendorAdapter` interface ensures all GDS adapters expose a uniform API regardless of underlying protocol complexity
- **Unified data model**: Single `UnifiedBookingType` schema normalizes vastly different GDS response formats
- **Rollback safety**: Multi-room bookings have automatic rollback on partial failure
- **DTO layer**: Separates admin vs public booking views (vendorResponse exposure control)
- **Penalty validation**: `acknowledgedPenaltyAmount` prevents stale cancellation penalties

### Areas to Watch
- **Restel `lin` token expiry**: 15-min Redis TTL means long booking forms risk expired tokens. No retry/refresh mechanism exists — user would need to restart search
- **Sequential multi-room for non-Hotetec**: Dingus/Roibos/Restel book rooms one at a time. If room 3 of 5 fails, rooms 1-2 get cancelled (rollback), but the user loses all rooms
- **Roibos price range (25%–100%)**: Unusually wide acceptance range could lead to booking at significantly different prices than quoted
- **No modification support for 3 of 4 GDS**: Only Dingus supports `modifyBooking()`. Others require cancel + rebook
- **Restel credentials in URL**: Query parameter auth is less secure than header-based auth; should be monitored for logging/proxy exposure
- **Confirm no-op for Roibos**: `confirmBooking()` silently succeeds without actually calling the GDS — could mask issues if the orchestrator assumes confirmation is a real step
