# ADR-001: CQRS Architecture Refactor

**Status:** Proposed
**Date:** 2026-06-03
**Authors:** Ergos Continental Engineering
**Deciders:** Lukasz, Mayank

---

## Context

The backend service (`backend-service`) is a monolithic Express/TypeScript API that serves all read and write operations through the same service layer and data models. The current architecture:

```
Agency App (React) ──► Express REST API ──► Service Layer ──► MongoDB
                                               │
Backoffice App ────────────►─────────►─────────┘
```

### Current Domain Structure

| Domain | Read Patterns | Write Patterns |
|--------|--------------|----------------|
| **Booking** | List bookings, search by locator/agency, booking details, cancellation info | Book room, confirm, cancel, multi-room orchestration |
| **Hotel** | Search availability (multi-GDS fan-out), scan history, availability summaries | Sync hotel data, flexible search indexing |
| **Travel Agency** | List agencies, agency details, vendor access config | Create/update agencies, manage contacts |
| **Sales Agent** | List agents, agent metrics, search by email | Create/update agents, assign agencies |
| **Auth** | Token validation, session lookup | Login, token refresh, passkey registration |
| **Analytics** | Dashboard metrics, booking stats, revenue reports | Event ingestion (implicit via bookings) |
| **Payment** | Payment status, transaction history | Process payment, refund |
| **Transportation** | Search transfers, reservation details | Book transfer, cancel, amend |

### Problems with the Current Approach

1. **Read/write contention in booking domain.** The `UnifiedBookingService` handles both complex multi-GDS write orchestration (2-3 phase booking flows per vendor) and simple read queries. Write-path complexity bleeds into the read path.

2. **Inconsistent query patterns.** Read operations hit MongoDB directly via Mongoose models with ad-hoc queries scattered across services. No unified read model optimized for the UI's actual data needs.

3. **Hotel search fan-out is a read concern mixed with caching logic.** `search-orchestrator.service.ts` fans out to 4+ GDS adapters, aggregates results, and manages Redis caching — this is fundamentally a read-side concern but lives alongside write-side sync operations.

4. **Multi-tenant database design adds query complexity.** Three separate MongoDB databases (backoffice, sales-agent, travel-agency) require cross-database joins at the application level, making read queries complex and slow.

5. **No event history.** State changes (booking confirmed, cancelled, modified) are applied directly to the document. There is no event log to audit, replay, or derive projections from.

6. **Analytics are derived from current state, not events.** Dashboard metrics are calculated by querying booking documents at read time, leading to expensive aggregation pipelines.

---

## Decision

Adopt CQRS (Command Query Responsibility Segregation) across the backend service, separating read and write models at the application layer.

### Architecture

```
                    ┌──────────────────────────────────────────┐
                    │              API Gateway                  │
                    │         (Express REST routes)             │
                    └────────────┬──────────┬──────────────────┘
                                 │          │
                    ┌────────────▼──┐  ┌────▼─────────────────┐
                    │  Command Side │  │     Query Side        │
                    │               │  │                       │
                    │  Commands:    │  │  Read Models:         │
                    │  - BookRoom   │  │  - BookingListView    │
                    │  - CancelBkg  │  │  - BookingDetailView  │
                    │  - CreateAgcy │  │  - HotelSearchView    │
                    │  - SyncHotels │  │  - AgencyDashboard    │
                    │               │  │  - AnalyticsView      │
                    │  Handlers →   │  │                       │
                    │  Domain Logic │  │  Thin query services   │
                    │  + Adapters   │  │  against read models   │
                    └───────┬───────┘  └────────▲──────────────┘
                            │                   │
                            ▼                   │
                    ┌───────────────┐    ┌──────┴──────────┐
                    │  Event Store  │───►│  Projections     │
                    │  (append-only)│    │  (materializers) │
                    └───────┬───────┘    └─────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   MongoDB     │
                    │  (write DB)   │
                    └───────────────┘
```

### What Changes

#### 1. Command Side (Write Path)

Each write operation becomes an explicit **command** dispatched to a **command handler**:

```typescript
// commands/booking/book-room.command.ts
interface BookRoomCommand {
  type: "BookRoom"
  agencyId: string
  hotelCode: string
  rooms: RoomRequest[]
  guestDetails: GuestInfo
  vendor: VendorType
}

// commands/booking/book-room.handler.ts
class BookRoomHandler {
  async execute(cmd: BookRoomCommand): Promise<BookingCreatedEvent> {
    // 1. Validate via domain rules
    // 2. Delegate to vendor adapter (Dingus/Hotetec/Roibos/Restel)
    // 3. Persist booking document (write model)
    // 4. Emit BookingCreated event
    // 5. Return event (not the read model)
  }
}
```

