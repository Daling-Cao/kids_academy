import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, Building2, Users, Edit2, X } from 'lucide-react';
import { authFetch } from '../App';
import type { User, StudentGroup, BuildingWithVisibility } from '../types';
import { useI18n } from '../i18n';

// Teacher panel for student groups: create / rename / delete groups, pick
// members, and show or hide buildings for everyone in a group at once.
export default function GroupsPanel({ groups, students, onChanged }: {
    groups: StudentGroup[];
    students: User[];
    // Called after anything that changes groups or memberships.
    onChanged: () => void;
}) {
    const { t } = useI18n();
    const [selectedId, setSelectedId] = useState<number | null>(groups[0]?.id ?? null);
    const [newName, setNewName] = useState('');
    const [renaming, setRenaming] = useState<string | null>(null);
    const [buildings, setBuildings] = useState<BuildingWithVisibility[]>([]);

    const selected = groups.find(g => g.id === selectedId) || null;

    // Keep a valid selection when groups are added or deleted.
    useEffect(() => {
        if (selectedId === null || !groups.some(g => g.id === selectedId)) {
            setSelectedId(groups[0]?.id ?? null);
        }
    }, [groups, selectedId]);

    const fetchBuildings = (groupId: number) => {
        authFetch(`/api/groups/${groupId}/buildings`)
            .then(res => res.json())
            .then(data => setBuildings(Array.isArray(data) ? data : []))
            .catch(err => console.error('Failed to fetch group buildings:', err));
    };

    useEffect(() => {
        setRenaming(null);
        if (selectedId !== null) fetchBuildings(selectedId);
        else setBuildings([]);
    }, [selectedId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        const res = await authFetch('/api/groups', { method: 'POST', body: JSON.stringify({ name }) });
        const data = await res.json();
        setNewName('');
        if (data.success) setSelectedId(Number(data.id));
        onChanged();
    };

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !renaming?.trim()) return;
        await authFetch(`/api/groups/${selected.id}`, { method: 'PUT', body: JSON.stringify({ name: renaming.trim() }) });
        setRenaming(null);
        onChanged();
    };

    const handleDelete = async () => {
        if (!selected || !confirm(t.groupDeleteConfirm)) return;
        await authFetch(`/api/groups/${selected.id}`, { method: 'DELETE' });
        setSelectedId(null);
        onChanged();
    };

    const handleToggleBuilding = async (buildingId: number, isVisible: boolean) => {
        if (!selected) return;
        await authFetch(`/api/groups/${selected.id}/buildings/${buildingId}`, {
            method: 'PUT',
            body: JSON.stringify({ isVisible }),
        });
        fetchBuildings(selected.id);
    };

    const handleToggleMember = async (student: User, isMember: boolean) => {
        if (!selected) return;
        await authFetch(`/api/users/${student.id}/group`, {
            method: 'PUT',
            body: JSON.stringify({ groupId: isMember ? selected.id : null }),
        });
        onChanged();
    };

    const groupName = (id?: number | null) => groups.find(g => g.id === id)?.name;

    return (
        <>
            <div className="p-6 border-b-2 border-orange-100 bg-orange-50">
                <h2 className="text-2xl font-bold text-orange-800 flex items-center gap-2">
                    <Users size={24} /> {t.manageGroups}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {groups.map(g => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedId(g.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${g.id === selectedId
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'bg-white border-orange-200 text-orange-700 hover:bg-orange-100'
                                }`}
                        >
                            {g.name} <span className="opacity-70">({g.memberCount})</span>
                        </button>
                    ))}
                    <form onSubmit={handleCreate} className="flex items-center gap-1">
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={t.newGroup}
                            className="w-40 px-3 py-1.5 rounded-full border-2 border-orange-200 text-sm focus:border-orange-400 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!newName.trim()}
                            className="p-1.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-40 transition-colors"
                            title={t.newGroup}
                        >
                            <Plus size={18} />
                        </button>
                    </form>
                </div>
            </div>

            <div className="overflow-y-auto flex-grow p-6 space-y-8">
                {!selected ? (
                    <div className="text-center text-stone-400 py-12">
                        {groups.length === 0 ? t.noGroupsYet : t.selectGroupHint}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {renaming !== null ? (
                                <form onSubmit={handleRename} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={renaming}
                                        onChange={e => setRenaming(e.target.value)}
                                        placeholder={t.groupName}
                                        className="px-3 py-2 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:outline-none"
                                        autoFocus
                                        required
                                    />
                                    <button type="submit" className="p-2 text-green-600 hover:bg-green-100 rounded-lg"><Save size={18} /></button>
                                    <button type="button" onClick={() => setRenaming(null)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg"><X size={18} /></button>
                                </form>
                            ) : (
                                <h3 className="text-xl font-bold text-stone-800">
                                    {t.manageGroup} {selected.name}
                                </h3>
                            )}
                            <div className="flex gap-2">
                                {renaming === null && (
                                    <button
                                        type="button"
                                        onClick={() => setRenaming(selected.name)}
                                        className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50"
                                    >
                                        <Edit2 size={16} /> {t.groupName}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Group building visibility */}
                        <div>
                            <h3 className="text-xl font-bold text-orange-700 mb-1 flex items-center gap-2">
                                <Building2 size={24} /> {t.buildingVisibility}
                            </h3>
                            <p className="text-sm text-stone-500 mb-4">{t.groupBuildingsHint}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {buildings.map(building => (
                                    <div key={building.id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${building.isVisible ? 'border-orange-200 bg-white' : 'border-stone-200 bg-stone-50 opacity-75'}`}>
                                        <div className="font-bold text-stone-700">{building.name}</div>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleBuilding(building.id, !building.isVisible)}
                                            className={`p-2 rounded-lg transition-colors ${building.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-200'}`}
                                        >
                                            {building.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Members */}
                        <div>
                            <h3 className="text-xl font-bold text-orange-700 mb-1 flex items-center gap-2">
                                <Users size={24} /> {t.groupMembers} ({selected.memberCount})
                            </h3>
                            <p className="text-sm text-stone-500 mb-4">{t.groupChangeHint}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {students.map(student => {
                                    const isMember = student.groupId === selected.id;
                                    const otherGroup = !isMember ? groupName(student.groupId) : undefined;
                                    return (
                                        <label
                                            key={student.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isMember ? 'border-orange-300 bg-orange-50' : 'border-stone-100 bg-stone-50 hover:border-orange-200'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isMember}
                                                onChange={() => handleToggleMember(student, !isMember)}
                                                className="w-4 h-4 accent-orange-500"
                                            />
                                            <span className="font-bold text-stone-700">{student.name || student.username}</span>
                                            {otherGroup && (
                                                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">{otherGroup}</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
