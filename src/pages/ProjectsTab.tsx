import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, Lock, Unlock, GripVertical, FlaskConical, X, CheckCircle2, Save } from 'lucide-react';
import ProjectEditor from '../components/ProjectEditor';
import { authFetch } from '../App';
import type { Project, Building, ProjectSegment } from '../types';
import { useI18n } from '../i18n';

interface ProjectData {
    buildingId: number;
    title: string;
    description: string;
    scratchFileUrl: string;
    scratchProjectId: string;
    finalScratchFileUrl?: string;
    finalScratchProjectId?: string;
    coverImage: string;
    tags: string[];
    segments: ProjectSegment[];
}

interface EditingProject extends ProjectData {
    id: number;
}

function ProjectEditorModal({ title, formId, onClose, children }: {
    title: string;
    formId: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !document.querySelector('[role="alertdialog"]')) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[9000] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="mx-auto my-3 w-full max-w-6xl sm:my-6">
                <div className="sticky top-3 z-20 mb-3 flex items-center justify-between rounded-2xl bg-stone-800/95 px-4 py-3 text-white shadow-xl backdrop-blur sm:top-6">
                    <h2 className="truncate text-lg font-bold">{title}</h2>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                        <button
                            type="submit"
                            form={formId}
                            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                        >
                            <Save size={18} /> Speichern
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-100"
                        >
                            <X size={18} /> Schließen
                        </button>
                    </div>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}

function SaveConfirmationDialog({ onConfirm }: { onConfirm: () => void }) {
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="project-save-title">
            <div className="w-full max-w-md rounded-3xl border-4 border-green-100 bg-white p-7 text-center shadow-2xl">
                <CheckCircle2 size={52} className="mx-auto mb-4 text-green-500" />
                <h2 id="project-save-title" className="mb-2 text-2xl font-bold text-stone-800">Projekt gespeichert</h2>
                <p className="mb-6 text-stone-600">Das Projekt wurde erfolgreich gespeichert.</p>
                <button
                    type="button"
                    autoFocus
                    onClick={onConfirm}
                    className="w-full rounded-xl bg-green-500 px-5 py-3 font-bold text-white shadow-md transition-colors hover:bg-green-600"
                >
                    OK
                </button>
            </div>
        </div>,
        document.body,
    );
}

