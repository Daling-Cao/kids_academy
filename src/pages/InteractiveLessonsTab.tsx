import { useEffect, useRef, useState } from 'react';
import { Eye, RefreshCw, Trash2, Upload } from 'lucide-react';
import { authFetch } from '../App';
import WidgetModal from '../components/WidgetModal';
import type { Widget } from '../types';

interface LessonWidget extends Widget {
  projects: { id: number; title: string }[];
}

interface ReplaceRow {
  file: File;
  widgetId: number | '';
  status: 'ready' | 'working' | 'done' | 'failed';
  message?: string;
}

// "Lektion 00 – Interaktiv.zip" and "lektion-00-interaktiv" should compare equal.
const normalize = (value: string) =>
  value.toLowerCase().replace(/\.(zip|html?)$/i, '').replace(/interaktiv(e|en)?/g, '').replace(/[^a-z0-9À-ɏ一-鿿]+/g, '');

// Best guess for which lesson a file replaces: its name matches the widget name
// or the title of a project using it. Nothing guessed is applied before the
// teacher has seen it in the table.
function guessWidget(file: File, widgets: LessonWidget[]): number | '' {
  const key = normalize(file.name);
  if (!key) return '';
  let best: { id: number; score: number } | null = null;
  for (const w of widgets) {
    for (const label of [w.name, ...w.projects.map(p => p.title)]) {
      const candidate = normalize(label);
      if (!candidate) continue;
      const score = candidate === key ? 2 : candidate.includes(key) || key.includes(candidate) ? 1 : 0;
      if (score > 0 && (!best || score > best.score)) best = { id: w.id, score };
    }
  }
  return best ? best.id : '';
}

