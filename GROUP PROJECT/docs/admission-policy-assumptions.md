# Admission Policy Assumptions & Configuration Defaults

## 1. Academic Configuration
- **Default Academic Year**: 2026-2027 (Active Admission Window open).
- **Default Institution**: "Apex Institute of Engineering & Technology" (Code: `AIET-2026`).
- **Timezone**: `Asia/Kolkata` (UTC stored at rest, rendered in IST).
- **Currency**: INR (Paise stored as integers to prevent floating-point rounding errors).

## 2. Reservation & Quotas (Institution Configurable)
- `GENERAL` (Open Merit / Unreserved - 50%)
- `OBC` (Other Backward Classes - 27%, requiring Non-Creamy Layer certificate)
- `SC` (Scheduled Caste - 15%, requiring Caste certificate)
- `ST` (Scheduled Tribe - 7.5%, requiring Caste certificate)
- `EWS` (Economically Weaker Section - 10%, requiring Income & Asset certificate)

## 3. Merit Tie-Breaking Sequence (Deterministic AST)
1. Higher Qualifying Exam Percentage (12th / Diploma).
2. Higher Mathematics / Core Subject marks.
3. Older Applicant Date of Birth (Senior candidate preferred).
4. Earlier submission timestamp as ultimate deterministic tie-breaker.

## 4. Concurrency & Allocation
- Seat pools enforce: `heldCount + confirmedCount <= capacity`.
- Overbooking is strictly prevented via transactional update checks.
- Seat holds expire after 48 hours if payment is not initiated.
