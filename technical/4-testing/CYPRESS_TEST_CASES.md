# Cypress E2E Test Cases

Complete inventory of test cases for the OneClickAdventures platform.

---

## Phase 1: Setup & Infrastructure

| # | Task | Description | Effort |
|---|---|---|---|
| 1.1 | Install Cypress & dependencies | `bun add -d cypress @testing-library/cypress` in backoffice-app | 1h |
| 1.2 | Create cypress.config.ts | Base URL, env vars, timeouts, retry config | 1h |
| 1.3 | Create support/commands.ts | `cy.login()`, `cy.apiLogin()`, `cy.resetTestData()` | 2h |
| 1.4 | Create support/e2e.ts | Global hooks, uncaught exception handling | 30m |
| 1.5 | Create TypeScript config | tsconfig.cypress.json with Cypress types | 30m |
| 1.6 | Add `data-testid` to login page | Tag all interactive elements | 1h |
| 1.7 | Create fixture files | Auth responses, sample data for stubs | 2h |
| 1.8 | Add Makefile target | `make test-e2e` to run from root | 30m |
| | | **Phase 1 Total** | **~1 day** |

---

## Phase 2: Authentication & Session (P0 - Critical)

### 2A. Login

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 2A.1 | Display login form | Visit `/login` | User type selector, email input, password input, login button visible |
| 2A.2 | Login as admin | Select "Root User", enter valid admin credentials, click login | Redirect to `/dashboard`, JWT stored in localStorage |
| 2A.3 | Login as sales agent | Select "Sales Agent", enter valid agent credentials, click login | Redirect to `/dashboard`, JWT stored in localStorage |
| 2A.4 | Reject empty fields | Click login without entering data | Validation errors: "email is a required field", "password is a required field" |
| 2A.5 | Reject invalid email format | Type "not-an-email" in email, blur | Validation: "email must be a valid email" |
| 2A.6 | Reject short password | Type password < 8 chars, blur | Validation: minimum 8 characters |
| 2A.7 | Reject invalid credentials | Enter wrong email/password, submit | Error toast notification displayed |
| 2A.8 | Reject disabled account | Login with deactivated user credentials | Error message: account disabled or unauthorized |

### 2B. Session Management

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 2B.1 | Redirect unauthenticated user | Visit `/dashboard` without token | Redirect to `/login` |
| 2B.2 | Handle expired token | Set expired JWT in localStorage, visit protected route | Redirect to `/login`, localStorage cleared |
| 2B.3 | Handle 401 API response | Login, then stub next API call to return 401 | Session expired state, redirect to `/login` |
| 2B.4 | Persist session on refresh | Login, reload page | Remain on dashboard, still authenticated |

### 2C. Logout

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 2C.1 | Logout clears session | Click logout button | localStorage cleared, redirect to `/login` |
| 2C.2 | Cannot access routes after logout | Logout, then visit `/dashboard` | Redirect to `/login` |

### 2D. Role-Based Access Control

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 2D.1 | Admin sees all nav items | Login as admin | Nav shows: Dashboard, BackOffice, Sales Agent, Travel Agencies, Hotels, Reservations, Commissions |
| 2D.2 | Sales agent sees limited nav | Login as sales agent | Nav shows: Dashboard, Sales Agent, Travel Agencies, Reservations, Commissions. No BackOffice, no Hotels |
| 2D.3 | Admin can access `/backoffice` | Login as admin, visit `/backoffice` | Page loads, users list displayed |
| 2D.4 | Sales agent cannot access `/backoffice` | Login as sales agent, visit `/backoffice` | Redirect away, page not accessible |
| 2D.5 | Sales agent cannot access `/hotels` | Login as sales agent, visit `/hotels` | Redirect away, page not accessible |

| | | **Phase 2 Total: ~15 test cases** | **~1 day** |

---

## Phase 3: Sales Agent Management (P1 - High)

### 3A. List Sales Agents

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 3A.1 | Display agents table | Login as admin, visit `/sales-agent` | Table rendered with agent rows |
| 3A.2 | Navigate to create page | Click "Create" button | URL changes to `/sales-agent/create` |
| 3A.3 | Navigate to edit on row click | Click a table row | URL changes to `/sales-agent/edit/:id` |
| 3A.4 | Handle empty list | Stub API to return empty array | "No data" or empty state shown |
| 3A.5 | Handle API error | Stub API to return 500 | Error toast displayed |

