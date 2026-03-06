import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Lock, Unlock, Building2, BookOpen, Save, X, Users, CheckCircle, Circle, PlayCircle, Eye, EyeOff } from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import BlotFormatter from 'quill-blot-formatter';

Quill.register('modules/blotFormatter', BlotFormatter);

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<'projects' | 'buildings' | 'students'>('projects');
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddBuildingForm, setShowAddBuildingForm] = useState(false);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedStudentProgress, setSelectedStudentProgress] = useState<any>(null);
  const [studentProgressData, setStudentProgressData] = useState<any[]>([]);
  const [studentBuildingsData, setStudentBuildingsData] = useState<any[]>([]);
  
  const [newProject, setNewProject] = useState({
    buildingId: 1,
    title: '',
    description: '',
    content: '',
    scratchFileUrl: '',
    scratchProjectId: '',
    coverImage: '',
    quizzes: [] as any[]
  });

  const [newBuilding, setNewBuilding] = useState({
    name: '',
    description: '',
    coverImage: ''
  });

  const [newStudent, setNewStudent] = useState({
    username: '',
    password: ''
  });

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
    blotFormatter: {}
  }), []);

  useEffect(() => {
    fetchProjects();
    fetchBuildings();
    fetchStudents();
  }, []);

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data));
  };

  const fetchBuildings = () => {
    fetch('/api/buildings')
      .then(res => res.json())
      .then(data => {
        setBuildings(data);
        if (data.length > 0 && !newProject.buildingId) {
          setNewProject(prev => ({ ...prev, buildingId: data[0].id }));
        }
      });
  };

  const fetchStudents = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setStudents(data));
  };

  const fetchStudentProgress = (studentId: number) => {
    fetch(`/api/users/${studentId}/progress`)
      .then(res => res.json())
      .then(data => setStudentProgressData(data));
  };

  const fetchStudentBuildings = (studentId: number) => {
    fetch(`/api/users/${studentId}/buildings`)
      .then(res => res.json())
      .then(data => setStudentBuildingsData(data));
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject)
    });
    setShowAddForm(false);
    setNewProject({ buildingId: buildings[0]?.id || 1, title: '', description: '', content: '', scratchFileUrl: '', scratchProjectId: '', coverImage: '', quizzes: [] });
    fetchProjects();
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    
    await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProject)
    });
    setEditingProject(null);
    fetchProjects();
  };

  const handleDeleteProject = async (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    }
  };

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBuilding)
    });
    setShowAddBuildingForm(false);
    setNewBuilding({ name: '', description: '', coverImage: '' });
    fetchBuildings();
  };

  const handleUpdateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;
    
    await fetch(`/api/buildings/${editingBuilding.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingBuilding)
    });
    setEditingBuilding(null);
    fetchBuildings();
  };

  const handleDeleteBuilding = async (id: number) => {
    if (confirm('Are you sure you want to delete this building?')) {
      await fetch(`/api/buildings/${id}`, { method: 'DELETE' });
      fetchBuildings();
    }
  };

  const toggleLock = async (id: number, currentLock: boolean) => {
    await fetch(`/api/projects/${id}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLocked: !currentLock })
    });
    fetchProjects();
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    });
    setShowAddStudentForm(false);
    setNewStudent({ username: '', password: '' });
    fetchStudents();
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    await fetch(`/api/users/${editingStudent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingStudent)
    });
    setEditingStudent(null);
    fetchStudents();
  };

  const handleDeleteStudent = async (id: number) => {
    if (confirm('Are you sure you want to delete this student? All their progress will be lost.')) {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (selectedStudentProgress?.id === id) {
        setSelectedStudentProgress(null);
      }
      fetchStudents();
    }
  };

  const handleUpdateProgress = async (studentId: number, projectId: number, state: string) => {
    await fetch(`/api/users/${studentId}/progress/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    });
    fetchStudentProgress(studentId);
  };

  const handleUpdateBuildingVisibility = async (studentId: number, buildingId: number, isVisible: boolean) => {
    await fetch(`/api/users/${studentId}/buildings/${buildingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible })
    });
    fetchStudentBuildings(studentId);
  };

  const ProjectEditor = ({ project, setProject, onSubmit, onCancel, title }: any) => {
    const handleAddQuiz = () => {
      if ((project.quizzes || []).length >= 3) return;
      setProject({
        ...project,
        quizzes: [...(project.quizzes || []), { question: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
      });
    };

    const handleUpdateQuiz = (index: number, field: string, value: any) => {
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
                onChange={(e) => setProject({...project, buildingId: Number(e.target.value)})}
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
                onChange={(e) => setProject({...project, title: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Cover Image</label>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setProject({...project, coverImage: reader.result as string});
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              {project.coverImage && (
                <img src={project.coverImage} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-orange-200" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
            <textarea 
              value={project.description}
              onChange={(e) => setProject({...project, description: e.target.value})}
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
                onChange={(content) => setProject({...project, content})}
                modules={modules}
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
                onChange={(e) => setProject({...project, scratchFileUrl: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                placeholder="https://example.com/project.sb3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Scratch Project ID (for embed)</label>
              <input 
                type="text" 
                value={project.scratchProjectId}
                onChange={(e) => setProject({...project, scratchProjectId: e.target.value})}
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
              {(project.quizzes || []).map((quiz: any, qIndex: number) => (
                <div key={qIndex} className="bg-orange-50 p-4 rounded-xl border border-orange-200 relative">
                  <button 
                    type="button"
                    onClick={() => handleRemoveQuiz(qIndex)}
                    className="absolute top-2 right-2 text-stone-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                  <h4 className="font-bold text-stone-700 mb-2">Question {qIndex + 1}</h4>
                  <div className="mb-12">
                    <div className="bg-white rounded-xl border border-orange-200 focus-within:border-orange-400 overflow-hidden">
                      <ReactQuill 
                        theme="snow"
                        value={quiz.question}
                        onChange={(content) => handleUpdateQuiz(qIndex, 'question', content)}
                        modules={modules}
                        className="h-32 mb-12"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {quiz.options.map((opt: string, oIndex: number) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={`quiz-${qIndex}-correct`}
                          checked={quiz.correctOptionIndex === oIndex}
                          onChange={() => handleUpdateQuiz(qIndex, 'correctOptionIndex', oIndex)}
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
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
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-orange-800">Teacher Dashboard</h1>
        
        <div className="flex bg-orange-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'projects' 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-orange-800 hover:bg-orange-200/50'
            }`}
          >
            <BookOpen size={18} /> Projects
          </button>
          <button
            onClick={() => setActiveTab('buildings')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'buildings' 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-orange-800 hover:bg-orange-200/50'
            }`}
          >
            <Building2 size={18} /> Buildings
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'students' 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-orange-800 hover:bg-orange-200/50'
            }`}
          >
            <Users size={18} /> Students
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
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
              title="Create New Project"
              project={newProject}
              setProject={setNewProject}
              onSubmit={handleAddProject}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {editingProject && (
            <ProjectEditor 
              title="Edit Project"
              project={editingProject}
              setProject={setEditingProject}
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
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        project.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {project.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        {project.isLocked ? 'Locked' : 'Published'}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => toggleLock(project.id, project.isLocked)}
                        className={`p-2 rounded-lg transition-colors shadow-sm border ${
                          project.isLocked 
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
                            ...project,
                            quizzes: typeof project.quizzes === 'string' ? JSON.parse(project.quizzes) : (project.quizzes || [])
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
      )}

      {activeTab === 'buildings' && (
        <>
          <div className="flex justify-end mb-6">
            <button 
              onClick={() => setShowAddBuildingForm(!showAddBuildingForm)}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-orange-600 transition-colors"
            >
              <Plus size={20} /> Add New Building
            </button>
          </div>

          {showAddBuildingForm && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-orange-100 mb-8">
              <h2 className="text-xl font-bold text-orange-700 mb-4">Create New Building</h2>
              <form onSubmit={handleAddBuilding} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Name (e.g., 小学, 中学, 大学)</label>
                  <input 
                    type="text" 
                    value={newBuilding.name}
                    onChange={(e) => setNewBuilding({...newBuilding, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Cover Image</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewBuilding({...newBuilding, coverImage: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {newBuilding.coverImage && (
                      <img src={newBuilding.coverImage} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-orange-200" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                  <textarea 
                    value={newBuilding.description}
                    onChange={(e) => setNewBuilding({...newBuilding, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddBuildingForm(false)}
                    className="px-4 py-2 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-md"
                  >
                    Save Building
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mt-8">
            {buildings.map((building) => (
              <div key={building.id} className="relative group flex flex-col items-center justify-end h-full">
                {editingBuilding?.id === building.id ? (
                  <form onSubmit={handleUpdateBuilding} className="w-full bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-6 flex flex-col space-y-4 relative z-30">
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Name</label>
                      <input 
                        type="text" 
                        value={editingBuilding.name}
                        onChange={(e) => setEditingBuilding({...editingBuilding, name: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Cover Image</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditingBuilding({...editingBuilding, coverImage: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                      <textarea 
                        value={editingBuilding.description}
                        onChange={(e) => setEditingBuilding({...editingBuilding, description: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                        rows={2}
                      />
                    </div>
                    <div className="mt-auto flex justify-end gap-2 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setEditingBuilding(null)}
                        className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        type="submit" 
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Save size={20} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* The Building Image */}
                    <div className="relative z-10 w-full h-64 flex items-center justify-center">
                      {building.coverImage ? (
                        <img 
                          src={building.coverImage} 
                          alt={building.name} 
                          className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-48 h-48 bg-orange-100 rounded-3xl flex items-center justify-center transform rotate-3 drop-shadow-xl">
                          <Building2 size={64} className="text-orange-300" />
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-orange-100 z-20">
                        <button 
                          onClick={() => setEditingBuilding(building)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Edit Building"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBuilding(building.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete Building"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Title and Description */}
                    <div className="relative z-20 mt-6 flex flex-col items-center text-center">
                      <h3 className="text-xl font-black text-orange-900 bg-white/90 backdrop-blur-sm px-5 py-1.5 rounded-full shadow-md border-2 border-orange-100">
                        {building.name}
                      </h3>
                      {building.description && (
                        <p className="text-stone-600 mt-3 text-sm font-medium max-w-[250px] bg-white/60 backdrop-blur-sm px-4 py-2 rounded-2xl">
                          {building.description}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {buildings.length === 0 && (
              <div className="col-span-full p-8 text-center text-stone-400 bg-white rounded-2xl border-2 border-dashed border-orange-200">
                No buildings found. Add one to get started!
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Students List */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b-2 border-orange-100 flex justify-between items-center bg-orange-50">
              <h2 className="text-xl font-bold text-orange-800">Students</h2>
              <button 
                onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                title="Add Student"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow p-4 space-y-3">
              {showAddStudentForm && (
                <form onSubmit={handleAddStudent} className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
                  <input 
                    type="text" 
                    placeholder="Username"
                    value={newStudent.username}
                    onChange={e => setNewStudent({...newStudent, username: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 focus:border-orange-400 focus:outline-none"
                    required
                  />
                  <input 
                    type="password" 
                    placeholder="Password"
                    value={newStudent.password}
                    onChange={e => setNewStudent({...newStudent, password: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 focus:border-orange-400 focus:outline-none"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddStudentForm(false)} className="px-3 py-1 text-sm text-stone-500 hover:bg-stone-200 rounded-lg">Cancel</button>
                    <button type="submit" className="px-3 py-1 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">Save</button>
                  </div>
                </form>
              )}

              {students.map(student => (
                <div 
                  key={student.id} 
                  className={`p-3 rounded-xl border-2 transition-colors cursor-pointer flex justify-between items-center ${
                    selectedStudentProgress?.id === student.id 
                      ? 'border-orange-400 bg-orange-50' 
                      : 'border-transparent hover:border-orange-200 bg-stone-50'
                  }`}
                  onClick={() => {
                    setSelectedStudentProgress(student);
                    fetchStudentProgress(student.id);
                    fetchStudentBuildings(student.id);
                  }}
                >
                  {editingStudent?.id === student.id ? (
                    <form onSubmit={handleUpdateStudent} className="flex-grow space-y-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editingStudent.username}
                        onChange={e => setEditingStudent({...editingStudent, username: e.target.value})}
                        className="w-full px-2 py-1 text-sm rounded border border-orange-200"
                        required
                      />
                      <input 
                        type="password" 
                        placeholder="New Password"
                        value={editingStudent.password}
                        onChange={e => setEditingStudent({...editingStudent, password: e.target.value})}
                        className="w-full px-2 py-1 text-sm rounded border border-orange-200"
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingStudent(null)} className="p-1 text-stone-500 hover:bg-stone-200 rounded"><X size={16}/></button>
                        <button type="submit" className="p-1 text-green-600 hover:bg-green-100 rounded"><Save size={16}/></button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="font-bold text-stone-700">{student.username}</div>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingStudent({...student, password: ''}); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {students.length === 0 && !showAddStudentForm && (
                <div className="text-center text-stone-400 py-8">No students yet.</div>
              )}
            </div>
          </div>

          {/* Student Progress */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            {selectedStudentProgress ? (
              <>
                <div className="p-6 border-b-2 border-orange-100 bg-orange-50">
                  <h2 className="text-2xl font-bold text-orange-800">
                    Manage: {selectedStudentProgress.username}
                  </h2>
                  <p className="text-stone-600 mt-1">Manage building visibility and project progress.</p>
                </div>
                <div className="overflow-y-auto flex-grow p-6 space-y-8">
                  
                  {/* Building Visibility Section */}
                  <div>
                    <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
                      <Building2 size={24} /> Building Visibility
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {studentBuildingsData.map(building => (
                        <div key={building.id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${
                          building.isVisible ? 'border-orange-200 bg-white' : 'border-stone-200 bg-stone-50 opacity-75'
                        }`}>
                          <div className="font-bold text-stone-700">{building.name}</div>
                          <button
                            onClick={() => handleUpdateBuildingVisibility(selectedStudentProgress.id, building.id, !building.isVisible)}
                            className={`p-2 rounded-lg transition-colors ${
                              building.isVisible 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-stone-400 hover:bg-stone-200'
                            }`}
                            title={building.isVisible ? "Visible to student" : "Hidden from student"}
                          >
                            {building.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                          </button>
                        </div>
                      ))}
                      {studentBuildingsData.length === 0 && (
                        <div className="col-span-full text-stone-400 italic">No buildings available to manage.</div>
                      )}
                    </div>
                  </div>

                  {/* Project Progress Section */}
                  <div>
                    <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
                      <BookOpen size={24} /> Project Progress
                    </h3>
                    {studentProgressData.length > 0 ? (
                      <div className="space-y-6">
                        {/* Group by building */}
                        {Array.from(new Set(studentProgressData.map(p => p.buildingName))).map(buildingName => (
                          <div key={buildingName} className="space-y-3">
                            <h4 className="text-lg font-bold text-stone-800 border-b-2 border-stone-100 pb-2">{buildingName}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {studentProgressData.filter(p => p.buildingName === buildingName).map(project => (
                                <div key={project.projectId} className="p-4 rounded-xl border-2 border-stone-100 bg-stone-50 flex flex-col justify-between gap-4">
                                  <div className="font-bold text-stone-700">{project.title}</div>
                                  <div className="flex flex-wrap gap-2">
                                    <button 
                                      onClick={() => handleUpdateProgress(selectedStudentProgress.id, project.projectId, 'locked')}
                                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        !project.state || project.state === 'locked' ? 'bg-stone-200 text-stone-700 shadow-inner' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                                      }`}
                                    >
                                      <Lock size={14} /> Locked
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateProgress(selectedStudentProgress.id, project.projectId, 'unlocked')}
                                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        project.state === 'unlocked' ? 'bg-blue-100 text-blue-700 shadow-inner border border-blue-200' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                                      }`}
                                    >
                                      <Unlock size={14} /> Unlocked
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateProgress(selectedStudentProgress.id, project.projectId, 'in-progress')}
                                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        project.state === 'in-progress' ? 'bg-orange-100 text-orange-700 shadow-inner border border-orange-200' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                                      }`}
                                    >
                                      <PlayCircle size={14} /> In Progress
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateProgress(selectedStudentProgress.id, project.projectId, 'completed')}
                                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        project.state === 'completed' ? 'bg-green-100 text-green-700 shadow-inner border border-green-200' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                                      }`}
                                    >
                                      <CheckCircle size={14} /> Completed
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-stone-400 py-12">No projects available.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center text-stone-400 p-8 text-center">
                <div>
                  <Users size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Select a student from the list to view and manage their progress.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
