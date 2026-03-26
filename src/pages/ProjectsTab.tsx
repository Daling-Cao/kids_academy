import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Lock, Unlock } from 'lucide-react';
import ProjectEditor from '../components/ProjectEditor';
import { authFetch } from '../App';
import type { Project, Building, Quiz, ProjectSegment } from '../types';

interface ProjectData {
    buildingId: number;
    title: string;
    description: string;
    scratchFileUrl: string;
    scratchProjectId: string;
    coverImage: string;
    segments: ProjectSegment[];
}

interface EditingProject extends ProjectData {
    id: number;
}

export default function ProjectsTab() {
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
        segments: []
    });

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
        setNewProject({ buildingId: buildings[0]?.id || 1, title: '', description: '', scratchFileUrl: '', scratchProjectId: '', coverImage: '', segments: [] });
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

    return (
        <>
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-orange-600 transition-colors"
                >
                    <Plus size={20} /> Add New Project
                </button>
            </div>

            {showAddForm && (
                <ProjectEditor
                    buildings={buildings}
                    title="Create New Project"
                    project={newProject}
                    setProject={setNewProject}
                    onSubmit={handleAddProject}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {editingProject && (
                <ProjectEditor
                    buildings={buildings}
                    title="Edit Project"
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
                            <th className="p-4 font-bold">Order</th>
                            <th className="p-4 font-bold">Building</th>
                            <th className="p-4 font-bold">Title</th>
                            <th className="p-4 font-bold">Status</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((project, index) => (
                            <tr key={project.id} className="border-b border-orange-50 hover:bg-orange-50/50 transition-colors">
                                <td className="p-4 text-stone-500 font-medium">{index + 1}</td>
                                <td className="p-4 text-stone-600">{project.buildingName}</td>
                                <td className="p-4 font-bold text-stone-800">{project.title}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {project.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                        {project.isLocked ? 'Locked' : 'Published'}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => toggleLock(project.id, project.isLocked)}
                                        className={`p-2 rounded-lg transition-colors shadow-sm border ${project.isLocked
                                                ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                            }`}
                                        title={project.isLocked ? "Unlock Project" : "Lock Project"}
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
                                                segments: project.segments || [],
                                            });
                                            setShowAddForm(false);
                                        }}
                                        className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                                        title="Edit Project"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProject(project.id)}
                                        className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {projects.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-stone-400">
                                    No projects found. Add one to get started!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
