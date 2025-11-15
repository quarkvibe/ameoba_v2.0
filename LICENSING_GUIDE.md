# 🔒 Complete Licensing Review - Enterprise Grade, Simple Implementation

**Goal:** Robust, industry-standard, easy, not overboard

**Current State Analysis:** Let me review everything honestly

---

## 📊 CURRENT IMPLEMENTATION REVIEW

### What Exists:

**1. licenseService.ts (Existing)**
- License activation
- Device fingerprinting
- Validation logic
- **Status:** Basic but functional

**2. licenseGenerationService.ts (Just Added)**
- HMAC-SHA256 signing
- Cryptographic validation
- Offline verification
- **Status:** Solid cryptography

**3. Database Schema**
- licenses table
- Basic fields
- **Status:** Needs enhancement

---

## ✅ WHAT'S GOOD (Keep)

### 1. Cryptographic Validation ✅

**Current approach:** HMAC-SHA256 signed licenses

**Why it's right:**
- Industry standard (used by JWT, AWS)
- Offline validation (respects self-hosting)
- Cannot forge without secret
- Simple to implement

**Verdict:** PERFECT. Don't change.

---

### 2. Offline-First ✅

**No phone-home to function**

**Why it's right:**
- Aligns with self-hosting philosophy
- Works in air-gapped environments
- No single point of failure
- User privacy respected

**Verdict:** KEEP THIS. Core principle.

---

### 3. Soft Limits ✅

**Device tracking without blocking**

**Why it's right:**
- Philosophy-aligned (trust-based)
- Not DRM (users hate DRM)
- Upsell opportunity (fair upgrade path)

**Verdict:** RIGHT APPROACH. Refine implementation.

---

## ⚠️ WHAT NEEDS IMPROVEMENT

### 1. License Key Format ⚠️

**Current:**
```
AMOEBA-V1-XXXX-XXXX-XXXX-XXXX
```

**Issues:**
- Base64 encoding loses structure
- Hard to type (48+ characters)
- No built-in validation

**Industry Standard:**
```
XXXX-XXXX-XXXX-XXXX-XXXX  (25 chars, 5 groups of 5)

Examples:
- Windows: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
- Office: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
- GitHub: ghp_xxxxxxxxxxxxxxxxxxxx (prefixed, 36 chars)
```

**Better format:**
```
AMOEBA-XXXXX-XXXXX-XXXXX-XXXXX

Parts:
- AMOEBA: Product identifier (6 chars)
- XXXXX: 5 groups of 5 alphanumeric (25 chars)
- Total: 31 characters
- Easy to type, copy, verify
```

**Recommendation:** Simplify to 5x5 format

---

### 2. Validation Logic ⚠️

**Current:** All-or-nothing (valid or invalid)

**Enterprise needs:**
```
Scenarios:
- License valid, not expired
- License valid, expires soon (7 days)
- License valid, expired (grace period?)
- License invalid (forged)
- License revoked (support issue)
- License suspended (payment failed)
```

**Recommendation:** Add status codes

```typescript
enum LicenseStatus {
  VALID = 'valid',
  EXPIRING_SOON = 'expiring_soon',  // < 7 days
  EXPIRED = 'expired',
  INVALID = 'invalid',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
}
```

---

### 3. Grace Period ⚠️

**Current:** Expired = instantly invalid

**Enterprise standard:**
```
Subscription expires → 7-day grace period
- Days 1-7: Full access + renewal prompt
- Day 8+: Read-only mode or limited features
- Day 30+: Gentle lockout

NOT: Instant shutdown (user frustration)
```

**Recommendation:** 7-day grace, gentle degradation

---

### 4. License Metadata ⚠️

**Current:** Basic (tier, expiry, features)

**Enterprise needs:**
```
Should include:
✅ Tier
✅ Issue & expiry dates
✅ Features array
✅ Max devices
⏳ Max users (for team licenses)
⏳ Monthly limits (generation quota, optional)
⏳ Support level (community, email, priority, SLA)
⏳ Custom features (enterprise add-ons)
```

**Recommendation:** Add limits but make them soft

---

### 5. Revocation Capability ⚠️

**Current:** No way to revoke license

**Enterprise needs:**
```
Scenarios needing revocation:
- Chargeback/fraud
- TOS violation
- Support escalation
- Refund request

Solution: Revocation list (optional check)
- Offline: License validates (crypto is valid)
- Online (optional): Check if revoked
- Compromise: Cache revocation list locally (weekly check)
```

