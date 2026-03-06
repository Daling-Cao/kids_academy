import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './src/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(username, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  // Get all students (Teacher)
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, role FROM users WHERE role = ?').all('student');
    res.json(users);
  });

  // Add new student (Teacher)
  app.post('/api/users', (req, res) => {
    const { username, password } = req.body;
    try {
      const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
        .run(username, password, 'student');
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Update student (Teacher)
  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    try {
      db.prepare('UPDATE users SET username = ?, password = ? WHERE id = ? AND role = ?')
        .run(username, password, id, 'student');
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Delete student (Teacher)
  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM user_progress WHERE userId = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(id, 'student');
    res.json({ success: true });
  });

  // Get student progress (Teacher)
  app.get('/api/users/:id/progress', (req, res) => {
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
  app.put('/api/users/:id/progress/:projectId', (req, res) => {
    const { id, projectId } = req.params;
    const { state } = req.body; // 'locked', 'unlocked', 'in-progress', 'completed'
    
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

  // Get all buildings (Teacher & Student)
  app.get('/api/buildings', (req, res) => {
    const buildings = db.prepare('SELECT * FROM buildings ORDER BY orderIndex ASC').all();
    res.json(buildings);
  });

  // Get visible buildings for a student
  app.get('/api/student/buildings/:userId', (req, res) => {
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

  // Get all buildings with visibility status for a student (Teacher)
  app.get('/api/users/:id/buildings', (req, res) => {
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
  app.put('/api/users/:id/buildings/:buildingId', (req, res) => {
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

  // Add new building (Teacher)
  app.post('/api/buildings', (req, res) => {
    const { name, description, coverImage } = req.body;
    const maxOrder = db.prepare('SELECT MAX(orderIndex) as max FROM buildings').get() as { max: number };
    const orderIndex = (maxOrder.max || 0) + 1;
    
    const result = db.prepare('INSERT INTO buildings (name, description, coverImage, orderIndex) VALUES (?, ?, ?, ?)')
      .run(name, description, coverImage, orderIndex);
    
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Update building (Teacher)
  app.put('/api/buildings/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, coverImage } = req.body;
    db.prepare('UPDATE buildings SET name = ?, description = ?, coverImage = ? WHERE id = ?')
      .run(name, description, coverImage, id);
    res.json({ success: true });
  });

  // Delete building (Teacher)
  app.delete('/api/buildings/:id', (req, res) => {
    const { id } = req.params;
    // Optional: Check if there are projects in this building before deleting, or delete them too.
    // For now, let's just delete the building.
    db.prepare('DELETE FROM buildings WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Get all projects (Teacher)
  app.get('/api/projects', (req, res) => {
    const projects = db.prepare('SELECT p.*, b.name as buildingName FROM projects p LEFT JOIN buildings b ON p.buildingId = b.id ORDER BY p.buildingId ASC, p.orderIndex ASC').all();
    res.json(projects);
  });

  // Get student projects with progress for a specific building
  app.get('/api/student/buildings/:buildingId/projects/:userId', (req, res) => {
    const { buildingId, userId } = req.params;
    const projects = db.prepare('SELECT * FROM projects WHERE buildingId = ? ORDER BY orderIndex ASC').all(buildingId) as any[];
    const progress = db.prepare('SELECT * FROM user_progress WHERE userId = ?').all(userId) as any[];

    let previousCompleted = true; // First project is always eligible if teacher unlocked it

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

      // Update previousCompleted for the next iteration
      if (state === 'completed') {
        previousCompleted = true;
      } else {
        previousCompleted = false;
      }

      return {
        ...p,
        state
      };
    });

    res.json(result);
  });

  // Update project state (Teacher)
  app.put('/api/projects/:id/lock', (req, res) => {
    const { id } = req.params;
    const { isLocked } = req.body;
    db.prepare('UPDATE projects SET isLocked = ? WHERE id = ?').run(isLocked ? 1 : 0, id);
    res.json({ success: true });
  });

  // Add new project (Teacher)
  app.post('/api/projects', (req, res) => {
    const { buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, quizzes } = req.body;
    const maxOrder = db.prepare('SELECT MAX(orderIndex) as max FROM projects WHERE buildingId = ?').get(buildingId) as { max: number };
    const orderIndex = (maxOrder.max || 0) + 1;
    
    const quizzesJson = JSON.stringify(quizzes || []);

    const result = db.prepare('INSERT INTO projects (buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, isLocked, orderIndex, quizzes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, 1, orderIndex, quizzesJson);
    
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // Update project (Teacher)
  app.put('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const { buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, quizzes } = req.body;
    
    const quizzesJson = JSON.stringify(quizzes || []);

    db.prepare('UPDATE projects SET buildingId = ?, title = ?, description = ?, content = ?, scratchFileUrl = ?, scratchProjectId = ?, coverImage = ?, quizzes = ? WHERE id = ?')
      .run(buildingId, title, description, content, scratchFileUrl, scratchProjectId, coverImage, quizzesJson, id);
    
    res.json({ success: true });
  });

  // Delete project (Teacher)
  app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM user_progress WHERE projectId = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Start learning a project (Student)
  app.post('/api/student/projects/:projectId/start', (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.body;
    
    const existing = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId);
    if (!existing) {
      db.prepare('INSERT INTO user_progress (userId, projectId, state) VALUES (?, ?, ?)').run(userId, projectId, 'in-progress');
    } else if ((existing as any).state === 'unlocked') {
      db.prepare('UPDATE user_progress SET state = ? WHERE userId = ? AND projectId = ?').run('in-progress', userId, projectId);
    }
    res.json({ success: true });
  });

  // Complete a project (Student)
  app.post('/api/student/projects/:projectId/complete', (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.body;
    
    const existing = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId);
    if (existing) {
      db.prepare('UPDATE user_progress SET state = ? WHERE userId = ? AND projectId = ?').run('completed', userId, projectId);
    } else {
      db.prepare('INSERT INTO user_progress (userId, projectId, state) VALUES (?, ?, ?)').run(userId, projectId, 'completed');
    }
    res.json({ success: true });
  });

  // Get single project
  app.get('/api/projects/:id', (req, res) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (project) {
      res.json(project);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Get single project progress
  app.get('/api/student/projects/:projectId/progress/:userId', (req, res) => {
    const { projectId, userId } = req.params;
    const prog = db.prepare('SELECT * FROM user_progress WHERE userId = ? AND projectId = ?').get(userId, projectId);
    res.json(prog || { state: 'locked' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
