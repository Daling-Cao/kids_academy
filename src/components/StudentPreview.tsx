import { useEffect, useRef, useState } from 'react';
import { Eye, Undo2 } from 'lucide-react';
import { authFetch } from '../App';

interface Group {
  id: number;
  name: string;
}

// Full page load after switching: every page and component re-reads the new
// session from scratch instead of carrying over the previous user's state.
function reloadInto(path: string) {
  window.location.assign(path);
}

// Teacher nav: switch into a fresh throwaway student account, optionally as a
// member of a group so that group's building visibility applies.
export function StudentPreviewButton() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    authFetch('/api/groups')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setGroups(data); })
      .catch(() => {});
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const start = async (groupId: number | null) => {
    setPending(true);
    setError('');
    try {
      const res = await authFetch('/api/preview/start', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Wechsel fehlgeschlagen');
      reloadInto('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setPending(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-full shadow-sm hover:bg-violet-600 transition-colors font-medium text-sm sm:text-base disabled:cursor-wait disabled:opacity-60"
        title="Mit einem frischen Test-Schüler die Schüleransicht ausprobieren"
      >
        <Eye size={18} /> <span className="hidden sm:inline">{pending ? 'Wechsle…' : 'Als Schüler testen'}</span>
      </button>
      {open && !pending && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border-2 border-violet-100 bg-white p-3 shadow-xl">
          <p className="mb-2 px-1 text-xs text-stone-500">
            Du wechselst zu einem neuen Test-Schüler ohne Fortschritt. Beim Zurückwechseln wird er samt Fortschritt gelöscht.
          </p>
          <button
            onClick={() => start(null)}
            className="w-full rounded-xl px-3 py-2 text-left font-bold text-stone-700 hover:bg-violet-50"
          >
            Ohne Gruppe <span className="font-normal text-stone-500">(alle Gebäude)</span>
          </button>
          {groups.length > 0 && <div className="my-1 border-t border-stone-100" />}
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => start(g.id)}
              className="w-full rounded-xl px-3 py-2 text-left text-stone-700 hover:bg-violet-50"
            >
              Als Mitglied von <strong>{g.name}</strong>
            </button>
          ))}
          {error && <p className="mt-2 px-1 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

// Shown above everything while a teacher is testing as a student.
export function StudentPreviewBanner() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const stop = async () => {
    setPending(true);
    setError('');
    try {
      const res = await authFetch('/api/preview/stop', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Zurückwechseln fehlgeschlagen');
      reloadInto('/teacher');
    } catch (err: any) {
      setError(err.message);
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-violet-600 px-4 py-2 text-sm text-white">
      <span className="font-bold">👀 Testmodus: Du siehst die Seite als Test-Schüler.</span>
      <span className="opacity-80">Fortschritt und Abgaben werden beim Zurückwechseln gelöscht.</span>
      <button
        onClick={stop}
        disabled={pending}
        className="flex items-center gap-1 rounded-full bg-white px-4 py-1 font-bold text-violet-700 shadow-sm hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
      >
        <Undo2 size={16} /> {pending ? 'Wechsle…' : 'Zurück zur Lehreransicht'}
      </button>
      {error && <span className="w-full text-center text-red-100">{error}</span>}
    </div>
  );
}