### 3B. Create Sales Agent

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 3B.1 | Create with valid data | Fill all required fields with valid data, submit | Success toast, redirect to `/sales-agent` list |
| 3B.2 | Validate required fields | Submit empty form | Validation errors on: firstName, lastName, email, contactNumber, street, province, postal_code, country |
| 3B.3 | Validate email format | Enter invalid email, blur | "invalid email" error |
| 3B.4 | Validate phone format | Enter "1234" in phone field, blur | "invalid phone number" error |
| 3B.5 | Validate earning percentage > 100 | Enter 150 in earningPercentage | "must be less than or equal to 100" |
| 3B.6 | Validate operational expense > 100 | Enter 150 in operationalExpense | "must be less than or equal to 100" |
| 3B.7 | Google autocomplete fills address | Type address in autocomplete, select suggestion | Street, province, postal code, country auto-filled |

### 3C. Edit Sales Agent

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 3C.1 | Load existing agent data | Visit `/sales-agent/edit/:id` | Form pre-filled with agent data |
| 3C.2 | Update agent fields | Change firstName and lastName, submit | Success toast, updated values persisted |
| 3C.3 | Update commission rates | Navigate to commissions tab, change values, save | Success toast, new rates saved |

| | | **Phase 3 Total: ~15 test cases** | **~2 days** |

---

## Phase 4: Travel Agency Management (P1 - High)

### 4A. List Travel Agencies

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 4A.1 | Display agencies table | Login as admin, visit `/travel-agencies` | Table rendered with agency rows |
| 4A.2 | Navigate to create | Click "Create" button | URL changes to `/travel-agencies/create` |
| 4A.3 | Handle empty list | Stub empty response | Empty state displayed |

### 4B. Create Travel Agency

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 4B.1 | Create with valid data | Fill all required fields, select sales agent, submit | Success toast, redirect to list |
| 4B.2 | Validate required fields | Submit empty form | Errors on: agencyName, primaryContactName, primaryContactEmail, primaryContactNumber, salesAgentRefId, street, province, postal_code, country |
| 4B.3 | Validate email format | Enter invalid email | "invalid email" error |
| 4B.4 | Detect duplicate email | Enter existing email, blur | "email already exists" message |
| 4B.5 | Validate URL fields | Enter invalid URL in website field | "invalid URL" error |
| 4B.6 | Sales agent dropdown loads | Visit create page | Dropdown populated with active sales agents |
| 4B.7 | Google autocomplete fills address | Select address from autocomplete | Address fields auto-populated |
| 4B.8 | Optional fields accept null | Leave secondary contact, website, logo blank, submit | Creates successfully without optional fields |

### 4C. Edit Travel Agency

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 4C.1 | Open edit modal | Click edit on agency row | Modal opens with pre-filled data |
| 4C.2 | Update agency name | Change name, save | Success toast, list updated |
| 4C.3 | Toggle active/inactive | Click activate/deactivate | Agency status toggled |
| 4C.4 | Update vendor access | Change vendor access array, save | New vendor access persisted |

### 4D. Agency Invitations (Admin)

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 4D.1 | Send agency invitation | Create invitation with email | Success toast, invitation appears in list |
| 4D.2 | Resend invitation | Click resend on pending invitation | Success toast |
| 4D.3 | Cancel invitation | Click cancel on invitation | Invitation removed from list |

| | | **Phase 4 Total: ~17 test cases** | **~2 days** |

---

## Phase 5: Reservations (P1 - High)

### 5A. List Reservations

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 5A.1 | Display reservations table | Login as admin, visit `/reservations` | Table with booking rows |
| 5A.2 | Filter by status | Select "CONFIRMED" from status filter | Only confirmed bookings shown |
| 5A.3 | Filter by sales agent | Select agent from dropdown | Bookings filtered by agent |
| 5A.4 | Global search | Type hotel name in search | Results filtered |
| 5A.5 | Pagination | Click next page | New page of results loaded |
| 5A.6 | Navigate to detail | Click a reservation row | URL changes to `/reservations/detail` with booking data |

### 5B. Reservation Detail

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 5B.1 | Display booking details | Navigate to detail page | All booking fields displayed (hotel, guest, dates, status, amount) |
| 5B.2 | View agent details | Click "View Agent" button | Agent details modal opens |
| 5B.3 | Close agent modal | Click close on modal | Modal dismissed |

### 5C. Cancel Reservation

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 5C.1 | Cancel with reason | Click cancel, enter reason, confirm | Success toast, status updated to CANCELLED |
| 5C.2 | Dismiss cancel dialog | Click cancel button, then dismiss | Dialog closes, no status change |
| 5C.3 | Cancel already cancelled | Attempt cancel on CANCELLED booking | Cancel button disabled or error shown |

