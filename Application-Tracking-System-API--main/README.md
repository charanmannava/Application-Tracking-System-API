# ATS RBAC Queue Backend

This repository contains a TypeScript-based backend for an applicant tracking system (ATS) with role-based access control, workflow state management, and asynchronous notification processing.

The project is designed as a small but complete example of:

- authenticated API access for candidates, recruiters, and hiring managers
- RBAC protection for protected job and application operations
- transactional application lifecycle transitions with audit history
- asynchronous queue-based notification delivery using Redis and BullMQ
- Docker Compose orchestration for API, PostgreSQL, Redis, and worker services

## Project Structure

- `src/`
  - `index.ts` - Express API server and application routes
  - `worker.ts` - BullMQ worker process for notification jobs
  - `queue/notifications.ts` - enqueue and process notification jobs
  - `config/data-source.ts` - TypeORM datasource configuration
  - `entities/` - database entity definitions
  - `middleware/` - auth and RBAC middleware
  - `services/stateMachine.ts` - application stage transition rules
  - `types/` - Express request extensions
- `tests/` - Jest unit tests for RBAC and workflow validation
- `docker-compose.yml` - development stack definition
- `mock_emails.log` - root worker output log file
- `ormconfig.ts` - TypeORM configuration helper
- `package.json` - project scripts and dependencies

## Key Features

- Authentication using JWT tokens
- Role-based access control for protected routes
- Job posting CRUD for company recruiters
- Candidate-only application submission
- Company staff-only application review and stage updates
- Workflow validation to enforce valid application transitions
- Application history audit records for every stage change
- Asynchronous notification handling through Redis queue
- Worker log output written to `mock_emails.log`

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed for local script and test execution
- npm available to run tests and TypeORM commands

## Setup

1. Install dependencies locally:

   ```bash
   npm install
   ```

2. Copy the environment example file:

   ```bash
   cp .env.example .env
   ```

3. Start the Docker services:

   ```bash
   docker compose up -d
   ```

4. Run TypeORM migrations:

   ```bash
   npm run migration:run
   ```

5. Start the API server in development mode:

   ```bash
   npm run dev
   ```

6. Start the worker process separately if not using Docker Compose:

   ```bash
   npm run worker
   ```

## Docker Compose

`docker-compose.yml` defines four services:

- `db` - PostgreSQL database
- `queue` - Redis queue
- `api` - Express API server
- `worker` - BullMQ worker for notification jobs

The worker service mounts `./mock_emails.log` into the container so notification output is visible on the host.

## Environment Configuration

Important `.env` values:

- `DB_HOST` - database host (usually `db` inside Docker)
- `DB_PORT` - database port
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - database name
- `QUEUE_URL` - Redis connection URL
- `JWT_SECRET` - secret used to sign JWT tokens
- `JWT_EXPIRES_IN` - token TTL
- `PORT` - API port

Do not commit `.env` to version control.

## Authentication

Users can register and login through:

- `POST /api/auth/register`
- `POST /api/auth/login`

The registration endpoint supports three roles:

- `candidate`
- `recruiter`
- `hiring_manager`

Recruiters and hiring managers must include `company_id` at registration.

## Role-Based Access Control

Protected routes require a valid JWT and enforce roles:

- `candidate` can submit job applications and view own applications
- `recruiter` can create, update, delete jobs and review applications for their company
- `hiring_manager` can review applications for their company and update application stage

The RBAC middleware checks the requester role before allowing access.

## Application Workflow and State Machine

The application stage lifecycle is enforced by `src/services/stateMachine.ts`.

Valid transitions include:

- `Applied -> Screening`
- `Screening -> Interview`
- `Interview -> Offer`
- `Offer -> Hired`
- any non-terminal stage -> `Rejected`

Invalid transitions, such as skipping stages or moving backwards, are rejected with a `400` response.

## API Endpoints

### Public

- `POST /api/auth/register`
- `POST /api/auth/login`

### Authenticated

- `GET /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/applications/:applicationId`

### Recruiter only

- `POST /api/jobs`
- `PUT /api/jobs/:id`
- `DELETE /api/jobs/:id`

### Candidate only

- `POST /api/jobs/:jobId/applications`
- `GET /api/applications/me`

### Company staff

- `PUT /api/applications/:applicationId/stage`
- `GET /api/jobs/:jobId/applications`

## Notification Worker

Notifications are queued from the API and processed by the worker. The worker appends structured JSON messages to `mock_emails.log` rather than sending real email.

This includes notifications for:

- application submission received by the candidate
- new applicant alerts for the recruiter
- stage update notifications for the candidate

## Logging

- API logs are written to the console inside the container
- Worker notifications are written to `mock_emails.log`
- The worker log entry format is one JSON object per line

Example log entry:

```json
{"timestamp":"2026-07-15T17:49:17.009Z","to":"cand@test.com","subject":"Application Received: Software Engineer","body":"Thank you for applying to Software Engineer."}
```

## Testing

Run unit tests with Jest:

```bash
npm test -- --runInBand
```

The repository includes tests for:

- RBAC middleware behavior
- application stage transition validation

## Development Notes

- Sensitive fields like `password_hash` are sanitized before API responses.
- Application creation and stage changes use transactions and audit history records.
- The worker shares the same Redis queue connection string via `QUEUE_URL`.

## Common Commands

```bash
npm install
npm run dev
npm run worker
npm run build
npm test -- --runInBand
npm run migration:run
```

## Troubleshooting

- If the API fails to start, verify `.env` values and Docker Compose connectivity.
- If the worker does not write logs, confirm `mock_emails.log` exists and the worker container has permission to append.
- If database migrations fail, verify the `DB_*` environment variables and that PostgreSQL is reachable.

## Notes

- `mock_emails.log` is intentionally mocked for local development and demo purposes.
- The queue worker uses a root-level bind mount to keep log output accessible on the host.
- This repository is intended as a backend demonstration of RBAC, state management, and async queue integration.
