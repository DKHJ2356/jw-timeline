# jw-timeline

A timeline website for personal Bible study. This is the Next.js version of "My Bible Timeline"
(ported from the single-file app, version 18.8.5). All entries and photos stay on the device:
there is no login, no server and no cloud storage.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the app is organised.

## Requirements

- Node.js 22.12 or newer (24 is fine), npm 10 or newer.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
```

## Checks

```bash
npm run lint         # ESLint (Next.js rules)
npm run typecheck    # TypeScript, no output files
npm test             # Vitest unit tests
npm run build        # static export into out/
npm start            # serves out/ on http://localhost:4173 (uses npx serve)
```

`npm run icons` redraws the PNG icons in `public/icons/`.

To stop Next.js from sending anonymous build telemetry, set `NEXT_TELEMETRY_DISABLED=1`
(locally and in Cloudflare).

## Deploying to Cloudflare Pages

The site is plain static files, so it runs on the free tier with no Functions.

1. In the Cloudflare dashboard open **Workers & Pages → Create → Pages → Connect to Git**
   and choose the `DKHJ2356/jw-timeline` repository.
2. Build settings:
   - Production branch: `main` (or `nextjs-port` while testing; other branches get preview URLs)
   - Framework preset: `None` (or "Next.js (Static HTML Export)")
   - Build command: `npm run build`
   - Build output directory: `out`
   - Root directory: *(leave empty)*
3. Environment variables (Production and Preview):
   - `NODE_VERSION` = `22`
   - `NEXT_TELEMETRY_DISABLED` = `1` (optional)
4. Save and deploy. `public/_headers` is copied into `out/` and gives the hashed files under
   `/_next/static/` and the icons a one-year immutable cache.

Do not choose the "Next.js" (full-stack, `@cloudflare/next-on-pages`) preset: this app is a
static export and needs no server runtime.

### Deploying as a Cloudflare Worker (Workers & Pages → Create application)

`wrangler.jsonc` runs `npm run build` itself and then serves `./out` as static assets, so
`npx wrangler deploy` works with no separate build command. In the Worker's **Settings → Build**:

- Git branch: the branch that holds this code (`main` only after `nextjs-port` is merged)
- Build command: leave empty (setting `npm run build` also works, it just builds twice)
- Deploy command: `npx wrangler deploy` (default)
- The Worker's name must match `name` in `wrangler.jsonc` (`jw-timeline`).

Node 22 is pinned in `.node-version`.

## Moving data from the old app

- If the old app was opened on the same web address before, its data is moved in automatically
  the first time this version opens (the old browser data is left untouched).
- Otherwise, in the old app use **Backup** to save a `.btlbackup` file, then in this app use
  **Restore** and pick that file. Old backups with pictures are converted automatically.
- A text-only CSV export from the old app can be added with **More → Import CSV**.

## Offline / iPad

After the first visit the app works offline (a small service worker caches the app shell).
On an iPad, open the site in Safari and use **Share → Add to Home Screen**.
