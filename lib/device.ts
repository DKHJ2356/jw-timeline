/**
 * Low-end device detection. True for 2 CPU cores or fewer, 2 GB memory or less,
 * Save-Data turned on, or a reduced-motion preference.
 */
export function detectLowEnd(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const saveData = !!nav.connection?.saveData;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return cores <= 2 || memory <= 2 || saveData || reducedMotion;
}

export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
}
