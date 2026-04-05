# Cypress E2E Testing Documentation

End-to-end integration testing strategy for the OneClickAdventures platform using Cypress.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Project Structure](#project-structure)
5. [Configuration](#configuration)
6. [Test Suites](#test-suites)
7. [Custom Commands & Utilities](#custom-commands--utilities)
8. [API Interceptors & Fixtures](#api-interceptors--fixtures)
9. [CI/CD Integration](#cicd-integration)
10. [Best Practices](#best-practices)

---

## Overview

### What We're Testing

The E2E test suite covers two applications against the backend-service API:

| Application | Port | Base URL | Description |
|---|---|---|---|
| **backoffice-app** | 3032 | `http://localhost:3032` | Admin dashboard for managing agencies, agents, hotels, reservations |
| **backend-service** | 3001 | `http://localhost:3001/api/v1` | REST API (Express + MongoDB) |

### User Roles Under Test

| Role | Login Endpoint | Access Level |
|---|---|---|
| `ADMIN` | `/auth/backoffice/login` | Full access to all modules |
| `SALES_AGENT` | `/auth/salesagent/login` | Agencies, reservations, commissions |
| `TRAVEL_AGENCY` | `/auth/travelagency/login` | Own profile, bookings, employees |
| `USER` (Sales Agent User) | `/auth/salesagent/login` | Limited agency creation |
| `BACKOFFICE_HOTEL_AGENT` | `/auth/backoffice/login` | Hotel management only |

### Backend Dependencies

- **MongoDB** (3 databases: backoffice, salesagent, travelagency)
- **Redis** (BullMQ job queues for hotel sync)
- **External APIs**: Dingus (SOAP), Hotetec (REST), Roibos (SOAP), TropiPay (payments)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cypress Test Runner                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Auth Tests   │  │ CRUD Tests   │  │ Flow Tests    │ │
│  │ (login,      │  │ (agencies,   │  │ (booking,     │ │
│  │  session,    │  │  agents,     │  │  payment,     │ │
│  │  passkey)    │  │  hotels)     │  │  scan)        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘ │
│         │                  │                  │          │
│  ┌──────┴──────────────────┴──────────────────┴────────┐│
│  │              Custom Commands & Fixtures              ││
│  │   cy.login(), cy.apiLogin(), intercepts, seeds      ││
│  └──────────────────────┬──────────────────────────────┘│
└─────────────────────────┼───────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
   │ backoffice   │ │ backend  │ │ MongoDB      │
   │ :3032        │ │ :3001    │ │ (3 databases)│
   └──────────────┘ └──────────┘ └──────────────┘
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+ or Bun
- Backend service running (`make backend` or `bun run dev` in backend-service)
- Backoffice app running (`make backoffice` or `bun run start` in backoffice-app)
- MongoDB accessible (remote Atlas or local Docker via `make db-up`)

### Install Cypress

From the project root:

```bash
cd backoffice-app
bun add -d cypress @testing-library/cypress
```

### Initialize Cypress

```bash
bunx cypress open
```

Select **E2E Testing** when prompted. Cypress will scaffold the directory structure.

### Verify Installation

```bash
bunx cypress run --spec "cypress/e2e/health-check.cy.ts"
```

---

## Project Structure

```
backoffice-app/
├── cypress/
│   ├── e2e/                          # Test spec files
│   │   ├── auth/
│   │   │   ├── login.cy.ts           # Login flows (admin, sales agent)
│   │   │   ├── session.cy.ts         # Token expiration, 401 handling
│   │   │   └── logout.cy.ts          # Logout and session cleanup
│   │   ├── sales-agent/
│   │   │   ├── list.cy.ts            # List, search, filter
│   │   │   ├── create.cy.ts          # Create with validation
│   │   │   └── edit.cy.ts            # Edit and commission management
│   │   ├── travel-agency/
│   │   │   ├── list.cy.ts            # List, search, filter
│   │   │   ├── create.cy.ts          # Create with Google autocomplete
│   │   │   ├── edit.cy.ts            # Edit agency details
│   │   │   └── email-check.cy.ts     # Duplicate email validation
│   │   ├── reservations/
│   │   │   ├── list.cy.ts            # List with filters
│   │   │   ├── detail.cy.ts          # Reservation detail view
│   │   │   ├── cancel.cy.ts          # Cancel flow with confirmation
│   │   │   └── export.cy.ts          # CSV/Excel export
│   │   ├── hotels/
│   │   │   ├── list.cy.ts            # List with provider filters
│   │   │   ├── commission.cy.ts      # Edit/bulk edit commissions
│   │   │   └── scan.cy.ts            # Hotel sync trigger/cancel
│   │   ├── dashboard/
│   │   │   └── analytics.cy.ts       # Dashboard filters and charts
│   │   ├── profile/
│   │   │   └── settings.cy.ts        # Profile edit, password, date format
│   │   └── health-check.cy.ts        # Smoke test
│   ├── fixtures/                      # Mock data
│   │   ├── users/
│   │   │   ├── admin.json
│   │   │   ├── sales-agent.json
│   │   │   └── travel-agency.json
│   │   ├── agencies/
│   │   │   ├── agency-list.json
│   │   │   └── agency-create.json
│   │   ├── hotels/
│   │   │   ├── hotel-list.json
│   │   │   └── hotel-search.json
│   │   ├── reservations/
│   │   │   ├── reservation-list.json
│   │   │   └── reservation-detail.json
│   │   └── auth/
│   │       ├── login-response.json
│   │       └── token.json
│   ├── support/
│   │   ├── commands.ts               # Custom Cypress commands
│   │   ├── e2e.ts                    # Global before/after hooks
│   │   └── index.d.ts               # TypeScript declarations
│   └── downloads/                     # Downloaded files (exports)
├── cypress.config.ts                  # Cypress configuration
└── tsconfig.cypress.json              # TypeScript config for Cypress
```

---

## Configuration

### cypress.config.ts

```typescript
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3032",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    video: false,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      API_URL: "http://localhost:3001/api/v1",
      ADMIN_EMAIL: "admin@test.com",
      ADMIN_PASSWORD: "testpassword123",
      SALES_AGENT_EMAIL: "agent@test.com",
      SALES_AGENT_PASSWORD: "testpassword123",
    },
    setupNodeEvents(on, config) {
      // Seed/reset database before test runs
      on("task", {
        "db:seed": () => {
          // Call a seed script or API endpoint
          return null;
        },
        "db:reset": () => {
          // Reset test data
          return null;
        },
      });
      return config;
    },
  },
});
```

### tsconfig.cypress.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "types": ["cypress", "@testing-library/cypress"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["cypress/**/*.ts"]
}
```

---

## Test Suites

### Suite 1: Authentication

**File:** `cypress/e2e/auth/login.cy.ts`

```typescript
describe("Authentication", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("should display login form with user type selection", () => {
    cy.get('[data-testid="user-type-admin"]').should("exist");
    cy.get('[data-testid="user-type-salesagent"]').should("exist");
    cy.get('[data-testid="email-input"]').should("exist");
    cy.get('[data-testid="password-input"]').should("exist");
  });

  it("should login as admin and redirect to dashboard", () => {
    cy.get('[data-testid="user-type-admin"]').click();
    cy.get('[data-testid="email-input"]').type(Cypress.env("ADMIN_EMAIL"));
    cy.get('[data-testid="password-input"]').type(Cypress.env("ADMIN_PASSWORD"));
    cy.get('[data-testid="login-button"]').click();

    cy.url().should("include", "/dashboard");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("auth_token")).to.not.be.null;
    });
  });

  it("should login as sales agent", () => {
    cy.get('[data-testid="user-type-salesagent"]').click();
    cy.get('[data-testid="email-input"]').type(Cypress.env("SALES_AGENT_EMAIL"));
    cy.get('[data-testid="password-input"]').type(
      Cypress.env("SALES_AGENT_PASSWORD")
    );
    cy.get('[data-testid="login-button"]').click();

    cy.url().should("include", "/dashboard");
  });

  it("should show validation errors for empty fields", () => {
    cy.get('[data-testid="login-button"]').click();
    cy.contains("email is a required field").should("be.visible");
    cy.contains("password is a required field").should("be.visible");
  });

  it("should show error for invalid credentials", () => {
    cy.get('[data-testid="user-type-admin"]').click();
    cy.get('[data-testid="email-input"]').type("wrong@email.com");
    cy.get('[data-testid="password-input"]').type("wrongpassword");
    cy.get('[data-testid="login-button"]').click();

    // Toast notification or error message
    cy.get(".Toastify__toast--error").should("be.visible");
  });

  it("should reject invalid email format", () => {
    cy.get('[data-testid="email-input"]').type("not-an-email");
    cy.get('[data-testid="password-input"]').click(); // blur email field
    cy.contains("email must be a valid email").should("be.visible");
  });
});
```

**File:** `cypress/e2e/auth/session.cy.ts`

```typescript
describe("Session Management", () => {
  it("should redirect to login when token is missing", () => {
    cy.visit("/dashboard");
    cy.url().should("include", "/login");
  });

  it("should redirect to login on 401 response", () => {
    cy.login("admin");
    // Manually expire the token
    cy.window().then((win) => {
      win.localStorage.setItem("auth_token", "expired.token.value");
    });

    // Trigger an API call
    cy.visit("/sales-agent");
    cy.url().should("include", "/login");
  });

  it("should clear localStorage on logout", () => {
    cy.login("admin");
    cy.get('[data-testid="logout-button"]').click();

    cy.window().then((win) => {
      expect(win.localStorage.getItem("auth_token")).to.be.null;
    });
    cy.url().should("include", "/login");
  });
});
```

---

### Suite 2: Sales Agent Management

**File:** `cypress/e2e/sales-agent/create.cy.ts`

```typescript
describe("Sales Agent - Create", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/sales-agent/create");
  });

  it("should create a new sales agent with valid data", () => {
    cy.get('[data-testid="firstName"]').type("John");
    cy.get('[data-testid="lastName"]').type("Doe");
    cy.get('[data-testid="email"]').type(`agent-${Date.now()}@test.com`);
    cy.get('[data-testid="contactNumber"]').type("+1(555)123-4567");
    cy.get('[data-testid="street"]').type("123 Main St");
    cy.get('[data-testid="province"]').type("Florida");
    cy.get('[data-testid="postal_code"]').type("33101");
    cy.get('[data-testid="country"]').type("United States");
    cy.get('[data-testid="earningPercentage"]').clear().type("15");
    cy.get('[data-testid="operationalExpense"]').clear().type("5");

    cy.get('[data-testid="submit-button"]').click();

    cy.get(".Toastify__toast--success").should("be.visible");
    cy.url().should("include", "/sales-agent");
  });

  it("should validate required fields", () => {
    cy.get('[data-testid="submit-button"]').click();

    cy.contains("firstName is a required field").should("be.visible");
    cy.contains("lastName is a required field").should("be.visible");
    cy.contains("email is a required field").should("be.visible");
  });

  it("should validate phone number format", () => {
    cy.get('[data-testid="contactNumber"]').type("1234");
    cy.get('[data-testid="firstName"]').click(); // blur
    cy.contains("invalid phone number").should("be.visible");
  });

  it("should validate earning percentage max 100", () => {
    cy.get('[data-testid="earningPercentage"]').clear().type("150");
    cy.get('[data-testid="firstName"]').click();
    cy.contains("must be less than or equal to 100").should("be.visible");
  });
});
```

**File:** `cypress/e2e/sales-agent/list.cy.ts`

```typescript
describe("Sales Agent - List", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/sales-agent");
  });

  it("should display sales agents table", () => {
    cy.get("table").should("exist");
    cy.get("tbody tr").should("have.length.greaterThan", 0);
  });

  it("should navigate to create page", () => {
    cy.get('[data-testid="create-agent-button"]').click();
    cy.url().should("include", "/sales-agent/create");
  });

  it("should navigate to edit page on row click", () => {
    cy.get("tbody tr").first().click();
    cy.url().should("match", /\/sales-agent\/edit\/.+/);
  });
});
```

---

### Suite 3: Travel Agency Management

**File:** `cypress/e2e/travel-agency/create.cy.ts`

```typescript
describe("Travel Agency - Create", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/travel-agencies/create");
  });

  it("should create a new travel agency", () => {
    const uniqueEmail = `agency-${Date.now()}@test.com`;

    cy.get('[data-testid="agencyName"]').type("Test Travel Agency");
    cy.get('[data-testid="primaryContactName"]').type("Jane Smith");
    cy.get('[data-testid="primaryContactEmail"]').type(uniqueEmail);
    cy.get('[data-testid="primaryContactNumber"]').type("+1(555)987-6543");

    // Sales agent dropdown
    cy.get('[data-testid="salesAgentRefId"]').click();
    cy.get('[data-testid="salesAgentRefId"] option').eq(1).then(($option) => {
      cy.get('[data-testid="salesAgentRefId"]').select($option.val() as string);
    });

    // Address fields (skip Google autocomplete in tests)
    cy.get('[data-testid="street"]').type("456 Ocean Drive");
    cy.get('[data-testid="province"]').type("California");
    cy.get('[data-testid="postal_code"]').type("90210");
    cy.get('[data-testid="country"]').type("United States");

    cy.get('[data-testid="submit-button"]').click();

    cy.get(".Toastify__toast--success").should("be.visible");
    cy.url().should("include", "/travel-agencies");
  });

  it("should check for duplicate email", () => {
    // Use an email that already exists
    cy.intercept("GET", "**/travelagency/*/emailExists", {
      statusCode: 200,
      body: { exists: true },
    }).as("emailCheck");

    cy.get('[data-testid="primaryContactEmail"]').type("existing@agency.com");
    cy.get('[data-testid="primaryContactName"]').click(); // blur

    cy.wait("@emailCheck");
    cy.contains("email already exists").should("be.visible");
  });

  it("should validate required fields on submit", () => {
    cy.get('[data-testid="submit-button"]').click();

    cy.contains("agencyName is a required field").should("be.visible");
    cy.contains("primaryContactEmail is a required field").should("be.visible");
    cy.contains("salesAgentRefId is a required field").should("be.visible");
  });
});
```

---

### Suite 4: Reservations

**File:** `cypress/e2e/reservations/list.cy.ts`

```typescript
describe("Reservations - List", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/reservations");
  });

  it("should display reservations table", () => {
    cy.get("table").should("exist");
  });

  it("should filter by status", () => {
    cy.intercept("GET", "**/bookings*").as("getBookings");

    cy.get('[data-testid="status-filter"]').click();
    cy.get('[data-testid="status-CONFIRMED"]').click();

    cy.wait("@getBookings");
    // Verify filtered results
    cy.get("tbody tr").each(($row) => {
      cy.wrap($row).contains("CONFIRMED");
    });
  });

  it("should search reservations with global filter", () => {
    cy.get('[data-testid="search-input"]').type("test hotel");
    cy.get("tbody").should("exist");
  });

  it("should navigate to reservation detail", () => {
    cy.get("tbody tr").first().click();
    cy.url().should("include", "/reservations/detail");
  });
});
```

**File:** `cypress/e2e/reservations/cancel.cy.ts`

```typescript
describe("Reservations - Cancel", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/reservations");
  });

  it("should cancel a reservation with confirmation", () => {
    cy.intercept("PUT", "**/bookings/*/cancel").as("cancelBooking");

    // Click cancel on first row
    cy.get('[data-testid="cancel-button"]').first().click();

    // Confirmation dialog
    cy.get('[data-testid="confirm-dialog"]').should("be.visible");
    cy.get('[data-testid="cancel-reason"]').type("Test cancellation reason");
    cy.get('[data-testid="confirm-cancel"]').click();

    cy.wait("@cancelBooking");
    cy.get(".Toastify__toast--success").should("be.visible");
  });

  it("should dismiss cancel dialog on cancel click", () => {
    cy.get('[data-testid="cancel-button"]').first().click();
    cy.get('[data-testid="confirm-dialog"]').should("be.visible");
    cy.get('[data-testid="dismiss-cancel"]').click();
    cy.get('[data-testid="confirm-dialog"]').should("not.exist");
  });
});
```

**File:** `cypress/e2e/reservations/export.cy.ts`

```typescript
describe("Reservations - Export", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/reservations");
  });

  it("should export reservations to CSV", () => {
    cy.get('[data-testid="export-csv"]').click();

    // Verify file downloaded
    cy.readFile("cypress/downloads/reservations.csv").should("exist");
  });

  it("should export reservations to Excel", () => {
    cy.get('[data-testid="export-excel"]').click();
    cy.readFile("cypress/downloads/reservations.xlsx").should("exist");
  });
});
```

---

### Suite 5: Hotel Management

**File:** `cypress/e2e/hotels/list.cy.ts`

```typescript
describe("Hotels - List & Filter", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/hotels");
  });

  it("should display hotels table", () => {
    cy.get("table").should("exist");
    cy.get("tbody tr").should("have.length.greaterThan", 0);
  });

  it("should filter by provider", () => {
    cy.intercept("GET", "**/hotels/by-provider*").as("getHotels");

    cy.get('[data-testid="provider-filter"]').click();
    cy.get('[data-testid="provider-dingus"]').click();

    cy.wait("@getHotels");
    cy.get("tbody tr").should("have.length.greaterThan", 0);
  });

  it("should search by hotel name", () => {
    cy.get('[data-testid="search-input"]').type("Grand Hotel");
    cy.get("tbody").should("exist");
  });

  it("should paginate results", () => {
    cy.get('[data-testid="next-page"]').click();
    cy.get("tbody tr").should("exist");
  });
});
```

**File:** `cypress/e2e/hotels/commission.cy.ts`

```typescript
describe("Hotels - Commission Management", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/hotels");
  });

  it("should edit individual hotel commission", () => {
    cy.intercept("PATCH", "**/hotels/*").as("updateHotel");

    cy.get('[data-testid="edit-commission"]').first().click();
    cy.get('[data-testid="commission-input"]').clear().type("12");
    cy.get('[data-testid="save-commission"]').click();

    cy.wait("@updateHotel");
    cy.get(".Toastify__toast--success").should("be.visible");
  });

  it("should validate commission range 0-100", () => {
    cy.get('[data-testid="edit-commission"]').first().click();
    cy.get('[data-testid="commission-input"]').clear().type("150");
    cy.get('[data-testid="save-commission"]').click();

    cy.contains("must be less than or equal to 100").should("be.visible");
  });

  it("should bulk update commissions", () => {
    cy.intercept("PUT", "**/hotels/bulk-update").as("bulkUpdate");

    // Select multiple hotels
    cy.get('[data-testid="select-all"]').click();
    cy.get('[data-testid="bulk-edit-button"]').click();
    cy.get('[data-testid="bulk-commission-input"]').type("10");
    cy.get('[data-testid="bulk-save"]').click();

    cy.wait("@bulkUpdate");
    cy.get(".Toastify__toast--success").should("be.visible");
  });
});
```

**File:** `cypress/e2e/hotels/scan.cy.ts`

```typescript
describe("Hotels - Scan Operations", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/hotels");
  });

  it("should trigger hotel scan", () => {
    cy.intercept("POST", "**/hotels/scan").as("scanHotels");

    cy.get('[data-testid="scan-button"]').click();
    cy.wait("@scanHotels");

    cy.contains("Scan started").should("be.visible");
  });

  it("should cancel running scan", () => {
    cy.intercept("POST", "**/hotels/scan/cancel").as("cancelScan");

    // Assume a scan is running
    cy.get('[data-testid="cancel-scan"]').click();
    cy.wait("@cancelScan");
  });

  it("should view scan history", () => {
    cy.intercept("GET", "**/scan-history*").as("scanHistory");

    cy.get('[data-testid="scan-history-button"]').click();
    cy.wait("@scanHistory");

    cy.get('[data-testid="scan-history-table"]').should("exist");
  });
});
```

---

### Suite 6: Dashboard & Analytics

**File:** `cypress/e2e/dashboard/analytics.cy.ts`

```typescript
describe("Dashboard Analytics", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/dashboard");
  });

  it("should load dashboard with default data", () => {
    cy.intercept("GET", "**/analytics/dashboard*").as("getDashboard");
    cy.wait("@getDashboard");

    cy.get('[data-testid="dashboard-charts"]').should("exist");
    cy.get('[data-testid="dashboard-table"]').should("exist");
  });

  it("should filter by date range", () => {
    cy.intercept("GET", "**/analytics/dashboard*").as("getDashboard");

    cy.get('[data-testid="date-from"]').type("2025-01-01");
    cy.get('[data-testid="date-to"]').type("2025-12-31");
    cy.get('[data-testid="apply-filters"]').click();

    cy.wait("@getDashboard");
    cy.get('[data-testid="dashboard-charts"]').should("exist");
  });

  it("should filter by travel agency", () => {
    cy.intercept("GET", "**/analytics/dashboard*").as("getDashboard");

    cy.get('[data-testid="agency-filter"]').click();
    cy.get('[data-testid="agency-option"]').first().click();
    cy.get('[data-testid="apply-filters"]').click();

    cy.wait("@getDashboard");
  });
});
```

---

### Suite 7: Profile Settings

**File:** `cypress/e2e/profile/settings.cy.ts`

```typescript
describe("Profile Settings", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.visit("/profile-settings");
  });

  it("should display profile settings tabs", () => {
    cy.contains("Edit Profile").should("exist");
    cy.contains("Change Password").should("exist");
    cy.contains("Date Format").should("exist");
  });

  it("should update date format preference", () => {
    cy.intercept("PATCH", "**/user-settings/*").as("updateSettings");

    cy.contains("Date Format").click();
    cy.get('[data-testid="date-format-select"]').select("DD/MM/YYYY");
    cy.get('[data-testid="save-settings"]').click();

    cy.wait("@updateSettings");
    cy.get(".Toastify__toast--success").should("be.visible");
  });

  it("should change password with validation", () => {
    cy.contains("Change Password").click();

    cy.get('[data-testid="old-password"]').type("currentpassword");
    cy.get('[data-testid="new-password"]').type("newpassword123");
    cy.get('[data-testid="confirm-password"]').type("newpassword123");
    cy.get('[data-testid="save-password"]').click();
  });

  it("should validate password mismatch", () => {
    cy.contains("Change Password").click();

    cy.get('[data-testid="new-password"]').type("newpassword123");
    cy.get('[data-testid="confirm-password"]').type("differentpassword");
    cy.get('[data-testid="save-password"]').click();

    cy.contains("Passwords must match").should("be.visible");
  });
});
```

---

### Suite 8: Role-Based Access Control

**File:** `cypress/e2e/auth/rbac.cy.ts`

```typescript
describe("Role-Based Access Control", () => {
  it("admin should see all menu items", () => {
    cy.login("admin");
    cy.visit("/dashboard");

    cy.get("nav").within(() => {
      cy.contains("Dashboard").should("exist");
      cy.contains("BackOffice").should("exist");
      cy.contains("Sales Agent").should("exist");
      cy.contains("Travel Agencies").should("exist");
      cy.contains("Hotels").should("exist");
      cy.contains("Reservations").should("exist");
    });
  });

  it("sales agent should not see backoffice menu", () => {
    cy.login("salesagent");
    cy.visit("/dashboard");

    cy.get("nav").within(() => {
      cy.contains("Dashboard").should("exist");
      cy.contains("BackOffice").should("not.exist");
      cy.contains("Hotels").should("not.exist");
    });
  });

  it("sales agent cannot access admin-only routes", () => {
    cy.login("salesagent");
    cy.visit("/backoffice");

    // Should redirect or show unauthorized
    cy.url().should("not.include", "/backoffice");
  });
});
```

---

## Custom Commands & Utilities

### cypress/support/commands.ts

```typescript
/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(userType: "admin" | "salesagent"): Chainable<void>;
    apiLogin(
      userType: "admin" | "salesagent"
    ): Chainable<{ token: string; user: object }>;
    resetTestData(): Chainable<void>;
  }
}

