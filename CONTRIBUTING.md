# Contributing to Prepped

Thanks for your interest in contributing! This guide will help you get set up and submit your first PR.

## Setup

```bash
git clone https://github.com/rroberman/prepped.git
cd prepped
npm install
cp .env.example .env.local
```

Add your API key to `.env.local` (see [LLM Providers](README.md#llm-providers) for options).

## Development

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (also type-checks)
npm run lint         # ESLint
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
```

### Try it without an API key

You can seed a demo session with pre-generated data to explore the UI without needing an LLM provider:

```bash
npm run seed
```

This creates a complete session with agent analysis, interview messages, and a hiring committee report. Open the dev server and navigate to the session from the history page.

## Project Structure

```
src/
  app/           # Next.js pages + API routes
  lib/
    ai/          # LLM client, agents, interviewer, report generator
    db/          # SQLite connection + queries
    scraper/     # Job posting scraper
    pdf/         # CV parser
  types/         # TypeScript interfaces
  hooks/         # React hooks
  components/    # UI components
```

## Testing

Tests live next to the code they test in `__tests__/` directories. We use Vitest.

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npx vitest run path/to/test # Run a specific test file
```

When adding new functionality, include tests for the critical paths. Tests for DB queries use an in-memory SQLite database — see `src/lib/db/__tests__/queries.test.ts` for the pattern.

## Submitting a PR

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm test` and `npm run lint` — CI will run both on your PR
4. Open a pull request with a clear description of what changed and why

Keep PRs focused on a single change. If you're fixing a bug and want to refactor nearby code, split them into separate PRs.

## Areas That Could Use Help

- **Better scraping** — many job sites block scrapers or render with JS
- **More LLM providers** — AWS Bedrock, Azure OpenAI, Groq, etc.
- **Interview customization** — adjustable length, focus areas
- **i18n** — UI translations

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling (dark mode only)
- Path alias: `@/*` maps to `./src/*`
- Agent prompts must only reference information explicitly found in the job posting — no inference from company reputation
