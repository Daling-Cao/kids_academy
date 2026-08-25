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
    finalScratchFileUrl TEXT,
    finalScratchProjectId TEXT,
    coverImage TEXT,
    isLocked BOOLEAN DEFAULT 1,
    orderIndex INTEGER NOT NULL,
    quizzes TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    projectType TEXT NOT NULL DEFAULT 'lesson',
    homeworkInstructions TEXT DEFAULT '',
    homeworkChecks TEXT DEFAULT '[]',
    assignmentInstructions TEXT DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS widgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    entryFile TEXT NOT NULL DEFAULT 'index.html',
    coverImage TEXT DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'announcement',
    content TEXT NOT NULL,
    refType TEXT,
    refId TEXT,
    isRead INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- One row per handed-in homework file. Students may hand in as often as
  -- they like; every attempt is kept so the teacher can see the history.
  CREATE TABLE IF NOT EXISTS homework_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    projectId INTEGER NOT NULL,
    fileName TEXT NOT NULL,
    storedName TEXT NOT NULL,
    fileSize INTEGER NOT NULL DEFAULT 0,
    passed INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    results TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_homework_submissions_user_project
    ON homework_submissions(userId, projectId);

  -- Free-form assignment hand-ins (screenshot / URL / text) for any project.
  -- Unlike homework_submissions, a student only ever has one row per project:
  -- resubmitting overwrites it instead of keeping history.
  CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    projectId INTEGER NOT NULL,
    submissionType TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(userId, projectId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS custom_emojis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'image',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
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

// Migrate users table: add last-login / last-page tracking columns
const hasLastLoginAt = tableInfo.some(col => col.name === 'lastLoginAt');
if (!hasLastLoginAt) {
  db.exec(`
    ALTER TABLE users ADD COLUMN lastLoginAt TEXT;
    ALTER TABLE users ADD COLUMN lastPagePath TEXT;
    ALTER TABLE users ADD COLUMN lastPageAt TEXT;
  `);
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

  // Final ("solution") Scratch project, revealed only after completion.
  const hasFinalScratch = projectsInfo.some(col => col.name === 'finalScratchProjectId');
  if (!hasFinalScratch) {
    db.exec(`
      ALTER TABLE projects ADD COLUMN finalScratchFileUrl TEXT;
      ALTER TABLE projects ADD COLUMN finalScratchProjectId TEXT;
    `);
  }

  // Homework projects: the article stays closed until the student hands in a
  // file that the system can test.
  const hasProjectType = projectsInfo.some(col => col.name === 'projectType');
  if (!hasProjectType) {
    db.exec(`
      ALTER TABLE projects ADD COLUMN projectType TEXT NOT NULL DEFAULT 'lesson';
      ALTER TABLE projects ADD COLUMN homeworkInstructions TEXT DEFAULT '';
      ALTER TABLE projects ADD COLUMN homeworkChecks TEXT DEFAULT '[]';
    `);
  }

  // Free-form assignment hand-in (screenshot/URL/text), independent of the
  // homework-file gating above and available on any project type.
  const hasAssignmentInstructions = projectsInfo.some(col => col.name === 'assignmentInstructions');
  if (!hasAssignmentInstructions) {
    db.exec(`
      ALTER TABLE projects ADD COLUMN assignmentInstructions TEXT DEFAULT '';
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

// One-time migration: consolidate to a single language (German).
// Earlier versions stored German in the *De columns via a language tab, while the
// base columns held the default (Chinese/English) text. The app now uses the base
// columns as the single source of truth, so promote any German content into them.
const schemaVersion = db.pragma('user_version', { simple: true }) as number;
if (schemaVersion < 1) {
  try {
    db.exec(`
      UPDATE projects SET title = titleDe WHERE titleDe IS NOT NULL AND trim(titleDe) != '';
      UPDATE projects SET description = descriptionDe WHERE descriptionDe IS NOT NULL AND trim(descriptionDe) != '';
      UPDATE project_segments SET title = titleDe WHERE titleDe IS NOT NULL AND trim(titleDe) != '';
      UPDATE project_segments SET content = contentDe WHERE contentDe IS NOT NULL AND trim(contentDe) != '';
      UPDATE project_segments SET quizzes = quizzesDe WHERE quizzesDe IS NOT NULL AND quizzesDe != '' AND quizzesDe != '[]';
    `);
    db.pragma('user_version = 1');
    console.log('Migrated German (*De) content into base columns.');
  } catch (error) {
    console.error('Error consolidating language columns:', error);
  }
}

// One-time migration: retroactively pay the homework-submission coin.
// The coin used to be gated on the automatic test passing; it now fires on
// any hand-in. A submission recorded under the old rule that never passed
// has no coin_transaction at all, so without this backfill those students
// would only get paid if they resubmit. One row per (user, project) pair
// that has at least one submission but no matching transaction yet.
if (schemaVersion < 2) {
  try {
    const unpaid = db.prepare(`
      SELECT DISTINCT hs.userId, hs.projectId
      FROM homework_submissions hs
      WHERE NOT EXISTS (
        SELECT 1 FROM coin_transactions ct
        WHERE ct.userId = hs.userId
          AND ct.refId = CAST(hs.projectId AS TEXT)
          AND ct.refType IN ('homework_submit', 'homework_pass')
      )
    `).all() as { userId: number; projectId: number }[];

    if (unpaid.length > 0) {
      const insertTx = db.prepare(
        "INSERT INTO coin_transactions (userId, amount, reason, refType, refId) VALUES (?, 1, 'Hausaufgabe abgegeben (nachträglich)', 'homework_submit', ?)"
      );
      const bumpCoins = db.prepare('UPDATE users SET coins = coins + 1 WHERE id = ?');
      const backfill = db.transaction((rows: typeof unpaid) => {
        for (const row of rows) {
          insertTx.run(row.userId, String(row.projectId));
          bumpCoins.run(row.userId);
        }
      });
      backfill(unpaid);
      console.log(`Backfilled the homework-submission coin for ${unpaid.length} student/project pair(s).`);
    }
    db.pragma('user_version = 2');
  } catch (error) {
    console.error('Error backfilling homework-submission coins:', error);
  }
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
