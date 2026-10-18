\# Engineering Decisions



\## 1. Team-Scoped Authorization



Every authenticated user is associated with a team. Work item queries and item-specific operations are restricted to the user's team. This prevents users from accessing another team's work through the API.



\## 2. Role-Based Workflow Permissions



OpsFlow distinguishes between Lead and Member roles. Members can work on items and request approval, while only Leads can resolve items. Workflow transitions are validated by the backend rather than relying on frontend controls.



\## 3. Optimistic Concurrency with Version Numbers



Each work item has a version number. Status updates include the version the client last observed. If the stored version has changed, the API rejects the stale update with HTTP 409 instead of silently overwriting newer work.



\## 4. Transactions for Multi-Step Changes



Operations that update a work item and record an activity event use database transactions. This keeps the work item change and its audit history consistent when an operation fails.



\## 5. SQLite for a Self-Contained Prototype



SQLite keeps local setup simple and avoids requiring a separately managed database service. It is appropriate for a small demonstration application. A larger production deployment would need additional evaluation of database concurrency, operational backups, and scaling requirements.



\## Known Limitations



\- Automated coverage can be expanded for concurrent claims, idempotent creation, and additional invalid workflow transitions.

\- The application is intended as a demonstration project and has not been security-audited for production use.



