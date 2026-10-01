import React, { useState } from 'react';
import { Send, X, HelpCircle } from 'lucide-react';
import { authFetch } from '../App';

interface AskTeacherDialogProps {
    projectTitle: string;
    // Text the student selected inside the interactive lesson; empty when the
    // dialog was opened from the toolbar to report a general problem.
    selectedText: string;
    onClose: () => void;
}

// Modal version of the selection popup, used for the interactive lesson whose
// text lives in a sandboxed iframe and can only be selected from the inside.
export default function AskTeacherDialog({ projectTitle, selectedText, onClose }: AskTeacherDialogProps) {
    const [question, setQuestion] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError('');
        // Keep the whole message under the server's 1000-char limit.
        const quoted = selectedText.length > 300 ? selectedText.slice(0, 300) + '...' : selectedText;
        const content = (quoted
            ? `📚 **${projectTitle}** 🎮\n\n❓ Frage zu diesem Text:\n\n"${quoted}"\n\n${question}`
            : `📚 **${projectTitle}** 🎮\n\n❓ Frage zur interaktiven Lektion:\n\n${question}`
        ).slice(0, 990);
        try {
            const res = await authFetch('/api/messages', { method: 'POST', body: JSON.stringify({ content }) });
            const data = await res.json();
            if (data.success) setSent(true);
            else setError(data.message || 'Senden fehlgeschlagen. Bitte versuche es noch einmal.');
        } catch {
            setError('Netzwerkfehler. Bitte versuche es noch einmal.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-2xl"
            >
                <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-stone-700">
                        <HelpCircle size={18} className="text-orange-500" /> Frage an den Lehrer
                    </span>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600" aria-label="Schließen">
                        <X size={18} />
                    </button>
                </div>

                {selectedText && (
                    <div className="mb-3 line-clamp-3 rounded-r-lg border-l-4 border-orange-400 bg-orange-50 px-3 py-2 text-sm italic text-stone-600">
                        "{selectedText}"
                    </div>
                )}

                {sent ? (
                    <div className="py-4 text-center">
                        <div className="mb-1 text-3xl">🎉</div>
                        <p className="font-bold text-green-600">An den Lehrer gesendet!</p>
                        <button onClick={onClose} className="mt-3 text-sm text-stone-500 underline hover:text-stone-700">
                            Schließen
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="space-y-3">
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={selectedText ? 'Was möchtest du dazu wissen? (optional)' : 'Was funktioniert nicht? Beschreibe dein Problem.'}
                            rows={3}
                            maxLength={500}
                            required={!selectedText}
                            className="w-full resize-none rounded-xl border-2 border-orange-100 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                            autoFocus
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <button
                            type="submit"
                            disabled={sending}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                        >
                            {sending ? 'Wird gesendet...' : <><Send size={13} /> An Lehrer senden</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
