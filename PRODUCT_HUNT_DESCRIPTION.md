# Product Hunt Launch Copy

## Tagline
AI agent platform you control from your phone. Text "generate newsletter" and it happens.

---

## Description

**Amoeba is different.**

Most AI platforms: Cloud-only, pay-per-use, black-box processing.

Amoeba: Self-hosted, BYOK (bring your own keys), with a 6-stage quality pipeline that actually checks what the AI generates.

**The weird feature:** You can control it by texting your server. Seriously.

Text your Twilio number: "status" → Get system health  
Text: "generate blog-post" → AI generates it  
Text: "approve all" → Clears review queue  

No app. No laptop. Just SMS to your server.

**Why this exists:** I needed an AI platform that:
- Doesn't lock me into their cloud
- Has actual quality control (not just raw AI output)
- Treats the CLI as a first-class interface (66 commands!)
- Costs what it actually costs (you pay APIs directly)
- Works on SQLite (no database server needed)

So I built it.

**What makes it technical:**

→ Cellular architecture (every service is independent)  
→ Universal storage (swap PostgreSQL ↔ SQLite via env var)  
→ Three interfaces (UI, CLI, SMS - all equal)  
→ 7 delivery channels (email, SMS, voice, webhook, API, file, social)  
→ Self-preservation (monitors health, auto-heals issues)  
→ Self-modifying (AI adds features with safety boundaries)  
→ Complete BYOK (your keys, your cost, we don't see them)  

**What makes it useful:**

→ Generate content with quality scores (0-100)  
→ Deliver via multiple channels (email + SMS + voice)  
→ Control from your phone (SMS commands)  
→ Run on one server (SQLite, no complex setup)  
→ Script everything (CLI, embeddable)  
→ Monitor websites (eBay, auctions, price tracking)  
→ Self-hosted (your data stays yours)  

**Current status:**
Core platform works. Advanced features (self-modification, worker spawning) are Phase 3. Launching core first, iterating monthly.

**Open source:** MIT licensed. Really. Fork it if you want.

**For whom:**
- Developers who want to embed AI in their apps
- Agencies managing client content with quality requirements
- Anyone tired of paying $500/month for what should be simple
- People who value self-hosting and data ownership
- Technical users who appreciate good architecture

**Pricing:** $29/month (or $3.50 one-time). Your OpenAI/Twilio/SendGrid costs on top (but you pay them directly).

**Made by:** QuarkVibe Inc. (small team, big ambitions)

---

## First Comment (Pin This)

**Tech Stack:** TypeScript, Express, React, Drizzle ORM, PostgreSQL/SQLite

**Architecture:** Cellular design - every service is an independent "organelle" that can be swapped without affecting others. Clean dependencies, zero circular references.

**Unique features:**
1. SMS command interface (text to control)
2. Quality pipeline (6-stage processing)
3. Native AI tools (fetch RSS, parse web, call APIs - no extra keys needed)
4. CLI parity (66 commands, embeddable)
5. Universal storage (swap databases with one env var)

**Things that are done:**
✅ AI generation (4 providers)
✅ Quality control (6-stage pipeline)
✅ Multi-channel delivery (7 channels)
✅ SMS commands
✅ CLI (full feature parity)
✅ Health monitoring
✅ Documentation

**Things in progress:**
⏳ Tests (need 80% coverage)
⏳ AI code modification (Phase 3)
⏳ Self-reproduction (Phase 3)

**Demo:** Setting up this week at demo.amoeba.io

**Questions I expect:**
- "Why SMS?" → Because I wanted to check my system without opening my laptop. Turns out it's really useful for on-call, emergencies, mobile-first scenarios.
- "Is this just another AI wrapper?" → No. Check the architecture doc. This is designed as a platform, not a wrapper.
- "BYOK means no revenue?" → No. Users pay for software ($29/mo), not usage. Better margins than markup models.
- "Self-hosted means no SaaS?" → We'll offer hosted version. But self-hosting is the primary use case.

Happy to answer technical questions!

---

## Media Kit

**Screenshots:** (Upload to Product Hunt)
1. Dashboard with traffic lights
2. SMS command conversation  
3. Quality pipeline visualization
4. CLI commands in terminal
5. Architecture diagram

**GIF/Video:** 
30-second demo showing SMS commands in action

**Logo:** Amoeba cellular icon

---

**Launch Day:** TBD (after tests complete)  
**Target:** Top 10 of the day  
**Unique Angle:** "First AI platform with SMS commands"  
**Technical Depth:** Architecture quality appeals to HN crowd

