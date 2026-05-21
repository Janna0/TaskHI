# TaskHI — Backend Architecture

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Mature ecosystem; async I/O ideal for API servers |
| Framework | **Fastify 4** | Fastest Node HTTP framework; schema validation built in; great plugin ecosystem |
| Language | **TypeScript 5** | Shared types with frontend; catch errors at compile time |
| ORM | **Drizzle ORM** | Type-safe SQL with minimal magic; excellent PostgreSQL support |
| Auth | **JWT (jose)** + OAuth (Google) | Stateless; industry standard |
| File Storage | **AWS S3 / Cloudflare R2** | Managed, scalable; presigned URLs keep bandwidth off our server |
| Email | **Resend** (or SendGrid) | Transactional email API |
| Queue/Jobs | **BullMQ** (Redis-backed) | Background jobs: notifications, email digests, file processing |
| Cache | **Redis** | Session data, rate limiting, search caches |
| Validation | **Zod** | Shared schemas with frontend |
| Testing | **Vitest** + **Supertest** | Unit + HTTP integration tests |
| API Docs | **Swagger/OpenAPI** (fastify-swagger) | Auto-generated from route schemas |

---

## Architecture Overview

```
Client (Next.js)
      │
      │ HTTPS
      ▼
[Load Balancer / CDN edge]
      │
      ▼
[API Server — Fastify]
  ├── Auth routes
  ├── Workspace routes
  ├── Project routes
  ├── Task routes
  ├── Comment routes
  ├── File routes
  ├── Notification routes
  ├── Search routes
  └── Webhook routes (future)
      │           │
      ▼           ▼
[PostgreSQL]   [Redis]
                  │
                  ▼
              [BullMQ Workers]
                  ├── Notification sender
                  ├── Email dispatcher
                  └── File thumbnail generator
                  
[AWS S3 / R2] ← presigned URLs issued by API
```

---

## Project Structure

```
src/
├── server.ts                    # Fastify app bootstrap
├── config/
│   ├── env.ts                   # Zod-validated env vars
│   └── constants.ts
├── plugins/
│   ├── auth.plugin.ts           # JWT decode + attach user to request
│   ├── cors.plugin.ts
│   ├── rate-limit.plugin.ts
│   ├── swagger.plugin.ts
│   └── db.plugin.ts             # Drizzle connection
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts       # POST /auth/register, /login, /refresh, /logout
│   │   ├── auth.service.ts
│   │   ├── auth.schema.ts       # Zod schemas for request/response
│   │   └── oauth.service.ts     # Google OAuth flow
│   ├── workspaces/
│   │   ├── workspaces.routes.ts
│   │   ├── workspaces.service.ts
│   │   └── workspaces.schema.ts
│   ├── projects/
│   │   ├── projects.routes.ts
│   │   ├── projects.service.ts
│   │   └── projects.schema.ts
│   ├── tasks/
│   │   ├── tasks.routes.ts
│   │   ├── tasks.service.ts
│   │   └── tasks.schema.ts
│   ├── sections/
│   ├── comments/
│   ├── files/
│   │   ├── files.routes.ts      # Presigned URL issuance + metadata CRUD
│   │   └── files.service.ts
│   ├── notifications/
│   │   ├── notifications.routes.ts
│   │   └── notifications.service.ts
│   ├── search/
│   │   └── search.routes.ts
│   └── templates/
├── db/
│   ├── schema/                  # Drizzle table definitions
│   │   ├── users.ts
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   └── ...
│   ├── migrations/              # SQL migration files
│   └── index.ts                 # Drizzle client
├── workers/
│   ├── notification.worker.ts   # Processes notification queue
│   ├── email.worker.ts          # Processes email queue
│   └── thumbnail.worker.ts      # Generates image thumbnails
├── lib/
│   ├── email.ts                 # Resend client
│   ├── storage.ts               # S3 presigned URL helpers
│   ├── redis.ts                 # Redis client
│   └── logger.ts                # Pino logger
└── types/
    └── fastify.d.ts             # Augment FastifyRequest with user
```

---

## API Design Principles

### REST conventions
- Resources are nouns, plural
- Use HTTP verbs correctly: GET (read), POST (create), PATCH (partial update), DELETE
- Nested routes for owned resources (tasks live under projects)
- Flat routes where cross-project access needed (e.g., `/tasks/:id` for direct task access)

### Response shape (all endpoints)
```typescript
// Success
{
  "data": { ... },
  "meta": { "page": 1, "total": 42 }   // pagination where relevant
}

// Error
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with id xyz does not exist",
    "statusCode": 404
  }
}
```

