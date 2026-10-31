'use client';

// A soft animated spotlight background. Adapted from the idea behind Aceternity UI's "Spotlight"
// component (written for this app: one SVG ellipse, CSS-only animation, no extra dependencies).
export default function Spotlight({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute -top-24 left-1/2 h-[140%] w-[140%] -translate-x-1/2 animate-[spotlight_2.2s_ease-out_forwards] opacity-0 ${className}`}
      viewBox="0 0 1200 800"
      fill="none"
    >
      <defs>
        <filter id="spotlight-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="90" />
        </filter>
      </defs>
      <ellipse cx="600" cy="260" rx="420" ry="150" fill="var(--accent)" fillOpacity="0.22" filter="url(#spotlight-blur)" />
    </svg>
  );
}
