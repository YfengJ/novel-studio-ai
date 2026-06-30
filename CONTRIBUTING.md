# Contributing

Thanks for helping improve Novel Studio AI. This project is local-first, so please keep privacy and reproducibility at the center of every change.

## Development

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Before opening a pull request, run:

```bash
npm test
npx tsc --noEmit
npm run build
```

## Privacy Rules

Do not commit or paste:

- `.env.local` or real API keys
- SQLite files under `data/`
- private manuscript text
- local planning notes or personal paths
- raw generation logs that may contain secrets

## Architecture Notes

- Pages and components should call local API routes, not OpenAI directly.
- AI calls belong under `src/lib/ai/*`.
- Structured model output must use Zod validation.
- Drafts must not update canon memory.
- Accepted chapters are the boundary for writing scenes, character states, relation triples, timeline events, and memory chunks.