**Existing services become command handlers:**
- `UnifiedBookingService.bookRoom()` → `BookRoomHandler`
- `CancellationService.cancel()` → `CancelBookingHandler`
- `MultiRoomService.bookMultiRoom()` → `BookMultiRoomHandler`
- `TransportationService.book()` → `BookTransferHandler`

The vendor adapter pattern (`VendorAdapter` interface, Dingus/Hotetec/Roibos/Restel implementations) stays unchanged — it's already well-isolated.

#### 2. Event Store

All state changes emit domain events to an append-only event collection:

```typescript
interface DomainEvent {
  eventId: string
  aggregateId: string       // e.g., booking ID
  aggregateType: string     // e.g., "Booking"
  eventType: string         // e.g., "BookingCreated"
  payload: Record<string, unknown>
  metadata: {
    userId: string
    agencyId: string
    timestamp: Date
    correlationId: string
  }
  version: number           // optimistic concurrency
}
```

**Event types per domain:**

| Domain | Events |
|--------|--------|
| Booking | `BookingCreated`, `BookingConfirmed`, `BookingCancelled`, `BookingModified`, `CancellationPenaltyCalculated` |
| Hotel | `HotelSynced`, `AvailabilitySearched`, `RatesCached` |
| Travel Agency | `AgencyCreated`, `AgencyUpdated`, `VendorAccessGranted`, `VendorAccessRevoked` |
| Sales Agent | `AgentCreated`, `AgentAssignedToAgency`, `AgentMetricsUpdated` |
| Payment | `PaymentProcessed`, `PaymentRefunded`, `PaymentFailed` |
| Transportation | `TransferBooked`, `TransferCancelled`, `TransferAmended` |

**Storage:** Dedicated MongoDB collection `events` in the backoffice database. Indexed on `aggregateId + version` (unique) and `eventType + timestamp`.

#### 3. Query Side (Read Path)

**Projections** — background materializers that listen to events and build optimized read models:

```typescript
// projections/booking-list.projection.ts
class BookingListProjection {
  // Listens to: BookingCreated, BookingConfirmed, BookingCancelled

  async onBookingCreated(event: BookingCreatedEvent) {
    await this.readDb.collection("booking_list_view").insertOne({
      bookingId: event.aggregateId,
      locator: event.payload.locator,
      vendorLocator: event.payload.vendorLocator,
      agencyName: event.payload.agencyName,   // denormalized
      guestName: event.payload.guestName,      // denormalized
      hotelName: event.payload.hotelName,      // denormalized
      checkIn: event.payload.checkIn,
      checkOut: event.payload.checkOut,
      status: "confirmed",
      totalAmount: event.payload.totalAmount,
      currency: event.payload.currency,
      vendor: event.payload.vendor,
      createdAt: event.metadata.timestamp,
    })
  }
}
```

**Read models per UI view:**

| Read Model | Serves | Denormalized Fields |
|------------|--------|-------------------|
| `booking_list_view` | Booking list page, search | Agency name, guest name, hotel name, status |
| `booking_detail_view` | Booking detail page | Full guest details, room details, cancellation policy, vendor response |
| `agency_dashboard_view` | Agency dashboard | Booking count, revenue, recent bookings |
| `analytics_daily_view` | Analytics dashboard | Pre-aggregated daily booking/revenue/cancellation stats |
| `hotel_search_cache` | Hotel search results | Already exists (Redis), formalize as read model |

**Query services** become thin layers that read from these materialized views — no business logic, no cross-database joins:

```typescript
// queries/booking/booking-list.query.ts
class BookingListQuery {
  async execute(filters: BookingListFilters): Promise<BookingListView[]> {
    return this.readDb.collection("booking_list_view")
      .find(buildMongoFilter(filters))
      .sort({ createdAt: -1 })
      .limit(filters.pageSize)
      .skip(filters.page * filters.pageSize)
      .toArray()
  }
}
```

#### 4. Domain Folder Structure (Target)

