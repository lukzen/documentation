/* ============================================================
   USER STORY INTERACTIONS — A1, A2, B1, B2
   Wires every visible button to a sensible action: open/close
   modals, add rows, filter tables, export CSV stubs, toast.
   Side-effects stay client-only (no real backend in prototype).
   ============================================================ */

/* ---------- Toast helper ---------- */
function protoToast(msg, type) {
  // Lazy-create container the first time we toast
  let host = document.getElementById('proto-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'proto-toast-host';
    Object.assign(host.style, {
      position: 'fixed', right: '20px', bottom: '20px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      zIndex: '9999', pointerEvents: 'none'
    });
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  const bg = type === 'success' ? '#0d9488' : type === 'warn' ? '#f59e0b' : type === 'error' ? '#dc2626' : '#1a1a4e';
  Object.assign(t.style, {
    padding: '12px 16px', background: bg, color: '#fff',
    borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    fontFamily: "'DM Sans',sans-serif", fontSize: '13.5px', fontWeight: '500',
    transform: 'translateX(110%)', transition: 'transform 220ms ease-out',
    maxWidth: '380px'
  });
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => { t.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    t.style.transform = 'translateX(110%)';
    setTimeout(() => t.remove(), 220);
  }, 3200);
}

/* ============================================================
   A1: Markup Rules — country-rooted cascade
   Tiers (most specific → least):
     1. Hotel        — one specific hotel (exact name)
     2. Chain×Country — chain scoped to a country (e.g. Meliá in Cuba)
     3. Category×Country — star rating scoped to a country (e.g. 5★ in Spain)
     4. Country      — all hotels in a country
     5. Default      — agency catch-all
   There are NO global chain or global category rules.
   Demo data lives in JS; rule edits mutate JS state and re-render
   the country-card area + cascade preview.
   ============================================================ */

/* ---------- Reference catalog stats (mock) ----------
   Counts approximate the agency's catalog mix. `candidates` =
   hotels likely belonging to a chain but not yet linked (i.e. the
   name matches a pattern but no chainId is set). Surfaces the
   coverage caveat from the design conversation. */
const MR_CHAINS = [
  { id: 'iberostar', name: 'Iberostar Group', count: 41, candidates: 6 },
  { id: 'melia', name: 'Meliá Hotels International', count: 28, candidates: 3 },
  { id: 'hyatt', name: 'Hyatt Hotels Corporation', count: 15, candidates: 1 },
  { id: 'riu', name: 'RIU Hotels & Resorts', count: 12, candidates: 8 },
  { id: 'marriott', name: 'Marriott International', count: 8, candidates: 14 },
  { id: 'roibos-ind', name: 'Roibos Independent Hotels', count: 14, candidates: 0 },
];
const MR_COUNTRIES = [
  { id: 'cu', name: 'Cuba', count: 180 },
  { id: 'do', name: 'Dominican Republic', count: 95 },
  { id: 'mx', name: 'Mexico', count: 220 },
  { id: 'es', name: 'Spain', count: 520 },
  { id: 'co', name: 'Colombia', count: 64 },
  { id: 'jm', name: 'Jamaica', count: 48 },
  { id: 'us', name: 'United States', count: 312 },
];
// v1: "Category" = hotel STAR RATING — the classification the GDS catalog reliably
// carries. A fixed list, not fetched. Richer style tags (all-inclusive, family,
// boutique) are a deferred follow-up needing a hotel category/tags field + backfill.
const MR_CATEGORIES = [
  { id: '5', name: '5 stars', count: 525 },
  { id: '4', name: '4 stars', count: 690 },
  { id: '3', name: '3 stars', count: 410 },
];
const MR_DEMO_HOTELS = {
  // Cuba
  'iberostar-grand-packard':    { name: 'Iberostar Grand Packard',        country: 'cu', city: 'Havana',      stars: '5', chainId: 'iberostar', categories: ['5'] },
  'melia-las-antillas':         { name: 'Meliá Las Antillas',             country: 'cu', city: 'Varadero',    stars: '4', chainId: 'melia',     categories: ['4'] },
  'memories-varadero':          { name: 'Memories Varadero',              country: 'cu', city: 'Varadero',    stars: '4', chainId: null,         categories: ['4'] },
  'iberostar-bella-vista':      { name: 'Iberostar Bella Vista Varadero', country: 'cu', city: 'Varadero',    stars: '4', chainId: 'iberostar',  categories: ['4'] },
  'melia-internacional':        { name: 'Meliá Internacional Varadero',   country: 'cu', city: 'Varadero',    stars: '5', chainId: 'melia',      categories: ['5'] },
  'havana-libre':               { name: 'Gran Hotel Manzana Kempinski',   country: 'cu', city: 'Havana',      stars: '5', chainId: null,         categories: ['5'] },
  // Dominican Republic
  'hyatt-ziva-cap-cana':        { name: 'Hyatt Ziva Cap Cana',            country: 'do', city: 'Punta Cana',  stars: '5', chainId: 'hyatt',     categories: ['5'] },
  'catalonia-royal-bavaro':     { name: 'Catalonia Royal Bávaro',         country: 'do', city: 'Bávaro',      stars: '4', chainId: null,         categories: ['4'] },
  'iberostar-selection-bavaro': { name: 'Iberostar Selection Bávaro',     country: 'do', city: 'Bávaro',      stars: '5', chainId: 'iberostar',  categories: ['5'] },
  'riu-palace-bavaro':          { name: 'Riu Palace Bávaro',              country: 'do', city: 'Bávaro',      stars: '5', chainId: 'riu',        categories: ['5'] },
  'marriott-punta-cana':        { name: 'Courtyard Marriott Punta Cana',  country: 'do', city: 'Punta Cana',  stars: '3', chainId: 'marriott',   categories: ['3'] },
  // Spain — multiple cities so the cascade visibly narrows
  'hotel-arts-barcelona':       { name: 'Hotel Arts Barcelona',           country: 'es', city: 'Barcelona',   stars: '5', chainId: 'marriott',   categories: ['5'] },
  'w-barcelona':                { name: 'W Barcelona',                    country: 'es', city: 'Barcelona',   stars: '5', chainId: null,         categories: ['5'] },
  'melia-barcelona-sky':        { name: 'Meliá Barcelona Sky',            country: 'es', city: 'Barcelona',   stars: '4', chainId: 'melia',      categories: ['4'] },
  'iberostar-las-letras':       { name: 'Iberostar las Letras Madrid',    country: 'es', city: 'Madrid',      stars: '4', chainId: 'iberostar',  categories: ['4'] },
  'hotel-ritz-madrid':          { name: 'Mandarin Oriental Ritz Madrid',  country: 'es', city: 'Madrid',      stars: '5', chainId: null,         categories: ['5'] },
  'paradores-leon':             { name: 'Parador de León',                country: 'es', city: 'Seville',     stars: '3', chainId: null,         categories: ['3'] },
  'hotel-alfonso-xiii':         { name: 'Hotel Alfonso XIII Seville',     country: 'es', city: 'Seville',     stars: '5', chainId: 'marriott',   categories: ['5'] },
  // Mexico
  'iberostar-cancun':           { name: 'Iberostar Cancún',               country: 'mx', city: 'Cancún',      stars: '5', chainId: 'iberostar',  categories: ['5'] },
  'riu-palace-peninsula':       { name: 'Riu Palace Peninsula Cancún',    country: 'mx', city: 'Cancún',      stars: '5', chainId: 'riu',        categories: ['5'] },
  'hyatt-ziva-riviera':         { name: 'Hyatt Ziva Riviera Cancún',      country: 'mx', city: 'Riviera Maya', stars: '5', chainId: 'hyatt',    categories: ['5'] },
  'grand-palladium-maya':       { name: 'Grand Palladium Maya Resort',    country: 'mx', city: 'Riviera Maya', stars: '4', chainId: null,        categories: ['4'] },
  // Colombia
  'iberostar-cartagena':        { name: 'Iberostar Hotel Cartagena',      country: 'co', city: 'Cartagena',   stars: '5', chainId: 'iberostar',  categories: ['5'] },
  'marriott-cartagena':         { name: 'Marriott Cartagena',             country: 'co', city: 'Cartagena',   stars: '4', chainId: 'marriott',   categories: ['4'] },
  'hyatt-cali':                 { name: 'Hyatt Regency Cali',             country: 'co', city: 'Cali',        stars: '5', chainId: 'hyatt',      categories: ['5'] },
};

