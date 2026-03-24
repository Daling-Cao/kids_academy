import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './src/db.ts';

console.log('Initializing database...');

// The DB connection in src/db.ts automatically creates tables and seeds initial data
// if the users table is empty.

const adminUsername = process.env.ADMIN_USERNAME || 'teacher';
const adminPassword = process.env.ADMIN_PASSWORD || 'kids-academy-default-secure-pwd-123';

try {
  const teacher = db.prepare('SELECT id FROM users WHERE username = ? AND role = ?').get(adminUsername, 'teacher') as any;

  if (teacher && process.env.ADMIN_PASSWORD) {
    console.log(`Teacher account '${adminUsername}' already exists. Updating password to match .env...`);
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, teacher.id);
    console.log(`Teacher account password updated successfully.`);
  } else if (!teacher) {
    console.log(`Creating teacher account '${adminUsername}'...`);
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(adminUsername, hashedPassword, 'teacher');
    console.log(`Teacher account created successfully.`);
  } else {
    console.log(`Teacher account '${adminUsername}' exists. No ADMIN_PASSWORD provided in .env to update.`);
  }

  console.log('Database initialization complete! You can now log in.');
} catch (error) {
  console.error('Error during database initialization:', error);
  process.exit(1);
}
