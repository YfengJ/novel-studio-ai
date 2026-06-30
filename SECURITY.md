# Security Policy

Novel Studio AI is a local-first writing workbench. The app is designed so API keys can be provided through `.env.local` or browser `sessionStorage`, and keys should never be committed or pasted into GitHub issues.

## Supported Branch

Security fixes target the `main` branch.

## Reporting

Please do not open a public issue containing API keys, private manuscripts, local SQLite databases, or full generation logs with secrets. If you need to discuss a sensitive problem, open a minimal public issue that describes the affected area without secrets, then coordinate a private reproduction path with the maintainer.

## Local Data

The following paths are intentionally ignored by git:

- `.env.local`
- `.env.*.local`
- `data/`
- `.next/`
- `node_modules/`
- local planning or session notes