/* ---------- Mutable rules state — country-rooted model ----------
   chain[].country and category[].country are required — they scope the rule
   to a specific country. There are no global chain or global category rules. */
let MR_DEFAULT = 15;
const MR_STATE = {
  /* Chain × Country rules — e.g. Iberostar in Cuba only */
  chain: [
    { id: 'r-c1', tier: 'chain', target: 'iberostar', country: 'cu', pct: 18, updated: '2026-05-29', by: 'patria@' },
    { id: 'r-c2', tier: 'chain', target: 'melia',     country: 'cu', pct: 20, updated: '2026-05-26', by: 'patria@' },
  ],
  /* Country rules — all hotels in a country */
  country: [
    { id: 'r-co1', tier: 'country', target: 'cu', pct: 12, updated: '2026-05-25', by: 'patria@' },
    { id: 'r-co2', tier: 'country', target: 'es', pct: 15, updated: '2026-05-20', by: 'carlos@' },
  ],
  /* Category × Country rules — star rating within a country */
  category: [
    { id: 'r-ct1', tier: 'category', target: '5', country: 'cu', pct: 25, updated: '2026-05-24', by: 'carlos@' },
    { id: 'r-ct2', tier: 'category', target: '4', country: 'es', pct: 18, updated: '2026-05-22', by: 'patria@' },
  ],
  /* Per-hotel overrides */
  hotel: [
    { id: 'r-h1', tier: 'hotel', target: 'Iberostar Grand Packard',    pct: 22, city: 'Havana, Cuba',       updated: '2026-05-28', by: 'patria@' },
    { id: 'r-h2', tier: 'hotel', target: 'Hyatt Ziva Cap Cana',        pct: 25, city: 'Punta Cana, DR',     updated: '2026-05-25', by: 'carlos@' },
    { id: 'r-h3', tier: 'hotel', target: 'Memories Varadero',          pct: 10, city: 'Varadero, Cuba',     updated: '2026-05-22', by: 'patria@' },
    { id: 'r-h4', tier: 'hotel', target: 'Iberostar Selection Bávaro', pct: 20, city: 'Bávaro, DR',         updated: '2026-05-18', by: 'patria@' },
  ],
};

/* ---------- Lookup helpers ---------- */
function mrChainById(id) { return MR_CHAINS.find(c => c.id === id); }
function mrCountryById(id) { return MR_COUNTRIES.find(c => c.id === id); }
function mrCategoryById(id) { return MR_CATEGORIES.find(c => c.id === id); }
function mrPctClass(pct) { return pct >= MR_DEFAULT ? 'mr-pct mr-pct-up' : 'mr-pct mr-pct-down'; }
function mrDeltaStr(pct) {
  const d = pct - MR_DEFAULT;
  const cls = d < 0 ? 'mr-delta mr-delta-down' : 'mr-delta';
  return `<span class="${cls}">${d >= 0 ? '+' : ''}${d} pts</span>`;
}

/* ---------- Cascade resolver — country-rooted 5-tier walk ----------
   Precedence: Hotel › Chain·Country › Category·Country › Country › Default
   Chain and Category rules are always scoped to a country — there are no
   global chain or global category tiers. */
function mrResolveForHotel(hotelKey) {
  const h = MR_DEMO_HOTELS[hotelKey];
  if (!h) return { tier: 'default', pct: MR_DEFAULT, label: 'Default markup', walk: [] };
  const walk = [];

  // Tier 1 — per-hotel override (exact name match)
  const ho = MR_STATE.hotel.find(r => r.target === h.name);
  walk.push({ tier: 'hotel', matched: !!ho, pct: ho?.pct,
    label: ho ? `Per-hotel override · ${h.name}` : `No per-hotel override for ${h.name}` });
  if (ho) return { tier: 'hotel', pct: ho.pct, label: `Per-hotel override · ${h.name}`, walk };

  // Tier 2 — Chain × Country (chain scoped to hotel's country)
  const ch = MR_STATE.chain.find(r => r.target === h.chainId && r.country === h.country);
  const countryName = mrCountryById(h.country)?.name || h.country;
  if (h.chainId) {
    const chainName = mrChainById(h.chainId)?.name || h.chainId;
    walk.push({ tier: 'chain', matched: !!ch, pct: ch?.pct,
      label: ch
        ? `Chain×Country · ${chainName} in ${countryName}`
        : `No Chain×Country rule for ${chainName} in ${countryName}` });
  } else {
    walk.push({ tier: 'chain', matched: false, pct: undefined,
      label: 'No chain affiliation — Chain×Country tier skipped' });
  }
  if (ch) return { tier: 'chain', pct: ch.pct, label: `Chain×Country · ${mrChainById(ch.target)?.name} in ${countryName}`, walk };

  // Tier 3 — Category × Country (star rating scoped to hotel's country)
  const ct = MR_STATE.category.find(r => h.categories.includes(r.target) && r.country === h.country);
  walk.push({ tier: 'category', matched: !!ct, pct: ct?.pct,
    label: ct
      ? `Category×Country · ${mrCategoryById(ct.target)?.name} in ${countryName}`
      : `No Category×Country rule for ${h.stars}★ in ${countryName}` });
  if (ct) return { tier: 'category', pct: ct.pct, label: `Category×Country · ${mrCategoryById(ct.target)?.name} in ${countryName}`, walk };

  // Tier 4 — Country (all hotels in this country)
  const co = MR_STATE.country.find(r => r.target === h.country);
  walk.push({ tier: 'country', matched: !!co, pct: co?.pct,
    label: co
      ? `Country · ${countryName}`
      : `No country rule for ${countryName}` });
  if (co) return { tier: 'country', pct: co.pct, label: `Country · ${countryName}`, walk };

  // Tier 5 — Default
  walk.push({ tier: 'default', matched: true, pct: MR_DEFAULT, label: 'Default markup (catch-all)' });
  return { tier: 'default', pct: MR_DEFAULT, label: 'Default markup (no rule matched)', walk };
}

/* ---------- Cascade preview widget (hero) ---------- */
function mrPreviewUpdate() {
  const sel = document.getElementById('mr-preview-hotel');
  const out = document.getElementById('mr-preview-cascade');
  if (!sel || !out) return;
  const key = sel.value;
  const r = mrResolveForHotel(key);
  const supplierNet = 200;
  const customerPay = (supplierNet * (1 + r.pct / 100)).toFixed(2);
  const tierColorMap = { hotel: 'mr-tier-hotel', chain: 'mr-tier-chain', category: 'mr-tier-category', country: 'mr-tier-country', default: 'mr-tier-default' };

  // Build cascade walk rows
  const walkRows = (r.walk || []).map(step => {
    const isWinner = step.matched;
    const icon = isWinner
      ? `<span class="mr-walk-icon mr-walk-icon--hit"><i class="ti ti-check"></i></span>`
      : `<span class="mr-walk-icon mr-walk-icon--miss"><i class="ti ti-x"></i></span>`;
    const badge = `<span class="mr-tier-badge ${tierColorMap[step.tier]}" style="margin-left:0"><i class="ti ${MR_TIER_ICONS[step.tier]}"></i> ${MR_TIER_LABELS[step.tier]}</span>`;
    const pctCol = isWinner ? `<strong class="mr-walk-pct">${step.pct}%</strong>` : `<span class="mr-walk-pct--miss">—</span>`;
    return `<tr class="mr-walk-row${isWinner ? ' mr-walk-row--winner' : ''}">
      <td>${icon}</td>
      <td>${badge}</td>
      <td class="mr-walk-label">${step.label}</td>
      <td>${pctCol}</td>
    </tr>`;
  }).join('');

  out.innerHTML = `
    <div class="mr-preview-price-row">
      <div class="mr-preview-step">
        <span class="mr-preview-step-label">Ergos supplier net</span>
        <span class="mr-preview-step-val">$${supplierNet.toFixed(2)}</span>
        <span class="mr-preview-step-source">$200 demo reference</span>
      </div>
      <div class="mr-preview-arrow"><i class="ti ti-arrow-right"></i></div>
      <div class="mr-preview-step">
        <span class="mr-preview-step-label">Markup applied</span>
        <span class="mr-preview-step-val">+${r.pct}%</span>
        <span class="mr-preview-step-source">${r.label}</span>
      </div>
      <div class="mr-preview-arrow"><i class="ti ti-arrow-right"></i></div>
      <div class="mr-preview-step mr-preview-step--total">
        <span class="mr-preview-step-label">Customer pays</span>
        <span class="mr-preview-step-val">$${customerPay}</span>
        <span class="mr-preview-step-source">your retail price</span>
      </div>
    </div>
    <div class="mr-preview-walk-label">Resolution walk — rules checked in order</div>
    <table class="mr-walk-table">
      <tbody>${walkRows}</tbody>
    </table>
    <div class="mr-preview-applied">
      <span class="mr-tier-badge ${tierColorMap[r.tier]}"><i class="ti ${MR_TIER_ICONS[r.tier]}"></i> ${MR_TIER_LABELS[r.tier]}</span>
      <span>Rule applied: <strong>${r.label}</strong>. Add a more-specific rule in the sections below to override.</span>
    </div>`;
}

