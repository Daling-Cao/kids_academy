import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import BuildingView from './pages/BuildingView';
import Classroom from './pages/Classroom';
import TeacherDashboard from './pages/TeacherDashboard';
import type { User } from './types';

// ─── Authenticated fetch wrapper ──────────────────────────────────
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  return fetch(url, { ...options, headers });
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = useCallback((userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-orange-50 font-sans text-stone-800">
        {user && (
          <nav className="bg-orange-200 p-4 flex justify-between items-center shadow-sm">
            <div className="font-bold text-xl text-orange-800">
              {user.role === 'teacher' ? 'Teacher Portal' : 'Scratch Academy'}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-orange-700 font-medium">Hello, {user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white text-orange-600 rounded-full shadow-sm hover:bg-orange-50 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </nav>
        )}

        <main className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={
              !user ? <Login onLogin={handleLogin} /> :
                user.role === 'teacher' ? <Navigate to="/teacher" /> :
                  <Navigate to="/dashboard" />
            } />

            <Route path="/dashboard" element={
              user?.role === 'student' ? <StudentDashboard user={user} /> : <Navigate to="/" />
            } />

            <Route path="/building/:buildingId" element={
              user?.role === 'student' ? <BuildingView user={user} /> : <Navigate to="/" />
            } />

            <Route path="/classroom/:id" element={
              user?.role === 'student' ? <Classroom user={user} /> : <Navigate to="/" />
            } />

            <Route path="/teacher" element={
              user?.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
