# TaskHI

A modern, cloud-based project and task management platform for teams — designed with the clarity of Linear, the flexibility of ClickUp, and the polish of a premium SaaS product.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Documentation

All product and architecture documentation lives in [`/docs`](./docs/):

| # | Document | Description |
|---|---|---|
| 01 | [PRD](./docs/01_PRD.md) | Product Requirements Document — goals, personas, functional & non-functional requirements |
| 02 | [Features](./docs/02_FEATURES.md) | Full feature breakdown — every module, every interaction |
| 03 | [User Flows](./docs/03_USER_FLOWS.md) | Step-by-step flows for all 12 core journeys |
| 04 | [Database](./docs/04_DATABASE.md) | PostgreSQL schema — all tables, indexes, design decisions |
| 05 | [Frontend Architecture](./docs/05_FRONTEND_ARCHITECTURE.md) | Next.js structure, state management, routing, testing |
| 06 | [Backend Architecture](./docs/06_BACKEND_ARCHITECTURE.md) | Fastify API, endpoints, auth, file uploads, security |
| 07 | [UI/UX Structure](./docs/07_UI_UX_STRUCTURE.md) | Screen layouts, interaction patterns, accessibility |
| 08 | [Wireframes](./docs/08_WIREFRAMES.md) | ASCII wireframes for all 10 key screens |
| 09 | [MVP Roadmap](./docs/09_MVP_ROADMAP.md) | 16-week sprint plan, risk register, post-MVP backlog |
| 10 | [Design System](./docs/10_DESIGN_SYSTEM.md) | Clarity design system — colors, type, spacing, components |

## Core Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| State | Zustand + TanStack React Query |
| Backend | Fastify + TypeScript + Drizzle ORM |
| Database | PostgreSQL 15 |
| Cache | Redis (Upstash) |
| Files | Cloudflare R2 (S3-compatible) |
| Queue | BullMQ |
| Deploy | Vercel (frontend) + Railway (API + workers) |

## Product Pillars

- **Speed** — Actions complete in < 100ms perceived time via optimistic UI
- **Clarity** — One focus at a time; no competing calls to action
- **Flexibility** — Power users discover depth; beginners aren't overwhelmed
- **Delight** — Micro-animations and polish that make the tool feel alive

## MVP Scope

16 weeks → Authentication, Dashboard, Projects, Templates, List/Board/Timeline/Overview/Files views, Task management with subtasks + checklists + comments, File uploads, Notifications, Global search.
