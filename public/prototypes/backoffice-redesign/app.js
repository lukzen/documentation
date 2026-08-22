/* ============================================================
   Ergos Backoffice — REORGANIZATION prototype
   Separate from ../backoffice (untouched). Same visual language,
   new information architecture. Hash-routed (#/screen/param) so
   every drill-in is deep-linkable and browser Back works.
   Standing table rules: every table sortable (type-aware), a
   contextual filter bar (date presets FIRST, status chips,
   entity typeahead, free-text search, active-filter chips),
   and columns trimmed to the table's purpose (rest in detail).
   ============================================================ */

/* ---------- formatting (one currency format everywhere) ---------- */
const fmt = n => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const pctf = p => {
  const v = +(p * 100).toFixed(2);
  return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + '%';
};

/* ---------- one badge style everywhere ---------- */
const BADGE_VARIANT = {
  Confirmed:'success', Completed:'info', Pending:'warning', Cancelled:'destructive',
  Paid:'success', Overdue:'destructive', Accrued:'warning',
  Active:'success', Suspended:'destructive', Accepted:'success', Expired:'grey',
  Signed:'gold', 'No discount':'grey',
  Created:'success', Modified:'warning', 'Cancel Attempt':'warning', Payment:'info',
  OK:'success', Failed:'destructive'
};
const badge = s => `<span class="badge badge-${BADGE_VARIANT[s] || 'grey'}">${s}</span>`;
const marginBadge = m =>
  `<span class="badge badge-${m < 0 ? 'destructive' : 'success'}">margin ${m < 0 ? '−' : ''}${Math.abs(m * 100).toFixed(1)}%</span>`;
const chip = (kind, txt, title) => `<span class="chip chip-${kind}"${title ? ` title="${title}"` : ''}>${txt}</span>`;

/* ---------- link mesh: every ↗ is a real navigation ---------- */
const xlink = (label, hash) =>
  `<a class="xlink" href="#/${hash}" onclick="event.stopPropagation()">${label} <span class="x-arrow">↗</span></a>`;

/* ============================================================
   DEMO DATA — same entities as ../backoffice (Sunshine / Havana
   Nights / Coral / Palma, PTA refs, credit numbers unchanged).
   ============================================================ */
const AGENCIES = [
  {id:'agc1', name:'Sunshine Travel LLC', contact:'Alicia Romero', email:'alicia@sunshinetravel.com', license:'LIC-70211', vendors:['Dingus','Hotetec'], status:'Active', rebate:.03,
    credit:{type:'DEPOSIT', funding:6100, util:10150, nr:true, note:'<span class="st-pill st-pending">83% used — notified · overdraft $230.00 cover due Aug 24</span>'},
    employees:[['Alicia Romero','alicia@sunshinetravel.com','Manager','Accepted'],['Tom Baker','tom@sunshinetravel.com','Agent','Accepted'],['Rita Osei','rita@sunshinetravel.com','Agent','Pending']],
    ledger:[['Aug 12','DEPOSIT','st-pending','+$2,200.00','Bank ref 88213 — doubled: +$4,400.00 power'],
            ['Jul 21','DEPOSIT','st-pending','+$3,900.00','Initial funding — bank ref 87410 — doubled: +$7,800.00 power']]},
  {id:'agc2', name:'Havana Nights Tours', contact:'Yosvany Pérez', email:'yosvany@havananights.cu', license:'LIC-70544', vendors:['Dingus','Restel'], status:'Active', rebate:.05,
    credit:{type:'GRANTED', funding:2000, util:2300, nr:false, frozen:true, note:'<span class="st-pill st-frozen">FROZEN — grant revoked below utilization · no new bookings until settled</span>'},
    employees:[['Yosvany Pérez','yosvany@havananights.cu','Manager','Accepted'],['María León','maria@havananights.cu','Agent','Accepted']],
    ledger:[['Aug 18','GRANT','st-paid','+$2,000.00','Onboarding — trusted partner, 3 yrs history'],
            ['Aug 02','GRANT_REVOKE','st-pending','−$3,000.00','Late settlements — line pulled pending review'],
            ['Jun 12','GRANT','st-paid','+$3,000.00','Initial credit line']]},
  {id:'agc3', name:'Coral Voyages', contact:'Nadia Fontaine', email:'nadia@coralvoyages.com', license:'LIC-70819', vendors:['Roibos'], status:'Active', rebate:0,
    credit:{type:'DEPOSIT', funding:2200, util:1150, nr:false, note:'<span class="st-pill st-paid">OK</span>'},
    employees:[['Nadia Fontaine','nadia@coralvoyages.com','Manager','Accepted'],['Luc Marchand','luc@coralvoyages.com','Agent','Accepted']],
    ledger:[['Jul 25','DEPOSIT','st-pending','+$2,200.00','Initial funding — bank ref 87892 — doubled: +$4,400.00 power']]},
  {id:'agc4', name:'Palma Tours Inc', contact:'Jordi Vila', email:'jordi@palmatours.es', license:'LIC-70932', vendors:['Hotetec','Restel'], status:'Active', rebate:.02,
    credit:{type:'GRANTED', funding:5000, util:680, nr:false, note:'<span class="st-pill st-paid">OK</span>'},
    employees:[['Jordi Vila','jordi@palmatours.es','Manager','Accepted'],['Anna Puig','anna@palmatours.es','Supervisor','Accepted'],['Marc Soler','marc@palmatours.es','Agent','Expired']],
    ledger:[['Jul 28','GRANT','st-paid','+$5,000.00','Annual credit line — signed partner agreement']]},
  {id:'agc5', name:'Marina Bay Escapes', contact:'Dana Whitfield', email:'dana@marinabay.com', license:'LIC-71006', vendors:['Roibos'], status:'Pending', rebate:0,
    credit:null, employees:[['Dana Whitfield','dana@marinabay.com','Manager','Pending']], ledger:[]}
];
const agency = id => AGENCIES.find(a => a.id === id);
const AG_NAMES = AGENCIES.map(a => a.name);
const VENDOR_NAMES = ['Dingus','Hotetec','Roibos','Restel'];

const HOTELS = [
  {id:'h1', code:'HT00108', name:'Iberostar Grand Packard', city:'Havana',     vendor:'Dingus',  brand:'Iberostar', stars:5, markup:17.5, adj:0,    sync:'2026-08-18'},
  {id:'h2', code:'HT00214', name:'Hyatt Ziva Cap Cana',     city:'Punta Cana', vendor:'Roibos',  brand:'Hyatt',     stars:5, markup:19.4, adj:2.5,  sync:'2026-08-17'},
  {id:'h3', code:'HT00342', name:'Meliá Palma Bay',         city:'Palma',      vendor:'Hotetec', brand:'Meliá',     stars:4, markup:17.0, adj:-1.5, sync:'2026-08-18'},
  {id:'h4', code:'HT00477', name:'Marriott Aruba Surf Club',city:'Palm Beach', vendor:'Restel',  brand:'Marriott',  stars:4, markup:18.0, adj:0,    sync:'2026-08-16'},
  {id:'h5', code:'HT00519', name:'RIU Palace Aruba',        city:'Palm Beach', vendor:'Dingus',  brand:'RIU',       stars:5, markup:19.6, adj:0,    sync:'2026-08-18'},
  {id:'h6', code:'HT00633', name:'Paradisus Río de Oro',    city:'Holguín',    vendor:'Dingus',  brand:'Meliá',     stars:5, markup:20.0, adj:0,    sync:'2026-08-15'}
];
const hotel = id => HOTELS.find(h => h.id === id);
const BRAND_NAMES = [...new Set(HOTELS.map(h => h.brand))];

const BRANDS = [
  {name:'Iberostar Group',            code:'IBEROSTAR', disc:.125, status:'Signed',      note:'Effective Mar 2026 – Mar 2027.'},
  {name:'Meliá Hotels International', code:'MELIA',     disc:.10,  status:'Signed',      note:'Includes Paradisus properties.'},
  {name:'RIU Hotels & Resorts',       code:'RIU',       disc:.085, status:'Pending',     note:'Contract under legal review — discount inactive.'},
  {name:'Marriott International',     code:'MARRIOTT',  disc:0,    status:'No discount', note:'Brand grouping only.'},
  {name:'Hyatt Hotels Corporation',   code:'HYATT',     disc:.07,  status:'Signed',      note:'Ziva / Zilara all-inclusive.'}
];
/* Active (signed) brand discount for a hotel */
const brandDisc = h => (BRANDS.find(b => b.status === 'Signed' && b.name.startsWith(h.brand)) || {disc:0}).disc;

/* Bookings — the money model is identical to ../backoffice's waterfall */
const BOOKINGS = [
  {ref:'PTA10293', agencyId:'agc1', hotelId:'h1', guest:'Laura Méndez',  guests:2, booked:'Jul 28', pkey:'2026-07', checkin:'Sep 12', nights:2, room:'Classic Room', status:'Confirmed', pay:'credit', net:412.00,  brandDisc:.125, markup:.175, rebate:.03, agentPct:.22, opsPct:.07, agentId:'sa1'},
  {ref:'PTA10312', agencyId:'agc1', hotelId:'h6', guest:'Omar Delgado',  guests:2, booked:'Jul 21', pkey:'2026-07', checkin:'Aug 30', nights:3, room:'Junior Suite', status:'Confirmed', pay:'credit', net:1820.00, brandDisc:.10,  markup:.20,  rebate:.03, agentPct:.22, opsPct:.07, agentId:'sa1'},
  {ref:'PTA10301', agencyId:'agc3', hotelId:'h2', guest:'Émile Girard',  guests:2, booked:'Aug 02', pkey:'2026-08', checkin:'Oct 03', nights:4, room:'Ocean Suite',  status:'Confirmed', pay:'card',   net:1240.00, brandDisc:.07,  markup:.194, rebate:0,   agentPct:.22, opsPct:.07, agentId:'sa2'},
  {ref:'PTA10288', agencyId:'agc4', hotelId:'h3', guest:'Anna Puig',     guests:2, booked:'Jul 30', pkey:'2026-07', checkin:'Aug 08', nights:2, room:'Superior Room',status:'Completed', pay:'credit', net:564.00,  brandDisc:.10,  markup:.17,  rebate:.02, agentPct:.18, opsPct:.07, agentId:'sa2'},
  {ref:'PTA10275', agencyId:'agc2', hotelId:'h4', guest:'Yunia Torres',  guests:3, booked:'Aug 09', pkey:'2026-08', checkin:'Sep 01', nights:3, room:'Deluxe Room',  status:'Confirmed', pay:'card',   net:980.00,  brandDisc:0,    markup:.037, rebate:.05, agentPct:.22, opsPct:.07, agentId:'sa3', note:'legacy rate-match override'},
  {ref:'PTA10266', agencyId:'agc1', hotelId:'h5', guest:'Peter Hall',    guests:2, booked:'Jul 14', pkey:'2026-07', checkin:'Aug 21', nights:5, room:'Junior Suite', status:'Cancelled', pay:'card',   net:1580.00, brandDisc:.085, markup:.196, rebate:.03, agentPct:.22, opsPct:.07, agentId:'sa1'},
  {ref:'PTA10241', agencyId:'agc1', hotelId:'h3', guest:'Sofía Marín',   guests:2, booked:'Jul 09', pkey:'2026-07', checkin:'Jul 25', nights:2, room:'Classic Room', status:'Completed', pay:'credit', net:540.00,  brandDisc:.10,  markup:.167, rebate:.03, agentPct:.22, opsPct:.07, agentId:'sa3'},
  {ref:'PTA10228', agencyId:'agc1', hotelId:'h2', guest:'James Low',     guests:2, booked:'Jul 03', pkey:'2026-07', checkin:'Jul 19', nights:3, room:'Ocean Suite',  status:'Completed', pay:'card',   net:1360.00, brandDisc:.07,  markup:.184, rebate:.03, agentPct:.22, opsPct:.07, agentId:'sa1'}
];
const booking = ref => BOOKINGS.find(b => b.ref === ref);
const STATUSES = ['Confirmed','Pending','Cancelled','Completed'];

