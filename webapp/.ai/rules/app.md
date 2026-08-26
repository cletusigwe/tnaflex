---
paths:
  - 'app/**'
---

# App

## Keep processed video private until approval
Video uploads go directly to r2_private and move AwaitingUpload -> Preprocessing -> Ready. Only an explicit owner publish action may set Publishing, copy processed assets to r2_public, and finally set Live/published_at after every copy succeeds. Never expose or mark a processed video live from ProcessVideo.

## Keep processed video private until approval
Video uploads and processed assets remain on r2_private through Ready. Only an explicit owner publish action may set Publishing, copy processed assets to the configured video.public_disk (local_media in development, r2_public in production), and set Live/published_at after every copy succeeds.

## Store media paths instead of URLs
Video media database columns contain storage-relative paths under videos/{immutable-slug}, never resolved URLs. Resolve delivery URLs through the configured video.public_disk so development uses local_media and production uses r2_public.

## Use the existing public disk for local video delivery
The local_media disk does not exist. video.public_disk is public in local/testing and r2_public in production; storage-relative video paths resolve through that configured disk. Seed media lives under storage/app/public/videos and is served through public/storage.
