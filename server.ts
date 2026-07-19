import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import DOMPurify from 'isomorphic-dompurify';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import db from './src/db.ts';

// JWT secret — required in all environments
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required. Set it in your .env file.');
  process.exit(1);
}

const AUTH_COOKIE_NAME = 'kids_academy_session';
const SESSION_DURATION_SECONDS = 3 * 60 * 60;
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_DURATION_SECONDS * 1000,
  path: '/',
};

// ─── Multer config for image uploads ────────────────────────────────
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Widget files storage ─────────────────────────────────────────────
// Keep active HTML/JS outside the public image upload tree. Otherwise the
// same widget could bypass /widget-files CSP via /uploads/widgets/... (or a
// reverse proxy serving /uploads directly).
const legacyWidgetsDir = path.resolve(uploadsDir, 'widgets');
const widgetsDir = path.resolve(process.cwd(), 'widget-uploads');
fs.mkdirSync(widgetsDir, { recursive: true });
if (fs.existsSync(legacyWidgetsDir)) {
  fs.cpSync(legacyWidgetsDir, widgetsDir, { recursive: true, force: false, errorOnExist: false });
  fs.rmSync(legacyWidgetsDir, { recursive: true, force: true });
}

const widgetUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, widgetsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for widget zips
});

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
    // Note: SVG is intentionally excluded — SVGs can embed <script>/onload handlers and
    // are served from /uploads, making them a stored-XSS vector when opened directly.
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─── Auth middleware ────────────────────────────────────────────────
interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string; exp?: number };
}

function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = getCookie(req, AUTH_COOKIE_NAME);
  if (!token) {
    res.status(401).json({ success: false, message: 'No session cookie provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; exp?: number };
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
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3',
      'ol', 'ul', 'li', 'a', 'img', 'span', 'div', 'blockquote', 'pre', 'code',
      // Table elements
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'class', 'style', 'target', 'width', 'height',
      // Table attributes
      'colspan', 'rowspan', 'align', 'valign', 'border', 'cellpadding', 'cellspacing',
    ],
  });
}

