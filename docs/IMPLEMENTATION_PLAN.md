# Recall — Implementation Plan

Personal knowledge base API. A user saves things (links, notes, files) and later asks
questions answered from their own saved content using RAG (retrieval-augmented generation).

**Stack:** NestJS · PostgreSQL + pgvector · TypeORM · class-validator (+ Zod at the edges)
· BullMQ (Redis) · an embeddings API + a streaming LLM API.

---

## 1. Product scope (the contract we're building to)

Four user-facing capabilities:

1. **Save an entry** — a link, a typed note, or an uploaded file. API responds
   *immediately* with a `pending` entry. Heavy work happens in the background.
2. **Ingest in the background** — fetch article text (links) / extract text (files) →
   chunk → embed each chunk → store vectors. Entry transitions `pending → processing →
   ready` (or `failed`).
3. **Semantic search** — "what did I save about Finland elections?" → vector search over
   *only this user's* entries → ranked list of matching entries.
4. **Ask a question** — retrieve relevant chunks (scoped to the user) → build a grounded
   prompt → **stream** back an answer with **citations** to source entries.

Non-negotiable qualities (the "best practices" we adhere to):

- **Tenant isolation.** Every read/write is scoped to the authenticated user. No query
  ever crosses users. This is enforced at the repository layer, not just the controller.
- **Async by default.** Save returns fast; ingestion is a job. Failures are retried and
  observable, never silently lost.
- **Grounded answers only.** The LLM answers from retrieved context and cites entries; if
  context is insufficient it says so rather than hallucinating.
- **Type-safe end to end.** Validated input at the boundary, typed domain objects inside.
- **Testable & observable.** Deterministic unit tests with external APIs mocked; e2e tests
  over the real HTTP + DB surface; structured logs and health checks.

---

## 2. Architecture at a glance

```
Client
  │  HTTP (REST + SSE for streaming)
  ▼
NestJS API  ──────────────────────────────────────────────┐
  Auth (JWT) → Guards → Controllers → Services             │
     │                                    │                │
     │ enqueue job                        │ query          │
     ▼                                    ▼                │
  BullMQ (Redis)                    PostgreSQL + pgvector   │
     │                                    ▲                │
     ▼                                    │                │
  Ingestion Worker ──── fetch/extract ── chunk ── embed ───┘
                                                  │
                          Embeddings API ◄────────┘
                          LLM API (stream) ◄─ Q&A path
```

- **API process** and **worker process** run the same codebase but different entrypoints
  (`main.ts` vs `worker.ts`). They share modules but the worker doesn't open HTTP.
- **Postgres** is the single source of truth (entries, chunks + vectors, users, job audit).
- **Redis** backs BullMQ only. It is a queue, not a datastore of record.

---

## 3. Data model

### `users`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| email | citext unique | |
| password_hash | text | argon2 |
| created_at | timestamptz | |

### `entries`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk → users | **indexed; every query filters on this** |
| type | enum('link','note','file') | |
| source_url | text null | for links |
| file_key | text null | storage key for uploads |
| title | text null | derived during ingest |
| content | text null | raw/extracted text |
| status | enum('pending','processing','ready','failed') | |
| error | text null | last failure reason |
| created_at / updated_at | timestamptz | |

### `entry_chunks`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| entry_id | uuid fk → entries (cascade delete) | |
| user_id | uuid | denormalized for fast tenant-scoped vector search |
| chunk_index | int | order within entry |
| content | text | the chunk text |
| embedding | vector(N) | pgvector; N = embedding model dim |
| token_count | int | |

Indexes: `entry_chunks` gets an **HNSW** (or IVFFlat) index on `embedding` for ANN search,
plus a btree on `user_id`. Vector search always adds `WHERE user_id = :me` so isolation
holds even with an ANN index.

> **Migrations, not `synchronize`.** `synchronize: true` is banned outside throwaway spikes.
> All schema changes ship as TypeORM migrations, including `CREATE EXTENSION vector` and the
> vector index creation.

---

## 4. Module layout

```
src/
  main.ts                 # HTTP bootstrap (API process)
  worker.ts               # BullMQ worker bootstrap (worker process)
  app.module.ts
  common/                 # cross-cutting: filters, interceptors, pipes, guards, logging
    config/               # typed config module (env validated at boot)
    database/             # TypeORM datasource + migrations
  auth/                   # register/login, JWT strategy, guards, current-user decorator
  users/
  entries/                # CRUD + upload; enqueues ingestion; owns entities
  ingestion/              # processors: fetch, extract, chunk, embed  (BullMQ consumers)
  embeddings/             # embeddings API client (provider-agnostic interface)
  search/                 # semantic search endpoint + vector query repo
  qa/                     # ask endpoint: retrieve → prompt → stream + citations
  llm/                    # LLM client (streaming, provider-agnostic interface)
```

Principles:
- **Providers behind interfaces.** `EmbeddingsProvider` and `LlmProvider` are interfaces;
  concrete clients (OpenAI/Anthropic/local) are injected. Swapping providers = one module.
- **Thin controllers, logic in services.** Controllers validate + delegate. No DB in controllers.
- **Repository layer owns tenant scoping.** Services pass `userId`; repos always filter by it.

---

## 5. Build phases (incremental, each shippable & tested)

### Phase 0 — Foundation
- Add deps: `@nestjs/typeorm typeorm pg`, `@nestjs/bullmq bullmq`, `@nestjs/config`,
  `class-validator class-transformer`, `zod`, `@nestjs/jwt @nestjs/passport passport
  passport-jwt argon2`, `@nestjs/swagger`.
