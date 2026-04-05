# Ergos Continental — API Architecture & Integration Infrastructure

## Table of Contents

- [C4 Architecture Diagrams](#c4-architecture-diagrams)
  - [Level 1 — System Context](#level-1--system-context)
  - [Level 2 — Container](#level-2--container)
  - [Level 3 — Component (API Server)](#level-3--component-api-server)
  - [Level 4 — Integration Sequence](#level-4--integration-sequence)
- [API Management Infrastructure](#api-management-infrastructure)
  - [Current State](#current-state)
  - [API Gateway Options](#api-gateway-options)
  - [Primary: Istio Gateway](#primary-istio-gateway)
  - [Alternative: Alibaba Cloud API Gateway](#alternative-alibaba-cloud-api-gateway)
  - [Alternative: GCP Apigee](#alternative-gcp-apigee)
  - [Alternative: AWS API Gateway](#alternative-aws-api-gateway)
  - [What Stays in Express Regardless of Gateway Choice](#what-stays-in-express-regardless-of-gateway-choice)
- [Developer Portal](#developer-portal)
- [API Key Lifecycle](#api-key-lifecycle)
- [Monitoring & Observability](#monitoring--observability)
- [Security Hardening](#security-hardening)

---

## C4 Architecture Diagrams

### Level 1 — System Context

Who interacts with Ergos Continental, and how.

```mermaid
graph TB
    subgraph users [" Users "]
        admin["🔧 Backoffice Admin\nManages hotels, bookings,\nagencies, and API keys"]
        agency["🏢 Travel Agency\nBooks hotels via\nweb app or API"]
        ota["🌐 OTAs & Booking Platforms\nThird-party consumers\nintegrating via API key"]
    end

    ergos["⚡ ERGOS CONTINENTAL\nGDS aggregator platform — unified API\nfor hotel search, availability, and booking\nacross multiple suppliers"]

    subgraph gds [" GDS Suppliers "]
        hotetec["Hotetec\nREST / JSON"]
        dingus["Dingus\nSOAP / XML · OTA schema\n7 sub-vendors"]
        roibos["Roibos / Juniper\nSOAP / XML · Juniper API"]
    end

    tropipay["💳 TropiPay\nPayment gateway"]

    admin -- "JWT / Backoffice UI" --> ergos
    agency -- "JWT / Agency Portal" --> ergos
    ota -- "X-API-Key / REST" --> ergos

    ergos -- "Search, Book, Cancel\nREST/JSON" --> hotetec
    ergos -- "Search, Book, Modify, Cancel\nSOAP/XML" --> dingus
    ergos -- "Search, Book, Cancel\nSOAP/XML" --> roibos
    ergos -- "Create payment\nCheck status" --> tropipay

    style admin fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style agency fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style ota fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style ergos fill:#1a1a4e,stroke:#0d9488,color:#fff,stroke-width:3px
    style hotetec fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style dingus fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style roibos fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style tropipay fill:#4a1d6e,stroke:#a855f7,color:#fff,stroke-width:2px
    style users fill:transparent,stroke:#3b82f6,color:#93c5fd,stroke-width:1px,stroke-dasharray:5 5
    style gds fill:transparent,stroke:#ea580c,color:#fdba74,stroke-width:1px,stroke-dasharray:5 5
```

### Level 2 — Container

What runs inside Ergos Continental.

```mermaid
graph TB
    admin["🔧 Backoffice Admin"]
    agency["🏢 Travel Agency"]
    consumer["🌐 API Consumer · OTA"]

    subgraph ergos [" Ergos Continental "]
        istio["🛡️ Istio Gateway\nEnvoy Proxy\nTLS termination · ingress routing\nrate limiting · planned"]
        api["⚡ Express API Server\nNode.js / Bun\nHotels · Bookings · Payments\nAPI key management"]
        swagger["📖 Swagger UI\nswagger-ui-express\n/docs/ · OpenAPI 3.1.0"]
        bullmq["⚙️ BullMQ Workers\nNode.js / Bun\nHotel sync · concurrency: 1\nretries: 3"]

        backoffice_db[("🗄️ Backoffice DB\nMongoDB\nUsers · Roles · API keys")]
        salesagent_db[("🗄️ Sales Agent DB\nMongoDB\nSales agent data")]
        travelagency_db[("🗄️ Travel Agency DB\nMongoDB\nAgencies · Bookings\nHotel inventory")]
        redis[("⚡ Redis 7\nRate limit counters\n60s TTL per key\nBullMQ queue backend")]
    end

    hotetec["Hotetec GDS"]
    dingus["Dingus GDS"]
    roibos["Roibos / Juniper GDS"]
    tropipay["💳 TropiPay"]

    admin -- "HTTPS · JWT" --> istio
    agency -- "HTTPS · JWT" --> istio
    consumer -- "HTTPS · X-API-Key" --> istio
    istio -- "HTTP internal" --> api

    api -. "Mounts /docs/" .-> swagger
    api -- "Mongoose" --> backoffice_db
    api -- "Mongoose" --> salesagent_db
    api -- "Mongoose" --> travelagency_db
    api -- "ioredis · INCR + queue" --> redis
    bullmq -- "Consumes jobs" --> redis
    bullmq -- "Writes hotel data" --> travelagency_db

    api -- "REST/JSON" --> hotetec
    api -- "SOAP/XML" --> dingus
    api -- "SOAP/XML" --> roibos
    api -- "REST/JSON" --> tropipay

    style admin fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style agency fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style consumer fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px

    style istio fill:#0d9488,stroke:#5eead4,color:#fff,stroke-width:2px
    style api fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style swagger fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style bullmq fill:#4a1d6e,stroke:#a855f7,color:#fff,stroke-width:2px

    style backoffice_db fill:#065f46,stroke:#34d399,color:#fff,stroke-width:2px
    style salesagent_db fill:#065f46,stroke:#34d399,color:#fff,stroke-width:2px
    style travelagency_db fill:#065f46,stroke:#34d399,color:#fff,stroke-width:2px
    style redis fill:#92400e,stroke:#fbbf24,color:#fff,stroke-width:2px

    style hotetec fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style dingus fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style roibos fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style tropipay fill:#4a1d6e,stroke:#a855f7,color:#fff,stroke-width:2px

    style ergos fill:#0f172a,stroke:#0d9488,color:#5eead4,stroke-width:2px
```

### Level 3 — Component (API Server)

Internal structure of the Express API server.

```mermaid
graph TB
    subgraph api [" Express API Server "]

        subgraph auth_layer [" Auth Layer "]
            dual_auth["🔀 Dual Auth Bridge\nauthenticateApiKeyOrJwt\nRoutes by header presence"]
            apikey_auth["🔑 API Key Middleware\napi-key.middleware.ts\nSHA256 hash lookup\nLRU cache · 100 keys · 5min TTL"]
            jwt_auth["🔐 JWT Middleware\nauth.middleware.ts\nBearer token validation\nRole-based access · LRU 10"]
            rate_limiter["⏱️ Rate Limiter\nRedis-backed\nBASIC 60 · PRO 300 · ENT 1000\nFail-open on Redis failure"]
        end

        subgraph route_layer [" Route Layer "]
            public_routes["📡 Public Routes\n/hotels/* · /bookings/*\n/payments/*"]
            admin_routes["🔧 Admin Routes\n/backoffice/* · /salesagent/*\n/travelagency/* · /api-keys/*"]
            swagger_route["📖 Swagger Route\n/docs/ · no auth"]
        end

        subgraph service_layer [" Domain Services "]
            hotel_svc["🏨 Hotel Service\nSearch · Detail\nAvailability"]
            booking_svc["📋 Booking Service\nCreate · Confirm · Complete\nCancel · Modify · Multi-room"]
            payment_svc["💳 Payment Service\nTropiPay integration"]
            apikey_svc["🔑 API Key Service\nCreate · List · Revoke\nRegenerate · Tier mgmt"]
        end

        subgraph adapter_layer [" Adapter Layer "]
            adapter_factory["🏭 Adapter Factory\nVENDOR_REGISTRY\n9 vendors → 3 adapters"]
            hotetec_adapter["Hotetec Adapter\nREST/JSON\n3-step: book → complete → confirm"]
            dingus_adapter["Dingus Adapter\nSOAP/XML · OTA\n2-step: simulate → commit\n7 sub-vendors"]
            roibos_adapter["Roibos Adapter\nSOAP/XML · Juniper\n1-step · auto-confirmed"]
        end
    end

    redis[("⚡ Redis")]
    mongo[("🗄️ MongoDB\n3 databases")]

    dual_auth -- "X-API-Key present" --> apikey_auth
    dual_auth -- "No X-API-Key" --> jwt_auth
    apikey_auth --> rate_limiter

    public_routes --> hotel_svc
    public_routes --> booking_svc
    public_routes --> payment_svc
    admin_routes --> apikey_svc

    hotel_svc -- "getAdapter(vendor)" --> adapter_factory
    booking_svc -- "getAdapter(vendor)" --> adapter_factory
    adapter_factory --> hotetec_adapter
    adapter_factory --> dingus_adapter
    adapter_factory --> roibos_adapter

    rate_limiter -- "INCR + EXPIRE" --> redis
    apikey_auth -- "Hash lookup\nLRU cached" --> mongo

    style dual_auth fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style apikey_auth fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style jwt_auth fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style rate_limiter fill:#92400e,stroke:#fbbf24,color:#fff,stroke-width:2px

    style public_routes fill:#0d9488,stroke:#5eead4,color:#fff,stroke-width:2px
    style admin_routes fill:#0d9488,stroke:#5eead4,color:#fff,stroke-width:2px
    style swagger_route fill:#0d9488,stroke:#5eead4,color:#fff,stroke-width:2px

    style hotel_svc fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style booking_svc fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style payment_svc fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style apikey_svc fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px

    style adapter_factory fill:#4a1d6e,stroke:#a855f7,color:#fff,stroke-width:2px
    style hotetec_adapter fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style dingus_adapter fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px
    style roibos_adapter fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:2px

    style redis fill:#92400e,stroke:#fbbf24,color:#fff,stroke-width:2px
    style mongo fill:#065f46,stroke:#34d399,color:#fff,stroke-width:2px

    style api fill:#0f172a,stroke:#0d9488,color:#5eead4,stroke-width:2px
    style auth_layer fill:#0f172a88,stroke:#3b82f6,color:#93c5fd,stroke-width:1px,stroke-dasharray:5 5
    style route_layer fill:#0f172a88,stroke:#5eead4,color:#5eead4,stroke-width:1px,stroke-dasharray:5 5
    style service_layer fill:#0f172a88,stroke:#818cf8,color:#a5b4fc,stroke-width:1px,stroke-dasharray:5 5
    style adapter_layer fill:#0f172a88,stroke:#ea580c,color:#fdba74,stroke-width:1px,stroke-dasharray:5 5
```

### Level 4 — Integration Sequence

Full API call flow: third-party consumer searches for hotels and books a room.

```mermaid
sequenceDiagram
    box rgb(30, 58, 95) External
        participant Consumer as 🌐 API Consumer (OTA)
    end
    box rgb(13, 148, 136) Edge Layer
        participant Istio as 🛡️ Istio Gateway
    end
    box rgb(26, 26, 78) Application Layer
        participant Auth as 🔑 API Key Middleware
        participant RL as ⏱️ Rate Limiter
        participant Router as 📡 Express Router
        participant Service as 🏨 Hotel / Booking Service
        participant Factory as 🏭 Adapter Factory
    end
    box rgb(124, 45, 18) GDS Supplier
        participant GDS as ⚡ GDS Supplier
    end

    Note over Consumer, GDS: 1. Hotel Search

    Consumer->>Istio: GET /hotels/search<br/>X-API-Key: eca_live_abc123<br/>x-vendor: hotetec · x-provider: hotetec
    Istio->>Auth: Forward (TLS terminated)
    Auth->>Auth: SHA256 hash key<br/>LRU cache check (100 keys, 5min TTL)<br/>DB lookup if cache miss<br/>Validate: active, not expired
    Auth->>RL: Check tier limit
    RL->>RL: Redis INCR ratelimit:{keyId}<br/>Compare vs tier (60/300/1000 req/min)
    RL-->>Auth: 429 if exceeded · Set X-RateLimit-* headers
    Auth->>Router: Attach agency context
    Router->>Service: hotel.search(params)
    Service->>Factory: getAdapter("hotetec")
    Factory->>GDS: REST/JSON search request
    GDS-->>Factory: Hotel list response
    Factory-->>Service: Normalized hotels
    Service-->>Consumer: 200 { hotels: [...] }

    Note over Consumer, GDS: 2. Check Availability

    Consumer->>Istio: POST /hotels/availability/{id}<br/>X-API-Key: eca_live_abc123
    Istio->>Auth: Forward
    Auth->>RL: Rate limit check
    RL-->>Auth: OK
    Auth->>Router: Forward
    Router->>Service: hotel.availability(id, dates)
    Service->>Factory: getAdapter("hotetec")
    Factory->>GDS: Availability request
    GDS-->>Factory: Room rates
    Factory-->>Consumer: 200 { rooms: [...] }

    Note over Consumer, GDS: 3. Book Room (Hotetec 3-step flow)

    Consumer->>Auth: POST /bookings · { hotelId, roomId, guests }
    Auth->>RL: Rate limit check
    Auth->>Router: Forward
    Router->>Service: booking.create(data)
    Service->>Factory: getAdapter("hotetec")
    Factory->>GDS: Book room (step 1)
    GDS-->>Factory: Booking created (PENDING)
    Factory-->>Consumer: 201 { bookingId, status: "PENDING" }

    Consumer->>Auth: PUT /bookings/{id}/complete · { guestDetails }
    Auth->>Router: Forward
    Router->>Service: booking.complete(id, guests)
    Service->>Factory: Complete booking (step 2)
    GDS-->>Consumer: 200 { status: "AWAITING_CONFIRMATION" }

    Consumer->>Auth: PUT /bookings/{id}/confirm
    Auth->>Router: Forward
    Router->>Service: booking.confirm(id)
    Service->>Factory: Confirm booking (step 3)
    GDS-->>Consumer: 200 { status: "CONFIRMED", locator: "HTX-12345" }
```

#### Vendor-to-Adapter Mapping

```mermaid
graph LR
    subgraph vendors [" 9 Vendors "]
        V1["🏨 hotetec"]
        V2["🏨 dingus"]
        V3["🏨 roxa"]
        V4["🏨 melia"]
        V5["🏨 archipelago"]
        V6["🏨 muthu"]
        V7["🏨 iberostar"]
        V8["🏨 barceló"]
        V9["🏨 roibos"]
    end

    subgraph adapters [" 3 Adapters "]
        A1["⚡ HotetecAdapter\nREST / JSON\n3-step booking"]
        A2["⚡ DingusAdapter\nSOAP / XML · OTA\n2-step booking"]
        A3["⚡ RoibosAdapter\nSOAP / XML · Juniper\n1-step booking"]
    end

    V1 --> A1
    V2 --> A2
    V3 --> A2
    V4 --> A2
    V5 --> A2
    V6 --> A2
    V7 --> A2
    V8 --> A2
    V9 --> A3

    style V1 fill:#1e3a5f,stroke:#3b82f6,color:#fff,stroke-width:2px
    style V2 fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style V3 fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style V4 fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style V5 fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style V6 fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style V7 fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style V8 fill:#1a1a4e,stroke:#818cf8,color:#fff,stroke-width:2px
    style V9 fill:#92400e,stroke:#fbbf24,color:#fff,stroke-width:2px

    style A1 fill:#0d9488,stroke:#5eead4,color:#fff,stroke-width:3px
    style A2 fill:#4a1d6e,stroke:#a855f7,color:#fff,stroke-width:3px
    style A3 fill:#7c2d12,stroke:#ea580c,color:#fff,stroke-width:3px

    style vendors fill:#0f172a,stroke:#818cf8,color:#a5b4fc,stroke-width:1px,stroke-dasharray:5 5
    style adapters fill:#0f172a,stroke:#0d9488,color:#5eead4,stroke-width:1px,stroke-dasharray:5 5
```

---

## API Management Infrastructure

### Current State

What is deployed and running today.

| Component | Implementation | Details |
|-----------|---------------|---------|
| API key format | `eca_live_` prefix + 32 random hex bytes | Single prefix today — environment scoping pending provider environment config |
| Key storage | SHA256 hash in MongoDB | `crypto.createHash("sha256").update(rawKey).digest("hex")` |
| Key tiers | BASIC, PROFESSIONAL, ENTERPRISE | Default: BASIC |
| Rate limiting | Redis counters | Fixed 60s window per API key ID, fail-open on Redis failure |
| Rate limit headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` | Sent on every authenticated response |
| LRU cache | 100 keys, 5min TTL | In-memory API key lookup cache in `api-key.middleware.ts` |
| Vendor access | Whitelist model | Per-agency allowed vendor list, LRU cache (10 entries) in `auth.middleware.ts` |
| API docs | Swagger UI + OpenAPI 3.1.0 | `/docs/` (interactive), `/docs/spec.json` (raw spec for SDK generation) |
| General cache | node-cache (in-process) | `stdTTL: 300` (5min), `checkperiod: 60` — NOT Redis-backed |

#### Rate Limit Tiers

| Tier | Requests / Minute | Use Case |
|------|-------------------|----------|
| **BASIC** | 60 | Default tier, small agencies |
| **PROFESSIONAL** | 300 | Medium-volume consumers |
| **ENTERPRISE** | 1,000 | High-volume OTAs and platforms |

---

### API Gateway Options

Comparison of gateway solutions for Ergos Continental's infrastructure.

| | **Istio Gateway** (Recommended) | **Alibaba Cloud API Gateway** | **GCP Apigee** | **AWS API Gateway** |
|---|---|---|---|---|
| **Fits current infra** | Already on Alibaba K8s | Native to Alibaba Cloud | Requires GCP | Requires AWS (have ECR only) |
| **Rate limiting** | Envoy filters + Rate Limit Service | Built-in per-app/API | Built-in per-product | Built-in per-key |
| **Developer portal** | DIY (current Swagger UI) | Built-in API marketplace | Built-in managed portal | None (separate build) |
| **API key management** | Custom (current Express code) | Built-in app/key model | Built-in key/app/product | Built-in usage plans |
| **Analytics** | Prometheus + Grafana (deployed) | Built-in dashboard | Built-in analytics | CloudWatch |
| **Cost** | Free (already running) | ~$0.30 / million requests | ~$500+ / month | ~$3.50 / million requests |
| **Vendor lock-in** | None | Medium (Alibaba) | High (GCP) | High (AWS) |
| **Multi-cloud** | Yes | No | No | No |

---

### Primary: Istio Gateway

Recommended path — moves edge concerns (TLS, routing, rate limiting) to the service mesh layer already deployed on Alibaba K8s.

**Gateway resource** — TLS termination, host-based routing:
- `api.lukzen-op.com` → API server
- `test-api.lukzen-op.com` → Sandbox API server

**VirtualService** — Path routing, traffic splitting, retries, timeouts:
- Retry policy: 2 retries on 5xx from GDS adapters
- Timeout: 30s for GDS-proxied endpoints

**EnvoyFilter / Rate Limit Service** — Replaces Redis rate limiting in `api-key.middleware.ts`:
- Per-API-key rate limiting at the mesh edge
- Tier-aware limits: BASIC 60/min, PROFESSIONAL 300/min, ENTERPRISE 1000/min
- Redis rate limit counters in Express middleware removed
- API key tier resolved via descriptor headers set by Express

**AuthorizationPolicy** — Access control:
- IP whitelisting per consumer
- Deny-by-default for internal admin endpoints (`/backoffice/*`, `/salesagent/*`)

**DestinationRule** — Circuit breaking for upstream GDS calls:
- Max connections, pending requests, retries per GDS adapter
- Outlier detection: consecutive 5xx errors trigger ejection

**PeerAuthentication** — mTLS between services:
- Strict mode for all services in the mesh
- Optional mTLS for high-value partner connections

---

### Alternative: Alibaba Cloud API Gateway

Native to the current infrastructure. Best fit if:

- API marketplace for consumer onboarding is a priority
- Built-in API key management reduces custom code
- Low cost (~$0.30/million requests) is acceptable

Trade-off: medium vendor lock-in to Alibaba Cloud.

---

### Alternative: GCP Apigee

Best fit if:

- Managed developer portal + API product management justifies the ~$500+/mo cost
- Full API lifecycle management (versioning, deprecation, monetization) is needed
- Moving to GCP is on the roadmap

Trade-off: high vendor lock-in, requires GCP infrastructure.

---

### Alternative: AWS API Gateway

Best fit if:

- Migrating to AWS (currently only use ECR for container images)
- Need managed usage plans without GCP dependency
- WebSocket support needed for real-time features

Trade-off: high vendor lock-in, no built-in developer portal.

---

### What Stays in Express Regardless of Gateway Choice

These concerns remain in the application layer no matter which gateway is deployed:

| Concern | Why it stays | File |
|---------|-------------|------|
| API key validation | SHA256 hash lookup, tier resolution, active/expired checks, agency context | `api-key.middleware.ts` |
| API key LRU cache | 100-key in-memory cache for DB lookup performance | `api-key.middleware.ts` |
| Vendor access control | Per-agency whitelist logic, business rules | `auth.middleware.ts` |
| JWT authentication | Internal admin auth, role-based access | `auth.middleware.ts` |
| BullMQ job queues | Hotel sync workers (Redis as queue backend, not API management) | `sync-queue.service.ts` |
| node-cache | In-process general caching (stdTTL: 300s) | `cache.service.ts` |

---

## Developer Portal

### Current

- Swagger UI at `/docs/` — interactive API explorer
- OpenAPI 3.1.0 spec at `/docs/spec.json` — for SDK generation, Postman import
- 25 documented endpoints across 6 tags

### Planned

- **Self-service onboarding**: Consumer signs up → receives API key → explores docs
- **SDK downloads**: Auto-generated via OpenAPI codegen (TypeScript, Python, Java, PHP)
- **Usage dashboards**: Per-consumer request volume, error rates, latency
- **Sandbox environment**: `test-api.lukzen-op.com` with test data (no real GDS charges)
- **Rate limit visibility**: Consumers see their current tier, usage, and remaining quota

---

## API Key Lifecycle

### Current Implementation

```
eca_live_<64-char hex>   →   All keys use this single prefix today
```

- Format: `eca_live_` + `crypto.randomBytes(32).toString("hex")` (defined in `api-key.repository.ts`)
- Keys are SHA256-hashed before storage — raw key shown only at creation
- `keyPrefix` (first 16 chars) stored alongside hash for identification in UI
- 3 tiers: BASIC (default), PROFESSIONAL, ENTERPRISE
- Keys can be revoked and regenerated via admin API (`/api-keys/*`)

> **Note:** Environment-scoped keys (`eca_test_*` vs `eca_live_*`) are not yet implemented.
> The test vs production boundary varies by GDS provider — Hotetec, Dingus, and Roibos
> each handle test/prod environments differently (separate endpoints, separate credentials,
> or flag-based). Environment scoping for API keys will be designed once provider
> environment configuration is finalized.

### Planned Enhancements

| Feature | Description |
|---------|-------------|
| **Environment-scoped keys** | `eca_test_*` vs `eca_live_*` prefix — blocked on provider environment config alignment |
| **Key rotation** | Grace period where old and new keys both work during rotation window |
| **Webhook notifications** | Notify consumers on key events (approaching expiry, rate limit warnings) |
| **Read-only scoping** | `hotel-read` scope vs `full-booking` scope per key |
| **IP binding** | Optional IP allowlist per API key |
| **Expiry policies** | Auto-expire keys after configurable period, renewal flow |

---

## Monitoring & Observability

### Current

| Tool | Purpose | Status |
|------|---------|--------|
| Redis rate limit counters | Per-key request tracking | Deployed |
| `X-RateLimit-*` headers | Consumer-visible rate info | Deployed |
| Express request logging | Request/response logging | Deployed |

### Planned (with Istio)

| Tool | Purpose |
|------|---------|
| **Istio telemetry** | Per-consumer metrics, per-GDS health, request volume |
| **Jaeger** | Distributed tracing: Consumer → API → Adapter → GDS |
| **Grafana + Kiali** | Dashboards for API health, service mesh topology |
| **Prometheus** | Metrics collection, alerting rules |
| **Alerting** | Rate limit breaches, GDS failures (consecutive 5xx), error rate spikes |

### Key Metrics to Track

- **Per consumer**: Request volume, error rate, latency P50/P95/P99, rate limit hits
- **Per GDS supplier**: Availability, response time, error rate, timeout frequency
- **Per endpoint**: Request volume, error distribution, payload sizes
- **System**: Redis memory, MongoDB connections, BullMQ queue depth

---

## Security Hardening

### Current

| Measure | Status |
|---------|--------|
| SHA256 key hashing | Deployed |
| JWT + API Key dual auth | Deployed |
| Vendor access whitelist | Deployed |
| Rate limiting (per-key, tier-aware) | Deployed |
| Fail-open on Redis down | Deployed (trade-off: availability over strict limiting) |

### Planned

| Measure | Description |
|---------|-------------|
| **CORS origin whitelisting** | Restrict API access to registered origins |
| **mTLS for partners** | Mutual TLS for high-value/enterprise consumers |
| **Request signing** | HMAC signing for webhook payloads |
| **API key scoping** | Granular permissions: `hotel-read`, `booking-write`, `full-access` |
| **IP allowlisting** | Per-API-key IP restrictions |
| **Istio AuthorizationPolicy** | Deny-by-default for internal endpoints at mesh level |
| **Audit logging** | Track all API key operations, admin actions |
