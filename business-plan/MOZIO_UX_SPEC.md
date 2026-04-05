# Mozio Ground Transportation -- UX Specification for Ergos Continental Prototype

## Architecture Decision: 6 New Screens + 2 Modified Screens

**New prototype screens (tabs 11-16):**
- 11. Transfer Search Results
- 12. Vehicle Detail (inline expansion, not a separate page)
- 13. Transfer Passenger Info
- 14. Transfer Payment
- 15. Transfer Confirmation
- 16. Transfer Booking Detail

**Modified existing screens:**
- 1. Home / Search (add transport tab to search box)
- 7. My Bookings (add transfer booking cards alongside hotel bookings)

**New modals:**
- Transfer Modify Modal
- Transfer Cancel Modal

---

## Screen 1 (Modified): Home / Search -- Transport Tab Integration

### Design Approach

Add a **segmented tab control** inside the search box, positioned above the search fields row. This mirrors the Booking.com/Kayak pattern where the product type selector sits within the search container rather than being a separate section. This is superior to a separate section because: (a) it shares the hero real estate efficiently, (b) the agent's mental model is "I'm searching" regardless of product type, (c) it reduces the page length and keeps the search above the fold.

### Layout Description

```
[Search Box - white card, same border-radius and shadow as current]
  [Tab Row - top of search box, above field row]
    [Hotels Tab - active by default, icon: bed]  [Transfers Tab - icon: car]
  [--- separator line ---]
  [Search Fields Row - changes based on active tab]
    IF Hotels tab active:
      [Destination] [Check-in] [Check-out] [Rooms & Guests] [Search]
      (identical to current implementation)
    IF Transfers tab active:
      [Pickup Location] [Dropoff Location] [Transfer Date] [Time] [Passengers] [Search]
```

### Transfers Search Fields (when Transfers tab is active)

**Row 1 (all fields inline, same layout pattern as hotel search):**

1. **Pickup Location** (flex: 1.4)
   - Label: `PICKUP`
   - Icon: map-pin (filled circle at bottom)
   - Placeholder: "Airport, hotel, or address..."
   - Prefilled value: "Jose Marti Intl Airport (HAV)"
   - Autocomplete dropdown shows: Airports first, then Hotels, then Addresses
   - CSS class reuse: `.search-field`, `.search-input-wrap`, `.search-input`

2. **Dropoff Location** (flex: 1.4)
   - Label: `DROPOFF`
   - Icon: map-pin (different color or style -- use a target/flag icon)
   - Placeholder: "Hotel, address, or airport..."
   - Prefilled value: "Gran Muthu Habana, Miramar"
   - Same autocomplete pattern
   - Between Pickup and Dropoff: a **swap button** (circular, 28x28, border, arrows icon) positioned at the border between the two fields. This is a critical UX pattern from Google Maps/Uber that agents will expect.

3. **Transfer Date** (flex: 0.8)
   - Label: `DATE`
   - Icon: calendar (same as hotel check-in)
   - Input: date picker
   - Prefilled: "2026-03-25"

4. **Time** (flex: 0.6)
   - Label: `TIME`
   - Icon: clock
   - Input: time picker or select with 30-minute intervals
   - Prefilled: "14:30"
   - This is a NEW field not in the hotel flow -- critical for transfers

5. **Passengers** (flex: 0.6)
   - Label: `PASSENGERS`
   - Icon: user (same as rooms & guests)
   - Input: stepper dropdown (simpler than rooms/guests -- just a number 1-50)
   - Prefilled: "2"

6. **Search Button** (same as hotel)
   - Same `.search-btn` style
   - Text: "Search"

**Below the search fields row:**

A **mode selector** row with three pill/chip options:
- `One Way` (default, selected)
- `Round Trip` (when selected, shows a Return Date + Return Time row below)
- `Hourly` (when selected, replaces Dropoff with Duration selector: 2h, 3h, 4h, 6h, 8h)

CSS classes: `.transfer-mode-pills` container, `.mode-pill` for each option, `.mode-pill.active`

**When Round Trip is selected, insert below the main row:**
```
[Return Date] [Return Time]
```
Styled as a secondary row with a subtle background difference and "Return Journey" label.

### New CSS Classes Needed

```css
/* Tab control inside search box */
.search-tabs {
  display: flex;
  gap: 0;
  padding: 4px 18px 0;
  border-bottom: 1px solid var(--warm-200);
}
.search-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--warm-400);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition);
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
}
.search-tab:hover { color: var(--warm-600); }
.search-tab.active {
  color: var(--primary);
  border-bottom-color: var(--accent);
}
.search-tab svg { flex-shrink: 0; }

/* Transfer mode pills */
.transfer-mode-pills {
  display: flex;
  gap: 8px;
  padding: 12px 18px 6px;
}
.mode-pill {
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid var(--warm-200);
  background: var(--white);
  color: var(--warm-500);
  transition: all var(--transition);
}
.mode-pill:hover { border-color: var(--warm-300); color: var(--warm-700); }
.mode-pill.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* Swap button between pickup/dropoff */
.swap-btn {
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--white);
  border: 1.5px solid var(--warm-200);
  color: var(--warm-400);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all var(--transition);
}
.swap-btn:hover {
  border-color: var(--primary-bright);
  color: var(--primary-bright);
  background: #eef2ff;
}

/* Return journey row (round trip only) */
.search-return-row {
  display: flex;
  gap: 0;
  padding: 0 18px 8px;
  border-top: 1px dashed var(--warm-200);
  margin-top: 4px;
}
.search-return-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--warm-400);
  text-transform: uppercase;
  letter-spacing: .6px;
  padding: 10px 18px 0;
}
```

### Mobile Responsive (<=640px)

- Search tabs stack horizontally (they are only two, so they fit)
- Mode pills stay horizontal (three items, small footprint)
- Search fields stack to 100% width just like hotel fields currently do
- Swap button repositions between vertically stacked pickup/dropoff (centered horizontally, between the two stacked fields)
- Time field shares a row with Date field at 50% each

### Prototype Data

- Pickup: "Jose Marti Intl Airport (HAV)"
- Dropoff: "Gran Muthu Habana, Miramar, Havana"
- Date: March 25, 2026
- Time: 14:30
- Passengers: 2
- Mode: One Way

### Hero Text Update

