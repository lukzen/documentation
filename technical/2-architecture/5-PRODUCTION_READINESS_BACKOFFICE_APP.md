# Production Readiness Assessment: Backoffice App (Application Code)

**Repository:** `backoffice-app`
**Type:** React SPA Admin Application
**Tech Stack:** React 18.2, TypeScript 5.3, Vite 5.0, Tailwind CSS 3.4, Radix UI
**Assessment Date:** 2025-11-28
**Current Status:** ⚠️ Development - Not Production Ready

---

## Executive Summary

The backoffice-app is a modern React admin dashboard with good UI architecture (shadcn components, Radix UI). However, as an **admin application**, it requires **STRICTER security controls** than customer-facing apps. Critical code-level gaps exist in MFA, RBAC, audit logging, testing, and security hardening.

**Code Quality Score: 60/100**

| Category | Score | Status |
|----------|-------|--------|
| Type Safety | 65/100 | ⚠️ Needs Improvement |
| Testing | 15/100 | ❌ Critical Gaps |
| Security (Code) | 55/100 | ❌ Critical Gaps |
| Admin Security Features | 30/100 | ❌ Critical Gaps (MFA, RBAC, Audit) |
| Error Handling | 40/100 | ❌ Critical Gaps |
| Performance (Code) | 75/100 | ✅ Good |
| Maintainability | 80/100 | ✅ Good |