```
src/
├── commands/
│   ├── booking/
│   │   ├── book-room.command.ts
│   │   ├── book-room.handler.ts
│   │   ├── cancel-booking.command.ts
│   │   ├── cancel-booking.handler.ts
│   │   ├── confirm-booking.command.ts
│   │   ├── confirm-booking.handler.ts
│   │   └── book-multi-room.handler.ts
│   ├── travel-agency/
│   ├── sales-agent/
│   ├── payment/
│   └── transportation/
├── queries/
│   ├── booking/
│   │   ├── booking-list.query.ts
│   │   ├── booking-detail.query.ts
│   │   └── cancellation-info.query.ts
│   ├── hotel/
│   │   ├── hotel-search.query.ts
│   │   └── availability-summary.query.ts
│   ├── analytics/
│   └── travel-agency/
├── events/
│   ├── event-store.ts
│   ├── event-bus.ts              # in-process pub/sub (initially)
│   └── domain-events.ts          # all event type definitions
├── projections/
│   ├── booking-list.projection.ts
│   ├── booking-detail.projection.ts
│   ├── agency-dashboard.projection.ts
│   └── analytics-daily.projection.ts
├── shared/
│   └── adapters/                  # unchanged — Dingus, Hotetec, Roibos, Restel
└── routes/                        # thin HTTP layer dispatching to commands/queries
```

---

## Migration Strategy

### Phase 1: Event Infrastructure (Non-Breaking)

- Add event store collection and `DomainEvent` types
- Add `EventBus` (in-process, using Node.js `EventEmitter`)
- Existing services emit events **after** existing write operations (dual-write)
- No read-side changes yet

### Phase 2: Read Model Projections

- Build projections that materialize read models from events
- Backfill read models from existing data (one-time migration script)
- New query endpoints read from materialized views
- Old query endpoints still work (gradual cutover)

### Phase 3: Command Handlers

- Extract write logic from services into command handlers
- Services become thin dispatchers
- Routes dispatch commands directly

### Phase 4: Retire Legacy Paths

- Remove old query paths once all consumers use read models
- Remove dual-write once projections are the source of truth for reads

---

## Consequences

### Positive

- **Clear separation of concerns.** Write-side complexity (multi-phase GDS booking, rollback, retry) is isolated from read-side simplicity.
- **Optimized reads.** Denormalized read models eliminate cross-database joins. Agency name, guest name, hotel name are pre-joined at write time.
- **Event history.** Full audit trail of every state change. Enables replay, debugging, and compliance.
- **Analytics from events, not queries.** Pre-aggregated daily stats instead of expensive aggregation pipelines at read time.
- **Scalability path.** Read and write sides can scale independently. Read models can be cached aggressively.
- **Testability.** Command handlers are pure business logic with explicit inputs/outputs. Projections are deterministic event → state transformers.

### Negative

- **Eventual consistency.** Read models may lag behind writes. UI must handle "just booked but not yet in list" scenarios (optimistic updates or polling).
- **Increased complexity.** More files, more concepts (commands, events, projections, read models). Higher onboarding cost for new developers.
- **Dual-write risk during migration.** Events and direct writes must stay in sync during Phases 1-3.
- **No immediate performance gain.** The current system works. This is an investment in maintainability and future scale.

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Eventual consistency confuses users | Optimistic UI updates; polling on booking confirmation page |
| Event schema evolution breaks projections | Version events from day one; projection replay capability |
| Migration introduces data inconsistency | Backfill script with verification; run old and new paths in parallel |
| Team unfamiliarity with CQRS | Phase 1 is additive (just events), easing the learning curve |

---

## Alternatives Considered

### 1. Keep Current Architecture + Optimize Queries

Add indexes, denormalize within existing Mongoose schemas, add Redis caching for hot paths.

**Rejected because:** Addresses symptoms, not root cause. Read and write complexity will continue to grow together. No event history.

### 2. Full Event Sourcing

Derive all state from events (no separate write model). Aggregate state reconstructed by replaying events.

**Rejected because:** Too large a leap for the current team size and codebase maturity. CQRS without full event sourcing captures 80% of the benefit with 40% of the complexity. Can evolve toward event sourcing later if needed.

### 3. Microservice Decomposition

Split each domain into its own service with its own database.

**Rejected because:** Premature. The monolith with domain folders is working well architecturally (scored 80/100). Network boundaries add latency and operational complexity the team can't absorb yet. CQRS within the monolith is a stepping stone — domains with clear command/query separation are easier to extract later.

---

## References

- [6-RESERVATION_SYSTEM_MULTI_GDS_ANALYSIS.md](../6-RESERVATION_SYSTEM_MULTI_GDS_ANALYSIS.md) — Current booking architecture
- [4-PRODUCTION_READINESS_BACKEND_SERVICE.md](../4-PRODUCTION_READINESS_BACKEND_SERVICE.md) — Code quality assessment
- Martin Fowler — [CQRS](https://martinfowler.com/bliki/CQRS.html)
- Greg Young — [CQRS Documents](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)
