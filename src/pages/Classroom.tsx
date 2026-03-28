import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Download, ArrowLeft, CheckCircle2, XCircle, Lock } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { motion, AnimatePresence } from 'motion/react';
import { authFetch } from '../App';
import SelectionPopup from '../components/SelectionPopup';
import type { User, Project, Quiz } from '../types';
import { useI18n } from '../i18n';

export default function Classroom({ user }: { user: User }) {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [completed, setCompleted] = useState(false);
  const [segmentProgress, setSegmentProgress] = useState<Record<number, string>>({});
  const [segmentAnswers, setSegmentAnswers] = useState<Record<number, Record<number, number | number[]>>>({});
  const [segmentShowResults, setSegmentShowResults] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const lang = navigator.language.toLowerCase().startsWith('de') ? 'de' : 'zh';

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([
      authFetch(`/api/projects/${id}`).then(res => {
        if (!res.ok) throw new Error('Failed to load project');
        return res.json();
      }),
      authFetch(`/api/student/projects/${id}/progress/${user.id}`).then(res => {
        if (!res.ok) throw new Error('Failed to load progress');
        return res.json();
      }),
    ])
      .then(([projectData, progressData]) => {
        setProject(projectData);
        if (progressData?.state === 'completed') {
          setCompleted(true);
        }
        if (progressData?.segmentProgress) {
          setSegmentProgress(progressData.segmentProgress);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user.id]);

  const handleCompleteProject = async () => {
    try {
      const res = await authFetch(`/api/student/projects/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setCompleted(true);
        if (data.coinAwarded) {
          setShowCoinAnimation(true);
          setTimeout(() => setShowCoinAnimation(false), 3000);
        }
      }
    } catch (err: any) {
      console.error('Failed to complete project', err);
    }
  };

  const handleCompleteSegment = async (segmentId: number) => {
    try {
      const res = await authFetch(`/api/student/segments/${segmentId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setSegmentProgress(prev => ({ ...prev, [segmentId]: 'completed' }));
        if (data.coinAwarded) {
          setShowCoinAnimation(true);
          setTimeout(() => setShowCoinAnimation(false), 3000);
        }
      }
    } catch (err: any) {
      console.error('Failed to complete segment', err);
    }
  };

  const handleAnswerChange = (segmentId: number, quizIndex: number, optionIndex: number, isMulti: boolean) => {
    if (segmentProgress[segmentId] === 'completed') return;
    
    setSegmentAnswers(prev => {
      const segAns = prev[segmentId] || {};
      if (isMulti) {
        const current = (segAns[quizIndex] as number[]) || [];
        const next = current.includes(optionIndex)
          ? current.filter(i => i !== optionIndex)
          : [...current, optionIndex];
        return { ...prev, [segmentId]: { ...segAns, [quizIndex]: next } };
      } else {
        return { ...prev, [segmentId]: { ...segAns, [quizIndex]: optionIndex } };
      }
    });
    setSegmentShowResults(prev => ({ ...prev, [segmentId]: false }));
  };

  const checkSegmentAllAnswered = (segment: any, activeQuizzes: Quiz[]) => {
    if (!activeQuizzes || activeQuizzes.length === 0) return true;
    const segAns = segmentAnswers[segment.id] || {};
    return activeQuizzes.every((_: any, i: number) => {
      const ans = segAns[i];
      if (ans === undefined) return false;
      if (Array.isArray(ans)) return ans.length > 0;
      return true;
    });
  };

  const checkSegmentAllCorrect = (segment: any, activeQuizzes: Quiz[]) => {
    if (!activeQuizzes || activeQuizzes.length === 0) return true;
    const segAns = segmentAnswers[segment.id] || {};
    return checkSegmentAllAnswered(segment, activeQuizzes) && activeQuizzes.every((q: any, i: number) => {
      const ans = segAns[i];
      const correctIndices = q.correctOptionIndices || [q.correctOptionIndex ?? 0];
      if (Array.isArray(ans)) {
        if (ans.length !== correctIndices.length) return false;
        return ans.every((idx: number) => correctIndices.includes(idx));
      } else {
        return correctIndices.length === 1 && correctIndices[0] === ans;
      }
    });
  };

  const sanitize = (html: string) => DOMPurify.sanitize(html);

  if (loading) return <div className="text-center p-8 text-stone-500">{t.loading}</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!project) return <div className="text-center p-8 text-stone-500">{t.classroomNotFound}</div>;

  const publishedSegments = (project.segments || []).filter(s => !!s.isPublished);
  const allSegmentsCompleted = publishedSegments.every(s => segmentProgress[s.id!] === 'completed');

  const pTitle = lang === 'de' ? (project.titleDe || project.title) : project.title;

  return (
    <>
      <AnimatePresence>
        {showCoinAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -50 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="bg-gradient-to-br from-yellow-300 to-orange-500 rounded-3xl p-8 shadow-2xl border-4 border-white flex flex-col items-center gap-4">
              <span className="text-6xl drop-shadow-md">🪙</span>
              <div className="text-4xl font-black text-white drop-shadow-lg tracking-wider">
                {t.earnedCoin}
              </div>
              <div className="text-xl font-bold text-yellow-100 drop-shadow-sm">
                {t.awesomeJob}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-orange-100">
        <div className="bg-orange-400 p-6 flex items-center justify-between">
          <button
            onClick={() => navigate(`/building/${project.buildingId}`)}
            className="flex items-center gap-2 text-white hover:bg-orange-500 px-4 py-2 rounded-xl transition-colors font-bold"
          >
            <ArrowLeft size={20} /> {t.backToHallway}
          </button>
          <h1 className="text-3xl font-extrabold text-white drop-shadow-md">{pTitle}</h1>
          <div className="w-24"></div>
        </div>

        <div className="p-8">
          {project.coverImage && (
            <img
              src={project.coverImage}
              alt={pTitle}
              className="w-full h-64 object-cover rounded-2xl mb-8 shadow-md border-2 border-orange-50"
              referrerPolicy="no-referrer"
            />
          )}

          {project.scratchProjectId && (
            <div className="mb-12">
              <div className="rounded-2xl overflow-hidden border-4 border-orange-200 shadow-lg bg-stone-100 flex justify-center p-4">
                <iframe
                  src={`https://scratch.mit.edu/projects/${project.scratchProjectId}/embed`}
                  allowTransparency={true}
                  width="485"
                  height="402"
                  frameBorder="0"
                  scrolling="no"
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
              <a
                href={project.scratchFileUrl}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-transform active:scale-95"
                download
              >
                <Download size={24} /> {t.downloadSb3}
              </a>
            </div>
          )}

          <div ref={contentRef} className="space-y-16">
            {publishedSegments.map((seg, sIndex) => {
              const segId = seg.id!;
              const isSegLocked = !!seg.isLocked;
              const isSegCompleted = segmentProgress[segId] === 'completed';
              
              const sTitle = lang === 'de' ? (seg.titleDe || seg.title) : seg.title;
              const sContent = lang === 'de' ? (seg.contentDe || seg.content) : seg.content;

              let segQuizzes = (Array.isArray(seg.quizzes) ? seg.quizzes : []) as Quiz[];
              const maybeDe = Array.isArray(seg.quizzesDe) ? seg.quizzesDe : [];
              if (lang === 'de' && maybeDe.length > 0) segQuizzes = maybeDe as Quiz[];

              const isAllAnswered = checkSegmentAllAnswered(seg, segQuizzes);
              const isAllCorrect = checkSegmentAllCorrect(seg, segQuizzes);
              const showResults = segmentShowResults[segId] || false;

              if (isSegLocked) {
                return (
                  <div key={segId} className="bg-stone-50 border-4 border-dashed border-stone-200 rounded-3xl p-12 flex flex-col items-center justify-center text-stone-500">
                    <Lock size={64} className="mb-6 opacity-20" />
                    <h3 className="text-3xl font-bold text-stone-400 mb-2">{sTitle || `Segment ${sIndex + 1}`}</h3>
                    <p className="text-stone-400 text-lg font-medium tracking-wide">{t.lockedByTeacher}</p>
                  </div>
                );
              }

              return (
                <div key={segId} className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8">
                  {sTitle && <h2 className="text-3xl font-bold text-orange-800 mb-8 pb-4 border-b border-orange-100">{sTitle}</h2>}
                  
                  {sContent && (
                    <div
                      className="prose prose-orange max-w-none mb-12 text-stone-700 leading-relaxed text-lg select-text"
                      dangerouslySetInnerHTML={{ __html: sanitize(sContent) }}
                    />
                  )}

                  {segQuizzes.length > 0 && (
                    <div className="mb-8 p-8 rounded-3xl bg-orange-50/50 border-2 border-orange-100">
                      <h3 className="text-2xl font-bold text-orange-800 mb-8 border-b-2 border-orange-200 pb-4 inline-block">{t.knowledgeCheck}</h3>
                      <div className="space-y-8">
                        {segQuizzes.map((quiz, qIndex) => (
                          <div key={qIndex} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                            <div className="flex items-start gap-4 mb-8">
                              <div className="bg-orange-100 text-orange-700 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                                {qIndex + 1}
                              </div>
                              <div className="prose prose-orange max-w-none text-xl font-medium text-stone-800" dangerouslySetInnerHTML={{ __html: sanitize(quiz.question) }} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-14">
                              {quiz.options.map((opt: string, oIndex: number) => {
                                const ans = (segmentAnswers[segId] || {})[qIndex];
                                const isSelected = Array.isArray(ans) ? ans.includes(oIndex) : ans === oIndex;
                                const correctIndices = quiz.correctOptionIndices || [quiz.correctOptionIndex ?? 0];
                                const isCorrect = correctIndices.includes(oIndex);
                                const showCorrectness = showResults || isSegCompleted;

                                let btnClass = "text-left px-6 py-4 rounded-xl border-2 transition-all font-medium text-lg ";
                                if (showCorrectness) {
                                  if (isCorrect) {
                                    btnClass += "bg-green-50 border-green-500 text-green-800";
                                  } else if (isSelected && !isCorrect) {
                                    btnClass += "bg-red-50 border-red-500 text-red-800";
                                  } else {
                                    btnClass += "bg-stone-50 border-stone-200 text-stone-500 opacity-60";
                                  }
                                } else {
                                  if (isSelected) {
                                    btnClass += "bg-orange-50 border-orange-500 text-orange-800 shadow-md ring-2 ring-orange-200";
                                  } else {
                                    btnClass += "bg-white border-stone-200 text-stone-600 hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm";
                                  }
                                }

                                return (
                                  <button
                                    key={oIndex}
                                    onClick={() => handleAnswerChange(segId, qIndex, oIndex, !!quiz.isMultiSelect)}
                                    disabled={isSegCompleted}
                                    className={btnClass}
                                  >
                                      <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                          isSelected ? 'bg-orange-500 border-none' : 'bg-white border-2 border-stone-300'
                                        }`}>
                                          {isSelected && (
                                            <div className={quiz.isMultiSelect ? "w-3 h-3 bg-white rounded-sm" : "w-3 h-3 bg-white rounded-full"} />
                                          )}
                                        </div>
                                        <span className="flex-1 leading-tight">{opt}</span>
                                        {showCorrectness && isCorrect && <CheckCircle2 className="text-green-500 shrink-0" size={24} />}
                                        {showCorrectness && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0" size={24} />}
                                      </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {!isSegCompleted && (
                        <div className="mt-8 flex justify-center">
                          <button
                            onClick={() => setSegmentShowResults(prev => ({ ...prev, [segId]: true }))}
                            disabled={!isAllAnswered}
                            className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-md ${isAllAnswered
                                ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5'
                                : 'bg-stone-200 text-stone-500 cursor-not-allowed opacity-70'
                              }`}
                          >
                            {t.checkAnswers}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => handleCompleteSegment(segId)}
                      disabled={isSegCompleted || (segQuizzes.length > 0 && (!showResults || !isAllCorrect))}
                      className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-md ${isSegCompleted
                          ? 'bg-green-500 text-white cursor-default'
                          : (segQuizzes.length === 0 || (showResults && isAllCorrect))
                            ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
                            : 'bg-stone-100 text-stone-400 border-2 border-stone-200 cursor-not-allowed hidden'
                        }`}
                    >
                      {isSegCompleted ? <CheckSquare size={24} /> : <Square size={24} />}
                      {isSegCompleted ? t.segmentCompleted : t.completeSegment}
                    </button>
                  </div>
                </div>
              );
            })}

            {publishedSegments.length === 0 && (
              <div className="text-center p-12 text-stone-500 text-lg">{t.noSegments}</div>
            )}
          </div>

          <div className="border-t-4 border-orange-100 mt-16 pt-12 flex flex-col items-center justify-center">
            <h3 className="text-2xl font-bold text-stone-700 mb-6 flex items-center gap-2">
              <CheckSquare className="text-orange-500" /> {t.overallProgress}
            </h3>
            <button
              onClick={handleCompleteProject}
              disabled={completed || !allSegmentsCompleted || publishedSegments.length === 0}
              className={`flex items-center gap-4 px-10 py-5 rounded-3xl font-extrabold text-2xl transition-all shadow-xl ${completed
                  ? 'bg-green-500 text-white cursor-default'
                  : allSegmentsCompleted && publishedSegments.length > 0
                    ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 hover:scale-105'
                    : 'bg-stone-100 text-stone-400 border-4 border-stone-200 cursor-not-allowed'
                }`}
            >
              {completed ? <CheckSquare size={36} /> : <Square size={36} />}
              {completed ? t.fullyCompleted : t.markCompleted}
            </button>
            {!completed && !allSegmentsCompleted && publishedSegments.length > 0 && (
              <p className="mt-4 text-stone-500 font-medium">{t.completeAllSegments}</p>
            )}
          </div>
        </div>
      </div>
      <SelectionPopup contentRef={contentRef} projectTitle={project.title} />
    </>
  );
}
