import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

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
    FOREIGN KEY (buildingId) REFERENCES buildings(id)
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    userId INTEGER NOT NULL,
    projectId INTEGER NOT NULL,
    state TEXT NOT NULL DEFAULT 'locked',
    PRIMARY KEY (userId, projectId),
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (projectId) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS user_building_visibility (
    userId INTEGER NOT NULL,
    buildingId INTEGER NOT NULL,
    isVisible INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (userId, buildingId),
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (buildingId) REFERENCES buildings(id)
  );
`);

// Seed initial data if empty
try {
  db.exec('ALTER TABLE projects ADD COLUMN quizzes TEXT DEFAULT "[]"');
} catch (e) {
  // Column might already exist
}

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('teacher', 'password', 'teacher');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('student', 'password', 'student');
  
  const insertBuilding = db.prepare('INSERT INTO buildings (name, description, coverImage, orderIndex) VALUES (?, ?, ?, ?)');
  const b1 = insertBuilding.run('Beginner Building', 'Start your Scratch journey here.', 'https://picsum.photos/seed/build1/400/300', 1);
  const b2 = insertBuilding.run('Advanced Building', 'Master complex Scratch concepts.', 'https://picsum.photos/seed/build2/400/300', 2);

  const insertProject = db.prepare('INSERT INTO projects (buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, isLocked, orderIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertProject.run(b1.lastInsertRowid, 'Scratch Basics', 'Learn the basics of Scratch programming.', 'Welcome to Scratch! In this lesson, we will learn how to make a sprite move.', '', '31876', 'https://picsum.photos/seed/scratch1/400/300', 0, 1);
  insertProject.run(b1.lastInsertRowid, 'Animation', 'Create your first animation.', 'Let us animate a character.', '', '10128407', 'https://picsum.photos/seed/scratch2/400/300', 0, 2);
  insertProject.run(b2.lastInsertRowid, 'Games', 'Build a simple game.', 'Time to build a game!', '', '10128515', 'https://picsum.photos/seed/scratch3/400/300', 1, 1);
}

export default db;
