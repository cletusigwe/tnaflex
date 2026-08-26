---
paths:
  - app/Http/Requests/StoreVideoRequest.php
---

# Requests

## Accept both Matroska MIME aliases
Browsers report MKV uploads as either video/matroska or video/x-matroska. Keep both mapped to the mkv extension so direct-upload validation and R2 Content-Type signing accept real browser payloads.
