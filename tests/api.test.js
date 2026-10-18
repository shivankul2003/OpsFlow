
const { test, before } = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL = "http://localhost:5000/api";
const PASSWORD = "OpsFlow@123";

let operationsLeadToken;
let operationsMemberToken;
let engineeringLeadToken;
let createdItemId;

async function login(email) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  const data = await response.json();
  assert.equal(response.status, 200, `Login failed for ${email}`);
  assert.ok(data.token, `No token returned for ${email}`);
  return data.token;
}

async function api(path, token, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { status: response.status, data };
}

before(async () => {
  operationsLeadToken = await login("olivia@opsflow.local");
  operationsMemberToken = await login("oliver@opsflow.local");
  engineeringLeadToken = await login("ethan@opsflow.local");

  const result = await api("/work-items", operationsLeadToken, {
    method: "POST",
    body: JSON.stringify({
      title: `Automated security test ${Date.now()}`,
      description: "Temporary item created by the automated API test suite.",
      type: "Task",
      priority: "Low",
    }),
  });

  assert.equal(result.status, 201, "Test item creation failed");
  createdItemId = result.data.item.id;
});

test("Unauthenticated requests are rejected", async () => {
  const result = await fetch(`${BASE_URL}/work-items`);
  assert.equal(result.status, 401);
});

test("A team can only list its own work items", async () => {
  const result = await api("/work-items", engineeringLeadToken);
  assert.equal(result.status, 200);

  const leakedItem = result.data.items.some(
    (item) => item.id === createdItemId
  );

  assert.equal(leakedItem, false);
});

test("Cross-team item access is denied", async () => {
  const result = await api(
    `/work-items/${createdItemId}/activity`,
    engineeringLeadToken
  );

  assert.equal(result.status, 404);
});

test("A Member cannot approve a work item", async () => {
  const moveToProgress = await api(
    `/work-items/${createdItemId}/status`,
    operationsLeadToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "In Progress",
        version: 1,
      }),
    }
  );

  assert.equal(moveToProgress.status, 200);

  const requestApproval = await api(
    `/work-items/${createdItemId}/status`,
    operationsMemberToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "Awaiting Approval",
        version: 2,
      }),
    }
  );

  assert.equal(requestApproval.status, 200);

  const approval = await api(
    `/work-items/${createdItemId}/status`,
    operationsMemberToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "Resolved",
        version: 3,
      }),
    }
  );

  assert.equal(approval.status, 403);
});

test("Stale version updates are rejected", async () => {
  const result = await api(
    `/work-items/${createdItemId}/status`,
    operationsLeadToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "In Progress",
        version: 1,
      }),
    }
  );

  assert.equal(result.status, 409);
});

test("Activity history is available to the item's team", async () => {
  const result = await api(
    `/work-items/${createdItemId}/activity`,
    operationsLeadToken
  );

  assert.equal(result.status, 200);
  assert.ok(result.data.total >= 1);
  assert.ok(Array.isArray(result.data.activities));
});

test("Concurrent claims allow only one user to claim an item", async () => {
  const createResult = await api("/work-items", operationsLeadToken, {
    method: "POST",
    body: JSON.stringify({
      title: `Concurrent claim test ${Date.now()}`,
      description: "Temporary item for concurrent claim testing.",
      type: "Task",
      priority: "High",
    }),
  });

  assert.equal(createResult.status, 201);
  const itemId = createResult.data.item.id;

  const [firstClaim, secondClaim] = await Promise.all([
    api(`/work-items/${itemId}/claim`, operationsMemberToken, {
      method: "POST",
    }),
    api(`/work-items/${itemId}/claim`, operationsLeadToken, {
      method: "POST",
    }),
  ]);

  const statuses = [firstClaim.status, secondClaim.status].sort();

  assert.deepEqual(statuses, [200, 409]);
});
