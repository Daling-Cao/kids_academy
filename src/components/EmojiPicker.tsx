import { useState, useEffect, useRef } from 'react';
import { Smile, X } from 'lucide-react';
import { authFetch } from '../App';
import type { CustomEmoji } from '../types';
import { useI18n } from '../i18n';

interface EmojiPickerProps {
    onInsert: (text: string) => void;
}

export default function EmojiPicker({ onInsert }: EmojiPickerProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        authFetch('/api/emojis')
            .then(r => r.json())
            .then(setEmojis)
            .catch(() => {});
    }, [open]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSelect = (emoji: CustomEmoji) => {
        if (emoji.type === 'unicode') {
            onInsert(emoji.url);
        } else {
            onInsert(`<img src="${emoji.url}" alt="${emoji.name}" class="inline-emoji" style="height:1.4em;vertical-align:middle;display:inline;" />`);
        }
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative inline-block">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                title={t.insertEmoji}
                className="p-1.5 rounded-lg text-stone-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            >
                <Smile size={18} />
            </button>

            {open && (
                <div className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-2xl shadow-xl border border-stone-100 p-3 w-56">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-stone-500">{t.customEmojis}</span>
                        <button type="button" onClick={() => setOpen(false)} className="text-stone-300 hover:text-stone-500">
                            <X size={14} />
                        </button>
                    </div>
                    {emojis.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-3">{t.noCustomEmojis}</p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                            {emojis.map(emoji => (
                                <button
                                    key={emoji.id}
                                    type="button"
                                    title={emoji.name}
                                    onClick={() => handleSelect(emoji)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-200"
                                >
                                    {emoji.type === 'unicode' ? (
                                        <span className="text-xl">{emoji.url}</span>
                                    ) : (
                                        <img src={emoji.url} alt={emoji.name} className="w-7 h-7 object-contain" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
