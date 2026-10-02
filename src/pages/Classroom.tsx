import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Download, ArrowLeft, CheckCircle2, XCircle, Lock } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { motion, AnimatePresence } from 'motion/react';
import { authFetch } from '../App';
import SelectionPopup from '../components/SelectionPopup';
import WidgetModal from '../components/WidgetModal';
import HomeworkPanel from '../components/HomeworkPanel';
import AssignmentPanel from '../components/AssignmentPanel';
import AskTeacherDialog from '../components/AskTeacherDialog';
import type { User, Project, Quiz, HomeworkStatus, AssignmentSubmission } from '../types';
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
  const [quizWrongAttempts, setQuizWrongAttempts] = useState<Record<number, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [homeworkStatus, setHomeworkStatus] = useState<HomeworkStatus | null>(null);
  const [assignmentSubmission, setAssignmentSubmission] = useState<AssignmentSubmission | null>(null);
  const [activeWidget, setActiveWidget] = useState<{ id: number; name: string; entryFile: string } | null>(null);
  // Projects with an interactive version open it by default.
  const [view, setView] = useState<'interactive' | 'article'>('article');
  const contentRef = useRef<HTMLDivElement>(null);
  const [askText, setAskText] = useState<string | null>(null);
  // What the interactive page reported through its postMessage bridge.
  const [interactiveHasQuiz, setInteractiveHasQuiz] = useState(false);
  const [interactiveQuizDone, setInteractiveQuizDone] = useState(false);
  // Set once the page reports its reading position; null means it never does.
  const [interactiveAtEnd, setInteractiveAtEnd] = useState<boolean | null>(null);
  const interactiveWrong = useRef<Record<string, number>>({});
  // Replaying a finished lesson: bumping the key reloads the iframe with a clean slate.
  const [replayKey, setReplayKey] = useState(0);
  // Completed article segments the student chose to practice again.
  const [practiceSegs, setPracticeSegs] = useState<Record<number, boolean>>({});
  const interactiveFrame = useRef<HTMLIFrameElement>(null);
  const completedRef = useRef(false);
  completedRef.current = completed;

  // Tell the lesson page whether it is completed, so it can unlock its chapters.
  const sendLessonState = () => {
    interactiveFrame.current?.contentWindow?.postMessage({ source: 'kidsacademy-host', type: 'state', completed }, '*');
  };
  useEffect(sendLessonState, [completed]);

  useEffect(() => {
    setInteractiveHasQuiz(false);
    setInteractiveQuizDone(false);
    setInteractiveAtEnd(null);
    interactiveWrong.current = {};
    setReplayKey(0);
    setPracticeSegs({});
  }, [id]);

  // The interactive page is sandboxed and can only talk to us via postMessage.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data;
      // Sandboxed frames have the opaque origin "null".
      if (e.origin !== 'null' || !m || m.source !== 'kidsacademy') return;
      if (m.type === 'ask') {
        setAskText(String(m.text || '').slice(0, 600));
      } else if (m.type === 'progress') {
        setInteractiveAtEnd(!!m.atEnd);
      } else if (m.type === 'hasQuiz') {
        setInteractiveHasQuiz(true);
      } else if (m.type === 'answer') {
        setInteractiveHasQuiz(true);
        if (!m.correct) {
          const key = String(m.id ?? '');
          interactiveWrong.current[key] = (interactiveWrong.current[key] || 0) + 1;
        }
      } else if (m.type === 'finished') {
        setInteractiveHasQuiz(true);
        setInteractiveQuizDone(true);
        if (completedRef.current) return;
        // Same rule as the article quiz: a question that needed two wrong
        // tries means no coin for this lesson.
        const penalty = (Object.values(interactiveWrong.current) as number[]).some(n => n >= 2);
        handleCompleteProjectRef.current(penalty);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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
        setView(projectData?.interactiveWidget && projectData?.lessonDisplay !== 'article' ? 'interactive' : 'article');
        setHomeworkStatus(projectData?.homeworkStatus || null);
        setAssignmentSubmission(projectData?.assignmentSubmission || null);
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

  const handleCompleteProject = async (noScore = false) => {
    try {
      const res = await authFetch(`/api/student/projects/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, noScore })
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

  // The message listener is registered once; it must always call the latest handler.
  const handleCompleteProjectRef = useRef(handleCompleteProject);
  handleCompleteProjectRef.current = handleCompleteProject;

  // Practice a finished lesson again. Completion and the coin are already
  // recorded server-side, so replaying never changes progress or rewards.
  const handleReplayInteractive = () => {
    setInteractiveQuizDone(false);
    setInteractiveAtEnd(null);
    interactiveWrong.current = {};
    setReplayKey(k => k + 1);
  };

  const handleReplaySegment = (segId: number) => {
    setPracticeSegs(prev => ({ ...prev, [segId]: true }));
    setSegmentAnswers(prev => ({ ...prev, [segId]: {} }));
    setSegmentShowResults(prev => ({ ...prev, [segId]: false }));
    setQuizWrongAttempts(prev => ({ ...prev, [segId]: {} }));
  };

  const handleCompleteSegment = async (segmentId: number, noScore = false) => {
    try {
      const res = await authFetch(`/api/student/segments/${segmentId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, noScore })
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

  // A hand-in unlocks the article server-side, so the project has to be
  // fetched again to actually receive the segment content.
  const handleHomeworkSubmitted = async (status: HomeworkStatus) => {
    setHomeworkStatus(status);
    try {
      const res = await authFetch(`/api/projects/${id}`);
      if (res.ok) setProject(await res.json());
    } catch (err) {
      console.error('Failed to reload project after homework submission', err);
    }
  };

  const showCoin = () => {
    setShowCoinAnimation(true);
    setTimeout(() => setShowCoinAnimation(false), 3000);
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

  const isQuizCorrect = (quiz: Quiz, ans: number | number[] | undefined) => {
    if (ans === undefined) return false;
    const correctIndices = quiz.correctOptionIndices || [quiz.correctOptionIndex ?? 0];
    if (Array.isArray(ans)) {
      if (ans.length !== correctIndices.length) return false;
      return ans.every((idx: number) => correctIndices.includes(idx));
    }
    return correctIndices.length === 1 && correctIndices[0] === ans;
  };

  const checkSegmentAllCorrect = (segment: any, activeQuizzes: Quiz[]) => {
    if (!activeQuizzes || activeQuizzes.length === 0) return true;
    const segAns = segmentAnswers[segment.id] || {};
    return checkSegmentAllAnswered(segment, activeQuizzes) && activeQuizzes.every((q, i) => isQuizCorrect(q, segAns[i]));
  };

  const handleCheckAnswers = (segId: number, activeQuizzes: Quiz[]) => {
    const segAns = segmentAnswers[segId] || {};
    setQuizWrongAttempts(prev => {
      const segAttempts = { ...(prev[segId] || {}) };
      activeQuizzes.forEach((q, i) => {
        if (!isQuizCorrect(q, segAns[i])) {
          segAttempts[i] = (segAttempts[i] || 0) + 1;
        }
      });
      return { ...prev, [segId]: segAttempts };
    });
    setSegmentShowResults(prev => ({ ...prev, [segId]: true }));
  };

  const sanitize = (html: string) => {
    const cleaned = DOMPurify.sanitize(html);
    // Replace non-breaking spaces and other whitespace chars that prevent line breaks
    return cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/ /g, ' ')
      .replace(/ /g, ' ')
      .replace(/ /g, ' ');
  };


  const handleContentClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as Element).closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    const m = href.match(/^\/widget-open\/(\d+)$/);
    if (!m) return;
    e.preventDefault();
    const widgetId = Number(m[1]);
    try {
      const res = await authFetch(`/api/widgets/${widgetId}`);
      const w = await res.json();
      if (w.id) setActiveWidget({ id: w.id, name: w.name, entryFile: w.entryFile || 'index.html' });
    } catch {}
  };

  if (loading) return <div className="text-center p-8 text-stone-500">{t.loading}</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!project) return <div className="text-center p-8 text-stone-500">{t.classroomNotFound}</div>;

  const publishedSegments = (project.segments || []).filter(s => !!s.isPublished);
  const allSegmentsCompleted = publishedSegments.every(s => segmentProgress[s.id!] === 'completed');

  const pTitle = project.title;
  const isHomework = project.projectType === 'homework';
  // The server already withholds the article; this only mirrors that state.
  const articleLocked = isHomework && !homeworkStatus?.submitted;
  // The teacher can restrict a project to one lesson type; homework keeps its article reachable.
  const display = project.lessonDisplay || 'both';
  const interactive = display === 'article' ? null : project.interactiveWidget || null;
  const interactiveOnly = !!interactive && display === 'interactive' && !isHomework;
  const showInteractive = !!interactive && (interactiveOnly || view === 'interactive');

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

      <div className={`${interactive ? 'max-w-7xl' : 'max-w-4xl'} mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-orange-100`}>
        <div className="bg-orange-400 p-6 flex items-center justify-between">
          <button
            onClick={() => navigate(`/building/${project.buildingId}`)}
            className="flex items-center gap-2 text-white hover:bg-orange-500 px-4 py-2 rounded-xl transition-colors font-bold"
          >
            <ArrowLeft size={20} /> {t.backToHallway}
          </button>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-white drop-shadow-md">
            {isHomework && (
              <span className="rounded-full bg-white/25 px-3 py-1 text-sm font-bold uppercase tracking-wider">
                {t.homeworkBadge}
              </span>
            )}
            {pTitle}
          </h1>
          <div className="w-24"></div>
        </div>

        {interactive && !interactiveOnly && (
          <div className="flex justify-center gap-2 border-b-2 border-orange-100 bg-orange-50/60 px-4 py-3" role="tablist">
            {(['interactive', 'article'] as const).map(mode => (
              <button
                key={mode}
                role="tab"
                aria-selected={view === mode}
                onClick={() => setView(mode)}
                className={`rounded-xl px-5 py-2 font-bold transition-colors ${view === mode
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-stone-600 border-2 border-orange-100 hover:border-orange-300'
                  }`}
              >
                {mode === 'interactive' ? t.viewInteractive : t.viewArticle}
              </button>
            ))}
          </div>
        )}

        {showInteractive && (
          <div>
            {/* Sandboxed like every widget: scripts run, but no access to the app origin or /api/* */}
            <iframe
              ref={interactiveFrame}
              onLoad={sendLessonState}
              key={`${interactive.id}-${replayKey}`}
              src={`/widget-files/${interactive.id}/${interactive.entryFile || 'index.html'}`}
              title={interactive.name}
              className="block w-full border-0"
              style={{ height: 'max(640px, calc(100vh - 220px))' }}
              allow="fullscreen"
              sandbox="allow-scripts allow-forms allow-downloads allow-modals"
            />
            <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-orange-100 bg-orange-50/60 px-6 py-4">
              <p className="min-w-0 flex-1 text-stone-600 font-medium">
                {completed ? t.interactiveCompletedHint : interactiveHasQuiz ? t.interactiveQuizHint : t.interactiveFinishHint}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setAskText('')}
                  className="rounded-xl border-2 border-orange-200 bg-white px-4 py-2 font-bold text-orange-700 hover:bg-orange-50"
                >
                  {t.interactiveAskTeacher}
                </button>
                {completed && <button
                  onClick={handleReplayInteractive}
                  className="rounded-xl border-2 border-orange-200 bg-white px-4 py-2 font-bold text-orange-700 hover:bg-orange-50"
                >
                  {t.replayQuiz}
                </button>}
                {/* With a quiz, the lesson completes by finishing it; the button only shows afterwards.
                    Without one it appears on the last page (or always, if the page never reports its position). */}
                {(completed || interactiveQuizDone || (!interactiveHasQuiz && interactiveAtEnd !== false)) && <button
                  onClick={() => handleCompleteProject(interactiveHasQuiz && !interactiveQuizDone)}
                  disabled={completed}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2 font-bold shadow-md ${completed
                    ? 'cursor-default bg-green-500 text-white'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                >
                  {completed ? <CheckSquare size={20} /> : <Square size={20} />}
                  {completed ? t.fullyCompleted : t.interactiveMarkDone}
                </button>}
                {!interactiveOnly && <button
                  onClick={() => { setView('article'); window.scrollTo({ top: 0 }); }}
                  className="rounded-xl bg-blue-500 px-5 py-2 font-bold text-white shadow-md hover:bg-blue-600"
                >
                  {t.interactiveToArticle}
                </button>}
              </div>
            </div>
          </div>
        )}

        <div className={`p-8 ${interactive ? 'max-w-4xl mx-auto' : ''} ${showInteractive ? 'hidden' : ''}`}>
          {project.description && (
            <p className="text-stone-600 text-lg leading-relaxed mb-8 whitespace-pre-line">
              {project.description}
            </p>
          )}

          {project.coverImage && (
            <img
              src={project.coverImage}
              alt={pTitle}
              className="w-full h-64 object-cover rounded-2xl mb-8 shadow-md border-2 border-orange-50"
              referrerPolicy="no-referrer"
            />
          )}

          {isHomework && (
            <HomeworkPanel
              projectId={project.id}
              userId={user.id}
              instructions={project.homeworkInstructions}
              status={homeworkStatus}
              onSubmitted={handleHomeworkSubmitted}
              onCoinEarned={showCoin}
            />
          )}

          {project.assignmentInstructions && (
            <AssignmentPanel
              projectId={project.id}
              instructions={project.assignmentInstructions}
              submission={assignmentSubmission}
              onSubmitted={setAssignmentSubmission}
              onCoinEarned={showCoin}
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
              <a
                href={project.scratchFileUrl}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-transform active:scale-95"
                download
              >
                <Download size={24} /> {t.downloadSb3}
              </a>
            </div>
          )}

          {/* Fertiges Projekt — erst nach Abschluss der Lektion sichtbar */}
          {(project.finalScratchProjectId || project.finalScratchFileUrl) && (
            completed ? (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare size={24} className="text-emerald-600" />
                  <h3 className="text-xl font-bold text-emerald-800">{t.finalProjectTitle}</h3>
                </div>
                <p className="text-stone-600 mb-4">{t.finalProjectDesc}</p>
                {project.finalScratchProjectId && (
                  <div className="rounded-2xl overflow-hidden border-4 border-emerald-200 shadow-lg bg-stone-100 flex justify-center p-4 mb-4">
                    <iframe
                      src={`https://scratch.mit.edu/projects/${project.finalScratchProjectId}/embed`}
                      width="485"
                      height="402"
                      style={{ border: 0 }}
                      allowFullScreen
                      title="Finished Scratch Project"
                    ></iframe>
                  </div>
                )}
                {project.finalScratchFileUrl && (
                  <a
                    href={project.finalScratchFileUrl}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-transform active:scale-95"
                    download
                  >
                    <Download size={24} /> {t.downloadSb3}
                  </a>
                )}
              </div>
            ) : (
              <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl p-6 mb-12 flex items-center gap-3 text-stone-500">
                <Lock size={22} className="opacity-40" />
                <p className="font-medium">{t.finalProjectLocked}</p>
              </div>
            )
          )}

          {articleLocked && (
            <div className="flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-stone-200 bg-stone-50 p-12 text-center text-stone-500">
              <Lock size={64} className="mb-6 opacity-20" />
              <p className="text-lg font-medium">{t.homeworkArticleLocked}</p>
            </div>
          )}

          <div ref={contentRef} className={`space-y-16 ${articleLocked ? 'hidden' : ''}`}>
            {publishedSegments.map((seg, sIndex) => {
              const segId = seg.id!;
              const isSegLocked = !!seg.isLocked;
              const isSegCompleted = segmentProgress[segId] === 'completed';
              // A completed segment shows its answers, unless it is being practiced again.
              const quizLocked = isSegCompleted && !practiceSegs[segId];
              
              const sTitle = seg.title;
              const sContent = seg.content;

              const segQuizzes = (Array.isArray(seg.quizzes) ? seg.quizzes : []).slice(0, 5) as Quiz[];

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
                      className="prose prose-orange max-w-none mb-12 text-stone-700 leading-relaxed text-lg select-text classroom-content"
                      onClick={handleContentClick}
                      dangerouslySetInnerHTML={{ __html: sanitize(sContent) }}
                    />
                  )}

                  {segQuizzes.length > 0 && (
                    <div className="mb-8 p-8 rounded-3xl bg-orange-50/50 border-2 border-orange-100">
                      <h3 className="text-2xl font-bold text-orange-800 mb-8 border-b-2 border-orange-200 pb-4 inline-block">{t.knowledgeCheck}</h3>
                      <div className="space-y-8">
                        {segQuizzes.map((quiz, qIndex) => {
                          const quizAns = (segmentAnswers[segId] || {})[qIndex];
                          const quizCorrect = isQuizCorrect(quiz, quizAns);
                          const wrongAttempts = (quizWrongAttempts[segId] || {})[qIndex] || 0;
                          // 答对或连续两次答错后才揭示正确答案
                          const revealCorrect = quizLocked || (showResults && quizCorrect) || wrongAttempts >= 2;
                          const showExplanation = !!quiz.explanation && (quizLocked || (showResults && quizCorrect));

                          return (
                          <div key={qIndex} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                            <div className="flex items-start gap-4 mb-8">
                              <div className="bg-orange-100 text-orange-700 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                                {qIndex + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                {quiz.question && (
                                  <div className="prose prose-orange max-w-none text-xl font-medium text-stone-800" dangerouslySetInnerHTML={{ __html: sanitize(quiz.question) }} />
                                )}
                                {quiz.questionImage && (
                                  <img
                                    src={quiz.questionImage}
                                    alt={`Bild zu Frage ${qIndex + 1}`}
                                    className="mt-4 max-h-80 w-auto max-w-full rounded-2xl border border-orange-100 object-contain"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-14">
                              {quiz.options.map((opt: string, oIndex: number) => {
                                const ans = quizAns;
                                const isSelected = Array.isArray(ans) ? ans.includes(oIndex) : ans === oIndex;
                                const correctIndices = quiz.correctOptionIndices || [quiz.correctOptionIndex ?? 0];
                                const isCorrect = correctIndices.includes(oIndex);
                                const showCorrectness = showResults || quizLocked;

                                let btnClass = "text-left px-6 py-4 rounded-xl border-2 transition-all font-medium text-lg ";
                                if (revealCorrect && isCorrect) {
                                  btnClass += "bg-green-50 border-green-500 text-green-800";
                                } else if (showCorrectness) {
                                  if (isSelected && !isCorrect) {
                                    btnClass += "bg-red-50 border-red-500 text-red-800";
                                  } else if (isSelected) {
                                    // 多选题部分正确时不泄露该选项是否正确
                                    btnClass += "bg-orange-50 border-orange-500 text-orange-800";
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
                                    disabled={quizLocked}
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
                                        <span className="flex min-w-0 flex-1 flex-col gap-3 leading-tight">
                                          {quiz.optionImages?.[oIndex] && (
                                            <img
                                              src={quiz.optionImages[oIndex]}
                                              alt={opt || `Antwort ${oIndex + 1}`}
                                              className="h-40 w-full rounded-xl object-contain"
                                            />
                                          )}
                                          {opt && <span>{opt}</span>}
                                        </span>
                                        {revealCorrect && isCorrect && <CheckCircle2 className="text-green-500 shrink-0" size={24} />}
                                        {showCorrectness && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0" size={24} />}
                                      </div>
                                  </button>
                                );
                              })}
                            </div>

                            {showResults && !quizCorrect && !quizLocked && (
                              <div className={`mt-6 ml-14 px-5 py-3 rounded-xl font-medium text-lg ${wrongAttempts >= 2
                                  ? 'bg-green-50 border-2 border-green-200 text-green-800'
                                  : 'bg-red-50 border-2 border-red-200 text-red-700'
                                }`}>
                                {wrongAttempts >= 2 ? t.quizAnswerRevealed : t.quizTryAgain}
                              </div>
                            )}

                            {showExplanation && (
                              <div className="mt-6 ml-14 bg-green-50 border-2 border-green-200 rounded-xl px-5 py-4">
                                <div className="font-bold text-green-800 mb-1">💡 {t.quizExplanation}</div>
                                <div className="prose prose-green max-w-none text-green-900" dangerouslySetInnerHTML={{ __html: sanitize(quiz.explanation!) }} />
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>

                      {quizLocked && (
                        <div className="mt-8 flex justify-center">
                          <button
                            onClick={() => handleReplaySegment(segId)}
                            className="px-10 py-4 rounded-2xl font-bold text-lg bg-white border-2 border-orange-300 text-orange-700 hover:bg-orange-50 shadow-md"
                          >
                            {t.replayQuiz}
                          </button>
                        </div>
                      )}

                      {!quizLocked && (
                        <div className="mt-8 flex justify-center">
                          <button
                            onClick={() => handleCheckAnswers(segId, segQuizzes)}
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

                  {(() => {
                    // A completed segment must always show the green confirmation —
                    // never the hidden state — even after a reload where showResults resets.
                    const lessonDone = publishedSegments.length === 1 ? (completed || isSegCompleted) : isSegCompleted;
                    // The button is actionable once there are no quizzes, the quiz was passed
                    // this session, or the segment is already marked complete (self-heal).
                    const canComplete = segQuizzes.length === 0 || (showResults && isAllCorrect) || isSegCompleted;
                    return (
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={async () => {
                        const segAttempts = quizWrongAttempts[segId] || {};
                        const segPenalty = (Object.values(segAttempts) as number[]).some(a => a >= 2);
                        if (publishedSegments.length === 1) {
                          await handleCompleteSegment(segId, segPenalty);
                          await handleCompleteProject(segPenalty);
                        } else {
                          handleCompleteSegment(segId, segPenalty);
                        }
                      }}
                      disabled={lessonDone || !canComplete}
                      className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-md ${
                        lessonDone
                          ? 'bg-green-500 text-white cursor-default'
                          : canComplete
                            ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
                            : 'bg-stone-100 text-stone-400 border-2 border-stone-200 cursor-not-allowed hidden'
                        }`}
                    >
                      {lessonDone ? <CheckSquare size={24} /> : <Square size={24} />}
                      {lessonDone
                        ? (publishedSegments.length === 1 ? t.fullyCompleted : t.segmentCompleted)
                        : (publishedSegments.length === 1 ? t.markCompleted : t.completeSegment)}
                    </button>
                  </div>
                    );
                  })()}
                </div>
              );
            })}

            {publishedSegments.length === 0 && (
              <div className="text-center p-12 text-stone-500 text-lg">{t.noSegments}</div>
            )}
          </div>

            {publishedSegments.length > 1 && !articleLocked && (
              <div className="border-t-4 border-orange-100 mt-16 pt-12 flex flex-col items-center justify-center">
                <h3 className="text-2xl font-bold text-stone-700 mb-6 flex items-center gap-2">
                  <CheckSquare className="text-orange-500" /> {t.overallProgress}
                </h3>
                <button
                  onClick={() => {
                    const projectPenalty = Object.keys(quizWrongAttempts).some(key => {
                      const attempts = quizWrongAttempts[Number(key)];
                      return (Object.values(attempts) as number[]).some(a => a >= 2);
                    });
                    handleCompleteProject(projectPenalty);
                  }}
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
            )}
        </div>
      </div>
      <SelectionPopup contentRef={contentRef} projectTitle={project.title} />
      {askText !== null && (
        <AskTeacherDialog projectTitle={project.title} selectedText={askText} onClose={() => setAskText(null)} />
      )}
      {activeWidget && (
        <WidgetModal
          widgetId={activeWidget.id}
          widgetName={activeWidget.name}
          entryFile={activeWidget.entryFile}
          onClose={() => setActiveWidget(null)}
        />
      )}
    </>
  );
}
