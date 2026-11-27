# Architecture & Module Specifications

## 1. System Overview
The Admission Portal is built as an enterprise-grade modular monolith supporting the complete student admissions lifecycle.

```mermaid
flowchart TD
  subgraph Client [Browser Interfaces]
    Student[Applicant Portal - Multi-Step & Correction Desk]
    Faculty[Faculty Scrutiny Desk - Split-Screen Review]
    Admin[Admin & Admissions Officer - Merit & Seat Matrix]
    Accounts[Accounts & Registrar - Reconciliation & Enrollment]
  end

  subgraph NextServer [Next.js 16 Server]
    Guard[Authentication, RBAC & Zod Boundary Validation]
    
    subgraph DomainServices [Domain Services Layer]
      AppSvc[Applications & Revisions Service]
      ScrutinySvc[Scrutiny & Defects Service]
      MeritSvc[Merit & Tie-Breaking Engine]
      SeatSvc[Seat Matrix & Concurrency Allocator]
      PaymentSvc[Payments & Webhook Reconciliation]
      EnrollSvc[Enrollment & QR Generation Service]
      AuditSvc[Audit & Outbox Logging Service]
    end
  end

  subgraph StorageLayer [Data & Storage]
    DB[(Prisma ORM Database)]
    Storage[(Private Object Storage / Local Dev Adapter)]
  end

  Student --> Guard
  Faculty --> Guard
  Admin --> Guard
  Accounts --> Guard

  Guard --> DomainServices
  DomainServices --> DB
  DomainServices --> Storage
```

## 2. Layering Rules
- **UI Components (`src/components/`, `src/app/`)**: Pure presentation, zero direct database access.
- **Server Actions & Route Handlers (`src/app/api/`)**: Authentication, permission checks, request parsing via Zod, delegating immediately to Domain Services.
- **Domain Services (`src/server/modules/`)**: Encapsulates all business rules, optimistic concurrency, and state transitions.
- **Data Access (`src/server/db/`)**: Prisma Client instance, transactional helpers.
- **Integrations (`src/server/integrations/`)**: Storage adapters, Mock/Razorpay payment gateway, email outbox.
