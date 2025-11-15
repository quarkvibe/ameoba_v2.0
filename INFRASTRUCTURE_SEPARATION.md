# 🏗️ Infrastructure Separation - Marketing vs Product

**Critical Architectural Decision:** Keep marketing/sales separate from product code

---

## 🎯 THE TWO SYSTEMS

### System 1: Marketing/Sales (Public-Facing)

```
Domain: amoeba.io
Purpose: Marketing, sales, license issuance
Tech: Next.js (already in /landing folder!)
Deploy: Vercel (free, fast, global CDN)

Contains:
- Landing page
- Pricing page
- Documentation site
- Blog (future)
- Stripe checkout
- License generation
- Email sending
- Analytics
```

### System 2: Product (User's Infrastructure)

```
Domain: User's choice (app.example.com or localhost)
Purpose: Actual Amoeba platform
Tech: The code in /server, /client, /cli
Deploy: User self-hosts (AWS, Vercel, their server)

Contains:
- All Amoeba services
- Dashboard UI
- CLI
- Database
- User's data
- NO marketing
- NO payment processing
```

**CLEAN SEPARATION** ✅

---

## 📊 CURRENT STRUCTURE

### What You Have:

```
Ameoba_1.2/
├── server/           # Amoeba product code
├── client/           # Amoeba dashboard
├── cli/              # Amoeba CLI
├── shared/           # Shared types
├── landing/          # Marketing site (SEPARATE!) ✅
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── pricing/           # Pricing page
│   │   └── checkout/          # Stripe checkout
│   ├── components/
│   └── package.json           # Separate dependencies!
└── package.json      # Amoeba dependencies

THIS IS ALREADY CORRECT! ✅
```

**The `/landing` folder is your marketing site!**

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Recommended Setup:

```
┌─────────────────────────────────────────────────┐
│         amoeba.io (Marketing Site)              │
│  Vercel → /landing folder                       │
│  ┌───────────────────────────────────────────┐ │
│  │ Landing Page                              │ │
│  │ Pricing                                   │ │
│  │ Docs                                      │ │
│  │ Blog (future)                             │ │
│  ├───────────────────────────────────────────┤ │
│  │ Stripe Integration:                       │ │
│  │ - Checkout flow                           │ │
│  │ - Payment processing                      │ │
│  │ - License generation ← licenseGeneration  │ │
│  │ - Email delivery                          │ │
│  │ ├─ After payment:                         │ │
│  │ │  1. Generate: AMOEBA-V1-XXXX...        │ │
│  │ │  2. Email to customer                   │ │
│  │ │  3. Store in database (Vercel Postgres)│ │
│  │ └─ Customer gets license instantly ✅     │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↓
              User downloads Amoeba
                      ↓
┌─────────────────────────────────────────────────┐
│    User's Infrastructure (Self-Hosted)          │
│  Their server → Amoeba product code             │
│  ┌───────────────────────────────────────────┐ │
│  │ Amoeba Platform                           │ │
│  │ - Dashboard                               │ │
│  │ - CLI                                     │ │
│  │ - Services                                │ │
│  │ - Database (their PostgreSQL/SQLite)     │ │
│  │ - Their data                              │ │
│  │ - NO marketing code                       │ │
│  │ - NO payment processing                   │ │
│  │ ├─ License activation:                    │ │
│  │ │  1. User enters: AMOEBA-V1-XXXX...     │ │
│  │ │  2. Validate locally (crypto check)    │ │
│  │ │  3. No internet required!              │ │
│  │ └─ Works offline forever ✅               │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Two systems. Zero overlap. Clean architecture.**

---

## 📁 REPOSITORY STRUCTURE

### Main Repo (github.com/quarkvibe/Ameoba_1.2):

```
Ameoba_1.2/
├── README.md                    # Product overview
├── LICENSE                      # MIT
├── package.json                 # Amoeba dependencies
│
├── server/                      # Amoeba backend
├── client/                      # Amoeba dashboard  
├── cli/                         # Amoeba CLI
├── shared/                      # Shared types
│
├── landing/                     # Marketing site (SEPARATE!)
│   ├── package.json            # Separate dependencies
│   ├── app/
│   │   ├── page.tsx           # Landing
│   │   ├── pricing/           # Pricing
│   │   ├── checkout/          # Stripe
│   │   └── api/
│   │       ├── stripe-webhook.ts      # Payment processing
│   │       └── generate-license.ts    # License creation
│   └── lib/
│       └── licenseGeneration.ts       # Crypto signing
│
└── .gitignore                  # See below

