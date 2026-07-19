import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import { ChevronDown, Eye, Plus, Trash2 } from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import BlotFormatter from 'quill-blot-formatter';
import TableUp, { TableMenuContextmenu, TableResizeLine, TableSelection } from 'quill-table-up';
import 'quill-table-up/index.css';
import ImageUpload from '../components/ImageUpload';
import ProjectPreview from './ProjectPreview';
import { authFetch } from '../App';
import { uploadFile } from '../lib/upload';
import type { Building, Quiz, ProjectSegment, Widget } from '../types';

// react-quill-new's published props omit React's ref attribute even though the
// component forwards the editor instance at runtime.
const QuillEditor = ReactQuill as any;

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
    const widgetTriggerRef = useRef<HTMLSpanElement>(null);
    const mdInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [mdChoices, setMdChoices] = useState<{ mds: File[]; all: File[] } | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
    const [showWidgetPicker, setShowWidgetPicker] = useState(false);
    const [widgetPickerPos, setWidgetPickerPos] = useState({ top: 0, left: 0 });
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [widgetsLoading, setWidgetsLoading] = useState(false);

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

    const openWidgetPicker = () => {
        if (widgetTriggerRef.current) {
            const r = widgetTriggerRef.current.getBoundingClientRect();
            setWidgetPickerPos({ top: r.bottom + 4, left: r.left });
        }
        if (!showWidgetPicker) {
            setWidgetsLoading(true);
            authFetch('/api/widgets').then(r => r.json()).then(data => {
                setWidgets(data);
                setWidgetsLoading(false);
            }).catch(() => setWidgetsLoading(false));
        }
        setShowWidgetPicker(v => !v);
    };

    const insertWidget = (widget: Widget) => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        const range = quill.getSelection(true);
        const label = `🔧 ${widget.name}`;
        // Use Quill's native link format — only href survives clipboard sanitization.
        // We encode the widget ID into the href (/widget-open/:id) so the classroom
        // click handler can recover it without needing custom data-* attributes.
        quill.insertText(range.index, label, 'link', `/widget-open/${widget.id}`);
        quill.setSelection(range.index + label.length);
        setShowWidgetPicker(false);
    };

    const isImageFile = (f: File) =>
        f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(f.name);

    // Import a Markdown note plus any images it references, rewriting local image
    // references — both standard ![alt](file.png) and Obsidian embeds
    // ![[file.png]] / ![[file.png|size]] — to their uploaded URLs. `allFiles` may
    // include images from a sibling attachments subfolder (folder import), since
    // images are matched by basename.
    const runImport = async (mdFile: File, allFiles: File[]) => {
        const imageFiles = allFiles.filter(isImageFile);

        setImporting(true);
        setImportProgress({ done: 0, total: imageFiles.length });
        try {
            // Upload each image, keyed by its filename (basename) for lookup.
            const urlByName: Record<string, string> = {};
            for (let i = 0; i < imageFiles.length; i++) {
                const img = imageFiles[i];
                try {
                    const data = await uploadFile(img);
                    if (data.success && data.url) urlByName[img.name] = data.url;
                } catch {
                    // Skip failed uploads; the original reference is left untouched.
                }
                setImportProgress({ done: i + 1, total: imageFiles.length });
            }

            const resolveUrl = (ref: string): string | undefined => {
                const trimmed = ref.trim();
                const basename = trimmed.split(/[\\/]/).pop() || trimmed;
                return urlByName[trimmed]
                    || urlByName[basename]
                    || urlByName[decodeURIComponent(basename)];
            };

            let md = await mdFile.text();
            // Obsidian wikilink embeds: ![[file.png]] or ![[file.png|alt-or-size]]
            md = md.replace(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (m, fname) => {
                const url = resolveUrl(fname);
                return url ? `![](${url})` : m;
            });
            // Standard markdown images with local paths: ![alt](path/file.png)
            md = md.replace(/!\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, alt, src, titlePart) => {
                if (/^(https?:|data:|\/)/i.test(src)) return m; // keep remote/absolute as-is
                const url = resolveUrl(src);
                return url ? `![${alt}](${url}${titlePart || ''})` : m;
            });

            const html = marked.parse(md, { async: false }) as string;
            onChange(html);
        } finally {
            setImporting(false);
            setImportProgress(null);
        }
    };

    // Shared handler for both the multi-file picker and the folder picker.
    // A folder may contain several notes, so let the teacher pick which one.
    const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = e.target.files ? Array.from(e.target.files) : [];
        e.target.value = '';
        if (files.length === 0) return;

        const mds = files.filter(f => /\.(md|markdown)$/i.test(f.name));
        if (mds.length === 0) {
            alert('Keine Markdown-Datei (.md) gefunden.');
            return;
        }
        if (mds.length === 1) {
            await runImport(mds[0], files);
        } else {
            setMdChoices({ mds, all: files });
        }
    };

    useEffect(() => {
        if (!showPicker) return;
        const close = () => setShowPicker(false);
        const t = setTimeout(() => document.addEventListener('click', close), 50);
        return () => { clearTimeout(t); document.removeEventListener('click', close); };
    }, [showPicker]);

    useEffect(() => {
        if (!showWidgetPicker) return;
        const close = () => setShowWidgetPicker(false);
        const t = setTimeout(() => document.addEventListener('click', close), 50);
        return () => { clearTimeout(t); document.removeEventListener('click', close); };
    }, [showWidgetPicker]);

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
                        disabled={importing}
                        title="Markdown-Datei + Bilder importieren (mehrere Dateien auswählbar)"
                        style={{ width: 'auto', padding: '2px 6px', fontSize: '12px', fontWeight: 600, cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.6 : 1 }}
                    >
                        {importing ? '…' : '↑ MD'}
                    </button>
                    <input
                        ref={mdInputRef}
                        type="file"
                        multiple
                        accept=".md,.markdown,text/markdown,image/*"
                        style={{ display: 'none' }}
                        onChange={handleImportFiles}
                    />
                    <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        disabled={importing}
                        title="Ganzen Ordner importieren — Notiz samt Bildern aus Unterordnern (z. B. attachments)"
                        style={{ width: 'auto', padding: '2px 6px', fontSize: '12px', fontWeight: 600, cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.6 : 1 }}
                    >
                        {importing ? '…' : '📁 Ordner'}
                    </button>
                    <input
                        ref={folderInputRef}
                        type="file"
                        {...({ webkitdirectory: '', directory: '' } as any)}
                        style={{ display: 'none' }}
                        onChange={handleImportFiles}
                    />
                    {importProgress && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#9a3412', marginLeft: '4px' }}>
                            {importProgress.total > 0
                                ? `Bilder ${importProgress.done}/${importProgress.total}`
                                : 'Importiere…'}
                        </span>
                    )}
                </span>
                <span className="ql-formats" ref={widgetTriggerRef}>
                    <button
                        type="button"
                        onClick={openWidgetPicker}
                        title="Werkzeug einfügen"
                        style={{ width: 'auto', padding: '2px 6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🔧 Widget
                    </button>
                </span>
            </div>
            <QuillEditor
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
                    <span style={{ color: '#6b7280' }}>Zeilen</span>
                    <input type="number" value={rows}
                        onChange={e => setRows(Math.max(1, Math.min(20, Number(e.target.value))))}
                        min={1} max={20}
                        style={{ width: '50px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center' }}
                    />
                    <span style={{ color: '#9ca3af' }}>×</span>
                    <span style={{ color: '#6b7280' }}>Spalten</span>
                    <input type="number" value={cols}
                        onChange={e => setCols(Math.max(1, Math.min(20, Number(e.target.value))))}
                        min={1} max={20}
                        style={{ width: '50px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center' }}
                    />
                    <button type="button" onClick={insertTable}
                        style={{ padding: '4px 12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: 600 }}
                    >Einfügen</button>
                    <button type="button" onClick={() => setShowPicker(false)}
                        style={{ padding: '4px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '7px', cursor: 'pointer' }}
                    >✕</button>
                </div>,
                document.body
            )}
            {mdChoices && createPortal(
                <div
                    onClick={() => setMdChoices(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 10000,
                        background: 'rgba(0,0,0,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: '14px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            padding: '18px', width: '420px', maxWidth: '90vw',
                            fontSize: '13px',
                        }}
                    >
                        <div style={{ fontWeight: 700, color: '#9a3412', marginBottom: '4px' }}>📁 Welche Notiz importieren?</div>
                        <div style={{ color: '#78716c', marginBottom: '10px' }}>Der Ordner enthält mehrere Markdown-Dateien. Bilder werden aus dem gesamten Ordner übernommen.</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '320px', overflowY: 'auto' }}>
                            {mdChoices.mds.map((f, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        const all = mdChoices.all;
                                        setMdChoices(null);
                                        runImport(f, all);
                                    }}
                                    style={{
                                        textAlign: 'left', padding: '8px 10px',
                                        background: '#fff7ed', border: '1px solid #fed7aa',
                                        borderRadius: '8px', cursor: 'pointer',
                                        fontWeight: 600, color: '#9a3412',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}
                                >
                                    📄 {(f as any).webkitRelativePath || f.name}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => setMdChoices(null)}
                            style={{ marginTop: '12px', padding: '6px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '7px', cursor: 'pointer', width: '100%' }}
                        >✕ Abbrechen</button>
                    </div>
                </div>,
                document.body
            )}
            {showWidgetPicker && createPortal(
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'fixed', top: widgetPickerPos.top, left: widgetPickerPos.left,
                        zIndex: 9999, background: '#fff',
                        border: '1px solid #e5e7eb', borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        padding: '12px',
                        minWidth: '220px', maxWidth: '320px',
                        fontSize: '13px',
                    }}
                >
                    <div style={{ fontWeight: 700, color: '#9a3412', marginBottom: '8px' }}>🔧 Werkzeug einfügen</div>
                    {widgetsLoading ? (
                        <div style={{ color: '#9ca3af', padding: '8px 0' }}>Wird geladen…</div>
                    ) : widgets.length === 0 ? (
                        <div style={{ color: '#9ca3af', padding: '8px 0' }}>Keine Werkzeuge vorhanden.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
                            {widgets.map(w => (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => insertWidget(w)}
                                    style={{
                                        textAlign: 'left', padding: '8px 10px',
                                        background: '#fff7ed', border: '1px solid #fed7aa',
                                        borderRadius: '8px', cursor: 'pointer',
                                        fontWeight: 600, color: '#9a3412',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}
                                >
                                    🔧 {w.name}
                                    {w.description && <div style={{ fontWeight: 400, color: '#78716c', fontSize: '11px', marginTop: '2px' }}>{w.description}</div>}
                                </button>
                            ))}
                        </div>
                    )}
                    <button type="button" onClick={() => setShowWidgetPicker(false)}
                        style={{ marginTop: '8px', padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '7px', cursor: 'pointer', width: '100%' }}
                    >✕ Schließen</button>
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
    finalScratchFileUrl?: string;
    finalScratchProjectId?: string;
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
    formId: string;
}

function CollapsibleSection({ id, title, description, isOpen, onToggle, children }: {
    id: string;
    title: string;
    description: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border-2 border-orange-100 bg-white shadow-sm">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-controls={id}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-orange-50"
            >
                <span>
                    <span className="block text-lg font-bold text-stone-800">{title}</span>
                    {isOpen ? <span className="mt-0.5 block text-sm text-stone-500">{description}</span> : null}
                </span>
                <ChevronDown
                    size={22}
                    className={`shrink-0 text-orange-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen ? <div id={id} className="border-t border-orange-100 p-5">{children}</div> : null}
        </section>
    );
}

export default function ProjectEditor({ project, setProject, onSubmit, onCancel, title, buildings, formId }: ProjectEditorProps) {
    const [tagInput, setTagInput] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [openSections, setOpenSections] = useState({ details: true, content: false, questions: false });

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(current => ({ ...current, [section]: !current[section] }));
    };

    // Single-language app (German). Content is stored in the base columns.
    const tField = 'title';
    const dField = 'description';
    const cField = 'content';
    const qField = 'quizzes';

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
        if (quizzes.length >= 5) return;
        seg[qField] = [...quizzes, {
            question: '',
            questionImage: '',
            options: ['', '', '', ''],
            optionImages: ['', '', '', ''],
            correctOptionIndex: 0,
            correctOptionIndices: [0],
            isMultiSelect: false,
        }];
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

    const handleUpdateQuizOptionImage = (sIndex: number, qIndex: number, optionIndex: number, value: string) => {
        const newSegments = [...(project.segments || [])];
        const seg = newSegments[sIndex] as any;
        const newQuizzes = [...(Array.isArray(seg[qField]) ? seg[qField] : [])];
        const newOptionImages = [...(newQuizzes[qIndex].optionImages || [])];
        newOptionImages[optionIndex] = value;
        newQuizzes[qIndex] = { ...newQuizzes[qIndex], optionImages: newOptionImages };
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

    const handleEditorSubmit = (event: React.FormEvent) => {
        const detailsInvalid = !project.title.trim() || !project.description.trim();
        const questionsInvalid = (project.segments || []).some((segment: any) => {
            const quizzes = Array.isArray(segment[qField]) ? segment[qField] : [];
            return quizzes.some((quiz: Quiz) => quiz.options.some((option, index) => (
                !option.trim() && !quiz.optionImages?.[index]
            )));
        });

        if (detailsInvalid || questionsInvalid) {
            event.preventDefault();
            setOpenSections(current => ({
                ...current,
                details: detailsInvalid ? true : current.details,
                questions: questionsInvalid ? true : current.questions,
            }));
            window.setTimeout(() => {
                (document.getElementById(formId) as HTMLFormElement | null)?.reportValidity();
            }, 0);
            return;
        }

        onSubmit(event);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-orange-100 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-orange-700">{title}</h2>
                <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
                    title="Vorschau der Schüleransicht"
                >
                    <Eye size={18} /> Vorschau
                </button>
            </div>

            {showPreview && (
                <ProjectPreview project={project} onClose={() => setShowPreview(false)} />
            )}

            <form id={formId} onSubmit={handleEditorSubmit} className="space-y-4">
                <CollapsibleSection
                    id="project-details-section"
                    title="Allgemeine Informationen"
                    description="Gebäude, Titel, Beschreibung, Bilder, Tags und Scratch-Projekt"
                    isOpen={openSections.details}
                    onToggle={() => toggleSection('details')}
                >
                <div className="space-y-4">
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
                            value={getProjectField(tField)}
                            onChange={(e) => setProject({ ...project, [tField]: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none bg-orange-50/30"
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
                        value={getProjectField(dField)}
                        onChange={(e) => setProject({ ...project, [dField]: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none bg-orange-50/30"
                        rows={2}
                        required
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

                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-100">
                    <p className="text-sm font-bold text-emerald-800 mb-1">🏁 Fertiges Projekt (erst nach Abschluss sichtbar)</p>
                    <p className="text-xs text-emerald-700 mb-3">Die Schüler sehen zuerst nur die Übungs-/Mitmach-Version. Diese fertige Lösung wird erst angezeigt, wenn die Lektion abgeschlossen ist.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Finale Scratch-Datei (.sb3) URL</label>
                            <input
                                type="text"
                                value={project.finalScratchFileUrl || ''}
                                onChange={(e) => setProject({ ...project, finalScratchFileUrl: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border-2 border-emerald-100 focus:border-emerald-400 focus:outline-none"
                                placeholder="https://example.com/final.sb3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Finale Scratch Project ID (Embed)</label>
                            <input
                                type="text"
                                value={project.finalScratchProjectId || ''}
                                onChange={(e) => setProject({ ...project, finalScratchProjectId: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border-2 border-emerald-100 focus:border-emerald-400 focus:outline-none"
                                placeholder="e.g. 10128407"
                            />
                        </div>
                    </div>
                </div>

                </div>
                </CollapsibleSection>

                <CollapsibleSection
                    id="project-content-section"
                    title="Artikelinhalt"
                    description="Abschnitte und Lerninhalt des Projekts"
                    isOpen={openSections.content}
                    onToggle={() => toggleSection('content')}
                >
                <div>
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
                                            <label className="block text-sm font-medium text-stone-600 mb-1">Segment Title</label>
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
                                        <label className="block text-sm font-medium text-stone-600 mb-1">Content</label>
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
                                </div>
                            );
                        })}
                    </div>
                </div>
                </CollapsibleSection>

                <CollapsibleSection
                    id="project-questions-section"
                    title="Fragen"
                    description="Quizfragen und Antworten für alle Abschnitte"
                    isOpen={openSections.questions}
                    onToggle={() => toggleSection('questions')}
                >
                    {(project.segments || []).length === 0 ? (
                        <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
                            Erstelle zuerst im Modul „Artikelinhalt“ einen Abschnitt.
                        </p>
                    ) : (
                    <div className="space-y-6">
                        {(project.segments || []).map((seg: any, sIndex: number) => {
                            const segQuizzes = Array.isArray(seg[qField]) ? seg[qField] : [];
                            return (
                                <div key={sIndex} className="rounded-2xl border-2 border-stone-200 bg-stone-50 p-5 shadow-sm">
                                    <div className="border-stone-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Abschnitt {sIndex + 1}</p>
                                                <h4 className="text-lg font-bold text-stone-700">{seg[tField] || `Segment ${sIndex + 1}`}</h4>
                                            </div>
                                            {segQuizzes.length < 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddQuiz(sIndex)}
                                                    className="flex items-center gap-1 bg-stone-200 text-stone-700 px-3 py-1 rounded-lg font-bold text-sm hover:bg-stone-300 transition-colors"
                                                >
                                                    <Plus size={16} /> Add Quiz
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
                                                        <div className="mt-3">
                                                            <ImageUpload
                                                                label="Fragebild (optional)"
                                                                value={quiz.questionImage || ''}
                                                                onChange={(url) => handleUpdateQuiz(sIndex, qIndex, 'questionImage', url)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                        {quiz.options.map((opt: string, oIndex: number) => (
                                                            <div key={oIndex} className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                                                                <div className="flex items-center gap-2">
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
                                                                        placeholder={`Antwort ${oIndex + 1} (Text optional bei Bild)`}
                                                                        className="flex-1 px-3 py-2 rounded-lg border border-stone-200 focus:border-orange-400 focus:outline-none bg-white"
                                                                        required={!quiz.optionImages?.[oIndex]}
                                                                    />
                                                                </div>
                                                                <div className="mt-3 pl-6">
                                                                    <ImageUpload
                                                                        label={`Antwortbild ${oIndex + 1} (optional)`}
                                                                        value={quiz.optionImages?.[oIndex] || ''}
                                                                        onChange={(url) => handleUpdateQuizOptionImage(sIndex, qIndex, oIndex, url)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-bold text-stone-600 mb-1">Explanation (optional — shown to students after they answer correctly)</label>
                                                        <div
                                                            className="bg-stone-50 rounded-xl border border-stone-200 focus-within:border-orange-400 overflow-hidden"
                                                            style={{ resize: 'vertical', overflow: 'auto', minHeight: '100px', height: '140px', maxHeight: '40vh' }}
                                                        >
                                                            <HtmlEditor
                                                                value={quiz.explanation || ''}
                                                                onChange={(content) => handleUpdateQuiz(sIndex, qIndex, 'explanation', content)}
                                                                style={{ height: 'calc(100% - 42px)' }}
                                                                className="bg-orange-50/10"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    )}
                </CollapsibleSection>

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
