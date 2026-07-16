/* ============================================================
   Ergos Backoffice Prototype — app.js
   Router + mock data + CRUD modals + dashboard charts
   ============================================================ */

/* ---------- seeded PRNG ---------- */
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const rnd = mulberry32(20260407);
const pick = arr => arr[Math.floor(rnd()*arr.length)];
const pad = (n,l=4)=>String(n).padStart(l,'0');

/* ---------- mock data ---------- */
const FIRST=['Alex','Maria','Carlos','Sofia','Daniel','Lucia','Miguel','Ana','Pablo','Elena','Javier','Isabella','Hugo','Carmen','Diego','Laura','Pedro','Sara','Luis','Clara'];
const LAST=['García','Martínez','Rodríguez','López','Pérez','Sánchez','Romero','Torres','Navarro','Ruiz','Flores','Molina','Castro','Ortega','Vega'];
const CITIES=['Barcelona','Madrid','Valencia','Sevilla','Cancun','Playa del Carmen','Punta Cana','Miami','Paris','Lisbon','Rome','Palma'];
const VENDORS=['Hoteltec','Dingus','Restel','Juniper','Roibos'];
const HOTEL_BRANDS=['Meliá','Riu','Iberostar','Barceló','NH','Palladium','Sol','Catalonia','H10','Hyatt'];
const STATUSES=['Confirmed','Pending','Cancelled','Completed'];
const TIERS=['Starter','Growth','Elite','Strategic'];

const person = (i) => {const f=pick(FIRST),l=pick(LAST);return{id:'u'+i,firstName:f,lastName:l,name:f+' '+l,email:(f+'.'+l).toLowerCase().replace(/[^a-z.]/g,'')+'@ergos.com',phone:'+34 6'+Math.floor(10000000+rnd()*89999999)};};

const BO_USERS = Array.from({length:18},(_,i)=>{const p=person(i+1);return{...p,role:pick(['ADMIN','IMPORTERS','USER']),active:rnd()>0.2};});

const ROLES = [
  {id:'r1',name:'Administrator',code:'ADMIN',users:4,desc:'Full platform access'},
  {id:'r2',name:'Travel Agency',code:'TRAVEL_AGENCY',users:126,desc:'Agency owner workspace'},
  {id:'r3',name:'Sales Agent',code:'SALES_AGENT',users:284,desc:'Agent booking & commission view'},
  {id:'r4',name:'Importers',code:'IMPORTERS',users:6,desc:'Data import operators'},
  {id:'r5',name:'User',code:'USER',users:1512,desc:'Read-only end user'}
];

const AGENCIES = Array.from({length:42},(_,i)=>{const p=person(i+100);return{id:'ag'+(i+1),name:['Viajes','Travel','Turismo','Destinos'][i%4]+' '+pick(['Azul','Mediterráneo','Real','Premium','Andalucía','Ibérica']),primaryContact:p.name,secondary:person(i+200).name,email:p.email,license:'LIC-'+Math.floor(10000+rnd()*89999),website:'www.'+['viajes','travel','tur'][i%3]+i+'.com',vendors:VENDORS.filter(()=>rnd()>0.4).slice(0,3),status:pick(['Active','Active','Active','Pending','Suspended'])};});

const EMPLOYEES = Array.from({length:64},(_,i)=>{const p=person(i+400),ag=pick(AGENCIES);return{...p,agency:ag.name,agencyId:ag.id,role:pick(['Manager','Agent','Supervisor']),invited:'2026-0'+(1+Math.floor(rnd()*3))+'-'+pad(1+Math.floor(rnd()*28),2),status:pick(['Accepted','Accepted','Pending','Expired'])};});

const HOTELS = Array.from({length:140},(_,i)=>{const brand=pick(HOTEL_BRANDS),city=pick(CITIES),stars=3+Math.floor(rnd()*3);return{id:'h'+(i+1),code:'HT'+pad(i+1,5),name:brand+' '+city+(rnd()>0.5?' Resort':' Palace'),city,vendor:pick(VENDORS),stars,ergosMarkupPct:(0.10+rnd()*0.08).toFixed(3),priceAdjustment:(0.85+rnd()*0.20).toFixed(3),lastSync:'2026-04-0'+(1+Math.floor(rnd()*6))};});

const RESERVATIONS = Array.from({length:80},(_,i)=>{const h=pick(HOTELS),ag=pick(AGENCIES),g=person(i+700);return{id:'R'+pad(i+1,6),locator:'ERG-'+pad(i+1001,6),guest:g.name,hotel:h.name,agency:ag.name,checkin:'2026-0'+(4+Math.floor(rnd()*3))+'-'+pad(1+Math.floor(rnd()*28),2),nights:1+Math.floor(rnd()*7),total:(200+rnd()*1800).toFixed(2),status:pick(STATUSES)};});

const AGENTS = Array.from({length:54},(_,i)=>{const p=person(i+900),tier=pick(TIERS),ranges={Starter:[0.10,0.14],Growth:[0.15,0.20],Elite:[0.21,0.26],Strategic:[0.27,0.32]}[tier];return{...p,tier,city:pick(CITIES),salesAgentEarningPct:(ranges[0]+rnd()*(ranges[1]-ranges[0])).toFixed(3),ergosOpsExpensePct:({Starter:0.08,Growth:0.07,Elite:0.06,Strategic:0.05})[tier].toFixed(3),oneClickMember:rnd()>0.4,active:rnd()>0.15};});

/* ---------- router ---------- */
// Mirrors the live backoffice sidebar (Mantine app at localhost:3032).
// Sections + labels are kept in sync; stub screens were added in the same
// pass for items that exist in the live nav. Drift policy: when the live
// nav changes, update both NAV_GROUPS here AND the matching screen blocks
// in index.html — clicking a nav item with no #screen-{id} is a silent
// no-op (showScreen() does nothing when getElementById returns null).
const NAV_GROUPS = [
  {title:'', items:[
    {id:'dashboard',icon:'▦',label:'Dashboard'}
  ]},
  {title:'BackOffice Module', items:[
    {id:'backoffice-users',icon:'◉',label:'BackOffice'},
    {id:'roles',icon:'◈',label:'Roles Management'}
  ]},
  {title:'Hotel Module', items:[
    {id:'hotels',icon:'◆',label:'Hotels'},
    {id:'reservations',icon:'▤',label:'Reservations'}
  ]},
  {title:'Finance & Audit', items:[
    {id:'pricing-policy',icon:'⚙',label:'Pricing Policy'},
    {id:'hotel-price-breakdown',icon:'⊟',label:'Hotel Price Composition'},
    {divider:true},
    {id:'hotel-brands',icon:'⌘',label:'Hotel Brands'},
    {id:'booking-breakdown',icon:'⊞',label:'Booking Breakdown'},
    {id:'finance-remittances',icon:'$',label:'Agency Remittances'},
    {id:'audit-log',icon:'⊜',label:'Booking Audit Log'}
  ]},
  {title:'Partners', items:[
    {id:'agencies',icon:'◇',label:'Travel Agencies'},
    {id:'agency-employees',icon:'◎',label:'Employment'},
    {id:'agents',icon:'◊',label:'Sales Agents'},
    {id:'hotel-suppliers',icon:'☷',label:'Hotel Suppliers'}
  ]}
];

