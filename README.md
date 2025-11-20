# 🦠 Amoeba - AI Content Platform

[![npm version](https://badge.fury.io/js/amoeba-cli.svg)](https://www.npmjs.com/package/amoeba-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AI content generation platform with multi-channel delivery, SMS control, and BYOK.**

Generate content with AI, deliver via email/SMS/voice/webhooks, control from your phone. Self-hosted with complete cost control.

```bash
npm install -g amoeba-cli
amoeba init
amoeba generate "daily tech summary from HackerNews" --deliver sms,email
```

**Self-hosted. BYOK. Three interfaces. Simple.**

---

## ⚡ What Makes Amoeba Different

### 1. Control From Your Phone 📱

```
Text "status" → "✅ All healthy. 3 jobs running"
Text "generate newsletter" → "🤖 Done! Delivered via email"
Text "approve all" → "✅ Approved 3 items"
```

**Manage your entire platform from any phone. No app required.**

### 2. BYOK (Bring Your Own Keys) 🔑

- AI: Your OpenAI/Anthropic/Ollama keys
- Email: Your SendGrid/SES keys
- SMS: Your Twilio keys
- **You control costs. No middleman fees.**

Typical cost: **$0.001-0.01 per generation** (paid directly to providers)

### 3. Multi-Channel Delivery 📡

Generate once, deliver everywhere:
- **Email** (SendGrid, AWS SES)
- **SMS** (Twilio)
- **Voice** (Text-to-speech calls)
- **Webhooks** (POST to any URL)
- **Social Media** (Twitter, LinkedIn, etc.)
- **API** (Retrieve programmatically)

### 4. Three Control Interfaces 💻

- **Dashboard** - Beautiful UI, anyone can use
- **CLI** - 60+ commands, scriptable, automatable
- **SMS** - Text to control from anywhere

**Choose your interface. They're all powerful.**

---

## 🚀 Quick Start (5 Minutes)

### Install & Run

```bash
git clone https://github.com/quarkvibe/ameoba_v2.0.git
cd ameoba_v2.0
npm install
npm run dev
```

Visit **http://localhost:5000**

**That's it.** SQLite database auto-created. Add your OpenAI key. Start generating.

---

## 📖 Core Features

### AI Content Generation
- **Multi-Provider**: OpenAI, Anthropic, Cohere, Ollama (local, FREE!)
- **Templates**: Reusable AI instructions
- **Variables**: Dynamic content with data sources
- **Quality Scoring**: 0-100 for every output

### Data Sources
Fetch data from anywhere:
- **RSS Feeds** - News, blogs, podcasts
- **APIs** - Any JSON API
- **Websites** - Web scraping with auth
- **Static Data** - CSV, JSON files

### Automation
- **Scheduled Jobs**: Cron-based automation
- **Data Refresh**: Auto-update data sources
- **Batch Generation**: Multiple outputs at once
- **Conditional Delivery**: Rules-based routing

### Quality & Review
- **Review Queue**: Approve before delivery
- **Auto-Approval Rules**: "Quality > 80" → auto-approve
- **Safety Checks**: PII detection, content filtering
- **Audit Trail**: Track all changes

### Delivery Channels
- **Email**: HTML/text with attachments
- **SMS**: 160-char optimized
- **Voice**: TTS with pauses
- **Webhooks**: JSON payloads
- **Social Media**: Auto-posting
- **Files**: S3, local storage

---

## 💰 Pricing

**Platform**: FREE (Open Source, MIT License)

**Your Infrastructure**:
- Dev: $0 (SQLite is free)
- Production: $0-10/month (Neon.tech/Supabase free tier)

**Your API Costs** (pay providers directly):
- AI: $0.001-0.01 per generation (OpenAI/Anthropic)
- Email: $0.0001 per email (SendGrid)
- SMS: $0.0075 per message (Twilio)
- Voice: $0.013 per minute (Twilio)

**Amoeba License** (optional):
- Self-Host: $3.50 one-time (lifetime)
- Pro: $29/month (includes support)

**Total monthly cost for most users**: Under $50

---

## 🎯 Use Cases

### For Agencies
- Generate client content with quality control
- Multi-client management
- Review workflow before delivery
- Cost control (clients' API keys)
- White-label ready

### For Developers
- Embed in your applications (CLI/API)
- CI/CD integration
- Headless deployment
- Custom integrations
- Open source (audit, modify, contribute)

### For Businesses
- Multi-channel communication
- Quality control (every output scored)
- Compliance ready (audit trail, review workflow)
- Cost effective (BYOK)
- Scalable (SQLite → PostgreSQL)

### For Content Teams
- Content generation with templates
- Quality scoring
- Review queue (approve before publish)
- Multi-format output
- Scheduled automation

---

## 🏗️ Architecture

**Simple, clean design:**

```
┌─────────────────────────────────────────┐
│         USER INTERFACES                 │
│  Dashboard │ SMS │ CLI │ API            │
├─────────────────────────────────────────┤
│         CORE SERVICES                   │
│  • Content Generation (AI)              │
│  • Data Sources (Fetch)                 │
│  • Delivery (Multi-channel)             │
│  • Scheduling (Cron)                    │
│  • Review Queue                         │
│  • AI Agent Console                     │
├─────────────────────────────────────────┤
│         DATA LAYER                      │
│  PostgreSQL │ SQLite                    │
└─────────────────────────────────────────┘
```

**No over-engineering. Just what works.**

---

## 📚 Documentation

- **[START_HERE.md](START_HERE.md)** - 5-minute orientation
- **[SIMPLE_VISION.md](SIMPLE_VISION.md)** - Product vision
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture
- **[docs/guides/](docs/guides/)** - Setup guides
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute

---

## 🌟 Why Amoeba?

| Feature | Amoeba | Zapier | Make | n8n |
|---------|--------|--------|------|-----|
| **AI Generation** | ✅ Native | ❌ | ❌ | ⚠️ Limited |
| **SMS Commands** | ✅ Unique! | ❌ | ❌ | ❌ |
| **BYOK Everything** | ✅ All services | ❌ | ❌ | ⚠️ Partial |
| **Self-Hosted** | ✅ | ❌ | ❌ | ✅ |
| **Open Source** | ✅ MIT | ❌ | ❌ | ✅ Apache |
| **Multi-Channel** | ✅ 6+ channels | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| **Review Queue** | ✅ | ❌ | ❌ | ❌ |
| **Quality Scoring** | ✅ | ❌ | ❌ | ❌ |
| **Price/month** | **$0-29** | $20-599 | $9-299 | $20-500 |

**Amoeba is the ONLY platform with SMS commands, BYOK, quality pipeline, AND complete self-hosting.**

---

## 🚀 Examples

### Generate & Deliver
```bash
# Via CLI
amoeba generate newsletter --deliver email,sms

# Via SMS
Text: "generate newsletter"
Reply: "🤖 Done! Q: 92/100. Delivered!"

# Via API
POST /api/content/generate
{
  "templateId": "newsletter",
  "deliverVia": ["email", "sms"]
}

# Via Dashboard
Click → Generate → Review → Approve → Deliver
```

### Scheduled Automation
```bash
# Daily at 9am
amoeba schedule create \
  --template newsletter \
  --cron "0 9 * * *" \
  --deliver email

# Runs automatically every day
```

### Data-Driven Content
```bash
# Create template with data source
amoeba template create "Tech News Summary" \
  --prompt "Summarize these articles" \
  --data-source hackernews-rss

# AI fetches latest articles, generates summary, delivers
```

---

## 🛠️ Technical Stack

**Backend:**
- Node.js 18+ / TypeScript
- Express.js
- Drizzle ORM
- PostgreSQL or SQLite

**Frontend:**
- React 18 + TypeScript
- Radix UI
- Tailwind CSS
- Wouter (routing)

**Integrations:**
- OpenAI, Anthropic, Cohere, Ollama (AI)
- Twilio (SMS & voice)
- SendGrid, AWS SES (email)
- Stripe (payments)

---

## 🆘 Support

- **Documentation**: [/docs](/docs)
- **Issues**: [GitHub Issues](https://github.com/quarkvibe/ameoba_v2.0/issues)
- **Discussions**: [GitHub Discussions](https://github.com/quarkvibe/ameoba_v2.0/discussions)
- **Email**: support@quarkvibe.com

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

**Areas We Need Help:**
- Additional AI provider integrations
- More delivery channels (Discord, Slack, Teams)
- Database adapters (MySQL, MongoDB)
- Template marketplace
- Documentation improvements

---

## 🗺️ Roadmap

### ✅ Phase 1: Foundation (COMPLETE)
- Multi-provider AI generation
- Multi-channel delivery
- SMS command interface
- Quality pipeline & review workflow
- BYOK credentials
- Universal storage (SQLite + PostgreSQL)
- CLI (60+ commands)
- Licensing system

### 🔄 Phase 2: Current (In Progress)
- Fix remaining TypeScript errors
- Enhance AI agent console
- Add code modification capabilities (human-approved)
- Performance optimization
- Production deployment guides

### 📅 Phase 3: Enhancement (Month 2)
- Template marketplace
- More delivery channels (Discord, Slack)
- Plugin system
- Community templates
- Advanced analytics

### 🔮 Phase 4: Ecosystem (Month 3+)
- Community marketplace
- Revenue sharing (70/30 split)
- Developer certification
- Multi-instance orchestration

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2025 QuarkVibe Inc.

---

## 🙏 Acknowledgments

- OpenAI, Anthropic for AI APIs
- Twilio for SMS & voice infrastructure
- Neon.tech, Supabase for database hosting
- Radix UI for component primitives
- Drizzle Team for excellent ORM
- The open-source community

---

## ⭐ Star History

If you find Amoeba useful, give it a star! It helps others discover the project.

[![Star History Chart](https://api.star-history.com/svg?repos=quarkvibe/ameoba_v2.0&type=Date)](https://star-history.com/#quarkvibe/ameoba_v2.0&Date)

---

**Made with ❤️ by QuarkVibe Inc.**

**Give it a ⭐️ if you like it!**

---

## 🔥 Get Started Now

```bash
git clone https://github.com/quarkvibe/ameoba_v2.0.git
cd ameoba_v2.0
npm install
npm run dev
```

**3 commands. 30 seconds. You're generating AI content.**

**Simple. Powerful. Yours.** 🦠🚀
