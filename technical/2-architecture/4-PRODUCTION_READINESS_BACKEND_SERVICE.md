# Production Readiness Assessment: Backend Service (Application Code)

**Repository:** `backend-service`
**Type:** Node.js/TypeScript REST API
**Tech Stack:** Express 4.21, TypeScript 5.1, MongoDB 6.20, Mongoose
**Assessment Date:** 2025-11-28
**Current Status:** ⚠️ Near Production - Requires Critical Code Improvements

---

## Executive Summary

The backend-service demonstrates solid architecture with a multi-tenant design, comprehensive vendor integrations, and proper separation of concerns. However, it has **critical code-level production gaps** in testing, error handling, type safety, configuration management, and logging that must be addressed before production deployment.

**Code Quality Score: 65/100**

| Category | Score | Status |
|----------|-------|--------|
| Type Safety | 70/100 | ⚠️ Needs Improvement |
| Testing | 30/100 | ❌ Critical Gaps |
| Error Handling | 50/100 | ❌ Critical Gaps |
| Architecture | 80/100 | ✅ Good |
| Security (Code) | 70/100 | ⚠️ Needs Improvement |
| Configuration | 40/100 | ❌ Critical Gaps |
| Logging | 35/100 | ❌ Critical Gaps |
| Dependency Management | 40/100 | ❌ Critical Gaps |