// Login via UI
Cypress.Commands.add("login", (userType: "admin" | "salesagent") => {
  const credentials = {
    admin: {
      email: Cypress.env("ADMIN_EMAIL"),
      password: Cypress.env("ADMIN_PASSWORD"),
      selector: '[data-testid="user-type-admin"]',
    },
    salesagent: {
      email: Cypress.env("SALES_AGENT_EMAIL"),
      password: Cypress.env("SALES_AGENT_PASSWORD"),
      selector: '[data-testid="user-type-salesagent"]',
    },
  };

  const creds = credentials[userType];

  cy.session(userType, () => {
    cy.visit("/login");
    cy.get(creds.selector).click();
    cy.get('[data-testid="email-input"]').type(creds.email);
    cy.get('[data-testid="password-input"]').type(creds.password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should("include", "/dashboard");
  });
});

// Login via API (faster, for most tests)
Cypress.Commands.add("apiLogin", (userType: "admin" | "salesagent") => {
  const endpoint =
    userType === "admin"
      ? "/auth/backoffice/login"
      : "/auth/salesagent/login";

  const credentials = {
    admin: {
      email: Cypress.env("ADMIN_EMAIL"),
      password: Cypress.env("ADMIN_PASSWORD"),
    },
    salesagent: {
      email: Cypress.env("SALES_AGENT_EMAIL"),
      password: Cypress.env("SALES_AGENT_PASSWORD"),
    },
  };

  cy.request({
    method: "POST",
    url: `${Cypress.env("API_URL")}${endpoint}`,
    body: credentials[userType],
  }).then((response) => {
    const { token, user } = response.body;
    window.localStorage.setItem("auth_token", token);
    window.localStorage.setItem("persist:root", JSON.stringify({
      authReducer: JSON.stringify({ user, isLoggedIn: true, sessionExpired: false }),
    }));
    return { token, user };
  });
});

// Reset test data between runs
Cypress.Commands.add("resetTestData", () => {
  cy.task("db:reset");
});
```

### cypress/support/e2e.ts

```typescript
import "./commands";
import "@testing-library/cypress/add-commands";

// Suppress uncaught exceptions from the app
Cypress.on("uncaught:exception", (err) => {
  // Ignore React-specific errors during tests
  if (err.message.includes("ResizeObserver")) return false;
  if (err.message.includes("hydration")) return false;
  return true;
});

// Clear localStorage between tests (not sessions)
beforeEach(() => {
  cy.intercept("GET", "**/health", { statusCode: 200 }).as("healthCheck");
});
```

---

## API Interceptors & Fixtures

### Stubbing vs Live API

Use **live API** for happy-path integration tests. Use **stubs** for:

- Error states (500, 404, 403)
- Edge cases (empty lists, pagination boundaries)
- External services (Google Maps, TropiPay webhooks)
- Slow responses (timeout testing)

### Example Fixture: fixtures/auth/login-response.json

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "test-admin-id",
    "firstName": "Test",
    "lastName": "Admin",
    "email": "admin@test.com",
    "role": {
      "code": "ADMIN",
      "name": "Administrator"
    }
  }
}
```

### Example Fixture: fixtures/agencies/agency-list.json

```json
{
  "data": [
    {
      "_id": "agency-1",
      "agencyName": "Test Travel Agency",
      "primaryContactName": "Jane Smith",
      "primaryContactEmail": "jane@testagency.com",
      "isActive": true,
      "salesAgentRefId": "agent-1"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### Stubbing Error States

```typescript
it("should handle server error gracefully", () => {
  cy.intercept("GET", "**/salesagent", {
    statusCode: 500,
    body: { message: "Internal Server Error" },
  }).as("getAgentsError");

  cy.login("admin");
  cy.visit("/sales-agent");

  cy.wait("@getAgentsError");
  cy.get(".Toastify__toast--error").should("be.visible");
});

it("should handle empty list state", () => {
  cy.intercept("GET", "**/salesagent", {
    statusCode: 200,
    body: { data: [], total: 0 },
  }).as("getEmptyAgents");

  cy.login("admin");
  cy.visit("/sales-agent");

  cy.wait("@getEmptyAgents");
  cy.contains("No data").should("be.visible");
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/cypress-e2e.yml
name: Cypress E2E Tests

on:
  pull_request:
    branches: [master, main]
  push:
    branches: [master, main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      # Install dependencies
      - name: Install backend dependencies
        run: cd backend-service && bun install

      - name: Install backoffice dependencies
        run: cd backoffice-app && bun install

      # Seed test database
      - name: Seed test data
        run: cd backend-service && bun run seed:test
        env:
          BACKOFFICE_DB_URL: mongodb://localhost:27017/backoffice_test
          SALES_AGENT_DB_URL: mongodb://localhost:27017/salesagent_test
          TRAVEL_AGENCY_DB_URL: mongodb://localhost:27017/travelagency_test

      # Start services
      - name: Start backend
        run: cd backend-service && bun run dev &
        env:
          PORT: 3001
          NODE_ENV: test
          JWT_SECRET: test-jwt-secret
          BACKOFFICE_DB_URL: mongodb://localhost:27017/backoffice_test
          SALES_AGENT_DB_URL: mongodb://localhost:27017/salesagent_test
          TRAVEL_AGENCY_DB_URL: mongodb://localhost:27017/travelagency_test

      - name: Start backoffice
        run: cd backoffice-app && bun run start &
        env:
          VITE_ADMIN_SERVICE_URL: http://localhost:3001/api/v1

      - name: Wait for services
        run: |
          npx wait-on http://localhost:3001/api/v1/health http://localhost:3032 --timeout 60000

      # Run Cypress
      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          working-directory: backoffice-app
          browser: chrome
          wait-on: "http://localhost:3032"
          wait-on-timeout: 60

      # Upload artifacts on failure
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: backoffice-app/cypress/screenshots
```

### Package.json Scripts

Add to `backoffice-app/package.json`:

```json
{
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run",
    "cy:run:chrome": "cypress run --browser chrome",
    "cy:run:headed": "cypress run --headed",
    "test:e2e": "start-server-and-test 'bun run start' http://localhost:3032 'cypress run'"
  }
}
```

### Makefile Target

Add to root `Makefile`:

```makefile
.PHONY: test-e2e
test-e2e: up  ## Run Cypress E2E tests (starts services first)
	@echo "Waiting for services to be ready..."
	@sleep 5
	@cd backoffice-app && bunx cypress run
```

---

## Best Practices

### 1. Data Test IDs

Add `data-testid` attributes to all interactive elements in the backoffice-app. These are stable selectors that won't break when CSS classes or text change.

**Pattern:**

```tsx
// Buttons
<button data-testid="submit-button">Save</button>
<button data-testid="cancel-button">Cancel</button>

// Form inputs
<input data-testid="email-input" />
<select data-testid="role-select" />

// Tables
<table data-testid="agents-table">
<tr data-testid={`agent-row-${agent._id}`}>

// Modals/Dialogs
<div data-testid="confirm-dialog">
```

**Priority elements to tag:**

| Module | Elements |
|---|---|
| Login | `user-type-admin`, `user-type-salesagent`, `email-input`, `password-input`, `login-button` |
| Sales Agent | `create-agent-button`, `firstName`, `lastName`, `email`, `contactNumber`, `submit-button` |
| Travel Agency | `agencyName`, `primaryContactEmail`, `salesAgentRefId`, `submit-button` |
| Reservations | `status-filter`, `search-input`, `cancel-button`, `export-csv`, `export-excel` |
| Hotels | `provider-filter`, `search-input`, `edit-commission`, `scan-button`, `bulk-edit-button` |
| Dashboard | `date-from`, `date-to`, `agency-filter`, `apply-filters` |
| Navigation | `logout-button`, `nav-dashboard`, `nav-sales-agent`, `nav-travel-agencies` |

### 2. Test Isolation

- Each test should be independent - never depend on another test's state
- Use `cy.session()` for login to avoid logging in before every test
- Use `beforeEach` to set up required state
- Clean up created data in `afterEach` or use unique identifiers (timestamps)

### 3. Flaky Test Prevention

- Always use `cy.intercept().as()` + `cy.wait("@alias")` instead of arbitrary `cy.wait(ms)`
- Use `.should()` assertions that auto-retry instead of `.then()` with manual checks
- Set appropriate `defaultCommandTimeout` in config (10s recommended)
- Use `{ timeout: 15000 }` for slow operations (hotel scan, file export)

### 4. API Testing Alongside UI

For critical backend flows that the UI doesn't fully cover, add API-level tests:

```typescript
describe("API - Booking Lifecycle", () => {
  let token: string;
  let bookingId: string;

  before(() => {
    cy.apiLogin("admin").then((auth) => {
      token = auth.token;
    });
  });

  it("should create a booking via API", () => {
    cy.request({
      method: "POST",
      url: `${Cypress.env("API_URL")}/bookings`,
      headers: {
        Authorization: `Bearer ${token}`,
        "x-vendor": "dingus",
        "x-provider": "dingus",
      },
      body: {
        // booking payload
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      bookingId = response.body.data._id;
    });
  });

  it("should confirm the booking", () => {
    cy.request({
      method: "PUT",
      url: `${Cypress.env("API_URL")}/bookings/${bookingId}/confirm`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.data.status).to.eq("CONFIRMED");
    });
  });

  it("should cancel the booking", () => {
    cy.request({
      method: "PUT",
      url: `${Cypress.env("API_URL")}/bookings/${bookingId}/cancel`,
      headers: { Authorization: `Bearer ${token}` },
      body: { reason: "E2E test cleanup" },
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });
});
```

### 5. Test Database Seeding

Create a seed script at `backend-service/scripts/seed-test-data.ts`:

```typescript
// Seed users, agencies, agents, hotels, and bookings for E2E tests
// Run with: bun run seed:test
// Reset with: bun run seed:reset

// Minimum seed data:
// - 1 admin user (admin@test.com / testpassword123)
// - 1 sales agent (agent@test.com / testpassword123)
// - 1 travel agency linked to the sales agent
// - 5-10 hotels across providers (dingus, hotetec)
// - 3-5 bookings in various statuses (PENDING, CONFIRMED, CANCELLED)
```

Add to `backend-service/package.json`:

```json
{
  "scripts": {
    "seed:test": "ts-node scripts/seed-test-data.ts",
    "seed:reset": "ts-node scripts/reset-test-data.ts"
  }
}
```

---

## Test Execution Summary

### Running Tests

```bash
# Open Cypress GUI (interactive)
cd backoffice-app && bunx cypress open

# Run all tests headless
cd backoffice-app && bunx cypress run

# Run specific suite
cd backoffice-app && bunx cypress run --spec "cypress/e2e/auth/**"

# Run with Chrome
cd backoffice-app && bunx cypress run --browser chrome

# Run from root Makefile
make test-e2e
```

### Test Coverage Target

| Suite | Tests | Priority |
|---|---|---|
| Auth (login, session, RBAC) | ~12 | P0 - Critical |
| Sales Agent CRUD | ~8 | P1 - High |
| Travel Agency CRUD | ~10 | P1 - High |
| Reservations (list, cancel, export) | ~8 | P1 - High |
| Hotels (list, commission, scan) | ~10 | P1 - High |
| Dashboard analytics | ~5 | P2 - Medium |
| Profile settings | ~5 | P2 - Medium |
| API booking lifecycle | ~5 | P1 - High |
| Error handling & edge cases | ~8 | P2 - Medium |
| **Total** | **~71** | |

### Estimated Implementation Time

| Phase | Scope | Effort |
|---|---|---|
| 1. Setup | Install Cypress, config, commands, data-testid tagging | 1-2 days |
| 2. Auth + RBAC | Login, session, role tests | 1 day |
| 3. CRUD Suites | Sales agent, travel agency, hotels | 2-3 days |
| 4. Reservations | List, detail, cancel, export | 1 day |
| 5. Dashboard + Profile | Analytics, settings | 1 day |
| 6. API Tests | Booking lifecycle, payment flow | 1 day |
| 7. CI/CD | GitHub Actions, seed scripts | 1 day |
| **Total** | | **8-10 days** |