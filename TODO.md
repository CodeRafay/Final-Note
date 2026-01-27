# Final Note Development TODO List

## Project Overview

This is a comprehensive development roadmap for Final Note - an open source, self-hosted dead man's switch web application. Each task should be completed in order within each phase.

---

## Phase 1: Project Setup & Foundation

### 1.1 Initial Setup

- [ ] Create Next.js 14 project with TypeScript and Tailwind CSS
- [ ] Set up project structure and folders (`/components`, `/lib`, `/app`, `/types`, etc.)
- [ ] Configure TypeScript with strict mode
- [ ] Set up ESLint and Prettier for code formatting
- [ ] Create basic `.env.example` file with required environment variables
- [ ] Set up Git hooks for pre-commit linting

### 1.2 Development Environment

- [ ] Install and configure necessary dependencies
  - [ ] `@types/node`
  - [ ] `csv-parser` or `xlsx` for file-based data storage
  - [ ] `nodemailer` for email sending
  - [ ] `crypto` for encryption/decryption
  - [ ] `cron` or `node-cron` for scheduling tasks
  - [ ] `zod` for data validation
- [ ] Create development scripts in `package.json`
- [ ] Set up hot reloading and development server

---

## Phase 2: Data Layer & Types

### 2.1 TypeScript Interfaces & Types

- [ ] Create `types/switch.ts` with Switch interface and states enum
- [ ] Create `types/recipient.ts` with Recipient interface
- [ ] Create `types/verifier.ts` with Verifier interface
- [ ] Create `types/message.ts` with Message interface
- [ ] Create `types/email.ts` with email delivery types
- [ ] Create `types/audit.ts` with audit log interface
- [ ] Create state machine types and transition rules

### 2.2 Database Integration

- [ ] Set up Prisma project and connect to the app
- [ ] Create database schema in Prisma
  - [ ] Tables: users, switches, recipients, messages, verifiers, etc.
  - [ ] Add ENUMs and constraints for state safety
  - [ ] Implement Row Level Security (RLS)
- [ ] Create `lib/database.ts` for database operations
  - [ ] Functions for CRUD operations on each table
  - [ ] Data validation and schema enforcement
  - [ ] Error handling for database queries
- [ ] Implement data encryption for sensitive information
- [ ] Create migration utilities for schema updates

### 2.3 Configuration System

- [ ] Create `lib/config.ts` for environment configuration
- [ ] Validate required environment variables on startup
- [ ] Set up default values for optional configurations
- [ ] Create configuration validation schemas

### 3.5 User Authentication

- [ ] Set up Prisma Auth for email/password authentication
- [ ] Implement session-based JWT authentication
- [ ] Create login and registration pages
- [ ] Add middleware to protect authenticated routes
- [ ] Implement password hashing and validation
- [ ] Add user management functionality (e.g., password reset)

### 3.6 Admin Controls

- [ ] Implement admin role management
- [ ] Create admin dashboard for:
  - [ ] User management (view, disable, delete accounts)
  - [ ] System-wide settings
  - [ ] Emergency overrides (pause/cancel switches)
  - [ ] Viewing logs and monitoring system health
- [ ] Add middleware to restrict admin pages to admin users

### 3.7 Multi-User Support

- [ ] Ensure all database queries are scoped to the authenticated user
- [ ] Implement Row Level Security (RLS) in Prisma to enforce data isolation
- [ ] Add rate limiting to prevent abuse
- [ ] Test concurrent user workflows

---

## Phase 3: Core Business Logic

### 3.1 State Machine Implementation

- [ ] Create `lib/stateMachine.ts`
  - [ ] Define all possible states (ACTIVE, OVERDUE, GRACE_PERIOD, etc.)
  - [ ] Implement state transition logic
  - [ ] Add validation for invalid transitions
  - [ ] Create audit logging for all state changes
- [ ] Create state transition utilities and helpers
- [ ] Implement rollback mechanisms for failed transitions

### 3.2 Switch Management

- [ ] Create `lib/switchManager.ts`
  - [ ] CRUD operations for switches
  - [ ] Check-in functionality
  - [ ] Timer reset logic
  - [ ] Grace period management
- [ ] Implement switch lifecycle methods
- [ ] Add validation for switch configuration

### 3.3 Verification System

- [ ] Create `lib/verificationSystem.ts`
  - [ ] Verifier management (add, remove, invite)
  - [ ] Verification request creation
  - [ ] Vote collection and quorum logic
  - [ ] Verification expiry handling
- [ ] Generate secure, expiring verification links
- [ ] Implement verification result processing

### 3.4 Message System

- [ ] Create `lib/messageManager.ts`
  - [ ] Message creation and encryption
  - [ ] Message-to-recipient mapping
  - [ ] Message content validation
  - [ ] Message decryption for sending
- [ ] Implement secure message storage
- [ ] Add message template system

---

## Phase 4: Email Integration

### 4.1 Email Service Setup

