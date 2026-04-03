import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Lock, Unlock, GripVertical } from 'lucide-react';
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
    coverImage: string;
    tags: string[];
    segments: ProjectSegment[];
}

interface EditingProject extends ProjectData {
    id: number;
}

export default function ProjectsTab() {
    const { t } = useI18n();
    const [projects, setProjects] = useState<Project[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProject, setEditingProject] = useState<EditingProject | null>(null);
    const [newProject, setNewProject] = useState<ProjectData>({
        buildingId: 1,
        title: '',
        description: '',
        scratchFileUrl: '',
        scratchProjectId: '',
        coverImage: '',
        tags: [],
        segments: []
    });

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
        await authFetch('/api/projects', {
            method: 'POST',
            body: JSON.stringify(newProject)
        });
        setShowAddForm(false);
        setNewProject({ buildingId: buildings[0]?.id || 1, title: '', description: '', scratchFileUrl: '', scratchProjectId: '', coverImage: '', tags: [], segments: [] });
        fetchProjects();
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject) return;
        await authFetch(`/api/projects/${editingProject.id}`, {
            method: 'PUT',
            body: JSON.stringify(editingProject)
        });
        setEditingProject(null);
        fetchProjects();
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
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-orange-600 transition-colors"
                >
                    <Plus size={20} /> {t.addProject}
                </button>
            </div>

            {showAddForm && (
                <ProjectEditor
                    buildings={buildings}
                    title={t.addProject}
                    project={newProject}
                    setProject={setNewProject}
                    onSubmit={handleAddProject}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {editingProject && (
                <ProjectEditor
                    buildings={buildings}
                    title={t.editProject}
                    project={editingProject}
                    setProject={(p) => setEditingProject({ ...p, id: editingProject.id })}
                    onSubmit={handleUpdateProject}
                    onCancel={() => setEditingProject(null)}
                />
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
                                            setEditingProject({ id: project.id, buildingId: project.buildingId, title: project.title, description: project.description, scratchFileUrl: project.scratchFileUrl, scratchProjectId: project.scratchProjectId, coverImage: project.coverImage, tags: project.tags || [], segments: project.segments || [] });
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