### 5D. Export

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 5D.1 | Export to CSV | Click CSV export button | File downloaded with .csv extension |
| 5D.2 | Export to Excel | Click Excel export button | File downloaded with .xlsx extension |

| | | **Phase 5 Total: ~13 test cases** | **~1.5 days** |

---

## Phase 6: Hotel Management (P1 - High)

### 6A. List & Filter Hotels

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 6A.1 | Display hotels table | Login as admin, visit `/hotels` | Table with hotel rows |
| 6A.2 | Filter by provider (dingus) | Select "dingus" provider filter | Only Dingus hotels shown |
| 6A.3 | Filter by provider (hotetec) | Select "hotetec" provider filter | Only Hotetec hotels shown |
| 6A.4 | Search by hotel name | Type name in search field | Matching hotels displayed |
| 6A.5 | Search by hotel code | Type code in search field | Matching hotel displayed |
| 6A.6 | Search by city | Type city in search field | Hotels in that city shown |
| 6A.7 | Pagination (cursor-based) | Click next page | Next set of hotels loaded |

### 6B. Commission Management

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 6B.1 | Edit single hotel commission | Click edit icon, enter 12, save | Success toast, commission updated |
| 6B.2 | Validate commission 0-100 | Enter 150, save | Validation error: "must be less than or equal to 100" |
| 6B.3 | Validate commission non-negative | Enter -5, save | Validation error |
| 6B.4 | Bulk select hotels | Click select-all checkbox | All visible hotels selected |
| 6B.5 | Bulk update commissions | Select multiple, click bulk edit, enter 10, save | Success toast, all selected hotels updated |

### 6C. Hotel Sync (Scan)

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 6C.1 | Trigger scan | Click "Scan Hotels" button | Scan started message, progress indicator shown |
| 6C.2 | Cancel running scan | Click "Cancel Scan" during active scan | Scan cancelled confirmation |
| 6C.3 | View scan history | Click scan history button | History table with past scans |
| 6C.4 | Scan status polling | Trigger scan, wait | Status updates shown (progress, completion) |

| | | **Phase 6 Total: ~16 test cases** | **~2 days** |

---

## Phase 7: Dashboard & Analytics (P2 - Medium)

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 7.1 | Load default dashboard | Login as admin, visit `/dashboard` | Charts and summary table rendered |
| 7.2 | Filter by date range | Set from/to dates, apply | Dashboard data refreshed for date range |
| 7.3 | Filter by travel agency | Select agency from dropdown, apply | Data filtered to selected agency |
| 7.4 | Filter by sales agent | Select agent from dropdown, apply | Data filtered to selected agent |
| 7.5 | Filter by status | Select booking status, apply | Data filtered by status |
| 7.6 | Combine multiple filters | Set date range + agency + status, apply | Data filtered by all criteria |
| 7.7 | Reset filters | Click reset/clear filters | Dashboard returns to default view |
| 7.8 | Handle no data | Apply filter that returns 0 results | Empty state or "No data" message |

| | | **Phase 7 Total: ~8 test cases** | **~1 day** |

---

## Phase 8: Profile Settings (P2 - Medium)

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 8.1 | Display settings tabs | Visit `/profile-settings` | Three tabs: Edit Profile, Change Password, Date Format |
| 8.2 | Update profile info | Edit name/email, save | Success toast, profile updated |
| 8.3 | Change password (valid) | Enter current password, new password, confirm, save | Success toast |
| 8.4 | Change password (mismatch) | Enter different new/confirm passwords | "Passwords must match" error |
| 8.5 | Change password (wrong current) | Enter wrong current password | Error toast |
| 8.6 | Update date format | Select different format (DD/MM/YYYY), save | Success toast, dates across app use new format |
| 8.7 | Date format persists | Change format, navigate away, return | Selected format still active |

| | | **Phase 8 Total: ~7 test cases** | **~0.5 day** |

---

## Phase 9: API Integration Tests (P1 - High)

These tests call the backend API directly via `cy.request()` without going through the UI.

### 9A. Booking Lifecycle

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 9A.1 | Create booking | POST `/bookings` with x-vendor header | 201, booking returned with PENDING status |
| 9A.2 | Get booking by ID | GET `/bookings/:id` | 200, full booking details |
| 9A.3 | Confirm booking | PUT `/bookings/:id/confirm` | 200, status = CONFIRMED |
| 9A.4 | Complete booking | PUT `/bookings/:id/complete` | 200, status = COMPLETED |
| 9A.5 | Cancel booking | PUT `/bookings/:id/cancel` with reason | 200, status = CANCELLED |
| 9A.6 | List bookings with pagination | GET `/bookings?page=1&limit=10` | 200, paginated results |
| 9A.7 | Get booking history | GET `/bookings/history` | 200, history records |