export default function ProjectsTab() {
    const { t } = useI18n();
    const [projects, setProjects] = useState<Project[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProject, setEditingProject] = useState<EditingProject | null>(null);
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
    const [newProject, setNewProject] = useState<ProjectData>({
        buildingId: 1,
        title: '',
        description: '',
        scratchFileUrl: '',
        scratchProjectId: '',
        finalScratchFileUrl: '',
        finalScratchProjectId: '',
        coverImage: '',
        tags: [],
        segments: []
    });
    const closeAddForm = useCallback(() => {
        setShowSaveConfirmation(false);
        setShowAddForm(false);
    }, []);
    const closeEditForm = useCallback(() => {
        setShowSaveConfirmation(false);
        setEditingProject(null);
    }, []);

    // Drag & drop state
    const dragSrcId = useRef<number | null>(null);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<number | null>(null);

    useEffect(() => {
        fetchProjects();
        fetchBuildings();
    }, []);

    const fetchProjects = () => {
        authFetch('/api/projects')
            .then(res => res.json())
            .then(data => setProjects(data))
            .catch(err => console.error('Failed to fetch projects:', err));
    };

    const fetchBuildings = () => {
        authFetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                setBuildings(data);
                if (data.length > 0 && newProject.buildingId === 1) {
                    setNewProject(prev => ({ ...prev, buildingId: data[0].id }));
                }
            })
            .catch(err => console.error('Failed to fetch buildings:', err));
    };

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        const response = await authFetch('/api/projects', {
            method: 'POST',
            body: JSON.stringify(newProject)
        });
        if (!response.ok) throw new Error(`Failed to save project (${response.status})`);
        const data = await response.json();
        if (!data.id) throw new Error('Saved project ID is missing');

        setEditingProject({ ...newProject, id: Number(data.id) });
        setShowAddForm(false);
        setNewProject({ buildingId: buildings[0]?.id || 1, title: '', description: '', scratchFileUrl: '', scratchProjectId: '', finalScratchFileUrl: '', finalScratchProjectId: '', coverImage: '', tags: [], segments: [] });
        setShowSaveConfirmation(true);
        fetchProjects();
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject) return;
        const response = await authFetch(`/api/projects/${editingProject.id}`, {
            method: 'PUT',
            body: JSON.stringify(editingProject)
        });
        if (!response.ok) throw new Error(`Failed to update project (${response.status})`);
        setShowSaveConfirmation(true);
        fetchProjects();
    };

    const handleGenerateTestData = async () => {
        const targetBuildingId = buildings[0]?.id || 1;
        const testProject = {
            buildingId: targetBuildingId,
            title: 'Warum Katzen Kartons lieben',
            description: 'Ein Übungsprojekt zum Testen des Systems. Enthält einen Beispielartikel und fünf Quizfragen mit Erklärungen.',
            scratchFileUrl: '',
            scratchProjectId: '10128407',
            coverImage: 'https://picsum.photos/seed/katze/800/400',
            tags: ['Test', 'Beispiel'],
            segments: [
                {
                    title: 'Die geheimnisvolle Welt der Katzen und Kartons',
                    content: `<h2>Einleitung: Ein uraltes Rätsel</h2>
<p>Seit Jahrtausenden beobachten Wissenschaftlerinnen und Wissenschaftler ein seltsames Phänomen: Katzen lieben Kartons. Es spielt keine Rolle, ob der Karton groß oder klein ist, ob er nach Schokolade oder nach Motoröl riecht – eine Katze wird hineinklettern. Dieses Verhalten wurde erstmals im Jahr 1842 vom berühmten Schweizer Zoologen Professor Karl-Heinz Boxenhofer dokumentiert, der seine Katze Murrizel dabei beobachtete, wie sie einen leeren Stiefelkarton bevorzugte statt der brandneuen Samtcouch im Wert von 400 Goldtalern.</p>

<h2>Die Wissenschaft dahinter</h2>
<p>Laut einer Studie der Universität Katzenhausen (2019) fühlen sich Katzen in engen, geschlossenen Räumen sicherer. Der Karton simuliert eine Höhle oder einen Unterschlupf, was den Jagdinstinkt aktiviert. Interessanterweise ist auch die Farbe des Kartons relevant: Katzen bevorzugen braune Kartons zu 78%, grüne zu 14% und rosa Kartons lehnen sie mit einer Wahrscheinlichkeit von 99,7% komplett ab. (Die verbleibenden 0,3% sind statistisch gesehen einfach sehr merkwürdige Katzen.)</p>

<h2>Der Geruch als Hauptfaktor</h2>
<p>Kartons bestehen aus Wellpappe, die einen charakteristischen Geruch hat. Katzen besitzen rund 200 Millionen Riechrezeptoren, verglichen mit nur 5 Millionen beim Menschen. Für eine Katze riecht ein Karton nach einem Abenteuer, nach fremden Ländern, nach dem Lager eines Händlers in der Ferne. Für einen Menschen riecht er nach Karton.</p>

<h2>Praktische Konsequenzen</h2>
<p>Die Erkenntnis, dass Katzen Kartons lieben, hat wichtige gesellschaftliche Auswirkungen. Online-Händler berichten, dass Katzenbesitzerinnen und -besitzer im Durchschnitt 34% mehr bestellen als andere Haushalte – nicht weil sie mehr Dinge brauchen, sondern wegen der Kartons. Die Katze bestimmt somit indirekt das Konsumverhalten von Millionen von Menschen weltweit. Ökonominnen und Ökonomen sprechen vom sogenannten "Miau-Effekt".</p>

<h2>Fazit</h2>
<p>Ob als Höhle, als Jagdrevier oder als Entspannungszone – der Karton ist für die Katze ein Multifunktionsmöbel. Er kostet nichts, macht glücklich und zeigt uns gleichzeitig, dass die besten Dinge im Leben oft die einfachsten sind. Und das nächste Mal, wenn ein Paket geliefert wird, wisst ihr: Das Geschenk darin ist für euch. Der Karton gehört der Katze.</p>`,
                    contentZh: '',
                    contentDe: '',
                    isPublished: true,
                    isLocked: false,
                    orderIndex: 1,
                    quizzes: [
                        {
                            question: 'Wer dokumentierte erstmals das Verhalten von Katzen in Kartons?',
                            options: [
                                'Professor Karl-Heinz Boxenhofer',
                                'Dr. Felix Schnurrbart',
                                'Baroness Hildegard von Pfote',
                                'Sir Reginald Miau III.'
                            ],
                            correctOptionIndices: [0],
                            isMultiSelect: false,
                            explanation: '<p>Laut dem Artikel war es <strong>Professor Karl-Heinz Boxenhofer</strong>, der dieses Phänomen im Jahr 1842 als Erster dokumentierte – nachdem seine Katze Murrizel einen Stiefelkarton einer teuren Samtcouch vorzog.</p>'
                        },
                        {
                            question: 'Wie viele Riechrezeptoren besitzt eine Katze ungefähr?',
                            options: [
                                '5 Millionen',
                                '50 Millionen',
                                '200 Millionen',
                                '1 Milliarde'
                            ],
                            correctOptionIndices: [2],
                            isMultiSelect: false,
                            explanation: '<p>Katzen besitzen rund <strong>200 Millionen Riechrezeptoren</strong> – das sind 40-mal mehr als beim Menschen (5 Millionen). Deshalb ist der Geruch des Kartons für eine Katze ein echtes Erlebnis.</p>'
                        },
                        {
                            question: 'Welche Farbe bevorzugen Katzen bei Kartons laut der Studie aus Katzenhausen?',
                            options: [
                                'Grün (78%)',
                                'Rosa (78%)',
                                'Braun (78%)',
                                'Blau (78%)'
                            ],
                            correctOptionIndices: [2],
                            isMultiSelect: false,
                            explanation: '<p>Laut der Studie der Universität Katzenhausen (2019) bevorzugen Katzen <strong>braune Kartons zu 78%</strong>. Rosa Kartons werden mit einer Wahrscheinlichkeit von 99,7% abgelehnt.</p>'
                        },
                        {
                            question: 'Was beschreibt der Begriff "Miau-Effekt" im Artikel?',
                            options: [
                                'Das Geräusch, das Katzen beim Betreten eines Kartons machen',
                                'Den Einfluss von Katzen auf das Konsumverhalten ihrer Besitzer',
                                'Die Reaktion von Katzen auf laute Musik',
                                'Eine neue Marketingstrategie für Tiernahrung'
                            ],
                            correctOptionIndices: [1],
                            isMultiSelect: false,
                            explanation: '<p>Der <strong>"Miau-Effekt"</strong> beschreibt laut Artikel den indirekten Einfluss der Katze auf das Kaufverhalten: Katzenbesitzerinnen bestellen 34% mehr im Online-Handel – hauptsächlich wegen der Kartons, die die Katzen bekommen.</p>'
                        },
                        {
                            question: 'Welche zwei Gründe nennt der Artikel, warum Katzen Kartons mögen? (Mehrere Antworten möglich)',
                            options: [
                                'Der Karton simuliert eine sichere Höhle',
                                'Katzen mögen den Geschmack von Pappe',
                                'Der Geruch des Kartons wirkt wie ein Abenteuer',
                                'Kartons sind immer warm und beheizt'
                            ],
                            correctOptionIndices: [0, 2],
                            isMultiSelect: true,
                            explanation: '<p>Der Artikel nennt zwei Hauptgründe: Erstens aktiviert der enge Raum den <strong>Jagd- und Sicherheitsinstinkt</strong> (Höhleneffekt). Zweitens hat der charakteristische <strong>Geruch der Wellpappe</strong> eine starke Wirkung auf Katzen mit ihren 200 Millionen Riechrezeptoren.</p>'
                        }
                    ],
                    quizzesZh: [],
                    quizzesDe: []
                }
            ]
        };

        const res = await authFetch('/api/projects', {
            method: 'POST',
            body: JSON.stringify(testProject)
        });
        if (res.ok) {
            fetchProjects();
        }
    };

    const handleDeleteProject = async (id: number) => {
        if (confirm('Are you sure you want to delete this project?')) {
            await authFetch(`/api/projects/${id}`, { method: 'DELETE' });
            fetchProjects();
        }
    };

    const toggleLock = async (id: number, currentLock: boolean | number) => {
        await authFetch(`/api/projects/${id}/lock`, {
            method: 'PUT',
            body: JSON.stringify({ isLocked: !currentLock })
        });
        fetchProjects();
    };

    // ─── Drag & Drop Handlers ─────────────────────────────────────────

    const handleDragStart = (e: React.DragEvent, projectId: number) => {
        dragSrcId.current = projectId;
        setDraggingId(projectId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, projectId: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragSrcId.current !== projectId) {
            setDragOverId(projectId);
        }
    };

    const handleDragLeave = () => {
        setDragOverId(null);
    };

    const handleDrop = (e: React.DragEvent, targetId: number) => {
        e.preventDefault();
        const srcId = dragSrcId.current;
        if (srcId === null || srcId === targetId) return;

        const srcProject = projects.find(p => p.id === srcId);
        const targetProject = projects.find(p => p.id === targetId);

        // Only allow reordering within the same building
        if (!srcProject || !targetProject || srcProject.buildingId !== targetProject.buildingId) {
            setDraggingId(null);
            setDragOverId(null);
            return;
        }

        // Reorder within the building
        const buildingProjects = projects
            .filter(p => p.buildingId === srcProject.buildingId)
            .sort((a, b) => a.orderIndex - b.orderIndex);

        const srcIdx = buildingProjects.findIndex(p => p.id === srcId);
        const targetIdx = buildingProjects.findIndex(p => p.id === targetId);

        const reordered = [...buildingProjects];
        const [moved] = reordered.splice(srcIdx, 1);
        reordered.splice(targetIdx, 0, moved);

        // Assign new orderIndex values (1-based, only for this building)
        const updatedBuildingProjects = reordered.map((p, i) => ({ ...p, orderIndex: i + 1 }));

        // Optimistic update: merge back into full list
        const newProjects = projects.map(p => {
            const updated = updatedBuildingProjects.find(u => u.id === p.id);
            return updated ?? p;
        });
        // Sort by buildingId then orderIndex for consistent display
        newProjects.sort((a, b) => a.buildingId !== b.buildingId
            ? a.buildingId - b.buildingId
            : a.orderIndex - b.orderIndex
        );
        setProjects(newProjects);

        // Persist to server
        const orders = updatedBuildingProjects.map(p => ({ id: p.id, orderIndex: p.orderIndex }));
        authFetch('/api/projects/reorder', {
            method: 'PUT',
            body: JSON.stringify({ orders })
        }).catch(err => {
            console.error('Failed to save order:', err);
            fetchProjects(); // Revert on failure
        });
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverId(null);
        dragSrcId.current = null;
    };

    // ─── Group projects by building for display ────────────────────────

    const projectsByBuilding = buildings.map(building => ({
        building,
        projects: projects.filter(p => p.buildingId === building.id)
    })).filter(group => group.projects.length > 0);

    // Include projects whose building might not yet be loaded
    const groupedBuildingIds = new Set(buildings.map(b => b.id));
    const orphanProjects = projects.filter(p => !groupedBuildingIds.has(p.buildingId));

    return (
        <>
            <div className="flex justify-end gap-3 mb-6">
                <button
                    onClick={handleGenerateTestData}
                    className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-violet-600 transition-colors"
                    title="Erstellt ein vollständiges Beispielprojekt mit Artikel, Bild, Scratch-Link und 5 Quizfragen"
                >
                    <FlaskConical size={20} /> {t.generateTestData}
                </button>
                <button
                    onClick={() => {
                        setEditingProject(null);
                        setShowAddForm(true);
                    }}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-orange-600 transition-colors"
                >
                    <Plus size={20} /> {t.addProject}
                </button>
            </div>

            {showAddForm && (
                <ProjectEditorModal title={t.addProject} formId="project-editor-form" onClose={closeAddForm}>
                    <ProjectEditor
                        buildings={buildings}
                        formId="project-editor-form"
                        title={t.addProject}
                        project={newProject}
                        setProject={setNewProject}
                        onSubmit={handleAddProject}
                        onCancel={closeAddForm}
                    />
                </ProjectEditorModal>
            )}

            {editingProject && (
                <ProjectEditorModal title={t.editProject} formId="project-editor-form" onClose={closeEditForm}>
                    <ProjectEditor
                        buildings={buildings}
                        formId="project-editor-form"
                        title={t.editProject}
                        project={editingProject}
                        setProject={(p) => setEditingProject({ ...p, id: editingProject.id })}
                        onSubmit={handleUpdateProject}
                        onCancel={closeEditForm}
                    />
                </ProjectEditorModal>
            )}

            {showSaveConfirmation && (
                <SaveConfirmationDialog onConfirm={() => setShowSaveConfirmation(false)} />
            )}

            <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-orange-50 text-orange-800 border-b-2 border-orange-100">
                            <th className="p-4 w-8"></th>
                            <th className="p-4 font-bold w-10">{t.order}</th>
                            <th className="p-4 font-bold">{t.building}</th>
                            <th className="p-4 font-bold">{t.title}</th>
                            <th className="p-4 font-bold">{t.status}</th>
                            <th className="p-4 font-bold text-right">{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectsByBuilding.map(({ building, projects: bProjects }) => (
                            <React.Fragment key={building.id}>
                                {/* Building header row */}
                                <tr className="bg-orange-100/60 border-b border-orange-200">
                                    <td colSpan={6} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-700">
                                        🏢 {building.name}
                                    </td>
                                </tr>
                                {bProjects.map((project, index) => {
                                    const isDragging = draggingId === project.id;
                                    const isDragOver = dragOverId === project.id;
                                    return (
                                        <tr
                                            key={project.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, project.id)}
                                            onDragOver={(e) => handleDragOver(e, project.id)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, project.id)}
                                            onDragEnd={handleDragEnd}
                                            className={`border-b border-orange-50 transition-all duration-150 ${
                                                isDragging
                                                    ? 'opacity-40 bg-orange-50'
                                                    : isDragOver
                                                    ? 'bg-orange-100 border-t-2 border-t-orange-400'
                                                    : 'hover:bg-orange-50/50'
                                            }`}
                                        >
                                            {/* Drag handle */}
                                            <td className="pl-3 pr-1 py-4 text-stone-300 cursor-grab active:cursor-grabbing select-none">
                                                <GripVertical size={18} title={t.reorderProject} />
                                            </td>
                                            <td className="p-4 text-stone-500 font-medium">{index + 1}</td>
                                            <td className="p-4 text-stone-600">{project.buildingName}</td>
                                            <td className="p-4 font-bold text-stone-800">{project.title}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {project.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                                    {project.isLocked ? t.locked : t.published}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => toggleLock(project.id, project.isLocked)}
                                                    className={`p-2 rounded-lg transition-colors shadow-sm border ${project.isLocked
                                                            ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                        }`}
                                                    title={project.isLocked ? t.unlockProject : t.lockProject}
                                                >
                                                    {project.isLocked ? <Unlock size={18} /> : <Lock size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingProject({
                                                            id: project.id,
                                                            buildingId: project.buildingId,
                                                            title: project.title,
                                                            description: project.description,
                                                            scratchFileUrl: project.scratchFileUrl,
                                                            scratchProjectId: project.scratchProjectId,
                                                            finalScratchFileUrl: project.finalScratchFileUrl || '',
                                                            finalScratchProjectId: project.finalScratchProjectId || '',
                                                            coverImage: project.coverImage,
                                                            tags: project.tags || [],
                                                            segments: project.segments || [],
                                                        });
                                                        setShowAddForm(false);
                                                    }}
                                                    className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                                                    title={t.editProject}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProject(project.id)}
                                                    className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                                                    title={t.deleteProject}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        {/* Orphan projects (building not in list) */}
                        {orphanProjects.map((project, index) => (
                            <tr key={project.id} className="border-b border-orange-50 hover:bg-orange-50/50 transition-colors">
                                <td className="pl-3 pr-1 py-4 text-stone-200 select-none">
                                    <GripVertical size={18} />
                                </td>
                                <td className="p-4 text-stone-500 font-medium">{index + 1}</td>
                                <td className="p-4 text-stone-600">{project.buildingName}</td>
                                <td className="p-4 font-bold text-stone-800">{project.title}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {project.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                        {project.isLocked ? t.locked : t.published}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => toggleLock(project.id, project.isLocked)} className="p-2 rounded-lg transition-colors shadow-sm border bg-green-50 text-green-600 border-green-200 hover:bg-green-100">
                                        <Unlock size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingProject({ id: project.id, buildingId: project.buildingId, title: project.title, description: project.description, scratchFileUrl: project.scratchFileUrl, scratchProjectId: project.scratchProjectId, finalScratchFileUrl: project.finalScratchFileUrl || '', finalScratchProjectId: project.finalScratchProjectId || '', coverImage: project.coverImage, tags: project.tags || [], segments: project.segments || [] });
                                            setShowAddForm(false);
                                        }}
                                        className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDeleteProject(project.id)} className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {projects.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-stone-400">
                                    {t.noData}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
