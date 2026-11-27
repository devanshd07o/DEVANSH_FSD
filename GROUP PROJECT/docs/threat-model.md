# Security Threat Model & Mitigations (OWASP ASVS 5.0 Aligned)

## 1. Identified Attack Vectors & Defensive Mitigations

| Threat | Attack Scenario | Defensive Implementation |
|---|---|---|
| **IDOR / BOLA** | Student changes URL to `/api/v1/applications/uuid-2` to inspect another applicant's grades/caste certificates. | Server-side ownership guard checks `session.user.id === application.applicantId` or active staff assignment with `scrutiny:review_assigned` permission. Returns 404/403. |
| **Privilege Escalation** | Client modifies token or cookie role field to `SUPER_ADMIN`. | Cryptographically signed HTTP-only session cookie (HMAC-SHA256) containing only the opaque userId. Active user roles & permissions are queried from the DB on every privileged transaction. |
| **Overbooking Race Condition** | Two students click "Accept Seat" on the last remaining seat in Computer Science concurrently. | Atomic transactional update: `UPDATE seat_pools SET held_count = held_count + 1 WHERE id = $id AND held_count + confirmed_count < capacity`. If affected rows != 1, transaction rolls back with `SEAT_UNAVAILABLE`. |
| **Tampered Correction Fields** | Student receives defect on "Marksheet" but attempts to change their Category from "GENERAL" to "ST" in the API payload. | Server validates `allowedFieldPaths` from active defects. Rejects modification of non-defective fields with 422 Unprocessable Entity. |
| **Payment Webhook Spoofing** | Attacker POSTs forged `payment.captured` event to `/api/v1/webhooks/payments/razorpay`. | Raw request body HMAC-SHA256 signature verification using secret key. Nonce/EventId replay deduplication. |
| **Malicious File Upload** | Attacker uploads an executable or HTML file renamed to `marksheet.pdf`. | Magic byte inspection, mime-type validation, sanitization of file name, private storage (never in `/public`), streamed through authorized proxy route. |
| **Public QR Data Leakage** | Scanning an admission letter QR reveals student Aadhaar, phone number, and marks. | Public verification endpoint returns ONLY minimal authenticity info: Document Type, Student Name, Program Name, Academic Year, and Status `AUTHENTIC` / `REVOKED`. Zero PII. |
