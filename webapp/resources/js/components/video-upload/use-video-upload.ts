import { useHttp } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, SyntheticEvent } from 'react';

import { complete, show, store } from '@/routes/dashboard/videos';
import type { UploadingVideo } from '@/types';

import type {
    CreateUploadResponse,
    PipelineStage,
    UploadPlan,
    UploadRequest,
    VideoMetadata,
    VideoResponse,
} from './types';
import { contentTypeFor, currentStep, putFile } from './utils';

export function useVideoUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const localPreviewUrlRef = useRef<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
    const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState<
        string | null
    >(null);
    const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
    const [stage, setStage] = useState<PipelineStage>('draft');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isTransferActive, setIsTransferActive] = useState(false);
    const [pipelineError, setPipelineError] = useState<string | null>(null);
    const [uploadPlan, setUploadPlan] = useState<UploadPlan | null>(null);
    const [serverVideo, setServerVideo] = useState<UploadingVideo | null>(null);

    const createUpload = useHttp<UploadRequest, CreateUploadResponse>({
        title: '',
        description: '',
        filename: '',
        content_type: '',
        file_size_bytes: 0,
    });
    const completeUpload = useHttp<Record<string, never>, VideoResponse>({});
    const activeStep = currentStep(stage);
    const serverVideoId = serverVideo?.id;
    const thumbnailUrl = serverVideo?.thumbnailUrl ?? generatedThumbnailUrl;

    useEffect(() => {
        return () => {
            if (localPreviewUrlRef.current) {
                URL.revokeObjectURL(localPreviewUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (
            !serverVideoId ||
            (stage !== 'preprocessing' && stage !== 'publishing')
        ) {
            return;
        }

        let isCancelled = false;
        let timeout: number | undefined;

        const pollStatus = async () => {
            try {
                const response = await fetch(show(serverVideoId).url, {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    throw new Error('Status request failed.');
                }

                const payload = (await response.json()) as VideoResponse;

                if (isCancelled) {
                    return;
                }

                setServerVideo(payload.video);

                if (payload.video.status === 'live') {
                    setStage('published');

                    return;
                }

                if (payload.video.status === 'publishing') {
                    setStage('publishing');
                }

                if (payload.video.status === 'failed') {
                    setPipelineError(
                        payload.video.processingError ??
                            'The video could not be processed.',
                    );
                    setStage('failed');

                    return;
                }
            } catch {
                if (!isCancelled) {
                    setPipelineError(
                        'Status updates are temporarily unavailable. This page will keep trying.',
                    );
                }
            }

            if (!isCancelled) {
                timeout = window.setTimeout(pollStatus, 2000);
            }
        };

        timeout = window.setTimeout(pollStatus, 1200);

        return () => {
            isCancelled = true;
            window.clearTimeout(timeout);
        };
    }, [serverVideoId, stage]);

    const selectVideo = (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null;

        if (!nextFile) {
            return;
        }

        if (localPreviewUrlRef.current) {
            URL.revokeObjectURL(localPreviewUrlRef.current);
        }

        const nextPreviewUrl = URL.createObjectURL(nextFile);
        localPreviewUrlRef.current = nextPreviewUrl;

        setVideoFile(nextFile);
        setLocalPreviewUrl(nextPreviewUrl);
        setGeneratedThumbnailUrl(null);
        setMetadata(null);
        setPipelineError(null);
        setUploadPlan(null);
        setServerVideo(null);
        setStage('draft');
        setUploadProgress(0);
        createUpload.clearErrors();
        createUpload.setData((data) => ({
            ...data,
            title: data.title || nextFile.name.replace(/\.[^/.]+$/, ''),
            filename: nextFile.name,
            content_type: contentTypeFor(nextFile),
            file_size_bytes: nextFile.size,
        }));
    };

    const captureThumbnail = (video: HTMLVideoElement) => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            return;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            return;
        }

        canvas.width = 1280;
        canvas.height = 720;

        const scale = Math.max(
            canvas.width / video.videoWidth,
            canvas.height / video.videoHeight,
        );
        const width = video.videoWidth * scale;
        const height = video.videoHeight * scale;

        context.drawImage(
            video,
            (canvas.width - width) / 2,
            (canvas.height - height) / 2,
            width,
            height,
        );

        setGeneratedThumbnailUrl(canvas.toDataURL('image/jpeg', 0.86));
    };

    const readMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
        const video = event.currentTarget;

        setMetadata({
            duration: video.duration,
            height: video.videoHeight,
            width: video.videoWidth,
        });

        if (!generatedThumbnailUrl && Number.isFinite(video.duration)) {
            video.currentTime = Math.min(1, video.duration / 10);
        }
    };

    const transferUpload = async (video: UploadingVideo, plan: UploadPlan) => {
        if (!videoFile) {
            return;
        }

        setIsTransferActive(true);
        setPipelineError(null);

        try {
            await putFile(videoFile, plan, setUploadProgress);
            const response = await completeUpload.post(complete(video.id).url);

            if (!response) {
                setPipelineError(
                    'The uploaded file could not be verified. Try the upload again.',
                );

                return;
            }

            setServerVideo(response.video);
            setStage('preprocessing');
        } catch (error) {
            setPipelineError(
                error instanceof Error
                    ? error.message
                    : 'The upload could not be completed.',
            );
        } finally {
            setIsTransferActive(false);
        }
    };

    const startUpload = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (
            !videoFile ||
            createUpload.data.title.trim() === '' ||
            isTransferActive
        ) {
            return;
        }

        setStage('uploading');
        setUploadProgress(0);
        setPipelineError(null);

        if (uploadPlan && serverVideo) {
            await transferUpload(serverVideo, uploadPlan);

            return;
        }

        try {
            const response = await createUpload.post(store().url);

            if (!response) {
                setStage('draft');

                return;
            }

            setServerVideo(response.video);
            setUploadPlan(response.upload);
            await transferUpload(response.video, response.upload);
        } catch {
            setStage('draft');
            setPipelineError('The upload could not be prepared. Try again.');
        }
    };

    const resetDraft = () => {
        if (localPreviewUrlRef.current) {
            URL.revokeObjectURL(localPreviewUrlRef.current);
            localPreviewUrlRef.current = null;
        }

        setVideoFile(null);
        setLocalPreviewUrl(null);
        setGeneratedThumbnailUrl(null);
        setMetadata(null);
        setStage('draft');
        setPipelineError(null);
        setUploadProgress(0);
        createUpload.reset();
        createUpload.clearErrors();

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return {
        activeStep,
        captureThumbnail,
        description: createUpload.data.description,
        fileInputRef,
        isCreatingUpload: createUpload.processing,
        isTransferActive,
        localPreviewUrl,
        metadata,
        pipelineError,
        readMetadata,
        resetDraft,
        selectVideo,
        serverVideo,
        setDescription: (description: string) =>
            createUpload.setData('description', description),
        setTitle: (title: string) => createUpload.setData('title', title),
        stage,
        startUpload,
        thumbnailUrl,
        title: createUpload.data.title,
        titleError: createUpload.errors.title
            ? String(createUpload.errors.title)
            : null,
        uploadProgress,
        videoFile,
    };
}

export type VideoUploadWorkflow = ReturnType<typeof useVideoUpload>;
