---
paths:
  - 'scripts/**'
---

# Scripts

## Keep FFmpeg preprocessing storage-agnostic
scripts/preprocess-video.sh accepts local --input, --output, and --watermark paths and must not know about Laravel, R2, or the database. It burns the tnaflex watermark into every HLS rendition and hover preview, writes relative paths in manifest.json, and writes the manifest only after all media outputs.
