import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import DOMPurify from 'isomorphic-dompurify';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './src/db.ts';

// JWT secret — required in all environments
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required. Set it in your .env file.');
  process.exit(1);
}

// ─── Multer config for image uploads ────────────────────────────────
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─── Auth middleware ────────────────────────────────────────────────
interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function teacherOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'teacher') {
    res.status(403).json({ success: false, message: 'Teacher access only' });
    return;
  }
  next();
}
function studentSelfOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  const targetUserId = req.params.userId || req.body.userId;
  if (!targetUserId) {
    next();
    return;
  }
  if (req.user?.role !== 'teacher' && String(req.user?.id) !== String(targetUserId)) {
    res.status(403).json({ success: false, message: 'Forbidden: You can only access your own data' });
    return;
  }
  next();
}

// ─── Sanitize HTML content ──────────────────────────────────────────
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ol', 'ul', 'li', 'a', 'img', 'span', 'div', 'blockquote', 'pre', 'code'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'width', 'height'],
  });
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // ─── Public Routes ──────────────────────────────────────────────

  app.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Input validation — prevent crashes from missing/non-string inputs
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const user = db.prepare('SELECT id, username, password, role, name, avatar, coins FROM users WHERE username = ?').get(username) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role, name: user.name, avatar: user.avatar, coins: user.coins || 0 },
      token,
    });
  });

  // ─── File Upload (authenticated) ─────────────────────────────────
  app.post('/api/upload', authMiddleware, (req: AuthRequest, res: Response) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const url = `/uploads/${req.file.filename}`;
      res.json({ success: true, url });
    });
  });

  // ─── Profile Update (authenticated) ──────────────────────────────
  app.put('/api/profile', authMiddleware, (req: AuthRequest, res: Response) => {
    const { name, avatar } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    try {
      db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(name, avatar, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/profile', authMiddleware, (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    try {
      const user = db.prepare('SELECT id, username, role, name, avatar FROM users WHERE id = ?').get(userId) as any;
      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // ─── Password Change (self-service, authenticated) ───────────────
  app.put('/api/profile/password', authMiddleware, (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
      return;
    }

    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as any;
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    try {
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // ─── Messaging Routes ─────────────────────────────────────────────

  // Student: send a message to the teacher
  app.post('/api/messages', authMiddleware, (req: AuthRequest, res: Response) => {
    const { content } = req.body;
    const fromUserId = req.user?.id;
    if (!fromUserId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Message cannot be empty.' });
      return;
    }
    if (content.length > 1000) {
      res.status(400).json({ success: false, message: 'Message too long (max 1000 characters).' });
      return;
    }
    try {
      const result = db.prepare('INSERT INTO messages (fromUserId, content) VALUES (?, ?)').run(fromUserId, content.trim());
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Teacher: get all messages with sender info
  app.get('/api/messages', authMiddleware, teacherOnly, (_req: AuthRequest, res: Response) => {
    const messages = db.prepare(`
      SELECT m.id, m.content, m.createdAt, m.isRead, m.reply, m.repliedAt,
             u.id as fromUserId, u.username as fromUsername, u.name as fromName, u.avatar as fromAvatar
      FROM messages m
      JOIN users u ON m.fromUserId = u.id
      ORDER BY m.createdAt DESC
    `).all();
    res.json(messages);
  });

  // Teacher: reply to a message
  app.put('/api/messages/:id/reply', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reply } = req.body;
    if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Reply cannot be empty.' });
      return;
    }
    db.prepare('UPDATE messages SET reply = ?, repliedAt = datetime(\'now\'), isRead = 1 WHERE id = ?').run(reply.trim(), id);
    res.json({ success: true });
  });

  // Teacher: mark message as read
  app.put('/api/messages/:id/read', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    db.prepare('UPDATE messages SET isRead = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Teacher: delete a message
  app.delete('/api/messages/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Student: get own messages and teacher replies
  app.get('/api/messages/mine', authMiddleware, (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const messages = db.prepare(
      'SELECT id, content, createdAt, reply, repliedAt FROM messages WHERE fromUserId = ? ORDER BY createdAt DESC'
    ).all(userId);
    res.json(messages);
  });

  // ─── Student Routes (authenticated) ──────────────────────────────

  // Get visible buildings for a student
  app.get('/api/student/buildings/:userId', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const buildings = db.prepare(`
      SELECT b.* 
      FROM buildings b
      LEFT JOIN user_building_visibility ubv ON b.id = ubv.buildingId AND ubv.userId = ?
      WHERE ubv.isVisible IS NULL OR ubv.isVisible = 1
      ORDER BY b.orderIndex ASC
    `).all(userId);
    res.json(buildings);
  });

  // Get student projects with progress for a specific building
  app.get('/api/student/buildings/:buildingId/projects/:userId', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { buildingId, userId } = req.params;
    const projects = db.prepare('SELECT * FROM projects WHERE buildingId = ? ORDER BY orderIndex ASC').all(buildingId) as any[];
    const progress = db.prepare('SELECT * FROM user_progress WHERE userId = ?').all(userId) as any[];

    let previousCompleted = true;

    const result = projects.map((p) => {
      const prog = progress.find(pr => pr.projectId === p.id);
      let state = 'locked';

      if (p.isLocked) {
        state = 'locked';
      } else if (prog) {
        state = prog.state;
      } else if (!previousCompleted) {
        state = 'locked';
      } else {
        state = 'unlocked';
      }

      previousCompleted = state === 'completed';

      return { ...p, state };
    });

    res.json(result);
  });

  // Start learning a project (Student)
  app.post('/api/student/projects/:projectId/start', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { projectId } = req.params;
    const { userId } = req.body;

    const existing = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId) as any;
    if (!existing) {
      db.prepare('INSERT INTO user_progress (userId, projectId, state) VALUES (?, ?, ?)').run(userId, projectId, 'in-progress');
    } else if (existing.state === 'unlocked') {
      db.prepare('UPDATE user_progress SET state = ? WHERE userId = ? AND projectId = ?').run('in-progress', userId, projectId);
    }
    res.json({ success: true });
  });

  // Complete a project (Student) — awards 1 BlockCoin (deduplicated)
  app.post('/api/student/projects/:projectId/complete', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { projectId } = req.params;
    const { userId } = req.body;

    const existing = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId) as any;
    if (existing) {
      db.prepare('UPDATE user_progress SET state = ? WHERE userId = ? AND projectId = ?').run('completed', userId, projectId);
    } else {
      db.prepare('INSERT INTO user_progress (userId, projectId, state) VALUES (?, ?, ?)').run(userId, projectId, 'completed');
    }

    // Award 1 BlockCoin if not already awarded for this project
    let coinAwarded = false;
    const alreadyAwarded = db.prepare(
      'SELECT id FROM coin_transactions WHERE userId = ? AND refType = ? AND refId = ?'
    ).get(userId, 'project_complete', String(projectId));
    if (!alreadyAwarded) {
      db.prepare('INSERT INTO coin_transactions (userId, amount, reason, refType, refId) VALUES (?, ?, ?, ?, ?)')
        .run(userId, 1, 'Completed a project', 'project_complete', String(projectId));
      db.prepare('UPDATE users SET coins = coins + 1 WHERE id = ?').run(userId);
      coinAwarded = true;
    }

    res.json({ success: true, coinAwarded });
  });

  // Get single project
  app.get('/api/projects/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (project) {
      res.json(project);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Get single project progress
  app.get('/api/student/projects/:projectId/progress/:userId', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { projectId, userId } = req.params;
    const prog = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId);
    res.json(prog || { state: 'locked' });
  });

  // ─── Teacher Routes (authenticated + teacher only) ───────────────

  // Get all students
  app.get('/api/users', authMiddleware, teacherOnly, (_req: AuthRequest, res: Response) => {
    const users = db.prepare('SELECT id, username, role, name, avatar FROM users WHERE role = ?').all('student');
    res.json(users);
  });

  // Add new student
  app.post('/api/users', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
        .run(username, hashedPassword, 'student');
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Update student
  app.put('/api/users/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { username, password } = req.body;
    try {
      if (username && password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET username = ?, password = ? WHERE id = ? AND role = ?')
          .run(username, hashedPassword, id, 'student');
      } else if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET password = ? WHERE id = ? AND role = ?')
          .run(hashedPassword, id, 'student');
      } else if (username) {
        db.prepare('UPDATE users SET username = ? WHERE id = ? AND role = ?')
          .run(username, id, 'student');
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Delete student
  app.delete('/api/users/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(id, 'student');
    res.json({ success: true });
  });

  // Get student progress (Teacher)
  app.get('/api/users/:id/progress', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const progress = db.prepare(`
      SELECT p.id as projectId, p.title, p.buildingId, b.name as buildingName, up.state 
      FROM projects p 
      LEFT JOIN buildings b ON p.buildingId = b.id
      LEFT JOIN user_progress up ON p.id = up.projectId AND up.userId = ?
      ORDER BY p.buildingId ASC, p.orderIndex ASC
    `).all(id);
    res.json(progress);
  });

  // Update student progress (Teacher)
  app.put('/api/users/:id/progress/:projectId', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id, projectId } = req.params;
    const { state } = req.body;

    if (state === 'locked') {
      db.prepare('DELETE FROM user_progress WHERE userId = ? AND projectId = ?').run(id, projectId);
    } else {
      const existing = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(id, projectId);
      if (existing) {
        db.prepare('UPDATE user_progress SET state = ? WHERE userId = ? AND projectId = ?').run(state, id, projectId);
      } else {
        db.prepare('INSERT INTO user_progress (userId, projectId, state) VALUES (?, ?, ?)').run(id, projectId, state);
      }
    }
    res.json({ success: true });
  });

  // ─── Buildings CRUD (Teacher) ────────────────────────────────────

  // Get all buildings
  app.get('/api/buildings', authMiddleware, (req: AuthRequest, res: Response) => {
    const buildings = db.prepare('SELECT * FROM buildings ORDER BY orderIndex ASC').all();
    res.json(buildings);
  });

  // Get single building
  app.get('/api/buildings/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(req.params.id);
    if (building) {
      res.json(building);
    } else {
      res.status(404).json({ error: 'Building not found' });
    }
  });

  // Get all buildings with visibility status for a student (Teacher)
  app.get('/api/users/:id/buildings', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const buildings = db.prepare(`
      SELECT b.*, COALESCE(ubv.isVisible, 1) as isVisible
      FROM buildings b
      LEFT JOIN user_building_visibility ubv ON b.id = ubv.buildingId AND ubv.userId = ?
      ORDER BY b.orderIndex ASC
    `).all(id);
    res.json(buildings);
  });

  // Update building visibility for a student (Teacher)
  app.put('/api/users/:id/buildings/:buildingId', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id, buildingId } = req.params;
    const { isVisible } = req.body;

    const existing = db.prepare('SELECT * FROM user_building_visibility WHERE userId = ? AND buildingId = ?').get(id, buildingId);
    if (existing) {
      db.prepare('UPDATE user_building_visibility SET isVisible = ? WHERE userId = ? AND buildingId = ?').run(isVisible ? 1 : 0, id, buildingId);
    } else {
      db.prepare('INSERT INTO user_building_visibility (userId, buildingId, isVisible) VALUES (?, ?, ?)').run(id, buildingId, isVisible ? 1 : 0);
    }
    res.json({ success: true });
  });

  // Add new building
  app.post('/api/buildings', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { name, description, coverImage } = req.body;
    const maxOrder = db.prepare('SELECT MAX(orderIndex) as max FROM buildings').get() as { max: number };
    const orderIndex = (maxOrder.max || 0) + 1;

    const result = db.prepare('INSERT INTO buildings (name, description, coverImage, orderIndex) VALUES (?, ?, ?, ?)')
      .run(name, description, coverImage, orderIndex);

    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Update building
  app.put('/api/buildings/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, coverImage } = req.body;
    db.prepare('UPDATE buildings SET name = ?, description = ?, coverImage = ? WHERE id = ?')
      .run(name, description, coverImage, id);
    res.json({ success: true });
  });

  // Delete building (cascade delete handled by FK constraints)
  app.delete('/api/buildings/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // Cascade delete: projects and their progress are automatically deleted by FK ON DELETE CASCADE
    // Also clean up building visibility records
    db.prepare('DELETE FROM user_building_visibility WHERE buildingId = ?').run(id);
    db.prepare('DELETE FROM buildings WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // ─── Projects CRUD (Teacher) ─────────────────────────────────────

  // Get all projects
  app.get('/api/projects', authMiddleware, (req: AuthRequest, res: Response) => {
    const projects = db.prepare('SELECT p.*, b.name as buildingName FROM projects p LEFT JOIN buildings b ON p.buildingId = b.id ORDER BY p.buildingId ASC, p.orderIndex ASC').all();
    res.json(projects);
  });

  // Update project state (lock/unlock)
  app.put('/api/projects/:id/lock', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { isLocked } = req.body;
    db.prepare('UPDATE projects SET isLocked = ? WHERE id = ?').run(isLocked ? 1 : 0, id);
    res.json({ success: true });
  });

  // Add new project
  app.post('/api/projects', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, quizzes } = req.body;
    const maxOrder = db.prepare('SELECT MAX(orderIndex) as max FROM projects WHERE buildingId = ?').get(buildingId) as { max: number };
    const orderIndex = (maxOrder.max || 0) + 1;

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content || '');
    const sanitizedQuizzes = (quizzes || []).map((q: any) => ({
      ...q,
      question: sanitizeHtml(q.question || ''),
    }));
    const quizzesJson = JSON.stringify(sanitizedQuizzes);

    const result = db.prepare('INSERT INTO projects (buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, isLocked, orderIndex, quizzes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(buildingId, title, description, sanitizedContent, scratchFileUrl, scratchProjectId, coverImage, 1, orderIndex, quizzesJson);

    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Update project
  app.put('/api/projects/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, quizzes } = req.body;

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content || '');
    const sanitizedQuizzes = (quizzes || []).map((q: any) => ({
      ...q,
      question: sanitizeHtml(q.question || ''),
    }));
    const quizzesJson = JSON.stringify(sanitizedQuizzes);

    db.prepare('UPDATE projects SET buildingId = ?, title = ?, description = ?, content = ?, scratchFileUrl = ?, scratchProjectId = ?, coverImage = ?, quizzes = ? WHERE id = ?')
      .run(buildingId, title, description, sanitizedContent, scratchFileUrl, scratchProjectId, coverImage, quizzesJson, id);

    res.json({ success: true });
  });

  // Delete project
  app.delete('/api/projects/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // user_progress automatically deleted by FK ON DELETE CASCADE
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // ─── Rewards / Ranks / Coins Routes ──────────────────────────────

  // Get all ranks (any authenticated user)
  app.get('/api/ranks', authMiddleware, (_req: AuthRequest, res: Response) => {
    const ranks = db.prepare('SELECT * FROM ranks ORDER BY orderIndex ASC').all();
    res.json(ranks);
  });

  // Get student coins & rank info
  app.get('/api/student/coins/:userId', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const coins = user.coins || 0;
    const ranks = db.prepare('SELECT * FROM ranks ORDER BY threshold ASC').all() as any[];

    // Find current rank (highest threshold <= coins)
    let currentRank = null;
    let nextRank = null;
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i].threshold <= coins) {
        currentRank = ranks[i];
        nextRank = ranks[i + 1] || null;
      }
    }

    // Progress toward next rank
    let progress = 1;
    if (currentRank && nextRank) {
      const rangeSize = nextRank.threshold - currentRank.threshold;
      progress = rangeSize > 0 ? (coins - currentRank.threshold) / rangeSize : 1;
    }

    res.json({ coins, rank: currentRank, nextRank, progress });
  });

  // Teacher: Create a new rank
  app.post('/api/ranks', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { name, icon, threshold } = req.body;
    if (!name || threshold == null) {
      res.status(400).json({ success: false, message: 'Name and threshold are required.' });
      return;
    }
    const maxOrder = db.prepare('SELECT MAX(orderIndex) as max FROM ranks').get() as { max: number };
    const orderIndex = (maxOrder.max || 0) + 1;
    const result = db.prepare('INSERT INTO ranks (name, icon, threshold, orderIndex) VALUES (?, ?, ?, ?)')
      .run(name, icon || '⭐', threshold, orderIndex);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Teacher: Update a rank
  app.put('/api/ranks/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, icon, threshold } = req.body;
    db.prepare('UPDATE ranks SET name = ?, icon = ?, threshold = ? WHERE id = ?').run(name, icon, threshold, id);
    res.json({ success: true });
  });

  // Teacher: Delete a rank
  app.delete('/api/ranks/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    db.prepare('DELETE FROM ranks WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Teacher: Manually adjust student coins
  app.post('/api/users/:id/coins', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { amount, reason } = req.body;
    if (amount == null || !reason) {
      res.status(400).json({ success: false, message: 'Amount and reason are required.' });
      return;
    }
    const intAmount = parseInt(amount, 10);
    if (isNaN(intAmount)) {
      res.status(400).json({ success: false, message: 'Amount must be a number.' });
      return;
    }
    db.prepare('INSERT INTO coin_transactions (userId, amount, reason, refType) VALUES (?, ?, ?, ?)')
      .run(id, intAmount, reason, 'teacher_manual');
    db.prepare('UPDATE users SET coins = MAX(0, coins + ?) WHERE id = ?').run(intAmount, id);
    const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(id) as any;
    res.json({ success: true, coins: user?.coins || 0 });
  });

  // ─── Vite middleware for development ─────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    // SPA fallback: serve index.html for all non-API routes (React Router)
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
