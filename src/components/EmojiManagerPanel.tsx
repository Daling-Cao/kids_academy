import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { authFetch } from '../App';
import type { CustomEmoji } from '../types';
import { useI18n } from '../i18n';

export default function EmojiManagerPanel() {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
    const [name, setName] = useState('');
    const [unicode, setUnicode] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchEmojis = () => {
        authFetch('/api/emojis')
            .then(r => r.json())
            .then(setEmojis)
            .catch(() => {});
    };

    useEffect(() => { if (open) fetchEmojis(); }, [open]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        setUnicode('');
        if (f) setPreview(URL.createObjectURL(f));
        else setPreview('');
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError(t.emojiName + ' required'); return; }
        if (!file && !unicode.trim()) { setError('Image or unicode required'); return; }
        setSaving(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('name', name.trim());
            if (file) {
                fd.append('image', file);
            } else {
                fd.append('unicode', unicode.trim());
            }
            const res = await authFetch('/api/emojis', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                setEmojis(prev => [...prev, data.emoji]);
                setName('');
                setUnicode('');
                setFile(null);
                setPreview('');
            } else {
                setError(data.message || 'Failed');
            }
        } catch {
            setError('Error saving emoji');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        await authFetch(`/api/emojis/${id}`, { method: 'DELETE' });
        setEmojis(prev => prev.filter(e => e.id !== id));
    };

    return (
        <div className="mt-6 border-2 border-orange-100 rounded-2xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 bg-orange-50 hover:bg-orange-100 transition-colors font-semibold text-orange-700 text-sm"
            >
                <span>🎨 {t.manageEmojis}</span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {open && (
                <div className="p-5 space-y-4">
                    {/* Add form */}
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">{t.emojiName}</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={t.emojiNamePlaceholder}
                                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-stone-100 focus:border-orange-300 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">{t.orUnicodeEmoji}</label>
                                <input
                                    value={unicode}
                                    onChange={e => { setUnicode(e.target.value); setFile(null); setPreview(''); }}
                                    placeholder="😊 🎉 ❤️"
                                    disabled={!!file}
                                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-stone-100 focus:border-orange-300 focus:outline-none disabled:opacity-40"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border-2 border-dashed border-orange-200 hover:border-orange-400 text-sm text-orange-600 hover:bg-orange-50 transition-colors flex-1 justify-center">
                                <Upload size={16} />
                                {file ? file.name : t.uploadEmojiImage}
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                            {preview && (
                                <img src={preview} alt="preview" className="w-10 h-10 object-contain rounded-lg border border-stone-200" />
                            )}
                        </div>

                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                            <Plus size={15} /> {saving ? '...' : t.addEmoji}
                        </button>
                    </form>

                    {/* Emoji list */}
                    {emojis.length === 0 ? (
                        <p className="text-sm text-stone-400 text-center py-3">{t.noCustomEmojis}</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {emojis.map(emoji => (
                                <div
                                    key={emoji.id}
                                    className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 border-stone-100 hover:border-orange-200 group relative"
                                >
                                    {emoji.type === 'unicode' ? (
                                        <span className="text-2xl w-9 h-9 flex items-center justify-center">{emoji.url}</span>
                                    ) : (
                                        <img src={emoji.url} alt={emoji.name} className="w-9 h-9 object-contain" />
                                    )}
                                    <span className="text-xs text-stone-400 max-w-[3.5rem] truncate">{emoji.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(emoji.id)}
                                        title={t.deleteEmoji}
                                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
