# Ergos Continental — Documentation

Central documentation repository for the Ergos Continental travel platform. Start here to find architecture decisions, integration guides, production readiness assessments, and business plans.

---

## Repository Structure

```
documentation/
  business-plan/              Business strategy and expansion plans
  technical/
    0-prototype/              UI prototype and feature specs
    1-onboarding/             New developer onboarding
    2-architecture/           Production readiness and architecture decisions
    3-integration/            GDS supplier and third-party integration guides
    4-testing/                E2E testing strategy and test cases
```

---

## Business Planning

| Document | Description |
|----------|-------------|
| [Mozio Business Plan](business-plan/MOZIO_BUSINESS_PLAN.md) | Ground transportation integration — revenue model, market analysis, and implementation strategy |
| [Mozio UX Spec](business-plan/MOZIO_UX_SPEC.md) | UX specification for 6 new + 2 modified prototype screens for transfer booking |
| [Business Calculator](business-plan/business-calculator.html) | Interactive revenue projection calculator (open in browser) |

---

## Technical Documentation

### 0 — Prototype

| Document | Description |
|----------|-------------|
| [Prototype Features](technical/0-prototype/_review_ui/3-prototype/PROTOTYPE_FEATURES.md) | Feature inventory for the 11-screen interactive prototype (EN/ES) |
| [API Platform Plan](technical/0-prototype/_review_ui/3-prototype/ERGOS_API_PLATFORM_PLAN.md) | GDS aggregator API platform plan — Istio ambient mesh, auth architecture, deployment strategy |
| [Prototype App](technical/0-prototype/_review_ui/3-prototype/index.html) | Interactive prototype (serve locally — `npx serve` or `python -m http.server`) |

### 1 — Onboarding

| Document | Description |
|----------|-------------|
| [Onboarding Guide](technical/1-onboarding/ONBOARDING_GUIDE.md) | Zero-to-productive guide for new developers — setup, codebase walkthrough, first tasks |
| [Architecture Overview](technical/1-onboarding/ARCHITECTURE.md) | C4 diagrams, sequence diagrams, infrastructure layout, data architecture, deployment pipeline |

### 2 — Architecture & Production Readiness

| Document | Description |
|----------|-------------|
| [Production Readiness Outlines](technical/2-architecture/1.1-PRODUCTION_READINESS_OUTLINES.md) | Master outline for all production readiness assessments |
| [Code Quality Assessment](technical/2-architecture/1-CODE_QUALITY_ASSESSMENT.md) | Cross-repo code quality, architecture, and maintainability review |
| [Alibaba Cloud Infrastructure](technical/2-architecture/2-PRODUCTION_READINESS_ALIBABA_INFRA.md) | Terraform IaC assessment for Alibaba Cloud (security, networking, scaling) |
| [Domain Strategy Options](technical/2-architecture/2.1-DOMAIN_STRATEGY_OPTIONS.md) | Domain naming strategies for multi-tenant agency subdomains |
| [Multi-Tenant Architecture](technical/2-architecture/2.2-ARCHITECTURE_MULTI_TENANT_AGENCIES.md) | Multi-tenant design — data isolation, agency branding, subdomain routing |
| [Agency App Readiness](technical/2-architecture/3-PRODUCTION_READINESS_AGENCY_APP.md) | Production readiness for `agency-app` (React SPA) |
| [Backend Service Readiness](technical/2-architecture/4-PRODUCTION_READINESS_BACKEND_SERVICE.md) | Production readiness for `backend-service` (Express API) |
| [Backoffice App Readiness](technical/2-architecture/5-PRODUCTION_READINESS_BACKOFFICE_APP.md) | Production readiness for `backoffice-app` (React Admin SPA) |
| [Reservation System Analysis](technical/2-architecture/6-RESERVATION_SYSTEM_MULTI_GDS_ANALYSIS.md) | Multi-GDS deep analysis — booking lifecycle across Dingus, Hotetec, Roibos, and Restel |

### 3 — Integration Guides

#### Hotels

| Document | Description |
|----------|-------------|
| [Restel Integration Guide](technical/3-integration/hotels/restel/restel-integration-guide.md) | Restel (Hotelbeds) GDS adapter — XML API, booking flow, development guide |

#### Swagger / API

| Document | Description |
|----------|-------------|
| [API Architecture](technical/3-integration/swagger/API_ARCHITECTURE.md) | C4 diagrams, API gateway comparison (Istio/Alibaba/Apigee/AWS), API key lifecycle, monitoring, security |

#### Transportation

| Document | Description |
|----------|-------------|
| [Mozio API Spec](technical/3-integration/transportation/mozio/Mozio%20API.yaml) | Mozio API v2 OpenAPI spec (YAML) |
| [Mozio API Integration Guide](technical/3-integration/transportation/mozio/Mozio%20API%20v2%20integration.pdf) | Official Mozio integration documentation (PDF) |
| [Mozio FAQ](technical/3-integration/transportation/mozio/FAQ%20API%20QUESTIONS.pdf) | Frequently asked questions from Mozio API support (PDF) |

### 4 — Testing

| Document | Description |
|----------|-------------|
| [Cypress E2E Testing](technical/4-testing/CYPRESS_E2E_TESTING.md) | E2E testing strategy, architecture, setup, and project structure |
| [Cypress Test Cases](technical/4-testing/CYPRESS_TEST_CASES.md) | Complete test case inventory — phased rollout plan with effort estimates |

---

## Related Repositories

| Repository | Description |
|------------|-------------|
| `backend-service` | Express API server — GDS adapters, booking engine, API key management |
| `agency-app` | Travel agency booking portal (React SPA) |
| `backoffice-app` | Internal admin dashboard (React SPA) |
| `alibaba-infra` | Terraform IaC for Alibaba Cloud infrastructure |