**Recommendation:** Optional revocation check (respects offline)

---

## 🎯 ENTERPRISE-GRADE IMPLEMENTATION

### Simplified but Complete:

```typescript
// server/services/enterpriseLicenseService.ts

interface LicensePayload {
  // Core
  id: string;              // Unique license ID
  tier: 'personal' | 'team' | 'enterprise';
  
  // Timing
  issued: number;          // Unix timestamp
  expires?: number;        // Unix timestamp (optional)
  
  // Limits (soft)
  maxDevices: number;      // Informational
  maxUsers?: number;       // For team licenses
  
  // Features
  features: string[];      // ['all'] or specific features
  
  // Support
  supportLevel: 'community' | 'email' | 'priority' | 'sla';
  
  // Customer (for support lookup)
  customerId: string;      // Stripe customer ID
}

interface LicenseValidation {
  status: 'valid' | 'expiring_soon' | 'expired' | 'invalid' | 'revoked';
  tier?: string;
  features?: string[];
  expiresAt?: Date;
  daysRemaining?: number;
  gracePeriod?: boolean;
  message: string;
  action?: string;  // What user should do
}

class EnterpriseLicenseService {
  
  /**
   * Generate license (called by website)
   */
  generateLicense(metadata: LicensePayload): string {
    // 1. Create compact payload (JSON)
    const payload = {
      id: metadata.id,
      t: metadata.tier[0],  // 'p'/'t'/'e' (compact!)
      i: metadata.issued,
      e: metadata.expires,
      d: metadata.maxDevices,
      f: metadata.features.join(','),
      s: metadata.supportLevel[0],
      c: metadata.customerId,
    };
    
    // 2. Encode as base62 (compact, URL-safe, typeable)
    const encoded = this.encodeBase62(JSON.stringify(payload));
    
    // 3. Sign with HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(encoded)
      .digest('base64url')
      .substring(0, 8); // First 8 chars (sufficient)
    
    // 4. Format: AMOEBA-XXXXX-XXXXX-XXXXX-XXXXX
    const data = encoded + signature;
    const formatted = this.formatKey(data);
    
    return formatted;
  }
  
  /**
   * Validate license (offline!)
   */
  validateLicense(key: string): LicenseValidation {
    try {
      // 1. Parse key
      const data = key.replace(/AMOEBA-/i, '').replace(/-/g, '');
      const encoded = data.slice(0, -8);
      const signature = data.slice(-8);
      
      // 2. Verify signature
      const expected = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(encoded)
        .digest('base64url')
        .substring(0, 8);
      
      if (signature !== expected) {
        return {
          status: 'invalid',
          message: 'Invalid license key',
        };
      }
      
      // 3. Decode payload
      const payload = JSON.parse(this.decodeBase62(encoded));
      
      // 4. Check expiry
      if (payload.e) {
        const now = Date.now();
        const expiresAt = new Date(payload.e);
        const daysRemaining = Math.ceil((payload.e - now) / (1000 * 60 * 60 * 24));
        
        // Expired?
        if (now > payload.e) {
          const daysExpired = Math.ceil((now - payload.e) / (1000 * 60 * 60 * 24));
          
          // Grace period: 7 days
          if (daysExpired <= 7) {
            return {
              status: 'expired',
              tier: this.expandTier(payload.t),
              gracePeriod: true,
              message: `License expired ${daysExpired} day(s) ago. Grace period: ${7 - daysExpired} days remaining.`,
              action: 'Renew at amoeba.io/renew',
            };
          }
          
          // Past grace period
          return {
            status: 'expired',
            tier: this.expandTier(payload.t),
            gracePeriod: false,
            message: 'License expired. Please renew to continue using Amoeba.',
            action: 'Renew at amoeba.io/renew',
          };
        }
        
        // Expiring soon?
        if (daysRemaining <= 7) {
          return {
            status: 'expiring_soon',
            tier: this.expandTier(payload.t),
            features: payload.f.split(','),
            expiresAt,
            daysRemaining,
            message: `License valid. Expires in ${daysRemaining} day(s).`,
            action: 'Renew at amoeba.io/renew',
          };
        }
      }
      
      // 5. Valid!
      return {
        status: 'valid',
        tier: this.expandTier(payload.t),
        features: payload.f.split(','),
        expiresAt: payload.e ? new Date(payload.e) : undefined,
        message: 'License valid',
      };
      
    } catch (error: any) {
      return {
        status: 'invalid',
        message: `Validation error: ${error.message}`,
      };
    }
  }
  
  /**
   * Optional revocation check (respects offline)
   */
  async checkRevoked(licenseId: string): Promise<boolean> {
    // Only if online and user opts in
    if (!navigator.onLine || !process.env.CHECK_REVOCATIONS) {
      return false;  // Assume not revoked (offline-first)
    }
    
    try {
      // Check against lightweight API (just license IDs)
      const response = await fetch('https://amoeba.io/api/check-revoked', {
        method: 'POST',
        body: JSON.stringify({ id: licenseId }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      return data.revoked || false;
      
    } catch (error) {
      // Network error = assume not revoked (offline-first)
      return false;
    }
  }
  
  /**
   * Format key for readability
   */
  private formatKey(data: string): string {
    // AMOEBA-XXXXX-XXXXX-XXXXX-XXXXX (31 chars total)
    const clean = data.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const padded = (clean + '0'.repeat(25)).substring(0, 25);
    
    const groups = [];
    for (let i = 0; i < 25; i += 5) {
      groups.push(padded.substring(i, i + 5));
    }
    
    return `AMOEBA-${groups.join('-')}`;
  }
}
```

