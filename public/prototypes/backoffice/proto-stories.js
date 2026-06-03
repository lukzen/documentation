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
   D1: Hotel Price Composition — enriched with 4-tier resolver

   For each hotel:
   1. Compute the Ergos-side cascade (GDS net → chain discount → Ergos markup
      → Ergos sell)
   2. For each agency that books on this hotel, resolve THEIR markup using
      the 4-tier rule cascade (hotel > category > country > chain > default)
   3. Show the winning tier + reason + resulting customer price per row

   Demo data wires real tier matches per hotel + per agency, so picking
   different hotels in the select rewires which tier wins for which
   agency — admin can audit "why is X paying $244 vs Y paying $230 for
   the same hotel?" in one screen.
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

// Hotels now carry chainId/country/categories so the resolver can match.
const _hpbHotels = {
  'Iberostar Grand Packard': {
    code: 'IB-GP-HAV', city: 'Havana, Cuba',
    chainPct: 10, ergosPct: 17.5, brand: 'IBEROSTAR',
    chainId: 'iberostar', country: 'cu', categories: ['5star-ai'],
  },
  'Hyatt Ziva Cap Cana': {
    code: 'HZ-CC-DOM', city: 'Punta Cana, DR',
    chainPct: 7, ergosPct: 19.4, brand: 'HYATT',
    chainId: 'hyatt', country: 'do', categories: ['5star-ai'],
  },
  'Memories Varadero': {
    code: 'MM-VAR-CUB', city: 'Varadero, Cuba',
    chainPct: 0, ergosPct: 18.4, brand: '— (independent)',
    chainId: null, country: 'cu', categories: ['4star-ai'],
  },
};

