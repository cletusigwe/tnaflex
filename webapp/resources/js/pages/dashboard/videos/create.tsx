import { Head, Link } from '@inertiajs/react';

import { VideoUploadControls } from '@/components/video-upload/controls';
import { PipelineNavigation } from '@/components/video-upload/navigation';
import { VideoUploadPreview } from '@/components/video-upload/preview';
import { useVideoUpload } from '@/components/video-upload/use-video-upload';
import { AppLayout } from '@/layouts/app-layout';
import { dashboard } from '@/routes';

export default function CreateVideo() {
    const workflow = useVideoUpload();

    return (
        <AppLayout>
            <Head title="Upload a video" />

            <main className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10 lg:px-10">
                <header>
                    <Link
                        href={dashboard()}
                        className="mb-5 inline-flex border-b border-neutral-400 pb-0.5 text-xs font-medium tracking-[0.08em] text-neutral-600 uppercase hover:border-neutral-950 hover:text-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-50 dark:hover:text-neutral-50"
                    >
                        Back to channel
                    </Link>
                    <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#0086d8] uppercase">
                        New video
                    </p>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                        Upload video
                    </h1>
                </header>

                <PipelineNavigation
                    activeStep={workflow.activeStep}
                    stage={workflow.stage}
                />

                <form onSubmit={workflow.startUpload} className="mt-8">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
                        <VideoUploadPreview workflow={workflow} />
                        <VideoUploadControls workflow={workflow} />
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