---

## 🎯 ENTERPRISE REQUIREMENTS

### What Enterprises Actually Need:

**✅ MUST HAVE (Industry Standard):**

**1. Offline Validation** ✅
- Current: HMAC crypto verification
- Standard: JWT-style validation
- Status: IMPLEMENTED correctly

**2. Expiry Handling** ✅
- Current: Basic expiry check
- Standard: Expiry + grace period
- Status: NEED grace period (simple add)

**3. Multiple Tiers** ✅
- Current: personal, team, enterprise
- Standard: 2-4 tiers with clear features
- Status: HAVE THIS

**4. Secure Storage** ✅
- Current: Encrypted in database
- Standard: Encrypted at rest
- Status: IMPLEMENTED (encryptionService)

**⚠️ SHOULD HAVE (Professional):**

**5. Grace Period** ⚠️
- Current: Instant expiry
- Standard: 7-day grace with warnings
- Status: NEED TO ADD (1 hour)

**6. Usage Tracking** ⚠️
- Current: Device fingerprinting basic
- Standard: Track usage, show in dashboard
- Status: ENHANCE (2 hours)

**7. Status Codes** ⚠️
- Current: Boolean (valid/invalid)
- Standard: Status enum (valid, expiring, expired, revoked)
- Status: NEED TO ADD (1 hour)

**❌ DON'T NEED (Overkill for Self-Hosted):**

**8. Phone-Home Validation** ❌
- Some use: Check every startup
- Why not: Violates self-hosting principle
- Alternative: Optional revocation check

**9. Hardware Dongles** ❌
- Some use: Physical USB keys
- Why not: Ridiculous for software

**10. Complex Entitlements** ❌
- Some use: Feature flags per license
- Why not: Keep it simple (tiers, not microfeatures)

**11. Usage Metering** ❌
- Some use: Track API calls, charge overages
- Why not: Conflicts with BYOK model

**12. License Server** ❌
- Some use: Central validation server
- Why not: Single point of failure, violates self-hosting

---

## 🏆 RECOMMENDED ENTERPRISE IMPLEMENTATION

### The Balance (Robust but Simple):

