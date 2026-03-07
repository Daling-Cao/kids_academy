import React, { useState } from 'react';
import type { User } from '../types';

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md border-4 border-orange-100">
        <h1 className="text-3xl font-bold text-center text-orange-600 mb-6">Welcome to Scratch Academy!</h1>
        <p className="text-center text-stone-500 mb-8">Log in to start your coding adventure.</p>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-xl mb-4 text-center text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none transition-colors"
              placeholder="e.g. student"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none transition-colors"
              placeholder="e.g. password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : "Let's Go!"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-stone-400">
          <p>Demo accounts:</p>
          <p>Teacher: teacher / password</p>
          <p>Student: student / password</p>
        </div>
      </div>
    </div>
  );
}
