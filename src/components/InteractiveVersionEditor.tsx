import { useEffect, useRef, useState } from 'react';
import { Eye, Upload } from 'lucide-react';
import { authFetch } from '../App';
import WidgetModal from './WidgetModal';
import type { Widget } from '../types';

interface InteractiveVersionEditorProps {
    widgetId: number | null | undefined;
    onChange: (widgetId: number | null) => void;
    // Used as the widget name when a new version is uploaded.
    projectTitle: string;
}

// Picks or uploads the interactive version of a lesson. Interactive versions
// are stored as widgets of kind 'lesson', so they reuse the sandboxed
// /widget-files hosting but never show up in the student tool library.
export default function InteractiveVersionEditor({ widgetId, onChange, projectTitle }: InteractiveVersionEditorProps) {
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<Widget | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchWidgets = () =>
        authFetch('/api/widgets?kind=lesson')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setWidgets(data); })
            .catch(() => {});

    useEffect(() => { fetchWidgets(); }, []);

    const selected = widgets.find(w => w.id === widgetId) || null;

    const handleUpload = async (file: File) => {
        setUploading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('name', projectTitle.trim() || file.name.replace(/\.(zip|html?)$/i, ''));
            fd.append('description', '');
            fd.append('kind', 'lesson');
            fd.append('file', file);
            const res = await authFetch('/api/widgets', { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Upload fehlgeschlagen');
            await fetchWidgets();
            onChange(data.widget.id);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border-2 border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
                <p className="font-bold mb-1">So funktioniert es</p>
                <ul className="list-disc space-y-0.5 pl-5">
                    <li>Lade eine interaktive Lektion als <strong>.zip</strong> (Ordner mit <code>index.html</code>) oder als einzelne <strong>.html</strong>-Datei hoch.</li>
                    <li>Hat ein Projekt eine interaktive Version, öffnet das Klassenzimmer <strong>standardmäßig die interaktive Version</strong>. Der Artikel mit Quiz und Abschluss-Knopf bleibt einen Klick entfernt.</li>
                    <li>Bei Hausaufgaben bleibt auch die interaktive Version zu, bis etwas abgegeben wurde.</li>
                </ul>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-stone-600">Interaktive Version</label>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={widgetId ?? ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        className="min-w-0 flex-1 px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none bg-white"
                    >
                        <option value="">— Keine interaktive Version —</option>
                        {widgets.map(w => (
                            <option key={w.id} value={w.id}>{w.name} (#{w.id})</option>
                        ))}
                        {widgetId && !selected && <option value={widgetId}>#{widgetId}</option>}
                    </select>
                    {selected && (
                        <button
                            type="button"
                            onClick={() => setPreview(selected)}
                            className="flex items-center gap-1 rounded-xl bg-stone-100 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-200"
                        >
                            <Eye size={16} /> Ansehen
                        </button>
                    )}
                </div>
            </div>

            <div>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".zip,.html,.htm"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
                <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
                >
                    <Upload size={16} /> {uploading ? 'Wird hochgeladen…' : 'Neue Version hochladen (.zip / .html)'}
                </button>
                <p className="mt-1 text-xs text-stone-500">Nach dem Hochladen wird die neue Version automatisch ausgewählt. Speichern nicht vergessen.</p>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

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
