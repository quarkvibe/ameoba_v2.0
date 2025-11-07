# Show HN: Amoeba – AI platform you control from your phone (self-hosted, BYOK)

Hi HN, I'm the founder of QuarkVibe, and I've been building Amoeba for the past few months.

**What it is:** An AI agent platform that's actually self-hosted (for real, not "self-hosted with 20 Docker containers and a Kubernetes cluster").

**The weird part:** You can control it by texting your server. Like, literally send an SMS: "status" and get back "✅ All healthy." Text "generate newsletter" and it does it. No app, no laptop, just text messages.

**Why I built it:** I got tired of:
1. AI platforms with no quality control (they just return whatever GPT spits out)
2. Automation tools where the CLI is clearly an afterthought
3. "Self-hosted" platforms that still require you to use their cloud for anything important
4. Paying $500/month when the actual API calls cost $5

**What's different:**

**BYOK (for everything):** Your OpenAI keys, your Twilio account, your SendGrid. You pay providers directly. We just provide the software. Your costs: $0.0003 per AI generation, $0.0075 per SMS, $0.0001 per email. Our cost: $0. Your infrastructure: Self-hosted.

**Three interfaces (all equal):** Beautiful UI for point-and-click, 66 CLI commands for scripting/embedding, SMS for mobile control. Not "no-code." Not "code-only." Your choice.

**SQLite baseline:** No database server needed. File-based. Zero config. `npm run dev` just works. Want to scale later? Change DATABASE_TYPE=postgres in .env. Same code.

**Quality pipeline:** Every AI output gets: parsed → safety-checked → scored 0-100 → cleaned up → validated → optionally human-reviewed. Because in production, quality matters.

**Cellular architecture:** Every service is independent. Want to swap the email provider? Just change one service. Want to add Discord? Just add a new service. Clean dependencies, testable components.

**The unusual parts:**

**Self-preservation:** Monitors its own health every 30 seconds. Auto-fixes common issues (database reconnect, memory cleanup). Has circuit breakers for failing services. It wants to stay alive.

**Self-modification** (Phase 3): AI can add features via natural language. Safety boundary: AI CANNOT modify the code that lets it modify code. Prevents recursive self-modification. Human approval required.

**Self-reproduction** (Phase 3): For bulk tasks, it can spawn child workers (like cellular mitosis). 100 items sequentially = 5 minutes. 10 children in parallel = 30 seconds. Efficiency analysis built-in.

**Tech stack:** TypeScript, Express, Drizzle ORM, React, Radix UI, PostgreSQL/SQLite. Modern but not bleeding-edge. Boring technology that works.

**Current state:**
- Core platform: Works (generation, delivery, monitoring, CLI, UI)
- Advanced features: Architected, some implementation needed
- Tests: 0% (I know, I know - fixing this week)
- Production: Can deploy core now

**What I need help with:**
1. Testing (need to hit 80% coverage)
2. OAuth flows (social media, authenticated sites)
3. Production deployment feedback
4. "Does this architecture make sense?" validation

**Open source:** MIT licensed. Fork it, modify it, use it. The self-hosting is real - no phone-home, no license server, runs completely offline after setup.

**Pricing:** $29/month for the license (updates + support). Or $3.50 one-time if you just want the code. Your infrastructure, your API keys, your costs on top (but you pay providers directly, not us).

**Why show this now:** Getting feedback before launch. Is the SMS thing actually useful or just a gimmick? Is the cellular architecture over-engineered or appropriately designed? Would you actually use this?

**Roadmap:** Launch core platform in 2-3 weeks (after tests). Add self-modification in Month 2. Add reproduction in Month 2. Iterate based on what people actually need.

**Repo:** https://github.com/quarkvibe/Ameoba_1.2

**Demo:** Setting up demo.amoeba.io this week. For now, it's source code and README.

Happy to answer questions about the architecture, the design decisions, why I thought SMS commands were a good idea, or anything else.

---

**Built by:** QuarkVibe Inc.  
**License:** MIT  
**Status:** Pre-launch, seeking feedback  
**Seriously:** The SMS commands thing is real. I use it. It's weirdly useful.

