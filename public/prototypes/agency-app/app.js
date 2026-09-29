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
  hotels: ['home', 'results', 'hotel', 'rooms', 'guest', 'services', 'payment', 'confirmation', 'bookings', 'booking-detail', 'voucher', 'invoice', 'credit-account', 'settle-balance', 'notifications', 'markup'],
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
  // Keep the confirmation transfer CTA / details in sync (transfer is post-booking)
  if (id === 'confirmation' && typeof renderConfirmationTransfer === 'function') renderConfirmationTransfer();
  // Render dynamic bookings list
  if (id === 'bookings') renderBookingsList();
  // #190 — render the cover-notifications page + mark reminders read
  if (id === 'notifications' && typeof ntRender === 'function') ntRender();
  // E1 — apply POI/city/country filter when entering results screen.
  // Inlined here (instead of via window.showScreen wrapping) because the
  // function declaration `showScreen` is referenced lexically from
  // performSearch() and bypasses any window.showScreen reassignment.
  if (id === 'results' && typeof e1ApplyToResults === 'function') {
    setTimeout(e1ApplyToResults, 60);
  }
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
    if (bdHasActiveRide() && tfSection) {
      tfSection.style.display = '';
      document.getElementById('modify-tf-vehicle-display').textContent = serviceTransferVehicle || transferBookingState.vehicle;
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
  if (bdHasActiveRide()) {
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
    bookingState.totalPrice = roomTotal;
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

  // Service card rows
  const bdCheckin = document.getElementById('bd-checkin');
  const bdCheckout = document.getElementById('bd-checkout');
  const bdDuration = document.getElementById('bd-duration');
  const bdRoom = document.getElementById('bd-room');
  const bdMeal = document.getElementById('bd-meal');

  if (bdCheckin) bdCheckin.textContent = formatDate(bookingState.checkin);
  if (bdCheckout) bdCheckout.textContent = formatDate(bookingState.checkout);
  if (bdDuration) bdDuration.textContent = nights + ' Night' + (nights !== 1 ? 's' : '');
  if (bdRoom) bdRoom.textContent = bookingState.room;
  if (bdMeal) bdMeal.textContent = bookingState.mealPlan;

  // Lanes, header total and (when shown) the agency figures all derive from state.
  if (typeof f1RenderOnBookingDetail === 'function') f1RenderOnBookingDetail();
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
    price: hotelPrice,
    ref: bookingState.bookingRef,
    screen: 'booking-detail',
    _bookingRef: bookingState.bookingRef
  };
  if (serviceTransferAdded) {
    entry.transferInfo = 'Airport Transfer · ' + serviceTransferVehicle;
  }
  Object.assign(entry, listHeadline(hotelPrice));

  // Replace if same ref already exists (modification), otherwise add
  const idx = bookingsHistory.findIndex(b => b._bookingRef === entry._bookingRef);
  if (idx >= 0) {
    bookingsHistory[idx] = entry;
  } else {
    bookingsHistory.unshift(entry);
  }
}

// documentation#49 — the list card's headline (live listHeadline): the room at the client price,
// plus the ride paid in the same checkout while it still counts. With a ride it is the Trip Total,
// the same figure the booking-detail header shows; without one, the room's Total Client Price.
function listHeadline(hotelErgosPrice) {
  const room = bdClientPrice(hotelErgosPrice || 0);
  const ride = bdHasActiveRide() ? bdRideAmount() : 0;
  if (ride <= 0) return { price: room, isTripTotal: false };
  return { price: Math.round((room + ride) * 100) / 100, isTripTotal: true };
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
      price: hotelPrice,
      ref: bookingState.bookingRef, screen: 'booking-detail'
    };
    Object.assign(liveEntry, listHeadline(hotelPrice));
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

    const priceStr = bdUSD(b.price);
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
        '<div class="blc-price-label">' + (b.isTripTotal ? 'Trip Total' : 'Total Client Price') + '</div>' +
        '<div class="blc-price">' + priceStr + '</div>' +
        '<button class="btn-view-details" onclick="bdOpenBooking(\'' + b.screen + '\')">View Booking Details</button>' +
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

function showCancelSuccess(message) {
  bookingState.isCancelled = true;

  showToast('success', 'Booking Cancelled', message || ('Your booking has been cancelled. Refund of ' + formatUSD(bookingState.price) + ' will be processed.'));

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
    // The banner states the fact; the money moved to the agency view (live cancelledBanner.ts).
    const withRide = typeof bdTransferLaneCancelled !== 'undefined' && bdTransferLaneCancelled && !bdRideNotBooked;
    const day = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    banner.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg><span>' +
      (withRide ? 'This booking and its airport transfer were' : 'This booking was') + ' cancelled on ' + day + '.</span>';
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

  // The cancelled hotel reads as not counted; totals follow.
  if (typeof f1RenderOnBookingDetail === 'function') f1RenderOnBookingDetail();
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
document.querySelectorAll('.navbar .icon-btn:not(.help-btn):not(.notif-bell)').forEach(btn => {
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
    <tr class="total-row"><td colspan="3">${isES ? 'TOTAL A PAGAR' : 'TOTAL DUE'}</td><td class="right" style="color:#0d9488">${formatUSD(parseFloat(bookingState.price) + serviceTransferPrice)}</td></tr>
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
            <td class="right" style="color:var(--teal)">${formatUSD(parseFloat(bookingState.price) + serviceTransferPrice)}</td>
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

// The Itinerary voucher PDF (Documents → Itinerary → Voucher → Open PDF), as TEST prints it
// (documentation#46): one voucher for the trip, in travel order — the arrival ride first, then
// the room — each item with its own Confirmation and the guest's name inside it. No prices.
// The ride's places print in full, name first (owner's decision). English only, like the PDF.
let voucherDocKind = 'hotel';   // 'itinerary' = the Itinerary PDF; 'hotel' = Preview Voucher

function buildItineraryVoucher() {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const text = id => (document.getElementById(id)?.textContent || '').trim();
  const guest = bookingState.guestFirstName + ' ' + bookingState.guestLastName;
  const nights = nightsBetween(bookingState.checkin, bookingState.checkout);
  const s = transferBookingState;
  const ride = bdHasActiveRide() ? `
    <div class="doc-itin-item">
      <h3>${esc(s.supplier)} transfer — ${esc(serviceTransferVehicle || s.vehicle)}</h3>
      <p class="doc-itin-meta">Passenger: ${esc(guest)}<br>Pick-up: ${esc(s.pickup)}<br>When: ${esc(s.date)}T${esc(s.time)}:00<br>Drop-off: ${esc(s.dropoff)}</p>
      <p>Confirmation: ${esc(bdRideConfNumber())}</p>
    </div>` : '';
  return `
    <div class="doc-itin">
      <h2 class="doc-itin-title">Travel voucher</h2>
      <p class="doc-itin-meta">${esc(text('bd-header-ref') || bookingState.bookingRef || 'PTA18G28E7CUANQ')}<br>Issued ${new Date().toISOString().slice(0, 10)}</p>
      <p>Demo Agency<br><span class="doc-itin-meta">patria@demoagency.com · +34 911 234 567</span></p>
      ${ride}
      <div class="doc-itin-item">
        <h3>${esc(bookingState.hotel)}</h3>
        <p class="doc-itin-meta">Guest: ${esc(guest)}<br>${esc(bookingState.checkin)} to ${esc(bookingState.checkout)} (${nights} night${nights !== 1 ? 's' : ''})</p>
        <p>Confirmation: ${esc(text('bd-f1-hotel-ref') || 'PTA18G28E7CUANQ')}</p>
      </div>
    </div>`;
}

function openItineraryVoucher() {
  voucherDocKind = 'itinerary';
  showScreen('voucher');   // showScreen('voucher') renders through renderVoucherPreview()
}

function renderVoucherPreview() {
  const lang = document.getElementById('voucher-preview-lang')?.value || 'English';
  document.getElementById('voucher-preview-content').innerHTML =
    voucherDocKind === 'itinerary' ? buildItineraryVoucher() : buildVoucherPreview(lang);
}

function renderInvoicePreview() {
  const lang = document.getElementById('invoice-preview-lang')?.value || 'English';
  document.getElementById('invoice-preview-content').innerHTML = buildInvoicePreview(lang);
}

function openVoucherPreview() {
  activeDocContext = 'hotel';
  voucherDocKind = 'hotel';
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

// ========== MOBILE FILTER DRAWER ==========
// On viewports <=1024 px the .filter-sidebar is taken off the page flow and
// hidden off-canvas; openFilterDrawer slides it in over a backdrop.

function openFilterDrawer() {
  const sidebar = document.getElementById('filter-sidebar');
  const backdrop = document.getElementById('filter-drawer-backdrop');
  const trigger = document.getElementById('filter-drawer-trigger');
  if (!sidebar || !backdrop) return;
  sidebar.classList.add('open');
  backdrop.classList.add('open');
  document.body.classList.add('filter-drawer-open');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
}

function closeFilterDrawer() {
  const sidebar = document.getElementById('filter-sidebar');
  const backdrop = document.getElementById('filter-drawer-backdrop');
  const trigger = document.getElementById('filter-drawer-trigger');
  if (!sidebar || !backdrop) return;
  sidebar.classList.remove('open');
  backdrop.classList.remove('open');
  document.body.classList.remove('filter-drawer-open');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

// Close on Escape; refresh active-filter badge whenever filters change
(function wireFilterDrawer() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFilterDrawer();
  });
  // Active-filter count badge — anything that visibly narrows the result set
  function updateBadge() {
    const badge = document.getElementById('filter-drawer-badge');
    if (!badge) return;
    let count = 0;
    const name = document.getElementById('filter-hotel-name')?.value?.trim();
    if (name) count++;
    const price = parseInt(document.getElementById('filter-price-range')?.value);
    if (Number.isFinite(price) && price < 2000) count++;
    count += document.querySelectorAll('.filter-star:checked').length;
    count += document.querySelectorAll('.filter-meal:checked').length;
    const refund = document.querySelector('.filter-refund:checked')?.value;
    if (refund && refund !== 'all') count++;
    const poi = document.getElementById('filter-poi')?.value;
    if (poi) count++;
    badge.textContent = String(count);
    badge.style.display = count > 0 ? '' : 'none';
  }
  // Recompute on any change to any filter input
  document.addEventListener('change', updateBadge);
  document.addEventListener('input', updateBadge);
  // Initial render once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBadge);
  } else {
    setTimeout(updateBadge, 100);
  }
})();

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
  input.addEventListener('input', () => {
    // Typing fresh text invalidates any previously-picked POI / country.
    // Without this, picking "Havana, Cuba" then re-typing "colombia" would
    // leave E1_DESTINATION_COUNTRY='CU' stuck, and the country filter would
    // hide CO hotels while the user thinks they searched Colombia.
    window.E1_SELECTED_POI = null;
    window.E1_DESTINATION_COUNTRY = null;
    render(input.value);
  });
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
  // Prefer real coordinates from data-lat / data-lng on the card (added to
  // index.html for the 6 demo hotels). Fall back to hash-derived pseudo-coords
  // only when the card omits them — keeps the prototype working for any new
  // card a maintainer adds without coordinates.
  const realLat = parseFloat(card.dataset.lat);
  const realLng = parseFloat(card.dataset.lng);
  if (Number.isFinite(realLat) && Number.isFinite(realLng)) {
    return { lat: realLat, lng: realLng };
  }
  const poi = window.E1_SELECTED_POI;
  if (!poi) return null;
  const name = card.dataset.name || '';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i) | 0;
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

