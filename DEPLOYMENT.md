# Deployment Guide

This guide covers deploying Final Note to production.

## Prerequisites

Before deploying, ensure you have:
- A Vercel account
- A PostgreSQL database (Supabase, Neon, or other)
- A MailerSend account with verified domain
- Required secrets generated

## Quick Deployment (Vercel)

### 1. Fork the Repository

Fork this repository to your GitHub account.

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your forked repository
4. Vercel will auto-detect Next.js

### 3. Configure Environment Variables

In Vercel project settings, add these environment variables:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-32-character-random-string
ENCRYPTION_KEY=your-64-hex-character-key
MAILERSEND_API_KEY=your-mailersend-api-key
MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
MAILERSEND_FROM_NAME=Final Note
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
CRON_SECRET=your-cron-secret
APP_ENV=production
SESSION_EXPIRY_DAYS=7
```

### 4. Generate Secrets

```bash
# JWT Secret (32 characters)
openssl rand -base64 32

# Encryption Key (64 hex characters)
openssl rand -hex 32

# Cron Secret (16+ characters)
openssl rand -hex 16
```

### 5. Deploy

Click "Deploy" and wait for the build to complete.

### 6. Set Up Database

After deployment, run database migrations:

```bash
npx prisma db push
```

Or connect to the Vercel CLI:

```bash
vercel env pull .env.local
npx prisma db push
```

### 7. Verify Deployment

1. Visit your deployment URL
2. Create an account (first user becomes admin)
3. Create a test switch
4. Verify email delivery

## Database Setup

### Supabase (Recommended)

1. Create a new Supabase project
2. Go to Settings > Database
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your database password
5. Add to Vercel environment variables

### Neon

1. Create a new Neon project
2. Copy the connection string from the dashboard
3. Add to Vercel environment variables

### Other PostgreSQL

Any PostgreSQL 14+ database will work. Ensure:
- Connection string is accessible from Vercel
- SSL is enabled for production

## Email Setup

### MailerSend Configuration

1. Create a MailerSend account
2. Add and verify your sending domain
3. Create an API token with email sending permissions
4. Configure environment variables:
   - `MAILERSEND_API_KEY`: Your API token
   - `MAILERSEND_FROM_EMAIL`: Your verified email
   - `MAILERSEND_FROM_NAME`: "Final Note" or your preference

### Domain Verification

For best deliverability:
1. Add SPF record to your domain
2. Add DKIM record to your domain
3. Add DMARC record to your domain

MailerSend provides these records in the domain settings.

## Cron Jobs

### Vercel Cron

Cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs the cron job every hour. The cron endpoint is protected by `CRON_SECRET`.

### Verifying Cron Jobs

1. Check Vercel dashboard for cron execution logs
2. Monitor the `/api/status` endpoint
3. Review audit logs for cron activity

## Custom Domain

### Adding a Custom Domain

1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### Update Environment Variable

Update `NEXT_PUBLIC_APP_URL` to your custom domain:

```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Monitoring

### Health Check

The `/api/status` endpoint provides system health:

```bash
curl https://your-domain.com/api/status
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "stats": { "users": 10, "switches": 25 }
  }
}
```

### Vercel Analytics

Enable Vercel Analytics for:
- Page performance
- Web Vitals
- Error tracking

### Logging

Application logs are available in:
- Vercel deployment logs
- Function logs in Vercel dashboard

## Scaling

### Serverless Scaling

Vercel automatically scales serverless functions based on demand.

### Database Connections

For high traffic, configure connection pooling:
- Use Supabase's connection pooler
- Or configure PgBouncer

### Rate Limiting

Consider adding rate limiting for:
- Login attempts
- API requests
- Webhook endpoints

## Backup & Recovery

### Database Backups

- Supabase: Automatic daily backups
- Neon: Point-in-time recovery
- Configure additional backups as needed

### Disaster Recovery

1. Regular database backups
2. Environment variable backup (secure storage)
3. Document recovery procedures

## Security Hardening

### Production Checklist

- [ ] All secrets are unique to production
- [ ] HTTPS is enforced
- [ ] Database is not publicly accessible
- [ ] Admin account created
- [ ] Email domain verified with SPF/DKIM/DMARC
- [ ] Cron secret is set
- [ ] Audit logging is working

### Regular Maintenance

- [ ] Update dependencies monthly
- [ ] Review audit logs weekly
- [ ] Check email deliverability
- [ ] Monitor error rates
- [ ] Rotate secrets annually

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify `DATABASE_URL` is correct
- Check database is accessible from Vercel
- Ensure SSL is enabled

**Email Not Sending**
- Verify MailerSend API key
- Check domain is verified
- Review MailerSend logs

**Cron Jobs Not Running**
- Verify `CRON_SECRET` is set
- Check Vercel cron logs
- Test manually: `curl -H "Authorization: Bearer YOUR_SECRET" https://your-domain.com/api/cron`

**Build Failures**
- Check TypeScript errors
- Verify all environment variables are set
- Review build logs in Vercel

### Getting Help

1. Check the README and documentation
2. Review Vercel deployment logs
3. Open a GitHub issue for bugs
