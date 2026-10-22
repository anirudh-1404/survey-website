# PULSE — Public Opinion on Global Issues

PULSE is a modern, database-backed public-opinion polling and civic discourse platform built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and MongoDB Atlas.

---

## 1. Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **MongoDB**: MongoDB Atlas cluster or local MongoDB instance (v6.0+)

---

## 2. Environment Variables

Configure the following environment variables in your deployment environment (e.g. Vercel dashboard, container runtime) or in `.env.local` for local development.

> **Security Note**: Never commit `.env` or `.env.local` files to source control. Use `.env.example` as a template.

| Variable Name | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | Standard MongoDB connection string with credentials, cluster host, and database name. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical base URL of the site (e.g. `https://pulse.org`) used for OpenGraph metadata, sitemaps, and canonical links. |
| `SESSION_SECRET` | Optional | Additional entropy pepper used for session token derivation. |
| `INITIAL_ADMIN_EMAIL` | Script Only | Administrator email used strictly by `scripts/provision-admin.mjs`. |
| `INITIAL_ADMIN_PASSWORD`| Script Only | Administrator initial password (minimum 8 chars) used strictly by `scripts/provision-admin.mjs`. |
| `INITIAL_ADMIN_NAME` | Script Only | Administrator display name used by `scripts/provision-admin.mjs` (defaults to "PULSE Lead Administrator"). |
| `CLOUDINARY_CLOUD_NAME` | Optional (Phase 1) | Cloudinary cloud identifier for poll featured image uploads. |
| `CLOUDINARY_API_KEY` | Optional (Phase 1) | Cloudinary API Key for authenticated server-side uploads. |
| `CLOUDINARY_API_SECRET` | Optional (Phase 1) | Cloudinary API Secret for authenticated server-side uploads. |
| `PUSHER_APP_ID` | Optional (Phase 2) | Pusher App ID for distributed multi-instance real-time chat broadcasts. |
| `PUSHER_KEY` | Optional (Phase 2) | Pusher API Key for backend server event triggers. |
| `PUSHER_SECRET` | Optional (Phase 2) | Pusher API Secret for backend server event signing. |
| `PUSHER_CLUSTER` | Optional (Phase 2) | Pusher cluster zone (e.g. `mt1`, `eu`, `ap2`). |
| `NEXT_PUBLIC_PUSHER_KEY`| Optional (Phase 2) | Public Pusher key for client WebSocket subscriptions in serverless deployments. |

---

## 3. Database Setup & Index Considerations

PULSE uses Mongoose schemas with compound indexes to enforce data integrity and performance at the database tier:

- **Votes**: Unique compound index `{ pollId: 1, userId: 1 }` guarantees that each authenticated user can record at most one ballot per poll inquiry, even under concurrent submissions.
- **Reports**: Unique compound index `{ commentId: 1, reporterId: 1 }` guarantees that each user can report a comment only once.
- **Comments**:
  - `{ pollId: 1, status: 1, createdAt: -1 }` optimizes public discussion loading.
  - `{ pollId: 1, parentId: 1, status: 1 }` enables performant threaded reply queries.
- **Blogs**:
  - Unique index `{ slug: 1 }` ensures unique URL routing per publication.
  - `{ status: 1, publishedAt: -1 }` accelerates public editorial feed ordering.
  - `{ category: 1, status: 1, publishedAt: -1 }` provides high-throughput filtered category queries.
- **Contact Submissions**:
  - `{ status: 1, createdAt: -1 }` optimizes administrative inbox triage.
- **Chat Messages**:
  - `{ pollId: 1, createdAt: 1 }` enables instant history retrieval per poll room.
- **Sessions**: TTL expiration index on `expiresAt` automatically cleans up expired sessions.
- **Users**: Unique index on `email`.

### Index Synchronization
Indexes are automatically asserted during model initialization and test runs via `.init()`. For zero-downtime production upgrades, verify index status via MongoDB Compass or mongosh:
```bash
# Verify existing indexes
mongosh "<MONGODB_URI>" --eval 'db.votes.getIndexes(); db.reports.getIndexes();'
```

---

## 4. Development, Testing, Lint & Build Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run automated test suites (Auth, Poll Management, Voting, Discussion, QA/Security/SEO)
npm test

# Run ESLint validation
npm run lint

# Build production bundle with Next.js Turbopack
npm run build

# Start production server
npm start
```

---

## 5. Safe First-Admin Provisioning Procedure

To prevent privilege escalation through public registration, the administrator role cannot be selected via the public signup form. Initial administrators must be provisioned out-of-band via the secure provisioning utility:

```bash
# 1. Set provisioning credentials in your secure terminal session
export INITIAL_ADMIN_EMAIL="admin@pulse.org"
export INITIAL_ADMIN_PASSWORD="YourStrongSecurePassword123!"
export INITIAL_ADMIN_NAME="PULSE Lead Administrator"

# 2. Run the provisioning script
node --env-file=.env.local scripts/provision-admin.mjs
```

The script will:
- Establish a connection to MongoDB Atlas.
- Verify that password requirements are met.
- Hash the password with bcrypt (cost factor 12).
- Create or safely promote the designated administrator account.
- Disconnect cleanly.

---

## 6. Production Deployment Checklist

1. **Environment Configuration**: Set `MONGODB_URI` and `NEXT_PUBLIC_APP_URL` in your hosting provider's environment settings.
2. **Database Connectivity**: Confirm network access rules / IP allowlists on MongoDB Atlas allow your application server or serverless IP range.
3. **Security Headers**: Verified in `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`).
4. **Seed Data Check**: Ensure sample seed scripts (`scripts/seed-polls.mjs`) are NOT run in production unless explicitly desired. The seed script is non-destructive and will skip execution if polls already exist.
5. **Admin Access**: Provision exactly one administrator account out-of-band before launch.
6. **Health Monitoring**: Check `GET /api/health` to verify database connectivity. Note that the endpoint returns generic sanitized status messages to prevent information disclosure.

---

## 7. Real-Time Architecture & Deployment Considerations

1. **Native Server-Sent Events (SSE) Stream**: The platform provides out-of-the-box persistent real-time chat via Next.js App Router HTTP streaming (`GET /api/polls/[id]/chat/stream`). Messages are persisted in MongoDB Atlas before real-time dispatch, ensuring zero message loss and instant delivery to connected participants without page refresh.
2. **Persistent Web Service vs Serverless**:
   - In persistent container environments (e.g., Render Web Service, Docker), the native SSE event stream and HTTP routes function out of the box with zero external dependencies.
   - In multi-instance serverless environments (e.g. Vercel), in-memory event buses do not bridge across separate serverless execution containers. For multi-region serverless scale, configure the optional Pusher Channels environment variables (`PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`) documented in `.env.example`.
3. **In-Memory Rate Limiting**: The built-in sliding window rate limiter operates in-memory on the active Node.js instance. In distributed multi-region serverless or cluster environments, back rate limiting with a shared Redis store (e.g., Upstash) or an edge WAF.
4. **Single Level of Threaded Replies**: The discussion system intentionally flattens deeper multi-level comment chains into a clean 2-level discussion tree (top-level comment and replies) to ensure readability across mobile viewports.
