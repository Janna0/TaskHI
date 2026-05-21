# TaskHI — Database Structure

## Technology Choice

**Primary DB:** PostgreSQL 15+  
**Rationale:** Strong relational integrity for hierarchical task data (subtasks, sections); JSON columns for flexible metadata; mature ecosystem; excellent full-text search via `tsvector`.

**Cache / Sessions:** Redis  
**File Storage:** S3-compatible (AWS S3 / Cloudflare R2)  
**Search Enhancement:** PostgreSQL full-text search (MVP); Elasticsearch (V2+ if needed)

---

## Entity Relationship Overview

```
Workspace
  └── Users (many-to-many via WorkspaceMembers)
  └── Projects (many-to-many via ProjectMembers)
      └── Sections
          └── Tasks (self-referencing for subtasks)
              ├── TaskAssignees (many-to-many via Users)
              ├── Comments
              │   └── Reactions
              ├── Attachments
              ├── ChecklistGroups
              │   └── ChecklistItems
              ├── Tags (many-to-many)
              └── ActivityLogs
  └── Files (project-level)
  └── Templates
  └── Notifications
```

---

## Table Definitions

### users
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  job_title       TEXT,
  password_hash   TEXT,                    -- NULL for OAuth-only users
  timezone        TEXT DEFAULT 'UTC',
  theme           TEXT DEFAULT 'system',   -- 'light' | 'dark' | 'system'
  email_verified  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ             -- soft delete
);

CREATE INDEX idx_users_email ON users(email);
```

### oauth_accounts
```sql
CREATE TABLE oauth_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,              -- 'google'
  provider_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);
```

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);
```

### workspaces
```sql
CREATE TABLE workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,        -- URL-safe identifier
  logo_url   TEXT,
  plan       TEXT DEFAULT 'free',         -- 'free' | 'pro' | 'enterprise'
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workspace_members
```sql
CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
```

### projects
```sql
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  color        TEXT DEFAULT '#6366f1',    -- hex color
  cover_url    TEXT,                      -- cover image
  status       TEXT DEFAULT 'active',    -- 'active' | 'archived' | 'deleted'
  visibility   TEXT DEFAULT 'team',      -- 'private' | 'team'
  deadline     DATE,
  owner_id     UUID NOT NULL REFERENCES users(id),
  is_template  BOOLEAN DEFAULT FALSE,
  template_id  UUID REFERENCES projects(id), -- if created from template
  metadata     JSONB DEFAULT '{}',        -- extensible
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  archived_at  TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ               -- soft delete (hard purge after 30d)
);

CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_owner ON projects(owner_id);

-- Full-text search
ALTER TABLE projects ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))) STORED;
CREATE INDEX idx_projects_search ON projects USING GIN(search_vector);
```

### project_members
```sql
CREATE TABLE project_members (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member' | 'viewer'
  is_favorite BOOLEAN DEFAULT FALSE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_favorite ON project_members(user_id, is_favorite) WHERE is_favorite = TRUE;
```

### project_tags
```sql
CREATE TABLE project_tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#94a3b8',
  UNIQUE (workspace_id, name)
);

CREATE TABLE project_tag_assignments (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES project_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);
```

### sections
```sql
CREATE TABLE sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_project ON sections(project_id, position);
```

### tasks
```sql
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_id      UUID REFERENCES sections(id) ON DELETE SET NULL,
  parent_task_id  UUID REFERENCES tasks(id) ON DELETE CASCADE,  -- for subtasks
  creator_id      UUID NOT NULL REFERENCES users(id),

  title           TEXT NOT NULL,
  description     TEXT,                   -- rich text stored as HTML or Markdown
  status          TEXT NOT NULL DEFAULT 'todo',
                                          -- 'todo'|'in_progress'|'review'|'blocked'|'done'
  priority        TEXT NOT NULL DEFAULT 'medium',
                                          -- 'low'|'medium'|'high'|'urgent'
  start_date      DATE,
  due_date        DATE,
  position        INTEGER NOT NULL DEFAULT 0,
  depth           INTEGER NOT NULL DEFAULT 0, -- 0=task, 1=subtask, 2=sub-subtask
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ             -- soft delete

  -- Full-text search
  search_vector   tsvector
    GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || coalesce(description,''))) STORED
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_section ON tasks(section_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_search ON tasks USING GIN(search_vector);
```

### task_assignees
```sql
CREATE TABLE task_assignees (
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);
```

### task_tags
```sql
CREATE TABLE task_tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#94a3b8',
  UNIQUE (workspace_id, name)
);