// Keep project-level progress in sync with segment progress: a project counts
// as completed once every published segment has been completed by the student.
// This prevents the door from showing "In Progress" when all the content inside
// the room is actually finished.
function syncProjectCompletion(userId: number | string, projectId: number | string): void {
  const total = db.prepare(
    'SELECT COUNT(*) AS c FROM project_segments WHERE projectId = ? AND isPublished = 1'
  ).get(projectId) as any;
  if (!total || total.c === 0) return;

  const done = db.prepare(`
    SELECT COUNT(*) AS c FROM user_segment_progress usp
    JOIN project_segments ps ON usp.segmentId = ps.id
    WHERE usp.userId = ? AND ps.projectId = ? AND ps.isPublished = 1 AND usp.state = 'completed'
  `).get(userId, projectId) as any;
  if (!done || done.c < total.c) return;

  const existing = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId) as any;
  if (existing) {
    if (existing.state !== 'completed') {
      db.prepare('UPDATE user_progress SET state = ? WHERE userId = ? AND projectId = ?').run('completed', userId, projectId);
    }
  } else {
    db.prepare('INSERT INTO user_progress (userId, projectId, state) VALUES (?, ?, ?)').run(userId, projectId, 'completed');
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Never let legacy widget paths fall through to the public upload tree or
  // the SPA fallback. Existing files are migrated out at startup above.
  app.use('/uploads/widgets', (_req: Request, res: Response) => {
    res.status(404).send('Not found');
  });

  // Serve uploaded files. nosniff prevents the browser from MIME-sniffing an
  // uploaded file (e.g. HTML disguised as .jpg) into an executable document.
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }));

  // Uploaded widgets are untrusted active content. The CSP sandbox applies even
  // when someone navigates directly to a widget URL, so it cannot regain the
  // application's origin or use the HttpOnly session cookie against /api/*.
  app.use('/widget-files', express.static(widgetsDir, {
    setHeaders(res) {
      res.setHeader(
        'Content-Security-Policy',
        "sandbox allow-scripts allow-forms allow-downloads allow-modals; object-src 'none'; base-uri 'none'",
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
    },
  }));

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
      { expiresIn: SESSION_DURATION_SECONDS }
    );

    const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
    res.cookie(AUTH_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    // Older deployments exposed unsandboxed widgets below /uploads/widgets
    // with a 30-day immutable cache. Clear that legacy cache whenever a user
    // establishes a new session so cached active content cannot survive the
    // security migration. Browsers only honor this header on HTTPS origins.
    res.setHeader('Clear-Site-Data', '"cache"');

    res.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role, name: user.name, avatar: user.avatar, coins: user.coins || 0 },
      expiresAt,
    });
  });

  app.post('/api/logout', (_req: Request, res: Response) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
      sameSite: SESSION_COOKIE_OPTIONS.sameSite,
      secure: SESSION_COOKIE_OPTIONS.secure,
      path: SESSION_COOKIE_OPTIONS.path,
    });
    res.json({ success: true });
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
        res.json({ success: true, user, expiresAt: (req.user?.exp || 0) * 1000 });
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
      const sanitizedContent = sanitizeHtml(content.trim());
      const result = db.prepare('INSERT INTO messages (fromUserId, content) VALUES (?, ?)').run(fromUserId, sanitizedContent);
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
    const sanitizedReply = sanitizeHtml(reply.trim());
    db.prepare('UPDATE messages SET reply = ?, repliedAt = datetime(\'now\'), isRead = 1 WHERE id = ?').run(sanitizedReply, id);
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
    // Heal any project whose segments are all done but whose project state lags behind.
    projects.forEach(p => syncProjectCompletion(userId, p.id));
    const progress = db.prepare('SELECT * FROM user_progress WHERE userId = ?').all(userId) as any[];

    let previousCompleted = true;

    const result = projects.map((p) => {
      try { p.tags = JSON.parse(p.tags); } catch { p.tags = []; }
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

  // Complete a project (Student) — awards 1 BlockCoin (deduplicated, unless noScore)
  app.post('/api/student/projects/:projectId/complete', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { projectId } = req.params;
    const { userId, noScore } = req.body;

    const existing = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId) as any;
    if (existing) {
      db.prepare('UPDATE user_progress SET state = ? WHERE userId = ? AND projectId = ?').run('completed', userId, projectId);
    } else {
      db.prepare('INSERT INTO user_progress (userId, projectId, state) VALUES (?, ?, ?)').run(userId, projectId, 'completed');
    }

    // Award 1 BlockCoin if not already awarded and student has not triggered the no-score penalty
    let coinAwarded = false;
    const alreadyAwarded = db.prepare(
      'SELECT id FROM coin_transactions WHERE userId = ? AND refType = ? AND refId = ?'
    ).get(userId, 'project_complete', String(projectId));
    if (!alreadyAwarded && !noScore) {
      db.prepare('INSERT INTO coin_transactions (userId, amount, reason, refType, refId) VALUES (?, ?, ?, ?, ?)')
        .run(userId, 1, 'Completed a project', 'project_complete', String(projectId));
      db.prepare('UPDATE users SET coins = coins + 1 WHERE id = ?').run(userId);
      coinAwarded = true;
    }

    res.json({ success: true, coinAwarded });
  });

  // Get single project
  app.get('/api/projects/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (project) {
      try { project.tags = JSON.parse(project.tags); } catch { project.tags = []; }
      const segments = db.prepare('SELECT * FROM project_segments WHERE projectId = ? ORDER BY orderIndex ASC').all(project.id) as any[];
      segments.forEach(seg => {
         try { seg.quizzes = JSON.parse(seg.quizzes); } catch { seg.quizzes = []; }
         try { seg.quizzesZh = JSON.parse(seg.quizzesZh); } catch { seg.quizzesZh = []; }
         try { seg.quizzesDe = JSON.parse(seg.quizzesDe); } catch { seg.quizzesDe = []; }
         seg.isPublished = !!seg.isPublished;
         seg.isLocked = !!seg.isLocked;
      });
      project.segments = segments;
      res.json(project);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Get single project progress
  app.get('/api/student/projects/:projectId/progress/:userId', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { projectId, userId } = req.params;
    syncProjectCompletion(userId, projectId);
    const prog = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId) as any;
    
    const segmentProgress = db.prepare(`
      SELECT usp.segmentId, usp.state 
      FROM user_segment_progress usp 
      JOIN project_segments ps ON usp.segmentId = ps.id 
      WHERE usp.userId = ? AND ps.projectId = ?
    `).all(userId, projectId) as any[];
    
    res.json({
      ...(prog || { state: 'locked' }),
      segmentProgress: segmentProgress.reduce((acc: any, p: any) => { acc[p.segmentId] = p.state; return acc; }, {})
    });
  });

  // Complete a segment (Student) — awards 1 BlockCoin (unless noScore penalty)
  app.post('/api/student/segments/:segmentId/complete', authMiddleware, studentSelfOnly, (req: AuthRequest, res: Response) => {
    const { segmentId } = req.params;
    const { userId, noScore } = req.body;

    const existing = db.prepare('SELECT * FROM user_segment_progress WHERE userId = ? AND segmentId = ?').get(userId, segmentId) as any;
    if (!existing) {
      db.prepare('INSERT INTO user_segment_progress (userId, segmentId, state) VALUES (?, ?, ?)').run(userId, segmentId, 'completed');
    }

    let coinAwarded = false;
    const alreadyAwarded = db.prepare(
      'SELECT id FROM coin_transactions WHERE userId = ? AND refType = ? AND refId = ?'
    ).get(userId, 'segment_complete', String(segmentId));

    if (!alreadyAwarded && !noScore) {
      db.prepare('INSERT INTO coin_transactions (userId, amount, reason, refType, refId) VALUES (?, ?, ?, ?, ?)')
        .run(userId, 1, 'Completed a learning segment', 'segment_complete', String(segmentId));
      db.prepare('UPDATE users SET coins = coins + 1 WHERE id = ?').run(userId);
      coinAwarded = true;
    }

    // If this was the last published segment, mark the whole project completed
    // so the room door immediately reflects the finished state.
    const seg = db.prepare('SELECT projectId FROM project_segments WHERE id = ?').get(segmentId) as any;
    if (seg) syncProjectCompletion(userId, seg.projectId);

    res.json({ success: true, coinAwarded });
  });

  // ─── Teacher Routes (authenticated + teacher only) ───────────────

  // Get all students
  app.get('/api/users', authMiddleware, teacherOnly, (_req: AuthRequest, res: Response) => {
    const users = db.prepare('SELECT id, username, role, name, avatar, coins FROM users WHERE role = ?').all('student');
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
    const projects = db.prepare('SELECT p.*, b.name as buildingName FROM projects p LEFT JOIN buildings b ON p.buildingId = b.id ORDER BY p.buildingId ASC, p.orderIndex ASC').all() as any[];
    
    const segments = db.prepare('SELECT * FROM project_segments ORDER BY projectId, orderIndex ASC').all() as any[];
    const segmentsByProject = segments.reduce((acc: any, seg: any) => {
      if (!acc[seg.projectId]) acc[seg.projectId] = [];
      try { seg.quizzes = JSON.parse(seg.quizzes); } catch { seg.quizzes = []; }
      try { seg.quizzesZh = JSON.parse(seg.quizzesZh); } catch { seg.quizzesZh = []; }
      try { seg.quizzesDe = JSON.parse(seg.quizzesDe); } catch { seg.quizzesDe = []; }
      seg.isPublished = !!seg.isPublished;
      seg.isLocked = !!seg.isLocked;
      acc[seg.projectId].push(seg);
      return acc;
    }, {});

    projects.forEach(p => {
      try { p.tags = JSON.parse(p.tags); } catch { p.tags = []; }
      p.segments = segmentsByProject[p.id] || [];
    });

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
    const { buildingId, title, titleZh = '', titleDe = '', description, descriptionZh = '', descriptionDe = '', scratchFileUrl, scratchProjectId, finalScratchFileUrl = '', finalScratchProjectId = '', coverImage, tags, segments } = req.body;
    const maxOrder = db.prepare('SELECT MAX(orderIndex) as max FROM projects WHERE buildingId = ?').get(buildingId) as { max: number };
    const orderIndex = (maxOrder.max || 0) + 1;

    const result = db.prepare('INSERT INTO projects (buildingId, title, titleZh, titleDe, description, descriptionZh, descriptionDe, scratchFileUrl, scratchProjectId, finalScratchFileUrl, finalScratchProjectId, coverImage, isLocked, orderIndex, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(buildingId, title, titleZh, titleDe, description, descriptionZh, descriptionDe, scratchFileUrl, scratchProjectId, finalScratchFileUrl, finalScratchProjectId, coverImage, 1, orderIndex, JSON.stringify(tags || []));

    const projectId = result.lastInsertRowid;

    if (Array.isArray(segments)) {
      const insertSegment = db.prepare('INSERT INTO project_segments (projectId, title, titleZh, titleDe, content, contentZh, contentDe, quizzes, quizzesZh, quizzesDe, isPublished, isLocked, orderIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      segments.forEach((seg: any, index: number) => {
        const sanitizedContent = sanitizeHtml(seg.content || '');
        const sanitizedContentZh = sanitizeHtml(seg.contentZh || '');
        const sanitizedContentDe = sanitizeHtml(seg.contentDe || '');
        
        const sanitizeQs = (qs: any) => JSON.stringify((qs || []).map((q: any) => ({ ...q, question: sanitizeHtml(q.question || ''), explanation: sanitizeHtml(q.explanation || '') })));

        insertSegment.run(
          projectId, 
          seg.title || '', seg.titleZh || '', seg.titleDe || '', 
          sanitizedContent, sanitizedContentZh, sanitizedContentDe, 
          sanitizeQs(seg.quizzes), sanitizeQs(seg.quizzesZh), sanitizeQs(seg.quizzesDe),
          seg.isPublished ? 1 : 0, seg.isLocked ? 1 : 0, index + 1
        );
      });
    }

    res.json({ success: true, id: projectId });
  });


  // Reorder projects (Teacher) — must be declared BEFORE PUT /:id to avoid route conflict
  app.put('/api/projects/reorder', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { orders } = req.body;
    if (!Array.isArray(orders) || orders.length === 0) {
      res.status(400).json({ success: false, message: 'orders array is required' });
      return;
    }
    try {
      const updateOrder = db.prepare('UPDATE projects SET orderIndex = ? WHERE id = ?');
      const reorderAll = db.transaction((items: { id: number; orderIndex: number }[]) => {
        for (const item of items) {
          updateOrder.run(item.orderIndex, item.id);
        }
      });
      reorderAll(orders);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Update project
  app.put('/api/projects/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { buildingId, title, titleZh = '', titleDe = '', description, descriptionZh = '', descriptionDe = '', scratchFileUrl, scratchProjectId, finalScratchFileUrl = '', finalScratchProjectId = '', coverImage, tags, segments } = req.body;

    db.prepare('UPDATE projects SET buildingId = ?, title = ?, titleZh = ?, titleDe = ?, description = ?, descriptionZh = ?, descriptionDe = ?, scratchFileUrl = ?, scratchProjectId = ?, finalScratchFileUrl = ?, finalScratchProjectId = ?, coverImage = ?, tags = ? WHERE id = ?')
      .run(buildingId, title, titleZh, titleDe, description, descriptionZh, descriptionDe, scratchFileUrl, scratchProjectId, finalScratchFileUrl, finalScratchProjectId, coverImage, JSON.stringify(tags || []), id);

    if (Array.isArray(segments)) {
      const existingSegs = (db.prepare('SELECT id FROM project_segments WHERE projectId = ?').all(id) as any[]).map(s => s.id);
      const incomingIds = segments.map((s: any) => s.id).filter(Boolean);
      
      const toDelete = existingSegs.filter(eid => !incomingIds.includes(eid));
      if (toDelete.length > 0) {
        db.prepare(`DELETE FROM project_segments WHERE id IN (${toDelete.map(() => '?').join(',')})`).run(...toDelete);
      }

      const insertSegment = db.prepare('INSERT INTO project_segments (projectId, title, titleZh, titleDe, content, contentZh, contentDe, quizzes, quizzesZh, quizzesDe, isPublished, isLocked, orderIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const updateSegment = db.prepare('UPDATE project_segments SET title = ?, titleZh = ?, titleDe = ?, content = ?, contentZh = ?, contentDe = ?, quizzes = ?, quizzesZh = ?, quizzesDe = ?, isPublished = ?, isLocked = ?, orderIndex = ? WHERE id = ?');

      segments.forEach((seg: any, index: number) => {
        const sanitizedContent = sanitizeHtml(seg.content || '');
        const sanitizedContentZh = sanitizeHtml(seg.contentZh || '');
        const sanitizedContentDe = sanitizeHtml(seg.contentDe || '');
        
        const sanitizeQs = (qs: any) => JSON.stringify((qs || []).map((q: any) => ({ ...q, question: sanitizeHtml(q.question || ''), explanation: sanitizeHtml(q.explanation || '') })));

        if (seg.id && existingSegs.includes(seg.id)) {
          updateSegment.run(
             seg.title || '', seg.titleZh || '', seg.titleDe || '', 
             sanitizedContent, sanitizedContentZh, sanitizedContentDe, 
             sanitizeQs(seg.quizzes), sanitizeQs(seg.quizzesZh), sanitizeQs(seg.quizzesDe),
             seg.isPublished ? 1 : 0, seg.isLocked ? 1 : 0, index + 1, seg.id
          );
        } else {
          insertSegment.run(
             id, 
             seg.title || '', seg.titleZh || '', seg.titleDe || '', 
             sanitizedContent, sanitizedContentZh, sanitizedContentDe, 
             sanitizeQs(seg.quizzes), sanitizeQs(seg.quizzesZh), sanitizeQs(seg.quizzesDe),
             seg.isPublished ? 1 : 0, seg.isLocked ? 1 : 0, index + 1
          );
        }
      });
    }

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

  // ─── Custom Emojis ───────────────────────────────────────────────
  app.get('/api/emojis', authMiddleware, (_req: AuthRequest, res: Response) => {
    const emojis = db.prepare('SELECT * FROM custom_emojis ORDER BY createdAt ASC').all();
    res.json(emojis);
  });

  app.post('/api/emojis', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      const { name, unicode } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: 'Emoji name is required' });
        return;
      }
      if (req.file) {
        const url = `/uploads/${req.file.filename}`;
        const result = db.prepare('INSERT INTO custom_emojis (name, url, type) VALUES (?, ?, ?)').run(name.trim(), url, 'image') as any;
        res.json({ success: true, emoji: { id: result.lastInsertRowid, name: name.trim(), url, type: 'image' } });
      } else if (unicode && unicode.trim()) {
        const result = db.prepare('INSERT INTO custom_emojis (name, url, type) VALUES (?, ?, ?)').run(name.trim(), unicode.trim(), 'unicode') as any;
        res.json({ success: true, emoji: { id: result.lastInsertRowid, name: name.trim(), url: unicode.trim(), type: 'unicode' } });
      } else {
        res.status(400).json({ success: false, message: 'Either an image file or unicode emoji is required' });
      }
    });
  });

  app.delete('/api/emojis/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const emoji = db.prepare('SELECT url, type FROM custom_emojis WHERE id = ?').get(id) as any;
    if (emoji && emoji.type === 'image') {
      const filePath = path.resolve(process.cwd(), emoji.url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.prepare('DELETE FROM custom_emojis WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // ─── App Settings Routes ─────────────────────────────────────────

  // Public read — students need the widget library cover image
  app.get('/api/settings', authMiddleware, (_req: AuthRequest, res: Response) => {
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[];
    const obj: Record<string, string> = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  });

  // Teacher write
  app.put('/api/settings', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const updates: Record<string, string> = req.body;
    const upsert = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [key, value] of Object.entries(updates)) {
      if (typeof key === 'string' && typeof value === 'string') {
        upsert.run(key, value);
      }
    }
    res.json({ success: true });
  });

  // ─── Widget Routes ───────────────────────────────────────────────

  // List all widgets (students and teachers can browse)
  app.get('/api/widgets', authMiddleware, (_req: AuthRequest, res: Response) => {
    const widgets = db.prepare('SELECT * FROM widgets ORDER BY createdAt DESC').all();
    res.json(widgets);
  });

  // Get single widget
  app.get('/api/widgets/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    const widget = db.prepare('SELECT * FROM widgets WHERE id = ?').get(req.params.id);
    if (!widget) return res.status(404).json({ error: 'Not found' });
    res.json(widget);
  });

  // Upload a widget (teacher only) — accepts a zip archive or a single HTML file
  app.post('/api/widgets', authMiddleware, teacherOnly, widgetUpload.single('file'), (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;
    if (!name || !req.file) return res.status(400).json({ error: 'name and file are required' });

    const widgetRecord = db.prepare(
      'INSERT INTO widgets (name, description, entryFile) VALUES (?, ?, ?)'
    ).run(name.trim(), (description || '').trim(), 'index.html');
    const widgetId = widgetRecord.lastInsertRowid;

    const widgetFolder = path.join(widgetsDir, String(widgetId));
    fs.mkdirSync(widgetFolder, { recursive: true });

    const tmpPath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let entryFile = 'index.html';

    try {
      if (ext === '.zip') {
        // Extract zip preserving folder structure; strip the common root folder if any
        const zip = new AdmZip(tmpPath);
        const entries = zip.getEntries();

        // Determine if all entries share a common root folder (typical when zipping a folder)
        const rootFolders = new Set(entries.map(e => e.entryName.split('/')[0]));
        const singleRoot = rootFolders.size === 1 ? [...rootFolders][0] : null;

        for (const entry of entries) {
          if (entry.isDirectory) continue;
          let relPath = entry.entryName;
          if (singleRoot) relPath = relPath.slice(singleRoot.length + 1);
          if (!relPath) continue;

          // Block path traversal attempts
          const dest = path.resolve(widgetFolder, relPath);
          if (!dest.startsWith(widgetFolder + path.sep) && dest !== widgetFolder) continue;

          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, entry.getData());
        }

        // Detect entry HTML file: prefer index.html at root, else first .html
        if (fs.existsSync(path.join(widgetFolder, 'index.html'))) {
          entryFile = 'index.html';
        } else {
          const findHtml = (dir: string, base = ''): string | null => {
            for (const f of fs.readdirSync(dir)) {
              const full = path.join(dir, f);
              const rel = base ? `${base}/${f}` : f;
              if (fs.statSync(full).isDirectory()) {
                const found = findHtml(full, rel);
                if (found) return found;
              } else if (f.toLowerCase().endsWith('.html')) {
                return rel;
              }
            }
            return null;
          };
          entryFile = findHtml(widgetFolder) || 'index.html';
        }
      } else {
        // Single file (HTML or other) — save as index.html
        fs.copyFileSync(tmpPath, path.join(widgetFolder, 'index.html'));
        entryFile = 'index.html';
      }

      fs.unlinkSync(tmpPath);
      db.prepare('UPDATE widgets SET entryFile = ? WHERE id = ?').run(entryFile, widgetId);

      const widget = db.prepare('SELECT * FROM widgets WHERE id = ?').get(widgetId);
      res.json({ success: true, widget });
    } catch (err: any) {
      // Clean up on failure
      try { fs.rmSync(widgetFolder, { recursive: true, force: true }); } catch {}
      try { fs.unlinkSync(tmpPath); } catch {}
      db.prepare('DELETE FROM widgets WHERE id = ?').run(widgetId);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a widget (teacher only)
  app.delete('/api/widgets/:id', authMiddleware, teacherOnly, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const widget = db.prepare('SELECT * FROM widgets WHERE id = ?').get(id);
    if (!widget) return res.status(404).json({ error: 'Not found' });

    const widgetFolder = path.join(widgetsDir, id);
    try { fs.rmSync(widgetFolder, { recursive: true, force: true }); } catch {}
    db.prepare('DELETE FROM widgets WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // ─── Vite middleware for development ─────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Vite's production build adds crossorigin="" to <script> and <link> tags.
    // When those tags are loaded inside a sandboxed iframe (origin=null), the
    // browser sends an Origin header and requires Access-Control-Allow-Origin.
    // Adding the header here prevents CORS errors in the WidgetModal iframe.
    app.use(express.static(path.resolve('dist'), {
      setHeaders(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      },
    }));
    // Prevent missing widget files from falling through to the SPA.
    // The WidgetModal iframe is sandboxed (origin=null); if the SPA's
    // index.html were served inside it, its crossorigin-tagged Vite
    // assets would fail CORS and flood the console with errors.
    app.use('/widget-files', (_req: Request, res: Response) => {
      res.status(404).send('Widget file not found');
    });
    // SPA fallback: serve index.html for all other non-API routes (React Router)
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
