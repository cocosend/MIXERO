import React, { useState } from 'react';

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
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {hasGlow && (
        <div
          className="absolute inset-0 rounded-2xl blur-md opacity-75 pointer-events-none scale-95"
          style={{
            background:
              'linear-gradient(135deg, rgba(38,208,212,0.85) 0%, rgba(255,132,36,0.9) 100%)',
          }}
        />
      )}

      {!imgError ? (
        <img
          src="/app-icon.png"
          alt="MIXERO•CRYPTO"
          width={size}
          height={size}
          onError={() => setImgError(true)}
          className="w-full h-full relative z-10 rounded-2xl object-cover border border-[#FF9838]/45 shadow-[0_6px_16px_rgba(0,16,18,0.65)] select-none pointer-events-none"
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 rounded-2xl drop-shadow-[0_6px_14px_rgba(0,16,18,0.58)] select-none"
        >
          <rect width="100" height="100" rx="22" fill="#03262A" stroke="#FF8424" strokeWidth="2.5" />
          <path
            d="M50 14 L79 25 V48 C79 67 66 80 50 87 C34 80 21 67 21 48 V25 Z"
            fill="#074B52"
            stroke="#FF9838"
            strokeWidth="2.5"
          />
          <rect x="23" y="34" width="54" height="32" rx="5" fill="#021D21" stroke="#FF8424" strokeWidth="2" />
          <circle cx="38" cy="48" r="6.5" fill="#FF8424" />
          <circle cx="62" cy="48" r="6.5" fill="#FF8424" />
        </svg>
      )}
    </div>
  );
};

export const GymLogo = MixeroLogo;
