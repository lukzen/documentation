# ADR-002: POI Autocomplete Provider — Google Places (Live) + Mapbox Geocoding (Backfill)

**Status:** Proposed
**Date:** 2026-06-03
**Authors:** Ergos Continental Engineering
**Deciders:** Lukasz

---

## Context

USER_STORIES E1 (POI-aware location search) introduces a feature where the agency app's destination input becomes a typeahead that returns landmarks / touristic places, and on selection the results page lists hotels in Ergos's MongoDB inventory sorted by walking distance from the selected POI. Three components are needed:

1. **Live POI autocomplete** — an external API that takes a partial query + country filter + language and returns POI suggestions with coordinates. Called on every meaningful keystroke a user types in the destination field.
2. **Hotel-coordinate backfill** — a one-time bulk job to geocode the ~100k hotels in the MongoDB catalog where the vendor (Hotetec, Dingus, etc.) shipped unreliable or missing lat/lng. Without this, the proximity search returns empty for whole regions even if hotels exist there.
3. **Proximity query** — `$geoNear` against MongoDB's 2dsphere index. This is not vendor-dependent and not the subject of this ADR.

The decision needed here: which third-party provider(s) to use for (1) and (2).

### Candidate providers

| Provider | Live POI autocomplete | Geocoding (backfill) | Notes |
|---|---|---|---|
| **Google Places** | ✅ Best-in-class POI coverage globally | ✅ Available | Session-based billing for autocomplete is unusually cheap at MVP scale |
| **Mapbox** | ✅ Search Box API (preview pricing) | ✅ Available | Generally cheaper at sustained scale; coverage gaps in fringe markets |
| **HERE** | ✅ Autosuggest / Discover | ✅ Available | Strong in EU + LATAM, less in NA/APAC; pricing not transparent on public pages |
| **OpenStreetMap (Photon / Nominatim)** | ✅ Free | ✅ Free | Patchy POI coverage in many markets; rate-limited hosted versions |

### Real cost numbers (pulled from official pricing pages 2026-06-03)

**Google Places Autocomplete (Session-based)** — *unlimited free for the autocomplete keystrokes*. You only pay for **Place Details** when the user picks a POI:

- Place Details (Essentials): 10,000 free per month, then $5/1k, dropping to $4/1k at 100k+, $3/1k at 500k+, $1.50/1k at 1M+, $0.38/1k at 5M+
- Geocoding API: 10,000 free per month, then $5/1k (same tier schedule as Place Details)

**Mapbox**:

- Search Box API: 500 free per month, then **$3/1k sessions** (preview pricing — may change)
- Geocoding API (Temporary forward): 100,000 free per month, then **$0.75/1k**
- Address Autofill: 1,000 free per month, then $12.50/1k (different product than Search Box; not relevant here)

### Cost projection at three volumes

Comparing the autocomplete cost (the high-frequency call path):

| Monthly POI picks | Google Places (Session + Details) | Mapbox Search Box | Cheaper |
|---:|---:|---:|---|
| 5,000 (MVP) | **$0** — within 10k Place Details free cap | ~$13 (4.5k × $3/1k) | Google |
| 50,000 | $200 (40k × $5/1k Place Details) | ~$148 (49.5k × $3/1k) | Mapbox |
| 200,000 | ~$850 (tier-stepped) | ~$598 | Mapbox |
| 1,000,000 | ~$3,550 (multi-tier) | ~$2,998 | Mapbox |
| 5,000,000+ | Cheap-tier kicks in for Google ($0.38/1k) | $14,998 (no published volume discount) | Google again |

Comparing the geocoding cost for the one-time backfill of ~100k hotels:

| Provider | Free tier | Cost at 100k hotels |
|---|---|---|
| Google Geocoding | 10k/mo | ~$450 (90k × $5/1k) |
| Mapbox Geocoding | 100k/mo | **$0** (fits entirely in free tier) |

---

## Decision

**Mixed provider strategy:**

- **Live POI autocomplete → Google Places (Session-based pricing).**
- **One-time hotel-coordinate backfill → Mapbox Geocoding.**

Both providers are consumed behind a thin internal abstraction so that a future switch is a backend-only change:

- `GET /api/places/suggest?q=&country=&lang=` → wraps the live autocomplete provider.
- `geocodingService.geocodeAddress(address, country)` → wraps the backfill provider.

