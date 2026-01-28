# Final Note

A secure, verification-based dead man's switch web application. Final Note allows users to prepare private messages that are only released to chosen recipients if the user is confirmed deceased or permanently incapacitated (optionally via trusted human verifiers).

## Features

- **🔒 End-to-End Encrypted Messages**: All messages are encrypted at rest and only decrypted at delivery time
- **👥 Optional Human Verification**: Trusted verifiers can confirm your status before messages are sent
- **⏰ Flexible Check-in Intervals**: Configure check-in frequency from days to years
- **📋 Complete Audit Trail**: Every action is logged for transparency
- **🛡️ Multiple Safety Layers**: Grace periods, verification quorums, and final delays prevent accidental triggers
- **📧 Reliable Email Delivery**: Uses Nodemailer with Gmail SMTP for transactional email delivery with idempotency

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom JWT-based auth with session management
- **Email**: Nodemailer with Gmail SMTP
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Gmail account with App Password enabled (for email delivery)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/finalnote.git
   cd finalnote
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Random 32+ character string for JWT signing
   - `ENCRYPTION_KEY`: 64 hex characters (32 bytes) for message encryption
   - `GMAIL_USER`: Your Gmail email address
   - `GMAIL_PASS`: Gmail App Password (generate from Google Account settings)
   - `GMAIL_FROM_NAME`: Display name for sent emails (default: "Final Note")
   - `NEXT_PUBLIC_APP_URL`: Your app URL (http://localhost:3000 for dev)
   - `CRON_SECRET`: Secret for authenticating cron job requests

4. **Generate encryption key**
   ```bash
   openssl rand -hex 32
   ```

5. **Set up the database**
   ```bash
   npx prisma db push
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open http://localhost:3000**

### Running Tests

```bash
npm test
```

## How It Works

1. **Create a Switch**: Set up a dead man's switch with your check-in interval and grace period
2. **Add Recipients**: Add the people who should receive your messages
3. **Write Messages**: Create encrypted messages for each recipient
4. **Regular Check-ins**: Confirm you're okay at your set interval
5. **Grace Period**: If you miss a check-in, you enter a grace period with urgent reminders
6. **Verification** (optional): Trusted verifiers confirm your status
7. **Delivery**: Messages are decrypted and sent to recipients

## Switch States

| State | Description |
|-------|-------------|
| `ACTIVE` | Normal operation, check-in timer running |
| `OVERDUE` | Check-in deadline passed |
| `GRACE_PERIOD` | Extended deadline with urgent reminders |
| `PENDING_VERIFICATION` | Waiting for verifier confirmation |
| `VERIFIED` | Verification complete, final delay active |
| `EXECUTED` | Messages have been sent |
| `CANCELED` | Switch manually canceled |
| `PAUSED` | Temporarily paused by admin |

## API Endpoints

See [API.md](./API.md) for complete API documentation.

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Get current user

### Switches
- `GET /api/switch` - List user's switches
- `POST /api/switch` - Create new switch
- `GET /api/switch/[id]` - Get switch details
- `PATCH /api/switch/[id]` - Update switch
- `DELETE /api/switch/[id]` - Delete switch

### Check-in
- `POST /api/checkin` - Perform check-in

### Recipients
- `GET /api/recipients?switchId=...` - List recipients
- `POST /api/recipients` - Add recipient
- `PATCH /api/recipients/[id]` - Update recipient
- `DELETE /api/recipients/[id]` - Remove recipient

### Messages
- `GET /api/messages?switchId=...` - List messages
- `POST /api/messages` - Create message
- `GET /api/messages/[id]?decrypt=true` - Get decrypted message
- `PATCH /api/messages/[id]` - Update message
- `DELETE /api/messages/[id]` - Delete message

### Verifiers
- `GET /api/verifiers?switchId=...` - List verifiers
- `POST /api/verifiers` - Add verifier
- `POST /api/verify` - Submit verification vote

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Vercel Deployment

1. Fork this repository
2. Connect to Vercel
3. Add environment variables
4. Deploy

## Security

See [SECURITY.md](./SECURITY.md) for security considerations and best practices.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

This project is open source under the MIT License. See [LICENSE](./LICENSE) for details.