EVERYTHING in one repo ✅
But /landing deploys separately ✅
```

---

## 🔒 GITIGNORE STRATEGY

### Updated .gitignore:

```bash
# Product environment (user's instance)
.env
.env.local

# Marketing environment (your website)
landing/.env.local
landing/.env.production

# Secrets (NEVER commit!)
LICENSE_SECRET_KEY=*
STRIPE_SECRET_KEY=*

# Build outputs
dist/
landing/.next/
landing/out/

# Database (user's data)
*.db
amoeba.db

# Customer data (if you store locally)
customers/
licenses.json

# Development docs (keep local)
SESSION_*.md
*_REVIEW.md
*_ASSESSMENT.md
MARKETING_FOR_*.md
```

---

## 🌐 LANDING PAGE SETUP

### /landing Folder (Already Exists!):

**Current structure:**
```
landing/
├── app/
│   ├── page.tsx              # Landing page
│   ├── pricing/page.tsx      # Pricing
│   ├── checkout/
│   │   └── license/page.tsx  # Checkout flow
│   └── layout.tsx
├── components/
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── PricingPreview.tsx
│   └── Footer.tsx
└── package.json
```

**What to ADD:**

```typescript
// landing/app/api/stripe-webhook/route.ts

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { licenseGenerationService } from '@/lib/licenseGeneration';
import { sendEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Generate license
    const license = licenseGenerationService.generateLicense({
      tier: session.metadata?.tier || 'personal',
      issuedDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      features: ['all'],
      maxDevices: session.metadata?.tier === 'team' ? 20 : 5,
      customerId: session.customer as string,
    });
    
    // Store license (Vercel Postgres or your DB)
    await db.licenses.create({
      key: license,
      email: session.customer_email,
      tier: session.metadata?.tier,
      stripeSessionId: session.id,
    });
    
    // Email license to customer
    await sendEmail({
      to: session.customer_email!,
      subject: 'Your Amoeba License Key',
      html: `
        <h1>Welcome to Amoeba!</h1>
        <p>Thanks for your purchase. Here's your license key:</p>
        <pre style="background: #f4f4f4; padding: 15px; font-size: 18px;">
          ${license}
        </pre>
        <p><strong>To activate:</strong></p>
        <ol>
          <li>Install Amoeba: <code>git clone https://github.com/quarkvibe/Ameoba_1.2</code></li>
          <li>Run: <code>npm install && npm run dev</code></li>
          <li>Dashboard → License → Enter key above</li>
          <li>Start generating content!</li>
        </ol>
        <p>Questions? Reply to this email.</p>
      `,
    });
  }
  
  return new Response(JSON.stringify({ received: true }));
}
```

---

## 🚀 DEPLOYMENT STRATEGY

### Two Separate Deployments:

**Deployment 1: Marketing Site (Vercel)**
```bash
cd landing
vercel --prod

# Configures:
Domain: amoeba.io
Environment variables:
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- LICENSE_SECRET_KEY
- DATABASE_URL (for storing issued licenses)
- EMAIL_API_KEY (SendGrid for license emails)

Deploy time: 3 minutes
Cost: $0 (Vercel free tier)
```

**Deployment 2: Product Code (User Deploys)**
```bash
# Users clone YOUR repo:
git clone https://github.com/quarkvibe/Ameoba_1.2

# They deploy to THEIR infrastructure:
npm install
npm run build
npm start

# Their environment:
- DATABASE_URL (their database)
- ENCRYPTION_KEY (they generate)
- OPENAI_API_KEY (their key)
- TWILIO_* (their Twilio)

