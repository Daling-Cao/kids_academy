import React, { useState } from 'react';
import { X, Save, KeyRound } from 'lucide-react';
import { authFetch } from '../App';
import ImageUpload from './ImageUpload';
import type { User } from '../types';

interface ProfileSettingsModalProps {
    user: User;
    onClose: () => void;
    onUpdate: (user: User) => void;
}

export default function ProfileSettingsModal({ user, onClose, onUpdate }: ProfileSettingsModalProps) {
    const [name, setName] = useState(user.name || '');
    const [avatar, setAvatar] = useState(user.avatar || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Password change state
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await authFetch('/api/profile', {
                method: 'PUT',
                body: JSON.stringify({ name, avatar }),
            });
            const data = await res.json();
            if (data.success) {
                onUpdate({ ...user, name, avatar });
            } else {
                setError(data.message || 'Failed to update profile');
            }
        } catch {
            setError('An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmNewPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 4) {
            setPasswordError('New password must be at least 4 characters.');
            return;
        }

        setPasswordSaving(true);
        try {
            const res = await authFetch('/api/profile/password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                setPasswordSuccess('Password changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setShowPasswordChange(false);
            } else {
                setPasswordError(data.message || 'Failed to change password.');
            }
        } catch {
            setPasswordError('An error occurred.');
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <X size={24} />
                </button>
                <h2 className="text-2xl font-bold text-stone-800 mb-6 font-display">Profile Settings</h2>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-1">Login Name</label>
                        <input
                            type="text"
                            value={user.username}
                            disabled
                            className="w-full px-4 py-2 rounded-xl bg-stone-100 text-stone-500 cursor-not-allowed border border-stone-200"
                        />
                        <p className="text-xs text-stone-400 mt-1">Your login name cannot be changed.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-1">Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <ImageUpload label="Avatar" value={avatar} onChange={setAvatar} />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                    </button>
                </form>

                {/* Password Change Section */}
                <div className="mt-6 pt-6 border-t-2 border-stone-100">
                    {!showPasswordChange ? (
                        <button
                            onClick={() => setShowPasswordChange(true)}
                            className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-orange-600 transition-colors"
                        >
                            <KeyRound size={16} /> Change Password
                        </button>
                    ) : (
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <h3 className="font-bold text-stone-700 flex items-center gap-2">
                                <KeyRound size={18} /> Change Password
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-stone-600 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-600 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-600 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border-2 border-orange-100 focus:border-orange-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                            {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowPasswordChange(false); setPasswordError(''); }}
                                    className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordSaving}
                                    className="flex-1 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                                >
                                    {passwordSaving ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
