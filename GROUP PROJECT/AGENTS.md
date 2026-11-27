# ANTIGRAVITY ADMISSION PORTAL — ENGINEERING & ARCHITECTURE CONTRACT

## 1. Operating Rules
- Strictly follow the Master Specification at `C:\Users\devan\Downloads\ANTIGRAVITY_ADMISSION_PORTAL_MASTER_SPEC.md`.
- No decorative AI slop: no generic purple/indigo hero gradients, no heavy frosted glass (`backdrop-blur`), no floating badges, no gratuitous animations.
- Calm, authoritative Indian academic institutional design: restrained navy (`#1B365D`), subtle surfaces (`#F8FAFC`, `#FFFFFF`), crisp 1px borders (`#E2E8F0`), legible typography with tabular numbers for ranks, scores, percentages, and currencies.
- Strict server-side authorization: client UI state is never trusted. Every mutation verifies role, ownership, window, and lifecycle state.
- Transactional integrity: seat allocation, payment status transitions, and enrollment numbering must be atomic with optimistic/pessimistic lock semantics.
- No unhandled exceptions or silent failures: all external inputs validated at the boundary with Zod.

## 2. Directory Layout
- `src/app/`: Next.js App Router pages and API handlers.
- `src/components/`: Reusable accessible UI components (AppShell, Button, Table, Modal, StatusBadge, etc.).
- `src/server/`: Pure domain services, database client, auth, storage adapters, and payment engines.
- `src/lib/`: Typed utilities, formatting, and shared constants.
- `prisma/`: Prisma schema and database migrations.
- `scripts/`: Seed data and test verification scripts.
- `docs/`: Architecture documentation, ADRs, state machines, API contracts, threat model, and test matrix.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
