// XHR-based file upload so we can report real upload progress (0–100%).
// fetch() can't surface upload progress events, hence XMLHttpRequest.
// Also feeds the global top bar via the same in-flight counter.

import { startRequest, endRequest } from './progress';

export interface UploadResult {
    success: boolean;
    url?: string;
    message?: string;
}

export function uploadFile(
    file: File,
    onProgress?: (percent: number) => void,
): Promise<UploadResult> {
    startRequest();
    return new Promise<UploadResult>((resolve) => {
        const formData = new FormData();
        formData.append('image', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            onProgress?.(100);
            if (xhr.status === 401) {
                localStorage.removeItem('session_expires_at');
                window.dispatchEvent(new Event('kids-academy-auth-expired'));
            }
            try {
                resolve(JSON.parse(xhr.responseText) as UploadResult);
            } catch {
                resolve({ success: false, message: 'Upload failed' });
            }
        };
        xhr.onerror = () => resolve({ success: false, message: 'Failed to upload image' });
        xhr.send(formData);
    }).finally(endRequest);
}
