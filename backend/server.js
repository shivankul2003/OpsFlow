
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const db = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required.",
    });
  }

  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "OpsFlow API is running!",
    status: "success",
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: "Email and password are required.",
    });
  }

  const user = db.prepare(`
    SELECT id, name, email, password_hash, role, team_id
    FROM users
    WHERE email = ?
  `).get(email.trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({
      message: "Server authentication is not configured.",
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      teamId: user.team_id,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  return res.json({
    message: "Login successful.",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.team_id,
    },
  });
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    message: "Authenticated successfully.",
    user: req.user,
  });
});

app.get("/api/work-items", authenticateToken, (req, res) => {
  const user = req.user;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
  );
  const offset = (page - 1) * limit;

  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim();
  const priority = String(req.query.priority || "").trim();
  const quickView = String(req.query.quickView || "all").trim();

  const conditions = ["wi.team_id = ?"];
  const params = [user.teamId];

  if (search) {
    conditions.push("(wi.title LIKE ? OR wi.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push("wi.status = ?");
    params.push(status);
  }

  if (priority) {
    conditions.push("wi.priority = ?");
    params.push(priority);
  }

  if (quickView === "assigned") {
    conditions.push("wi.assignee_id = ?");
    params.push(user.id);
  }

  if (quickView === "urgent") {
    conditions.push(
      "wi.assignee_id IS NULL AND wi.priority IN ('High', 'Critical') AND wi.status NOT IN ('Resolved', 'Closed')"
    );
  }

  if (quickView === "approval") {
    if (user.role === "Lead") {
      conditions.push("wi.status = 'Awaiting Approval'");
    } else {
      conditions.push("1 = 0");
    }
  }

  const whereClause = conditions.join(" AND ");

  const items = db.prepare(`
    SELECT
      wi.id,
      wi.title,
      wi.description,
      wi.type,
      wi.priority,
      wi.status,
      wi.team_id AS teamId,
      wi.assignee_id AS assigneeId,
      wi.created_by AS createdBy,
      u_assignee.name AS assigneeName,
      u_creator.name AS creatorName,
      wi.due_date AS dueDate,
      wi.version,
      wi.created_at AS createdAt,
      wi.updated_at AS updatedAt
    FROM work_items wi
    LEFT JOIN users u_assignee ON u_assignee.id = wi.assignee_id
    LEFT JOIN users u_creator ON u_creator.id = wi.created_by
    WHERE ${whereClause}
    ORDER BY wi.updated_at DESC, wi.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) AS total
    FROM work_items wi
    WHERE ${whereClause}
  `).get(...params).total;

  return res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

app.post("/api/work-items", authenticateToken, (req, res) => {
  const {
    title,
    description = "",
    type = "Task",
    priority = "Medium",
    dueDate = null,
  } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      message: "A work item title is required.",
    });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({
      message: "Title must be 200 characters or fewer.",
    });
  }

  if (typeof description !== "string" || description.length > 5000) {
    return res.status(400).json({
      message: "Description must be text with at most 5000 characters.",
    });
  }

  if (!["Task", "Bug", "Incident"].includes(type)) {
    return res.status(400).json({
      message: "Type must be Task, Bug, or Incident.",
    });
  }

  if (!["Low", "Medium", "High", "Critical"].includes(priority)) {
    return res.status(400).json({
      message: "Priority must be Low, Medium, High, or Critical.",
    });
  }

  if (
    dueDate !== null &&
    (typeof dueDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      Number.isNaN(Date.parse(dueDate)))
  ) {
    return res.status(400).json({
      message: "Due date must use YYYY-MM-DD format.",
    });
  }

  const idempotencyKey = req.get("Idempotency-Key");

  if (
    idempotencyKey !== undefined &&
    (!idempotencyKey.trim() || idempotencyKey.length > 128)
  ) {
    return res.status(400).json({
      message: "Idempotency-Key must be between 1 and 128 characters.",
    });
  }

  const requestHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title: title.trim(),
        description,
        type,
        priority,
        dueDate,
      })
    )
    .digest("hex");

  if (idempotencyKey !== undefined) {
    const existingRequest = db.prepare(`
      SELECT
        request_hash AS requestHash,
        response_json AS responseJson
      FROM idempotency_keys
      WHERE user_id = ? AND idempotency_key = ?
    `).get(req.user.id, idempotencyKey);

    if (existingRequest) {
      if (existingRequest.requestHash !== requestHash) {
        return res.status(409).json({
          message: "Idempotency key was already used with a different request.",
        });
      }

      return res.status(201).json(
        JSON.parse(existingRequest.responseJson)
      );
    }
  }

  const createItem = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO work_items
        (title, description, type, priority, status, team_id, created_by, due_date)
      VALUES (?, ?, ?, ?, 'Open', ?, ?, ?)
    `).run(
      title.trim(),
      description,
      type,
      priority,
      req.user.teamId,
      req.user.id,
      dueDate
    );

    const itemId = result.lastInsertRowid;

    db.prepare(`
      INSERT INTO activity_events
        (work_item_id, actor_id, event_type, details)
      VALUES (?, ?, 'ITEM_CREATED', ?)
    `).run(
      itemId,
      req.user.id,
      `Created work item: ${title.trim()}`
    );

    const item = db.prepare(`
      SELECT
        id,
        title,
        description,
        type,
        priority,
        status,
        team_id AS teamId,
        created_by AS createdBy,
        due_date AS dueDate,
        version,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM work_items
      WHERE id = ?
    `).get(itemId);

    const responseBody = {
      message: "Work item created successfully.",
      item,
    };

    if (idempotencyKey !== undefined) {
      db.prepare(`
        INSERT INTO idempotency_keys
          (user_id, idempotency_key, request_hash, response_json)
        VALUES (?, ?, ?, ?)
      `).run(
        req.user.id,
        idempotencyKey,
        requestHash,
        JSON.stringify(responseBody)
      );
    }

    return responseBody;
  });

  try {
    const responseBody = createItem();
    return res.status(201).json(responseBody);
  } catch (error) {
    if (
      idempotencyKey !== undefined &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      const existingRequest = db.prepare(`
        SELECT
          request_hash AS requestHash,
          response_json AS responseJson
        FROM idempotency_keys
        WHERE user_id = ? AND idempotency_key = ?
      `).get(req.user.id, idempotencyKey);

      if (existingRequest) {
        if (existingRequest.requestHash !== requestHash) {
          return res.status(409).json({
            message: "Idempotency key was already used with a different request.",
          });
        }

        return res.status(201).json(
          JSON.parse(existingRequest.responseJson)
        );
      }
    }

    console.error("Failed to create work item:", error);
    return res.status(500).json({
      message: "Could not create work item.",
    });
  }
});

app.patch("/api/work-items/:id/status", authenticateToken, (req, res) => {
  const itemId = Number.parseInt(req.params.id, 10);
  const { status, version } = req.body || {};
  const user = req.user;

  if (!Number.isInteger(itemId) || itemId < 1) {
    return res.status(400).json({
      message: "Invalid work item ID.",
    });
  }

  const validStatuses = [
    "Open",
    "In Progress",
    "Awaiting Approval",
    "Resolved",
    "Closed",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid work item status.",
    });
  }

  if (!Number.isInteger(version) || version < 1) {
    return res.status(400).json({
      message: "A valid item version is required.",
    });
  }

  const item = db.prepare(`
    SELECT id, title, status, team_id AS teamId, version
    FROM work_items
    WHERE id = ?
  `).get(itemId);

  if (!item || item.teamId !== user.teamId) {
    return res.status(404).json({
      message: "Work item not found.",
    });
  }

  if (item.version !== version) {
    return res.status(409).json({
      message: "This work item has changed. Refresh and try again.",
      currentVersion: item.version,
    });
  }

  const allowedTransitions = {
    Open: ["In Progress"],
    "In Progress": ["Open", "Awaiting Approval"],
    "Awaiting Approval": ["In Progress", "Resolved"],
    Resolved: ["Closed", "In Progress"],
    Closed: [],
  };

  if (!allowedTransitions[item.status].includes(status)) {
    return res.status(400).json({
      message: `Cannot change status from ${item.status} to ${status}.`,
    });
  }

  if (status === "Resolved" && user.role !== "Lead") {
    return res.status(403).json({
      message: "Only a Lead can approve and resolve a work item.",
    });
  }

  const updateItem = db.transaction(() => {
    const result = db.prepare(`
      UPDATE work_items
      SET status = ?,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND team_id = ? AND version = ?
    `).run(status, itemId, user.teamId, version);

    if (result.changes !== 1) {
      return false;
    }

    db.prepare(`
      INSERT INTO activity_events
        (work_item_id, actor_id, event_type, details)
      VALUES (?, ?, 'STATUS_CHANGED', ?)
    `).run(
      itemId,
      user.id,
      `Status changed from ${item.status} to ${status}`
    );

    return true;
  });

  if (!updateItem()) {
    return res.status(409).json({
      message: "This work item changed during your update. Please refresh.",
    });
  }

  return res.json({
    message: "Work item status updated successfully.",
    item: {
      id: item.id,
      title: item.title,
      previousStatus: item.status,
      status,
      version: version + 1,
    },
  });
});

app.post("/api/work-items/:id/claim", authenticateToken, (req, res) => {
  const itemId = Number.parseInt(req.params.id, 10);
  const user = req.user;

  if (!Number.isInteger(itemId) || itemId < 1) {
    return res.status(400).json({
      message: "Invalid work item ID.",
    });
  }

  const claimItem = db.transaction(() => {
    const item = db.prepare(`
      SELECT
        id,
        title,
        status,
        team_id AS teamId,
        assignee_id AS assigneeId,
        version
      FROM work_items
      WHERE id = ?
    `).get(itemId);

    if (!item || item.teamId !== user.teamId) {
      return { error: 404, message: "Work item not found." };
    }

    if (item.status === "Closed" || item.status === "Resolved") {
      return {
        error: 400,
        message: "Resolved or closed work items cannot be claimed.",
      };
    }

    if (item.assigneeId !== null) {
      return {
        error: 409,
        message: "This work item has already been claimed.",
      };
    }

    const result = db.prepare(`
      UPDATE work_items
      SET assignee_id = ?,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND team_id = ?
        AND assignee_id IS NULL
        AND version = ?
    `).run(user.id, itemId, user.teamId, item.version);

    if (result.changes !== 1) {
      return {
        error: 409,
        message: "This work item was claimed or changed by someone else. Refresh and try again.",
      };
    }

    db.prepare(`
      INSERT INTO activity_events
        (work_item_id, actor_id, event_type, details)
      VALUES (?, ?, 'ITEM_CLAIMED', ?)
    `).run(itemId, user.id, `Claimed by ${user.email}`);

    return {
      item: {
        id: item.id,
        title: item.title,
        assigneeId: user.id,
        version: item.version + 1,
      },
    };
  });

  const result = claimItem();

  if (result.error) {
    return res.status(result.error).json({
      message: result.message,
    });
  }

  return res.json({
    message: "Work item claimed successfully.",
    item: result.item,
  });
});

app.get("/api/work-items/:id/activity", authenticateToken, (req, res) => {
  const itemId = Number.parseInt(req.params.id, 10);
  const user = req.user;

  if (!Number.isInteger(itemId) || itemId < 1) {
    return res.status(400).json({
      message: "Invalid work item ID.",
    });
  }

  const item = db.prepare(`
    SELECT id
    FROM work_items
    WHERE id = ? AND team_id = ?
  `).get(itemId, user.teamId);

  if (!item) {
    return res.status(404).json({
      message: "Work item not found.",
    });
  }

  const events = db.prepare(`
    SELECT
      ae.id,
      ae.event_type AS eventType,
      ae.details,
      ae.created_at AS createdAt,
      u.name AS actorName,
      u.role AS actorRole
    FROM activity_events ae
    JOIN users u ON u.id = ae.actor_id
    WHERE ae.work_item_id = ?
    ORDER BY ae.id DESC
  `).all(itemId);

  return res.json({
    itemId,
    total: events.length,
    activities: events,
  });
});

app.listen(PORT, () => {
  console.log(`OpsFlow backend running at http://localhost:${PORT}`);
});
