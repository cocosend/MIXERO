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
          className="absolute inset-0 rounded-2xl blur-lg opacity-60 pointer-events-none scale-95"
          style={{
            background:
              'linear-gradient(135deg, rgba(56,189,248,0.45) 0%, rgba(45,212,191,0.4) 50%, rgba(251,191,36,0.4) 100%)',
          }}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_6px_16px_rgba(0,0,0,0.65)] select-none"
      >
        <defs>
          <linearGradient id="mixero_chassis" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#161f2c" />
            <stop offset="55%" stopColor="#0d121b" />
            <stop offset="100%" stopColor="#070a0f" />
          </linearGradient>

          <linearGradient id="mixero_neon_fade" x1="12" y1="20" x2="88" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          <linearGradient id="mixero_warm_fade" x1="25" y1="30" x2="75" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          <linearGradient id="mixero_rim" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.55" />
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
          strokeWidth="1.6"
        />

        {/* Subtle Top Sheen */}
        <path
          d="M 14 14 Q 50 6 86 14"
          stroke="#ffffff"
          strokeOpacity="0.22"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Minimalist Cassette Body (📼) */}
        <rect
          x="15"
          y="26"
          width="70"
          height="46"
          rx="9"
          fill="#0a0e16"
          stroke="url(#mixero_neon_fade)"
          strokeWidth="2.2"
        />

        {/* Top Tape Label Stripe */}
        <rect x="21" y="31" width="58" height="8" rx="3" fill="url(#mixero_neon_fade)" fillOpacity="0.22" />
        <line x1="24" y1="35" x2="76" y2="35" stroke="url(#mixero_neon_fade)" strokeWidth="1.4" strokeLinecap="round" />

        {/* Tape Window */}
        <rect
          x="23"
          y="43"
          width="54"
          height="16"
          rx="8"
          fill="#06090e"
          stroke="#334155"
          strokeWidth="1.1"
        />

        {/* Left & Right Reels */}
        <circle cx="35" cy="51" r="6.2" fill="#0d141f" stroke="#38bdf8" strokeWidth="1.8" />
        <circle cx="35" cy="51" r="2.1" fill="#38bdf8" />

        <circle cx="65" cy="51" r="6.2" fill="#0d141f" stroke="#fbbf24" strokeWidth="1.8" />
        <circle cx="65" cy="51" r="2.1" fill="#fbbf24" />

        {/* Tape Bridge Line */}
        <line x1="41.5" y1="51" x2="58.5" y2="51" stroke="url(#mixero_warm_fade)" strokeWidth="1.8" strokeLinecap="round" />

        {/* Cassette Bottom Trapezoid */}
        <path
          d="M 28 72 L 33 63 L 67 63 L 72 72 Z"
          fill="#111824"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        <circle cx="40" cy="67.5" r="1.3" fill="#2dd4bf" />
        <circle cx="60" cy="67.5" r="1.3" fill="#fbbf24" />
      </svg>
    </div>
  );
};

export const GymLogo = MixeroLogo;
