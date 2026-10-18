# OpsFlow — Team Work Item Management

OpsFlow is a team-based work item management application for tracking tasks, bugs, and incidents through a controlled workflow. It includes role-based access control, team isolation, activity history, idempotent work-item creation, and optimistic concurrency checks.

## Features

- JWT-based authentication
- Lead and Member roles
- Team-scoped work item access
- Create and view tasks, bugs, and incidents
- Filter by status, priority, and search terms
- Quick views for assigned items, unassigned urgent items, and pending approvals
- Claim work items with atomic claim handling
- Workflow status transitions with Lead-only resolution approval
- Activity history for work items
- Version checks to reject stale updates
- Idempotent work-item creation using the `Idempotency-Key` header
- Paginated backend listing API

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **Database:** SQLite with better-sqlite3
- **Authentication:** JWT and bcrypt

## Prerequisites

Install Node.js and npm before running the project.

## Setup

1. Install root dependencies from the project root:

   ```bash
   npm install
   ```

2. Create a local `.env` file based on `.env.example`. Set a strong, private `JWT_SECRET`. Never commit `.env` or share its secrets.

3. Start the backend:

   ```bash
   npm start
   ```

4. Open a second terminal, navigate to the frontend directory, and start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Demo Accounts

For local development, the seeded demo accounts use this password:

`OpsFlow@123`

- **Lead:** `olivia@opsflow.local`
- **Member:** `oliver@opsflow.local`
- **Lead:** `ethan@opsflow.local`
- **Member:** `emma@opsflow.local`

Use these demo credentials only in the local development environment.

## Workflow

Work items follow these transitions:

- Open → In Progress
- In Progress → Open or Awaiting Approval
- Awaiting Approval → In Progress or Resolved
- Resolved → In Progress or Closed

Only a Lead can move an item to Resolved. The API validates status transitions and checks the item's version to reject stale updates.

## API Overview

- `POST /api/auth/login` — authenticate
- `GET /api/auth/me` — retrieve the current user
- `GET /api/work-items` — list and filter work items
- `POST /api/work-items` — create a work item
- `PATCH /api/work-items/:id/status` — update status
- `POST /api/work-items/:id/claim` — claim an item
- `GET /api/work-items/:id/activity` — view activity history

Protected endpoints require a valid bearer token.

When creating a work item, clients can supply an `Idempotency-Key` header to safely retry the same request without creating a duplicate. Reusing the same key with a different request returns a conflict response.

## Tests

Start the backend first, then run this command from the project root:

npm test



The API tests cover authentication, team isolation, role-based approval, stale updates, activity history, concurrent claims, and idempotent creation (including conflicting reuse of an idempotency key).

## Project Structure


```text
OpsFlow/
├── backend/
│   ├── database.js
│   ├── seed.js
│   └── server.js
├── frontend/
│   └── src/
├── tests/
│   └── api.test.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Known Limitations

- SQLite is suitable for this local demonstration, but production use would require evaluating database concurrency, backups, monitoring, and scaling.
- Automated tests cover key authorization, workflow, stale-version, activity-history, and concurrent-claim behaviours. Additional edge cases and broader test coverage remain possible.
- The application has not undergone a formal security audit and is intended as a demonstration project, not a production-ready deployment.
