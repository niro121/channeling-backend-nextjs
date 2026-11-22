import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Ayu's face as a drawn icon (from the robot portrait): white helmet, green headphones, dark visor
 * and glowing green eyes. Vector, so it stays sharp at any size and never has to load.
 */
export function AyuIcon({ className, title = 'Ayu' }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f2fbf4" />
          <stop offset="100%" stopColor="#d8f0de" />
        </radialGradient>
        <linearGradient id={`${id}-helmet`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6ece8" />
        </linearGradient>
        <radialGradient id={`${id}-eye`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#d9ffe4" />
          <stop offset="45%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      <circle cx="32" cy="32" r="32" fill={`url(#${id}-bg)`} />

      {/* little shoulders */}
      <path d="M17 64c1.6-6.2 7.4-9 15-9s13.4 2.8 15 9Z" fill="#ffffff" stroke="#7cc242" strokeWidth="1.5" />

      {/* antenna */}
      <path d="M32 13.5V8.5" stroke="#7cc242" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="6.6" r="2.8" fill="#7cc242" />
      <circle cx="31.1" cy="5.7" r=".9" fill="#ffffff" opacity=".8" />

      {/* headphones, snug to the head */}
      <rect x="6" y="27" width="8" height="15" rx="4" fill="#7cc242" />
      <rect x="50" y="27" width="8" height="15" rx="4" fill="#7cc242" />
      <rect x="8" y="30" width="3.6" height="9" rx="1.8" fill="#a3e05f" />
      <rect x="52.4" y="30" width="3.6" height="9" rx="1.8" fill="#a3e05f" />

      {/* big round head */}
      <ellipse cx="32" cy="34" rx="21" ry="20.5" fill={`url(#${id}-helmet)`} stroke="#7cc242" strokeWidth="2" />
      {/* visor */}
      <rect x="15.5" y="22.5" width="33" height="22" rx="11" fill="#1b2420" />
      <path d="M19.5 27c2.6-2.4 6-3.4 9.5-3.3" stroke="#ffffff" strokeOpacity=".3" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* eyes: big, glowing, with sparkles */}
      <g filter={`url(#${id}-glow)`} opacity=".85">
        <ellipse cx="25" cy="32.5" rx="4.6" ry="5.4" fill="#4ade80" />
        <ellipse cx="39" cy="32.5" rx="4.6" ry="5.4" fill="#4ade80" />
      </g>
      <ellipse cx="25" cy="32.5" rx="3.9" ry="4.7" fill={`url(#${id}-eye)`} />
      <ellipse cx="39" cy="32.5" rx="3.9" ry="4.7" fill={`url(#${id}-eye)`} />
      <circle cx="26.5" cy="30.4" r="1.5" fill="#ffffff" />
      <circle cx="40.5" cy="30.4" r="1.5" fill="#ffffff" />
      <circle cx="23.9" cy="34.6" r=".7" fill="#ffffff" opacity=".8" />
      <circle cx="37.9" cy="34.6" r=".7" fill="#ffffff" opacity=".8" />

      {/* smile */}
      <path d="M29 39.6c1.9 1.6 4.1 1.6 6 0" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" fill="none" />

      {/* cheeks */}
      <ellipse cx="18.5" cy="47" rx="3" ry="1.7" fill="#f9a8b8" opacity=".75" />
      <ellipse cx="45.5" cy="47" rx="3" ry="1.7" fill="#f9a8b8" opacity=".75" />

      {/* helmet shine */}
      <path d="M19 19.5c2.6-2.6 6-4.2 9.6-4.6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Ayu's face in a round frame, sized in pixels. */
export function AyuAvatar({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 overflow-hidden rounded-full', className)} style={{ width: size, height: size }}>
      <AyuIcon className="h-full w-full" />
    </span>
  );
}