/* One money model — used by every waterfall (historical and forward) */
const CARD_FEE_PCT = .03;
function calc(b) {
  const adj = b.net * (1 - b.brandDisc);
  const sell = adj * (1 + b.markup);
  const eff = sell * (1 - b.rebate);
  const gross = eff - adj;
  const agentEarn = gross > 0 ? gross * b.agentPct : 0;
  const ops = gross > 0 ? gross * b.opsPct : 0;
  const net = gross - agentEarn - ops;
  const fee = b.pay === 'card' ? eff * CARD_FEE_PCT : 0;
  return {adj, sell, eff, gross, agentEarn, ops, net, margin: net / sell, fee, charged: eff + fee};
}

const AGENTS = [
  {id:'sa1', name:'Carlos Ortega', email:'carlos.ortega@ergos.com', city:'Miami',  tier:'Elite',   earn:22, ops:7, status:'Active'},
  {id:'sa2', name:'María Vega',    email:'maria.vega@ergos.com',    city:'Madrid', tier:'Growth',  earn:18, ops:7, status:'Active'},
  {id:'sa3', name:'Diego Flores',  email:'diego.flores@ergos.com',  city:'Cancún', tier:'Starter', earn:12, ops:8, status:'Active'}
];
const agent = id => AGENTS.find(a => a.id === id);

const COMMISSIONS = [
  {agentId:'sa1', period:'Jul 2026', bookings:14, gross:8375.00, earned:1842.50, status:'Paid'},
  {agentId:'sa2', period:'Jul 2026', bookings:9,  gross:6722.22, earned:1210.00, status:'Accrued'},
  {agentId:'sa3', period:'Jul 2026', bookings:6,  gross:5701.67, earned:684.20,  status:'Accrued'}
];

const REMITS = [
  {id:'rm1', agencyId:'agc1', period:'Jul 2026', pkey:'2026-07', amount:4050.00, due:'Aug 15, 2026', status:'Overdue', late:'+7 d',    bookings:37},
  {id:'rm2', agencyId:'agc2', period:'Jun 2026', pkey:'2026-06', amount:2300.00, due:'Jul 15, 2026', status:'Overdue', late:'+38 d',   bookings:21},
  {id:'rm3', agencyId:'agc3', period:'Jul 2026', pkey:'2026-07', amount:2140.00, due:'Aug 15, 2026', status:'Pending', late:'—',       bookings:19},
  {id:'rm4', agencyId:'agc4', period:'Jul 2026', pkey:'2026-07', amount:680.00,  due:'Aug 15, 2026', status:'Pending', late:'—',       bookings:6},
  {id:'rm5', agencyId:'agc1', period:'Jun 2026', pkey:'2026-06', amount:3612.00, due:'Jul 15, 2026', status:'Paid',    late:'on time', bookings:33, wire:'WIRE-2026-06-SUN'},
  {id:'rm6', agencyId:'agc3', period:'Jun 2026', pkey:'2026-06', amount:1890.00, due:'Jul 15, 2026', status:'Paid',    late:'+2 d',    bookings:15, wire:'WIRE-2026-06-CV'}
];

const SETTLEMENTS = [
  {id:'SET-2026-0812-01', agencyId:'agc1', initiated:'Aug 12', amount:7500, method:'ACH (Square)',   status:'Pending',   pill:'st-pending', label:'Pending · ACH 2–3 days'},
  {id:'SET-2026-0809-02', agencyId:'agc3', initiated:'Aug 09', amount:2150, method:'Card (TropiPay)',status:'Completed', pill:'st-paid',    label:'Completed'},
  {id:'SET-2026-0808-03', agencyId:'agc4', initiated:'Aug 08', amount:4320, method:'ACH (Square)',   status:'Failed',    pill:'st-frozen',  label:'Failed · insufficient funds'}
];

const AUDIT = [
  {t:'Aug 19 14:32', ref:'PTA10312', action:'Modified',       trans:'CONFIRMED → CONFIRMED', vendor:'dingus',  result:'OK'},
  {t:'Aug 09 11:20', ref:'PTA10275', action:'Created',        trans:'— → CONFIRMED',         vendor:'restel',  result:'OK'},
  {t:'Aug 04 16:05', ref:'PTA10266', action:'Cancelled',      trans:'CONFIRMED → CANCELLED', vendor:'dingus',  result:'OK'},
  {t:'Aug 04 15:58', ref:'PTA10266', action:'Cancel Attempt', trans:'CONFIRMED → CONFIRMED', vendor:'dingus',  result:'Failed'},
  {t:'Aug 02 10:14', ref:'PTA10301', action:'Created',        trans:'— → CONFIRMED',         vendor:'roibos',  result:'OK'},
  {t:'Jul 30 09:41', ref:'PTA10288', action:'Created',        trans:'— → CONFIRMED',         vendor:'hotetec', result:'OK'},
  {t:'Jul 28 14:32', ref:'PTA10293', action:'Created',        trans:'— → CONFIRMED',         vendor:'dingus',  result:'OK'},
  {t:'Jul 28 14:31', ref:'PTA10293', action:'Payment',        trans:'soft credit — paid at confirm', vendor:'—', result:'OK'},
  {t:'Jul 21 12:09', ref:'PTA10312', action:'Created',        trans:'— → CONFIRMED',         vendor:'dingus',  result:'OK'}
];

const BO_USERS = [
  ['Admin','Demo','admin@ergos.com','ADMIN','Active'],
  ['Lucía','Navarro','lucia.navarro@ergos.com','IMPORTERS','Active'],
  ['Hugo','Castro','hugo.castro@ergos.com','USER','Active'],
  ['Elena','Ruiz','elena.ruiz@ergos.com','ADMIN','Suspended']
];
const ROLES = [
  ['Administrator','ADMIN','Full platform access',4],
  ['Travel Agency','TRAVEL_AGENCY','Agency owner workspace',126],
  ['Sales Agent','SALES_AGENT','Agent booking & commission view',284],
  ['Importers','IMPORTERS','Data import operators',6],
  ['User','USER','Read-only end user',1512]
];

/* Rules shown on Pricing Policy (cascade) — most specific wins */
const RULES = [
  {scope:'Global default',                     param:'Ergos markup',   value:'15.0%',  status:'base'},
  {scope:'Country · Cuba',                     param:'Ergos markup',   value:'17.5%',  status:'wins'},
  {scope:'Brand · Iberostar',                  param:'Brand discount', value:'−12.5%', status:'wins'},
  {scope:'Hotel · Iberostar Grand Packard',    param:'Ergos markup',   value:'— (inherits)', status:'inherits'},
  {scope:'Agency · Sunshine Travel LLC',       param:'Rebate',         value:'3.0%',   status:'wins'},
  {scope:'Tier · Elite (Carlos Ortega)',       param:'Agent share',    value:'22.0%',  status:'wins'}
];

/* ============================================================
   THE waterfall component — identical markup in all four homes:
   Pricing Policy (effective config), Price Composition (forward),
   Booking Breakdown + Reservation detail (historical).
   cascade = rule resolution · waterfall = money decomposition.
   ============================================================ */
function waterfall(b, opts = {}) {
  const c = calc(b);
  const feeRows = (opts.showFee && b.pay === 'card') ? `
      <tr class="wf-fee"><td>+ Card fee (${pctf(CARD_FEE_PCT)})</td><td class="text-right">+ ${fmt(c.fee)}</td></tr>
      <tr class="bb-sub"><td>= Charged to card</td><td class="text-right">${fmt(c.charged)}</td></tr>` : '';
  return `
    <table class="tbl bb-waterfall">
      <tr><td>Supplier net</td><td class="text-right">${fmt(b.net)}</td></tr>
      <tr class="bb-neg"><td>− Brand discount (${pctf(b.brandDisc)})</td><td class="text-right">× ${(1 - b.brandDisc).toFixed(3)}</td></tr>
      <tr class="bb-sub"><td>= Adjusted cost</td><td class="text-right">${fmt(c.adj)}</td></tr>
      <tr class="bb-pos"><td>+ Ergos markup (${pctf(b.markup)})</td><td class="text-right">× ${(1 + b.markup).toFixed(3)}</td></tr>
      <tr class="bb-sub bb-pos"><td>= Ergos sell</td><td class="text-right">${fmt(c.sell)}</td></tr>
      <tr class="bb-neg"><td>− Agency rebate (${pctf(b.rebate)})</td><td class="text-right">− ${fmt(c.sell - c.eff)}</td></tr>
      <tr class="bb-sub"><td>= Agency pays</td><td class="text-right">${fmt(c.eff)}</td></tr>${feeRows}
      <tr class="bb-neg"><td>− Adjusted cost</td><td class="text-right">− ${fmt(c.adj)}</td></tr>
      <tr class="bb-sub ${c.gross < 0 ? 'bb-neg' : 'bb-pos'}"><td>= Ergos gross</td><td class="text-right">${fmt(c.gross)}</td></tr>
      <tr class="bb-neg"><td>− Agent earning (${pctf(b.agentPct)})</td><td class="text-right">− ${fmt(c.agentEarn)}</td></tr>
      <tr class="bb-neg"><td>− Ops expense (${pctf(b.opsPct)})</td><td class="text-right">− ${fmt(c.ops)}</td></tr>
      <tr class="bb-final"><td>= Ergos net</td><td class="text-right">${fmt(c.net)} ${c.net < 0 ? '⚠' : ''}</td></tr>
    </table>
    <p class="wf-caption">${opts.caption || ''}</p>`;
}

/* ============================================================
   Shared table engine — standing rules for EVERY table:
   · all data columns sortable, ▲/▼ indicator, type-aware compare
   · filter bar: date presets FIRST (Today/7d/30d/Custom against
     the demo clock Aug 19 2026), status chips (multi-select),
     entity typeahead (datalist), free-text search — AND-combined
   · active-filter chips with × to clear
   ============================================================ */
const NOW = new Date('2026-08-19T23:59:59');
function pdate(s) {
  if (s instanceof Date) return s;
  if (/^[A-Za-z]{3} \d{4}$/.test(s)) return new Date(s.replace(' ', ' 1, '));   // 'Jul 2026'
  if (/\d{4}/.test(s)) return new Date(s);                                      // has a year
  const m = s.match(/^([A-Za-z]{3} \d{1,2})(.*)$/);                             // 'Aug 19 14:32' / 'Sep 12'
  return m ? new Date(m[1] + ', 2026' + m[2]) : new Date(s);
}
const money = s => parseFloat(String(s).replace('−', '-').replace(/[^0-9.-]/g, '')) || 0;

const TCFG = {}, TSTATE = {};
function table(id, cfg, seed) {
  TCFG[id] = cfg;
  TSTATE[id] = Object.assign({sortKey:null, sortDir:1, q:'', entity:'', statuses:[], preset:'all', from:'', to:''}, seed || {});
  const st = TSTATE[id];
  const pill = (label, val) => `<button class="fpill ${st.preset === val ? 'active' : ''}" data-preset="${val}" onclick="tPreset('${id}','${val}',this)" title="demo clock: Aug 19, 2026">${label}</button>`;
  const dateBar = cfg.date ? `
    <span class="tbar-label">${cfg.date.label}</span>
    ${pill('All','all')}${pill('Today','today')}${pill('7d','7d')}${pill('30d','30d')}${pill('Custom','custom')}
    <span class="tbar-custom" id="tcustom-${id}" ${st.preset === 'custom' ? '' : 'hidden'}>
      <input type="date" id="tfrom-${id}" value="${st.from}" onchange="tCustom('${id}')">
      <span>→</span>
      <input type="date" id="tto-${id}" value="${st.to}" onchange="tCustom('${id}')">
    </span>
    <span class="tbar-sep"></span>` : '';
  const statusBar = cfg.status ? cfg.status.options.map(s =>
    `<button class="fpill ${st.statuses.includes(s) ? 'active' : ''}" data-status="${s}" onclick="tStatus('${id}','${s}',this)">${s}</button>`).join('') : '';
  const entityBar = cfg.entity ? `
    <input class="tbar-input" id="te-${id}" list="dl-${id}" placeholder="${cfg.entity.placeholder}" value="${st.entity}" oninput="tEntity('${id}',this.value)">
    <datalist id="dl-${id}">${cfg.entity.options.map(o => `<option value="${o}">`).join('')}</datalist>` : '';
  const searchBar = cfg.search ? `<input class="tbar-input tbar-search" id="tq-${id}" placeholder="${cfg.search.placeholder}" value="${st.q}" oninput="tQ('${id}',this.value)">` : '';
  return `
  <div class="twrap" id="tw-${id}">
    <div class="tbar">
      ${dateBar}${statusBar}${entityBar}${searchBar}
      ${(cfg.chips || []).map(c => chip(c[0], c[1], c[2])).join('')}
    </div>
    <div class="tchips" id="tchips-${id}"></div>
    <div id="tb-${id}">${tTable(id)}</div>
  </div>`;
}