function renderSidebars(activeId){
  // Empty title => no group header (live's Dashboard sits ungrouped at top).
  const groupsHTML = NAV_GROUPS.map(g=>`
    ${g.title ? `<div class="nav-group-title">${g.title}</div>` : ''}
    ${g.items.map(n => n.divider
      ? `<div class="nav-divider" role="separator"></div>`
      : n.href
      ? `<a class="nav-link" href="${n.href}" data-label="${n.label}"><span class="nav-icon">${n.icon}</span><span>${n.label}</span><span class="nav-ext">↗</span></a>`
      : `<a class="nav-link ${n.id===activeId?'active':''}" data-label="${n.label}" onclick="showScreen('${n.id}');closeSidebar()"><span class="nav-icon">${n.icon}</span><span>${n.label}</span></a>`
    ).join('')}
  `).join('');
  const html = `
    <div class="sidebar-head">
      <div class="sidebar-logo">E</div>
      <div class="sidebar-brand">Ergos<small>Backoffice</small></div>
      <button class="sidebar-close" onclick="closeSidebar()" aria-label="Close menu">×</button>
    </div>
    <nav class="sidebar-nav">${groupsHTML}</nav>
    <div class="sidebar-user">
      <div class="avatar">AD</div>
      <div class="who">Admin<small>admin@ergos.com</small></div>
    </div>`;
  document.querySelectorAll('.sidebar').forEach(s=>s.innerHTML=html);
}

function toggleSidebar(){document.body.classList.toggle('sidebar-open');}
function closeSidebar(){document.body.classList.remove('sidebar-open');}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = document.getElementById('screen-'+id);
  if(el) el.classList.add('active');
  document.querySelectorAll('.proto-tab').forEach(t=>t.classList.toggle('active',t.dataset.screen===id));
  renderSidebars(id);
  // Auto-collapse parent rail to icons on Pricing Policy; restore everywhere else
  document.body.classList.toggle('cp-mode', id==='pricing-policy');
  // Honor per-route pinned preference
  const pinned = id==='pricing-policy' && localStorage.getItem('cp-rail-pinned')==='1';
  document.body.classList.toggle('rail-pinned', pinned);
  window.scrollTo(0,0);
  const r = RENDERERS[id]; if(r) r();
}

function toggleRailPin(){
  const pinned = !document.body.classList.contains('rail-pinned');
  document.body.classList.toggle('rail-pinned', pinned);
  localStorage.setItem('cp-rail-pinned', pinned ? '1' : '0');
}

/* ---------- table helpers ---------- */
function pill(txt,variant){return `<span class="pill pill-${variant}">${txt}</span>`;}
const statusPill = s=>({Active:'green',Confirmed:'green',Accepted:'green',Completed:'blue',Pending:'gold',Expired:'grey',Suspended:'red',Cancelled:'red'}[s]||'grey');
function tierPill(t){return pill(t,{Starter:'grey',Growth:'blue',Elite:'gold',Strategic:'purple'}[t]);}
function vendorChips(vs){return `<div class="vendor-chips">${vs.map(v=>`<span class="vendor-chip ${v.toLowerCase()}">${v}</span>`).join('')}</div>`;}
function sw(checked, bind){return `<label class="switch"><input type="checkbox" ${checked?'checked':''} ${bind?`data-toggle="${bind}"`:''}><span class="switch-slider"></span></label>`;}

/* Persistent row toggles: data-toggle="collection:id:field" */
const TOGGLE_COLLECTIONS = {bo:BO_USERS, ag:AGENTS, agency:AGENCIES, emp:EMPLOYEES};
document.addEventListener('change', e => {
  const el = e.target.closest('input[type="checkbox"][data-toggle]');
  if(!el) return;
  const [coll, id, field] = el.dataset.toggle.split(':');
  const arr = TOGGLE_COLLECTIONS[coll]; if(!arr) return;
  const ent = arr.find(x=>x.id===id); if(!ent) return;
  ent[field] = el.checked;
  toast(`${field.replace(/([A-Z])/g,' $1').toLowerCase()}: ${el.checked?'on':'off'}`);
});

function renderTable(id, cols, rows){
  const el = document.getElementById(id); if(!el) return;
  el.innerHTML = `<thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c.fmt?c.fmt(r):r[c.key]??''}</td>`).join('')}</tr>`).join('')}</tbody>`;
  wireFilters(id);
}

/* Unified filter: matches rows against search + every dropdown in the same
   .table-toolbar. Dropdown values starting with "All " are ignored. */
function wireFilters(tableId){
  const tbl = document.getElementById(tableId); if(!tbl) return;
  const toolbar = tbl.closest('.card')?.querySelector('.table-toolbar'); if(!toolbar) return;
  const run = () => applyFilters(tableId, toolbar);
  toolbar.querySelectorAll('.t-search').forEach(i=>{i.oninput = run;});
  toolbar.querySelectorAll('.t-filters select').forEach(s=>{s.onchange = run;});
  run();
}

function norm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}

function applyFilters(tableId, toolbar){
  const tb = document.querySelector('#'+tableId+' tbody'); if(!tb) return;
  const search = norm(toolbar.querySelector('.t-search')?.value||'');
  const filters = [...toolbar.querySelectorAll('.t-filters select')]
    .map(s=>norm(s.value))
    .filter(v => v && !v.startsWith('all '));
  let visible=0;
  Array.from(tb.rows).forEach(r=>{
    const txt = norm(r.innerText);
    const hitSearch = !search || txt.includes(search);
    const hitFilters = filters.every(f => txt.includes(f));
    const show = hitSearch && hitFilters;
    r.style.display = show ? '' : 'none';
    if(show) visible++;
  });
  // empty state row
  let empty = tb.querySelector('.tbl-empty');
  if(visible===0){
    if(!empty){
      const tr = document.createElement('tr');
      tr.className='tbl-empty';
      tr.innerHTML = `<td colspan="99" class="tbl-empty-cell">No results match these filters.</td>`;
      tb.appendChild(tr);
    }
  } else if(empty){ empty.remove(); }
}

