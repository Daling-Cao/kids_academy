import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageUpload from '../components/ImageUpload';
import type { Building, Quiz } from '../types';

const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
    ],
};

interface ProjectData {
    buildingId: number;
    title: string;
    description: string;
    content: string;
    scratchFileUrl: string;
    scratchProjectId: string;
    coverImage: string;
    quizzes: Quiz[];
}

interface ProjectEditorProps {
    project: ProjectData;
    setProject: (project: ProjectData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    title: string;
    buildings: Building[];
}

export default function ProjectEditor({ project, setProject, onSubmit, onCancel, title, buildings }: ProjectEditorProps) {
    const handleAddQuiz = () => {
        if ((project.quizzes || []).length >= 3) return;
        setProject({
            ...project,
            quizzes: [...(project.quizzes || []), { question: '', options: ['', '', '', ''], correctOptionIndex: 0, correctOptionIndices: [0], isMultiSelect: false }]
        });
    };

    const handleUpdateQuiz = (index: number, field: string, value: string | number | number[]) => {
        const newQuizzes = [...(project.quizzes || [])];
        newQuizzes[index] = { ...newQuizzes[index], [field]: value };
        setProject({ ...project, quizzes: newQuizzes });
    };

    const handleUpdateQuizOption = (quizIndex: number, optionIndex: number, value: string) => {
        const newQuizzes = [...(project.quizzes || [])];
        const newOptions = [...newQuizzes[quizIndex].options];
        newOptions[optionIndex] = value;
        newQuizzes[quizIndex] = { ...newQuizzes[quizIndex], options: newOptions };
        setProject({ ...project, quizzes: newQuizzes });
    };

    const handleRemoveQuiz = (index: number) => {
        const newQuizzes = [...(project.quizzes || [])];
        newQuizzes.splice(index, 1);
        setProject({ ...project, quizzes: newQuizzes });
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-orange-100 mb-8">
            <h2 className="text-xl font-bold text-orange-700 mb-4">{title}</h2>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-1">Building</label>
                        <select
                            value={project.buildingId}
                            onChange={(e) => setProject({ ...project, buildingId: Number(e.target.value) })}
                            className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none bg-white"
                            required
                        >
                            {buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-1">Title</label>
                        <input
                            type="text"
                            value={project.title}
                            onChange={(e) => setProject({ ...project, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                            required
                        />
                    </div>
                </div>

                <ImageUpload
                    value={project.coverImage}
                    onChange={(url) => setProject({ ...project, coverImage: url })}
                />

                <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                    <textarea
                        value={project.description}
                        onChange={(e) => setProject({ ...project, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                        rows={2}
                    />
                </div>
                <div className="mb-12">
                    <label className="block text-sm font-medium text-stone-600 mb-1">Lesson Content</label>
                    <div className="bg-white rounded-xl border-2 border-orange-100 focus-within:border-orange-400 overflow-hidden">
                        <ReactQuill
                            theme="snow"
                            value={project.content}
                            onChange={(content) => setProject({ ...project, content })}
                            modules={QUILL_MODULES}
                            className="h-64 mb-12"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-1">Scratch File (.sb3) URL</label>
                        <input
                            type="text"
                            value={project.scratchFileUrl}
                            onChange={(e) => setProject({ ...project, scratchFileUrl: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                            placeholder="https://example.com/project.sb3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-1">Scratch Project ID (for embed)</label>
                        <input
                            type="text"
                            value={project.scratchProjectId}
                            onChange={(e) => setProject({ ...project, scratchProjectId: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                            placeholder="e.g. 10128407"
                        />
                    </div>
                </div>

                <div className="mt-8 border-t-2 border-orange-100 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-orange-700">Quizzes (Max 3)</h3>
                        {(project.quizzes || []).length < 3 && (
                            <button
                                type="button"
                                onClick={handleAddQuiz}
                                className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-bold text-sm hover:bg-orange-200"
                            >
                                <Plus size={16} /> Add Quiz
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {(project.quizzes || []).map((quiz: Quiz, qIndex: number) => (
                            <div key={qIndex} className="bg-orange-50 p-4 rounded-xl border border-orange-200 relative">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveQuiz(qIndex)}
                                    className="absolute top-2 right-2 text-stone-400 hover:text-red-500"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <div className="flex items-center justify-between mt-4 mb-2">
                                    <h4 className="font-bold text-stone-700">Question {qIndex + 1}</h4>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={quiz.isMultiSelect}
                                            onChange={(e) => {
                                                const isMulti = e.target.checked;
                                                const newQuizzes = [...(project.quizzes || [])];
                                                newQuizzes[qIndex] = { 
                                                    ...newQuizzes[qIndex], 
                                                    isMultiSelect: isMulti,
                                                    // Initialize indices if switching to multi
                                                    correctOptionIndices: newQuizzes[qIndex].correctOptionIndices || [newQuizzes[qIndex].correctOptionIndex || 0]
                                                };
                                                setProject({ ...project, quizzes: newQuizzes });
                                            }}
                                            className="w-4 h-4 text-orange-500 rounded border-orange-200 focus:ring-orange-500"
                                        />
                                        <span className="text-sm font-bold text-stone-600">Multiple Answers</span>
                                    </label>
                                </div>
                                <div className="mb-12">
                                    <div className="bg-white rounded-xl border border-orange-200 focus-within:border-orange-400 overflow-hidden">
                                        <ReactQuill
                                            theme="snow"
                                            value={quiz.question}
                                            onChange={(content) => handleUpdateQuiz(qIndex, 'question', content)}
                                            modules={QUILL_MODULES}
                                            className="h-32 mb-12"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                    {quiz.options.map((opt: string, oIndex: number) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                            {quiz.isMultiSelect ? (
                                                <input
                                                    type="checkbox"
                                                    checked={(quiz.correctOptionIndices || [quiz.correctOptionIndex || 0]).includes(oIndex)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        const currentIndices = quiz.correctOptionIndices || [quiz.correctOptionIndex || 0];
                                                        let nextIndices;
                                                        if (checked) {
                                                            nextIndices = [...currentIndices, oIndex];
                                                        } else {
                                                            nextIndices = currentIndices.filter(i => i !== oIndex);
                                                            if (nextIndices.length === 0) nextIndices = [oIndex]; // Keep at least one
                                                        }
                                                        handleUpdateQuiz(qIndex, 'correctOptionIndices', nextIndices);
                                                    }}
                                                    className="w-4 h-4 text-orange-500 rounded border-orange-200 focus:ring-orange-500"
                                                />
                                            ) : (
                                                <input
                                                    type="radio"
                                                    name={`quiz-${qIndex}-correct`}
                                                    checked={(quiz.correctOptionIndex ?? (quiz.correctOptionIndices?.[0] ?? 0)) === oIndex}
                                                    onChange={() => {
                                                        handleUpdateQuiz(qIndex, 'correctOptionIndex', oIndex);
                                                        handleUpdateQuiz(qIndex, 'correctOptionIndices', [oIndex]);
                                                    }}
                                                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                                                />
                                            )}
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => handleUpdateQuizOption(qIndex, oIndex, e.target.value)}
                                                placeholder={`Option ${oIndex + 1}`}
                                                className="flex-1 px-3 py-2 rounded-lg border border-orange-200 focus:border-orange-400 focus:outline-none"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-md"
                    >
                        Save Project
                    </button>
                </div>
            </form>
        </div>
    );
}