---

## Rationale

### Why Google for live autocomplete

1. **MVP is functionally free.** With Session-based billing, autocomplete keystrokes are unlimited free; the meter only ticks on Place Details when the user actually selects a POI. The first 10k picks per month are free. At MVP volume of ≤5k POI picks/month, the bill is $0.
2. **Coverage parity removes silent-failure risk.** Google has best-in-class POI density across every market a worldwide hotel platform will be tested in. Mapbox and HERE have real coverage gaps in fringe markets (parts of APAC, Africa, smaller LATAM cities) — and those gaps fail silently. The autocomplete returns nothing for a landmark that should be obvious, which is a much worse UX surprise than a higher invoice.
3. **Language localisation is robust.** Both `language=es` / `language=en` work cleanly across Google's full POI index.
4. **Strong country-filter semantics.** `componentRestrictions={country: 'CO'}` is honoured strictly — a POI in Colombia never returns a suggestion just over the border.

### Why Mapbox for the backfill

1. **Free tier covers 100% of the job.** 100k hotels fits inside Mapbox's 100k/month geocoding free tier. Google would charge ~$450 for the same work.
2. **Geocoding is less coverage-sensitive than POI autocomplete.** We're feeding it a postal address (e.g., `"Calle 10 #5-51, La Candelaria, Bogotá, Colombia"`), not a fuzzy landmark name like "Plaza de Bolívar." Address-to-coordinates is a more constrained problem and Mapbox handles it competently.
3. **It's a one-off operation.** Provider risk (coverage gaps, pricing changes) doesn't compound over time. Run the job once, persist the results, done. If a small percentage fail, fall back to Google or hand-review.

### Why split rather than pick one

The two workloads have fundamentally different cost profiles and risk profiles:

| Aspect | Live autocomplete | One-time backfill |
|---|---|---|
| Frequency | Continuous (per user keystroke session) | Once per hotel, ever |
| Coverage sensitivity | High (silent UX failures) | Low (well-formed addresses) |
| Risk if provider changes pricing | Ongoing exposure | None after the job runs |
| Cost driver | Volume × time | One bulk job |

Optimising both with one provider would mean either overpaying on the backfill (Google) or accepting coverage risk on the live path (Mapbox). Splitting captures the best of each.

---

## Consequences

### Positive

- The first year of E1 in production is functionally free assuming pick volume stays under ~10k/month.
- The backfill is free regardless.
- No coverage surprises in markets we haven't yet QA'd because Google's POI index is the broadest.
- A clear "swap autocomplete provider when bills cross $500/month" trigger keeps cost optimisation tied to evidence rather than premature optimisation.

### Negative

- **Two billing relationships to manage.** A small ops overhead — two API keys, two dashboards, two contract relationships. Mitigated by treating both as standard cloud-service vendors.
- **Vendor lock-in on the live path.** Google's billing model is unusual; if Google were to remove Session-based Autocomplete pricing or change the free cap, we'd be exposed. Mitigation: the swappable `/api/places/suggest` endpoint means a Mapbox swap is a 1-day backend job, executable on short notice.
- **Quota / rate-limit boundaries diverge.** Two providers means two sets of quota errors to handle in code paths.

### Risks

- **Google's free cap behaviour at the boundary** — if monthly picks suddenly spike past 10k mid-month, billing flips from $0 to ~$5/k for the overage. Need a billing alert at 7,500 picks/month so this isn't a surprise.
- **Place ID drift.** Google rotates `place_id` over time for some POIs. If we persist `place_id` on a booking (e.g., "this booking was searched-from POI X"), that reference can rot. Mitigation: persist lat/lng + display name, not the Google place_id — those don't change.

---

## Alternatives considered

### Single provider — Google for both

Coverage and consistency benefits, but pays ~$450 for a one-off backfill that Mapbox does free. Rejected because the saving is real and there's no operational argument for single-provider when the swap is hidden behind an internal API.

### Single provider — Mapbox for both

Saves ~$200/year on autocomplete at the 50k picks/month tier but exposes the live UX to silent coverage gaps in countries we haven't yet QA'd. Rejected — silent UX failures in a hotel-search box are a high-impact bug class.

### Single provider — HERE for both

Strong in EU + LATAM, weaker in NA/APAC. Pricing was not transparent on the public pages, requiring a sales conversation to confirm. Rejected for MVP because the procurement friction outweighs the modest cost benefits over Google at MVP scale.