**Note:** All infrastructure, Kubernetes, deployment, network policies, and operations concerns are documented in `PRODUCTION_READINESS_ALIBABA_INFRA.md`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Key Differences from Customer-Facing Apps](#key-differences-from-customer-facing-apps)
3. [Admin Authentication & Security](#1-admin-authentication--security)
   - [Multi-Factor Authentication (MFA)](#11-multi-factor-authentication-mfa)
   - [Enhanced Token Security](#12-enhanced-token-security)
   - [Session Management](#13-session-management)
   - [Critical Action Re-authentication](#14-critical-action-re-authentication)
4. [Role-Based Access Control (RBAC)](#2-role-based-access-control-rbac)
   - [Fine-Grained Permissions System](#21-fine-grained-permissions-system)
   - [Permission Hooks and Components](#22-permission-hooks-and-components)
   - [Role Management UI](#23-role-management-ui)
5. [Audit Logging (Application Side)](#3-audit-logging-application-side)
   - [Comprehensive Audit Trail](#31-comprehensive-audit-trail)
   - [Audit Log Integration](#32-audit-log-integration)
   - [Audit Log Viewer UI](#33-audit-log-viewer-ui)
6. [Type Safety & Validation](#4-type-safety--validation)
   - [Environment Variable Validation](#41-environment-variable-validation)
   - [API Type Definitions](#42-api-type-definitions)
7. [Testing Strategy](#5-testing-strategy)
   - [Test Coverage](#51-test-coverage)
8. [Security (Application Code)](#6-security-application-code)
   - [Content Security Policy](#61-content-security-policy)
   - [XSS Prevention](#62-xss-prevention)
9. [Performance (Code Level)](#7-performance-code-level)
   - [Code Splitting](#71-code-splitting)
   - [Bundle Optimization](#72-bundle-optimization)
10. [Error Handling & Observability](#8-error-handling--observability)
    - [Error Boundaries](#81-error-boundaries)
    - [Error Tracking Integration](#82-error-tracking-integration)
11. [Implementation Roadmap (Code Changes Only)](#9-implementation-roadmap-code-changes-only)
    - [Phase 1: Critical Admin Security (Weeks 1-2)](#phase-1-critical-admin-security-weeks-1-2)
    - [Phase 2: Testing & Reliability (Weeks 3-4)](#phase-2-testing--reliability-weeks-3-4)
    - [Phase 3: Enhancement (Weeks 5-6)](#phase-3-enhancement-weeks-5-6)
12. [Success Metrics](#10-success-metrics)
    - [Pre-Production (Current State)](#pre-production-current-state)
    - [Post-Production (Target State)](#post-production-target-state)
13. [Cloud Provider SDK Integration (Code Level)](#11-cloud-provider-sdk-integration-code-level)
    - [Alibaba Cloud (Primary)](#alibaba-cloud-primary)
    - [AWS Alternative](#aws-alternative)
    - [GCP Alternative](#gcp-alternative)
14. [Conclusion](#conclusion)

---

## Key Differences from Customer-Facing Apps

**Admin applications require enhanced security:**
- ✅ Multi-Factor Authentication (MANDATORY)
- ✅ Fine-grained RBAC with permissions
- ✅ Comprehensive audit logging for all actions
- ✅ Session timeout and re-authentication
- ✅ IP allowlisting (infrastructure level)
- ✅ Stricter token security (httpOnly cookies)

---

## 1. ADMIN AUTHENTICATION & SECURITY

### 1.1 Multi-Factor Authentication (MFA)

**❌ Current: Not implemented**
**Required: MANDATORY for all admin users**

```typescript
// Install dependencies
// npm install speakeasy qrcode @types/speakeasy @types/qrcode

// src/utils/mfa.ts
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export interface MFASetupResult {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export const setupMFA = async (userId: string, userEmail: string): Promise<MFASetupResult> => {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `OneClickAdventures (${userEmail})`,
    issuer: 'OneClickAdventures',
    length: 32
  })

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  )

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
    backupCodes
  }
}

export const verifyMFAToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow 2 time steps before/after
  })
}

export const verifyBackupCode = (storedCodes: string[], inputCode: string): boolean => {
  const index = storedCodes.findIndex(code => code === inputCode.toUpperCase())
  if (index !== -1) {
    // Remove used backup code
    storedCodes.splice(index, 1)
    return true
  }
  return false
}
```

**MFA Setup Component:**

```typescript
// src/features/auth/components/MFASetup.tsx
import { useState } from 'react'
import { setupMFA } from '@/utils/mfa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const MFASetup: React.FC<{ userId: string; userEmail: string }> = ({
  userId,
  userEmail
}) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [mfaData, setMfaData] = useState<MFASetupResult | null>(null)
  const [verificationCode, setVerificationCode] = useState('')

  const handleSetup = async () => {
    const data = await setupMFA(userId, userEmail)
    setMfaData(data)
    setStep('verify')
  }

  const handleVerify = async () => {
    if (!mfaData) return

    const isValid = verifyMFAToken(mfaData.secret, verificationCode)
    if (isValid) {
      // Save MFA secret to backend
      await authAPI.enableMFA({
        secret: mfaData.secret,
        backupCodes: mfaData.backupCodes
      })

      // Show success message
      toast.success('MFA enabled successfully!')
    } else {
      toast.error('Invalid verification code')
    }
  }

  return (
    <div className="space-y-6">
      {step === 'setup' && (
        <>
          <h2 className="text-2xl font-bold">Enable Two-Factor Authentication</h2>
          <p>Scan the QR code with your authenticator app</p>
          <Button onClick={handleSetup}>Generate QR Code</Button>
        </>
      )}

      {step === 'verify' && mfaData && (
        <>
          <div className="flex flex-col items-center space-y-4">
            <img src={mfaData.qrCode} alt="QR Code" className="w-64 h-64" />
            <p className="text-sm text-muted-foreground">
              Or enter this code manually: <code>{mfaData.secret}</code>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Backup Codes</h3>
            <p className="text-sm text-muted-foreground">
              Save these backup codes in a safe place. Each can be used once.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {mfaData.backupCodes.map((code, index) => (
                <code key={index} className="p-2 bg-muted rounded">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label>Enter verification code from your app:</label>
            <Input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
            />
            <Button onClick={handleVerify}>Verify and Enable</Button>
          </div>
        </>
      )}
    </div>
  )
}
```

**MFA Verification on Login:**

```typescript
// src/features/auth/components/MFAVerification.tsx
import { useState } from 'react'
import { verifyMFAToken } from '@/utils/mfa'

export const MFAVerification: React.FC<{
  onVerified: () => void
  onUseBackupCode: () => void
}> = ({ onVerified, onUseBackupCode }) => {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    setLoading(true)
    try {
      const response = await authAPI.verifyMFA({ code })
      if (response.success) {
        onVerified()
      } else {
        toast.error('Invalid verification code')
      }
    } catch (error) {
      toast.error('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
      <p>Enter the 6-digit code from your authenticator app</p>

      <Input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="000000"
        maxLength={6}
        autoFocus
      />

      <Button onClick={handleVerify} disabled={code.length !== 6 || loading}>
        Verify
      </Button>

      <Button variant="link" onClick={onUseBackupCode}>
        Use backup code instead
      </Button>
    </div>
  )
}
```

### 1.2 Enhanced Token Security

**❌ Current: Token in localStorage (XSS vulnerable)**
**Required: httpOnly cookies**

```typescript
// src/api/axios-instance.ts
import axios from 'axios'
import { env } from '@/config/env'

const instance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true, // Send httpOnly cookies
  headers: {
    'Content-Type': 'application/json'
  }
})

// No need to manually add Authorization header
// Backend sets httpOnly cookie

export default instance
```

**Backend coordination required:**
```typescript
// Backend must set httpOnly cookie
res.cookie('admin_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000 // 8 hours
})
```

### 1.3 Session Management

**Required: Auto-timeout and re-authentication**

```typescript
// src/hooks/useSessionTimeout.ts
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'

const IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const WARNING_TIME = 2 * 60 * 1000 // Warn 2 minutes before timeout

export const useSessionTimeout = () => {
  const { logout } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    setShowWarning(false)

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
    }, IDLE_TIMEOUT - WARNING_TIME)

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout()
    }, IDLE_TIMEOUT)
  }

  useEffect(() => {
    // Activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    const handleActivity = () => {
      resetTimer()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Initial timer
    resetTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [])

  const extendSession = () => {
    resetTimer()
  }

  return { showWarning, extendSession }
}

// Usage in App component
export const App = () => {
  const { showWarning, extendSession } = useSessionTimeout()

  return (
    <>
      {/* App content */}

      {showWarning && (
        <SessionWarningModal
          onExtend={extendSession}
          timeRemaining={2 * 60} // 2 minutes
        />
      )}
    </>
  )
}
```

### 1.4 Critical Action Re-authentication

**Required: Re-authenticate for sensitive operations**

```typescript
// src/components/ReauthModal.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ReauthModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  action: string
}

export const ReauthModal: React.FC<ReauthModalProps> = ({
  open,
  onClose,
  onSuccess,
  action
}) => {
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReauth = async () => {
    setLoading(true)
    try {
      const response = await authAPI.reauthenticate({
        password,
        mfaCode
      })

      if (response.success) {
        onSuccess()
        onClose()
      } else {
        toast.error('Re-authentication failed')
      }
    } catch (error) {
      toast.error('Re-authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Your Identity</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are about to perform a sensitive action: <strong>{action}</strong>
          </p>

          <div className="space-y-2">
            <label>Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className="space-y-2">
            <label>MFA Code</label>
            <Input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
            />
          </div>

          <Button onClick={handleReauth} disabled={!password || !mfaCode || loading}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Usage
const DeleteHotelButton = ({ hotelId }: { hotelId: string }) => {
  const [showReauth, setShowReauth] = useState(false)

  const handleDeleteClick = () => {
    setShowReauth(true)
  }

  const handleReauthSuccess = async () => {
    // Proceed with deletion
    await hotelAPI.delete(hotelId)
    toast.success('Hotel deleted')
  }

  return (
    <>
      <Button variant="destructive" onClick={handleDeleteClick}>
        Delete Hotel
      </Button>

      <ReauthModal
        open={showReauth}
        onClose={() => setShowReauth(false)}
        onSuccess={handleReauthSuccess}
        action="delete hotel"
      />
    </>
  )
}
```

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC)

### 2.1 Fine-Grained Permissions System

**Current: Basic role enum (ADMIN, SALES_AGENT, etc.)**
**Required: Permission-based access control**

```typescript
// src/types/permissions.ts
export enum Permission {
  // Hotel Management
  HOTEL_VIEW = 'hotel:view',
  HOTEL_CREATE = 'hotel:create',
  HOTEL_UPDATE = 'hotel:update',
  HOTEL_DELETE = 'hotel:delete',
  HOTEL_COMMISSION_UPDATE = 'hotel:commission:update',

  // Booking Management
  BOOKING_VIEW = 'booking:view',
  BOOKING_VIEW_ALL = 'booking:view:all', // View all bookings vs own bookings
  BOOKING_MODIFY = 'booking:modify',
  BOOKING_CANCEL = 'booking:cancel',
  BOOKING_REFUND = 'booking:refund',

  // User Management
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ROLE_ASSIGN = 'user:role:assign',

  // Payment Management
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_REFUND = 'payment:refund',
  PAYMENT_VIEW_DETAILS = 'payment:view:details',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_VIEW_FINANCIAL = 'analytics:view:financial',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SALES_AGENT = 'SALES_AGENT',
  BACKOFFICE_HOTEL_AGENT = 'BACKOFFICE_HOTEL_AGENT',
  FINANCE = 'FINANCE',
  SUPPORT = 'SUPPORT'
}

export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission), // All permissions

  [UserRole.SALES_AGENT]: [
    Permission.HOTEL_VIEW,
    Permission.BOOKING_VIEW,
    Permission.BOOKING_MODIFY,
    Permission.ANALYTICS_VIEW
  ],

  [UserRole.BACKOFFICE_HOTEL_AGENT]: [
    Permission.HOTEL_VIEW,
    Permission.HOTEL_UPDATE,
    Permission.HOTEL_COMMISSION_UPDATE,
    Permission.BOOKING_VIEW_ALL,
    Permission.BOOKING_MODIFY
  ],

  [UserRole.FINANCE]: [
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_VIEW_DETAILS,
    Permission.PAYMENT_REFUND,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_VIEW_FINANCIAL,
    Permission.ANALYTICS_EXPORT
  ],

  [UserRole.SUPPORT]: [
    Permission.HOTEL_VIEW,
    Permission.BOOKING_VIEW_ALL,
    Permission.BOOKING_MODIFY,
    Permission.USER_VIEW
  ]
}
```

### 2.2 Permission Hooks and Components

```typescript
// src/hooks/usePermission.ts
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Permission, rolePermissions } from '@/types/permissions'

export const usePermission = (permission: Permission): boolean => {
  const { user } = useAuth()

  if (!user) return false

  const userPermissions = rolePermissions[user.role] || []
  return userPermissions.includes(permission)
}

export const usePermissions = (permissions: Permission[]): boolean => {
  const { user } = useAuth()

  if (!user) return false

  const userPermissions = rolePermissions[user.role] || []
  return permissions.every(permission => userPermissions.includes(permission))
}

export const useHasAnyPermission = (permissions: Permission[]): boolean => {
  const { user } = useAuth()

  if (!user) return false

  const userPermissions = rolePermissions[user.role] || []
  return permissions.some(permission => userPermissions.includes(permission))
}
```

**Protected Components:**

```typescript
// src/components/ProtectedAction.tsx
import { ReactNode } from 'react'
import { Permission } from '@/types/permissions'
import { usePermission } from '@/hooks/usePermission'

interface ProtectedActionProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  permission,
  children,
  fallback = null
}) => {
  const hasPermission = usePermission(permission)

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Usage
<ProtectedAction permission={Permission.HOTEL_DELETE}>
  <Button variant="destructive" onClick={deleteHotel}>
    Delete Hotel
  </Button>
</ProtectedAction>

// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { Permission } from '@/types/permissions'
import { usePermission } from '@/hooks/usePermission'

interface ProtectedRouteProps {
  permission: Permission
  children: ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  children
}) => {
  const hasPermission = usePermission(permission)

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

// Usage in routing
<Route
  path="/hotels/create"
  element={
    <ProtectedRoute permission={Permission.HOTEL_CREATE}>
      <CreateHotelPage />
    </ProtectedRoute>
  }
/>
```

### 2.3 Role Management UI

```typescript
// src/features/admin/components/RolePermissionMatrix.tsx
import { Table } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { UserRole, Permission, rolePermissions } from '@/types/permissions'

export const RolePermissionMatrix: React.FC = () => {
  const roles = Object.values(UserRole)
  const permissions = Object.values(Permission)

  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th>Permission</th>
            {roles.map(role => (
              <th key={role}>{role}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map(permission => (
            <tr key={permission}>
              <td className="font-mono text-sm">{permission}</td>
              {roles.map(role => (
                <td key={role} className="text-center">
                  <Checkbox
                    checked={rolePermissions[role].includes(permission)}
                    disabled
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
```

---

## 3. AUDIT LOGGING (APPLICATION SIDE)

### 3.1 Comprehensive Audit Trail

**❌ Current: No audit logging**
**Required: Log ALL admin actions**

```typescript
// src/utils/audit-logger.ts
export interface AuditLogEntry {
  timestamp: Date
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress: string
  userAgent: string
  success: boolean
  errorMessage?: string
  correlationId?: string
}

export const logAdminAction = async (entry: Omit<AuditLogEntry, 'timestamp' | 'ipAddress' | 'userAgent'>): Promise<void> => {
  const auditEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
    ipAddress: await getClientIP(),
    userAgent: navigator.userAgent
  }

  // Send to backend audit log endpoint
  try {
    await axios.post('/api/v1/audit-logs', auditEntry)
  } catch (error) {
    // Log locally if backend fails
    console.error('Failed to send audit log:', error)
    // Store in IndexedDB for retry
    await storeAuditLogLocally(auditEntry)
  }
}

// Get client IP (from backend via API or from headers)
const getClientIP = async (): Promise<string> => {
  try {
    const response = await axios.get('/api/v1/client-ip')
    return response.data.ip
  } catch {
    return 'unknown'
  }
}

// Store failed audit logs locally for retry
const storeAuditLogLocally = async (entry: AuditLogEntry): Promise<void> => {
  // Use IndexedDB to store failed logs
  const db = await openDB('audit-logs', 1)
  await db.add('pending-logs', entry)
}
```

### 3.2 Audit Log Integration

```typescript
// src/hooks/useAuditLog.ts
import { useAuth } from '@/features/auth/hooks/useAuth'
import { logAdminAction, AuditLogEntry } from '@/utils/audit-logger'

export const useAuditLog = () => {
  const { user } = useAuth()

  const log = async (
    action: string,
    resource: string,
    resourceId: string,
    options?: {
      changes?: Record<string, any>
      success?: boolean
      errorMessage?: string
    }
  ) => {
    if (!user) return

    await logAdminAction({
      userId: user.id,
      userEmail: user.email,
      action,
      resource,
      resourceId,
      success: options?.success ?? true,
      changes: options?.changes,
      errorMessage: options?.errorMessage
    })
  }

  return { log }
}

// Usage in components
const UpdateHotelForm = ({ hotelId }: { hotelId: string }) => {
  const { log } = useAuditLog()

  const handleSubmit = async (updates: Partial<Hotel>) => {
    try {
      await hotelAPI.update(hotelId, updates)

      // Log successful update
      await log('UPDATE_HOTEL', 'hotel', hotelId, {
        changes: updates,
        success: true
      })

      toast.success('Hotel updated successfully')
    } catch (error) {
      // Log failed update
      await log('UPDATE_HOTEL', 'hotel', hotelId, {
        changes: updates,
        success: false,
        errorMessage: error.message
      })

      toast.error('Failed to update hotel')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### 3.3 Audit Log Viewer UI

```typescript
// src/features/admin/components/AuditLogViewer.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'

export const AuditLogViewer: React.FC = () => {
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    startDate: null,
    endDate: null
  })

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditAPI.getLogs(filters)
  })

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Audit Log</h2>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4">
        <Input
          placeholder="User Email"
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
        />
        <Select
          value={filters.action}
          onValueChange={(value) => setFilters({ ...filters, action: value })}
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </Select>
        <Select
          value={filters.resource}
          onValueChange={(value) => setFilters({ ...filters, resource: value })}
        >
          <option value="">All Resources</option>
          <option value="hotel">Hotel</option>
          <option value="booking">Booking</option>
          <option value="user">User</option>
        </Select>
        <DateRangePicker
          onSelect={(range) => setFilters({
            ...filters,
            startDate: range.from,
            endDate: range.to
          })}
        />
      </div>

      {/* Audit Log Table */}
      <Table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Success</th>
            <th>IP Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs?.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.userEmail}</td>
              <td>
                <code className="text-sm">{log.action}</code>
              </td>
              <td>
                {log.resource} ({log.resourceId})
              </td>
              <td>
                {log.success ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-600">✗</span>
                )}
              </td>
              <td className="font-mono text-sm">{log.ipAddress}</td>
              <td>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => viewDetails(log)}
                >
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Export Button */}
      <Button onClick={() => exportLogs(filters)}>
        Export to CSV
      </Button>
    </div>
  )
}
```

---

## 4. TYPE SAFETY & VALIDATION

### 4.1 Environment Variable Validation

**❌ Critical: Hardcoded API URL**

```typescript
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_ANALYTICS_ID: z.string().optional()
})

export const env = envSchema.parse(import.meta.env)

// Type-safe environment access
export type Env = z.infer<typeof envSchema>
```

```bash
# .env.example
VITE_API_BASE_URL=https://api.lukzen-op.com/api/v1
VITE_ENVIRONMENT=development
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_ANALYTICS_ID=G-XXXXXXXXXX
```

### 4.2 API Type Definitions

```typescript
// src/api/types/admin.ts
import { z } from 'zod'

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'SALES_AGENT', 'BACKOFFICE_HOTEL_AGENT', 'FINANCE', 'SUPPORT']),
  mfaEnabled: z.boolean(),
  permissions: z.array(z.string()),
  lastLogin: z.string().datetime().optional(),
  createdAt: z.string().datetime()
})

export type AdminUser = z.infer<typeof AdminUserSchema>

// Form validation
export const UpdateHotelSchema = z.object({
  hotelName: z.string().min(2).max(200).optional(),
  commission: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional()
})

export type UpdateHotelInput = z.infer<typeof UpdateHotelSchema>
```

---

## 5. TESTING STRATEGY

### 5.1 Test Coverage

**Current: ~15% (1 test file)**
**Required: >60% (admin apps need thorough testing of RBAC)**

```typescript
// tests/components/ProtectedAction.test.tsx
import { render, screen } from '@testing-library/react'
import { ProtectedAction } from '@/components/ProtectedAction'
import { Permission } from '@/types/permissions'
import { usePermission } from '@/hooks/usePermission'

jest.mock('@/hooks/usePermission')

describe('ProtectedAction', () => {
  it('should render children when user has permission', () => {
    (usePermission as jest.Mock).mockReturnValue(true)

    render(
      <ProtectedAction permission={Permission.HOTEL_DELETE}>
        <button>Delete Hotel</button>
      </ProtectedAction>
    )

    expect(screen.getByText('Delete Hotel')).toBeInTheDocument()
  })

  it('should not render children when user lacks permission', () => {
    (usePermission as jest.Mock).mockReturnValue(false)

    render(
      <ProtectedAction permission={Permission.HOTEL_DELETE}>
        <button>Delete Hotel</button>
      </ProtectedAction>
    )

    expect(screen.queryByText('Delete Hotel')).not.toBeInTheDocument()
  })

  it('should render fallback when user lacks permission', () => {
    (usePermission as jest.Mock).mockReturnValue(false)

    render(
      <ProtectedAction
        permission={Permission.HOTEL_DELETE}
        fallback={<span>No permission</span>}
      >
        <button>Delete Hotel</button>
      </ProtectedAction>
    )

    expect(screen.getByText('No permission')).toBeInTheDocument()
  })
})

// tests/utils/mfa.test.ts
import { setupMFA, verifyMFAToken } from '@/utils/mfa'

describe('MFA Utils', () => {
  it('should generate MFA secret and QR code', async () => {
    const result = await setupMFA('user123', 'test@example.com')

    expect(result.secret).toHaveLength(32)
    expect(result.qrCode).toContain('data:image/png')
    expect(result.backupCodes).toHaveLength(8)
  })

  it('should verify valid MFA token', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    // Generate valid token for current time
    const token = speakeasy.totp({
      secret,
      encoding: 'base32'
    })

    expect(verifyMFAToken(secret, token)).toBe(true)
  })

  it('should reject invalid MFA token', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const invalidToken = '000000'

    expect(verifyMFAToken(secret, invalidToken)).toBe(false)
  })
})
```

---

## 6. SECURITY (APPLICATION CODE)

### 6.1 Content Security Policy

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.lukzen-op.com; font-src 'self' data:">
          <meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains; preload">
          </head>`
        )
      }
    }
  ]
})
```

### 6.2 XSS Prevention

```typescript
// Install DOMPurify
// npm install dompurify @types/dompurify

// src/utils/sanitize.ts
import DOMPurify from 'dompurify'

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'target']
  })
}

// Usage
const HotelDescription: React.FC<{ html: string }> = ({ html }) => {
  return (
    <div dangerouslySetInnerHTML={{
      __html: sanitizeHtml(html)
    }} />
  )
}
```

---

## 7. PERFORMANCE (CODE LEVEL)

### 7.1 Code Splitting

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Lazy load admin routes
const Dashboard = lazy(() => import('./pages/Dashboard'))
const HotelsPage = lazy(() => import('./pages/HotelsPage'))
const BookingsPage = lazy(() => import('./pages/BookingsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))

export const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/hotels" element={<HotelsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

### 7.2 Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: process.env.NODE_ENV === 'development' ? true : 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'state-vendor': ['@reduxjs/toolkit', 'redux-persist'],
          'chart-vendor': ['recharts']
        }
      }
    },
    chunkSizeWarningLimit: 600 // Admin app can be slightly larger
  }
})
```

---

## 8. ERROR HANDLING & OBSERVABILITY

### 8.1 Error Boundaries

```typescript
// src/components/AdminErrorBoundary.tsx
import React, { Component, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  feature: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to admin monitoring
    console.error(`Admin panel error in ${this.props.feature}:`, error, errorInfo)

    // Send to Sentry/monitoring
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { feature: this.props.feature, context: 'admin' },
        extra: errorInfo
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">
            Error in {this.props.feature}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### 8.2 Error Tracking Integration

```typescript
// src/utils/error-tracking.ts
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import { env } from '@/config/env'

export const initErrorTracking = () => {
  if (env.VITE_ENVIRONMENT === 'production' && env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: env.VITE_SENTRY_DSN,
      environment: env.VITE_ENVIRONMENT,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay()
      ],
      tracesSampleRate: 0.2, // Higher for admin app
      replaysSessionSampleRate: 0.2,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        // Add admin context
        event.tags = {
          ...event.tags,
          app: 'backoffice'
        }
        return event
      }
    })
  }
}
```

---

## 9. IMPLEMENTATION ROADMAP (CODE CHANGES ONLY)

### Phase 1: Critical Admin Security (Weeks 1-2)

**Week 1:**
- [ ] Implement MFA for all admin users (setup + verification)
- [ ] Migrate to httpOnly cookies (coordinate with backend)
- [ ] Add environment variable validation with Zod
- [ ] Implement session timeout (15 minutes idle)
- [ ] Configure CSP headers in Vite

**Week 2:**
- [ ] Implement fine-grained RBAC with permissions
- [ ] Create ProtectedAction and ProtectedRoute components
- [ ] Add re-authentication for critical actions
- [ ] Integrate error tracking (Sentry)
- [ ] Implement comprehensive audit logging

**Cost Impact:** Time investment only

### Phase 2: Testing & Reliability (Weeks 3-4)

**Week 3:**
- [ ] Set up testing framework (@testing-library/react)
- [ ] Write tests for RBAC components (>50% coverage)
- [ ] Write tests for MFA flow
- [ ] Test audit logging integration
- [ ] Add MSW for API mocking

**Week 4:**
- [ ] Achieve >60% test coverage
- [ ] Add E2E tests for critical admin flows
- [ ] Test permission-based rendering
- [ ] Add accessibility tests (jest-axe)
- [ ] Implement error boundaries

**Cost Impact:** Time investment only

### Phase 3: Enhancement (Weeks 5-6)

**Week 5:**
- [ ] Build audit log viewer UI
- [ ] Implement role management UI (permission matrix)
- [ ] Add data export functionality (CSV)
- [ ] Optimize bundle size with code splitting
- [ ] Add DOMPurify for XSS prevention

**Week 6:**
- [ ] Implement backup code management
- [ ] Add user activity dashboards
- [ ] Create admin-specific data tables
- [ ] Optimize Redux state management
- [ ] Add performance monitoring (Web Vitals)

**Cost Impact:** Time investment only

---

## 10. SUCCESS METRICS

### Pre-Production (Current State)
- MFA: ❌ Not implemented
- RBAC: Basic role enum
- Audit Logging: ❌ None
- Test Coverage: ~15%
- Session Management: Basic JWT in localStorage
- Token Security: localStorage (XSS vulnerable)
- Error Tracking: ❌ None

### Post-Production (Target State)
- MFA: ✅ 100% of admin users
- RBAC: Fine-grained permissions system
- Audit Logging: ✅ All actions logged and searchable
- Test Coverage: >60%
- Session Management: ✅ httpOnly cookies, 15-min timeout, re-auth for sensitive ops
- Token Security: ✅ httpOnly cookies (XSS protected)
- Error Tracking: ✅ Sentry integrated

---

## 11. CLOUD PROVIDER SDK INTEGRATION (CODE LEVEL)

### Alibaba Cloud (Primary)

```typescript
// ARMS Frontend Monitoring
import ARMS from '@alicloud/arms-rum'

ARMS.init({
  pid: env.VITE_ARMS_PID,
  endpoint: 'https://arms-retcode.aliyuncs.com',
  plugins: {
    enableSPA: true,
    enableAPI: true
  }
})

// SLS for audit log shipping (if client-side)
import SLS from '@alicloud/sls'
```

### AWS Alternative

```typescript
// CloudWatch RUM
import { AwsRum } from 'aws-rum-web'

const awsRum = new AwsRum('backoffice-app', '1.0.0', 'us-east-1', {
  sessionSampleRate: 1,
  telemetries: ['performance', 'errors', 'http']
})
```

### GCP Alternative

```typescript
// Cloud Monitoring
import { trace } from '@google-cloud/trace-agent'
trace.start({ projectId: env.VITE_GCP_PROJECT_ID })
```

---

## CONCLUSION

The backoffice-app requires **stricter security controls** than customer-facing applications due to admin access to sensitive operations. This document addresses application code concerns only. All infrastructure, network policies, Kubernetes, deployment, and operations improvements are documented in `PRODUCTION_READINESS_ALIBABA_INFRA.md`.

**Key Code-Level Priorities:**
1. ✅ Implement MFA (MANDATORY for admin users)
2. ✅ Build fine-grained RBAC with permissions
3. ✅ Add comprehensive audit logging
4. ✅ Migrate to httpOnly cookies
5. ✅ Implement session timeout and re-authentication
6. ✅ Achieve >60% test coverage (focus on RBAC)
7. ✅ Integrate error tracking (Sentry)
8. ✅ Build audit log viewer UI

**Related Documentation:**
- Infrastructure/Operations: `PRODUCTION_READINESS_ALIBABA_INFRA.md`
- Backend Code Quality: `PRODUCTION_READINESS_BACKEND_SERVICE.md`
- Customer App Code Quality: `PRODUCTION_READINESS_AGENCY_APP.md`
- Cross-Cutting Patterns: `CODE_QUALITY_ASSESSMENT.md`
