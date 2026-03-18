# Prepped

AI-powered mock interview platform. Upload a CV + job URL, get analyzed by 5 AI agents, do a realistic mock interview, receive a hiring committee report.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (also serves as type check)
- `npx tsc --noEmit` — type check without building
- `npm run lint` — ESLint
- `npx tsx scripts/seed-session.ts` — create a mock session to test interview without running agents

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling**: Tailwind CSS 4, framer-motion for animations
- **Database**: SQLite via better-sqlite3 (file: `interview-studio.db`)
- **AI**: Multi-provider — OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama (via `llm-client.ts`)
- **TTS**: Browser SpeechSynthesis (free) or OpenAI TTS API (paid)
- **STT**: Browser SpeechRecognition API (free)
- **PDF parsing**: pdf-parse
- **Scraping**: cheerio
- **IDs**: nanoid
- **Path alias**: `@/*` → `./src/*`

## Architecture

### Core Flow

Upload (CV + job URL) → 5-Agent Analysis Pipeline → Mock Interview → Hiring Committee Report

### Agent Pipeline (orchestrator.ts)

Runs in waves with dependencies:
1. **Wave 1** (parallel): Scout (scrape company) + Profiler (analyze CV)
2. **Wave 2**: Auditor (cross-reference CV vs job requirements) — needs Scout + Profiler
3. **Wave 3** (parallel): Strategist (build interview plan) + Coach (prep candidate) — needs Auditor

Scout failure = everything downstream fails. Profiler failure = continue with raw CV.

### Interview

- 5 phases: warmup → technical_deep_dive → danger_zones → system_design → closing
- 3 difficulty levels: friendly / realistic / tough (stored on interview record)
- Streaming responses via SSE
- Interviewer persona/tone driven by Strategist output
- Optional voice mode: STT (browser) + TTS (browser or OpenAI)

### Voice Mode

- **STT**: Browser `SpeechRecognition` API with configurable language (en, he, ar, es, fr, de, ru, zh, ja)
- **TTS**: Two modes — "Browser (Free)" via `SpeechSynthesis`, "Natural (OpenAI)" via `/api/tts` route
- **Hands-free flow**: `continuous=false` — user speaks, silence auto-sends, interviewer responds with voice, auto-starts listening again
- **Availability**: Voice toggle shown if browser supports SpeechRecognition. OpenAI TTS option shown only when OpenAI is configured (checked via `HEAD /api/tts`)
- **TTS usage tracking**: Characters tracked in `tts_usage` table, included in cost estimates

### Cross-Session Insights

Sessions are auto-grouped by `cv_hash` (SHA-256 of CV text) and `company_domain` (parsed from job URL). Users can override with a manual `group_label`. Group IDs are composite strings: `auto:<domain>:<hash>` or `label:<label>`, URL-encoded for routes.

- **Insights page** (`/insights/[groupId]`): performance trends, recurring danger zones, consistent strengths, resolved gaps, skill coverage map, question-level comparison by phase, difficulty progression
- **History page**: grouped view with expandable cards, toggle to flat list
- All insights derived from existing agent/report data — no new AI calls
- Aggregation logic in `src/lib/insights/` module, separate from DB queries
- Best outcome ranked by `ReportData.decision`: `strong_hire` > `hire` > `lean_hire` > `lean_no_hire` > `no_hire`

### Key Directories

```
src/
  app/                          # Next.js pages + API routes
    api/
      sessions/                 # CRUD for sessions
      analysis/[sessionId]/     # SSE stream for agent pipeline
      interview/[sessionId]/    # Interview start, message, end
      report/[sessionId]/       # Fetch report + token usage (generates on-demand)
      tts/                      # OpenAI TTS proxy (POST) + availability check (HEAD)
      config/                   # Returns provider + model info
    session/[sessionId]/        # Dashboard, interview, report pages
    history/                    # Past sessions list with grouped view + cost summary
    insights/[groupId]/         # Cross-session insights page
  lib/
    ai/
      llm-client.ts             # Public API: jsonCompletion, chatCompletion, streamChatCompletion
      providers/
        openai.ts               # OpenAI/Gemini/Ollama/OpenRouter provider (OpenAI-compatible)
        anthropic.ts            # Anthropic provider
      agents/                   # scout, profiler, auditor, strategist, coach, orchestrator
      interviewer.ts            # Interview response generation with difficulty
      report-generator.ts       # Hiring committee report
    insights/                    # Cross-session grouping, aggregation, comparison
    db/
      connection.ts             # SQLite init + migrations (incl. tts_usage, session groups)
      queries.ts                # All DB queries (incl. TTS usage, group queries)
    scraper/job-scraper.ts      # Job posting + company context scraping
    pdf/parser.ts               # PDF text extraction
  types/
    index.ts                    # All TypeScript interfaces
    web-speech.d.ts             # Browser SpeechRecognition type declarations
  hooks/                        # useAnalysisStream, useInterviewChat, useFileUpload, useVoiceMode
  components/
    ui/                         # Button, Card, Badge, Input, Progress, Textarea
    dashboard/                  # AgentCard, DangerZonesPanel, CoachPrepPanel, DifficultySelector
    interview/                  # ChatMessage, ChatInput, PhaseIndicator, VoiceControls
    report/                     # QuestionCard
    landing/                    # UploadForm
```

## Conventions

- **DB migrations**: Added as ALTER TABLE statements in `migrateTokenColumns()` or new `migrate*()` functions in `connection.ts`, wrapped in try/catch for idempotency
- **Agent return type**: All agents return `{ data: T, usage: TokenUsage }` — the orchestrator destructures and stores tokens separately
- **LLM provider abstraction**: `llm-client.ts` exports `jsonCompletion`, `chatCompletion`, `streamChatCompletion`. Provider chosen via `LLM_PROVIDER` env var. OpenAI provider also backs Gemini, Ollama, and OpenRouter via baseURL override. Streaming returns normalized `StreamChunk { content, usage? }` — not provider-specific types
- **Adding a new LLM provider**: Create a file in `providers/` implementing the `LLMProvider` interface, add a case in `getProvider()` in `llm-client.ts`
- **SSE pattern**: Analysis route uses `ReadableStream` + `TextEncoder` to push `data: JSON\n\n` events. Client uses `EventSource`
- **Interview streaming**: Chat route uses `ReadableStream` with chunked `data:` events (delta, done, complete, error). Client reads via `ReadableStream.getReader()`
- **Optimistic UI**: Interview chat adds candidate messages immediately, then streams interviewer response in-place
- **Error handling in agents**: 3 retries with exponential backoff in each provider. Pipeline uses `Promise.allSettled` for parallel waves
- **Prompt discipline**: Scout and Auditor prompts are strict about only using explicitly stated information from job postings — no inference from company reputation. Interviewer only references technologies listed in job requirements
- **Report generation**: On-demand in the report GET route — navigating to the report page triggers generation if no report exists yet

## Important Rules

- Agent prompts must NOT hallucinate requirements. Only reference what's explicitly in the scraped job posting text
- Interviewer behavior varies by difficulty level — the `DIFFICULTY_INSTRUCTIONS` block in interviewer.ts controls this
- All token usage (prompt + completion + TTS characters) is tracked per-agent, per-message, per-report, and per-TTS call, aggregated via `getSessionTokenUsage()`
- Database is a single SQLite file — `deleteSession()` cascades through all related tables (including `tts_usage`) in a transaction
- The UI is dark-mode only (hardcoded in globals.css)
- Cost estimates are shown for known models (gpt-4o, gpt-4o-mini, claude-sonnet-4, claude-haiku-4.5, tts-1) — unknown models show tokens only
