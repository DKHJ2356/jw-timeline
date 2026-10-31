/** Lets the zoom buttons ask the timeline viewport to zoom while keeping the view centred. */
type Handler = (zoom: number) => void;
let handler: Handler | null = null;

export function registerZoomHandler(h: Handler | null) {
  handler = h;
}

export function requestZoom(zoom: number, fallback: (z: number) => void) {
  if (handler) handler(zoom);
  else fallback(zoom);
}
