'use client';

import { requestZoom } from '@/lib/zoomBus';
import { useStore } from '@/lib/store';

export function zoomLabel(z: number): string {
  return z.toFixed(1).replace('.0', '') + '×';
}

export default function ZoomControls() {
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Timeline zoom">
      <button className="btn px-0" onClick={() => requestZoom(zoom / 1.5, setZoom)} aria-label="Zoom out">
        −
      </button>
      <b className="min-w-[44px] text-center tabular-nums" aria-live="polite">
        {zoomLabel(zoom)}
      </b>
      <button className="btn px-0" onClick={() => requestZoom(zoom * 1.5, setZoom)} aria-label="Zoom in">
        ＋
      </button>
    </div>
  );
}

export function HeightControls() {
  const canvasH = useStore((s) => s.canvasH);
  const setCanvasH = useStore((s) => s.setCanvasH);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Timeline height">
      <button className="btn px-0" onClick={() => setCanvasH(canvasH - 400)} aria-label="Less height">
        ↕−
      </button>
      <b className="min-w-[58px] text-center tabular-nums">{canvasH}px</b>
      <button className="btn px-0" onClick={() => setCanvasH(canvasH + 400)} aria-label="More height">
        ↕＋
      </button>
    </div>
  );
}
