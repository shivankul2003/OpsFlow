# OpsFlow Architecture

## Components

- Frontend: React and Vite provide the user interface.
- Backend: Express.js exposes REST API endpoints.
- Authentication: JWT identifies the current user.
- Authorization: The backend checks roles and team permissions.
- Database: SQLite stores users, teams, work items, activity events, and idempotency records.
- Demo setup: backend/seed.js creates demo teams and accounts.

## Architecture Diagram

```mermaid
flowchart TD
    U["Team Lead / Member"] --> UI["React + Vite Frontend"]
    UI -->|HTTP Requests + JWT| API["Express.js REST API"]
    API --> AUTH["JWT Authentication"]
    AUTH --> RBAC["Role and Team Authorization"]
    RBAC --> DB[("SQLite Database")]
    DB --> USERS["Users and Teams"]
    DB --> ITEMS["Work Items"]
    DB --> ACTIVITY["Activity Events"]
    DB --> IDEM["Idempotency Keys"]
    SEED["Demo Seed Script"] --> DB
```

## Important Design Choices

- Authorization is enforced by the backend.
- Database transactions help keep work-item changes and activity history consistent.
- Version numbers help detect stale updates.
- Idempotency keys help prevent duplicate work-item creation during retries.
