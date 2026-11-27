# ADR 0001: Modular Monolith Architecture with Server-Driven Domain Modules

## Status
Accepted

## Context
The College Admission Process Automation system manages complex multi-role workflows: Applicant registration, multi-step application with auto-save and defect correction, faculty scrutiny with split-screen review, merit list computation and tie-breaking, quota & seat matrix allocation, payment gateways, idempotent webhooks, and registrar enrollment issuance.
Microservices introduce network latency, distributed transaction complexity, two-phase commits, and high operational overhead.

## Decision
We adopt a **Modular Monolith** architecture:
- Next.js 16 App Router fullstack application.
- TypeScript strict mode throughout.
- Single unified transactional database with row-level locks and ACID properties.
- Clear domain boundaries in `src/server/modules/*` (Auth, Applications, Scrutiny, Merit, Allocation, Payments, Enrollment, Notifications, Audit).
- UI layers interact exclusively through validated Server Actions and thin Route Handlers that call pure domain services.

## Consequences
- ACID transactions across seat allocation, payment reconciliation, and enrollment numbers are guaranteed.
- Easy local deployment, instant deterministic tests, and single-container operational simplicity.