**Note:** All infrastructure, Kubernetes, deployment, database provisioning, and operations concerns are documented in `PRODUCTION_READINESS_ALIBABA_INFRA.md`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
   - [Multi-Tenant Database Design](#multi-tenant-database-design)
   - [Vendor Adapter Pattern](#vendor-adapter-pattern)
3. [Type Safety & Validation](#1-type-safety--validation)
   - [TypeScript Configuration](#11-typescript-configuration)
   - [Input Validation with Zod](#12-input-validation-with-zod)
   - [Branded Types for Domain IDs](#13-branded-types-for-domain-ids)
   - [API Response Types](#14-api-response-types)
   - [Environment Variable Validation](#15-environment-variable-validation)
4. [Error Handling](#2-error-handling)
   - [Custom Error Hierarchy](#21-custom-error-hierarchy)
   - [Global Error Handler](#22-global-error-handler)
   - [Correlation IDs](#23-correlation-ids)
   - [Retry Logic with Exponential Backoff](#24-retry-logic-with-exponential-backoff)
5. [Testing Strategy](#3-testing-strategy)
   - [Test Coverage Analysis](#31-test-coverage-analysis)
   - [Unit Testing](#32-unit-testing)
   - [Integration Testing](#33-integration-testing)
   - [E2E Testing with Vendor Mocking](#34-e2e-testing-with-vendor-mocking)
   - [Test Database Helpers](#35-test-database-helpers)
6. [Logging & Observability (Application Side)](#4-logging--observability-application-side)
   - [Structured Logging with Winston](#41-structured-logging-with-winston)
   - [Request Logging Middleware](#42-request-logging-middleware)
   - [Error Tracking Integration](#43-error-tracking-integration)
7. [Security (Application Code)](#5-security-application-code)
   - [JWT Authentication Enhancement](#51-jwt-authentication-enhancement)
   - [Input Sanitization](#52-input-sanitization)
   - [Rate Limiting](#53-rate-limiting)
   - [CORS Configuration](#54-cors-configuration)
8. [Database (Application Code)](#6-database-application-code)
   - [Mongoose Schema Best Practices](#61-mongoose-schema-best-practices)
   - [Repository Pattern Implementation](#62-repository-pattern-implementation)
   - [Transaction Support](#63-transaction-support)
9. [Dependency Injection](#7-dependency-injection)
   - [InversifyJS Setup](#71-inversifyjs-setup)
10. [API Documentation](#8-api-documentation)
11. [Implementation Roadmap (Code Changes Only)](#9-implementation-roadmap-code-changes-only)
    - [Phase 1: Foundation (Weeks 1-2)](#phase-1-foundation-weeks-1-2)
    - [Phase 2: Testing (Weeks 3-4)](#phase-2-testing-weeks-3-4)
    - [Phase 3: Security & Architecture (Weeks 5-6)](#phase-3-security--architecture-weeks-5-6)
    - [Phase 4: Documentation & Enhancement (Weeks 7-8)](#phase-4-documentation--enhancement-weeks-7-8)
12. [Success Metrics](#10-success-metrics)
    - [Pre-Production (Current State)](#pre-production-current-state)
    - [Post-Production (Target State)](#post-production-target-state)
13. [Cloud Provider SDK Integration (Code Level)](#11-cloud-provider-sdk-integration-code-level)
    - [Alibaba Cloud (Primary)](#alibaba-cloud-primary)
    - [AWS Alternative](#aws-alternative)
    - [GCP Alternative](#gcp-alternative)
14. [Conclusion](#conclusion)

---

## Architecture Overview

### Multi-Tenant Database Design
```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Backoffice DB  │     │  Sales Agent DB  │     │ Travel Agency DB   │
│  - Admin Users  │     │  - Sales Agents  │     │  - Travel Agencies │
│  - Hotels       │     │  - Metrics       │     │  - Vendor Access   │
│  - Bookings     │     │                  │     │  - Bookings        │
└─────────────────┘     └──────────────────┘     └────────────────────┘
```

### Vendor Adapter Pattern
```
Parent Adapters:
├── Hotetec Adapter (REST API)
│   └── hotetec
├── Roibos Adapter (SOAP API)
│   └── roibos
└── Dingus Adapter (OTA XML SOAP)
    ├── dingus
    ├── archipelago
    ├── roxa
    └── melia
```

---

## 1. TYPE SAFETY & VALIDATION

### 1.1 TypeScript Configuration

**Current:**
- TypeScript 5.1
- Partial strict mode
- Some `any` types in vendor adapters

**Required: Full Strict Mode**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 1.2 Input Validation with Zod

**Current:**
- Manual validation in some routes
- Inconsistent error handling
- No schema-based validation

**Required: Comprehensive Zod Validation**

```typescript
// src/validators/hotel.validator.ts
import { z } from 'zod'

export const SearchHotelsSchema = z.object({
  hotelName: z.string().min(1).max(200).optional(),
  country: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  provider: z.enum(['dingus', 'hotetec', 'roibos']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

export type SearchHotelsInput = z.infer<typeof SearchHotelsSchema>

// Validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      })
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        })
      }
      next(error)
    }
  }
}

// Usage in routes
router.get(
  '/hotels/search',
  validateRequest(SearchHotelsSchema),
  hotelController.searchHotels
)
```

### 1.3 Branded Types for Domain IDs

**Required: Type-Safe IDs**

```typescript
// src/types/branded.ts
declare const __brand: unique symbol

type Brand<B> = { [__brand]: B }
export type Branded<T, B> = T & Brand<B>

// Branded types for IDs
export type HotelId = Branded<string, 'HotelId'>
export type BookingId = Branded<string, 'BookingId'>
export type UserId = Branded<string, 'UserId'>
export type PaymentId = Branded<string, 'PaymentId'>

// Type guards
export const isHotelId = (value: string): value is HotelId => {
  // Validate MongoDB ObjectId format
  return /^[a-f\d]{24}$/i.test(value)
}

export const isBookingId = (value: string): value is BookingId => {
  return /^[a-f\d]{24}$/i.test(value)
}

// Usage
export const getHotel = async (id: HotelId): Promise<Hotel> => {
  // Type-safe ID usage
  return hotelRepository.findById(id)
}
```

### 1.4 API Response Types

**Required: Standardized Response Wrapper**

```typescript
// src/types/api-response.ts
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Array<{ field: string; message: string }>
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

// Helper functions
export const successResponse = <T>(
  data: T,
  meta?: ApiResponse<T>['meta']
): ApiResponse<T> => ({
  success: true,
  data,
  meta
})

export const errorResponse = (
  message: string,
  errors?: ApiResponse<never>['errors']
): ApiResponse<never> => ({
  success: false,
  message,
  errors
})

// Usage in controllers
export const searchHotels = async (req: Request, res: Response) => {
  try {
    const hotels = await hotelService.search(req.query)
    return res.json(successResponse(hotels, {
      page: req.query.page,
      limit: req.query.limit,
      total: hotels.length
    }))
  } catch (error) {
    return res.status(500).json(errorResponse('Failed to search hotels'))
  }
}
```

### 1.5 Environment Variable Validation

**❌ Critical Issue: No Environment Validation**

```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),

  // Database
  MONGODB_URI: z.string().url(),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(5).max(100).default(10),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),

  // External Services
  HOTETEC_API_URL: z.string().url(),
  HOTETEC_API_KEY: z.string(),
  ROIBOS_API_URL: z.string().url(),
  ROIBOS_USERNAME: z.string(),
  ROIBOS_PASSWORD: z.string(),
  DINGUS_API_URL: z.string().url(),

  // TropiPay
  TROPIPAY_CLIENT_ID: z.string(),
  TROPIPAY_CLIENT_SECRET: z.string(),
  TROPIPAY_API_URL: z.string().url(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
```

```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/oneclick
MONGODB_MAX_POOL_SIZE=10

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRY=24h

# Hotetec
HOTETEC_API_URL=https://api.hotetec.com
HOTETEC_API_KEY=your_api_key

# Roibos
ROIBOS_API_URL=https://api.roibos.com
ROIBOS_USERNAME=your_username
ROIBOS_PASSWORD=your_password

# Dingus
DINGUS_API_URL=https://api.dingus.com

# TropiPay
TROPIPAY_CLIENT_ID=your_client_id
TROPIPAY_CLIENT_SECRET=your_client_secret
TROPIPAY_API_URL=https://api.tropipay.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
```

---

## 2. ERROR HANDLING

### 2.1 Custom Error Hierarchy

**Current:**
- Basic Error subclasses
- Inconsistent error handling
- No correlation IDs

**Required: Comprehensive Error Hierarchy**

```typescript
// src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true,
    public errorCode?: string,
    public details?: unknown
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, true, 'VALIDATION_ERROR', details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      404,
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      true,
      'NOT_FOUND'
    )
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, true, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message, true, 'FORBIDDEN')
  }
}

export class ExternalAPIError extends AppError {
  constructor(
    public provider: string,
    public originalError: Error,
    message?: string
  ) {
    super(
      502,
      message || `External API error from ${provider}`,
      true,
      'EXTERNAL_API_ERROR',
      {
        provider,
        originalError: {
          message: originalError.message,
          stack: originalError.stack
        }
      }
    )
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, originalError: Error) {
    super(
      500,
      `Database ${operation} failed`,
      true,
      'DATABASE_ERROR',
      {
        operation,
        originalError: {
          message: originalError.message
        }
      }
    )
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true, 'CONFLICT')
  }
}
```

### 2.2 Global Error Handler

**Required:**

```typescript
// src/middlewares/error-handler.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { AppError } from '@/errors/app-error'
import { logger } from '@/utils/logger'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error with correlation ID
  logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    correlationId: req.correlationId,
    path: req.path,
    method: req.method
  })

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      details: env.NODE_ENV === 'development' ? err.details : undefined,
      correlationId: req.correlationId
    })
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values((err as any).errors).map((e: any) => ({
        field: e.path,
        message: e.message
      })),
      correlationId: req.correlationId
    })
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      correlationId: req.correlationId
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      correlationId: req.correlationId
    })
  }

  // Handle all other errors
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    correlationId: req.correlationId,
    ...(env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  })
}

// Unhandled rejection handler
export const unhandledRejectionHandler = (reason: unknown) => {
  logger.error('Unhandled rejection', { reason })
  // Don't exit process, let error handler handle it
}

// Uncaught exception handler
export const uncaughtExceptionHandler = (error: Error) => {
  logger.error('Uncaught exception', { error })
  // Exit gracefully
  process.exit(1)
}
```

### 2.3 Correlation IDs

**Required: Request Tracing**

```typescript
// src/middlewares/correlation-id.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

declare global {
  namespace Express {
    interface Request {
      correlationId: string
    }
  }
}

export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use existing correlation ID from header or generate new one
  req.correlationId =
    (req.get('x-correlation-id') as string) ||
    (req.get('x-request-id') as string) ||
    randomUUID()

  // Add to response headers
  res.setHeader('x-correlation-id', req.correlationId)

  next()
}
```

### 2.4 Retry Logic with Exponential Backoff

**Required for External API Calls:**

```typescript
// src/utils/retry.ts
export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  factor: number
  retryCondition?: (error: Error) => boolean
}

export const retry = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    retryCondition = () => true
  } = options

  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError
      }

      const delay = Math.min(
        initialDelay * Math.pow(factor, attempt),
        maxDelay
      )

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: lastError.message
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Usage in vendor adapters
export const fetchHotelFromVendor = async (hotelId: string) => {
  return retry(
    () => vendorAPI.getHotel(hotelId),
    {
      maxRetries: 3,
      retryCondition: (error) => {
        // Retry on network errors or 5xx server errors
        return (
          error.name === 'NetworkError' ||
          (error as any).statusCode >= 500
        )
      }
    }
  )
}
```

---

## 3. TESTING STRATEGY

### 3.1 Test Coverage Analysis

**Current: <10% Coverage**
```
Test Files:
- 1 unit test: hotel.repository.test.ts
- 6 integration tests: vendor adapters

Missing:
- Service layer tests (0/12 services)
- Controller tests (0/4 controllers)
- Middleware tests (0/5 middlewares)
- E2E API tests
```

**Required: >70% Coverage**

### 3.2 Unit Testing

```typescript
// tests/unit/services/booking.service.test.ts
import { BookingService } from '@/services/booking.service'
import { bookingRepository } from '@/repositories/booking.repository'
import { hotelRepository } from '@/repositories/hotel.repository'
import { ReservationStatus } from '@/types'
import { NotFoundError, ValidationError } from '@/errors/app-error'

jest.mock('@/repositories/booking.repository')
jest.mock('@/repositories/hotel.repository')

describe('BookingService', () => {
  let bookingService: BookingService

  beforeEach(() => {
    bookingService = new BookingService()
    jest.clearAllMocks()
  })

  describe('createBooking', () => {
    it('should create booking with valid data', async () => {
      const mockHotel = {
        _id: 'hotel123',
        hotelName: 'Test Hotel',
        provider: 'hotetec'
      }

      const mockBookingInput = {
        hotelId: 'hotel123',
        checkIn: new Date('2025-12-01'),
        checkOut: new Date('2025-12-05'),
        guests: 2,
        totalAmount: 500
      }

      hotelRepository.findById = jest.fn().mockResolvedValue(mockHotel)
      bookingRepository.create = jest.fn().mockResolvedValue({
        _id: 'booking123',
        ...mockBookingInput,
        status: ReservationStatus.PENDING
      })

      const result = await bookingService.createBooking(mockBookingInput)

      expect(result.status).toBe(ReservationStatus.PENDING)
      expect(hotelRepository.findById).toHaveBeenCalledWith('hotel123')
      expect(bookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(mockBookingInput)
      )
    })

    it('should throw NotFoundError if hotel does not exist', async () => {
      hotelRepository.findById = jest.fn().mockResolvedValue(null)

      await expect(
        bookingService.createBooking({
          hotelId: 'nonexistent',
          checkIn: new Date(),
          checkOut: new Date(),
          guests: 1,
          totalAmount: 100
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ValidationError if check-out is before check-in', async () => {
      const mockHotel = { _id: 'hotel123', hotelName: 'Test Hotel' }
      hotelRepository.findById = jest.fn().mockResolvedValue(mockHotel)

      await expect(
        bookingService.createBooking({
          hotelId: 'hotel123',
          checkIn: new Date('2025-12-05'),
          checkOut: new Date('2025-12-01'),
          guests: 1,
          totalAmount: 100
        })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('confirmBooking', () => {
    it('should confirm pending booking', async () => {
      const mockBooking = {
        _id: 'booking123',
        status: ReservationStatus.PENDING,
        paymentInfo: { paymentStatus: 'paid' }
      }

      bookingRepository.findById = jest.fn().mockResolvedValue(mockBooking)
      bookingRepository.update = jest.fn().mockResolvedValue({
        ...mockBooking,
        status: ReservationStatus.CONFIRMED
      })

      const result = await bookingService.confirmBooking('booking123')

      expect(result.status).toBe(ReservationStatus.CONFIRMED)
      expect(bookingRepository.update).toHaveBeenCalled()
    })
  })
})
```

### 3.3 Integration Testing

```typescript
// tests/integration/api/hotels.test.ts
import supertest from 'supertest'
import { app } from '@/server'
import { setupTestDatabase, teardownTestDatabase, createTestUser } from '@/tests/helpers/db'
import { generateToken } from '@/utils/jwt'

describe('Hotels API', () => {
  let request: supertest.SuperTest<supertest.Test>
  let testToken: string

  beforeAll(async () => {
    await setupTestDatabase()
    const testUser = await createTestUser({
      email: 'test@example.com',
      role: 'TRAVEL_AGENCY'
    })
    testToken = generateToken(testUser)
    request = supertest(app)
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  describe('GET /api/v1/hotels/search', () => {
    it('should return hotels with valid query parameters', async () => {
      const response = await request
        .get('/api/v1/hotels/search')
        .query({ country: 'CU', page: 1, limit: 20 })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('hotels')
      expect(Array.isArray(response.body.data.hotels)).toBe(true)
      expect(response.body.data).toHaveProperty('total')
    })

    it('should return 401 without authentication', async () => {
      await request
        .get('/api/v1/hotels/search')
        .query({ country: 'CU' })
        .expect(401)
    })

    it('should return 400 with invalid query parameters', async () => {
      const response = await request
        .get('/api/v1/hotels/search')
        .query({ page: -1, limit: 200 })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Validation error')
    })

    it('should enforce vendor access control', async () => {
      // Create user without hotetec access
      const restrictedUser = await createTestUser({
        email: 'restricted@example.com',
        role: 'TRAVEL_AGENCY',
        vendorAccess: ['dingus'] // Only dingus access
      })
      const restrictedToken = generateToken(restrictedUser)

      const response = await request
        .get('/api/v1/hotels/search')
        .query({ provider: 'hotetec' })
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(403)

      expect(response.body.message).toContain('access denied')
    })
  })

  describe('POST /api/v1/bookings', () => {
    it('should create booking with valid data', async () => {
      const bookingData = {
        hotelId: 'test-hotel-id',
        checkIn: '2025-12-01',
        checkOut: '2025-12-05',
        guests: 2,
        roomType: 'standard',
        guestInfo: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      }

      const response = await request
        .post('/api/v1/bookings')
        .send(bookingData)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('booking')
      expect(response.body.data.booking).toHaveProperty('status', 'PENDING')
    })
  })
})
```

### 3.4 E2E Testing with Vendor Mocking

```typescript
// tests/e2e/booking-flow.test.ts
import supertest from 'supertest'
import { app } from '@/server'
import nock from 'nock'

describe('E2E: Complete Booking Flow', () => {
  let request: supertest.SuperTest<supertest.Test>
  let testToken: string

  beforeAll(async () => {
    // Setup
    request = supertest(app)
    testToken = await getTestToken()

    // Mock external vendor APIs
    nock('https://api.hotetec.com')
      .persist()
      .get('/hotels/search')
      .reply(200, { hotels: [mockHotelData] })
      .post('/bookings')
      .reply(201, { bookingId: 'vendor-booking-123' })

    nock('https://api.tropipay.com')
      .persist()
      .post('/v1/access/token')
      .reply(200, { access_token: 'test-token' })
      .post('/api/v2/paymentcards')
      .reply(200, { paymentUrl: 'https://pay.tropipay.com/test' })
  })

  afterAll(() => {
    nock.cleanAll()
  })

  it('should complete full booking flow: search -> book -> pay', async () => {
    // 1. Search hotels
    const searchResponse = await request
      .get('/api/v1/hotels/search')
      .query({ country: 'CU', provider: 'hotetec' })
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)

    const hotel = searchResponse.body.data.hotels[0]

    // 2. Create booking
    const bookingResponse = await request
      .post('/api/v1/bookings')
      .send({
        hotelId: hotel._id,
        checkIn: '2025-12-01',
        checkOut: '2025-12-05',
        guests: 2,
        guestInfo: { name: 'John Doe', email: 'john@example.com' }
      })
      .set('Authorization', `Bearer ${testToken}`)
      .expect(201)

    const booking = bookingResponse.body.data.booking

    // 3. Initiate payment
    const paymentResponse = await request
      .post('/api/v1/payments/initiate')
      .send({
        bookingId: booking._id,
        amount: booking.totalAmount,
        currency: 'USD'
      })
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)

    expect(paymentResponse.body.data).toHaveProperty('paymentUrl')

    // 4. Verify booking status updated
    const verifyResponse = await request
      .get(`/api/v1/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)

    expect(verifyResponse.body.data.booking.status).toBe('PENDING_PAYMENT')
  })
})
```

### 3.5 Test Database Helpers

```typescript
// tests/helpers/db.ts
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { User } from '@/models/user.model'

let mongoServer: MongoMemoryServer

export const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  await mongoose.connect(uri)
}

export const teardownTestDatabase = async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
}

export const createTestUser = async (userData: Partial<any>) => {
  const user = await User.create({
    email: userData.email,
    password: 'test-password',
    role: userData.role || 'TRAVEL_AGENCY',
    vendorAccess: userData.vendorAccess || ['dingus', 'hotetec', 'roibos'],
    ...userData
  })
  return user
}

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}
```

---

## 4. LOGGING & OBSERVABILITY (APPLICATION SIDE)

### 4.1 Structured Logging with Winston

**❌ Current: Console-only logging**

**Required:**

```typescript
// src/utils/logger.ts
import winston from 'winston'
import { env } from '@/config/env'

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
}

winston.addColors(logColors)

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    )
  })
]

// Add file transport for production
if (env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  )
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels: logLevels,
  format,
  transports
})

// Add correlation ID to logger
export const logWithContext = (
  level: keyof typeof logLevels,
  message: string,
  meta?: Record<string, any>
) => {
  logger[level](message, {
    ...meta,
    timestamp: new Date().toISOString()
  })
}
```

### 4.2 Request Logging Middleware

```typescript
// src/middlewares/request-logger.middleware.ts
import morgan from 'morgan'
import { logger } from '@/utils/logger'

// Custom token for correlation ID
morgan.token('correlation-id', (req: any) => req.correlationId)

// JSON format for structured logging
const jsonFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  contentLength: ':res[content-length]',
  responseTime: ':response-time ms',
  correlationId: ':correlation-id',
  userAgent: ':user-agent'
})

export const requestLogger = morgan(jsonFormat, {
  stream: {
    write: (message: string) => {
      const data = JSON.parse(message)
      logger.http('HTTP Request', data)
    }
  }
})
```

### 4.3 Error Tracking Integration

```typescript
// src/utils/error-tracking.ts
import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'
import { env } from '@/config/env'

export const initErrorTracking = () => {
  if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: require('@/server').app }),
        new ProfilingIntegration()
      ],
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1
    })
  }
}

// Error tracking middleware
export const sentryErrorHandler = Sentry.Handlers.errorHandler()
export const sentryRequestHandler = Sentry.Handlers.requestHandler()
```

---

## 5. SECURITY (APPLICATION CODE)

### 5.1 JWT Authentication Enhancement

**Current: Basic JWT with HS256**

**Required: RS256 with Token Rotation**

```typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { env } from '@/config/env'

// Use RS256 for production
const privateKey = env.NODE_ENV === 'production'
  ? readFileSync(env.JWT_PRIVATE_KEY_PATH, 'utf8')
  : env.JWT_SECRET

const publicKey = env.NODE_ENV === 'production'
  ? readFileSync(env.JWT_PUBLIC_KEY_PATH, 'utf8')
  : env.JWT_SECRET

export const generateAccessToken = (payload: any): string => {
  return jwt.sign(payload, privateKey, {
    algorithm: env.NODE_ENV === 'production' ? 'RS256' : 'HS256',
    expiresIn: '15m' // Short-lived access token
  })
}

export const generateRefreshToken = (payload: any): string => {
  return jwt.sign(payload, privateKey, {
    algorithm: env.NODE_ENV === 'production' ? 'RS256' : 'HS256',
    expiresIn: '7d' // Longer-lived refresh token
  })
}

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, publicKey, {
      algorithms: [env.NODE_ENV === 'production' ? 'RS256' : 'HS256']
    })
  } catch (error) {
    throw new UnauthorizedError('Invalid token')
  }
}
```

### 5.2 Input Sanitization

**Required: NoSQL Injection Prevention**

```typescript
// src/middlewares/sanitize.middleware.ts
import mongoSanitize from 'express-mongo-sanitize'
import { Request, Response, NextFunction } from 'express'

export const sanitizeMiddleware = [
  // Remove MongoDB operators from request
  mongoSanitize({
    replaceWith: '_'
  }),

  // Additional sanitization
  (req: Request, res: Response, next: NextFunction) => {
    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = (req.query[key] as string).trim()
        }
      })
    }

    // Sanitize body
    if (req.body) {
      sanitizeObject(req.body)
    }

    next()
  }
]

const sanitizeObject = (obj: any) => {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim()
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key])
    }
  })
}
```

### 5.3 Rate Limiting

```typescript
// src/middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { createClient } from 'redis'
import { env } from '@/config/env'

// Create Redis client for distributed rate limiting
const redisClient = createClient({
  url: env.REDIS_URL
})

redisClient.connect()

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
})

// Per-user rate limiting
export const userLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:user:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per user
  keyGenerator: (req) => {
    return req.user?.id || req.ip
  }
})
```

### 5.4 CORS Configuration

```typescript
// src/middlewares/cors.middleware.ts
import cors from 'cors'
import { env } from '@/config/env'

const allowedOrigins = env.NODE_ENV === 'production'
  ? [
      'https://app.lukzen-op.com',
      'https://backoffice.lukzen-op.com'
    ]
  : ['http://localhost:5173', 'http://localhost:3001']

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
})
```

---

## 6. DATABASE (APPLICATION CODE)

### 6.1 Mongoose Schema Best Practices

```typescript
// src/models/hotel.model.ts
import { Schema, model } from 'mongoose'

const hotelSchema = new Schema(
  {
    hotelName: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      maxlength: [200, 'Hotel name cannot exceed 200 characters'],
      index: 'text' // Text index for search
    },
    provider: {
      type: String,
      required: true,
      enum: {
        values: ['dingus', 'hotetec', 'roibos'],
        message: '{VALUE} is not a valid provider'
      },
      index: true
    },
    address: {
      street: { type: String, trim: true },
      city: {
        type: String,
        required: true,
        trim: true,
        index: true
      },
      state: { type: String, trim: true },
      country: {
        type: String,
        required: true,
        length: 2, // ISO country code
        uppercase: true,
        index: true
      },
      postalCode: { type: String, trim: true },
      coordinates: {
        lat: {
          type: Number,
          min: -90,
          max: 90
        },
        lng: {
          type: Number,
          min: -180,
          max: 180
        }
      }
    },
    rating: {
      type: Number,
      min: 0,
      max: 5
    },
    amenities: [{
      type: String,
      enum: ['wifi', 'pool', 'gym', 'spa', 'restaurant', 'bar', 'parking']
    }],
    images: [{
      url: { type: String, required: true },
      caption: String
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v
        delete ret.deletedAt
        return ret
      }
    }
  }
)

// Compound indexes for common queries
hotelSchema.index({ country: 1, city: 1, isActive: 1 })
hotelSchema.index({ provider: 1, isActive: 1 })

// Soft delete
hotelSchema.methods.softDelete = function() {
  this.deletedAt = new Date()
  this.isActive = false
  return this.save()
}

// Query helper for active hotels
hotelSchema.query.active = function() {
  return this.where({ isActive: true, deletedAt: null })
}

export const Hotel = model('Hotel', hotelSchema)
```

### 6.2 Repository Pattern Implementation

```typescript
// src/repositories/hotel.repository.ts
import { Hotel } from '@/models/hotel.model'
import { HotelId } from '@/types/branded'
import { NotFoundError, DatabaseError } from '@/errors/app-error'

export class HotelRepository {
  async findById(id: HotelId) {
    try {
      const hotel = await Hotel.findById(id).active().lean()
      if (!hotel) {
        throw new NotFoundError('Hotel', id)
      }
      return hotel
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('findById', error as Error)
    }
  }

  async search(filters: {
    hotelName?: string
    country?: string
    city?: string
    provider?: string
    page: number
    limit: number
  }) {
    try {
      const query: any = { isActive: true, deletedAt: null }

      if (filters.hotelName) {
        query.$text = { $search: filters.hotelName }
      }
      if (filters.country) {
        query['address.country'] = filters.country
      }
      if (filters.city) {
        query['address.city'] = new RegExp(filters.city, 'i')
      }
      if (filters.provider) {
        query.provider = filters.provider
      }

      const skip = (filters.page - 1) * filters.limit

      const [hotels, total] = await Promise.all([
        Hotel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(filters.limit)
          .lean(),
        Hotel.countDocuments(query)
      ])

      return { hotels, total, page: filters.page, limit: filters.limit }
    } catch (error) {
      throw new DatabaseError('search', error as Error)
    }
  }

  async create(data: any) {
    try {
      const hotel = new Hotel(data)
      return await hotel.save()
    } catch (error) {
      throw new DatabaseError('create', error as Error)
    }
  }

  async update(id: HotelId, data: any) {
    try {
      const hotel = await Hotel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).active()

      if (!hotel) {
        throw new NotFoundError('Hotel', id)
      }

      return hotel
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('update', error as Error)
    }
  }

  async softDelete(id: HotelId) {
    try {
      const hotel = await Hotel.findById(id)
      if (!hotel) {
        throw new NotFoundError('Hotel', id)
      }
      return await hotel.softDelete()
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('softDelete', error as Error)
    }
  }
}

export const hotelRepository = new HotelRepository()
```

### 6.3 Transaction Support

```typescript
// src/utils/transaction.ts
import mongoose from 'mongoose'
import { DatabaseError } from '@/errors/app-error'

export const withTransaction = async <T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const result = await callback(session)
    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw new DatabaseError('transaction', error as Error)
  } finally {
    session.endSession()
  }
}

// Usage
export const createBookingWithPayment = async (bookingData: any, paymentData: any) => {
  return withTransaction(async (session) => {
    // Create booking
    const booking = await Booking.create([bookingData], { session })

    // Create payment record
    const payment = await Payment.create([{
      ...paymentData,
      bookingId: booking[0]._id
    }], { session })

    return { booking: booking[0], payment: payment[0] }
  })
}
```

---

## 7. DEPENDENCY INJECTION

### 7.1 InversifyJS Setup

**❌ Current: Manual dependency management**

**Required:**

```typescript
// src/container.ts
import { Container } from 'inversify'
import { TYPES } from './types'

// Repositories
import { HotelRepository } from './repositories/hotel.repository'
import { BookingRepository } from './repositories/booking.repository'
import { UserRepository } from './repositories/user.repository'

// Services
import { HotelService } from './services/hotel.service'
import { BookingService } from './services/booking.service'
import { AuthService } from './services/auth.service'
import { PaymentService } from './services/payment.service'

// Controllers
import { HotelController } from './controllers/hotel.controller'
import { BookingController } from './controllers/booking.controller'
import { AuthController } from './controllers/auth.controller'

const container = new Container()

// Bind repositories
container.bind<HotelRepository>(TYPES.HotelRepository).to(HotelRepository).inSingletonScope()
container.bind<BookingRepository>(TYPES.BookingRepository).to(BookingRepository).inSingletonScope()
container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository).inSingletonScope()

// Bind services
container.bind<HotelService>(TYPES.HotelService).to(HotelService).inSingletonScope()
container.bind<BookingService>(TYPES.BookingService).to(BookingService).inSingletonScope()
container.bind<AuthService>(TYPES.AuthService).to(AuthService).inSingletonScope()
container.bind<PaymentService>(TYPES.PaymentService).to(PaymentService).inSingletonScope()

// Bind controllers
container.bind<HotelController>(TYPES.HotelController).to(HotelController)
container.bind<BookingController>(TYPES.BookingController).to(BookingController)
container.bind<AuthController>(TYPES.AuthController).to(AuthController)

export { container }

// types.ts
export const TYPES = {
  // Repositories
  HotelRepository: Symbol.for('HotelRepository'),
  BookingRepository: Symbol.for('BookingRepository'),
  UserRepository: Symbol.for('UserRepository'),

  // Services
  HotelService: Symbol.for('HotelService'),
  BookingService: Symbol.for('BookingService'),
  AuthService: Symbol.for('AuthService'),
  PaymentService: Symbol.for('PaymentService'),

  // Controllers
  HotelController: Symbol.for('HotelController'),
  BookingController: Symbol.for('BookingController'),
  AuthController: Symbol.for('AuthController')
}
```

```typescript
// src/services/booking.service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/types'
import { BookingRepository } from '@/repositories/booking.repository'
import { HotelRepository } from '@/repositories/hotel.repository'

@injectable()
export class BookingService {
  constructor(
    @inject(TYPES.BookingRepository) private bookingRepository: BookingRepository,
    @inject(TYPES.HotelRepository) private hotelRepository: HotelRepository
  ) {}

  async createBooking(data: CreateBookingInput) {
    // Verify hotel exists
    await this.hotelRepository.findById(data.hotelId)

    // Create booking
    return this.bookingRepository.create(data)
  }
}
```

---

## 8. API DOCUMENTATION

**❌ Current: No API documentation**

**Required: Swagger/OpenAPI**

```typescript
// src/server/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OneClickAdventures API',
      version: '1.0.0',
      description: 'Hotel booking and management API',
      contact: {
        name: 'API Support',
        email: 'api@lukzen-op.com'
      }
    },
    servers: [
      {
        url: 'https://api.lukzen-op.com/api/v1',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Hotel: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            hotelName: { type: 'string' },
            provider: {
              type: 'string',
              enum: ['dingus', 'hotetec', 'roibos']
            },
            address: {
              type: 'object',
              properties: {
                city: { type: 'string' },
                country: { type: 'string' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errorCode: { type: 'string' },
            correlationId: { type: 'string' }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/server/routes/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)
export const swaggerServe = swaggerUi.serve
export const swaggerSetup = swaggerUi.setup(swaggerSpec, {
  explorer: true
})
```

---

## 9. IMPLEMENTATION ROADMAP (CODE CHANGES ONLY)

### Phase 1: Foundation (Weeks 1-2)

**Week 1:**
- [ ] Enable TypeScript strict mode
- [ ] Implement comprehensive Zod validation for all endpoints
- [ ] Create standardized error hierarchy
- [ ] Add correlation ID middleware
- [ ] Implement environment variable validation

**Week 2:**
- [ ] Set up Winston structured logging
- [ ] Add request/response logging middleware
- [ ] Integrate Sentry error tracking
- [ ] Implement retry logic for external APIs
- [ ] Add input sanitization middleware

**Cost Impact:** Time investment only

### Phase 2: Testing (Weeks 3-4)

**Week 3:**
- [ ] Set up Jest testing infrastructure
- [ ] Write unit tests for service layer (>50% coverage)
- [ ] Write integration tests for critical API endpoints
- [ ] Set up mongodb-memory-server for testing

**Week 4:**
- [ ] Achieve >70% test coverage
- [ ] Add E2E tests with nock for vendor mocking
- [ ] Implement contract tests for vendor APIs
- [ ] Add test database helpers

**Cost Impact:** Time investment only

### Phase 3: Security & Architecture (Weeks 5-6)

**Week 5:**
- [ ] Enhance JWT authentication (RS256, refresh tokens)
- [ ] Implement rate limiting with Redis
- [ ] Add CORS whitelist configuration
- [ ] Implement dependency injection with InversifyJS

**Week 6:**
- [ ] Complete repository pattern for all models
- [ ] Add transaction support for multi-step operations
- [ ] Optimize Mongoose schemas with indexes
- [ ] Implement soft delete for all entities

**Cost Impact:** Time investment only

### Phase 4: Documentation & Enhancement (Weeks 7-8)

**Week 7:**
- [ ] Generate Swagger/OpenAPI documentation
- [ ] Add JSDoc comments for public APIs
- [ ] Implement API versioning
- [ ] Add database migration system

**Week 8:**
- [ ] Implement feature flags
- [ ] Add performance tracking
- [ ] Optimize database queries
- [ ] Add circuit breaker for vendor APIs

**Cost Impact:** Time investment only

---

## 10. SUCCESS METRICS

### Pre-Production (Current State)
- Test Coverage: ~10%
- TypeScript Strict: Partial
- Error Handling: Basic Error classes
- Logging: console.log
- API Documentation: None
- Input Validation: Manual, inconsistent
- Dependency Injection: Manual

### Post-Production (Target State)
- Test Coverage: >70%
- TypeScript Strict: Full
- Error Handling: Comprehensive error hierarchy with correlation IDs
- Logging: Winston structured JSON logs
- API Documentation: OpenAPI/Swagger with interactive UI
- Input Validation: Zod schemas for all inputs
- Dependency Injection: InversifyJS container

---

## 11. CLOUD PROVIDER SDK INTEGRATION (CODE LEVEL)

### Alibaba Cloud (Primary)

```typescript
// ARMS APM Integration
import { ARMSMonitor } from '@alicloud/arms-monitor'

export const monitor = new ARMSMonitor({
  pid: env.ARMS_PID,
  endpoint: 'https://arms-apm-cn-south-1.aliyuncs.com'
})

// OSS for file uploads
import OSS from 'ali-oss'

export const ossClient = new OSS({
  region: env.OSS_REGION,
  accessKeyId: env.ALIBABA_ACCESS_KEY,
  accessKeySecret: env.ALIBABA_SECRET_KEY,
  bucket: env.OSS_BUCKET
})
```

### AWS Alternative

```typescript
// X-Ray Tracing
import AWSXRay from 'aws-xray-sdk-core'
import AWS from 'aws-sdk'

AWSXRay.captureAWS(AWS)

// S3 for file uploads
import { S3Client } from '@aws-sdk/client-s3'

export const s3Client = new S3Client({
  region: env.AWS_REGION
})
```

### GCP Alternative

```typescript
// Cloud Trace
import { trace } from '@google-cloud/trace-agent'
trace.start({ projectId: env.GCP_PROJECT_ID })

// Cloud Storage
import { Storage } from '@google-cloud/storage'

export const storage = new Storage({
  projectId: env.GCP_PROJECT_ID
})
```

---

## CONCLUSION

The backend-service requires focused code-level improvements to achieve production readiness. This document addresses application code concerns only. All infrastructure, database provisioning, Kubernetes, deployment, and operations improvements are documented in `PRODUCTION_READINESS_ALIBABA_INFRA.md`.

**Key Code-Level Priorities:**
1. ✅ Enable TypeScript strict mode and comprehensive Zod validation
2. ✅ Achieve >70% test coverage (unit + integration + E2E)
3. ✅ Implement standardized error handling with correlation IDs
4. ✅ Set up Winston structured logging
5. ✅ Generate OpenAPI/Swagger documentation
6. ✅ Implement dependency injection with InversifyJS
7. ✅ Enhance JWT security with RS256 and refresh tokens
8. ✅ Add rate limiting and input sanitization

**Related Documentation:**
- Infrastructure/Operations: `PRODUCTION_READINESS_ALIBABA_INFRA.md`
- Frontend Code Quality: `PRODUCTION_READINESS_AGENCY_APP.md`
- Admin Code Quality: `PRODUCTION_READINESS_BACKOFFICE_APP.md`
- Cross-Cutting Patterns: `CODE_QUALITY_ASSESSMENT.md`