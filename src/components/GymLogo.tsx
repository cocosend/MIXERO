import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  hasGlow?: boolean;
}

export const MixeroLogo: React.FC<LogoProps> = ({
  size = 42,
  className = '',
  hasGlow = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {hasGlow && (
        <div
          className="absolute inset-0 rounded-2xl blur-lg opacity-75 pointer-events-none scale-95"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,0,230,0.65) 0%, rgba(143,31,255,0.55) 50%, rgba(58,43,255,0.55) 100%)',
          }}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_6px_16px_rgba(20,0,70,0.7)] select-none"
      >
        <defs>
          <linearGradient id="mixero_chassis" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#26055e" />
            <stop offset="55%" stopColor="#14033d" />
            <stop offset="100%" stopColor="#0b0226" />
          </linearGradient>

          <linearGradient id="mixero_neon_fade" x1="12" y1="20" x2="88" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff29f2" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#5b4dff" />
          </linearGradient>

          <linearGradient id="mixero_warm_fade" x1="25" y1="30" x2="75" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff7af8" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>

          <linearGradient id="mixero_rim" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff4df6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Outer Chassis */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="26"
          fill="url(#mixero_chassis)"
          stroke="url(#mixero_rim)"
          strokeWidth="1.8"
        />

        {/* Subtle Top Sheen */}
        <path
          d="M 14 14 Q 50 6 86 14"
          stroke="#ffffff"
          strokeOpacity="0.32"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Minimalist Cassette Body (📼) */}
        <rect
          x="15"
          y="26"
          width="70"
          height="46"
          rx="9"
          fill="#0f032e"
          stroke="url(#mixero_neon_fade)"
          strokeWidth="2.3"
        />

        {/* Top Tape Label Stripe */}
        <rect x="21" y="31" width="58" height="8" rx="3" fill="url(#mixero_neon_fade)" fillOpacity="0.28" />
        <line x1="24" y1="35" x2="76" y2="35" stroke="url(#mixero_neon_fade)" strokeWidth="1.5" strokeLinecap="round" />

        {/* Tape Window */}
        <rect
          x="23"
          y="43"
          width="54"
          height="16"
          rx="8"
          fill="#08011c"
          stroke="#a855f7"
          strokeOpacity="0.45"
          strokeWidth="1.1"
        />

        {/* Left & Right Reels */}
        <circle cx="35" cy="51" r="6.2" fill="#170442" stroke="#ff5cf7" strokeWidth="1.8" />
        <circle cx="35" cy="51" r="2.2" fill="#ffd1fd" />

        <circle cx="65" cy="51" r="6.2" fill="#170442" stroke="#7c73ff" strokeWidth="1.8" />
        <circle cx="65" cy="51" r="2.2" fill="#e0dcff" />

        {/* Tape Bridge Line */}
        <line x1="41.5" y1="51" x2="58.5" y2="51" stroke="url(#mixero_warm_fade)" strokeWidth="1.8" strokeLinecap="round" />

        {/* Cassette Bottom Trapezoid */}
        <path
          d="M 28 72 L 33 63 L 67 63 L 72 72 Z"
          fill="#1b0547"
          stroke="#ffffff"
          strokeOpacity="0.24"
          strokeWidth="1"
        />
        <circle cx="40" cy="67.5" r="1.4" fill="#ff5cf7" />
        <circle cx="60" cy="67.5" r="1.4" fill="#818cf8" />
      </svg>
    </div>
  );
};

export const GymLogo = MixeroLogo;
