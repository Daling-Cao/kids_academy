import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import { Plus, Trash2 } from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import BlotFormatter from 'quill-blot-formatter';
import TableUp, { TableMenuContextmenu, TableResizeLine, TableSelection } from 'quill-table-up';
import 'quill-table-up/index.css';
import ImageUpload from '../components/ImageUpload';
import type { Building, Quiz, ProjectSegment } from '../types';

// Register font whitelist
const Font = Quill.import('formats/font') as any;
Font.whitelist = ['arial', 'georgia', 'times', 'courier', 'verdana', 'comic'];
Quill.register(Font, true);

// Register font size whitelist
const Size = Quill.import('attributors/style/size') as any;
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'];
Quill.register(Size, true);

// Register modules on the Quill singleton (runs once at module load)
Quill.register('modules/blotFormatter', BlotFormatter);
TableUp.register();
Quill.register({ [`modules/${TableUp.moduleName}`]: TableUp }, true);

let editorSeq = 0;

function HtmlEditor({ value, onChange, style, className }: {
    value: string;
    onChange: (content: string) => void;
    style?: React.CSSProperties;
    className?: string;
}) {
    const quillRef = useRef<ReactQuill>(null);
    const toolbarId = useRef(`ql-tb-${++editorSeq}`).current;
    const triggerRef = useRef<HTMLSpanElement>(null);
    const mdInputRef = useRef<HTMLInputElement>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

    const modules = useMemo(() => ({
        toolbar: { container: `#${toolbarId}` },
        blotFormatter: {},
        [TableUp.moduleName]: {
            modules: [
                { module: TableSelection },
                { module: TableResizeLine },
                { module: TableMenuContextmenu },
            ],
        },
    }), [toolbarId]);

    const openPicker = () => {
        if (triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setPickerPos({ top: r.bottom + 4, left: r.left });
        }
        setShowPicker(v => !v);
    };

    const insertTable = () => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        (quill.getModule(TableUp.moduleName) as any).insertTable(rows, cols);
        setShowPicker(false);
        setRows(3);
        setCols(3);
    };

    const importMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const html = marked.parse(reader.result as string, { async: false }) as string;
            onChange(html);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    useEffect(() => {
        if (!showPicker) return;
        const close = () => setShowPicker(false);
        const t = setTimeout(() => document.addEventListener('click', close), 50);
        return () => { clearTimeout(t); document.removeEventListener('click', close); };
    }, [showPicker]);

    return (
        <div style={{ position: 'relative' }}>
            <div id={toolbarId}>
                <span className="ql-formats">
                    <select className="ql-font" defaultValue="">
                        <option value="" />
                        <option value="arial" />
                        <option value="georgia" />
                        <option value="times" />
                        <option value="courier" />
                        <option value="verdana" />
                        <option value="comic" />
                    </select>
                </span>
                <span className="ql-formats">
                    <select className="ql-size" defaultValue="">
                        <option value="" />
                        <option value="10px" />
                        <option value="12px" />
                        <option value="14px" />
                        <option value="16px" />
                        <option value="18px" />
                        <option value="20px" />
                        <option value="24px" />
                        <option value="28px" />
                        <option value="32px" />
                        <option value="40px" />
                        <option value="48px" />
                    </select>
                </span>
                <span className="ql-formats">
                    <select className="ql-header" defaultValue="">
                        <option value="1" /><option value="2" /><option value="3" /><option value="" />
                    </select>
                </span>
                <span className="ql-formats">
                    <button className="ql-bold" /><button className="ql-italic" />
                    <button className="ql-underline" /><button className="ql-strike" />
                </span>
                <span className="ql-formats">
                    <button className="ql-list" value="ordered" />
                    <button className="ql-list" value="bullet" />
                </span>
                <span className="ql-formats">
                    <button className="ql-link" /><button className="ql-image" />
                </span>
                <span className="ql-formats" ref={triggerRef}>
                    <button
                        type="button"
                        onClick={openPicker}
                        title="Insert Table"
                        style={{ width: 'auto', padding: '2px 6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        ⊞ Table
                    </button>
                </span>
                <span className="ql-formats">
                    <button className="ql-clean" />
                </span>
                <span className="ql-formats">
                    <button
                        type="button"
                        onClick={() => mdInputRef.current?.click()}
                        title="Import Markdown file"
                        style={{ width: 'auto', padding: '2px 6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        ↑ MD
                    </button>
                    <input
                        ref={mdInputRef}
                        type="file"
                        accept=".md,.markdown,text/markdown"
                        style={{ display: 'none' }}
                        onChange={importMarkdown}
                    />
                </span>
            </div>
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                style={style}
                className={className}
            />
            {showPicker && createPortal(
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'fixed', top: pickerPos.top, left: pickerPos.left,
                        zIndex: 9999, background: '#fff',
                        border: '1px solid #e5e7eb', borderRadius: '10px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '13px',
                    }}
                >
                    <span style={{ color: '#6b7280' }}>行</span>
                    <input type="number" value={rows}
                        onChange={e => setRows(Math.max(1, Math.min(20, Number(e.target.value))))}
                        min={1} max={20}
                        style={{ width: '50px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center' }}
                    />
                    <span style={{ color: '#9ca3af' }}>×</span>
                    <span style={{ color: '#6b7280' }}>列</span>
                    <input type="number" value={cols}
                        onChange={e => setCols(Math.max(1, Math.min(20, Number(e.target.value))))}
                        min={1} max={20}
                        style={{ width: '50px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center' }}
                    />
                    <button type="button" onClick={insertTable}
                        style={{ padding: '4px 12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: 600 }}
                    >插入</button>
                    <button type="button" onClick={() => setShowPicker(false)}
                        style={{ padding: '4px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '7px', cursor: 'pointer' }}
                    >✕</button>
                </div>,
                document.body
            )}
        </div>
    );
}

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
    tags?: string[];
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
    const [lang, setLang] = useState<'zh'|'de'>('zh');
    const [tagInput, setTagInput] = useState('');

    const tField = lang === 'zh' ? 'title' : 'titleDe';
    const dField = lang === 'zh' ? 'description' : 'descriptionDe';
    const cField = lang === 'zh' ? 'content' : 'contentDe';
    const qField = lang === 'zh' ? 'quizzes' : 'quizzesDe';

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim();
            const currentTags = project.tags || [];
            if (!currentTags.includes(newTag)) {
                setProject({ ...project, tags: [...currentTags, newTag] });
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setProject({
            ...project,
            tags: (project.tags || []).filter(tag => tag !== tagToRemove)
        });
    };

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
                <button type="button" onClick={() => setLang('zh')} className={`px-4 py-3 flex-1 transition-colors ${lang === 'zh' ? 'text-orange-600 border-b-4 border-orange-500 bg-orange-50/50' : 'hover:bg-stone-50'}`}>中文 (Chinese) - Default</button>
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
                            required={lang === 'zh'}
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
                        required={lang === 'zh'}
                    />
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-stone-600 mb-1">Tags (Press Enter to add)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {(project.tags || []).map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold flex items-center gap-1 shadow-sm">
                                {tag}
                                <button type="button" onClick={() => handleRemoveTag(tag)} className="text-orange-500 hover:text-orange-800 focus:outline-none">
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Type a tag and press Enter"
                        className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
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
                                        <div
                                            className="bg-white rounded-xl border border-stone-300 focus-within:border-orange-400 overflow-hidden"
                                            style={{ resize: 'vertical', overflow: 'auto', minHeight: '200px', height: '320px', maxHeight: '80vh' }}
                                        >
                                            <HtmlEditor
                                                value={seg[cField] || ''}
                                                onChange={(content) => handleUpdateSegment(sIndex, cField, content)}
                                                style={{ height: 'calc(100% - 42px)' }}
                                                className="bg-orange-50/10"
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
                                                    <div className="mb-4">
                                                        <div
                                                            className="bg-stone-50 rounded-xl border border-stone-200 focus-within:border-orange-400 overflow-hidden"
                                                            style={{ resize: 'vertical', overflow: 'auto', minHeight: '120px', height: '180px', maxHeight: '60vh' }}
                                                        >
                                                            <HtmlEditor
                                                                value={quiz.question || ''}
                                                                onChange={(content) => handleUpdateQuiz(sIndex, qIndex, 'question', content)}
                                                                style={{ height: 'calc(100% - 42px)' }}
                                                                className="bg-orange-50/10"
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
