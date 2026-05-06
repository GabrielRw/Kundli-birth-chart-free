# Kundli Birth Chart Desk

An AstroSage-like Vedic Kundli chart calculator built with Next.js and FreeAstroAPI. It is free to clone, customize, and deploy for astrologers, astrology students, and client-facing Jyotish chart tools.

Live demo: https://kundli-birth-chart-free.vercel.app

The browser talks only to local Next.js route handlers, so the FreeAstro API key stays server-side.

## What It Includes

- Birth chart form with city search, timezone, ayanamsha, houses, and node settings
- D1 Rashi and D9 Navamsha chart views, plus divisional chart support
- North Indian, South Indian, and East Indian chart styles
- Planet tables, dasha, yogas, panchang, Shadbala, Ashtakavarga, predictions, and remedies
- Kundli matching mode and browser-only saved clients
- Print-ready report flow for PDF export through the browser

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- FreeAstroAPI V2 endpoints

## Clone This Free Kundli Calculator

This project is intended as a free open starting point for building an AstroSage-style Kundli chart reader. Clone it, add your own branding, connect your own FreeAstroAPI key, and deploy it to Vercel.

```bash
git clone https://github.com/GabrielRw/Kundli-birth-chart-free.git
cd Kundli-birth-chart-free
npm install
```

## Local Development

Create `.env.local`:

```bash
cp .env.example .env.local
```

Set the required server-side key:

```env
FREEASTRO_API_KEY=your_freeastroapi_key_here
FREEASTRO_API_BASE=https://api.freeastroapi.com
FREEASTRO_MIN_INTERVAL_MS=1100
```

Run the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. If that port is occupied, run `npm run dev -- --port 3001`.

## Vercel Deployment

This project is ready for Vercel's zero-config Next.js deployment.

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the project in Vercel.
3. Add these Environment Variables in Vercel Project Settings for Production and Preview:
   - `FREEASTRO_API_KEY`
   - `FREEASTRO_API_BASE` with value `https://api.freeastroapi.com`
   - `FREEASTRO_MIN_INTERVAL_MS` with value `1100`
4. Deploy.

Do not add `.env.local` to Git. The repo keeps `.env.example` trackable for setup documentation, while local environment files remain ignored.

Vercel currently supports selecting Node.js through `package.json` `engines.node`; this app pins `24.x` to match Vercel's current default Node runtime family.

FreeAstro free plans can be capped at 1 request per second. The server routes use `FREEASTRO_MIN_INTERVAL_MS` to pace upstream requests instead of sending chart modules in parallel. Keep `1100` for free-plan safety; lower it only if your FreeAstro plan allows higher throughput.

## Production Checks

Run before deployment:

```bash
npm run lint
npm run build
```

## API Routes

- `GET /api/geo/search` proxies FreeAstro city autocomplete.
- `POST /api/kundli` calls the Vedic chart modules server-side.
- `POST /api/match` calls the Vedic matching flow server-side.

Required FreeAstro docs:

- Vedic chart: https://www.freeastroapi.com/docs/vedic/chart
- City search: https://www.freeastroapi.com/docs/geo/search
- Match by birth: https://www.freeastroapi.com/docs/vedic/match
