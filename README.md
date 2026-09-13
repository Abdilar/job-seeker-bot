# Job Seeker Bot

Job Seeker is a Telegram-based job discovery platform designed to collect job opportunities from multiple sources and provide users with a simple, centralized interface for discovering relevant positions.

The project focuses on clean architecture, extensibility, separation of concerns, and maintainability while keeping infrastructure intentionally lightweight.

> This repository is source-available for portfolio, review, and educational viewing purposes.  
> Usage, copying, modification, distribution, or commercial use is not permitted without prior written permission.

---

## Overview

Job searching across multiple platforms can be repetitive and time-consuming.

Job Seeker aims to provide a centralized experience where job opportunities from different sources can be collected, normalized, stored, filtered, and eventually delivered to users based on their preferences.

The Telegram bot acts as the primary user interface, while job collection is handled independently by background processes.

---

## Current Features

- Telegram-based job discovery
- Paginated job browsing
- Job detail views
- Filtering by contract type
- Filtering by job provider
- Automated job collection
- Scheduled background crawling
- Persistent job storage
- Duplicate job prevention
- Batched job processing
- Separation between bot and crawler processes
- Extensible provider architecture

---

## Planned Features

The project is being developed incrementally.

Planned capabilities include:

- Additional job providers
- Advanced job filtering
- Job search
- Saved jobs
- Saved searches
- User profiles and preferences
- Personalized job alerts
- Scheduled notifications
- International job sources
- Subscription management
- Premium features
- AI-powered job matching
- Resume-to-job matching
- Job relevance scoring

---

## Tech Stack

| Technology     | Purpose                             |
| -------------- | ----------------------------------- |
| TypeScript     | Primary programming language        |
| Node.js        | Application runtime                 |
| grammY         | Telegram bot framework              |
| PostgreSQL     | Persistent data storage             |
| Prisma         | Database access and migrations      |
| Playwright     | Job source integration and crawling |
| node-cron      | Background scheduling               |
| PM2            | Production process management       |
| Oxlint         | Static analysis                     |
| Prettier       | Code formatting                     |
| Husky          | Git hooks                           |
| lint-staged    | Staged-file validation              |
| Commitlint     | Commit message validation           |
| Commitizen     | Conventional commit workflow        |
| GitHub Actions | Continuous Integration              |

---

## Architecture

Job Seeker is structured around independent application processes that share the same business and persistence layers.

```text
                         PostgreSQL
                             ▲
                             │
                        Repository
                             ▲
                             │
                          Service
                         /       \
                        /         \
                 Telegram Bot    Background Worker
                                      │
                                    Tasks
                                      │
                                  Providers
```

The application currently consists of two main runtime responsibilities:

```text
Job Seeker
│
├── Telegram Application
│   │
│   ├── Handlers
│   ├── Renderers
│   └── Filters
│
├── Background Processing
│   │
│   ├── Scheduler
│   ├── Tasks
│   └── Providers
│
├── Application Layer
│   └── Services
│
└── Persistence Layer
    └── Repositories
```

This separation allows user interaction and background data collection to evolve independently while sharing common application logic.

---

## Architectural Principles

### Separation of Concerns

Responsibilities are separated between presentation, application logic, persistence, and external data providers.

The Telegram layer is responsible for user interaction rather than database operations or crawling logic.

---

### Service Layer

Application and business operations are exposed through services.

Higher-level application components depend on service abstractions rather than directly interacting with persistence technologies.

This helps prevent infrastructure concerns from leaking into application logic.

---

### Repository Pattern

Database operations are isolated behind repository abstractions.

```text
Application
     ↓
Service
     ↓
Repository Interface
     ↓
Repository Implementation
     ↓
Database
```

The application layer therefore does not need to depend directly on the underlying ORM.

---

### Provider Abstraction

External job sources are represented through provider abstractions.

Conceptually:

```text
                Job Collection
                      │
              Provider Abstraction
                /      |       \
               /       |        \
        Provider A  Provider B  Provider C
```

This makes it possible to introduce additional job sources without coupling the rest of the application to provider-specific implementations.

---

### Background Tasks

Long-running or scheduled application operations are separated from interactive Telegram request handling.

```text
Scheduler
    ↓
Application Task
    ↓
Providers
    ↓
Service Layer
    ↓
Persistence
```

This keeps background orchestration independent from the Telegram interface.

---

## Data Flow

A simplified job ingestion flow:

```text
External Job Source
        ↓
     Provider
        ↓
  Normalized Job
        ↓
  Application Task
        ↓
     Service
        ↓
    Repository
        ↓
     Database
```

