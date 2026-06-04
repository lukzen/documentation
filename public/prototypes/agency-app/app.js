// ========== BOOKING STATE ==========

const bookingState = {
  hotel: 'Gran Muthu Habana',
  hotelStars: '★★★★★',
  room: 'Standard Room',
  mealPlan: 'Bed & Breakfast',
  price: '194.40',
  cancellationPolicy: 'Free cancellation until Mar 25',
  checkin: '2026-03-25',
  checkout: '2026-03-27',
  guestFirstName: 'Testing',
  guestLastName: 'Guest',
  guestEmail: 'mayankjariwala1994@gmail.com',
  bookingRef: null,
  confirmationDate: null,
  isCancelled: false
};

// Accumulated bookings history — each confirmed booking is snapshotted here
const bookingsHistory = [];

// ========== HELPERS ==========

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nightsBetween(checkin, checkout) {
  const d1 = new Date(checkin);
  const d2 = new Date(checkout);
  return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
}

function generateBookingRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'EC';
  for (let i = 0; i < 12; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

function nowFormatted() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ========== MULTI-CURRENCY SUPPORT ==========

const currencyState = {
  selected: 'USD',
  rates: { USD: 1, EUR: 0.92, GBP: 0.79, MXN: 17.15, BRL: 4.97, COP: 3950, ARS: 875, CLP: 935 },
  symbols: { USD: '$', EUR: '\u20AC', GBP: '\u00A3', MXN: '$', BRL: 'R$', COP: '$', ARS: '$', CLP: '$' }
};

// Format prices in selected currency (Mozio supports multi-currency for transfers)
function formatPrice(amountUSD) {
  const amt = typeof amountUSD === 'string' ? parseFloat(amountUSD) : amountUSD;
  if (isNaN(amt)) return currencyState.selected + ' 0.00';
  const rate = currencyState.rates[currencyState.selected];
  const converted = amt * rate;
  const code = currencyState.selected;
  if (rate > 100) return code + ' ' + Math.round(converted).toLocaleString();
  return code + ' ' + converted.toFixed(2);
}

// Format hotel prices always in USD (GDS prices come in supplier currency)
function formatUSD(amount) {
  const amt = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(amt)) return 'USD 0.00';
  return 'USD ' + amt.toFixed(2);
}

function setCurrency(code) {
  currencyState.selected = code;
  document.querySelectorAll('.currency-selector').forEach(s => s.value = code);
  updateVisiblePrices();
}

function updateVisiblePrices() {
  // Currency conversion applies to transfer (Mozio) prices only — hotel prices come from GDS in their own currency
  // Update transfer-related elements with data-base-usd attribute
  document.querySelectorAll('[data-base-usd]').forEach(el => {
    const base = parseFloat(el.dataset.baseUsd);
    if (!isNaN(base)) el.textContent = formatPrice(base);
  });
  // Update cross-sell card prices
  document.querySelectorAll('.vehicle-card').forEach(card => {
    const basePrice = parseFloat(card.dataset.basePrice || card.dataset.price);
    if (!isNaN(basePrice)) {
      const clientPrice = applyMarkup(basePrice);
      const sellEl = card.querySelector('.vc-sell');
      if (sellEl) sellEl.textContent = formatPrice(clientPrice);
      const netEl = card.querySelector('.vc-net');
      if (netEl) netEl.textContent = 'Net ' + formatPrice(basePrice);
    }
  });
  // Update cross-sell transfer price elements by ID
  const transferPriceMap = {
    'svc-os-tf-price': serviceTransferAdded ? serviceTransferPrice : 0,
    'conf-tf-subtotal': serviceTransferAdded ? serviceTransferPrice : 0,
    'bd-tf-price': serviceTransferAdded ? serviceTransferPrice : 0,
    'bd-pb-transfer': serviceTransferAdded ? serviceTransferPrice : 0,
  };
  Object.entries(transferPriceMap).forEach(([id, usdVal]) => {
    const el = document.getElementById(id);
    if (el && !isNaN(usdVal)) el.textContent = formatPrice(usdVal);
  });
}

// ========== TIME-AWARE GREETING ==========

(function setGreeting() {
  const el = document.getElementById('nav-greeting');
  if (!el) return;
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour >= 5 && hour < 12) greeting = 'Good morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  el.textContent = greeting + ', Demo Agency';
})();

// ========== SCREEN NAVIGATION ==========

// Flow definitions — screens that belong to each flow
const flowScreens = {
  hotels: ['home', 'results', 'hotel', 'rooms', 'guest', 'services', 'payment', 'confirmation', 'bookings', 'booking-detail', 'voucher', 'invoice', 'markup'],
  account: ['profile-info', 'update-password', 'employees', 'passkeys', 'pnl'],
  auth: ['login', 'forgot-password', 'set-password', 'register', 'employee-invitation']
};
let activeFlow = 'hotels';

function switchFlow(flow) {
  activeFlow = flow;
  // Update flow switcher buttons
  document.querySelectorAll('.proto-flow-btn').forEach(b => b.classList.toggle('active', b.dataset.flow === flow));
  // Show/hide tab groups
  document.querySelectorAll('.proto-flow-tabs').forEach(g => {
    g.style.display = g.dataset.flowGroup === flow ? 'flex' : 'none';
  });
  // Navigate to the first screen of the new flow
  const firstScreen = flowScreens[flow][0];
  showScreen(firstScreen);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  document.querySelectorAll('.proto-tab').forEach(t => t.classList.remove('active'));
  // Activate the tab within the currently visible flow group
  const activeGroup = document.querySelector(`.proto-flow-tabs[data-flow-group="${activeFlow}"]`);
  if (activeGroup) {
    const tab = activeGroup.querySelector(`[data-screen="${id}"]`);
    if (tab) tab.classList.add('active');
  }
  window.scrollTo(0, 0);
  // Auto-render document previews when navigating to them
  if (id === 'voucher') renderVoucherPreview();
  if (id === 'invoice') renderInvoicePreview();
  // Auto-fill transfer fields from hotel booking context
  if (id === 'services') initServiceTransferFromBooking();
  // Render dynamic bookings list
  if (id === 'bookings') renderBookingsList();
}

function initServiceTransferFromBooking() {
  const dropoff = document.getElementById('svc-dropoff');
  const tfDate = document.getElementById('svc-tf-date');
  const tfPax = document.getElementById('svc-tf-pax');
  const badge = document.getElementById('svc-autofill-badge');

  if (dropoff && bookingState.hotel) {
    dropoff.value = bookingState.hotel + ', Miramar';
  }
  if (tfDate && bookingState.checkin) {
    tfDate.value = bookingState.checkin;
  }
  if (tfPax) {
    // Calculate total pax from occupancy or default to 2
    const occInput = document.querySelector('.occupancy-trigger input');
    const match = occInput ? occInput.value.match(/(\d+)\s*Adult/) : null;
    tfPax.value = match ? parseInt(match[1]) : 2;
  }
  if (badge) badge.style.display = 'flex';
}

// Flow switcher clicks
document.querySelectorAll('.proto-flow-btn').forEach(btn => {
  btn.addEventListener('click', () => switchFlow(btn.dataset.flow));
});

// Prototype toolbar tab clicks
document.querySelectorAll('.proto-tab').forEach(tab => {
  tab.addEventListener('click', () => showScreen(tab.dataset.screen));
});

// Toggle change callouts
const changesToggle = document.getElementById('changesToggle');
let changesVisible = false;

changesToggle.addEventListener('click', () => {
  changesVisible = !changesVisible;
  document.body.classList.toggle('show-changes', changesVisible);
  changesToggle.textContent = changesVisible ? 'Hide Changes' : 'Show Changes';
  changesToggle.classList.toggle('active', changesVisible);
});

// Close occupancy dropdown on outside click
document.addEventListener('click', (e) => {
  const dd = document.getElementById('occupancy-dropdown');
  if (dd && !e.target.closest('.occupancy-trigger') && !e.target.closest('.occupancy-dropdown')) {
    dd.classList.remove('show');
  }
});

// Keyboard navigation — constrained to active flow
document.addEventListener('keydown', (e) => {
  if (document.querySelector('.modal-overlay.open') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  const screens = flowScreens[activeFlow];
  const current = screens.findIndex(s => document.getElementById('screen-' + s)?.classList.contains('active'));
  if (e.key === 'ArrowRight' && current < screens.length - 1) showScreen(screens[current + 1]);
  if (e.key === 'ArrowLeft' && current > 0) showScreen(screens[current - 1]);
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.classList.remove('modal-open');
  }
});

// ========== SEARCH WITH LOADING ==========

function performSearch() {
  const overlay = document.getElementById('search-loading');
  overlay.classList.add('show');
  setTimeout(() => {
    overlay.classList.remove('show');
    showScreen('results');
  }, 1200);
}

// ========== MODAL LOGIC ==========

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('open');
  document.body.classList.add('modal-open');

  if (id === 'modify-modal') {
    const tfSection = document.getElementById('modify-transfer-section');
    if (serviceTransferAdded && tfSection) {
      tfSection.style.display = '';
      document.getElementById('modify-tf-vehicle-display').textContent = serviceTransferVehicle;
      document.getElementById('modify-tf-route-display').textContent = transferBookingState.pickup + ' → ' + transferBookingState.dropoff;
      document.getElementById('modify-tf-date').value = document.getElementById('svc-tf-date')?.value || transferBookingState.date;
      document.getElementById('modify-tf-time').value = document.getElementById('svc-tf-time')?.value || transferBookingState.time;
      document.getElementById('modify-tf-pax').value = document.getElementById('svc-tf-pax')?.value || transferBookingState.passengers;
      // Sync mode pills
      document.getElementById('modify-mode-oneway').classList.toggle('active', transferMode === 'oneway');
      document.getElementById('modify-mode-roundtrip').classList.toggle('active', transferMode === 'roundtrip');
      document.getElementById('modify-return-row').style.display = transferMode === 'roundtrip' ? '' : 'none';
      if (transferMode === 'roundtrip') {
        document.getElementById('modify-tf-return-date').value = document.getElementById('svc-tf-return-date')?.value || '';
        document.getElementById('modify-tf-return-time').value = document.getElementById('svc-tf-return-time')?.value || '';
      }
    } else if (tfSection) {
      tfSection.style.display = 'none';
    }
    updateModifyTotal();
  }

  if (id === 'cancel-modal') {
    document.getElementById('cancel-step-1').classList.add('active');
    document.getElementById('cancel-step-2').classList.remove('active');
    const checkbox = document.getElementById('cancel-confirm-check');
    if (checkbox) checkbox.checked = false;
    const btn = document.getElementById('confirm-cancel-btn');
    if (btn) btn.disabled = true;
    const reason = document.getElementById('cancel-reason');
    if (reason) reason.value = '';
    // Populate cancel modal prices from booking state
    const total = bookingState.totalPrice || 194.40;
    const half = total / 2;
    const el = (i) => document.getElementById(i);
    if (el('cancel-tier-50')) el('cancel-tier-50').textContent = formatUSD(half) + ' (50%)';
    if (el('cancel-tier-100')) el('cancel-tier-100').textContent = formatUSD(total) + ' (100%)';
    if (el('cancel-refund-total')) el('cancel-refund-total').textContent = formatUSD(total);
    if (el('cancel-refund-penalty')) el('cancel-refund-penalty').textContent = formatUSD(0);
    if (el('cancel-refund-amount')) el('cancel-refund-amount').textContent = formatUSD(total);
    if (el('cancel-step2-refund')) el('cancel-step2-refund').textContent = formatUSD(total);
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.classList.remove('modal-open');
}

function closeModalOnOverlay(e) {
  if (e.target === e.currentTarget) {
    e.target.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
}

// ========== CANCEL FLOW STEPS ==========

function goToCancelStep2() {
  document.getElementById('cancel-step-1').classList.remove('active');
  document.getElementById('cancel-step-2').classList.add('active');
}

function goToCancelStep1() {
  document.getElementById('cancel-step-2').classList.remove('active');
  document.getElementById('cancel-step-1').classList.add('active');
}

function toggleConfirmCancel() {
  const checkbox = document.getElementById('cancel-confirm-check');
  const reason = document.getElementById('cancel-reason');
  const btn = document.getElementById('confirm-cancel-btn');
  btn.disabled = !(checkbox.checked && reason.value.trim().length > 0);
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'cancel-reason') toggleConfirmCancel();
});

// ========== STEPPER LOGIC ==========

document.querySelectorAll('.occ-stepper, .modal-stepper').forEach(stepper => {
  const btns = stepper.querySelectorAll('.occ-step-btn');
  const valEl = stepper.querySelector('span, .stepper-input');
  if (btns.length === 2 && valEl) {
    btns[0].addEventListener('click', () => {
      const v = parseInt(valEl.value || valEl.textContent);
      if (v > 0) { valEl.value !== undefined ? valEl.value = v - 1 : valEl.textContent = v - 1; }
    });
    btns[1].addEventListener('click', () => {
      const v = parseInt(valEl.value || valEl.textContent);
      if (v < 10) { valEl.value !== undefined ? valEl.value = v + 1 : valEl.textContent = v + 1; }
    });
  }
});

// ========== HOTEL SELECTION ==========

function selectHotel(cardEl) {
  // If there's an existing confirmed booking, freeze it into history before starting a new one
  if (bookingState.bookingRef) {
    snapshotBooking();
    bookingState.bookingRef = null;
    bookingState.isCancelled = false;
  }

  const name = cardEl.dataset.name;
  const stars = parseInt(cardEl.dataset.stars) || 5;
  bookingState.hotel = name;
  bookingState.hotelStars = '★'.repeat(stars);

  // Update hotel detail screen header
  const nameEl = document.getElementById('hotel-detail-name');
  const starsEl = document.getElementById('hotel-detail-stars');
  if (nameEl) nameEl.textContent = name;
  if (starsEl) starsEl.textContent = bookingState.hotelStars;

  showScreen('hotel');
}

// ========== BOOKING FLOW ==========

function bookRoom(room, mealPlan, price, cancellationPolicy) {
  bookingState.room = room;
  bookingState.mealPlan = mealPlan;
  bookingState.price = price;
  bookingState.cancellationPolicy = cancellationPolicy;
  bookingState.checkin = document.getElementById('home-checkin').value || '2026-03-25';
  bookingState.checkout = document.getElementById('home-checkout').value || '2026-03-27';
  showScreen('guest');
}

