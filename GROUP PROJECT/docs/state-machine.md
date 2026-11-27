# Business State Machines & Transitions

The application strictly models distinct orthogonal state machines instead of a single overloaded enum.

## 1. Application Lifecycle Machine
`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `CORRECTION_REQUIRED` → `RESUBMITTED` → `UNDER_REVIEW` → `VERIFIED`
Terminal states: `INELIGIBLE`, `REJECTED`, `WITHDRAWN`

| From State | Event | To State | Precondition | Side Effects |
|---|---|---|---|---|
| DRAFT | SUBMIT | SUBMITTED | Window open, mandatory fields present, required documents scanned & READY | Freeze revision 1, create acknowledgment log, assign to scrutiny queue |
| SUBMITTED | CLAIM | UNDER_REVIEW | Reviewer role present | Scrutiny assignment created atomically |
| UNDER_REVIEW | RAISE_DEFECT | CORRECTION_REQUIRED | At least 1 specific defect with reasonCode & due date | Outbox notification sent to student, fields unlocked selectively |
| CORRECTION_REQUIRED | RESUBMIT | RESUBMITTED | Current time <= defect dueAt, replacement documents verified | Revision bumped (e.g. rev 2 created), previous revision permanently frozen |
| RESUBMITTED | CLAIM | UNDER_REVIEW | Reviewer claims updated revision | Scrutiny desk shows revision diff |
| UNDER_REVIEW | APPROVE | VERIFIED | All open defects resolved, eligibility criteria met | Candidate enters merit pool eligible for seat allotment |

## 2. Allotment & Seat Offer Machine
`OFFERED` → `ACCEPTED` → `PAYMENT_PENDING` → `CONFIRMED`
Terminal states: `DECLINED`, `EXPIRED`, `CANCELLED`

- `OFFERED`: Seat pool increment `heldCount + 1`. Expiry timer initialized.
- `ACCEPTED`: Applicant confirms acceptance before `acceptBy`.
- `PAYMENT_PENDING`: Payment order initiated for admission fee.
- `CONFIRMED`: Verified payment transaction received. Seat transitions from `heldCount` to `confirmedCount`.
- `EXPIRED`: Scheduled job or access check marks offer expired, atomically releases `heldCount - 1`.

## 3. Payment State Machine
`CREATED` → `PENDING` → `PAID` / `FAILED` / `EXPIRED`
- Monotonic state: A late `FAILED` webhook CANNOT overwrite a `PAID` transaction.
- Webhook HMAC signature verified against raw body.
- Idempotent provider transaction deduplication.
