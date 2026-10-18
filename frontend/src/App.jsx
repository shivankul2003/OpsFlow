
import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
  const [email, setEmail] = useState("olivia@opsflow.local");
  const [password, setPassword] = useState("OpsFlow@123");
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [activities, setActivities] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [quickView, setQuickView] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [type, setType] = useState("Task");
  const [dueDate, setDueDate] = useState("");

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setToken(data.token);
      setUser(data.user);
      setMessage("Welcome to OpsFlow!");

      const listResponse = await fetch(`${API_URL}/work-items`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const listData = await listResponse.json();

      if (!listResponse.ok) {
        throw new Error(listData.message || "Could not load work items.");
      }

      setItems(listData.items);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(view = quickView) {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (view !== "all") params.set("quickView", view);
      const data = await request(`/work-items?${params.toString()}`);
      setItems(data.items);
    } catch (error) {
      setMessage(error.message);
    }
  }

  
  async function loadActivity(itemId) {
    try {
      const data = await request(`/work-items/${itemId}/activity`);
      setActivities((previous) => ({
        ...previous,
        [itemId]: data.activities || data,
      }));
    } catch (error) {
      setMessage(error.message);
    }
  }


  async function createItem(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await request("/work-items", {
        method: "POST",
        body: JSON.stringify({
  title,
  description,
  type,
  priority,
  dueDate: dueDate || null,
}),
      });

      setTitle("");
      setDescription("");
      setType("Task");
      setPriority("Medium");
      setDueDate("");
      setMessage("Work item created successfully.");
      await loadItems();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(item, nextStatus) {
    setMessage("");

    try {
      await request(`/work-items/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, version: item.version }),
      });

      setMessage("Status updated successfully.");
      await loadItems();
    } catch (error) {
      setMessage(error.message);
      await loadItems();
    }
  }

  async function claimItem(item) {
    setMessage("");

    try {
      await request(`/work-items/${item.id}/claim`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      setMessage("Work item claimed successfully.");
      await loadItems();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setItems([]);
    setMessage("You have logged out.");
  }

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-mark">O</div>
          <p className="eyebrow">OPERATIONS WORKSPACE</p>
          <h1>Welcome to OpsFlow</h1>
          <p className="muted">
            Keep work visible. Keep teams moving.
          </p>

          <form onSubmit={login} className="stack">
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to OpsFlow"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}

          <p className="demo-note">
            Demo: olivia@opsflow.local · OpsFlow@123
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark small">O</div>
          <span>OpsFlow</span>
        </div>

        <div className="user-area">
          <div>
            <strong>{user.name}</strong>
            <p>{user.role} · Team {user.teamId}</p>
          </div>
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="welcome">
        <p className="eyebrow">TEAM WORKSPACE</p>
        <h1>Work, under control.</h1>
        <p className="muted">
          Track incidents, manage priorities, and move work forward.
        </p>
      </section>

      {message && <div className="message banner">{message}</div>}

      <section className="stats">
        <div className="stat-card">
          <span>Total visible items</span>
          <strong>{items.length}</strong>
        </div>
        <div className="stat-card">
          <span>Open</span>
          <strong>{items.filter((i) => i.status === "Open").length}</strong>
        </div>
        <div className="stat-card">
          <span>In progress</span>
          <strong>{items.filter((i) => i.status === "In Progress").length}</strong>
        </div>
        <div className="stat-card">
          <span>Awaiting approval</span>
          <strong>
            {items.filter((i) => i.status === "Awaiting Approval").length}
          </strong>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel create-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEW WORK</p>
              <h2>Create work item</h2>
            </div>
          </div>

          <form onSubmit={createItem} className="stack">
            <label>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs attention?"
                maxLength={200}
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add useful context..."
                rows={3}
              />
            </label>

            <label>
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>

            <div className="form-row">
              <label>
                Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option>Task</option>
                  <option>Bug</option>
                  <option>Incident</option>
                </select>
              </label>

              <label>
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </label>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "+ Create work item"}
            </button>
          </form>
        </div>

        <div className="panel items-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LIVE QUEUE</p>
              <h2>Team work items</h2>
            </div>
            <button className="secondary" onClick={loadItems}>
              Refresh
            </button>
          </div>

          <div className="filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search work..."
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Awaiting Approval</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All priorities</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>

            <div className="quick-views">
  <button
    className="secondary"
    onClick={() => {
      setQuickView("all");
      loadItems("all");
    }}
  >
    All Items
  </button>

  <button
    className="secondary"
    onClick={() => {
      setQuickView("assigned");
      loadItems("assigned");
    }}
  >
    Assigned to Me
  </button>

  <button
    className="secondary"
    onClick={() => {
      setQuickView("urgent");
      loadItems("urgent");
    }}
  >
    Unassigned Urgent
  </button>

  <button
    className="secondary"
    onClick={() => {
      setQuickView("approval");
      loadItems("approval");
    }}
  >
    Awaiting My Approval
  </button>
</div>
            <button className="secondary" onClick={loadItems}>
              Apply filters
            </button>
          </div>

          <div className="item-list">
            {items.length === 0 ? (
              <div className="empty-state">
                <span>◌</span>
                <h3>No work items found</h3>
                <p>Create an item or change your filters.</p>
              </div>
            ) : (
              items.map((item) => (
                <article className="work-item" key={item.id}>
                  <div className="item-topline">
                    <span className={`type-tag ${item.type.toLowerCase()}`}>
                      {item.type}
                    </span>
                    <span className={`priority ${item.priority.toLowerCase()}`}>
                      {item.priority}
                    </span>
                  </div>

                  <h3>{item.title}</h3>
                  <p className="item-description">
                    {item.description || "No description provided."}
                  </p>

                  
<div className="item-meta">
    <span>#{item.id}</span>
    <span className="status-tag">{item.status}</span>
    <span>Version {item.version}</span>
    {item.dueDate && <span>Due date: {item.dueDate}</span>}
    <span>Created by: {item.creatorName || "Unknown"}</span>
    <span>Assigned to: {item.assigneeName || "Unassigned"}</span>
</div>


                  <div className="item-actions">
                    
<button
  className="secondary"
  onClick={() => loadActivity(item.id)}
>
  View Activity History
</button>

                    {!item.assigneeId && (
                      <button
                        className="secondary"
                        onClick={() => claimItem(item)}
                      >
                        Claim item
                      </button>
                    )}

                    {item.status === "Open" && (
                      <button onClick={() => changeStatus(item, "In Progress")}>
                        Start work
                      </button>
                    )}

                    {item.status === "In Progress" && (
                      <button
                        onClick={() =>
                          changeStatus(item, "Awaiting Approval")
                        }
                      >
                        Request approval
                      </button>
                    )}

                    {item.status === "Awaiting Approval" &&
                      user.role === "Lead" && (
                        <button onClick={() => changeStatus(item, "Resolved")}>
                          Approve & resolve
                        </button>
                      )}

                    {item.status === "Awaiting Approval" &&
                      user.role === "Member" && (
                        <button
                          className="secondary"
                          onClick={() => changeStatus(item, "In Progress")}
                        >
                          Return to work
                        </button>
                      )}

                    {item.status === "Resolved" && (
                      <button onClick={() => changeStatus(item, "Closed")}>
                        Close item
                      </button>
                    )}
                  </div>
                
                  {activities[item.id] && (
                    <div className="activity-history">
                      <h4>Activity History</h4>
                      {activities[item.id].length === 0 ? (
                        <p>No activity recorded yet.</p>
                      ) : (
                        activities[item.id].map((activity) => (
                          <div key={activity.id} className="activity-entry">
                            <strong>{activity.actorName || "Team member"}</strong>
                            <p>{activity.details || activity.eventType || "Activity recorded"}</p>
                            <small>{activity.createdAt || activity.created_at || ""}</small>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <footer>
        OpsFlow · Built for reliable team operations
      </footer>
    </main>
  );
}

export default App;