### Pagination
All list endpoints use cursor-based pagination:
```
GET /projects/:id/tasks?cursor=<lastId>&limit=50&direction=after
```

---

## API Endpoints

### Auth
```
POST   /auth/register              Create user + workspace
POST   /auth/login                 Issue access + refresh tokens
POST   /auth/refresh               Rotate refresh token
POST   /auth/logout                Revoke refresh token
POST   /auth/forgot-password       Send reset email
POST   /auth/reset-password        Apply new password
GET    /auth/google                Initiate Google OAuth
GET    /auth/google/callback        Handle Google OAuth callback
GET    /auth/me                    Get current user
PATCH  /auth/me                    Update profile
```

### Projects
```
GET    /projects                   List projects (workspace scope, filtered)
POST   /projects                   Create project
GET    /projects/:id               Get project detail
PATCH  /projects/:id               Update project
DELETE /projects/:id               Soft-delete project
POST   /projects/:id/archive       Archive/unarchive
POST   /projects/:id/duplicate     Duplicate project
POST   /projects/:id/favorite      Toggle favorite
GET    /projects/:id/members       List members
POST   /projects/:id/members       Add member
PATCH  /projects/:id/members/:uid  Change member role
DELETE /projects/:id/members/:uid  Remove member
```

### Sections
```
GET    /projects/:id/sections      List sections
POST   /projects/:id/sections      Create section
PATCH  /sections/:id               Update section (name, position)
DELETE /sections/:id               Delete section (tasks move to unsectioned)
POST   /sections/reorder           Reorder sections (bulk position update)
```

### Tasks
```
GET    /projects/:id/tasks         List tasks (with filters, pagination)
POST   /projects/:id/tasks         Create task
GET    /tasks/:id                  Get task detail (with subtasks, comments, etc.)
PATCH  /tasks/:id                  Update task
DELETE /tasks/:id                  Soft-delete task
POST   /tasks/:id/duplicate        Duplicate task
POST   /tasks/reorder              Reorder tasks (bulk position update)
GET    /tasks/:id/subtasks         List subtasks
POST   /tasks/:id/subtasks         Create subtask
GET    /tasks/:id/activity         Task activity log
```

### Task Assignees
```
POST   /tasks/:id/assignees        Assign user
DELETE /tasks/:id/assignees/:uid   Unassign user
```

### Checklists
```
GET    /tasks/:id/checklists       List checklists
POST   /tasks/:id/checklists       Create checklist
PATCH  /checklists/:id             Update checklist name
DELETE /checklists/:id             Delete checklist
POST   /checklists/:id/items       Add item
PATCH  /checklist-items/:id        Update item (text, is_done)
DELETE /checklist-items/:id        Delete item
```

### Comments
```
GET    /tasks/:id/comments         List comments
POST   /tasks/:id/comments         Create comment
PATCH  /comments/:id               Edit comment
DELETE /comments/:id               Delete comment
POST   /comments/:id/reactions     Add reaction
DELETE /comments/:id/reactions     Remove reaction
```

### Files
```
POST   /files/presign-upload       Get S3 presigned PUT URL + attachment record
POST   /files/confirm-upload       Mark upload complete (after S3 PUT)
GET    /projects/:id/files         List project files
GET    /tasks/:id/attachments      List task attachments
DELETE /attachments/:id            Delete attachment
POST   /files/presign-download     Get presigned GET URL for private file
```

### Notifications
```
GET    /notifications              List notifications (paginated, filtered)
PATCH  /notifications/:id/read     Mark as read
POST   /notifications/read-all     Mark all as read
GET    /notifications/preferences  Get preferences
PATCH  /notifications/preferences  Update preferences
```

### Search
```
GET    /search?q=&type=&limit=     Global search
```

### Templates
```
GET    /templates                  List all templates (system + workspace)
GET    /templates/:id              Get template detail
POST   /templates                  Create template from project
DELETE /templates/:id              Delete user template
```

---

## Authentication Flow

### JWT Strategy
```
Access token:  15-minute expiry, signed with HS256
Refresh token: 30-day expiry, stored as hash in DB

Headers:
  Authorization: Bearer <access_token>

Refresh flow:
  POST /auth/refresh
  Body: { refreshToken: "..." }
  Response: { accessToken: "...", refreshToken: "..." }
  Old refresh token is revoked (rotation)
```

