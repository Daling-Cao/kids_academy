import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { authFetch } from '../App';
import type { User } from '../types';

interface MessageButtonProps {
    user: User;
}

export default function MessageButton({ user }: MessageButtonProps) {
    const [open, setOpen] = useState(false);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setSending(true);
        setError('');
        setSuccess(false);

        try {
            const res = await authFetch('/api/messages', {
                method: 'POST',
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setContent('');
                setTimeout(() => {
                    setSuccess(false);
                    setOpen(false);
                }, 2000);
            } else {
                setError(data.message || 'Failed to send message.');
            }
        } catch {
            setError('An error occurred.');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-full shadow-xl hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 font-bold"
            >
                <MessageCircle size={22} />
                <span>Message Teacher</span>
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                        <button
                            onClick={() => { setOpen(false); setError(''); setSuccess(false); }}
                            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <MessageCircle size={20} className="text-orange-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-stone-800">Message Your Teacher</h2>
                                <p className="text-xs text-stone-500">From: {user.name || user.username}</p>
                            </div>
                        </div>

                        {success ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-3">🎉</div>
                                <p className="text-green-600 font-bold text-lg">Message sent!</p>
                                <p className="text-stone-500 text-sm mt-1">Your teacher will see it soon.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSend} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-2">Your Message</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Write your message here..."
                                        rows={4}
                                        maxLength={1000}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none transition-colors resize-none"
                                        required
                                    />
                                    <p className="text-xs text-stone-400 text-right mt-1">{content.length}/1000</p>
                                </div>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                                <button
                                    type="submit"
                                    disabled={sending || !content.trim()}
                                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sending ? 'Sending...' : <><Send size={18} /> Send Message</>}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