// Back-compat for any inline oninput handlers still passing the query
function filterTable(id){
  const tbl = document.getElementById(id);
  const toolbar = tbl?.closest('.card')?.querySelector('.table-toolbar');
  if(toolbar) applyFilters(id, toolbar);
}

/* ---------- screen renderers ---------- */
const RENDERERS = {};

// Dashboard mock state — kept module-level so sort/filter callbacks
// don't have to round-trip through DOM. Mirrors AnalyticsData shape from
// backoffice-app/src/network/analytics.ts.
window.DASH_STATE = {
  totalReservations: 8412,
  totalUsers: 1934,
  totalSalesAgents: 312,
  totalTravelAgencies: 0, // set after AGENCIES loaded
  totalBookingAmount: 1240000,
  reservationsByStatus: { confirmed: 4120, pending: 1860, cancelled: 680, completed: 1752 },
  monthlyTrend: [
    { month: 'Dec 25', count: 1040, revenue: 142000 },
    { month: 'Jan 26', count: 1180, revenue: 168000 },
    { month: 'Feb 26', count: 1260, revenue: 184000 },
    { month: 'Mar 26', count: 1420, revenue: 212000 },
    { month: 'Apr 26', count: 1530, revenue: 228000 },
    { month: 'May 26', count: 1612, revenue: 244000 },
  ],
  recentBookings: [], // populated from RESERVATIONS
  sortKey: 'createdAt',
  sortDir: 'desc',
  filtersOpen: false,
};

const DASH_STATUS_COLORS = {
  Confirmed: '#1b8a42',
  Pending: '#c4962c',
  Cancelled: '#d32f2f',
  Completed: '#1565c0',
};

function dashGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Admin';
  if (h < 18) return 'Good afternoon, Admin';
  return 'Good evening, Admin';
}

function dashFormatCurrency(n) {
  return 'USD ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function dashFormatCurrencyShort(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k';
  return '$' + n;
}

function dashStatusBadge(status) {
  const map = { Confirmed: 'green', Pending: 'gold', Cancelled: 'red', Completed: 'blue' };
  return `<span class="pill pill-${map[status] || 'gray'}">${status}</span>`;
}

function dashToggleFilters() {
  const panel = document.getElementById('dash-filter-panel');
  if (!panel) return;
  window.DASH_STATE.filtersOpen = !panel.classList.contains('open');
  panel.classList.toggle('open');
}

function dashRefresh() {
  protoToast && protoToast('Refreshing analytics…');
  setTimeout(() => RENDERERS['dashboard'](), 350);
}

function dashSortBy(th, key, type) {
  const cur = th.getAttribute('data-sort-active');
  const dir = cur === 'asc' ? 'desc' : 'asc';
  document.querySelectorAll('#tbl-recent th[data-sort-active]').forEach(o => o.removeAttribute('data-sort-active'));
  th.setAttribute('data-sort-active', dir);
  window.DASH_STATE.sortKey = key;
  window.DASH_STATE.sortDir = dir;
  dashRenderRecentTable();
}

function dashRenderRecentTable() {
  const { recentBookings, sortKey, sortDir } = window.DASH_STATE;
  const rows = [...recentBookings].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'totalAmount') { av = +av; bv = +bv; }
    if (sortKey === 'createdAt') { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  const tbl = document.getElementById('tbl-recent');
  if (!tbl) return;
  tbl.innerHTML = `
    <thead>
      <tr>
        <th data-sort-key="bookingId" onclick="dashSortBy(this,'bookingId','str')">Booking ID</th>
        <th data-sort-key="agencyName" onclick="dashSortBy(this,'agencyName','str')">Agency</th>
        <th data-sort-key="totalAmount" onclick="dashSortBy(this,'totalAmount','num')">Amount</th>
        <th data-sort-key="status" onclick="dashSortBy(this,'status','str')">Status</th>
        <th data-sort-key="createdAt" onclick="dashSortBy(this,'createdAt','date')" data-sort-active="${sortDir}">Date</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr onclick="showScreen('reservations')">
          <td><span class="booking-id">${r.bookingId.slice(-8)}</span></td>
          <td>${r.agencyName}</td>
          <td><strong>${dashFormatCurrency(r.totalAmount)}</strong></td>
          <td>${dashStatusBadge(r.status)}</td>
          <td class="muted">${new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

function dashRenderStatusBar() {
  const { reservationsByStatus, totalReservations } = window.DASH_STATE;
  const bar = document.getElementById('dash-status-bar');
  if (!bar) return;
  const items = Object.entries(reservationsByStatus).map(([status, count]) => {
    const name = status.charAt(0).toUpperCase() + status.slice(1);
    const pct = ((count / (totalReservations || 1)) * 100).toFixed(0);
    return `
      <div class="dash-status-item">
        <div class="dash-status-dot" style="background:${DASH_STATUS_COLORS[name] || '#888'}"></div>
        <span class="dash-status-count">${count}</span>
        <span class="dash-status-name">${name} (${pct}%)</span>
      </div>
    `;
  }).join('');
  bar.innerHTML = `<span class="dash-status-bar-label">Status breakdown</span>${items}`;
}

RENDERERS['dashboard'] = () => {
  const s = window.DASH_STATE;
  s.totalTravelAgencies = AGENCIES.length;
  s.recentBookings = RESERVATIONS.slice(0, 8).map((r, i) => ({
    id: r.id || 'b' + i,
    bookingId: r.locator || `BK-${100000 + i}`,
    agencyName: r.agencyName || (AGENCIES[i % AGENCIES.length]?.agencyName) || 'Demo Agency',
    totalAmount: +r.total || (1200 + i * 145),
    status: r.status || 'Confirmed',
    createdAt: r.createdAt || new Date(Date.now() - i * 86400000 * 2).toISOString(),
  }));

  // Header
  const greet = document.getElementById('dash-greeting');
  if (greet) greet.textContent = dashGreeting();

  // KPI values
  document.getElementById('kpi-res').textContent = s.totalReservations.toLocaleString();
  const pendingEl = document.getElementById('kpi-res-pending');
  if (pendingEl) pendingEl.textContent = s.reservationsByStatus.pending.toLocaleString();
  document.getElementById('kpi-users').textContent = s.totalUsers.toLocaleString();
  const agentsEl = document.getElementById('kpi-agents-count');
  if (agentsEl) agentsEl.textContent = s.totalSalesAgents.toLocaleString();
  document.getElementById('kpi-ag').textContent = s.totalTravelAgencies;
  document.getElementById('kpi-rev').textContent = dashFormatCurrencyShort(s.totalBookingAmount);

  // Status breakdown bar
  dashRenderStatusBar();

  // Recent bookings table (sortable)
  dashRenderRecentTable();

  // Charts
  if (window._chStatus) window._chStatus.destroy();
  if (window._chTrend) window._chTrend.destroy();

  const c1 = document.getElementById('chart-status');
  if (c1) {
    const labels = Object.keys(s.reservationsByStatus).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const data = Object.values(s.reservationsByStatus);
    const ctx = c1.getContext('2d');
    const gradients = labels.map(name => {
      const grad = ctx.createLinearGradient(0, 0, 0, 280);
      const color = DASH_STATUS_COLORS[name] || '#888';
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '99');
      return grad;
    });
    window._chStatus = new Chart(c1, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: gradients, borderRadius: 8, barThickness: 48 }] },
      options: {
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => {
            const pct = ((ctx.parsed.y / (s.totalReservations || 1)) * 100).toFixed(1);
            return `${ctx.parsed.y} (${pct}%)`;
          } }
        } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        },
      },
    });
  }

  const c2 = document.getElementById('chart-trend');
  if (c2) {
    const ctx2 = c2.getContext('2d');
    const bookingGrad = ctx2.createLinearGradient(0, 0, 0, 280);
    bookingGrad.addColorStop(0, 'rgba(13,148,136,0.25)');
    bookingGrad.addColorStop(1, 'rgba(13,148,136,0)');
    const revenueGrad = ctx2.createLinearGradient(0, 0, 0, 280);
    revenueGrad.addColorStop(0, 'rgba(34,197,94,0.25)');
    revenueGrad.addColorStop(1, 'rgba(34,197,94,0)');
    window._chTrend = new Chart(c2, {
      type: 'line',
      data: {
        labels: s.monthlyTrend.map(m => m.month),
        datasets: [
          {
            label: 'Bookings',
            data: s.monthlyTrend.map(m => m.count),
            borderColor: '#0d9488',
            backgroundColor: bookingGrad,
            fill: true,
            tension: 0.35,
            yAxisID: 'y',
            pointRadius: 4,
            pointBackgroundColor: '#0d9488',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Revenue',
            data: s.monthlyTrend.map(m => m.revenue),
            borderColor: '#22c55e',
            backgroundColor: revenueGrad,
            fill: true,
            tension: 0.35,
            yAxisID: 'y1',
            pointRadius: 4,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: ctx => ctx.dataset.label === 'Revenue'
                ? `Revenue: ${dashFormatCurrency(ctx.parsed.y)}`
                : `Bookings: ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          y: { type: 'linear', position: 'left', grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 11 } } },
          y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11 }, callback: v => dashFormatCurrencyShort(v) } },
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        },
      },
    });
  }
};