- [ ] Create `lib/emailService.ts`
  - [ ] SMTP configuration for Gmail/custom provider
  - [ ] Email template system
  - [ ] Email queue management
  - [ ] Retry logic for failed sends
- [ ] Create email templates for:
  - [ ] Check-in reminders
  - [ ] Grace period warnings
  - [ ] Verification requests
  - [ ] Final messages to recipients
  - [ ] System notifications

### 4.2 Email Delivery System

- [ ] Implement idempotent email sending
- [ ] Create delivery logging and tracking
- [ ] Handle partial delivery failures
- [ ] Implement rate limiting to avoid spam detection
- [ ] Add email validation and sanitization

---

## Phase 5: Background Jobs & Scheduling

### 5.1 Cron Job System

- [ ] Create `lib/scheduler.ts`
  - [ ] Job scheduling and management
  - [ ] Idempotent job execution
  - [ ] Error handling and logging
  - [ ] Job status tracking
- [ ] Implement individual job handlers:
  - [ ] Check-in reminder job
  - [ ] Overdue detection job
  - [ ] Grace period transition job
  - [ ] Verification trigger job
  - [ ] Execution job

### 5.2 Job Management

- [ ] Create job queue system
- [ ] Implement job retry mechanisms
- [ ] Add job monitoring and health checks
- [ ] Create manual job trigger capabilities

---

## Phase 6: Frontend Development

### 6.1 Layout & Navigation

- [ ] Create main layout component with navigation
- [ ] Implement responsive design with Tailwind CSS
- [ ] Create loading states and error boundaries
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

### 6.2 Core Pages

- [ ] **Home Page** (`app/page.tsx`)
  - [ ] App introduction and explanation
  - [ ] Feature overview
  - [ ] Getting started guide
  - [ ] FAQ section
- [ ] **Dashboard** (`app/dashboard/page.tsx`)
  - [ ] Switch status overview
  - [ ] Quick check-in button
  - [ ] Recent activity log
  - [ ] System health indicators
- [ ] **Switch Configuration** (`app/switch/page.tsx`)
  - [ ] Create/edit switch form
  - [ ] Interval and grace period settings
  - [ ] Verifier configuration (optional)
  - [ ] Switch activation/deactivation

### 6.3 Recipient & Message Management

- [ ] **Recipients Page** (`app/recipients/page.tsx`)
  - [ ] Add/remove recipients
  - [ ] Recipient validation
  - [ ] Bulk import functionality
- [ ] **Messages Page** (`app/messages/page.tsx`)
  - [ ] Message editor for each recipient
  - [ ] Rich text editing capabilities
  - [ ] Message preview and testing
  - [ ] Message templates

### 6.4 Verification Management

- [ ] **Verifiers Page** (`app/verifiers/page.tsx`)
  - [ ] Add/remove verifiers
  - [ ] Send verification invitations
  - [ ] View verification status
- [ ] **Verification Response Page** (`app/verify/[token]/page.tsx`)
  - [ ] Secure verification form
  - [ ] Vote submission (confirm/deny)
  - [ ] Response confirmation

### 6.5 Settings & Configuration

- [ ] **Settings Page** (`app/settings/page.tsx`)
  - [ ] Email configuration
  - [ ] Notification preferences
  - [ ] Security settings
  - [ ] Data export/import
- [ ] **Admin Page** (`app/admin/page.tsx`)
  - [ ] System override controls
  - [ ] Emergency pause/cancel
  - [ ] System logs and monitoring

---

## Phase 7: API Routes

### 7.1 Core API Endpoints

- [ ] `app/api/switch/route.ts` - Switch CRUD operations
- [ ] `app/api/checkin/route.ts` - Check-in functionality
- [ ] `app/api/recipients/route.ts` - Recipient management
- [ ] `app/api/messages/route.ts` - Message management
- [ ] `app/api/verifiers/route.ts` - Verifier management
- [ ] `app/api/verify/route.ts` - Verification handling

### 7.2 System API Endpoints

- [ ] `app/api/status/route.ts` - System health check
- [ ] `app/api/config/route.ts` - Configuration management
- [ ] `app/api/logs/route.ts` - Audit log access
- [ ] `app/api/admin/route.ts` - Admin operations

### 7.3 Webhook & External APIs

- [ ] `app/api/webhooks/email/route.ts` - Email delivery webhooks
- [ ] `app/api/cron/route.ts` - Cron job triggers
- [ ] Email service integration endpoints

---

## Phase 8: Security Implementation

### 8.1 Data Security

- [ ] Implement message encryption/decryption
- [ ] Create secure token generation for verification links
- [ ] Add rate limiting to prevent abuse
- [ ] Implement request validation and sanitization
- [ ] Add CSRF protection

### 8.2 Access Control

- [ ] Create basic authentication for admin functions
- [ ] Implement session management
- [ ] Add API key authentication for cron jobs
- [ ] Create secure verification link system

### 8.3 Security Hardening

- [ ] Add security headers
- [ ] Implement HTTPS enforcement
- [ ] Add input validation and sanitization
- [ ] Create security audit logging
- [ ] Add brute force protection

---

