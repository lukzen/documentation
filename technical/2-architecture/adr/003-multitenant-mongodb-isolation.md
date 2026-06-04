# ADR-003: Multi-Tenant MongoDB — Shared-Cluster Breakpoint and Migration Trigger to Per-Agency Isolation

**Status:** Proposed
**Date:** 2026-06-04
**Authors:** Ergos Continental Engineering
**Deciders:** Lukasz, Mayank

---

## Context

The v1.0 production plan (`alibaba-infra/PRODUCTION_READINESS.md` item **#9**, item **#7**, item **#10**) commits to per-agency physical isolation: each travel agency gets its own vcluster containing its own `agency-app`, `backend-service`, **and its own MongoDB instance** (Bitnami chart on `alicloud-disk-essd`). This is operationally simple to reason about (blast radius = one tenant), but it scales linearly in cost (one `mongod` per tenant), in operational burden (one PVC, one backup schedule, one upgrade window per tenant), and in baseline RAM (every tenant pays for its own WiredTiger cache floor regardless of activity).

A second option has been proposed:

- **Option A — Per-agency MongoDB** (the current PRODUCTION_READINESS plan). Physical isolation. One `mongod` per vcluster.
- **Option B — Shared cluster, database-per-tenant**. ONE MongoDB cluster runs:
  - **Per-agency databases** (`acme_bookings`, `acme_users`, `globex_bookings`, ...) holding all tenant-owned collections — bookings, audit logs, transportation, employees, API keys, etc.
  - **One shared `platform` database** holding GDS-sourced and back-office reference data common to all agencies — `platform.hotels` (~100k docs), `platform.commission_chains`, `platform.vendor_registry`, `platform.markup_rules`, `platform.commission_defaults`, `platform.scan_history`.

The question this ADR answers: **at what agency count does Option B break down and force migration to Option A?** The answer is grounded in (a) the actual Mongoose schemas in `backend-service/src/domains/*/models/`, (b) MongoDB's documented hard limits and Atlas tier ceilings, and (c) realistic agency-activity assumptions.

This ADR does NOT recommend abandoning Option A. It establishes a numbers-based decision rule for **when** Option B (which is materially cheaper at small N) ceases to be safe.

Related references:
- `alibaba-infra/PRODUCTION_READINESS.md` item #9 (per-agency MongoDB), item #7 (vcluster per agency), item #10 (HA scaling)
- `documentation/_user_stories_pending/USER_STORIES.md`
- ADR-001 (CQRS) — the read/write split that lets bookings live on a different cluster than read projections, if/when isolated
- ADR-002 (POI provider) — establishes the `~100k hotels` catalog size that drives the shared-database calculus

---

## Operating assumptions

Stated explicitly so the math is auditable. Override any number and the breakpoint recomputes.

| # | Assumption | Value | Source / note |
|---|---|---|---|
| A1 | Hotels catalog size (shared, all agencies) | **100,000 docs** | User memory note; combined Hotetec + Dingus + Restel + Juniper coverage |
| A2 | Avg bookings / agency / year — median | **500** | User-supplied |
| A3 | Avg bookings / agency / year — P90 | **5,000** | User-supplied |
| A4 | Avg bookings / agency / year — top decile | **20,000** | User-supplied |
| A5 | Active agency mix at scale | 70% median, 25% P90, 5% top decile | Heuristic, sensitised below |
| A6 | Audit log entries per booking | **2** (create + status change) | User-supplied |
| A7 | Sales agents per agency — avg / P90 | **5 + 2 admin / 30** | User-supplied |
| A8 | Hotels working-set fraction | **70% warm** (queried ≥ once/week) | User-supplied |
| A9 | Mongoose connection pool — default | **5 connections per replica** | Mongoose default `maxPoolSize` |
| A10 | Backend-service replicas / agency (Option A) | **2 pods** avg | PRODUCTION_READINESS #10 |
| A11 | Backend-service shared pool (Option B) | scales with platform, not N agencies | One pool, multiple databases — Mongoose `useDb()` reuses the connection |
| A12 | Booking retention (Option B) | **3 years live**, then archive to cold storage | Assumption — needs ratification |
| A13 | Data growth horizon for the table below | **3 years cumulative** | Storage cells are end-of-year-3 totals |

---

## Schema-driven document sizing (honest estimates)

These are inspection-based estimates from reading every Mongoose model under `backend-service/src/domains/*/models/`. **Not measured** — we should validate with `db.collection.stats()` against a representative sample once production data exists. Where I'm uncertain I give a range and use the midpoint.

| Model | File | Fields | Notable nested arrays | Indexes | Est. doc size (BSON on-disk) |
|---|---|---|---|---|---|
| `bookings` | `booking/models/booking.model.ts` | ~30 scalars + 6 nested sub-schemas | `guests[]`, `cancellationPolicy.policies[]`, `vendorResponse` (Mixed — wild card, Restel responses can be 2-5 KB) | **14** (8 simple + 6 compound) | **8–18 KB, midpoint 10 KB**; index entries add ~1.1 KB → **budget 14 KB live** |
| `booking_audit_logs` | `booking/models/booking-audit-log.model.ts` | 12 fields | `vendorRequest`, `vendorResponse`, `metadata` all Mixed | 4 | **3–12 KB, midpoint 5 KB** (the Mixed vendor payloads dominate) |
| `transportation_bookings` | `transportation/models/transportation-booking.model.ts` | 16 + 8 nested sub-schemas | `cancellation.policy[]` | 5 | **2–5 KB, midpoint 3 KB** |
| `hotels` | `hotel/models/hotel.model.ts` | ~25 fields | `roomTypes[]` (3-15), `rates[]`, `thematics[]`, `amenities[]`, `facilities[]`, `galleryImgs[]` (5-20 URLs), `listingCategory` Map | **11** (incl. text index on name+address+city, 2dsphere on location, unique compound) | **6–20 KB, midpoint 12 KB**; indexes are heavy (text+geo) → **~20 KB total with index overhead** |
| `agencies` | `travel-agency/models/travel-agency.schemas.ts` | 20 fields | none | none declared | **1–4 KB, midpoint 2 KB** |
| `employees` | same file | 8 fields | none | (`email` unique) | **<1 KB, ~0.5 KB** |
| `commissions` (agency↔hotel overrides) | same file | 3 fields | none | none | **<0.5 KB** |
| `sales_agents` | `sales-agent/models/sales-agent.model.ts` | 13 fields | none | (`email` unique) | **<1 KB** |
| `user_settings` | `user-settings/models/user-settings.model.ts` | 3 fields | none | 1 compound unique | **<0.5 KB** |
| `api_keys` | `api-keys/models/api-key.model.ts` | 8 fields | none | 3 | **<1 KB** |
| `invitations` | `invitation/models/invitation.model.ts` | 7 fields | none | 4 | **<1 KB** |
| `passkey_credentials` | `passkey/models/passkey.model.ts` | 9 fields (publicKey is base64) | none | 2 | **~1 KB** |
| `markup_rule` | `backoffice/models/markup-rule.model.ts` | 5 fields | none | 1 unique compound | **<0.5 KB** |
| `commission_audit` | `backoffice/models/commission-audit.model.ts` | 8 fields (`oldValue`/`newValue` Mixed) | none | 2 | **0.5–2 KB, midpoint 1 KB** |
| `commission_chain` | `backoffice/models/commission-chain.model.ts` | 11 fields | `matchPatterns[]`, `applicableVendors[]` | 2 | **~1.5 KB** |
| `commission_defaults` | `backoffice/models/commission-defaults.model.ts` | 5 fields | none | none | **<0.5 KB** (typically 1 doc) |
| `vendor_registry` | `backoffice/models/vendor-registry.model.ts` | 8 fields | none | 1 unique | **~1 KB** (typically <10 docs) |
| `scan_history` | `hotel/models/scan-history.model.ts` | 9 fields | `vendorResults[]` | 3 | **2–4 KB, midpoint 3 KB** |
| `backoffice_users` + `roles` | `backoffice/models/backoffice.model.ts` | small | none | (`email` unique) | **<1 KB** |

**Working budgets used downstream:**
- Booking: **14 KB** (10 KB doc + 4 KB index overhead per doc using the WiredTiger 1.2-1.4× heuristic for many-index collections; conservative)
- Booking audit log: **6 KB** including indexes
- Hotel: **20 KB** with the text + 2dsphere + 11 indexes considered
- All other agency-owned collections combined: **~2 MB per agency** (10 sales staff, 50 API keys/passkeys/invitations/settings/audit entries, agency profile)

---

## MongoDB limits and best practices (cited)

| Constraint | Hard / Soft | Number | Source |
|---|---|---|---|
| Max BSON document size | Hard | **16 MB** | https://www.mongodb.com/docs/manual/reference/limits/ — "BSON Document Size" |
| Max document nesting depth | Hard | **100 levels** | Same page — "Nested Depth for BSON Documents" |
| Max indexes per collection | Hard | **64** | Same page — "Number of Indexes per Collection" |
| Namespace length (unsharded) | Hard | **255 bytes** (`db.collection`) | Same page — "Namespace Length" |
| Namespace length (sharded) | Hard | **235 bytes** | Same page |
| Atlas — recommended max combined collections + indexes (M10) | **Soft** (recommended ceiling, breach degrades performance) | **5,000** | https://www.mongodb.com/docs/atlas/reference/atlas-limits/ — "Collections and Indexes Limits" |
| Atlas — recommended max combined collections + indexes (M20, M30) | Soft | **10,000** | Same page |
| Atlas — recommended max combined collections + indexes (M40+) | Soft | **100,000** | Same page |
| Atlas — max connections (M10) | Hard per-node | **1,500** | Same page |
| Atlas — max new connections/sec (M10, M20) | Hard | **15/sec** | Same page |
| Atlas — connection limits scale with vCPU on M30+ | Soft (not published) | Roughly 3,000 (M30) → ~64,000 (M80) per node; Atlas docs intentionally vague | Same page — "Other cluster tiers don't have connection rate limits" |
| WiredTiger default internal cache | Default | **max((RAM − 1 GB) × 50%, 256 MB)** | https://www.mongodb.com/docs/manual/core/wiredtiger/ — "WiredTiger Internal Cache" |
| WiredTiger cache — recommended max | Soft | **80% of available memory** if forced higher | Same page |
| Auto-created oplog max | Default | **50 GB** | https://www.mongodb.com/docs/manual/reference/limits/ — "Maximum Size of Auto-Created Oplog" |
| Storage:RAM ratio (Atlas M10–M40) | Recommended | **60:1** | https://www.mongodb.com/docs/atlas/customize-storage/ |
| Storage:RAM ratio (Atlas M40+) | Recommended | **120:1** | Same page |

**Working-set principle (received wisdom, validated by the WiredTiger documentation's cache-sizing rationale):** the hot data plus its indexes must fit in the WiredTiger cache, otherwise every miss is a disk seek and tail latencies collapse. Atlas's per-tier "recommended max collections + indexes" ceilings exist precisely because too many namespaces fragment the cache and force eviction.

---

## Atlas tier reference (Option B target hardware)

For each candidate Atlas tier, the constraints we'll cross-reference below. Pricing from https://www.mongodb.com/pricing (on-demand, single AWS region) as of 2026-06-04; treat as ±10%. Connection limits beyond M10 are not officially published per-tier; values shown are widely-quoted community numbers and conservative for sizing.

| Tier | RAM | vCPU | Storage cap | WT cache (default) | Reco. collections+indexes | Est. max connections | $/hr | ~$/month |
|---|---|---|---|---|---|---|---|---|
| M10 | 2 GB | 2 | 10–128 GB | 0.5 GB | **5,000** | 1,500 | $0.08 | ~$58 |
| M20 | 4 GB | 2 | 20–256 GB | 1.5 GB | **10,000** | ~3,000 | $0.20 | ~$146 |
| M30 | 8 GB | 2 | 40–512 GB | 3.5 GB | **10,000** | ~3,000 | $0.54 | ~$394 |
| M40 | 16 GB | 4 | 80 GB–1 TB | 7.5 GB | **100,000** | ~6,000 | $1.04 | ~$759 |
| M50 | 32 GB | 8 | 160 GB–4 TB | 15.5 GB | 100,000 | ~16,000 | $2.00 | ~$1,460 |
| M60 | 64 GB | 16 | 320 GB–4 TB | 31.5 GB | 100,000 | ~32,000 | $3.95 | ~$2,884 |
| M80 | 128 GB | 32 | 750 GB–4 TB | 63.5 GB | 100,000 | ~64,000 | $7.30 | ~$5,329 |
| M140 | 192 GB | 48 | 1–4 TB | 95.5 GB | 100,000 | ~96,000 | $10.99 | ~$8,023 |
| M200 | 256 GB | 64 | 1.5–4 TB | 127.5 GB | 100,000 | ~128,000 | $14.59 | ~$10,651 |

For our Alibaba-hosted equivalent we'll target ECS instances with similar RAM (e.g., `ecs.r7.2xlarge` = 64 GB ≈ M60; `ecs.r7.4xlarge` = 128 GB ≈ M80). Atlas tiers serve as the published-spec proxy because Alibaba MongoDB self-managed doesn't publish "max namespaces per tier."

---

## Sensitivity table — Option B at N concurrent active agencies

**End-of-year-3 cumulative figures.** Mix assumption (A5): 70% median (500/yr), 25% P90 (5,000/yr), 5% top decile (20,000/yr).

**Per-agency-year derivations (Option B, end of year 3):**

| Metric | Per-agency baseline (avg) | Formula |
|---|---|---|
| Bookings (3-year cumulative) | **7,800 docs** | weighted-avg-per-year = 0.70×500 + 0.25×5,000 + 0.05×20,000 = 350 + 1,250 + 1,000 = **2,600 bookings/agency/year** (A2–A5), ×3yr = **7,800 docs/agency over 3 years** |
| Bookings storage | **109 MB** | 7,800 × 14 KB = 109 MB |
| Bookings working set (last 90 days hot) | **9 MB** | 7,800/3yr × (90/365) × 14 KB = ~640 docs × 14 KB ≈ 9 MB |
| Audit log docs | **15,600** | 7,800 × 2 (A6) |
| Audit log storage | **94 MB** | 15,600 × 6 KB |
| Transportation bookings (~5% attach rate, 3yr) | 390 docs ≈ **1 MB** | 7,800 × 0.05 × 3 KB |
| All other agency-owned collections | **~2 MB** | Sum of staff, settings, keys, invitations, commission audits |
| **Total per-agency storage (Option B db)** | **~206 MB** | Bookings + audit + transport + misc |
| Namespaces per agency database (collections + indexes) | **~50** | 10 collections × ~5 indexes avg (bookings has 14, audit 4, agency 2, etc.) |

**Platform (shared) — constant regardless of N:**

| Metric | Value | Formula |
|---|---|---|
| `platform.hotels` docs | 100,000 | A1 |
| `platform.hotels` storage | **~1.95 GB** | 100k × 20 KB (incl. text + 2dsphere index overhead) |
| `platform.hotels` working set (70% warm) | **~1.4 GB** | 70k × 20 KB |
| `platform.scan_history` | ~10 MB | ~3k scans × 3 KB over 3yr |
| `platform.commission_chain` + others | ~5 MB | 50 chains + small refs |
| **Platform namespaces** | **~30** | 6 collections × ~5 indexes |

### Now the sensitivity table

| Metric | Baseline / formula | **10 agencies** | **50 agencies** | **200 agencies** | **1,000 agencies** |
|---|---|---:|---:|---:|---:|
| Bookings collection size (docs, 3-yr) | 7,800/agency | 78,000 | 390,000 | 1,560,000 | 7,800,000 |
| Bookings storage (GB) | 109 MB × N / 1024 | 1.06 | 5.32 | 21.3 | 106.4 |
| Bookings working set (GB, 90-day window) | 9 MB × N / 1024 | 0.09 | 0.44 | 1.76 | 8.79 |
| Audit log storage (GB) | 94 MB × N / 1024 | 0.92 | 4.59 | 18.4 | 91.8 |
| Other agency collections storage (GB) | 3 MB × N / 1024 | 0.03 | 0.15 | 0.59 | 2.93 |
| **`platform.hotels` (constant)** | 1.95 GB | 1.95 | 1.95 | 1.95 | 1.95 |
| `platform.hotels` working set (constant) | 1.4 GB | 1.4 | 1.4 | 1.4 | 1.4 |
| **Total storage (GB)** | Sum | **~4.0** | **~12.0** | **~44.2** | **~205.0** |
| **Total working set (GB)** | hot bookings + hot hotels | **~1.5** | **~1.8** | **~3.2** | **~10.2** |
| **Namespaces (collections + indexes)** | 50/agency + 30 platform | 530 | 2,530 | 10,030 | 50,030 |
| **Open connections (Option B shared pool)** | 5/pool × 2 backend pods/agency × N (A9, A10, A11) | 100 | 500 | 2,000 | 10,000 |
| Required RAM for WT cache to hold working set (2× heuristic for headroom) | working set × 2 / 0.5 (WT 50% rule) ⇒ RAM = WS × 4 | **6 GB** | **7 GB** | **13 GB** | **41 GB** |
| Required storage (data × 1.5 incl. oplog + overhead) | ×1.5 | **6 GB** | **18 GB** | **66 GB** | **308 GB** |
| **Required Atlas tier (closest match)** | min RAM + max(connections, namespaces) constraint | **M30** (8 GB) | **M30** (10k ns cap binds) | **M40** (100k ns cap; ~6k conn) | **M60** (RAM + 32k conn) |
| **Monthly Atlas cost (USD)** | from tier table | **~$394** | **~$394** | **~$759** | **~$2,884** |

**Notes on the table:**
- "Working set × 4 = required RAM" comes from: working set must fit in WiredTiger cache (default 50% of RAM − 1 GB) with ~2× headroom for index pages and short-term spikes. So `RAM ≈ workingSet × 2 / 0.5 = workingSet × 4`.
- Namespaces formula counts both collections AND indexes per Atlas's combined ceiling. Per-agency average: 10 collections × 5 indexes ≈ 50. Bookings alone declares 14 indexes; that's the heaviest contributor.
- Connection count at 1,000 agencies assumes Option B's shared-pool benefit — under Option A, 1,000 agencies × 2 pods × pool_size 5 = 10,000 connections **distributed across 1,000 mongods**, not concentrated; under Option B all 10,000 hit one cluster, which is why M60 is needed.

---

## The breakpoint

**For each constraint, where do we cross 50%, 80%, 100% of ceiling?**

### Constraint 1 — Atlas combined collections+indexes ceiling

The most binding constraint. Crossings calculated against the **M30 ceiling = 10,000** and **M40+ ceiling = 100,000**:

| Threshold | M30 (10k cap) | M40+ (100k cap) |
|---|---|---|
| 50% (warning) | (10,000 × 0.5 − 30 platform) / 50 = **99 agencies** | (100,000 × 0.5 − 30) / 50 = **999 agencies** |
| 80% (alarm) | **159 agencies** | **1,599 agencies** |
| 100% (breach) | **199 agencies** | **1,999 agencies** |

**First-breach reading:** on **M30 we exceed the 10k combined-namespace recommendation at 199 agencies**. Upgrading to M40+ buys 10× headroom, pushing the same breach out to ~2,000 agencies. **This is the dominant constraint.**

### Constraint 2 — Working set vs WiredTiger cache

Working set grows ~9 MB per agency (recent bookings) + 1.4 GB constant (warm hotels). At 50%, 80%, 100% of WiredTiger cache (which itself is ~50% of RAM − 1 GB):

| Tier | RAM | WT cache | Workload-supportable agencies at 80% cache |
|---|---|---|---|
| M30 | 8 GB | 3.5 GB | (3.5 × 0.8 − 1.4 platform) / 0.009 ≈ **156 agencies** |
| M40 | 16 GB | 7.5 GB | (7.5 × 0.8 − 1.4) / 0.009 ≈ **511 agencies** |
| M50 | 32 GB | 15.5 GB | (15.5 × 0.8 − 1.4) / 0.009 ≈ **1,222 agencies** |

Working set is **not the binding constraint at any tier we'd plausibly start on**.

### Constraint 3 — Connection ceiling

Open connections = ~10 per agency (2 pods × pool 5). At 80% of tier limit:

| Tier | Conn limit | 80% threshold | Agency count |
|---|---|---|---|
| M30 | ~3,000 | 2,400 | **240 agencies** |
| M40 | ~6,000 | 4,800 | **480 agencies** |
| M50 | ~16,000 | 12,800 | **1,280 agencies** |

### Constraint 4 — Storage

Even at 1,000 agencies we're only at 205 GB. **Storage is never the binding constraint** at any plausible agency count.

### Constraint 5 — Indexes per collection (hard limit 64)

Bookings declares 14 indexes. Hotels declares 11. We're at ~22% of the 64 hard cap. **Not the binding constraint** unless someone adds 50+ more indexes (which would itself be an antipattern).

### Constraint 6 — BSON document size (hard limit 16 MB)

Bookings P99 is ~18 KB. Hotels P99 is ~20 KB. We're at 0.1% of the cap. **Not the binding constraint.**

### Breakpoint summary

| Rank | Constraint | First crosses 80% at N agencies | Mitigation |
|---|---|---|---|
| 1 | **Atlas namespaces (M30 = 10k cap)** | **~159 agencies** | Upgrade M30 → M40, ceiling jumps 10× → next breach at ~1,599 |
| 2 | **Atlas namespaces (M40 = 100k cap)** | **~1,599 agencies** | Migrate to Option A (per-agency clusters) or shard `bookings` by tenantId |
| 3 | Connections (M30) | ~240 | Same tier upgrade gets us to ~480 (M40) |
| 4 | Working set vs cache (M30) | ~156 | Tier upgrade or cold-archive bookings older than 1 year |

**The breakpoint is namespaces, not storage and not RAM.** Storage is essentially free; RAM is cheap relative to namespace fragmentation. **At ~160 agencies on M30 we must upgrade the shared cluster to M40, and at ~1,600 agencies the M40 namespace ceiling forces migration to Option A or sharding.**

### Sensitivity: what shifts the breakpoint?

- If **median agency does 2,000 bookings/year** instead of 500: per-agency working set grows ~4×; the working-set vs cache constraint on M30 starts to bind around **40 agencies**. The namespace constraint is unchanged (~160). Breakpoint moves from 160 → ~40.
- If we add a **second high-cardinality tenant collection** (e.g., search-event logs, one per agency): namespace count per agency rises from ~50 to ~80; breakpoint on M30 drops from 199 → ~125.
- If we **stop creating a separate database per tenant** and instead use a single `bookings` collection with `tenantId` indexed: namespaces collapse to ~30 total, and the binding constraint becomes connections or working set — breakpoint pushes out to **800-1,000 agencies on M40**.

---

## Decision

**Adopt Option B (shared cluster, database-per-tenant) from launch through the first 100 active agencies.** It is materially cheaper than Option A and well within every MongoDB constraint at this scale.

**Triggered planning at 100 active agencies** — this is the warning trigger. At this point:
1. Start the formal migration design for Option A (per-agency clusters), or alternatively
2. Plan an upgrade path on the shared cluster (M30 → M40, which buys 10× namespace headroom)

**Migration must be complete by 1,500 active agencies** — this is the hard trigger. At this point the M40 namespace ceiling (recommended 100k) is at 80% utilization and we are entering the zone where MongoDB's documented degradation kicks in.

The decision is therefore **a deferred-isolation policy**: build Option B now, monitor the warning signals (see Implementation triggers below), and execute the migration to Option A only when the metrics demand it. This inverts the v1.0 plan but is fully consistent with it — Option A is the target end-state, Option B is the cost-rational waypoint.

**At launch we should still keep vcluster network/RBAC isolation per agency** (PRODUCTION_READINESS items #7, #14, #15). The shared MongoDB is a single physical resource accessed by per-tenant credentials; it is not a relaxation of compute isolation.

---

## Cost crossover

When does running 1 shared cluster cost the same as N small per-agency clusters?

Assume Option A per-agency footprint is the cheapest viable Bitnami-on-vcluster MongoDB: roughly **2 vCPU + 4 GB RAM + 50 GB SSD ≈ $40/month** on Alibaba ECS (`ecs.g7.large` + ESSD), once you account for the always-on baseline. Conservative; could be lower if vclusters genuinely share idle node capacity, but the PVC + backup cost is hard-floored.

| N agencies | Option B (shared cluster cost) | Option A (N × $40/mo per-agency) | Cheaper |
|---:|---:|---:|---|
| 10 | M30 = $394/mo | $400/mo | **B (≈ parity)** |
| 50 | M30 = $394/mo | $2,000/mo | **B (~5×)** |
| 100 | M30 = $394/mo | $4,000/mo | **B (~10×)** |
| 200 | M40 = $759/mo (post-upgrade) | $8,000/mo | **B (~10×)** |
| 500 | M40 = $759/mo | $20,000/mo | **B (~26×)** |
| 1,000 | M50/M60 = ~$1,500–$2,884 | $40,000/mo | **B (~14–27×)** |

**Cost crossover is approximately N = 10**. Below 10 agencies, B and A are roughly tied on cost. Above 10, B is dramatically cheaper at every horizon — up to 27× cheaper at 1,000 agencies — which is precisely why the namespace breakpoint matters: the **technical** constraint forces migration long before the **cost** argument does.

If we had ignored MongoDB's namespace ceilings, Option B would look like an unambiguous win forever. The ceiling is what gives this ADR a non-trivial conclusion.

---

## Implementation triggers (early-warning metrics)

These metrics should be wired into Prometheus (PRODUCTION_READINESS #11) with alerts on the 80% threshold. The first to trigger gives at least 1–2 months of lead time before the breakpoint actually bites.

| Trigger | Threshold | Source metric | Why this matters |
|---|---|---|---|
| **Namespace count approaching tier cap** | `>= 80%` of recommended ceiling for current Atlas tier (e.g., 8,000 on M30) | Sum of `db.adminCommand({listDatabases:1})` collections+indexes counts | First constraint to bite; lead time ~3 months between upgrade options |
| **WiredTiger cache eviction rate** | Sustained `cacheMissRate > 10%` for 24h | `serverStatus().wiredTiger.cache` | Means working set no longer fits cache; either tier-upgrade or archive cold data |
| **Active connections vs tier ceiling** | `>= 60%` for sustained 1h | `db.serverStatus().connections.current` | Connection-pool saturation; lead time ~weeks |
| **P95 query latency on `bookings`** | `> 200ms` for 1h | App-side APM (e.g., OpenTelemetry → Grafana) | Symptom that may surface before namespace cap binding becomes visible |
| **Replication lag** | `> 10s` sustained | `rs.printSecondaryReplicationInfo()` | Oplog pressure from write fan-out across many tenant databases |
| **WiredTiger checkpoint duration** | `> 30s` median | `serverStatus().wiredTiger.transaction.checkpoint duration` | Many small databases slow checkpointing |
| **Operational — onboarded-agency count** | Rolling count ≥ 100 (warning), ≥ 1,500 (hard) | Backoffice metric | Forcing function — start migration planning at 100, complete by 1,500 |

---

## Alternatives considered

### Option A — Per-agency MongoDB from day 1 (the original PRODUCTION_READINESS #9 plan)

The strictest isolation. Each tenant gets a `mongod`, its own oplog, its own PVC, its own backup schedule, its own connection limit. **Rejected as the v1.0 default** because:
- At launch we'll have 1–10 agencies. Running 10 mongods is 10× the cost of a shared M10/M30 with negligible isolation benefit (we have RBAC and per-tenant credentials either way).
- It commits to the most expensive shape upfront when the breakpoint analysis says we have headroom for ~160 agencies on a single M30.
- It does not actually solve the namespace problem at scale — it postpones it. If we then bolt on a shared platform.hotels cluster later, we're in a hybrid topology that's harder to operate than either pure option.

**Adopted as the target end-state.** At ≥1,500 agencies, this becomes the right shape.

### Sharding `bookings` by `tenantId` on a single cluster (sharded MongoDB)

A middle path: stay on one cluster but introduce a sharded `bookings` collection keyed by `tenantId`. **Considered but deferred.** Benefits: namespace count doesn't grow with N agencies (one collection, sharded). Costs: sharded MongoDB requires config servers + mongos routers, doubles operational complexity, and changes the `bookings` query patterns (need shard-key in every query). Worth revisiting at the 800–1,000 agency horizon as an alternative to migration to Option A.

### Schema collapse — one shared `bookings` collection with `tenantId` field, no per-tenant databases

Simplest possible Option B variant. Cuts namespace count to a constant (~30 platform-wide). Pushes the breakpoint out by an order of magnitude.

**Rejected for the data-isolation tier** because:
- Loses per-tenant backup/restore granularity (can't snapshot one tenant's bookings without filtering)
- Loses per-tenant access control at the database level (RBAC becomes app-enforced only)
- Makes per-tenant data deletion (GDPR-style "right to be forgotten") harder — has to scan + delete by tenantId rather than `db.dropDatabase()`
- Cross-tenant query bugs become possible if any query forgets to filter by tenantId — a high-cost class of bug

**Adopted partially** for the platform layer: `platform.hotels` is shared across all tenants by design (the same hotels are bookable by every agency). The collapse argument applies cleanly to platform data, not to tenant data.

### Atlas multi-region / global clusters

Out of scope. We're hosting on Alibaba Cloud (`alibaba-infra/`), not Atlas. Atlas tiers are used in this ADR as a published-spec reference proxy for sizing equivalent self-managed ECS instances. A future ADR may revisit Atlas adoption if/when we expand outside Alibaba's footprint.

### Defer the decision (no isolation plan)

Rejected. The whole point of computing the breakpoint is to know which signals to monitor so the decision doesn't surprise us at 90 days' notice.

---

## Consequences

### Positive

- **~10× lower MongoDB cost** from launch through ~1,500 agencies. At 200 agencies, $759/mo (M40) vs ~$8,000/mo (per-agency).
- **Operational simplicity at launch**: one cluster to back up, monitor, upgrade. One Helm release rather than N.
- **Shared platform.hotels avoids 100k-doc duplication per tenant** — at 1,000 agencies, Option A would store the hotel catalog 1,000× = ~2 TB of duplicated data; Option B stores it once.
- **Deferred-isolation policy is reversible**: we can migrate to Option A on a per-tenant basis (start with high-value tenants, leave long-tail on shared).
- **Per-tenant database** (not single-collection) preserves backup/restore granularity, RBAC at the database level, and `dropDatabase()` for tenant offboarding.

### Negative

- **Blast radius is the whole platform** at the data tier. A misbehaving query from any tenant (e.g., unindexed scan on `acme_bookings`) can saturate WT cache and degrade every other tenant. **Mitigation:** query review checklist for any new aggregation; alerting on slow-query logs.
- **No physical isolation** — a security incident affecting MongoDB credentials affects all tenants. **Mitigation:** per-tenant MongoDB users with `readWrite` scoped to the tenant's database only; rotate credentials per-tenant; tenant-specific credentials never appear in shared config.
- **Migration to Option A is not free** — when we hit 1,500 agencies, we have to design and execute a per-tenant data migration. Roughly: per-tenant `mongodump` → new vcluster mongod → `mongorestore` → cutover with brief read-only window. ~30 min per tenant, can be parallelised. **Mitigation:** automate the playbook well before we need it (i.e., during the 100-agency warning window).
- **Connection pooling needs explicit attention.** Mongoose's `useDb()` model reuses the underlying connection but creates a new `Db` instance per tenant. Need to confirm pool sizing scales linearly with tenant count, not exponentially.

### Risks

- **Atlas namespace ceiling is a soft limit, not a hard one.** MongoDB doesn't `errno` at 100,001 — performance degrades. We may discover the real degradation curve sits at 30k or 200k for our specific workload. **Mitigation:** the 80% trigger gives lead time to course-correct; treat the published limits as conservative.
- **Working-set assumptions are fragile.** If agencies start querying historical bookings (e.g., for annual reports), the 90-day-hot assumption breaks and the working set explodes. **Mitigation:** monitor cache miss rate, not just storage size.
- **vendorResponse Mixed field is the document-size wild card.** If a future Restel payload format pushes responses to 50 KB, the bookings collection inflates 5×. **Mitigation:** consider extracting `vendorResponse` to a separate collection or to OSS object storage with a reference.

---

## References

- `alibaba-infra/PRODUCTION_READINESS.md` — items #7, #9, #10, #11, #14, #15
- `documentation/_user_stories_pending/USER_STORIES.md`
- ADR-001 — `documentation/technical/2-architecture/adr/001-cqrs-architecture-refactor.md`
- ADR-002 — `documentation/technical/2-architecture/adr/002-poi-autocomplete-provider.md`
- MongoDB Manual — Reference Limits: https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Atlas — Service Limits: https://www.mongodb.com/docs/atlas/reference/atlas-limits/
- MongoDB Atlas — Cluster Tier: https://www.mongodb.com/docs/atlas/reference/cluster-tier/
- MongoDB Atlas — Customize Storage: https://www.mongodb.com/docs/atlas/customize-storage/
- MongoDB Manual — WiredTiger: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Atlas — Pricing: https://www.mongodb.com/pricing

---

## When to revisit

This ADR should be re-opened when **any** of the following triggers fire:

1. **Onboarded-agency count crosses 100** — start the formal migration design for Option A; do not wait.
2. **Any of the Prometheus alerts in "Implementation triggers" fires for 24h sustained** — the breakpoint is approaching faster than the linear model predicts.
3. **A new high-cardinality per-tenant collection is proposed** (e.g., search-event logging at one-doc-per-search) — recompute the namespace count; the breakpoint may move dramatically.
4. **vendorResponse payload sizes grow materially** — re-estimate bookings document size; if it crosses 30 KB, working set grows 2× and the cache constraint may overtake namespaces as the binding limit.
5. **Atlas / Alibaba publish revised namespace ceilings** — bake into the table.
6. **MongoDB serverless / Vector Search introduces a new pricing dimension** that changes the cost calculus.
