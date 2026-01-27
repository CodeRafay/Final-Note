# Architecture

This document describes the technical architecture of Final Note.

## System Overview

Final Note is a centralized dead man's switch application built with Next.js and PostgreSQL. The system prioritizes safety and correctness over convenience.

## Core Principles

1. **No automatic execution without proper safeguards**
2. **Irreversible actions require multiple confirmations**
3. **All critical actions are logged and auditable**
4. **Partial failures never cause unintended execution**
5. **Idempotent operations prevent duplicates**

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Strict mode enabled
- **Tailwind CSS**: Utility-first styling
- **Server Components**: Where applicable for performance

### Backend
- **Next.js API Routes**: RESTful API endpoints
- **Prisma ORM**: Type-safe database access
- **PostgreSQL**: Primary database with Row Level Security

### Authentication
- **JWT Sessions**: Secure token-based authentication
- **bcrypt**: Password hashing
- **HTTP-only Cookies**: Secure session storage

### Email
- **MailerSend**: Transactional email delivery
- **Idempotent Sending**: Prevents duplicate delivery

### Background Jobs
- **Vercel Cron**: Scheduled task execution
- **Idempotent Processing**: Safe for multiple runs

## Data Model

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Users     │────<│   Switches   │────<│  Recipients  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                    │
                            │                    │
                     ┌──────┴──────┐       ┌─────┴─────┐
                     │             │       │           │
              ┌──────┴───┐  ┌──────┴───┐  │  Messages │
              │ Verifiers│  │Verif.Req.│  └───────────┘
              └──────────┘  └──────────┘        │
                    │             │             │
              ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
              │Verif.Token│ │Verif.Votes│ │Email Del. │
              └───────────┘ └───────────┘ └───────────┘
```

### Core Tables

1. **users**: User accounts with roles
2. **switches**: Dead man's switch configurations
3. **recipients**: Message recipients per switch
4. **messages**: Encrypted messages per recipient
5. **verifiers**: Trusted verifiers per switch
6. **verification_requests**: Active verification processes
7. **verification_votes**: Verifier vote records
8. **email_deliveries**: Email send tracking
9. **audit_logs**: Immutable action history

## State Machine

The switch lifecycle follows a strict state machine:

```
                    ┌─────────────────────────────┐
                    │                             │
                    ▼                             │
┌──────────┐   ┌────────┐   ┌──────────────┐     │
│  ACTIVE  │──>│OVERDUE │──>│ GRACE_PERIOD │─────┤
└──────────┘   └────────┘   └──────────────┘     │
     ▲              │              │              │
     │              │              ▼              │
     │              │     ┌────────────────────┐ │
     │              │     │PENDING_VERIFICATION│ │
     │              │     └────────────────────┘ │
     │              │              │              │
     │              │              ▼              │
     │              │     ┌──────────────┐       │
     │              │     │   VERIFIED   │       │
     │              │     └──────────────┘       │
     │              │              │              │
     │              ▼              ▼              │
     │      ┌──────────────────────────────┐     │
     │      │         EXECUTED             │     │
     │      └──────────────────────────────┘     │
     │                                           │
     └─── (check-in at any point) ──────────────┘
```

### State Transitions

- All transitions are explicit and validated
- Invalid transitions fail immediately
- Transitions occur within database transactions
- Every transition is logged to audit_logs

## Security Architecture

### Authentication
- Passwords hashed with bcrypt (12 rounds)
- JWTs signed with HS256
- Sessions stored in database with expiry
- HTTP-only secure cookies

### Encryption
- Messages encrypted with AES-256-GCM
- Derived keys using scrypt
- Random IV and salt per encryption
- Server-side decryption only

### Access Control
- Row Level Security at database level
- All queries scoped to authenticated user
- Admin role for system management

### Tokens
- Verification links use secure random tokens
- Single-use with expiration
- Stored hashed in database

## Background Jobs

Jobs run hourly via Vercel Cron:

1. **Overdue Detection**: Find switches past check-in due
2. **Grace Period Transition**: Move overdue to grace period
3. **Grace Period Expiry**: Start verification or execution
4. **Verification Expiry**: Handle timed-out verifications
5. **Execution**: Send messages for verified switches
6. **Reminders**: Send check-in reminders

### Idempotency

All jobs are idempotent:
- Database constraints prevent duplicates
- Email delivery tracking prevents re-sends
- State checks before all operations

## API Design

### RESTful Endpoints
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- JSON request/response bodies
- Consistent error format

### Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Authentication
- Session cookie for browser clients
- Bearer token for API clients (future)

## Monitoring & Observability

### Audit Logs
- Every critical action logged
- Immutable append-only storage
- Includes entity, action, user, metadata, timestamp

### Health Check
- `/api/status` endpoint
- Database connectivity check
- Basic metrics

## Deployment Architecture

### Vercel
- Serverless functions for API
- Edge network for static assets
- Cron jobs for background tasks

### Database
- PostgreSQL hosted separately (e.g., Supabase, Neon)
- Connection pooling recommended
- Regular backups

### Environment
- Secrets in Vercel environment variables
- Different configs for dev/prod
- Required variables validated at startup