When Transfers tab is active, update hero copy:
- H1: "Every client deserves a story worth telling" (keep same)
- Subtitle changes to: "Seamless airport transfers and ground transport in 150+ countries"

### Trending chips update

When Transfers tab is active, show transfer-relevant chips:
- "HAV Airport Transfers"
- "Havana City Tours"
- "Varadero Shuttle"
- "VIP Airport Pickup"

---

## Screen 11: Transfer Search Results

### Design Approach

This screen mirrors the hotel search results layout (sidebar filters + results list) but adapts the content for ground transportation. The key difference: transfer results are simpler and more comparison-oriented than hotel results -- agents primarily compare on price, vehicle type, and cancellation policy. This means the card design should be optimized for rapid scanning and comparison.

### Page Structure

```
[Navbar - identical to hotel results]
[Transfer Search Summary Bar - navy background, mirrors .results-search-bar]
  [Pickup icon] Jose Marti Airport (HAV)  ->  [Dropoff icon] Gran Muthu Habana
  [Calendar] Mar 25, 2026  [Clock] 2:30 PM  [Users] 2 Passengers  [One Way badge]
  [Edit button]

[Results Layout - .results-layout flex container]
  [LEFT: Filter Sidebar - .filter-sidebar]
  [RIGHT: Results List]
```

### Transfer Search Summary Bar

Reuses `.results-search-bar` with transfer-specific content. New element: an arrow indicator between pickup and dropoff locations.

```css
.rsb-arrow {
  color: rgba(255,255,255,.5);
  font-size: 14px;
  flex-shrink: 0;
}
```

### Filter Sidebar (Left)

Adapts the existing `.filter-sidebar` pattern:

```
[Filters]
  [Vehicle Type]
    [ ] Sedan (4)
    [ ] SUV (2)
    [ ] Van (3)
    [ ] Minibus (1)
    [ ] Bus (2)
    [ ] Limousine (1)
  [Price Range]
    [Range slider: $0 - $500]
  [Vehicle Class]
    [ ] Economy
    [ ] Standard
    [ ] Business
    [ ] First Class
  [Amenities]
    [ ] WiFi
    [ ] Meet & Greet
    [ ] Flight Tracking
    [ ] Wheelchair Accessible
    [ ] Child Seat Available
    [ ] English Speaking
  [Cancellation Policy]
    ( ) All options
    ( ) Free cancellation only
    ( ) Non-refundable only
  [Service Type]
    ( ) All
    ( ) Private transfer
    ( ) Shared shuttle
  [Sort By]
    [Price: Low to High (default)]
    [Price: High to Low]
    [Vehicle Class]
    [Supplier]
```

All filter elements reuse existing CSS classes: `.filter-section`, `.filter-check`, `.filter-radio`, `.filter-select`, `.range-slider`, etc.

### Transfer Result Cards

Each card represents one vehicle option from Mozio. The card design prioritizes the information hierarchy that agents need for rapid comparison:

1. Vehicle type + image (identity)
2. Price (decision driver)
3. Max passengers + bags (feasibility check)
4. Cancellation policy (risk assessment)
5. Supplier/provider (trust)
6. Amenities (differentiators)

**Card Layout:**

```
[Transfer Card - .transfer-card]
  [LEFT: Vehicle Image - .tc-img]
    [Vehicle photo or type icon illustration]
    [Class Badge: "Business" - gold background, positioned top-left]
    [Service Badge: "Private" or "Shared" - positioned top-right]
  [CENTER: Vehicle Info - .tc-body]
    [TOP ROW]
      [Vehicle Name - h3: "Mercedes E-Class or similar"]
      [Supplier: "Supplied by CubaTransfer" - small text]
    [CAPACITY ROW]
      [Passengers icon] Up to 3  |  [Luggage icon] 2 bags  |  [Clock icon] ~35 min
    [TAGS ROW]
      [Free Cancellation - teal tag]  [Meet & Greet - blue tag]  [Flight Tracking - blue tag]
    [AMENITIES ROW - small icons]
      WiFi  |  English  |  SMS Notifications
    [CANCELLATION DETAIL - expandable on click]
      "Free cancellation up to 24h before pickup. 50% charge within 24h."
  [RIGHT: Price + Action - .tc-price-col]
    [PRICE]
      "USD 45.00" - large display font
      "per vehicle" - small label
    [SELECT BUTTON]
      "Select Vehicle" - .book-btn style
    [PROVIDER LOGO placeholder - small, bottom]
```

**For Shared Shuttle/Bus results, the card includes an additional element:**

```
[SCHEDULE SECTION - inside card, below tags]
  "Available departures:"
  [2:00 PM] [2:30 PM] [3:00 PM] [3:30 PM]  <- selectable time chips
  "per person" pricing instead of "per vehicle"
```

### New CSS Classes

```css
/* Transfer result card */
.transfer-card {
  display: flex;
  background: var(--white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  margin-bottom: 18px;
  border: 1px solid var(--warm-200);
  transition: all .25s ease;
}
.transfer-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--warm-300);
}

/* Vehicle image section */
.tc-img {
  width: 220px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: var(--warm-100);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tc-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.tc-class-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: var(--radius);
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: .3px;
}
.tc-class-badge.economy { background: var(--warm-500); }
.tc-class-badge.standard { background: var(--teal); }
.tc-class-badge.business { background: var(--accent); }
.tc-class-badge.first-class {
  background: linear-gradient(135deg, var(--accent), #e8a721);
}

.tc-service-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: var(--radius);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.tc-service-badge.private {
  background: var(--primary);
  color: #fff;
}
.tc-service-badge.shared {
  background: #eef2ff;
  color: var(--primary-bright);
  border: 1px solid #c7d2fe;
}

/* Card body */
.tc-body {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
}
.tc-body h3 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--warm-800);
}
.tc-supplier {
  font-size: 12px;
  color: var(--warm-400);
  margin-bottom: 12px;
}
.tc-supplier strong { color: var(--warm-600); }

/* Capacity row */
.tc-capacity {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--warm-500);
  margin-bottom: 12px;
  align-items: center;
}
.tc-capacity-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.tc-capacity-sep {
  width: 1px;
  height: 16px;
  background: var(--warm-200);
}

/* Tags reuse existing .hotel-card-tags, .tag, .tag-refund, etc. */

/* Amenity pills - smaller than tags */
.tc-amenities {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.tc-amenity {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
}

/* Expandable cancellation detail */
.tc-cancel-detail {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--warm-50);
  border-radius: var(--radius);
  border: 1px solid var(--warm-200);
  display: none;
}
.tc-cancel-detail.show { display: block; }
.tc-cancel-toggle {
  font-size: 12px;
  color: var(--primary-bright);
  cursor: pointer;
  font-weight: 600;
  margin-top: 6px;
  background: none;
  border: none;
  padding: 0;
}

/* Price column */
.tc-price-col {
  width: 180px;
  flex-shrink: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  border-left: 1px solid var(--warm-100);
  text-align: right;
}
.tc-price {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--warm-900);
  letter-spacing: -.3px;
}
.tc-price-label {
  font-size: 12px;
  color: var(--warm-400);
  margin-bottom: 14px;
}
.tc-select-btn {
  /* Reuses .book-btn styling */
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 11px 22px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.tc-select-btn:hover { background: var(--accent-hover); }

/* Shared shuttle schedule selector */
.tc-schedule {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--warm-200);
}
.tc-schedule-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--warm-400);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 8px;
}
.tc-schedule-times {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tc-time-chip {
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid var(--warm-200);
  background: var(--white);
  color: var(--warm-600);
  transition: all var(--transition);
}
.tc-time-chip:hover {
  border-color: var(--primary-bright);
  color: var(--primary-bright);
}
.tc-time-chip.selected {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
```

