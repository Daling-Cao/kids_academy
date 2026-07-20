import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import ProfileSettingsModal from './components/ProfileSettingsModal';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import BuildingView from './pages/BuildingView';
import Classroom from './pages/Classroom';
import TeacherDashboard from './pages/TeacherDashboard';
import WidgetGallery from './pages/WidgetGallery';
import WidgetOpenPage from './pages/WidgetOpenPage';
import CookieConsent from './components/CookieConsent';
import TopLoadingBar from './components/TopLoadingBar';
import { trackRequest } from './lib/progress';
import type { User } from './types';

const SESSION_EXPIRY_KEY = 'session_expires_at';
const AUTH_EXPIRED_EVENT = 'kids-academy-auth-expired';

function clearLegacyAndSessionStorage() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem(SESSION_EXPIRY_KEY);
}

// ─── Authenticated fetch wrapper ──────────────────────────────────
// Every call also drives the global top loading bar via trackRequest.
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  return trackRequest(fetch(url, { ...options, headers, credentials: 'same-origin' })).then(response => {
    if (response.status === 401) {
      clearLegacyAndSessionStorage();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return response;
  });
}

// Reports every route change of a logged-in student to the server so the
// teacher dashboard can show where each child last was.
function RouteTracker({ user }: { user: User | null }) {
  const location = useLocation();
  useEffect(() => {
    if (!user || user.role !== 'student') return;
    authFetch('/api/track/page', {
      method: 'POST',
      body: JSON.stringify({ path: location.pathname }),
    }).catch(() => {});
  }, [user, location.pathname]);
  return null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    // Remove credentials from the previous localStorage-based login system.
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    authFetch('/api/profile')
      .then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          setSessionExpiresAt(data.expiresAt);
          localStorage.setItem(SESSION_EXPIRY_KEY, String(data.expiresAt));
        }
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLogin = useCallback((userData: User, expiresAt: number) => {
    setUser(userData);
    setSessionExpiresAt(expiresAt);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
  }, []);

  const clearLocalSession = useCallback(() => {
    setUser(null);
    setSessionExpiresAt(null);
    setShowProfile(false);
    setLogoutError('');
    clearLegacyAndSessionStorage();
  }, []);

  const handleLogout = useCallback(async () => {
    setLogoutPending(true);
    setLogoutError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Logout failed with status ${response.status}`);
      clearLocalSession();
    } catch {
      setLogoutError('Abmelden fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.');
    } finally {
      window.clearTimeout(timeout);
      setLogoutPending(false);
    }
  }, [clearLocalSession]);

  useEffect(() => {
    const handleExpired = () => {
      clearLocalSession();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [clearLocalSession]);

  useEffect(() => {
    if (!sessionExpiresAt) return;
    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      clearLocalSession();
      return;
    }
    const timer = window.setTimeout(clearLocalSession, remaining);
    return () => window.clearTimeout(timer);
  }, [clearLocalSession, sessionExpiresAt]);

  if (authChecking) {
    return <div className="min-h-screen bg-orange-50" />;
  }

  return (
    <Router>
      <TopLoadingBar />
      <RouteTracker user={user} />
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
                disabled={logoutPending}
                className="px-4 py-2 bg-white text-orange-600 rounded-full shadow-sm hover:bg-orange-50 transition-colors font-medium text-sm sm:text-base disabled:cursor-wait disabled:opacity-60"
              >
                {logoutPending ? 'Abmelden…' : 'Logout'}
              </button>
            </div>
          </nav>
        )}

        {logoutError && (
          <div role="alert" className="bg-red-100 px-4 py-2 text-center text-sm font-medium text-red-700">
            {logoutError}
          </div>
        )}

        {showProfile && user && (
          <ProfileSettingsModal
            user={user}
            onClose={() => setShowProfile(false)}
            onUpdate={(u) => {
              setUser(u);
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

            <Route path="/widgets" element={
              user?.role === 'student' ? <WidgetGallery /> : <Navigate to="/" />
            } />

            <Route path="/widget-open/:id" element={
              user ? <WidgetOpenPage /> : <Navigate to="/" />
            } />
          </Routes>
        </main>
      </div>
      <CookieConsent />
    </Router>
  );
}
