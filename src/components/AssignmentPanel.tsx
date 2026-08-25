import { useState } from 'react';
import { Image as ImageIcon, Link2, Type, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { motion } from 'motion/react';
import type { AssignmentSubmission, AssignmentSubmissionType } from '../types';
import { useI18n } from '../i18n';
import { authFetch } from '../App';
import ImageUpload from './ImageUpload';

/**
 * Free-form hand-in box for any project's optional "assignment": a
 * screenshot, a link, or a bit of text. Never gates the article — it just
 * collects the student's answer and pays 1 BlockCoin the first time.
 */
export default function AssignmentPanel({ projectId, instructions, submission, onSubmitted, onCoinEarned }: {
    projectId: number | string;
    instructions?: string;
    submission: AssignmentSubmission | null;
    onSubmitted: (submission: AssignmentSubmission) => void;
    onCoinEarned: () => void;
}) {
    const { t } = useI18n();
    const [type, setType] = useState<AssignmentSubmissionType>(submission?.submissionType || 'image');
    const [imageUrl, setImageUrl] = useState(submission?.submissionType === 'image' ? submission.content : '');
    const [url, setUrl] = useState(submission?.submissionType === 'url' ? submission.content : '');
    const [text, setText] = useState(submission?.submissionType === 'text' ? submission.content : '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(!submission);

    const content = type === 'image' ? imageUrl : type === 'url' ? url : text;

    const handleSubmit = async () => {
        if (!content.trim() || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await authFetch(`/api/student/projects/${projectId}/assignment`, {
                method: 'POST',
                body: JSON.stringify({ submissionType: type, content }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || t.assignmentSubmitFailed);
                return;
            }
            onSubmitted(data.submission);
            setShowForm(false);
            if (data.coinAwarded) onCoinEarned();
        } catch {
            setError(t.assignmentSubmitFailed);
        } finally {
            setSubmitting(false);
        }
    };

    const TABS: { value: AssignmentSubmissionType; icon: typeof ImageIcon; label: string }[] = [
        { value: 'image', icon: ImageIcon, label: t.assignmentTypeImage },
        { value: 'url', icon: Link2, label: t.assignmentTypeUrl },
        { value: 'text', icon: Type, label: t.assignmentTypeText },
    ];

    const submitForm = (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => { setType(tab.value); setError(''); }}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition-colors ${type === tab.value
                            ? 'bg-purple-500 text-white shadow-md'
                            : 'bg-white text-stone-600 border-2 border-purple-100 hover:border-purple-300'
                            }`}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            {type === 'image' && (
                <ImageUpload value={imageUrl} onChange={setImageUrl} label={t.assignmentTypeImage} />
            )}
            {type === 'url' && (
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border-2 border-purple-100 px-4 py-3 focus:border-purple-400 focus:outline-none"
                />
            )}
            {type === 'text' && (
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    placeholder={t.assignmentTextPlaceholder}
                    className="w-full rounded-xl border-2 border-purple-100 px-4 py-3 focus:border-purple-400 focus:outline-none"
                />
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-lg font-bold shadow-md transition-all ${content.trim() && !submitting
                    ? 'bg-purple-500 text-white hover:bg-purple-600 hover:scale-105'
                    : 'cursor-not-allowed bg-stone-200 text-stone-500'
                    }`}
            >
                <Send size={20} /> {submitting ? t.assignmentSubmitting : t.assignmentSubmit}
            </button>
            {error && (
                <p className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">{error}</p>
            )}
        </div>
    );

    const renderSubmitted = () => {
        if (!submission) return null;
        if (submission.submissionType === 'image') {
            return (
                <img
                    src={submission.content}
                    alt={t.assignmentTypeImage}
                    className="max-h-72 w-auto rounded-xl border-2 border-purple-100 object-contain"
                />
            );
        }
        if (submission.submissionType === 'url') {
            return (
                <a
                    href={submission.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-medium text-purple-700 underline"
                >
                    {submission.content}
                </a>
            );
        }
        return (
            <p
                className="whitespace-pre-wrap break-words text-stone-700"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(submission.content, { ALLOWED_TAGS: [] }) }}
            />
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 rounded-3xl border-4 border-purple-200 bg-purple-50/60 p-8 shadow-lg"
        >
            <div className="mb-6 flex items-center gap-3">
                <Send size={28} className="text-purple-600" />
                <h2 className="text-3xl font-extrabold text-purple-800">{t.assignmentTitle}</h2>
            </div>

            {instructions && (
                <div
                    className="prose prose-purple mb-8 max-w-none text-lg leading-relaxed text-stone-700 classroom-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(instructions) }}
                />
            )}

            {submission && !showForm && (
                <div className="mb-6 space-y-4">
                    <div className="flex items-center gap-2 font-bold text-green-700">
                        <CheckCircle2 size={22} /> {t.assignmentSubmitted}
                    </div>
                    <div className="rounded-2xl border-2 border-purple-200 bg-white p-5">
                        {renderSubmitted()}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-purple-700 shadow-sm border-2 border-purple-200 transition-colors hover:bg-purple-100"
                    >
                        <RefreshCw size={20} /> {t.assignmentResubmit}
                    </button>
                </div>
            )}

            {(!submission || showForm) && submitForm}
        </motion.div>
    );
}
