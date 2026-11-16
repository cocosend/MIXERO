import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#022024',
        light: '#FFFFFF',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-[#03252A]/85 rounded-2xl border border-[#22A8AC]/35 ${className}`}
      >
        <span className="text-xs text-[#96C8CB] font-mono">QR...</span>
      </div>
    );
  }

  return (
    <div className={`p-3 bg-white rounded-2xl border border-[#FF9838]/60 shadow-lg flex items-center justify-center ${className}`}>
      <img
        src={dataUrl}
        alt={`QR code for ${value}`}
        width={size}
        height={size}
        className="block rounded-lg"
      />
    </div>
  );
};