## Phase 9: Testing

### 9.1 Unit Tests

- [ ] Test state machine transitions
- [ ] Test data storage operations
- [ ] Test email service functionality
- [ ] Test encryption/decryption
- [ ] Test validation functions
- [ ] Test utility functions

### 9.2 Integration Tests

- [ ] Test complete switch lifecycle
- [ ] Test verification workflow
- [ ] Test email delivery system
- [ ] Test cron job execution
- [ ] Test API endpoints
- [ ] Test error handling scenarios

### 9.3 End-to-End Tests

- [ ] Test user journey from setup to execution
- [ ] Test verification process
- [ ] Test emergency scenarios
- [ ] Test data persistence and recovery

---

## Phase 10: Documentation

### 10.1 Technical Documentation

- [ ] **README.md** - Project overview, setup, and usage
- [ ] **ARCHITECTURE.md** - System architecture and design decisions
- [ ] **API.md** - API endpoint documentation
- [ ] **DEPLOYMENT.md** - Deployment instructions and requirements
- [ ] **SECURITY.md** - Security considerations and best practices

### 10.2 User Documentation

- [ ] **USER_GUIDE.md** - Complete user manual
- [ ] **SETUP_GUIDE.md** - Step-by-step setup instructions
- [ ] **FAQ.md** - Frequently asked questions
- [ ] **TROUBLESHOOTING.md** - Common issues and solutions

### 10.3 Developer Documentation

- [ ] **CONTRIBUTING.md** - Contribution guidelines
- [ ] **DEVELOPMENT.md** - Development environment setup
- [ ] Code comments and inline documentation
- [ ] API documentation with examples

---

## Phase 11: Configuration & Environment

### 11.1 Environment Configuration

- [ ] Create comprehensive `.env.example`
- [ ] Document all environment variables
- [ ] Create configuration validation
- [ ] Add environment-specific configs (dev, prod)

### 11.2 Deployment Preparation

- [ ] Create Docker configuration (optional)
- [ ] Set up Vercel deployment configuration
- [ ] Create deployment scripts
- [ ] Set up environment variable management

---

## Phase 12: Performance & Optimization

### 12.1 Performance Optimization

- [ ] Optimize file read/write operations
- [ ] Implement caching where appropriate
- [ ] Optimize email delivery performance
- [ ] Add performance monitoring

### 12.2 Error Handling & Monitoring

- [ ] Comprehensive error handling throughout the application
- [ ] Add logging and monitoring
- [ ] Create health check endpoints
- [ ] Implement alerting for critical failures

---

## Phase 13: Final Testing & Quality Assurance

### 13.1 Comprehensive Testing

- [ ] Full system testing
- [ ] Security testing and penetration testing
- [ ] Performance testing under load
- [ ] Cross-platform compatibility testing

### 13.2 User Acceptance Testing

- [ ] Create test scenarios for different user types
- [ ] Test all user workflows
- [ ] Validate against PRD requirements
- [ ] Test error scenarios and edge cases

---

## Phase 14: Launch Preparation

### 14.1 Pre-Launch Checklist

- [ ] Code review and security audit
- [ ] Performance benchmarking
- [ ] Documentation review
- [ ] License and legal compliance check

### 14.2 Release Preparation

- [ ] Create release notes
- [ ] Prepare installation packages
- [ ] Set up issue tracking
- [ ] Create support documentation

---

## Critical Success Criteria (Must Verify)

- [ ] No execution without proper verification (if verifiers enabled)
- [ ] No duplicate email sends under any circumstances
- [ ] Complete audit trail for all actions
- [ ] Graceful handling of all failure scenarios
- [ ] Data integrity maintained at all times
- [ ] Secure handling of sensitive information
- [ ] Reliable state transitions
- [ ] Idempotent operations for all critical functions

---

## Notes for Claude Coding Agent

1. **Safety First**: This is a safety-critical system. When in doubt, choose the path that prevents irreversible actions.
2. **Test Everything**: Each component should be thoroughly tested before moving to the next phase.
3. **Document as You Go**: Keep documentation updated as you implement features.
4. **Incremental Development**: Complete each phase before moving to the next.
5. **Error Handling**: Implement robust error handling for every possible failure scenario.
6. **Security**: Never compromise on security - encrypt sensitive data and validate all inputs.
7. **Idempotency**: All critical operations must be idempotent to prevent issues with retries.

---

## Estimated Timeline

- **Phase 1-2**: 2-3 days (Setup and foundation)
- **Phase 3-4**: 5-7 days (Core logic and email)
- **Phase 5**: 2-3 days (Background jobs)
- **Phase 6**: 7-10 days (Frontend development)
- **Phase 7**: 3-4 days (API development)
- **Phase 8**: 3-4 days (Security implementation)
- **Phase 9**: 4-5 days (Testing)
- **Phase 10-11**: 2-3 days (Documentation and config)
- **Phase 12-14**: 3-4 days (Optimization and launch prep)

**Total Estimated Time: 32-44 days** (assuming 1 developer working full-time)