# They do NOT need:
- STRIPE keys (no payment processing)
- LICENSE_SECRET_KEY (no license generation)
- Your database access

Deploy: Their choice (AWS, Vercel, their server)
Cost: Their cost (infrastructure + API keys)
```

**Clean separation. No mixing.** ✅

---

## 🔐 SECRETS MANAGEMENT

### Your Secrets (Marketing Site):

```bash
# landing/.env.production (Vercel)

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# License generation
LICENSE_SECRET_KEY=abc123def456... # Generate once, keep forever

# Database (issued licenses)
DATABASE_URL=postgresql://vercel-postgres...

# Email (for sending licenses)
SENDGRID_API_KEY=SG.xxx

# Analytics (optional)
GOOGLE_ANALYTICS_ID=G-xxx
```

**NEVER commit these!** ✅

---

### User's Secrets (Their Amoeba):

```bash
# .env (in their deployment)

# Database (theirs)
DATABASE_URL=postgresql://their-db...
# OR
DATABASE_TYPE=sqlite  # Zero config!

# Encryption (they generate)
ENCRYPTION_KEY=abc123...

# AI (their keys)
OPENAI_API_KEY=sk-proj-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Email (optional, theirs)
SENDGRID_API_KEY=SG.their-key

# Phone (optional, theirs)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1...

# NO STRIPE KEYS (they don't process payments)
# NO LICENSE_SECRET_KEY (they don't generate licenses)
```

**They only need keys for services they use** ✅

---

## 🎨 LANDING PAGE STRUCTURE

### Already Exists in /landing!

```
landing/                    # Next.js marketing site
├── app/
│   ├── page.tsx           # Homepage (amoeba.io)
│   │   - Hero section
│   │   - SMS commands demo (video/gif)
│   │   - Feature showcase
│   │   - Pricing preview
│   │   - CTA: "Get Started"
│   │
│   ├── pricing/
│   │   └── page.tsx       # Full pricing (amoeba.io/pricing)
│   │       - Personal: $29/mo or $3.50
│   │       - Team: $79/mo
│   │       - Enterprise: Custom
│   │       - Feature comparison
│   │       - CTA: Stripe checkout
│   │
│   ├── checkout/
│   │   └── license/
│   │       └── page.tsx   # Checkout flow
│   │           - Stripe Elements
│   │           - Payment form
│   │           - After success: Generate + email license
│   │
│   ├── docs/              # Documentation site
│   │   ├── page.tsx      # Docs homepage
│   │   ├── getting-started/
│   │   ├── guides/
│   │   └── api/
│   │
│   └── api/              # Backend API routes
│       ├── stripe-webhook.ts      # NEW: Payment → License
│       ├── generate-license.ts    # NEW: Admin endpoint
│       └── check-license.ts       # NEW: Optional validation
│
├── components/
│   ├── Hero.tsx          # Landing hero
│   ├── Features.tsx      # Feature grid
│   ├── PricingPreview.tsx # Pricing cards
│   ├── SMSDemo.tsx       # NEW: SMS command demo
│   └── CodeExample.tsx   # NEW: Code snippets
│
├── lib/
│   ├── licenseGeneration.ts  # NEW: Copy from server/services/
│   └── stripe.ts             # Stripe client
│
└── public/
    ├── demo.gif          # SMS commands demo
    ├── dashboard.png     # Screenshots
    └── architecture.svg  # Diagrams
