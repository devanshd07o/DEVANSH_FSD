# Quality Assurance & Verification Test Matrix

## 1. Automated Test Scenarios & Results

| Test ID | Category | Scenario / Assertion | Status | Execution Time |
|---|---|---|---|---|
| `TEST-01` | Application Domain | Draft creation, idempotency, duplicate prevention | `PASS` | 128ms |
| `TEST-02` | Concurrency & Data | Seat capacity invariant: `held + confirmed <= capacity` | `PASS` | 1ms |
| `TEST-03` | Merit Engine | Deterministic ranking & tie-break precedence by DOB | `PASS` | 35ms |
| `TEST-04` | Financial Integrity | Payment order idempotency & monotonic status | `PASS` | 22ms |
| `TEST-05` | Security & Privacy | Public QR verification leaks zero PII | `PASS` | 3ms |

## 2. Interactive Journey Acceptance Checks
- **Applicant A (Aarav Sharma)**: Verified application, confirmed seat offer, paid admission fee (₹85,000), enrolled with unique number `AIET/2026/CSE/0001`, and authentic QR verification token.
- **Applicant B (Priya Patel)**: Open defect on Class 12 Marksheet with 3-day countdown, targeted replacement upload desk, locks non-defective fields, bumps to Revision 2.
- **Applicant C (Rohan Verma)**: Multi-step wizard with live debounced auto-save, draft resume, and submission acknowledgment.
- **Faculty Reviewer (Prof. Rajesh Kulkarni)**: Split-screen scrutiny desk (left: data, right: document viewer), defect modal, approve button.
- **Admissions Officer (Dr. Vikramaditya Sen)**: Real-time funnel metrics, grouped seat matrix, deterministic merit engine preview & publish, allocation simulator.
- **Accounts & Finance (Sunita Deshmukh)**: Financial reconciliation table, transaction ID audit, printable official receipts.
- **Academic Registrar (Col. Sanjeev Nair)**: Enrollment issuance desk, sequential permanent enrollment numbering.
- **Public Visitor**: Scans QR code or visits `/verify/[token]` and sees authenticated minimal details with zero PII leakage.
