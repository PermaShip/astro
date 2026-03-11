---
"@astrojs/language-server": patch
"@astrojs/ts-plugin": patch
---

Fix false-positive "Import declaration conflicts with local declaration" error when `.astro` filename matches an import binding (e.g., `image.astro` with `import { Image } from 'astro:assets'`).
