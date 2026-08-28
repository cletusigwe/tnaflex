import type { UploadingVideo } from '@/types';

export type PipelineStage =
    | 'draft'
    | 'uploading'
    | 'preprocessing'
    | 'publishing'
    | 'published'
    | 'failed';

export type VideoMetadata = {
    duration: number;
    height: number;
    width: number;
};

export type UploadRequest = {
    title: string;
    description: string;
    filename: string;
    content_type: string;
    file_size_bytes: number;
};

export type UploadPlan = {
    url: string;
    headers: Record<string, string>;
    expiresAt: string;
};

export type VideoResponse = {
    video: UploadingVideo;
};

export type CreateUploadResponse = VideoResponse & {
    upload: UploadPlan;
};

export const pipelineSteps = ['Upload', 'Process', 'Live'];