### Loading State

When the search is submitted, show a loading overlay similar to the hotel search but with transfer-specific copy:

```
[Search Loading Overlay]
  [Spinner]
  "Finding the best vehicles for your route..."
  [Progress text that updates via polling simulation:]
    "Checking 12 providers..."  ->  "Found 8 options..."  ->  "Finalizing results..."
```

This mirrors the Mozio polling behavior (results arrive incrementally) and gives the agent confidence that the system is working. Implemented as a modified version of `.search-loading-overlay`.

```css
.search-loading-progress {
  font-size: 13px;
  color: rgba(255,255,255,.6);
  margin-top: 8px;
  min-height: 20px;
}
```

### Results Header

```
[8 vehicles found]  [Route summary: Jose Marti Airport -> Gran Muthu Habana, ~35 min, 22 km]
```

The route distance/duration info is displayed as a subtle info line below the count. This sets context without cluttering the results.

```css
.results-route-info {
  font-size: 12px;
  color: var(--warm-400);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
```

### Prototype Data (8 results)

| # | Vehicle | Class | Type | Pax | Bags | Price | Cancel | Supplier | Amenities |
|---|---------|-------|------|-----|------|-------|--------|----------|-----------|
| 1 | Toyota Corolla or similar | Economy | Private | 3 | 2 | $28.00 | Free cancel 24h | HavanaCars | English, SMS |
| 2 | Mercedes E-Class or similar | Business | Private | 3 | 2 | $45.00 | Free cancel 48h | CubaTransfer | WiFi, Meet&Greet, Flight Tracking, English |
| 3 | Ford Explorer or similar | Standard | Private | 5 | 4 | $52.00 | Free cancel 24h | CubaTransfer | English, Child Seat |
| 4 | Mercedes V-Class or similar | Business | Private | 6 | 6 | $68.00 | Free cancel 48h | EliteCuba | WiFi, Meet&Greet, Flight Tracking, English, SMS |
| 5 | Mercedes S-Class or similar | First Class | Private | 3 | 2 | $95.00 | Free cancel 72h | EliteCuba | WiFi, Meet&Greet, Flight Tracking, English, Power, SMS |
| 6 | Shared Airport Shuttle | Economy | Shared | 12 | 1pp | $12.00/pp | Non-refundable | ViaCuba | English |
| 7 | Toyota HiAce or similar | Standard | Private | 10 | 8 | $85.00 | Free cancel 24h | HavanaCars | English, Wheelchair |
| 8 | Luxury Limousine | First Class | Private | 4 | 3 | $150.00 | Free cancel 72h | EliteCuba | WiFi, Meet&Greet, Flight Tracking, English, Power, Champagne |

### Mobile Responsive (<=1024px)

- Filter sidebar goes to top (same as hotel results, stacks above results)
- Transfer cards become vertical:
  - Vehicle image takes full width, height 160px
  - Body content stacks below
  - Price column becomes a horizontal footer bar within the card

### Mobile (<=640px)

- Transfer card image: full width, 140px height
- Price and Select button become a sticky bottom bar within each card
- Capacity items wrap to two lines if needed
- Amenity pills become scrollable horizontal

---

## Screen 12: Vehicle Detail (Inline Expansion -- Not a Separate Screen)

### Design Decision

Do NOT create a separate detail page for vehicles. Unlike hotels (which have rooms, amenities, descriptions, reviews, photos requiring a dedicated page), transfer vehicles are simple products with limited detail. Instead, use an **inline expansion panel** that slides open below the selected card on the results page. This reduces friction by one full page navigation (critical: every extra step loses 10-20% of users).

### Expansion Panel Content

When an agent clicks "View Details" (secondary action) or wants more info before selecting:

```
[Transfer Card - slightly elevated, border-color changes to accent]
[Expansion Panel - slides down below the card]
  [LEFT COLUMN - 60%]
    [Vehicle Details Section]
      Vehicle: Mercedes E-Class or similar
      Class: Business
      Max Passengers: 3
      Max Luggage: 2 standard bags
      Service Type: Private door-to-door transfer

    [Route Details Section]
      Pickup: Jose Marti International Airport (HAV), Terminal 3
      Dropoff: Gran Muthu Habana, Calle 66, Miramar, Playa
      Estimated Distance: 22 km
      Estimated Duration: 30-40 minutes

    [Meeting Instructions Section]
      "Your driver will meet you at the arrivals hall holding a sign
       with the passenger's name. Please proceed to the meeting point
       after collecting your luggage."

    [Multi-leg Trip Steps - if applicable]
      Step 1: Walk to parking area (2 min)
      Step 2: Drive to destination (35 min)

  [RIGHT COLUMN - 40%]
    [Amenities - full list with icons]
      WiFi Available
      Meet & Greet Service
      Flight Tracking (driver monitors your flight)
      English Speaking Driver
      SMS Notifications
      Free Waiting Time: 60 minutes

    [Cancellation Policy - full tiers table]
      | Deadline | Penalty |
      | > 48h before pickup | Free |
      | 24-48h before pickup | 50% |
      | < 24h before pickup | 100% |

    [Supplier Info]
      Provider: CubaTransfer
      Rating: 4.7/5
      Languages: English, Spanish

    [Price Summary]
      Vehicle Price: USD 45.00
      [Select This Vehicle ->] button

[/Expansion Panel]
```

