# Code Quality & Production Readiness Assessment

**Focus:** Application Code Quality, Architecture, Maintainability, and Best Practices
**Date:** 2025-11-29
**Scope:** agency-app, backend-service, backoffice-app (code only, not deployment)

---

## Executive Summary

All three application repositories demonstrate good foundational architecture but have **significant code-level gaps** that impact production readiness, maintainability, and velocity of feature development.

### Overall Code Quality Scores

| Repository | Code Quality | Maintainability | Testability | Best Practices |
|------------|-------------|-----------------|-------------|----------------|
| **agency-app** | 65/100 | 70/100 | 25/100 | 60/100 |
| **backend-service** | 70/100 | 75/100 | 35/100 | 70/100 |
| **backoffice-app** | 65/100 | 75/100 | 20/100 | 65/100 |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
   - [Overall Code Quality Scores](#overall-code-quality-scores)
2. [Part 1: Backend Service (Node.js/TypeScript)](#part-1-backend-service-nodejstypescript)
   - [Current Architecture Quality: 75/100](#current-architecture-quality-75100)
   - [1. Error Handling (Score: 50/100)](#1-error-handling-score-50100)
   - [2. Type Safety (Score: 70/100)](#2-type-safety-score-70100)
   - [3. Testing Gaps (Score: 30/100)](#3-testing-gaps-score-30100)
   - [4. Code Organization & Architecture (Score: 75/100)](#4-code-organization--architecture-score-75100)
   - [5. Configuration Management (Score: 40/100)](#5-configuration-management-score-40100)
   - [6. Dependency Injection & Testability (Score: 40/100)](#6-dependency-injection--testability-score-40100)
   - [7. Logging & Observability (Score: 35/100)](#7-logging--observability-score-35100)
   - [Summary: Backend Service Code Quality Improvements](#summary-backend-service-code-quality-improvements)
3. [Part 2: Frontend Applications (React/TypeScript)](#part-2-frontend-applications-reacttypescript)
   - [Agency App & Backoffice App (Combined Analysis)](#agency-app--backoffice-app-combined-analysis)
   - [1. Type Safety (Score: 60/100)](#1-type-safety-score-60100)
   - [2. Testing (Score: 20/100)](#2-testing-score-20100)
   - [3. Component Architecture (Score: 65/100)](#3-component-architecture-score-65100)
   - [Summary: Frontend Code Quality Improvements](#summary-frontend-code-quality-improvements)
4. [Overall Recommendations](#overall-recommendations)
   - [Critical Path to Production-Ready Code](#critical-path-to-production-ready-code)

---

# PART 1: BACKEND SERVICE (Node.js/TypeScript)

## Current Architecture Quality: 75/100

### ✅ Strengths

1. **Multi-Tenant Architecture** - Clean separation of concerns
2. **Adapter Pattern** - Well-implemented for vendor integrations
3. **TypeScript Strict Mode** - Type safety enabled
4. **Repository Pattern** - Data access abstraction
5. **Service Layer** - Business logic separation

### ❌ Critical Code-Level Gaps

---

## 1. ERROR HANDLING (Score: 50/100)

### Current Issues

**Inconsistent Error Handling:**

```typescript
// Current: Inconsistent error handling across the codebase
// src/services/hotel.service.ts (Line 91)
async bulkUpdateHotelCommission() {
  try {
    const result = await hotelRepository.bulkUpdateCommission(objectIds, baseCommission)
    return { modifiedCount: result.modifiedCount }
  } catch (error) {
    console.error("Error in bulkUpdateHotelCommission:", error)  // ❌ Just logging
    throw error  // ❌ Throwing raw error
  }
}

// src/adapters/dingus.adapter.ts
catch (error) {
  console.error('Dingus API error:', error.message)  // ❌ Lost stack trace
  throw new Error('Failed to fetch hotels')  // ❌ Lost original error
}

// src/services/tropipay.service.ts (Line 144)
catch (error) {
  const axiosError = error as AxiosError  // ⚠️ Unsafe type assertion
  console.error("TropiPay authentication error:", axiosError.response?.data || axiosError.message)
  throw new InternalServerError("Failed to authenticate with TropiPay")  // ✅ Good
}
```

**Problems:**
1. Mix of console.error and proper error throwing
2. Lost error context and stack traces
3. No error correlation IDs
4. No structured error logging

**Required: Standardized Error Handling**

```typescript
// src/utils/errors/error-handler.ts
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import logger from '@/utils/logger'

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
      { provider, originalError: originalError.message }
    )
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, originalError: Error) {
    super(
      500,
      `Database operation failed: ${operation}`,
      true,
      'DATABASE_ERROR',
      { operation, originalError: originalError.message }
    )
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4()

  // Determine if error is operational
  const isOperational = err instanceof AppError ? err.isOperational : false

  const statusCode = err instanceof AppError ? err.statusCode : 500
  const errorCode = err instanceof AppError ? err.errorCode : 'INTERNAL_ERROR'

  // Log error with full context
  logger.error('Request error', {
    correlationId,
    errorCode,
    statusCode,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    userId: (req as any).user?.id,
    isOperational
  })

  // Don't expose internal errors to client
  const responseMessage = isOperational
    ? err.message
    : 'An unexpected error occurred'

  const responseDetails = err instanceof AppError
    ? err.details
    : undefined

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: responseMessage,
      correlationId,
      ...(process.env.NODE_ENV === 'development' && {
        details: responseDetails,
        stack: err.stack
      })
    }
  })

  // If non-operational error, log and potentially alert
  if (!isOperational) {
    logger.error('Non-operational error detected', {
      correlationId,
      error: err,
      stack: err.stack
    })
    // TODO: Send to error tracking service (Sentry, etc.)
  }
}
```

**Refactored Service Code:**

```typescript
// src/services/hotel.service.ts
import { DatabaseError } from '@/utils/errors/error-handler'

async bulkUpdateHotelCommission(
  hotelIds: string[],
  baseCommission: number
): Promise<{ modifiedCount: number }> {
  try {
    const objectIds = hotelIds.map((id) => new ObjectId(id))
    const result = await hotelRepository.bulkUpdateCommission(objectIds, baseCommission)

    logger.info('Bulk commission update completed', {
      hotelCount: hotelIds.length,
      modifiedCount: result.modifiedCount,
      commission: baseCommission
    })

    return { modifiedCount: result.modifiedCount }
  } catch (error) {
    throw new DatabaseError('bulkUpdateCommission', error as Error)
  }
}
```

**Refactored Adapter Code:**

```typescript
// src/adapters/dingus.adapter.ts
import { ExternalAPIError } from '@/utils/errors/error-handler'

async searchHotels(params: SearchParams): Promise<Hotel[]> {
  try {
    const response = await this.client.post('/search', params)
    return this.transformHotels(response.data)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Dingus API error', {
        endpoint: '/search',
        status: error.response?.status,
        data: error.response?.data,
        params
      })

      throw new ExternalAPIError(
        'Dingus',
        error,
        error.response?.data?.message || 'Failed to search hotels'
      )
    }
    throw error
  }
}
```

---

## 2. TYPE SAFETY (Score: 70/100)

### Current Issues

**`any` Types Still Present:**

```typescript
// src/adapters/hotetec.adapter.ts
private transformHotelData(data: any): Hotel {  // ❌ any type
  return {
    hotelCode: data.code,
    hotelName: data.name,
    // ...
  }
}

// src/server/controllers/payment.controller.ts
const webhookData = req.body  // ❌ No type validation
await tropiPayService.handleWebhook(webhookData)
```

**Unsafe Type Assertions:**

```typescript
// src/services/tropipay.service.ts (Line 145)
const axiosError = error as AxiosError  // ⚠️ Unsafe

// src/repositories/booking.repository.ts
return response as HotelType  // ⚠️ Could be null/undefined
```

**Missing Input Validation:**

```typescript
// src/server/controllers/hotel.controller.ts
async searchHotels(req: Request, res: Response) {
  const { hotelName, provider, country } = req.query  // ❌ No validation
  // What if provider is an array? What if it's SQL injection?
  const hotels = await hotelService.searchHotels(hotelName, provider, country)
  res.json(hotels)
}
```

**Required: Strict Type Safety**

```typescript
// src/types/api-schemas.ts
import { z } from 'zod'

// Define strict Zod schemas for ALL API inputs
export const SearchHotelsSchema = z.object({
  hotelName: z.string().min(1).max(200).optional(),
  provider: z.enum(['dingus', 'hotetec', 'roibos', 'archipelago', 'roxa', 'melia']).optional(),
  country: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

export type SearchHotelsInput = z.infer<typeof SearchHotelsSchema>

export const CreateBookingSchema = z.object({
  hotelId: z.string().regex(/^[a-f\d]{24}$/i), // MongoDB ObjectId
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.array(z.object({
    adults: z.number().int().min(1).max(10),
    children: z.number().int().min(0).max(10),
    roomType: z.string().min(1)
  })).min(1).max(10),
  guestInfo: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/) // E.164 format
  }),
  specialRequests: z.string().max(500).optional()
}).refine(
  (data) => new Date(data.checkIn) < new Date(data.checkOut),
  { message: "Check-out must be after check-in" }
).refine(
  (data) => new Date(data.checkIn) >= new Date(),
  { message: "Check-in must be in the future" }
)

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>

export const TropiPayWebhookSchema = z.object({
  reference: z.string().min(1),
  state: z.string(),
  bankOrderCode: z.string(),
  originalCurrencyAmount: z.number().positive(),
  signature: z.string().length(64) // SHA-256 hex
})

export type TropiPayWebhookData = z.infer<typeof TropiPayWebhookSchema>
```

**Validation Middleware:**

```typescript
// src/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { ValidationError } from '@/utils/errors/error-handler'

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and transform query/body/params
      const validated = schema.parse({
        ...req.query,
        ...req.body,
        ...req.params
      })

      // Replace req properties with validated data
      req.query = validated
      req.body = validated

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(
          'Invalid request data',
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        )
      }
      next(error)
    }
  }
}
```

**Refactored Controller:**

```typescript
// src/server/controllers/hotel.controller.ts
import { validate } from '@/middlewares/validate.middleware'
import { SearchHotelsSchema, SearchHotelsInput } from '@/types/api-schemas'

export class HotelController {
  /**
   * Search hotels with validated inputs
   * @route GET /api/v1/hotels/search
   */
  static searchHotels = [
    validate(SearchHotelsSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = req.query as unknown as SearchHotelsInput

        const results = await hotelService.searchExternalHotels(
          input.hotelName,
          input.provider,
          input.country,
          input.checkInDate,
          input.checkOutDate,
          undefined, // hotelCode
          input.page,
          input.limit
        )

        res.json(results)
      } catch (error) {
        next(error)
      }
    }
  ]
}
```

**Refactored Adapter with Branded Types:**

```typescript
// src/types/external-api.types.ts
// Use branded types for external API responses

export type HotetecHotelData = {
  readonly _brand: 'HotetecHotelData'
  code: string
  name: string
  address: string
  city: string
  country: string
  images: string[]
  rating: number
}

export type DingusHotelData = {
  readonly _brand: 'DingusHotelData'
  hotelId: string
  hotelName: string
  location: {
    address: string
    city: string
    countryCode: string
  }
  photos: Array<{ url: string }>
  starRating: number
}

// Type guard functions
export function isHotetecData(data: unknown): data is HotetecHotelData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    'name' in data &&
    'address' in data
  )
}

// src/adapters/hotetec.adapter.ts
import { HotetecHotelData, isHotetecData } from '@/types/external-api.types'

private transformHotelData(data: unknown): Hotel {
  if (!isHotetecData(data)) {
    throw new ValidationError('Invalid Hotetec API response format')
  }

  return {
    hotelCode: data.code,
    hotelName: data.name,
    address: data.address,
    city: data.city,
    country: data.country,
    galleryImgs: data.images,
    rating: data.rating,
    provider: 'hotetec',
    vendor: this.vendorCode
  }
}
```

---

## 3. TESTING GAPS (Score: 30/100)

### Current State

**Test Coverage: <10%**
- Only 1 unit test file: `hotel.repository.test.ts`
- 6 integration test files (vendor adapters)
- No service layer tests
- No controller tests
- No middleware tests
- No E2E tests

**Problems:**
1. Cannot refactor with confidence
2. Unknown code behavior
3. High regression risk
4. No test-driven development

**Required: Comprehensive Test Strategy**

```typescript
// tests/unit/services/booking.service.test.ts
import { bookingService } from '@/services/booking.service'
import bookingRepository from '@/repositories/booking.repository'
import { ReservationStatus } from '@/types'
import { NotFoundError, ValidationError } from '@/utils/errors/error-handler'

// Mock dependencies
jest.mock('@/repositories/booking.repository')

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createBooking', () => {
    it('should create booking with valid data', async () => {
      const mockBookingData = {
        hotelId: '507f1f77bcf86cd799439011',
        checkIn: '2025-12-01',
        checkOut: '2025-12-05',
        rooms: [{ adults: 2, children: 0, roomType: 'standard' }],
        guestInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        totalAmount: 500
      }

      const mockCreatedBooking = {
        _id: '507f1f77bcf86cd799439012',
        ...mockBookingData,
        status: ReservationStatus.PENDING,
        bookingReference: 'BK-12345678',
        createdAt: new Date()
      }

      bookingRepository.createBooking = jest.fn().mockResolvedValue(mockCreatedBooking)

      const result = await bookingService.createBooking(mockBookingData)

      expect(result.status).toBe(ReservationStatus.PENDING)
      expect(result.bookingReference).toMatch(/^BK-\d{8}$/)
      expect(bookingRepository.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          hotelId: mockBookingData.hotelId,
          status: ReservationStatus.PENDING
        })
      )
    })

    it('should throw ValidationError for invalid check-in date', async () => {
      const invalidData = {
        hotelId: '507f1f77bcf86cd799439011',
        checkIn: '2020-01-01', // Past date
        checkOut: '2020-01-05',
        rooms: [{ adults: 2, children: 0, roomType: 'standard' }],
        guestInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        }
      }

      await expect(bookingService.createBooking(invalidData))
        .rejects
        .toThrow(ValidationError)
    })

    it('should handle repository errors gracefully', async () => {
      const mockData = { /* valid data */ }

      bookingRepository.createBooking = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(bookingService.createBooking(mockData))
        .rejects
        .toThrow(DatabaseError)
    })
  })

  describe('cancelBooking', () => {
    it('should cancel booking and update status', async () => {
      const bookingId = '507f1f77bcf86cd799439012'
      const mockBooking = {
        _id: bookingId,
        status: ReservationStatus.CONFIRMED,
        paymentInfo: { paymentStatus: 'paid' }
      }

      bookingRepository.findBookingById = jest.fn().mockResolvedValue(mockBooking)
      bookingRepository.updateBooking = jest.fn().mockResolvedValue({
        ...mockBooking,
        status: ReservationStatus.CANCELLED
      })

      const result = await bookingService.cancelBooking(bookingId, 'Customer request')

      expect(result.status).toBe(ReservationStatus.CANCELLED)
      expect(bookingRepository.updateBooking).toHaveBeenCalledWith(
        bookingId,
        expect.objectContaining({
          status: ReservationStatus.CANCELLED,
          cancellationReason: 'Customer request'
        })
      )
    })

    it('should throw NotFoundError for non-existent booking', async () => {
      bookingRepository.findBookingById = jest.fn().mockResolvedValue(null)

      await expect(bookingService.cancelBooking('invalid-id', 'reason'))
        .rejects
        .toThrow(NotFoundError)
    })
  })
})
```

**Integration Tests:**

```typescript
// tests/integration/api/bookings.test.ts
import request from 'supertest'
import { app } from '@/server'
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../helpers/db'
import { generateAuthToken } from '../helpers/auth'

describe('Bookings API Integration Tests', () => {
  let authToken: string

  beforeAll(async () => {
    await setupTestDatabase()
    authToken = generateAuthToken({ userId: 'test-user', role: 'ADMIN' })
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  describe('POST /api/v1/bookings', () => {
    it('should create booking with valid data', async () => {
      const bookingData = {
        hotelId: '507f1f77bcf86cd799439011',
        checkIn: '2025-12-01',
        checkOut: '2025-12-05',
        rooms: [{ adults: 2, children: 0, roomType: 'deluxe' }],
        guestInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        }
      }

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201)

      expect(response.body).toHaveProperty('_id')
      expect(response.body.status).toBe('PENDING')
      expect(response.body.bookingReference).toMatch(/^BK-\d{8}$/)
      expect(response.body.guestInfo.email).toBe('john@example.com')
    })

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        hotelId: 'invalid-id', // Invalid ObjectId
        checkIn: '2025-12-01',
        checkOut: '2025-11-30' // Before check-in
      }

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR')
      expect(response.body.error.details).toBeInstanceOf(Array)
    })

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/bookings')
        .send({})
        .expect(401)
    })
  })

  describe('GET /api/v1/bookings/:bookingId', () => {
    it('should return booking details', async () => {
      // Create a booking first
      const booking = await createTestBooking()

      const response = await request(app)
        .get(`/api/v1/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body._id).toBe(booking._id.toString())
      expect(response.body.hotelId).toBe(booking.hotelId)
    })

    it('should return 404 for non-existent booking', async () => {
      await request(app)
        .get('/api/v1/bookings/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })
})
```

**Test Utilities:**

```typescript
// tests/helpers/db.ts
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer: MongoMemoryServer

export const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2
  })
}

export const teardownTestDatabase = async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
}

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}

export const createTestBooking = async (overrides = {}) => {
  const Booking = mongoose.model('Booking')
  return await Booking.create({
    hotelId: '507f1f77bcf86cd799439011',
    checkIn: '2025-12-01',
    checkOut: '2025-12-05',
    status: 'PENDING',
    ...overrides
  })
}
```

**Coverage Requirements:**

```json
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/services/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/repositories/**/*.ts': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
}
```

---

## 4. CODE ORGANIZATION & ARCHITECTURE (Score: 75/100)

### Current Issues

**Mixed Responsibilities:**

```typescript
// src/services/unified-booking.service.ts
// This file has 500+ lines mixing:
// 1. Booking creation logic
// 2. Payment processing
// 3. Vendor API calls
// 4. Data transformation
// 5. Validation
// 6. Email sending

// ❌ Too many responsibilities in one file
```

**Lack of Domain Models:**

```typescript
// Current: Mongoose models are used directly in services
const booking = await bookingRepository.findBookingById(id)
booking.status = 'CONFIRMED'  // ❌ Direct mutation
await bookingRepository.updateBooking(id, booking)
```

**Required: Domain-Driven Design**

```typescript
// src/domain/booking/Booking.ts
export class Booking {
  constructor(
    private readonly id: string,
    private props: {
      hotelId: string
      checkIn: Date
      checkOut: Date
      status: ReservationStatus
      totalAmount: number
      guestInfo: GuestInfo
      paymentInfo?: PaymentInfo
      rooms: Room[]
      createdAt: Date
      updatedAt: Date
    }
  ) {}

  // Business logic methods
  confirm(): void {
    if (this.props.status !== ReservationStatus.PENDING) {
      throw new ValidationError('Only pending bookings can be confirmed')
    }
    if (!this.props.paymentInfo || this.props.paymentInfo.paymentStatus !== 'paid') {
      throw new ValidationError('Payment must be completed before confirmation')
    }
    this.props.status = ReservationStatus.CONFIRMED
    this.props.updatedAt = new Date()
  }

  cancel(reason: string): void {
    if (this.props.status === ReservationStatus.CANCELLED) {
      throw new ValidationError('Booking already cancelled')
    }
    if (this.props.status === ReservationStatus.COMPLETED) {
      throw new ValidationError('Completed bookings cannot be cancelled')
    }
    this.props.status = ReservationStatus.CANCELLED
    this.props.cancellationReason = reason
    this.props.updatedAt = new Date()
  }

  addPayment(paymentInfo: PaymentInfo): void {
    if (this.props.paymentInfo) {
      throw new ValidationError('Payment already exists')
    }
    this.props.paymentInfo = paymentInfo
    this.props.updatedAt = new Date()
  }

  updatePaymentStatus(status: PaymentStatus, transactionId?: string): void {
    if (!this.props.paymentInfo) {
      throw new ValidationError('No payment information exists')
    }
    this.props.paymentInfo.paymentStatus = status
    if (transactionId) {
      this.props.paymentInfo.transactionId = transactionId
    }
    this.props.updatedAt = new Date()
  }

  // Getters
  get bookingId(): string {
    return this.id
  }

  get status(): ReservationStatus {
    return this.props.status
  }

  get totalAmount(): number {
    return this.props.totalAmount
  }

  get isConfirmed(): boolean {
    return this.props.status === ReservationStatus.CONFIRMED
  }

  get isPaid(): boolean {
    return this.props.paymentInfo?.paymentStatus === 'paid'
  }

  // Validation
  canBeCancelled(): boolean {
    return this.props.status !== ReservationStatus.CANCELLED &&
           this.props.status !== ReservationStatus.COMPLETED
  }

  // Serialization
  toJSON() {
    return {
      _id: this.id,
      ...this.props,
      checkIn: this.props.checkIn.toISOString(),
      checkOut: this.props.checkOut.toISOString()
    }
  }

  // Factory method
  static create(props: CreateBookingProps): Booking {
    // Validate dates
    if (props.checkIn >= props.checkOut) {
      throw new ValidationError('Check-out must be after check-in')
    }
    if (props.checkIn < new Date()) {
      throw new ValidationError('Check-in must be in the future')
    }

    // Generate booking reference
    const id = new ObjectId().toString()
    const bookingReference = `BK-${id.slice(-8).toUpperCase()}`

    return new Booking(id, {
      ...props,
      status: ReservationStatus.PENDING,
      bookingReference,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
}
```

**Refactored Service with Domain Model:**

```typescript
// src/services/booking.service.ts (cleaned up to 100 lines)
import { Booking } from '@/domain/booking/Booking'
import bookingRepository from '@/repositories/booking.repository'
import { PaymentService } from '@/services/payment.service'
import { NotificationService } from '@/services/notification.service'

export class BookingService {
  constructor(
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    // Create domain object (encapsulates business logic)
    const booking = Booking.create(input)

    // Persist
    await bookingRepository.save(booking)

    // Side effects
    await this.notificationService.sendBookingConfirmation(booking)

    return booking
  }

  async confirmBooking(bookingId: string): Promise<Booking> {
    const booking = await this.getBooking(bookingId)

    // Business logic in domain model
    booking.confirm()

    // Persist
    await bookingRepository.save(booking)

    // Side effects
    await this.notificationService.sendConfirmationEmail(booking)

    return booking
  }

  async cancelBooking(bookingId: string, reason: string): Promise<Booking> {
    const booking = await this.getBooking(bookingId)

    // Business logic in domain model
    booking.cancel(reason)

    // Persist
    await bookingRepository.save(booking)

    // Trigger refund if payment exists
    if (booking.isPaid) {
      await this.paymentService.processRefund(bookingId)
    }

    return booking
  }

  private async getBooking(bookingId: string): Promise<Booking> {
    const bookingData = await bookingRepository.findBookingById(bookingId)
    if (!bookingData) {
      throw new NotFoundError('Booking not found')
    }
    return Booking.fromPersistence(bookingData)
  }
}
```

**Separate Concerns:**

```typescript
// src/services/payment.service.ts (focused on payments only)
export class PaymentService {
  constructor(
    private tropiPayService: TropiPayService,
    private bookingRepository: BookingRepository
  ) {}

  async createPaymentLink(bookingId: string): Promise<PaymentLink> {
    const booking = await this.bookingRepository.findBookingById(bookingId)
    // Payment-specific logic only
    return this.tropiPayService.createBookingPayment(bookingId)
  }

  async processRefund(bookingId: string): Promise<void> {
    // Refund logic
  }

  async handlePaymentWebhook(webhookData: WebhookData): Promise<void> {
    // Webhook processing logic
  }
}

// src/services/notification.service.ts (focused on notifications only)
export class NotificationService {
  async sendBookingConfirmation(booking: Booking): Promise<void> {
    // Email sending logic
  }

  async sendConfirmationEmail(booking: Booking): Promise<void> {
    // Confirmation email logic
  }

  async sendCancellationEmail(booking: Booking): Promise<void> {
    // Cancellation email logic
  }
}
```

---

## 5. CONFIGURATION MANAGEMENT (Score: 40/100)

### Current Issues

**Hardcoded Values:**

```typescript
// src/services/tropipay.service.ts
const TOKEN_EXPIRY_BUFFER_SECONDS = 300  // ❌ Hardcoded
const PAYMENT_REASON_ID_SERVICES = 4     // ❌ Magic number
const DEFAULT_COUNTRY_ID = 1              // ❌ Magic number
const DEFAULT_PHONE = "+1234567890"       // ❌ Hardcoded

// src/api/axios-instance.ts
baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'  // ❌ Fallback in code
```

**No Configuration Validation:**

```typescript
// src/server/index.ts
const PORT = process.env.PORT || 3000  // ❌ No validation
app.listen(PORT)  // ❌ Could crash if PORT is "invalid"
```

**Required: Centralized Configuration**

```typescript
// src/config/index.ts
import { z } from 'zod'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Define configuration schema
const configSchema = z.object({
  // Server
  nodeEnv: z.enum(['development', 'test', 'staging', 'production']),
  port: z.coerce.number().int().min(1024).max(65535),
  apiVersion: z.string().default('v1'),

  // Database
  mongoUri: z.string().url(),
  mongoDbName: z.string().min(1),
  mongoMaxPoolSize: z.coerce.number().int().min(1).max(100).default(50),

  // Authentication
  jwtSecret: z.string().min(32),
  jwtExpiry: z.string().default('24h'),
  bcryptRounds: z.coerce.number().int().min(10).max(15).default(12),

  // TropiPay
  tropiPayClientId: z.string().min(1),
  tropiPayClientSecret: z.string().min(1),
  tropiPayEnvironment: z.enum(['Development', 'Production']),
  tropiPayTokenExpiryBuffer: z.coerce.number().int().default(300),

  // External APIs
  hotetecApiUrl: z.string().url(),
  hotetecApiKey: z.string().min(1),
  dingusApiUrl: z.string().url(),
  dingusUsername: z.string().min(1),
  dingusPassword: z.string().min(1),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // CORS
  corsOrigins: z.string().transform(val => val.split(',')),

  // Rate Limiting
  rateLimitWindow: z.coerce.number().int().default(15 * 60 * 1000), // 15 min
  rateLimitMax: z.coerce.number().int().default(1000),

  // Monitoring
  armsEnabled: z.coerce.boolean().default(false),
  armsPid: z.string().optional(),
  sentryDsn: z.string().url().optional()
})

// Parse and validate configuration
function loadConfig() {
  try {
    const rawConfig = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      apiVersion: process.env.API_VERSION,

      mongoUri: process.env.MONGODB_URI,
      mongoDbName: process.env.MONGODB_DB_NAME,
      mongoMaxPoolSize: process.env.MONGODB_MAX_POOL_SIZE,

      jwtSecret: process.env.JWT_SECRET,
      jwtExpiry: process.env.JWT_EXPIRY,
      bcryptRounds: process.env.BCRYPT_ROUNDS,

      tropiPayClientId: process.env.TROPIPAY_CLIENT_ID,
      tropiPayClientSecret: process.env.TROPIPAY_CLIENT_SECRET,
      tropiPayEnvironment: process.env.TROPIPAY_ENVIRONMENT,
      tropiPayTokenExpiryBuffer: process.env.TROPIPAY_TOKEN_EXPIRY_BUFFER,

      hotetecApiUrl: process.env.HOTETEC_API_URL,
      hotetecApiKey: process.env.HOTETEC_API_KEY,
      dingusApiUrl: process.env.DINGUS_API_URL,
      dingusUsername: process.env.DINGUS_USERNAME,
      dingusPassword: process.env.DINGUS_PASSWORD,

      logLevel: process.env.LOG_LEVEL,
      corsOrigins: process.env.CORS_ORIGINS,

      rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
      rateLimitMax: process.env.RATE_LIMIT_MAX,

      armsEnabled: process.env.ARMS_ENABLED,
      armsPid: process.env.ARMS_PID,
      sentryDsn: process.env.SENTRY_DSN
    }

    return configSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      process.exit(1)
    }
    throw error
  }
}

export const config = loadConfig()

// Type-safe config object
export type Config = z.infer<typeof configSchema>
```

**Usage:**

```typescript
// src/services/tropipay.service.ts
import { config } from '@/config'

export class TropiPayService {
  constructor() {
    this.config = {
      clientId: config.tropiPayClientId,  // ✅ Type-safe, validated
      clientSecret: config.tropiPayClientSecret,
      environment: config.tropiPayEnvironment
    }
  }

  private async authenticate(): Promise<string> {
    const expiryBuffer = config.tropiPayTokenExpiryBuffer  // ✅ Centralized
    this.tokenExpiry = Date.now() + (expires_in - expiryBuffer) * 1000
    // ...
  }
}

// src/server/index.ts
import { config } from '@/config'

const app = express()

app.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    env: config.nodeEnv,
    apiVersion: config.apiVersion
  })
})
```

**.env.example (Complete Documentation):**

```bash
# .env.example
# Copy this file to .env and fill in the values

# Server Configuration
NODE_ENV=development  # development | test | staging | production
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=oneclick_dev
MONGODB_MAX_POOL_SIZE=50

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=24h
BCRYPT_ROUNDS=12

# TropiPay Payment Gateway
TROPIPAY_CLIENT_ID=your-client-id
TROPIPAY_CLIENT_SECRET=your-client-secret
TROPIPAY_ENVIRONMENT=Development  # Development | Production
TROPIPAY_TOKEN_EXPIRY_BUFFER=300  # seconds

# External APIs
HOTETEC_API_URL=https://api.hotetec.com
HOTETEC_API_KEY=your-api-key
DINGUS_API_URL=https://api.dingus.com
DINGUS_USERNAME=your-username
DINGUS_PASSWORD=your-password

# Logging
LOG_LEVEL=info  # error | warn | info | debug

# CORS
CORS_ORIGINS=http://localhost:3030,http://localhost:3032

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX=1000  # max requests per window

# Monitoring (Optional)
ARMS_ENABLED=false
ARMS_PID=your-arms-project-id
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## 6. DEPENDENCY INJECTION & TESTABILITY (Score: 40/100)

### Current Issues

**Tightly Coupled Code:**

```typescript
// src/services/booking.service.ts
// ❌ Direct imports create tight coupling
import bookingRepository from '@/repositories/booking.repository'
import { tropiPayService } from '@/services/tropipay.service'

class BookingService {
  async createBooking(data) {
    // ❌ Can't mock these dependencies in tests
    const booking = await bookingRepository.createBooking(data)
    const payment = await tropiPayService.createPaymentLink(booking.id)
    // ...
  }
}

// ❌ Singleton export
export default new BookingService()
```

**Required: Dependency Injection**

```typescript
// src/services/booking.service.ts
import { IBookingRepository } from '@/repositories/interfaces/IBookingRepository'
import { IPaymentService } from '@/services/interfaces/IPaymentService'
import { INotificationService } from '@/services/interfaces/INotificationService'

export class BookingService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentService: IPaymentService,
    private readonly notificationService: INotificationService
  ) {}

  async createBooking(data: CreateBookingInput): Promise<Booking> {
    const booking = await this.bookingRepository.create(data)
    const payment = await this.paymentService.createPaymentLink(booking.id)
    await this.notificationService.sendConfirmation(booking)
    return booking
  }
}
```

**Dependency Injection Container:**

```typescript
// src/di/container.ts
import { Container } from 'inversify'
import 'reflect-metadata'

// Symbols for dependency injection
export const TYPES = {
  // Repositories
  BookingRepository: Symbol.for('BookingRepository'),
  HotelRepository: Symbol.for('HotelRepository'),
  UserRepository: Symbol.for('UserRepository'),

  // Services
  BookingService: Symbol.for('BookingService'),
  PaymentService: Symbol.for('PaymentService'),
  NotificationService: Symbol.for('NotificationService'),
  TropiPayService: Symbol.for('TropiPayService'),

  // Adapters
  HotetecAdapter: Symbol.for('HotetecAdapter'),
  DingusAdapter: Symbol.for('DingusAdapter'),
  RoibosAdapter: Symbol.for('RoibosAdapter'),

  // Infrastructure
  Logger: Symbol.for('Logger'),
  Cache: Symbol.for('Cache'),
  Database: Symbol.for('Database')
}

const container = new Container()

// Register repositories
container.bind(TYPES.BookingRepository).to(BookingRepository).inSingletonScope()
container.bind(TYPES.HotelRepository).to(HotelRepository).inSingletonScope()

// Register services
container.bind(TYPES.BookingService).to(BookingService).inSingletonScope()
container.bind(TYPES.PaymentService).to(PaymentService).inSingletonScope()
container.bind(TYPES.NotificationService).to(NotificationService).inSingletonScope()

// Register adapters
container.bind(TYPES.HotetecAdapter).to(HotetecAdapter).inSingletonScope()
container.bind(TYPES.DingusAdapter).to(DingusAdapter).inSingletonScope()

export { container }
```

**Service with DI:**

```typescript
// src/services/booking.service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/di/container'

@injectable()
export class BookingService {
  constructor(
    @inject(TYPES.BookingRepository)
    private readonly bookingRepository: IBookingRepository,

    @inject(TYPES.PaymentService)
    private readonly paymentService: IPaymentService,

    @inject(TYPES.NotificationService)
    private readonly notificationService: INotificationService,

    @inject(TYPES.Logger)
    private readonly logger: ILogger
  ) {}

  async createBooking(data: CreateBookingInput): Promise<Booking> {
    this.logger.info('Creating booking', { data })

    const booking = await this.bookingRepository.create(data)
    const payment = await this.paymentService.createPaymentLink(booking.id)

    await this.notificationService.sendConfirmation(booking)

    return booking
  }
}
```

**Testable Controller:**

```typescript
// src/server/controllers/booking.controller.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/di/container'

@injectable()
export class BookingController {
  constructor(
    @inject(TYPES.BookingService)
    private readonly bookingService: IBookingService
  ) {}

  createBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await this.bookingService.createBooking(req.body)
      res.status(201).json(booking)
    } catch (error) {
      next(error)
    }
  }
}
```

**Easy Testing with DI:**

```typescript
// tests/unit/services/booking.service.test.ts
describe('BookingService', () => {
  let bookingService: BookingService
  let mockBookingRepository: jest.Mocked<IBookingRepository>
  let mockPaymentService: jest.Mocked<IPaymentService>
  let mockNotificationService: jest.Mocked<INotificationService>
  let mockLogger: jest.Mocked<ILogger>

  beforeEach(() => {
    // Create mocks
    mockBookingRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    } as any

    mockPaymentService = {
      createPaymentLink: jest.fn()
    } as any

    mockNotificationService = {
      sendConfirmation: jest.fn()
    } as any

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    } as any

    // Inject mocks (no need for DI container in tests)
    bookingService = new BookingService(
      mockBookingRepository,
      mockPaymentService,
      mockNotificationService,
      mockLogger
    )
  })

  it('should create booking successfully', async () => {
    const mockBooking = { id: '123', status: 'PENDING' }
    mockBookingRepository.create.mockResolvedValue(mockBooking)
    mockPaymentService.createPaymentLink.mockResolvedValue({ url: 'http://pay.com' })

    const result = await bookingService.createBooking({ /* data */ })

    expect(result).toEqual(mockBooking)
    expect(mockBookingRepository.create).toHaveBeenCalledTimes(1)
    expect(mockPaymentService.createPaymentLink).toHaveBeenCalledWith('123')
    expect(mockNotificationService.sendConfirmation).toHaveBeenCalled()
  })
})
```

---

## 7. LOGGING & OBSERVABILITY (Score: 35/100)

### Current Issues

**Console.log Everywhere:**

```typescript
// src/services/hotel.service.ts
console.log(`Found ${result.hotels.length} hotels`)  // ❌ Not structured
console.error("Error searching hotels:", error)      // ❌ Lost in production
```

**No Request Correlation:**

```typescript
// Can't trace a request across multiple services/logs
// No correlation ID
```

**Required: Structured Logging**

```typescript
// src/utils/logger.ts
import winston from 'winston'
import { config } from '@/config'

// Custom format for structured logs
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: structuredFormat,
  defaultMeta: {
    service: 'backend-service',
    environment: config.nodeEnv,
    version: process.env.npm_package_version
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

// Production transports
if (config.nodeEnv === 'production') {
  // File transport for errors
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }))

  // File transport for all logs
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880,
    maxFiles: 5
  }))

  // TODO: Add Alibaba SLS transport
  // logger.add(new AliyunTransport({ ... }))
}

// Helper methods for structured logging
export const createLogger = (context: string) => {
  return {
    info: (message: string, meta?: object) => {
      logger.info(message, { context, ...meta })
    },
    warn: (message: string, meta?: object) => {
      logger.warn(message, { context, ...meta })
    },
    error: (message: string, error?: Error, meta?: object) => {
      logger.error(message, {
        context,
        error: error?.message,
        stack: error?.stack,
        ...meta
      })
    },
    debug: (message: string, meta?: object) => {
      logger.debug(message, { context, ...meta })
    }
  }
}

export default logger
```

**Usage in Services:**

```typescript
// src/services/hotel.service.ts
import { createLogger } from '@/utils/logger'

const logger = createLogger('HotelService')

class HotelService {
  async searchExternalHotels(params: SearchParams) {
    const startTime = Date.now()

    logger.info('Searching hotels', {
      params,
      userId: params.userId,
      correlationId: params.correlationId
    })

    try {
      const result = await hotelRepository.searchHotelsInDatabase(params)

      logger.info('Hotel search completed', {
        resultCount: result.hotels.length,
        duration: Date.now() - startTime,
        correlationId: params.correlationId
      })

      return result
    } catch (error) {
      logger.error('Hotel search failed', error as Error, {
        params,
        duration: Date.now() - startTime,
        correlationId: params.correlationId
      })
      throw error
    }
  }
}
```

**Request Correlation Middleware:**

```typescript
// src/middlewares/correlation.middleware.ts
import { v4 as uuidv4 } from 'uuid'
import { Request, Response, NextFunction } from 'express'

export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get correlation ID from header or generate new one
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4()

  // Store in request for access in handlers
  ;(req as any).correlationId = correlationId

  // Add to response headers
  res.setHeader('x-correlation-id', correlationId)

  // Log request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: (req as any).user?.id
  })

  // Measure request duration
  const startTime = Date.now()

  res.on('finish', () => {
    logger.info('Request completed', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - startTime
    })
  })

  next()
}
```

---

## Summary: Backend Service Code Quality Improvements

### Immediate Actions (Week 1-2):

1. ✅ **Standardized Error Handling** - Implement AppError hierarchy
2. ✅ **Input Validation** - Add Zod schemas to all endpoints
3. ✅ **Structured Logging** - Replace console.log with Winston
4. ✅ **Correlation IDs** - Add request tracking

### Short-term (Month 1):

5. ✅ **Test Coverage** - Achieve 70% coverage with unit + integration tests
6. ✅ **Dependency Injection** - Implement InversifyJS
7. ✅ **Configuration Management** - Centralize and validate all config
8. ✅ **Domain Models** - Extract business logic from services

### Long-term (Quarter 1):

9. ✅ **API Documentation** - Generate OpenAPI/Swagger from code
10. ✅ **Performance Monitoring** - Add APM instrumentation
11. ✅ **Code Quality Gates** - Enforce coverage and complexity metrics in CI
12. ✅ **Refactoring** - Split large services into smaller, focused ones

---

# PART 2: FRONTEND APPLICATIONS (React/TypeScript)

## Agency App & Backoffice App (Combined Analysis)

### Current Architecture Quality: 65/100

### ✅ Strengths

1. **Modern Stack** - React 18, TypeScript, Vite
2. **Component Architecture** - Reusable UI components
3. **State Management** - Redux Toolkit
4. **Type Safety** - TypeScript enabled

### ❌ Critical Code-Level Gaps

---

## 1. TYPE SAFETY (Score: 60/100)

### Current Issues

**Implicit `any` Types:**

```typescript
// agency-app/src/redux/reducers/hotelReducer.ts
const initialState = {
  hotels: [],  // ❌ any[]
  loading: false,
  error: null  // ❌ any
}

// agency-app/src/api/hotels/index.ts
export const searchHotels = async (params) => {  // ❌ params is any
  const response = await sendGetRequest('/hotels/search', params)
  return response.data  // ❌ return type is any
}
```

**No API Response Types:**

```typescript
// backoffice-app/src/network/services/hotels.ts
export const fetchHotels = async (page, limit) => {  // ❌ No types
  const response = await axios.get(`/hotels?page=${page}&limit=${limit}`)
  return response.data  // ❌ What shape is this data?
}
```

**Required: Strict TypeScript Configuration**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

**API Type Definitions:**

```typescript
// src/types/api.types.ts
// Define ALL API request/response types

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export interface Hotel {
  _id: string
  hotelCode: string
  hotelName: string
  address: string
  city: string
  country: string
  rating: number
  provider: 'dingus' | 'hotetec' | 'roibos' | 'archipelago' | 'roxa' | 'melia'
  vendor: string
  galleryImgs?: string[]
  latitude?: number
  longitude?: number
  amenities?: string[]
  description?: string
}

export interface SearchHotelsParams {
  hotelName?: string
  provider?: Hotel['provider']
  country?: string
  checkInDate?: string
  checkOutDate?: string
  page?: number
  limit?: number
}

export interface SearchHotelsResponse extends PaginatedResponse<Hotel> {}

export interface Booking {
  _id: string
  bookingReference: string
  hotelId: string
  hotelName: string
  checkIn: string
  checkOut: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  totalAmount: number
  currency: string
  guestInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  paymentInfo?: {
    paymentMethod: string
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
    transactionId?: string
  }
  rooms: Array<{
    adults: number
    children: number
    roomType: string
  }>
  createdAt: string
  updatedAt: string
}

export interface CreateBookingRequest {
  hotelId: string
  checkIn: string
  checkOut: string
  rooms: Booking['rooms']
  guestInfo: Booking['guestInfo']
  specialRequests?: string
}

export interface CreateBookingResponse {
  booking: Booking
  paymentLink?: {
    shortUrl: string
    qrImage: string
    reference: string
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    correlationId: string
    details?: unknown
  }
}
```

**Type-Safe API Client:**

```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiError } from '@/types/api.types'

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, params?: object): Promise<T> {
    const response = await this.client.get<T>(url, { params })
    return response.data
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await this.client.post<T>(url, data)
    return response.data
  }

  async put<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await this.client.put<T>(url, data)
    return response.data
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url)
    return response.data
  }
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL)
```

**Type-Safe API Methods:**

```typescript
// src/api/hotels.api.ts
import { apiClient } from './client'
import type {
  SearchHotelsParams,
  SearchHotelsResponse,
  Hotel
} from '@/types/api.types'

export const hotelsApi = {
  search: (params: SearchHotelsParams): Promise<SearchHotelsResponse> => {
    return apiClient.get<SearchHotelsResponse>('/hotels/search', params)
  },

  getById: (hotelId: string): Promise<Hotel> => {
    return apiClient.get<Hotel>(`/hotels/${hotelId}`)
  },

  // Type-safe, autocomplete works, compile-time checks
}

// src/api/bookings.api.ts
import type {
  CreateBookingRequest,
  CreateBookingResponse,
  Booking
} from '@/types/api.types'

export const bookingsApi = {
  create: (data: CreateBookingRequest): Promise<CreateBookingResponse> => {
    return apiClient.post<CreateBookingResponse, CreateBookingRequest>(
      '/bookings',
      data
    )
  },

  getById: (bookingId: string): Promise<Booking> => {
    return apiClient.get<Booking>(`/bookings/${bookingId}`)
  },

  cancel: (bookingId: string, reason: string): Promise<Booking> => {
    return apiClient.post<Booking>(`/bookings/${bookingId}/cancel`, { reason })
  }
}
```

**Type-Safe Redux:**

```typescript
// src/redux/slices/hotelSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { hotelsApi } from '@/api/hotels.api'
import type {
  Hotel,
  SearchHotelsParams,
  SearchHotelsResponse
} from '@/types/api.types'

interface HotelState {
  hotels: Hotel[]
  total: number
  page: number
  totalPages: number
  loading: boolean
  error: string | null
}

const initialState: HotelState = {
  hotels: [],
  total: 0,
  page: 1,
  totalPages: 0,
  loading: false,
  error: null
}

export const searchHotels = createAsyncThunk<
  SearchHotelsResponse,  // Return type
  SearchHotelsParams,    // Argument type
  { rejectValue: string } // Rejection type
>(
  'hotels/search',
  async (params, { rejectWithValue }) => {
    try {
      return await hotelsApi.search(params)
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

const hotelSlice = createSlice({
  name: 'hotels',
  initialState,
  reducers: {
    clearHotels: (state) => {
      state.hotels = []
      state.total = 0
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchHotels.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        searchHotels.fulfilled,
        (state, action: PayloadAction<SearchHotelsResponse>) => {
          state.loading = false
          state.hotels = action.payload.data
          state.total = action.payload.total
          state.page = action.payload.page
          state.totalPages = action.payload.totalPages
        }
      )
      .addCase(searchHotels.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to search hotels'
      })
  }
})

export const { clearHotels } = hotelSlice.actions
export default hotelSlice.reducer

// Type-safe selectors
import type { RootState } from '@/redux/store'

export const selectHotels = (state: RootState) => state.hotels.hotels
export const selectHotelsLoading = (state: RootState) => state.hotels.loading
export const selectHotelsError = (state: RootState) => state.hotels.error
```

---

## 2. TESTING (Score: 20/100)

### Current Issues

- Only 1 test file (`App.test.tsx`) in each repository
- No component tests
- No custom hook tests
- No integration tests
- Broken test scripts

**Required: Comprehensive Frontend Testing**

```typescript
// src/components/HotelCard/HotelCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HotelCard } from './HotelCard'
import type { Hotel } from '@/types/api.types'

const mockHotel: Hotel = {
  _id: '123',
  hotelCode: 'HTL001',
  hotelName: 'Test Hotel',
  address: '123 Test St',
  city: 'Test City',
  country: 'US',
  rating: 4.5,
  provider: 'hotetec',
  vendor: 'V001',
  galleryImgs: ['image1.jpg', 'image2.jpg']
}

describe('HotelCard', () => {
  it('renders hotel information correctly', () => {
    render(<HotelCard hotel={mockHotel} />)

    expect(screen.getByText('Test Hotel')).toBeInTheDocument()
    expect(screen.getByText('Test City, US')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', async () => {
    const onSelect = jest.fn()
    const user = userEvent.setup()

    render(<HotelCard hotel={mockHotel} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /select hotel/i }))

    expect(onSelect).toHaveBeenCalledWith(mockHotel)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('displays fallback image when no images provided', () => {
    const hotelWithoutImages = { ...mockHotel, galleryImgs: undefined }

    render(<HotelCard hotel={hotelWithoutImages} />)

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', expect.stringContaining('placeholder'))
  })
})
```

**Custom Hook Testing:**

```typescript
// src/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toHaveProperty('email', 'test@example.com')
  })

  it('should logout and clear user data', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('auth_token')).toBeNull()
  })
})
```

**Integration Testing with MSW (Mock Service Worker):**

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw'
import type { SearchHotelsResponse, Hotel } from '@/types/api.types'

const mockHotels: Hotel[] = [
  {
    _id: '1',
    hotelCode: 'HTL001',
    hotelName: 'Mock Hotel 1',
    address: '123 Test St',
    city: 'Test City',
    country: 'US',
    rating: 4.5,
    provider: 'hotetec',
    vendor: 'V001'
  }
]

export const handlers = [
  rest.get('/api/v1/hotels/search', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json<SearchHotelsResponse>({
        data: mockHotels,
        total: 1,
        page: 1,
        totalPages: 1,
        hasMore: false
      })
    )
  }),

  rest.post('/api/v1/bookings', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        booking: {
          _id: '123',
          bookingReference: 'BK-12345678',
          status: 'PENDING'
        }
      })
    )
  })
]

// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// setupTests.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Integration Test:**

```typescript
// src/features/HotelSearch/HotelSearch.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { store } from '@/redux/store'
import { HotelSearch } from './HotelSearch'

describe('HotelSearch Integration', () => {
  it('should search and display hotels', async () => {
    const user = userEvent.setup()

    render(
      <Provider store={store}>
        <HotelSearch />
      </Provider>
    )

    // Fill search form
    await user.type(screen.getByLabelText(/hotel name/i), 'Mock Hotel')
    await user.click(screen.getByRole('button', { name: /search/i }))

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Mock Hotel 1')).toBeInTheDocument()
    })

    // Verify API was called
    expect(screen.getByText(/1 hotel found/i)).toBeInTheDocument()
  })
})
```

---

## 3. COMPONENT ARCHITECTURE (Score: 65/100)

### Current Issues

**Large Components:**

```tsx
// agency-app/src/pages/ListingHotelsPage/ListingHotelsPage.tsx
// 500+ lines of JSX mixing:
// - State management
// - API calls
// - Filtering logic
// - Pagination logic
// - UI rendering
```

**Prop Drilling:**

```tsx
// Props passed through 3+ levels
<App>
  <Layout searchParams={searchParams} filters={filters} onFilterChange={handleFilterChange}>
    <Sidebar filters={filters} onFilterChange={handleFilterChange}>
      <FilterSection filters={filters} onFilterChange={handleFilterChange}>
        {/* Finally used here */}
      </FilterSection>
    </Sidebar>
  </Layout>
</App>
```

**Required: Component Composition**

```tsx
// src/components/HotelSearch/HotelSearch.tsx
// Container component (logic)
export const HotelSearch: React.FC = () => {
  const dispatch = useDispatch()
  const { hotels, loading, error } = useSelector(selectHotels)
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)

  const handleSearch = useCallback(() => {
    dispatch(searchHotels(filters))
  }, [filters, dispatch])

  return (
    <HotelSearchView
      filters={filters}
      onFiltersChange={setFilters}
      hotels={hotels}
      loading={loading}
      error={error}
      onSearch={handleSearch}
    />
  )
}

// Presentational component (UI only)
interface HotelSearchViewProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  hotels: Hotel[]
  loading: boolean
  error: string | null
  onSearch: () => void
}

export const HotelSearchView: React.FC<HotelSearchViewProps> = ({
  filters,
  onFiltersChange,
  hotels,
  loading,
  error,
  onSearch
}) => {
  return (
    <div className="hotel-search">
      <SearchFilters
        filters={filters}
        onChange={onFiltersChange}
        onSubmit={onSearch}
      />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {hotels.length > 0 && (
        <HotelList hotels={hotels} />
      )}
    </div>
  )
}
```

**Compound Components Pattern:**

```tsx
// src/components/Card/Card.tsx
interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader
  Body: typeof CardBody
  Footer: typeof CardFooter
} = ({ children, className }) => {
  return <div className={`card ${className}`}>{children}</div>
}

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="card-header">{children}</div>
}

const CardBody: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="card-body">{children}</div>
}

const CardFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="card-footer">{children}</div>
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

// Usage
<Card>
  <Card.Header>
    <h2>Hotel Name</h2>
  </Card.Header>
  <Card.Body>
    <p>Hotel details...</p>
  </Card.Body>
  <Card.Footer>
    <Button>Book Now</Button>
  </Card.Footer>
</Card>
```

**Custom Hooks for Reusability:**

```typescript
// src/hooks/usePagination.ts
interface UsePaginationProps {
  totalItems: number
  itemsPerPage: number
  currentPage: number
  onPageChange: (page: number) => void
}

export const usePagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange
}: UsePaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }, [currentPage, totalPages, onPageChange])

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange])

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        onPageChange(page)
      }
    },
    [totalPages, onPageChange]
  )

  return {
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToNextPage,
    goToPreviousPage,
    goToPage
  }
}

// Usage
const HotelList = () => {
  const { hotels, total } = useSelector(selectHotels)
  const [page, setPage] = useState(1)

  const pagination = usePagination({
    totalItems: total,
    itemsPerPage: 20,
    currentPage: page,
    onPageChange: setPage
  })

  return (
    <>
      <div className="hotels-grid">
        {hotels.map(hotel => <HotelCard key={hotel._id} hotel={hotel} />)}
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onNext={pagination.goToNextPage}
        onPrevious={pagination.goToPreviousPage}
        onPageClick={pagination.goToPage}
      />
    </>
  )
}
```

---

## Summary: Frontend Code Quality Improvements

### Immediate Actions (Week 1-2):

1. ✅ **Strict TypeScript** - Enable all strict flags, fix all type errors
2. ✅ **API Type Definitions** - Define types for all API requests/responses
3. ✅ **Type-Safe Redux** - Add proper typing to all slices and selectors
4. ✅ **Fix Test Scripts** - Configure Vitest properly, write first 10 tests

### Short-term (Month 1):

5. ✅ **Component Testing** - 60% coverage for UI components
6. ✅ **Custom Hook Testing** - Test all custom hooks
7. ✅ **MSW Integration** - Mock all API endpoints for testing
8. ✅ **Component Refactoring** - Split large components (<200 lines each)

### Long-term (Quarter 1):

9. ✅ **E2E Testing** - Playwright tests for critical user journeys
10. ✅ **Storybook** - Component documentation and visual testing
11. ✅ **Performance Optimization** - Code splitting, lazy loading, memoization
12. ✅ **Accessibility** - WCAG 2.1 AA compliance

---

# OVERALL RECOMMENDATIONS

## Critical Path to Production-Ready Code

### Month 1: Foundation
- Fix all TypeScript errors with strict mode
- Implement standardized error handling
- Add input validation (Zod schemas)
- Achieve 50% test coverage
- Set up proper logging

### Month 2: Quality
- Reach 70% test coverage
- Implement dependency injection
- Refactor large files (<300 lines)
- Add API documentation (OpenAPI/Swagger)
- Set up pre-commit hooks

### Month 3: Production Hardening
- Add E2E tests for critical paths
- Performance optimization and profiling
- Security audit and fixes
- Comprehensive documentation
- Code review process

**Total Effort:** ~600-800 hours across all 3 repos
**Timeline:** 3 months with dedicated team
**Impact:** Maintainable, testable, production-grade codebase