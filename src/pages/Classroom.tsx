import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Download, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function Classroom({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        if (data.quizzes) {
          try {
            setQuizzes(typeof data.quizzes === 'string' ? JSON.parse(data.quizzes) : data.quizzes);
          } catch (e) {
            setQuizzes([]);
          }
        }
      });
      
    fetch(`/api/student/projects/${id}/progress/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.state === 'completed') {
          setCompleted(true);
        }
      });
  }, [id, user.id]);

  const handleComplete = async () => {
    await fetch(`/api/student/projects/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    setCompleted(true);
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

  if (!project) return <div className="text-center p-8">Loading classroom...</div>;

  return (
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
            className="text-stone-700 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: project.content }}
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
                    <div className="prose prose-orange max-w-none" dangerouslySetInnerHTML={{ __html: quiz.question }} />
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
                  className={`px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-md ${
                    allAnswered 
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
            className={`flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-xl transition-all shadow-lg ${
              completed 
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
  );
}