### New CSS Classes

```css
.transfer-card.expanded {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
  transform: none;
}

.tc-expansion {
  display: none;
  background: var(--warm-50);
  border-top: 1px solid var(--warm-200);
  padding: 24px;
  animation: slideDown .25s ease;
}
.tc-expansion.show { display: block; }
@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 600px; }
}

.tc-expansion-layout {
  display: flex;
  gap: 28px;
}
.tc-expansion-main { flex: 1; }
.tc-expansion-side { width: 300px; flex-shrink: 0; }

.tc-detail-section { margin-bottom: 20px; }
.tc-detail-section h4 {
  font-size: 11px;
  font-weight: 700;
  color: var(--warm-400);
  text-transform: uppercase;
  letter-spacing: .6px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--warm-200);
}

.tc-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}
.tc-detail-label { color: var(--warm-400); font-weight: 500; }
.tc-detail-value { color: var(--warm-800); font-weight: 600; }

.tc-meeting-instructions {
  padding: 14px 16px;
  background: var(--amber-50);
  border: 1px solid #fde68a;
  border-radius: var(--radius);
  font-size: 13px;
  color: #92400e;
  line-height: 1.6;
}

/* Multi-leg steps */
.tc-steps { display: flex; flex-direction: column; gap: 0; }
.tc-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  font-size: 13px;
  position: relative;
}
.tc-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 28px;
  bottom: -8px;
  width: 1.5px;
  background: var(--warm-200);
}
.tc-step-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
}
.tc-step-icon.car { background: var(--teal-light); color: var(--teal-dark); }
.tc-step-icon.walk { background: var(--amber-50); color: #d97706; }

/* Amenities full list */
.tc-amenity-full {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  font-size: 13px;
  color: var(--warm-600);
}
.tc-amenity-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  background: var(--teal-light);
  color: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

### Mobile Responsive

- Expansion panel columns stack vertically (main on top, side below)
- Meeting instructions box becomes full width
- Cancellation tiers table scrolls horizontally if needed

---

## Screen 13: Transfer Passenger Info

### Design Approach

Adapts the existing Guest Info screen (screen 4) with transfer-specific additions. The critical new element is **Flight Information** for airport transfers -- this is where the most errors happen in real-world operations. The flight info section must be prominent and have inline validation.

### Page Structure

```
[Navbar]
[Progress Steps - adapted for transfer flow]
  [1. Vehicle Selection - completed] --- [2. Passenger Details - active] --- [3. Payment] --- [4. Confirmation]

[Flow Layout]
  [LEFT: Main Form - .flow-main]
    [Back Link: "Back to Vehicles"]

    [H2: "Who's riding?"]

    [Form Card: Lead Passenger Details]
      First Name * | Last Name *
      Email * | Phone *
      Nationality (optional)

    [Form Card: Flight Information - NEW, critical section]
      [Header with airplane icon: "Flight Details"]
      [Info banner: "Required for airport transfers. We track your flight to
       adjust pickup time for delays."]

      Airline * [dropdown with autocomplete: "Cubana de Aviacion"]
      Flight Number * [text input: "CU 455"]
      Arriving From * [text input: "Madrid (MAD)"]
      Terminal [text or dropdown: "Terminal 3"]

      [Flight Verification Status - inline]
        [Checking...] or [Verified - Flight CU 455, arriving 14:10] or
        [Not found - please verify flight number]

      [Tip text: "Providing accurate flight info ensures your driver is
       waiting when you land, even if your flight is delayed."]

    [Form Card: Special Requests - NEW]
      Child Seats Needed: [stepper 0-3]
        When > 0: show age selector for each
      Additional Notes: [textarea, optional]
        Placeholder: "e.g., wheelchair assistance needed, extra luggage..."

    [Form Card: Optional Amenities - if vehicle has selectable add-ons]
      [Checkbox list of available amenities with prices]
      [ ] Meet & Greet Service — Included
      [ ] Extra Waiting Time (30 min) — +$10.00
      [ ] Child Booster Seat — +$8.00

  [RIGHT: Booking Summary Sidebar - .flow-sidebar]
    [Transfer Summary Card - .order-summary adapted]
      [Route map placeholder or icon illustration]
      "Transfer Summary"
      [Route]
        From: Jose Marti Airport (HAV)
        To: Gran Muthu Habana
      [Divider]
      Transfer Date | Mar 25, 2026
      Pickup Time | 2:30 PM
      Passengers | 2
      Vehicle | Mercedes E-Class
      Class | Business
      Service | Private Transfer
      [Divider]
      [Cancellation policy - teal text]
      [Divider]
      Supplier | CubaTransfer
      [Divider]
      Vehicle Price | USD 45.00
      Add-ons | USD 0.00
      [Total Client Price | USD 45.00 - bold]
      [Continue to Payment -> button]
```

### Flight Verification UX

This is a key interaction. When the agent enters both Airline and Flight Number:

1. A subtle spinner appears next to the flight number field
2. After 1-2 seconds, show verification result inline:
   - **Success (green)**: Checkmark icon + "Flight CU 455 verified. Scheduled arrival: 14:10, Terminal 3"
   - **Warning (amber)**: Warning icon + "Flight not found in schedule. Please verify the flight number and date."
   - **Error (red)**: X icon + "Could not verify flight. Booking will proceed but flight tracking may be unavailable."

This maps to Mozio's POST `/v2/flights/verify/` endpoint.

```css
/* Flight verification inline status */
.flight-verify-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  margin-top: 10px;
  font-weight: 500;
}
.flight-verify-status.verifying {
  background: var(--warm-50);
  color: var(--warm-500);
  border: 1px solid var(--warm-200);
}
.flight-verify-status.verified {
  background: var(--teal-light);
  color: var(--teal-dark);
  border: 1px solid #99f6e4;
}
.flight-verify-status.warning {
  background: var(--amber-50);
  color: #92400e;
  border: 1px solid #fde68a;
}
.flight-verify-status.error {
  background: var(--red-50);
  color: var(--red-700);
  border: 1px solid var(--red-100);
}
.flight-verify-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--warm-200);
  border-top-color: var(--primary-bright);
  border-radius: 50%;
  animation: spinLoader .6s linear infinite;
}