/* Shared icon + label map — keeps tier styling consistent everywhere.
   Order: Hotel(1) > Chain×Country(2) > Category×Country(3) > Country(4) > Default(5) */
const MR_TIER_ICONS = {
  hotel:    'ti-bed',
  chain:    'ti-building-skyscraper',
  category: 'ti-star',
  country:  'ti-world',
  default:  'ti-asterisk',
};
const MR_TIER_LABELS = {
  hotel:    'Tier 1 — per hotel',
  chain:    'Tier 2 — chain × country',
  category: 'Tier 3 — category × country',
  country:  'Tier 4 — country',
  default:  'Tier 5 — catch-all',
};

/* ---------- Hotel cascading picker ----------
   Injected into the drawer when tier = hotel.
   DOM structure (created once, reused across open/close cycles):
     #mr-hotel-picker
       .mr-hp-filters          — Country | City | Stars | Name search
       .mr-hp-results          — scrollable list of matched hotels
       #mr-hotel-picker-selected  — hidden input, value = selected hotel name
*/

function mrHotelPickerInit() {
  const fieldEl = document.getElementById('mr-target-label')?.closest('.acct-field');
  if (!fieldEl) return;

  // Reuse existing picker if already created; just show it and reset.
  let picker = document.getElementById('mr-hotel-picker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'mr-hotel-picker';
    picker.innerHTML = `
      <p class="mr-hp-hint"><i class="ti ti-info-circle"></i> Per-hotel rules are the exception — most hotels are priced by the broader tiers above. Use this to pin a specific property.</p>
      <div class="mr-hp-filters">
        <div class="mr-hp-filter-row">
          <div class="mr-hp-filter-cell">
            <label class="mr-hp-filter-label">Country</label>
            <select id="mr-hp-country" onchange="mrHotelPickerFilter()">
              <option value="">All countries</option>
              ${MR_COUNTRIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="mr-hp-filter-cell">
            <label class="mr-hp-filter-label">City</label>
            <select id="mr-hp-city" onchange="mrHotelPickerFilter()" disabled>
              <option value="">All cities</option>
            </select>
          </div>
          <div class="mr-hp-filter-cell">
            <label class="mr-hp-filter-label">Stars</label>
            <select id="mr-hp-stars" onchange="mrHotelPickerFilter()">
              <option value="">Any</option>
              <option value="5">5 ★</option>
              <option value="4">4 ★</option>
              <option value="3">3 ★</option>
            </select>
          </div>
        </div>
        <div class="mr-hp-search-row">
          <i class="ti ti-search mr-hp-search-icon"></i>
          <input type="text" id="mr-hp-name" placeholder="Search by name (works without a country)" oninput="mrHotelPickerFilter()">
        </div>
      </div>
      <div class="mr-hp-results" id="mr-hp-results">
        <!-- populated by mrHotelPickerRender() -->
      </div>
      <input type="hidden" id="mr-hotel-picker-selected" value="">
    `;
    fieldEl.appendChild(picker);
  }

  picker.style.display = '';
  // Reset filters
  document.getElementById('mr-hp-country').value = '';
  document.getElementById('mr-hp-city').value = '';
  document.getElementById('mr-hp-city').disabled = true;
  document.getElementById('mr-hp-stars').value = '';
  document.getElementById('mr-hp-name').value = '';
  document.getElementById('mr-hotel-picker-selected').value = '';
  mrHotelPickerRender();
}

function mrHotelPickerFilter() {
  const country = document.getElementById('mr-hp-country')?.value || '';
  const cityEl = document.getElementById('mr-hp-city');

  // Repopulate city options for selected country
  if (cityEl) {
    const cities = country
      ? [...new Set(Object.values(MR_DEMO_HOTELS).filter(h => h.country === country).map(h => h.city))].sort()
      : [];
    const prevCity = cityEl.value;
    cityEl.innerHTML = `<option value="">All cities</option>` + cities.map(c => `<option value="${c}">${c}</option>`).join('');
    cityEl.disabled = !country;
    // Restore selection if city still in list
    if (cities.includes(prevCity)) cityEl.value = prevCity;
  }

  mrHotelPickerRender();
}

function mrHotelPickerRender() {
  const country = document.getElementById('mr-hp-country')?.value || '';
  const city = document.getElementById('mr-hp-city')?.value || '';
  const stars = document.getElementById('mr-hp-stars')?.value || '';
  const name = (document.getElementById('mr-hp-name')?.value || '').toLowerCase().trim();
  const selectedName = document.getElementById('mr-hotel-picker-selected')?.value || '';

  const results = Object.values(MR_DEMO_HOTELS).filter(h => {
    if (country && h.country !== country) return false;
    if (city && h.city !== city) return false;
    if (stars && h.stars !== stars) return false;
    if (name && !h.name.toLowerCase().includes(name)) return false;
    return true;
  });

  const resultsEl = document.getElementById('mr-hp-results');
  if (!resultsEl) return;

  if (results.length === 0) {
    resultsEl.innerHTML = `<div class="mr-hp-empty"><i class="ti ti-mood-empty"></i> No hotels match these filters.</div>`;
    return;
  }

  const countLabel = `<div class="mr-hp-count">${results.length} hotel${results.length !== 1 ? 's' : ''}</div>`;
  const rows = results.map(h => {
    const isSelected = h.name === selectedName;
    const countryName = mrCountryById(h.country)?.name || h.country;
    const chain = h.chainId ? mrChainById(h.chainId)?.name : null;
    const stars = '★'.repeat(parseInt(h.stars, 10));
    return `<button class="mr-hp-row${isSelected ? ' mr-hp-row--selected' : ''}" onclick="mrHotelPickerSelect(${JSON.stringify(h.name)})">
      <span class="mr-hp-name">${h.name}</span>
      <span class="mr-hp-meta">${h.city}, ${countryName} · <span class="mr-hp-stars">${stars}</span>${chain ? ` · ${chain}` : ''}</span>
      ${isSelected ? `<span class="mr-hp-check"><i class="ti ti-check"></i></span>` : ''}
    </button>`;
  }).join('');

  resultsEl.innerHTML = countLabel + rows;
}

function mrHotelPickerSelect(hotelName) {
  const hidden = document.getElementById('mr-hotel-picker-selected');
  if (hidden) hidden.value = hotelName;
  mrHotelPickerRender();   // re-render to show the selection highlight
  mrCoverageUpdate();
}

/* ---------- Country-card renderer ----------
   Builds one collapsible <details> card per configured country.
   Within each card, in order: country rate row, category sub-rules,
   chain sub-rules, per-hotel overrides. */

function mrRenderAll() {
  mrRenderCountryCards();
  mrPreviewUpdate();
  const ref = document.getElementById('mr-default-ref');
  if (ref) ref.textContent = MR_DEFAULT + '%';
}

