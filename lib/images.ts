import { getImage, imageKey, putImages } from './persistence';
import type { Photo, SourceInfo } from './types';

export const FULL_SIZE = 1600;
export const THUMB_SIZE = 320;
export const BLUR_SIZE = 24;

export function newPhotoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      // randomUUID needs a secure context (https or localhost); fall through.
    }
  }
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Scales (w, h) so the longer side is at most `max`. Never enlarges. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

type Source = ImageBitmap | HTMLImageElement;

/** Decodes an image. createImageBitmap applies EXIF orientation with imageOrientation: 'from-image'. */
async function decode(blob: Blob): Promise<{ src: Source; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      // Some browsers cannot decode every format this way; fall back to <img>.
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('This picture could not be read.');
  }
  // <img> applies EXIF orientation by default (CSS image-orientation: from-image).
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

async function encode(src: Source, w: number, h: number, quality: number): Promise<Blob> {
  const draw = (ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D) => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
  };
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const c = new OffscreenCanvas(w, h);
      const ctx = c.getContext('2d');
      if (ctx) {
        draw(ctx);
        const webp = await c.convertToBlob({ type: 'image/webp', quality });
        if (webp.type === 'image/webp') return webp;
        return await c.convertToBlob({ type: 'image/jpeg', quality });
      }
    } catch {
      // Fall back to a normal canvas below.
    }
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  draw(ctx);
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => c.toBlob(resolve, type, quality));
  const webp = await toBlob('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob('image/jpeg');
  if (!jpeg) throw new Error('This picture could not be converted.');
  return jpeg;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error('Not a data URL');
  const type = m[1] || 'application/octet-stream';
  if (!m[2]) return new Blob([decodeURIComponent(m[3])], { type });
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export interface ProcessedImage {
  full: Blob;
  thumb: Blob;
  blur: string;
  w: number;
  h: number;
}

/** Makes the 1600 px, 320 px and blurred versions of a picture. */
export async function processImage(file: Blob): Promise<ProcessedImage> {
  const { src, w, h, close } = await decode(file);
  try {
    const f = fitWithin(w, h, FULL_SIZE);
    const t = fitWithin(w, h, THUMB_SIZE);
    const b = fitWithin(w, h, BLUR_SIZE);
    const full = await encode(src, f.w, f.h, 0.82);
    const thumb = await encode(src, t.w, t.h, 0.78);
    const blur = await blobToDataUrl(await encode(src, b.w, b.h, 0.5));
    return { full, thumb, blur, w: f.w, h: f.h };
  } finally {
    close();
  }
}

const emptySource: SourceInfo = { sourceTitle: '', sourceUrl: '', reference: '' };

/** Processes a picture and stores both sizes in IndexedDB. */
export async function importPhoto(file: Blob, meta: Partial<SourceInfo> = {}): Promise<Photo> {
  const p = await processImage(file);
  const id = newPhotoId();
  await putImages([
    { key: imageKey(id, 'full'), blob: p.full },
    { key: imageKey(id, 'thumb'), blob: p.thumb },
  ]);
  return { ...emptySource, ...meta, id, w: p.w, h: p.h, blur: p.blur };
}

/** Converts an old base64 data URL photo (old backups and old localStorage). */
export async function importDataUrlPhoto(dataUrl: string, meta: Partial<SourceInfo> = {}): Promise<Photo | null> {
  try {
    return await importPhoto(dataUrlToBlob(dataUrl), meta);
  } catch {
    return null;
  }
}

// ---- object-URL cache -------------------------------------------------------

const urlCache = new Map<string, Promise<string | null>>();

/** Cached object URL for a stored photo. The timeline asks for 'thumb' only. */
export function photoUrl(photoId: string, size: 'full' | 'thumb'): Promise<string | null> {
  const key = imageKey(photoId, size);
  let p = urlCache.get(key);
  if (!p) {
    p = getImage(key)
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    urlCache.set(key, p);
  }
  return p;
}

/** Synchronous peek, so already-loaded photos render without a flash. */
const resolved = new Map<string, string | null>();
export function cachedPhotoUrl(photoId: string, size: 'full' | 'thumb'): string | null | undefined {
  return resolved.get(imageKey(photoId, size));
}
export async function loadPhotoUrl(photoId: string, size: 'full' | 'thumb'): Promise<string | null> {
  const url = await photoUrl(photoId, size);
  resolved.set(imageKey(photoId, size), url);
  return url;
}

export function forgetPhotoUrls(photoIds: Iterable<string>): void {
  for (const id of photoIds) {
    for (const size of ['full', 'thumb'] as const) {
      const key = imageKey(id, size);
      const url = resolved.get(key);
      if (url) URL.revokeObjectURL(url);
      resolved.delete(key);
      urlCache.delete(key);
    }
  }
}