/* Flight info banner */
.flight-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--primary);
  margin-bottom: 18px;
  line-height: 1.5;
}

/* Optional amenities */
.amenity-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--warm-100);
  font-size: 14px;
}
.amenity-option:last-child { border-bottom: none; }
.amenity-option-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.amenity-option-price {
  font-weight: 600;
  color: var(--warm-600);
}
.amenity-option-price.included {
  color: var(--teal);
}
```

### Transfer Summary Sidebar Modifications

The sidebar reuses `.order-summary` but with transfer-specific content. New element: a **route visualization** at the top instead of a hotel image.

```css
/* Route visualization for transfer summary */
.os-route {
  padding: 16px;
  background: var(--warm-50);
  border-radius: var(--radius);
  margin-bottom: 16px;
  border: 1px solid var(--warm-200);
}
.os-route-point {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
  font-size: 13px;
}
.os-route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.os-route-dot.pickup { background: var(--teal); }
.os-route-dot.dropoff { background: var(--primary); }
.os-route-connector {
  width: 1.5px;
  height: 20px;
  background: var(--warm-300);
  margin-left: 4px;
}
.os-route-address {
  font-weight: 600;
  color: var(--warm-800);
}
.os-route-sublabel {
  font-size: 11px;
  color: var(--warm-400);
}
```

### Conditional Sections

- **Flight Info card**: Only shown if pickup OR dropoff is an airport
- **Optional Amenities card**: Only shown if the selected vehicle has selectable add-ons
- **Schedule Selection**: If shared shuttle, show selected departure time in sidebar

### Mobile Responsive

- Same stacking behavior as hotel Guest Info (sidebar moves below form)
- Flight info fields: Airline and Flight Number on one row; Arriving From and Terminal on the next (stacks to single column on mobile)

---

## Screen 14: Transfer Payment

### Design Approach

Reuses the existing Payment screen (screen 5) almost entirely. The only differences are:

1. **Progress steps** reflect the transfer flow (Vehicle Selection > Passenger Details > Payment > Confirmation)
2. **Sidebar summary** shows transfer details instead of hotel details
3. **Payment method**: For B2B, the primary option should be "Agency Account / Invoice" (maps to Mozio's partner invoicing). Credit card is secondary.

### Page Structure

```
[Navbar]
[Progress Steps]
  [1. Vehicle Selection - completed] --- [2. Passenger Details - completed] --- [3. Payment - active] --- [4. Confirmation]

[Flow Layout]
  [LEFT: Payment Form - identical to hotel flow]
    [Back Link: "Back to Passenger Details"]
    [H2: "Secure your booking"]

    [Form Card: Payment Method]
      OPTION 1 (primary for B2B):
      [Agency Account - selected, blue border]
        "Charge to agency account. Invoice generated automatically."
        Agency: Ergos Continental
        Account #: EC-2024-0847
        Available Credit: USD 12,450.00

      OPTION 2 (secondary):
      [Credit / Debit Card]
        (Same card form as hotel flow)

    [Form Card: Card Details - only if credit card selected]
      (Identical to existing payment form)

  [RIGHT: Transfer Summary Sidebar]
    [Same transfer summary as passenger info screen]
    [Updated total with any add-ons]
    [Confirm Booking button - .confirm-btn]
```

### New CSS for Agency Account Payment

```css
.payment-method-option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;
  border: 1.5px solid var(--warm-200);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition);
  margin-bottom: 10px;
}
.payment-method-option:hover {
  border-color: var(--warm-300);
  background: var(--warm-50);
}
.payment-method-option.selected {
  border-color: var(--primary-bright);
  background: #eef2ff;
}
.payment-method-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--warm-300);
  flex-shrink: 0;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}
