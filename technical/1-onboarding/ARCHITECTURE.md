# OneClickAdventures - Architecture Documentation

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [C4 Diagrams](#2-c4-diagrams)
3. [Sequence Diagrams](#3-sequence-diagrams)
4. [Infrastructure Diagram](#4-infrastructure-diagram)
5. [Data Architecture](#5-data-architecture)
6. [Deployment Pipeline](#6-deployment-pipeline)
7. [Technology Stack Summary](#7-technology-stack-summary)

---

## 1. Executive Summary

OneClickAdventures is a **hotel booking platform purpose-built for travel agencies**. It enables travel agencies to search, compare, and book hotel rooms across multiple Global Distribution System (GDS) providers through a single unified interface, while giving platform administrators full control through a dedicated backoffice dashboard.

### Architecture Philosophy

- **Multi-repo microservice architecture**: Four independent repositories, each with a clear bounded context -- two frontend applications, one backend API, and one infrastructure-as-code repository.
- **Adapter pattern for vendor integration**: The backend normalizes data from 7+ hotel vendors across 3 different protocols (SOAP/XML and REST/JSON) behind a unified adapter interface.
- **Multi-tenant data isolation**: Three separate MongoDB databases enforce data boundaries between backoffice operations, travel agency data, and sales agent data.
- **Serverless-adjacent Kubernetes deployment**: A single-node Kubernetes cluster on Alibaba Cloud with scheduled scaling keeps costs low while maintaining container orchestration benefits.
- **API-first design**: A central REST API (`backend-service`) serves both frontend applications, establishing a clear contract boundary.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Multi-repo over monorepo | Independent deployment cycles; frontends and backend evolve at different paces |
| Alibaba Cloud (Bahamas region) | Geographic proximity to target market; na-south-1 region |
| AWS ECR for container registry | Mature container registry; Alibaba Cloud ECR alternative was less feature-rich at time of adoption |
| BullMQ for background jobs | Redis-backed queue with built-in retry, concurrency control, and dashboard for hotel sync operations |
| Three MongoDB databases | Data isolation by bounded context; prevents accidental cross-domain queries |
| Adapter pattern for GDS | Each vendor has wildly different APIs (SOAP vs REST, XML vs JSON); adapters normalize this |

---

## 2. C4 Diagrams

### 2.1 Context Diagram (Level 1)

This diagram shows OneClickAdventures as a single system and its relationships with external actors and systems.

```mermaid
flowchart TB
    subgraph Users["👤 Users"]
        travelAgent["🧳 Travel Agency User\nSearches hotels, manages\nbookings, handles payments"]
        adminUser["🔧 Backoffice Admin User\nManages agencies, hotels,\ncommissions, sales agents"]
    end

    subgraph Platform["🏨 OneClickAdventures Platform"]
        oca["Hotel booking platform for\ntravel agencies with multi-vendor\nGDS integration"]
    end

    subgraph GDS["🌐 Hotel GDS Providers"]
        dingus["Dingus GDS\nSOAP/XML\ndingus, archipelago, roxa, melia"]
        hotetec["Hotetec GDS\nREST/JSON\nhotetec, rocu, bdmd"]
        roibos["Roibos GDS\nSOAP/XML\nroibos"]
    end

    subgraph External["🔌 External Services"]
        tropipay["TropiPay\nPayment Gateway\nOAuth2 + HMAC Webhooks"]
        wompi["Wompi\nPayment Gateway"]
        gmail["Gmail API\nTransactional Email\nHandlebars Templates"]
        claude["Claude AI - Anthropic\nHotel Search Assistance\nclaude-3-5-haiku"]
    end

    travelAgent -->|"Searches hotels, books rooms\nmanages bookings (HTTPS)"| oca
    adminUser -->|"Manages platform data\nviews analytics (HTTPS)"| oca

    oca -->|"SOAP/XML over HTTPS"| dingus
    oca -->|"REST/JSON over HTTPS"| hotetec
    oca -->|"SOAP/XML over HTTPS"| roibos
    oca -->|"REST/HTTPS + Webhooks"| tropipay
    oca -->|"REST/HTTPS"| wompi
    oca -->|"Gmail API"| gmail
    oca -->|"REST/HTTPS"| claude

    style Platform fill:#1168bd,color:#fff,stroke:#0b4884
    style GDS fill:#999999,color:#fff
    style External fill:#999999,color:#fff
    style Users fill:#08427b,color:#fff
```

### 2.2 Container Diagram (Level 2)

This diagram breaks down the OneClickAdventures system into its deployable containers and shows how they communicate.

```mermaid
flowchart TB
    travelAgent["🧳 Travel Agency User"]
    adminUser["🔧 Backoffice Admin User"]

    subgraph OCA["OneClickAdventures Platform"]
        nginx["🔀 Nginx Load Balancer\n(SSL termination, domain routing)"]

        subgraph Frontends["Frontend Applications"]
            agencyApp["📱 Agency App\nReact 18 · TypeScript · Vite 5\nMantine UI 8\nPort 8081"]
            backofficeApp["📊 Backoffice App\nReact 18 · TypeScript · Vite 5\nTailwind · Shadcn/Radix\nPort 8081"]
        end

        backendService["⚙️ Backend Service\nNode.js 18 · Express 4 · TypeScript\nREST API · Port 3000"]

        subgraph Data["Data Stores"]
            backofficeDb[("📦 Backoffice DB\nMongoDB\nHotels, bookings, roles,\nbackoffice users, scan history")]
            salesAgentDb[("📦 Sales Agent DB\nMongoDB\nSales agent data")]
            travelAgencyDb[("📦 Travel Agency DB\nMongoDB\nAgencies, employees,\ncommissions, invitations")]
            redis[("🔴 Redis\nBullMQ queue backend\n+ caching")]
        end

        bullmq["🔄 BullMQ Worker\nBackground hotel sync\njob processing"]
    end

    subgraph ExtSystems["External Systems"]
        gds["🌐 Hotel GDS Providers\nDingus · Hotetec · Roibos"]
        payments["💳 Payment Gateways\nTropiPay · Wompi"]
        email["📧 Gmail API\nTransactional email"]
        ai["🤖 Claude AI\nAI-assisted search"]
    end

    travelAgent -->|"HTTPS"| nginx
    adminUser -->|"HTTPS"| nginx

    nginx -->|"app.lukzen-op.com"| agencyApp
    nginx -->|"backoffice.lukzen-op.com"| backofficeApp
    nginx -->|"api.lukzen-op.com"| backendService

    agencyApp -->|"REST/JSON /api/v1"| backendService
    backofficeApp -->|"REST/JSON /api/v1"| backendService

    backendService --> backofficeDb
    backendService --> salesAgentDb
    backendService --> travelAgencyDb
    backendService -->|"enqueue jobs"| redis
    bullmq -->|"process jobs"| redis
    bullmq -->|"sync hotel data\nSOAP/REST"| gds

    backendService -->|"search/book\nSOAP/REST"| gds
    backendService -->|"REST/HTTPS"| payments
    backendService -->|"Gmail API"| email
    backendService -->|"REST/HTTPS"| ai

    style OCA fill:#e8f0fe,stroke:#1168bd,stroke-width:2px
    style Frontends fill:#d4e6f1,stroke:#2980b9
    style Data fill:#fdf2e9,stroke:#e67e22
    style ExtSystems fill:#f5f5f5,stroke:#999
    style backendService fill:#1168bd,color:#fff
    style nginx fill:#2ecc71,color:#fff
```

### 2.3 Component Diagram (Level 3) - Backend Service

This diagram shows the internal architecture of the backend-service, the central API.

```mermaid
flowchart TB
    subgraph API["Backend Service (Express.js)"]
        direction TB

        subgraph RequestLayer["Request Layer"]
            router["🛣️ Express Router\n/auth · /hotels · /bookings\n/travelagency · /salesagent\n/backoffice · /payments\n/analytics · /ai-chat · /health"]
            authMw["🔐 Auth Middleware\nJWT verification\nRBAC role checks\nPasskey/WebAuthn"]
            controllers["🎮 Controllers\nRequest handling\nZod validation\nResponse formatting"]
        end

        subgraph Services["Business Logic Services"]
            hotelService["🏨 HotelService\nUnified hotel search\nacross all GDS providers"]
            bookingService["📋 UnifiedBookingService\nBooking creation,\nconfirmation, cancellation"]
            syncService["🔄 HotelSyncService\nBackground hotel data\nsync, cron at 2AM"]
            paymentService["💳 TropiPayService\nOAuth2, payment links,\nHMAC webhook verification"]
            emailService["📧 EmailService\nGmail API integration,\nHandlebars templates"]
            aiService["🤖 ClaudeAIService\nAI-assisted hotel search\nclaude-3-5-haiku"]
            analyticsService["📊 AnalyticsService\nDashboard metrics,\nbooking stats, revenue"]
        end

        subgraph Adapters["GDS Adapters (Adapter Pattern)"]
            dingusAdapter["🔌 Dingus Adapter\nSOAP/XML\ndingus · archipelago\nroxa · melia"]
            hotetecAdapter["🔌 Hotetec Adapter\nREST/JSON\nhotetec · rocu · bdmd"]
            roibosAdapter["🔌 Roibos Adapter\nSOAP/XML\nroibos"]
        end

        subgraph DataAccess["Data Access Layer"]
            repos["📁 Repositories\nData access layer\nMongoose query builders"]
            models["📐 Mongoose Models\nSchema definitions for\nall collections (3 DBs)"]
        end

        subgraph Background["Background Processing"]
            cronScheduler["⏰ Cron Scheduler\nnode-cron\nTriggers at 2AM daily"]
            queueWorker["⚙️ Queue Worker\nBullMQ\nProcesses hotel-sync jobs"]
        end
    end

    mongodb[("📦 MongoDB\n3 Databases")]
    redisExt[("🔴 Redis")]
    gds["🌐 GDS Providers\nExternal hotel APIs"]
    tropipay["💳 TropiPay"]
    gmail["📧 Gmail"]
    claude["🤖 Claude AI"]

    router --> authMw
    authMw --> controllers

    controllers --> hotelService
    controllers --> bookingService
    controllers --> paymentService
    controllers --> emailService
    controllers --> aiService
    controllers --> analyticsService

    hotelService --> dingusAdapter
    hotelService --> hotetecAdapter
    hotelService --> roibosAdapter
    bookingService --> dingusAdapter
    bookingService --> hotetecAdapter
    bookingService --> roibosAdapter

    hotelService --> repos
    bookingService --> repos
    analyticsService --> repos
    repos --> models
    models --> mongodb

    cronScheduler --> syncService
    syncService --> queueWorker
    queueWorker --> redisExt
    queueWorker --> dingusAdapter
    queueWorker --> hotetecAdapter
    queueWorker --> roibosAdapter

    dingusAdapter -->|"SOAP/XML"| gds
    hotetecAdapter -->|"REST/JSON"| gds
    roibosAdapter -->|"SOAP/XML"| gds
    paymentService -->|"OAuth2 + REST"| tropipay
    emailService -->|"Gmail API"| gmail
    aiService -->|"REST API"| claude

    style API fill:#e8f0fe,stroke:#1168bd,stroke-width:2px
    style RequestLayer fill:#d5f5e3,stroke:#27ae60
    style Services fill:#d4e6f1,stroke:#2980b9
    style Adapters fill:#fdebd0,stroke:#e67e22
    style DataAccess fill:#f5eef8,stroke:#8e44ad
    style Background fill:#fdf2e9,stroke:#d35400
```

---

## 3. Sequence Diagrams

### 3.1 Hotel Search Flow

This diagram shows how a travel agency user searches for hotels, which fans out across multiple GDS providers.

```mermaid
sequenceDiagram
    participant User as Travel Agency User
    participant App as Agency App (React)
    participant API as Backend Service
    participant HS as HotelService
    participant DA as Dingus Adapter
    participant HA as Hotetec Adapter
    participant RA as Roibos Adapter
    participant DG as Dingus GDS
    participant HG as Hotetec GDS
    participant RG as Roibos GDS
    participant DB as MongoDB

    User->>App: Enter search criteria (destination, dates, guests)
    App->>API: GET /api/v1/hotels/search?destination=...&checkin=...&checkout=...
    API->>API: Validate JWT Bearer token
    API->>HS: searchHotels(criteria)

    par Fan-out to all GDS providers
        HS->>DA: search(criteria)
        DA->>DG: SOAP/XML SearchHotels request
        DG-->>DA: SOAP/XML response (dingus, archipelago, roxa, melia results)
        DA-->>HS: Normalized hotel results
    and
        HS->>HA: search(criteria)
        HA->>HG: REST/JSON GET /hotels/search
        HG-->>HA: JSON response (hotetec, rocu, bdmd results)
        HA-->>HS: Normalized hotel results
    and
        HS->>RA: search(criteria)
        RA->>RG: SOAP/XML SearchHotels request
        RG-->>RA: SOAP/XML response (roibos results)
        RA-->>HS: Normalized hotel results
    end

    HS->>HS: Merge, deduplicate, sort results
    HS->>DB: Log search to scan history
    HS-->>API: Unified hotel list
    API-->>App: JSON response with hotels
    App-->>User: Display hotel search results
```

### 3.2 Booking Flow

This diagram shows the complete booking lifecycle from room selection through payment.

```mermaid
sequenceDiagram
    participant User as Travel Agency User
    participant App as Agency App (React)
    participant API as Backend Service
    participant BS as UnifiedBookingService
    participant Adapter as GDS Adapter (varies)
    participant GDS as External GDS API
    participant PS as TropiPayService
    participant TP as TropiPay Gateway
    participant ES as EmailService
    participant Gmail as Gmail API
    participant DB as MongoDB

    User->>App: Select room, enter guest details
    App->>API: POST /api/v1/bookings {hotelId, roomId, guests, dates}
    API->>API: Validate JWT + Zod schema validation
    API->>BS: createBooking(bookingData)

    BS->>DB: Save booking (status: PENDING)
    BS->>Adapter: confirmBooking(bookingData)
    Adapter->>GDS: Provider-specific booking request
    GDS-->>Adapter: Booking confirmation (confirmation code)
    Adapter-->>BS: Normalized confirmation

    BS->>DB: Update booking (status: CONFIRMED, confirmationCode)

    BS->>PS: createPaymentLink(bookingId, amount, currency)
    PS->>TP: POST /api/v2/paymentcards (OAuth2 authenticated)
    TP-->>PS: Payment link URL
    PS-->>BS: Payment link

    BS->>ES: sendBookingConfirmation(booking, paymentLink)
    ES->>Gmail: Send email (Handlebars template)
    Gmail-->>ES: Sent

    BS-->>API: Booking response with payment link
    API-->>App: JSON {booking, paymentUrl}
    App-->>User: Show confirmation + redirect to payment

    Note over TP,API: Async webhook after payment
    TP->>API: POST /api/v1/payments/tropipay/webhook (HMAC signed)
    API->>API: Verify HMAC signature
    API->>BS: updatePaymentStatus(bookingId, PAID)
    BS->>DB: Update booking (paymentStatus: PAID)
    BS->>ES: sendPaymentConfirmation(booking)
    ES->>Gmail: Send payment receipt email
```

### 3.3 Authentication Flow

This diagram shows the JWT-based authentication flow used across the platform.

```mermaid
sequenceDiagram
    participant User as User (Travel Agent / Admin)
    participant App as Frontend App
    participant Store as Redux Store + localStorage
    participant API as Backend Service
    participant Auth as Auth Middleware
    participant DB as MongoDB

    Note over User,DB: Login Flow
    User->>App: Enter email + password
    App->>API: POST /api/v1/auth/travelagency/login {email, password}
    Note right of API: 3 login endpoints:<br/>/auth/backoffice/login<br/>/auth/salesagent/login<br/>/auth/travelagency/login
    API->>DB: Find user by email
    DB-->>API: User document
    API->>API: bcrypt.compare(password, hash)
    API->>API: Generate JWT {userId, role, exp}
    API-->>App: {token, user, role}
    App->>Store: Store token in Redux + localStorage

    Note over User,DB: Authenticated Request Flow
    User->>App: Navigate to protected page
    App->>Store: Get JWT token
    App->>API: GET /api/v1/hotels (Authorization: Bearer <token>)
    API->>Auth: Verify JWT signature + expiration
    Auth->>Auth: Check role permissions (RBAC)
    Auth-->>API: User context attached to request
    API-->>App: Protected resource data
    App-->>User: Rendered page

    Note over User,DB: Token Expiration / 401 Flow
    User->>App: Interact with page
    App->>API: GET /api/v1/bookings (Authorization: Bearer <expired-token>)
    API->>Auth: Verify JWT - EXPIRED
    Auth-->>API: 401 Unauthorized
    API-->>App: 401 response
    App->>Store: Clear token from Redux + localStorage
    App->>App: Redirect to /login
    App-->>User: Login page

    Note over User,DB: Passkey / WebAuthn Flow (Alternative)
    User->>App: Click "Login with Passkey"
    App->>API: POST /api/v1/auth/passkey/challenge
    API-->>App: Challenge + options
    App->>User: Browser WebAuthn prompt (fingerprint/face)
    User-->>App: Signed assertion
    App->>API: POST /api/v1/auth/passkey/verify {assertion}
    API->>API: Verify assertion against stored public key
    API->>API: Generate JWT
    API-->>App: {token, user, role}
    App->>Store: Store token
```

### 3.4 Hotel Sync Flow (Background)

This diagram shows how hotel data is synchronized from GDS providers on a nightly schedule.

```mermaid
sequenceDiagram
    participant Cron as Cron Scheduler (2AM daily)
    participant Sync as HotelSyncService
    participant Queue as BullMQ Queue
    participant Redis as Redis
    participant Worker as Queue Worker
    participant DA as Dingus Adapter
    participant HA as Hotetec Adapter
    participant RA as Roibos Adapter
    participant GDS as External GDS APIs
    participant DB as MongoDB (Backoffice DB)
    participant Dashboard as BullMQ Dashboard (/admin/queues)

    Note over Cron,DB: Automated Nightly Sync
    Cron->>Sync: triggerSync() at 2:00 AM
    Sync->>DB: Fetch all active hotel providers
    DB-->>Sync: Provider configurations

    loop For each provider
        Sync->>Queue: Add job to hotel-sync queue {providerId, providerType}
        Queue->>Redis: Store job
    end

    Note over Worker,DB: Worker Processing
    Worker->>Redis: Poll for jobs
    Redis-->>Worker: Next job {providerId, providerType}

    alt providerType = dingus | archipelago | roxa | melia
        Worker->>DA: syncHotels(providerConfig)
        DA->>GDS: SOAP/XML bulk hotel data request
        GDS-->>DA: Full hotel inventory (XML)
        DA-->>Worker: Normalized hotel data array
    else providerType = hotetec | rocu | bdmd
        Worker->>HA: syncHotels(providerConfig)
        HA->>GDS: REST/JSON paginated fetch
        GDS-->>HA: Hotel inventory (JSON)
        HA-->>Worker: Normalized hotel data array
    else providerType = roibos
        Worker->>RA: syncHotels(providerConfig)
        RA->>GDS: SOAP/XML bulk request
        GDS-->>RA: Hotel inventory (XML)
        RA-->>Worker: Normalized hotel data array
    end

    Worker->>DB: Upsert hotels (bulk write)
    Worker->>DB: Update sync timestamp
    Worker->>Redis: Mark job complete

    Note over Dashboard,Redis: Monitoring
    Dashboard->>Redis: Poll job status
    Redis-->>Dashboard: Active, completed, failed job counts

    Note over Sync,DB: Manual Trigger (Backoffice)
    Note right of Sync: Admin can also trigger sync<br/>via backoffice-app UI
```

---

## 4. Infrastructure Diagram

### 4.1 Full Infrastructure Overview

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        DNS["DNS: lukzen-op.com<br/>app.lukzen-op.com<br/>backoffice.lukzen-op.com<br/>api.lukzen-op.com"]
        Users["Users (Travel Agents + Admins)"]
    end

    subgraph GitHub["GitHub"]
        subgraph Repos["Repositories"]
            R1["agency-app"]
            R2["backoffice-app"]
            R3["backend-service"]
            R4["alibaba-infra"]
        end
        GHA["GitHub Actions<br/>CI/CD + Scheduled Scaling<br/>(Scale up 11AM EST / Down 2PM EST Mon-Fri)"]
    end

    subgraph AWS["AWS (ca-central-1)"]
        ECR["ECR Registry<br/>- client-app<br/>- admin-app<br/>- oneclick-api"]
        SecretsManager["Secrets Manager<br/>- prod/oneclick-api<br/>- prod/redis"]
    end

    subgraph Alibaba["Alibaba Cloud (na-south-1, Bahamas)"]
        subgraph VPC["VPC: 10.0.0.0/16"]
            subgraph vSwitch["vSwitch: 10.0.1.0/24"]
                subgraph SG["Security Group<br/>Ports: 80, 443, 6443, 30000-32767"]
                    subgraph ACK["ACK Managed Cluster v1.33<br/>Namespace: applications"]
                        subgraph NodePool["Node Pool: 1x ecs.g8a.xlarge<br/>(4 vCPU, 16GB RAM, 50GB ESSD)"]
                            NginxPod["Nginx LB Pod<br/>SSL termination<br/>Domain routing"]
                            AgencyPod["Agency App Pod<br/>:8081"]
                            BackofficePod["Backoffice App Pod<br/>:8081"]
                            BackendPod["Backend Service Pod<br/>:3000"]
                            RedisPod["Redis Pod"]
                        end
                    end
                end
            end
        end
        SLB["SLB (Server Load Balancer)"]
        EIP["EIP: 47.87.14.183"]
        OSS["OSS Bucket<br/>Terraform State<br/>(versioned)"]
    end

    Users --> DNS
    DNS --> EIP
    EIP --> SLB
    SLB --> NginxPod

    NginxPod -->|"app.lukzen-op.com"| AgencyPod
    NginxPod -->|"backoffice.lukzen-op.com"| BackofficePod
    NginxPod -->|"api.lukzen-op.com"| BackendPod

    BackendPod --> RedisPod
    BackendPod -.->|"External MongoDB Atlas<br/>or self-hosted"| MongoDB[("MongoDB<br/>3 Databases")]

    GHA -->|"Build + Push"| ECR
    GHA -->|"Deploy via deploy.sh"| ACK
    GHA -->|"Scheduled scaling"| ACK

    R4 -->|"Terraform apply"| Alibaba
    R4 -->|"State storage"| OSS

    ACK -.->|"Pull images"| ECR
    BackendPod -.->|"Read secrets"| SecretsManager

    style Alibaba fill:#FF6A00,color:#fff
    style AWS fill:#FF9900,color:#fff
    style GitHub fill:#24292e,color:#fff
```

### 4.2 Kubernetes Cluster Detail

```mermaid
flowchart LR
    subgraph ACK["ACK Cluster v1.33 - Namespace: applications"]
        subgraph Deployments
            D1["Deployment: nginx-loadbalancer<br/>Image: nginx:latest<br/>Port: 80, 443"]
            D2["Deployment: agency-app<br/>Image: ECR/client-app<br/>Port: 8081"]
            D3["Deployment: backoffice-app<br/>Image: ECR/admin-app<br/>Port: 8081"]
            D4["Deployment: backend-service<br/>Image: ECR/oneclick-api<br/>Port: 3000"]
            D5["Deployment: redis<br/>Image: redis:alpine<br/>Port: 6379"]
        end

        subgraph Services
            S1["Service: nginx-lb<br/>Type: LoadBalancer"]
            S2["Service: agency-app-svc<br/>Type: ClusterIP"]
            S3["Service: backoffice-app-svc<br/>Type: ClusterIP"]
            S4["Service: backend-service-svc<br/>Type: ClusterIP"]
            S5["Service: redis-svc<br/>Type: ClusterIP"]
        end

        subgraph Secrets
            Sec1["Secret: ecr-auth<br/>(ECR pull credentials)"]
            Sec2["Secret: tls-certs<br/>(SSL certificates)"]
            Sec3["Secret: app-env<br/>(From AWS Secrets Manager)"]
        end
    end

    S1 --> D1
    S2 --> D2
    S3 --> D3
    S4 --> D4
    S5 --> D5

    D1 -->|"proxy"| S2
    D1 -->|"proxy"| S3
    D1 -->|"proxy"| S4
    D4 --> S5
```

---

## 5. Data Architecture

### 5.1 MongoDB Multi-Tenant Design

The platform uses three separate MongoDB databases to enforce bounded context isolation. Each database maps to a distinct domain.

```mermaid
erDiagram
    BACKOFFICE_DB {
        string _id PK
    }
    BACKOFFICE_DB ||--o{ hotels : contains
    BACKOFFICE_DB ||--o{ bookings : contains
    BACKOFFICE_DB ||--o{ roles : contains
    BACKOFFICE_DB ||--o{ backoffice_users : contains
    BACKOFFICE_DB ||--o{ scan_history : contains
    BACKOFFICE_DB ||--o{ user_settings : contains

    SALES_AGENT_DB {
        string _id PK
    }
    SALES_AGENT_DB ||--o{ sales_agents : contains

    TRAVEL_AGENCY_DB {
        string _id PK
    }
    TRAVEL_AGENCY_DB ||--o{ agencies : contains
    TRAVEL_AGENCY_DB ||--o{ employees : contains
    TRAVEL_AGENCY_DB ||--o{ commissions : contains
    TRAVEL_AGENCY_DB ||--o{ invitations : contains
```

#### Backoffice Database

| Collection | Purpose | Key Fields |
|---|---|---|
| `hotels` | Synced hotel data from all GDS providers | name, provider, providerType, location, rooms, amenities, images, syncedAt |
| `bookings` | All reservations across the platform | hotelId, agencyId, guestDetails, dates, status, confirmationCode, paymentStatus |
| `roles` | RBAC role definitions | name, permissions |
| `backoffice_users` | Admin and internal users | email, passwordHash, role, passkeys |
| `scan_history` | Search query audit log | userId, searchCriteria, resultCount, timestamp |
| `user_settings` | Per-user preferences | userId, language, theme, notifications |

#### Sales Agent Database

| Collection | Purpose | Key Fields |
|---|---|---|
| `sales_agents` | Sales rep profiles and assignments | name, email, assignedAgencies, commissionRate, status |

#### Travel Agency Database

| Collection | Purpose | Key Fields |
|---|---|---|
| `agencies` | Registered travel agency organizations | name, contactInfo, subscription, assignedSalesAgent, status |
| `employees` | Agency staff members | agencyId, name, email, role, passwordHash, passkeys |
| `commissions` | Commission tracking per booking | bookingId, agencyId, salesAgentId, amount, currency, status |
| `invitations` | Pending employee invitations | agencyId, email, role, token, expiresAt |

### 5.2 Redis Usage

| Use Case | Key Pattern | TTL | Description |
|---|---|---|---|
| BullMQ Jobs | `bull:hotel-sync:*` | Varies | Job queue data for hotel synchronization |
| BullMQ Metrics | `bull:hotel-sync:meta` | Persistent | Queue metadata and metrics |
| Session Cache | `session:*` | 24h | Optional session caching |

---

## 6. Deployment Pipeline

### 6.1 CI/CD Flow

Each application repository contains its own `deploy-to-ecr.yml` GitHub Actions workflow. The infrastructure repository contains shared deployment scripts.

```mermaid
flowchart LR
    subgraph Developer
        Code["Code Change"]
    end

    subgraph GitHub
        PR["Pull Request"]
        Merge["Merge to main/promote"]
        GHA["GitHub Actions<br/>deploy-to-ecr.yml"]
    end

    subgraph Build["Build Stage"]
        Lint["Lint + Type Check"]
        Test["Run Tests"]
        Docker["Docker Build"]
    end

    subgraph AWS
        ECR["ECR Push<br/>- client-app:latest<br/>- admin-app:latest<br/>- oneclick-api:latest"]
    end

    subgraph Deploy["Deploy Stage"]
        Script["alibaba-infra/applications/<br/>{app}/deploy.sh"]
        Kubectl["kubectl set image<br/>+ rollout restart"]
    end

    subgraph Alibaba["Alibaba Cloud K8s"]
        Pods["Updated Pods<br/>(Rolling update)"]
    end

    Code --> PR
    PR --> Merge
    Merge --> GHA
    GHA --> Lint
    Lint --> Test
    Test --> Docker
    Docker --> ECR
    ECR --> Script
    Script --> Kubectl
    Kubectl --> Pods
```

### 6.2 Scheduled Scaling

To optimize costs, the Kubernetes cluster scales on a schedule via GitHub Actions.

| Schedule | Action | Time (EST) | Days |
|---|---|---|---|
| Scale Up | Set replicas to operational count | 11:00 AM | Monday - Friday |
| Scale Down | Set replicas to 0 or minimum | 2:00 PM | Monday - Friday |

### 6.3 Deployment Scripts

Each application has a deploy script at `alibaba-infra/applications/{app}/deploy.sh` that:

1. Authenticates to the ACK cluster via kubeconfig
2. Updates the Kubernetes deployment image tag
3. Triggers a rolling restart
4. Waits for rollout to complete

---

## 7. Technology Stack Summary

| Repository | Purpose | Language | Framework | UI Library | Database | Port (Prod) | Port (Dev) | Domain | ECR Image |
|---|---|---|---|---|---|---|---|---|---|
| `agency-app` | Travel agency portal | TypeScript | React 18 + Vite 5 | Mantine UI 8 | -- | 8081 | 3030 | app.lukzen-op.com | client-app |
| `backoffice-app` | Admin dashboard | TypeScript | React 18 + Vite 5 | Tailwind + Shadcn/Radix | -- | 8081 | 3032 | backoffice.lukzen-op.com | admin-app |
| `backend-service` | Central REST API | TypeScript | Node.js 18 + Express 4 | -- | MongoDB + Redis | 3000 | 3001 | api.lukzen-op.com | oneclick-api |
| `alibaba-infra` | Infrastructure | HCL + YAML | Terraform + Helm | -- | -- | -- | -- | -- | -- |

### Shared Technologies

| Technology | Usage |
|---|---|
| TypeScript | All 3 application repos |
| JWT (jsonwebtoken) | Authentication across backend + both frontends |
| Redux Toolkit | State management in both frontend apps |
| Axios | HTTP client in both frontend apps |
| Docker | Containerization for all 3 application repos |
| GitHub Actions | CI/CD for all repos |
| Zod | Schema validation in backend-service |
| BullMQ + Redis | Background job processing in backend-service |
| Mongoose 7 | MongoDB ODM in backend-service |

### GDS Provider Adapters

| Adapter | Protocol | Format | Vendors |
|---|---|---|---|
| Dingus Adapter | SOAP | XML | dingus, archipelago, roxa, melia |
| Hotetec Adapter | REST | JSON | hotetec, rocu, bdmd |
| Roibos Adapter | SOAP | XML | roibos |

---

## Appendix: Architecture Decision Records (ADRs)

### ADR-001: Multi-Repo Over Monorepo

- **Context**: The platform has two frontends, one backend, and infrastructure code. Teams may work on each independently.
- **Decision**: Use a multi-repo structure with four separate repositories.
- **Consequences**: Independent deployment cycles and versioning. Slightly more overhead for cross-repo changes. Each repo has its own CI/CD pipeline.

### ADR-002: Alibaba Cloud as Primary Provider

- **Context**: The target market (Bahamas/Caribbean) requires low-latency access. Alibaba Cloud offers a na-south-1 (Bahamas) region.
- **Decision**: Use Alibaba Cloud for compute and networking, with AWS for container registry (ECR) and secrets management.
- **Consequences**: Multi-cloud complexity. Benefits of geographic proximity. AWS ECR used due to maturity.

### ADR-003: Adapter Pattern for GDS Integrations

- **Context**: Hotel GDS providers use different protocols (SOAP/XML vs REST/JSON) and data formats. New providers may be added over time.
- **Decision**: Implement an adapter pattern where each GDS family has its own adapter that normalizes data into a unified internal model.
- **Consequences**: Adding a new vendor means implementing a new adapter (or extending an existing one). All downstream code works with a single hotel data model. Adapter complexity is isolated.

### ADR-004: Three Separate MongoDB Databases

- **Context**: The platform serves three distinct domains -- backoffice operations, travel agencies, and sales agents -- each with different data access patterns and security requirements.
- **Decision**: Use three separate MongoDB databases rather than one shared database with collection-level separation.
- **Consequences**: Stronger data isolation. Cross-domain queries require application-level joins. Connection pool management across three databases.

### ADR-005: BullMQ for Hotel Synchronization

- **Context**: Hotel data must be synced from 7+ GDS providers nightly. The sync involves long-running HTTP calls and bulk database writes.
- **Decision**: Use BullMQ with Redis for background job processing, with a cron trigger at 2AM and support for manual triggers.
- **Consequences**: Reliable retry mechanism. Job visibility via dashboard at /admin/queues. Redis dependency. Jobs survive process restarts.
