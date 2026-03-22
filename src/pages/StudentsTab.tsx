import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Users, Lock, Unlock, CheckCircle, PlayCircle, Eye, EyeOff, Building2, BookOpen, KeyRound } from 'lucide-react';
import { authFetch } from '../App';
import type { User, Building, StudentProgress, BuildingWithVisibility } from '../types';

export default function StudentsTab() {
    const [students, setStudents] = useState<User[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<{ id: number; username: string; password: string } | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [progressData, setProgressData] = useState<StudentProgress[]>([]);
    const [buildingsData, setBuildingsData] = useState<BuildingWithVisibility[]>([]);
    const [newStudent, setNewStudent] = useState({ username: '', password: '' });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = () => {
        authFetch('/api/users')
            .then(res => res.json())
            .then(data => setStudents(data))
            .catch(err => console.error('Failed to fetch students:', err));
    };

    const fetchStudentProgress = (studentId: number) => {
        authFetch(`/api/users/${studentId}/progress`)
            .then(res => res.json())
            .then(data => setProgressData(data))
            .catch(err => console.error('Failed to fetch progress:', err));
    };

    const fetchStudentBuildings = (studentId: number) => {
        authFetch(`/api/users/${studentId}/buildings`)
            .then(res => res.json())
            .then(data => setBuildingsData(data))
            .catch(err => console.error('Failed to fetch buildings:', err));
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        await authFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(newStudent)
        });
        setShowAddForm(false);
        setNewStudent({ username: '', password: '' });
        fetchStudents();
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        await authFetch(`/api/users/${editingStudent.id}`, {
            method: 'PUT',
            body: JSON.stringify(editingStudent)
        });
        setEditingStudent(null);
        fetchStudents();
    };

    const handleDeleteStudent = async (id: number) => {
        if (confirm('Are you sure you want to delete this student? All their progress will be lost.')) {
            await authFetch(`/api/users/${id}`, { method: 'DELETE' });
            if (selectedStudent?.id === id) {
                setSelectedStudent(null);
            }
            fetchStudents();
        }
    };

    const handleUpdateProgress = async (studentId: number, projectId: number, state: string) => {
        await authFetch(`/api/users/${studentId}/progress/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify({ state })
        });
        fetchStudentProgress(studentId);
    };

    const handleUpdateBuildingVisibility = async (studentId: number, buildingId: number, isVisible: boolean) => {
        await authFetch(`/api/users/${studentId}/buildings/${buildingId}`, {
            method: 'PUT',
            body: JSON.stringify({ isVisible })
        });
        fetchStudentBuildings(studentId);
    };

    const handleResetPassword = async (studentId: number, studentName: string) => {
        const newPassword = prompt(`Set a new password for ${studentName}:`);
        if (!newPassword) return;
        if (newPassword.length < 4) {
            alert('Password must be at least 4 characters.');
            return;
        }
        try {
            const res = await authFetch(`/api/users/${studentId}`, {
                method: 'PUT',
                body: JSON.stringify({ password: newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Password has been reset successfully.');
            } else {
                alert(data.message || 'Failed to reset password.');
            }
        } catch {
            alert('An error occurred while resetting the password.');
        }
    };

    const handleUpdateCoins = async (studentId: number, amount: number, reason: string) => {
        try {
            const res = await authFetch(`/api/users/${studentId}/coins`, {
                method: 'POST',
                body: JSON.stringify({ amount, reason })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Successfully adjusted coins by ${amount}.`);
            } else {
                alert(data.message || 'Failed to adjust coins.');
            }
        } catch {
            alert('An error occurred while adjusting coins.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Students List */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="p-4 border-b-2 border-orange-100 flex justify-between items-center bg-orange-50">
                    <h2 className="text-xl font-bold text-orange-800">Students</h2>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        title="Add Student"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-grow p-4 space-y-3">
                    {showAddForm && (
                        <form onSubmit={handleAddStudent} className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
                            <input
                                type="text"
                                placeholder="Username"
                                value={newStudent.username}
                                onChange={e => setNewStudent({ ...newStudent, username: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-orange-200 focus:border-orange-400 focus:outline-none"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={newStudent.password}
                                onChange={e => setNewStudent({ ...newStudent, password: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-orange-200 focus:border-orange-400 focus:outline-none"
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 text-sm text-stone-500 hover:bg-stone-200 rounded-lg">Cancel</button>
                                <button type="submit" className="px-3 py-1 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">Save</button>
                            </div>
                        </form>
                    )}

                    {students.map(student => (
                        <div
                            key={student.id}
                            className={`p-3 rounded-xl border-2 transition-colors cursor-pointer flex justify-between items-center ${selectedStudent?.id === student.id
                                    ? 'border-orange-400 bg-orange-50'
                                    : 'border-transparent hover:border-orange-200 bg-stone-50'
                                }`}
                            onClick={() => {
                                setSelectedStudent(student);
                                fetchStudentProgress(student.id);
                                fetchStudentBuildings(student.id);
                            }}
                        >
                            {editingStudent?.id === student.id ? (
                                <form onSubmit={handleUpdateStudent} className="flex-grow space-y-2" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editingStudent.username}
                                        onChange={e => setEditingStudent({ ...editingStudent, username: e.target.value })}
                                        className="w-full px-2 py-1 text-sm rounded border border-orange-200"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="New Password"
                                        value={editingStudent.password}
                                        onChange={e => setEditingStudent({ ...editingStudent, password: e.target.value })}
                                        className="w-full px-2 py-1 text-sm rounded border border-orange-200"
                                        required
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setEditingStudent(null)} className="p-1 text-stone-500 hover:bg-stone-200 rounded"><X size={16} /></button>
                                        <button type="submit" className="p-1 text-green-600 hover:bg-green-100 rounded"><Save size={16} /></button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        {student.avatar ? (
                                            <img src={student.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-orange-200" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-orange-300 flex items-center justify-center text-white font-bold text-sm">
                                                {(student.name || student.username)[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-stone-700">{student.name || student.username}</div>
                                            {student.name && <div className="text-xs text-stone-500">@{student.username}</div>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleResetPassword(student.id, student.name || student.username); }}
                                            className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg"
                                            title="Reset Password"
                                        >
                                            <KeyRound size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingStudent({ ...student, password: '' }); }}
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
                    {students.length === 0 && !showAddForm && (
                        <div className="text-center text-stone-400 py-8">No students yet.</div>
                    )}
                </div>
            </div>

            {/* Student Progress */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border-2 border-orange-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                {selectedStudent ? (
                    <>
                        <div className="p-6 border-b-2 border-orange-100 bg-orange-50">
                            <h2 className="text-2xl font-bold text-orange-800">
                                Manage: {selectedStudent.name || selectedStudent.username}
                            </h2>
                            <p className="text-stone-600 mt-1">Manage building visibility and project progress.</p>
                        </div>
                        <div className="overflow-y-auto flex-grow p-6 space-y-8">

                            {/* BlockCoins Management Section */}
                            <div>
                                <h3 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🪙</span> BlockCoins
                                </h3>
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200/40 rounded-full blur-2xl -mt-10 -mr-10"></div>
                                     <div className="relative z-10 flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-inner border border-amber-200 font-black text-amber-600">
                                            {selectedStudent.coins || 0}
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-800 text-lg">Current Balance</div>
                                            <div className="text-sm text-stone-600">Adjust the student's BlockCoins manually below.</div>
                                        </div>
                                     </div>
                                     <form 
                                        className="relative z-10 flex items-center gap-2"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const target = e.target as any;
                                            const amount = parseInt(target.amount.value);
                                            const reason = target.reason.value;
                                            if (amount && reason) {
                                                handleUpdateCoins(selectedStudent.id, amount, reason).then(() => {
                                                    target.reset();
                                                    fetchStudents();
                                                    setSelectedStudent(prev => prev ? { ...prev, coins: Math.max(0, (prev.coins || 0) + amount) } : null);
                                                });
                                            }
                                        }}
                                     >
                                         <input type="number" name="amount" placeholder="+/- Amount" className="w-28 px-3 py-2 rounded-xl border border-amber-200 outline-none focus:border-amber-400" required />
                                         <input type="text" name="reason" placeholder="Reason (e.g. Good behavior)" className="w-48 px-3 py-2 rounded-xl border border-amber-200 outline-none focus:border-amber-400" required />
                                         <button type="submit" className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md transition-colors">Apply</button>
                                     </form>
                                </div>
                            </div>

                            {/* Building Visibility Section */}
                            <div>
                                <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
                                    <Building2 size={24} /> Building Visibility
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {buildingsData.map(building => (
                                        <div key={building.id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${building.isVisible ? 'border-orange-200 bg-white' : 'border-stone-200 bg-stone-50 opacity-75'
                                            }`}>
                                            <div className="font-bold text-stone-700">{building.name}</div>
                                            <button
                                                onClick={() => handleUpdateBuildingVisibility(selectedStudent.id, building.id, !building.isVisible)}
                                                className={`p-2 rounded-lg transition-colors ${building.isVisible
                                                        ? 'text-green-600 hover:bg-green-50'
                                                        : 'text-stone-400 hover:bg-stone-200'
                                                    }`}
                                                title={building.isVisible ? "Visible to student" : "Hidden from student"}
                                            >
                                                {building.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                                            </button>
                                        </div>
                                    ))}
                                    {buildingsData.length === 0 && (
                                        <div className="col-span-full text-stone-400 italic">No buildings available to manage.</div>
                                    )}
                                </div>
                            </div>

                            {/* Project Progress Section */}
                            <div>
                                <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
                                    <BookOpen size={24} /> Project Progress
                                </h3>
                                {progressData.length > 0 ? (
                                    <div className="space-y-6">
                                        {Array.from(new Set(progressData.map(p => p.buildingName))).map(buildingName => (
                                            <div key={buildingName} className="space-y-3">
                                                <h4 className="text-lg font-bold text-stone-800 border-b-2 border-stone-100 pb-2">{buildingName}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {progressData.filter(p => p.buildingName === buildingName).map(project => (
                                                        <div key={project.projectId} className="p-4 rounded-xl border-2 border-stone-100 bg-stone-50 flex flex-col justify-between gap-4">
                                                            <div className="font-bold text-stone-700">{project.title}</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    onClick={() => handleUpdateProgress(selectedStudent.id, project.projectId, 'locked')}
                                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!project.state || project.state === 'locked' ? 'bg-stone-200 text-stone-700 shadow-inner' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                                                                        }`}
                                                                >
                                                                    <Lock size={14} /> Locked
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateProgress(selectedStudent.id, project.projectId, 'unlocked')}
                                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${project.state === 'unlocked' ? 'bg-blue-100 text-blue-700 shadow-inner border border-blue-200' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                                                                        }`}
                                                                >
                                                                    <Unlock size={14} /> Unlocked
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateProgress(selectedStudent.id, project.projectId, 'in-progress')}
                                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${project.state === 'in-progress' ? 'bg-orange-100 text-orange-700 shadow-inner border border-orange-200' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                                                                        }`}
                                                                >
                                                                    <PlayCircle size={14} /> In Progress
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateProgress(selectedStudent.id, project.projectId, 'completed')}
                                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${project.state === 'completed' ? 'bg-green-100 text-green-700 shadow-inner border border-green-200' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
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
    );
}