RENDERERS['backoffice-users'] = () => {
  renderTable('tbl-bo-users',[
    {key:'firstName',label:'First name'},
    {key:'lastName',label:'Last name'},
    {key:'email',label:'Email'},
    {key:'phone',label:'Phone'},
    {label:'Role',fmt:r=>pill(r.role,'blue')},
    {label:'Active',fmt:r=>sw(r.active,`bo:${r.id}:active`)},
    {label:'',fmt:r=>`<button class="btn btn-sm" onclick="viewUser('${r.id}')">View</button> <button class="btn btn-sm" onclick="openUserModal('${r.id}')">Edit</button>`}
  ], BO_USERS);
};

RENDERERS['roles'] = () => {
  renderTable('tbl-roles',[
    {key:'name',label:'Name'},
    {label:'Code',fmt:r=>`<code class="code-chip">${r.code}</code>`},
    {key:'desc',label:'Description'},
    {key:'users',label:'Users'},
    {label:'',fmt:r=>`<button class="btn btn-sm" onclick="openRoleModal('${r.id}')">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteRole('${r.id}')">Delete</button>`}
  ], ROLES);
};

RENDERERS['agencies'] = () => {
  renderTable('tbl-agencies',[
    {key:'name',label:'Agency'},
    {key:'primaryContact',label:'Primary contact'},
    {key:'license',label:'License'},
    {label:'Website',fmt:r=>`<a class="lnk" href="#">${r.website}</a>`},
    {label:'Vendors',fmt:r=>vendorChips(r.vendors)},
    {label:'Status',fmt:r=>pill(r.status,statusPill(r.status))},
    {label:'',fmt:r=>`<button class="btn btn-sm" onclick="viewAgency('${r.id}')">View</button> <button class="btn btn-sm" onclick="openAgencyModal('${r.id}')">Edit</button>`}
  ], AGENCIES);
};

RENDERERS['agency-employees'] = () => {
  const sel = document.getElementById('sel-agency-filter');
  if(sel && sel.options.length<=1) AGENCIES.forEach(a=>{const o=document.createElement('option');o.value=a.name;o.textContent=a.name;sel.appendChild(o);});
  renderTable('tbl-employees',[
    {key:'name',label:'Employee'},
    {key:'email',label:'Email'},
    {key:'agency',label:'Agency'},
    {key:'role',label:'Role'},
    {key:'invited',label:'Invited'},
    {label:'Status',fmt:r=>pill(r.status,statusPill(r.status))},
    {label:'',fmt:r=>`<button class="btn btn-sm" onclick="viewEmployee('${r.id}')">View</button> <button class="btn btn-sm" onclick="openEmployeeModal('${r.id}')">Edit</button>`}
  ], EMPLOYEES);
};

RENDERERS['hotels'] = () => {
  document.getElementById('hotel-count').textContent = HOTELS.length.toLocaleString();
  renderTable('tbl-hotels',[
    {key:'code',label:'Code'},
    {key:'name',label:'Hotel'},
    {key:'city',label:'City'},
    {label:'★',fmt:r=>'★'.repeat(r.stars)},
    {label:'Vendor',fmt:r=>`<span class="vendor-chip ${r.vendor.toLowerCase()}">${r.vendor}</span>`},
    {label:'Base comm.',fmt:r=>(r.ergosMarkupPct*100).toFixed(1)+'%'},
    {label:'Price adj.',fmt:r=>{const d=((r.priceAdjustment-1)*100);return (d>=0?'+':'')+d.toFixed(1)+'%';}},
    {key:'lastSync',label:'Last sync'},
    {label:'',fmt:r=>`<button class="btn btn-sm" onclick="viewHotel('${r.id}')">View</button> <button class="btn btn-sm" onclick="openHotelModal('${r.id}')">Edit</button> <button class="btn btn-sm btn-outline" onclick="syncHotel('${r.id}')">⟳ Sync</button>`}
  ], HOTELS.slice(0,50));
};

RENDERERS['reservations'] = () => {
  renderTable('tbl-reservations',[
    {key:'locator',label:'Locator'},
    {key:'guest',label:'Guest'},
    {key:'hotel',label:'Hotel'},
    {key:'agency',label:'Agency'},
    {key:'checkin',label:'Check-in'},
    {key:'nights',label:'Nights'},
    {label:'Total',fmt:r=>'$'+r.total},
    {label:'Status',fmt:r=>pill(r.status,statusPill(r.status))},
    {label:'',fmt:r=>`<button class="btn btn-sm" onclick="viewReservation('${r.id}')">View</button>`}
  ], RESERVATIONS);
};

