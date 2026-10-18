# OpsFlow — Team Work Item Management

OpsFlow is a team-based work item management application designed to help teams track tasks, bugs, and incidents through a controlled workflow. It supports authentication, team-level access control, priority management, work item assignment, activity history, and version-based conflict detection.

## Features

- **Authentication:** Login using JWT-based authentication.
- **Role-based access:** Member and Lead roles with approval restrictions.
- **Team isolation:** Users can access work items belonging to their own team.
- **Work item management:** Create and track tasks, bugs, and incidents.
- **Priority and due dates:** Set priorities from Low to Critical and optionally specify a due date.
- **Workflow management:** Open → In Progress → Awaiting Approval → Resolved → Closed, with permitted transitions enforced by the backend.
- **Assignment:** Team members can claim available work items.
- **Activity history:** View recorded actions and status changes.
- **Search and filters:** Search work items and filter by status or priority.
- **Quick Views:** All Items, Assigned to Me, Unassigned Urgent, and Awaiting My Approval.
- **Pagination:** Backend list endpoint supports page and limit parameters.
- **Conflict handling:** Version checks reject stale updates with HTTP 409.
- **API tests:** Automated tests cover authentication, team isolation, role restrictions, stale updates, and activity history.

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- SQLite with better-sqlite3
- JSON Web Tokens (JWT)
- bcryptjs
- dotenv

## Prerequisites

- Node.js and npm
- Git

## Setup and Installation

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd OpsFlow
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the actual repository URL.

### 2. Install backend dependencies

From the project root:

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

```env
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

Use a unique secret for your own environment. Never commit `.env` or real credentials to GitHub.

### 4. Seed the database

If the project includes `backend/seed.js`, run:

```bash
node backend/seed.js
```

Run the seed script only when appropriate for your local database, since it may create or reset demo data depending on its implementation.

### 5. Start the backend

From the project root:

```bash
npm start
```

The API runs at `http://localhost:5000`.

### 6. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Demo Accounts

The development seed includes these demo accounts:

| Role | Email |
|---|---|
| Lead | olivia@opsflow.local |
| Member | oliver@opsflow.local |
| Lead | ethan@opsflow.local |
| Member | emma@opsflow.local |

Demo password: `OpsFlow@123`

These are local development credentials only. Do not use them in production.

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/auth/me` | Get the authenticated user |
| GET | `/api/work-items` | List, search, filter, and paginate work items |
| POST | `/api/work-items` | Create a work item |
| PATCH | `/api/work-items/:id/status` | Update work item status |
| POST | `/api/work-items/:id/claim` | Claim an available work item |
| GET | `/api/work-items/:id/activity` | Retrieve activity history |

Protected endpoints require a valid bearer token.

The work item list endpoint supports `page`, `limit`, `search`, `status`, `priority`, and `quickView` query parameters.

## Workflow and Authorization

- New work items start in `Open`.
- Members can request approval by moving eligible work items to `Awaiting Approval`.
- Only a Lead can move an item to `Resolved`.
- Invalid status transitions are rejected.
- Cross-team access is denied.
- Updates with outdated versions are rejected to help prevent lost updates.
- Claiming a work item uses a database transaction and checks whether the item is still available.

## Running Tests

From the project root:

```bash
node --test tests/api.test.js
```

The API test suite checks authentication, team isolation, approval permissions, stale update rejection, and activity history.

## Project Structure

```text
OpsFlow/
├── backend/
│   ├── server.js
│   ├── seed.js
│   └── opsflow.db
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── ...
├── tests/
│   └── api.test.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

The SQLite database is generated or maintained locally and should not be committed unless the assignment explicitly requires it.

## Engineering Notes

OpsFlow uses server-side authorization to enforce team boundaries and role restrictions. Version-based optimistic concurrency checks help reject stale updates. Database transactions are used for operations that must update related records consistently.

See `ENGINEERING_DECISIONS.md` for the key implementation trade-offs and design decisions.

## Status

This project is an assignment implementation. Run the included tests and verify the setup in a clean environment before using it outside local development.
