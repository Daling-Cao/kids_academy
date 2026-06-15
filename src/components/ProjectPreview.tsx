import { X, Download, CheckCircle2, Lock } from 'lucide-react';
import { useI18n } from '../i18n';
import { sanitizeHtml } from '../utils/sanitize';
import type { Quiz, ProjectSegment } from '../types';

interface PreviewProject {
    title: string;
    description?: string;
    coverImage?: string;
    scratchFileUrl?: string;
    scratchProjectId?: string;
    segments?: ProjectSegment[];
}

// Read-only preview that renders the project content the way the student Classroom
// does, so a teacher can check the display while editing (uses the in-editor state,
// including unsaved changes). Correct quiz answers are highlighted in green.
export default function ProjectPreview({ project, onClose }: { project: PreviewProject; onClose: () => void }) {
    const { t } = useI18n();

    const publishedSegments = (project.segments || []).filter(s => !!s.isPublished);

    const getQuizzes = (seg: ProjectSegment): Quiz[] => {
        const q = seg.quizzes;
        if (Array.isArray(q)) return q as Quiz[];
        if (typeof q === 'string') {
            try { const parsed = JSON.parse(q); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
        }
        return [];
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-4xl my-8">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-white font-bold text-sm bg-stone-800/80 px-3 py-1.5 rounded-full">
                        Vorschau (Schüleransicht)
                    </span>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 bg-white text-stone-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-stone-100 transition-colors shadow-md"
                    >
                        <X size={18} /> Schließen
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-orange-100">
                    <div className="bg-orange-400 p-6 flex items-center justify-center">
                        <h1 className="text-3xl font-extrabold text-white drop-shadow-md text-center">{project.title || '(Kein Titel)'}</h1>
                    </div>

                    <div className="p-8">
                        {project.description && (
                            <p className="text-stone-600 text-lg leading-relaxed mb-8 whitespace-pre-line">
                                {project.description}
                            </p>
                        )}

                        {project.coverImage && (
                            <img
                                src={project.coverImage}
                                alt={project.title}
                                className="w-full h-64 object-cover rounded-2xl mb-8 shadow-md border-2 border-orange-50"
                                referrerPolicy="no-referrer"
                            />
                        )}

                        {project.scratchProjectId && (
                            <div className="mb-12">
                                <div className="rounded-2xl overflow-hidden border-4 border-orange-200 shadow-lg bg-stone-100 flex justify-center p-4">
                                    <iframe
                                        src={`https://scratch.mit.edu/projects/${project.scratchProjectId}/embed`}
                                        width="485"
                                        height="402"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        title="Scratch Project"
                                    ></iframe>
                                </div>
                            </div>
                        )}

                        {project.scratchFileUrl && (
                            <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-200 mb-12 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-orange-800 mb-2">{t.projectFiles}</h3>
                                    <p className="text-stone-600">{t.downloadStarter}</p>
                                </div>
                                <span className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow-md">
                                    <Download size={24} /> {t.downloadSb3}
                                </span>
                            </div>
                        )}

                        <div className="space-y-16">
                            {publishedSegments.map((seg, sIndex) => {
                                const sContent = seg.content;
                                const segQuizzes = getQuizzes(seg);
                                return (
                                    <div key={sIndex} className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8">
                                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-orange-100">
                                            {seg.title && <h2 className="text-3xl font-bold text-orange-800">{seg.title}</h2>}
                                            {!!seg.isLocked && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                                                    <Lock size={12} /> {t.lockedByTeacher}
                                                </span>
                                            )}
                                        </div>

                                        {sContent && (
                                            <div
                                                className="prose prose-orange max-w-none mb-12 text-stone-700 leading-relaxed text-lg classroom-content"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(sContent) }}
                                            />
                                        )}

                                        {segQuizzes.length > 0 && (
                                            <div className="mb-2 p-8 rounded-3xl bg-orange-50/50 border-2 border-orange-100">
                                                <h3 className="text-2xl font-bold text-orange-800 mb-8 border-b-2 border-orange-200 pb-4 inline-block">{t.knowledgeCheck}</h3>
                                                <div className="space-y-8">
                                                    {segQuizzes.map((quiz, qIndex) => {
                                                        const correctIndices = quiz.correctOptionIndices || [quiz.correctOptionIndex ?? 0];
                                                        return (
                                                            <div key={qIndex} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                                                                <div className="flex items-start gap-4 mb-8">
                                                                    <div className="bg-orange-100 text-orange-700 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                                                                        {qIndex + 1}
                                                                    </div>
                                                                    <div className="prose prose-orange max-w-none text-xl font-medium text-stone-800" dangerouslySetInnerHTML={{ __html: sanitizeHtml(quiz.question) }} />
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-14">
                                                                    {quiz.options.map((opt, oIndex) => {
                                                                        const isCorrect = correctIndices.includes(oIndex);
                                                                        return (
                                                                            <div
                                                                                key={oIndex}
                                                                                className={`text-left px-6 py-4 rounded-xl border-2 font-medium text-lg flex items-center gap-4 ${
                                                                                    isCorrect
                                                                                        ? 'bg-green-50 border-green-500 text-green-800'
                                                                                        : 'bg-white border-stone-200 text-stone-600'
                                                                                }`}
                                                                            >
                                                                                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${quiz.isMultiSelect ? '' : 'rounded-full'} ${isCorrect ? 'bg-green-500' : 'border-2 border-stone-300'}`}>
                                                                                    {isCorrect && <div className={quiz.isMultiSelect ? 'w-3 h-3 bg-white rounded-sm' : 'w-3 h-3 bg-white rounded-full'} />}
                                                                                </div>
                                                                                <span className="flex-1 leading-tight">{opt}</span>
                                                                                {isCorrect && <CheckCircle2 className="text-green-500 shrink-0" size={24} />}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {quiz.explanation && (
                                                                    <div className="mt-6 ml-14 bg-green-50 border-2 border-green-200 rounded-xl px-5 py-4">
                                                                        <div className="font-bold text-green-800 mb-1">💡 {t.quizExplanation}</div>
                                                                        <div className="prose prose-green max-w-none text-green-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(quiz.explanation) }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {publishedSegments.length === 0 && (
                                <div className="text-center p-12 text-stone-500 text-lg">{t.noSegments}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