RENDERERS['agents'] = () => {
  renderTable('tbl-agents',[
    {key:'name',label:'Agent'},
    {key:'email',label:'Email'},
    {key:'city',label:'City'},
    {label:'Tier',fmt:r=>tierPill(r.tier)},
    {label:'Earning %',fmt:r=>(r.salesAgentEarningPct*100).toFixed(1)+'%'},
    {label:'Ops %',fmt:r=>(r.ergosOpsExpensePct*100).toFixed(1)+'%'},
    {label:'1-Click',fmt:r=>sw(r.oneClickMember,`ag:${r.id}:oneClickMember`)},
    {label:'Active',fmt:r=>sw(r.active,`ag:${r.id}:active`)},
    {label:'',fmt:r=>`<button class="btn btn-sm" onclick="viewAgent('${r.id}')">View</button> <button class="btn btn-sm" onclick="openAgentModal('${r.id}')">Edit</button>`}
  ], AGENTS);
};


/* ---------- modals ---------- */
function openModal(title, bodyHTML, opts={}){
  const host = document.getElementById('modal-host');
  const size = opts.size || '';
  const footer = opts.readOnly
    ? `<button class="btn btn-primary" onclick="closeModal()">Close</button>`
    : `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="modal-save">Save changes</button>`;
  host.innerHTML = `
    <div class="modal-backdrop show" onclick="if(event.target===this)closeModal()">
      <div class="modal ${size}">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="modal-close" onclick="closeModal()" aria-label="Close">×</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="modal-foot">${footer}</div>
      </div>
    </div>`;
  const save = document.getElementById('modal-save');
  if(save) save.onclick = ()=>{closeModal();toast('Changes saved');if(opts.onSave)opts.onSave();};
  document.addEventListener('keydown', escClose);
}
function escClose(e){if(e.key==='Escape')closeModal();}
function closeModal(){document.getElementById('modal-host').innerHTML='';document.removeEventListener('keydown',escClose);}

const fld = (label,value,type='text',bind) => `<div class="form-field"><label>${label}</label><input type="${type}" value="${value??''}" ${bind?`data-bind="${bind}"`:''}></div>`;
const sel = (label,value,opts,bind) => `<div class="form-field"><label>${label}</label><select ${bind?`data-bind="${bind}"`:''}>${opts.map(o=>`<option ${o===value?'selected':''}>${o}</option>`).join('')}</select></div>`;

/* Read all data-bind inputs in the open modal back into a plain object */
function collect(){
  const out = {};
  document.querySelectorAll('#modal-host [data-bind]').forEach(el=>{
    const k = el.dataset.bind;
    if(el.type==='checkbox') out[k] = el.checked;
    else if(el.type==='number') out[k] = +el.value;
    else out[k] = el.value;
  });
  return out;
}
function applyEdit(entity, patch){
  Object.assign(entity, patch);
  if(entity.firstName!==undefined && entity.lastName!==undefined) entity.name = (entity.firstName+' '+entity.lastName).trim();
}

function openUserModal(id){
  const u = id ? BO_USERS.find(x=>x.id===id) : null;
  const m = u || {active:true};
  openModal(id?'Edit User — '+u.name:'Add User',
    `<div class="form-grid">
       ${fld('First name',m.firstName,'text','firstName')}
       ${fld('Last name',m.lastName,'text','lastName')}
       ${fld('Email',m.email,'email','email')}
       ${fld('Phone',m.phone,'text','phone')}
       ${sel('Role',m.role||'USER',['ADMIN','IMPORTERS','USER'],'role')}
       <div class="form-field"><label>Active</label><label class="switch"><input type="checkbox" ${m.active!==false?'checked':''} data-bind="active"><span class="switch-slider"></span></label></div>
     </div>`,
    {onSave:()=>{
      const v = collect();
      if(u){ applyEdit(u, v); } else { const id2='u'+(BO_USERS.length+1); BO_USERS.push({id:id2,...v,name:(v.firstName+' '+v.lastName).trim()}); }
      RENDERERS['backoffice-users']();
    }});
}
function openRoleModal(id){
  const r = id ? ROLES.find(x=>x.id===id) : null;
  const m = r || {};
  openModal(id?'Edit Role — '+r.name:'Add Role',
    `<div class="form-grid">${fld('Name',m.name,'text','name')}${fld('Code',m.code,'text','code')}${fld('Description',m.desc,'text','desc')}</div>`,
    {onSave:()=>{
      const v = collect();
      if(r){ Object.assign(r, v); } else { ROLES.push({id:'r'+(ROLES.length+1),users:0,...v}); }
      RENDERERS['roles']();
    }});
}
function deleteRole(id){
  const r = ROLES.find(x=>x.id===id); if(!r) return;
  if(!confirm(`Delete role "${r.name}"? This cannot be undone.`)) return;
  ROLES.splice(ROLES.indexOf(r),1);
  RENDERERS['roles'](); toast('Role deleted');
}

function openAgencyModal(id){
  const a = id ? AGENCIES.find(x=>x.id===id) : null;
  const m = a || {vendors:[],status:'Pending'};
  const has = v => m.vendors && m.vendors.includes(v);
  openModal(id?'Edit Agency — '+a.name:'Invite Agency',
    `<div class="form-grid">
       ${fld('Agency name',m.name,'text','name')}
       ${fld('Primary contact',m.primaryContact,'text','primaryContact')}
       ${fld('Secondary contact',m.secondary,'text','secondary')}
       ${fld('Email',m.email,'email','email')}
       ${fld('License',m.license,'text','license')}
       ${fld('Website',m.website,'text','website')}
       <div class="form-field" style="grid-column:1/-1"><label>Vendor access</label><div class="chk-row">${VENDORS.map(v=>`<label class="chk"><input type="checkbox" ${has(v)?'checked':''} data-vendor="${v}"> ${v}</label>`).join('')}</div></div>
       ${sel('Status',m.status||'Pending',['Active','Pending','Suspended'],'status')}
     </div>`,
    {onSave:()=>{
      const v = collect();
      v.vendors = [...document.querySelectorAll('#modal-host [data-vendor]')].filter(c=>c.checked).map(c=>c.dataset.vendor);
      if(a){ Object.assign(a, v); } else { AGENCIES.push({id:'ag'+(AGENCIES.length+1),...v}); }
      RENDERERS['agencies']();
    }});
}