// Each agency carries its own 4-tier ruleset. The resolver walks
// hotel → category → country → chain → default for each agency
// against the currently-selected hotel.
const D1_AGENCIES = [
  {
    name: 'Demo Agency', lic: 'ag1 · LIC-12345', bookings: 12, defaultPct: 15,
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
    name: 'Caribe Tours', lic: 'ag7 · LIC-23488', bookings: 8, defaultPct: 15,
    rules: {
      chain: [{ target: 'iberostar', pct: 18 }, { target: 'hyatt', pct: 20 }],
    },
  },
  {
    name: 'Sol Mar Travel', lic: 'ag14 · LIC-31202', bookings: 5, defaultPct: 15,
    rules: {
      country: [{ target: 'cu', pct: 14 }],
      hotel:   [{ target: 'Iberostar Grand Packard', pct: 18 }],
    },
  },
  {
    name: 'Viajes Mediterráneo', lic: 'ag22 · LIC-44120', bookings: 3, defaultPct: 12,
    rules: {},
  },
  {
    name: 'Destinos Ibérica', lic: 'ag31 · LIC-55708', bookings: 2, defaultPct: 15,
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

const D1_TIER_LABELS = {
  hotel:    { label: '<i class="ti ti-bed"></i> T1 hotel',                  cls: 'd1-tier-hotel' },
  category: { label: '<i class="ti ti-star"></i> T2 category',              cls: 'd1-tier-category' },
  country:  { label: '<i class="ti ti-world"></i> T3 country',              cls: 'd1-tier-country' },
  chain:    { label: '<i class="ti ti-building-skyscraper"></i> T4 chain', cls: 'd1-tier-chain' },
  default:  { label: '<i class="ti ti-asterisk"></i> T5 default',           cls: 'd1-tier-default' },
};

function hpbRecompute() {
  const screen = document.getElementById('screen-hotel-price-breakdown');
  if (!screen) return;
  const sel = screen.querySelector('.hpb-select');
  const supNetInput = screen.querySelector('.hpb-field input[type="number"]');
  const hotelKey = sel?.value?.split(' · ')[0] || 'Iberostar Grand Packard';
  const hotelInfo = _hpbHotels[hotelKey] || _hpbHotels['Iberostar Grand Packard'];
  const hotelMeta = { name: hotelKey, ...hotelInfo };
  const supplierNet = parseFloat(supNetInput?.value || '200');

  // 1. Ergos-side cascade (unchanged) ----------
  const cascadeBody = screen.querySelector('.hpb-cascade tbody');
  if (cascadeBody) {
    const afterChain = supplierNet * (1 - hotelInfo.chainPct / 100);
    const afterMarkup = afterChain * (1 + hotelInfo.ergosPct / 100);
    const afterRebate = afterMarkup * (1 - 0.03);
    cascadeBody.innerHTML = `
      <tr class="hpb-row-net"><td><strong>GDS supplier net</strong></td><td>—</td><td class="bb-mono">${hotelInfo.code}</td><td class="text-right hpb-amt">$${supplierNet.toFixed(2)}</td></tr>
      <tr><td>Chain discount</td><td class="hpb-neg">−${hotelInfo.chainPct.toFixed(1)}%</td><td><span class="hpb-source-tag">chain_rule</span> ${hotelInfo.brand}</td><td class="text-right">$${afterChain.toFixed(2)}</td></tr>
      <tr><td>Ergos markup</td><td class="hpb-pos">+${hotelInfo.ergosPct.toFixed(1)}%</td><td><span class="hpb-source-tag hpb-source-cascade">gds_rule → chain_rule</span></td><td class="text-right">$${afterMarkup.toFixed(2)}</td></tr>
      <tr class="hpb-row-sell"><td><strong>Ergos sell</strong></td><td>—</td><td class="muted">price agencies pay Ergos</td><td class="text-right hpb-amt hpb-amt-bold">$${afterMarkup.toFixed(2)}</td></tr>
      <tr><td>Agency rebate (typical)</td><td class="hpb-neg">−3.0%</td><td><span class="hpb-source-tag">agency_default</span></td><td class="text-right">$${afterRebate.toFixed(2)}</td></tr>
      <tr><td>Sales agent earning (typical)</td><td class="hpb-neg">−22.0% of gross</td><td><span class="hpb-source-tag">agent_tier_elite</span></td><td class="text-right">—</td></tr>
      <tr><td>Ops expense</td><td class="hpb-neg">−7.0% of gross</td><td><span class="hpb-source-tag">platform_default</span></td><td class="text-right">—</td></tr>`;
  }
  const cardHead = screen.querySelector('.hpb-cascade-card .card-head h3');
  if (cardHead) cardHead.innerHTML = 'Cascade for <strong>' + hotelKey + '</strong>';
  const brandBadge = screen.querySelector('.hpb-cascade-card .card-head .badge');
  if (brandBadge) brandBadge.textContent = 'Brand: ' + hotelInfo.brand;

  // 2. "This hotel matches" chips ----------
  const matchGrid = document.getElementById('hpb-match-grid');
  if (matchGrid) {
    const chips = [];
    if (hotelMeta.chainId && D1_CHAINS[hotelMeta.chainId]) {
      chips.push(`<span class="hpb-match-chip hpb-match-chip-chain"><i class="ti ti-building-skyscraper"></i> Chain · <strong>${D1_CHAINS[hotelMeta.chainId].name}</strong></span>`);
    } else {
      chips.push(`<span class="hpb-match-chip hpb-match-chip-none"><i class="ti ti-building-skyscraper"></i> No chain — chain rules don't apply</span>`);
    }
    if (hotelMeta.country && D1_COUNTRIES[hotelMeta.country]) {
      chips.push(`<span class="hpb-match-chip hpb-match-chip-country"><i class="ti ti-world"></i> Country · <strong>${D1_COUNTRIES[hotelMeta.country].name}</strong></span>`);
    }
    (hotelMeta.categories || []).forEach(catId => {
      const c = D1_CATEGORIES[catId];
      if (c) chips.push(`<span class="hpb-match-chip hpb-match-chip-category"><i class="ti ti-star"></i> Category · <strong>${c.name}</strong></span>`);
    });
    if (!chips.length) chips.push(`<span class="hpb-match-chip hpb-match-chip-none">No tier matches — only Default rules apply</span>`);
    matchGrid.innerHTML = chips.join('');
  }

  // 3. Per-agency rows ----------
  const afterChain = supplierNet * (1 - hotelInfo.chainPct / 100);
  const ergosSell = afterChain * (1 + hotelInfo.ergosPct / 100);
  const tierTotals = { hotel: 0, category: 0, country: 0, chain: 0, default: 0 };
  const agencyBody = document.getElementById('hpb-agencies-tbody');
  if (agencyBody) {
    agencyBody.innerHTML = D1_AGENCIES.map(a => {
      const r = d1ResolveAgencyTier(a, hotelMeta);
      tierTotals[r.tier]++;
      const customer = ergosSell * (1 + r.pct / 100);
      const income = customer - ergosSell;
      const tier = D1_TIER_LABELS[r.tier];
      return `<tr>
        <td><strong>${a.name}</strong><span class="hpb-agency-id">${a.lic}</span></td>
        <td><span class="d1-tier ${tier.cls}">${tier.label}</span></td>
        <td><span class="hpb-rule-reason">${r.reason}</span></td>
        <td class="text-right hpb-mk-pct">${r.pct}%</td>
        <td class="text-right hpb-mk-amt">$${customer.toFixed(2)}</td>
        <td class="text-right hpb-pos">+$${income.toFixed(2)}</td>
        <td class="text-right">${a.bookings}</td>
      </tr>`;
    }).join('');
  }

  // 4. Tier-coverage stats ----------
  const coverage = document.getElementById('hpb-tier-coverage');
  if (coverage) {
    const order = ['hotel', 'category', 'country', 'chain', 'default'];
    coverage.innerHTML = order.map(t => {
      const tier = D1_TIER_LABELS[t];
      return `<div class="hpb-tier-cell hpb-tier-cell-${t}">
        <div class="hpb-tier-cell-count">${tierTotals[t]}</div>
        <div class="hpb-tier-cell-label">${tier.label}</div>
      </div>`;
    }).join('');
  }

  // 5. Agency count
  const countEl = document.getElementById('hpb-agency-count');
  if (countEl) countEl.textContent = D1_AGENCIES.length + ' agencies';

  boToast('Recomputed for ' + hotelKey + ' at $' + supplierNet.toFixed(2) + ' supplier net', 'success');
}
function hpbExportCsv() {
  const screen = document.getElementById('screen-hotel-price-breakdown');
  // Header block: which hotel + supplier net
  const hotelName = screen.querySelector('.hpb-cascade-card .card-head h3 strong')?.textContent || '';
  const supplierNet = screen.querySelector('.hpb-field input[type="number"]')?.value || '';
  const rows = [
    ['Hotel Price Composition'],
    ['Hotel', hotelName],
    ['Supplier net (USD)', supplierNet],
    [''],
    ['Ergos-side cascade'],
    ['Layer', 'Pct', 'Source', 'Running cost USD'],
  ];
  screen.querySelectorAll('.hpb-cascade tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g, ' ').trim());
    rows.push(cells);
  });
  // "This hotel matches" chips
  rows.push(['']);
  rows.push(['Hotel matches']);
  const chips = Array.from(screen.querySelectorAll('.hpb-match-chip'))
    .map(c => c.textContent.replace(/\s+/g, ' ').trim());
  chips.forEach(c => rows.push([c]));
  // Per-agency rows — now includes Applied tier + Rule reason
  rows.push(['']);
  rows.push(['Per-agency effective customer price']);
  rows.push([
    'Agency',
    'Applied tier',
    'Rule reason',
    'Markup %',
    'Customer pays',
    'Markup income',
    'Bookings (90d)',
  ]);
  screen.querySelectorAll('.hpb-agencies tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td =>
      td.textContent.replace(/\s+/g, ' ').trim()
    );
    rows.push(cells);
  });
  // Tier coverage stats trailing block
  rows.push(['']);
  rows.push(['Tier coverage across active agencies']);
  rows.push(['Tier', 'Agency count']);
  screen.querySelectorAll('.hpb-tier-cell').forEach(cell => {
    const label = cell.querySelector('.hpb-tier-cell-label')?.textContent?.trim() || '';
    const count = cell.querySelector('.hpb-tier-cell-count')?.textContent?.trim() || '0';
    rows.push([label, count]);
  });
  boTriggerCsv(rows, 'hotel-price-composition.csv');
  const agencyCount = screen.querySelectorAll('.hpb-agencies tbody tr').length;
  boToast(`Exported full breakdown for ${hotelName} (${agencyCount} agencies, tier + reason included)`, 'success');
}
function hpbExportPdf() {
  boToast('PDF export sent to your downloads (stub in prototype)', 'info');
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
        try { hpbRecompute(); } finally { window.boToast = wasToast; }
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