A simplified Telegram request flow:

```text
Telegram User
      ↓
    Handler
      ↓
   Renderer
      ↓
    Service
      ↓
  Repository
      ↓
   Database
```

These flows intentionally converge at the application layer instead of allowing presentation or external integrations to access persistence directly.

---

## Project Structure

The source code is organized around responsibilities rather than individual features.

```text
src/
│
├── crawlers/
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
│
├── types/
│
└── utilities/
```

### Crawlers

Contains abstractions and implementations responsible for collecting and parsing job information from external sources.

### Services

Contains application-level operations and coordinates domain behavior.

### Repositories

Defines the persistence boundary and database implementations.

### Tasks

Coordinates background application operations involving multiple services or providers.

### Scheduler

Controls when background tasks are triggered.

### Telegram

Contains Telegram-specific presentation logic such as handlers, filters, keyboards, and renderers.

### Types

Contains shared TypeScript contracts and application models.

### Utilities

Contains reusable functionality that does not belong to a specific application layer.

---

## Code Quality

The project uses several automated quality controls.

```text
Development
    ↓
Prettier
    ↓
Oxlint
    ↓
TypeScript
    ↓
Git Hooks
    ↓
Commit Validation
    ↓
Continuous Integration
```

### Formatting

Prettier provides consistent formatting across the codebase.

### Static Analysis

Oxlint is used for fast static analysis, including TypeScript-aware checks.

### Git Hooks

Husky and lint-staged validate changed files before they enter the repository history.

### Commit Convention

The project follows Conventional Commits.

Examples:

```text
feat: add provider filter
fix: handle empty job results
refactor: extract job renderer
chore: update dependencies
```

Commitlint validates commit messages while Commitizen provides an interactive commit workflow.

---

## Continuous Integration

GitHub Actions is used as the Continuous Integration platform.

The CI pipeline validates changes before they are accepted:

```text
Push / Pull Request
        ↓
 Dependency Installation
        ↓
     Type Check
        ↓
   Static Analysis
        ↓
 Formatting Check
        ↓
       Build
```

Deployment configuration and production infrastructure details are intentionally not documented publicly.

---

## Security & Repository Policy

Operational and deployment information is intentionally excluded from this repository documentation.

The public documentation does not describe:

- Production credentials or environment configuration
- Deployment procedures
- Server configuration
- Production filesystem structure
- Database connection information
- Internal operational commands
- Infrastructure access details
- Provider-specific operational configuration

Sensitive configuration must remain outside source control.

---

## Roadmap

### Phase 1 — Engineering Foundation

- [x] TypeScript architecture
- [x] PostgreSQL persistence
- [x] Repository abstraction
- [x] Service layer
- [x] Telegram integration
- [x] Initial job provider
- [x] Scheduled job collection
- [x] Pagination
- [x] Filtering
- [x] Prettier
- [x] Oxlint
- [x] Husky
- [x] lint-staged
- [x] Commitlint
- [x] Commitizen
- [ ] Continuous Integration
- [ ] Containerization

### Phase 2 — Job Discovery

- [ ] Additional providers
- [ ] Job search
- [ ] Advanced filtering
- [ ] Sorting
- [ ] Improved discovery experience

### Phase 3 — Personalization

- [ ] User profiles
- [ ] Saved jobs
- [ ] Saved searches
- [ ] User preferences
- [ ] Personalized filters

### Phase 4 — Notifications

- [ ] Job alerts
- [ ] Scheduled notifications
- [ ] Saved-search notifications
- [ ] Personalized recommendations

### Phase 5 — Product & Monetization

- [ ] Subscription plans
- [ ] Premium capabilities
- [ ] Usage management
- [ ] Subscription management

### Phase 6 — Intelligent Matching

- [ ] AI-powered job matching
- [ ] Resume-to-job matching
- [ ] Job relevance scoring
- [ ] Job description analysis
- [ ] Personalized recommendations

---

## Development Status

Job Seeker is currently under active development.

The architecture, interfaces, database models, provider implementations, and product capabilities may change as the project evolves.

Public documentation intentionally focuses on the project's architecture and engineering approach rather than operational implementation details.

---

## License

Copyright © 2026 Saeed Abdilar. All Rights Reserved.

This repository is source-available for viewing and educational purposes only.

Copying, reproduction, modification, redistribution, sublicensing, commercial use, or use of substantial portions of this software is prohibited without prior written permission from the copyright holder.

See the [LICENSE](./LICENSE) file for complete terms.