function openEmployeeModal(id){
  const e = id ? EMPLOYEES.find(x=>x.id===id) : null;
  const m = e || {status:'Pending'};
  openModal(id?'Edit Employee — '+e.name:'Invite Employee',
    `<div class="form-grid">
       ${fld('First name',m.firstName,'text','firstName')}${fld('Last name',m.lastName,'text','lastName')}
       ${fld('Email',m.email,'email','email')}${fld('Phone',m.phone,'text','phone')}
       <div class="form-field"><label>Agency</label><select data-bind="agency">${AGENCIES.map(a=>`<option ${a.name===m.agency?'selected':''}>${a.name}</option>`).join('')}</select></div>
       ${sel('Role',m.role||'Agent',['Agent','Manager','Supervisor'],'role')}
       ${sel('Status',m.status||'Pending',['Accepted','Pending','Expired'],'status')}
     </div>`,
    {onSave:()=>{
      const v = collect();
      if(e){ applyEdit(e, v); const ag = AGENCIES.find(x=>x.name===v.agency); if(ag) e.agencyId = ag.id; }
      else { const ag = AGENCIES.find(x=>x.name===v.agency); EMPLOYEES.push({id:'emp'+(EMPLOYEES.length+1),...v,name:(v.firstName+' '+v.lastName).trim(),agencyId:ag?.id,invited:'2026-04-07'}); }
      RENDERERS['agency-employees']();
    }});
}

function openHotelModal(id){
  const h = id ? HOTELS.find(x=>x.id===id) : null;
  const m = h || {stars:4,vendor:'Hoteltec'};
  const adj = m.priceAdjustment ? (((+m.priceAdjustment)-1)*100).toFixed(1) : '0';
  const base = m.ergosMarkupPct ? (((+m.ergosMarkupPct))*100).toFixed(1) : '13';
  openModal(id?'Edit Hotel — '+h.name:'Add Hotel',
    `<div class="form-grid">
       ${fld('Code',m.code,'text','code')}${fld('Name',m.name,'text','name')}
       ${fld('City',m.city,'text','city')}
       <div class="form-field"><label>Vendor</label><select data-bind="vendor">${VENDORS.map(v=>`<option ${v===m.vendor?'selected':''}>${v}</option>`).join('')}</select></div>
       <div class="form-field"><label>Stars</label><select data-bind="stars">${[5,4,3,2,1].map(s=>`<option ${s===m.stars?'selected':''}>${s}</option>`).join('')}</select></div>
       ${fld('Base commission (%)',base,'number','ergosMarkupPct')}
       ${fld('Price adjustment (%)',adj,'number','priceAdjustmentPct')}
       ${fld('Last sync',m.lastSync,'text','lastSync')}
     </div>
     <div class="modal-note">Edit updates the override layer. Vendor master data resyncs with <strong>⟳ Sync</strong>.</div>`,
    {onSave:()=>{
      const v = collect();
      v.stars = +v.stars;
      v.ergosMarkupPct = (v.ergosMarkupPct/100).toFixed(3);
      v.priceAdjustment = (1 + v.priceAdjustmentPct/100).toFixed(3);
      delete v.ergosMarkupPct; delete v.priceAdjustmentPct;
      if(h){ Object.assign(h, v); } else { HOTELS.unshift({id:'h'+(HOTELS.length+1),...v}); }
      RENDERERS['hotels']();
    }});
}

function openAgentModal(id){
  const a = id ? AGENTS.find(x=>x.id===id) : null;
  const m = a || {tier:'Starter',active:true};
  const earn = m.salesAgentEarningPct ? ((+m.salesAgentEarningPct)*100).toFixed(1) : '—';
  const ops = m.ergosOpsExpensePct ? ((+m.ergosOpsExpensePct)*100).toFixed(1) : '—';
  openModal(id?'Edit Sales Agent — '+a.name:'Add Sales Agent',
    `<div class="form-grid">
       ${fld('First name',m.firstName,'text','firstName')}${fld('Last name',m.lastName,'text','lastName')}
       ${fld('Email',m.email,'email','email')}${fld('Phone',m.phone,'text','phone')}
       ${fld('City',m.city,'text','city')}
       <div class="form-field"><label>Tier assignment</label><select data-bind="tier">${TIERS.map(t=>`<option ${t===m.tier?'selected':''}>${t}</option>`).join('')}</select></div>
       <div class="form-field"><label>1-Click Member</label><label class="switch"><input type="checkbox" ${m.oneClickMember?'checked':''} data-bind="oneClickMember"><span class="switch-slider"></span></label></div>
       <div class="form-field"><label>Active</label><label class="switch"><input type="checkbox" ${m.active!==false?'checked':''} data-bind="active"><span class="switch-slider"></span></label></div>
     </div>
     <div class="modal-note">
       <strong>Effective rate:</strong> ${earn}% earning · ${ops}% ops <span class="muted">(inherited from ${m.tier||'tier'})</span><br>
       Commission percentages are managed in <a class="lnk" href="commission-config.html">Pricing Policy →</a> as a layered policy (Tier default + optional per-hotel override). Editing rates here is intentionally disabled to maintain a single source of truth.
     </div>`,
    {onSave:()=>{
      const v = collect();
      if(a){
        const tierChanged = v.tier !== a.tier;
        applyEdit(a, v);
        if(tierChanged){
          const ranges = {Starter:[0.10,0.14],Growth:[0.15,0.20],Elite:[0.21,0.26],Strategic:[0.27,0.32]}[v.tier];
          a.salesAgentEarningPct = ((ranges[0]+ranges[1])/2).toFixed(3);
          a.ergosOpsExpensePct = ({Starter:0.08,Growth:0.07,Elite:0.06,Strategic:0.05})[v.tier].toFixed(3);
        }
      } else {
        const ranges = {Starter:[0.10,0.14],Growth:[0.15,0.20],Elite:[0.21,0.26],Strategic:[0.27,0.32]}[v.tier];
        AGENTS.push({id:'a'+(AGENTS.length+1),...v,name:(v.firstName+' '+v.lastName).trim(),
          salesAgentEarningPct:((ranges[0]+ranges[1])/2).toFixed(3),
          ergosOpsExpensePct:({Starter:0.08,Growth:0.07,Elite:0.06,Strategic:0.05})[v.tier].toFixed(3)});
      }
      RENDERERS['agents']();
    }});
}

/* ---------- VIEW (read-only detail) modals ---------- */
const dl = rows => `<dl class="kv">${rows.map(([k,v])=>`<dt>${k}</dt><dd>${v??'—'}</dd>`).join('')}</dl>`;

