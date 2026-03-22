import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, HelpCircle } from 'lucide-react';
import { authFetch } from '../App';
import type { User } from '../types';

interface SelectionPopupProps {
    user: User;
    contentRef: React.RefObject<HTMLDivElement | null>;
    projectTitle: string;
}

export default function SelectionPopup({ user, contentRef, projectTitle }: SelectionPopupProps) {
    const [popup, setPopup] = useState<{ x: number; y: number; selectedText: string } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [question, setQuestion] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        // If the click was inside the popup itself, don't do anything
        if (popupRef.current && popupRef.current.contains(e.target as Node)) {
            return;
        }

        // Small delay to let the selection settle
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim();

            if (!selectedText || selectedText.length < 1) {
                setPopup(null);
                setShowForm(false);
                return;
            }

            // Only trigger inside the content area
            if (contentRef.current && selection?.anchorNode) {
                if (!contentRef.current.contains(selection.anchorNode)) {
                    return;
                }
            }

            // Position popup near the mouse
            const x = Math.min(e.clientX + window.scrollX, document.body.offsetWidth - 280);
            const y = e.clientY + window.scrollY - 10;

            setPopup({ x, y, selectedText });
            setShowForm(false);
            setSent(false);
            setQuestion('');
        }, 10);
    }, [contentRef]);

    // Close popup when clicking outside
    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
            setPopup(null);
            setShowForm(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [handleMouseUp, handleMouseDown]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        const content = `📚 **${projectTitle}**\n\n❓ 关于这段文字有个问题：\n\n"${popup!.selectedText}"\n\n${question}`;
        try {
            const res = await authFetch('/api/messages', {
                method: 'POST',
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            if (data.success) {
                setSent(true);
            } else {
                setQuestion(q => q); // keep question
                alert(data.message || 'Failed to send. Please try again.');
            }
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (!popup) return null;

    return (
        <div
            ref={popupRef}
            className="fixed z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
            style={{ left: popup.x, top: popup.y, transform: 'translateY(-100%)' }}
        >
            {!showForm ? (
                // Small "Ask teacher" tooltip button
                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-full shadow-xl text-sm font-bold hover:bg-orange-600 transition-colors whitespace-nowrap"
                    style={{ marginBottom: '8px' }}
                >
                    <HelpCircle size={14} /> Ask teacher
                </button>
            ) : (
                // Expanded form
                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 p-4 w-72"
                    style={{ marginBottom: '8px' }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-stone-700 text-sm flex items-center gap-1.5">
                            <HelpCircle size={15} className="text-orange-500" /> Ask your teacher
                        </span>
                        <button onClick={() => { setPopup(null); setShowForm(false); }} className="text-stone-400 hover:text-stone-600">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Selected text preview */}
                    <div className="bg-orange-50 border-l-4 border-orange-400 px-3 py-2 rounded-r-lg mb-3 text-xs text-stone-600 italic line-clamp-2">
                        "{popup.selectedText}"
                    </div>

                    {sent ? (
                        <div className="text-center py-3">
                            <div className="text-2xl mb-1">🎉</div>
                            <p className="text-green-600 font-bold text-sm">Sent to teacher!</p>
                            <button
                                onClick={() => { setPopup(null); setShowForm(false); setSent(false); }}
                                className="mt-3 text-xs text-stone-500 hover:text-stone-700 underline"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="space-y-3">
                            <textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="What's your question about this? (optional)"
                                rows={2}
                                maxLength={500}
                                className="w-full px-3 py-2 text-sm rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none resize-none"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {sending ? 'Sending...' : <><Send size={13} /> Send to Teacher</>}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
