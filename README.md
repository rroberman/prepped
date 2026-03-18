# Prepped

An AI-powered mock interview platform that actually does its homework on you. Upload your CV and a job link — five AI agents analyze the company, audit your resume, find your weak spots, and build an interviewer that pressure-tests exactly where you'll get challenged.

This is not a generic "tell me about yourself" chatbot. The interviewer knows the company's tech stack, has read your CV, and has a strategy for exposing your gaps.

## How It Works

Five agents run in waves before your interview begins:

1. **Scout** scrapes the job posting, company site, and engineering blog to understand what they actually use and care about
2. **Profiler** reads your CV like a skeptical hiring manager — spotting red flags, title inflation, and gaps
3. **Auditor** cross-references your CV against the job requirements to find your danger zones
4. **Strategist** builds the interviewer's game plan — who they are, where to focus, when to push back
5. **Coach** prepares you with talking points, stories to practice, and strategies for handling your weak spots

Then the interview. Five phases — warmup, technical deep dive, danger zones, system design, and closing. The interviewer follows the Strategist's plan, adapts to your answers, and only asks about what's actually in the job posting and your CV.

Afterward, a Hiring Committee report gives you a hire/no-hire decision with per-question feedback, technical gaps, and recommendations.

## Features

**Interview**
- Three difficulty levels — Friendly (practice), Realistic (standard), Tough (FAANG-level)
- Voice mode with browser speech recognition and TTS (free) or OpenAI TTS (natural voice)
- Multi-language voice — English, Hebrew, Arabic, Spanish, French, German, Russian, Chinese, Japanese

**Cross-Session Insights**
- Sessions auto-grouped by CV and company — or manually labeled
- Track recurring danger zones, consistent strengths, and resolved gaps across interviews
- Skill coverage map — which skills got tested vs. identified but never probed
- Difficulty progression — see when you're ready to move up
- Side-by-side session comparison

**Infrastructure**
- Works with OpenAI, Anthropic, Google Gemini, OpenRouter, or local models via Ollama
- SQLite database — no external services needed
- Fully local — your CV and data stay on your machine
- Token usage tracking with estimated cost per session

## Quick Start

```bash
git clone https://github.com/rroberman/prepped.git
cd prepped
npm install
cp .env.example .env.local
# Edit .env.local and add your API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a CV (PDF), paste a job URL, and go.

## LLM Providers

Set `LLM_PROVIDER` in `.env.local`:

| Provider | Env Var | Models |
|----------|---------|--------|
| **OpenAI** (default) | `OPENAI_API_KEY` | gpt-4o, gpt-4o-mini |
| **Anthropic** | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514, claude-haiku-4-5-20251001 |
| **Google Gemini** | `GEMINI_API_KEY` | gemini-2.5-flash, gemini-2.5-pro |
| **OpenRouter** | `OPENROUTER_API_KEY` | Any model via OpenRouter |
| **Ollama** (local) | `OLLAMA_BASE_URL` | llama3, mistral, etc. |

## Contributing

Contributions welcome. Some areas that could use help:

- **Better scraping** — many job sites block scrapers or render with JS
- **More LLM providers** — AWS Bedrock, Azure OpenAI, Groq, etc.
- **Interview customization** — adjustable length, focus areas
- **i18n** — UI translations (the interview itself already adapts to the candidate's language)

## License

MIT
