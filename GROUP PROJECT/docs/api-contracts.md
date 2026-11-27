# API Contracts & Endpoint Specifications

## 1. Authentication & Session Namespace (`/api/v1/auth`)
- `POST /api/v1/auth/login`
  - Body: `{ email: string, password: string }`
  - Response: Set-Cookie `antigravity_session` (HTTP-only, HMAC signed), `{ success: true, redirectUrl, user }`
- `POST /api/v1/auth/register`
  - Body: `{ name, email, phone, password }`
  - Response: Set-Cookie `antigravity_session`, `{ success: true, redirectUrl }`
- `POST /api/v1/auth/switch-demo`
  - Body: `{ email: string }`
  - Fast persona switching for authorized evaluation personas.
- `POST /api/v1/auth/logout`
  - Clears `antigravity_session` cookie.

## 2. Applications Namespace (`/api/v1/applications`)
- `PATCH /api/v1/applications/[id]/draft`
  - Body: `{ data: SaveDraftInput, expectedVersion?: number }`
  - Response: `{ success: true, version: number }`
- `POST /api/v1/applications/[id]/submit`
  - Freezes Revision 1, validates mandatory documents, transitions to `SUBMITTED`.
- `POST /api/v1/applications/[id]/corrections`
  - FormData: `replacementDocTypeId`, `file`, `studentNotes`
  - Bumps to Revision 2, resolves open defects, transitions to `RESUBMITTED`.
- `POST /api/v1/applications/[id]/documents`
  - FormData: `file`, `documentTypeId`
  - Uploads to private storage, creates `Document` row with status `READY`.

## 3. Scrutiny Namespace (`/api/v1/scrutiny`)
- `POST /api/v1/scrutiny/[id]/claim`
  - Atomic reviewer assignment lock. Transitions to `UNDER_REVIEW`.
- `POST /api/v1/scrutiny/[id]/defects`
  - Body: `{ reviewerNotes, defects: Array<{ documentId, reasonCode, studentComment, dueDays }> }`
  - Transitions to `CORRECTION_REQUIRED`, enqueues outbox notification to student.
- `POST /api/v1/scrutiny/[id]/approve`
  - Validates zero open defects, transitions to `VERIFIED`.

## 4. Admissions, Merit & Allocation (`/api/v1/admissions`)
- `POST /api/v1/admissions/merit/preview` -> Computes deterministic ranks + tie-break AST + SHA-256 snapshot hash.
- `POST /api/v1/admissions/merit/publish` -> Formally publishes approved merit list.
- `POST /api/v1/admissions/allocations/preview` -> Simulates quota allotment against published merit.
- `POST /api/v1/admissions/allocations/publish` -> Atomically issues seat offers (`heldCount + 1`).

## 5. Payments & Registrar (`/api/v1/payments`, `/api/v1/registrar`)
- `POST /api/v1/payments/orders` -> Calculates fee from server DB `FeeSchedule`, creates `PaymentOrder`.
- `POST /api/v1/payments/confirm` -> Verifies payment gateway signature, shifts seat from `held` to `confirmed`.
- `POST /api/v1/registrar/enrollments` -> Idempotently allocates unique enrollment number, generates QR verification token.
