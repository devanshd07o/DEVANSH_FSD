# FSD Project System Design Document — Multi-College Admission Portal

- **Live Deployment:** https://devansh-fsd.onrender.com
- **Repository:** https://github.com/devanshd07o/DEVANSH_FSD (`GROUP PROJECT/`)
- **Stack:** Vite 6 + React 19 (`client/`) · Express 4 + Prisma 7 + SQLite/LibSQL (`server/`)

## 1. Architecture Overview
- **Frontend (`client/src/`):** React Router SPA divided into Public/Auth pages, Student Portal (9 routes), and Staff/College Portal (10 routes) sharing centralized UI primitives (`UI.jsx`, `Layout.jsx`) and fetch wrapper (`lib/api.js`).
- **Backend (`server/src/`):**
  - `auth/session.ts` & `auth/password.ts`: HS256 JWT HTTP-only cookies bound to `institutionId`, PBKDF2-SHA512 passwords.
  - `middleware/auth.ts`: `requireUser`, `hasRole`, `checkUpload` (5 MB PDF/JPG/PNG guard), and `fallbackPdf`.
  - `routes/auth.ts`, `routes/student.ts`, `routes/staff.ts`: REST endpoints mounted under `/api/v1`, with SPA static fallback in `index.ts`.
  - `modules/`: Pure domain services (`InstitutionService`, `ApplicationService`, `ScrutinyService`, `MeritService`, `AllocationService`, `PaymentService`, `EnrollmentService`).

## 2. Multi-College Tenant Isolation
- Every college (`Institution`) isolates its academic years, programs, seat pools, staff roles, applications, offers, payments, enrollments, and audit logs by `institutionId`.
- Login verifies `institutionId` + `portalTab` (`student | staff | college`), rejecting cross-college attempts with `403`.
- New colleges self-onboard via `/register-college` (`InstitutionService.registerCollege`).

## 3. Core Invariants & State Machines
- **Application Lifecycle:** `DRAFT -> SUBMITTED -> UNDER_REVIEW -> CORRECTION_REQUIRED -> RESUBMITTED -> VERIFIED` with immutable submitted revisions and optimistic version locks.
- **Seat Pool Invariant:** Atomic transactions guarantee `0 <= heldCount + confirmedCount <= capacity`.
- **Payments & Enrollment:** Idempotent payment orders, monotonic `PAID` status, HMAC-verified webhook deduplication, single unique enrollment number per confirmed offer, and PII-safe public QR verification (`/verify/:token`).

## 4. Verification
- Verified `16/16` domain & concurrency tests (`npm test`), production Vite build (`npm run build`), and live E2E multi-college flows on both localhost and `https://devansh-fsd.onrender.com`.
