import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    name TEXT,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    coverImage TEXT,
    orderIndex INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buildingId INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    scratchFileUrl TEXT,
    scratchProjectId TEXT,
    coverImage TEXT,
    isLocked BOOLEAN DEFAULT 1,
    orderIndex INTEGER NOT NULL,
    quizzes TEXT DEFAULT '[]',
    FOREIGN KEY (buildingId) REFERENCES buildings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    userId INTEGER NOT NULL,
    projectId INTEGER NOT NULL,
    state TEXT NOT NULL DEFAULT 'locked',
    PRIMARY KEY (userId, projectId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_building_visibility (
    userId INTEGER NOT NULL,
    buildingId INTEGER NOT NULL,
    isVisible INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (userId, buildingId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (buildingId) REFERENCES buildings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUserId INTEGER NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    isRead INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (fromUserId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '⭐',
    threshold INTEGER NOT NULL DEFAULT 0,
    orderIndex INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coin_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    refType TEXT,
    refId TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migrate existing databases: Add name and avatar columns if they don't exist
const tableInfo = db.pragma('table_info(users)') as any[];
const hasNameColumn = tableInfo.some(col => col.name === 'name');
if (!hasNameColumn) {
  db.exec('ALTER TABLE users ADD COLUMN name TEXT;');
}
const hasAvatarColumn = tableInfo.some(col => col.name === 'avatar');
if (!hasAvatarColumn) {
  db.exec('ALTER TABLE users ADD COLUMN avatar TEXT;');
}

// Migrate messages table: add reply columns if they don't exist
const messagesInfo = db.pragma('table_info(messages)') as any[];
if (messagesInfo.length > 0) {
  const hasReplyColumn = messagesInfo.some(col => col.name === 'reply');
  if (!hasReplyColumn) {
    db.exec('ALTER TABLE messages ADD COLUMN reply TEXT;');
    db.exec('ALTER TABLE messages ADD COLUMN repliedAt TEXT;');
  }
}

// Migrate users table: add coins column if it doesn't exist
const hasCoinsColumn = tableInfo.some(col => col.name === 'coins');
if (!hasCoinsColumn) {
  db.exec('ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;');
}

// Seed initial data if empty
const adminUsername = process.env.ADMIN_USERNAME || 'teacher';
const adminPassword = process.env.ADMIN_PASSWORD || 'password';

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(adminUsername, hashedPassword, 'teacher');

  const insertBuilding = db.prepare('INSERT INTO buildings (name, description, coverImage, orderIndex) VALUES (?, ?, ?, ?)');
  const b1 = insertBuilding.run('Beginner Building', 'Start your Scratch journey here.', '', 1);
  const b2 = insertBuilding.run('Advanced Building', 'Master complex Scratch concepts.', '', 2);

  const insertProject = db.prepare('INSERT INTO projects (buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, isLocked, orderIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertProject.run(b1.lastInsertRowid, 'Scratch Basics', 'Learn the basics of Scratch programming.', 'Welcome to Scratch! In this lesson, we will learn how to make a sprite move.', '', '31876', '', 0, 1);
  insertProject.run(b1.lastInsertRowid, 'Animation', 'Create your first animation.', 'Let us animate a character.', '', '10128407', '', 0, 2);
  insertProject.run(b2.lastInsertRowid, 'Games', 'Build a simple game.', 'Time to build a game!', '', '10128515', '', 1, 1);
} else {
  // Sync teacher credentials from env on every restart
  const teacher = db.prepare('SELECT id FROM users WHERE username = ? AND role = ?').get(adminUsername, 'teacher') as any;
  if (teacher) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, teacher.id);
  }
}

// Seed default ranks if ranks table is empty
const rankCount = db.prepare('SELECT COUNT(*) as count FROM ranks').get() as { count: number };
if (rankCount.count === 0) {
  const insertRank = db.prepare('INSERT INTO ranks (name, icon, threshold, orderIndex) VALUES (?, ?, ?, ?)');
  insertRank.run('RawPixel', '🟩', 0, 1);
  insertRank.run('Logic Initiate', '🔷', 50, 2);
  insertRank.run('Loop Runner', '🔶', 100, 3);
  insertRank.run('SchemaGuardian', '🛡️', 150, 4);
  insertRank.run('BlockHero', '🏆', 200, 5);
}

export default db;