function confirmBooking() {
  // Capture guest info from the form
  const guestScreen = document.getElementById('screen-guest');
  const inputs = guestScreen.querySelectorAll('.form-input');
  if (inputs[0]) bookingState.guestFirstName = inputs[0].value;
  if (inputs[1]) bookingState.guestLastName = inputs[1].value;
  if (inputs[2]) bookingState.guestEmail = inputs[2].value;

  // Generate booking reference and timestamp
  bookingState.bookingRef = generateBookingRef();
  bookingState.confirmationDate = nowFormatted();
  bookingState.isCancelled = false;

  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const guestName = bookingState.guestFirstName + ' ' + bookingState.guestLastName;

  // Populate confirmation screen
  document.getElementById('conf-ref').textContent = bookingState.bookingRef;
  document.getElementById('conf-date').textContent = bookingState.confirmationDate;
  document.getElementById('conf-hotel').textContent = bookingState.hotel + ' ' + bookingState.hotelStars;
  document.getElementById('conf-room').textContent = bookingState.room;
  document.getElementById('conf-meal').textContent = bookingState.mealPlan;
  document.getElementById('conf-checkin').textContent = formatDate(bookingState.checkin);
  document.getElementById('conf-checkout').textContent = formatDate(bookingState.checkout);
  document.getElementById('conf-duration').textContent = nights + ' Night' + (nights !== 1 ? 's' : '');
  document.getElementById('conf-guest-name').textContent = guestName;
  document.getElementById('conf-guest-email').textContent = bookingState.guestEmail;
  document.getElementById('conf-price').textContent = formatUSD(bookingState.price);

  // Also update booking detail and list to match
  updateBookingDetailFromState();
  updateBookingListFromState();

  showScreen('confirmation');

  // Trigger celebratory confetti
  spawnConfetti();
}

// ========== MODIFICATION ==========

function confirmModification() {
  const checkin = document.getElementById('modify-checkin').value;
  const checkout = document.getElementById('modify-checkout').value;

  // Get first room's selection for the booking state (primary room)
  const selects = document.querySelectorAll('#modify-rooms-container .modify-room-select');
  const firstSelect = selects[0];
  const selectedText = firstSelect.options[firstSelect.selectedIndex].text;

  const match = selectedText.match(/^(.+?)\s*—\s*(.+?)\s*\(USD\s*([\d,.]+)\)$/);
  if (match) {
    bookingState.room = match[1].trim();
    bookingState.mealPlan = match[2].trim();
  }

  // Calculate hotel-only price (rooms) for bookingState — transfer is tracked separately
  let roomTotal = 0;
  selects.forEach(sel => { roomTotal += parseFloat(sel.value) || 0; });
  bookingState.price = roomTotal.toFixed(2);
  bookingState.checkin = checkin;
  bookingState.checkout = checkout;

  // Save transfer changes if applicable
  if (serviceTransferAdded) {
    const tfDate = document.getElementById('modify-tf-date').value;
    const tfTime = document.getElementById('modify-tf-time').value;
    const tfPax = document.getElementById('modify-tf-pax').value;

    // Write back to service form fields
    const svcDate = document.getElementById('svc-tf-date');
    const svcTime = document.getElementById('svc-tf-time');
    const svcPax = document.getElementById('svc-tf-pax');
    if (svcDate) svcDate.value = tfDate;
    if (svcTime) svcTime.value = tfTime;
    if (svcPax) svcPax.value = tfPax;

    // Update transfer booking state
    transferBookingState.date = tfDate;
    transferBookingState.time = tfTime;
    transferBookingState.passengers = parseInt(tfPax) || transferBookingState.passengers;

    // Update booking detail display
    const bdDate = document.getElementById('bd-tf-date');
    const bdTime = document.getElementById('bd-tf-time');
    const bdPax = document.getElementById('bd-tf-passengers');
    if (bdDate) bdDate.textContent = formatDate(tfDate);
    if (bdTime) bdTime.textContent = tfTime;
    if (bdPax) bdPax.textContent = tfPax;

    // Update price breakdown totals
    const combinedTotal = roomTotal + serviceTransferPrice;
    const headerPrice = document.getElementById('bd-header-price');
    if (headerPrice) headerPrice.textContent = formatUSD(combinedTotal);
    const bdPbHotel = document.getElementById('bd-pb-hotel');
    if (bdPbHotel) bdPbHotel.textContent = formatUSD(roomTotal);
    const bdPbTotal = document.getElementById('bd-pb-total');
    if (bdPbTotal) bdPbTotal.textContent = formatUSD(combinedTotal);
    bookingState.totalPrice = combinedTotal;
  }

  // Update booking detail screen
  updateBookingDetailFromState();

  // Update history entry and booking list
  snapshotBooking();
  updateBookingListFromState();

  // Add "Modified" timeline entry
  addTimelineEntry('amber', 'Modified: ' + nowFormatted());

  closeModal('modify-modal');
  showToast('success', 'Booking Modified', 'Your booking has been successfully updated with ' + selects.length + ' room' + (selects.length > 1 ? 's' : '') + '.');
}

// ========== MODIFY MODAL — ROOM MANAGEMENT ==========

function getModifyRoomCount() {
  return document.querySelectorAll('#modify-rooms-container .modal-room-card').length;
}

function updateModifyRoomHeaders() {
  const title = document.getElementById('modify-rooms-title');
  const note = document.getElementById('modify-rooms-note');
  const count = getModifyRoomCount();
  title.textContent = 'Rooms (' + count + ')';

  if (count === 1) {
    note.textContent = 'No change in room count';
    note.style.color = '';
  } else {
    note.textContent = '+' + (count - 1) + ' room' + (count - 1 > 1 ? 's' : '') + ' added';
    note.style.color = '#059669';
  }
}

function calculateModifyTotal() {
  let total = 0;
  document.querySelectorAll('#modify-rooms-container .modify-room-select').forEach(sel => {
    total += parseFloat(sel.value) || 0;
  });
  if (serviceTransferAdded) {
    total += serviceTransferPrice;
  }
  return total;
}

function updateModifyTotal() {
  const el = document.getElementById('modify-total-amount');
  if (el) el.textContent = formatUSD(calculateModifyTotal());
}

function addModifyRoom() {
  const container = document.getElementById('modify-rooms-container');
  const count = getModifyRoomCount() + 1;

  if (count > 5) {
    showToast('info', 'Room Limit', 'Maximum 5 rooms per booking.');
    return;
  }

  const card = document.createElement('div');
  card.className = 'modal-room-card';
  card.dataset.roomIndex = count;
  card.innerHTML =
    '<div class="modal-room-card-header">' +
      '<h4>Room ' + count + '</h4>' +
      '<button class="btn-remove-room" type="button" onclick="removeModifyRoom(this)">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        'Remove' +
      '</button>' +
    '</div>' +
    '<div class="modal-form-row">' +
      '<div class="modal-form-group" style="flex:2">' +
        '<label>Select Available Room</label>' +
        '<select class="form-input modify-room-select" onchange="updateModifyTotal()">' +
          '<option value="194.40">Standard Room — Bed &amp; Breakfast (USD 194.40)</option>' +
          '<option value="294.40">Standard Room — Half Board (USD 294.40)</option>' +
          '<option value="394.40">Standard Room — All Inclusive (USD 394.40)</option>' +
          '<option value="284.00">Superior Room Ocean View — Bed &amp; Breakfast (USD 284.00)</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="modal-form-row">' +
      '<div class="modal-form-group">' +
        '<label>Adults</label>' +
        '<div class="modal-stepper">' +
          '<button class="occ-step-btn" type="button">−</button>' +
          '<input type="number" value="2" class="stepper-input" readonly>' +
          '<button class="occ-step-btn" type="button">+</button>' +
        '</div>' +
      '</div>' +
      '<div class="modal-form-group">' +
        '<label>Children</label>' +
        '<div class="modal-stepper">' +
          '<button class="occ-step-btn" type="button">−</button>' +
          '<input type="number" value="0" class="stepper-input" readonly>' +
          '<button class="occ-step-btn" type="button">+</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  container.appendChild(card);

  // Wire up steppers on the new card
  card.querySelectorAll('.modal-stepper').forEach(stepper => {
    const btns = stepper.querySelectorAll('.occ-step-btn');
    const valEl = stepper.querySelector('.stepper-input');
    if (btns.length === 2 && valEl) {
      btns[0].addEventListener('click', () => {
        const v = parseInt(valEl.value);
        if (v > 0) valEl.value = v - 1;
      });
      btns[1].addEventListener('click', () => {
        const v = parseInt(valEl.value);
        if (v < 10) valEl.value = v + 1;
      });
    }
  });

  updateModifyRoomHeaders();
  updateModifyTotal();

  // Scroll the new card into view within the modal
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeModifyRoom(btn) {
  const card = btn.closest('.modal-room-card');
  card.classList.add('removing');
  card.addEventListener('animationend', () => {
    card.remove();
    renumberRooms();
    updateModifyRoomHeaders();
    updateModifyTotal();
  });
}

function renumberRooms() {
  const cards = document.querySelectorAll('#modify-rooms-container .modal-room-card');
  cards.forEach((card, i) => {
    const num = i + 1;
    card.dataset.roomIndex = num;
    const h4 = card.querySelector('.modal-room-card-header h4');
    if (h4) h4.textContent = 'Room ' + num;

    // Room 1 should never have a remove button; rooms 2+ should
    const existingRemove = card.querySelector('.btn-remove-room');
    if (num === 1 && existingRemove) {
      existingRemove.remove();
    }
  });
}

function updateBookingDetailFromState() {
  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const hotelPrice = parseFloat(bookingState.price);

  // Header price (hotel + transfer if added)
  const headerPrice = document.getElementById('bd-header-price');
  if (headerPrice) {
    const total = serviceTransferAdded ? hotelPrice + serviceTransferPrice : hotelPrice;
    headerPrice.textContent = formatUSD(total);
  }

  // Service card rows
  const bdCheckin = document.getElementById('bd-checkin');
  const bdCheckout = document.getElementById('bd-checkout');
  const bdDuration = document.getElementById('bd-duration');
  const bdRoom = document.getElementById('bd-room');
  const bdMeal = document.getElementById('bd-meal');
  const bdHotelPrice = document.getElementById('bd-hotel-price');

  if (bdCheckin) bdCheckin.textContent = formatDate(bookingState.checkin);
  if (bdCheckout) bdCheckout.textContent = formatDate(bookingState.checkout);
  if (bdDuration) bdDuration.textContent = nights + ' Night' + (nights !== 1 ? 's' : '');
  if (bdRoom) bdRoom.textContent = bookingState.room;
  if (bdMeal) bdMeal.textContent = bookingState.mealPlan;
  if (bdHotelPrice) bdHotelPrice.textContent = formatUSD(hotelPrice);

  // Update amount paid to match total
  const bdAmountPaid = document.getElementById('bd-amount-paid');
  if (bdAmountPaid) {
    if (serviceTransferAdded) {
      const total = hotelPrice + serviceTransferPrice;
      bdAmountPaid.textContent = formatUSD(total);
    } else {
      bdAmountPaid.textContent = formatUSD(hotelPrice);
    }
  }
}

// ========== DYNAMIC BOOKINGS LIST ==========

// Static demo bookings (pre-existing history)
const demoBookings = [
  {
    type: 'hotel', hotel: 'Playa Costa Verde', status: 'cancelled', refundable: true,
    dates: 'Nov 1 – Nov 8, 2026', nights: 4, guests: '2 Adults', meal: 'All Inclusive',
    price: 550.00, ref: 'EC22B53G4PR6U', screen: 'booking-detail'
  },
  {
    type: 'hotel', hotel: 'Caburní', status: 'cancelled', refundable: false,
    dates: 'Mar 11 – Mar 13, 2026', nights: 3, guests: '2 Adults, 1 Child', meal: 'Half Board',
    price: 298.18, ref: 'EC22B5199MV3JG5', screen: 'booking-detail'
  }
];

function snapshotBooking() {
  if (!bookingState.bookingRef) return;
  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const ciShort = formatDateShort(bookingState.checkin);
  const coShort = formatDateShort(bookingState.checkout);
  const hotelPrice = parseFloat(bookingState.price);

  const entry = {
    type: serviceTransferAdded ? 'trip' : 'hotel',
    hotel: bookingState.hotel,
    status: bookingState.isCancelled ? 'cancelled' : 'confirmed',
    refundable: true,
    dates: ciShort + ' – ' + coShort,
    nights: nights,
    guests: '2 Adults',
    meal: bookingState.mealPlan,
    price: serviceTransferAdded ? hotelPrice + serviceTransferPrice : hotelPrice,
    ref: bookingState.bookingRef,
    screen: 'booking-detail',
    _bookingRef: bookingState.bookingRef
  };
  if (serviceTransferAdded) {
    entry.transferInfo = 'Airport Transfer · ' + serviceTransferVehicle;
  }

  // Replace if same ref already exists (modification), otherwise add
  const idx = bookingsHistory.findIndex(b => b._bookingRef === entry._bookingRef);
  if (idx >= 0) {
    bookingsHistory[idx] = entry;
  } else {
    bookingsHistory.unshift(entry);
  }
}

function getActiveBookings() {
  const bookings = [];

  // Current live booking (reflects latest modifications/cancellations)
  if (bookingState.bookingRef) {
    const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
    const ciShort = formatDateShort(bookingState.checkin);
    const coShort = formatDateShort(bookingState.checkout);
    const hotelPrice = parseFloat(bookingState.price);

    const liveEntry = {
      type: serviceTransferAdded ? 'trip' : 'hotel',
      hotel: bookingState.hotel,
      status: bookingState.isCancelled ? 'cancelled' : 'confirmed',
      refundable: true,
      dates: ciShort + ' – ' + coShort,
      nights: nights, guests: '2 Adults', meal: bookingState.mealPlan,
      price: serviceTransferAdded ? hotelPrice + serviceTransferPrice : hotelPrice,
      ref: bookingState.bookingRef, screen: 'booking-detail'
    };
    if (serviceTransferAdded) {
      liveEntry.transferInfo = 'Airport Transfer · ' + serviceTransferVehicle;
    }
    bookings.push(liveEntry);
  }

  // Past bookings from history (skip the current one to avoid duplicate)
  bookingsHistory.forEach(b => {
    if (b._bookingRef !== bookingState.bookingRef) {
      bookings.push(b);
    }
  });

  // Add demo bookings
  bookings.push(...demoBookings);

  return bookings;
}

function renderBookingsList() {
  const container = document.getElementById('bookings-list-container');
  if (!container) return;

  const bookings = getActiveBookings();

  // Update total count
  const subtitle = document.querySelector('.bookings-subtitle');
  if (subtitle) subtitle.textContent = bookings.length + ' booking' + (bookings.length !== 1 ? 's' : '') + ' total';

  container.innerHTML = bookings.map(b => {
    const statusClass = b.status === 'confirmed' ? 'confirmed' : 'cancelled';
    const statusLabel = b.status.toUpperCase();
    const refundTag = b.refundable
      ? '<span class="tag tag-refund">Free Cancellation</span>'
      : '<span class="tag tag-nonrefund-sm">Non-Refundable</span>';
    const rebookBtn = b.status === 'cancelled' ? '<button class="btn-rebook" onclick="rebookFromHistory(this)">Book Again</button>' : '';

    let typeLabel = '';
    if (b.type === 'trip') {
      typeLabel = '<div class="blc-service-type"><span class="blc-trip-badge">\uD83C\uDFE8 + \uD83D\uDE97 Trip</span></div>';
    }

    let detailsHTML = '<div class="blc-details">' +
      '<span>\uD83D\uDCC5 ' + b.dates + '</span>' +
      '<span>\u00B7 ' + b.nights + ' Night' + (b.nights !== 1 ? 's' : '') + '</span>' +
      '<span>\u00B7 ' + b.guests + '</span>' +
      '<span>\u00B7 ' + b.meal + '</span>' +
      '</div>';
    if (b.type === 'trip' && b.transferInfo) {
      detailsHTML += '<div class="blc-details"><span>\uD83D\uDE97 ' + b.transferInfo + '</span></div>';
    }

    const priceStr = formatUSD(b.price);
    const extraClass = b.type === 'trip' ? ' trip-booking' : '';

    return '<div class="booking-list-card' + extraClass + '">' +
      '<div class="blc-left">' +
        typeLabel +
        '<div class="blc-hotel">' + b.hotel + '</div>' +
        '<div class="blc-meta">' +
          '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
          refundTag +
        '</div>' +
        detailsHTML +
        '<div class="blc-ref">Booking Ref: ' + b.ref + '</div>' +
      '</div>' +
      '<div class="blc-right">' +
        '<div class="blc-price-label">Total Client Price</div>' +
        '<div class="blc-price">' + priceStr + '</div>' +
        '<button class="btn-view-details" onclick="showScreen(\'' + b.screen + '\')">View Booking Details</button>' +
        rebookBtn +
      '</div>' +
    '</div>';
  }).join('');
}

// Legacy alias — still called from confirmBooking flow
function updateBookingListFromState() {
  renderBookingsList();
}

function addTimelineEntry(color, text) {
  const timeline = document.getElementById('bd-timeline');
  if (!timeline) return;
  const entry = document.createElement('div');
  entry.className = 'timeline-item';
  entry.innerHTML = '<span class="tl-dot ' + color + '"></span><span class="tl-text">' + text + '</span>';
  timeline.appendChild(entry);
}

// ========== CANCELLATION ==========

function showCancelSuccess() {
  bookingState.isCancelled = true;

  showToast('success', 'Booking Cancelled', 'Your booking has been cancelled. Refund of ' + formatUSD(bookingState.price) + ' will be processed.');

  // Update status badges in booking detail
  const badges = document.querySelectorAll('#screen-booking-detail .status-badge.confirmed');
  badges.forEach(b => {
    b.textContent = 'CANCELLED';
    b.className = 'status-badge cancelled';
  });

  // Update cancellation banner
  const banner = document.querySelector('#screen-booking-detail .cancellation-banner');
  if (banner) {
    banner.className = 'cancellation-banner red';
    banner.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg><span>This booking has been cancelled. Refund of ' + formatUSD(bookingState.price) + ' is being processed.</span>';
  }

  // Update history and re-render bookings list
  snapshotBooking();
  updateBookingListFromState();

  // Disable Modify/Cancel buttons
  const modifyBtn = document.getElementById('btn-modify-booking');
  const cancelBtn = document.getElementById('btn-cancel-booking');
  if (modifyBtn) modifyBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;

  // Add "Cancelled" timeline entry
  addTimelineEntry('red', 'Cancelled: ' + nowFormatted());
}

// ========== BUTTON HANDLERS ==========

// "Book Again" buttons
document.querySelectorAll('.btn-rebook').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showScreen('home');
    showToast('info', 'New Search', 'Start a new search to rebook this hotel.');
  });
});

