
const db = require("./database");
const bcrypt = require("bcryptjs");

// Create demo teams
const insertTeam = db.prepare(
  "INSERT OR IGNORE INTO teams (name) VALUES (?)"
);

insertTeam.run("Operations");
insertTeam.run("Engineering");

// Get team IDs from the database
const getTeam = db.prepare(
  "SELECT id FROM teams WHERE name = ?"
);

const operationsTeam = getTeam.get("Operations").id;
const engineeringTeam = getTeam.get("Engineering").id;

// Demo accounts for local development only
const users = [
  {
    name: "Olivia Operations Lead",
    email: "olivia@opsflow.local",
    password: "OpsFlow@123",
    role: "Lead",
    teamId: operationsTeam,
  },
  {
    name: "Oliver Operations Member",
    email: "oliver@opsflow.local",
    password: "OpsFlow@123",
    role: "Member",
    teamId: operationsTeam,
  },
  {
    name: "Ethan Engineering Lead",
    email: "ethan@opsflow.local",
    password: "OpsFlow@123",
    role: "Lead",
    teamId: engineeringTeam,
  },
  {
    name: "Emma Engineering Member",
    email: "emma@opsflow.local",
    password: "OpsFlow@123",
    role: "Member",
    teamId: engineeringTeam,
  },
];

// Store hashed passwords, never plain-text passwords
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users
    (name, email, password_hash, role, team_id)
  VALUES (?, ?, ?, ?, ?)
`);

const seedUsers = db.transaction(() => {
  for (const user of users) {
    const passwordHash = bcrypt.hashSync(user.password, 10);

    insertUser.run(
      user.name,
      user.email,
      passwordHash,
      user.role,
      user.teamId
    );
  }
});

seedUsers();

console.log("Demo teams and users created successfully.");
console.log("Teams: Operations, Engineering");
console.log("Demo accounts use the password: OpsFlow@123");

db.close();