.payment-method-option.selected .payment-method-radio {
  border-color: var(--primary-bright);
}
.payment-method-option.selected .payment-method-radio::after {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-bright);
}
.payment-method-info h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.payment-method-info p {
  font-size: 13px;
  color: var(--warm-500);
}
.agency-account-details {
  margin-top: 10px;
  padding: 12px 16px;
  background: var(--warm-50);
  border-radius: var(--radius);
  border: 1px solid var(--warm-200);
  font-size: 13px;
}
.agency-credit {
  color: var(--teal);
  font-weight: 700;
}
```

### Mobile

Same responsive behavior as existing payment screen.

---

## Screen 15: Transfer Confirmation

### Design Approach

Adapts the existing Confirmation screen (screen 6) with transfer-specific content. The key additions are: meeting point instructions, pickup time emphasis, and driver assignment placeholder.

### Page Structure

```
[Navbar]
[Confirmation Page - centered card, max-width: 720px]
  [Confetti animation - same as hotel]
  [Confirmation Card]
    [Success Icon - checkmark in teal circle, same animation]
    [H1: "Transfer Booked!"]
    [P: "Your client's ground transport is confirmed. Here's everything they need."]

    [Reference Grid - 2x2]
      Booking Reference | TRF-EC8K42M9PQ
      Status | CONFIRMED badge
      Confirmation Date | Mar 19, 2026, 08:38 PM
      Cancellation Deadline | Mar 24, 2026, 2:30 PM

    [Section: Transfer Details]
      Route | Jose Marti Airport (HAV) -> Gran Muthu Habana
      Transfer Date | Wed, Mar 25, 2026
      Pickup Time | 2:30 PM
      Vehicle | Mercedes E-Class (Business)
      Service | Private Transfer
      Passengers | 2

    [Section: Pickup Instructions - PROMINENT, amber/gold background]
      [Meeting point icon]
      "The driver will meet passengers at the Terminal 3 arrivals hall,
       holding a name sign. Please proceed to the meeting point after
       collecting luggage. The driver will wait up to 60 minutes after
       the flight lands."
      Flight being tracked: CU 455

    [Section: Passenger Information]
      Name | Testing Guest
      Email | mayankjariwala1994@gmail.com
      Flight | CU 455, Cubana de Aviacion

    [Total Client Price | USD 45.00]

    [What's Next?]
      - Confirmation email sent to passenger
      - Download transfer voucher from booking details
      - Driver details will be assigned 24h before pickup
      - Flight is being tracked for delay adjustments

    [Action Buttons]
      [Book Another Transfer] [Email to Client] [View Booking Details]
```

### Pickup Instructions Styling

This is the most critical piece of information on the confirmation. It must be visually prominent:

```css
.conf-pickup-instructions {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1.5px solid #fde68a;
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  margin: 24px 0;
  text-align: left;
}
.conf-pickup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 10px;
}
.conf-pickup-text {
  font-size: 14px;
  color: #78350f;
  line-height: 1.7;
}
.conf-flight-tracking {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--teal-dark);
  font-weight: 600;
}
```

### Transfer Booking Reference Format

Use prefix `TRF-` to differentiate from hotel bookings (which use `EC` prefix). Generated by: `'TRF-EC' + 8 random alphanumeric`.

---

## Screen 16: Transfer Booking Detail

### Design Approach

Adapts the existing Booking Detail screen (screen 8) for transfer-specific content. Key additions: real-time tracking section, driver information placeholder, and pickup instructions.

### Page Structure

```
[Navbar]
[Booking Detail Page]
  [Back Link: "Back to My Bookings"]

  [Header Bar - navy background, same as hotel BD]
    Booking Reference: TRF-EC8K42M9PQ
    Confirmation Date: Mar 19, 2026
    Pickup Date: Mar 25, 2026 at 2:30 PM
    Total Client Price: USD 45.00
    Status: CONFIRMED

  [BD Body - two column layout]
    [LEFT: Main Content]

      [Cancellation Banner]
        "Free cancellation until Mar 24, 2026 at 2:30 PM"

      [Section: Transfer Route]
        Service Card:
          Route: Jose Marti Airport (HAV) -> Gran Muthu Habana
          Transfer Date: Wed, Mar 25, 2026
          Pickup Time: 2:30 PM
          Estimated Duration: 30-40 min
          Vehicle: Mercedes E-Class or similar
          Class: Business
          Service Type: Private Transfer
          Passengers: 2
          Supplier: CubaTransfer

      [Section: Driver Information - NEW]
        [If assigned:]
          Driver Name: Carlos Rodriguez
          Phone: +53 5 XXX XXXX
          Vehicle: Mercedes E-Class, White
          License Plate: HAV-4521
          [Track Driver button - if live tracking available]
        [If not yet assigned:]
          [Info banner - blue]
          "Driver details will be available 24 hours before your
           scheduled pickup time."

      [Section: Pickup Instructions - amber box]
        Meeting Point: Terminal 3, Arrivals Hall
        Look for: Name sign
        Wait Time: 60 minutes after flight lands
        Flight Tracked: CU 455, Cubana de Aviacion

      [Section: Passenger Information]
        Name: Testing Guest
        Email: mayankjariwala1994@gmail.com
        Phone: 123456789
        Flight: CU 455 (Cubana de Aviacion)

      [Section: Payment Information]
        Method: Agency Account
        Account: EC-2024-0847
        Amount: USD 45.00
        Payment Status: PAID

      [Section: Booking Documentation]
        [Language selector] [Preview Transfer Voucher] [Download]

    [RIGHT: Sidebar]
      [Manage Booking Card]
        [Modify Booking button]
        [Cancel Booking button]

      [Trust Signals]
        Verified supplier -- CubaTransfer
        Flight tracking active
        24/7 agent support hotline

      [Booking Timeline]
        Created: Mar 19, 2026 at 8:38 PM
        Confirmed: Mar 19, 2026 at 8:39 PM
        Payment: Mar 19, 2026 at 8:39 PM
        Driver Assigned: Mar 24, 2026 at 10:00 AM (future)
```

### Driver Information Section (New)

```css
.driver-info-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--warm-200);
}
.driver-info-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.driver-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}
.driver-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--warm-800);
}
.driver-rating {
  font-size: 13px;
  color: var(--warm-500);
}
.btn-track-driver {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--teal);
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  transition: all var(--transition);
}
.btn-track-driver:hover { background: var(--teal-dark); }

/* Driver not yet assigned state */
.driver-pending-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 18px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--primary);
  line-height: 1.5;
}
```

---

## Screen 7 (Modified): My Bookings -- Transfer Integration

### Design Approach

Transfer bookings appear alongside hotel bookings in the same list. Differentiation is achieved through:
1. A **service type icon** (bed icon for hotels, car icon for transfers)
2. Slightly different metadata display
3. A **filter tab** or **type dropdown** to filter by service type

### New Elements

**Filter addition** -- Add a service type filter next to the existing status filter:

```
[Bookings Filters]
  [Search input]
  [Status: All Statuses v]
  [Service: All Types v]    <-- NEW
    Options: All Types / Hotels / Transfers
  [Date from] [Date to]
```

**Transfer Booking Card:**

```
[Booking List Card - .booking-list-card]
  [LEFT]
    [Service Icon + Title Row]
      [Car Icon - small, inline] Airport Transfer -- Jose Marti -> Gran Muthu Habana
    [Status + Policy Tags]
      [CONFIRMED badge] [Free Cancellation tag]
    [Details]
      Mar 25, 2026 . 2:30 PM . 2 Passengers . Mercedes E-Class . Private
    [Ref]
      Booking Ref: TRF-EC8K42M9PQ
  [RIGHT]
    Total Client Price
    USD 45.00
    [View Booking Details] button
```

### New CSS

```css
/* Service type indicator */
.blc-service-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--warm-400);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 4px;
}
.blc-service-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.blc-service-icon.hotel {
  background: #eef2ff;
  color: var(--primary-bright);
}
.blc-service-icon.transfer {
  background: var(--teal-light);
  color: var(--teal);
}

