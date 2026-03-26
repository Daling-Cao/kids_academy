import { useState, useEffect } from 'react';
import { authFetch } from '../App';
import { Trash2, CheckCircle, Clock, Reply, Send } from 'lucide-react';
import { useI18n } from '../i18n';

interface Message {
    id: number;
    content: string;
    createdAt: string;
    isRead: number;
    fromUserId: number;
    fromUsername: string;
    fromName: string | null;
    fromAvatar: string | null;
    reply: string | null;
    repliedAt: string | null;
}

export default function MessagesTab() {
    const { t } = useI18n();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const fetchMessages = () => {
        authFetch('/api/messages')
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error('Failed to fetch messages:', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMessages(); }, []);

    const handleMarkRead = async (id: number) => {
        await authFetch(`/api/messages/${id}/read`, { method: 'PUT' });
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: 1 } : m));
    };

    const handleDelete = async (id: number) => {
        await authFetch(`/api/messages/${id}`, { method: 'DELETE' });
        setMessages(prev => prev.filter(m => m.id !== id));
    };

    const handleSendReply = async (id: number) => {
        if (!replyText.trim()) return;
        setSendingReply(true);
        try {
            const res = await authFetch(`/api/messages/${id}/reply`, {
                method: 'PUT',
                body: JSON.stringify({ reply: replyText }),
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => prev.map(m =>
                    m.id === id ? { ...m, reply: replyText, repliedAt: new Date().toISOString(), isRead: 1 } : m
                ));
                setReplyingTo(null);
                setReplyText('');
            }
        } finally {
            setSendingReply(false);
        }
    };

    const unreadCount = messages.filter(m => !m.isRead).length;

    if (loading) return <div className="text-center p-8 text-stone-500">{t.loading}</div>;

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-orange-800">
                    {t.studentMessages}
                    {unreadCount > 0 && (
                        <span className="ml-2 bg-orange-500 text-white text-sm px-2 py-0.5 rounded-full">{unreadCount} {t.newMessages}</span>
                    )}
                </h2>
                {messages.length > 0 && unreadCount > 0 && (
                    <button
                        onClick={async () => {
                            await Promise.all(messages.filter(m => !m.isRead).map(m => authFetch(`/api/messages/${m.id}/read`, { method: 'PUT' })));
                            setMessages(prev => prev.map(m => ({ ...m, isRead: 1 })));
                        }}
                        className="text-sm text-orange-600 hover:underline font-medium"
                    >
                        {t.markAllRead}
                    </button>
                )}
            </div>

            {messages.length === 0 ? (
                <div className="text-center py-16 text-stone-400">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="font-medium">{t.noMessagesYet}</p>
                    <p className="text-sm mt-1">{t.studentsCanSendMessages}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`bg-white rounded-2xl border-2 p-5 transition-colors ${msg.isRead ? 'border-stone-100' : 'border-orange-300 bg-orange-50/30'}`}
                        >
                            <div className="flex items-start gap-4">
                                {msg.fromAvatar ? (
                                    <img src={msg.fromAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-orange-200 flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-orange-300 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {(msg.fromName || msg.fromUsername)[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div>
                                            <span className="font-bold text-stone-800">{msg.fromName || msg.fromUsername}</span>
                                            {msg.fromName && <span className="text-xs text-stone-400 ml-1">@{msg.fromUsername}</span>}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-stone-400 flex-shrink-0">
                                            {msg.isRead
                                                ? <CheckCircle size={13} className="text-green-400" />
                                                : <Clock size={13} className="text-orange-400" />
                                            }
                                            {new Date(msg.createdAt + 'Z').toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-stone-700 whitespace-pre-wrap break-words">{msg.content}</p>
                                </div>
                            </div>

                            {/* Existing reply */}
                            {msg.reply && (
                                <div className="mt-3 ml-14 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl px-4 py-3">
                                    <div className="text-xs text-blue-500 font-semibold mb-1 flex items-center gap-1">
                                        <Reply size={12} /> {t.yourReply} · {msg.repliedAt ? new Date(msg.repliedAt + 'Z').toLocaleString() : ''}
                                    </div>
                                    <p className="text-stone-700 text-sm whitespace-pre-wrap">{msg.reply}</p>
                                    <button
                                        onClick={() => { setReplyingTo(msg.id); setReplyText(msg.reply || ''); }}
                                        className="text-xs text-blue-500 hover:underline mt-1"
                                    >
                                        {t.editReply}
                                    </button>
                                </div>
                            )}

                            {/* Reply form */}
                            {replyingTo === msg.id && (
                                <div className="mt-3 ml-14 space-y-2">
                                    <textarea
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder={t.writeReply}
                                        rows={2}
                                        autoFocus
                                        className="w-full px-3 py-2 text-sm rounded-xl border-2 border-blue-200 focus:border-blue-400 focus:outline-none resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSendReply(msg.id)}
                                            disabled={sendingReply || !replyText.trim()}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                        >
                                            <Send size={13} /> {sendingReply ? t.sending : t.sendReply}
                                        </button>
                                        <button
                                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                            className="px-4 py-2 text-stone-500 rounded-xl text-sm hover:bg-stone-100 transition-colors"
                                        >
                                            {t.cancel}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-stone-100">
                                {!msg.isRead && (
                                    <button
                                        onClick={() => handleMarkRead(msg.id)}
                                        className="text-xs text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <CheckCircle size={14} /> {t.markAsRead}
                                    </button>
                                )}
                                {replyingTo !== msg.id && (
                                    <button
                                        onClick={() => { setReplyingTo(msg.id); setReplyText(''); }}
                                        className="text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <Reply size={14} /> {t.reply}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(msg.id)}
                                    className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
                                >
                                    <Trash2 size={14} /> {t.delete}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
