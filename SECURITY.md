# Security

This document outlines the security considerations and best practices for Final Note.

## Security Model

Final Note is a safety-critical system where the consequences of unintended execution are severe. The security model prioritizes:

1. **Preventing unauthorized access**
2. **Protecting message confidentiality**
3. **Ensuring action integrity**
4. **Maintaining complete auditability**

## Authentication

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds
- Minimum password length of 8 characters
- Never stored or logged in plaintext

### Session Management
- Sessions are stored in the database with expiration
- JWT tokens are signed with HS256 algorithm
- Session tokens are stored in HTTP-only, secure cookies
- Sessions expire after 7 days by default

### Token Security
- All tokens (session, verification, check-in) use cryptographically secure random generation
- Tokens are single-use where appropriate
- Tokens have configurable expiration times

## Encryption

### Message Encryption
Messages are encrypted using:
- **Algorithm**: AES-256-GCM
- **Key Derivation**: scrypt with random salt
- **IV**: 16 bytes random per encryption
- **Auth Tag**: 16 bytes for integrity

### Encryption Key Management
- Master key stored in `ENCRYPTION_KEY` environment variable
- Key should be 32 bytes (64 hex characters)
- Generate with: `openssl rand -hex 32`
- Never commit keys to source control

### What's Encrypted
- Message content (encrypted at rest)
- Messages are only decrypted at delivery time

## Access Control

### Row Level Security
All database queries are scoped to the authenticated user:
- Users can only access their own switches
- Users can only access their own recipients and messages
- Verifiers can only access verification requests they're invited to

### Role-Based Access
- **USER**: Standard user permissions
- **ADMIN**: System administration permissions

### Admin Capabilities
- View all users and switches
- Pause/resume switches
- Override verification
- Access audit logs

## API Security

### Request Validation
- All input validated using Zod schemas
- Type-safe request handling with TypeScript
- SQL injection prevention via Prisma ORM

### Rate Limiting
Consider implementing rate limiting for:
- Login attempts (prevent brute force)
- API requests (prevent abuse)
- Email sends (prevent spam)

### HTTPS
- All traffic should use HTTPS in production
- Vercel provides automatic SSL

## Verification Security

### Link Security
- Verification links use 256-bit random tokens
- Links are single-use
- Links expire after the verification window

### Vote Integrity
- One vote per verifier per request
- Votes are immutable once submitted
- IP address and user agent logged

### Denial of Service Protection
- Any "alive" vote immediately cancels verification
- User check-in at any point cancels verification
- Verification window prevents indefinite waiting

## Email Security

### Sender Authentication
- Configure SPF, DKIM, and DMARC for your sending domain
- Use verified sender addresses in MailerSend

### Idempotent Delivery
- Each message delivery tracked in database
- Duplicate sends prevented by unique constraints
- Failed deliveries logged for investigation

## Audit Trail

### What's Logged
- All state transitions
- All authentication events
- All CRUD operations
- All verification votes
- All email deliveries

### Log Integrity
- Audit logs are append-only
- No update or delete operations on logs
- Logs include timestamp, user, IP, user agent

## Environment Security

### Required Secrets
| Variable | Purpose | Generation |
|----------|---------|------------|
| `DATABASE_URL` | Database connection | From provider |
| `JWT_SECRET` | Session signing | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Message encryption | `openssl rand -hex 32` |
| `MAILERSEND_API_KEY` | Email sending | From MailerSend |
| `CRON_SECRET` | Cron authentication | `openssl rand -hex 16` |

### Best Practices
- Never commit secrets to source control
- Use different secrets for dev/staging/production
- Rotate secrets periodically
- Use Vercel environment variables for deployment

## Threat Model

### Potential Threats

| Threat | Mitigation |
|--------|------------|
| Credential theft | Strong hashing, session expiry |
| Session hijacking | HTTP-only cookies, secure flag |
| Message interception | AES-256-GCM encryption |
| Unauthorized execution | Multiple verification layers |
| Duplicate execution | Idempotent operations |
| Database breach | Encrypted sensitive data |
| Admin abuse | Audit logging, role separation |

### Safety Guarantees

1. **No message is sent without proper state transitions**
2. **User check-in at any point prevents execution**
3. **Any "alive" vote cancels verification**
4. **Final delay allows last-chance intervention**
5. **All actions are logged immutably**

## Incident Response

### If Keys Are Compromised
1. Immediately rotate the compromised key
2. Invalidate all sessions
3. Re-encrypt messages if encryption key compromised
4. Notify affected users

### If Unauthorized Access Detected
1. Disable affected accounts
2. Review audit logs
3. Identify scope of access
4. Notify affected users

## Security Checklist

### Before Production
- [ ] All environment variables set securely
- [ ] HTTPS enforced
- [ ] Database properly secured
- [ ] Email domain authenticated
- [ ] Audit logging verified
- [ ] Admin account created
- [ ] Backup strategy in place

### Regular Maintenance
- [ ] Review audit logs
- [ ] Check for failed login attempts
- [ ] Monitor email delivery status
- [ ] Update dependencies
- [ ] Rotate secrets periodically