```typescript
/**
 * Enterprise License System
 * 
 * MUST HAVE:
 * ✅ Cryptographic validation (HMAC-SHA256)
 * ✅ Offline-first (works without internet)
 * ✅ Tier support (personal, team, enterprise)
 * ✅ Expiry handling (subscriptions)
 * ✅ Grace period (7 days)
 * ✅ Status codes (valid, expiring, expired, invalid, revoked)
 * ✅ Device tracking (soft limits)
 * ✅ Secure storage (encrypted)
 * 
 * OPTIONAL:
 * ⚠️ Revocation check (online, opt-in)
 * ⚠️ Usage analytics (informational)
 * 
 * DON'T HAVE:
 * ❌ Phone-home required
 * ❌ Hardware dongles
 * ❌ Usage metering
 * ❌ License server
 * 
 * INDUSTRY STANDARD: Yes
 * OVERBOARD: No
 * SELF-HOSTING FRIENDLY: Yes
 */

interface License {
  // Identification
  id: string;                    // Unique license ID
  key: string;                   // AMOEBA-XXXXX-XXXXX-XXXXX-XXXXX
  
  // Customer
  userId: string;
  email: string;
  stripeCustomerId?: string;
  
  // Type & Tier
  type: 'lifetime' | 'subscription';
  tier: 'personal' | 'team' | 'business' | 'enterprise';
  
  // Timing
  issuedAt: Date;
  expiresAt?: Date;              // Null for lifetime
  lastValidated?: Date;
  
  // Status
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  
  // Limits (soft, informational)
  maxDevices: number;            // 5, 20, 100, 999
  maxUsers?: number;             // For team licenses
  
  // Features (what's enabled)
  features: string[];            // ['all'] or specific
  
  // Usage (track but don't enforce)
  activeDevices: number;
  devices: Array<{
    fingerprint: string;
    hostname: string;
    lastSeen: Date;
    firstSeen: Date;
  }>;
  
  // Support
  supportLevel: 'community' | 'email' | 'priority' | 'sla';
  
  // Audit
  activations: number;
  lastActivation?: Date;
  notes?: string;                // Support notes
}
```

---

## 📋 LICENSE LIFECYCLE

### Complete Flow:

**1. Purchase (amoeba.io)**
```
User → Stripe checkout → Payment
  ↓
Webhook → Generate license
  ↓
Email → AMOEBA-XXXXX-XXXXX-XXXXX-XXXXX
  ↓
Store in your database (issued_licenses table)
```

