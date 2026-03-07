import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Building2 } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { authFetch } from '../App';
import type { Building } from '../types';

export default function BuildingsTab() {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [newBuilding, setNewBuilding] = useState({ name: '', description: '', coverImage: '' });

    useEffect(() => {
        fetchBuildings();
    }, []);

    const fetchBuildings = () => {
        authFetch('/api/buildings')
            .then(res => res.json())
            .then(data => setBuildings(data))
            .catch(err => console.error('Failed to fetch buildings:', err));
    };

    const handleAddBuilding = async (e: React.FormEvent) => {
        e.preventDefault();
        await authFetch('/api/buildings', {
            method: 'POST',
            body: JSON.stringify(newBuilding)
        });
        setShowAddBuildingForm(false);
        setNewBuilding({ name: '', description: '', coverImage: '' });
        fetchBuildings();
    };

    const setShowAddBuildingForm = setShowAddForm;

    const handleUpdateBuilding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBuilding) return;
        await authFetch(`/api/buildings/${editingBuilding.id}`, {
            method: 'PUT',
            body: JSON.stringify(editingBuilding)
        });
        setEditingBuilding(null);
        fetchBuildings();
    };

    const handleDeleteBuilding = async (id: number) => {
        if (confirm('Are you sure you want to delete this building? All projects inside will also be deleted.')) {
            await authFetch(`/api/buildings/${id}`, { method: 'DELETE' });
            fetchBuildings();
        }
    };

    return (
        <>
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-orange-600 transition-colors"
                >
                    <Plus size={20} /> Add New Building
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-orange-100 mb-8">
                    <h2 className="text-xl font-bold text-orange-700 mb-4">Create New Building</h2>
                    <form onSubmit={handleAddBuilding} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Name (e.g., 小学, 中学, 大学)</label>
                            <input
                                type="text"
                                value={newBuilding.name}
                                onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                                required
                            />
                        </div>
                        <ImageUpload
                            value={newBuilding.coverImage}
                            onChange={(url) => setNewBuilding({ ...newBuilding, coverImage: url })}
                        />
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                            <textarea
                                value={newBuilding.description}
                                onChange={(e) => setNewBuilding({ ...newBuilding, description: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
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
                                        onChange={(e) => setEditingBuilding({ ...editingBuilding, name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border-2 border-orange-100 focus:border-orange-400 focus:outline-none"
                                        required
                                    />
                                </div>
                                <ImageUpload
                                    value={editingBuilding.coverImage}
                                    onChange={(url) => setEditingBuilding({ ...editingBuilding, coverImage: url })}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                                    <textarea
                                        value={editingBuilding.description}
                                        onChange={(e) => setEditingBuilding({ ...editingBuilding, description: e.target.value })}
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
    );
}
