\# OpsFlow — Team Work Item Management



OpsFlow is a team-based work item management application built to track tasks, bugs, and incidents through a controlled workflow. It includes role-based access, team isolation, activity history, and optimistic concurrency checks.



\## Features



\- JWT-based authentication

\- Lead and Member roles

\- Team-scoped work item access

\- Create and view tasks, bugs, and incidents

\- Filter by status, priority, and search terms

\- Quick views for assigned items, unassigned urgent items, and pending approvals

\- Claim work items

\- Workflow status transitions with Lead-only resolution approval

\- Activity history for work items

\- Version checks to reject stale updates

\- Paginated backend listing API



\## Tech Stack



\- Frontend: React, Vite, CSS

\- Backend: Node.js, Express

\- Database: SQLite with better-sqlite3

\- Authentication: JWT and bcrypt



\## Prerequisites



Install Node.js and npm before running the project.



\## Setup



1\. Clone the repository:



&#x20;  ```bash

&#x20;  git clone https://github.com/shivankul2003/OpsFlow.git

&#x20;  cd OpsFlow

&#x20;  ```



2\. Install root dependencies:



&#x20;  ```bash

&#x20;  npm install

&#x20;  ```



3\. Create your local environment file by copying `.env.example` to `.env`. Set a strong, private `JWT\_SECRET` and keep `.env` out of version control.



4\. Start the backend:



&#x20;  ```bash

&#x20;  npm start

&#x20;  ```



5\. Open a second terminal, enter the frontend folder, and install its dependencies:



&#x20;  ```bash

&#x20;  cd frontend

&#x20;  npm install

&#x20;  npm run dev

&#x20;  ```



6\. Open the local URL printed by Vite, usually `http://localhost:5173`.



\## Demo Accounts



For local development, the seeded demo accounts use the following password:



`OpsFlow@123`



\- Lead: `olivia@opsflow.local`

\- Member: `oliver@opsflow.local`

\- Lead: `ethan@opsflow.local`

\- Member: `emma@opsflow.local`



Use demo credentials only in the local development environment.



\## Workflow



Work items follow these transitions:



\- Open → In Progress

\- In Progress → Open or Awaiting Approval

\- Awaiting Approval → In Progress or Resolved

\- Resolved → In Progress or Closed



Only a Lead can move an item to Resolved. The API validates transitions and checks the item's version to reject stale updates.



\## API Overview



\- `POST /api/auth/login` — authenticate

\- `GET /api/auth/me` — retrieve the current user

\- `GET /api/work-items` — list and filter work items

\- `POST /api/work-items` — create a work item

\- `PATCH /api/work-items/:id/status` — update status

\- `POST /api/work-items/:id/claim` — claim an item

\- `GET /api/work-items/:id/activity` — view activity history



Protected endpoints require a valid bearer token.



\## Tests



Start the backend first, then run:



```bash

node --test tests/api.test.js

```



The API tests cover authentication, team isolation, role-based approval, stale updates, and activity history.



\## Project Structure



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



