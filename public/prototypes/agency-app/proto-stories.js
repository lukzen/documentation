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
   A1: Markup Rules — 4-tier cascade refactor
   Tiers (most specific → least): hotel · category · country · chain · default
   Demo data lives in JS; rule edits mutate JS state and re-render
   tables + cascade preview. Coverage badges read from the catalog
   stats below.
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
  { id: 'jm', name: 'Jamaica', count: 48 },
  { id: 'us', name: 'United States', count: 312 },
];
const MR_CATEGORIES = [
  { id: '5star', name: '5-star', count: 340 },
  { id: '5star-ai', name: '5-star · All-Inclusive', count: 185 },
  { id: '4star-ai', name: '4-star · All-Inclusive', count: 280 },
  { id: 'boutique', name: 'Boutique (< 50 rooms)', count: 180 },
  { id: 'family', name: 'Family-friendly', count: 412 },
];
const MR_DEMO_HOTELS = {
  'iberostar-grand-packard': { name: 'Iberostar Grand Packard', country: 'cu', chainId: 'iberostar', categories: ['5star', '5star-ai'] },
  'melia-las-antillas':      { name: 'Meliá Las Antillas',      country: 'cu', chainId: 'melia',     categories: ['4star-ai', 'family'] },
  'hyatt-ziva-cap-cana':     { name: 'Hyatt Ziva Cap Cana',     country: 'do', chainId: 'hyatt',     categories: ['5star', '5star-ai', 'family'] },
  'catalonia-royal-bavaro':  { name: 'Catalonia Royal Bávaro',  country: 'do', chainId: null,        categories: ['4star-ai'] },
  'paradores-leon':          { name: 'Parador de León',          country: 'es', chainId: null,        categories: ['boutique'] },
};

