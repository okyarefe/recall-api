# Recall API

A personal knowledge base you can ask questions. Save links, notes and documents; the API extracts the text, embeds it, and answers questions about your own content with citations back to the source.

Built with NestJS, PostgreSQL + pgvector, and OpenAI. TypeScript throughout.

---

## The problem

Bookmarks and note apps are good at storing things and bad at getting them back. You remember that you read something about a topic — not which file it was in, or what you titled it.

Recall makes saved content **retrievable by meaning instead of by filename**. You ask a question in plain language and get an answer grounded in what you actually saved.

---

## How it works

**Ingestion** — what happens when you save something:

```
upload / note / link
        │
        ▼
  extract text          PDF via pdf-parse, plain text direct
        │
        ▼
  split into chunks     512 tokens, 64 overlap, tiktoken-counted
        │
        ▼
  embed each chunk      OpenAI text-embedding-3-small → 1536 dims
        │
        ▼
  store                 entries + entry_chunks (pgvector column)
```

**Retrieval** — what happens when you ask:

```
question
    │
    ▼
embed the question              same model, same vector space
    │
    ▼
cosine similarity search        pgvector <=>, filtered to the asking user
    │
    ▼
top-k chunks as context
    │
    ▼
LLM answers from context only   gpt-4o-mini, refuses if not present
    │
    ▼
{ answer, sources[] }
```

---

## Stack

