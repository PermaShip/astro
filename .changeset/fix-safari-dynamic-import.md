---
'astro': patch
---

Fix "Importing a module script failed" Safari error when hydrating client islands by extracting the component URL to a variable before the dynamic import call.