### Middleware
```typescript
// plugins/auth.plugin.ts
fastify.addHook('onRequest', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return;                    // Public routes still work
  try {
    const payload = await jwtVerify(token, secret);
    request.user = await getUserById(payload.sub);
  } catch {
    reply.code(401).send({ error: { code: 'INVALID_TOKEN' } });
  }
});

// Route-level guard
function requireAuth(request, reply, done) {
  if (!request.user) reply.code(401).send({ error: { code: 'UNAUTHORIZED' } });
  else done();
}
```

---

## File Upload Strategy

Files are **never uploaded through our API server** — this keeps our server lightweight and avoids bandwidth costs.

**Flow:**
```
1. Client calls: POST /files/presign-upload
   Body: { filename, mimeType, size, taskId OR projectId }
   
2. Server:
   - Validates file size < 50MB
   - Generates unique S3 key: `uploads/{workspaceId}/{uuid}/{filename}`
   - Creates attachment record in DB (status: 'pending')
   - Returns: { uploadUrl, attachmentId, key }

3. Client uploads directly to S3:
   PUT {uploadUrl}
   Content-Type: {mimeType}
   Body: file binary

4. Client calls: POST /files/confirm-upload
   Body: { attachmentId }
   
5. Server:
   - Updates attachment status to 'complete'
   - Enqueues thumbnail generation job (for images)
   - Returns: { attachment }
```

All download URLs are **presigned** (15-minute expiry) to prevent hotlinking and ensure access control.

---

## Background Jobs (BullMQ)

### Notification Queue
```typescript
// Triggered by: task assigned, comment created, @mention, status changed, deadline
interface NotificationJob {
  type: 'task_assigned' | 'comment_added' | 'mentioned' | ...;
  actorId: string;
  recipientIds: string[];
  resourceId: string;
  metadata: Record<string, unknown>;
}

// Worker: creates notification records, sends emails per preferences
```

### Email Queue
```typescript
interface EmailJob {
  to: string;
  template: 'task_assigned' | 'comment' | 'deadline_reminder' | 'invite';
  data: Record<string, unknown>;
}
```

### Deadline Reminder Cron
```typescript
// Runs daily at 9am in user's timezone
// Queries: tasks where due_date = today OR due_date = tomorrow
// Enqueues EmailJob for each assignee who has email reminders enabled
```

### Soft-Delete Purge Cron
```typescript
// Runs daily
// Hard-deletes records where deleted_at < NOW() - INTERVAL '30 days'
// Tables: users, projects, tasks, comments
```

---

## Rate Limiting

| Endpoint | Limit |
|---|---|
| POST /auth/login | 5 requests / 15 min per IP |
| POST /auth/register | 3 requests / hour per IP |
| POST /auth/forgot-password | 3 requests / hour per IP |
| General API | 300 requests / minute per user |
| File upload presign | 20 requests / minute per user |
| Search | 30 requests / minute per user |

---

## Security Checklist

- All inputs validated with Zod schemas before processing
- SQL injection: prevented by Drizzle ORM parameterized queries (no raw string concatenation)
- XSS: HTML from rich text editor sanitized with `DOMPurify` before storage; Content-Security-Policy headers
- CSRF: SameSite=Strict cookies for session; JWT in Authorization header (not cookie) avoids CSRF
- SSRF: No server-side URL fetching of user-provided URLs
- Access control: every resource query includes `workspace_id` check; project membership validated on every project-scoped endpoint
- Sensitive data: passwords hashed with bcrypt (cost 12); tokens stored as SHA-256 hashes
- File uploads: MIME type validated server-side; S3 bucket is private (presigned URLs only)
- Rate limiting: per-IP for auth; per-user for general API
- Dependencies: automated vulnerability scanning in CI (npm audit, Snyk)

---

## Observability

- **Logging:** Pino (structured JSON logs) with request ID correlation
- **Metrics:** Prometheus + Grafana (via `fastify-metrics` plugin)
- **Tracing:** OpenTelemetry (future)
- **Error tracking:** Sentry
- **Uptime:** Health check endpoint at `GET /health` — checks DB + Redis connectivity

---

## Deployment

```
Infrastructure (MVP):
  - API: Railway or Fly.io (auto-scales, managed infra)
  - DB: Neon (serverless Postgres) or Railway Postgres
  - Redis: Upstash (serverless Redis)
  - Files: Cloudflare R2 (cheaper than S3; S3-compatible API)
  - Frontend: Vercel

CI/CD:
  GitHub Actions
    → Lint + type check
    → Tests (unit + integration)
    → Build
    → Deploy to staging (on PR)
    → Deploy to production (on merge to main)
```
