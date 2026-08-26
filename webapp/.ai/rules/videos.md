---
paths:
  - 'storage/app/public/videos/**'
---

# Videos

## Keep development seed media untracked
Seed video binaries are local-development data only. Keep storage/app/public/videos ignored by Git so they are never shipped to production; developers generate or copy them locally before running VideoSeeder.