function viewUser(id){
  const u = BO_USERS.find(x=>x.id===id); if(!u) return;
  openModal('User — '+u.name,
    dl([['First name',u.firstName],['Last name',u.lastName],['Email',u.email],['Phone',u.phone],['Role',pill(u.role,'blue')],['Status',u.active?pill('Active','green'):pill('Inactive','grey')]]),
    {readOnly:true});
}

function viewAgency(id){
  const a = AGENCIES.find(x=>x.id===id); if(!a) return;
  const employees = EMPLOYEES.filter(e=>e.agencyId===a.id);
  openModal('Agency — '+a.name,
    dl([
      ['Name',a.name],['Status',pill(a.status,statusPill(a.status))],
      ['Primary contact',a.primaryContact],['Secondary contact',a.secondary],
      ['Email',a.email],['License',a.license],['Website',`<a class="lnk">${a.website}</a>`],
      ['Vendor access',vendorChips(a.vendors)],
      ['Employees',employees.length+' seats']
    ]) + `<div class="modal-note">Click <strong>Edit</strong> on the Agencies page to change vendor access or status.</div>`,
    {readOnly:true, size:'lg'});
}

function viewEmployee(id){
  const e = EMPLOYEES.find(x=>x.id===id); if(!e) return;
  openModal('Employee — '+e.name,
    dl([['First name',e.firstName],['Last name',e.lastName],['Email',e.email],['Phone',e.phone],['Agency',e.agency],['Role',e.role],['Invited',e.invited],['Status',pill(e.status,statusPill(e.status))]]),
    {readOnly:true});
}

function viewHotel(id){
  const h = HOTELS.find(x=>x.id===id); if(!h) return;
  const adj = (((+h.priceAdjustment)-1)*100).toFixed(1);
  openModal('Hotel — '+h.name,
    dl([
      ['Code',`<code class="code-chip">${h.code}</code>`],
      ['Name',h.name],['City',h.city],['Stars','★'.repeat(h.stars)],
      ['Vendor',`<span class="vendor-chip ${h.vendor.toLowerCase()}">${h.vendor}</span>`],
      ['Base commission',((+h.ergosMarkupPct)*100).toFixed(2)+'%'],
      ['Price adjustment',(adj>=0?'+':'')+adj+'%'],
      ['Last sync',h.lastSync]
    ]) + `<div class="modal-note">Use <strong>⟳ Sync</strong> to pull fresh rates from ${h.vendor}. Overrides are preserved.</div>`,
    {readOnly:true, size:'lg'});
}

function viewReservation(id){
  const r = RESERVATIONS.find(x=>x.id===id); if(!r) return;
  openModal('Reservation — '+r.locator,
    dl([
      ['Locator',`<code class="code-chip">${r.locator}</code>`],
      ['Guest',r.guest],['Hotel',r.hotel],['Agency',r.agency],
      ['Check-in',r.checkin],['Nights',r.nights],
      ['Total','$'+r.total],
      ['Status',pill(r.status,statusPill(r.status))]
    ]),
    {readOnly:true, size:'lg'});
}

function viewAgent(id){ openAgentDrawer(id, 'profile'); }

/* ---------- Agent Detail drawer (Profile / Compensation / Earnings) ---------- */
function openAgentDrawer(id, tab){
  const a = AGENTS.find(x=>x.id===id); if(!a) return;
  tab = tab || 'profile';
  const host = document.getElementById('modal-host');

  const profileHTML = dl([
    ['Name',a.name],['Email',a.email],['Phone',a.phone],['City',a.city],
    ['Tier',tierPill(a.tier)],
    ['1-Click Member',a.oneClickMember?pill('Yes','teal'):pill('No','grey')],
    ['Status',a.active?pill('Active','green'):pill('Inactive','grey')]
  ]);

  const compHTML = `
    <div class="comp-summary">
      <div class="comp-card">
        <div class="comp-label">Effective earning rate</div>
        <div class="comp-value">${((+a.salesAgentEarningPct)*100).toFixed(2)}<span>%</span></div>
        <div class="comp-source">Inherited from <strong>${a.tier}</strong> tier default</div>
      </div>
      <div class="comp-card">
        <div class="comp-label">Ops expense allocation</div>
        <div class="comp-value">${((+a.ergosOpsExpensePct)*100).toFixed(2)}<span>%</span></div>
        <div class="comp-source">Tier-driven (${a.tier})</div>
      </div>
    </div>
    <div class="comp-layers">
      <div class="comp-layer-title">How this rate is computed</div>
      <ol class="comp-layer-list">
        <li><span class="lyr-name">Global default</span><span class="lyr-val">— inherited</span></li>
        <li><span class="lyr-name">Hotel layer</span><span class="lyr-val">— per hotel</span></li>
        <li><span class="lyr-name">Agency layer</span><span class="lyr-val">— per booking</span></li>
        <li class="active"><span class="lyr-name">Agent Tier (${a.tier})</span><span class="lyr-val">${((+a.salesAgentEarningPct)*100).toFixed(2)}% ★</span></li>
        <li><span class="lyr-name">Agent-Hotel override</span><span class="lyr-val">none</span></li>
      </ol>
    </div>
    <div class="modal-note">
      Commission rates are managed centrally in <a class="lnk" href="commission-config.html?agent=${a.id}">Pricing Policy →</a>.
      To override this agent's rate at a specific hotel, open the policy editor and create an Agent-Hotel override.
    </div>`;

  // Mock 6-month earnings
  const months = ['Nov','Dec','Jan','Feb','Mar','Apr'];
  const earningsRows = months.map((m,i)=>{
    const bookings = 8+Math.floor(rnd()*22);
    const gross = (bookings*(800+rnd()*1500));
    const earned = gross*(+a.salesAgentEarningPct);
    return {m,bookings,gross:gross.toFixed(0),earned:earned.toFixed(0)};
  });
  const totalEarned = earningsRows.reduce((s,r)=>s+(+r.earned),0).toFixed(0);
  const earningsHTML = `
    <div class="kpi-grid" style="margin-bottom:18px">
      <div class="kpi kpi-navy"><div class="kpi-label">Total earned (6mo)</div><div class="kpi-value">$${(+totalEarned).toLocaleString()}</div></div>
      <div class="kpi kpi-gold"><div class="kpi-label">Bookings</div><div class="kpi-value">${earningsRows.reduce((s,r)=>s+r.bookings,0)}</div></div>
      <div class="kpi kpi-green"><div class="kpi-label">Avg / booking</div><div class="kpi-value">$${Math.round(totalEarned/earningsRows.reduce((s,r)=>s+r.bookings,0))}</div></div>
    </div>
    <table class="tbl">
      <thead><tr><th>Month</th><th>Bookings</th><th>Gross sold</th><th>Agent earned</th></tr></thead>
      <tbody>${earningsRows.map(r=>`<tr><td>${r.m}</td><td>${r.bookings}</td><td>$${(+r.gross).toLocaleString()}</td><td><strong>$${(+r.earned).toLocaleString()}</strong></td></tr>`).join('')}</tbody>
    </table>
    <div class="modal-note">Earnings are computed by the Pricing Policy engine for every booking this agent closed. Click any number for a layer breakdown (coming soon).</div>`;

  const tabBody = {profile:profileHTML, compensation:compHTML, earnings:earningsHTML}[tab];

  host.innerHTML = `
    <div class="modal-backdrop show" onclick="if(event.target===this)closeModal()">
      <div class="modal lg drawer">
        <div class="modal-head">
          <div>
            <h2>${a.name}</h2>
            <div class="sub">${tierPill(a.tier)} · ${a.city} · ${a.email}</div>
          </div>
          <button class="modal-close" onclick="closeModal()" aria-label="Close">×</button>
        </div>
        <div class="drawer-tabs">
          <button class="drawer-tab ${tab==='profile'?'active':''}" onclick="openAgentDrawer('${a.id}','profile')">Profile</button>
          <button class="drawer-tab ${tab==='compensation'?'active':''}" onclick="openAgentDrawer('${a.id}','compensation')">Compensation</button>
          <button class="drawer-tab ${tab==='earnings'?'active':''}" onclick="openAgentDrawer('${a.id}','earnings')">Earnings Report</button>
        </div>
        <div class="modal-body">${tabBody}</div>
        <div class="modal-foot">
          <button class="btn" onclick="closeModal()">Close</button>
          ${tab==='profile' ? `<button class="btn btn-primary" onclick="closeModal();openAgentModal('${a.id}')">Edit profile</button>` : ''}
        </div>
      </div>
    </div>`;
  document.addEventListener('keydown', escClose);
}

