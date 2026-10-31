'use client';

import dynamic from 'next/dynamic';

// The timeline depends on window size, IndexedDB and pointer input, so it is only rendered in the browser.
const TimelineApp = dynamic(() => import('./TimelineApp'), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center text-[15px] font-bold text-muted" role="status">
      Loading your timeline…
    </div>
  ),
});

export default function ClientApp() {
  return <TimelineApp />;
}
