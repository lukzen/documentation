/* ============================================================
   Ergos Backoffice — REORGANIZATION prototype
   Separate from ../backoffice (untouched). Same visual language,
   new information architecture. Hash-routed (#/screen/param) so
   every drill-in is deep-linkable and browser Back works.
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

const HOTELS = [
  {id:'h1', code:'HT00108', name:'Iberostar Grand Packard', city:'Havana',     vendor:'Dingus',  brand:'Iberostar', stars:5, markup:17.5, adj:0,    sync:'2026-08-18'},
  {id:'h2', code:'HT00214', name:'Hyatt Ziva Cap Cana',     city:'Punta Cana', vendor:'Roibos',  brand:'Hyatt',     stars:5, markup:19.4, adj:2.5,  sync:'2026-08-17'},
  {id:'h3', code:'HT00342', name:'Meliá Palma Bay',         city:'Palma',      vendor:'Hotetec', brand:'Meliá',     stars:4, markup:17.0, adj:-1.5, sync:'2026-08-18'},
  {id:'h4', code:'HT00477', name:'Marriott Aruba Surf Club',city:'Palm Beach', vendor:'Restel',  brand:'Marriott',  stars:4, markup:18.0, adj:0,    sync:'2026-08-16'},
  {id:'h5', code:'HT00519', name:'RIU Palace Aruba',        city:'Palm Beach', vendor:'Dingus',  brand:'RIU',       stars:5, markup:19.6, adj:0,    sync:'2026-08-18'},
  {id:'h6', code:'HT00633', name:'Paradisus Río de Oro',    city:'Holguín',    vendor:'Dingus',  brand:'Meliá',     stars:5, markup:20.0, adj:0,    sync:'2026-08-15'}
];
const hotel = id => HOTELS.find(h => h.id === id);

const BRANDS = [
  {name:'Iberostar Group',            code:'IBEROSTAR', disc:.125, status:'Signed',      note:'Effective Mar 2026 – Mar 2027.'},
  {name:'Meliá Hotels International', code:'MELIA',     disc:.10,  status:'Signed',      note:'Includes Paradisus properties.'},
  {name:'RIU Hotels & Resorts',       code:'RIU',       disc:.085, status:'Pending',     note:'Contract under legal review — discount inactive.'},
  {name:'Marriott International',     code:'MARRIOTT',  disc:0,    status:'No discount', note:'Brand grouping only.'},
  {name:'Hyatt Hotels Corporation',   code:'HYATT',     disc:.07,  status:'Signed',      note:'Ziva / Zilara all-inclusive.'}
];

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
  {scope:'Global default',                     param:'Ergos markup',   value:'15.0%',  status:'active'},
  {scope:'Country · Cuba',                     param:'Ergos markup',   value:'17.5%',  status:'wins', winsFor:'markup'},
  {scope:'Brand · Iberostar',                  param:'Brand discount', value:'−12.5%', status:'wins', winsFor:'discount'},
  {scope:'Hotel · Iberostar Grand Packard',    param:'Ergos markup',   value:'— (inherits)', status:'inherit'},
  {scope:'Agency · Sunshine Travel LLC',       param:'Rebate',         value:'3.0%',   status:'wins', winsFor:'rebate'},
  {scope:'Tier · Elite (Carlos Ortega)',       param:'Agent share',    value:'22.0%',  status:'wins', winsFor:'agent'}
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
  const rows = BOOKINGS.slice(0, 5).map(b => {
    const c = calc(b);
    return `<tr class="rowlink" onclick="go('reservation-detail','${b.ref}')">
      <td class="bb-ref">${b.ref}</td><td>${agency(b.agencyId).name}</td><td>${hotel(b.hotelId).name}</td>
      <td class="text-right"><strong>${fmt(c.eff)}</strong></td><td>${badge(b.status)}</td><td class="muted">${b.booked}</td>
    </tr>`;
  }).join('');
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
      <table class="tbl">
        <thead><tr><th>Reference</th><th>Agency</th><th>Hotel</th><th class="text-right">Agency pays</th><th>Status</th><th>Booked</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
};

/* ---------- BackOffice (tabs: Users | Roles — Roles merged) ---------- */
RENDERERS['backoffice'] = (tab) => {
  tab = tab === 'roles' ? 'roles' : 'users';
  const users = BO_USERS.map((u, i) => `
    <tr class="rowlink" onclick="viewBoUser(${i})">
      <td>${u[0]} ${u[1]}</td><td>${u[2]}</td><td><code class="code-chip">${u[3]}</code></td><td>${badge(u[4])}</td>
      <td class="text-right">${kebab('bo' + i, [['Edit user', () => editBoUser(i)], ['Reset password', () => toast('Password reset email sent (demo)')]])}</td>
    </tr>`).join('');
  const roles = ROLES.map((r, i) => `
    <tr class="rowlink" onclick="viewRole(${i})">
      <td>${r[0]}</td><td><code class="code-chip">${r[1]}</code></td><td>${r[2]}</td><td class="text-right">${r[3].toLocaleString('en-US')}</td>
    </tr>`).join('');
  pg('backoffice').innerHTML = `
    <div class="page-head row">
      <div><h1>BackOffice</h1><p class="muted">Internal staff and their roles — one screen, two tabs.</p></div>
      ${tab === 'users' ? `<button class="btn btn-primary" onclick="editBoUser()">+ Add User</button>` : ''}
    </div>
    <div class="page-tabs">
      <button class="page-tab ${tab === 'users' ? 'active' : ''}" onclick="go('backoffice','users')">Users</button>
      <button class="page-tab ${tab === 'roles' ? 'active' : ''}" onclick="go('backoffice','roles')">Roles ${chip('merged', 'was: nav item', 'Roles Management was a separate nav item')}</button>
    </div>
    ${tab === 'users' ? `
      <div class="card"><table class="tbl">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>${users}</tbody>
      </table></div>` : `
      <div class="card"><table class="tbl">
        <thead><tr><th>Role</th><th>Code</th><th>Description</th><th class="text-right">Users</th></tr></thead>
        <tbody>${roles}</tbody>
      </table></div>`}`;
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

/* ---------- Hotels (Catalog) ---------- */
RENDERERS['hotels'] = (search) => {
  pg('hotels').innerHTML = `
    <div class="page-head row">
      <div><h1>Hotels</h1><p class="muted">${chip('new', 'changed')} Empty Commission column removed · the field is <b>Ergos Markup</b> everywhere (list, dialog, waterfall).</p></div>
      <button class="btn btn-primary" onclick="editHotel('h1')">+ Add Hotel</button>
    </div>
    <div class="card">
      <div class="table-toolbar"><input class="t-search" id="hotel-search" placeholder="Search name, city, brand…" oninput="filterHotels(this.value)"></div>
      <table class="tbl"><thead><tr>
        <th>Code</th><th>Hotel</th><th>City</th><th>★</th><th>Vendor</th><th>Brand</th>
        <th class="text-right">Ergos Markup</th><th class="text-right">Price adj.</th><th>Links</th><th></th>
      </tr></thead><tbody id="hotel-rows"></tbody></table>
    </div>`;
  renderHotelRows(search || '');
  if (search) {
    const inp = document.getElementById('hotel-search');
    inp.value = search;
  }
};
function renderHotelRows(q) {
  q = (q || '').toLowerCase();
  document.getElementById('hotel-rows').innerHTML = HOTELS
    .filter(h => !q || (h.name + h.city + h.brand + h.vendor + h.code).toLowerCase().includes(q))
    .map(h => `
      <tr class="rowlink" onclick="editHotel('${h.id}')">
        <td class="bb-mono">${h.code}</td><td><strong>${h.name}</strong></td><td>${h.city}</td>
        <td>${'★'.repeat(h.stars)}</td><td><span class="vendor-chip ${h.vendor.toLowerCase()}">${h.vendor}</span></td><td>${h.brand}</td>
        <td class="text-right">${h.markup.toFixed(1)}%</td><td class="text-right">${h.adj >= 0 ? '+' : '−'}${Math.abs(h.adj).toFixed(1)}%</td>
        <td>${xlink('price composition', 'price-composition/' + h.id)}</td>
        <td class="text-right">${kebab('h' + h.id, [
          ['Edit hotel', () => editHotel(h.id)],
          ['Pricing rules ↗', () => go('pricing-policy')],
          ['Sync from ' + h.vendor, () => toast('Sync queued for ' + h.name + ' (demo)')]
        ])}</td>
      </tr>`).join('') || `<tr><td colspan="10" class="tbl-empty-cell">No hotels match.</td></tr>`;
}
function filterHotels(q){ renderHotelRows(q); }
function editHotel(id) {
  const h = hotel(id);
  openModal('Edit Hotel — ' + h.name,
    `<div class="form-grid">
       ${fld('Code', h.code)}${fld('Name', h.name)}${fld('City', h.city)}${fld('Brand', h.brand)}
       ${fld('Ergos Markup (%)', h.markup, 'number')}${fld('Price adjustment (%)', h.adj, 'number')}
     </div>
     <div class="modal-note">One vocabulary: this field is <b>Ergos Markup</b> — it was “Base commission” here and an always-empty “Commission” column in the list.</div>`);
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

/* ---------- Reservations (Bookings) ---------- */
RENDERERS['reservations'] = () => {
  const rows = BOOKINGS.map(b => {
    const c = calc(b);
    return `<tr class="rowlink" onclick="go('reservation-detail','${b.ref}')">
      <td class="bb-ref">${b.ref}</td><td>${b.guest}</td><td>${hotel(b.hotelId).name}</td><td>${agency(b.agencyId).name}</td>
      <td>${b.checkin}</td><td class="text-center">${b.nights}</td>
      <td class="text-right"><strong>${fmt(c.eff)}</strong></td><td>${badge(b.status)}</td>
      <td class="text-right">${kebab('r' + b.ref, [
        ['Financial breakdown ↗', () => go('booking-breakdown', b.ref)],
        ['Audit history ↗', () => go('audit-log', b.ref)]
      ])}</td>
    </tr>`;
  }).join('');
  pg('reservations').innerHTML = `
    <div class="page-head row">
      <div><h1>Reservations</h1><p class="muted">${chip('new', 'changed')} Status is a badge (was plain text) · row click → detail, kebab for secondary — the one idiom everywhere.</p></div>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Reference</th><th>Guest</th><th>Hotel</th><th>Agency</th><th>Check-in</th><th>Nights</th><th class="text-right">Agency pays</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
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

/* ---------- Booking Breakdown (Bookings) ---------- */
/* param: 'PTA…' opens that booking's detail · 'agc1:2026-07' filters */
RENDERERS['booking-breakdown'] = (param) => {
  let detailRef = null, fAgency = '', fPeriod = '';
  if (param && param.startsWith('PTA')) detailRef = param;
  else if (param) [fAgency, fPeriod] = param.split(':');
  const list = BOOKINGS.filter(b =>
    (!fAgency || b.agencyId === fAgency) && (!fPeriod || b.pkey === fPeriod));
  const periodLabel = fPeriod === '2026-07' ? 'Jul 2026' : fPeriod === '2026-06' ? 'Jun 2026' : fPeriod;
  const filterChip = fAgency ? `
    <div class="filter-chip">Filtered: ${agency(fAgency).name} · ${periodLabel} — from Remittances
      <button onclick="go('booking-breakdown')" title="Clear filter">×</button></div>` : '';
  const rows = list.map(b => {
    const c = calc(b);
    return `<tr class="rowlink bb-row" onclick="go('booking-breakdown','${b.ref}')">
      <td>${b.booked}</td><td class="bb-ref">${b.ref}</td><td>${agency(b.agencyId).name}</td><td>${hotel(b.hotelId).name}</td>
      <td class="text-right">${fmt(c.adj)}</td><td class="text-right">${pctf(b.markup)}</td>
      <td class="text-right">${fmt(c.sell)}</td><td class="text-right">${fmt(c.net)}</td>
      <td>${marginBadge(c.margin)}</td>
    </tr>`;
  }).join('');
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
    ${filterChip}
    <div class="card bb-filter-card">
      <div class="bb-filter-row">
        <div class="bb-field"><label>From date</label><input type="date" value="2026-07-01"></div>
        <div class="bb-field"><label>To date</label><input type="date" value="2026-08-19"></div>
        <div class="bb-field"><label>Agency</label>
          <select onchange="go('booking-breakdown', this.value ? this.value + ':${fPeriod || '2026-07'}' : '')">
            <option value="">All agencies</option>
            ${AGENCIES.map(a => `<option value="${a.id}" ${a.id === fAgency ? 'selected' : ''}>${a.name}</option>`).join('')}
          </select></div>
        <button class="btn btn-primary bb-search-btn" onclick="toast('Filters applied')"><i class="ti ti-search"></i> Search</button>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Bookings (${fAgency ? list.length + ' of 37 shown — demo subset' : list.length})</h3></div>
      <table class="tbl bb-tbl">
        <thead><tr><th>Booked</th><th>Reference</th><th>Agency</th><th>Hotel</th><th class="text-right">Ergos cost</th><th class="text-right">Markup</th><th class="text-right">Ergos sell</th><th class="text-right">Ergos net</th><th>Margin</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`}`;
};

/* ---------- Booking Audit Log (Bookings) ---------- */
RENDERERS['audit-log'] = (ref) => {
  const list = ref ? AUDIT.filter(r => r.ref === ref) : AUDIT;
  const rows = list.map((r, i) => `
    <tr class="rowlink audit-row" onclick="auditSelect(${AUDIT.indexOf(r)})">
      <td class="bb-mono">${r.t}</td>
      <td><a class="lnk bb-ref" href="#/reservation-detail/${r.ref}" onclick="event.stopPropagation()" title="Open reservation">${r.ref} ↗</a></td>
      <td>${badge(r.action)}</td><td class="bb-mono">${r.trans}</td><td>${r.vendor}</td><td>${badge(r.result)}</td>
    </tr>`).join('');
  pg('audit-log').innerHTML = `
    <div class="page-head row">
      <div><h1>Booking Audit Log</h1><p class="muted">${chip('new', 'changed')} Booking refs are links to the reservation detail · reachable pre-filtered from any booking's “Audit history ↗”.</p></div>
    </div>
    ${ref ? `<div class="filter-chip">Filtered: ${ref} <button onclick="go('audit-log')" title="Clear filter">×</button></div>` : ''}
    <div class="audit-split-lite">
      <div class="card">
        <table class="tbl">
          <thead><tr><th>When</th><th>Booking Ref</th><th>Action</th><th>Transition</th><th>Vendor</th><th>Result</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="tbl-empty-cell">No entries for this filter.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="card" id="audit-detail">${auditDetailHTML(list[0] ? AUDIT.indexOf(list[0]) : 0)}</div>
    </div>`;
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
  const rows = RULES.map((r, i) => `
    <tr class="rowlink ${r.status === 'wins' ? '' : ''}" onclick="viewRule(${i})">
      <td>${r.scope}</td><td>${r.param}</td><td class="text-right bb-mono">${r.value}</td>
      <td>${r.status === 'wins' ? '<span class="badge badge-teal">wins</span>' : r.status === 'inherit' ? '<span class="badge badge-grey">inherits</span>' : '<span class="badge badge-grey">base</span>'}</td>
    </tr>`).join('');
  const eff = {net:200.00, brandDisc:.125, markup:.175, rebate:.03, agentPct:.22, opsPct:.07, pay:'credit'};
  pg('pricing-policy').innerHTML = `
    <div class="page-head row">
      <div><h1>Pricing Policy</h1><p class="muted">One vocabulary: the <b>cascade</b> resolves which rules apply; the <b>waterfall</b> shows the money they produce.</p></div>
      ${xlink('Preview prices', 'price-composition/h1')}
    </div>
    <div class="card">
      <div class="card-head row"><h3>Cascade — rule resolution · Iberostar Grand Packard × Sunshine Travel LLC</h3><span class="muted">most specific rule wins · row click → rule detail</span></div>
      <table class="tbl">
        <thead><tr><th>Scope</th><th>Parameter</th><th class="text-right">Value</th><th>Resolution</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-head row"><h3>Waterfall — effective config</h3><span class="muted">what tonight's $200.00 net rate produces under the rules above</span></div>
      ${waterfall(eff, {caption:'Identical component and vocabulary as Price Composition, Booking Breakdown and the reservation detail.'})}
    </div>`;
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
    const n = HOTELS.filter(h => h.brand === b.name.split(' ')[0] || b.name.startsWith(h.brand)).length;
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
  const disc = (BRANDS.find(x => x.status === 'Signed' && x.name.startsWith(h.brand)) || {disc:0}).disc;
  const base = {net:COMPO_NET[h.id], brandDisc:disc, markup:h.markup / 100, rebate:0, agentPct:.22, opsPct:.07, pay:'credit'};
  const sell = calc(base).sell;
  const agencyRows = AGENCIES.map(a => `
    <tr class="rowlink" onclick="compoTrace('${a.id}','${h.id}')">
      <td><strong>${a.name}</strong></td>
      <td>${a.rebate ? '<span class="badge badge-teal">Custom</span>' : '<span class="badge badge-grey">Default</span>'}</td>
      <td class="text-right">${pctf(a.rebate)}</td>
      <td class="text-right"><strong>${fmt(sell * (1 - a.rebate))}</strong></td>
      <td>${xlink('agency page', 'agency/' + a.id)}</td>
    </tr>`).join('');
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
      <table class="tbl">
        <thead><tr><th>Agency</th><th>Rule</th><th class="text-right">Rebate</th><th class="text-right">Agency pays</th><th></th></tr></thead>
        <tbody>${agencyRows}</tbody>
      </table>
    </div>
    <div class="card" id="compo-trace">
      <div class="card-head"><h3>Cascade trace</h3></div>
      <p class="muted">Click an agency row above to see which rebate tiers the resolver considered and which one won.</p>
    </div>`;
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
  const rows = COMMISSIONS.map((c, i) => {
    const a = agent(c.agentId);
    return `<tr class="rowlink" onclick="viewCommission(${i})">
      <td><strong>${a.name}</strong></td><td>${a.tier}</td><td>${c.period}</td>
      <td class="text-center">${c.bookings}</td><td class="text-right">${fmt(c.gross)}</td>
      <td class="text-right"><strong>${fmt(c.earned)}</strong></td><td>${badge(c.status)}</td>
    </tr>`;
  }).join('');
  pg('commissions').innerHTML = `
    <div class="page-head row">
      <div><h1>Commissions</h1><p class="muted">${chip('new', 'new in nav — was orphan route', 'previously reachable only by typing /commissions')} Agent earnings per period, computed by the Pricing Policy engine.</p></div>
      ${xlink('Rates: Pricing Policy', 'pricing-policy')}
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Agent</th><th>Tier</th><th>Period</th><th>Bookings</th><th class="text-right">Gross margin base</th><th class="text-right">Earned</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
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
let REMIT_F = {q:'', status:'all', period:'all'};
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
      <div class="table-toolbar">
        <input class="t-search" id="rm-q" placeholder="Search agency or license…" value="${REMIT_F.q}" oninput="remitFilter()">
        <div class="t-filters">
          <select id="rm-status" onchange="remitFilter()">
            <option value="all" ${REMIT_F.status === 'all' ? 'selected' : ''}>All status</option>
            <option value="Pending" ${REMIT_F.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Overdue" ${REMIT_F.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
            <option value="Paid" ${REMIT_F.status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
          <select id="rm-period" onchange="remitFilter()">
            <option value="all" ${REMIT_F.period === 'all' ? 'selected' : ''}>All periods</option>
            <option value="2026-07" ${REMIT_F.period === '2026-07' ? 'selected' : ''}>Jul 2026</option>
            <option value="2026-06" ${REMIT_F.period === '2026-06' ? 'selected' : ''}>Jun 2026</option>
          </select>
          ${chip('new', 'new', 'search + status/period filters do not exist on the current remittances screen')}
        </div>
      </div>
      <table class="tbl"><thead><tr>
        <th>Agency</th><th>Period</th><th class="text-right">Amount</th><th>Due</th><th>Status</th><th>Days late</th><th>Bookings</th><th class="text-right">Actions</th>
      </tr></thead><tbody id="rm-rows"></tbody></table>
    </div>`;
  renderRemitRows();
};
function remitFilter() {
  REMIT_F = {
    q: document.getElementById('rm-q').value.toLowerCase(),
    status: document.getElementById('rm-status').value,
    period: document.getElementById('rm-period').value
  };
  renderRemitRows();
}
function renderRemitRows() {
  const rows = REMITS.filter(r => {
    const a = agency(r.agencyId);
    return (!REMIT_F.q || (a.name + a.license).toLowerCase().includes(REMIT_F.q))
      && (REMIT_F.status === 'all' || r.status === REMIT_F.status)
      && (REMIT_F.period === 'all' || r.pkey === REMIT_F.period);
  }).map(r => {
    const a = agency(r.agencyId);
    return `<tr class="rowlink" onclick="viewRemit('${r.id}')">
      <td><strong>${a.name}</strong><span class="fr-license">${a.license}</span></td>
      <td>${r.period}</td><td class="text-right"><strong>${fmt(r.amount)}</strong></td><td>${r.due}</td>
      <td>${badge(r.status)}</td><td class="${r.status === 'Overdue' ? 'fr-late' : 'muted'}">${r.late}</td>
      <td>${xlink(r.bookings + ' bookings', 'booking-breakdown/' + r.agencyId + ':' + r.pkey)}</td>
      <td class="text-right">
        ${r.status === 'Paid'
          ? kebab('rm' + r.id, [['View wire detail', () => viewRemit(r.id)], ['Revert to pending', () => toast('Reason required — audited (demo)')]])
          : `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openMarkPaid('${r.id}')">Mark Paid</button>` +
            kebab('rm' + r.id, [['Adjust amount', () => toast('Adjustment needs a reason — audited (demo)')], ['Agency credit ↗', () => go('agency', r.agencyId + ':credit')]])}
      </td>
    </tr>`;
  }).join('');
  document.getElementById('rm-rows').innerHTML = rows || '<tr><td colspan="8" class="tbl-empty-cell">No remittances match these filters.</td></tr>';
}
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
    {onSave:() => { r.status = 'Paid'; r.late = 'on time'; r.wire = 'WIRE-2026-DEMO'; renderRemitRows(); }});
}

/* ---------- Payments & Settlement (Finance) ---------- */
RENDERERS['settlement'] = () => {
  const credits = AGENCIES.filter(a => a.credit).map(a => {
    const cr = a.credit, dep = cr.type === 'DEPOSIT';
    const limit = dep ? cr.funding * 2 : cr.funding;
    const owed = dep ? Math.max(0, cr.util - cr.funding) : cr.util;
    return `<tr class="rowlink" onclick="go('agency','${a.id}:credit')">
      <td>${xlink(a.name, 'agency/' + a.id + ':credit')}</td>
      <td><span class="st-pill ${dep ? 'st-pending' : 'st-paid'}">${dep ? 'Deposit' : 'Granted'}</span></td>
      <td class="text-right">${fmt(cr.funding)}</td>
      <td class="text-right">${fmt(limit)} ${dep ? '(2×)' : '(= grant)'}</td>
      <td class="text-right">${fmt(cr.util)}</td>
      <td class="text-right">${fmt(owed)}</td>
      <td>${cr.note}</td>
    </tr>`;
  }).join('');
  pg('settlement').innerHTML = `
    <div class="page-head row">
      <div><h1>Payments &amp; Settlement</h1><p class="muted">Balance settlements + credit accounts. Agency names link to the agency's Credit tab — one source of truth.</p></div>
    </div>
    <div class="st-card">
      <span class="st-dir st-in">Agency → Ergos</span>
      <h2 style="margin:0 0 6px">Balance settlements</h2>
      <table class="st-table">
        <thead><tr><th>Settlement</th><th>Agency</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>SET-2026-0812-01</td><td>${xlink('Sunshine Travel LLC', 'agency/agc1:credit')}</td><td>${fmt(7500)}</td><td>ACH (Square)</td><td><span class="st-pill st-pending">Pending · ACH 2–3 days</span></td></tr>
          <tr><td>SET-2026-0809-02</td><td>${xlink('Coral Voyages', 'agency/agc3:credit')}</td><td>${fmt(2150)}</td><td>Card (TropiPay)</td><td><span class="st-pill st-paid">Completed</span></td></tr>
          <tr><td>SET-2026-0808-03</td><td>${xlink('Palma Tours Inc', 'agency/agc4:credit')}</td><td>${fmt(4320)}</td><td>ACH (Square)</td><td><span class="st-pill st-frozen">Failed · insufficient funds</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="st-card">
      <span class="st-dir st-out">Per-agency accounts</span>
      <h2 style="margin:0 0 6px">Credit accounts</h2>
      <table class="st-table">
        <thead><tr><th>Agency</th><th>Type</th><th>Grant / Deposits</th><th>Limit</th><th>Utilization</th><th>Owed</th><th>Status</th></tr></thead>
        <tbody>${credits}</tbody>
      </table>
      <p class="muted" style="margin-top:8px">Row click opens the agency's Credit tab — the ledger and actions live there.</p>
    </div>`;
};

/* ---------- Travel Agencies (Partners) ---------- */
RENDERERS['agencies'] = () => {
  const rows = AGENCIES.map(a => `
    <tr class="rowlink" onclick="go('agency','${a.id}')">
      <td><strong>${a.name}</strong><span class="fr-license">${a.license}</span></td>
      <td>${a.contact}</td>
      <td><div class="vendor-chips">${a.vendors.map(v => `<span class="vendor-chip ${v.toLowerCase()}">${v}</span>`).join('')}</div></td>
      <td>${badge(a.status)}</td>
      <td>${a.credit ? (a.credit.frozen ? '<span class="st-pill st-frozen">Frozen</span>' : `<span class="st-pill ${a.credit.type === 'DEPOSIT' ? 'st-pending' : 'st-paid'}">${a.credit.type === 'DEPOSIT' ? 'Deposit' : 'Granted'}</span>`) : '<span class="muted">—</span>'}</td>
      <td class="text-right">${kebab('a' + a.id, [
        ['P&L ↗', () => go('agency', a.id + ':pnl')],
        ['Credit ↗', () => go('agency', a.id + ':credit')],
        ['Employees ↗', () => go('agency', a.id + ':employees')]
      ])}</td>
    </tr>`).join('');
  pg('agencies').innerHTML = `
    <div class="page-head row">
      <div><h1>Travel Agencies</h1><p class="muted">Row click opens the one agency page — Details, Employees, P&amp;L and Credit in one place.</p></div>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Agency</th><th>Primary contact</th><th>Vendors</th><th>Status</th><th>Credit</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
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
      <table class="tbl">
        <thead><tr><th>Employee</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>${a.employees.map(e => `
          <tr class="rowlink" onclick="openModal('Employee — ${e[0]}', dl([['Name','${e[0]}'],['Email','${e[1]}'],['Agency','${a.name}'],['Role','${e[2]}'],['Status',badge('${e[3]}')]]), {readOnly:true})">
            <td>${e[0]}</td><td>${e[1]}</td><td>${e[2]}</td><td>${badge(e[3])}</td>
          </tr>`).join('')}</tbody>
      </table>
      <p class="muted" style="margin-top:10px">Was the global “Employment” list of every agency's staff — scoped here to the agency you're looking at.</p>
    </div>`,
  pnl: a => {
    const list = BOOKINGS.filter(b => b.agencyId === a.id && b.status !== 'Cancelled');
    const tSell = list.reduce((s, b) => s + calc(b).sell, 0);
    const tNet = list.reduce((s, b) => s + calc(b).net, 0);
    return `
    <div class="card">
      <div class="card-head"><h3>Bookings &amp; P&amp;L</h3></div>
      <table class="tbl">
        <thead><tr><th>Reference</th><th>Hotel</th><th class="text-right">Ergos sell</th><th class="text-right">Ergos net</th><th>Margin</th></tr></thead>
        <tbody>
          ${list.map(b => { const c = calc(b); return `
            <tr class="rowlink" onclick="go('reservation-detail','${b.ref}')">
              <td class="bb-ref">${b.ref}</td><td>${hotel(b.hotelId).name}</td>
              <td class="text-right">${fmt(c.sell)}</td><td class="text-right">${fmt(c.net)}</td><td>${marginBadge(c.margin)}</td>
            </tr>`; }).join('') || '<tr><td colspan="5" class="tbl-empty-cell">No bookings yet.</td></tr>'}
          ${list.length ? `<tr style="font-weight:700"><td>Total</td><td></td><td class="text-right">${fmt(tSell)}</td><td class="text-right">${fmt(tNet)}</td><td></td></tr>` : ''}
        </tbody>
      </table>
      <p class="muted" style="margin-top:10px">Row click opens the reservation detail — same idiom as everywhere else.</p>
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
      <table class="st-table">
        <thead><tr><th>When</th><th>Type</th><th>Amount</th><th>Reason</th></tr></thead>
        <tbody>${a.ledger.map(l => `<tr><td>${l[0]}</td><td><span class="st-pill ${l[2]}">${l[1]}</span></td><td>${l[3]}</td><td>${l[4]}</td></tr>`).join('')}</tbody>
      </table>
      <p class="muted" style="margin-top:8px">Every number above is derived from these rows — nothing is a bare editable field.</p>
    </div>`;
  }
};
function inviteEmployee(agencyId) {
  const a = agency(agencyId);
  openModal('Invite Employee — ' + a.name,
    `<div class="form-grid">${fld('First name', '')}${fld('Last name', '')}${fld('Email', '', 'email')}
     <div class="form-field"><label>Role</label><select><option>Agent</option><option>Manager</option><option>Supervisor</option></select></div></div>`);
}

/* ---------- Sales Agents (Partners) ---------- */
RENDERERS['agents'] = () => {
  const rows = AGENTS.map((a, i) => `
    <tr class="rowlink" onclick="viewAgent(${i})">
      <td><strong>${a.name}</strong></td><td>${a.email}</td><td>${a.city}</td>
      <td><span class="pill pill-${({Elite:'gold', Growth:'blue', Starter:'grey'})[a.tier]}">${a.tier}</span></td>
      <td class="text-right">${a.earn}%</td><td class="text-right">${a.ops}%</td><td>${badge(a.status)}</td>
    </tr>`).join('');
  pg('agents').innerHTML = `
    <div class="page-head row">
      <div><h1>Sales Agents</h1><p class="muted">Rates are tier-driven and live in the Pricing Policy cascade.</p></div>
      ${xlink('Commissions', 'commissions')}
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th>Agent</th><th>Email</th><th>City</th><th>Tier</th><th class="text-right">Earning</th><th class="text-right">Ops</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
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
