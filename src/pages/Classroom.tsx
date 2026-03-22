import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Download, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { motion, AnimatePresence } from 'motion/react';
import { authFetch } from '../App';
import SelectionPopup from '../components/SelectionPopup';
import type { User, Project, Quiz } from '../types';

export default function Classroom({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [completed, setCompleted] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
        if (projectData.quizzes) {
          try {
            const parsed = typeof projectData.quizzes === 'string'
              ? JSON.parse(projectData.quizzes)
              : projectData.quizzes;
            setQuizzes(parsed);
          } catch {
            setQuizzes([]);
          }
        }
        if (progressData?.state === 'completed') {
          setCompleted(true);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user.id]);

  const handleComplete = async () => {
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

  const handleAnswerChange = (quizIndex: number, optionIndex: number) => {
    if (completed) return;
    setAnswers(prev => ({ ...prev, [quizIndex]: optionIndex }));
    setShowResults(false);
  };

  const allAnswered = quizzes.length > 0 && Object.keys(answers).length === quizzes.length;
  const allCorrect = quizzes.length === 0 || (allAnswered && quizzes.every((q, i) => answers[i] === q.correctOptionIndex));

  const handleCheckAnswers = () => {
    setShowResults(true);
  };

  // Sanitize HTML before rendering
  const sanitize = (html: string) => DOMPurify.sanitize(html);

  if (loading) return <div className="text-center p-8 text-stone-500">Loading classroom...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!project) return <div className="text-center p-8 text-stone-500">Classroom not found.</div>;

  return (
    <>
      {/* ─── Coin Celebration Animation ─── */}
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
                +1 BlockCoin!
              </div>
              <div className="text-xl font-bold text-yellow-100 drop-shadow-sm">
                Awesome job! You earned it!
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
          <ArrowLeft size={20} /> Back to Hallway
        </button>
        <h1 className="text-3xl font-extrabold text-white drop-shadow-md">{project.title}</h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>

      <div className="p-8">
        {project.coverImage && (
          <img
            src={project.coverImage}
            alt={project.title}
            className="w-full h-64 object-cover rounded-2xl mb-8 shadow-md border-2 border-orange-50"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="prose prose-orange max-w-none mb-12">
          <h2 className="text-2xl font-bold text-orange-800 mb-4">Lesson Content</h2>
          <div
            ref={contentRef}
            className="text-stone-700 leading-relaxed text-lg select-text"
            dangerouslySetInnerHTML={{ __html: sanitize(project.content || '') }}
          />
        </div>

        {project.scratchProjectId && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-orange-800 mb-4">Interactive Scratch Project</h2>
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
              <h3 className="text-xl font-bold text-orange-800 mb-2">Project Files</h3>
              <p className="text-stone-600">Download the starter project to begin coding.</p>
            </div>
            <a
              href={project.scratchFileUrl}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-transform active:scale-95"
              download
            >
              <Download size={24} /> Download .sb3
            </a>
          </div>
        )}

        {quizzes.length > 0 && (
          <div className="mb-12 border-t-4 border-orange-100 pt-8">
            <h3 className="text-2xl font-bold text-orange-800 mb-6">Knowledge Check</h3>
            <div className="space-y-8">
              {quizzes.map((quiz, qIndex) => (
                <div key={qIndex} className="bg-stone-50 p-6 rounded-2xl border-2 border-stone-200">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="bg-orange-100 text-orange-700 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">
                      {qIndex + 1}
                    </div>
                    <div className="prose prose-orange max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(quiz.question) }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quiz.options.map((opt: string, oIndex: number) => {
                      const isSelected = answers[qIndex] === oIndex;
                      const isCorrect = quiz.correctOptionIndex === oIndex;
                      const showCorrectness = showResults || completed;

                      let btnClass = "text-left px-6 py-4 rounded-xl border-2 transition-all ";
                      if (showCorrectness) {
                        if (isCorrect) {
                          btnClass += "bg-green-50 border-green-500 text-green-800";
                        } else if (isSelected && !isCorrect) {
                          btnClass += "bg-red-50 border-red-500 text-red-800";
                        } else {
                          btnClass += "bg-white border-stone-200 text-stone-600 opacity-50";
                        }
                      } else {
                        if (isSelected) {
                          btnClass += "bg-orange-50 border-orange-500 text-orange-800 shadow-md";
                        } else {
                          btnClass += "bg-white border-stone-200 text-stone-600 hover:border-orange-300 hover:bg-orange-50/50";
                        }
                      }

                      return (
                        <button
                          key={oIndex}
                          onClick={() => handleAnswerChange(qIndex, oIndex)}
                          disabled={completed}
                          className={btnClass}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt}</span>
                            {showCorrectness && isCorrect && <CheckCircle2 className="text-green-500" size={20} />}
                            {showCorrectness && isSelected && !isCorrect && <XCircle className="text-red-500" size={20} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!completed && quizzes.length > 0 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleCheckAnswers}
                  disabled={!allAnswered}
                  className={`px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-md ${allAnswered
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                    }`}
                >
                  Check Answers
                </button>
              </div>
            )}
          </div>
        )}

        <div className="border-t-4 border-orange-100 pt-8 flex items-center justify-center">
          <button
            onClick={handleComplete}
            disabled={completed || (quizzes.length > 0 && (!showResults || !allCorrect))}
            className={`flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-xl transition-all shadow-lg ${completed
                ? 'bg-green-500 text-white cursor-default'
                : (quizzes.length === 0 || (showResults && allCorrect))
                  ? 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105'
                  : 'bg-stone-100 text-stone-400 border-2 border-stone-200 cursor-not-allowed'
              }`}
          >
            {completed ? <CheckSquare size={32} /> : <Square size={32} />}
            {completed ? 'Lesson Completed!' : 'Mark as Completed'}
          </button>
        </div>
      </div>
    </div>
      <SelectionPopup user={user} contentRef={contentRef} projectTitle={project.title} />
    </>
  );
}
