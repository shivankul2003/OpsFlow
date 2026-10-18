# Engineering Decisions



## 1. Team-Scoped Authorization



**Context:** OpsFlow supports multiple teams. Users must not be able to access or modify another team's work items simply by changing an item ID or API request.



**Options considered:**

- Filter work items only in the frontend.

- Enforce team-level access checks in the backend.

- Introduce a separate authorization service.



**Decision:** Enforce team-scoped authorization in the backend for work-item listing and item-specific operations. Frontend controls are used for usability, not as the security boundary.



**Trade-off:** Backend enforcement provides stronger protection against unauthorized access, but every new endpoint must apply the appropriate authorization checks consistently.



## 2. Role-Based Workflow Permissions



**Context:** OpsFlow distinguishes between Lead and Member roles. Members can work on items and request approval, while resolution requires Lead authorization.



**Options considered:**

- Allow all authenticated users to perform every transition.

- Restrict actions only through frontend buttons.

- Validate roles and workflow transitions in the backend.



**Decision:** Use backend-enforced role permissions and valid workflow transitions. Only Leads can resolve items, and invalid transitions are rejected by the API.



**Trade-off:** Explicit permission checks make the workflow more reliable and secure, but add validation logic that must be maintained as roles and transitions evolve.



## 3. Optimistic Concurrency with Version Numbers



**Context:** Two users may read the same work item and attempt to update it. Without concurrency checks, a later update could silently overwrite a change made by another user.



**Options considered:**

- Accept updates regardless of the version previously observed.

- Use version numbers to detect stale updates.

- Use database locking for all update operations.



**Decision:** Work-item status updates include the version last observed by the client. If the stored version has changed, the API rejects the stale update with HTTP 409 Conflict.



**Trade-off:** Version checks prevent silent lost updates and provide a clear conflict response, but clients must handle conflicts and refresh the latest item state.



## 4. Transactions for Work-Item Changes and Activity History



**Context:** Work-item changes and their activity events must remain consistent. A status change should not succeed without its corresponding history entry.



**Options considered:**

- Update the work item and record activity in separate operations.

- Use a database transaction for both changes.

- Record activity asynchronously after updating the work item.



**Decision:** Use database transactions for operations that modify a work item and record its activity event, so both changes succeed or fail together.



**Trade-off:** Transactions improve consistency and simplify failure handling, but require careful transaction boundaries and error handling.



## 5. Idempotent Work-Item Creation



**Context:** A client may retry a creation request after a timeout without knowing whether the original request succeeded. Retrying without protection can create duplicate work items.



**Options considered:**

- Accept every creation request as a new item.

- Rely on the frontend to prevent repeated submissions.

- Support an Idempotency-Key and persist the request result.



**Decision:** Support the Idempotency-Key header for work-item creation. The backend stores the request hash and original response. Repeating the same key with the same request returns the saved result; reusing the key with a different request returns HTTP 409 Conflict.



**Trade-off:** Idempotency makes retries safer and helps prevent duplicate creation, but requires persistent key records, request-hash validation, and handling of concurrent requests.



## 6. SQLite for a Self-Contained Prototype



**Context:** The assignment needs a straightforward local setup that reviewers can run without managing a separate database server.



**Options considered:**

- Use SQLite for local persistence.

- Require a separately managed database server.

- Introduce a more complex distributed data architecture.



**Decision:** Use SQLite with better-sqlite3 to keep the prototype self-contained and easy to run locally.



**Trade-off:** SQLite reduces setup complexity, but production deployment would require evaluating write concurrency, backups, monitoring, availability, and scaling requirements.



## Known Limitations



- The application is a demonstration project and has not undergone a formal security audit.

- Automated coverage can be expanded for additional workflow edge cases, idempotency scenarios, and concurrent operations.

- SQLite is appropriate for the current prototype, but production-scale workloads would require further database and deployment evaluation.

- Production deployment would also require operational monitoring, backup and recovery procedures, and a review of authentication and secret-management practices.