- Typed **config module** — validate `process.env` with Zod at boot; fail fast if missing.
- **Global pipes/filters/interceptors**: `ValidationPipe({ whitelist, transform })`, a
  global exception filter (consistent error shape + request id), a logging interceptor.
- `docker-compose.yml`: Postgres (with pgvector image), Redis. `.env.example` committed.
- Health module: `/health` (liveness) + `/health/ready` (DB + Redis ping).
- **Exit criteria:** app boots, connects to DB + Redis, `/health` green, CI runs lint+test.

### Phase 1 — Auth & tenancy
- `users` + `auth`: register (argon2 hash), login → JWT. `JwtAuthGuard` global (opt-out via
  `@Public()`). `@CurrentUser()` decorator exposes `userId`.
- **Exit criteria:** protected routes reject anon; e2e proves user A can't touch user B's data
  (this test is added now and kept green forever).

### Phase 2 — Entries CRUD (no ingestion yet)
- Turn the scaffolded `Entry` into a real TypeORM entity + migration.
- `POST /entries` (note/link JSON; file via multipart), `GET /entries`, `GET /entries/:id`,
  `DELETE /entries/:id` — all tenant-scoped. New entries created as `pending`.
- **Exit criteria:** CRUD works, DTOs validated, ownership enforced in repo, unit + e2e green.

### Phase 3 — Background ingestion pipeline
- Wire BullMQ. On save, enqueue `ingest-entry` job with `{ entryId, userId }`.
- Worker processor: load entry → fetch (link: HTTP + readability extract) / extract (file:
  pdf/text parser) → set `title`/`content` → **chunk** (token-aware, overlap) → **embed**
  each chunk via `EmbeddingsProvider` (batched) → persist `entry_chunks` → mark `ready`.
- **Reliability:** retries with backoff, idempotent processing (re-run clears old chunks),
  `failed` status + `error` on give-up, dead-letter handling, per-job structured logs.
- **Exit criteria:** saving a link results in a `ready` entry with chunks+vectors; a forced
  fetch failure lands as `failed` with a reason; re-enqueue is idempotent.

### Phase 4 — Semantic search
- `GET /search?q=...`: embed the query → pgvector ANN search **filtered by `user_id`** →
  return ranked entries (dedupe chunks → entries, keep best score, include snippet).
- **Exit criteria:** relevant entries rank above irrelevant ones on a seeded fixture; results
  never include another user's entries.

### Phase 5 — Ask (RAG, streamed, cited)
- `POST /ask` (SSE/streamed response): embed question → retrieve top-K chunks (user-scoped) →
  assemble prompt with numbered context blocks → call `LlmProvider` **streaming** → stream
  tokens to client → emit **citations** mapping claims back to `entry_id`s.
- Prompt discipline: instruct model to answer *only* from context and to say when it can't.
- **Exit criteria:** answer streams incrementally, cites real entries, and declines when the
  KB has nothing relevant (no hallucinated citations).

### Phase 6 — Hardening
- Rate limiting (`@nestjs/throttler`), request size limits, upload type/size validation.
- OpenAPI/Swagger published. Structured JSON logging with correlation ids.
- Metrics/queue observability (Bull Board in non-prod). Graceful shutdown of API + worker.
- **Exit criteria:** load a handful of entries, run the full save→search→ask loop end to end.

---

## 6. Engineering practices we hold to

- **Testing pyramid.** Unit tests for services/chunking/prompt-building with providers mocked
  (deterministic, no network). E2e tests over real HTTP + a throwaway Postgres/Redis (Docker)
  for auth, CRUD, tenancy, and the ingestion→search happy path. Target meaningful coverage on
  domain logic, not vanity 100%.
- **Isolation is tested, not assumed.** A standing "cross-tenant" e2e test guards every data
  path.
- **Determinism at the boundary.** All external I/O (embeddings, LLM, HTTP fetch, file
  storage) sits behind an injectable interface so tests are hermetic and providers are swappable.
- **Migrations only.** Schema evolves through reviewed migrations; `synchronize` stays off.
- **Config validated at boot.** Missing/invalid env = the process refuses to start.
- **Fail loud, recover gracefully.** Consistent error envelope, typed exceptions, job retries
  with backoff, `failed` state is a first-class outcome.
- **CI gate.** lint + typecheck + unit + e2e must pass before merge. Conventional commits,
  small PRs, feature branches.
- **Secrets never committed.** `.env` git-ignored, `.env.example` documents every key.

---

## 7. Key decisions to confirm before Phase 3

These affect concrete dependencies; picking them early avoids rework.

1. **Embeddings + LLM provider** (drives vector dimension `N` and the client SDK).
2. **File storage** — local disk for dev vs S3-compatible object storage.
3. **Chunking parameters** — target tokens per chunk + overlap (start ~500/15% overlap).
4. **Vector index** — HNSW (better recall/latency, more memory) vs IVFFlat. Default HNSW.

---

## 8. Immediate next steps

1. Phase 0: install deps, config module, global pipes/filters, docker-compose, health checks.
2. Phase 1: auth + JWT + tenancy guard, with the cross-tenant e2e test in place.
3. Then Phase 2 entries as real TypeORM entities behind migrations.

We build phase by phase; each phase is only "done" when its exit criteria and tests are green.
```