// Normalize: lowercase, strip diacritics, trim. Lets "Bogotá" match "bogota".
function _e1Norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Best-effort CITY parse from free-text. Returns the canonical city name as
// stored on hotel cards' data-city, or null. Tries POI keywords first (so
// "malecón" → "Havana") then direct city aliases. Free-text typing wants
// city-level filtering — "Havana" shouldn't surface Holguín / Varadero hotels.
function e1ParseCityFromText(text) {
  const t = _e1Norm(text);
  if (!t) return null;
  // POI keyword → canonical city (mirrors E1_POIS — "malecón" implies Havana)
  const poiToCity = {
    'malecon': 'Havana', 'plaza vieja': 'Havana',
    'plaza de bolivar': 'Bogotá', 'zona t': 'Bogotá', 'comuna 13': 'Medellín',
    'ciudad amurallada': 'Cartagena',
    'zona colonial': 'Santo Domingo',
    'zocalo': 'Mexico City',
  };
  for (const [k, city] of Object.entries(poiToCity)) {
    if (t.includes(k)) return city;
  }
  // Direct city alias → canonical
  const cityAlias = {
    'havana': 'Havana', 'habana': 'Havana',
    'holguin': 'Holguín', 'varadero': 'Varadero',
    'bogota': 'Bogotá', 'cartagena': 'Cartagena', 'medellin': 'Medellín',
    'punta cana': 'Punta Cana', 'santo domingo': 'Santo Domingo',
    'cancun': 'Cancún',
  };
  // Match longest first so "punta cana" beats "punta"
  const keys = Object.keys(cityAlias).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (t.includes(k)) return cityAlias[k];
  }
  return null;
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
    'havana': 'CU', 'habana': 'CU', 'varadero': 'CU', 'holguín': 'CU', 'holguin': 'CU',
    'bogotá': 'CO', 'bogota': 'CO', 'cartagena': 'CO', 'medellín': 'CO', 'medellin': 'CO',
    'punta cana': 'DO', 'santo domingo': 'DO',
    'cancun': 'MX', 'cancún': 'MX',
  };
  for (const [name, iso] of Object.entries(cityMap)) {
    if (t.includes(name)) return iso;
  }
  // POI keyword → country (mirrors E1_POIS so free-text "malecón" still scopes)
  const poiMap = {
    'malecón': 'CU', 'malecon': 'CU', 'plaza vieja': 'CU',
    'plaza de bolívar': 'CO', 'plaza de bolivar': 'CO', 'zona t': 'CO',
    'ciudad amurallada': 'CO', 'comuna 13': 'CO',
    'zona colonial': 'DO',
    'zócalo': 'MX', 'zocalo': 'MX',
  };
  for (const [name, iso] of Object.entries(poiMap)) {
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

  // Determine target city + country from input text. Current text beats stored
  // state so re-typing always wins. (E.g., user picks "Havana, Cuba" then
  // re-types "colombia": stored CU must NOT preempt the parser.)
  // City is preferred over country when both match — typing "Havana" means the
  // user wants Havana hotels, not all of Cuba.
  const input = document.getElementById('dest-input');
  const parsedCity = e1ParseCityFromText(input?.value);
  const parsedCountry = e1ParseCountryFromText(input?.value);
  let targetCity = parsedCity || null;
  let targetCountry = poi?.country || parsedCountry || window.E1_DESTINATION_COUNTRY || null;
  if (parsedCountry) window.E1_DESTINATION_COUNTRY = parsedCountry;

  // No country signal at all — baseline behaviour (everything visible)
  if (!targetCountry) {
    if (countEl && !countEl.textContent.match(/hotels found/)) {
      countEl.textContent = document.querySelectorAll('#results-list .hotel-card').length + ' hotels found';
    }
    setTimeout(e1PopulateSidebarPoiFilter, 0);
    return;
  }

  // Apply country filter (always — for POI, City, and free-text paths)
  const allCards = Array.from(resultsList.querySelectorAll('.hotel-card'));
  const inCountry = allCards.filter(c => c.dataset.country === targetCountry);
  const outOfCountry = allCards.filter(c => c.dataset.country !== targetCountry);
  outOfCountry.forEach(c => { c.style.display = 'none'; });

  // Additional city filter — when user typed a city name (e.g., "Havana"),
  // hide other cities within the same country (Holguín, Varadero).
  // POI path skips this — its distance cap already enforces walking-distance.
  let inScope = inCountry;
  let outOfCity = [];
  if (!poi && targetCity) {
    const cityNorm = _e1Norm(targetCity);
    inScope = inCountry.filter(c => _e1Norm(c.dataset.city) === cityNorm);
    outOfCity = inCountry.filter(c => _e1Norm(c.dataset.city) !== cityNorm);
    outOfCity.forEach(c => { c.style.display = 'none'; });
  }

  // Heading reflects the actual scope
  if (countEl && !poi) {
    if (targetCity) {
      countEl.textContent = inScope.length + ' hotels in ' + targetCity;
    } else {
      const countryName = { CU: 'Cuba', CO: 'Colombia', DO: 'Dominican Republic', MX: 'Mexico' }[targetCountry] || targetCountry;
      countEl.textContent = inCountry.length + ' hotels in ' + countryName;
    }
  }

  // City / free-text path stops here — no banner, no badges, no proximity sort.
  // The E1 enhancements below are POI-only.
  if (!poi) {
    // Re-append hidden cards to the end so visible order is clean.
    // Order: in-scope (visible) → out-of-city (hidden, same country) → out-of-country (hidden).
    inScope.forEach(card => resultsList.appendChild(card));
    outOfCity.forEach(card => resultsList.appendChild(card));
    outOfCountry.forEach(card => resultsList.appendChild(card));
    setTimeout(e1PopulateSidebarPoiFilter, 0);
    return;
  }

  // Compute distance for in-country cards, sort ascending
  const measured = inCountry.map(card => {
    const coords = e1HotelCoords(card);
    const km = coords ? e1HaversineKm(poi, coords) : 999;
    return { card, km };
  }).sort((a, b) => a.km - b.km);

  // Distance cap: "near a POI" means walking-/short-drive distance, not
  // same-country. Holguín ↔ Malecón is 700 km, both CU — hide those.
  const NEAR_KM = 25;
  const nearby = measured.filter(m => m.km <= NEAR_KM);
  const farInCountry = measured.filter(m => m.km > NEAR_KM);
  farInCountry.forEach(({ card }) => { card.style.display = 'none'; });

  // Re-order DOM: nearby (sorted) → far same-country (hidden) → out-of-country (hidden)
  nearby.forEach(({ card }) => resultsList.appendChild(card));
  farInCountry.forEach(({ card }) => resultsList.appendChild(card));
  outOfCountry.forEach(card => resultsList.appendChild(card));

  // Annotate each visible card with a teal "X.X km from <POI>" badge
  nearby.forEach(({ card, km }) => {
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

  // Update heading to reflect the actual nearby count
  if (countEl) {
    countEl.textContent = 'Hotels near ' + poi.name + ' (' + nearby.length + ' within ' + NEAR_KM + ' km in ' + poi.country + ')';
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
      '<span class="in-dev-title">Functionality In Development</span> ' +
      '<span class="in-dev-msg"><strong>POI-aware location search (E1)</strong> — prototype-only; live <code>/hotels/near</code> + Google Places not yet wired. See ' +
      '<a href="https://github.com/lukzen/documentation/issues/17" target="_blank">USER_STORIES E1 (#17)</a> · ' +
      '<a href="../../../technical/2-architecture/adr/002-poi-autocomplete-provider.md" target="_blank">ADR-002</a>.' +
      '</span></div>';
  // Insert ABOVE the .results-layout grid so the banner spans the full width
  // (sidebar + results column), not just the narrow results column.
  const resultsLayout = document.querySelector('.results-layout');
  const insertHost = resultsLayout?.parentElement || resultsList.parentElement;
  const insertBefore = resultsLayout || resultsList;
  insertHost.insertBefore(banner, insertBefore);

  // Insert the teal notice strip below the banner (same host, same anchor)
  const notice = document.createElement('div');
  notice.id = 'e1-notice';
  notice.className = 'e1-notice';
  notice.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>' +
    ' Showing hotels sorted by walking distance from <strong>' + poi.name + '</strong>. ' +
    '<a href="#" onclick="e1ClearPoi(event)" class="e1-clear-link">Clear and show all hotels</a>';
  insertHost.insertBefore(notice, insertBefore);
  setTimeout(e1PopulateSidebarPoiFilter, 0);
}

function e1ClearPoi(ev) {
  if (ev) ev.preventDefault();
  window.E1_SELECTED_POI = null;
  const input = document.getElementById('dest-input');
  if (input) input.value = '';
  // Also clear the sidebar POI select so its state matches
  const sel = document.getElementById('filter-poi');
  if (sel) sel.value = '';
  e1ApplyToResults();
}

// Populate the sidebar POI dropdown with E1_POIS scoped to the country/city
// currently in view. Hides itself when the destination is unknown — picking a
// POI in a country whose hotels aren't on this list would just hide everything.
function e1PopulateSidebarPoiFilter() {
  const sel = document.getElementById('filter-poi');
  const section = document.getElementById('filter-poi-section');
  if (!sel || typeof E1_POIS === 'undefined') return;
  // Detect the active scope from the visible hotel cards' data-country/data-city.
  const visibleCards = Array.from(document.querySelectorAll('#results-list .hotel-card'))
    .filter(c => getComputedStyle(c).display !== 'none');
  const countries = [...new Set(visibleCards.map(c => c.dataset.country).filter(Boolean))];
  // Show only when exactly one country is in view — that's the case where
  // narrowing by a POI within that country makes sense.
  if (countries.length !== 1) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  const scopeCountry = countries[0];
  const matchingPois = E1_POIS.filter(p => p.country === scopeCountry);
  const prevValue = sel.value;
  sel.innerHTML = '<option value="">Any — show all in destination</option>' +
    matchingPois.map(p =>
      '<option value="' + p.name.replace(/"/g, '&quot;') + '">' + p.name + '</option>'
    ).join('');
  // Preserve selection if the previously-picked POI is still in scope
  if (prevValue && matchingPois.some(p => p.name === prevValue)) {
    sel.value = prevValue;
  } else if (window.E1_SELECTED_POI && matchingPois.some(p => p.name === window.E1_SELECTED_POI.name)) {
    sel.value = window.E1_SELECTED_POI.name;
  }
}

// One-time change handler — picking a POI from the sidebar invokes the same
// proximity mode the destination autocomplete uses.
(function wireSidebarPoiFilter() {
  document.addEventListener('change', (ev) => {
    if (ev.target?.id !== 'filter-poi') return;
    const name = ev.target.value;
    if (!name) {
      // Switched back to "Any" — drop POI mode but keep current country scope
      window.E1_SELECTED_POI = null;
      e1ApplyToResults();
      return;
    }
    const poi = E1_POIS.find(p => p.name === name);
    if (!poi) return;
    window.E1_SELECTED_POI = { name: poi.name, country: poi.country, lat: poi.lat, lng: poi.lng };
    window.E1_DESTINATION_COUNTRY = poi.country;
    e1ApplyToResults();
  });
})();

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
    e.target.removeAttribute('aria-invalid');
    const errEl = e.target.parentElement.querySelector('.form-error');
    if (errEl) errEl.classList.remove('show');
  }
});

// ========== F1 — HOTEL + TRANSFER, CLOSED AT CHECKOUT (spec v0.4) ==========
// USER_STORIES F1 (issue #23). ONE checkout books AND pays both items: the
// saga runs hotel steps first (write-ahead, pay, vendor confirm), then the
// transfer steps — if the transfer fails, the hotel stays booked (item
// boundary, no cascade). No 48h hold in v1 (post-October candidate).
// Prototype-only — backend saga (GCP Workflows) per spec §1b/§3.

// "Book Hotel Only" — the agent drops the transfer and closes hotel-only.
function confirmHotelOnly() {
  if (serviceTransferAdded) {
    serviceTransferAdded = false;
    serviceTransferVehicle = null;
    serviceTransferPrice = 0;
    serviceTransferNet = 0;
    protoToast && protoToast('Transfer dropped — booking the hotel only.', 2000);
  }
  return confirmBooking();
}

// Saga progress overlay — mirrors the spec §3 end-to-end steps so the
// checkout visibly closes both bookings in order (hotel first).
function f1RunSagaOverlay(done, rideRefused) {
  const steps = [
    'Booking hotel — record created',
    'Paying hotel…',
    'Confirming hotel at the vendor…',
    'Hotel booked ✓',
    'Booking transfer — record created',
    'Paying transfer…',
    'Confirming transfer at Mozio…',
  ].concat(rideRefused
    ? ['Transfer refused by the provider — fare returned to your credit']
    : ['Transfer booked ✓']);
  let overlay = document.getElementById('f1-saga-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'f1-saga-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(28,25,23,.5);z-index:70;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = '<div style="background:#fff;border-radius:14px;min-width:340px;padding:22px 26px;box-shadow:0 20px 60px rgba(0,0,0,.3)"><h3 style="margin:0 0 12px">Closing your booking…</h3><div id="f1-saga-steps" style="font-size:13.5px;line-height:2;color:#57534e"></div></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  const list = overlay.querySelector('#f1-saga-steps');
  list.innerHTML = '';
  let i = 0;
  const tick = () => {
    if (i > 0) list.children[i - 1].innerHTML = '<span style="color:#0d9488">✓</span> ' + steps[i - 1];
    if (i >= steps.length) {
      setTimeout(() => { overlay.style.display = 'none'; done && done(); }, 350);
      return;
    }
    const row = document.createElement('div');
    row.innerHTML = '<span style="color:#d97706">●</span> ' + steps[i];
    list.appendChild(row);
    i += 1;
    setTimeout(tick, 320);
  };
  tick();
}

// Wrap confirmBooking: with a transfer in the cart, the checkout runs the
// full saga overlay first (hotel steps then transfer steps), then confirms.
(function f1WrapConfirmBooking() {
  const orig = window.confirmBooking;
  if (typeof orig !== 'function') return;
  window.confirmBooking = function () {
    if (serviceTransferAdded && !window.__f1SagaRan) {
      window.__f1SagaRan = true;
      return f1RunSagaOverlay(() => { const r = orig.apply(this); window.__f1SagaRan = false; return r; });
    }
    return orig.apply(this, arguments);
  };
})();

// ---------- Phone widget (documentation#50) ----------
// Live: the box holds the LOCAL number only. The country comes from the picker beside it
// (or from a pasted +NN… number) and its dial code shows as a chip. Typing a country code
// into the box does nothing — the "+" is dropped and the digits stay national.
// The live app then asks libphonenumber whether that national number is one the country
// issues; the prototype stands in with a length + leading-digit table, which is enough to
// refuse the numbers the live app refuses (a Spanish "555 123 456" is not a Spanish number).
const PROTO_PHONE_COUNTRIES = [
  { code: 'us', name: 'United States', flag: '🇺🇸', dial: '+1',  len: 10, starts: '23456789' },
  { code: 'ca', name: 'Canada',        flag: '🇨🇦', dial: '+1',  len: 10, starts: '23456789' },
  { code: 'mx', name: 'Mexico',        flag: '🇲🇽', dial: '+52', len: 10, starts: '123456789' },
  { code: 'cu', name: 'Cuba',          flag: '🇨🇺', dial: '+53', len: 8,  starts: '57' },
  { code: 'es', name: 'Spain',         flag: '🇪🇸', dial: '+34', len: 9,  starts: '6789' },
  { code: 'co', name: 'Colombia',      flag: '🇨🇴', dial: '+57', len: 10, starts: '36' },
];
function protoPhoneCountry(code) {
  return PROTO_PHONE_COUNTRIES.find(c => c.code === code) || PROTO_PHONE_COUNTRIES[0];
}
/** The picker + dial chip + local-number box, as one field. */
function protoPhoneMarkup(id, label, selected) {
  const chosen = protoPhoneCountry(selected);
  const options = PROTO_PHONE_COUNTRIES.map(c =>
    '<option value="' + c.code + '"' + (c.code === chosen.code ? ' selected' : '') + '>'
    + c.flag + ' ' + c.name + '</option>').join('');
  return '<label for="' + id + '">' + label + ' *</label>'
    + '<span class="phone-hint" id="' + id + '-hint">Pick the country, then type the local number — the driver calls this.</span>'
    + '<span class="phone-field">'
    + '<select class="phone-country" id="' + id + '-country" aria-label="Country for the phone number"'
    + ' onchange="protoPhoneCountryChanged(\'' + id + '\')">' + options + '</select>'
    + '<span class="phone-dial" id="' + id + '-dial">' + chosen.dial + '</span>'
    + '<input type="tel" id="' + id + '" class="form-input phone-local" aria-describedby="'
    + id + '-hint ' + id + '-error" oninput="protoPhoneInput(\'' + id + '\')">'
    + '</span>'
    + '<span class="form-error" id="' + id + '-error" role="alert"></span>';
}
function protoPhoneSelected(id) {
  return protoPhoneCountry(document.getElementById(id + '-country')?.value);
}
function protoPhoneCountryChanged(id) {
  const dial = document.getElementById(id + '-dial');
  if (dial) dial.textContent = protoPhoneSelected(id).dial;
  protoPhoneClearError(id);
}
/** Keeps the box national: a pasted "+NN…" sets the country instead of sitting in the box. */
function protoPhoneInput(id) {
  const input = document.getElementById(id);
  if (!input) return;
  const raw = input.value;
  let digits = raw.replace(/\D/g, '');
  if (raw.trim().charAt(0) === '+') {
    const match = PROTO_PHONE_COUNTRIES
      .filter(c => digits.startsWith(c.dial.slice(1)))
      .sort((a, b) => b.dial.length - a.dial.length)[0];
    if (match) {
      const select = document.getElementById(id + '-country');
      if (select) { select.value = match.code; protoPhoneCountryChanged(id); }
      digits = digits.slice(match.dial.length - 1);
    }
  }
  input.value = digits.slice(0, protoPhoneSelected(id).len);
  protoPhoneClearError(id);
}
function protoPhoneSet(id, countryCode, local) {
  const select = document.getElementById(id + '-country');
  if (select) { select.value = countryCode; protoPhoneCountryChanged(id); }
  const input = document.getElementById(id);
  if (input) input.value = local;
}
function protoPhoneLocal(id) {
  return (document.getElementById(id)?.value || '').replace(/\D/g, '');
}
/** What the transportation provider is sent: the picker's dial code + the local number. */
function protoPhoneFull(id) {
  return protoPhoneSelected(id).dial + ' ' + protoPhoneLocal(id);
}
function protoPhoneOk(id) {
  const country = protoPhoneSelected(id);
  const local = protoPhoneLocal(id);
  return local.length === country.len && country.starts.includes(local.charAt(0));
}
function protoPhoneClearError(id) {
  const err = document.getElementById(id + '-error');
  if (err) { err.textContent = ''; err.classList.remove('show'); }
  const input = document.getElementById(id);
  if (input) { input.classList.remove('error'); input.removeAttribute('aria-invalid'); }
}
function protoPhoneRefuse(id, message) {
  const input = document.getElementById(id);
  const err = document.getElementById(id + '-error');
  if (err) { err.textContent = message; err.classList.add('show'); }
  if (input) { input.classList.add('error'); input.setAttribute('aria-invalid', 'true'); input.focus(); }
}

function f1RidePhoneOk() {
  return protoPhoneOk('guest-phone');
}
const F1_PHONE_REFUSED = "Pick the guest's country, then type their local number — the airport transfer needs a number the driver can reach.";
function f1RefusePhone() {
  showScreen('guest');
  protoPhoneRefuse('guest-phone', F1_PHONE_REFUSED);
  if (typeof showToast === 'function') showToast('error', 'Check the guest phone', F1_PHONE_REFUSED);
}
// documentation#53 AC 6 — live BookingPage refuses the pay click when the ride needs flight
// details and one is empty: the transfer section opens, the first missing field scrolls into
// view and takes focus, the reason sits under it. Nothing is charged.
const F1_FLIGHT_REASON = {
  'svc-tf-airline': 'Enter the airline — the driver meets this flight.',
  'svc-tf-flightnum': 'Enter the flight number — the driver meets this flight.',
};
function f1MissingFlightField() {
  const info = document.getElementById('svc-flight-info');
  if (!info || info.style.display !== 'block') return null;
  return ['svc-tf-airline', 'svc-tf-flightnum'].find(id => !(document.getElementById(id)?.value || '').trim()) || null;
}
function f1ClearFlightError() {
  Object.keys(F1_FLIGHT_REASON).forEach(id => {
    const err = document.getElementById(id + '-error');
    if (err) { err.textContent = ''; err.classList.remove('show'); }
    const input = document.getElementById(id);
    if (input && (input.value || '').trim()) { input.classList.remove('error'); input.removeAttribute('aria-invalid'); }
  });
}
function f1RefuseFlight() {
  const id = f1MissingFlightField();
  openCheckoutTransfer();
  const input = document.getElementById(id);
  const err = document.getElementById(id + '-error');
  if (err) { err.textContent = F1_FLIGHT_REASON[id]; err.classList.add('show'); }
  if (input) {
    input.classList.add('error'); input.setAttribute('aria-invalid', 'true');
    input.scrollIntoView({ block: 'center' }); input.focus();
  }
  if (typeof showToast === 'function') showToast('error', 'Flight details missing', F1_FLIGHT_REASON[id]);
}

// Demo (documentation#37): the provider refuses the ride after the hotel is booked. The hotel
// stands, the ride's fare comes back, and the booking carries a "Not booked" ride lane.
function f1RideRefusedAfterHotel() {
  bdRideNotBooked = true;
  bdRideNotBookedFare = serviceTransferPrice || 0;
  bdRideNotBookedReason = 'Vehicle no longer available for this pickup time.';
  serviceTransferAdded = false;
  bdTransferLaneCancelled = false;
}

// Confirmation screen: show the two-lane block whenever a transfer was
// booked — BOTH lanes Confirmed & Paid (v0.4: nothing is ever pending).
function f1RenderOnConfirmation() {
  const block = document.getElementById('f1-status-block');
  const banner = document.getElementById('f1-in-dev-banner');
  const transferSection = document.getElementById('conf-transfer-section');
  if (!block || !banner) return;
  if (serviceTransferAdded) {
    block.style.display = 'flex';
    banner.style.display = 'flex';
    if (transferSection) transferSection.style.display = 'none';
    const amt = document.getElementById('f1-transport-amount');
    if (amt && serviceTransferPrice) amt.textContent = 'USD ' + serviceTransferPrice.toFixed(2);
    const h1 = document.getElementById('conf-heading');
    const sub = document.getElementById('conf-subheading');
    if (h1) h1.textContent = 'Booking closed — hotel + transfer confirmed!';
    if (sub) sub.textContent = 'Both bookings are confirmed and paid. Vouchers and invoices are available per item.';
  } else {
    block.style.display = 'none';
    banner.style.display = 'none';
  }
}

// Payment screen: show the hotel-only alternative + the pay-both note
// F1.B (documentation#36) — where the transfer flow was entered from.
// 'checkout'     → the Payment step's Airport Transfer card; the transfer joins THIS
//                  booking and is paid with the room, so the flow returns to payment.
// 'confirmation' → the post-booking path (room already paid), unchanged.
let transferEntryContext = 'confirmation';

const SVC_SUBTITLE_CHECKOUT =
  'Added here, the transfer is part of <strong>this booking</strong> — one Trip Total, ' +
  'one payment. Nothing is charged until you confirm payment on the previous step.';

// Entry point from the Payment step. This is the REAL click path to screen-services,
// which otherwise has none (it was reachable only from the prototype toolbar).
function openCheckoutTransfer() {
  transferEntryContext = 'checkout';
  // The confirmation screen may have relocated the card and the book button into itself.
  // Put them back before showing the services screen, or it renders empty.
  const anchor = document.getElementById('svc-card-anchor');
  const card = document.getElementById('svc-transfer-card');
  if (anchor && card && card.parentElement !== anchor.parentElement) {
    anchor.parentElement.insertBefore(card, anchor.nextSibling);
  }
  const actions = document.getElementById('svc-actions');
  const bookBtn = document.getElementById('svc-book-btn');
  if (actions && bookBtn && bookBtn.parentElement !== actions) {
    actions.insertBefore(bookBtn, actions.firstChild);
  }
  const sub = document.getElementById('svc-subtitle');
  if (sub) sub.innerHTML = SVC_SUBTITLE_CHECKOUT;
  const note = document.getElementById('svc-pay-note');
  if (note) {
    note.innerHTML =
      '<strong>Paid with the room.</strong> This transfer is part of the same booking — ' +
      'one Trip Total, one payment at checkout. Your margin is tracked in the booking P&amp;L.';
  }
  const back = document.getElementById('svc-back-link');
  if (back) back.textContent = '← Back to payment';
  const backBtn = document.getElementById('svc-back-btn');
  if (backBtn) backBtn.textContent = '← Back to payment';
  showScreen('services');
}

// Back out of the transfer flow to wherever it was entered from.
function svcBack() {
  showScreen(transferEntryContext === 'checkout' ? 'payment' : 'confirmation');
}

// Reflect an added transfer on the Payment step's entry card.
function f1UpdateCheckoutTransferEntry() {
  const card = document.getElementById('pay-transfer-entry');
  const sub = document.getElementById('pay-transfer-entry-sub');
  const badge = document.getElementById('pay-transfer-entry-badge');
  if (!card || !sub || !badge) return;
  if (serviceTransferAdded) {
    card.classList.add('added');
    badge.textContent = 'Added';
    sub.textContent =
      (serviceTransferVehicle || 'Transfer') +
      (serviceTransferPrice ? ' · USD ' + Number(serviceTransferPrice).toFixed(2) : '');
  } else {
    card.classList.remove('added');
    badge.textContent = 'Optional';
    sub.textContent = 'Private car service from airport to hotel';
  }
}

function f1UpdatePaymentScreenAlternative() {
  const altBtn = document.getElementById('pay-confirm-hotel-only');
  const altHint = document.getElementById('pay-f1-hint');
  if (!altBtn || !altHint) return;
  const show = !!serviceTransferAdded;
  altBtn.style.display = show ? '' : 'none';
  altHint.style.display = show ? '' : 'none';
  const demo = document.getElementById('pay-f1-refuse-demo-wrap');
  if (demo) demo.style.display = show ? '' : 'none';
  f1UpdateCheckoutTransferEntry();
  if (typeof updatePaymentForServices === 'function') updatePaymentForServices();
  const due = document.getElementById('pay-os-duenow');
  const total = document.getElementById('pay-os-total');
  if (due && total) due.textContent = total.textContent;
}

// Booking detail (documentation#38, regrouped): one lane per service with its own details,
// status, amount, reference and actions. The ride lane shows when the booking carries a
// transfer — added at checkout, added from this page, or the demo itinerary a cover
// notification opens (AC 3). Every figure on the page derives from state here, so the
// header total and the itinerary total can never disagree.
let bdItineraryFromNotification = false;
let bdTransferLaneCancelled = false;
let bdRideConf = null;       // Mozio confirmation returned by a post-booking add on this page
let bdAgencyOpen = false;    // agency-only figures; closed every time the page opens
const BD_DEMO_RESERVATION_ID = 'MOZIO-RSV-4938-K2';
let bdRideReservationId = BD_DEMO_RESERVATION_ID;  // Mozio's internal id — agency view only
let bdRideNotBooked = false;       // documentation#37: refused by the provider, never booked
let bdRideNotBookedFare = 0;
let bdRideNotBookedReason = '';
let bdRetrying = false;            // the lane's retry opened the add-transfer flow

function bdRideConfNumber() {
  return bdRideConf || ('MOZ-' + (bookingState.bookingRef || 'PTA18G28E7CUANQ') + '-4821');
}

function bdHasRide() { return !!serviceTransferAdded || bdItineraryFromNotification || bdRideNotBooked; }
function bdHasActiveRide() { return bdHasRide() && !bdTransferLaneCancelled && !bdRideNotBooked; }
function bdRideAmount() {
  if (serviceTransferAdded) return serviceTransferPrice || 0;
  if (bdRideNotBooked) return bdRideNotBookedFare;
  return parseFloat(transferBookingState.price) || 0;
}
// Why an amount is not counted, in the live app's words (serviceLanes.laneAmountNote).
function bdRideNote() {
  return bdRideNotBooked ? 'Not booked — not counted' : 'Refunded — not counted';
}
function bdUSD(v) {
  return 'USD ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// A cancelled service's amount stays visible but reads as not counted.
function bdSetAmount(id, amount, counted, note) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('bd-amount-void', !counted);
  el.innerHTML = counted ? bdUSD(amount) : '<s>' + bdUSD(amount) + '</s><span class="bd-not-counted">' + (note || 'Cancelled — not counted') + '</span>';
}

// The hotel price is Ergos's (bookingState.price); a ride's fare is already the client price
// (serviceTransferPrice), so its Ergos charge is that fare without the agency markup.
function bdTotals() {
  const hotel = parseFloat(bookingState.price) || 0;
  const hotelCounted = !bookingState.isCancelled;
  const rideClient = bdRideAmount();
  const ride = bdErgosPrice(rideClient);
  const rideCounted = bdHasActiveRide();
  const total = (hotelCounted ? hotel : 0) + (rideCounted ? ride : 0);
  const totalClient = (hotelCounted ? bdClientPrice(hotel) : 0) + (rideCounted ? rideClient : 0);
  return { hotel, hotelCounted, ride, rideClient, rideCounted, total, totalClient };
}

// Owner decision 1a: everything visible by default is the CLIENT price (Ergos price × (1 +
// agency markup), the P&L's "Customer paid"); Ergos figures live only in the agency view.
function bdMarkupFactor() {
  const pct = (typeof agencyMarkupState !== 'undefined' && agencyMarkupState.percentage) || 0;
  return 1 + pct / 100;
}
function bdClientPrice(ergos) { return Math.round(ergos * bdMarkupFactor() * 100) / 100; }
function bdErgosPrice(client) { return Math.round(client / bdMarkupFactor() * 100) / 100; }

function bdItRender() {
  const t = bdTotals();
  bdSetAmount('bd-f1-hotel-amount', bdClientPrice(t.hotel), t.hotelCounted);
  if (bdHasRide()) bdSetAmount('bd-f1-transport-amount', t.rideClient, t.rideCounted, bdRideNote());
  // Header: the client's total of the services still booked, cancelled ones excluded.
  const price = document.getElementById('bd-header-price');
  if (price) price.textContent = bdUSD(t.totalClient);
  const label = document.getElementById('bd-header-price-label');
  if (label) label.textContent = t.rideCounted ? 'Trip Total' : 'Total Client Price';
  if (bdAgencyOpen) bdAgencyRender();
}

function bdRenderRideLane() {
  const lane = document.getElementById('bd-f1-transport-lane');
  if (!lane) return;
  const has = bdHasRide();
  lane.hidden = !has;
  if (has) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const s = transferBookingState;
    set('bd-tf-vehicle', serviceTransferVehicle || s.vehicle);
    set('bd-tf-pickup', s.pickup);
    set('bd-tf-dropoff', s.dropoff);
    set('bd-tf-datetime', formatDate(s.date) + ' at ' + s.time);
    set('bd-tf-passengers', String(s.passengers));
    set('bd-tf-provider', s.supplier);
    // The number the client and the driver use — never Mozio's internal reservation id.
    set('bd-f1-transport-conf', bdRideNotBooked ? '—' : bdRideConfNumber());
    const status = document.getElementById('bd-f1-transport-status');
    if (status) {
      status.className = 'status-badge ' + (bdTransferLaneCancelled || bdRideNotBooked ? 'cancelled' : 'confirmed');
      status.textContent = bdRideNotBooked ? 'Not booked' : bdTransferLaneCancelled ? 'Cancelled' : 'Confirmed & paid';
    }
    lane.classList.toggle('is-cancelled', bdTransferLaneCancelled || bdRideNotBooked);
    const actions = document.getElementById('bd-ride-actions');
    if (actions) actions.hidden = bdTransferLaneCancelled || bdRideNotBooked || !!bookingState.isCancelled;
    const reason = document.getElementById('bd-ride-reason');
    if (reason) { reason.hidden = !bdRideNotBooked; reason.textContent = bdRideNotBookedReason; }
  }
  // A refused ride is retried from its own lane — no retry on a cancelled booking.
  const canRetry = bdRideNotBooked && !bookingState.isCancelled;
  const retry = document.getElementById('bd-ride-retry-wrap');
  if (retry) retry.hidden = !canRetry || bdRetrying;
  // ONE add-transfer entry, only while there is no active ride on a live booking — and not
  // beside a lane that already offers the same flow as its retry.
  const add = document.getElementById('bdat-section');
  if (add) add.hidden = bdHasActiveRide() || !!bookingState.isCancelled || (canRetry && !bdRetrying);
  const hotelLane = document.getElementById('bd-lane-hotel');
  if (hotelLane) hotelLane.classList.toggle('is-cancelled', !!bookingState.isCancelled);
  // documentation#47: the saved-link demo exists only while the add entry is withheld for a live ride.
  const guardDemo = document.getElementById('bd-47-demo');
  if (guardDemo) guardDemo.hidden = !bdHasActiveRide() || !!bookingState.isCancelled;
}

// documentation#47 — the add-transfer page opened by link while the booking has a live ride
// (live: AddTransferPage). It never shows the search form: it refuses, or — when the check of the
// booking's transfers fails — says so with Try again, and a successful retry refuses.
function bdGuardShow(state) {
  const refused = document.getElementById('atg-refused');
  const failed = document.getElementById('atg-failed');
  if (refused) refused.hidden = state !== 'refused';
  if (failed) failed.hidden = state !== 'failed';
  const shown = state === 'failed' ? failed : refused;
  if (shown) shown.focus({ preventScroll: true });
}
function bdGuardOpen() {
  const failOnce = document.getElementById('bd-47-fail-once');
  const failed = !!(failOnce && failOnce.checked);
  if (failOnce) failOnce.checked = false;   // fails once: the retry's check goes through
  // The live subtitle carries the hotel's name only — no star rating.
  const copy = (from, to) => { const a = document.getElementById(from), b = document.getElementById(to); if (a && b) b.textContent = a.textContent.replace(/\s*★+\s*$/, ''); };
  copy('bd-header-ref', 'atg-ref');
  copy('bd-hotel-name', 'atg-hotel');
  showScreen('add-transfer-guard');
  bdGuardShow(failed ? 'failed' : 'refused');
}
function bdGuardRetry() { bdGuardShow('refused'); }
function bdGuardBack() { showScreen('booking-detail'); }

// A real booking opened from the list or the confirmation — not the notification demo.
function bdOpenBooking(screen) {
  bdItineraryFromNotification = false;
  showScreen(screen || 'booking-detail');
}

// The lane's retry is the add-transfer flow for this booking.
function bdRideRetry() {
  bdRetrying = true;
  bdRenderRideLane();
  bdatExpand();
  document.getElementById('bdat-pickup')?.focus({ preventScroll: true });
}

let bdNotificationBooking = null;   // { hotel, ref } of the reminder that opened the page
function bdApplyBookingIdentity() {
  const keep = (id) => { const el = document.getElementById(id); if (el && el.dataset.orig == null) el.dataset.orig = el.textContent; return el; };
  const n = bdItineraryFromNotification ? bdNotificationBooking : null;
  [['bd-header-ref', n && n.ref], ['bd-f1-hotel-ref', n && n.ref], ['bd-hotel-name', n && n.hotel]].forEach(([id, v]) => {
    const el = keep(id); if (el) el.textContent = v || el.dataset.orig;
  });
}

function f1RenderOnBookingDetail() {
  bdApplyBookingIdentity();
  bdRenderRideLane();
  bdItRender();
}

/* ---- Agency view: agency↔Ergos figures, hidden by default (owner, 2026-09-25) ----
   Rendered only on the deliberate click and removed on hide, so while it is closed
   none of these amounts is on the page. */
function bdAgencyToggle() { if (bdAgencyOpen) bdAgencyHide(); else bdAgencyShow(); }
function bdAgencySetButton() {
  const btn = document.getElementById('bd-agency-toggle');
  if (!btn) return;
  btn.setAttribute('aria-expanded', bdAgencyOpen ? 'true' : 'false');
  btn.textContent = bdAgencyOpen ? 'Hide agency figures' : 'Show agency figures';
}
function bdAgencyShow() { bdAgencyOpen = true; bdAgencyRender(); bdAgencySetButton(); }
function bdAgencyHide() {
  bdAgencyOpen = false;
  const body = document.getElementById('bd-agency-body');
  if (body) { body.innerHTML = ''; body.hidden = true; }
  bdAgencySetButton();
}
function bdAgencyRender() {
  const body = document.getElementById('bd-agency-body');
  if (!body) return;
  const t = bdTotals();
  const row = (label, val, cls) => '<div class="bd-sc-row' + (cls ? ' ' + cls : '') + '"><dt class="bd-sc-label">' + label + '</dt><dd>' + val + '</dd></div>';
  // How the agency paid Ergos, as chosen at checkout. No card/holder rows for credit.
  const method = document.querySelector('#pmBalance.selected') ? 'Credit balance'
    : document.querySelector('#pmLater.selected') ? 'CREDIT' : 'card';
  const payRows = method === 'card'
    ? row('Method', 'Credit Card') + row('Card', 'Visa ****4222') + row('Holder', 'Testing Guest')
    : row('Method', method);
  const payStatus = bookingState.isCancelled
    ? '<span class="status-badge cancelled">Refunded</span>'
    : '<span class="status-badge confirmed">Paid</span>';
  const refundRow = bookingState.isCancelled && method !== 'card' ? row('Amount Refunded', bdUSD(t.hotel)) : '';
  // After a cancellation the money lives here, not in the page banner (live cancelledBanner.ts).
  const rideRefunded = bdTransferLaneCancelled && !bdRideNotBooked;
  const cancelMoney = !bookingState.isCancelled ? '' :
    '<div class="bd-service-card bd-agency-pnl"><h3 class="bd-card-title">The cancellation and your money</h3><p class="bd-card-hint">' +
      (method === 'card'
        ? 'Refund of ' + bdUSD(t.hotel) + ' is being processed.'
        : bdUSD(t.hotel) + ' has been refunded; your credit account has been restored.') +
      (rideRefunded ? ' The airport transfer has been refunded to your credit account.' : '') +
    '</p></div>';
  // P&L of the whole itinerary — the hotel and its ride — frozen at booking time.
  const markupPct = agencyMarkupState.percentage;
  const rebatePct = 12;
  const ergosCost = t.total;
  const customerPaid = t.totalClient;
  const markup = customerPaid - ergosCost;
  const rebate = ergosCost * rebatePct / 100;
  body.innerHTML = cancelMoney +
    '<div class="bd-agency-grid">' +
      '<div class="bd-service-card"><h3 class="bd-card-title">What Ergos charged you for this itinerary</h3><dl>' +
        row('Paid', bdUSD(t.total)) + row('Outstanding', bdUSD(0)) + row('Itinerary total', bdUSD(t.total)) +
        payRows + refundRow + row('Payment Status', payStatus) +
      '</dl><p class="bd-card-hint" style="margin-top:10px"><b>Paid</b> — what Ergos has charged you for these services so far.<br>' +
        '<b>Outstanding</b> — services still booked that have not been charged yet.<br>' +
        '<b>Itinerary total</b> — every service still booked. Cancelled services are not counted.</p></div>' +
      '<div class="bd-service-card"><h3 class="bd-card-title">Your Ergos account</h3><dl>' +
        row('Due now', 'USD 4,050.00') +
      '</dl><p class="bd-card-hint">What your agency owes Ergos across all bookings — not only this one.</p>' +
        '<button class="btn-secondary" id="bd-settle-balance-btn" onclick="showScreen(\'settle-balance\')">Settle balance</button></div>' +
    '</div>' +
    (bdHasRide() && !bdRideNotBooked ? '<div class="bd-service-card bd-agency-pnl"><h3 class="bd-card-title">Airport transfer — for Ergos support</h3><dl>' +
      row('Mozio reservation id', '<code class="bd-ref" id="bd-agency-mozio-id">' + bdRideReservationId + '</code>') +
      row('Confirmation # (client and driver)', '<code class="bd-ref">' + bdRideConfNumber() + '</code>') +
    '</dl></div>' : '') +
    '<div class="bd-service-card bd-agency-pnl"><h3 class="bd-card-title">Your earnings (P&amp;L)</h3>' +
      '<p class="bd-card-hint">The whole itinerary — the hotel and its airport transfers. A cancelled service counts only the charge you kept.</p><dl>' +
      row('Ergos cost (what you paid)', bdUSD(ergosCost)) +
      row('Customer paid (your sell price)', bdUSD(customerPaid)) +
      row('Your markup income (' + markupPct + '%)', '<span class="bd-pnl-plus">+' + bdUSD(markup) + '</span>') +
      row('Ergos rebate (cashback) (' + rebatePct + '%)', '<span class="bd-pnl-plus">+' + bdUSD(rebate) + '</span>') +
      row('Total profit', bdUSD(markup + rebate), 'bd-pnl-total') +
    '</dl><p class="bd-card-hint" style="margin-top:10px">Frozen at booking time — these values reflect the markup and rebate that were active when this booking was made.</p></div>';
  body.hidden = false;
}

/* ---- Booking-detail dialogs: each mirrors the live agency-app flow ----
   Cancel Booking → CancellationFlow.tsx · Modify Booking → ModifyBookingModal.tsx ·
   ride Modify / Cancel Transfer → TransferSection.tsx. Copy is the live app's. */
function bdFmtDay(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function bdSetText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

// Cancel Booking — the whole itinerary: the room and, with it, its ride (documentation#44).
function bdCancelFigures() {
  const room = parseFloat(bookingState.price) || 0;
  const hasRide = bdHasActiveRide();
  const fare = hasRide ? bdRideAmount() : 0;
  // Inside the free-cancellation window: no room penalty; the ride's policy (100% back
  // ≥ 24 h before pickup) gives the whole fare back.
  const f = { room, roomRefund: room, roomPenalty: 0, hasRide, fare, ridePenalty: 0, rideRefund: fare };
  f.total = room + fare;
  f.totalRefund = f.roomRefund + f.rideRefund;
  f.breakdown = hasRide ? ' (room ' + bdUSD(f.roomRefund) + ' + airport transfer ' + bdUSD(f.rideRefund) + ')' : '';
  return f;
}
function bdCancelStep(step) {
  ['review', 'prompt', 'confirm', 'result'].forEach(k => {
    const el = document.getElementById('bd-cancel-step-' + k);
    if (el) el.classList.toggle('active', k === step);
  });
  const modal = document.querySelector('#bd-cancel-modal .modal');
  if (modal) modal.scrollIntoView({ block: 'start' });
}
function bdCancelOpen() {
  const f = bdCancelFigures();
  const s = transferBookingState;
  bdSetText('bd-cx-checkin', bdFmtDay(bookingState.checkin));
  bdSetText('bd-cx-checkout', bdFmtDay(bookingState.checkout));
  bdSetText('bd-cx-room', bookingState.room + ' — ' + bookingState.mealPlan);
  bdSetText('bd-cx-policy-refund', bdUSD(f.totalRefund));
  bdSetText('bd-cx-policy-breakdown', f.breakdown.trim());
  document.getElementById('bd-cx-ride-policy').hidden = !f.hasRide;
  document.querySelectorAll('#bd-cancel-modal .bd-cx-ride-only').forEach(r => { r.hidden = !f.hasRide; });
  bdSetText('bd-cx-ride-fare', bdUSD(f.fare));
  bdSetText('bd-cx-ride-penalty', bdUSD(f.ridePenalty));
  bdSetText('bd-cx-ride-refund', bdUSD(f.rideRefund));
  bdSetText('bd-cx-room-total', bdUSD(f.room));
  bdSetText('bd-cx-ride-total', bdUSD(f.fare));
  bdSetText('bd-cx-total-label', f.hasRide ? 'Trip Total' : 'Booking Total');
  bdSetText('bd-cx-total', bdUSD(f.total));
  bdSetText('bd-cx-penalty-label', f.hasRide ? 'Cancellation Penalty (room)' : 'Cancellation Penalty');
  bdSetText('bd-cx-room-penalty', bdUSD(f.roomPenalty));
  bdSetText('bd-cx-ride-penalty2', bdUSD(f.ridePenalty));
  bdSetText('bd-cx-refund', bdUSD(f.totalRefund));
  bdSetText('bd-cx-prompt-vehicle', serviceTransferVehicle || s.vehicle);
  bdSetText('bd-cx-prompt-meta', s.pickup + ' → ' + s.dropoff + ' · #' + bdRideConfNumber() + ' · ' + bdUSD(f.fare));
  const ci = bdFmtDay(bookingState.checkin), co = bdFmtDay(bookingState.checkout);
  document.getElementById('bd-cx-confirm-sub').innerHTML = '<strong>' + bookingState.hotel + '</strong> · ' +
    ci.replace(/, \d{4}$/, '') + '–' + co.replace(/^[A-Za-z]+ /, '') + ' · ' + bookingState.room;
  bdSetText('bd-cx-confirm-refund', 'Refund: ' + bdUSD(f.totalRefund) + f.breakdown + ' (full refund, no penalty)');
  // The result states the ROOM's refund only — as the live result step does.
  bdSetText('bd-cx-result-refund', 'Refund of ' + bdUSD(f.roomRefund) + ' will be processed.');
  document.getElementById('bd-cx-reason').value = '';
  document.getElementById('bd-cx-ack').checked = false;
  bdCancelValidate();
  bdCancelStep('review');
  openModal('bd-cancel-modal');
}
function bdCancelValidate() {
  const ok = document.getElementById('bd-cx-reason').value.trim() && document.getElementById('bd-cx-ack').checked;
  document.getElementById('bd-cx-confirm-btn').disabled = !ok;
}
function bdCancelConfirm() {
  const f = bdCancelFigures();
  const btn = document.getElementById('bd-cx-confirm-btn');
  btn.disabled = true; btn.textContent = 'Cancelling...';
  setTimeout(() => {
    btn.textContent = '⊘ Confirm Cancellation';
    if (f.hasRide) bdTransferLaneCancelled = true;
    const msg = 'Your booking has been cancelled.' +
      (f.totalRefund > 0 ? ' Refund of ' + bdUSD(f.totalRefund) + ' will be processed' + f.breakdown + '.' : '') +
      (f.hasRide ? ' 1 airport transfer(s) also cancelled.' : '');
    showCancelSuccess(msg);
    bdCancelStep('result');
  }, 700);
}

// Modify Booking — the hotel stay only (dates, room, guest); the live modal has no ride part.
const BD_MODIFY_ROOMS = [
  { room: 'Standard Room', rate: 'Bed & Breakfast', price: 194.40 },
  { room: 'Standard Room', rate: 'Half Board', price: 294.40 },
  { room: 'Standard Room', rate: 'All Inclusive', price: 394.40 },
  { room: 'Superior Room — Ocean View', rate: 'Bed & Breakfast', price: 284.00 },
];
function bdModifyFillRooms(available) {
  const sel = document.getElementById('bd-mb-room');
  sel.innerHTML = '<option value="">' + (available ? 'Choose from available rooms' : 'No rooms available') + '</option>' +
    (available ? BD_MODIFY_ROOMS.map((r, i) => '<option value="' + i + '">' + r.room + ' - ' + r.rate + ' - $' + r.price.toFixed(2) + '</option>').join('') : '');
  sel.disabled = !available;
  bdModifyValidate();
}
function bdModifyOpen() {
  bdSetText('bd-mb-cur-checkin', bdFmtDay(bookingState.checkin));
  bdSetText('bd-mb-cur-checkout', bdFmtDay(bookingState.checkout));
  bdSetText('bd-mb-cur-room', 'Room: ' + bookingState.room + ' | Rate: N/A | Meal Plan: ' + bookingState.mealPlan);
  document.getElementById('bd-mb-checkin').value = bookingState.checkin;
  document.getElementById('bd-mb-checkout').value = bookingState.checkout;
  document.getElementById('bd-mb-name').value = document.getElementById('bd-guest-name')?.textContent || '';
  document.getElementById('bd-mb-phone').value = document.getElementById('bd-guest-phone')?.textContent || '';
  bdModifyFillRooms(true);
  openModal('bd-modify-modal');
}
function bdModifyDatesChanged() { bdModifyFillRooms(false); }   // new dates invalidate the room choice
function bdModifyApply() {
  const btn = document.getElementById('bd-mb-apply');
  btn.disabled = true;
  setTimeout(() => { btn.disabled = false; bdModifyFillRooms(true); }, 500);
}
function bdModifyValidate() {
  document.getElementById('bd-mb-confirm').disabled = document.getElementById('bd-mb-room').value === '';
}
function bdModifyConfirm() {
  const r = BD_MODIFY_ROOMS[parseInt(document.getElementById('bd-mb-room').value, 10)];
  if (!r) return;
  bookingState.room = r.room;
  bookingState.mealPlan = r.rate;
  bookingState.price = r.price.toFixed(2);
  bookingState.checkin = document.getElementById('bd-mb-checkin').value || bookingState.checkin;
  bookingState.checkout = document.getElementById('bd-mb-checkout').value || bookingState.checkout;
  bdSetText('bd-guest-name', document.getElementById('bd-mb-name').value);
  bdSetText('bd-guest-phone', document.getElementById('bd-mb-phone').value);
  closeModal('bd-modify-modal');
  showToast('success', 'Booking modified successfully.', '');
  updateBookingDetailFromState();
  snapshotBooking();
  updateBookingListFromState();
}

// Ride — Modify Transfer: search a new vehicle, then "Confirm Modification — <price>".
let bdTfmModeVal = 'oneway';
let bdTfmCard = null;
function bdTfmOpen() {
  document.getElementById('bd-tfm-pickup').value = '';
  document.getElementById('bd-tfm-dropoff').value = bookingState.hotel;
  document.getElementById('bd-tfm-date').value = bookingState.checkin;
  document.getElementById('bd-tfm-time').value = '12:00';
  document.getElementById('bd-tfm-pax').value = '2';
  document.getElementById('bd-tfm-airline').value = '';
  document.getElementById('bd-tfm-flightno').value = '';
  bdTfmMode('oneway');
  document.getElementById('bd-tfm-results').hidden = true;
  document.getElementById('bd-tfm-controls').hidden = true;
  document.getElementById('bd-tfm-footer').hidden = true;
  bdTfmCard = null;
  bdTfmValidate();
  openModal('bd-tfm-modal');
}
function bdTfmMode(m) {
  bdTfmModeVal = m;
  document.getElementById('bd-tfm-oneway').classList.toggle('active', m === 'oneway');
  document.getElementById('bd-tfm-roundtrip').classList.toggle('active', m === 'roundtrip');
  document.getElementById('bd-tfm-return').hidden = m !== 'roundtrip';
}
function bdTfmValidate() {
  const filled = id => document.getElementById(id).value.trim() !== '';
  document.getElementById('bd-tfm-search').disabled = !(filled('bd-tfm-pickup') && filled('bd-tfm-dropoff'));
  const confirm = document.getElementById('bd-tfm-confirm');
  const needsFlight = !document.getElementById('bd-tfm-flight').hidden;
  confirm.disabled = !bdTfmCard || (needsFlight && !(filled('bd-tfm-airline') && filled('bd-tfm-flightno')));
}
function bdTfmSearch() {
  const btn = document.getElementById('bd-tfm-search');
  btn.disabled = true; btn.textContent = 'Searching…';
  setTimeout(() => {
    btn.textContent = 'Search Vehicles';
    const list = document.getElementById('bd-tfm-results');
    // The same Mozio quotes the add-transfer search returns on this page.
    list.innerHTML = '';
    document.querySelectorAll('#bdat-results-list .vehicle-card').forEach(src => {
      const c = src.cloneNode(true);
      c.classList.remove('selected');
      const b = c.querySelector('.vc-add-btn');
      if (b) { b.textContent = 'Select'; b.removeAttribute('onclick'); b.addEventListener('click', () => bdTfmSelect(c)); }
      list.appendChild(c);
    });
    const n = list.querySelectorAll('.vehicle-card').length;
    document.getElementById('bd-tfm-count').textContent = n + ' option' + (n !== 1 ? 's' : '') + ' found';
    sortVehicleCards('bd-tfm-results', document.getElementById('bd-tfm-sort').value);
    document.getElementById('bd-tfm-controls').hidden = false;
    list.hidden = false;
    bdTfmCard = null;
    document.getElementById('bd-tfm-footer').hidden = true;
    bdTfmValidate();
  }, 900);
}
function bdTfmSelect(card) {
  document.querySelectorAll('#bd-tfm-results .vehicle-card').forEach(c => {
    const on = c === card && bdTfmCard !== card;
    c.classList.toggle('selected', on);
    const b = c.querySelector('.vc-add-btn'); if (b) b.textContent = on ? 'Selected' : 'Select';
  });
  bdTfmCard = bdTfmCard === card ? null : card;          // a second click deselects
  document.getElementById('bd-tfm-footer').hidden = !bdTfmCard;
  if (bdTfmCard) {
    // Flight info is asked for when the provider tracks the flight — the prototype's checkout rule.
    document.getElementById('bd-tfm-flight').hidden = !/Flight Tracking/i.test(bdTfmCard.textContent);
    const price = parseFloat(bdTfmCard.querySelector('.vc-sell')?.dataset.baseUsd) || 0;
    bdSetText('bd-tfm-confirm', 'Confirm Modification — ' + bdUSD(price));
  }
  bdTfmValidate();
}
function bdTfmConfirm() {
  const card = bdTfmCard; if (!card) return;
  serviceTransferAdded = true;
  serviceTransferVehicle = card.dataset.vehicle;
  serviceTransferPrice = parseFloat(card.querySelector('.vc-sell')?.dataset.baseUsd) || 0;
  serviceTransferNet = parseFloat(card.dataset.basePrice) || 0;
  const s = transferBookingState;
  s.vehicleClass = card.dataset.class || s.vehicleClass;
  s.supplier = card.dataset.provider || s.supplier;
  s.pickup = document.getElementById('bd-tfm-pickup').value.trim();
  s.dropoff = document.getElementById('bd-tfm-dropoff').value.trim();
  s.date = document.getElementById('bd-tfm-date').value || s.date;
  s.time = document.getElementById('bd-tfm-time').value || s.time;
  s.passengers = document.getElementById('bd-tfm-pax').value || s.passengers;
  closeModal('bd-tfm-modal');
  showToast('success', 'Transfer modified successfully', '');
  f1RenderOnBookingDetail();
  if (typeof updateBookingListFromState === 'function') updateBookingListFromState();
}

// Ride — Cancel Airport Transfer: confirm, then the lane reads Cancelled; the hotel stays.
function bdTfcOpen() {
  const s = transferBookingState;
  bdSetText('bd-tfc-vehicle', (serviceTransferVehicle || s.vehicle) + ' (' + s.vehicleClass + ')');
  bdSetText('bd-tfc-pickup', s.pickup);
  bdSetText('bd-tfc-price', bdUSD(bdRideAmount()));
  bdSetText('bd-tfc-conf', bdRideConfNumber());
  openModal('bd-tfc-modal');
}
function bdTfcConfirm() {
  const btn = document.getElementById('bd-tfc-yes');
  btn.disabled = true;
  setTimeout(() => {
    btn.disabled = false;
    bdTransferLaneCancelled = true;
    closeModal('bd-tfc-modal');
    showToast('success', 'Transfer cancelled successfully', '');
    f1RenderOnBookingDetail();
  }, 600);
}

// Hook into showScreen to render F1 on confirmation + payment + booking-detail
(function f1HookShowScreen() {
  const orig = window.showScreen;
  if (typeof orig !== 'function') return;
  window.showScreen = function (id) {
    // The notification demo itinerary survives Open PDF → Back; opening a real booking
    // (the list's or the confirmation's View Booking Details) clears it — bdOpenBooking().
    const r = orig.apply(this, arguments);
    if (id === 'confirmation') setTimeout(f1RenderOnConfirmation, 50);
    if (id === 'payment') setTimeout(f1UpdatePaymentScreenAlternative, 50);
    if (id === 'booking-detail') { bdAgencyHide(); setTimeout(f1RenderOnBookingDetail, 50); }
    return r;
  };
})();

// ========== COMBINED BOOKING (ADD SERVICES) ==========

// Track whether a transfer has been booked for this reservation.
// The transfer is a SEPARATE Mozio booking made AFTER the hotel reservation —
// it is not paid by the card on file; the net fare is billed to the agency's
// Mozio account and the client price (with markup) is tracked in the P&L.
let serviceTransferAdded = false;
let serviceTransferVehicle = null;
let serviceTransferPrice = 0;   // client price (what the agency charges the client)
let serviceTransferNet = 0;     // agency net cost (billed to the Mozio account)
// Working selection on the Add Transfer screen, before "Book Transfer" is pressed.
let selectedVehicleName = null;
let selectedVehicleNet = 0;
let selectedVehiclePrice = 0;

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
    sortServiceVehicles(document.getElementById('svc-tf-sort')?.value || 'price-asc');
    // Update count
    const count = document.getElementById('svc-tf-count');
    const cards = document.querySelectorAll('#svc-tf-results-list .vehicle-card');
    if (count) count.textContent = cards.length + ' option' + (cards.length !== 1 ? 's' : '') + ' found';
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
  const osNet = document.getElementById('svc-os-net');
  const osTfPrice = document.getElementById('svc-os-tf-price');
  const osEmpty = document.getElementById('svc-os-empty');
  const mozioNote = document.getElementById('svc-mozio-note');
  const bookBtn = document.getElementById('svc-book-btn');
  const flightInfo = document.getElementById('svc-flight-info');

  if (wasSelected) {
    // Deselect — clear the working selection (nothing is booked yet)
    selectedVehicleName = null;
    selectedVehicleNet = 0;
    selectedVehiclePrice = 0;
    selectedDiv.style.display = 'none';
    osTransfer.style.display = 'none';
    if (osEmpty) osEmpty.style.display = '';
    if (mozioNote) mozioNote.style.display = 'none';
    if (flightInfo) flightInfo.style.display = 'none';
    if (bookBtn) bookBtn.style.display = 'none';
  } else {
    card.classList.add('selected');
    const addBtn = card.querySelector('.vc-add-btn');
    if (addBtn) addBtn.textContent = '\u2713 Added';
    const name = card.querySelector('.vc-name').textContent;
    const price = parseFloat(card.dataset.price);
    const sellEl = card.querySelector('.vc-sell');
    const clientPrice = sellEl ? parseFloat((sellEl.textContent.match(/[\d.]+/) || [price])[0]) : price;
    selectedVehicleName = name;
    selectedVehicleNet = price;
    selectedVehiclePrice = clientPrice;

    selectedText.textContent = name + ' — ' + formatPrice(price);
    selectedDiv.style.display = 'flex';

    // Capture vehicle class for the confirmation/voucher
    transferBookingState.vehicleClass = card.dataset.class || 'Standard';

    // Flight-info fields: shown only when this provider tracks the flight
    const tracksFlight = /Flight Tracking/i.test(card.textContent);
    if (flightInfo) flightInfo.style.display = tracksFlight ? 'block' : 'none';

    // Transfer-only summary (no hotel total - the room is already paid)
    if (osEmpty) osEmpty.style.display = 'none';
    osTransfer.style.display = 'block';
    osVehicle.textContent = name;
    if (osNet) osNet.textContent = formatPrice(price);
    osTfPrice.textContent = formatPrice(clientPrice);
    if (mozioNote) mozioNote.style.display = 'block';
    if (bookBtn) bookBtn.style.display = '';
  }
}

// Book the selected vehicle as a SEPARATE Mozio reservation (not card-paid).
function bookServiceTransfer() {
  if (!selectedVehicleName) return;
  serviceTransferAdded = true;
  serviceTransferVehicle = selectedVehicleName;
  serviceTransferPrice = selectedVehiclePrice;
  serviceTransferNet = selectedVehicleNet;
  transferBookingState.pickup = (document.getElementById('svc-pickup').value || '').trim();
  transferBookingState.dropoff = (document.getElementById('svc-dropoff').value || '').trim();
  transferBookingState.date = document.getElementById('svc-tf-date').value;
  transferBookingState.time = document.getElementById('svc-tf-time').value;
  transferBookingState.passengers = document.getElementById('svc-tf-pax').value;
  // F1.B — entered from checkout, the transfer is ADDED to this booking, not booked and
  // billed on its own: it is confirmed and paid with the room when payment is confirmed.
  if (transferEntryContext === 'checkout') {
    protoToast('Transfer added — it is paid together with the room at checkout', 'success');
    if (typeof updateBookingListFromState === 'function') updateBookingListFromState();
    showScreen('payment');
    return;
  }
  protoToast('Transfer booked - billed to your Mozio account', 'success');
  renderConfirmationTransfer();
  if (typeof updateBookingListFromState === 'function') updateBookingListFromState();
  showScreen('confirmation');
}

// Render the (separate, billed-to-Mozio) transfer on the confirmation + booking-detail
// screens. The room remains the only card charge.
// Expand the inline transfer flow on the confirmation screen (live-app behaviour):
// the "Add Transfer" CTA reveals the search form → quotes → Book Transfer right here,
// with a "Skip — Hotel Only" option. The transfer UI is relocated into the panel so
// the existing search/select/book handlers keep working against the same element ids.
function confExpandTransfer() {
  // The confirmation path reuses the same card and book handler as the checkout path,
  // so the entry context must be reset or a later add would route back to payment.
  transferEntryContext = 'confirmation';
  const host = document.getElementById('conf-tf-host');
  const actions = document.getElementById('conf-tf-actions');
  const card = document.getElementById('svc-transfer-card');
  const bookBtn = document.getElementById('svc-book-btn');
  if (host && card && card.parentElement !== host) host.appendChild(card);
  if (actions && bookBtn && bookBtn.parentElement !== actions) actions.insertBefore(bookBtn, actions.firstChild);
  // Force the offer card open so the form is visible immediately
  if (card) card.classList.add('active');
  const cfg = document.getElementById('svc-transfer-config');
  if (cfg) cfg.classList.add('open');
  initServiceTransferFromBooking();
  const cta = document.getElementById('conf-add-transfer');
  if (cta) cta.style.display = 'none';
  const panel = document.getElementById('conf-addtf-panel');
  if (panel) panel.style.display = 'block';
}

function confSkipTransfer() {
  removeServiceTransfer();
  const panel = document.getElementById('conf-addtf-panel');
  if (panel) panel.style.display = 'none';
  const cta = document.getElementById('conf-add-transfer');
  if (cta) cta.style.display = '';
}

function renderConfirmationTransfer() {
  const sec = document.getElementById('conf-transfer-section');
  const cta = document.getElementById('conf-add-transfer');
  const panel = document.getElementById('conf-addtf-panel');
  if (!sec) return;
  if (!serviceTransferAdded) {
    sec.style.display = 'none';
    if (cta) cta.style.display = '';
    if (panel) panel.style.display = 'none';
    return;
  }
  sec.style.display = '';
  if (cta) cta.style.display = 'none';
  if (panel) panel.style.display = 'none';
  const arrow = ' → ';
  document.getElementById('conf-tf-route').textContent = transferBookingState.pickup + arrow + transferBookingState.dropoff;
  document.getElementById('conf-tf-vehicle').textContent = serviceTransferVehicle;
  document.getElementById('conf-tf-datetime').textContent = formatDate(transferBookingState.date) + ' at ' + transferBookingState.time;
  document.getElementById('conf-tf-pax').textContent = transferBookingState.passengers;
  const priceEl = document.getElementById('conf-tf-price');
  if (priceEl) priceEl.textContent = formatPrice(serviceTransferPrice);
  const confNumEl = document.getElementById('conf-tf-confnum');
  if (confNumEl) confNumEl.textContent = 'MOZ-' + (bookingState.bookingRef || '8W5D5P') + '-4821';
  // The card charge stays the room only — the transfer is billed to the Mozio account.
  document.getElementById('conf-price').textContent = formatUSD(bookingState.price);
  const h = document.getElementById('conf-heading');
  if (h) h.textContent = 'Transfer added!';
  const sh = document.getElementById('conf-subheading');
  if (sh) sh.textContent = 'The airport transfer is booked and billed to your Mozio account.';
}

function removeServiceTransfer() {
  selectedVehicleName = null;
  selectedVehicleNet = 0;
  selectedVehiclePrice = 0;
  document.querySelectorAll('.vehicle-card').forEach(c => {
    c.classList.remove('selected');
    const btn = c.querySelector('.vc-add-btn');
    if (btn) btn.textContent = '+ Add';
  });
  document.getElementById('svc-tf-selected').style.display = 'none';
  const flightInfo = document.getElementById('svc-flight-info');
  if (flightInfo) flightInfo.style.display = 'none';
  document.getElementById('svc-os-transfer').style.display = 'none';
  const osEmpty = document.getElementById('svc-os-empty');
  if (osEmpty) osEmpty.style.display = '';
  const mozioNote = document.getElementById('svc-mozio-note');
  if (mozioNote) mozioNote.style.display = 'none';
  const bookBtn = document.getElementById('svc-book-btn');
  if (bookBtn) bookBtn.style.display = 'none';
}

function updatePaymentForServices() {
  const payTransfer = document.getElementById('pay-os-transfer');
  const payTotal = document.getElementById('pay-os-total');
  const summaryTitle = document.getElementById('pay-summary-title');

  if (serviceTransferAdded) {
    payTransfer.style.display = 'block';
    // F1.B / AC3 — a round trip is ONE item at ONE price: both directions ride on this
    // single line and the single fare below it, never a second transfer row.
    document.getElementById('pay-os-route').textContent =
      document.getElementById('svc-pickup').value.split('(')[0].trim() + ' → Hotel'
      + (transferMode === 'roundtrip' ? ' (round trip)' : '');
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
    // Ergos payment-module spec (target design): three payment paths.
    //  card    — agency corporate card on TropiPay's hosted form; bed bank confirmed
    //            only after the payment confirms → CONFIRMED_PAID.
    //  balance — deposit-based accounts: draw down the topped-up balance (limit =
    //            2 × deposits, deposits spend first) → CONFIRMED_PAID.
    //  later   — "Pay with soft credit" (granted account): the account draws down at
    //            confirm and the booking is PAID (no card fee); only the settlement
    //            comes later. Granted = hard-capped, never overdrafts.
    //            Overdraft demo (deposit-based balance, free-cxl rates only): confirms
    //            with a COVER deadline (≤72 h, inside the free-cxl window) → CONFIRMED_UNPAID.
    const pmMode = window.__pmMode || 'card';
    const pmOverdraft = pmMode === 'balance' && !!document.getElementById('pmOdDemo')?.checked;
    // Cover deadline computed at confirm time (now + 48 h) so the demo never reads as swept.
    const pmCoverBy = new Date(Date.now() + 2 * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', 16:00';
    if (typeof protoToast === 'function') {
      if (pmMode === 'card') protoToast('Corporate card charged $201.20 via TropiPay ($194.40 rate + $6.80 card fee) — booking confirmed with the bed bank.', 'success');
      else if (pmOverdraft) protoToast('Confirmed — the rate drew $230.00 beyond your limit (free-cancellation rate). Cover $230 by ' + pmCoverBy + ' or the booking is auto-cancelled fee-free.', 'default');
      else if (pmMode === 'balance') protoToast('Paid from credit balance ($194.40 drawn — no card fee) — booking confirmed.', 'success');
      else protoToast('Paid with soft credit ($194.40 drawn — no card fee) — booking confirmed. The balance settles later.', 'success');
    }

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
      // Mozio confirmation number, derived from the booking reference
      const confNumEl = document.getElementById('conf-tf-confnum');
      if (confNumEl) confNumEl.textContent = 'MOZ-' + (bookingState.bookingRef || 'PTAMQ7T') + '-4821';

      // Show breakdown
      confBreakdown.style.display = '';
      document.getElementById('conf-hotel-subtotal').textContent = formatUSD(bookingState.price);
      document.getElementById('conf-tf-subtotal').textContent = formatPrice(serviceTransferPrice);

      confHeading.textContent = 'Trip Booked!';
      confSubheading.textContent = 'Your client\'s hotel stay and airport transfer have been confirmed.';

      // Bookings list will re-render dynamically on next visit

      // Update booking detail (the ride lane renders from transferBookingState)
      updateBookingDetailFromState();
    } else {
      document.getElementById('conf-price').textContent = formatUSD(bookingState.price);
      confTfSection.style.display = 'none';
      confBreakdown.style.display = 'none';
      // Offer the (separate, post-booking) Mozio transfer
      const confAddCta = document.getElementById('conf-add-transfer');
      if (confAddCta) confAddCta.style.display = '';
      confHeading.textContent = 'You\'re all set!';
      confSubheading.textContent = 'Your client\'s stay has been confirmed. Here\'s everything you need.';

      // Bookings list re-renders dynamically

      updateBookingDetailFromState();
      updateBookingListFromState();
    }

    // Soft credit: PAID at confirm — normal confirmed screen with a note.
    // Overdraft demo (deposit-based balance, free-cxl rates only): confirmed with a COVER
    // deadline (a cover obligation, not a payment deadline — the booking already drew the
    // account) → status CONFIRMED_UNPAID. Reset first so state never leaks between demo runs.
    const confStatus = document.getElementById('conf-status');
    if (confStatus) {
      confStatus.textContent = 'CONFIRMED';
      confStatus.className = 'status-badge confirmed';
      confStatus.style.background = '';
      confStatus.style.color = '';
    }
    if (pmOverdraft) {
      const h = document.getElementById('conf-heading');
      const s = document.getElementById('conf-subheading');
      if (h) h.textContent = 'Confirmed — cover $230 by ' + pmCoverBy;
      if (s) s.textContent = 'Paid from your deposit-based credit account — the rate drew $230.00 beyond your limit (free-cancellation rate, deficit ≤ min(25% of limit, $2,500)). Cover $230 by ' + pmCoverBy + ' — 48 h, inside the free-cancellation window — or the booking is auto-cancelled fee-free and a strike is recorded. Reminders: 30 d / 7 d / 24 h, computed at send time.';
      if (confStatus) {
        confStatus.textContent = 'CONFIRMED_UNPAID';
        confStatus.className = 'status-badge';
        confStatus.style.background = '#fef3c7';
        confStatus.style.color = '#b45309';
      }
    } else if (pmMode === 'later') {
      const s = document.getElementById('conf-subheading');
      if (s) s.textContent = 'Paid with soft credit — no card fee. Your account drew down at confirm; the balance settles later on the Settle balance screen.';
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
      // E1 — this performSearch override activates screen-results DIRECTLY
      // (bypassing showScreen), so the showScreen-based e1 hook never fires.
      // Run the POI/city/country filter here so the cards the user sees
      // actually match what they typed.
      if (typeof e1ApplyToResults === 'function') e1ApplyToResults();
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

// Sort transfer vehicle cards (documentation#46) — the live list's four orders, cheapest
// first by default. Checkout cards carry data-price/-capacity/-supplier; the booking-page
// cards carry data-base-price/-maxpax/-provider.
function sortVehicleCards(listId, criteria) {
  const list = document.getElementById(listId);
  if (!list) return;
  const price = c => parseFloat(c.dataset.price || c.dataset.basePrice) || 0;
  const seats = c => parseInt(c.dataset.capacity || c.dataset.maxpax, 10) || 0;
  const provider = c => c.dataset.supplier || c.dataset.provider || '';
  const compare = {
    'price-asc': (a, b) => price(a) - price(b),
    'price-desc': (a, b) => price(b) - price(a),
    'capacity-desc': (a, b) => seats(b) - seats(a),
    'provider-asc': (a, b) => provider(a).localeCompare(provider(b)),
  }[criteria] || ((a, b) => price(a) - price(b));
  Array.from(list.querySelectorAll('.vehicle-card')).sort(compare).forEach(card => list.appendChild(card));
}

function sortServiceVehicles(criteria) {
  sortVehicleCards('svc-tf-results-list', criteria);
}

/* ============================================================
   MOZIO — POST-BOOKING "ADD TRANSFER" (booking-detail page)
   Mirrors the real TransferSection.tsx / BookingConfirmationPage
   "Add Transfer" CTA: a confirmed booking can add a Mozio airport
   transfer after the fact. States: collapsed CTA → search form →
   quote results → booked (with mozioConfirmationNumber).
   Self-contained bdat-* ids; net prices are USD, client price uses
   the agency markup + selected currency (formatPrice / data-base-usd).
   ============================================================ */

let bdatMode = 'oneway';
let bdatSelectedCard = null;

function bdatExpand() {
  const cta = document.getElementById('bdat-cta');
  const panel = document.getElementById('bdat-panel');
  if (cta) cta.style.display = 'none';
  if (panel) { panel.style.display = ''; panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

function bdatCollapse() {
  const cta = document.getElementById('bdat-cta');
  const panel = document.getElementById('bdat-panel');
  const results = document.getElementById('bdat-results');
  if (panel) panel.style.display = 'none';
  if (results) results.style.display = 'none';
  if (cta) cta.style.display = '';
  bdatSelectedCard = null;
  if (bdRetrying) { bdRetrying = false; bdRenderRideLane(); }
  document.querySelectorAll('#bdat-results-list .vehicle-card').forEach(c => {
    c.classList.remove('selected');
    const b = c.querySelector('.vc-add-btn');
    if (b) b.textContent = 'Select';
  });
}

function bdatSwap() {
  const p = document.getElementById('bdat-pickup');
  const d = document.getElementById('bdat-dropoff');
  if (!p || !d) return;
  const tmp = p.value; p.value = d.value; d.value = tmp;
}

function bdatSetMode(mode) {
  bdatMode = mode;
  document.getElementById('bdat-mode-oneway')?.classList.toggle('active', mode === 'oneway');
  document.getElementById('bdat-mode-roundtrip')?.classList.toggle('active', mode === 'roundtrip');
  const row = document.getElementById('bdat-return-row');
  if (row) row.style.display = mode === 'roundtrip' ? '' : 'none';
}

function bdatSearch() {
  const btn = document.querySelector('.bdat-search-btn');
  const results = document.getElementById('bdat-results');
  if (!btn || !results) return;
  // Reset any prior selection
  bdatSelectedCard = null;
  document.querySelectorAll('#bdat-results-list .vehicle-card').forEach(c => {
    c.classList.remove('selected');
    const b = c.querySelector('.vc-add-btn');
    if (b) b.textContent = 'Select';
  });
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-sm"></span> Searching Mozio…';
  btn.disabled = true;
  results.style.display = 'none';
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.disabled = false;
    results.style.display = 'block';
    // Re-price client-facing amounts in the active currency
    if (typeof updateVisiblePrices === 'function') updateVisiblePrices();
    sortVehicleCards('bdat-results-list', document.getElementById('bdat-sort')?.value || 'price-asc');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (typeof protoToast === 'function') protoToast('2 Mozio quotes returned for ' + (document.getElementById('bdat-dropoff')?.value || 'the hotel'), 'info');
  }, 1100);
}

function bdatSelect(card) {
  if (!card) return;
  document.querySelectorAll('#bdat-results-list .vehicle-card').forEach(c => {
    c.classList.remove('selected');
    const b = c.querySelector('.vc-add-btn');
    if (b) b.textContent = 'Select';
  });
  card.classList.add('selected');
  const addBtn = card.querySelector('.vc-add-btn');
  if (addBtn) addBtn.textContent = '✓ Selected';
  bdatSelectedCard = card;
  const note = document.getElementById('bdat-policy-note');
  if (note) {
    note.style.display = 'block';
    note.innerHTML = BDAT_PHONE_FIELD
      + '<button class="btn-primary bdat-book-btn" onclick="bdatBook()">Book Transfer — '
      + (card.querySelector('.vc-sell')?.textContent || '') + '</button>'
      + '<span class="bdat-policy-text">' + (card.dataset.cancel || '') + '</span>';
    // Pre-filled from the guest's phone — country AND local number, as live.
    protoPhoneSet(
      'bdat-phone',
      protoPhoneSelected('guest-phone').code,
      protoPhoneLocal('guest-phone')
    );
  }
}

// documentation#53 AC 3 — the passenger phone the driver calls, checked on Book before
// anything is reserved (live AddTransferPage). Pre-filled from the guest's phone.
const BDAT_PHONE_REFUSED = "Pick the passenger's country, then type their local number — the driver needs a number they can reach.";
const BDAT_PHONE_FIELD =
  '<span class="form-group bdat-phone-group" style="display:block;margin-bottom:10px">'
  + protoPhoneMarkup('bdat-phone', 'Passenger phone', 'us')
  + '</span>';
function bdatPhoneOk() {
  return protoPhoneOk('bdat-phone');
}
function bdatRefusePhone() {
  protoPhoneRefuse('bdat-phone', BDAT_PHONE_REFUSED);
}

function bdatGenConfNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let n = '';
  for (let i = 0; i < 8; i++) n += chars[Math.floor(Math.random() * chars.length)];
  return 'MOZ-' + n;
}

// Booking a quote here makes it THE ride of this booking: the Services section then shows
// it as the ride lane and the add-transfer entry goes away (one entry, only with no ride).
function bdatBook() {
  const card = bdatSelectedCard;
  if (!card) { if (typeof protoToast === 'function') protoToast('Select a vehicle first', 'error'); return; }
  if (!bdatPhoneOk()) return bdatRefusePhone();
  const btn = document.querySelector('.bdat-book-btn');
  if (btn) { btn.textContent = 'Booking with Mozio…'; btn.disabled = true; }
  setTimeout(() => {
    const vehicle = card.dataset.vehicle;
    const vClass = card.dataset.class;
    const baseUsd = parseFloat(card.querySelector('.vc-sell')?.dataset.baseUsd);
    const conf = bdatGenConfNumber();

    serviceTransferAdded = true;
    serviceTransferVehicle = vehicle + ' · ' + vClass;
    serviceTransferPrice = isNaN(baseUsd) ? 0 : baseUsd;
    serviceTransferNet = parseFloat(card.dataset.basePrice) || 0;
    transferBookingState.pickup = document.getElementById('bdat-pickup')?.value || '';
    transferBookingState.dropoff = document.getElementById('bdat-dropoff')?.value || '';
    transferBookingState.date = document.getElementById('bdat-date')?.value || transferBookingState.date;
    transferBookingState.time = document.getElementById('bdat-time')?.value || transferBookingState.time;
    transferBookingState.passengers = document.getElementById('bdat-pax')?.value || '2';
    transferBookingState.supplier = card.dataset.provider || transferBookingState.supplier;
    bdRideConf = conf;
    bdRideReservationId = 'MOZIO-RSV-' + Math.floor(1000 + Math.random() * 9000) + '-' + conf.slice(4, 6);
    bdTransferLaneCancelled = false;
    bdRideNotBooked = false;

    bdatCollapse();
    f1RenderOnBookingDetail();
    if (typeof updateBookingListFromState === 'function') updateBookingListFromState();
    document.getElementById('bd-f1-transport-lane')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (typeof showToast === 'function') {
      showToast('success', 'Transfer Booked', 'Mozio confirmation ' + conf + ' · ' + vehicle + '. Added to this booking and the client invoice.');
    } else if (typeof protoToast === 'function') {
      protoToast('Transfer booked · Mozio ' + conf, 'success');
    }
  }, 1100);
}

// documentation#37 — the checkout's two failure answers. Installed last, so it wraps the
// final confirmBooking (the combined-booking override above replaces earlier wrappers).
//  • A phone the ride cannot be booked with is refused BEFORE payment: back on Guest
//    Details, the error on the field, nothing charged.
//  • Demo: the provider refuses the ride after the hotel is booked — the hotel stands, the
//    ride's fare comes back, and the booking detail shows a "Not booked" ride lane.
(function f1WrapCheckoutFailures() {
  const orig = window.confirmBooking;
  if (typeof orig !== 'function') return;
  window.confirmBooking = function () {
    // Live BookingPage.tsx checks the phone on the soft-credit rail only.
    if (serviceTransferAdded && window.__pmMode === 'later' && !f1RidePhoneOk()) return f1RefusePhone();
    // documentation#53 AC 6 — then a missing flight field, shown where the employee is looking.
    // The payments-lane module names the credit rail 'balance' ('later' was the older name).
    if (serviceTransferAdded && ['later', 'balance'].includes(window.__pmMode) && f1MissingFlightField()) return f1RefuseFlight();
    // A new booking starts clean: no ride state carries over from the previous one.
    bdTransferLaneCancelled = false;
    bdRideNotBooked = false;
    bdRideNotBookedFare = 0;
    bdRideNotBookedReason = '';
    bdRetrying = false;
    bdRideConf = null;
    bdRideReservationId = BD_DEMO_RESERVATION_ID;
    const demo = document.getElementById('pay-f1-refuse-demo');
    const refuse = !!(serviceTransferAdded && demo && demo.checked);
    if (demo) demo.checked = false;
    // The booking carries the whole number: the picker's dial code + the local part.
    if (document.getElementById('guest-phone')) {
      bdSetText('bd-guest-phone', protoPhoneFull('guest-phone'));
    }
    if (refuse) return f1RunSagaOverlay(() => { f1RideRefusedAfterHotel(); orig.apply(this); }, true);
    return orig.apply(this, arguments);
  };
})();
