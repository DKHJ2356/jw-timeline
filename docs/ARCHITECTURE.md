# Architecture

This is the Next.js port of the single-file "My Bible Timeline" web app (v18.8.5).
Everything still runs on the device: there is no login, no server and no cloud storage.

## Stack

- Next.js 15 (App Router) and TypeScript, built as a static export (`output: 'export'`).
  The `out/` folder is deployed to Cloudflare Pages as plain files.
- Tailwind CSS v4. The original CSS variables are theme tokens; dark mode is a `dark` class on `<html>`.
- Framer Motion through `LazyMotion` + `domAnimation`: modal enter/exit, vertical item drag,
  gallery swipe, menu pop and marker hover.
- Three small Aceternity-style effects in `components/ui/aceternity/` (animated modal shell,
  animated search placeholder, spotlight on the empty state). They load on demand and are
  switched off on low-end devices.
- zustand for app state and idb for IndexedDB.

## Folders

```
app/
  layout.tsx       html shell, viewport (no page zoom, viewport-fit=cover), apple web-app meta, theme script
  page.tsx         loads the client TimelineApp (no server rendering for the canvas)
  manifest.ts      PWA manifest
  globals.css      Tailwind, tokens, timeline element styles, reduced-motion rules
components/
  TimelineApp.tsx  top-level client component: boot, toasts, modal host
  header/          Toolbar, SearchBox, TypeFilter, MoreMenu, ZoomControls
  timeline/        TimelineViewport (scroll, wheel/pinch/pan, virtual window), YearAxis,
                   FloatingAxis, FloatingLabels, PersonItem, CardItem, LifeLine,
                   LinkedEventMarker, SharedEventConnector
  modals/          EntryForm/ (DateField, ColourPicker, PersonLinker, PhotoManager),
                   DetailModal, Gallery, EntryFilterModal, TrashModal, RestoreModal
  ui/aceternity/   animated-modal, placeholders-input, spotlight
lib/
  types.ts         Entry, Photo, backup v1/v2 types
  dates.ts         dp(), fmt(), fd(), Hebrew/English months, BCE handling (ported 1:1)
  layout.ts        x(year), tick step, ticks, default Y positions, line offsets, smart spacing (pure)
  search.ts        NFKD normalising; searches text fields only
  store.ts         zustand store: entries, positions, trash, hidden ids, filter, zoom, theme, height
  persistence.ts   IndexedDB (state, snapshots, image blobs), localStorage migration, quota errors
  images.ts        upload pipeline and object-URL cache
  backup.ts        .btlbackup read v1 (data URLs) and v1/v2 write v2, safety backup before restore
  csv.ts           CSV export (all text fields) and import
  device.ts        low-end detection
  sample.ts        demo / sample timeline
public/            icons/, sw.js, _headers
```

## Data flow

1. On start, `persistence.load()` reads IndexedDB. If it is empty but the old `timeline-*`
   localStorage keys exist on the same site, they are migrated once (photos are converted
   from data URLs to compressed blobs). Otherwise the demo timeline is used.
2. The zustand store holds the state. Every change is written back to IndexedDB, debounced.
   Write failures (for example a full disk) show a toast instead of failing silently.
3. Before any change to the entries, the previous entries are pushed onto a rotating list
   of the last 3 snapshots. "Recover browser data" steps back through them.
4. Theme, zoom and canvas height stay in localStorage (same keys as the original) so the
   theme can be applied before first paint.

## Photos

On upload each picture is decoded with `createImageBitmap` (EXIF orientation respected) and
resized with `OffscreenCanvas` (or a `<canvas>` fallback) into:

- a 1600 px WebP for the detail gallery,
- a 320 px WebP thumbnail for the timeline, avatars and form,
- a ~24 px blurred placeholder stored inline in the entry.

Blobs live in the IndexedDB `images` store. They are shown through cached object URLs with
`loading="lazy"`, `decoding="async"` and fixed dimensions. The timeline only ever loads
thumbnails. Browsers that cannot encode WebP fall back to JPEG. Blobs that nothing refers to
any more (not in entries, trash or snapshots) are removed at start-up.

## Rendering and performance

- The timeline is drawn by React from pure layout functions; nothing is rebuilt with `innerHTML`.
- Only items, ticks, lines and markers inside the visible window plus one screen of buffer on
  each side are rendered.
- During a wheel or pinch gesture the content layer is scaled with `transform: scaleX`; the real
  layout is recalculated once when the gesture ends.
- Floating labels stick to the left edge with CSS `position: sticky`; the floating ruler is moved
  with a transform inside one requestAnimationFrame loop. No timers poll the layout.
- Item drags move a shared motion value, so the person, its life line, its markers and any
  shared-event connectors move together without re-rendering React on every frame.
- Low-end devices (2 cores or fewer, 2 GB memory or less, Save-Data, or reduced motion) get
  no Aceternity effects, short tweens instead of springs, and `content-visibility: auto` lists.

## Storage keys

| Where        | Key                                   | Contents                          |
|--------------|---------------------------------------|-----------------------------------|
| IndexedDB    | `bible-timeline` / `kv` / `state`     | entries, positions, trash, hidden |
| IndexedDB    | `bible-timeline` / `kv` / `snapshots` | last 3 entry snapshots            |
| IndexedDB    | `bible-timeline` / `images`           | `<photoId>:full`, `<photoId>:thumb` blobs |
| localStorage | `timeline-theme`, `timeline-zoom`, `timeline-canvas-height` | view settings |

## Backups

`.btlbackup` files are JSON with `format: "BibleTimelineCompleteBackup"`.

- Version 1 (original app): photos are data URLs inside each entry (`media`, `mediaItems`, `mediaMeta`).
- Version 2 (this app): entries carry `photos` references; the image data is in a top-level
  `images` map of data URLs.

Both versions can be restored. A safety backup of the current timeline is downloaded first.