/* Build the full "Markup by country" section */
function mrRenderCountryCards() {
  const container = document.getElementById('mr-country-cards');
  if (!container) return;

  // Collect all configured country ids (from country rules, chain rules, category rules, hotel rules)
  const configured = new Set();
  MR_STATE.country.forEach(r => configured.add(r.target));
  MR_STATE.chain.forEach(r => configured.add(r.country));
  MR_STATE.category.forEach(r => configured.add(r.country));
  MR_STATE.hotel.forEach(r => {
    const demo = Object.values(MR_DEMO_HOTELS).find(h => h.name === r.target);
    if (demo) configured.add(demo.country);
  });

  if (configured.size === 0) {
    container.innerHTML = `<div class="mr-empty-row" style="padding:24px 20px;background:#fff;border-radius:12px;border:1px dashed var(--warm-200)">
      <span>No country rules yet.</span> Click <strong>+ Add country</strong> to get started.
    </div>`;
    return;
  }

  // Sort alphabetically by country name
  const sorted = [...configured].sort((a, b) => {
    const na = mrCountryById(a)?.name || a;
    const nb = mrCountryById(b)?.name || b;
    return na.localeCompare(nb);
  });

  container.innerHTML = sorted.map(countryId => mrBuildCountryCard(countryId)).join('');
}

function mrBuildCountryCard(countryId) {
  const countryMeta = mrCountryById(countryId);
  const countryName = countryMeta?.name || countryId;
  const countryRule = MR_STATE.country.find(r => r.target === countryId);
  const chainRules = MR_STATE.chain.filter(r => r.country === countryId);
  const catRules = MR_STATE.category.filter(r => r.country === countryId);
  const hotelRules = MR_STATE.hotel.filter(r => {
    const demo = Object.values(MR_DEMO_HOTELS).find(h => h.name === r.target);
    return demo && demo.country === countryId;
  });
  const subRuleCount = chainRules.length + catRules.length + hotelRules.length;

  // Country rate row
  const countryRateRow = countryRule
    ? `<div class="mr-cc-rate-row">
        <div class="mr-cc-rate-label"><i class="ti ti-world"></i> Country rate</div>
        <div class="mr-cc-rate-val">
          <span class="${mrPctClass(countryRule.pct)}">${countryRule.pct}%</span>
          ${mrDeltaStr(countryRule.pct)}
          <span class="mr-cc-meta">${countryRule.updated} by ${countryRule.by}</span>
        </div>
        <div class="mr-cc-rate-actions">
          <button class="mr-icon-btn" title="Edit country rate" onclick="mrEditRule('${countryRule.id}','country')">✎</button>
          <button class="mr-icon-btn mr-icon-danger" title="Delete" onclick="mrDeleteRule('${countryRule.id}','country')">🗑</button>
        </div>
      </div>`
    : `<div class="mr-cc-rate-row mr-cc-rate-row--none">
        <div class="mr-cc-rate-label"><i class="ti ti-world"></i> Country rate</div>
        <span class="mr-cc-no-rate">No country rate — sub-rules will fall through to Default.</span>
        <button class="mr-tier-add" style="margin-left:auto" onclick="mrOpenDrawer({type:'country',lockedCountry:'${countryId}'})"><i class="ti ti-plus"></i> Set rate</button>
      </div>`;

  // Category sub-rules table
  const catRows = catRules.length === 0
    ? `<tr class="mr-empty-row"><td colspan="5"><span>No category rules for ${countryName}.</span></td></tr>`
    : catRules.map(r => {
        const c = mrCategoryById(r.target);
        if (!c) return '';
        return `<tr data-rule-id="${r.id}">
          <td><strong>${c.name}</strong><span class="mr-hotel-city">Category × ${countryName}</span></td>
          <td><span class="mr-coverage-badge mr-coverage-badge-warn">${c.count} hotels graded</span></td>
          <td class="${mrPctClass(r.pct)}" style="text-align:right">${r.pct}%</td>
          <td style="text-align:right">${mrDeltaStr(r.pct)}</td>
          <td>${r.updated} by ${r.by}</td>
          <td class="mr-actions" style="text-align:right">
            <button class="mr-icon-btn" title="Edit" onclick="mrEditRule('${r.id}','category')">✎</button>
            <button class="mr-icon-btn mr-icon-danger" title="Delete" onclick="mrDeleteRule('${r.id}','category')">🗑</button>
          </td>
        </tr>`;
      }).join('');

  // Chain sub-rules table
  const chainRows = chainRules.length === 0
    ? `<tr class="mr-empty-row"><td colspan="5"><span>No chain rules for ${countryName}.</span></td></tr>`
    : chainRules.map(r => {
        const c = mrChainById(r.target);
        if (!c) return '';
        const cov = `<span class="mr-coverage-badge">${c.count} hotels linked${c.candidates ? `, ${c.candidates} pending` : ''}</span>`;
        return `<tr data-rule-id="${r.id}">
          <td><strong>${c.name}</strong><span class="mr-hotel-city">Chain × ${countryName}</span></td>
          <td>${cov}</td>
          <td class="${mrPctClass(r.pct)}" style="text-align:right">${r.pct}%</td>
          <td style="text-align:right">${mrDeltaStr(r.pct)}</td>
          <td>${r.updated} by ${r.by}</td>
          <td class="mr-actions" style="text-align:right">
            <button class="mr-icon-btn" title="Edit" onclick="mrEditRule('${r.id}','chain')">✎</button>
            <button class="mr-icon-btn mr-icon-danger" title="Delete" onclick="mrDeleteRule('${r.id}','chain')">🗑</button>
          </td>
        </tr>`;
      }).join('');

  // Hotel override sub-rules table
  const hotelRows = hotelRules.length === 0
    ? `<tr class="mr-empty-row"><td colspan="5"><span>No per-hotel overrides for ${countryName}.</span></td></tr>`
    : hotelRules.map(r => `<tr data-rule-id="${r.id}">
        <td><strong>${r.target}</strong><span class="mr-hotel-city">${r.city || countryName}</span></td>
        <td><span class="mr-coverage-badge">1 hotel (exact)</span></td>
        <td class="${mrPctClass(r.pct)}" style="text-align:right">${r.pct}%</td>
        <td style="text-align:right">${mrDeltaStr(r.pct)}</td>
        <td>${r.updated} by ${r.by}</td>
        <td class="mr-actions" style="text-align:right">
          <button class="mr-icon-btn" title="Edit" onclick="mrEditRule('${r.id}','hotel')">✎</button>
          <button class="mr-icon-btn mr-icon-danger" title="Delete" onclick="mrDeleteRule('${r.id}','hotel')">🗑</button>
        </td>
      </tr>`).join('');

  const countryRateDisplay = countryRule ? `${countryRule.pct}%` : 'no rate';
  const subLabel = subRuleCount > 0 ? `${subRuleCount} sub-rule${subRuleCount !== 1 ? 's' : ''}` : 'no sub-rules';

  return `<details class="mr-tier-card mr-country-card" open>
    <summary class="mr-tier-head mr-tier-summary">
      <div style="flex:1;min-width:0">
        <h3><i class="ti ti-world tier-icon"></i>${countryName}
          <span class="mr-tier-badge mr-tier-country" style="margin-left:8px">${countryRateDisplay}</span>
        </h3>
        <p class="acct-help" style="margin-top:2px">${subLabel} · ${countryMeta?.count ?? '?'} hotels in catalog</p>
      </div>
      <div class="mr-cc-header-actions" onclick="event.stopPropagation()">
        <button class="mr-tier-add" onclick="mrOpenDrawer({type:'category',lockedCountry:'${countryId}'})"><i class="ti ti-plus"></i> Category</button>
        <button class="mr-tier-add" onclick="mrOpenDrawer({type:'chain',lockedCountry:'${countryId}'})"><i class="ti ti-plus"></i> Chain</button>
        <button class="mr-tier-add" onclick="mrOpenDrawer({type:'hotel',lockedCountry:'${countryId}'})"><i class="ti ti-plus"></i> Hotel</button>
      </div>
    </summary>

    <div class="mr-cc-body">
      ${countryRateRow}

      <div class="mr-cc-section">
        <div class="mr-cc-section-head">
          <span class="mr-tier-badge mr-tier-category"><i class="ti ti-star"></i> Category rules</span>
          <span class="mr-cc-section-count">${catRules.length}</span>
        </div>
        <table class="mr-table"><tbody>${catRows}</tbody></table>
      </div>

      <div class="mr-cc-section">
        <div class="mr-cc-section-head">
          <span class="mr-tier-badge mr-tier-chain"><i class="ti ti-building-skyscraper"></i> Chain rules</span>
          <span class="mr-cc-section-count">${chainRules.length}</span>
        </div>
        <table class="mr-table"><tbody>${chainRows}</tbody></table>
      </div>

      <div class="mr-cc-section">
        <div class="mr-cc-section-head">
          <span class="mr-tier-badge mr-tier-hotel"><i class="ti ti-bed"></i> Per-hotel overrides</span>
          <span class="mr-cc-section-count">${hotelRules.length}</span>
        </div>
        <table class="mr-table"><tbody>${hotelRows}</tbody></table>
      </div>
    </div>
  </details>`;
}

