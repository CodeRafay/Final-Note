# Product Requirements Document (PRD)

## App Name: Final Note

## Final Note: Verified Dead Man’s Switch Web Application

---

## 1. Purpose & Vision

## Final Note is a secure, verification-based dead man’s switch web application. It allows users to prepare private messages that are only released to chosen recipients if the user is confirmed deceased or permanently incapacitated (optionally via trusted human verifiers). The system prioritizes accuracy, safety, auditability, and irreversible-action protection, and avoids automatic triggering based solely on inactivity.

## Home Page Content (for Coding Agent)

The home page of Final Note should introduce the app and explain its purpose and workflow to new users. It should include content similar to the following, adapted to match the app's features:

### Why?

Life is unpredictable. If something happens to you, there may be things you wish you had told your loved ones, friends, or colleagues—final thoughts, instructions, or even practical matters like pet care. Final Note helps you ensure your important messages are delivered, even if you can’t send them yourself.

### How?

With Final Note, you write private emails and choose who should receive them. These messages are securely stored and only sent if you fail to check in after a set period. You’ll receive periodic reminders to confirm you’re okay. If you don’t respond, and (optionally) if your chosen verifiers confirm your status, your messages are sent to your recipients. Think of it as an “electronic will” for your final notes.

### When?

You control the check-in intervals—ranging from days to years. By default, Final Note will remind you at set intervals after your last check-in. If you don’t respond to any reminders, your messages will be sent after the final waiting period. Free accounts may have limited options for interval customization.

---

## 2. Core Design Principles

1. **No automatic execution without human verification**
2. **Irreversible actions require multiple safeguards**
3. **Correctness > convenience**
4. **Every critical action must be auditable**
5. **Partial failure must never cause unintended execution**

---

## 3. Tech Stack (Locked)

### Frontend

- Next.js (App Router)
- TypeScript (strict)
- Tailwind CSS
- Server Components where applicable
- Home page introducing Final Note and its workflow

### Backend

- Next.js Route Handlers (API)
- Node.js runtime
- Supabase server client

### Database

- **Supabase PostgreSQL**
- SQL migrations
- Row Level Security (RLS)
- ENUMs and constraints for state safety

### Authentication

- Supabase Auth (email/password)
- Session-based JWT
- Users must create an account to use Final Note

### Email

- **MailerSend (mandatory)**
- Transactional email via REST API
- Free tier (~3,000 emails/month)

### Deployment

- **Vercel**
- Vercel Cron Jobs
- Environment variables via Vercel dashboard

---

## 4. User Roles

### 4.1 User (Switch Owner)

- Creates and configures dead man’s switches
- Sets check-in frequency
- Optionally appoints verifiers (user is asked if they want verifiers; if yes, user specifies the number of verifiers)
- Defines recipients and messages
- Can cancel/reset while alive

### 4.2 Verifier (Optional)

- Trusted third party (optional)
- Confirms or denies death/incapacitation (if verifiers are used)
- Cannot view message content
- Actions are logged and legally acknowledged

### 4.3 Admin (System)

- Emergency override only
- Can pause/cancel execution
- All actions logged

---

## 5. Core Functional Requirements

---

## 5A. Verifier Optionality

- When creating a switch, the user is asked if they want to use verifiers for confirmation.
- If the user chooses YES, they specify the number of verifiers and the verification process applies as described.
- If the user chooses NO, the switch will trigger and messages will be sent directly after the grace period, without human verification.

---

## 6. Dead Man’s Switch Lifecycle (State Machine)

### States (ENUM)

- `ACTIVE`
- `OVERDUE`
- `GRACE_PERIOD`
- `PENDING_VERIFICATION` (only if verifiers are used)
- `VERIFIED` (only if verifiers are used)
- `EXECUTED`
- `CANCELED`
- `PAUSED` (admin only)

### Rules

- All state transitions must be explicit
- Invalid transitions must fail
- All transitions occur inside DB transactions
- Transitions are logged in audit logs

---

## 7. Check-In System

- User sets check-in interval (days)
- System sends reminder emails
- User checks in via dashboard or secure link
- Successful check-in resets timers

---

## 8. Grace Period

- Begins after missed check-in
- Multiple reminders sent
- Any check-in cancels overdue state

---

## 9. Verification Phase (Human Confirmation)

### Trigger

- Grace period expires without user response
- Only applies if verifiers are enabled for the switch

### Process (if verifiers are used)

1. Create verification request
2. Notify all verifiers via secure, expiring links
3. Collect verifier votes
4. Apply quorum logic

### Rules (if verifiers are used)

- Quorum-based confirmation (e.g. 2 of 3)
- **Any “alive” vote cancels verification**
- Verification expires after configurable window
- User check-in at any point cancels verification

### If verifiers are NOT used