| | |
|---|---|
| Runtime | Node.js, TypeScript |
| Framework | NestJS 11 |
| Database | PostgreSQL 17 + [pgvector](https://github.com/pgvector/pgvector) |
| ORM | TypeORM (migrations, no runtime schema sync) |
| Embeddings | OpenAI `text-embedding-3-small` (1536d) |
| LLM | OpenAI `gpt-4o-mini` |
| Chunking | LangChain `RecursiveCharacterTextSplitter` + `js-tiktoken` |
| Auth | JWT, bcrypt password hashing |
| Infra | Docker Compose |

---

## Design decisions

**Vector search lives in Postgres, not a separate vector database.**
One database means one backup, one connection pool, one transaction boundary. `entry_chunks.embedding` is a native `vector(1536)` column and similarity search is ordinary SQL using the `<=>` cosine-distance operator. A dedicated vector store would be the right call at a scale this project isn't at yet.

**Every external service sits behind an interface.**
`EMBEDDINGS_PROVIDER`, `LLM_PROVIDER` and `STORAGE_PROVIDER` are injection tokens bound to interfaces, not concrete classes. `LocalDiskStorage` can become `S3Storage`, or OpenAI can become a local model, by changing one binding in a module — no feature code touches a vendor SDK.

**Tenant isolation is enforced in the query, not after it.**
Every repository method takes the caller's `userId` and puts it in the `WHERE` clause (`findOneOwned`, `deleteOwned`). Nothing is fetched and then checked. `entry_chunks` carries a denormalised `userId` specifically so the vector scan can be filtered by owner without joining back to `entries` — a hot-path optimisation, since that filter runs on every search.

**The database enforces its own integrity.**
`entries.userId → user.id` and `entry_chunks.entryId → entries.id` are real foreign keys with `ON DELETE CASCADE`. Deleting a user removes their entries and every chunk, in one statement, regardless of whether it came through the app. Application-level checks only protect the paths that run them; a constraint protects every path.

**Schema changes go through migrations.**
`synchronize` is off in all environments. Every change is a reviewed file in `src/migrations/`, applied in order and recorded in a `migrations` table. This is what makes data-dependent changes possible — the FK migration deletes pre-existing orphan rows *before* adding the constraint, an ordering no ORM decorator can express.

**Configuration is validated at boot.**
`env.validation.ts` describes the required environment with `class-validator` decorators, and the app refuses to start if anything is missing or malformed. Database connection settings are kept ORM-agnostic (`database.config.ts`) and separate from TypeORM-specific options (`typeorm.config.ts`), which also lets the Nest app and the TypeORM CLI share one source of truth.

**The RAG prompt is constrained.**
The system prompt instructs the model to answer *only* from retrieved context and to say it doesn't know otherwise. Responses include the source chunks, so an answer can always be traced back to what it came from.

---

## API

All routes except `/auth/*` require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/signup` | Create an account |
| `POST` | `/auth/signin` | Exchange credentials for a JWT |
| `POST` | `/entries` | Create a note or link entry |
| `POST` | `/entries/upload` | Upload a PDF or text file (max 10 MB) |
| `GET` | `/entries` | List your entries, newest first |
| `GET` | `/entries/:id` | Fetch one entry |
| `DELETE` | `/entries/:id` | Delete an entry and its chunks |
| `POST` | `/ask` | Ask a question — returns `{ answer, sources }` |

---

## Running locally

**Requirements:** Node.js 20+, Docker, an OpenAI API key.

```bash
git clone <repo-url> && cd recall-api
npm install

cp .env.example .env.development     # then fill in OPENAI_API_KEY and JWT_SECRET

npm run db:up                        # Postgres 17 + pgvector in Docker
npm run migration:run                # apply the schema
npm run start:dev
```

The API listens on `http://localhost:3000`.

```bash
# sign up and capture a token
curl -X POST localhost:3000/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"..."}'

# upload a document
curl -X POST localhost:3000/entries/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@document.pdf'

# ask about it
curl -X POST localhost:3000/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What does the document say about X?"}'
```

---

## Docker

The database runs in Docker so that `git clone` → running API takes one command and doesn't depend on what's installed on the machine.

```yaml
image: pgvector/pgvector:pg17
```

`pgvector/pgvector` is Postgres with the pgvector extension already compiled in — without it, vector search would mean building a C extension from source as a setup step. Pinning `pg17` means every environment runs the same major version.

The compose file also handles three things that are easy to get wrong by hand:

**A named volume** (`recall_pgdata`) keeps your data across `docker compose down` and `up`. Data only disappears with `-v`, which is exactly what `npm run db:reset` does when you want a clean slate.

**An init script** (`docker/init-db.sql`) runs once, on the first boot of an empty volume. It enables the `vector` and `uuid-ossp` extensions and creates a separate `recall_test` database with the same extensions, so the test suite never touches development data.

**A healthcheck** (`pg_isready`) so Docker reports the container healthy only once Postgres is actually accepting connections — not merely when the process has started.

```bash
npm run db:up      # start Postgres in the background
npm run db:logs    # follow the container logs
npm run db:down    # stop it, keep the data
npm run db:reset   # destroy the volume and start clean
```

The application itself runs on the host during development. A Dockerfile for the API is a deployment concern and isn't in the repo yet.

---

## Database

```
user
 └─ entries              (ON DELETE CASCADE)
     └─ entry_chunks     (ON DELETE CASCADE)
```

Deleting a user removes everything they own. Both levels are enforced by foreign keys.

### Migrations

```bash
npm run migration:generate -- src/migrations/DescriptiveName   # diff entities against the DB
npm run migration:create   -- src/migrations/DescriptiveName   # empty file, for data changes
npm run migration:run                                          # apply pending migrations
npm run migration:revert                                       # undo the most recent
```

Generated migrations are reviewed before being run. `synchronize` is disabled everywhere so the schema only changes through a file in version control.

---

## Project structure

```
src/
├── config/              env validation, database + TypeORM configuration
├── common/              cross-cutting middleware
├── features/
│   ├── auth/            signup, signin, JWT guard, @CurrentUser decorator
│   ├── entries/         CRUD, upload, text extraction, chunking
│   ├── search/          vector similarity search
│   └── qa/              retrieval-augmented question answering
├── infrastructure/
│   ├── embeddings/      OpenAI embeddings provider
│   ├── llm/             OpenAI chat provider
│   └── storage/         file storage (local disk)
└── migrations/          versioned schema changes
```

Features own their domain logic; `infrastructure` holds swappable adapters to the outside world. Nothing in `features/` imports a vendor SDK directly.

---

## Roadmap

- **Background ingestion.** Extraction, chunking and embedding currently run inside the upload request. The `Entry.status` enum (`pending → processing → ready → failed`) is in place for moving this to a job queue.
- **Link fetching.** `type: 'link'` entries are stored but not yet fetched and indexed.
- **File retrieval and cleanup.** `StorageProvider` is write-only; downloading originals and removing files when an entry is deleted are both pending.
- **Hybrid search.** Combining vector similarity with keyword search to handle exact terms, names and identifiers that embeddings handle poorly.
- **Baseline migration.** The initial schema predates the migration setup and needs capturing so a fresh database can be built from migrations alone.