export default function InteractiveLessonsTab() {
  const [lessons, setLessons] = useState<LessonWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<LessonWidget | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ReplaceRow[]>([]);
  const singleRef = useRef<HTMLInputElement>(null);
  const batchRef = useRef<HTMLInputElement>(null);
  const singleTarget = useRef<number | null>(null);

  const load = () =>
    authFetch('/api/interactive-lessons')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLessons(data); })
      .catch(() => setError('Laden fehlgeschlagen.'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allSelected = lessons.length > 0 && selected.size === lessons.length;

  const deleteIds = async (ids: number[]) => {
    const used = lessons.filter(l => ids.includes(l.id) && l.projects.length > 0);
    const note = used.length
      ? `\n\n${used.length} davon ${used.length === 1 ? 'wird' : 'werden'} noch von Projekten verwendet. Diese Projekte verlieren ihre interaktive Version.`
      : '';
    if (!window.confirm(`${ids.length} interaktive Lektion(en) endgültig löschen?${note}`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await authFetch('/api/interactive-lessons/delete', { method: 'POST', body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Löschen fehlgeschlagen');
      setSelected(new Set());
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const replaceFile = async (widgetId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await authFetch(`/api/widgets/${widgetId}/file`, { method: 'PUT', body: fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Ersetzen fehlgeschlagen');
  };

  const handleSingleReplace = async (file: File) => {
    const id = singleTarget.current;
    if (id == null) return;
    setBusy(true);
    setError('');
    try {
      await replaceFile(id, file);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (singleRef.current) singleRef.current.value = '';
    }
  };

  const handleBatchPick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).map<ReplaceRow>(file => ({ file, widgetId: guessWidget(file, lessons), status: 'ready' }));
    // A guess must not point two files at the same lesson.
    const seen = new Set<number>();
    for (const row of picked) {
      if (row.widgetId === '') continue;
      if (seen.has(row.widgetId)) row.widgetId = '';
      else seen.add(row.widgetId);
    }
    setRows(picked);
    if (batchRef.current) batchRef.current.value = '';
  };

  const updateRow = (index: number, patch: Partial<ReplaceRow>) =>
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const runBatch = async () => {
    setBusy(true);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.widgetId === '' || row.status === 'done') continue;
      updateRow(i, { status: 'working', message: undefined });
      try {
        await replaceFile(row.widgetId, row.file);
        updateRow(i, { status: 'done' });
      } catch (err: any) {
        updateRow(i, { status: 'failed', message: err.message });
      }
    }
    await load();
    setBusy(false);
  };

  const targets = rows.filter(r => r.widgetId !== '').map(r => r.widgetId);
  const hasDuplicateTarget = new Set(targets).size !== targets.length;
  const readyCount = rows.filter(r => r.widgetId !== '' && r.status !== 'done').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-800">Interaktive Lektionen</h2>
        <p className="text-stone-500">
          Alle hochgeladenen interaktiven Versionen. Ersetzen behält die Zuordnung zu den Projekten, nur der Inhalt wird getauscht.
        </p>
      </div>

      {error && <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={busy || selected.size === 0}
          onClick={() => deleteIds([...selected])}
          className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-600 disabled:opacity-40"
        >
          <Trash2 size={16} /> Ausgewählte löschen{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
        <input
          ref={batchRef}
          type="file"
          multiple
          accept=".zip,.html,.htm"
          className="hidden"
          onChange={(e) => handleBatchPick(e.target.files)}
        />
        <button
          disabled={busy || lessons.length === 0}
          onClick={() => batchRef.current?.click()}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-40"
        >
          <RefreshCw size={16} /> Mehrere Dateien ersetzen…
        </button>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3 rounded-2xl border-2 border-teal-100 bg-teal-50/60 p-4">
          <p className="text-sm font-bold text-teal-900">
            Zuordnung prüfen – die Zuordnung wurde nach dem Dateinamen geraten. Ändere sie bei Bedarf, dann ersetzen.
          </p>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-stone-700" title={row.file.name}>{row.file.name}</span>
                <span className="text-stone-400">→</span>
                <select
                  value={row.widgetId}
                  disabled={busy || row.status === 'done'}
                  onChange={(e) => updateRow(i, { widgetId: e.target.value ? Number(e.target.value) : '', status: 'ready', message: undefined })}
                  className="min-w-0 flex-1 rounded-lg border-2 border-orange-100 bg-white px-2 py-1"
                >
                  <option value="">— überspringen —</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} (#{l.id}){l.projects.length ? ` · ${l.projects.map(p => p.title).join(', ')}` : ''}
                    </option>
                  ))}
                </select>
                <span className="w-24 text-right text-xs font-bold">
                  {row.status === 'working' && <span className="text-stone-500">Läuft…</span>}
                  {row.status === 'done' && <span className="text-green-600">✓ Ersetzt</span>}
                  {row.status === 'failed' && <span className="text-red-600" title={row.message}>Fehler</span>}
                </span>
              </div>
            ))}
          </div>
          {hasDuplicateTarget && (
            <p className="text-sm text-red-600">Mehrere Dateien zeigen auf dieselbe Lektion. Bitte nur eine pro Lektion wählen.</p>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy || readyCount === 0 || hasDuplicateTarget}
              onClick={runBatch}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-40"
            >
              {readyCount} Lektion(en) ersetzen
            </button>
            <button
              disabled={busy}
              onClick={() => setRows([])}
              className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-40"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      <input
        ref={singleRef}
        type="file"
        accept=".zip,.html,.htm"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSingleReplace(f); }}
      />

      {loading ? (
        <p className="text-stone-500">Wird geladen...</p>
      ) : lessons.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center text-stone-500">
          Noch keine interaktiven Lektionen. Lade sie im Projekt-Editor unter „Interaktive Version“ hoch.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border-2 border-orange-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-orange-50 text-stone-600">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(lessons.map(l => l.id)))}
                    aria-label="Alle auswählen"
                  />
                </th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Verwendet in</th>
                <th className="px-3 py-3">Hochgeladen</th>
                <th className="px-3 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map(l => (
                <tr key={l.id} className="border-t border-orange-50">
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`${l.name} auswählen`} />
                  </td>
                  <td className="px-3 py-3 font-medium text-stone-800">{l.name} <span className="text-stone-400">#{l.id}</span></td>
                  <td className="px-3 py-3 text-stone-600">
                    {l.projects.length ? l.projects.map(p => p.title).join(', ') : <span className="text-stone-400">nicht zugeordnet</span>}
                  </td>
                  <td className="px-3 py-3 text-stone-500">{l.createdAt ? new Date(l.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE') : ''}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setPreview(l)} title="Ansehen" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"><Eye size={16} /></button>
                      <button
                        disabled={busy}
                        onClick={() => { singleTarget.current = l.id; singleRef.current?.click(); }}
                        title="Durch neue Datei ersetzen"
                        className="rounded-lg p-2 text-teal-700 hover:bg-teal-50 disabled:opacity-40"
                      >
                        <Upload size={16} />
                      </button>
                      <button disabled={busy} onClick={() => deleteIds([l.id])} title="Löschen" className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <WidgetModal
          widgetId={preview.id}
          widgetName={preview.name}
          entryFile={preview.entryFile}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