### 9B. Multi-Room Booking

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 9B.1 | Create multi-room booking | POST `/bookings/multi-room` | 201, bookingToken + array of bookings |
| 9B.2 | Get multi-room booking | GET `/bookings/multi-room/:token` | 200, all rooms returned |

### 9C. Payment Flow

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 9C.1 | Create payment link | POST `/payments/tropipay/booking/:id` | 200, payment URL returned |
| 9C.2 | Check payment status | GET `/payments/tropipay/status/:ref` | 200, status object |
| 9C.3 | Webhook processes payment | POST `/payments/tropipay/webhook` with valid signature | 200, booking updated |
| 9C.4 | Webhook rejects invalid signature | POST webhook with bad signature | 401 or 403 |

### 9D. Auth API

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 9D.1 | Verify valid token | POST `/auth/verify` with valid JWT | 200, `{ valid: true }` |
| 9D.2 | Verify expired token | POST `/auth/verify` with expired JWT | 401 or `{ valid: false }` |
| 9D.3 | Health check | GET `/health` | 200, `{ status: "OK" }` |

### 9E. Vendor Access Control

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 9E.1 | Agency sees only allowed vendors | Login as agency with vendorAccess=['dingus'], GET `/hotels/search` | Only Dingus hotels returned |
| 9E.2 | Agency with null access sees all | Login as agency with vendorAccess=null, GET `/hotels/search` | All providers returned |
| 9E.3 | Agency with empty access sees none | Login as agency with vendorAccess=[], GET `/hotels/search` | No hotels returned |

| | | **Phase 9 Total: ~17 test cases** | **~1.5 days** |

---

## Phase 10: Error Handling & Edge Cases (P2 - Medium)

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 10.1 | Handle 500 on agents list | Stub `/salesagent` to return 500 | Error toast, no crash |
| 10.2 | Handle 500 on agencies list | Stub `/travelagency` to return 500 | Error toast, no crash |
| 10.3 | Handle 500 on hotels list | Stub `/hotels` to return 500 | Error toast, no crash |
| 10.4 | Handle 500 on reservations list | Stub `/bookings` to return 500 | Error toast, no crash |
| 10.5 | Handle 500 on dashboard | Stub `/analytics/dashboard` to return 500 | Error toast, no crash |
| 10.6 | Handle network timeout | Stub API with 30s+ delay | Timeout error handled gracefully |
| 10.7 | Handle malformed API response | Stub with unexpected JSON shape | App doesn't crash, error shown |
| 10.8 | Navigate to non-existent route | Visit `/nonexistent` | 404 page or redirect to dashboard |

| | | **Phase 10 Total: ~8 test cases** | **~0.5 day** |

---

## Summary

| Phase | Suite | Test Cases | Priority | Effort |
|---|---|---|---|---|
| 1 | Setup & Infrastructure | 8 tasks | - | 1 day |
| 2 | Authentication & Session | 15 | P0 | 1 day |
| 3 | Sales Agent Management | 15 | P1 | 2 days |
| 4 | Travel Agency Management | 17 | P1 | 2 days |
| 5 | Reservations | 13 | P1 | 1.5 days |
| 6 | Hotel Management | 16 | P1 | 2 days |
| 7 | Dashboard & Analytics | 8 | P2 | 1 day |
| 8 | Profile Settings | 7 | P2 | 0.5 day |
| 9 | API Integration Tests | 17 | P1 | 1.5 days |
| 10 | Error Handling & Edge Cases | 8 | P2 | 0.5 day |
| | **Total** | **~116 test cases** | | **~13 days** |

### Recommended Execution Order

1. **Phase 1** - Setup (required first)
2. **Phase 2** - Auth (everything depends on login working)
3. **Phase 9** - API tests (validate backend independently)
4. **Phase 3** - Sales Agents
5. **Phase 4** - Travel Agencies
6. **Phase 5** - Reservations
7. **Phase 6** - Hotels
8. **Phase 7** - Dashboard
9. **Phase 8** - Profile
10. **Phase 10** - Error handling (last, covers all modules)

### `data-testid` Tagging Requirement

Before each phase can begin, the corresponding backoffice-app components must have `data-testid` attributes added to all interactive elements (inputs, buttons, dropdowns, tables, modals). See the tagging reference in [CYPRESS_E2E_TESTING.md](CYPRESS_E2E_TESTING.md-data-test-ids).