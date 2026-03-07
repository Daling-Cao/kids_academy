import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { authFetch } from '../App';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Cover Image' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await authFetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                onChange(data.url);
            } else {
                setError(data.message || 'Upload failed');
            }
        } catch {
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">{label}</label>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-orange-100 hover:border-orange-300 cursor-pointer transition-colors bg-white">
                    <Upload size={16} className="text-orange-500" />
                    <span className="text-sm font-medium text-stone-600">
                        {uploading ? 'Uploading...' : 'Choose Image'}
                    </span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                    />
                </label>
                {value && (
                    <div className="relative">
                        <img src={value} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-orange-200" />
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
                {error && <span className="text-red-500 text-xs">{error}</span>}
            </div>
        </div>
    );
}
