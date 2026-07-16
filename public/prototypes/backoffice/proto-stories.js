/* ============================================================
   USER STORY INTERACTIONS — C1 (remittances), D1 (price comp)
   ============================================================ */

/* ---------- C1: Agency Remittances ---------- */
let _frPendingRow = null;

function frOpenMarkPaid(btn) {
  const row = btn.closest('tr');
  _frPendingRow = row;
  const modal = document.getElementById('fr-mark-paid-modal');
  if (!modal) return;
  // populate the summary block
  const agency = row.querySelector('td:nth-child(1) strong')?.textContent || '';
  const period = row.querySelector('td:nth-child(2)')?.textContent || '';
  const amount = row.querySelector('.fr-amt')?.textContent || '';
  const due = row.querySelector('td:nth-child(4)')?.textContent || '';
  const lateText = row.querySelector('.fr-late')?.textContent || '';
  const summary = modal.querySelector('.fr-modal-summary');
  if (summary) {
    summary.innerHTML = `<div><strong>${agency}</strong></div>
      <div class="muted">${period} · ${amount} · due ${due}${lateText ? ' · ' + lateText.trim() + ' overdue' : ''}</div>`;
  }
  // clear inputs
  modal.querySelector('input[type="text"]').value = '';
  modal.querySelector('textarea').value = '';
  modal.classList.add('open');
  setTimeout(() => modal.querySelector('input[type="text"]').focus(), 100);
}
function frCloseMarkPaid() {
  document.getElementById('fr-mark-paid-modal')?.classList.remove('open');
  _frPendingRow = null;
}
function frConfirmPaid() {
  const modal = document.getElementById('fr-mark-paid-modal');
  const ref = modal?.querySelector('input[type="text"]')?.value?.trim();
  if (!ref) {
    boToast('Wire transaction reference is required', 'error');
    return;
  }
  if (_frPendingRow) {
    const row = _frPendingRow;
    const agency = row.querySelector('td:nth-child(1) strong')?.textContent || 'agency';
    const statusCell = row.querySelector('td:nth-child(5)');
    const lateCell = row.querySelector('td:nth-child(6)');
    const actionCell = row.querySelector('td:last-child');
    if (statusCell) statusCell.innerHTML = '<span class="badge badge-success"><i class="ti ti-check"></i> Paid</span>';
    if (lateCell) lateCell.innerHTML = '<span class="muted">just now</span>';
    if (actionCell) actionCell.innerHTML = '<button class="btn btn-sm" onclick="frOpenDetail(this)">View</button>';
    row.classList.remove('fr-row-overdue');
    row.classList.add('fr-row-paid');
    row.dataset.paidRef = ref;
    row.dataset.paidAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    // FLASH animation so the change is clearly visible
    row.classList.add('fr-row-just-changed');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => row.classList.remove('fr-row-just-changed'), 1800);
    boToast(`✓ ${agency} marked as Paid · ref ${ref} captured in audit log`, 'success');
  }
  frCloseMarkPaid();
}
function frOpenDetail(btn) {
  const row = btn.closest('tr');
  const agency = row.querySelector('td:nth-child(1) strong')?.textContent || '';
  const period = row.querySelector('td:nth-child(2)')?.textContent || '';
  const amount = row.querySelector('.fr-amt')?.textContent || '';
  const ref = row.dataset.paidRef || row.querySelector('td:nth-child(1) + td')?.textContent.includes('Apr 2026') ? 'WIRE-2026-04-DEMO' : (row.dataset.paidRef || '—');
  const modal = document.getElementById('fr-detail-modal');
  if (!modal) return;
  const head = modal.querySelector('.fr-modal-head h3');
  if (head) head.textContent = 'Remittance detail · ' + period;
  const grid = modal.querySelector('.fr-detail-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="fr-detail-stat"><div class="fr-detail-label">Agency</div><div class="fr-detail-value" style="font-size:18px">${agency}</div></div>
      <div class="fr-detail-stat"><div class="fr-detail-label">Amount</div><div class="fr-detail-value" style="font-size:18px">${amount}</div></div>
      <div class="fr-detail-stat fr-detail-stat-pos"><div class="fr-detail-label">Status</div><div class="fr-detail-value" style="font-size:18px">Paid</div></div>
      <div class="fr-detail-stat"><div class="fr-detail-label">Paid at</div><div class="fr-detail-value" style="font-size:14px">${new Date().toISOString().slice(0,16).replace('T',' ')}</div></div>
      <div class="fr-detail-stat"><div class="fr-detail-label">Paid by (admin)</div><div class="fr-detail-value" style="font-size:14px">finance@ergos.com</div></div>
      <div class="fr-detail-stat"><div class="fr-detail-label">Reference</div><div class="fr-detail-value" style="font-size:14px">${ref}</div></div>`;
  }
  modal.classList.add('open');
}
function frCloseDetail() {
  document.getElementById('fr-detail-modal')?.classList.remove('open');
}
function frFilterRemittances(q) {
  const term = (q || '').toLowerCase().trim();
  document.querySelectorAll('#screen-finance-remittances .fr-table tbody tr').forEach(tr => {
    const text = tr.textContent.toLowerCase();
    tr.style.display = (!term || text.includes(term)) ? '' : 'none';
  });
}
function frExportCsv() {
  const rows = [['Agency','Period','Amount','Due','Status','Days late']];
  document.querySelectorAll('#screen-finance-remittances .fr-table tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).slice(0, 6).map(td => td.textContent.replace(/\s+/g,' ').trim());
    if (cells.length) rows.push(cells);
  });
  boTriggerCsv(rows, 'agency-remittances.csv');
  boToast('Exported ' + (rows.length - 1) + ' remittance rows', 'success');
}
/* ---------- Adjust Amount modal ---------- */
let _frAdjustRow = null;
function frAdjustAmount() {
  // Open the adjust modal on the FIRST non-paid row in the table as a demo
  // target. In the live app this would be triggered per-row.
  const target = document.querySelector('#screen-finance-remittances .fr-table tbody tr:not(.fr-row-paid)');
  if (!target) { boToast('No pending remittance to adjust', 'warn'); return; }
  _frAdjustRow = target;
  const modal = document.getElementById('fr-adjust-modal');
  if (!modal) return;
  const current = target.querySelector('.fr-amt')?.textContent || '$0';
  const agency = target.querySelector('td:nth-child(1) strong')?.textContent || '';
  const period = target.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
  const summary = modal.querySelector('.fr-modal-summary');
  if (summary) summary.innerHTML = `Adjusting <strong>${agency} · ${period}</strong>. Adjustments require a reason and are immutably audited.`;
  modal.querySelector('#fr-adjust-current').value = current;
  const numeric = parseFloat(current.replace(/[^0-9.]/g, '')) || 0;
  modal.querySelector('#fr-adjust-new').value = numeric.toFixed(2);
  modal.querySelector('#fr-adjust-reason').value = '';
  modal.classList.add('open');
  setTimeout(() => modal.querySelector('#fr-adjust-new').focus(), 80);
}
function frCloseAdjust() {
  document.getElementById('fr-adjust-modal')?.classList.remove('open');
  _frAdjustRow = null;
}
function frSaveAdjust() {
  const newAmt = parseFloat(document.getElementById('fr-adjust-new')?.value || '0');
  const reason = document.getElementById('fr-adjust-reason')?.value?.trim();
  if (!newAmt || newAmt <= 0) { boToast('Enter a positive amount', 'error'); return; }
  if (!reason) { boToast('Adjustment reason is required', 'error'); return; }
  if (_frAdjustRow) {
    const oldAmt = _frAdjustRow.querySelector('.fr-amt')?.textContent || '';
    const amtCell = _frAdjustRow.querySelector('.fr-amt');
    if (amtCell) amtCell.textContent = '$' + newAmt.toFixed(2);
    _frAdjustRow.classList.add('fr-row-just-changed');
    _frAdjustRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => _frAdjustRow.classList.remove('fr-row-just-changed'), 1800);
    boToast(`Adjusted ${oldAmt} → $${newAmt.toFixed(2)} · "${reason.slice(0, 40)}${reason.length > 40 ? '…' : ''}" logged`, 'success');
  }
  frCloseAdjust();
}

/* ---------- Manual Remittance modal (admin-created entry) ---------- */
function frAddManual() {
  const modal = document.getElementById('fr-manual-modal');
  if (!modal) return;
  modal.querySelector('#fr-manual-agency').value = '';
  modal.querySelector('#fr-manual-period').value = '';
  modal.querySelector('#fr-manual-amount').value = '';
  // Default due date = 15 days from today
  const due = new Date();
  due.setDate(due.getDate() + 15);
  modal.querySelector('#fr-manual-due').value = due.toISOString().slice(0, 10);
  modal.querySelector('#fr-manual-reason').value = '';
  modal.classList.add('open');
  setTimeout(() => modal.querySelector('#fr-manual-agency').focus(), 80);
}
function frCloseManual() {
  document.getElementById('fr-manual-modal')?.classList.remove('open');
}
function frSaveManual() {
  const agency = document.getElementById('fr-manual-agency')?.value?.trim();
  const period = document.getElementById('fr-manual-period')?.value?.trim();
  const amount = parseFloat(document.getElementById('fr-manual-amount')?.value || '0');
  const due = document.getElementById('fr-manual-due')?.value;
  const reason = document.getElementById('fr-manual-reason')?.value?.trim();
  if (!agency) { boToast('Pick an agency', 'error'); return; }
  if (!period) { boToast('Period is required', 'error'); return; }
  if (!amount || amount <= 0) { boToast('Amount must be positive', 'error'); return; }
  if (!due) { boToast('Due date is required', 'error'); return; }
  if (!reason) { boToast('Reason is required (audited)', 'error'); return; }
  // Split "Demo Agency (ag1 · LIC-12345)" → name + license
  const m = agency.match(/^(.+?)\s+\((.+)\)$/);
  const agencyName = m ? m[1] : agency;
  const licenseStr = m ? m[2] : '—';
  const tbody = document.querySelector('#screen-finance-remittances .fr-table tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    tr.className = 'fr-row fr-row-just-changed';
    tr.innerHTML = `
      <td><strong>${agencyName}</strong><span class="fr-license">${licenseStr}</span></td>
      <td>${period}</td>
      <td class="text-right fr-amt">$${amount.toFixed(2)}</td>
      <td>${new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td><span class="badge badge-warning"><i class="ti ti-clock-hour-4"></i> Pending</span></td>
      <td>—</td>
      <td class="text-right"><button class="btn btn-sm btn-primary" onclick="frOpenMarkPaid(this)">Mark Paid</button></td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => tr.classList.remove('fr-row-just-changed'), 1800);
    // Bump the agency count
    const countEl = document.querySelector('#hpb-agency-count');
    if (countEl) {
      const n = parseInt(countEl.textContent, 10) + 1;
      countEl.textContent = n + ' remittances total';
    }
  }
  boToast(`Manual remittance created for ${agencyName} · ${period} · $${amount.toFixed(2)} · "${reason.slice(0, 40)}${reason.length > 40 ? '…' : ''}" logged`, 'success');
  frCloseManual();
}