CREATE TABLE task_tag_assignments (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
```

### checklists
```sql
CREATE TABLE checklists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Checklist',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  is_done      BOOLEAN DEFAULT FALSE,
  position     INTEGER NOT NULL DEFAULT 0,
  done_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### attachments
```sql
CREATE TABLE attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  comment_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
  uploader_id  UUID NOT NULL REFERENCES users(id),
  filename     TEXT NOT NULL,
  storage_key  TEXT NOT NULL UNIQUE,      -- S3/R2 object key
  mime_type    TEXT,
  file_size    BIGINT,                    -- bytes
  thumbnail_key TEXT,                    -- for image thumbnails
  created_at   TIMESTAMPTZ DEFAULT NOW()
  -- exactly one of task_id, project_id, comment_id should be non-null
);

CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_project ON attachments(project_id);
```

### comments
```sql
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,               -- HTML from rich text editor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_task ON comments(task_id);
```

### comment_reactions
```sql
CREATE TABLE comment_reactions (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,              -- e.g., '👍', '❤️'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id, emoji)
);
```

### activity_logs
```sql
CREATE TABLE activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  project_id   UUID REFERENCES projects(id),
  task_id      UUID REFERENCES tasks(id),
  actor_id     UUID NOT NULL REFERENCES users(id),
  event_type   TEXT NOT NULL,
  -- e.g., 'task.created' | 'task.status_changed' | 'task.assigned'
  -- | 'comment.created' | 'project.member_added' | 'file.uploaded'
  payload      JSONB NOT NULL DEFAULT '{}',
  -- e.g., { "from": "todo", "to": "in_progress" } for status_changed
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_project ON activity_logs(project_id, created_at DESC);
CREATE INDEX idx_activity_task ON activity_logs(task_id, created_at DESC);
CREATE INDEX idx_activity_actor ON activity_logs(actor_id, created_at DESC);
```

### notifications
```sql
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES users(id),
  type         TEXT NOT NULL,
  -- 'task_assigned' | 'comment_added' | 'mentioned' | 'status_changed'
  -- | 'deadline_reminder' | 'project_member_added' | 'task_completed'
  resource_type TEXT NOT NULL,           -- 'task' | 'project' | 'comment'
  resource_id   UUID NOT NULL,
  project_id    UUID REFERENCES projects(id),
  message       TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
```

### project_templates (system templates)
```sql
CREATE TABLE project_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id), -- NULL = system template
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  cover_url    TEXT,
  structure    JSONB NOT NULL,
  -- { sections: [{name, tasks: [{title, status, priority}]}] }
  is_system    BOOLEAN DEFAULT FALSE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Key Design Decisions

### Soft Deletes
All critical entities (users, projects, tasks, comments) use `deleted_at` rather than hard deletes. A background job purges records where `deleted_at < NOW() - INTERVAL '30 days'`.

### Positions / Ordering
Tasks and sections use an integer `position` column. Re-ordering updates affected rows. For high-frequency reordering, consider a fractional indexing scheme (LexoRank-style strings) to minimize write amplification.

### Full-Text Search
PostgreSQL `tsvector` with `GIN` indexes covers MVP search needs efficiently without external dependencies. Upgrade path to Elasticsearch is straightforward.

### Activity Log vs Audit Trail
`activity_logs` is append-only and powers both the task activity feed and dashboard activity feed. It is never updated or deleted (historical record).

### JSON Columns
`metadata` on projects and `payload` on activity_logs use JSONB for flexibility without schema migrations for minor additions.

---

## Database Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| users | email | Login lookup |
| projects | workspace_id, status | Project list queries |
| project_members | user_id, is_favorite | Dashboard favorites |
| tasks | project_id, status | Board/list view filtering |
| tasks | due_date | Deadline queries |
| tasks | search_vector (GIN) | Full-text search |
| task_assignees | user_id | My tasks queries |
| activity_logs | project_id + created_at | Activity feed |
| notifications | recipient_id + is_read | Notification center |

---

## Migration Strategy

- Use numbered migration files (e.g., `0001_initial.sql`, `0002_add_checklist_items.sql`)
- Run migrations with a tool like Flyway, Liquibase, or custom runner
- All migrations are forward-only in MVP (no rollback scripts required at this stage)
- Schema changes in CI gate: migrations must pass against a clean DB before merge
