import { useState, useEffect } from 'react';
import { authFetch } from '../App';
import { MessageCircle, X, Reply } from 'lucide-react';
import type { User } from '../types';

interface MyMessage {
    id: number;
    content: string;
    createdAt: string;
    reply: string | null;
    repliedAt: string | null;
}

interface StudentInboxProps {
    user: User;
}

export default function StudentInbox({ user }: StudentInboxProps) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<MyMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    const fetchMessages = () => {
        setLoading(true);
        authFetch('/api/messages/mine')
            .then(res => res.json())
            .then(data => {
                setMessages(data);
                setHasUnread(data.some((m: MyMessage) => m.reply));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    // Poll for new replies every 30s
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 30000);
        return () => clearInterval(interval);
    }, [user.id]);

    return (
        <>
            {/* Inbox button */}
            <button
                onClick={() => { setOpen(true); setHasUnread(false); }}
                className="fixed bottom-20 right-6 z-40 flex items-center gap-2 bg-white border-2 border-orange-300 text-orange-600 px-4 py-2.5 rounded-full shadow-lg hover:bg-orange-50 transition-all hover:scale-105 active:scale-95 font-bold text-sm"
            >
                <MessageCircle size={18} />
                My Messages
                {hasUnread && (
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full absolute -top-0.5 -right-0.5" />
                )}
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h2 className="font-bold text-stone-800 text-lg flex items-center gap-2">
                                <MessageCircle size={20} className="text-orange-500" /> My Messages
                            </h2>
                            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="text-center py-8 text-stone-400">Loading...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10 text-stone-400">
                                    <div className="text-4xl mb-3">💬</div>
                                    <p className="font-medium">No messages sent yet</p>
                                    <p className="text-sm mt-1">Select text in a lesson to ask your teacher a question!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map(msg => (
                                        <div key={msg.id} className="bg-stone-50 rounded-2xl p-4 border-2 border-stone-100">
                                            {/* Student's original message */}
                                            <div className="text-xs text-stone-400 mb-2">
                                                {new Date(msg.createdAt + 'Z').toLocaleString()}
                                            </div>
                                            <p className="text-stone-700 text-sm whitespace-pre-wrap break-words">{msg.content}</p>

                                            {/* Teacher reply */}
                                            {msg.reply ? (
                                                <div className="mt-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl px-4 py-3">
                                                    <div className="text-xs text-blue-500 font-semibold mb-1 flex items-center gap-1">
                                                        <Reply size={12} /> Teacher replied · {msg.repliedAt ? new Date(msg.repliedAt + 'Z').toLocaleString() : ''}
                                                    </div>
                                                    <p className="text-stone-800 text-sm font-medium whitespace-pre-wrap">{msg.reply}</p>
                                                </div>
                                            ) : (
                                                <div className="mt-2 text-xs text-stone-400 italic flex items-center gap-1">
                                                    <span className="inline-block w-2 h-2 bg-orange-300 rounded-full animate-pulse" />
                                                    Waiting for teacher reply...
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