### Self-hosted OpenStreetMap (Photon / Nominatim)

Free but requires running and maintaining the infrastructure (Elasticsearch + OSM data extracts), and POI coverage is patchy in LATAM smaller cities and APAC. Rejected — the infra ops cost exceeds the savings vs Google's free MVP tier, and the coverage gap reintroduces the silent-failure risk.

### Defer the decision — hardcode a list of cities

Quick to ship, useless for the actual user story (typing "Plaza de Bolívar" wouldn't autocomplete). Rejected.

---

## When to revisit

This ADR should be re-opened when **any** of the following triggers fire:

1. **Cost trigger** — Google autocomplete bill exceeds $500/month for two consecutive months. At that volume Mapbox becomes ~25% cheaper.
2. **Coverage trigger** — Google's POI coverage proves inadequate for a market we want to enter (this would be unprecedented but documented if seen).
3. **Strategic trigger** — Anthropic, Google, or Mapbox makes a material pricing change (e.g., Google removes Session-based billing for autocomplete).
4. **Volume trigger** — pick volume exceeds 5M/month, at which point Google's cheap-tier kicks in and the cost calculus inverts back toward Google.

A monthly check of the `/api/places/suggest` cost dashboard against the thresholds above is enough; no scheduled review needed.

---

## Implementation notes

### MVP integration

```ts
// backend-service/src/domains/places/services/google-places.adapter.ts
async function suggestPois(query: string, country: string, lang: 'en' | 'es') {
  const session = req.sessionToken ?? generateSessionToken() // re-use within a single user search
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json
      ?input=${query}&components=country:${country}&language=${lang}
      &sessiontoken=${session}&types=establishment|geocode&key=${GOOGLE_KEY}`)
  const { predictions } = await r.json()
  // Don't fetch Place Details here — defer to when user actually selects one
  return predictions.map(p => ({ id: p.place_id, name: p.description, country }))
}

async function resolvePoi(placeId: string, sessionToken: string) {
  // Place Details billed here (within 10k/mo free)
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json
      ?place_id=${placeId}&fields=geometry,name,address_component
      &sessiontoken=${sessionToken}&key=${GOOGLE_KEY}`)
  const { result } = await r.json()
  return {
    name: result.name,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    country: result.address_components.find(c => c.types.includes('country'))?.short_name,
  }
}
```

### Backfill integration

```ts
// backend-service/src/domains/hotel/services/sync.service.ts (additive)
async function backfillCoordinatesIfMissing(hotel: HotelDoc) {
  if (hotel.location?.coordinates?.length === 2) return  // already geocoded
  if (!hotel.address) return  // can't geocode without an address; log + skip
  const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(hotel.address)}.json
      ?country=${hotel.country}&access_token=${MAPBOX_KEY}&limit=1`)
  const { features } = await r.json()
  if (!features.length) return
  const [lng, lat] = features[0].center
  hotel.location = { type: 'Point', coordinates: [lng, lat] }
  hotel.geocodedAt = new Date()
  await hotel.save()
}
```

### MongoDB index

```js
// One-time migration
db.hotels.createIndex({ location: '2dsphere' })
```

### Query

```js
// GET /api/hotels/near?lat&lng&country&radiusKm
db.hotels.aggregate([
  { $geoNear: {
      near: { type: 'Point', coordinates: [poiLng, poiLat] },
      distanceField: 'distanceMeters',
      maxDistance: radiusKm * 1000,
      query: { country },
      spherical: true,
  }},
  { $limit: 50 },
])
```

### Cost monitoring

- Daily summary of Google Places `place_details` request count, alert at 7,500/month projected.
- Quarterly review of Mapbox geocoding usage to ensure incremental backfills (new hotels arriving from GDS sync) stay within the 100k/month free tier.

---

## References

- Google Maps Platform Pricing — https://developers.google.com/maps/billing-and-pricing/pricing
- Mapbox Pricing — https://www.mapbox.com/pricing
- USER_STORIES E1 — `documentation/_user_stories_pending/USER_STORIES.md`
- Prototype — `documentation/public/prototypes/agency-app/` (location autocomplete on the home screen)
- Related ADR-001 (CQRS) — `documentation/technical/2-architecture/adr/001-cqrs-architecture-refactor.md`
