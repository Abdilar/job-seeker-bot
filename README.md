# Job Seeker Bot

A Telegram-based job discovery platform that collects job opportunities from multiple sources, stores them in a centralized database, and provides a simple interface for browsing and filtering jobs.

The project is built with **Node.js**, **TypeScript**, **PostgreSQL**, **Prisma**, **Playwright**, and **grammY**.

The long-term goal is to turn Job Seeker into a job discovery and notification platform where users can search for jobs, save their preferences, and receive relevant opportunities automatically.

---

## Features

### Currently Available

- Telegram bot interface
- Job listing with pagination
- Job details
- Filtering jobs by:
  - Contract type
  - Provider
- Job collection from Jobinja
- Automated web crawling with Playwright
- Scheduled job crawling
- PostgreSQL persistence
- Duplicate job prevention
- Batched job processing
- Automatic job updates using upsert
- Separation between crawler and Telegram bot processes

### Planned

- Job search
- More job providers
- User profiles
- Saved jobs
- Saved searches
- Personalized job filters
- Job alerts
- Scheduled notifications
- Subscription management
- Premium features
- AI-powered job matching
- AI-assisted job analysis
- Additional job sources and international providers

---

## Tech Stack

| Technology  | Usage                         |
| ----------- | ----------------------------- |
| TypeScript  | Primary programming language  |
| Node.js     | Application runtime           |
| grammY      | Telegram Bot framework        |
| PostgreSQL  | Primary database              |
| Prisma      | ORM and database migrations   |
| Playwright  | Job crawling                  |
| node-cron   | Scheduled crawler execution   |
| PM2         | Production process management |
| Oxlint      | Static analysis and linting   |
| Prettier    | Code formatting               |
| Husky       | Git hooks                     |
| lint-staged | Pre-commit checks             |
| Commitlint  | Commit message validation     |
| Commitizen  | Conventional commit creation  |

---

## Architecture

The application consists of two independent processes that share the same application and database layers.

```text
                         PostgreSQL
                             ▲
                             │
                      JobRepository
                             ▲
                             │
                        JobService
                       /          \
                      /            \
             Telegram Bot        Crawler
                  │                  │
               grammY          CrawlJobsTask
                                     │
                                Job Providers
                                     │
                                  Jobinja
```

At runtime, the application is separated into:

```text
Job Seeker
│
├── Bot Process
│   │
│   └── Telegram
│       ↓
│     Handlers
│       ↓
│     Services
│       ↓
│   Repositories
│       ↓
│   PostgreSQL
│
└── Crawler Process
    │
    └── Scheduler
        ↓
      Tasks
        ↓
      Providers
        ↓
     Job Sources
        ↓
     Services
        ↓
   Repositories
        ↓
    PostgreSQL
```

This allows the Telegram bot and crawler to run independently while sharing the same domain and persistence layers.

---

## Project Structure

```text
src/
│
├── crawlers/
│   └── providers/
│
├── database/
│
├── repositories/
│
├── scheduler/
│
├── services/
│
├── tasks/
│
├── telegram/
│   ├── handlers/
│   ├── renders/
│   └── ...
│
├── types/
│
├── utilities/
│
├── bot.bootstrap.ts
│
└── crawler.bootstrap.ts
```

### Crawlers

Responsible for retrieving job data from external job providers.

Providers encapsulate provider-specific crawling and parsing logic.

### Tasks

Application-level background operations.

`CrawlJobsTask`, for example, coordinates providers and the job service to retrieve and persist jobs.

### Services

Contain application/business logic.

The service layer is independent from Prisma and communicates with persistence through repository interfaces.

### Repositories

Responsible for database access.

Prisma-specific implementation details are kept inside this layer.

### Telegram

Contains the Telegram-specific presentation layer, including handlers, filters, keyboards, and renderers.

---

## Requirements

Before running the project, make sure the following are installed:

- Node.js 22+
- npm
- PostgreSQL
- Git

For production deployment, PM2 is also recommended.

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd job-seeker-bot
```

Install dependencies:

```bash
npm install
```

---

## Code Quality

### Lint

Oxlint is used for static analysis:

```bash
npm run lint
```

Type-aware linting is enabled to detect TypeScript-specific problems such as unsafe operations and unhandled promises.

### Format

Format the code with Prettier:

```bash
npm run format
```

Check formatting without modifying files:

```bash
npm run format:check
```

### Type Check

TypeScript can be checked without generating build files:

```bash
npx tsc --noEmit
```

---

## Git Hooks

Husky and lint-staged run code-quality checks before commits.

The flow is:

```text
git commit
    ↓
Husky
    ↓
pre-commit
    ↓
lint-staged
    ├── Oxlint
    └── Prettier
```

Only staged files are processed.

This keeps pre-commit checks fast even as the project grows.

---

## Commit Convention

The project follows Conventional Commits.

Examples:

```text
feat: add provider filter
fix: handle empty job results
refactor: extract job renderer
chore: update dependencies
```

Scopes can also be used:

```text
feat(crawler): add scheduled crawling
fix(telegram): handle invalid pagination
refactor(repository): simplify job upsert
```

Commitlint validates commit messages through a Git hook.

Commitizen can be used to create conventional commits interactively:

```bash
npm run commit
```

---

## Roadmap

### Phase 1 — Foundation

- [x] TypeScript architecture
- [x] PostgreSQL
- [x] Prisma
- [x] Repository layer
- [x] Service layer
- [x] Telegram bot
- [x] Jobinja crawler
- [x] Scheduled crawling
- [x] Pagination
- [x] Job filtering
- [x] Prettier
- [x] Oxlint
- [x] Husky
- [x] lint-staged
- [x] Commitlint
- [x] Commitizen
- [ ] GitHub Actions
- [ ] Docker

### Phase 2 — Job Discovery

- [ ] Job search
- [ ] Additional providers
- [ ] Advanced filters
- [ ] Improved pagination
- [ ] Job sorting
- [ ] Provider-specific crawling improvements

### Phase 3 — User Features

- [ ] User profiles
- [ ] Saved jobs
- [ ] Saved searches
- [ ] User preferences
- [ ] Personalized filters
- [ ] Job history

### Phase 4 — Notifications

- [ ] Job alerts
- [ ] Scheduled notifications
- [ ] Saved-search notifications
- [ ] Personalized job recommendations

### Phase 5 — Monetization

- [ ] Subscription plans
- [ ] Premium features
- [ ] Usage limits
- [ ] Subscription management

### Phase 6 — AI

- [ ] AI-powered job matching
- [ ] Job relevance scoring
- [ ] Job description analysis
- [ ] Personalized job recommendations
- [ ] Resume-to-job matching

---

## License

See the [LICENSE](./LICENSE.md) file for details.