/* ---------- Mutable rules state ---------- */
let MR_DEFAULT = 15;
const MR_STATE = {
  chain: [
    { id: 'r-c1', tier: 'chain', target: 'iberostar', pct: 18, updated: '2026-05-29', by: 'patria@' },
    { id: 'r-c2', tier: 'chain', target: 'melia',     pct: 20, updated: '2026-05-26', by: 'patria@' },
  ],
  country: [
    { id: 'r-co1', tier: 'country', target: 'cu', pct: 12, updated: '2026-05-25', by: 'patria@' },
  ],
  category: [
    { id: 'r-ct1', tier: 'category', target: '5star-ai', pct: 25, updated: '2026-05-24', by: 'carlos@' },
  ],
  hotel: [
    { id: 'r-h1', tier: 'hotel', target: 'Iberostar Grand Packard', pct: 22, city: 'Havana, Cuba', updated: '2026-05-28', by: 'patria@' },
    { id: 'r-h2', tier: 'hotel', target: 'Hyatt Ziva Cap Cana',    pct: 25, city: 'Punta Cana, DR', updated: '2026-05-25', by: 'carlos@' },
    { id: 'r-h3', tier: 'hotel', target: 'Memories Varadero',     pct: 10, city: 'Varadero, Cuba', updated: '2026-05-22', by: 'patria@' },
    { id: 'r-h4', tier: 'hotel', target: 'Iberostar Selection Bávaro', pct: 20, city: 'Bávaro, DR', updated: '2026-05-18', by: 'patria@' },
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

/* ---------- Cascade resolver (most-specific wins) ---------- */
function mrResolveForHotel(hotelKey) {
  const h = MR_DEMO_HOTELS[hotelKey];
  if (!h) return { tier: 'default', pct: MR_DEFAULT, label: 'Default markup' };
  // Tier 1 — hotel override (exact name match)
  const ho = MR_STATE.hotel.find(r => r.target === h.name);
  if (ho) return { tier: 'hotel', pct: ho.pct, label: `Per-hotel override on ${h.name}` };
  // Tier 2 — category (any of the hotel's categories)
  const ct = MR_STATE.category.find(r => h.categories.includes(r.target));
  if (ct) return { tier: 'category', pct: ct.pct, label: `Category rule · ${mrCategoryById(ct.target)?.name}` };
  // Tier 3 — country
  const co = MR_STATE.country.find(r => r.target === h.country);
  if (co) return { tier: 'country', pct: co.pct, label: `Country rule · ${mrCountryById(co.target)?.name}` };
  // Tier 4 — chain
  const ch = MR_STATE.chain.find(r => r.target === h.chainId);
  if (ch) return { tier: 'chain', pct: ch.pct, label: `Chain rule · ${mrChainById(ch.target)?.name}` };
  // Tier 5 — default
  return { tier: 'default', pct: MR_DEFAULT, label: 'Default markup (no rule matched)' };
}

/* ---------- Cascade preview widget ---------- */
function mrPreviewUpdate() {
  const sel = document.getElementById('mr-preview-hotel');
  const out = document.getElementById('mr-preview-cascade');
  if (!sel || !out) return;
  const key = sel.value;
  const r = mrResolveForHotel(key);
  const supplierNet = 200;
  const customerPay = (supplierNet * (1 + r.pct / 100)).toFixed(2);
  const tierColors = { hotel: 'mr-tier-hotel', category: 'mr-tier-category', country: 'mr-tier-country', chain: 'mr-tier-chain', default: 'mr-tier-default' };
  out.innerHTML = `
    <div class="mr-preview-step">
      <span class="mr-preview-step-label">Ergos supplier net</span>
      <span class="mr-preview-step-val">$${supplierNet.toFixed(2)}</span>
      <span class="mr-preview-step-source">demo: $200 reference</span>
    </div>
    <div class="mr-preview-step">
      <span class="mr-preview-step-label">Markup applied</span>
      <span class="mr-preview-step-val">+${r.pct}%</span>
      <span class="mr-preview-step-source">${r.label}</span>
    </div>
    <div class="mr-preview-step">
      <span class="mr-preview-step-label">Customer pays</span>
      <span class="mr-preview-step-val">$${customerPay}</span>
      <span class="mr-preview-step-source">your retail price</span>
    </div>
    <div class="mr-preview-applied">
      <span class="mr-tier-badge ${tierColors[r.tier]}"><i class="ti ${MR_TIER_ICONS[r.tier]}"></i> ${MR_TIER_LABELS[r.tier]}</span>
      <span>Applied because <strong>${r.label}</strong>. Add or edit a more-specific rule above to override.</span>
    </div>`;
}

/* Shared icon + label map — keeps tier styling consistent everywhere */
const MR_TIER_ICONS = {
  hotel:    'ti-bed',
  category: 'ti-star',
  country:  'ti-world',
  chain:    'ti-building-skyscraper',
  default:  'ti-asterisk',
};
const MR_TIER_LABELS = {
  hotel:    'Tier 1 — most specific',
  category: 'Tier 2 — property type',
  country:  'Tier 3 — geographic',
  chain:    'Tier 4 — brand',
  default:  'Tier 5 — catch-all',
};

/* ---------- Table renderers ---------- */
function mrRenderAll() {
  mrRenderChain();
  mrRenderCountry();
  mrRenderCategory();
  mrRenderHotel();
  mrPreviewUpdate();
  // Update default reference in drawer
  const ref = document.getElementById('mr-default-ref');
  if (ref) ref.textContent = MR_DEFAULT + '%';
}
function mrRenderChain() {
  const tbody = document.querySelector('#mr-table-chain tbody');
  if (!tbody) return;
  if (MR_STATE.chain.length === 0) {
    tbody.innerHTML = `<tr class="mr-empty-row"><td colspan="5"><span>No chain rules yet.</span> Use "+ Chain" to set a brand-wide markup (e.g. Iberostar +18%).</td></tr>`;
    return;
  }
  tbody.innerHTML = MR_STATE.chain.map(r => {
    const c = mrChainById(r.target);
    if (!c) return '';
    const cov = `<span class="mr-coverage-badge">${c.count} hotels linked${c.candidates ? `, ${c.candidates} pending link` : ''}</span>`;
    return `<tr data-rule-id="${r.id}">
      <td><strong>${c.name}</strong><span class="mr-hotel-city">Tier 4 — brand</span></td>
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
}
function mrRenderCountry() {
  const tbody = document.querySelector('#mr-table-country tbody');
  if (!tbody) return;
  if (MR_STATE.country.length === 0) {
    tbody.innerHTML = `<tr class="mr-empty-row"><td colspan="5"><span>No country rules yet.</span> Use "+ Country" to set a geographic markup (e.g. Cuba +12%).</td></tr>`;
    return;
  }
  tbody.innerHTML = MR_STATE.country.map(r => {
    const c = mrCountryById(r.target);
    if (!c) return '';
    return `<tr data-rule-id="${r.id}">
      <td><strong>${c.name}</strong><span class="mr-hotel-city">Tier 3 — geographic</span></td>
      <td><span class="mr-coverage-badge">${c.count} hotels in country</span></td>
      <td class="${mrPctClass(r.pct)}" style="text-align:right">${r.pct}%</td>
      <td style="text-align:right">${mrDeltaStr(r.pct)}</td>
      <td>${r.updated} by ${r.by}</td>
      <td class="mr-actions" style="text-align:right">
        <button class="mr-icon-btn" title="Edit" onclick="mrEditRule('${r.id}','country')">✎</button>
        <button class="mr-icon-btn mr-icon-danger" title="Delete" onclick="mrDeleteRule('${r.id}','country')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}
function mrRenderCategory() {
  const tbody = document.querySelector('#mr-table-category tbody');
  if (!tbody) return;
  if (MR_STATE.category.length === 0) {
    tbody.innerHTML = `<tr class="mr-empty-row"><td colspan="5"><span>No category rules yet.</span> Use "+ Category" to markup by property type (e.g. 5★ All-Inclusive +25%).</td></tr>`;
    return;
  }
  tbody.innerHTML = MR_STATE.category.map(r => {
    const c = mrCategoryById(r.target);
    if (!c) return '';
    return `<tr data-rule-id="${r.id}">
      <td><strong>${c.name}</strong><span class="mr-hotel-city">Tier 2 — property type</span></td>
      <td><span class="mr-coverage-badge mr-coverage-badge-warn">${c.count} hotels graded · others fall through</span></td>
      <td class="${mrPctClass(r.pct)}" style="text-align:right">${r.pct}%</td>
      <td style="text-align:right">${mrDeltaStr(r.pct)}</td>
      <td>${r.updated} by ${r.by}</td>
      <td class="mr-actions" style="text-align:right">
        <button class="mr-icon-btn" title="Edit" onclick="mrEditRule('${r.id}','category')">✎</button>
        <button class="mr-icon-btn mr-icon-danger" title="Delete" onclick="mrDeleteRule('${r.id}','category')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}
function mrRenderHotel() {
  const tbody = document.querySelector('#mr-table-hotel tbody');
  if (!tbody) return;
  if (MR_STATE.hotel.length === 0) {
    tbody.innerHTML = `<tr class="mr-empty-row"><td colspan="5"><span>No per-hotel overrides yet.</span> Use "+ Hotel" to pin a specific hotel's markup.</td></tr>`;
    return;
  }
  tbody.innerHTML = MR_STATE.hotel.map(r => {
    return `<tr data-rule-id="${r.id}">
      <td><strong>${r.target}</strong><span class="mr-hotel-city">${r.city || 'Per-hotel'}</span></td>
      <td><span class="mr-coverage-badge">1 hotel (exact)</span></td>
      <td class="${mrPctClass(r.pct)}" style="text-align:right">${r.pct}%</td>
      <td style="text-align:right">${mrDeltaStr(r.pct)}</td>
      <td>${r.updated} by ${r.by}</td>
      <td class="mr-actions" style="text-align:right">
        <button class="mr-icon-btn" title="Edit" onclick="mrEditRule('${r.id}','hotel')">✎</button>
        <button class="mr-icon-btn mr-icon-danger" title="Delete" onclick="mrDeleteRule('${r.id}','hotel')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

/* ---------- Drawer state + handlers ---------- */
let MR_DRAWER = { type: 'hotel', editId: null };

function mrOpenDrawer(opts) {
  opts = opts || {};
  MR_DRAWER.type = opts.type || 'hotel';
  MR_DRAWER.editId = opts.editId || null;
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
      const sel = document.getElementById('mr-target-select');
      if (sel) sel.value = r.target;
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
    chain: { label: 'Hotel chain', help: 'Markup applies to every hotel linked to this chain.', items: MR_CHAINS },
    country: { label: 'Country', help: 'Markup applies to every hotel in this country.', items: MR_COUNTRIES },
    category: { label: 'Property category', help: 'Markup applies to every hotel that matches this category.', items: MR_CATEGORIES },
    hotel: { label: 'Hotel', help: 'Markup applies only to this specific hotel.', items: null },
  }[type];
  lbl.textContent = opts.label;
  help.textContent = opts.help;
  if (opts.items) {
    sel.innerHTML = opts.items.map(o =>
      `<option value="${o.id}">${o.name}${o.count != null ? ` — ${o.count} hotels` : ''}</option>`
    ).join('');
    sel.style.display = '';
  } else {
    // Hotel — free-text input replaces select
    sel.outerHTML = `<input type="text" id="mr-target-select" placeholder="Search hotel by name…" oninput="mrCoverageUpdate()">`;
  }
  mrCoverageUpdate();
}
function mrCoverageUpdate() {
  const cov = document.getElementById('mr-coverage');
  if (!cov) return;
  const sel = document.getElementById('mr-target-select');
  const val = sel?.value || '';
  let html = '';
  if (MR_DRAWER.type === 'chain') {
    const c = mrChainById(val); if (!c) return;
    html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> This rule will apply to ${c.count} hotels</div>
      <div class="mr-coverage-stats">${c.count} hotels linked to <strong>${c.name}</strong>${
        c.candidates ? ` · <span class="mr-coverage-warn">${c.candidates} likely-${c.name} hotels not yet linked — <a onclick="protoToast('Re-link request sent to Ergos staff', 'info')">request a re-link?</a></span>` : ' · all caught up.'}</div>`;
  } else if (MR_DRAWER.type === 'country') {
    const c = mrCountryById(val); if (!c) return;
    html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> This rule will apply to ${c.count} hotels</div>
      <div class="mr-coverage-stats">${c.count} hotels in <strong>${c.name}</strong>. 100% coverage — every hotel has a country.</div>`;
  } else if (MR_DRAWER.type === 'category') {
    const c = mrCategoryById(val); if (!c) return;
    html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> This rule will apply to ${c.count} hotels</div>
      <div class="mr-coverage-stats">${c.count} hotels graded as <strong>${c.name}</strong>. <span class="mr-coverage-warn">Hotels without a category fall through to a more general tier.</span></div>`;
  } else if (MR_DRAWER.type === 'hotel') {
    html = `<div class="mr-coverage-title"><i class="ti ti-chart-bar"></i> This rule will apply to 1 hotel</div>
      <div class="mr-coverage-stats">Most surgical option. Beats every rule above.</div>`;
  }
  cov.innerHTML = html;
}
function mrSaveRule() {
  const drawer = document.getElementById('mr-create-drawer');
  const pct = parseInt(document.getElementById('mr-pct-input')?.value || '0', 10);
  if (isNaN(pct) || pct < 0 || pct > 200) { protoToast('Markup must be a whole number 0–200', 'error'); return; }
  const sel = document.getElementById('mr-target-select');
  const target = (sel?.value || '').trim();
  if (!target) { protoToast('Pick a target before saving', 'error'); return; }
  const today = new Date().toISOString().slice(0, 10);
  if (MR_DRAWER.editId) {
    const list = MR_STATE[MR_DRAWER.type];
    const r = list.find(x => x.id === MR_DRAWER.editId);
    if (r) { r.pct = pct; r.target = target; r.updated = today; r.by = 'patria@'; }
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
    if (MR_DRAWER.type === 'hotel') newRule.city = 'Edited via prototype';
    MR_STATE[MR_DRAWER.type].push(newRule);
    let displayTarget = target;
    if (MR_DRAWER.type === 'chain') displayTarget = mrChainById(target)?.name || target;
    else if (MR_DRAWER.type === 'country') displayTarget = mrCountryById(target)?.name || target;
    else if (MR_DRAWER.type === 'category') displayTarget = mrCategoryById(target)?.name || target;
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
  if (type === 'chain') displayTarget = mrChainById(r.target)?.name || r.target;
  else if (type === 'country') displayTarget = mrCountryById(r.target)?.name || r.target;
  else if (type === 'category') displayTarget = mrCategoryById(r.target)?.name || r.target;
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
