# Amoeba Architecture

**Simple, practical design. No over-engineering.**

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT INTERFACES                        │
│                                                             │
│  React Dashboard  │  SMS Commands  │  CLI  │  API Client  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    HTTP API LAYER (Express)                 │
│                                                             │
│  Auth │ Rate Limiting │ Validation │ Error Handling        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC (Services)                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Content    │  │ Data Sources │  │   Delivery   │     │
│  │  Generation  │  │   Fetching   │  │ Multi-channel│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Scheduling  │  │    Review    │  │  AI Agent    │     │
│  │    (Cron)    │  │    Queue     │  │   Console    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Drizzle ORM)                 │
│                                                             │
│  PostgreSQL (Production)  │  SQLite (Development)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               EXTERNAL INTEGRATIONS (BYOK)                  │
│                                                             │
│  OpenAI │ Anthropic │ Twilio │ SendGrid │ Stripe          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
server/
├── index.ts                  # Server startup
├── db.ts                     # Database connection
├── storage.ts                # Data access layer
├── routes.ts                 # Main route registration
│
├── routes/                   # HTTP endpoints (17 modules)
│   ├── agent.ts              # AI assistant
│   ├── content.ts            # Generated content
│   ├── templates.ts          # Content templates
│   ├── dataSources.ts        # Data sources
│   ├── outputs.ts            # Output channels
│   ├── schedules.ts          # Scheduled jobs
│   ├── reviews.ts            # Review queue
│   ├── credentials.ts        # BYOK credentials
│   ├── smsCommands.ts        # SMS control
│   ├── health.ts             # Health checks
│   └── ...                   # Supporting routes
│
├── services/                 # Business logic (19 services)
│   ├── contentGenerationService.ts  # AI generation
│   ├── dataSourceService.ts         # Data fetching
│   ├── deliveryService.ts           # Multi-channel delivery
│   ├── cronService.ts               # Scheduling
│   ├── reviewQueueService.ts        # Review workflow
│   ├── aiAgent.ts                   # AI assistant
│   ├── smsService.ts                # SMS delivery
│   ├── voiceService.ts              # Voice calls
│   ├── socialMediaService.ts        # Social posting
│   └── ...                          # Supporting services
│
├── middleware/               # Request processing
│   ├── errorHandler.ts       # Error handling
│   ├── rateLimiter.ts        # Rate limiting
│   └── validation.ts         # Request validation
│
└── storage/                  # Database adapters
    ├── IStorage.ts           # Storage interface
    ├── PostgresAdapter.ts    # PostgreSQL
    └── SQLiteAdapter.ts      # SQLite

client/
├── src/
│   ├── components/
│   │   ├── dashboard/        # Dashboard UI (35 components)
│   │   └── ui/               # Reusable UI (48 components)
│   ├── pages/                # Main pages
│   ├── hooks/                # React hooks
│   └── contexts/             # React contexts

shared/
└── schema.ts                 # Database schema (single source of truth)
```

---

## 🔌 Core Services Explained

### 1. Content Generation Service
**Purpose**: Generate content with AI

**Flow**:
```
Template + Data Source → AI Provider → Quality Check → Content
```

**Supports**:
- OpenAI (GPT-4, GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Opus)
- Cohere
- Ollama (local, FREE!)

### 2. Data Source Service
**Purpose**: Fetch data from external sources

**Supports**:
- RSS feeds
- JSON APIs
- Web scraping (with auth)
- Static data files

**Flow**:
```
Fetch → Parse → Transform → Inject into template variables
```

### 3. Delivery Service
**Purpose**: Deliver content via multiple channels

**Channels**:
- Email (SendGrid, AWS SES)
- SMS (Twilio)
- Voice (Twilio TTS)
- Webhooks (POST to any URL)
- Social Media (Twitter, LinkedIn, etc.)
- API (store for retrieval)

**Flow**:
```
Content → Format for channel → Deliver → Track status
```

### 4. Cron Service
**Purpose**: Schedule automated generation

**Features**:
- Cron expression support
- Timezone handling
- Next run calculation
- Execution history

### 5. Review Queue Service
**Purpose**: Human approval workflow

**Features**:
- Pending items queue
- Auto-approval rules
- Bulk operations
- Audit trail

### 6. AI Agent Service
**Purpose**: Natural language control & assistance

**Current**:
- Understand commands
- Execute system operations
- Provide suggestions

**Future** (to be added):
- Modify Amoeba's code
- Add new features
- Fix bugs
- Generate integrations

---

## 🗄️ Database Schema

### Core Tables (11)
1. **users** - User accounts
2. **contentTemplates** - AI generation instructions
3. **dataSources** - External data sources
4. **outputChannels** - Delivery channels
5. **scheduledJobs** - Cron automation
6. **generatedContent** - Content history
7. **templateDataSources** - Template ↔ Source links
8. **templateOutputChannels** - Template ↔ Output links
9. **distributionRules** - Conditional routing
10. **aiCredentials** - BYOK AI provider keys (encrypted)
11. **emailServiceCredentials** - BYOK email keys (encrypted)
12. **phoneServiceCredentials** - BYOK phone keys (encrypted)

### Supporting Tables (8)
- **licenses** - License management
- **subscriptions** - Subscription tracking
- **stripeCustomers** - Stripe integration
- **payments** - Payment history
- **apiKeys** - API access keys
- **webhooks** - Webhook configurations
- **integrationLogs** - Integration monitoring
- **agentConversations** - AI agent chat history

---

## 🔄 Data Flow Examples

### Example 1: Generate & Deliver Content

```
1. User creates template
   ↓
2. (Optional) Adds data source
   ↓
3. (Optional) Schedules with cron
   ↓
