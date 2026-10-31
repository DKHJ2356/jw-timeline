'use client';

import { useEffect, useState } from 'react';
import { cachedPhotoUrl, loadPhotoUrl } from '@/lib/images';
import type { Photo } from '@/lib/types';

export function usePhotoUrl(photoId: string | undefined, size: 'full' | 'thumb'): string | null {
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null);
  const key = photoId ? `${photoId}:${size}` : '';
  useEffect(() => {
    if (!photoId) return;
    let alive = true;
    loadPhotoUrl(photoId, size).then((url) => {
      if (alive) setState({ key: `${photoId}:${size}`, url });
    });
    return () => {
      alive = false;
    };
  }, [photoId, size]);
  if (!photoId) return null;
  const cached = cachedPhotoUrl(photoId, size);
  if (cached !== undefined) return cached;
  return state?.key === key ? state.url : null;
}

interface Props {
  photo: Photo;
  size: 'full' | 'thumb';
  /** Display size in CSS px (sets width/height attributes so layout never jumps). */
  width: number;
  height: number;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
}

/** A stored photo with a blurred placeholder until the real image has loaded. */
export default function PhotoImg({ photo, size, width, height, alt = '', className, style, eager }: Props) {
  const url = usePhotoUrl(photo.id, size);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loaded = !!url && loadedUrl === url;
  return (
    // Stored photos are local blob URLs, which next/image cannot optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url ?? photo.blur}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => url && setLoadedUrl(url)}
      className={className}
      style={{ ...style, filter: loaded ? undefined : 'blur(6px)', transition: 'filter .2s ease' }}
    />
  );
}