/* Transfer booking card accent */
.booking-list-card.transfer-booking {
  border-left-color: var(--accent);
}
```

### Prototype Data for My Bookings

Add one transfer booking card between the existing hotel bookings:

| Field | Value |
|-------|-------|
| Service | Transfer |
| Route | Jose Marti Airport -> Gran Muthu Habana |
| Status | CONFIRMED |
| Date | Mar 25, 2026, 2:30 PM |
| Passengers | 2 |
| Vehicle | Mercedes E-Class |
| Ref | TRF-EC8K42M9PQ |
| Price | USD 45.00 |

---

## Transfer Modify Modal

### Design

Adapts the existing Modify Booking modal. Transfer modifications are simpler than hotel modifications (no room management), but have unique constraints:

```
[Modal: Modify Transfer]
  [Header: "Modify Transfer"]
  [Subtitle: "Changes are subject to availability and may affect pricing."]

  [Section: Current Booking Details]
    Route: Jose Marti Airport -> Gran Muthu Habana
    Date: Mar 25, 2026 at 2:30 PM
    Vehicle: Mercedes E-Class (Business)
    Passengers: 2

  [Section: Passenger Information - read-only]
    Name: Testing Guest
    Email: mayankjariwala1994@gmail.com

  [Divider: "Modify Transfer"]

  [Section: Modifiable Fields]
    Transfer Date: [date picker]
    Pickup Time: [time picker]
    Passengers: [stepper 1-50]

    [Note: "Vehicle type changes require cancellation and rebooking.
     Date/time changes are subject to availability."]

    [Apply Changes button]

  [Section: Updated Pricing]
    [If changed:] "Searching for updated availability..."
    [Result:] New price: USD 45.00 (unchanged) / USD 52.00 (+$7.00)

  [Footer]
    [Total Client Price: USD 45.00]
    [Cancel] [Confirm Modification]
```

This is simpler than hotel modify because Mozio's reservation change API only supports date/time/passenger changes -- vehicle type changes require a new booking.

---

## Transfer Cancel Modal

### Design

Reuses the existing 2-step cancel modal pattern exactly:

**Step 1: Review Policy**
- Warning banner (same styling)
- Transfer summary (route, date, time, vehicle, passengers)
- Cancellation policy with tiers table (maps to Mozio `cancellation_policy` response)
- Refund calculation

**Step 2: Confirm**
- Confirmation question
- Cancellation reason (required)
- Irreversibility checkbox
- Confirm Cancellation button

The cancellation tiers map directly from Mozio's API:

| Deadline | Penalty |
|----------|---------|
| Before Mar 24, 2026 at 2:30 PM | Free |
| Mar 24 2:30 PM - Mar 25 2:30 PM | USD 22.50 (50%) |
| After Mar 25, 2026 at 2:30 PM | USD 45.00 (100%) |

---

## Transfer Voucher

### Design

Adapts the existing voucher template with transfer-specific fields:

```
TRANSFER VOUCHER
Booking Reference: TRF-EC8K42M9PQ
Status: CONFIRMED

Transfer Details:
  Route: Jose Marti International Airport (HAV) -> Gran Muthu Habana
  Date: Wed, Mar 25, 2026
  Pickup Time: 2:30 PM
  Vehicle: Mercedes E-Class or similar (Business Class)
  Service: Private Transfer
  Passengers: 2
  Supplier: CubaTransfer

Pickup Instructions:
  Meeting Point: Terminal 3, Arrivals Hall
  Look for: Driver holding name sign for "Testing Guest"
  Wait Time: Driver will wait up to 60 minutes after flight arrival
  Flight Tracked: CU 455 (Cubana de Aviacion)

Passenger Information:
  Name: Testing Guest
  Email: mayankjariwala1994@gmail.com
  Flight: CU 455

Cancellation: Free cancellation until Mar 24, 2026 at 2:30 PM

Total Client Price: USD 45.00
```

---

## JavaScript State Management

### Transfer Booking State Object

```javascript
const transferBookingState = {
  // Search parameters
  pickup: 'Jose Marti Intl Airport (HAV)',
  pickupType: 'airport', // airport | hotel | address
  dropoff: 'Gran Muthu Habana, Miramar, Havana',
  dropoffType: 'hotel',
  transferDate: '2026-03-25',
  transferTime: '14:30',
  passengers: 2,
  mode: 'one_way', // one_way | round_trip | hourly
  returnDate: null,
  returnTime: null,

  // Selected vehicle
  vehicleName: 'Mercedes E-Class or similar',
  vehicleClass: 'Business',
  vehicleType: 'Sedan',
  serviceType: 'Private',
  maxPassengers: 3,
  maxBags: 2,
  supplier: 'CubaTransfer',
  price: '45.00',
  cancellationPolicy: 'Free cancellation until 48h before pickup',

  // Passenger info
  passengerFirstName: 'Testing',
  passengerLastName: 'Guest',
  passengerEmail: 'mayankjariwala1994@gmail.com',
  passengerPhone: '123456789',

  // Flight info (airport transfers)
  airline: 'Cubana de Aviacion',
  flightNumber: 'CU 455',
  arrivingFrom: 'Madrid (MAD)',
  terminal: 'Terminal 3',
  flightVerified: true,

  // Booking
  bookingRef: null,
  confirmationDate: null,
  isCancelled: false,

  // Driver (assigned post-booking)
  driverAssigned: false,
  driverName: null,
  driverPhone: null,
  driverVehicle: null,
  driverPlate: null
};
```

### Navigation Functions

```javascript
// Extend showScreen() to handle transfer screens
// Transfer screen IDs: 'transfer-results', 'transfer-passenger',
//   'transfer-payment', 'transfer-confirmation', 'transfer-detail'

function performTransferSearch() {
  const overlay = document.getElementById('transfer-search-loading');
  overlay.classList.add('show');

  // Simulate Mozio polling behavior
  const progress = overlay.querySelector('.search-loading-progress');
  progress.textContent = 'Checking providers...';

  setTimeout(() => { progress.textContent = 'Found 5 options...'; }, 600);
  setTimeout(() => { progress.textContent = 'Finalizing 8 results...'; }, 1000);
  setTimeout(() => {
    overlay.classList.remove('show');
    showScreen('transfer-results');
  }, 1500);
}

function selectVehicle(name, vehicleClass, price, cancellation, supplier) {
  transferBookingState.vehicleName = name;
  transferBookingState.vehicleClass = vehicleClass;
  transferBookingState.price = price;
  transferBookingState.cancellationPolicy = cancellation;
  transferBookingState.supplier = supplier;
  showScreen('transfer-passenger');
}

function confirmTransferBooking() {
  transferBookingState.bookingRef = 'TRF-' + generateBookingRef();
  transferBookingState.confirmationDate = nowFormatted();
  transferBookingState.isCancelled = false;
  // Populate confirmation screen elements...
  showScreen('transfer-confirmation');
  spawnConfetti();
}
```

---

## Prototype Toolbar Update

Add new tabs for transfer screens:

```
[Existing tabs 1-10] [11. Transfer Results] [12. Transfer Passenger] [13. Transfer Payment] [14. Transfer Confirm] [15. Transfer Detail]
```

Tab 12 (Vehicle Detail) is not a separate tab since it is inline expansion.

Note: The toolbar may get crowded with 15 tabs. Consider grouping them visually:

```css
.proto-tab-separator {
  width: 1px;
  height: 20px;
  background: #444;
  margin: 0 4px;
  flex-shrink: 0;
}
```

Insert a separator between tab 10 and tab 11 to visually distinguish hotel screens from transfer screens.

---

## Cross-Selling Opportunity: Hotel + Transfer Bundle

### On Hotel Confirmation Screen (Screen 6)

After the "What's Next?" section, add a **cross-sell card**:

```
[Cross-sell Card]
  [Car icon] "Need a ride from the airport?"
  "Book a transfer from Jose Marti Airport to Gran Muthu Habana"
  [From USD 28.00] [Search Transfers ->]
```

This leverages the hotel booking context (we know the destination) to pre-populate a transfer search. When clicked, it switches to the Transfers tab on the home screen with the hotel address pre-filled as the dropoff.

```css
.conf-cross-sell {
  background: linear-gradient(135deg, var(--primary), #2d2d7c);
  border-radius: var(--radius-lg);
  padding: 22px 28px;
  margin-top: 28px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 20px;
}
.conf-cross-sell-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255,255,255,.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.conf-cross-sell-content { flex: 1; }
.conf-cross-sell-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.conf-cross-sell-content p {
  font-size: 13px;
  color: rgba(255,255,255,.7);
}
.conf-cross-sell-price {
  font-size: 12px;
  color: var(--accent-light);
  font-weight: 600;
  margin-top: 6px;
}
.conf-cross-sell-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
}
.conf-cross-sell-btn:hover { background: var(--accent-hover); }
```

### On Hotel Booking Detail (Screen 8)

Add a "Related Services" section in the sidebar:

```
[Related Services Card]
  "Airport Transfer Available"
  Jose Marti Airport -> Gran Muthu Habana
  From USD 28.00
  [Book Transfer]
```

---

## Accessibility Considerations

All new components must meet WCAG 2.1 AA:

1. **Search tab switching**: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
2. **Mode pills**: `role="radiogroup"`, `role="radio"`, `aria-checked`
3. **Vehicle cards**: Keyboard focusable, Enter/Space to select, expand panel via Enter
4. **Flight verification**: `aria-live="polite"` on the status element so screen readers announce verification results
5. **Schedule time chips**: `role="radiogroup"` with `role="radio"` for each time option
6. **Driver tracking button**: Descriptive `aria-label="Track driver location on map"`
7. **All form labels**: Associated via `for` attributes, required fields marked with `aria-required="true"`
8. **Color contrast**: All new badges and status indicators meet 4.5:1 minimum contrast ratio
9. **Touch targets**: All interactive elements minimum 44x44px on mobile

---

## Summary of All New CSS Classes

| Category | Classes |
|----------|---------|
| Search tabs | `.search-tabs`, `.search-tab`, `.search-tab.active` |
| Transfer mode | `.transfer-mode-pills`, `.mode-pill`, `.mode-pill.active` |
| Search extras | `.swap-btn`, `.search-return-row`, `.search-return-label` |
| Results summary | `.rsb-arrow`, `.results-route-info` |
| Loading | `.search-loading-progress` |
| Transfer cards | `.transfer-card`, `.tc-img`, `.tc-class-badge`, `.tc-service-badge`, `.tc-body`, `.tc-supplier`, `.tc-capacity`, `.tc-capacity-item`, `.tc-capacity-sep`, `.tc-amenities`, `.tc-amenity`, `.tc-cancel-detail`, `.tc-cancel-toggle`, `.tc-price-col`, `.tc-price`, `.tc-price-label`, `.tc-select-btn` |
| Schedule | `.tc-schedule`, `.tc-schedule-label`, `.tc-schedule-times`, `.tc-time-chip`, `.tc-time-chip.selected` |
| Expansion panel | `.tc-expansion`, `.tc-expansion-layout`, `.tc-expansion-main`, `.tc-expansion-side`, `.tc-detail-section`, `.tc-detail-row`, `.tc-detail-label`, `.tc-detail-value`, `.tc-meeting-instructions` |
| Multi-leg steps | `.tc-steps`, `.tc-step`, `.tc-step-icon` |
| Amenities full | `.tc-amenity-full`, `.tc-amenity-icon` |
| Flight verify | `.flight-verify-status`, `.flight-verify-spinner`, `.flight-info-banner` |
| Amenity options | `.amenity-option`, `.amenity-option-left`, `.amenity-option-price` |
| Route visual | `.os-route`, `.os-route-point`, `.os-route-dot`, `.os-route-connector`, `.os-route-address`, `.os-route-sublabel` |
| Payment method | `.payment-method-option`, `.payment-method-radio`, `.payment-method-info`, `.agency-account-details`, `.agency-credit` |
| Confirmation | `.conf-pickup-instructions`, `.conf-pickup-header`, `.conf-pickup-text`, `.conf-flight-tracking` |
| Driver info | `.driver-info-card`, `.driver-avatar`, `.driver-name`, `.driver-rating`, `.btn-track-driver`, `.driver-pending-banner` |
| Booking list | `.blc-service-type`, `.blc-service-icon`, `.booking-list-card.transfer-booking` |
| Cross-sell | `.conf-cross-sell`, `.conf-cross-sell-icon`, `.conf-cross-sell-content`, `.conf-cross-sell-price`, `.conf-cross-sell-btn` |
| Toolbar | `.proto-tab-separator` |

Total: ~70 new classes, all following existing naming conventions and design tokens.

---

## Implementation Priority

1. **Phase 1 (Core Flow)**: Home search modification + Transfer Results + Transfer Passenger Info + Transfer Payment + Transfer Confirmation
2. **Phase 2 (Management)**: Transfer Booking Detail + My Bookings integration + Modify/Cancel modals
3. **Phase 3 (Enhancement)**: Vehicle detail expansion panel + Cross-sell cards + Transfer voucher/invoice
4. **Phase 4 (Polish)**: Loading states with polling simulation + Flight verification animation + Driver tracking placeholder