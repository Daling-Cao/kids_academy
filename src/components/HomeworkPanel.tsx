import { useRef, useState } from 'react';
import { CheckCircle2, XCircle, Upload, FileUp, RefreshCw, Lock } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { motion } from 'motion/react';
import type { HomeworkCheckResult, HomeworkStatus } from '../types';
import { useI18n } from '../i18n';
import { authFetch } from '../App';

const ACCEPT = '.sb3,.sb2,.sb,.py,.ino,.js,.ts,.c,.cpp,.h,.java,.cs,.lua,.html,.css,.json,.txt,.md';

interface SubmitResponse extends HomeworkCheckSummary {
    success: boolean;
    message?: string;
    coinAwarded?: boolean;
}

interface HomeworkCheckSummary {
    passed?: boolean;
    score?: number;
    total?: number;
    results?: HomeworkCheckResult[];
}

function ResultList({ results }: { results: HomeworkCheckResult[] }) {
    return (
        <ul className="space-y-2">
            {results.map((r, i) => (
                <li
                    key={i}
                    className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 ${r.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}
                >
                    {r.passed
                        ? <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-green-600" />
                        : <XCircle size={22} className="mt-0.5 shrink-0 text-red-500" />}
                    <span className="min-w-0">
                        <span className={`block font-bold ${r.passed ? 'text-green-800' : 'text-red-800'}`}>{r.label}</span>
                        {r.detail && <span className="block text-sm text-stone-600">{r.detail}</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/**
 * Hand-in box for homework projects. Uploading opens the article — passing the
 * automatic tests additionally earns a BlockCoin.
 */
export default function HomeworkPanel({ projectId, userId, instructions, status, onSubmitted, onCoinEarned }: {
    projectId: number | string;
    userId: number;
    instructions?: string;
    status: HomeworkStatus | null;
    onSubmitted: (status: HomeworkStatus) => void;
    onCoinEarned: () => void;
}) {
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<HomeworkCheckSummary | null>(null);
    const [showForm, setShowForm] = useState(false);

    const latest = status?.latest || null;
    const shown: HomeworkCheckSummary | null = result || (latest
        ? { passed: !!latest.passed, score: latest.score, total: latest.total, results: latest.results }
        : null);
    const submitted = !!status?.submitted;

    const handleSubmit = async () => {
        if (!file || uploading) return;
        setUploading(true);
        setError('');
        try {
            const body = new FormData();
            body.append('file', file);
            const res = await authFetch(`/api/student/projects/${projectId}/homework`, {
                method: 'POST',
                body,
            });
            const data: SubmitResponse = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || t.homeworkUploadFailed);
                return;
            }

            setResult({ passed: data.passed, score: data.score, total: data.total, results: data.results });
            setFile(null);
            setShowForm(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (data.coinAwarded) onCoinEarned();

            // Refresh the status so the article — which the server only sends
            // once something was handed in — appears without a manual reload.
            const statusRes = await authFetch(`/api/student/projects/${projectId}/homework/${userId}`);
            if (statusRes.ok) {
                onSubmitted(await statusRes.json());
            } else {
                onSubmitted({
                    projectType: 'homework',
                    submitted: true,
                    passed: !!data.passed,
                    coinAwarded: !!data.coinAwarded,
                    attempts: (status?.attempts || 0) + 1,
                    latest: status?.latest || null,
                });
            }
        } catch {
            setError(t.homeworkUploadFailed);
        } finally {
            setUploading(false);
        }
    };

    const uploadForm = (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                        setError('');
                    }}
                    className="block w-full cursor-pointer rounded-xl border-2 border-blue-200 bg-white px-4 py-3 text-stone-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-blue-600"
                />
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!file || uploading}
                    className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-lg font-bold shadow-md transition-all ${file && !uploading
                        ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
                        : 'cursor-not-allowed bg-stone-200 text-stone-500'
                        }`}
                >
                    <Upload size={22} /> {uploading ? t.homeworkUploading : t.homeworkSubmit}
                </button>
            </div>
            <p className="text-sm text-stone-500">{t.homeworkAllowedTypes}</p>
            {error && (
                <p className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">{error}</p>
            )}
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 rounded-3xl border-4 border-blue-200 bg-blue-50/60 p-8 shadow-lg"
        >
            <div className="mb-6 flex items-center gap-3">
                <FileUp size={30} className="text-blue-600" />
                <h2 className="text-3xl font-extrabold text-blue-800">{t.homeworkTitle}</h2>
            </div>

            {instructions && (
                <div
                    className="prose prose-blue mb-8 max-w-none text-lg leading-relaxed text-stone-700"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(instructions) }}
                />
            )}

            {!submitted && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-blue-200 bg-white px-5 py-4">
                    <Lock size={22} className="mt-0.5 shrink-0 text-blue-500" />
                    <p className="font-medium text-stone-700">{t.homeworkLockedHint}</p>
                </div>
            )}

            {shown && (
                <div className="mb-6 space-y-4">
                    <div
                        className={`rounded-2xl border-4 p-6 ${shown.passed ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">{shown.passed ? '🎉' : '💪'}</span>
                            <div>
                                <p className={`text-2xl font-extrabold ${shown.passed ? 'text-green-800' : 'text-amber-800'}`}>
                                    {shown.passed ? t.homeworkPassed : t.homeworkNotPassed}
                                </p>
                                <p className="font-medium text-stone-600">
                                    {t.homeworkScore(shown.score ?? 0, shown.total ?? 0)}
                                </p>
                            </div>
                        </div>
                        <p className="mt-3 font-medium text-stone-700">
                            {shown.passed ? t.homeworkPassedHint : t.homeworkNotPassedHint}
                        </p>
                    </div>

                    {shown.results && shown.results.length > 0 && (
                        <div>
                            <h3 className="mb-3 text-lg font-bold text-stone-700">{t.homeworkResultTitle}</h3>
                            <ResultList results={shown.results} />
                        </div>
                    )}
                </div>
            )}

            {submitted && latest && (
                <p className="mb-4 text-sm text-stone-500">
                    {t.homeworkLastFile}: <span className="font-bold text-stone-700">{latest.fileName}</span>
                    {' · '}{t.homeworkAttempts(status?.attempts || 1)}
                </p>
            )}

            {submitted && !showForm ? (
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-blue-700 shadow-sm border-2 border-blue-200 transition-colors hover:bg-blue-100"
                >
                    <RefreshCw size={20} /> {t.homeworkResubmit}
                </button>
            ) : (
                uploadForm
            )}
        </motion.div>
    );
}