4. System fetches data from source
   ↓
5. AI generates content
   ↓
6. Quality check (score 0-100)
   ↓
7. (Optional) Human reviews and approves
   ↓
8. Deliver via output channels
   ↓
9. Track delivery status
   ↓
10. Store in content history
```

### Example 2: SMS Command Control

```
1. User texts "generate newsletter"
   ↓
2. SMS received via Twilio webhook
   ↓
3. smsCommandService authenticates sender
   ↓
4. Parses command ("generate newsletter")
   ↓
5. Finds newsletter template
   ↓
6. Triggers content generation
   ↓
7. AI generates content
   ↓
8. Delivers via configured channels
   ↓
9. Replies to user: "✅ Done! Q: 92/100"
```

### Example 3: Scheduled Automation

```
1. User creates scheduled job
   ↓
2. cronService calculates next run
   ↓
3. At scheduled time, cronService triggers job
   ↓
4. Fetches template and data source
   ↓
5. Generates content
   ↓
6. Delivers automatically
   ↓
7. Updates job history
   ↓
8. Calculates next run
```

---

## 🔐 Security Architecture

### Encryption
- **At Rest**: All API keys encrypted with AES-256-GCM
- **In Transit**: HTTPS for all API calls
- **In Memory**: Decrypted only when needed, immediately cleared

### Authentication
- **Dashboard**: Replit Auth (OAuth)
- **API**: API key or session-based
- **SMS**: Phone number whitelist
- **CLI**: Local config file

### Rate Limiting
- **Generous**: 100 req/min for reads
- **Standard**: 30 req/min for writes
- **Strict**: 10 req/min for generation

---

## 📊 Performance Characteristics

### Response Times (Target)
- Health check: < 10ms
- List operations: < 50ms
- Create operations: < 100ms
- AI generation: 2-10 seconds (depends on AI provider)
- Delivery: 1-5 seconds per channel

### Scalability
- **SQLite**: Good for 1-10 users, < 1M records
- **PostgreSQL**: Scales to millions of records
- **Horizontal**: Can run multiple instances (disable cron on replicas)

### Resource Usage
- **Memory**: 100-500MB typical
- **CPU**: Low (< 5%) except during AI generation
- **Storage**: ~1KB per generated content item

---

## 🧪 Testing Strategy

### Unit Tests
- Each service tested independently
- Mock external dependencies
- Test business logic

### Integration Tests
- Test full workflows
- Use test database
- Verify multi-service interactions

### E2E Tests
- Test user workflows
- Verify UI functionality
- Test API endpoints

**Target**: 80% code coverage

---

## 🚀 Deployment Options

### Development (SQLite)
```bash
npm run dev
# Automatic SQLite database
# Works immediately
```

### Production (PostgreSQL)
```bash
# Set environment variables
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=<generated>

# Run
npm run build
npm start
```

### Docker
```bash
docker-compose up -d
# PostgreSQL + Amoeba in containers
```

### Cloud Deployment
- **Vercel/Netlify**: Frontend only, API elsewhere
- **AWS/DigitalOcean**: Full stack deployment
- **Heroku/Render**: Simple deployment

---

## 🔧 Development Guidelines

### Code Organization
- **Routes**: HTTP handling only, no business logic
- **Services**: All business logic, pure functions
- **Storage**: Database queries only, no business logic
- **Middleware**: Reusable, composable, no side effects

### Naming Conventions
- Files: camelCase.ts
- Services: SomethingService class
- Routes: register*Routes functions
- Database: snake_case tables

### Dependencies
- Keep minimal
- Prefer standard libraries
- Document why each dependency exists
- Review before adding new ones

### TypeScript
- Strict mode enabled
- No `any` types (except where necessary)
- Explicit return types
- Interfaces for all external contracts

---

## 📈 Scaling Considerations

### Single Instance (Most Users)
- SQLite or PostgreSQL
- Handles 1-100 users
- 1-1000 generations/day
- < $50/month costs

### Multi-Instance (Growth)
- PostgreSQL with connection pooling
- Multiple app servers behind load balancer
- Shared database
- Disable cron on replicas (run on single instance)
- Redis for session storage (optional)

### Enterprise (Large Scale)
- PostgreSQL with read replicas
- Horizontal scaling with K8s
- CDN for frontend
- Separate worker instances for generation
- Redis for caching

---

## 🎯 Design Decisions

### Why Express?
- Battle-tested
- Large ecosystem
- Simple and clear
- Easy to understand

### Why Drizzle ORM?
- Type-safe
- Minimal abstraction
- SQL-like syntax
- Great TypeScript support

### Why React?
- Industry standard
- Large ecosystem
- Good developer experience
- Easy to hire for

### Why PostgreSQL?
- Excellent JSON support
- ACID compliance
- Mature and stable
- Free tier available (Neon.tech)

### Why Not MongoDB/etc?
- PostgreSQL does everything we need
- Simpler to have one database type
- Can always add adapters later if needed

---

## 🔮 Future Enhancements

### Short-term
- Enhanced AI agent with code modification
- More delivery channels (Discord, Slack)
- Template marketplace

### Long-term
- Plugin system
- Multi-tenancy support
- Advanced analytics
- A/B testing

**But only if users actually need them.**  
**Simplicity first.**

---

## 📝 Principles

1. **Simple over complex** - Clear code beats clever code
2. **Explicit over implicit** - No magic, no surprises
3. **Standard over custom** - Use proven patterns
4. **Maintainable over perfect** - Code that others can understand
5. **Practical over theoretical** - Build what users actually need

---

**Architecture is not about being clever. It's about being clear.**

That's Amoeba's architecture. Simple. Practical. Works.

🦠