/* Legacy stubs — kept so any stray old onclick references don't crash */
function mrRenderChain() { mrRenderCountryCards(); }
function mrRenderCountry() { mrRenderCountryCards(); }
function mrRenderCategory() { mrRenderCountryCards(); }
function mrRenderHotel() { mrRenderCountryCards(); }
function mrFilterRules() {} // no-op — per-hotel is now inside country cards

/* ---------- Drawer state + handlers ---------- */
/* lockedCountry: when opening from inside a country card, pre-fill and lock
   the country field so the user just picks chain/category/hotel within it. */
let MR_DRAWER = { type: 'hotel', editId: null, lockedCountry: null };

function mrOpenDrawer(opts) {
  opts = opts || {};
  MR_DRAWER.type = opts.type || 'hotel';
  MR_DRAWER.editId = opts.editId || null;
  MR_DRAWER.lockedCountry = opts.lockedCountry || null;
  const drawer = document.getElementById('mr-create-drawer');
  if (!drawer) return;
  drawer.classList.add('open');
  document.getElementById('mr-drawer-title').textContent =
    (MR_DRAWER.editId ? 'Edit ' : 'Add ') + ({
      chain: 'chain rule', country: 'country rule', category: 'category rule', hotel: 'hotel override',
    }[MR_DRAWER.type]);
  mrSetType(MR_DRAWER.type);
  // Pre-fill on edit
  if (MR_DRAWER.editId) {
    const r = (MR_STATE[MR_DRAWER.type] || []).find(x => x.id === MR_DRAWER.editId);
    if (r) {
      document.getElementById('mr-pct-input').value = r.pct;
      if (MR_DRAWER.type === 'hotel') {
        const pickerSel = document.getElementById('mr-hotel-picker-selected');
        if (pickerSel) { pickerSel.value = r.target; mrHotelPickerRender(); }
      } else {
        const sel = document.getElementById('mr-target-select');
        if (sel) sel.value = r.target;
        // For chain/category edits, restore the country select
        if ((MR_DRAWER.type === 'chain' || MR_DRAWER.type === 'category') && r.country) {
          const cSel = document.getElementById('mr-country-select');
          if (cSel) cSel.value = r.country;
        }
      }
      mrCoverageUpdate();
    }
  } else {
    document.getElementById('mr-pct-input').value = 18;
    document.getElementById('mr-note-input').value = '';
  }
}
function mrCloseDrawer() {
  document.getElementById('mr-create-drawer')?.classList.remove('open');
  MR_DRAWER.editId = null;
}
function mrSetType(type) {
  MR_DRAWER.type = type;
  document.querySelectorAll('#mr-type-toggle .mr-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  const sel = document.getElementById('mr-target-select');
  const lbl = document.getElementById('mr-target-label');
  const help = document.getElementById('mr-target-help');
  if (!sel || !lbl) return;
  const opts = {
    chain:    { label: 'Hotel chain',  help: 'Markup applies to every hotel in this chain within the selected country.', items: MR_CHAINS },
    country:  { label: 'Country',      help: 'Markup applies to every hotel in this country.', items: MR_COUNTRIES },
    category: { label: 'Star rating',  help: 'Markup applies to every hotel with this star rating in the selected country.', items: MR_CATEGORIES },
    hotel:    { label: 'Hotel',        help: 'Markup applies only to this specific hotel.', items: null },
  }[type];
  lbl.textContent = opts.label;
  help.textContent = opts.help;

  // Show/hide the country-scoping row for chain and category types
  const countryRow = document.getElementById('mr-country-row');
  const countrySelEl = document.getElementById('mr-country-select');
  if (countryRow && countrySelEl) {
    const needsCountry = (type === 'chain' || type === 'category');
    countryRow.style.display = needsCountry ? '' : 'none';
    if (needsCountry && MR_DRAWER.lockedCountry) {
      countrySelEl.value = MR_DRAWER.lockedCountry;
      countrySelEl.disabled = true;
    } else if (needsCountry) {
      countrySelEl.disabled = false;
    }
  }

  // Show/hide hotel picker for country type — only country select shown
  if (type === 'hotel') {
    // Lock hotel picker country if coming from a country card
    if (MR_DRAWER.lockedCountry) {
      // Pre-set country in picker and lock it
      const hpCountry = document.getElementById('mr-hp-country');
      sel.style.display = 'none';
      mrHotelPickerInit();
      if (hpCountry) {
        hpCountry.value = MR_DRAWER.lockedCountry;
        hpCountry.disabled = true;
        mrHotelPickerFilter();
      }
    } else {
      sel.style.display = 'none';
      // Ensure country picker is unlocked
      const hpCountry = document.getElementById('mr-hp-country');
      if (hpCountry) hpCountry.disabled = false;
      mrHotelPickerInit();
    }
  } else {
    const picker = document.getElementById('mr-hotel-picker');
    if (picker) picker.style.display = 'none';
    // Re-enable hotel picker country for next time
    const hpCountry = document.getElementById('mr-hp-country');
    if (hpCountry) hpCountry.disabled = false;
  }

  if (opts.items) {
    sel.innerHTML = opts.items.map(o =>
      `<option value="${o.id}">${o.name}${o.count != null ? ` — ${o.count} hotels` : ''}</option>`
    ).join('');
    sel.style.display = type === 'hotel' ? 'none' : '';
  }
  mrCoverageUpdate();
}
function mrCoverageUpdate() {
  const cov = document.getElementById('mr-coverage');
  if (!cov) return;
  const sel = document.getElementById('mr-target-select');
  const val = sel?.value || '';
  const countrySelEl = document.getElementById('mr-country-select');
  const scopedCountryId = countrySelEl?.value || '';
  const scopedCountryName = mrCountryById(scopedCountryId)?.name || scopedCountryId;
  let html = '';
  if (MR_DRAWER.type === 'chain') {
    const c = mrChainById(val); if (!c) return;
    const scope = scopedCountryId ? ` in <strong>${scopedCountryName}</strong>` : ' (select a country)';
    html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> This rule will apply to ${c.count} ${c.name} hotels${scope}</div>
      <div class="mr-coverage-stats">${c.count} hotels linked to <strong>${c.name}</strong>${
        c.candidates ? ` · <span class="mr-coverage-warn">${c.candidates} likely-${c.name} hotels not yet linked — <a onclick="protoToast('Re-link request sent to Ergos staff', 'info')">request a re-link?</a></span>` : ' · all caught up.'}</div>`;
  } else if (MR_DRAWER.type === 'country') {
    const c = mrCountryById(val); if (!c) return;
    html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> This rule will apply to ${c.count} hotels</div>
      <div class="mr-coverage-stats">${c.count} hotels in <strong>${c.name}</strong>. 100% coverage — every hotel has a country.</div>`;
  } else if (MR_DRAWER.type === 'category') {
    const c = mrCategoryById(val); if (!c) return;
    const scope = scopedCountryId ? ` in <strong>${scopedCountryName}</strong>` : ' (select a country)';
    html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> This rule will apply to ${c.name} hotels${scope}</div>
      <div class="mr-coverage-stats">${c.count} hotels graded as <strong>${c.name}</strong> total. <span class="mr-coverage-warn">Hotels without a star rating fall through to the country or default tier.</span></div>`;
  } else if (MR_DRAWER.type === 'hotel') {
    const pickerSel = document.getElementById('mr-hotel-picker-selected');
    const selName = pickerSel ? pickerSel.value : '';
    if (selName) {
      const h = Object.values(MR_DEMO_HOTELS).find(x => x.name === selName);
      const cityStr = h ? `${h.city}, ${mrCountryById(h.country)?.name || h.country}` : '';
      html = `<div class="mr-coverage-title"><i class="ti ti-bed"></i> 1 hotel selected</div>
        <div class="mr-coverage-stats"><strong>${selName}</strong>${cityStr ? ` · ${cityStr}` : ''} · Tier 1 — overrides every other rule.</div>`;
    } else {
      html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> No hotel selected yet</div>
        <div class="mr-coverage-stats">Use the filters above to find and pick a specific hotel. Most surgical option — beats every rule above.</div>`;
    }
  }
  cov.innerHTML = html;
}
function mrSaveRule() {
  const pct = parseInt(document.getElementById('mr-pct-input')?.value || '0', 10);
  if (isNaN(pct) || pct < 0 || pct > 200) { protoToast('Markup must be a whole number 0–200', 'error'); return; }
  let target, hotelCity, ruleCountry;
  if (MR_DRAWER.type === 'hotel') {
    const pickerSel = document.getElementById('mr-hotel-picker-selected');
    target = (pickerSel?.value || '').trim();
    if (!target) { protoToast('Select a hotel from the picker before saving', 'error'); return; }
    const h = Object.values(MR_DEMO_HOTELS).find(x => x.name === target);
    hotelCity = h ? `${h.city}, ${mrCountryById(h.country)?.name || h.country}` : 'Per-hotel';
  } else {
    const sel = document.getElementById('mr-target-select');
    target = (sel?.value || '').trim();
    if (!target) { protoToast('Pick a target before saving', 'error'); return; }
    // Chain and category require a country scope
    if (MR_DRAWER.type === 'chain' || MR_DRAWER.type === 'category') {
      const cSel = document.getElementById('mr-country-select');
      ruleCountry = (cSel?.value || '').trim();
      if (!ruleCountry) { protoToast('Select a country to scope this rule', 'error'); return; }
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  if (MR_DRAWER.editId) {
    const list = MR_STATE[MR_DRAWER.type];
    const r = list.find(x => x.id === MR_DRAWER.editId);
    if (r) {
      r.pct = pct; r.target = target; r.updated = today; r.by = 'patria@';
      if (ruleCountry) r.country = ruleCountry;
    }
    protoToast('Rule updated · audited as ' + today, 'success');
  } else {
    const newRule = {
      id: 'r-' + MR_DRAWER.type[0] + Date.now(),
      tier: MR_DRAWER.type,
      target,
      pct,
      updated: today,
      by: 'patria@',
    };
    if (MR_DRAWER.type === 'hotel') newRule.city = hotelCity || 'Per-hotel';
    if (ruleCountry) newRule.country = ruleCountry;
    MR_STATE[MR_DRAWER.type].push(newRule);
    let displayTarget = target;
    const cName = ruleCountry ? ` in ${mrCountryById(ruleCountry)?.name || ruleCountry}` : '';
    if (MR_DRAWER.type === 'chain') displayTarget = (mrChainById(target)?.name || target) + cName;
    else if (MR_DRAWER.type === 'country') displayTarget = mrCountryById(target)?.name || target;
    else if (MR_DRAWER.type === 'category') displayTarget = (mrCategoryById(target)?.name || target) + cName;
    protoToast(`Rule added: ${MR_DRAWER.type} — ${displayTarget} at ${pct}% · audited`, 'success');
  }
  mrRenderAll();
  mrCloseDrawer();
}
function mrEditRule(id, type) {
  mrOpenDrawer({ type, editId: id });
}
function mrDeleteRule(id, type) {
  const r = MR_STATE[type].find(x => x.id === id);
  if (!r) return;
  let displayTarget = r.target;
  if (type === 'chain') {
    const cName = mrCountryById(r.country)?.name || r.country || '';
    displayTarget = (mrChainById(r.target)?.name || r.target) + (cName ? ` in ${cName}` : '');
  } else if (type === 'country') {
    displayTarget = mrCountryById(r.target)?.name || r.target;
  } else if (type === 'category') {
    const cName = mrCountryById(r.country)?.name || r.country || '';
    displayTarget = (mrCategoryById(r.target)?.name || r.target) + (cName ? ` in ${cName}` : '');
  }
  if (!confirm(`Delete the ${type} rule for "${displayTarget}"? This action is audited.`)) return;
  MR_STATE[type] = MR_STATE[type].filter(x => x.id !== id);
  mrRenderAll();
  protoToast(`${type} rule deleted · audited`, 'warn');
}
function mrFilterRules(q) {
  const term = (q || '').toLowerCase().trim();
  document.querySelectorAll('#mr-table-hotel tbody tr').forEach(tr => {
    const name = tr.querySelector('td:nth-child(1) strong')?.textContent?.toLowerCase() || '';
    tr.style.display = (!term || name.includes(term)) ? '' : 'none';
  });
}
function mrSaveDefault() {
  const input = document.getElementById('mr-default-input');
  const pct = parseInt(input?.value || '0', 10);
  if (isNaN(pct) || pct < 0 || pct > 200) { protoToast('Default markup must be 0–200', 'error'); return; }
  MR_DEFAULT = pct;
  mrRenderAll();
  protoToast('Default markup saved at ' + pct + '%', 'success');
}

/* ---------- Render on first visit to the screen ---------- */
(function () {
  // Wrap the existing showScreen so navigating to markup-rules auto-renders.
  if (typeof showScreen !== 'function') return;
  const orig = showScreen;
  window.showScreen = function (id) {
    orig.apply(this, arguments);
    if (id === 'markup-rules') {
      setTimeout(mrRenderAll, 30);
    }
  };
})();

/* ---------- B1/B2: P&L — CSV export + remittance interactions ---------- */
function pnlExportCsv() {
  const rows = [['Booking','Hotel','Check-in','Ergos cost','Customer paid','Markup','Rebate','Profit']];
  document.querySelectorAll('#screen-pnl .pnl-table tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g,' ').trim());
    rows.push(cells);
  });
  triggerCsvDownload(rows, 'ergos-pnl.csv');
  protoToast('Exported ' + (rows.length - 1) + ' bookings to ergos-pnl.csv', 'success');
}
function remExportCsv() {
  const rows = [['Period','Amount','Due date','Status','Paid at','Reference']];
  document.querySelectorAll('#rem-history .rem-history-table tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g,' ').trim());
    rows.push(cells);
  });
  triggerCsvDownload(rows, 'ergos-remittances.csv');
  protoToast('Exported ' + (rows.length - 1) + ' remittance cycles', 'success');
}
function triggerCsvDownload(rows, filename) {
  const csv = rows.map(r => r.map(c => /[,"\n]/.test(c) ? '"' + c.replace(/"/g,'""') + '"' : c).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
function pnlRefresh() {
  protoToast('Refreshed — last updated just now', 'info');
}

/* ---------- A2: Ergos cost tooltip is title-attr based, no JS needed ---------- */

/* ---------- Search-form actions on home ---------- */
// (existing app.js handles these — no change)

/* ---------- Keyboard escape closes any open modal/drawer ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.mr-drawer.open, .fr-modal.open').forEach(el => el.classList.remove('open'));
  }
});

/* ============================================================
   Dead-button handlers — fills in actions for buttons that had
   no onclick (login passkey, profile, password, employees,
   passkeys, bookings export, rebook).
   All side-effects are client-only (toast + DOM mutation +
   optional screen-switch). Mirrors the look-and-feel of
   handlers earlier in this file so the prototype reads as a
   complete app.
   ============================================================ */

function loginWithPasskey() {
  protoToast('Verifying with your passkey…', 'info');
  setTimeout(() => {
    protoToast('Signed in via passkey — welcome back', 'success');
    showScreen('home');
  }, 700);
}

function profileToggleEdit(btn) {
  const fields = document.querySelectorAll('#screen-profile-info .acct-form-grid input');
  const isEditing = btn.dataset.editing === '1';
  fields.forEach(f => { if (isEditing) f.setAttribute('readonly', ''); else f.removeAttribute('readonly'); });
  if (isEditing) {
    btn.innerHTML = '<i class="ti ti-edit"></i> Edit Profile';
    btn.dataset.editing = '';
    protoToast('Profile changes saved', 'success');
  } else {
    btn.innerHTML = '<i class="ti ti-check"></i> Save Profile';
    btn.dataset.editing = '1';
    fields[0]?.focus();
  }
}

function profileSaveDefaultMarkup(btn) {
  const input = btn.closest('.acct-markup-row')?.querySelector('input[type="number"]');
  const pct = parseInt(input?.value || '0', 10);
  if (isNaN(pct) || pct < 0 || pct > 200) { protoToast('Markup must be a whole number 0–200', 'error'); return; }
  protoToast('Default markup saved at ' + pct + '% · applies to all hotels with no override', 'success');
}

function updatePasswordSubmit() {
  const inputs = document.querySelectorAll('#screen-update-password input[type="password"]');
  if (inputs.length < 2) { protoToast('Password form not found', 'error'); return; }
  const current = inputs[0].value;
  const next = inputs[1].value;
  const confirm = inputs[2]?.value;
  if (!current || !next) { protoToast('Fill in current + new password', 'error'); return; }
  if (next.length < 8) { protoToast('New password must be at least 8 characters', 'error'); return; }
  if (confirm != null && next !== confirm) { protoToast('Passwords don\'t match', 'error'); return; }
  inputs.forEach(i => (i.value = ''));
  protoToast('Password updated · you remain signed in on this device', 'success');
}

function inviteEmployee() {
  const email = prompt('Invite teammate by email:');
  if (!email) return;
  if (!/.+@.+\..+/.test(email)) { protoToast('Enter a valid email address', 'error'); return; }
  // Append to invitations list if visible, else just toast
  const inviteTab = document.querySelector('#screen-employees .emp-tab:nth-child(2)');
  if (inviteTab) {
    const m = inviteTab.textContent.match(/\((\d+)\)/);
    if (m) inviteTab.innerHTML = inviteTab.innerHTML.replace(/\(\d+\)/, '(' + (parseInt(m[1], 10) + 1) + ')');
  }
  protoToast('Invitation sent to ' + email + ' · expires in 14 days', 'success');
}

function empSwitchTab(btn, which) {
  document.querySelectorAll('#screen-employees .emp-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  // Toggle which list is visible (the existing list is "employees"; we fake
  // an invitations placeholder when needed)
  const empTable = document.querySelector('#screen-employees .emp-table-card');
  const invitePlaceholder = document.getElementById('emp-invite-placeholder');
  if (which === 'invitations') {
    if (empTable) empTable.style.display = 'none';
    if (!invitePlaceholder) {
      const div = document.createElement('div');
      div.id = 'emp-invite-placeholder';
      div.className = 'emp-table-card';
      div.style.padding = '40px';
      div.style.textAlign = 'center';
      div.style.color = 'var(--warm-500)';
      div.innerHTML = '<i class="ti ti-mail" style="font-size:32px"></i><p style="margin-top:12px">2 pending invitations · they expire in 14 days. The full list of invitations would render here.</p>';
      empTable?.parentNode?.insertBefore(div, empTable.nextSibling);
    } else {
      invitePlaceholder.style.display = '';
    }
  } else {
    if (empTable) empTable.style.display = '';
    if (invitePlaceholder) invitePlaceholder.style.display = 'none';
  }
}

function addPasskey() {
  protoToast('Touch your security key or use your device biometric…', 'info');
  setTimeout(() => {
    const tbody = document.querySelector('#screen-passkeys .emp-table tbody');
    if (tbody) {
      const today = new Date().toISOString().slice(0, 10);
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><i class="ti ti-shield-check"></i> New Device · ' + today + '</td><td>' + today + '</td><td><span class="pk-never">Just added</span></td><td><button class="pk-trash" onclick="deletePasskey(this)"><i class="ti ti-trash"></i></button></td>';
      tbody.appendChild(tr);
    }
    protoToast('Passkey registered · stored on this device only', 'success');
  }, 900);
}

function deletePasskey(btn) {
  const row = btn.closest('tr');
  if (!row) return;
  const name = row.querySelector('td:first-child')?.textContent?.trim() || 'passkey';
  if (!confirm('Delete passkey "' + name + '"? You will need another factor to sign in.')) return;
  row.style.transition = 'opacity 200ms';
  row.style.opacity = '0';
  setTimeout(() => row.remove(), 200);
  protoToast('Passkey deleted', 'warn');
}

function bookingsExportCsv() {
  const rows = [['Reference', 'Hotel', 'Check-in', 'Status', 'Total']];
  document.querySelectorAll('#screen-bookings .blc, #screen-bookings .booking-card').forEach(card => {
    const ref = card.querySelector('.blc-ref, .booking-ref')?.textContent?.trim() || '';
    const hotel = card.querySelector('.blc-hotel, .booking-hotel')?.textContent?.trim() || '';
    const ci = card.querySelector('.blc-checkin, .booking-checkin')?.textContent?.trim() || '';
    const status = card.querySelector('.blc-status, .booking-status')?.textContent?.trim() || '';
    const total = card.querySelector('.blc-price, .booking-price')?.textContent?.trim() || '';
    if (ref) rows.push([ref, hotel, ci, status, total]);
  });
  // Fallback if no cards matched (selector drift)
  if (rows.length === 1) rows.push(['(demo)', 'No bookings rendered in this view', '', '', '']);
  triggerCsvDownload(rows, 'ergos-bookings.csv');
  protoToast('Exported ' + (rows.length - 1) + ' bookings', 'success');
}

function rebookFromHistory(btn) {
  const hotelName = btn.closest('.blc, .booking-card')?.querySelector('.blc-hotel, .booking-hotel')?.textContent?.trim();
  showScreen('home');
  protoToast(hotelName ? 'Start a new search for "' + hotelName + '" to rebook' : 'New search started', 'info');
}

/* ============================================================
   Navbar / topbar utility icons — global event delegation.
   These appear in multiple screens (help, language, notifications,
   avatar) and don't get rewired per-render, so delegation is the
   cleanest fix.
   ============================================================ */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.icon-btn, .rsb-edit');
  if (!btn || btn.getAttribute('onclick')) return;  // skip if already wired
  const title = btn.getAttribute('title') || btn.getAttribute('aria-label') || '';
  // Search-bar edit → re-open search
  if (btn.classList.contains('rsb-edit')) {
    showScreen('home');
    protoToast('Edit your search — pick new dates / destination', 'info');
    return;
  }
  // Help, language, notifications — toast describing the action
  if (/help/i.test(title) || btn.classList.contains('help-btn')) {
    protoToast('Help center · live chat · documentation — opens here in the full app', 'info');
    return;
  }
  if (/language|idioma/i.test(title)) {
    protoToast('Language picker · EN · ES · FR · DE — opens here in the full app', 'info');
    return;
  }
  if (/notification|alert/i.test(title)) {
    protoToast('You have 3 unread notifications · opens panel in the full app', 'info');
    return;
  }
  // Fallback for unlabeled icon-btn (avatar dropdowns, etc.) — switch to profile
  protoToast('Opening your account menu…', 'info');
  setTimeout(() => showScreen('profile-info'), 400);
});

/* ============================================================
   P&L ENHANCEMENTS (2026-06-03)
   - pnlDrilldown(metric): clicking a stat card scrolls to per-booking
     table + filters/highlights the contributing column
   - pnlSortBy(thEl, key, type): toggles asc/desc on the clicked
     column, sorts the per-booking tbody, syncs other th[data-sortable]
     visual state
   - remModifyStatus / remSaveModifyStatus: open a modal for the
     selected remittance row, allow changing status with audit reason
   ============================================================ */

const PNL_METRIC_COL = {
  profit: 8,          // Profit
  markup: 6,          // Markup
  rebate: 7,          // Rebate
  bookings: null,     // all bookings — no column highlight
};
const PNL_METRIC_LABEL = {
  profit: 'Total Profit',
  markup: 'Markup Income',
  rebate: 'Rebate Income',
  bookings: 'All Bookings',
};

function pnlDrilldown(metric) {
  const tbody = document.getElementById('pnl-tbody');
  if (!tbody) return;
  // Read the date range so the chip explains the scope
  const fromInput = document.querySelector('#screen-pnl .pnl-date-filter input[type="date"]:first-of-type, #screen-pnl .pnl-date-filter input[type="date"]');
  const dateInputs = document.querySelectorAll('#screen-pnl .pnl-date-filter input[type="date"]');
  const from = dateInputs[0]?.value || '—';
  const to = dateInputs[1]?.value || '—';

  // Filter rows: for "rebate" → only rows with rebate > 0 (non-"—"); others show all
  const rows = Array.from(tbody.querySelectorAll('tr'));
  let visible = 0;
  rows.forEach(tr => {
    const cells = tr.querySelectorAll('td');
    let show = true;
    if (metric === 'rebate') {
      const rebateCell = cells[6];
      show = rebateCell && !/^—/.test(rebateCell.textContent.trim());
    } else if (metric === 'markup') {
      const markupCell = cells[5];
      show = markupCell && !/^—/.test(markupCell.textContent.trim());
    } else if (metric === 'profit') {
      const profitCell = cells[7];
      show = profitCell && parseFloat(profitCell.textContent.replace(/[^0-9.]/g, '')) > 0;
    }
    // 'bookings' shows all
    tr.style.display = show ? '' : 'none';
    if (show) visible++;
    // Highlight the contributing column briefly
    tr.classList.remove('pnl-row-just-highlighted');
    void tr.offsetWidth;  // restart animation
    tr.classList.add('pnl-row-just-highlighted');
  });

  // Update the filter chip
  const chip = document.getElementById('pnl-filter-chip');
  if (chip) {
    chip.style.display = 'inline-block';
    chip.innerHTML = `Filtered: <strong>${PNL_METRIC_LABEL[metric]}</strong> · ${from} → ${to} · <strong>${visible}</strong> rows · <a onclick="pnlClearFilter()">Clear</a>`;
  }
  // Highlight target column in header
  document.querySelectorAll('#pnl-table th').forEach(th => th.classList.remove('pnl-th-spotlight'));
  const idx = PNL_METRIC_COL[metric];
  if (idx) {
    document.querySelector('#pnl-table th:nth-child(' + idx + ')')?.classList.add('pnl-th-spotlight');
  }
  // Scroll into view
  document.getElementById('pnl-table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  protoToast(`${PNL_METRIC_LABEL[metric]} — showing ${visible} bookings for selected period`, 'info');
}

function pnlClearFilter() {
  const tbody = document.getElementById('pnl-tbody');
  tbody?.querySelectorAll('tr').forEach(tr => tr.style.display = '');
  const chip = document.getElementById('pnl-filter-chip');
  if (chip) { chip.style.display = 'none'; chip.innerHTML = ''; }
  document.querySelectorAll('#pnl-table th').forEach(th => th.classList.remove('pnl-th-spotlight'));
  protoToast('Filter cleared', 'info');
}

function pnlSortBy(th, key, type) {
  const tbody = document.getElementById('pnl-tbody');
  if (!tbody) return;
  // Determine direction: toggle if same column, else asc
  const current = th.getAttribute('data-sort-active');
  const next = current === 'asc' ? 'desc' : 'asc';
  // Reset all headers
  document.querySelectorAll('#pnl-table th[data-sortable]').forEach(h => {
    h.removeAttribute('data-sort-active');
    h.removeAttribute('aria-sort');
  });
  th.setAttribute('data-sort-active', next);
  th.setAttribute('aria-sort', next === 'asc' ? 'ascending' : 'descending');

  const rows = Array.from(tbody.querySelectorAll('tr'));
  const colIdx = Array.from(th.parentNode.children).indexOf(th);
  const cellVal = (tr) => {
    const cell = tr.children[colIdx];
    if (!cell) return type === 'num' ? -Infinity : '';
    const text = cell.textContent.trim();
    if (type === 'num') {
      if (/^—/.test(text)) return -Infinity;
      const n = parseFloat(text.replace(/[^0-9.\-]/g, ''));
      return isNaN(n) ? -Infinity : n;
    }
    if (type === 'date') {
      const t = Date.parse(text);
      return isNaN(t) ? 0 : t;
    }
    return text.toLowerCase();
  };
  rows.sort((a, b) => {
    const av = cellVal(a), bv = cellVal(b);
    if (av < bv) return next === 'asc' ? -1 : 1;
    if (av > bv) return next === 'asc' ? 1 : -1;
    return 0;
  });
  rows.forEach(r => tbody.appendChild(r));
}

/* --- Remittance modify-status modal --- */
let _remStatusRow = null;
function remModifyStatus(btn) {
  _remStatusRow = btn.closest('tr');
  if (!_remStatusRow) return;
  const period = _remStatusRow.querySelector('td:first-child strong')?.textContent || '';
  const amount = _remStatusRow.querySelector('.rem-amt')?.textContent || '';
  const due = _remStatusRow.querySelector('td:nth-child(3)')?.textContent || '';
  const currentStatus = _remStatusRow.dataset.status || 'pending';
  const modal = document.getElementById('rem-status-modal');
  if (!modal) return;
  const summary = document.getElementById('rem-status-summary');
  if (summary) {
    summary.innerHTML = `<div><strong>${period}</strong> · ${amount} · due ${due}</div>
      <div style="margin-top:4px; font-size:12px">Currently <strong>${currentStatus}</strong>. Changes are immutably audited.</div>`;
  }
  document.getElementById('rem-status-new').value = currentStatus === 'paid' ? 'pending' : 'paid';
  document.getElementById('rem-status-ref').value = '';
  document.getElementById('rem-status-reason').value = '';
  modal.classList.add('open');
  setTimeout(() => document.getElementById('rem-status-reason').focus(), 80);
}
function remCloseModifyStatus() {
  document.getElementById('rem-status-modal')?.classList.remove('open');
  _remStatusRow = null;
}
function remSaveModifyStatus() {
  const newStatus = document.getElementById('rem-status-new')?.value;
  const ref = document.getElementById('rem-status-ref')?.value?.trim();
  const reason = document.getElementById('rem-status-reason')?.value?.trim();
  if (!newStatus) { protoToast('Pick a new status', 'error'); return; }
  if (newStatus === 'paid' && !ref) {
    protoToast('Wire reference required when marking paid', 'error');
    return;
  }
  if (!reason || reason.length < 6) {
    protoToast('Reason is required (audited) — please describe what changed', 'error');
    return;
  }
  if (_remStatusRow) {
    const statusCell = _remStatusRow.querySelector('td:nth-child(4)');
    const paidAtCell = _remStatusRow.querySelector('td:nth-child(5)');
    const refCell = _remStatusRow.querySelector('td:nth-child(6)');
    const oldStatus = _remStatusRow.dataset.status;
    if (statusCell) {
      let html;
      if (newStatus === 'paid') {
        html = '<span class="rem-status rem-status-paid"><i class="ti ti-check"></i> Paid</span>';
      } else if (newStatus === 'overdue') {
        html = '<span class="rem-status rem-status-overdue"><i class="ti ti-alert-triangle"></i> Paid late</span>';
      } else {
        html = '<span class="rem-status rem-status-pending"><i class="ti ti-clock-hour-4"></i> Pending</span>';
      }
      statusCell.innerHTML = html;
    }
    if (newStatus === 'paid' || newStatus === 'overdue') {
      const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
      if (paidAtCell) paidAtCell.textContent = ts;
      if (refCell) refCell.textContent = ref;
    } else {
      // Reverting to pending — clear paid-at + reference
      if (paidAtCell) paidAtCell.textContent = '—';
      if (refCell) refCell.textContent = '—';
    }
    _remStatusRow.dataset.status = newStatus;
    _remStatusRow.classList.remove('rem-row-just-changed');
    void _remStatusRow.offsetWidth;
    _remStatusRow.classList.add('rem-row-just-changed');
    _remStatusRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    protoToast(`Status changed: ${oldStatus} → ${newStatus} · "${reason.slice(0, 50)}${reason.length > 50 ? '…' : ''}" logged`, 'success');
  }
  remCloseModifyStatus();
}

/* Esc closes the modify-status modal */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('rem-status-modal')?.classList.remove('open');
  }
});
