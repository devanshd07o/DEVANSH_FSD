# Canonical Data Model & Relational Specifications

## 1. Entity Relational Diagram (ERD)

```mermaid
erDiagram
  Institution ||--o{ AcademicYear : conducts
  Institution ||--o{ Program : offers
  Institution ||--o{ UserRole : assigns
  Institution ||--o{ Application : receives
  Institution ||--o{ Enrollment : registers
  Institution ||--o{ FeeSchedule : sets

  User ||--o{ UserRole : possesses
  User ||--o| ApplicantProfile : has
  User ||--o{ Application : submits
  User ||--o{ ScrutinyAssignment : assigned
  User ||--o{ ScrutinyReview : reviews
  User ||--o{ Notification : receives
  User ||--o{ AuditLog : audits

  Program ||--o{ AdmissionTrack : contains
  Program ||--o{ SeatPool : allocates

  AdmissionTrack ||--o{ AdmissionWindow : publishes
  AdmissionTrack ||--o{ AdmissionRound : schedules
  AdmissionTrack ||--o{ RequiredDocumentType : specifies
  AdmissionTrack ||--o{ Application : targets

  ReservationCategory ||--o{ SeatPool : partitions

  Application ||--o{ ApplicationRevision : versioned
  Application ||--o{ Document : stores
  Application ||--o{ Defect : receives
  Application ||--o{ ScrutinyReview : reviewed
  Application ||--o{ AllotmentOffer : offered
  Application ||--o{ PaymentOrder : pays
  Application ||--o| Enrollment : formalizes

  ApplicationRevision ||--o{ AcademicRecord : details
  ApplicationRevision ||--o{ CategoryClaim : claims

  AdmissionRound ||--o{ MeritRun : computes
  AdmissionRound ||--o{ SeatAllocationRun : runs
  AdmissionRound ||--o{ AllotmentOffer : issues

  SeatAllocationRun ||--o{ AllotmentOffer : plans
  SeatPool ||--o{ AllotmentOffer : holds

  AllotmentOffer ||--o{ PaymentOrder : bills
  AllotmentOffer ||--o| Enrollment : transitions

  PaymentOrder ||--o{ PaymentTransaction : captures

  Enrollment ||--o{ GeneratedDocument : issues
```

## 2. Integrity & Database Constraints
1. **Seat Invariant**: Every `SeatPool` row strictly enforces `0 <= heldCount + confirmedCount <= capacity`.
2. **Deterministic Tie-Breaking**: `(meritRunId, applicationId)` unique constraint prevents duplicate rankings.
3. **Optimistic Locking**: `version` counter on `Application`, `SeatPool`, and `AllotmentOffer` prevents concurrent overwrite conflicts.
4. **Idempotent Enrollment**: `(applicationId)` and `(offerId)` are strictly unique on `Enrollment`. Repeated enrollment calls return the existing record.
5. **Private Storage**: Storage keys are randomized SHA-256 hashes stored in private directories; never exposed via unauthenticated public routes.
