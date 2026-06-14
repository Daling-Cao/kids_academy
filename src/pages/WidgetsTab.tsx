import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Upload, ExternalLink, Image } from 'lucide-react';
import { authFetch } from '../App';
import WidgetModal from '../components/WidgetModal';
import ImageUpload from '../components/ImageUpload';
import type { Widget } from '../types';
import { useI18n } from '../i18n';

export default function WidgetsTab() {
  const { t } = useI18n();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [previewWidget, setPreviewWidget] = useState<Widget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Library cover image setting
  const [coverImage, setCoverImage] = useState('');
  const [coverSaving, setCoverSaving] = useState(false);
  const [coverSaved, setCoverSaved] = useState(false);

  const fetchWidgets = () => {
    authFetch('/api/widgets').then(r => r.json()).then(setWidgets).catch(() => {});
  };

  useEffect(() => {
    fetchWidgets();
    authFetch('/api/settings').then(r => r.json()).then((s: Record<string, string>) => {
      setCoverImage(s.widget_library_image || '');
    }).catch(() => {});
  }, []);

  const saveCoverImage = async () => {
    setCoverSaving(true);
    await authFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ widget_library_image: coverImage }),
    }).catch(() => {});
    setCoverSaving(false);
    setCoverSaved(true);
    setTimeout(() => setCoverSaved(false), 2000);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedFile) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('file', selectedFile);
      const res = await authFetch('/api/widgets', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      setName('');
      setDescription('');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchWidgets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.widgetDeleteConfirm)) return;
    await authFetch(`/api/widgets/${id}`, { method: 'DELETE' });
    fetchWidgets();
  };

  return (
    <div className="space-y-8">
      {/* Library Settings — cover image */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-bold text-orange-800 mb-5 flex items-center gap-2">
          <Image size={22} /> {t.widgetLibrarySettings}
        </h2>
        <div className="flex flex-col gap-3 max-w-lg">
          <label className="block text-sm font-medium text-stone-600">{t.coverImage}</label>
          {coverImage && (
            <img
              src={coverImage}
              alt="cover"
              className="w-32 h-32 object-contain rounded-xl border border-stone-200 bg-stone-50"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="https://… oder hochladen ↓"
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none text-sm"
            />
            <button
              type="button"
              onClick={saveCoverImage}
              disabled={coverSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-50 text-sm"
            >
              {coverSaved ? '✓' : coverSaving ? '…' : t.save}
            </button>
          </div>
          <ImageUpload
            value={coverImage}
            onChange={url => { setCoverImage(url); }}
            label={t.coverImage}
          />
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-bold text-orange-800 mb-5 flex items-center gap-2">
          <Upload size={22} /> {t.uploadWidget}
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t.widgetName} *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                placeholder="z.B. Farbmischer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t.widgetDesc}</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                placeholder="Kurze Beschreibung…"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              {t.widgetUploadHint} *
            </label>
            <div
              className="border-2 border-dashed border-orange-200 rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {selectedFile ? (
                <div className="text-orange-700 font-medium">📁 {selectedFile.name}</div>
              ) : (
                <div className="text-stone-500">
                  <Upload size={32} className="mx-auto mb-2 text-orange-300" />
                  <p className="text-sm">Klicke oder ziehe eine Datei hier herein</p>
                  <p className="text-xs mt-1 text-stone-400">.zip (Ordner) oder .html</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,.html,.htm"
              className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={uploading || !name.trim() || !selectedFile}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {uploading ? t.widgetUploading : t.uploadWidget}
          </button>
        </form>
      </div>

      {/* Widget List */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-bold text-orange-800 mb-5">{t.widgetLibrary}</h2>
        {widgets.length === 0 ? (
          <p className="text-stone-500 text-center py-8">{t.noWidgets}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map(w => (
              <div key={w.id} className="border-2 border-stone-100 rounded-xl p-4 hover:border-orange-200 transition-colors flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-stone-800">{w.name}</h3>
                    {w.description && <p className="text-sm text-stone-500 mt-0.5">{w.description}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                    title={t.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="text-xs text-stone-400 font-mono truncate">
                  ID: {w.id} · {w.entryFile}
                </div>

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => setPreviewWidget(w)}
                    className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    👁 {t.openWidget}
                  </button>
                  <a
                    href={`/widget-files/${w.id}/${w.entryFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
                    title="Im neuen Tab öffnen"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                {/* Embed link for copying into lessons */}
                <div className="bg-stone-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-stone-400 mb-1">Kurslink (kopieren &amp; einfügen):</p>
                  <code
                    className="text-xs text-orange-700 break-all cursor-pointer select-all"
                    title="Klicken zum Kopieren"
                    onClick={() => {
                      navigator.clipboard.writeText(`/widget-open/${w.id}`).catch(() => {});
                    }}
                  >
                    /widget-open/{w.id}
                  </code>
                  <p className="text-xs text-stone-400 mt-0.5">Klicken zum Kopieren</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewWidget && (
        <WidgetModal
          widgetId={previewWidget.id}
          widgetName={previewWidget.name}
          entryFile={previewWidget.entryFile}
          onClose={() => setPreviewWidget(null)}
        />
      )}
    </div>
  );
}