/* ---------- Combined filters (status + period) + sort ---------- */
function frApplyFilters() {
  const term = (document.querySelector('#screen-finance-remittances .t-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('fr-filter-status')?.value || 'all';
  // Period filter is decorative in prototype — we always show everything that
  // matches text + status, since we don't have real timestamps to range over.
  document.querySelectorAll('#screen-finance-remittances .fr-table tbody tr').forEach(tr => {
    const text = tr.textContent.toLowerCase();
    const matchText = !term || text.includes(term);
    let matchStatus = true;
    if (status === 'pending') matchStatus = tr.classList.contains('fr-row') && !tr.classList.contains('fr-row-paid') && !tr.classList.contains('fr-row-overdue');
    else if (status === 'paid') matchStatus = tr.classList.contains('fr-row-paid');
    else if (status === 'overdue') matchStatus = tr.classList.contains('fr-row-overdue');
    tr.style.display = (matchText && matchStatus) ? '' : 'none';
  });
}
function frFilterRemittances(q) {
  // delegated to frApplyFilters so search + status compose
  frApplyFilters();
}
function frApplySort() {
  const tbody = document.querySelector('#screen-finance-remittances .fr-table tbody');
  if (!tbody) return;
  const sort = document.getElementById('fr-sort')?.value || 'overdue-first';
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const tierRank = r => r.classList.contains('fr-row-overdue') ? 0 : r.classList.contains('fr-row-paid') ? 2 : 1;
  const amt = r => parseFloat((r.querySelector('.fr-amt')?.textContent || '$0').replace(/[^0-9.]/g, '')) || 0;
  const agencyName = r => (r.querySelector('td:nth-child(1) strong')?.textContent || '').toLowerCase();
  if (sort === 'overdue-first') rows.sort((a, b) => tierRank(a) - tierRank(b) || amt(b) - amt(a));
  else if (sort === 'amount-desc') rows.sort((a, b) => amt(b) - amt(a));
  else if (sort === 'agency-asc') rows.sort((a, b) => agencyName(a).localeCompare(agencyName(b)));
  rows.forEach(r => tbody.appendChild(r));
}

/* ============================================================
   D1: Hotel Price Composition — SHIPPED 2026-07-16
   (backend-service#94 + backoffice-app#56, closes documentation#12)

   Live at /finance/price-composition in the backoffice.

   For each hotel:
   1. Compute the Ergos-side waterfall (GDS supplier net → chain discount →
      Ergos markup → Ergos sell → sales-agent earning → ops expense → Ergos net)
   2. For each active agency, resolve THEIR markup using the 5-tier rule
      cascade (hotel > brand > category > country > default)
   3. Show the winning tier + resulting customer price per row

   Demo data wires real tier matches per hotel + per agency, so picking
   different hotels in the select rewires which tier wins for which
   agency — admin can audit "why is X paying $244 vs Y paying $230 for
   the same hotel?" in one screen.

   Design history (kept intact):
   - 2026-06-03: collapsed the 5-tier icon vocabulary to a 2-state
     Custom/Default badge in the aggregate table (see d1RuleBadge note below);
     dropped the tier-coverage card and the "this hotel matches" card;
     restored the per-agency drilldown with plain state icons.
   - 2026-07-16 (post-prototype, as shipped): sample-net input dropped for
     real-supplier-only pricing (the selected room's live net drives dollars);
     cascading Supplier → Country → Hotel filters added; agency table filter
     now matches agency NAME or contact EMAIL; the inline "Rule reason" column
     was removed (that trace now lives only in the drilldown). Related:
     Pricing Policy's Simulate tab was removed — Live Hotel Supplier is the
     only price preview there now.
   ============================================================ */

const D1_CHAINS = {
  iberostar: { name: 'Iberostar Group', count: 41 },
  hyatt:     { name: 'Hyatt Hotels Corporation', count: 15 },
  melia:     { name: 'Meliá Hotels International', count: 28 },
};
const D1_COUNTRIES = {
  cu: { name: 'Cuba', count: 180 },
  do: { name: 'Dominican Republic', count: 95 },
};
const D1_CATEGORIES = {
  '5star-ai': { name: '5-star · All-Inclusive', count: 185 },
  '4star-ai': { name: '4-star · All-Inclusive', count: 280 },
};

// Hotels carry supplier/chainId/country/categories so the cascade filters
// (Supplier → Country → Hotel) scope correctly and the resolver can match.
// Each hotel lists real-shaped rooms; the cheapest net is auto-selected and
// drives every dollar (no sample-net input — matches the shipped app).
const _hpbHotels = {
  'Iberostar Grand Packard': {
    code: 'IB-GP-HAV', city: 'Havana, Cuba',
    supplier: 'roibos', chainPct: 10, ergosPct: 17.5, brand: 'Iberostar',
    chainId: 'iberostar', country: 'cu', categories: ['5star-ai'],
    rooms: [
      { label: 'Classic Room — All Inclusive AI', net: 200 },
      { label: 'Deluxe Ocean View — AI', net: 268 },
      { label: 'Grand Suite — AI', net: 355 },
    ],
  },
  'Hyatt Ziva Cap Cana': {
    code: 'HZ-CC-DOM', city: 'Punta Cana, DR',
    supplier: 'hotetec', chainPct: 7, ergosPct: 19.4, brand: 'Hyatt',
    chainId: 'hyatt', country: 'do', categories: ['5star-ai'],
    rooms: [
      { label: 'King Room — All Inclusive', net: 242 },
      { label: 'Ocean Front Suite — AI', net: 318 },
    ],
  },
  'Memories Varadero': {
    code: 'MM-VAR-CUB', city: 'Varadero, Cuba',
    supplier: 'roibos', chainPct: 0, ergosPct: 18.4, brand: '— (independent)',
    chainId: null, country: 'cu', categories: ['4star-ai'],
    rooms: [
      { label: 'Standard Room — All Inclusive', net: 144 },
      { label: 'Junior Suite — AI', net: 189 },
    ],
  },
};

// Supplier labels + the countries each supplier covers (scopes the Country
// select). Country options for the Hotel select are derived from _hpbHotels.
const _hpbSuppliers = { dingus:'Dingus', hotetec:'Hotetec', restel:'Restel', roibos:'Roibos' };
const _hpbCountryNames = { cu:'Cuba', do:'Dominican Republic' };
function _hpbCountriesForSupplier(sup) {
  return [...new Set(Object.values(_hpbHotels).filter(h => h.supplier === sup).map(h => h.country))];
}
function _hpbHotelsFor(sup, country) {
  return Object.entries(_hpbHotels)
    .filter(([, h]) => h.supplier === sup && h.country === country)
    .map(([name]) => name);
}

// Each agency carries its own 4-tier ruleset. The resolver walks
// hotel → category → country → chain → default for each agency
// against the currently-selected hotel.
const D1_AGENCIES = [
  {
    name: 'Demo Agency', lic: 'ag1 · LIC-12345', email: 'ops@demoagency.com',
    bookings: 12, defaultPct: 15, rebatePct: 3, rebateCustom: true,
    rules: {
      chain:    [{ target: 'iberostar', pct: 18 }],
      country:  [{ target: 'cu', pct: 12 }],
      category: [{ target: '5star-ai', pct: 25 }],
      hotel:    [
        { target: 'Iberostar Grand Packard', pct: 22 },
        { target: 'Hyatt Ziva Cap Cana', pct: 25 },
      ],
    },
  },
  {
    name: 'Caribe Tours', lic: 'ag7 · LIC-23488', email: 'book@caribetours.cu',
    bookings: 8, defaultPct: 15, rebatePct: 2, rebateCustom: false,
    rules: {
      chain: [{ target: 'iberostar', pct: 18 }, { target: 'hyatt', pct: 20 }],
    },
  },
  {
    name: 'Sol Mar Travel', lic: 'ag14 · LIC-31202', email: 'hola@solmar.travel',
    bookings: 5, defaultPct: 15, rebatePct: 3, rebateCustom: true,
    rules: {
      country: [{ target: 'cu', pct: 14 }],
      hotel:   [{ target: 'Iberostar Grand Packard', pct: 18 }],
    },
  },
  {
    name: 'Viajes Mediterráneo', lic: 'ag22 · LIC-44120', email: 'info@viajesmed.es',
    bookings: 3, defaultPct: 12, rebatePct: 2, rebateCustom: false,
    rules: {},
  },
  {
    name: 'Destinos Ibérica', lic: 'ag31 · LIC-55708', email: 'reservas@destinosiberica.es',
    bookings: 2, defaultPct: 15, rebatePct: 2, rebateCustom: false,
    rules: {
      country:  [{ target: 'cu', pct: 10 }],
      category: [{ target: '5star-ai', pct: 22 }],
    },
  },
];

/* Resolve THE agency's tier for THIS hotel — same precedence as agency-app. */
function d1ResolveAgencyTier(agency, hotelMeta) {
  const rules = agency.rules || {};
  // Tier 1 — per-hotel override (exact name)
  const ho = (rules.hotel || []).find(r => r.target === hotelMeta.name);
  if (ho) return { tier: 'hotel', pct: ho.pct, reason: 'Per-hotel override' };
  // Tier 2 — category (any match)
  const ct = (rules.category || []).find(r => hotelMeta.categories.includes(r.target));
  if (ct) return { tier: 'category', pct: ct.pct, reason: `Category · ${D1_CATEGORIES[ct.target]?.name}` };
  // Tier 3 — country
  const co = (rules.country || []).find(r => r.target === hotelMeta.country);
  if (co) return { tier: 'country', pct: co.pct, reason: `Country · ${D1_COUNTRIES[co.target]?.name}` };
  // Tier 4 — chain
  const ch = (rules.chain || []).find(r => r.target === hotelMeta.chainId);
  if (ch) return { tier: 'chain', pct: ch.pct, reason: `Chain · ${D1_CHAINS[ch.target]?.name}` };
  // Tier 5 — default
  return { tier: 'default', pct: agency.defaultPct, reason: `Default (${agency.defaultPct}%)` };
}

// Simplified per-user-feedback (2026-06-03): the 5-tier vocabulary
// (Hotel/Category/Country/Chain/Default) was being read in two different
// contexts — rule placement vs cross-agency coverage — and the icons
// blurred the two. In aggregate views (this audit page) we collapse to
// two states: Custom (agency overrode the default) vs Default (system
// fallback). The "Rule reason" column still carries the cascade trace
// inline, so the auditor never loses access to which tier won.
function d1RuleBadge(tier) {
  return tier === 'default'
    ? '<span class="d1-rule-badge d1-rule-default">Default</span>'
    : '<span class="d1-rule-badge d1-rule-custom">Custom</span>';
}

// Full cascade walk — for the per-agency drilldown. Returns ALL 5 tiers
// with matched/skipped state + the winner flag. Same precedence as
// d1ResolveAgencyTier; that one short-circuits on the first match, this
// one keeps walking so the auditor can see which tiers had rules but
// were not the most-specific match.
function d1ResolveAgencyCascade(agency, hotelMeta) {
  const rules = agency.rules || {};
  const trace = [];

  const ho = (rules.hotel || []).find(r => r.target === hotelMeta.name);
  trace.push({
    tier: 'hotel', label: 'Hotel',
    matched: !!ho, pct: ho?.pct ?? null,
    detail: ho ? `Per-hotel override for ${hotelMeta.name}` : 'No per-hotel rule set by this agency',
  });

  const ct = (rules.category || []).find(r => hotelMeta.categories.includes(r.target));
  trace.push({
    tier: 'category', label: 'Category',
    matched: !!ct, pct: ct?.pct ?? null,
    detail: ct ? `Matches category · ${D1_CATEGORIES[ct.target]?.name}` : 'No category rule that targets this hotel',
  });

  const co = (rules.country || []).find(r => r.target === hotelMeta.country);
  trace.push({
    tier: 'country', label: 'Country',
    matched: !!co, pct: co?.pct ?? null,
    detail: co ? `Matches country · ${D1_COUNTRIES[co.target]?.name}` : 'No country rule that targets this hotel',
  });

  const ch = (rules.chain || []).find(r => r.target === hotelMeta.chainId);
  trace.push({
    tier: 'chain', label: 'Brand',
    matched: !!ch, pct: ch?.pct ?? null,
    detail: ch ? `Matches brand · ${D1_CHAINS[ch.target]?.name}` :
            (hotelMeta.chainId ? 'No brand rule that targets this hotel' : 'Hotel has no brand — brand rules cannot apply'),
  });

  trace.push({
    tier: 'default', label: 'Default',
    matched: true, pct: agency.defaultPct,
    detail: `Falls through to agency default · ${agency.defaultPct}%`,
  });

  // Mark the winner — first matched (most-specific first)
  const winner = trace.find(t => t.matched);
  if (winner) winner.winner = true;
  return trace;
}

window._hpbSelectedAgencyIdx = 0; // remembers selection across recomputes

function hpbSelectAgency(idx) {
  window._hpbSelectedAgencyIdx = idx;
  // Visual row highlight
  document.querySelectorAll('#hpb-agencies-tbody tr').forEach((tr, i) => {
    tr.classList.toggle('hpb-row-selected', i === idx);
  });
  // Re-render the drilldown card
  hpbRenderAgencyDrilldown(idx);
  // Smooth-scroll the drilldown into view
  const card = document.getElementById('hpb-drilldown-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* Read the currently-selected hotel + its live room net from the cascade
   controls. Falls back to the first hotel / cheapest room so the demo always
   renders even before a full selection is made. */
function _hpbCurrent() {
  const screen = document.getElementById('screen-hotel-price-breakdown');
  const sel = screen?.querySelector('.hpb-select');
  let hotelKey = sel?.value;
  if (!hotelKey || !_hpbHotels[hotelKey]) hotelKey = Object.keys(_hpbHotels)[0];
  const hotelInfo = _hpbHotels[hotelKey];
  const roomSel = screen?.querySelector('.hpb-room');
  const net = parseFloat(roomSel?.value) || Math.min(...hotelInfo.rooms.map(r => r.net));
  return { screen, hotelKey, hotelInfo, hotelMeta: { name: hotelKey, ...hotelInfo }, net };
}

function hpbRenderAgencyDrilldown(idx) {
  const { screen, hotelKey, hotelInfo, hotelMeta, net: supplierNet } = _hpbCurrent();
  if (!screen) return;
  const ergosSell = supplierNet * (1 - hotelInfo.chainPct / 100) * (1 + hotelInfo.ergosPct / 100);

  const agency = D1_AGENCIES[idx];
  if (!agency) return;
  const trace = d1ResolveAgencyCascade(agency, hotelMeta);
  const winner = trace.find(t => t.winner);
  const customer = ergosSell * (1 + (winner?.pct ?? agency.defaultPct) / 100);
  const income = customer - ergosSell;

  // Header
  const nameEl = document.getElementById('hpb-drilldown-agency');
  if (nameEl) nameEl.textContent = `${agency.name} · ${hotelKey}`;
  const winnerBadge = document.getElementById('hpb-drilldown-winner-badge');
  if (winnerBadge) winnerBadge.textContent = winner ? `Winner: ${winner.label} · ${winner.pct}%` : '—';

  // Trace
  const traceEl = document.getElementById('hpb-drilldown-trace');
  if (traceEl) {
    traceEl.innerHTML = trace.map(t => {
      const state = t.winner ? 'winner' : (t.matched ? 'matched' : 'skipped');
      const indicator = t.winner ? '<i class="ti ti-trophy"></i>' :
                        t.matched ? '<i class="ti ti-check"></i>' :
                                    '<i class="ti ti-minus"></i>';
      const pctTxt = t.pct != null ? `${t.pct}%` : '—';
      return `<div class="hpb-cascade-step hpb-cascade-${state}">
        <span class="hpb-cascade-indicator">${indicator}</span>
        <span class="hpb-cascade-tier">${t.label}</span>
        <span class="hpb-cascade-detail">${t.detail}</span>
        <span class="hpb-cascade-pct">${pctTxt}</span>
      </div>`;
    }).join('');
  }

  // Math block
  const mathEl = document.getElementById('hpb-drilldown-math');
  if (mathEl) {
    mathEl.innerHTML = `
      <div class="hpb-math-row"><span>Ergos sell (agency pays)</span><strong>$${ergosSell.toFixed(2)}</strong></div>
      <div class="hpb-math-row hpb-math-op"><span>× (1 + ${winner?.pct ?? agency.defaultPct}% markup)</span><strong class="hpb-pos">+ $${income.toFixed(2)}</strong></div>
      <div class="hpb-math-row hpb-math-total"><span>Customer pays</span><strong>$${customer.toFixed(2)}</strong></div>
      <div class="hpb-math-row hpb-math-foot"><span>${agency.name} earns per booking</span><strong class="hpb-pos">+$${income.toFixed(2)}</strong></div>
      <div class="hpb-math-row hpb-math-foot"><span>Bookings in last 90 days</span><strong>${agency.bookings}</strong></div>
    `;
  }
}

/* Ergos markup source chip — mirrors the shipped label set
   (hotel|hotel rule|chain rule|stars rule|country rule|GDS rule|default). */
function _hpbMarkupChip(hotelInfo) {
  const label = hotelInfo.chainId ? 'chain rule'
    : hotelInfo.categories?.length ? 'stars rule' : 'country rule';
  return `<a class="hpb-source-tag" href="commission-config.html">${label}</a>`;
}

function hpbRecompute() {
  const { screen, hotelKey, hotelInfo, hotelMeta, net: supplierNet } = _hpbCurrent();
  if (!screen) return;

  const afterChain = supplierNet * (1 - hotelInfo.chainPct / 100);
  const ergosSell  = afterChain * (1 + hotelInfo.ergosPct / 100);
  const agentPct   = 10, opsPct = 5; // policy payouts, % of Ergos sell (gross)
  const agentCost  = ergosSell * agentPct / 100;
  const opsCost    = ergosSell * opsPct / 100;
  const ergosNet   = ergosSell - agentCost - opsCost;
  const chainChip  = hotelInfo.chainPct ? '<a class="hpb-source-tag" href="hotel-brands">hotel rule</a>' : '<span class="muted">—</span>';

  // 1. Price Waterfall — GDS net down to Ergos net ----------
  const cascadeBody = screen.querySelector('.hpb-cascade tbody');
  if (cascadeBody) {
    cascadeBody.innerHTML = `
      <tr class="hpb-row-net"><td><strong>GDS supplier net</strong></td><td>—</td><td class="bb-mono">${hotelInfo.supplier} / ${hotelInfo.code}</td><td class="text-right hpb-amt">$${supplierNet.toFixed(2)}</td></tr>
      <tr><td>Chain discount</td><td class="hpb-neg">−${hotelInfo.chainPct.toFixed(1)}%</td><td>${chainChip}</td><td class="text-right">$${afterChain.toFixed(2)}</td></tr>
      <tr><td>Ergos markup</td><td class="hpb-pos">+${hotelInfo.ergosPct.toFixed(1)}%</td><td>${_hpbMarkupChip(hotelInfo)}</td><td class="text-right">$${ergosSell.toFixed(2)}</td></tr>
      <tr class="hpb-row-sell"><td><strong>Ergos sell (agency pays)</strong></td><td>—</td><td class="muted">price agencies pay Ergos</td><td class="text-right hpb-amt hpb-amt-bold">$${ergosSell.toFixed(2)}</td></tr>
      <tr><td>Sales agent earning</td><td class="hpb-neg">−${agentPct.toFixed(1)}%</td><td><a class="hpb-source-tag" href="commission-config.html">policy</a></td><td class="text-right">$${agentCost.toFixed(2)}</td></tr>
      <tr><td>Ops expense</td><td class="hpb-neg">−${opsPct.toFixed(1)}%</td><td><a class="hpb-source-tag" href="commission-config.html">policy</a></td><td class="text-right">$${opsCost.toFixed(2)}</td></tr>
      <tr class="hpb-row-net-final"><td><strong>Ergos net</strong></td><td>—</td><td class="muted">what Ergos keeps</td><td class="text-right hpb-amt hpb-amt-bold">$${ergosNet.toFixed(2)}</td></tr>`;
  }
  const cardHead = screen.querySelector('.hpb-cascade-card .card-head h3');
  if (cardHead) cardHead.innerHTML = 'Price Waterfall — <strong>' + hotelKey + '</strong>';
  const brandBadge = screen.querySelector('.hpb-cascade-card .card-head .badge');
  if (brandBadge) brandBadge.textContent = 'Chain: ' + hotelInfo.brand;

  // 2. Agency Prices rows — all active agencies ----------
  const agencyBody = document.getElementById('hpb-agencies-tbody');
  if (agencyBody) {
    agencyBody.innerHTML = D1_AGENCIES.map((a, idx) => {
      const r = d1ResolveAgencyTier(a, hotelMeta);
      const customer = ergosSell * (1 + r.pct / 100);
      const income = customer - ergosSell;
      const rebateCell = a.rebateCustom
        ? `<a class="hpb-rebate-link" href="commission-config.html?agency=${encodeURIComponent(a.name)}">${a.rebatePct}%</a>`
        : `${a.rebatePct}%`;
      return `<tr onclick="hpbSelectAgency(${idx})" data-search="${(a.name + ' ' + a.email).toLowerCase()}">
        <td><strong>${a.name}</strong><span class="hpb-agency-id">${a.email}</span></td>
        <td>${d1RuleBadge(r.tier)}</td>
        <td class="text-right hpb-mk-pct">${r.pct}%</td>
        <td class="text-right">${rebateCell}</td>
        <td class="text-right hpb-mk-amt">$${customer.toFixed(2)}</td>
        <td class="text-right hpb-pos">+$${income.toFixed(2)}</td>
        <td class="text-right">${a.bookings}</td>
      </tr>`;
    }).join('');
  }

  // 2b. Re-render drilldown for currently selected agency (defaults to 0)
  const selIdx = Math.min(window._hpbSelectedAgencyIdx ?? 0, D1_AGENCIES.length - 1);
  hpbSelectAgency(selIdx);

  // 3. Agency count
  const countEl = document.getElementById('hpb-agency-count');
  if (countEl) countEl.textContent = `(${D1_AGENCIES.length})`;
}
function hpbExportCsv() {
  const { screen, hotelKey } = _hpbCurrent();
  const roomLabel = screen.querySelector('.hpb-room')?.value || '';
  const rows = [
    ['Hotel Price Composition'],
    ['Hotel', hotelKey],
    ['Room', roomLabel],
    [''],
    ['Price Waterfall'],
    ['Layer', 'Pct', 'Source', 'Running USD'],
  ];
  screen.querySelectorAll('.hpb-cascade tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g, ' ').trim());
    rows.push(cells);
  });
  rows.push(['']);
  rows.push(['Agency Prices']);
  rows.push(['Agency', 'Rule', 'Markup %', 'Rebate %', 'Customer pays', 'Markup income', 'Bookings']);
  screen.querySelectorAll('.hpb-agencies tbody tr').forEach(tr => {
    if (tr.style.display === 'none') return; // export what's on screen
    const cells = Array.from(tr.querySelectorAll('td')).map(td =>
      td.textContent.replace(/\s+/g, ' ').trim()
    );
    rows.push(cells);
  });
  boTriggerCsv(rows, 'hotel-price-composition.csv');
  const agencyCount = Array.from(screen.querySelectorAll('.hpb-agencies tbody tr')).filter(tr => tr.style.display !== 'none').length;
  boToast(`Exported breakdown for ${hotelKey} (${agencyCount} agencies)`, 'success');
}
function hpbExportPdf() {
  boToast('Opening print dialog — choose "Save as PDF" (stub in prototype)', 'info');
}
/* Filter the Agency Prices table by agency name OR contact email (client-side,
   matches the shipped filter input). */
function hpbFilterAgencies(value) {
  const q = (value || '').trim().toLowerCase();
  document.querySelectorAll('#hpb-agencies-tbody tr').forEach(tr => {
    const hay = tr.getAttribute('data-search') || '';
    tr.style.display = (!q || hay.includes(q)) ? '' : 'none';
  });
}
/* Toggle: hide agency rows whose 90d-booking count is 0 — for THIS demo
   they all have ≥2 so the toggle visibly affects the count in 'Show all'
   mode (off) by re-rendering the row count. */
function hpbFilterActiveAgencies(showActiveOnly) {
  const rows = document.querySelectorAll('#hpb-agencies-tbody tr');
  let visible = 0;
  rows.forEach(tr => {
    const bookingsCell = tr.querySelector('td:last-child');
    const bookings = parseInt((bookingsCell?.textContent || '0').trim(), 10);
    const hide = showActiveOnly && bookings === 0;
    tr.style.display = hide ? 'none' : '';
    if (!hide) visible++;
  });
  boToast(showActiveOnly ? `Showing ${visible} agencies with bookings in last 90 days` : `Showing all ${visible} agencies (incl. quote-only)`, 'info');
}

/* ---- Cascading controls: Supplier → Country → Hotel → Room ---- */

// Fill the Room select for the current hotel; cheapest is auto-selected first.
function _hpbPopulateRooms() {
  const { screen, hotelInfo } = _hpbCurrent();
  const roomSel = screen?.querySelector('.hpb-room');
  if (!roomSel || !hotelInfo) return;
  const rooms = [...hotelInfo.rooms].sort((a, b) => a.net - b.net); // cheapest first
  roomSel.innerHTML = rooms.map(r => `<option value="${r.net}">${r.label} — $${r.net}</option>`).join('');
  roomSel.value = String(rooms[0].net); // cheapest auto-selected
}

// Fill the Hotel select from the chosen supplier + country (first 15).
function hpbOnCountryChange() {
  const screen = document.getElementById('screen-hotel-price-breakdown');
  const sup = screen?.querySelector('.hpb-supplier')?.value;
  const country = screen?.querySelector('.hpb-country')?.value;
  const hotelSel = screen?.querySelector('.hpb-select');
  if (!hotelSel) return;
  const hotels = _hpbHotelsFor(sup, country).slice(0, 15); // first 15, type to narrow
  hotelSel.innerHTML = hotels.map(name => {
    const h = _hpbHotels[name];
    return `<option value="${name}">${name} · ${h.code} · ${h.city}</option>`;
  }).join('');
  _hpbPopulateRooms();
  hpbRecompute();
}

// Country options are scoped to the chosen supplier.
function hpbOnSupplierChange() {
  const screen = document.getElementById('screen-hotel-price-breakdown');
  const sup = screen?.querySelector('.hpb-supplier')?.value;
  const countrySel = screen?.querySelector('.hpb-country');
  if (!countrySel) return;
  const countries = _hpbCountriesForSupplier(sup);
  countrySel.innerHTML = countries.map(c => `<option value="${c}">${_hpbCountryNames[c] || c}</option>`).join('');
  hpbOnCountryChange();
}

// One-time control setup: default dates (tomorrow + 2 nights) + populate cascade.
function _hpbInitControls() {
  const screen = document.getElementById('screen-hotel-price-breakdown');
  if (!screen) return;
  const ci = screen.querySelector('.hpb-checkin');
  const co = screen.querySelector('.hpb-checkout');
  if (ci && !ci.value) {
    const t = new Date(); t.setDate(t.getDate() + 1);
    const o = new Date(); o.setDate(o.getDate() + 3);
    ci.value = t.toISOString().slice(0, 10);
    co.value = o.toISOString().slice(0, 10);
  }
  // Room select drives recompute; when it changes, only re-derive dollars.
  hpbOnSupplierChange(); // cascades: supplier→country→hotel→room→recompute
}

/* Auto-render D1 when the screen is shown. Wraps showScreen non-destructively
   so we don't lose the existing pricing-policy / sidebar logic. */
(function () {
  if (typeof showScreen !== 'function') return;
  const orig = showScreen;
  window.showScreen = function (id) {
    orig.apply(this, arguments);
    if (id === 'hotel-price-breakdown') {
      setTimeout(() => {
        // Silent first-render — don't fire a toast on simple navigation
        const wasToast = window.boToast;
        window.boToast = () => {};
        try { _hpbInitControls(); } finally { window.boToast = wasToast; }
      }, 30);
    }
  };
})();

/* ---------- Shared helpers ---------- */
function boToast(msg, type) {
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
function boTriggerCsv(rows, filename) {
  const csv = rows.map(r => r.map(c => /[,"\n]/.test(c) ? '"' + String(c).replace(/"/g,'""') + '"' : c).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

/* Esc closes modals */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.fr-modal.open').forEach(el => el.classList.remove('open'));
  }
});

/* Show booking-breakdown detail panel — populate header with selected
   booking ref and reveal the otherwise-hidden detail card below the list.
   Called from booking-breakdown row clicks. */
function showBookingDetail(ref) {
  const detail = document.getElementById('bb-detail');
  if (!detail) return;
  detail.hidden = false;
  const head = detail.querySelector('.card-head h3');
  if (head) head.textContent = 'Booking ' + ref;
  // Highlight the picked row in the table above
  document.querySelectorAll('.bb-row').forEach(r => r.classList.remove('bb-row-selected'));
  const target = Array.from(document.querySelectorAll('.bb-row .bb-ref')).find(el => el.textContent.trim() === ref);
  target?.closest('tr')?.classList.add('bb-row-selected');
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  boToast('Loaded breakdown for ' + ref, 'info');
}

/* ============================================================
   C1 ENHANCEMENTS (2026-06-04)
   - frSelectAgency: clicking an agency in the list swaps the
     drilldown card to show that agency's history
   - frKpiDrilldown: clicking a KPI filters the list
   - frSortBy: type-aware sort on any column
   - frOpenModifyStatus / frSaveModifyStatus: revert paid or change
     status of any remittance with required reason + audit
   - frOpenAdjustForRow: per-row adjust (replaces global Adjust)
   ============================================================ */

/* Mock per-agency stats — would come from backend in production. */
const FR_AGENCY_STATS = {
  ag1:  { name: 'Demo Agency',         totalBilled: 13517, totalPaid: 8697, pending: 4820, dueText: 'due Jun 15', avgDays: '3.2 d', tone: 'consistently on-time', cycles: '5 of 6 cycles settled' },
  ag7:  { name: 'Caribe Tours',        totalBilled: 9210,  totalPaid: 6260, pending: 2950, dueText: 'due Jun 15', avgDays: '4.1 d', tone: 'on-time', cycles: '4 of 5 cycles settled' },
  ag14: { name: 'Sol Mar Travel',      totalBilled: 11240, totalPaid: 8035, pending: 3205, dueText: 'OVERDUE +18d', avgDays: '12.8 d', tone: 'frequently late', cycles: '4 of 5 cycles settled', flag: 'overdue' },
  ag22: { name: 'Viajes Mediterráneo', totalBilled: 6680,  totalPaid: 4840, pending: 1840, dueText: 'due Jun 15', avgDays: '5.5 d', tone: 'on-time', cycles: '3 of 4 cycles settled' },
  ag31: { name: 'Destinos Ibérica',    totalBilled: 4870,  totalPaid: 3450, pending: 1420, dueText: 'due Jun 15', avgDays: '2.9 d', tone: 'consistently on-time', cycles: '3 of 4 cycles settled' },
};
const FR_AGENCY_AUDIT = {
  ag1: [
    { when: '2026-05-12 14:22', actor: 'finance@ergos.com', action: 'Marked Paid', actionCls: 'success', detail: 'Apr 2026 · WIRE-2026-04-DEMO · $3,612.00' },
    { when: '2026-05-08 09:00', actor: 'system (cron)',    action: 'Auto-created', actionCls: 'grey',   detail: 'May 2026 cycle · $4,820.00 · due Jun 15' },
    { when: '2026-04-14 09:05', actor: 'finance@ergos.com', action: 'Marked Paid', actionCls: 'success', detail: 'Mar 2026 · WIRE-2026-03-DEMO · $2,945.00' },
    { when: '2026-04-08 09:01', actor: 'admin@ergos.com',   action: 'Adjusted',    actionCls: 'warning', detail: 'Apr 2026 · $3,624.00 → $3,612.00 · "rounding correction"' },
  ],
  ag7: [
    { when: '2026-05-17 11:02', actor: 'finance@ergos.com', action: 'Marked Paid', actionCls: 'success', detail: 'Apr 2026 · WIRE-CT-04 · $2,140.00 (2 days late)' },
    { when: '2026-05-08 09:00', actor: 'system (cron)',    action: 'Auto-created', actionCls: 'grey',   detail: 'May 2026 cycle · $2,950.00 · due Jun 15' },
  ],
  ag14: [
    { when: '2026-06-04 09:00', actor: 'system (cron)',    action: 'Overdue',      actionCls: 'destructive', detail: 'May 2026 cycle · $3,205.00 · 18 days past due' },
    { when: '2026-05-08 09:00', actor: 'system (cron)',    action: 'Auto-created', actionCls: 'grey',   detail: 'May 2026 cycle · $3,205.00 · due May 17' },
    { when: '2026-04-22 16:48', actor: 'finance@ergos.com', action: 'Marked Paid', actionCls: 'success', detail: 'Apr 2026 · WIRE-SMT-04 · $2,800.00 (7 days late)' },
  ],
  ag22: [
    { when: '2026-05-08 09:00', actor: 'system (cron)', action: 'Auto-created', actionCls: 'grey', detail: 'May 2026 cycle · $1,840.00 · due Jun 15' },
  ],
  ag31: [
    { when: '2026-05-13 10:15', actor: 'finance@ergos.com', action: 'Marked Paid', actionCls: 'success', detail: 'Apr 2026 · WIRE-DI-04 · $1,380.00' },
    { when: '2026-05-08 09:00', actor: 'system (cron)',    action: 'Auto-created', actionCls: 'grey',   detail: 'May 2026 cycle · $1,420.00 · due Jun 15' },
  ],
};

function frSelectAgency(linkOrRow) {
  const row = linkOrRow.closest('tr');
  if (!row) return;
  const agencyId = row.dataset.agencyId;
  const agencyName = row.dataset.agencyName || row.querySelector('strong')?.textContent;
  if (!agencyId) return;
  const s = FR_AGENCY_STATS[agencyId];
  if (!s) { boToast('No drilldown data for ' + agencyName, 'warn'); return; }

  // Update title
  const nameEl = document.getElementById('fr-detail-agency-name');
  if (nameEl) nameEl.textContent = s.name;

  // Update stat grid
  const grid = document.getElementById('fr-detail-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="fr-detail-stat"><div class="fr-detail-label">Total billed</div><div class="fr-detail-value">$${s.totalBilled.toLocaleString()}</div><div class="muted">last 6 months</div></div>
      <div class="fr-detail-stat fr-detail-stat-pos"><div class="fr-detail-label">Total paid</div><div class="fr-detail-value">$${s.totalPaid.toLocaleString()}</div><div class="muted">${s.cycles}</div></div>
      <div class="fr-detail-stat ${s.flag === 'overdue' ? 'fr-detail-stat-warn' : 'fr-detail-stat-warn'}"><div class="fr-detail-label">Currently pending</div><div class="fr-detail-value">$${s.pending.toLocaleString()}</div><div class="muted">${s.dueText}</div></div>
      <div class="fr-detail-stat"><div class="fr-detail-label">Avg days to pay</div><div class="fr-detail-value">${s.avgDays}</div><div class="muted">${s.tone}</div></div>`;
  }

  // Update audit trail
  const auditTbody = document.querySelector('#fr-audit-table tbody');
  if (auditTbody) {
    const entries = FR_AGENCY_AUDIT[agencyId] || [];
    auditTbody.innerHTML = entries.length
      ? entries.map(e => `<tr><td class="bb-mono">${e.when}</td><td>${e.actor}</td><td><span class="badge badge-${e.actionCls}">${e.action}</span></td><td>${e.detail}</td></tr>`).join('')
      : `<tr><td colspan="4" class="muted" style="text-align:center; padding:18px">No audit entries for ${s.name} yet.</td></tr>`;
  }

  // Highlight row in the upper table
  document.querySelectorAll('#fr-table tbody tr').forEach(r => r.classList.remove('fr-row-selected'));
  row.classList.add('fr-row-selected');

  // Flash + scroll the drilldown card
  const card = document.getElementById('fr-detail-card');
  if (card) {
    card.classList.remove('fr-detail-just-swapped');
    void card.offsetWidth;
    card.classList.add('fr-detail-just-swapped');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  boToast(`Loaded drilldown for ${s.name}`, 'info');
}

/* KPI drilldown — filter list to the chosen status bucket */
function frKpiDrilldown(bucket) {
  const sel = document.getElementById('fr-filter-status');
  if (!sel) return;
  if (bucket === 'outstanding') sel.value = 'all'; // outstanding = pending + overdue, show all then filter
  else if (bucket === 'overdue') sel.value = 'overdue';
  else if (bucket === 'paid') sel.value = 'paid';
  sel.dispatchEvent(new Event('change'));
  // Scroll to list
  document.querySelector('.fr-list-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const label = bucket === 'outstanding' ? 'all outstanding remittances' : bucket === 'overdue' ? 'overdue remittances' : 'paid remittances';
  boToast('Filtered to ' + label, 'info');
}

/* Type-aware column sort */
function frSortBy(th, key, type) {
  const tbody = document.querySelector('#fr-table tbody');
  if (!tbody) return;
  const current = th.getAttribute('data-sort-active');
  const next = current === 'asc' ? 'desc' : 'asc';
  document.querySelectorAll('#fr-table th[data-sortable]').forEach(h => {
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
      if (/^—/.test(text) || /on time/i.test(text)) return -Infinity;
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

/* Per-row Modify Status modal */
let _frStatusRow = null;
function frOpenModifyStatus(btn) {
  _frStatusRow = btn.closest('tr');
  if (!_frStatusRow) return;
  const agency = _frStatusRow.dataset.agencyName || '';
  const period = _frStatusRow.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
  const amount = _frStatusRow.querySelector('.fr-amt')?.textContent?.trim() || '';
  const currentStatus = _frStatusRow.dataset.status || 'pending';
  const modal = document.getElementById('fr-status-modal');
  if (!modal) return;
  const summary = document.getElementById('fr-status-summary');
  if (summary) {
    summary.innerHTML = `<div><strong>${agency}</strong> · ${period} · ${amount}</div>
      <div style="margin-top:4px; font-size:12px">Currently <strong>${currentStatus}</strong>. Changes are immutably audited.</div>`;
  }
  document.getElementById('fr-status-new').value = currentStatus === 'paid' ? 'pending' : 'paid';
  document.getElementById('fr-status-ref').value = '';
  document.getElementById('fr-status-reason').value = '';
  modal.classList.add('open');
  setTimeout(() => document.getElementById('fr-status-reason').focus(), 80);
}
function frCloseModifyStatus() {
  document.getElementById('fr-status-modal')?.classList.remove('open');
  _frStatusRow = null;
}
function frSaveModifyStatus() {
  const newStatus = document.getElementById('fr-status-new')?.value;
  const ref = document.getElementById('fr-status-ref')?.value?.trim();
  const reason = document.getElementById('fr-status-reason')?.value?.trim();
  if (!newStatus) { boToast('Pick a new status', 'error'); return; }
  if (newStatus === 'paid' && !ref) { boToast('Wire reference required when marking paid', 'error'); return; }
  if (!reason || reason.length < 6) { boToast('Reason required (audited) — please describe what changed', 'error'); return; }
  if (_frStatusRow) {
    const oldStatus = _frStatusRow.dataset.status;
    const statusCell = _frStatusRow.querySelector('td:nth-child(5)');
    const lateCell = _frStatusRow.querySelector('td:nth-child(6)');
    const actionCell = _frStatusRow.querySelector('td:last-child');

    if (newStatus === 'paid') {
      if (statusCell) statusCell.innerHTML = '<span class="badge badge-success"><i class="ti ti-check"></i> Paid</span>';
      if (lateCell) lateCell.innerHTML = '<span class="muted">just now</span>';
      _frStatusRow.classList.remove('fr-row-overdue');
      _frStatusRow.classList.add('fr-row-paid');
    } else if (newStatus === 'overdue') {
      if (statusCell) statusCell.innerHTML = '<span class="badge badge-destructive">Overdue</span>';
      _frStatusRow.classList.remove('fr-row-paid');
      _frStatusRow.classList.add('fr-row-overdue');
    } else {
      // pending
      if (statusCell) statusCell.innerHTML = '<span class="badge badge-warning">Pending</span>';
      if (lateCell) lateCell.innerHTML = '—';
      _frStatusRow.classList.remove('fr-row-paid', 'fr-row-overdue');
    }
    _frStatusRow.dataset.status = newStatus;
    // Update primary action button to reflect new status
    if (actionCell) {
      const primary = actionCell.querySelector('.btn-sm');
      if (primary) {
        if (newStatus === 'paid') {
          primary.outerHTML = '<button class="btn btn-sm" onclick="frOpenDetail(this)">View</button>';
        } else {
          primary.outerHTML = '<button class="btn btn-sm btn-primary" onclick="frOpenMarkPaid(this)">Mark Paid</button>';
        }
      }
    }

    _frStatusRow.classList.remove('fr-row-just-changed');
    void _frStatusRow.offsetWidth;
    _frStatusRow.classList.add('fr-row-just-changed');
    _frStatusRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    boToast(`Status changed: ${oldStatus} → ${newStatus} · "${reason.slice(0, 50)}${reason.length > 50 ? '…' : ''}" logged`, 'success');
  }
  frCloseModifyStatus();
}

/* Per-row Adjust amount — replaces the old global-only Adjust */
function frOpenAdjustForRow(btn) {
  _frAdjustRow = btn.closest('tr');
  if (!_frAdjustRow) { boToast('Row not found', 'error'); return; }
  const modal = document.getElementById('fr-adjust-modal');
  if (!modal) return;
  const current = _frAdjustRow.querySelector('.fr-amt')?.textContent || '$0';
  const agency = _frAdjustRow.dataset.agencyName || '';
  const period = _frAdjustRow.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
  const summary = modal.querySelector('.fr-modal-summary');
  if (summary) summary.innerHTML = `Adjusting <strong>${agency} · ${period}</strong>. Adjustments require a reason and are immutably audited.`;
  modal.querySelector('#fr-adjust-current').value = current;
  const numeric = parseFloat(current.replace(/[^0-9.]/g, '')) || 0;
  modal.querySelector('#fr-adjust-new').value = numeric.toFixed(2);
  modal.querySelector('#fr-adjust-reason').value = '';
  modal.classList.add('open');
  setTimeout(() => modal.querySelector('#fr-adjust-new').focus(), 80);
}

/* Esc closes the new status modal too */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('fr-status-modal')?.classList.remove('open');
  }
});