- After grace period expires, the switch is executed and messages are sent directly to recipients without human verification.

---

## 10. Execution Phase

### Safeguards

- Final delay (e.g. 24 hours) after verification success
- User can still cancel during delay
- Once execution begins → irreversible

### Action (MVP)

- Send emails to recipients via MailerSend

---

## 11. Message & Recipient Model (Critical)

### Design Rule

> **Each recipient receives exactly one dedicated message.**

### Flow

- User adds recipients
- User writes a separate message per recipient
- Messages are encrypted and stored individually
- Verifiers never see message content

---

## 12. Email Delivery (MailerSend)

### Provider

- **MailerSend (mandatory)**

### Use Cases

- Check-in reminders
- Grace period warnings
- Verification requests
- Final execution messages

### Rules

- Server-side only
- One email per recipient
- Idempotent sends
- Partial failure allowed
- All attempts logged

---

## 13. Database Schema (Supabase / PostgreSQL)

### Core Tables

#### `users`

- id (uuid, PK)
- email
- created_at

#### `switches`

- id (uuid, PK)
- user_id (FK)
- status (ENUM)
- check_in_interval_days
- grace_period_days
- verification_window_days
- last_check_in_at
- next_check_in_due_at
- created_at

#### `verifiers`

- id (uuid, PK)
- switch_id (FK)
- email
- status (invited | accepted | revoked)

#### `verification_requests`

- id (uuid, PK)
- switch_id (FK)
- started_at
- expires_at
- required_confirmations

#### `verification_votes`

- id (uuid, PK)
- verification_request_id (FK)
- verifier_id (FK)
- vote (confirm | deny)
- voted_at
- ip_address

#### `recipients`

- id (uuid, PK)
- switch_id (FK)
- email
- created_at

#### `messages`

- id (uuid, PK)
- switch_id (FK)
- recipient_id (FK)
- encrypted_content
- created_at

#### `email_deliveries`

- id (uuid, PK)
- message_id (FK)
- provider ('mailersend')
- status (pending | sent | failed)
- provider_response (JSONB)
- attempted_at

#### `audit_logs` (append-only)

- id
- entity_type
- entity_id
- action
- metadata (JSONB)
- created_at

---

## 14. Security Requirements

- HTTPS everywhere
- Supabase RLS enforcing ownership
- Encrypted messages at rest
- Expiring, single-use verification links
- Immutable audit logs
- Rate limiting on all sensitive endpoints

---

## 15. Background Jobs & Cron

### Jobs

- Detect overdue switches
- Transition grace periods
- Trigger verification
- Handle verification expiry
- Execute final actions

### Implementation

- Vercel Cron Jobs
- Idempotent logic
- DB locks (`SELECT FOR UPDATE`)

---

## 16. Idempotency & Concurrency (Mandatory)

- Cron jobs may run multiple times
- Execution must never duplicate emails
- Use DB constraints + delivery logs
- All state transitions transactional

---

## 17. Failure & Disaster Handling

### Scenarios

- Email provider outage
- Partial delivery
- Supabase downtime
- Cron delays

### Required Behavior

- Never auto-retry forever
- Never silently fail
- Always log and surface errors
- Admin override available

---

## 18. Testing Requirements

### Unit Tests

- State transitions
- Quorum logic
- Encryption/decryption
- Idempotency checks

### Integration Tests

- Full lifecycle simulation
- Partial email failures
- Concurrent verifier votes
- User check-in during verification

### Security Tests

- RLS enforcement
- Token expiry
- Unauthorized access attempts

**Tools:** Vitest / Jest, Playwright (optional)

---

## 19. Documentation Requirements

### Mandatory Files

- `README.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `DEPLOYMENT.md`
- `CONTRIBUTING.md`

### README Must Include

- Overview
- Local setup
- Env vars
- Running tests
- Deployment steps

---

## 20. Deployment (Vercel + Supabase)

### Steps

1. Create Supabase project
2. Apply SQL migrations
3. Configure RLS
4. Configure MailerSend
5. Set Vercel environment variables
6. Deploy Next.js app
7. Enable cron jobs
8. Validate email delivery

---

## 21. Contribution Guidelines

- Tests required for all changes
- No direct DB mutations outside migrations
- Explicit state transitions only
- Clear commit messages

---

## 22. Success Criteria

- No execution without verification quorum (if verifiers are used)
- If no verifiers are used, execution occurs after grace period without human confirmation
- No duplicate email sends
- Complete audit trail
- Reproducible deployment
- System safe under failure

---

## 23. Final Instruction to Coding Agent

> This is a **safety-critical system**.
> If uncertain, **choose the path that prevents irreversible action**.
> Do not optimize away safeguards.
> The application name is Final Note. Use this name in all user-facing content and documentation. The home page must clearly explain the purpose, workflow, and value of Final Note as described above.

---
