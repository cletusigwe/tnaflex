import type { PipelineStage, UploadPlan } from './types';

export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '—';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function currentStep(stage: PipelineStage): number {
    if (stage === 'preprocessing' || stage === 'failed') {
        return 1;
    }

    if (stage === 'review' || stage === 'publishing' || stage === 'published') {
        return 2;
    }

    return 0;
}

export function contentTypeFor(file: File): string {
    if (file.type) {
        return file.type;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();

    return (
        {
            mkv: 'video/x-matroska',
            mov: 'video/quicktime',
            mp4: 'video/mp4',
            webm: 'video/webm',
        }[extension ?? ''] ?? ''
    );
}

export function putFile(
    file: File,
    upload: UploadPlan,
    onProgress: (progress: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.open('PUT', upload.url);

        for (const [header, value] of Object.entries(upload.headers)) {
            if (header.toLowerCase() !== 'host') {
                request.setRequestHeader(header, value);
            }
        }

        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });
        request.addEventListener('load', () => {
            if (request.status >= 200 && request.status < 300) {
                onProgress(100);
                resolve();

                return;
            }

            reject(new Error('R2 rejected the upload.'));
        });
        request.addEventListener('error', () => {
            reject(new Error('The upload could not reach R2.'));
        });
        request.addEventListener('abort', () => {
            reject(new Error('The upload was cancelled.'));
        });
        request.send(file);
    });
}
