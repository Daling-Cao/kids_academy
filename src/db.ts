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
    titleZh TEXT,
    titleDe TEXT,
    description TEXT,
    descriptionZh TEXT,
    descriptionDe TEXT,
    content TEXT,
    scratchFileUrl TEXT,
    scratchProjectId TEXT,
    coverImage TEXT,
    isLocked BOOLEAN DEFAULT 1,
    orderIndex INTEGER NOT NULL,
    quizzes TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
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

  CREATE TABLE IF NOT EXISTS project_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    title TEXT,
    titleZh TEXT,
    titleDe TEXT,
    content TEXT,
    contentZh TEXT,
    contentDe TEXT,
    quizzes TEXT DEFAULT '[]',
    quizzesZh TEXT DEFAULT '[]',
    quizzesDe TEXT DEFAULT '[]',
    isPublished INTEGER NOT NULL DEFAULT 1,
    isLocked INTEGER NOT NULL DEFAULT 0,
    orderIndex INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_segment_progress (
    userId INTEGER NOT NULL,
    segmentId INTEGER NOT NULL,
    state TEXT NOT NULL DEFAULT 'completed',
    PRIMARY KEY (userId, segmentId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (segmentId) REFERENCES project_segments(id) ON DELETE CASCADE
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

// Migrate projects table: add tags and multi-lang columns
const projectsInfo = db.pragma('table_info(projects)') as any[];
if (projectsInfo.length > 0) {
  const hasTagsColumn = projectsInfo.some(col => col.name === 'tags');
  if (!hasTagsColumn) {
    db.exec(`
      ALTER TABLE projects ADD COLUMN tags TEXT DEFAULT '[]';
    `);
  }

  const hasTitleZh = projectsInfo.some(col => col.name === 'titleZh');
  if (!hasTitleZh) {
    db.exec(`
      ALTER TABLE projects ADD COLUMN titleZh TEXT;
      ALTER TABLE projects ADD COLUMN titleDe TEXT;
      ALTER TABLE projects ADD COLUMN descriptionZh TEXT;
      ALTER TABLE projects ADD COLUMN descriptionDe TEXT;
    `);
  }
}

// Migrate project_segments table: add multi-lang columns
const segmentsInfo = db.pragma('table_info(project_segments)') as any[];
if (segmentsInfo.length > 0) {
  const hasContentZh = segmentsInfo.some(col => col.name === 'contentZh');
  if (!hasContentZh) {
    db.exec(`
      ALTER TABLE project_segments ADD COLUMN titleZh TEXT;
      ALTER TABLE project_segments ADD COLUMN titleDe TEXT;
      ALTER TABLE project_segments ADD COLUMN contentZh TEXT;
      ALTER TABLE project_segments ADD COLUMN contentDe TEXT;
      ALTER TABLE project_segments ADD COLUMN quizzesZh TEXT DEFAULT '[]';
      ALTER TABLE project_segments ADD COLUMN quizzesDe TEXT DEFAULT '[]';
    `);
  }
}

// Migrate projects content to segments
try {
  const segmentCount = db.prepare('SELECT COUNT(*) as count FROM project_segments').get() as { count: number };
  if (segmentCount.count === 0) {
    const projectsWithContent = db.prepare(`SELECT COUNT(*) as count FROM projects WHERE content IS NOT NULL OR quizzes != '[]'`).get() as { count: number };
    if (projectsWithContent.count > 0) {
      console.log('Migrating existing project content and quizzes to project_segments...');
      db.exec(`
        INSERT INTO project_segments (projectId, title, content, quizzes, isPublished, isLocked, orderIndex)
        SELECT id, 'Segment 1', content, quizzes, 1, 0, 1
        FROM projects
        WHERE (content IS NOT NULL AND content != '') OR (quizzes IS NOT NULL AND quizzes != '[]' AND quizzes != '');
      `);
    }
  }
} catch (error) {
  console.error('Error migrating to project_segments:', error);
}

// Seed initial data if empty
const adminUsername = process.env.ADMIN_USERNAME || 'teacher';
const adminPassword = process.env.ADMIN_PASSWORD || 'kids-academy-default-secure-pwd-123'; // More unique placeholder

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD not set in environment variables. Using default placeholder.');
}

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(adminUsername, hashedPassword, 'teacher');

  const insertBuilding = db.prepare('INSERT INTO buildings (name, description, coverImage, orderIndex) VALUES (?, ?, ?, ?)');
  const b1 = insertBuilding.run('Beginner Building', 'Start your Scratch journey here.', '', 1);
  const b2 = insertBuilding.run('Advanced Building', 'Master complex Scratch concepts.', '', 2);

  const insertProject = db.prepare('INSERT INTO projects (buildingId, title, description, scratchFileUrl, scratchProjectId, coverImage, isLocked, orderIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const p1 = insertProject.run(b1.lastInsertRowid, 'Scratch Basics', 'Learn the basics of Scratch programming.', '', '31876', '', 0, 1);
  const p2 = insertProject.run(b1.lastInsertRowid, 'Animation', 'Create your first animation.', '', '10128407', '', 0, 2);
  const p3 = insertProject.run(b2.lastInsertRowid, 'Games', 'Build a simple game.', '', '10128515', '', 1, 1);

  const insertSegment = db.prepare('INSERT INTO project_segments (projectId, title, content, orderIndex) VALUES (?, ?, ?, ?)');
  insertSegment.run(p1.lastInsertRowid, 'Segment 1', 'Welcome to Scratch! In this lesson, we will learn how to make a sprite move.', 1);
  insertSegment.run(p2.lastInsertRowid, 'Segment 1', 'Let us animate a character.', 1);
  insertSegment.run(p3.lastInsertRowid, 'Segment 1', 'Time to build a game!', 1);
} else {
  // Sync teacher credentials from env only if provided
  if (process.env.ADMIN_PASSWORD) {
    const teacher = db.prepare('SELECT id FROM users WHERE username = ? AND role = ?').get(adminUsername, 'teacher') as any;
    if (teacher) {
      const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, teacher.id);
      console.log('Teacher password synced from environment variables.');
    }
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