/* ---------- hotel sync (single + bulk) ---------- */
function syncHotel(id){
  const h = HOTELS.find(x=>x.id===id); if(!h) return;
  openModal('Sync hotel — '+h.name,
    `<div class="sync-body">
       <div class="sync-row"><span>Vendor</span><strong>${h.vendor}</strong></div>
       <div class="sync-row"><span>Code</span><strong>${h.code}</strong></div>
       <div class="sync-row"><span>Last sync</span><strong>${h.lastSync}</strong></div>
       <div class="sync-progress"><div class="sync-step done">✓ Authenticate with ${h.vendor}</div><div class="sync-step done">✓ Fetch master record</div><div class="sync-step done">✓ Reconcile rates & availability</div><div class="sync-step running">⟳ Updating local cache…</div></div>
       <div class="modal-note">Sync pulls fresh rates, availability and metadata from the vendor. Local overrides are preserved.</div>
     </div>`);
  setTimeout(()=>{const p=document.querySelector('.sync-step.running');if(p){p.classList.remove('running');p.classList.add('done');p.textContent='✓ Cache updated';}},1200);
}

function syncAllHotels(){
  openModal('Sync all hotels',
    `<div class="sync-body">
       <p>This will refresh <strong>${HOTELS.length}</strong> hotels across ${VENDORS.length} vendors.</p>
       <div class="sync-progress">${VENDORS.map(v=>`<div class="sync-step">◯ ${v}</div>`).join('')}</div>
       <div class="modal-note">Local commission and price-adjustment overrides are preserved.</div>
     </div>`);
  const steps = [...document.querySelectorAll('.sync-step')];
  steps.forEach((s,i)=>setTimeout(()=>{s.classList.add('done');s.textContent='✓ '+VENDORS[i];},300*(i+1)));
}

/* ---------- export CSV ---------- */
function exportReservationsCSV(){
  const cols = ['locator','guest','hotel','agency','checkin','nights','total','status'];
  const lines = [cols.join(',')].concat(
    RESERVATIONS.map(r => cols.map(c => `"${String(r[c]).replace(/"/g,'""')}"`).join(','))
  );
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'reservations-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast(`Exported ${RESERVATIONS.length} reservations`);
}

/* ---------- toast ---------- */
function toast(msg){
  const host=document.getElementById('toast-host');
  const t=document.createElement('div');t.className='toast';t.textContent=msg;host.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},2600);
}

/* ---------- Pricing Policy embedded screen ---------- */
// Iframe URL auto-bumps on every Pages deploy: document.lastModified of the
// parent reflects the upload timestamp, so the iframe cache key is unique
// per deploy without any manual version-bumping.
function buildCpSrc(tab){
  const f = document.getElementById('cp-frame'); if(!f) return '';
  const base = f.dataset.src || 'commission-config.html';
  const hash = (tab && tab !== 'editor') ? '#'+tab : '';
  // Always-fresh cache-bust during prototype iteration. Switch to
  // document.lastModified for production deploys to avoid re-fetching
  // the iframe on every screen visit.
  return base + '?embed=1&v=' + Date.now() + hash;
}
RENDERERS['pricing-policy'] = () => {
  const f = document.getElementById('cp-frame');
  if(f && !f.dataset.ready){
    f.src = buildCpSrc('editor');
    f.dataset.ready='1';
  }
};
function setCpTab(tab){
  const f = document.getElementById('cp-frame'); if(!f) return;
  f.src = buildCpSrc(tab);
  document.querySelectorAll('#cp-tabs .sub-tab').forEach(t=>t.classList.toggle('active', t.dataset.cp===tab));
}
document.addEventListener('click', e => {
  const b = e.target.closest('#cp-tabs .sub-tab');
  if(b) setCpTab(b.dataset.cp);
});

/* ---------- D1 Stay chip (backoffice-app#57) ---------- */
function hpbToggleStay(chipBtn){
  const panel = chipBtn.nextElementSibling;
  const open = panel.hidden;
  panel.hidden = !open;
  chipBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function hpbApplyStay(applyBtn){
  const panel = applyBtn.closest('.hpb-stay-panel');
  const chip = panel.previousElementSibling;
  const room = panel.querySelector('.hpb-room');
  const roomLabel = room ? room.options[room.selectedIndex].text : 'Classic Room';
  chip.innerHTML = `Stay: 2026-07-17 → 2026-07-19 · ${roomLabel} <span class="hpb-stay-chevron">›</span>`;
  panel.hidden = true;
  chip.setAttribute('aria-expanded', 'false');
  if(typeof hpbRecompute === 'function') hpbRecompute();
}

/* ---------- init ---------- */
document.getElementById('proto-tabs').addEventListener('click',e=>{const b=e.target.closest('.proto-tab');if(b)showScreen(b.dataset.screen);});
document.querySelectorAll('.role-opt').forEach(b=>b.onclick=()=>{document.querySelectorAll('.role-opt').forEach(x=>x.classList.remove('active'));b.classList.add('active');});
showScreen('dashboard');
