import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Trophy } from 'lucide-react';
import { authFetch } from '../App';
import ImageUpload from '../components/ImageUpload';
import type { Rank } from '../types';

export default function RewardsTab() {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [newRank, setNewRank] = useState({ name: '', icon: '⭐', threshold: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRanks();
  }, []);

  const fetchRanks = () => {
    setIsLoading(true);
    authFetch('/api/ranks')
      .then(res => res.json())
      .then(data => {
        setRanks(data);
        setError('');
      })
      .catch(err => setError('Failed to load ranks'))
      .finally(() => setIsLoading(false));
  };

  const handleAddRank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authFetch('/api/ranks', {
        method: 'POST',
        body: JSON.stringify(newRank)
      });
      setShowAddForm(false);
      setNewRank({ name: '', icon: '⭐', threshold: 0 });
      fetchRanks();
    } catch (err) {
      alert('Failed to add rank');
    }
  };

  const handleUpdateRank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRank) return;
    try {
      await authFetch(`/api/ranks/${editingRank.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingRank)
      });
      setEditingRank(null);
      fetchRanks();
    } catch (err) {
      alert('Failed to update rank');
    }
  };

  const handleDeleteRank = async (id: number) => {
    if (confirm('Are you sure you want to delete this rank?')) {
      try {
        await authFetch(`/api/ranks/${id}`, { method: 'DELETE' });
        fetchRanks();
      } catch (err) {
        alert('Failed to delete rank');
      }
    }
  };

  if (isLoading) return <div className="text-stone-500 p-8 text-center">Loading rewards...</div>;
  if (error) return <div className="text-red-500 p-8 text-center">{error}</div>;

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-100 overflow-hidden">
      <div className="p-6 border-b-2 border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-amber-800 flex items-center gap-3">
            <Trophy className="text-amber-500" /> BlockCoin Ranks
          </h2>
          <p className="text-stone-600 mt-1">Configure student titles from lowest to highest threshold.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors font-bold shadow-md"
        >
          <Plus size={20} /> Add Rank
        </button>
      </div>

      <div className="p-6 space-y-4">
        {showAddForm && (
          <form onSubmit={handleAddRank} className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <ImageUpload
                  label="Icon Image"
                  value={newRank.icon.startsWith('http') || newRank.icon.startsWith('/') || newRank.icon.startsWith('data:') ? newRank.icon : ''}
                  onChange={url => setNewRank({ ...newRank, icon: url })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Rank Name</label>
              <input
                type="text"
                placeholder="e.g. Master Builder"
                value={newRank.name}
                onChange={e => setNewRank({ ...newRank, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 outline-none"
                required
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Threshold (Coins)</label>
              <input
                type="number"
                min="0"
                value={newRank.threshold}
                onChange={e => setNewRank({ ...newRank, threshold: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 outline-none"
                required
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-2 rounded-xl text-stone-600 hover:bg-stone-200 font-bold transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-md transition-colors">Save Rank</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4">
          {ranks.map(rank => (
            <div key={rank.id} className="bg-white border-2 border-stone-100 hover:border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
              {editingRank?.id === rank.id ? (
                <form onSubmit={handleUpdateRank} className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div className="md:col-span-1">
                    <ImageUpload
                        label=""
                        value={editingRank.icon.startsWith('http') || editingRank.icon.startsWith('/') || editingRank.icon.startsWith('data:') ? editingRank.icon : ''}
                        onChange={url => setEditingRank({ ...editingRank, icon: url })}
                    />
                  </div>
                  <input
                    type="text"
                    value={editingRank.name}
                    onChange={e => setEditingRank({ ...editingRank, name: e.target.value })}
                    className="px-4 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 outline-none md:col-span-2"
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    value={editingRank.threshold}
                    onChange={e => setEditingRank({ ...editingRank, threshold: parseInt(e.target.value) || 0 })}
                    className="px-4 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 outline-none md:col-span-1"
                    required
                  />
                  <div className="md:col-span-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingRank(null)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-xl" title="Cancel">
                      <X size={20} />
                    </button>
                    <button type="submit" className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Save">
                      <Save size={20} />
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-2xl shadow-inner border border-amber-300/50 overflow-hidden shrink-0">
                      {rank.icon?.startsWith('http') || rank.icon?.startsWith('/') || rank.icon?.startsWith('data:') ? (
                        <img src={rank.icon} alt={rank.name} className="w-full h-full object-cover" />
                      ) : (
                        rank.icon
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-stone-800">{rank.name}</h3>
                      <div className="text-sm font-bold text-amber-600 mt-0.5">Requires {rank.threshold} BlockCoins</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingRank(rank)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Edit Rank"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteRank(rank.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete Rank"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {ranks.length === 0 && !showAddForm && (
            <div className="text-center py-12 text-stone-400 flex flex-col items-center">
              <Trophy size={48} className="mb-4 opacity-20" />
              <p>No ranks configured yet. Click "Add Rank" to create the first one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