```

---

## 🚀 WHAT TO DEPLOY WHERE

### Marketing Site (amoeba.io) - Vercel:

**Contains:**
```
✅ Landing page (sells Amoeba)
✅ Pricing page (shows tiers)
✅ Checkout flow (Stripe)
✅ Documentation (public guides)
✅ Blog (future)
✅ License generation (after payment)
✅ Email sending (license delivery)
✅ Analytics (track visitors)
```

**Does NOT contain:**
```
❌ Amoeba services (those are in user's deployment)
❌ User data (that's in user's database)
❌ Dashboard UI (users run their own)
❌ CLI (users install via npm)
```

**Deploy:**
```bash
cd landing
vercel --prod

# Sets up:
# - Domain: amoeba.io
# - SSL: Automatic
# - CDN: Global
# - Cost: $0 (free tier)
```

---

### Product Code (User's Infrastructure):

**Users get via:**
```bash
# Option A: npm (future)
npm install -g amoeba-cli

# Option B: git clone
git clone https://github.com/quarkvibe/Ameoba_1.2
cd Ameoba_1.2
npm install
npm run dev
```

**Users deploy to:**
```
- AWS EC2 (their server)
- Vercel (their account)
- Railway (their account)
- Their local machine
- Their corporate servers
- Anywhere they want! ✅
```

**They do NOT get:**
```
❌ Your landing page
❌ Your Stripe keys
❌ Your license generation ability
❌ Your customer database
```

**They DO get:**
```
✅ Full Amoeba code
✅ All services
✅ Dashboard UI
✅ CLI
✅ Everything to run self-hosted
```

---

## 💳 PAYMENT FLOW

### Complete User Journey:

```
1. User visits amoeba.io
   ↓
2. Clicks "Get Amoeba - $29/month"
   ↓
3. Stripe checkout (on amoeba.io)
   Form: Name, Email, Card
   ↓
4. Payment succeeds
   ↓
5. Stripe webhook → amoeba.io/api/stripe-webhook
   ↓
6. Generate license:
   AMOEBA-V1-AB12-CD34-EF56-GH78-IJ90-KL12
   ↓
7. Email to customer:
   "Your license: AMOEBA-V1-..."
   "Install: git clone..."
   ↓
8. User installs Amoeba (on their server)
   git clone https://github.com/quarkvibe/Ameoba_1.2
   npm install
   npm run dev
   ↓
9. Dashboard → License → Paste key
   ↓
10. Amoeba validates (OFFLINE!)
    Parse → Verify signature → Check expiry
    ↓
11. ACTIVATED! ✅
    User can now use all features
    No further internet required
```

---

## 📦 WHAT'S IN GIT

### Main Repository (Public):

```
✅ Amoeba product code
✅ Landing page code (marketing)
✅ License validation (for users)
✅ Documentation
✅ README, canon docs

❌ .env files (secrets)
❌ Customer database
❌ Payment records
❌ Generated licenses
❌ User data
❌ Session notes
```

---

### Separate Database (Private):

**Your database (marketing site - Vercel Postgres):**
```sql
-- Store issued licenses
CREATE TABLE issued_licenses (
  id UUID PRIMARY KEY,
  license_key TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  tier TEXT NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Store customer info
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  licenses TEXT[], -- Array of license keys
  created_at TIMESTAMP DEFAULT NOW()
);
```

**User's database (their Amoeba):**
```sql
-- They create their own tables (via Drizzle migrations)
-- Their content, their credentials, their data
-- NOTHING about payment/licenses (except their activation)
```

---

## 🔑 LICENSE GENERATION ENDPOINTS

### On Marketing Site (amoeba.io):

```typescript
// landing/app/api/generate-license/route.ts

// ADMIN ONLY (protected endpoint)
export async function POST(req: Request) {
  // Verify admin auth
  const apiKey = req.headers.get('x-admin-key');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { email, tier, duration } = await req.json();
  
  // Generate license
  const license = licenseGenerationService.generateLicense({
    tier,
    issuedDate: new Date(),
    expiryDate: duration === 'lifetime' 
      ? undefined 
      : new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
    features: ['all'],
    maxDevices: tier === 'team' ? 20 : 5,
  });
  
  // Store
  await db.issuedLicenses.create({
    licenseKey: license,
    email,
    tier,
  });
  
  // Email
  await sendEmail(email, license);
  
  return Response.json({ license });
}
```

**Used by:**
- Stripe webhook (automatic)
- Admin panel (manual issues)
- Referral program (future)

---

### In Product (User's Amoeba):

**Users do NOT generate licenses.**  
**They only VALIDATE licenses (crypto check).**  
**No secret key in their code!**

---

## 💰 REVENUE INFRASTRUCTURE

### On Marketing Site:

**Stripe Integration:**
```typescript
// landing/app/checkout/page.tsx

import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Personal tier checkout
const { error } = await stripe.redirectToCheckout({
  lineItems: [{ price: 'price_personal_monthly', quantity: 1 }],
  mode: 'subscription',
  successUrl: 'https://amoeba.io/checkout/success',
  cancelUrl: 'https://amoeba.io/pricing',
});
```

**Price IDs (created in Stripe dashboard):**
```
Personal Monthly: price_personal_monthly ($29)
Personal Lifetime: price_personal_lifetime ($3.50)
Team Monthly: price_team_monthly ($79)
Enterprise: Contact sales (custom)
```

**Webhook handling:**
```
checkout.session.completed → Generate license
customer.subscription.updated → Handle renewals
customer.subscription.deleted → Handle cancellations
```

---

## 📊 WHAT GOES WHERE

### Marketing Repo (`amoeba.io`):

```
Vercel deployment
├── Landing page
├── Pricing page
├── Checkout flow
├── Stripe integration
├── License generation
├── Email sending
├── Customer database (issued licenses)
├── Analytics
└── Blog (future)

Tech: Next.js
Cost: $0 (Vercel free tier)
Purpose: Sell Amoeba, issue licenses
```

---

### Product Repo (`github.com/quarkvibe/Ameoba_1.2`):

```
Public GitHub repository
├── Amoeba platform code
├── License validation (NOT generation)
├── All services, routes, UI
├── CLI
├── Documentation
└── /landing folder (for reference/development)

Tech: TypeScript, Express, React
Cost: $0 (open source)
Purpose: The actual Amoeba platform users run
```

---

## 🎯 RECOMMENDED STRUCTURE

### Keep in Main Repo:

```
✅ /landing folder (so users see it's separate)
✅ All Amoeba code
✅ License validation (users need this)
✅ Documentation

But: /landing deploys separately to Vercel
```

### Separate Later (Optional):

```
If landing page grows large:
Create: github.com/quarkvibe/amoeba-website
Move: /landing folder there
Keep: Main repo for product only

But: Not urgent, /landing separation is enough
```

---

## 🚀 DEPLOYMENT COMMANDS

### Deploy Marketing:

```bash
cd landing
vercel --prod

# Vercel asks:
# "Link to existing project?" → Yes/New
# "What's your domain?" → amoeba.io
# Done! Live in 2 minutes.
```

### Deploy Product (Example - User's Choice):

```bash
# User's server:
git clone https://github.com/quarkvibe/Ameoba_1.2
cd Ameoba_1.2
npm install
npm run build
pm2 start dist/index.js --name amoeba

# Their deployment, their infrastructure
```

---

## ✅ SUMMARY

**Your Question:** "How to structure marketing vs product? Separate repos? Gitignore?"

**Answer:**

**One Repo, Two Systems:**
- `/landing` = Marketing site (deploys to Vercel at amoeba.io)
- `/server`, `/client`, `/cli` = Product (users deploy to their infrastructure)

**Gitignore:**
- All secrets (.env files)
- Customer data
- Generated licenses
- Session notes
- Working documents

**Deployment:**
- Marketing: You deploy to Vercel (amoeba.io)
- Product: Users deploy to their infrastructure

**Payment:**
- Stripe on marketing site
- Generate licenses after payment
- Email license to user
- User activates in their Amoeba (offline validation)

**Current State:**
- ✅ /landing folder exists (ready for Vercel)
- ✅ License generation service created
- ✅ Gitignore configured
- ⏳ Need: Stripe webhook in /landing
- ⏳ Need: Email template
- ⏳ Need: Deploy /landing to Vercel

**Time to Complete:** 3-4 hours

**This is the RIGHT architecture!** ✅

---

**Made with clean architectural separation**  
**By QuarkVibe Inc.**  
**Marketing ≠ Product** 🎯