**2. Activation (User's Amoeba)**
```
User → Dashboard → License → Enter key
  ↓
Validate (offline, crypto)
  ↓
Check expiry
  ↓
Status: valid/expiring/expired
  ↓
Store activation in their database
  ↓
Track device (fingerprint, hostname)
  ↓
Show status in dashboard
```

**3. Usage (Continuous)**
```
Every 7 days (background):
  ↓
Check expiry status
  ↓
If expiring soon (< 7 days):
  → Show renewal prompt
  ↓
If expired:
  → Grace period check (< 7 days past)
  → If in grace: Full access + urgent prompt
  → If past grace: Gentle degradation
```

**4. Renewal (amoeba.io)**
```
User → amoeba.io/renew
  ↓
Enter license key or email
  ↓
Stripe checkout (renewal)
  ↓
Extend expiry date
  ↓
Email confirmation
  ↓
User's Amoeba picks up new expiry (weekly check or manual)
```

**5. Support/Revocation (amoeba.io admin)**
```
Admin panel:
  ↓
View all issued licenses
  ↓
Actions:
- Extend expiry (support case)
- Revoke license (fraud/abuse)
- Add notes (support history)
- View usage (how many devices)
```

---

## 🔒 SECURITY LEVELS

### Level 1: Basic (What We Have)
```
✅ Cryptographic signing (HMAC)
✅ Offline validation
✅ Expiry checking
⚠️ No revocation
⚠️ No grace period
```

**Good for:** MVP, initial launch

---

### Level 2: Professional (Recommended)
```
✅ Everything in Level 1
✅ Grace period (7 days)
✅ Status codes (valid, expiring, expired)
✅ Device tracking (soft limits)
✅ Optional revocation check (respects offline)
✅ Usage dashboard (show devices)
```

**Good for:** Production launch, enterprise sales

**Time to implement:** 4-6 hours

---

### Level 3: Enterprise+ (Overkill)
```
✅ Everything in Level 2
⚠️ Real-time validation server
⚠️ Hardware binding
⚠️ Feature-level entitlements
⚠️ Usage metering
```

**Good for:** Fortune 500 only

**Don't do this:** Conflicts with self-hosting

---

## 🎯 RECOMMENDED IMPLEMENTATION

### What to Build:

**This Week (4-6 hours):**

**1. Improve License Format (1 hour)**
```
Current: AMOEBA-V1-XXXX... (complex base64)
Better: AMOEBA-XXXXX-XXXXX-XXXXX-XXXXX (25 chars, 5x5)

Easier to:
- Type
- Copy
- Verify
- Support
```

**2. Add Grace Period (1 hour)**
```typescript
if (expired) {
  const daysPast = (now - expiresAt) / (1000 * 60 * 60 * 24);
  
  if (daysPast <= 7) {
    // Grace period - full access with prompts
    return {
      status: 'expired',
      gracePeriod: true,
      daysRemaining: 7 - daysPast,
      message: 'License expired. Grace period active.',
      action: 'Renew now to avoid service interruption',
    };
  }
}
```

**3. Add Status Enum (30 minutes)**
```typescript
enum LicenseStatus {
  VALID,
  EXPIRING_SOON,  // < 7 days
  EXPIRED_GRACE,  // Expired but in 7-day grace
  EXPIRED,        // Past grace period
  INVALID,        // Bad signature
  REVOKED,        // Manually revoked
}
```

**4. Enhance Device Tracking (1 hour)**
```typescript
// Show in Dashboard → License:
"Your License: Personal
Status: Active ✅
Expires: Dec 31, 2025 (45 days)
Devices: 3 / 5
├─ macbook-pro (last seen: 2 min ago)
├─ staging-server (last seen: 1 hour ago)
└─ production-server (last seen: 5 min ago)

[Manage Devices] [Upgrade to Team]"
```

**5. Add Renewal Flow (1-2 hours)**
```
User → Dashboard → License → "Renew"
  ↓
Opens: amoeba.io/renew?license=XXXXX
  ↓
Stripe checkout (pre-filled)
  ↓
Payment → Extend expiry
  ↓
Done!
```

---

## 📊 DATABASE SCHEMA

### Your Database (Marketing Site):

```sql
-- Vercel Postgres or your hosted DB
CREATE TABLE issued_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL,
  type TEXT NOT NULL, -- 'lifetime' or 'subscription'
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'active',
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  notes TEXT,
  metadata JSONB,
  
  INDEX idx_email (email),
  INDEX idx_stripe_customer (stripe_customer_id),
  INDEX idx_status (status)
);

-- Customer portal
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  licenses TEXT[], -- Array of license keys they own
  created_at TIMESTAMP DEFAULT NOW()
);
```

### User's Database (Their Amoeba):

```sql
-- Already in schema.ts
CREATE TABLE licenses (
  id UUID PRIMARY KEY,
  license_key TEXT NOT NULL,
  device_fingerprint TEXT,
  activated_at TIMESTAMP,
  last_validated TIMESTAMP,
  -- That's it! They don't need your customer data
);
```

**Minimal data in user's instance** ✅

---

## ✅ FINAL RECOMMENDATION

### Enterprise-Grade, Not Overboard:

**Implement (4-6 hours):**
1. ✅ Simplified key format (5x5 groups)
2. ✅ Grace period (7 days)
3. ✅ Status enum (valid, expiring, expired, revoked)
4. ✅ Enhanced device tracking (show in dashboard)
5. ✅ Renewal flow (link to website)
6. ✅ Optional revocation check (respects offline)

**Don't Implement:**
- ❌ Phone-home required
- ❌ Real-time validation server
- ❌ Hardware binding
- ❌ Usage metering
- ❌ Complex entitlements

**Result:**
- Enterprise-ready (grace period, status codes, tracking)
- Self-hosting friendly (offline-first, no phone-home)
- Simple (6 hours of work)
- Industry standard (follows best practices)
- Not overboard (no DRM, no complexity)

---

## 🎯 IMPLEMENTATION PRIORITY

**Critical (Before Launch):**
1. License format (easy to use)
2. Grace period (user-friendly)
3. Status codes (proper UX)

**Important (Week 1):**
4. Device dashboard (transparency)
5. Renewal flow (revenue)

**Nice-to-Have (Month 2):**
6. Revocation check (edge cases)
7. Usage analytics (insights)

---

## 🏆 VERDICT

**Current licensing:** 70% there (crypto is solid!)

**Needs:** Grace period, status codes, better format

**Time:** 4-6 hours to enterprise-grade

**Will it work?** YES (current system works)

**Is it enterprise-ready?** After refinements, YES

**Is it overboard?** NO (balanced perfectly)

---

**This is the right level of sophistication.** ✅

**Simple enough:** Users understand it  
**Robust enough:** Enterprises trust it  
**Philosophy-aligned:** Self-hosting respected  

**Want me to implement the refinements now?** (4-6 hours)

---

**Made with enterprise wisdom, startup pragmatism**  
**By QuarkVibe Inc.**  
**License system that respects users** 🔒✨