function tRange(st) {
  const day = 864e5;
  if (st.preset === 'today') { const s = new Date(NOW); s.setHours(0,0,0,0); return [s, NOW]; }
  if (st.preset === '7d')  return [new Date(NOW - 7 * day), NOW];
  if (st.preset === '30d') return [new Date(NOW - 30 * day), NOW];
  if (st.preset === 'custom') return [
    st.from ? new Date(st.from + 'T00:00:00') : new Date(0),
    st.to ? new Date(st.to + 'T23:59:59') : new Date('2100-01-01')];
  return null;
}
function tCmp(a, b) {
  if (a instanceof Date && b instanceof Date) return a - b;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
function tRows(id) {
  const cfg = TCFG[id], st = TSTATE[id];
  let rows = cfg.rows();
  if (st.q && cfg.search) { const q = st.q.toLowerCase(); rows = rows.filter(r => cfg.search.val(r).toLowerCase().includes(q)); }
  if (st.entity && cfg.entity) { const e = st.entity.toLowerCase(); rows = rows.filter(r => cfg.entity.val(r).toLowerCase().includes(e)); }
  if (st.statuses.length && cfg.status) rows = rows.filter(r => st.statuses.includes(cfg.status.val(r)));
  const range = cfg.date ? tRange(st) : null;
  if (range) rows = rows.filter(r => { const d = pdate(cfg.date.val(r)); return d >= range[0] && d <= range[1]; });
  if (st.sortKey) {
    const col = cfg.columns.find(c => c.key === st.sortKey);
    if (col) rows = [...rows].sort((a, b) => tCmp(col.val(a), col.val(b)) * st.sortDir);
  }
  return rows;
}
function tTable(id) {
  const cfg = TCFG[id], st = TSTATE[id], rows = tRows(id);
  const head = cfg.columns.map(c => c.sortable === false
    ? `<th class="${c.right ? 'text-right' : ''}">${c.label}</th>`
    : `<th class="th-sort ${c.right ? 'text-right' : ''}" onclick="tSort('${id}','${c.key}')" title="Sort by ${c.label}">${c.label}${st.sortKey === c.key ? (st.sortDir === 1 ? ' ▲' : ' ▼') : ''}</th>`).join('');
  const body = rows.length
    ? rows.map(r => `<tr ${cfg.rowAttrs ? cfg.rowAttrs(r) : ''}>${cfg.columns.map(c => `<td class="${c.right ? 'text-right' : ''}">${c.cell(r)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cfg.columns.length}" class="tbl-empty-cell">No rows match these filters.</td></tr>`;
  const foot = cfg.foot && rows.length ? `<tfoot>${cfg.foot(rows)}</tfoot>` : '';
  return `<table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
}
function tDraw(id) {
  const tb = document.getElementById('tb-' + id); if (!tb) return;
  tb.innerHTML = tTable(id);
  const st = TSTATE[id], cfg = TCFG[id], chips = [];
  const x = (kind, label, val) => `<span class="filter-chip">${label} <button onclick="tClear('${id}','${kind}'${val ? `,'${val}'` : ''})" title="Clear">×</button></span>`;
  if (cfg.date && st.preset !== 'all')
    chips.push(x('date', cfg.date.label + ': ' + (st.preset === 'custom' ? (st.from || '…') + ' → ' + (st.to || '…') : st.preset)));
  st.statuses.forEach(s => chips.push(x('status', s, s)));
  if (st.entity) chips.push(x('entity', st.entity));
  if (st.q) chips.push(x('q', '“' + st.q + '”'));
  const host = document.getElementById('tchips-' + id); if (host) host.innerHTML = chips.join('');
  const cnt = document.getElementById('tcount-' + id); if (cnt) cnt.textContent = tRows(id).length;
}
function tSort(id, key) { const st = TSTATE[id]; st.sortDir = st.sortKey === key ? -st.sortDir : 1; st.sortKey = key; tDraw(id); }
function tQ(id, v) { TSTATE[id].q = v; tDraw(id); }
function tEntity(id, v) { TSTATE[id].entity = v; tDraw(id); }
function tStatus(id, s, btn) {
  const st = TSTATE[id], i = st.statuses.indexOf(s);
  i >= 0 ? st.statuses.splice(i, 1) : st.statuses.push(s);
  if (btn) btn.classList.toggle('active');
  tDraw(id);
}
function tPreset(id, p, btn) {
  TSTATE[id].preset = p;
  if (btn) btn.parentElement.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b === btn));
  const c = document.getElementById('tcustom-' + id); if (c) c.hidden = p !== 'custom';
  tDraw(id);
}
function tCustom(id) {
  const st = TSTATE[id];
  st.from = document.getElementById('tfrom-' + id).value;
  st.to = document.getElementById('tto-' + id).value;
  st.preset = 'custom';
  tDraw(id);
}
function tClear(id, kind, val) {
  const st = TSTATE[id], tw = document.getElementById('tw-' + id);
  if (kind === 'q') { st.q = ''; const el = document.getElementById('tq-' + id); if (el) el.value = ''; }
  if (kind === 'entity') { st.entity = ''; const el = document.getElementById('te-' + id); if (el) el.value = ''; }
  if (kind === 'status') {
    const i = st.statuses.indexOf(val); if (i >= 0) st.statuses.splice(i, 1);
    const b = tw && tw.querySelector(`[data-status="${val}"]`); if (b) b.classList.remove('active');
  }
  if (kind === 'date') {
    st.preset = 'all'; st.from = ''; st.to = '';
    if (tw) tw.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === 'all'));
    const c = document.getElementById('tcustom-' + id); if (c) c.hidden = true;
  }
  tDraw(id);
}

/* ============================================================
   NAV — grouped by job. Moved items carry a "was:" chip.
   ============================================================ */
const NAV = [
  {title:'', items:[{id:'dashboard', icon:'▦', label:'Dashboard'}]},
  {title:'BackOffice Module', items:[
    {id:'backoffice', icon:'◉', label:'BackOffice', chips:[['merged','merged','Roles folded in as a tab — was a separate nav item']]}
  ]},
  {title:'Catalog', items:[
    {id:'hotels', icon:'◆', label:'Hotels', chips:[['was','was: Hotel Module']]},
    {id:'hotel-suppliers', icon:'☷', label:'Hotel Suppliers', chips:[['was','was: Partners']]}
  ]},
  {title:'Bookings', items:[
    {id:'reservations', icon:'▤', label:'Reservations', chips:[['was','was: Hotel Module']]},
    {id:'booking-breakdown', icon:'⊞', label:'Booking Breakdown', chips:[['was','was: Finance & Audit']]},
    {id:'audit-log', icon:'⊜', label:'Booking Audit Log', chips:[['was','was: Finance & Audit']]}
  ]},
  {title:'Pricing', items:[
    {id:'pricing-policy', icon:'⚙', label:'Pricing Policy', chips:[['was','was: Finance & Audit']]},
    {id:'hotel-brands', icon:'⌘', label:'Hotel Brands', chips:[['was','was: Finance & Audit']]},
    {id:'price-composition', icon:'⊟', label:'Price Composition', chips:[['was','was: Finance & Audit']]},
    {id:'commissions', icon:'%', label:'Commissions', chips:[['new','new in nav','was an orphan route — reachable only by typing the URL']]}
  ]},
  {title:'Finance', items:[
    {id:'remittances', icon:'$', label:'Agency Remittances', chips:[['was','was: Finance & Audit']]},
    {id:'settlement', icon:'¤', label:'Payments & Settlement', chips:[['was','was: Finance & Audit']]}
  ]},
  {title:'Partners', items:[
    {id:'agencies', icon:'◇', label:'Travel Agencies', chips:[['merged','+ Employment','Employment nav item folded into the agency page (Employees tab)']]},
    {id:'agents', icon:'◊', label:'Sales Agents'}
  ]}
];

/* Screens: id → breadcrumb. Drill-ins map to a parent nav item. */
const SCREENS = {
  'dashboard':          {crumb:'Dashboard'},
  'backoffice':         {crumb:'BackOffice Module / <b>BackOffice</b>'},
  'hotels':             {crumb:'Catalog / <b>Hotels</b>'},
  'hotel-suppliers':    {crumb:'Catalog / <b>Hotel Suppliers</b>'},
  'reservations':       {crumb:'Bookings / <b>Reservations</b>'},
  'reservation-detail': {crumb:'Bookings / <span class="lnk" onclick="go(\'reservations\')">Reservations</span> / <b id="crumb-res">—</b>', parent:'reservations'},
  'booking-breakdown':  {crumb:'Bookings / <b>Booking Breakdown</b>'},
  'audit-log':          {crumb:'Bookings / <b>Booking Audit Log</b>'},
  'pricing-policy':     {crumb:'Pricing / <b>Pricing Policy</b>'},
  'hotel-brands':       {crumb:'Pricing / <b>Hotel Brands</b>'},
  'price-composition':  {crumb:'Pricing / <b>Price Composition</b>'},
  'commissions':        {crumb:'Pricing / <b>Commissions</b>'},
  'remittances':        {crumb:'Finance / <b>Agency Remittances</b>'},
  'settlement':         {crumb:'Finance / <b>Payments & Settlement</b>'},
  'agencies':           {crumb:'Partners / <b>Travel Agencies</b>'},
  'agency':             {crumb:'Partners / <span class="lnk" onclick="go(\'agencies\')">Travel Agencies</span> / <b id="crumb-agency">—</b>', parent:'agencies'},
  'agents':             {crumb:'Partners / <b>Sales Agents</b>'}
};

/* ---------- shell + router ---------- */
function buildShells() {
  document.getElementById('screens').innerHTML = Object.entries(SCREENS).map(([id, s]) => `
    <section class="screen" id="screen-${id}">
      <div class="app-layout">
        <aside class="sidebar"></aside>
        <main class="app-main">
          <div class="topbar">
            <button class="hamburger" onclick="toggleSidebar()" aria-label="Menu">☰</button>
            <div class="breadcrumb">${s.crumb}</div>
            <div class="topbar-right"><div class="avatar">AD</div></div>
          </div>
          <div class="page" id="pg-${id}"></div>
        </main>
      </div>
    </section>`).join('');
}

function renderSidebars(activeId) {
  const groups = NAV.map(g => `
    ${g.title ? `<div class="nav-group-title">${g.title}</div>` : ''}
    ${g.items.map(n => `
      <a class="nav-link ${n.id === activeId ? 'active' : ''}" onclick="go('${n.id}');closeSidebar()">
        <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
        ${(n.chips || []).map(c => chip(c[0], c[1], c[2])).join('')}
      </a>`).join('')}
  `).join('');
  const html = `
    <div class="sidebar-head">
      <div class="sidebar-logo">E</div>
      <div class="sidebar-brand">Ergos<small>Backoffice · proposal</small></div>
      <button class="sidebar-close" onclick="closeSidebar()" aria-label="Close menu">×</button>
    </div>
    <nav class="sidebar-nav">${groups}</nav>
    <div class="sidebar-user">
      <div class="avatar">AD</div>
      <div class="who">Admin<small>admin@ergos.com</small></div>
    </div>`;
  document.querySelectorAll('.sidebar').forEach(s => s.innerHTML = html);
}

function toggleSidebar(){ document.body.classList.toggle('sidebar-open'); }
function closeSidebar(){ document.body.classList.remove('sidebar-open'); }

function go(id, param) {
  location.hash = '#/' + id + (param ? '/' + encodeURIComponent(param) : '');
}
function route() {
  const parts = (location.hash || '').replace(/^#\/?/, '').split('/');
  const id = SCREENS[parts[0]] ? parts[0] : 'dashboard';
  const param = parts[1] ? decodeURIComponent(parts[1]) : undefined;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  renderSidebars(SCREENS[id].parent || id);
  RENDERERS[id](param);
  closeKebab();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ---------- toast / modal / kebab ---------- */
function toast(msg) {
  const host = document.getElementById('toast-host');
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; host.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

function openModal(title, bodyHTML, opts = {}) {
  const host = document.getElementById('modal-host');
  const footer = opts.readOnly
    ? `<button class="btn btn-primary" onclick="closeModal()">Close</button>`
    : `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="modal-save">Save changes</button>`;
  host.innerHTML = `
    <div class="modal-backdrop show" onclick="if(event.target===this)closeModal()">
      <div class="modal ${opts.size || ''}">
        <div class="modal-head"><h2>${title}</h2><button class="modal-close" onclick="closeModal()" aria-label="Close">×</button></div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="modal-foot">${footer}</div>
      </div>
    </div>`;
  const save = document.getElementById('modal-save');
  if (save) save.onclick = () => { closeModal(); toast('Changes saved'); if (opts.onSave) opts.onSave(); };
  document.addEventListener('keydown', escClose);
}
function escClose(e){ if (e.key === 'Escape') closeModal(); }
function closeModal(){ document.getElementById('modal-host').innerHTML = ''; document.removeEventListener('keydown', escClose); }
const fld = (label, value, type = 'text') => `<div class="form-field"><label>${label}</label><input type="${type}" value="${value ?? ''}"></div>`;
const dl = rows => `<dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v ?? '—'}</dd>`).join('')}</dl>`;

/* Kebab = the ONE idiom for secondary row actions (row click = detail) */
let KEBAB_ACTIONS = {};
function kebab(id, actions) {
  KEBAB_ACTIONS[id] = actions;
  return `<button class="kebab-btn" onclick="event.stopPropagation();openKebab(event,'${id}')" title="More actions">⋮</button>`;
}
function openKebab(e, id) {
  closeKebab();
  const menu = document.createElement('div');
  menu.className = 'kebab-menu';
  menu.innerHTML = KEBAB_ACTIONS[id].map(([label, fn], i) =>
    `<button onclick="event.stopPropagation();closeKebab();KEBAB_ACTIONS['${id}'][${i}][1]()">${label}</button>`).join('');
  document.getElementById('kebab-host').appendChild(menu);
  const r = e.target.getBoundingClientRect();
  menu.style.top = Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + 'px';
  menu.style.left = Math.max(8, r.right - menu.offsetWidth) + 'px';
}
function closeKebab(){ document.getElementById('kebab-host').innerHTML = ''; }
document.addEventListener('click', e => { if (!e.target.closest('.kebab-menu') && !e.target.closest('.kebab-btn')) closeKebab(); });

/* ---------- about panel ---------- */
function toggleAbout() {
  const p = document.getElementById('about-panel');
  p.hidden = !p.hidden;
}

/* ============================================================
   RENDERERS
   ============================================================ */
const RENDERERS = {};
const pg = id => document.getElementById('pg-' + id);

/* ---------- Dashboard ---------- */
RENDERERS['dashboard'] = () => {
  pg('dashboard').innerHTML = `
    <div class="page-head row">
      <div><h1>Good day, Admin</h1><p class="muted">Overview — every card and row below is a real link.</p></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi navy kpi-clickable" onclick="go('reservations')"><div class="kpi-label">Reservations</div><div class="kpi-value">8,412</div><div class="kpi-sub">1,860 pending → Bookings</div></div>
      <div class="kpi gold kpi-clickable" onclick="go('remittances')"><div class="kpi-label">Outstanding remittances</div><div class="kpi-value">${fmt(9170)}</div><div class="kpi-delta down">2 agencies overdue</div></div>
      <div class="kpi green kpi-clickable" onclick="go('agencies')"><div class="kpi-label">Travel agencies</div><div class="kpi-value">${AGENCIES.length}</div><div class="kpi-sub">1 credit-frozen → Partners</div></div>
      <div class="kpi teal kpi-clickable" onclick="go('settlement')"><div class="kpi-label">Owed on credit accounts</div><div class="kpi-value">${fmt(7030)}</div><div class="kpi-sub">→ Payments &amp; Settlement</div></div>
    </div>
    <div class="card">
      <div class="card-head row">
        <div><h3>Recent bookings</h3><p class="muted">Row click opens the reservation detail hub.</p></div>
        ${xlink('All reservations', 'reservations')}
      </div>
      ${table('dash', {
        rows: () => BOOKINGS.slice(0, 5),
        date: {label:'Booked', val: b => b.booked},
        status: {options: STATUSES, val: b => b.status},
        search: {placeholder:'Search ref, guest, hotel…', val: b => b.ref + ' ' + b.guest + ' ' + hotel(b.hotelId).name + ' ' + agency(b.agencyId).name},
        columns: [
          {key:'ref', label:'Reference', val: b => b.ref, cell: b => `<span class="bb-ref">${b.ref}</span>`},
          {key:'agency', label:'Agency', val: b => agency(b.agencyId).name, cell: b => agency(b.agencyId).name},
          {key:'hotel', label:'Hotel', val: b => hotel(b.hotelId).name, cell: b => hotel(b.hotelId).name},
          {key:'pays', label:'Agency pays', right:true, val: b => calc(b).eff, cell: b => `<strong>${fmt(calc(b).eff)}</strong>`},
          {key:'status', label:'Status', val: b => b.status, cell: b => badge(b.status)},
          {key:'booked', label:'Booked', val: b => pdate(b.booked), cell: b => `<span class="muted">${b.booked}</span>`}
        ],
        rowAttrs: b => `class="rowlink" onclick="go('reservation-detail','${b.ref}')"`
      })}
    </div>`;
  tDraw('dash');
};

/* ---------- BackOffice (tabs: Users | Roles — Roles merged) ---------- */
RENDERERS['backoffice'] = (tab) => {
  tab = tab === 'roles' ? 'roles' : 'users';
  pg('backoffice').innerHTML = `
    <div class="page-head row">
      <div><h1>BackOffice</h1><p class="muted">Internal staff and their roles — one screen, two tabs.</p></div>
      ${tab === 'users' ? `<button class="btn btn-primary" onclick="editBoUser()">+ Add User</button>` : ''}
    </div>
    <div class="page-tabs">
      <button class="page-tab ${tab === 'users' ? 'active' : ''}" onclick="go('backoffice','users')">Users</button>
      <button class="page-tab ${tab === 'roles' ? 'active' : ''}" onclick="go('backoffice','roles')">Roles ${chip('merged', 'was: nav item', 'Roles Management was a separate nav item')}</button>
    </div>
    <div class="card">
    ${tab === 'users'
      ? table('bou', {
          rows: () => BO_USERS,
          status: {options:['Active','Suspended'], val: u => u[4]},
          entity: {placeholder:'Role…', options:['ADMIN','IMPORTERS','USER'], val: u => u[3]},
          search: {placeholder:'Search name, email…', val: u => u[0] + ' ' + u[1] + ' ' + u[2]},
          columns: [
            {key:'name', label:'Name', val: u => u[0] + ' ' + u[1], cell: u => u[0] + ' ' + u[1]},
            {key:'email', label:'Email', val: u => u[2], cell: u => u[2]},
            {key:'role', label:'Role', val: u => u[3], cell: u => `<code class="code-chip">${u[3]}</code>`},
            {key:'status', label:'Status', val: u => u[4], cell: u => badge(u[4])},
            {key:'act', label:'', sortable:false, right:true, val: () => '', cell: u => kebab('bo' + BO_USERS.indexOf(u), [['Edit user', () => editBoUser(BO_USERS.indexOf(u))], ['Reset password', () => toast('Password reset email sent (demo)')]])}
          ],
          rowAttrs: u => `class="rowlink" onclick="viewBoUser(${BO_USERS.indexOf(u)})"`
        })
      : table('roles', {
          rows: () => ROLES,
          search: {placeholder:'Search role, code…', val: r => r[0] + ' ' + r[1]},
          columns: [
            {key:'name', label:'Role', val: r => r[0], cell: r => r[0]},
            {key:'code', label:'Code', val: r => r[1], cell: r => `<code class="code-chip">${r[1]}</code>`},
            {key:'desc', label:'Description', val: r => r[2], cell: r => r[2]},
            {key:'users', label:'Users', right:true, val: r => r[3], cell: r => r[3].toLocaleString('en-US')}
          ],
          rowAttrs: r => `class="rowlink" onclick="viewRole(${ROLES.indexOf(r)})"`
        })}
    </div>`;
  tDraw(tab === 'users' ? 'bou' : 'roles');
};
function viewBoUser(i) {
  const u = BO_USERS[i];
  openModal('User — ' + u[0] + ' ' + u[1], dl([['Name', u[0] + ' ' + u[1]], ['Email', u[2]], ['Role', `<code class="code-chip">${u[3]}</code>`], ['Status', badge(u[4])]]), {readOnly:true});
}
function editBoUser(i) {
  const u = i === undefined ? ['', '', '', 'USER', 'Active'] : BO_USERS[i];
  openModal(i === undefined ? 'Add User' : 'Edit User — ' + u[0] + ' ' + u[1],
    `<div class="form-grid">${fld('First name', u[0])}${fld('Last name', u[1])}${fld('Email', u[2], 'email')}
     <div class="form-field"><label>Role</label><select>${['ADMIN','IMPORTERS','USER'].map(r => `<option ${r === u[3] ? 'selected' : ''}>${r}</option>`).join('')}</select></div></div>`);
}
function viewRole(i) {
  const r = ROLES[i];
  openModal('Role — ' + r[0], dl([['Name', r[0]], ['Code', `<code class="code-chip">${r[1]}</code>`], ['Description', r[2]], ['Users', r[3].toLocaleString('en-US')]]), {readOnly:true});
}

/* ---------- Hotels (Catalog) — 10 → 6 cols, rest in detail ---------- */
RENDERERS['hotels'] = (brandFilter) => {
  pg('hotels').innerHTML = `
    <div class="page-head row">
      <div><h1>Hotels</h1><p class="muted">${chip('new', 'changed')} Empty Commission column removed · the field is <b>Ergos Markup</b> everywhere (list, dialog, waterfall).</p></div>
      <button class="btn btn-primary" onclick="editHotel('h1')">+ Add Hotel</button>
    </div>
    <div class="card">
      ${table('hot', {
        rows: () => HOTELS,
        chips: [['was', '10 → 6 cols · rest in detail', 'vendor, stars, price adjustment, last sync and the links column moved to the row detail / kebab']],
        entity: {placeholder:'Brand…', options: BRAND_NAMES, val: h => h.brand},
        search: {placeholder:'Search name, city, code…', val: h => h.name + ' ' + h.city + ' ' + h.code},
        columns: [
          {key:'name', label:'Hotel', val: h => h.name, cell: h => `<strong>${h.name}</strong>`},
          {key:'code', label:'Code', val: h => h.code, cell: h => `<span class="bb-mono">${h.code}</span>`},
          {key:'markup', label:'Ergos Markup', right:true, val: h => h.markup, cell: h => h.markup.toFixed(1) + '%'},
          {key:'disc', label:'Brand discount', right:true, val: h => brandDisc(h), cell: h => brandDisc(h) ? '−' + pctf(brandDisc(h)) : '—'},
          {key:'city', label:'City', val: h => h.city, cell: h => h.city},
          {key:'act', label:'', sortable:false, right:true, val: () => '', cell: h => kebab('h' + h.id, [
            ['Edit hotel', () => editHotel(h.id)],
            ['Price composition ↗', () => go('price-composition', h.id)],
            ['Pricing rules ↗', () => go('pricing-policy')],
            ['Sync from ' + h.vendor, () => toast('Sync queued for ' + h.name + ' (demo)')]
          ])}
        ],
        rowAttrs: h => `class="rowlink" onclick="editHotel('${h.id}')"`
      }, brandFilter ? {entity: brandFilter} : null)}
    </div>`;
  tDraw('hot');
};
function editHotel(id) {
  const h = hotel(id);
  openModal('Hotel — ' + h.name,
    `<div class="form-grid">
       ${fld('Code', h.code)}${fld('Name', h.name)}${fld('City', h.city)}${fld('Brand', h.brand)}
       ${fld('Ergos Markup (%)', h.markup, 'number')}${fld('Price adjustment (%)', h.adj, 'number')}
       ${fld('Vendor', h.vendor)}${fld('Stars', h.stars, 'number')}
     </div>
     <div class="modal-note">Moved out of the list into this detail: vendor (${h.vendor}), stars (${'★'.repeat(h.stars)}), price adjustment, last sync (${h.sync}). One vocabulary: this field is <b>Ergos Markup</b> — it was “Base commission” here and an always-empty “Commission” column in the list.</div>`);
}

/* ---------- Hotel Suppliers (Catalog) ---------- */
RENDERERS['hotel-suppliers'] = () => {
  const sup = (name, proto, count, children, open) => `
    <div class="card supplier-card">
      <div class="supplier-head" style="cursor:pointer" onclick="const c=this.nextElementSibling; if(c){c.hidden=!c.hidden; this.querySelector('.supplier-chevron').textContent=c.hidden?'▶':'▼';}">
        <div class="supplier-icon"><i class="ti ti-server"></i></div>
        <div class="supplier-meta">
          <div class="supplier-title">${name} <span class="muted">(${proto})</span> <span class="badge badge-grey">${count}</span></div>
        </div>
        <div class="supplier-actions"><span class="supplier-chevron">${open ? '▼' : '▶'}</span></div>
      </div>
      ${children ? `<div class="supplier-children" ${open ? '' : 'hidden'}>${children}</div>` : ''}
    </div>`;
  const child = (init, name, url) => `
    <div class="supplier-child">
      <div class="supplier-avatar">${init}</div>
      <div class="supplier-child-meta">
        <div class="supplier-child-name">${name} <span class="badge badge-teal">Dynamic</span></div>
        <div class="supplier-child-url"><i class="ti ti-world-www"></i> ${url}</div>
      </div>
    </div>`;
  pg('hotel-suppliers').innerHTML = `
    <div class="page-head row">
      <div><h1>Hotel Suppliers</h1><p class="muted">GDS wholesalers — now under Catalog, next to the hotels they feed. Click a card to expand.</p></div>
      ${xlink('Hotels', 'hotels')}
    </div>
    ${sup('Dingus', 'SOAP/OTA', '4 sub-vendors',
      child('DI', 'Dingus-Iberostar', 'https://api-iberostar.dingus.com/ws') +
      child('DM', 'Dingus-Meliá', 'https://api-melia.dingus.com/ws') +
      child('DR', 'Dingus-RIU', 'https://api-riu.dingus.com/ws') +
      child('DH', 'Dingus-Hyatt', 'https://api-hyatt.dingus.com/ws'), true)}
    ${sup('Hotetec', 'REST/JSON', '1 vendor', child('HT', 'hotetec', 'https://api.hotetec.com/v2'), false)}
    ${sup('Roibos', 'Juniper XML', '1 vendor', child('RB', 'roibos', 'https://xml.roibos.com/juniper'), false)}
    ${sup('Restel', 'custom XML', '1 vendor', child('RS', 'restel', 'https://xml.restel.es/hotel'), false)}`;
};

/* ---------- Reservations (Bookings) — 9 → 7 cols ---------- */
RENDERERS['reservations'] = () => {
  pg('reservations').innerHTML = `
    <div class="page-head row">
      <div><h1>Reservations</h1><p class="muted">${chip('new', 'changed')} Status is a badge (was plain text) · row click → detail, kebab for secondary — the one idiom everywhere.</p></div>
    </div>
    <div class="card">
      ${table('res', {
        rows: () => BOOKINGS,
        chips: [['was', '9 → 7 cols · rest in detail', 'reference, nights and room moved to the reservation detail hub']],
        date: {label:'Check-in', val: b => b.checkin},
        status: {options: STATUSES, val: b => b.status},
        entity: {placeholder:'Agency…', options: AG_NAMES, val: b => agency(b.agencyId).name},
        search: {placeholder:'Search guest, hotel, ref…', val: b => b.guest + ' ' + hotel(b.hotelId).name + ' ' + b.ref},
        columns: [
          {key:'hotel', label:'Hotel', val: b => hotel(b.hotelId).name, cell: b => `<strong>${hotel(b.hotelId).name}</strong>`},
          {key:'checkin', label:'Check-in', val: b => pdate(b.checkin), cell: b => b.checkin},
          {key:'guest', label:'Guest', val: b => b.guest, cell: b => b.guest},
          {key:'agency', label:'Agency', val: b => agency(b.agencyId).name, cell: b => agency(b.agencyId).name},
          {key:'total', label:'Total', right:true, val: b => calc(b).eff, cell: b => `<strong>${fmt(calc(b).eff)}</strong>`},
          {key:'status', label:'Status', val: b => b.status, cell: b => badge(b.status)},
          {key:'act', label:'', sortable:false, right:true, val: () => '', cell: b => kebab('r' + b.ref, [
            ['Financial breakdown ↗', () => go('booking-breakdown', b.ref)],
            ['Audit history ↗', () => go('audit-log', b.ref)]
          ])}
        ],
        rowAttrs: b => `class="rowlink" onclick="go('reservation-detail','${b.ref}')"`
      })}
    </div>`;
  tDraw('res');
};

/* ---------- Reservation detail — the booking hub ---------- */
RENDERERS['reservation-detail'] = (ref) => {
  const b = booking(ref) || booking('PTA10293');
  const a = agency(b.agencyId), h = hotel(b.hotelId), c = calc(b);
  document.getElementById('crumb-res').textContent = b.ref;
  const payCard = b.pay === 'credit' ? `
    <dl class="kv">
      <dt>Method</dt><dd>Soft credit (${a.credit.type === 'DEPOSIT' ? 'deposit-backed' : 'granted'}) — <b>paid at confirm</b></dd>
      <dt>Amount</dt><dd><strong>${fmt(c.eff)}</strong></dd>
      <dt>Drawdown</dt><dd>${fmt(c.eff)} against ${a.name}'s credit account ${xlink('Agency credit', 'agency/' + a.id + ':credit')}</dd>
    </dl>` : `
    <dl class="kv">
      <dt>Method</dt><dd>Card (TropiPay)</dd>
      <dt>Amount</dt><dd>${fmt(c.eff)}</dd>
      <dt>Card fee (${pctf(CARD_FEE_PCT)})</dt><dd class="wf-fee">+ ${fmt(c.fee)} <span class="muted">— explicit fee line, not blended in</span></dd>
      <dt>Charged</dt><dd><strong>${fmt(c.charged)}</strong></dd>
    </dl>`;
  pg('reservation-detail').innerHTML = `
    <div class="page-head row">
      <div><h1>${b.ref} ${badge(b.status)}</h1>
        <p class="muted">${chip('new', 'new hub')} One page ties the booking's money, audit and credit context together — each link is a real navigation.</p></div>
      <button class="btn btn-outline" onclick="go('reservations')">← Reservations</button>
    </div>
    <div class="card">
      <div class="card-head"><h3>Booking</h3></div>
      <div class="snap-grid">
        <div class="snap-cell"><div class="snap-label">Hotel</div><div class="snap-value" style="font-size:16px">${h.name}</div><div class="muted">${h.city} · ${h.brand} · ${h.vendor}</div></div>
        <div class="snap-cell"><div class="snap-label">Dates</div><div class="snap-value" style="font-size:16px">${b.checkin} · ${b.nights} nights</div><div class="muted">${b.room}</div></div>
        <div class="snap-cell"><div class="snap-label">Guests</div><div class="snap-value" style="font-size:16px">${b.guest}</div><div class="muted">${b.guests} guests</div></div>
        <div class="snap-cell"><div class="snap-label">Agency</div><div class="snap-value" style="font-size:16px">${a.name}</div><div class="muted">${a.license}</div></div>
        <div class="snap-cell"><div class="snap-label">Agent</div><div class="snap-value" style="font-size:16px">${agent(b.agentId).name}</div><div class="muted">${agent(b.agentId).tier}</div></div>
      </div>
      <p class="muted" style="margin-top:8px">Booked ${b.booked}, 2026 · reference <span class="bb-ref">${b.ref}</span> — slimmed out of the list, lives here.</p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Payment</h3></div>
      ${payCard}
    </div>
    <div class="card">
      <div class="card-head row"><h3>Waterfall — money decomposition</h3><span class="muted">historical · snapshot at booking time</span></div>
      ${waterfall(b, {showFee:true, caption:'Same component as Pricing Policy (effective config), Price Composition (forward) and Booking Breakdown (historical).'})}
    </div>
    <div class="card">
      <div class="linkrow">
        <span class="linkrow-label">Related</span>
        ${xlink('Financial breakdown', 'booking-breakdown/' + b.ref)}
        ${xlink('Audit history', 'audit-log/' + b.ref)}
        ${xlink('Agency P&L', 'agency/' + a.id + ':pnl')}
        ${xlink('Agency credit', 'agency/' + a.id + ':credit')}
      </div>
    </div>`;
};

/* ---------- Booking Breakdown (Bookings) — 9 → 7 cols ---------- */
/* param: 'PTA…' opens that booking's detail · 'agc1:2026-07' seeds
   the agency typeahead + a custom date range on the filter bar */
RENDERERS['booking-breakdown'] = (param) => {
  let detailRef = null, seed = null;
  if (param && param.startsWith('PTA')) detailRef = param;
  else if (param) {
    const [agcId, pkey] = param.split(':');
    const [y, m] = pkey.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    seed = {entity: agency(agcId).name, preset:'custom', from:`${pkey}-01`, to:`${pkey}-${String(last).padStart(2, '0')}`};
  }
  const b = detailRef && booking(detailRef);
  const detail = b ? (() => {
    const a = agency(b.agencyId);
    return `
    <div class="card">
      <div class="card-head row">
        <div><h3>Booking ${b.ref}</h3><p class="muted">${hotel(b.hotelId).name} · ${a.name}${b.note ? ' · <b>' + b.note + '</b>' : ''}</p></div>
        <button class="btn btn-sm" onclick="go('booking-breakdown')">← All bookings</button>
      </div>
      <div class="card-section">
        <h4>Snapshot at booking time</h4>
        <div class="snap-grid">
          <div class="snap-cell"><div class="snap-label">Ergos Markup</div><div class="snap-value">${pctf(b.markup)}</div></div>
          <div class="snap-cell"><div class="snap-label">Brand Discount</div><div class="snap-value">${pctf(b.brandDisc)}</div></div>
          <div class="snap-cell"><div class="snap-label">Agency Rebate</div><div class="snap-value">${pctf(b.rebate)}</div></div>
          <div class="snap-cell"><div class="snap-label">Agent Share</div><div class="snap-value">${pctf(b.agentPct)}</div></div>
          <div class="snap-cell"><div class="snap-label">Agent Ops</div><div class="snap-value">${pctf(b.opsPct)}</div></div>
        </div>
      </div>
      <div class="card-section">
        <h4>Waterfall — money decomposition (historical)</h4>
        ${waterfall(b, {showFee:true})}
      </div>
      <div class="linkrow">
        <span class="linkrow-label">Related</span>
        ${xlink('Reservation', 'reservation-detail/' + b.ref)}
        ${xlink('Audit history', 'audit-log/' + b.ref)}
        ${xlink('Agency P&L', 'agency/' + a.id + ':pnl')}
      </div>
    </div>`; })() : '';
  pg('booking-breakdown').innerHTML = `
    <div class="page-head row">
      <div><h1>Booking Breakdown</h1><p class="muted">Per-booking money flow across all 4 parties. Row click → waterfall detail.</p></div>
    </div>
    ${detail || `
    <div class="card">
      <div class="card-head"><h3>Bookings (<span id="tcount-bb">${BOOKINGS.length}</span>)</h3></div>
      ${table('bb', {
        rows: () => BOOKINGS,
        chips: [['was', '9 → 7 cols · rest in detail', 'hotel + per-component amounts (cost, markup %, sell) moved to the row detail — they were always there']],
        date: {label:'Booked', val: r => r.booked},
        entity: {placeholder:'Agency…', options: AG_NAMES, val: r => agency(r.agencyId).name},
        search: {placeholder:'Search ref, hotel…', val: r => r.ref + ' ' + hotel(r.hotelId).name},
        columns: [
          {key:'booked', label:'Booked', val: r => pdate(r.booked), cell: r => r.booked},
          {key:'ref', label:'Reference', val: r => r.ref, cell: r => `<span class="bb-ref">${r.ref}</span>`},
          {key:'agency', label:'Agency', val: r => agency(r.agencyId).name, cell: r => agency(r.agencyId).name},
          {key:'price', label:'Customer price', right:true, val: r => calc(r).eff, cell: r => fmt(calc(r).eff)},
          {key:'net', label:'Ergos net', right:true, val: r => calc(r).net, cell: r => fmt(calc(r).net)},
          {key:'margin', label:'Margin', val: r => calc(r).margin, cell: r => marginBadge(calc(r).margin)},
          {key:'act', label:'', sortable:false, right:true, val: () => '', cell: r => kebab('bb' + r.ref, [
            ['Reservation ↗', () => go('reservation-detail', r.ref)],
            ['Audit history ↗', () => go('audit-log', r.ref)]
          ])}
        ],
        rowAttrs: r => `class="rowlink bb-row" onclick="go('booking-breakdown','${r.ref}')"`
      }, seed)}
    </div>`}`;
  if (!detail) tDraw('bb');
};

/* ---------- Booking Audit Log (Bookings) ---------- */
RENDERERS['audit-log'] = (ref) => {
  pg('audit-log').innerHTML = `
    <div class="page-head row">
      <div><h1>Booking Audit Log</h1><p class="muted">${chip('new', 'changed')} Booking refs are links to the reservation detail · reachable pre-filtered from any booking's “Audit history ↗”.</p></div>
    </div>
    <div class="audit-split-lite">
      <div class="card">
        ${table('aud', {
          rows: () => AUDIT,
          date: {label:'Date', val: r => r.t},
          status: {options:['Created','Modified','Cancelled','Cancel Attempt','Payment'], val: r => r.action},
          search: {placeholder:'Booking ref…', val: r => r.ref},
          columns: [
            {key:'t', label:'When', val: r => pdate(r.t), cell: r => `<span class="bb-mono">${r.t}</span>`},
            {key:'ref', label:'Booking Ref', val: r => r.ref, cell: r => `<a class="lnk bb-ref" href="#/reservation-detail/${r.ref}" onclick="event.stopPropagation()" title="Open reservation">${r.ref} ↗</a>`},
            {key:'action', label:'Action', val: r => r.action, cell: r => badge(r.action)},
            {key:'trans', label:'Transition', val: r => r.trans, cell: r => `<span class="bb-mono">${r.trans}</span>`},
            {key:'vendor', label:'Vendor', val: r => r.vendor, cell: r => r.vendor},
            {key:'result', label:'Result', val: r => r.result, cell: r => badge(r.result)}
          ],
          rowAttrs: r => `class="rowlink audit-row" onclick="auditSelect(${AUDIT.indexOf(r)})"`
        }, ref ? {q: ref} : null)}
      </div>
      <div class="card" id="audit-detail">${auditDetailHTML(AUDIT.indexOf((ref ? AUDIT.filter(r => r.ref === ref) : AUDIT)[0] || AUDIT[0]))}</div>
    </div>`;
  tDraw('aud');
};
function auditDetailHTML(i) {
  const r = AUDIT[i];
  return `
    <div class="card-head row"><h3>Detail · ${r.ref}</h3>${xlink('Reservation', 'reservation-detail/' + r.ref)}</div>
    <div class="audit-detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><div class="audit-d-label">Action</div>${badge(r.action)}</div>
      <div><div class="audit-d-label">Result</div>${badge(r.result)}</div>
      <div><div class="audit-d-label">Transition</div><div class="bb-mono">${r.trans}</div></div>
      <div><div class="audit-d-label">Vendor</div><div>${r.vendor}</div></div>
    </div>
    <div class="audit-section"><div class="audit-d-label">Metadata</div>
      <pre class="audit-pre">{ "actor": "${agency(booking(r.ref).agencyId).email}",
  "when": "${r.t}", "via": "agency-app" }</pre></div>`;
}
function auditSelect(i){ document.getElementById('audit-detail').innerHTML = auditDetailHTML(i); }

/* ---------- Pricing Policy (Pricing) ---------- */
RENDERERS['pricing-policy'] = () => {
  const eff = {net:200.00, brandDisc:.125, markup:.175, rebate:.03, agentPct:.22, opsPct:.07, pay:'credit'};
  pg('pricing-policy').innerHTML = `
    <div class="page-head row">
      <div><h1>Pricing Policy</h1><p class="muted">One vocabulary: the <b>cascade</b> resolves which rules apply; the <b>waterfall</b> shows the money they produce.</p></div>
      ${xlink('Preview prices', 'price-composition/h1')}
    </div>
    <div class="card">
      <div class="card-head row"><h3>Cascade — rule resolution · Iberostar Grand Packard × Sunshine Travel LLC</h3><span class="muted">most specific rule wins · row click → rule detail</span></div>
      ${table('rules', {
        rows: () => RULES,
        status: {options:['wins','inherits','base'], val: r => r.status},
        search: {placeholder:'Search scope, parameter…', val: r => r.scope + ' ' + r.param},
        columns: [
          {key:'scope', label:'Scope', val: r => r.scope, cell: r => r.scope},
          {key:'param', label:'Parameter', val: r => r.param, cell: r => r.param},
          {key:'value', label:'Value', right:true, val: r => money(r.value), cell: r => `<span class="bb-mono">${r.value}</span>`},
          {key:'res', label:'Resolution', val: r => r.status, cell: r => r.status === 'wins' ? '<span class="badge badge-teal">wins</span>' : `<span class="badge badge-grey">${r.status}</span>`}
        ],
        rowAttrs: r => `class="rowlink" onclick="viewRule(${RULES.indexOf(r)})"`
      })}
    </div>
    <div class="card">
      <div class="card-head row"><h3>Waterfall — effective config</h3><span class="muted">what tonight's $200.00 net rate produces under the rules above</span></div>
      ${waterfall(eff, {caption:'Identical component and vocabulary as Price Composition, Booking Breakdown and the reservation detail.'})}
    </div>`;
  tDraw('rules');
};
function viewRule(i) {
  const r = RULES[i];
  openModal('Rule — ' + r.scope,
    dl([['Scope', r.scope], ['Parameter', r.param], ['Value', `<span class="bb-mono">${r.value}</span>`],
        ['Resolution', r.status === 'wins' ? '<span class="badge badge-teal">wins</span> most specific matching tier' : 'inherited / base'],
        ['Set by', 'admin@ergos.com · Jul 2026']]) +
    `<div class="modal-note">Rules live only here. Hotels, Brands and Agencies link into this cascade instead of holding their own copies.</div>`,
    {readOnly:true});
}

/* ---------- Hotel Brands (Pricing) ---------- */
RENDERERS['hotel-brands'] = () => {
  const cards = BRANDS.map(b => {
    const n = HOTELS.filter(h => b.name.startsWith(h.brand)).length;
    return `
    <div class="brand-card">
      <div class="brand-card-head">
        <div><h3>${b.name}</h3><div class="brand-card-code">${b.code}</div></div>
        ${badge(b.status)}
      </div>
      <div class="brand-card-body">
        <div class="brand-stat"><span class="brand-stat-label">Brand Discount</span><span class="brand-stat-value brand-stat-discount">${b.disc ? pctf(b.disc) + ' off' : '— (none)'}</span></div>
        <div class="brand-stat"><span class="brand-stat-label">Linked Hotels</span><span class="brand-stat-value">${n}</span></div>
        <p class="brand-card-notes">${b.note}</p>
      </div>
      <div class="brand-card-actions" style="gap:8px">
        ${xlink('view hotels', 'hotels/' + b.name.split(' ')[0])}
        ${xlink('pricing rules', 'pricing-policy')}
      </div>
    </div>`;
  }).join('');
  pg('hotel-brands').innerHTML = `
    <div class="page-head row">
      <div><h1>Hotel Brands</h1><p class="muted">${chip('new', 'changed')} <b>Brand</b> everywhere — was “Chain” on buttons and “Brand” in the title on the same screen.</p></div>
      <button class="btn btn-primary" onclick="addBrand()">+ Add Brand</button>
    </div>
    <div class="brand-grid">${cards}</div>`;
};
function addBrand() {
  openModal('Add Brand',
    `<div class="form-grid">${fld('Brand name', '')}${fld('Code', '')}${fld('Brand discount (%)', '', 'number')}</div>
     <div class="modal-note">The discount lands as a Brand-scope rule in the Pricing Policy cascade.</div>`);
}

/* ---------- Price Composition (Pricing) ---------- */
const COMPO_NET = {h1:200.00, h2:310.00};
RENDERERS['price-composition'] = (hotelId) => {
  const h = hotel(COMPO_NET[hotelId] ? hotelId : 'h1');
  const base = {net:COMPO_NET[h.id], brandDisc:brandDisc(h), markup:h.markup / 100, rebate:0, agentPct:.22, opsPct:.07, pay:'credit'};
  const sell = calc(base).sell;
  pg('price-composition').innerHTML = `
    <div class="page-head row">
      <div><h1>Price Composition</h1><p class="muted">Forward-looking: what each agency pays for this hotel tonight, and why.</p></div>
      ${xlink('Configure this hotel', 'pricing-policy')}
    </div>
    <div class="card bb-filter-card">
      <div class="bb-filter-row">
        <div class="bb-field"><label>Hotel</label>
          <select onchange="go('price-composition', this.value)">
            <option value="h1" ${h.id === 'h1' ? 'selected' : ''}>Iberostar Grand Packard (Dingus)</option>
            <option value="h2" ${h.id === 'h2' ? 'selected' : ''}>Hyatt Ziva Cap Cana (Roibos)</option>
          </select></div>
        <div class="bb-field"><label>Stay</label><input type="date" value="2026-09-12"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head row"><h3>Waterfall — ${h.name}</h3><span class="badge badge-grey">Brand: ${h.brand}</span></div>
      ${waterfall(base, {caption:'Forward-looking — same component and vocabulary as the historical waterfalls in Bookings.'})}
    </div>
    <div class="card">
      <div class="card-head row"><h3>Agency prices (${AGENCIES.length})</h3><span class="muted">row click → cascade trace</span></div>
      ${table('compo', {
        rows: () => AGENCIES,
        status: {options:['Custom','Default'], val: a => a.rebate ? 'Custom' : 'Default'},
        search: {placeholder:'Search agency…', val: a => a.name},
        columns: [
          {key:'name', label:'Agency', val: a => a.name, cell: a => `<strong>${a.name}</strong>`},
          {key:'rule', label:'Rule', val: a => a.rebate ? 'Custom' : 'Default', cell: a => a.rebate ? '<span class="badge badge-teal">Custom</span>' : '<span class="badge badge-grey">Default</span>'},
          {key:'rebate', label:'Rebate', right:true, val: a => a.rebate, cell: a => pctf(a.rebate)},
          {key:'pays', label:'Agency pays', right:true, val: a => sell * (1 - a.rebate), cell: a => `<strong>${fmt(sell * (1 - a.rebate))}</strong>`},
          {key:'lnk', label:'', sortable:false, val: () => '', cell: a => xlink('agency page', 'agency/' + a.id)}
        ],
        rowAttrs: a => `class="rowlink" onclick="compoTrace('${a.id}','${h.id}')"`
      })}
    </div>
    <div class="card" id="compo-trace">
      <div class="card-head"><h3>Cascade trace</h3></div>
      <p class="muted">Click an agency row above to see which rebate tiers the resolver considered and which one won.</p>
    </div>`;
  tDraw('compo');
};
function compoTrace(agencyId, hotelId) {
  const a = agency(agencyId), h = hotel(hotelId);
  const custom = a.rebate > 0;
  document.getElementById('compo-trace').innerHTML = `
    <div class="card-head row"><h3>Cascade trace · ${a.name}</h3><span class="badge badge-${custom ? 'teal' : 'grey'}">${custom ? 'Agency override wins' : 'Global default wins'}</span></div>
    <div class="comp-layers">
      <div class="comp-layer-title">Rebate tiers considered — most specific wins</div>
      <ol class="comp-layer-list">
        <li class="${custom ? '' : 'active'}"><span class="lyr-name">Global default</span><span class="lyr-val">0% ${custom ? '' : '★'}</span></li>
        <li><span class="lyr-name">Brand · ${h.brand}</span><span class="lyr-val">— no rule</span></li>
        <li><span class="lyr-name">Hotel · ${h.name}</span><span class="lyr-val">— no rule</span></li>
        <li class="${custom ? 'active' : ''}"><span class="lyr-name">Agency · ${a.name}</span><span class="lyr-val">${custom ? pctf(a.rebate) + ' ★' : '— no rule'}</span></li>
      </ol>
    </div>
    <div class="linkrow"><span class="linkrow-label">Related</span>${xlink('Edit rules', 'pricing-policy')}${xlink('Agency page', 'agency/' + a.id)}</div>`;
}

/* ---------- Commissions (Pricing — new in nav) ---------- */
RENDERERS['commissions'] = () => {
  pg('commissions').innerHTML = `
    <div class="page-head row">
      <div><h1>Commissions</h1><p class="muted">${chip('new', 'new in nav — was orphan route', 'previously reachable only by typing /commissions')} Agent earnings per period, computed by the Pricing Policy engine.</p></div>
      ${xlink('Rates: Pricing Policy', 'pricing-policy')}
    </div>
    <div class="card">
      ${table('com', {
        rows: () => COMMISSIONS,
        status: {options:['Paid','Accrued'], val: c => c.status},
        search: {placeholder:'Search agent…', val: c => agent(c.agentId).name},
        columns: [
          {key:'agent', label:'Agent', val: c => agent(c.agentId).name, cell: c => `<strong>${agent(c.agentId).name}</strong>`},
          {key:'tier', label:'Tier', val: c => agent(c.agentId).tier, cell: c => agent(c.agentId).tier},
          {key:'period', label:'Period', val: c => pdate(c.period), cell: c => c.period},
          {key:'bk', label:'Bookings', right:true, val: c => c.bookings, cell: c => c.bookings},
          {key:'gross', label:'Gross margin base', right:true, val: c => c.gross, cell: c => fmt(c.gross)},
          {key:'earned', label:'Earned', right:true, val: c => c.earned, cell: c => `<strong>${fmt(c.earned)}</strong>`},
          {key:'status', label:'Status', val: c => c.status, cell: c => badge(c.status)}
        ],
        rowAttrs: c => `class="rowlink" onclick="viewCommission(${COMMISSIONS.indexOf(c)})"`
      })}
    </div>`;
  tDraw('com');
};
function viewCommission(i) {
  const c = COMMISSIONS[i], a = agent(c.agentId);
  openModal('Commission — ' + a.name + ' · ' + c.period,
    dl([['Agent', a.name + ' (' + a.tier + ')'], ['Bookings', c.bookings], ['Gross margin base', fmt(c.gross)],
        ['Agent share', a.earn + '%'], ['Earned', `<strong>${fmt(c.earned)}</strong>`], ['Status', badge(c.status)]]) +
    `<div class="modal-note">Rates come from the Pricing Policy cascade (Tier default + optional overrides) — no editable numbers here.</div>`,
    {readOnly:true});
}

/* ---------- Agency Remittances (Finance) ---------- */
RENDERERS['remittances'] = () => {
  pg('remittances').innerHTML = `
    <div class="page-head row">
      <div><h1>Agency Remittances</h1><p class="muted">Monthly amounts each agency owes Ergos. The booking counts are links — no more dead-end totals.</p></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi navy"><div class="kpi-label">Outstanding</div><div class="kpi-value">${fmt(9170)}</div><div class="kpi-sub">4 open cycles</div></div>
      <div class="kpi gold"><div class="kpi-label">Overdue</div><div class="kpi-value">${fmt(6350)}</div><div class="kpi-delta down">2 agencies</div></div>
      <div class="kpi green"><div class="kpi-label">Collected (Jun)</div><div class="kpi-value">${fmt(5502)}</div><div class="kpi-delta up">▲ on time</div></div>
    </div>
    <div class="card">
      ${table('rm', {
        rows: () => REMITS,
        chips: [['new', 'filters: new', 'search + status/period filters do not exist on the current remittances screen']],
        date: {label:'Due', val: r => r.due},
        status: {options:['Pending','Overdue','Paid'], val: r => r.status},
        entity: {placeholder:'Agency…', options: AG_NAMES, val: r => agency(r.agencyId).name},
        search: {placeholder:'Search agency, license…', val: r => agency(r.agencyId).name + ' ' + agency(r.agencyId).license},
        columns: [
          {key:'agency', label:'Agency', val: r => agency(r.agencyId).name, cell: r => `<strong>${agency(r.agencyId).name}</strong><span class="fr-license">${agency(r.agencyId).license}</span>`},
          {key:'period', label:'Period', val: r => pdate(r.period), cell: r => r.period},
          {key:'amount', label:'Amount', right:true, val: r => r.amount, cell: r => `<strong>${fmt(r.amount)}</strong>`},
          {key:'due', label:'Due', val: r => pdate(r.due), cell: r => r.due},
          {key:'status', label:'Status', val: r => r.status, cell: r => badge(r.status)},
          {key:'late', label:'Days late', val: r => r.status === 'Overdue' ? money(r.late) : 0, cell: r => `<span class="${r.status === 'Overdue' ? 'fr-late' : 'muted'}">${r.late}</span>`},
          {key:'bk', label:'Bookings', val: r => r.bookings, cell: r => xlink(r.bookings + ' bookings', 'booking-breakdown/' + r.agencyId + ':' + r.pkey)},
          {key:'act', label:'Actions', sortable:false, right:true, val: () => '', cell: r => r.status === 'Paid'
            ? kebab('rm' + r.id, [['View wire detail', () => viewRemit(r.id)], ['Revert to pending', () => toast('Reason required — audited (demo)')]])
            : `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openMarkPaid('${r.id}')">Mark Paid</button> ` +
              kebab('rm' + r.id, [['Adjust amount', () => toast('Adjustment needs a reason — audited (demo)')], ['Agency credit ↗', () => go('agency', r.agencyId + ':credit')]])}
        ],
        rowAttrs: r => `class="rowlink" onclick="viewRemit('${r.id}')"`
      })}
    </div>`;
  tDraw('rm');
};
function viewRemit(id) {
  const r = REMITS.find(x => x.id === id), a = agency(r.agencyId);
  openModal('Remittance — ' + a.name + ' · ' + r.period,
    dl([['Agency', a.name], ['Period', r.period], ['Amount', `<strong>${fmt(r.amount)}</strong>`], ['Due', r.due],
        ['Status', badge(r.status)], ['Wire ref', r.wire || '—'],
        ['Bookings', xlink(r.bookings + ' bookings', 'booking-breakdown/' + r.agencyId + ':' + r.pkey)]]),
    {readOnly:true});
}
function openMarkPaid(id) {
  const r = REMITS.find(x => x.id === id), a = agency(r.agencyId);
  openModal('Mark remittance as Paid',
    `<div class="fr-modal-summary"><strong>${a.name}</strong><div class="muted">${r.period} · ${fmt(r.amount)}${r.status === 'Overdue' ? ' · ' + r.late + ' overdue' : ''}</div></div>
     ${fld('Wire transaction reference (required)', '')}
     <div class="form-field"><label>Notes (optional)</label><textarea rows="2" placeholder="e.g. received via SWIFT"></textarea></div>`,
    {onSave:() => { r.status = 'Paid'; r.late = 'on time'; r.wire = 'WIRE-2026-DEMO'; tDraw('rm'); }});
}

/* ---------- Payments & Settlement (Finance) ---------- */
RENDERERS['settlement'] = () => {
  pg('settlement').innerHTML = `
    <div class="page-head row">
      <div><h1>Payments &amp; Settlement</h1><p class="muted">Balance settlements + credit accounts. Agency names link to the agency's Credit tab — one source of truth.</p></div>
    </div>
    <div class="st-card">
      <span class="st-dir st-in">Agency → Ergos</span>
      <h2 style="margin:0 0 6px">Balance settlements</h2>
      ${table('setl', {
        rows: () => SETTLEMENTS,
        date: {label:'Initiated', val: s => s.initiated},
        status: {options:['Pending','Completed','Failed'], val: s => s.status},
        search: {placeholder:'Search agency…', val: s => agency(s.agencyId).name + ' ' + s.id},
        columns: [
          {key:'id', label:'Settlement', val: s => s.id, cell: s => `<span class="bb-mono">${s.id}</span>`},
          {key:'agency', label:'Agency', val: s => agency(s.agencyId).name, cell: s => xlink(agency(s.agencyId).name, 'agency/' + s.agencyId + ':credit')},
          {key:'init', label:'Initiated', val: s => pdate(s.initiated), cell: s => s.initiated},
          {key:'amount', label:'Amount', right:true, val: s => s.amount, cell: s => fmt(s.amount)},
          {key:'method', label:'Method', val: s => s.method, cell: s => s.method},
          {key:'status', label:'Status', val: s => s.status, cell: s => `<span class="st-pill ${s.pill}">${s.label}</span>`}
        ]
      })}
    </div>
    <div class="st-card">
      <span class="st-dir st-out">Per-agency accounts</span>
      <h2 style="margin:0 0 6px">Credit accounts</h2>
      ${table('cracc', {
        rows: () => AGENCIES.filter(a => a.credit),
        status: {options:['Deposit','Granted'], val: a => a.credit.type === 'DEPOSIT' ? 'Deposit' : 'Granted'},
        search: {placeholder:'Search agency…', val: a => a.name},
        columns: [
          {key:'agency', label:'Agency', val: a => a.name, cell: a => xlink(a.name, 'agency/' + a.id + ':credit')},
          {key:'type', label:'Type', val: a => a.credit.type, cell: a => `<span class="st-pill ${a.credit.type === 'DEPOSIT' ? 'st-pending' : 'st-paid'}">${a.credit.type === 'DEPOSIT' ? 'Deposit' : 'Granted'}</span>`},
          {key:'fund', label:'Grant / Deposits', right:true, val: a => a.credit.funding, cell: a => fmt(a.credit.funding)},
          {key:'limit', label:'Limit', right:true, val: a => a.credit.type === 'DEPOSIT' ? a.credit.funding * 2 : a.credit.funding, cell: a => fmt(a.credit.type === 'DEPOSIT' ? a.credit.funding * 2 : a.credit.funding) + (a.credit.type === 'DEPOSIT' ? ' (2×)' : ' (= grant)')},
          {key:'util', label:'Utilization', right:true, val: a => a.credit.util, cell: a => fmt(a.credit.util)},
          {key:'owed', label:'Owed', right:true, val: a => a.credit.type === 'DEPOSIT' ? Math.max(0, a.credit.util - a.credit.funding) : a.credit.util, cell: a => fmt(a.credit.type === 'DEPOSIT' ? Math.max(0, a.credit.util - a.credit.funding) : a.credit.util)},
          {key:'note', label:'Status', sortable:false, val: () => '', cell: a => a.credit.note}
        ],
        rowAttrs: a => `class="rowlink" onclick="go('agency','${a.id}:credit')"`
      })}
      <p class="muted" style="margin-top:8px">Row click opens the agency's Credit tab — the ledger and actions live there.</p>
    </div>`;
  tDraw('setl'); tDraw('cracc');
};

/* ---------- Travel Agencies (Partners) — 7 → 5 cols ---------- */
RENDERERS['agencies'] = () => {
  pg('agencies').innerHTML = `
    <div class="page-head row">
      <div><h1>Travel Agencies</h1><p class="muted">Row click opens the one agency page — Details, Employees, P&amp;L and Credit in one place.</p></div>
    </div>
    <div class="card">
      ${table('ag', {
        rows: () => AGENCIES,
        chips: [['was', '7 → 5 cols · rest in detail', 'license and credit state moved to the agency page (Details / Credit tabs)']],
        status: {options:['Active','Pending','Suspended'], val: a => a.status},
        entity: {placeholder:'Vendor…', options: VENDOR_NAMES, val: a => a.vendors.join(' ')},
        search: {placeholder:'Search agency, contact…', val: a => a.name + ' ' + a.contact},
        columns: [
          {key:'name', label:'Agency', val: a => a.name, cell: a => `<strong>${a.name}</strong>`},
          {key:'contact', label:'Primary contact', val: a => a.contact, cell: a => a.contact},
          {key:'vendors', label:'Vendors', val: a => a.vendors.join(' '), cell: a => `<div class="vendor-chips">${a.vendors.map(v => `<span class="vendor-chip ${v.toLowerCase()}">${v}</span>`).join('')}</div>`},
          {key:'status', label:'Status', val: a => a.status, cell: a => badge(a.status)},
          {key:'act', label:'', sortable:false, right:true, val: () => '', cell: a => kebab('a' + a.id, [
            ['P&L ↗', () => go('agency', a.id + ':pnl')],
            ['Credit ↗', () => go('agency', a.id + ':credit')],
            ['Employees ↗', () => go('agency', a.id + ':employees')]
          ])}
        ],
        rowAttrs: a => `class="rowlink" onclick="go('agency','${a.id}')"`
      })}
    </div>`;
  tDraw('ag');
};

/* ---------- The one agency page (tabs) ---------- */
/* param: 'agc1' or 'agc1:credit' etc. */
RENDERERS['agency'] = (param) => {
  const [id, tabRaw] = (param || 'agc1').split(':');
  const a = agency(id) || AGENCIES[0];
  const tab = ['details','employees','pnl','credit'].includes(tabRaw) ? tabRaw : 'details';
  document.getElementById('crumb-agency').textContent = a.name;
  const tabBtn = (t, label, extra) =>
    `<button class="page-tab ${tab === t ? 'active' : ''}" onclick="go('agency','${a.id}:${t}')">${label}${extra || ''}</button>`;
  pg('agency').innerHTML = `
    <div class="page-head row">
      <div><h1>${a.name} ${badge(a.status)}</h1><p class="muted">${a.license} · ${a.contact} · ${a.email}</p></div>
      <button class="btn btn-outline" onclick="go('agencies')">← Agencies</button>
    </div>
    <div class="page-tabs">
      ${tabBtn('details', 'Details')}
      ${tabBtn('employees', 'Employees', ' ' + chip('was', 'was: Employment nav item', 'the global Employment screen is folded into this tab'))}
      ${tabBtn('pnl', 'P&L')}
      ${tabBtn('credit', 'Credit')}
    </div>
    <div id="agency-tab-body">${AGENCY_TABS[tab](a)}</div>`;
  if (tab === 'pnl') tDraw('pnl');
  if (tab === 'credit' && a.credit) tDraw('ledg');
  if (tab === 'employees') tDraw('emp');
};
const AGENCY_TABS = {
  details: a => `
    <div class="card">
      ${dl([['Name', a.name], ['Status', badge(a.status)], ['Primary contact', a.contact], ['Email', a.email],
            ['License', a.license], ['Vendor access', a.vendors.join(' · ')],
            ['Default rebate', pctf(a.rebate) + ' ' + (a.rebate ? '<span class="badge badge-teal">Custom</span>' : '<span class="badge badge-grey">Default</span>')]])}
      <div class="linkrow" style="margin-top:14px"><span class="linkrow-label">Related</span>
        ${xlink('Prices this agency sees', 'price-composition/h1')}
        ${xlink('Remittances', 'remittances')}
      </div>
    </div>`,
  employees: a => `
    <div class="card">
      <div class="card-head row"><h3>Employees (${a.employees.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="inviteEmployee('${a.id}')">+ Invite Employee</button></div>
      ${table('emp', {
        rows: () => a.employees,
        status: {options:['Accepted','Pending','Expired'], val: e => e[3]},
        search: {placeholder:'Search name, email…', val: e => e[0] + ' ' + e[1]},
        columns: [
          {key:'name', label:'Employee', val: e => e[0], cell: e => e[0]},
          {key:'email', label:'Email', val: e => e[1], cell: e => e[1]},
          {key:'role', label:'Role', val: e => e[2], cell: e => e[2]},
          {key:'status', label:'Status', val: e => e[3], cell: e => badge(e[3])}
        ],
        rowAttrs: e => `class="rowlink" onclick="viewEmployee('${a.id}',${a.employees.indexOf(e)})"`
      })}
      <p class="muted" style="margin-top:10px">Was the global “Employment” list of every agency's staff — scoped here to the agency you're looking at.</p>
    </div>`,
  pnl: a => {
    const list = BOOKINGS.filter(b => b.agencyId === a.id && b.status !== 'Cancelled');
    return `
    <div class="card">
      <div class="card-head"><h3>Bookings &amp; P&amp;L</h3></div>
      ${table('pnl', {
        rows: () => list,
        date: {label:'Booked', val: b => b.booked},
        search: {placeholder:'Search ref, hotel…', val: b => b.ref + ' ' + hotel(b.hotelId).name},
        columns: [
          {key:'ref', label:'Reference', val: b => b.ref, cell: b => `<span class="bb-ref">${b.ref}</span>`},
          {key:'hotel', label:'Hotel', val: b => hotel(b.hotelId).name, cell: b => hotel(b.hotelId).name},
          {key:'sell', label:'Ergos sell', right:true, val: b => calc(b).sell, cell: b => fmt(calc(b).sell)},
          {key:'net', label:'Ergos net', right:true, val: b => calc(b).net, cell: b => fmt(calc(b).net)},
          {key:'margin', label:'Margin', val: b => calc(b).margin, cell: b => marginBadge(calc(b).margin)}
        ],
        foot: rows => `<tr><td>Total (${rows.length})</td><td></td><td class="text-right">${fmt(rows.reduce((s, b) => s + calc(b).sell, 0))}</td><td class="text-right">${fmt(rows.reduce((s, b) => s + calc(b).net, 0))}</td><td></td></tr>`,
        rowAttrs: b => `class="rowlink" onclick="go('reservation-detail','${b.ref}')"`
      })}
      <p class="muted" style="margin-top:10px">Row click opens the reservation detail — same idiom as everywhere else. Totals follow the active filters.</p>
    </div>`;
  },
  credit: a => {
    if (!a.credit) return `<div class="card"><p class="muted">No credit account yet — first grant or deposit establishes the account type.</p></div>`;
    const cr = a.credit, dep = cr.type === 'DEPOSIT';
    const limit = dep ? cr.funding * 2 : cr.funding;
    const owed = dep ? Math.max(0, cr.util - cr.funding) : cr.util;
    const avail = Math.max(0, limit - cr.util);
    return `
    <div class="kpi-grid">
      <div class="kpi navy"><div class="kpi-label">${dep ? 'Deposits' : 'Grant'}</div><div class="kpi-value">${fmt(cr.funding)}</div></div>
      <div class="kpi gold"><div class="kpi-label">Booking power ${dep ? '(2×)' : '(= grant)'}</div><div class="kpi-value">${fmt(limit)}</div></div>
      <div class="kpi"><div class="kpi-label">Owed to Ergos</div><div class="kpi-value">${fmt(owed)}</div></div>
      <div class="kpi green"><div class="kpi-label">Available</div><div class="kpi-value">${fmt(avail)}</div></div>
    </div>
    <div class="card">
      <div class="card-head row"><h3>Account</h3><div>${cr.note}</div></div>
      ${dl([['Type', `<span class="st-pill ${dep ? 'st-pending' : 'st-paid'}">${dep ? 'Deposit' : 'Granted'}</span> — one type per agency, never both`],
            ['Utilization', fmt(cr.util)],
            ['NR overdraft', cr.nr ? '<span class="st-pill st-paid">On</span>' : '—']])}
      <div class="linkrow" style="margin-top:14px"><span class="linkrow-label">Related</span>
        ${xlink('Settlements', 'settlement')}
        ${xlink('Remittances', 'remittances')}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Ledger (${a.ledger.length}) — append-only</h3></div>
      ${table('ledg', {
        rows: () => a.ledger,
        date: {label:'When', val: l => l[0]},
        status: {options: [...new Set(a.ledger.map(l => l[1]))], val: l => l[1]},
        search: {placeholder:'Search reason…', val: l => l[4]},
        columns: [
          {key:'when', label:'When', val: l => pdate(l[0]), cell: l => l[0]},
          {key:'type', label:'Type', val: l => l[1], cell: l => `<span class="st-pill ${l[2]}">${l[1]}</span>`},
          {key:'amount', label:'Amount', right:true, val: l => money(l[3]), cell: l => l[3]},
          {key:'reason', label:'Reason', val: l => l[4], cell: l => l[4]}
        ]
      })}
      <p class="muted" style="margin-top:8px">Every number above is derived from these rows — nothing is a bare editable field.</p>
    </div>`;
  }
};
function viewEmployee(agencyId, i) {
  const a = agency(agencyId), e = a.employees[i];
  openModal('Employee — ' + e[0],
    dl([['Name', e[0]], ['Email', e[1]], ['Agency', a.name], ['Role', e[2]], ['Status', badge(e[3])]]),
    {readOnly:true});
}
function inviteEmployee(agencyId) {
  const a = agency(agencyId);
  openModal('Invite Employee — ' + a.name,
    `<div class="form-grid">${fld('First name', '')}${fld('Last name', '')}${fld('Email', '', 'email')}
     <div class="form-field"><label>Role</label><select><option>Agent</option><option>Manager</option><option>Supervisor</option></select></div></div>`);
}

/* ---------- Sales Agents (Partners) ---------- */
RENDERERS['agents'] = () => {
  pg('agents').innerHTML = `
    <div class="page-head row">
      <div><h1>Sales Agents</h1><p class="muted">Rates are tier-driven and live in the Pricing Policy cascade.</p></div>
      ${xlink('Commissions', 'commissions')}
    </div>
    <div class="card">
      ${table('sag', {
        rows: () => AGENTS,
        status: {options:['Elite','Growth','Starter'], val: a => a.tier},
        search: {placeholder:'Search name, email, city…', val: a => a.name + ' ' + a.email + ' ' + a.city},
        columns: [
          {key:'name', label:'Agent', val: a => a.name, cell: a => `<strong>${a.name}</strong>`},
          {key:'email', label:'Email', val: a => a.email, cell: a => a.email},
          {key:'city', label:'City', val: a => a.city, cell: a => a.city},
          {key:'tier', label:'Tier', val: a => a.tier, cell: a => `<span class="pill pill-${({Elite:'gold', Growth:'blue', Starter:'grey'})[a.tier]}">${a.tier}</span>`},
          {key:'earn', label:'Earning', right:true, val: a => a.earn, cell: a => a.earn + '%'},
          {key:'ops', label:'Ops', right:true, val: a => a.ops, cell: a => a.ops + '%'},
          {key:'status', label:'Status', val: a => a.status, cell: a => badge(a.status)}
        ],
        rowAttrs: a => `class="rowlink" onclick="viewAgent(${AGENTS.indexOf(a)})"`
      })}
    </div>`;
  tDraw('sag');
};
function viewAgent(i) {
  const a = AGENTS[i];
  openModal('Agent — ' + a.name,
    dl([['Name', a.name], ['Email', a.email], ['City', a.city], ['Tier', a.tier],
        ['Earning', a.earn + '% of Ergos gross'], ['Ops expense', a.ops + '%'], ['Status', badge(a.status)]]) +
    `<div class="modal-note">Rates inherit from the ${a.tier} tier — override them in <span class="lnk" onclick="closeModal();go('pricing-policy')">Pricing Policy ↗</span>, not here.</div>`,
    {readOnly:true});
}

/* ---------- init ---------- */
buildShells();
route();
