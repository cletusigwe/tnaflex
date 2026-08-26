export type Video = {
    id: string;
    title: string;
    creator: string;
    creatorInitials: string;
    thumbnailUrl: string | null;
    previewUrl: string | null;
    playbackUrl: string;
    duration: string;
    fileSizeBytes: number;
    publishedAt: string;
    description: string;
};

export type VideoStatus =
    | 'awaiting_upload'
    | 'preprocessing'
    | 'ready'
    | 'publishing'
    | 'live'
    | 'failed';

export type VideoRendition = {
    label: string;
    width: number;
    height: number;
    sizeBytes: number;
    playlist: string;
    playlistUrl: string | null;
};

export type DashboardVideo = {
    id: string;
    title: string;
    status: VideoStatus;
    statusLabel: string;
    thumbnailUrl: string | null;
    fileSizeBytes: number;
    createdAt: string;
};

export type UploadingVideo = Pick<
    DashboardVideo,
    'id' | 'title' | 'status' | 'statusLabel' | 'fileSizeBytes' | 'createdAt'
> & {
    processingError: string | null;
    durationSeconds: number | null;
    thumbnailUrl: string | null;
    previewUrl: string | null;
    playbackUrl: string | null;
    renditions: VideoRendition[];
};
