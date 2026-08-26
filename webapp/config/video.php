<?php

return [
    'max_upload_size' => 5 * 1024 * 1024 * 1024,
    'processing_timeout' => (int) env('VIDEO_PROCESSING_TIMEOUT', 3600),
    'public_disk' => env('VIDEO_PUBLIC_DISK', 'public'),
    'upload_url_ttl' => 15,
];
