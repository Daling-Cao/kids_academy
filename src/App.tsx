import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import ProfileSettingsModal from './components/ProfileSettingsModal';
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
  const [showProfile, setShowProfile] = useState(false);

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
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowProfile(true)}>
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white">
                    {(user.name || user.username)[0].toUpperCase()}
                  </div>
                )}
                <span className="text-orange-800 font-medium hidden sm:block">Hello, {user.name || user.username}</span>
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full shadow-sm hover:bg-orange-200 transition-colors font-medium text-sm sm:text-base hidden md:block"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white text-orange-600 rounded-full shadow-sm hover:bg-orange-50 transition-colors font-medium text-sm sm:text-base"
              >
                Logout
              </button>
            </div>
          </nav>
        )}

        {showProfile && user && (
          <ProfileSettingsModal
            user={user}
            onClose={() => setShowProfile(false)}
            onUpdate={(u) => {
              handleLogin(u, localStorage.getItem('token') || '');
              setShowProfile(false);
            }}
          />
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
