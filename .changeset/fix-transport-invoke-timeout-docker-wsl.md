---
'astro': patch
---

Fix `transport invoke timed out after 60000ms` error in Docker and WSL environments by pre-warming SSR route modules at dev server startup, and adding an actionable hint with Docker/WSL guidance when the timeout still occurs.