// "Export CSV" button
document.querySelectorAll('.btn-outline').forEach(btn => {
  if (btn.textContent.includes('Export')) {
    btn.addEventListener('click', () => {
      showToast('success', 'Export Started', 'Your bookings CSV is being generated and will download shortly.');
    });
  }
});

// Voucher & Proforma downloads are handled by downloadVoucher() and downloadProforma() below

// Search bar edit button
document.querySelectorAll('.rsb-edit').forEach(btn => {
  btn.addEventListener('click', () => showScreen('home'));
});

// Gallery "+36 photos"
document.querySelectorAll('.gallery-more').forEach(el => {
  el.addEventListener('click', () => {
    showToast('info', 'Photo Gallery', 'Full photo gallery would open in a lightbox overlay.');
  });
});

// Sidebar links
document.querySelectorAll('.bookings-sidebar .sidebar-link').forEach(link => {
  if (!link.classList.contains('active')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('info', 'Navigation', `"${link.textContent.trim()}" page would open here.`);
    });
  }
});

// ========== DYNAMIC OCCUPANCY DROPDOWN ==========

const occRooms = [{ adults: 2, children: [10] }]; // Initial state: 1 room, 2 adults, 1 child age 10

function renderOccRooms() {
  const container = document.getElementById('occ-rooms-container');
  if (!container) return;
  container.innerHTML = '';

  occRooms.forEach((room, i) => {
    const div = document.createElement('div');
    div.className = 'occ-room';
    const childAgesHTML = room.children.map((age, ci) =>
      `<div class="occ-child-age-item">
        <label>Child ${ci + 1} age</label>
        <select onchange="occSetChildAge(${i},${ci},this.value)">
          ${Array.from({length: 18}, (_, a) => `<option value="${a}" ${a === age ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>`
    ).join('');

    div.innerHTML =
      `<div class="occ-room-header">
        <span style="font-weight:700;font-size:15px">Room ${i + 1}</span>
        ${occRooms.length > 1 ? `<button class="occ-remove-room" onclick="occRemoveRoom(${i})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg> Remove</button>` : ''}
      </div>
      <div class="occ-row">
        <div><div class="occ-label">Adults</div></div>
        <div class="occ-stepper">
          <button class="occ-step-btn" onclick="occStep(${i},'adults',-1)">−</button>
          <span>${room.adults}</span>
          <button class="occ-step-btn" onclick="occStep(${i},'adults',1)">+</button>
        </div>
      </div>
      <div class="occ-row">
        <div><div class="occ-label">Children</div><div class="occ-sublabel">Ages 0–17</div></div>
        <div class="occ-stepper">
          <button class="occ-step-btn" onclick="occStep(${i},'children',-1)">−</button>
          <span>${room.children.length}</span>
          <button class="occ-step-btn" onclick="occStep(${i},'children',1)">+</button>
        </div>
      </div>
      ${room.children.length > 0 ? `<div class="occ-child-ages">${childAgesHTML}</div>` : ''}`;

    container.appendChild(div);
  });

  updateOccSummary();
}

function occStep(roomIdx, type, delta) {
  const room = occRooms[roomIdx];
  if (type === 'adults') {
    room.adults = Math.max(1, Math.min(6, room.adults + delta));
  } else {
    const newCount = Math.max(0, Math.min(4, room.children.length + delta));
    if (delta > 0) room.children.push(10);
    else if (delta < 0 && room.children.length > 0) room.children.pop();
  }
  renderOccRooms();
}

function occSetChildAge(roomIdx, childIdx, age) {
  occRooms[roomIdx].children[childIdx] = parseInt(age);
}

function occRemoveRoom(idx) {
  if (occRooms.length <= 1) return;
  occRooms.splice(idx, 1);
  renderOccRooms();
}

function occAddRoom() {
  if (occRooms.length >= 5) {
    showToast('info', 'Room Limit', 'Maximum 5 rooms per booking.');
    return;
  }
  occRooms.push({ adults: 2, children: [] });
  renderOccRooms();
  // Scroll to new room
  const container = document.getElementById('occ-rooms-container');
  if (container) container.scrollTop = container.scrollHeight;
}

function updateOccSummary() {
  const totalRooms = occRooms.length;
  const totalAdults = occRooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = occRooms.reduce((s, r) => s + r.children.length, 0);
  let summary = totalRooms + ' Room' + (totalRooms > 1 ? 's' : '') + ', ' + totalAdults + ' Adult' + (totalAdults > 1 ? 's' : '');
  if (totalChildren > 0) summary += ', ' + totalChildren + ' Child' + (totalChildren > 1 ? 'ren' : '');
  const input = document.querySelector('.occupancy-trigger .search-input');
  if (input) input.value = summary;
}

function closeOccupancy() {
  document.getElementById('occupancy-dropdown').classList.remove('show');
}

// Wire up add room button
document.getElementById('occ-add-room-btn').addEventListener('click', (e) => {
  e.preventDefault();
  occAddRoom();
});

// Initial render
renderOccRooms();

// "Add Room" button in modify modal — real add/remove
// Pre-existing null-deref bug: btn-add-room lives inside #modify-modal which
// is hidden at script load, so getElementById returns null on first run and
// the unguarded .addEventListener halts the entire script (silently breaking
// every IIFE below this line, including the destination-search autocomplete).
// Discovered 2026-06-03 while wiring E1.
const _addRoomBtn = document.getElementById('btn-add-room');
if (_addRoomBtn) _addRoomBtn.addEventListener('click', addModifyRoom);

// "Apply" button in modify modal (date change)
document.querySelectorAll('.btn-apply').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast('info', 'Dates Applied', 'Room availability would be recalculated for the new dates.');
  });
});

// Help button
document.querySelectorAll('.help-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast('info', 'Help & Support', 'Live chat with our support team or call +1-800-ERGOS-24/7.');
  });
});

// Navbar icon buttons (globe, notification bell)
document.querySelectorAll('.navbar .icon-btn:not(.help-btn)').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast('info', 'Feature', 'This feature would open in the full application.');
  });
});

// Avatar click
document.querySelectorAll('.avatar').forEach(el => {
  el.addEventListener('click', () => {
    showToast('info', 'Account', 'Account dropdown menu would appear here.');
  });
});

// "See full policy" link in booking detail
document.querySelectorAll('.cancellation-banner a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('cancel-modal');
  });
});

// ========== TOAST NOTIFICATIONS ==========

function showToast(type, title, message) {
  const toast = document.getElementById('toast');
  const iconEl = document.getElementById('toast-icon');
  const titleEl = document.getElementById('toast-title');
  const messageEl = document.getElementById('toast-message');

  toast.className = 'toast show toast-' + type;

  if (type === 'success') {
    iconEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>';
  } else if (type === 'error') {
    iconEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>';
  } else if (type === 'info') {
    iconEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  }

  titleEl.textContent = title;
  messageEl.textContent = message;

  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ========== CONFETTI ANIMATION ==========

function spawnConfetti() {
  const container = document.getElementById('conf-confetti');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#c4962c', '#4f46e5', '#0d9488', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.style.cssText =
      'position:absolute;width:' + (6 + Math.random() * 6) + 'px;height:' + (6 + Math.random() * 6) + 'px;' +
      'background:' + colors[Math.floor(Math.random() * colors.length)] + ';' +
      'left:' + Math.random() * 100 + '%;top:-20px;' +
      'border-radius:' + (Math.random() > .5 ? '50%' : '2px') + ';' +
      'animation:confettiFall ' + (1.5 + Math.random() * 2) + 's ease-out forwards;' +
      'animation-delay:' + (Math.random() * .5) + 's;' +
      'opacity:.9;transform:rotate(' + Math.random() * 360 + 'deg);';
    container.appendChild(piece);
  }
  // Clean up after animation
  setTimeout(() => { container.innerHTML = ''; }, 4500);
}

// ========== SEARCH RESULTS FILTERS & SORTING ==========

(function initFilters() {
  const nameInput = document.getElementById('filter-hotel-name');
  const priceRange = document.getElementById('filter-price-range');
  const priceLabel = document.getElementById('filter-price-label');
  const sortSelect = document.getElementById('filter-sort');
  const resultsCount = document.getElementById('results-count');
  const resultsList = document.getElementById('results-list');

  if (!resultsList) return;

  function getHotelCards() {
    return Array.from(resultsList.querySelectorAll('.hotel-card'));
  }

  function getCheckedValues(selector, attr) {
    const checked = document.querySelectorAll(selector + ':checked');
    if (checked.length === 0) return null; // none checked = no filter
    return Array.from(checked).map(cb => cb.getAttribute(attr));
  }

  function applyFilters() {
    const cards = getHotelCards();
    const nameQuery = nameInput.value.trim().toLowerCase();
    const maxPrice = parseInt(priceRange.value);
    const starFilters = getCheckedValues('.filter-star', 'data-stars');
    const mealFilters = getCheckedValues('.filter-meal', 'data-meal');
    const refundValue = document.querySelector('.filter-refund:checked')?.value || 'all';

    // Update price label
    priceLabel.textContent = maxPrice >= 2000 ? '$2,000+' : '$' + maxPrice.toLocaleString();

    let visibleCount = 0;

    cards.forEach(card => {
      const cardName = (card.dataset.name || '').toLowerCase();
      const cardPrice = parseFloat(card.dataset.price) || 0;
      const cardStars = card.dataset.stars;
      const cardMeal = card.dataset.meal;
      const cardRefund = card.dataset.refund;

      let visible = true;

      // Hotel name filter
      if (nameQuery && !cardName.includes(nameQuery)) visible = false;

      // Price range filter
      if (maxPrice < 2000 && cardPrice > maxPrice) visible = false;

      // Star category filter (if any checked)
      if (starFilters && !starFilters.includes(cardStars)) visible = false;

      // Meal plan filter (if any checked)
      if (mealFilters && !mealFilters.includes(cardMeal)) visible = false;

      // Cancellation policy filter
      if (refundValue === 'refundable' && cardRefund !== 'refundable') visible = false;
      if (refundValue === 'nonrefundable' && cardRefund !== 'nonrefundable') visible = false;

      card.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Update results count
    resultsCount.textContent = visibleCount + ' hotel' + (visibleCount !== 1 ? 's' : '') + ' found in Havana, Cuba';
  }

  function applySort() {
    const cards = getHotelCards();
    const sortVal = sortSelect.value;
    const header = resultsList.querySelector('.results-header');

    cards.sort((a, b) => {
      switch (sortVal) {
        case 'price-asc':
          return (parseFloat(a.dataset.price) || 0) - (parseFloat(b.dataset.price) || 0);
        case 'price-desc':
          return (parseFloat(b.dataset.price) || 0) - (parseFloat(a.dataset.price) || 0);
        case 'stars':
          return (parseInt(b.dataset.stars) || 0) - (parseInt(a.dataset.stars) || 0);
        case 'name':
          return (a.dataset.name || '').localeCompare(b.dataset.name || '');
        default:
          return 0;
      }
    });

    // Re-append cards in sorted order (header stays first)
    cards.forEach(card => resultsList.appendChild(card));
  }

  // Wire up event listeners
  nameInput.addEventListener('input', applyFilters);
  priceRange.addEventListener('input', applyFilters);
  sortSelect.addEventListener('change', () => { applySort(); applyFilters(); });

  document.querySelectorAll('.filter-star, .filter-meal, .filter-refund').forEach(el => {
    el.addEventListener('change', applyFilters);
  });
})();

// ========== VOUCHER & PROFORMA DOWNLOAD ==========

function buildVoucherHTML(lang) {
  const isES = lang === 'Spanish';
  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const ref = bookingState.bookingRef || 'PTA18G28E7CUANQ';
  const guestName = bookingState.guestFirstName + ' ' + bookingState.guestLastName;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#292524; padding:40px; max-width:800px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1a1a4e; padding-bottom:20px; margin-bottom:30px; }
  .brand { font-size:24px; font-weight:700; color:#1a1a4e; }
  .brand-sub { font-size:12px; color:#78716c; }
  .doc-title { font-size:28px; font-weight:700; color:#1a1a4e; text-align:right; }
  .doc-subtitle { font-size:12px; color:#78716c; text-align:right; }
  .ref-bar { background:#1a1a4e; color:#fff; padding:14px 20px; border-radius:6px; display:flex; justify-content:space-between; margin-bottom:24px; font-size:14px; }
  .ref-bar strong { font-size:16px; }
  .section { margin-bottom:24px; }
  .section h3 { font-size:11px; font-weight:700; color:#78716c; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #e8e5e0; }
  .service-block { border:1px solid #e8e5e0; border-radius:8px; overflow:hidden; margin-bottom:20px; }
  .service-block-header { padding:14px 20px; font-size:16px; font-weight:700; color:#fff; display:flex; align-items:center; gap:10px; }
  .service-block-header.hotel { background:#1a1a4e; }
  .service-block-header.transfer { background:#0d9488; }
  .service-block-header .svc-icon { font-size:20px; }
  .service-block-body { padding:20px; }
  .service-block-subtotal { background:#f5f3f0; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; font-size:14px; font-weight:700; border-top:1px solid #e8e5e0; }
  .service-block-subtotal .subtotal-amount { font-size:18px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 32px; }
  .field-label { font-size:11px; color:#a8a093; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
  .field-value { font-size:14px; font-weight:600; margin-bottom:8px; }
  .price-summary { background:#f5f3f0; border-radius:8px; padding:20px; margin:24px 0; }
  .price-line { display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#57534e; }
  .price-line.total { border-top:2px solid #292524; margin-top:8px; padding-top:14px; font-size:18px; font-weight:700; color:#292524; }
  .price-line.total .price-val { font-size:24px; color:#0d9488; }
  .total-bar { background:#f5f3f0; padding:16px 20px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; margin:24px 0; font-size:16px; font-weight:700; }
  .total-amount { font-size:24px; color:#0d9488; }
  .policy { padding:12px 16px; border-radius:6px; font-size:13px; margin-bottom:20px; }
  .policy.green { background:#ccfbf1; color:#115e59; border:1px solid #99f6e4; }
  .footer { border-top:2px solid #e8e5e0; padding-top:20px; margin-top:30px; font-size:11px; color:#a8a093; text-align:center; line-height:1.8; }
  .footer strong { color:#78716c; }
  @media print { body { padding:20px; } }
</style></head><body>
<div class="header">
  <div><div class="brand">Ergos Continental</div><div class="brand-sub">${isES ? 'Plataforma de Reservas de Viajes' : 'Travel Booking Platform'}</div></div>
  <div><div class="doc-title">${isES ? 'BONO DE RESERVA' : 'BOOKING VOUCHER'}</div><div class="doc-subtitle">${isES ? 'Documento oficial de confirmación' : 'Official Confirmation Document'}</div></div>
</div>
<div class="ref-bar">
  <div>${isES ? 'Referencia de reserva' : 'Booking Reference'}: <strong>${ref}</strong></div>
  <div>${isES ? 'Estado' : 'Status'}: ${bookingState.isCancelled ? (isES ? 'CANCELADA' : 'CANCELLED') : (isES ? 'CONFIRMADA' : 'CONFIRMED')}</div>
</div>
<div class="section"><h3>${isES ? 'Información del Huésped' : 'Guest Information'}</h3>
<div class="grid">
  <div><div class="field-label">${isES ? 'Nombre' : 'Guest Name'}</div><div class="field-value">${guestName}</div></div>
  <div><div class="field-label">${isES ? 'Correo' : 'Email'}</div><div class="field-value">${bookingState.guestEmail}</div></div>
</div></div>
<div class="service-block">
  <div class="service-block-header hotel"><span class="svc-icon">&#9632;</span> ${isES ? 'ALOJAMIENTO — Detalles del Hotel' : 'ACCOMMODATION — Hotel Details'}</div>
  <div class="service-block-body">
    <div class="grid">
      <div><div class="field-label">${isES ? 'Hotel' : 'Hotel'}</div><div class="field-value">${bookingState.hotel} ${bookingState.hotelStars}</div></div>
      <div><div class="field-label">${isES ? 'Dirección' : 'Address'}</div><div class="field-value">Calle 66, Miramar, Playa, Havana</div></div>
      <div><div class="field-label">${isES ? 'Entrada' : 'Check-in'}</div><div class="field-value">${formatDate(bookingState.checkin)}</div></div>
      <div><div class="field-label">${isES ? 'Salida' : 'Check-out'}</div><div class="field-value">${formatDate(bookingState.checkout)}</div></div>
      <div><div class="field-label">${isES ? 'Duración' : 'Duration'}</div><div class="field-value">${nights} ${isES ? 'Noche' : 'Night'}${nights !== 1 ? 's' : ''}</div></div>
      <div><div class="field-label">${isES ? 'Habitación' : 'Room'}</div><div class="field-value">${bookingState.room}</div></div>
      <div><div class="field-label">${isES ? 'Régimen' : 'Meal Plan'}</div><div class="field-value">${bookingState.mealPlan}</div></div>
      <div><div class="field-label">${isES ? 'Ocupación' : 'Occupancy'}</div><div class="field-value">2 ${isES ? 'Adultos' : 'Adults'}</div></div>
    </div>
  </div>
  <div class="service-block-subtotal"><span>${isES ? 'Subtotal Alojamiento' : 'Accommodation Subtotal'}</span><span class="subtotal-amount">${formatUSD(bookingState.price)}</span></div>
</div>
${serviceTransferAdded ? `<div class="service-block">
  <div class="service-block-header transfer"><span class="svc-icon">&#9654;</span> ${isES ? 'TRANSFER — Detalles del Transporte' : 'TRANSFER — Transport Details'}</div>
  <div class="service-block-body">
    <div class="grid">
      <div><div class="field-label">${isES ? 'Ruta' : 'Route'}</div><div class="field-value">${transferBookingState.pickup} → ${transferBookingState.dropoff}</div></div>
      <div><div class="field-label">${isES ? 'Vehículo' : 'Vehicle'}</div><div class="field-value">${serviceTransferVehicle} (${transferBookingState.vehicleClass || 'Standard'})</div></div>
      <div><div class="field-label">${isES ? 'Fecha' : 'Date'}</div><div class="field-value">${formatDate(document.getElementById('svc-tf-date')?.value || transferBookingState.date)}</div></div>
      <div><div class="field-label">${isES ? 'Hora' : 'Time'}</div><div class="field-value">${document.getElementById('svc-tf-time')?.value || transferBookingState.time}</div></div>
      <div><div class="field-label">${isES ? 'Pasajeros' : 'Passengers'}</div><div class="field-value">${document.getElementById('svc-tf-pax')?.value || transferBookingState.passengers}</div></div>
      <div><div class="field-label">${isES ? 'Servicio' : 'Service'}</div><div class="field-value">${isES ? 'Transfer Privado' : 'Private Transfer'}</div></div>
    </div>
  </div>
  <div class="service-block-subtotal"><span>${isES ? 'Subtotal Transfer' : 'Transfer Subtotal'}</span><span class="subtotal-amount">${formatPrice(serviceTransferPrice)}</span></div>
</div>` : ''}
<div class="policy green">${isES ? 'Cancelación gratuita hasta el' : 'Free cancellation until'} ${formatDate(bookingState.checkin)}</div>
${serviceTransferAdded ? `<div class="price-summary">
  <div class="price-line"><span>${isES ? 'Alojamiento' : 'Accommodation'} (${nights} ${isES ? 'noches' : 'nights'})</span><span>${formatUSD(bookingState.price)}</span></div>
  <div class="price-line"><span>${isES ? 'Transfer Privado' : 'Private Transfer'}</span><span>${formatPrice(serviceTransferPrice)}</span></div>
  <div class="price-line total"><span>${isES ? 'Total a Cobrar' : 'Total Charged'}</span><span class="price-val">${formatUSD(parseFloat(bookingState.price) + serviceTransferPrice)}</span></div>
</div>` : `<div class="total-bar"><span>${isES ? 'Precio Total del Cliente' : 'Total Client Price'}</span><span class="total-amount">${formatUSD(bookingState.price)}</span></div>`}
<div class="footer">
  <strong>Ergos Continental</strong> — ${isES ? 'Este bono es su confirmación oficial. Preséntelo al hacer el check-in.' : 'This voucher is your official confirmation. Please present it at check-in.'}<br>
  ${isES ? 'Generado el' : 'Generated on'} ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
  ${isES ? 'Para soporte: support@ergoscontinental.com | +1-800-ERGOS' : 'For support: support@ergoscontinental.com | +1-800-ERGOS'}
</div>
</body></html>`;
}

function buildProformaHTML(lang) {
  const isES = lang === 'Spanish';
  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const ref = bookingState.bookingRef || 'PTA18G28E7CUANQ';
  const guestName = bookingState.guestFirstName + ' ' + bookingState.guestLastName;
  const perNight = (parseFloat(bookingState.price) / nights).toFixed(2);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#292524; padding:40px; max-width:800px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1a1a4e; padding-bottom:20px; margin-bottom:30px; }
  .brand { font-size:24px; font-weight:700; color:#1a1a4e; }
  .brand-sub { font-size:12px; color:#78716c; }
  .doc-title { font-size:28px; font-weight:700; color:#1a1a4e; text-align:right; }
  .doc-subtitle { font-size:12px; color:#78716c; text-align:right; }
  .ref-bar { background:#1a1a4e; color:#fff; padding:14px 20px; border-radius:6px; display:flex; justify-content:space-between; margin-bottom:24px; font-size:14px; }
  .ref-bar strong { font-size:16px; }
  .section { margin-bottom:24px; }
  .section h3 { font-size:11px; font-weight:700; color:#78716c; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #e8e5e0; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 32px; }
  .field-label { font-size:11px; color:#a8a093; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
  .field-value { font-size:14px; font-weight:600; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
  th { background:#f5f3f0; text-align:left; padding:10px 14px; font-size:11px; font-weight:700; color:#78716c; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid #e8e5e0; }
  td { padding:10px 14px; border-bottom:1px solid #e8e5e0; }
  td.right { text-align:right; font-weight:600; }
  .total-row td { font-weight:700; font-size:16px; border-top:2px solid #292524; border-bottom:none; }
  .footer { border-top:2px solid #e8e5e0; padding-top:20px; margin-top:30px; font-size:11px; color:#a8a093; text-align:center; line-height:1.8; }
  .footer strong { color:#78716c; }
  @media print { body { padding:20px; } }
</style></head><body>
<div class="header">
  <div><div class="brand">Ergos Continental</div><div class="brand-sub">${isES ? 'Plataforma de Reservas de Viajes' : 'Travel Booking Platform'}</div></div>
  <div><div class="doc-title">${isES ? 'FACTURA PROFORMA' : 'PROFORMA INVOICE'}</div><div class="doc-subtitle">${isES ? 'Ref' : 'Ref'}: ${ref}</div></div>
</div>
<div class="ref-bar">
  <div>${isES ? 'Fecha' : 'Date'}: <strong>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div>
  <div>${isES ? 'Estado de pago' : 'Payment Status'}: ${isES ? 'PAGADO' : 'PAID'}</div>
</div>
<div class="section"><h3>${isES ? 'Facturar a' : 'Bill To'}</h3>
<div class="grid">
  <div><div class="field-label">${isES ? 'Nombre' : 'Name'}</div><div class="field-value">${guestName}</div></div>
  <div><div class="field-label">${isES ? 'Correo' : 'Email'}</div><div class="field-value">${bookingState.guestEmail}</div></div>
</div></div>
<div class="section"><h3>${isES ? 'Detalles del Servicio' : 'Service Details'}</h3>
<table>
  <thead><tr><th>${isES ? 'Descripción' : 'Description'}</th><th>${isES ? 'Cant.' : 'Qty'}</th><th style="text-align:right">${isES ? 'Precio Unit.' : 'Unit Price'}</th><th style="text-align:right">${isES ? 'Total' : 'Total'}</th></tr></thead>
  <tbody>
    <tr style="background:#1a1a4e;color:#fff"><td colspan="4" style="padding:10px 14px;font-weight:700;font-size:14px;border-bottom:none">&#9632; ${isES ? 'ALOJAMIENTO' : 'ACCOMMODATION'}</td></tr>
    <tr><td>${bookingState.hotel} — ${bookingState.room}<br><span style="font-size:12px;color:#78716c">${bookingState.mealPlan} · ${formatDate(bookingState.checkin)} → ${formatDate(bookingState.checkout)}</span></td><td>${nights} ${isES ? 'noche' : 'night'}${nights !== 1 ? 's' : ''}</td><td class="right">${formatUSD(perNight)}</td><td class="right">${formatUSD(bookingState.price)}</td></tr>
    ${serviceTransferAdded ? `<tr style="background:#0d9488;color:#fff"><td colspan="4" style="padding:10px 14px;font-weight:700;font-size:14px;border-bottom:none">&#9654; ${isES ? 'TRANSFER' : 'TRANSFER'}</td></tr>
    <tr><td>${isES ? 'Transfer Privado' : 'Private Transfer'} — ${serviceTransferVehicle}<br><span style="font-size:12px;color:#78716c">${transferBookingState.pickup} → ${transferBookingState.dropoff}</span></td><td>1</td><td class="right">${formatPrice(serviceTransferPrice)}</td><td class="right">${formatPrice(serviceTransferPrice)}</td></tr>` : ''}
    ${serviceTransferAdded ? `<tr style="background:#f5f3f0"><td colspan="3" style="padding:10px 14px;font-size:13px;color:#57534e;border-bottom:1px solid #e8e5e0">${isES ? 'Subtotal Alojamiento' : 'Accommodation Subtotal'}</td><td class="right" style="border-bottom:1px solid #e8e5e0">${formatUSD(bookingState.price)}</td></tr>
    <tr style="background:#f5f3f0"><td colspan="3" style="padding:10px 14px;font-size:13px;color:#57534e;border-bottom:1px solid #e8e5e0">${isES ? 'Subtotal Transfer' : 'Transfer Subtotal'}</td><td class="right" style="border-bottom:1px solid #e8e5e0">${formatPrice(serviceTransferPrice)}</td></tr>` : ''}
    <tr class="total-row"><td colspan="3">${isES ? 'TOTAL A PAGAR' : 'TOTAL DUE'}</td><td class="right" style="color:#0d9488">${formatUSD(serviceTransferAdded ? parseFloat(bookingState.price) + serviceTransferPrice : parseFloat(bookingState.price))}</td></tr>
  </tbody>
</table></div>
<div class="section"><h3>${isES ? 'Información de Pago' : 'Payment Information'}</h3>
<div class="grid">
  <div><div class="field-label">${isES ? 'Método' : 'Method'}</div><div class="field-value">${isES ? 'Tarjeta de Crédito' : 'Credit Card'} (Visa ****4222)</div></div>
  <div><div class="field-label">${isES ? 'Estado' : 'Status'}</div><div class="field-value" style="color:#0d9488">${isES ? 'PAGADO EN SU TOTALIDAD' : 'PAID IN FULL'}</div></div>
</div></div>
<div class="footer">
  <strong>Ergos Continental</strong> — ${isES ? 'Esta es una factura proforma y no constituye una factura fiscal.' : 'This is a proforma invoice and does not constitute a tax invoice.'}<br>
  ${isES ? 'Generado el' : 'Generated on'} ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
</div>
</body></html>`;
}

function triggerHTMLDownload(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadVoucher() {
  const lang = document.getElementById('voucher-lang')?.value || document.getElementById('voucher-preview-lang')?.value || 'English';
  const ref = bookingState.bookingRef || 'PTA18G28E7CUANQ';
  const html = buildVoucherHTML(lang);
  triggerHTMLDownload(html, 'Voucher_' + ref + '.html');
  showToast('success', 'Voucher Downloaded', 'Booking voucher has been saved. Open it in a browser and print to PDF.');
}

function downloadProforma() {
  const lang = document.getElementById('invoice-lang')?.value || document.getElementById('invoice-preview-lang')?.value || 'English';
  const ref = bookingState.bookingRef || 'PTA18G28E7CUANQ';
  const html = buildProformaHTML(lang);
  triggerHTMLDownload(html, 'Proforma_' + ref + '.html');
  showToast('success', 'Invoice Downloaded', 'Proforma invoice has been saved. Open it in a browser and print to PDF.');
}

// ========== INLINE DOCUMENT PREVIEW ==========

function buildVoucherPreview(lang) {
  const isES = lang === 'Spanish';
  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const ref = bookingState.bookingRef || 'PTA18G28E7CUANQ';
  const guestName = bookingState.guestFirstName + ' ' + bookingState.guestLastName;
  const statusClass = bookingState.isCancelled ? 'cancelled' : 'confirmed';
  const statusText = bookingState.isCancelled ? (isES ? 'CANCELADA' : 'CANCELLED') : (isES ? 'CONFIRMADA' : 'CONFIRMED');

  return `
    ${bookingState.isCancelled ? '<div class="doc-watermark">CANCELLED</div>' : ''}
    <div class="doc-header">
      <div>
        <div class="doc-brand">Ergos Continental</div>
        <div class="doc-brand-sub">${isES ? 'Plataforma de Reservas de Viajes' : 'Travel Booking Platform'}</div>
      </div>
      <div>
        <div class="doc-title">${isES ? 'BONO DE RESERVA' : 'BOOKING VOUCHER'}</div>
        <div class="doc-subtitle">${isES ? 'Documento oficial de confirmación' : 'Official Confirmation Document'}</div>
      </div>
    </div>
    <div class="doc-ref-bar">
      <div>${isES ? 'Referencia de reserva' : 'Booking Reference'}: <strong>${ref}</strong></div>
      <div><span class="doc-status ${statusClass}">${statusText}</span></div>
    </div>
    <div class="doc-section">
      <div class="doc-section-title">${isES ? 'Información del Huésped' : 'Guest Information'}</div>
      <div class="doc-grid">
        <div><div class="doc-field-label">${isES ? 'Nombre' : 'Guest Name'}</div><div class="doc-field-value">${guestName}</div></div>
        <div><div class="doc-field-label">${isES ? 'Correo' : 'Email'}</div><div class="doc-field-value">${bookingState.guestEmail}</div></div>
      </div>
    </div>
    <div class="doc-service-block">
      <div class="doc-service-header hotel">&#9632; ${isES ? 'ALOJAMIENTO — Detalles del Hotel' : 'ACCOMMODATION — Hotel Details'}</div>
      <div class="doc-service-body">
        <div class="doc-grid">
          <div><div class="doc-field-label">${isES ? 'Hotel' : 'Hotel'}</div><div class="doc-field-value">${bookingState.hotel} ${bookingState.hotelStars}</div></div>
          <div><div class="doc-field-label">${isES ? 'Dirección' : 'Address'}</div><div class="doc-field-value">Calle 66, Miramar, Playa, Havana</div></div>
          <div><div class="doc-field-label">${isES ? 'Entrada' : 'Check-in'}</div><div class="doc-field-value">${formatDate(bookingState.checkin)}</div></div>
          <div><div class="doc-field-label">${isES ? 'Salida' : 'Check-out'}</div><div class="doc-field-value">${formatDate(bookingState.checkout)}</div></div>
          <div><div class="doc-field-label">${isES ? 'Duración' : 'Duration'}</div><div class="doc-field-value">${nights} ${isES ? 'Noche' : 'Night'}${nights !== 1 ? 's' : ''}</div></div>
          <div><div class="doc-field-label">${isES ? 'Habitación' : 'Room'}</div><div class="doc-field-value">${bookingState.room}</div></div>
          <div><div class="doc-field-label">${isES ? 'Régimen' : 'Meal Plan'}</div><div class="doc-field-value">${bookingState.mealPlan}</div></div>
          <div><div class="doc-field-label">${isES ? 'Ocupación' : 'Occupancy'}</div><div class="doc-field-value">2 ${isES ? 'Adultos' : 'Adults'}</div></div>
        </div>
      </div>
      <div class="doc-service-subtotal"><span>${isES ? 'Subtotal Alojamiento' : 'Accommodation Subtotal'}</span><span>${formatUSD(bookingState.price)}</span></div>
    </div>
    ${serviceTransferAdded ? `<div class="doc-service-block">
      <div class="doc-service-header transfer">&#9654; ${isES ? 'TRANSFER — Detalles del Transporte' : 'TRANSFER — Transport Details'}</div>
      <div class="doc-service-body">
        <div class="doc-grid">
          <div><div class="doc-field-label">${isES ? 'Ruta' : 'Route'}</div><div class="doc-field-value">${transferBookingState.pickup} → ${transferBookingState.dropoff}</div></div>
          <div><div class="doc-field-label">${isES ? 'Vehículo' : 'Vehicle'}</div><div class="doc-field-value">${serviceTransferVehicle}</div></div>
          <div><div class="doc-field-label">${isES ? 'Fecha' : 'Date'}</div><div class="doc-field-value">${formatDate(document.getElementById('svc-tf-date')?.value || transferBookingState.date)}</div></div>
          <div><div class="doc-field-label">${isES ? 'Hora' : 'Time'}</div><div class="doc-field-value">${document.getElementById('svc-tf-time')?.value || transferBookingState.time}</div></div>
          <div><div class="doc-field-label">${isES ? 'Pasajeros' : 'Passengers'}</div><div class="doc-field-value">${document.getElementById('svc-tf-pax')?.value || transferBookingState.passengers}</div></div>
          <div><div class="doc-field-label">${isES ? 'Servicio' : 'Service'}</div><div class="doc-field-value">${isES ? 'Transfer Privado' : 'Private Transfer'}</div></div>
        </div>
      </div>
      <div class="doc-service-subtotal"><span>${isES ? 'Subtotal Transfer' : 'Transfer Subtotal'}</span><span>${formatPrice(serviceTransferPrice)}</span></div>
    </div>` : ''}
    <div class="doc-policy">${isES ? 'Cancelación gratuita hasta el' : 'Free cancellation until'} ${formatDate(bookingState.checkin)}</div>
    ${serviceTransferAdded ? `<div class="doc-price-summary">
      <div class="doc-price-line"><span>${isES ? 'Alojamiento' : 'Accommodation'} (${nights} ${isES ? 'noches' : 'nights'})</span><span>${formatUSD(bookingState.price)}</span></div>
      <div class="doc-price-line"><span>${isES ? 'Transfer Privado' : 'Private Transfer'}</span><span>${formatPrice(serviceTransferPrice)}</span></div>
      <div class="doc-price-line total"><span>${isES ? 'Total a Cobrar' : 'Total Charged'}</span><span>${formatUSD(parseFloat(bookingState.price) + serviceTransferPrice)}</span></div>
    </div>` : `<div class="doc-total-bar">
      <span>${isES ? 'Precio Total del Cliente' : 'Total Client Price'}</span>
      <span class="doc-total-amount">${formatUSD(bookingState.price)}</span>
    </div>`}
    <div class="doc-footer">
      <strong>Ergos Continental</strong> — ${isES ? 'Este bono es su confirmación oficial. Preséntelo al hacer el check-in.' : 'This voucher is your official confirmation. Please present it at check-in.'}<br>
      ${isES ? 'Generado el' : 'Generated on'} ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
      ${isES ? 'Para soporte' : 'For support'}: support@ergoscontinental.com | +1-800-ERGOS
    </div>`;
}

function buildInvoicePreview(lang) {
  const isES = lang === 'Spanish';
  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const ref = bookingState.bookingRef || 'PTA18G28E7CUANQ';
  const guestName = bookingState.guestFirstName + ' ' + bookingState.guestLastName;
  const perNight = (parseFloat(bookingState.price) / nights).toFixed(2);

  return `
    <div class="doc-header">
      <div>
        <div class="doc-brand">Ergos Continental</div>
        <div class="doc-brand-sub">${isES ? 'Plataforma de Reservas de Viajes' : 'Travel Booking Platform'}</div>
      </div>
      <div>
        <div class="doc-title">${isES ? 'FACTURA PROFORMA' : 'PROFORMA INVOICE'}</div>
        <div class="doc-subtitle">${isES ? 'Ref' : 'Ref'}: ${ref}</div>
      </div>
    </div>
    <div class="doc-ref-bar">
      <div>${isES ? 'Fecha' : 'Date'}: <strong>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div>
      <div><span class="doc-status paid">${isES ? 'PAGADO' : 'PAID'}</span></div>
    </div>
    <div class="doc-section">
      <div class="doc-section-title">${isES ? 'Facturar a' : 'Bill To'}</div>
      <div class="doc-grid">
        <div><div class="doc-field-label">${isES ? 'Nombre' : 'Name'}</div><div class="doc-field-value">${guestName}</div></div>
        <div><div class="doc-field-label">${isES ? 'Correo' : 'Email'}</div><div class="doc-field-value">${bookingState.guestEmail}</div></div>
      </div>
    </div>
    <div class="doc-section">
      <div class="doc-section-title">${isES ? 'Detalles del Servicio' : 'Service Details'}</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>${isES ? 'Descripción' : 'Description'}</th>
            <th>${isES ? 'Cant.' : 'Qty'}</th>
            <th style="text-align:right">${isES ? 'Precio Unit.' : 'Unit Price'}</th>
            <th style="text-align:right">${isES ? 'Total' : 'Total'}</th>
          </tr>
        </thead>
        <tbody>
          <tr class="doc-svc-header-row hotel"><td colspan="4">&#9632; ${isES ? 'ALOJAMIENTO' : 'ACCOMMODATION'}</td></tr>
          <tr>
            <td>
              ${bookingState.hotel} — ${bookingState.room}
              <div class="doc-desc-sub">${bookingState.mealPlan} · ${formatDate(bookingState.checkin)} → ${formatDate(bookingState.checkout)}</div>
            </td>
            <td>${nights} ${isES ? 'noche' : 'night'}${nights !== 1 ? 's' : ''}</td>
            <td class="right">${formatUSD(perNight)}</td>
            <td class="right">${formatUSD(bookingState.price)}</td>
          </tr>
          ${serviceTransferAdded ? `<tr class="doc-svc-header-row transfer"><td colspan="4">&#9654; ${isES ? 'TRANSFER' : 'TRANSFER'}</td></tr>
          <tr>
            <td>
              ${isES ? 'Transfer Privado' : 'Private Transfer'} — ${serviceTransferVehicle}
              <div class="doc-desc-sub">${transferBookingState.pickup} → ${transferBookingState.dropoff}</div>
            </td>
            <td>1</td>
            <td class="right">${formatPrice(serviceTransferPrice)}</td>
            <td class="right">${formatPrice(serviceTransferPrice)}</td>
          </tr>` : ''}
          ${serviceTransferAdded ? `<tr class="doc-subtotal-row">
            <td colspan="3">${isES ? 'Subtotal Alojamiento' : 'Accommodation Subtotal'}</td>
            <td class="right">${formatUSD(bookingState.price)}</td>
          </tr>
          <tr class="doc-subtotal-row">
            <td colspan="3">${isES ? 'Subtotal Transfer' : 'Transfer Subtotal'}</td>
            <td class="right">${formatPrice(serviceTransferPrice)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td colspan="3">${isES ? 'TOTAL A PAGAR' : 'TOTAL DUE'}</td>
            <td class="right" style="color:var(--teal)">${formatUSD(serviceTransferAdded ? parseFloat(bookingState.price) + serviceTransferPrice : parseFloat(bookingState.price))}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="doc-section">
      <div class="doc-section-title">${isES ? 'Información de Pago' : 'Payment Information'}</div>
      <div class="doc-grid">
        <div><div class="doc-field-label">${isES ? 'Método' : 'Method'}</div><div class="doc-field-value">${isES ? 'Tarjeta de Crédito' : 'Credit Card'} (Visa ****4222)</div></div>
        <div><div class="doc-field-label">${isES ? 'Estado' : 'Status'}</div><div class="doc-field-value" style="color:var(--teal)">${isES ? 'PAGADO EN SU TOTALIDAD' : 'PAID IN FULL'}</div></div>
      </div>
    </div>
    <div class="doc-footer">
      <strong>Ergos Continental</strong> — ${isES ? 'Esta es una factura proforma y no constituye una factura fiscal.' : 'This is a proforma invoice and does not constitute a tax invoice.'}<br>
      ${isES ? 'Generado el' : 'Generated on'} ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </div>`;
}

function renderVoucherPreview() {
  const lang = document.getElementById('voucher-preview-lang')?.value || 'English';
  document.getElementById('voucher-preview-content').innerHTML = buildVoucherPreview(lang);
}

function renderInvoicePreview() {
  const lang = document.getElementById('invoice-preview-lang')?.value || 'English';
  document.getElementById('invoice-preview-content').innerHTML = buildInvoicePreview(lang);
}

function openVoucherPreview() {
  activeDocContext = 'hotel';
  const lang = document.getElementById('voucher-lang')?.value || 'English';
  const langSelect = document.getElementById('voucher-preview-lang');
  if (langSelect) langSelect.value = lang;
  renderVoucherPreview();
  showScreen('voucher');
}

function openInvoicePreview() {
  activeDocContext = 'hotel';
  const lang = document.getElementById('invoice-lang')?.value || 'English';
  const langSelect = document.getElementById('invoice-preview-lang');
  if (langSelect) langSelect.value = lang;
  renderInvoicePreview();
  showScreen('invoice');
}

function goBackFromDoc() {
  showScreen('booking-detail');
}

function printDocPreview(type) {
  window.print();
}

let activeDocContext = 'hotel';


// ========== AGENCY MARKUP CONFIGURATION ==========

const agencyMarkupState = { percentage: 15, lastUpdated: null };

const markupSampleVehicles = [
  { vehicle: 'Toyota Corolla', class: 'Economy', net: 28.00 },
  { vehicle: 'VW Passat', class: 'Standard', net: 38.00 },
  { vehicle: 'Mercedes E-Class', class: 'Business', net: 45.00 },
  { vehicle: 'Mercedes V-Class', class: 'First Class', net: 85.00 },
  { vehicle: 'Yutong Minibus', class: 'Economy', net: 120.00 },
];

function updateMarkupPreview() {
  const slider = document.getElementById('markup-slider');
  const input = document.getElementById('markup-input');
  if (!slider || !input) return;  // markup widget lives in #screen-markup-rules only
  const pct = parseFloat(slider.value) || 0;
  input.value = pct;
  agencyMarkupState.percentage = pct;

  const rateEl = document.getElementById('markup-current-rate');
  if (rateEl) rateEl.textContent = pct + '%';

  const tbody = document.getElementById('markup-preview-body');
  if (!tbody) return;
  tbody.innerHTML = markupSampleVehicles.map(v => {
    const markup = (v.net * pct / 100);
    const client = v.net + markup;
    return '<tr>' +
      '<td>' + v.vehicle + '</td>' +
      '<td>' + v.class + '</td>' +
      '<td class="right">' + formatPrice(v.net) + '</td>' +
      '<td class="right" style="color:var(--accent)">+' + formatPrice(markup) + '</td>' +
      '<td class="right" style="font-weight:700;color:var(--teal)">' + formatPrice(client) + '</td>' +
    '</tr>';
  }).join('');
}

function syncMarkupSlider(val) {
  const slider = document.getElementById('markup-slider');
  if (slider) slider.value = val;
  updateMarkupPreview();
}

function saveMarkupSettings() {
  agencyMarkupState.lastUpdated = nowFormatted();
  const el = document.getElementById('markup-last-updated');
  if (el) el.textContent = agencyMarkupState.lastUpdated;
  showToast('success', 'Settings Saved', 'Transfer markup set to ' + agencyMarkupState.percentage + '%. Prices will update on next search.');
}

function applyMarkup(netPrice) {
  return netPrice * (1 + agencyMarkupState.percentage / 100);
}

// Initial render of markup preview
document.addEventListener('DOMContentLoaded', () => {
  updateMarkupPreview();
  // Inject currency selector into services screen navbar (hotel prices come from GDS in their own currency)
  const transferScreenIds = ['screen-services'];
  transferScreenIds.forEach(screenId => {
    const screen = document.getElementById(screenId);
    if (!screen) return;
    const navRight = screen.querySelector('.nav-right');
    if (!navRight || navRight.querySelector('.currency-selector')) return;
    const select = document.createElement('select');
    select.className = 'currency-selector';
    select.onchange = function() { setCurrency(this.value); };
    ['USD','EUR','GBP','MXN','BRL','COP','ARS','CLP'].forEach(code => {
      const opt = document.createElement('option');
      opt.value = code; opt.textContent = code;
      if (code === currencyState.selected) opt.selected = true;
      select.appendChild(opt);
    });
    navRight.insertBefore(select, navRight.firstChild);
  });
  // Render bookings list on load
  renderBookingsList();
});
// Also render immediately in case DOMContentLoaded already fired
if (document.readyState !== 'loading') { updateMarkupPreview(); renderBookingsList(); }

// ========== TRANSFER BOOKING STATE (used by cross-sell voucher/invoice generation) ==========

const transferBookingState = {
  pickup: 'Jose Marti Intl Airport (HAV)',
  dropoff: 'Gran Muthu Habana, Miramar',
  date: '2026-03-25',
  time: '14:30',
  passengers: 2,
  vehicle: 'Mercedes E-Class',
  vehicleClass: 'Business',
  price: '45.00',
  supplier: 'Sixt Ride',
  passengerFirstName: 'Testing',
  passengerLastName: 'Guest',
  passengerEmail: 'mayankjariwala1994@gmail.com',
  airline: 'Iberia',
  flightNumber: 'IB 6313',
  bookingRef: null
};

// ========== PAYMENT METHOD SELECTION ==========

document.querySelectorAll('.payment-method-option').forEach(opt => {
  opt.addEventListener('click', () => {
    opt.closest('.form-card').querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  });
});

// ========== HOTEL RESULTS EMPTY STATE ==========

// Patch the existing hotel filter to show/hide empty state
(function patchHotelFilters() {
  const resultsList = document.getElementById('results-list');
  const emptyState = document.getElementById('hotel-results-empty');
  if (!resultsList || !emptyState) return;

  const observer = new MutationObserver(() => {
    const cards = resultsList.querySelectorAll('.hotel-card');
    const visibleCount = Array.from(cards).filter(c => c.style.display !== 'none').length;
    emptyState.style.display = visibleCount === 0 ? '' : 'none';
  });
  observer.observe(resultsList, { attributes: true, subtree: true, attributeFilter: ['style'] });
})();

function resetHotelFilters() {
  const nameInput = document.getElementById('filter-hotel-name');
  const priceRange = document.getElementById('filter-price-range');
  const priceLabel = document.getElementById('filter-price-label');
  const sortSelect = document.getElementById('filter-sort');
  if (nameInput) nameInput.value = '';
  if (priceRange) priceRange.value = 2000;
  if (priceLabel) priceLabel.textContent = '$2,000+';
  if (sortSelect) sortSelect.value = 'price-asc';
  document.querySelectorAll('.filter-star, .filter-meal').forEach(cb => cb.checked = false);
  const allRadio = document.querySelector('.filter-refund[value="all"]');
  if (allRadio) allRadio.checked = true;
  // Re-show all cards
  document.querySelectorAll('#results-list .hotel-card').forEach(c => c.style.display = '');
  const count = document.getElementById('results-count');
  if (count) count.textContent = document.querySelectorAll('#results-list .hotel-card').length + ' hotels found in Havana, Cuba';
  const empty = document.getElementById('hotel-results-empty');
  if (empty) empty.style.display = 'none';
}

// ========== DATE CROSS-VALIDATION & NIGHTS CHIP ==========

(function initDateValidation() {
  const checkin = document.getElementById('home-checkin');
  const checkout = document.getElementById('home-checkout');
  const chip = document.getElementById('nights-chip');
  if (!checkin || !checkout || !chip) return;

  function updateNights() {
    const ci = new Date(checkin.value);
    const co = new Date(checkout.value);
    const nights = Math.round((co - ci) / (1000 * 60 * 60 * 24));
    if (nights > 0) {
      chip.textContent = nights + ' Night' + (nights !== 1 ? 's' : '');
      chip.style.background = 'var(--teal)';
    } else {
      chip.textContent = 'Invalid';
      chip.style.background = 'var(--red-500)';
    }
  }

  checkin.addEventListener('change', () => {
    const ci = new Date(checkin.value);
    const co = new Date(checkout.value);
    if (co <= ci) {
      const next = new Date(ci);
      next.setDate(next.getDate() + 1);
      checkout.value = next.toISOString().split('T')[0];
    }
    updateNights();
  });

  checkout.addEventListener('change', () => {
    const ci = new Date(checkin.value);
    const co = new Date(checkout.value);
    if (co <= ci) {
      checkout.value = checkin.value;
      const next = new Date(ci);
      next.setDate(next.getDate() + 1);
      checkout.value = next.toISOString().split('T')[0];
    }
    updateNights();
  });

  updateNights();
})();

// ========== SEARCH AUTOCOMPLETE ==========

// E1 — POI-aware location search (USER_STORIES E1). Extends the destination
// typeahead with Landmarks/POIs that carry country + coordinates. When a POI
// is picked, the search results page sorts the hotel cards by walking
// distance from the POI and shows a "X.X km from <POI>" badge on each card.
//
// Live-system version uses Google Places (Session-billed, free up to 10k
// picks/mo) for the live autocomplete; here in the prototype we hardcode a
// representative sample of POIs across the markets Ergos serves.
window.E1_SELECTED_POI = null;

const E1_POIS = [
  // Colombia
  { type: 'Places',  name: 'Plaza de Bolívar, Bogotá',         sub: 'Historic centre · Colombia', country: 'CO', lat: 4.5981,  lng: -74.0758 },
  { type: 'Places',  name: 'Zona T, Bogotá',                   sub: 'Nightlife district · Colombia', country: 'CO', lat: 4.6675,  lng: -74.0535 },
  { type: 'Places',  name: 'Ciudad Amurallada, Cartagena',     sub: 'UNESCO old town · Colombia', country: 'CO', lat: 10.4231, lng: -75.5519 },
  { type: 'Places',  name: 'Comuna 13, Medellín',              sub: 'Cultural district · Colombia', country: 'CO', lat: 6.2702,  lng: -75.6157 },
  // Cuba
  { type: 'Places',  name: 'Plaza Vieja, Habana Vieja',        sub: 'Colonial square · Cuba',     country: 'CU', lat: 23.1338, lng: -82.3491 },
  { type: 'Places',  name: 'Malecón, Havana',                  sub: 'Seafront promenade · Cuba',  country: 'CU', lat: 23.1448, lng: -82.3650 },
  // Dominican Republic
  { type: 'Places',  name: 'Zona Colonial, Santo Domingo',     sub: 'UNESCO old town · DR',       country: 'DO', lat: 18.4733, lng: -69.8851 },
  // Mexico
  { type: 'Places',  name: 'Zócalo, Ciudad de México',         sub: 'Main square · Mexico',       country: 'MX', lat: 19.4326, lng: -99.1332 },
];

(function initAutocomplete() {
  const input = document.getElementById('dest-input');
  const dropdown = document.getElementById('dest-autocomplete');
  if (!input || !dropdown) return;

  const suggestions = [
    { type: 'Cities', name: 'Havana, Cuba',        sub: '249 hotels',   country: 'CU' },
    { type: 'Cities', name: 'Varadero, Cuba',      sub: '87 hotels',    country: 'CU' },
    { type: 'Cities', name: 'Cancun, Mexico',      sub: '342 hotels',   country: 'MX' },
    { type: 'Cities', name: 'Bogotá, Colombia',    sub: '186 hotels',   country: 'CO' },
    { type: 'Cities', name: 'Cartagena, Colombia', sub: '124 hotels',   country: 'CO' },
    { type: 'Cities', name: 'Medellín, Colombia',  sub: '93 hotels',    country: 'CO' },
    { type: 'Cities', name: 'Punta Cana, Dominican Republic', sub: '198 hotels', country: 'DO' },
    ...E1_POIS,  // landmarks / touristic places — carry country + lat/lng
    { type: 'Hotels', name: 'Gran Muthu Habana',       sub: 'Miramar, Havana' },
    { type: 'Hotels', name: 'Hotel Nacional de Cuba',  sub: 'Vedado, Havana' },
    { type: 'Hotels', name: 'Iberostar Varadero',      sub: 'Varadero' },
    { type: 'Regions', name: 'Caribbean Coast',        sub: '1,240 hotels' },
  ];

  function render(query) {
    const q = query.toLowerCase();
    const filtered = q.length === 0 ? suggestions : suggestions.filter(s => s.name.toLowerCase().includes(q));
    if (filtered.length === 0) { dropdown.classList.remove('show'); return; }

    let html = '';
    let lastType = '';
    filtered.forEach((s, idx) => {
      if (s.type !== lastType) {
        lastType = s.type;
        html += '<div class="ac-group-label">' + s.type + '</div>';
      }
      const highlighted = q.length > 0
        ? s.name.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>')
        : s.name;
      // POI rows get a distinct landmark icon + carry data-lat/lng/country for E1.
      // City rows ALSO carry data-country so picking a city filters by country
      // without engaging the proximity-sort + POI banner.
      const isPoi = s.type === 'Places';
      const hasCountry = !!s.country;
      const icon = isPoi
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>';
      html += '<div class="ac-item' + (isPoi ? ' ac-item-poi' : '') + '" data-idx="' + idx + '" data-value="' + s.name + '"' +
        (hasCountry ? ' data-country="' + s.country + '"' : '') +
        (isPoi ? ' data-poi="1" data-lat="' + s.lat + '" data-lng="' + s.lng + '"' : '') +
        '>' +
        '<span class="ac-item-icon">' + icon + '</span>' +
        '<span>' + highlighted + '</span>' +
        '<span class="ac-item-sub">' + s.sub + '</span>' +
        '</div>';
    });
    dropdown.innerHTML = html;
    dropdown.classList.add('show');

    dropdown.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.dataset.value;
        dropdown.classList.remove('show');
        // POI selection → proximity mode (adds banner + badges + distance sort)
        if (item.dataset.poi === '1') {
          window.E1_SELECTED_POI = {
            name: item.dataset.value,
            country: item.dataset.country,
            lat: parseFloat(item.dataset.lat),
            lng: parseFloat(item.dataset.lng),
          };
          window.E1_DESTINATION_COUNTRY = item.dataset.country;
          protoToast && protoToast('Searching hotels near ' + item.dataset.value, 1800);
        } else {
          // City / Region selection → country filter only (no banner, no proximity)
          window.E1_SELECTED_POI = null;
          window.E1_DESTINATION_COUNTRY = item.dataset.country || null;
        }
      });
    });
  }

  input.addEventListener('focus', () => render(input.value));
  input.addEventListener('input', () => render(input.value));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-field-destination')) dropdown.classList.remove('show');
  });
})();

// E1 — apply POI proximity sort + "X km from <POI>" badges to the results
// page. Called whenever the results screen becomes active (see showScreen
// patch below). Computes mock distances against fabricated hotel coordinates
// keyed off the card's data-name — in production this would come from the
// backend's GET /hotels/near?lat=&lng=&country= endpoint.
function e1HotelCoords(card) {
  // Hash the hotel name → stable pseudo-coordinates clustered around the POI.
  // Real implementation reads card.dataset.lat / data-lng populated by the
  // backend. This keeps the prototype self-contained without persisting
  // coordinates per card in the HTML.
  const name = card.dataset.name || '';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i) | 0;
  const poi = window.E1_SELECTED_POI;
  if (!poi) return null;
  // Spread hotels within ±0.05° (~5 km) of the POI, deterministically
  const dLat = ((h & 0xff) - 128) / 2560;
  const dLng = (((h >> 8) & 0xff) - 128) / 2560;
  return { lat: poi.lat + dLat, lng: poi.lng + dLng };
}

function e1HaversineKm(a, b) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const x = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Best-effort country parse from a free-text destination string (e.g., user
// typed "colombia" and hit search without picking from the dropdown). Matches
// against the same suggestions list the autocomplete uses, so the mappings
// stay in one place.
function e1ParseCountryFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  // Country name → ISO code
  const countryMap = {
    'cuba': 'CU', 'colombia': 'CO', 'dominican republic': 'DO', 'república dominicana': 'DO',
    'mexico': 'MX', 'méxico': 'MX',
  };
  for (const [name, iso] of Object.entries(countryMap)) {
    if (t.includes(name)) return iso;
  }
  // City keyword → country (fast lookup for the prototype's known cities)
  const cityMap = {
    'havana': 'CU', 'habana': 'CU', 'varadero': 'CU',
    'bogotá': 'CO', 'bogota': 'CO', 'cartagena': 'CO', 'medellín': 'CO', 'medellin': 'CO',
    'punta cana': 'DO', 'santo domingo': 'DO',
    'cancun': 'MX', 'cancún': 'MX',
  };
  for (const [name, iso] of Object.entries(cityMap)) {
    if (t.includes(name)) return iso;
  }
  return null;
}

function e1ApplyToResults() {
  const poi = window.E1_SELECTED_POI;
  const resultsList = document.getElementById('results-list');
  const countEl = document.getElementById('results-count');
  if (!resultsList) return;

  // Reset prior E1 state (idempotent — handles re-entry on screen change)
  resultsList.querySelectorAll('.e1-distance-badge').forEach(el => el.remove());
  const oldNotice = document.getElementById('e1-notice');
  if (oldNotice) oldNotice.remove();
  const oldBanner = document.getElementById('e1-in-dev-banner');
  if (oldBanner) oldBanner.remove();
  // Restore visibility of ALL hotel cards (clearing any prior country filter)
  resultsList.querySelectorAll('.hotel-card').forEach(c => { c.style.display = ''; });

  // Determine the target country from THREE sources in priority order:
  // 1. POI selection (carries country + lat/lng)
  // 2. City/Region autocomplete selection (E1_DESTINATION_COUNTRY)
  // 3. Free-text input parse (e.g., user typed "Colombia" without picking)
  let targetCountry = poi?.country || window.E1_DESTINATION_COUNTRY || null;
  if (!targetCountry) {
    const input = document.getElementById('dest-input');
    targetCountry = e1ParseCountryFromText(input?.value);
    if (targetCountry) window.E1_DESTINATION_COUNTRY = targetCountry;
  }

  // No country signal at all — baseline behaviour (everything visible)
  if (!targetCountry) {
    if (countEl && !countEl.textContent.match(/hotels found/)) {
      countEl.textContent = document.querySelectorAll('#results-list .hotel-card').length + ' hotels found';
    }
    return;
  }

  // Apply country filter (always — for POI, City, and free-text paths)
  const allCards = Array.from(resultsList.querySelectorAll('.hotel-card'));
  const inCountry = allCards.filter(c => c.dataset.country === targetCountry);
  const outOfCountry = allCards.filter(c => c.dataset.country !== targetCountry);
  outOfCountry.forEach(c => { c.style.display = 'none'; });

  // Heading reflects country-scoped count even without POI (e.g., "5 hotels in CO")
  if (countEl && !poi) {
    const countryName = { CU: 'Cuba', CO: 'Colombia', DO: 'Dominican Republic', MX: 'Mexico' }[targetCountry] || targetCountry;
    countEl.textContent = inCountry.length + ' hotels in ' + countryName;
  }

  // City / free-text path stops here — no banner, no badges, no proximity sort.
  // The E1 enhancements below are POI-only.
  if (!poi) {
    // Still re-append hidden cards to the end so visible order is clean
    outOfCountry.forEach(card => resultsList.appendChild(card));
    return;
  }

  // Compute distance for in-country cards, sort ascending
  const measured = inCountry.map(card => {
    const coords = e1HotelCoords(card);
    const km = coords ? e1HaversineKm(poi, coords) : 999;
    return { card, km };
  }).sort((a, b) => a.km - b.km);

  // Re-order DOM by distance (visible cards first, hidden cards at the end)
  measured.forEach(({ card }) => resultsList.appendChild(card));
  outOfCountry.forEach(card => resultsList.appendChild(card));

  // Annotate each visible card with a teal "X.X km from <POI>" badge
  measured.forEach(({ card, km }) => {
    const badge = document.createElement('div');
    badge.className = 'e1-distance-badge';
    badge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>' +
      ' <strong>' + km.toFixed(1) + ' km</strong> from ' + poi.name.split(',')[0];
    const titleArea = card.querySelector('.hotel-card-name, .hotel-name, h3, h2') || card.firstChild;
    if (titleArea && titleArea.parentNode) {
      titleArea.parentNode.insertBefore(badge, titleArea.nextSibling);
    } else {
      card.prepend(badge);
    }
  });

  // Update heading to reflect the country-scoped count
  if (countEl) {
    countEl.textContent = 'Hotels near ' + poi.name + ' (' + measured.length + ' within 5 km in ' + poi.country + ')';
  }

  // Inject the red "Functionality In Development" banner — E1 is entirely
  // prototype-only (no Mapbox/Google integration, no MongoDB 2dsphere index,
  // no /hotels/near endpoint). Banner only appears when E1 mode is engaged;
  // the rest of the results page ships as-is.
  const banner = document.createElement('div');
  banner.id = 'e1-in-dev-banner';
  banner.className = 'in-dev-banner';
  banner.innerHTML =
    '<div class="in-dev-icon"><i class="ti ti-tool"></i></div>' +
    '<div class="in-dev-body">' +
      '<div class="in-dev-title">Functionality In Development</div>' +
      '<div class="in-dev-msg"><strong>POI-aware location search (E1)</strong> is not yet in production. The backend <code>/hotels/near</code> endpoint, MongoDB 2dsphere index, and Google Places live autocomplete are still being designed — see ' +
      '<a href="https://github.com/lukzen/documentation/issues/17" target="_blank">USER_STORIES E1 (#17)</a> and ' +
      '<a href="../../../technical/2-architecture/adr/002-poi-autocomplete-provider.md" target="_blank">ADR-002</a>.' +
      ' Flows being prototyped:' +
      '<ul>' +
        '<li>Landmarks group in the destination typeahead with country + lat/lng on each suggestion</li>' +
        '<li>Country-scoped proximity search — picking a Bogotá POI hides Cuba hotels even if mock distances would place them within radius</li>' +
        '<li>Per-card distance badges + heading "Hotels near &lt;POI&gt;"</li>' +
        '<li>"Clear" fallback to standard search without losing the original list</li>' +
      '</ul></div>' +
    '</div>';
  resultsList.parentElement.insertBefore(banner, resultsList);

  // Insert the teal notice strip below the banner
  const notice = document.createElement('div');
  notice.id = 'e1-notice';
  notice.className = 'e1-notice';
  notice.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>' +
    ' Showing hotels sorted by walking distance from <strong>' + poi.name + '</strong>. ' +
    '<a href="#" onclick="e1ClearPoi(event)" class="e1-clear-link">Clear and show all hotels</a>';
  resultsList.parentElement.insertBefore(notice, resultsList);
}

function e1ClearPoi(ev) {
  if (ev) ev.preventDefault();
  window.E1_SELECTED_POI = null;
  const input = document.getElementById('dest-input');
  if (input) input.value = '';
  e1ApplyToResults();
}

// Hook into the existing showScreen() to apply E1 whenever results become active.
(function hookShowScreen() {
  const original = window.showScreen;
  if (typeof original !== 'function') return;
  window.showScreen = function (id) {
    const r = original.apply(this, arguments);
    if (id === 'results') setTimeout(e1ApplyToResults, 60);
    return r;
  };
})();

// ========== FORM VALIDATION ==========

function validateForm(formCard) {
  let valid = true;
  formCard.querySelectorAll('.form-input[required], .form-input').forEach(input => {
    const errEl = input.parentElement.querySelector('.form-error');
    if (!input.value.trim()) {
      input.classList.add('error');
      if (errEl) errEl.classList.add('show');
      valid = false;
    } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      input.classList.add('error');
      if (errEl) { errEl.textContent = 'Please enter a valid email'; errEl.classList.add('show'); }
      valid = false;
    } else {
      input.classList.remove('error');
      if (errEl) errEl.classList.remove('show');
    }
  });
  return valid;
}

// Clear error state on input
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('form-input') && e.target.classList.contains('error')) {
    e.target.classList.remove('error');
    const errEl = e.target.parentElement.querySelector('.form-error');
    if (errEl) errEl.classList.remove('show');
  }
});

// ========== F1 — DECOUPLED HOTEL + TRANSPORT BOOKING ==========
// USER_STORIES F1 (issue #23). Hotel and Mozio transportation are independent
// confirm/pay lifecycles. When the agency confirms the hotel without yet
// confirming the transfer, the transfer is saved as "pending" with a 48-hour
// expiry from the hotel's paidAt timestamp. Prototype-only — backend
// support, scheduled expiry job, and reminder pipeline are aspirational.

window.F1_TRANSPORT_PENDING = false;
window.F1_HOTEL_PAID_AT = null;        // ms epoch — set on confirmHotelOnly
let _f1CountdownInterval = null;

// Agency staff: confirm hotel now, save the transfer quote for up to 48 h.
// Delegates to confirmBooking() (which populates the confirmation screen +
// triggers showScreen('confirmation')), and the F1 hook on showScreen renders
// the two-lane status block + in-dev banner when F1_TRANSPORT_PENDING is set.
function confirmHotelOnly() {
  if (!serviceTransferAdded) {
    // No transfer to defer — falls through to the normal flow
    return confirmBooking();
  }
  window.F1_TRANSPORT_PENDING = true;
  window.F1_HOTEL_PAID_AT = Date.now();
  protoToast && protoToast('Hotel confirmed. Transfer quote saved — customer has 48 h to complete it.', 2400);
  confirmBooking();
}

// Hook into the confirmation render — show the F1 status block + banner if mode active
function f1RenderOnConfirmation() {
  const block = document.getElementById('f1-status-block');
  const banner = document.getElementById('f1-in-dev-banner');
  const transferSection = document.getElementById('conf-transfer-section');
  if (!block || !banner) return;
  if (window.F1_TRANSPORT_PENDING) {
    block.style.display = 'flex';
    banner.style.display = 'flex';
    // Hide the bundled "Transfer Details" section since the transport lane covers it
    if (transferSection) transferSection.style.display = 'none';
    // Update confirmation heading to reflect partial confirmation
    const h1 = document.getElementById('conf-heading');
    const sub = document.getElementById('conf-subheading');
    if (h1) h1.textContent = 'Hotel confirmed!';
    if (sub) sub.textContent = 'Customer can come back within 48 hours to complete the transfer at the saved price.';
    f1StartCountdown();
  } else {
    block.style.display = 'none';
    banner.style.display = 'none';
  }
}

// Countdown ticker — shows hours/minutes remaining in the 48h window
function f1StartCountdown() {
  if (_f1CountdownInterval) clearInterval(_f1CountdownInterval);
  const update = () => {
    const el = document.getElementById('f1-countdown');
    if (!el || !window.F1_HOTEL_PAID_AT) return;
    const expiresAt = window.F1_HOTEL_PAID_AT + (48 * 60 * 60 * 1000);
    const ms = expiresAt - Date.now();
    if (ms <= 0) {
      el.textContent = 'Expired';
      el.classList.add('f1-countdown-expired');
      clearInterval(_f1CountdownInterval);
      const lane = document.querySelector('.f1-lane-transport');
      if (lane) {
        lane.classList.remove('f1-lane-pending');
        lane.classList.add('f1-lane-expired');
        const s = lane.querySelector('.f1-lane-status');
        if (s) { s.textContent = '✗ Expired — re-quote required'; s.className = 'f1-lane-status f1-status-expired'; }
      }
      return;
    }
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    el.textContent = `${h} h ${m} min`;
  };
  update();
  // Tick every 30 seconds (prototype — production would use a timer-anchored render)
  _f1CountdownInterval = setInterval(update, 30000);
}

// "Confirm transfer now" button handler — completes the transport lane
function f1ConfirmTransferNow() {
  protoToast && protoToast('Re-quoting Mozio at current price… confirmed.', 1800);
  if (_f1CountdownInterval) { clearInterval(_f1CountdownInterval); _f1CountdownInterval = null; }
  const lane = document.querySelector('.f1-lane-transport');
  if (lane) {
    lane.classList.remove('f1-lane-pending', 'f1-lane-expired');
    lane.classList.add('f1-lane-paid');
    const s = lane.querySelector('.f1-lane-status');
    if (s) { s.textContent = '✓ Confirmed & Paid'; s.className = 'f1-lane-status f1-status-paid'; }
    const cd = lane.querySelector('.f1-lane-body span:nth-child(2)');
    if (cd) cd.innerHTML = 'Ref <code>MOZIO-RSV-4938-K2</code>';
    const btn = lane.querySelector('.f1-confirm-now-btn');
    if (btn) btn.remove();
  }
  window.F1_TRANSPORT_PENDING = false;
}

// Show the F1 "Confirm hotel only" alternative button on the payment screen
// when a transfer has been added (so the agency staff has a real choice)
function f1UpdatePaymentScreenAlternative() {
  const altBtn = document.getElementById('pay-confirm-hotel-only');
  const altHint = document.getElementById('pay-f1-hint');
  if (!altBtn || !altHint) return;
  const show = !!serviceTransferAdded;
  altBtn.style.display = show ? '' : 'none';
  altHint.style.display = show ? '' : 'none';
}

// Hook into showScreen to render F1 on confirmation arrival + show CTA on payment
(function f1HookShowScreen() {
  const orig = window.showScreen;
  if (typeof orig !== 'function') return;
  window.showScreen = function (id) {
    const r = orig.apply(this, arguments);
    if (id === 'confirmation') setTimeout(f1RenderOnConfirmation, 50);
    if (id === 'payment') setTimeout(f1UpdatePaymentScreenAlternative, 50);
    return r;
  };
})();

// ========== COMBINED BOOKING (ADD SERVICES) ==========

// Track whether a transfer has been added to the hotel booking
let serviceTransferAdded = false;
let serviceTransferVehicle = null;
let serviceTransferPrice = 0;

function toggleServiceConfig(type) {
  if (type !== 'transfer') return;
  const card = document.getElementById('svc-transfer-card');
  const config = document.getElementById('svc-transfer-config');
  card.classList.toggle('active');
  config.classList.toggle('open');
}

let transferMode = 'oneway';

function setTransferMode(mode) {
  transferMode = mode;
  document.getElementById('mode-oneway').classList.toggle('active', mode === 'oneway');
  document.getElementById('mode-roundtrip').classList.toggle('active', mode === 'roundtrip');
  document.getElementById('svc-return-row').style.display = mode === 'roundtrip' ? '' : 'none';
}

function setModifyTransferMode(mode) {
  transferMode = mode;
  document.getElementById('modify-mode-oneway').classList.toggle('active', mode === 'oneway');
  document.getElementById('modify-mode-roundtrip').classList.toggle('active', mode === 'roundtrip');
  document.getElementById('modify-return-row').style.display = mode === 'roundtrip' ? '' : 'none';
}

function swapServiceLocations() {
  const pickup = document.getElementById('svc-pickup');
  const dropoff = document.getElementById('svc-dropoff');
  const tmp = pickup.value;
  pickup.value = dropoff.value;
  dropoff.value = tmp;
}

function searchServiceTransfers() {
  const resultsDiv = document.getElementById('svc-tf-results');
  const selectedDiv = document.getElementById('svc-tf-selected');
  // Reset selection
  document.querySelectorAll('.vehicle-card').forEach(c => {
    c.classList.remove('selected');
    const btn = c.querySelector('.vc-add-btn');
    if (btn) btn.textContent = '+ Add';
  });
  selectedDiv.style.display = 'none';
  // Show results with a brief delay to simulate search
  resultsDiv.style.display = 'none';
  const btn = document.querySelector('.svc-search-btn');
  const origText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-sm"></span> Searching...';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = origText;
    btn.disabled = false;
    resultsDiv.style.display = 'block';
    applyMarkupToServiceCards();
    // Update count
    const count = document.getElementById('svc-tf-count');
    const cards = document.querySelectorAll('.vehicle-card');
    if (count) count.textContent = cards.length + ' vehicles found';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1200);
}

function selectServiceVehicle(card) {
  // Toggle selection
  const wasSelected = card.classList.contains('selected');
  // Deselect all cards and reset buttons
  document.querySelectorAll('.vehicle-card').forEach(c => {
    c.classList.remove('selected');
    const btn = c.querySelector('.vc-add-btn');
    if (btn) btn.textContent = '+ Add';
  });

  const selectedDiv = document.getElementById('svc-tf-selected');
  const selectedText = document.getElementById('svc-tf-selected-text');
  const osTransfer = document.getElementById('svc-os-transfer');
  const osVehicle = document.getElementById('svc-os-vehicle');
  const osTfPrice = document.getElementById('svc-os-tf-price');
  const osTotal = document.getElementById('svc-os-total');
  const skipBtn = document.querySelector('.svc-skip-btn');
  const continueBtn = document.getElementById('svc-continue-btn');

  if (wasSelected) {
    // Deselect
    serviceTransferAdded = false;
    serviceTransferVehicle = null;
    serviceTransferPrice = 0;
    selectedDiv.style.display = 'none';
    osTransfer.style.display = 'none';
    osTotal.textContent = formatUSD(parseFloat(bookingState.price));
    skipBtn.style.display = '';
    continueBtn.style.display = 'none';
  } else {
    card.classList.add('selected');
    const addBtn = card.querySelector('.vc-add-btn');
    if (addBtn) addBtn.textContent = '\u2713 Added';
    const name = card.querySelector('.vc-name').textContent;
    const price = parseFloat(card.dataset.price);
    serviceTransferAdded = true;
    serviceTransferVehicle = name;
    serviceTransferPrice = price;

    selectedText.textContent = name + ' — ' + formatPrice(price);
    selectedDiv.style.display = 'flex';

    // Update sidebar
    osTransfer.style.display = 'block';
    osVehicle.textContent = name;
    osTfPrice.textContent = formatPrice(price);
    const total = parseFloat(bookingState.price) + price;
    osTotal.textContent = formatUSD(total);

    // Switch buttons
    skipBtn.style.display = 'none';
    continueBtn.style.display = '';
  }
}

function removeServiceTransfer() {
  serviceTransferAdded = false;
  serviceTransferVehicle = null;
  serviceTransferPrice = 0;
  document.querySelectorAll('.vehicle-card').forEach(c => {
    c.classList.remove('selected');
    const btn = c.querySelector('.vc-add-btn');
    if (btn) btn.textContent = '+ Add';
  });
  document.getElementById('svc-tf-selected').style.display = 'none';
  document.getElementById('svc-os-transfer').style.display = 'none';
  document.getElementById('svc-os-total').textContent = formatUSD(parseFloat(bookingState.price));
  document.querySelector('.svc-skip-btn').style.display = '';
  document.getElementById('svc-continue-btn').style.display = 'none';
}

function skipServices() {
  serviceTransferAdded = false;
  serviceTransferVehicle = null;
  serviceTransferPrice = 0;
  updatePaymentForServices();
  showScreen('payment');
}

function continueWithServices() {
  updatePaymentForServices();
  showScreen('payment');
}

function updatePaymentForServices() {
  const payTransfer = document.getElementById('pay-os-transfer');
  const payTotal = document.getElementById('pay-os-total');
  const summaryTitle = document.getElementById('pay-summary-title');

  if (serviceTransferAdded) {
    payTransfer.style.display = 'block';
    document.getElementById('pay-os-route').textContent =
      document.getElementById('svc-pickup').value.split('(')[0].trim() + ' → Hotel';
    document.getElementById('pay-os-tf-price').textContent = formatPrice(serviceTransferPrice);
    const total = parseFloat(bookingState.price) + serviceTransferPrice;
    payTotal.textContent = formatUSD(total);
    summaryTitle.textContent = 'Trip Summary';
  } else {
    payTransfer.style.display = 'none';
    payTotal.textContent = formatUSD(bookingState.price);
    summaryTitle.textContent = 'Booking Summary';
  }
}

// Override confirmBooking to handle combined bookings
(function() {
  const _origConfirm = confirmBooking;
  confirmBooking = function() {
    // Capture guest info
    const guestScreen = document.getElementById('screen-guest');
    const inputs = guestScreen.querySelectorAll('.form-input');
    if (inputs[0]) bookingState.guestFirstName = inputs[0].value;
    if (inputs[1]) bookingState.guestLastName = inputs[1].value;
    if (inputs[2]) bookingState.guestEmail = inputs[2].value;

    bookingState.bookingRef = generateBookingRef();
    bookingState.confirmationDate = nowFormatted();
    bookingState.isCancelled = false;

    const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
    const guestName = bookingState.guestFirstName + ' ' + bookingState.guestLastName;

    // Populate confirmation
    document.getElementById('conf-ref').textContent = bookingState.bookingRef;
    document.getElementById('conf-date').textContent = bookingState.confirmationDate;
    document.getElementById('conf-hotel').textContent = bookingState.hotel + ' ' + bookingState.hotelStars;
    document.getElementById('conf-room').textContent = bookingState.room;
    document.getElementById('conf-meal').textContent = bookingState.mealPlan;
    document.getElementById('conf-checkin').textContent = formatDate(bookingState.checkin);
    document.getElementById('conf-checkout').textContent = formatDate(bookingState.checkout);
    document.getElementById('conf-duration').textContent = nights + ' Night' + (nights !== 1 ? 's' : '');
    document.getElementById('conf-guest-name').textContent = guestName;
    document.getElementById('conf-guest-email').textContent = bookingState.guestEmail;

    // Handle combined booking
    const confTfSection = document.getElementById('conf-transfer-section');
    const confBreakdown = document.getElementById('conf-breakdown');
    const confHeading = document.getElementById('conf-heading');
    const confSubheading = document.getElementById('conf-subheading');

    if (serviceTransferAdded) {
      const totalPrice = parseFloat(bookingState.price) + serviceTransferPrice;
      document.getElementById('conf-price').textContent = formatUSD(totalPrice);

      // Show transfer section
      confTfSection.style.display = '';
      document.getElementById('conf-tf-route').textContent =
        document.getElementById('svc-pickup').value + ' → ' + document.getElementById('svc-dropoff').value;
      document.getElementById('conf-tf-vehicle').textContent = serviceTransferVehicle;
      const tfDate = document.getElementById('svc-tf-date').value;
      const tfTime = document.getElementById('svc-tf-time').value;
      document.getElementById('conf-tf-datetime').textContent = formatDate(tfDate) + ' at ' + tfTime;
      document.getElementById('conf-tf-pax').textContent = document.getElementById('svc-tf-pax').value;

      // Show breakdown
      confBreakdown.style.display = '';
      document.getElementById('conf-hotel-subtotal').textContent = formatUSD(bookingState.price);
      document.getElementById('conf-tf-subtotal').textContent = formatPrice(serviceTransferPrice);

      confHeading.textContent = 'Trip Booked!';
      confSubheading.textContent = 'Your client\'s hotel stay and airport transfer have been confirmed.';

      // Bookings list will re-render dynamically on next visit

      // Populate booking detail transfer section
      const bdTfSection = document.getElementById('bd-transfer-section');
      if (bdTfSection) {
        bdTfSection.style.display = '';
        const pickup = document.getElementById('svc-pickup')?.value || transferBookingState.pickup;
        const dropoff = document.getElementById('svc-dropoff')?.value || transferBookingState.dropoff;
        const tfDate = document.getElementById('svc-tf-date')?.value || transferBookingState.date;
        const tfTime = document.getElementById('svc-tf-time')?.value || transferBookingState.time;
        const tfPax = document.getElementById('svc-tf-pax')?.value || transferBookingState.passengers;
        document.getElementById('bd-tf-route').textContent = pickup + ' → ' + dropoff;
        document.getElementById('bd-tf-date').textContent = formatDate(tfDate);
        document.getElementById('bd-tf-time').textContent = tfTime;
        document.getElementById('bd-tf-vehicle').textContent = serviceTransferVehicle;
        document.getElementById('bd-tf-passengers').textContent = tfPax;
        document.getElementById('bd-tf-price').textContent = formatPrice(serviceTransferPrice);
        // Update header total to combined price
        const headerPrice = document.getElementById('bd-header-price');
        if (headerPrice) headerPrice.textContent = formatUSD(totalPrice);
        // Show price breakdown
        const bdPriceSummary = document.getElementById('bd-price-summary');
        if (bdPriceSummary) {
          bdPriceSummary.style.display = '';
          document.getElementById('bd-pb-hotel').textContent = formatUSD(parseFloat(bookingState.price));
          document.getElementById('bd-pb-transfer').textContent = formatPrice(serviceTransferPrice);
          document.getElementById('bd-pb-total').textContent = formatUSD(totalPrice);
        }
      }

      // Update booking detail hotel info
      updateBookingDetailFromState();
    } else {
      document.getElementById('conf-price').textContent = formatUSD(bookingState.price);
      confTfSection.style.display = 'none';
      confBreakdown.style.display = 'none';
      confHeading.textContent = 'You\'re all set!';
      confSubheading.textContent = 'Your client\'s stay has been confirmed. Here\'s everything you need.';

      // Bookings list re-renders dynamically

      // Hide transfer section and price breakdown in booking detail
      const bdTfSection = document.getElementById('bd-transfer-section');
      if (bdTfSection) bdTfSection.style.display = 'none';
      const bdPriceSummary = document.getElementById('bd-price-summary');
      if (bdPriceSummary) bdPriceSummary.style.display = 'none';

      updateBookingDetailFromState();
      updateBookingListFromState();
    }

    snapshotBooking();
    updateBookingListFromState();
    showScreen('confirmation');
    spawnConfetti();
  };
})();

// ========== SKELETON LOADING FOR SEARCHES ==========

function buildSkeletonCards(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += '<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-body">' +
      '<div class="skeleton-line title"></div><div class="skeleton-line w80"></div>' +
      '<div class="skeleton-line w60"></div><div class="skeleton-line w40"></div>' +
      '<div class="skeleton-line w30"></div></div></div>';
  }
  return html;
}

// Override performSearch to show skeleton
(function() {
  const _origSearch = performSearch;
  performSearch = function() {
    const overlay = document.getElementById('search-loading');
    overlay.classList.add('show');
    // Show skeleton in results list
    const resultsList = document.getElementById('results-list');
    const cards = resultsList.querySelectorAll('.hotel-card');
    cards.forEach(c => c.style.display = 'none');
    const skeletons = document.createElement('div');
    skeletons.id = 'search-skeletons';
    skeletons.innerHTML = buildSkeletonCards(4);
    resultsList.appendChild(skeletons);
    // Navigate immediately so user sees skeleton
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-results').classList.add('active');
    window.scrollTo(0, 0);

    setTimeout(() => {
      overlay.classList.remove('show');
      const sk = document.getElementById('search-skeletons');
      if (sk) sk.remove();
      cards.forEach(c => c.style.display = '');
      // Update proto tab
      document.querySelectorAll('.proto-tab').forEach(t => t.classList.remove('active'));
      const activeGroup = document.querySelector('.proto-flow-tabs[data-flow-group="hotels"]');
      if (activeGroup) {
        const tab = activeGroup.querySelector('[data-screen="results"]');
        if (tab) tab.classList.add('active');
      }
    }, 1800);
  };
})();

// Apply markup to cross-sell vehicle cards (services screen)
function applyMarkupToServiceCards() {
  document.querySelectorAll('.vehicle-card').forEach(card => {
    const netPrice = parseFloat(card.dataset.basePrice || card.dataset.price);
    if (!card.dataset.basePrice) card.dataset.basePrice = netPrice;
    const clientPrice = applyMarkup(netPrice);
    card.dataset.price = clientPrice.toFixed(2);
    // Update sell price display
    const sellEl = card.querySelector('.vc-sell');
    if (sellEl) sellEl.textContent = formatPrice(clientPrice);
    // Update net price display
    const netEl = card.querySelector('.vc-net');
    if (netEl) netEl.textContent = 'Net ' + formatPrice(netPrice);
  });
}

// Sort cross-sell vehicle cards
function sortServiceVehicles(criteria) {
  const list = document.getElementById('svc-tf-results-list');
  if (!list) return;
  const cards = Array.from(list.querySelectorAll('.vehicle-card'));
  cards.sort((a, b) => {
    if (criteria === 'price-asc') return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
    if (criteria === 'price-desc') return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
    if (criteria === 'capacity-desc') return parseInt(b.dataset.capacity) - parseInt(a.dataset.capacity);
    return 0;
  });
  cards.forEach(card => list.appendChild(card));
}
