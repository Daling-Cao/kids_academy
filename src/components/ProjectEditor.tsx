import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageUpload from '../components/ImageUpload';
import type { Building, Quiz, ProjectSegment } from '../types';

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
    titleZh?: string;
    titleDe?: string;
    description: string;
    descriptionZh?: string;
    descriptionDe?: string;
    scratchFileUrl: string;
    scratchProjectId: string;
    coverImage: string;
    segments: ProjectSegment[];
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
    const [lang, setLang] = useState<'en'|'zh'|'de'>('en');

    const tField = lang === 'en' ? 'title' : lang === 'zh' ? 'titleZh' : 'titleDe';
    const dField = lang === 'en' ? 'description' : lang === 'zh' ? 'descriptionZh' : 'descriptionDe';
    const cField = lang === 'en' ? 'content' : lang === 'zh' ? 'contentZh' : 'contentDe';
    const qField = lang === 'en' ? 'quizzes' : lang === 'zh' ? 'quizzesZh' : 'quizzesDe';

    const handleAddSegment = () => {
        setProject({
            ...project,
            segments: [...(project.segments || []), { title: `Segment ${(project.segments?.length || 0) + 1}`, content: '', quizzes: [], isPublished: 1, isLocked: 0, orderIndex: (project.segments?.length || 0) + 1 }]
        });
    };

    const handleUpdateSegment = (sIndex: number, field: string, value: any) => {
        const newSegments = [...(project.segments || [])];
        newSegments[sIndex] = { ...newSegments[sIndex], [field]: value };
        setProject({ ...project, segments: newSegments });
    };

    const handleRemoveSegment = (sIndex: number) => {
        const newSegments = [...(project.segments || [])];
        newSegments.splice(sIndex, 1);
        setProject({ ...project, segments: newSegments });
    };

    const handleAddQuiz = (sIndex: number) => {
        const newSegments = [...(project.segments || [])];
        const seg = newSegments[sIndex] as any;
        const quizzes = Array.isArray(seg[qField]) ? seg[qField] : [];
        if (quizzes.length >= 3) return;
        seg[qField] = [...quizzes, { question: '', options: ['', '', '', ''], correctOptionIndex: 0, correctOptionIndices: [0], isMultiSelect: false }];
        newSegments[sIndex] = seg;
        setProject({ ...project, segments: newSegments });
    };

    const handleUpdateQuiz = (sIndex: number, qIndex: number, field: string, value: any) => {
        const newSegments = [...(project.segments || [])];
        const seg = newSegments[sIndex] as any;
        const newQuizzes = [...(Array.isArray(seg[qField]) ? seg[qField] : [])];
        newQuizzes[qIndex] = { ...newQuizzes[qIndex], [field]: value };
        seg[qField] = newQuizzes;
        newSegments[sIndex] = seg;
        setProject({ ...project, segments: newSegments });
    };

    const handleUpdateQuizOption = (sIndex: number, qIndex: number, optionIndex: number, value: string) => {
        const newSegments = [...(project.segments || [])];
        const seg = newSegments[sIndex] as any;
        const newQuizzes = [...(Array.isArray(seg[qField]) ? seg[qField] : [])];
        const newOptions = [...newQuizzes[qIndex].options];
        newOptions[optionIndex] = value;
        newQuizzes[qIndex] = { ...newQuizzes[qIndex], options: newOptions };
        seg[qField] = newQuizzes;
        newSegments[sIndex] = seg;
        setProject({ ...project, segments: newSegments });
    };

    const handleRemoveQuiz = (sIndex: number, qIndex: number) => {
        const newSegments = [...(project.segments || [])];
        const seg = newSegments[sIndex] as any;
        const newQuizzes = [...(Array.isArray(seg[qField]) ? seg[qField] : [])];
        newQuizzes.splice(qIndex, 1);
        seg[qField] = newQuizzes;
        newSegments[sIndex] = seg;
        setProject({ ...project, segments: newSegments });
    };

    const getProjectField = (field: string) => (project as any)[field] || '';

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-orange-100 mb-8">
            <h2 className="text-xl font-bold text-orange-700 mb-4">{title}</h2>
            
            <div className="flex border-b border-orange-200 mb-6 font-bold text-stone-500">
                <button type="button" onClick={() => setLang('en')} className={`px-4 py-3 flex-1 transition-colors ${lang === 'en' ? 'text-orange-600 border-b-4 border-orange-500 bg-orange-50/50' : 'hover:bg-stone-50'}`}>English (Default)</button>
                <button type="button" onClick={() => setLang('zh')} className={`px-4 py-3 flex-1 transition-colors ${lang === 'zh' ? 'text-orange-600 border-b-4 border-orange-500 bg-orange-50/50' : 'hover:bg-stone-50'}`}>中文 (Chinese)</button>
                <button type="button" onClick={() => setLang('de')} className={`px-4 py-3 flex-1 transition-colors ${lang === 'de' ? 'text-orange-600 border-b-4 border-orange-500 bg-orange-50/50' : 'hover:bg-stone-50'}`}>Deutsch (German)</button>
            </div>

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
                        <label className="block text-sm font-medium text-stone-600 mb-1">Title ({lang.toUpperCase()})</label>
                        <input
                            type="text"
                            value={getProjectField(tField)}
                            onChange={(e) => setProject({ ...project, [tField]: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none bg-orange-50/30"
                            required={lang === 'en'}
                        />
                    </div>
                </div>

                <ImageUpload
                    value={project.coverImage}
                    onChange={(url) => setProject({ ...project, coverImage: url })}
                />

                <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">Description ({lang.toUpperCase()})</label>
                    <textarea
                        value={getProjectField(dField)}
                        onChange={(e) => setProject({ ...project, [dField]: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none bg-orange-50/30"
                        rows={2}
                        required={lang === 'en'}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-orange-700">Project Segments</h3>
                        <button
                            type="button"
                            onClick={handleAddSegment}
                            className="flex items-center gap-1 bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-200 transition-colors"
                        >
                            <Plus size={18} /> Add Segment
                        </button>
                    </div>

                    <div className="space-y-12">
                        {(project.segments || []).map((seg: any, sIndex: number) => {
                            const segQuizzes = Array.isArray(seg[qField]) ? seg[qField] : [];
                            return (
                                <div key={sIndex} className="bg-stone-50 p-6 rounded-2xl border-2 border-stone-200 relative shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSegment(sIndex)}
                                        className="absolute top-4 right-4 text-stone-400 hover:text-red-500 bg-white p-2 rounded-lg shadow-sm border border-stone-100"
                                        title="Delete Segment"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-stone-600 mb-1">Segment Title ({lang.toUpperCase()})</label>
                                            <input
                                                type="text"
                                                value={seg[tField] || ''}
                                                onChange={(e) => handleUpdateSegment(sIndex, tField, e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:border-orange-400 focus:outline-none bg-orange-50/30"
                                                placeholder={`Segment ${sIndex + 1}`}
                                            />
                                        </div>
                                        <div className="flex items-center gap-6 mt-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!seg.isPublished}
                                                    onChange={(e) => handleUpdateSegment(sIndex, 'isPublished', e.target.checked ? 1 : 0)}
                                                    className="w-5 h-5 text-orange-500 rounded border-stone-300 focus:ring-orange-500"
                                                />
                                                <span className="font-bold text-stone-700">Is Published</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!seg.isLocked}
                                                    onChange={(e) => handleUpdateSegment(sIndex, 'isLocked', e.target.checked ? 1 : 0)}
                                                    className="w-5 h-5 text-red-500 rounded border-stone-300 focus:ring-red-500"
                                                />
                                                <span className="font-bold text-stone-700">Is Locked</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <label className="block text-sm font-medium text-stone-600 mb-1">Content ({lang.toUpperCase()})</label>
                                        <div className="bg-white rounded-xl border border-stone-300 focus-within:border-orange-400 overflow-hidden">
                                            <ReactQuill
                                                theme="snow"
                                                value={seg[cField] || ''}
                                                onChange={(content) => handleUpdateSegment(sIndex, cField, content)}
                                                modules={QUILL_MODULES}
                                                className="h-64 mb-12 bg-orange-50/10"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-stone-200 pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-lg font-bold text-stone-700">Segment Quizzes ({lang.toUpperCase()}) (Max 3)</h4>
                                            {segQuizzes.length < 3 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddQuiz(sIndex)}
                                                    className="flex items-center gap-1 bg-stone-200 text-stone-700 px-3 py-1 rounded-lg font-bold text-sm hover:bg-stone-300 transition-colors"
                                                >
                                                    <Plus size={16} /> Add Quiz ({lang.toUpperCase()})
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            {segQuizzes.map((quiz: Quiz, qIndex: number) => (
                                                <div key={qIndex} className="bg-white p-5 rounded-xl border border-stone-200 relative shadow-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveQuiz(sIndex, qIndex)}
                                                        className="absolute top-2 right-2 text-stone-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h5 className="font-bold text-stone-700">Question {qIndex + 1}</h5>
                                                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={quiz.isMultiSelect}
                                                                onChange={(e) => {
                                                                    const isMulti = e.target.checked;
                                                                    const nextQuiz = { 
                                                                        ...quiz, 
                                                                        isMultiSelect: isMulti,
                                                                        correctOptionIndices: quiz.correctOptionIndices || [quiz.correctOptionIndex || 0]
                                                                    };
                                                                    handleUpdateQuiz(sIndex, qIndex, 'isMultiSelect', isMulti);
                                                                    handleUpdateQuiz(sIndex, qIndex, 'correctOptionIndices', nextQuiz.correctOptionIndices);
                                                                }}
                                                                className="w-4 h-4 text-orange-500 rounded border-stone-300 focus:ring-orange-500"
                                                            />
                                                            <span className="text-sm font-bold text-stone-600">Multiple Answers</span>
                                                        </label>
                                                    </div>
                                                    <div className="mb-12">
                                                        <div className="bg-stone-50 rounded-xl border border-stone-200 focus-within:border-orange-400 overflow-hidden">
                                                            <ReactQuill
                                                                theme="snow"
                                                                value={quiz.question || ''}
                                                                onChange={(content) => handleUpdateQuiz(sIndex, qIndex, 'question', content)}
                                                                modules={QUILL_MODULES}
                                                                className="h-32 mb-12 bg-orange-50/10"
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
                                                                                if (nextIndices.length === 0) nextIndices = [oIndex];
                                                                            }
                                                                            handleUpdateQuiz(sIndex, qIndex, 'correctOptionIndices', nextIndices);
                                                                        }}
                                                                        className="w-4 h-4 text-orange-500 rounded border-stone-300 focus:ring-orange-500"
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="radio"
                                                                        name={`seg-${sIndex}-quiz-${qIndex}-correct`}
                                                                        checked={(quiz.correctOptionIndex ?? (quiz.correctOptionIndices?.[0] ?? 0)) === oIndex}
                                                                        onChange={() => {
                                                                            handleUpdateQuiz(sIndex, qIndex, 'correctOptionIndex', oIndex);
                                                                            handleUpdateQuiz(sIndex, qIndex, 'correctOptionIndices', [oIndex]);
                                                                        }}
                                                                        className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                                                                    />
                                                                )}
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => handleUpdateQuizOption(sIndex, qIndex, oIndex, e.target.value)}
                                                                    placeholder={`Option ${oIndex + 1}`}
                                                                    className="flex-1 px-3 py-2 rounded-lg border border-stone-200 focus:border-orange-400 focus:outline-none"
                                                                    required
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
