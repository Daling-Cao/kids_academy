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
    role TEXT NOT NULL DEFAULT 'student'
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
`);

// Seed initial data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync('password', 10);

  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('teacher', hashedPassword, 'teacher');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('student', hashedPassword, 'student');

  const insertBuilding = db.prepare('INSERT INTO buildings (name, description, coverImage, orderIndex) VALUES (?, ?, ?, ?)');
  const b1 = insertBuilding.run('Beginner Building', 'Start your Scratch journey here.', '', 1);
  const b2 = insertBuilding.run('Advanced Building', 'Master complex Scratch concepts.', '', 2);

  const insertProject = db.prepare('INSERT INTO projects (buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, isLocked, orderIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertProject.run(b1.lastInsertRowid, 'Scratch Basics', 'Learn the basics of Scratch programming.', 'Welcome to Scratch! In this lesson, we will learn how to make a sprite move.', '', '31876', '', 0, 1);
  insertProject.run(b1.lastInsertRowid, 'Animation', 'Create your first animation.', 'Let us animate a character.', '', '10128407', '', 0, 2);
  insertProject.run(b2.lastInsertRowid, 'Games', 'Build a simple game.', 'Time to build a game!', '', '10128515', '', 1, 1);
}

export default db;
