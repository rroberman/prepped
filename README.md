# Prepped

An AI-powered mock interview platform that actually does its homework on you. Upload your CV and a job link — five AI agents analyze the company, audit your resume, find your weak spots, and build an interviewer that pressure-tests exactly where you'll get challenged.

This is not a generic "tell me about yourself" chatbot. The interviewer knows the company's tech stack, has read your CV, and has a strategy for exposing your gaps.

## How It Works

```
Upload CV + Job URL
        │
        ▼
┌─────────────────────────────────────────┐
│         5-Agent Analysis Pipeline       │
│                                         │
│  Wave 1: Scout ────── Profiler          │
│            │              │             │
│            ▼              ▼             │
│  Wave 2:     Auditor                    │
│                │                        │
│                ▼                        │
│  Wave 3: Strategist ── Coach            │
└─────────────────────────────────────────┘
        │
        ▼
  Mock Interview (streaming, 5 phases)
        │
        ▼
  Hiring Committee Report
```

**The Scout** scrapes the job posting, company site, and engineering blog to understand what they actually use and care about.

**The Profiler** reads your CV like a skeptical hiring manager — spotting red flags, title inflation, and gaps.

**The Auditor** cross-references your CV against the job requirements to find your danger zones.

**The Strategist** builds the interviewer's game plan — who they are, where to focus, when to push back.

**The Coach** prepares you with talking points, stories to practice, and strategies for handling your weak spots.

Then you do the interview. The AI interviewer follows the Strategist's plan, adapts to your answers, and challenges you where it matters. Afterward, a Hiring Committee report tells you whether you'd get hired — and why.

## Features

- **Multi-agent analysis** — five specialized agents work in parallel waves
- **Realistic interviews** — the interviewer has a persona, follows a strategy, and pushes back on weak answers
- **Three difficulty levels** — Friendly (practice), Realistic (standard), Tough (FAANG-level)
- **Five interview phases** — warmup, technical deep dive, danger zones, system design, closing
- **Hiring committee report** — hire/no-hire decision with per-question feedback, technical gaps, and recommendations
- **Voice mode** — speak your answers with browser speech recognition, hear responses via browser TTS (free) or OpenAI TTS (natural voice)
- **Multi-language voice** — supports English, Hebrew, Arabic, Spanish, French, German, Russian, Chinese, Japanese
- **Token usage tracking** — see tokens, TTS characters, model info, and estimated cost per session
- **Session history** — all sessions persist locally with aggregated cost summary
- **PDF export** — save your report as a PDF
- **Multi-LLM support** — works with OpenAI, Anthropic, Google Gemini, OpenRouter, or local models via Ollama
- **Zero setup database** — SQLite, no external services needed
- **Fully local** — your CV and data stay on your machine

## Quick Start

```bash
# Clone
git clone https://github.com/rroberman/prepped.git
cd prepped

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local and add your API key

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a CV (PDF), paste a job URL, and go.

## LLM Providers

Set `LLM_PROVIDER` in `.env.local` to choose your provider:

| Provider | Env Var | Models |
|----------|---------|--------|
| **OpenAI** (default) | `OPENAI_API_KEY` | gpt-4o, gpt-4o-mini |
| **Anthropic** | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514, claude-haiku-4-5-20251001 |
| **Google Gemini** | `GEMINI_API_KEY` | gemini-2.5-flash, gemini-2.5-pro |
| **OpenRouter** | `OPENROUTER_API_KEY` | Any model via OpenRouter |
| **Ollama** (local) | `OLLAMA_BASE_URL` | llama3, mistral, etc. |

```bash
# Example: use Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Example: use local Ollama
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **framer-motion**
- **SQLite** via better-sqlite3
- **cheerio** for web scraping
- **pdf-parse** for CV parsing

## Project Structure

```
src/
  app/                          # Pages + API routes
    api/
      sessions/                 # Create, list, delete sessions
      analysis/[sessionId]/     # SSE stream for agent pipeline
      interview/[sessionId]/    # Start, message, end interview
      report/[sessionId]/       # Fetch report
    session/[sessionId]/        # Dashboard, interview, report pages
  lib/
    ai/
      llm-client.ts             # Multi-provider LLM abstraction
      agents/                   # Scout, Profiler, Auditor, Strategist, Coach
      interviewer.ts            # Interview response generation
      report-generator.ts       # Hiring committee report
    db/                         # SQLite schema + queries
    scraper/                    # Job posting + company scraping
  types/index.ts                # All TypeScript interfaces
  hooks/                        # React hooks for streaming + chat
  components/                   # UI components
```

## How the Interview Works

1. **Warmup** (2 questions) — background, motivation for the role
2. **Technical Deep Dive** (3 questions) — specific, implementation-level questions on skills from your CV
3. **Danger Zones** (3 questions) — pressure-testing the gaps the Auditor found
4. **System Design** (2 questions) — architecture problem related to the company's domain
5. **Closing** (1 question) — final assessment

The interviewer sticks to what's in the job posting and your CV. It won't ask about technologies that aren't in the job requirements.

## Contributing

Contributions welcome. Some areas that could use help:

- **Better scraping** — many job sites block scrapers or render with JS
- **More LLM providers** — AWS Bedrock, Azure OpenAI, Groq, etc.
- **Interview customization** — adjustable length, focus areas
- **i18n** — UI translations (the interview itself already adapts to the candidate's language)

## License

MIT
