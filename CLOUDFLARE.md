# Kundli on Cloudflare

Staging: https://kundli-birth-chart-free.gabriel-naulleau.workers.dev

`npm run build:vinext` builds the Worker and `npx cf deploy --prebuilt --secrets-file /path/to/private-secrets.json` deploys it. The original Next.js scripts remain available.

The public homepage returns 200 on the staging Worker. The production FreeAstro API credentials are Vercel sensitive values and the authenticated CLI exports them as empty; no copy was found in the local checkout. The Worker therefore uses the correct public API base with a clearly invalid placeholder key. City search currently returns 403 until the original key is replaced in the Worker secret. Do not borrow the more privileged FreeAstroAPI frontend key.

The Vinext build, application and Worker type checks, added-file lint, and the first Git-triggered cloud build/deploy pass. Workers Builds deploys from `main`; preview builds are disabled. No production domain was attached and the Vercel deployment remains unchanged.
