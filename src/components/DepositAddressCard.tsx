import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface DepositAddressCardProps {
  address: string;
  label?: string;
  network?: string;
  hintText?: string;
  className?: string;
}

export const DepositAddressCard: React.FC<DepositAddressCardProps> = ({
  address,
  label = 'Адрес депозита (Pool Vault)',
  network,
  hintText,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    triggerHaptic([35, 20, 45]);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(address).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className={`space-y-2 select-none ${className}`}>
      <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
        <span className="font-medium">
          {label} {network ? `· ${network}` : ''}
        </span>
        <span className={`font-mono text-[11px] font-semibold ${copied ? 'text-teal-300' : 'text-slate-500'}`}>
          {copied ? 'Скопировано' : 'Нажмите, чтобы скопировать'}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`w-full text-left group rounded-2xl p-4 min-h-[56px] transition-all duration-200 border flex items-center justify-between gap-3 active:scale-[0.985] ${
          copied
            ? 'bg-gradient-to-r from-fuchsia-950/75 via-purple-950/75 to-indigo-950/65 border-fuchsia-400/80 shadow-[0_0_24px_rgba(255,38,240,0.32)]'
            : 'bg-[#0b0328]/85 border-fuchsia-300/20 hover:border-fuchsia-400/50'
        }`}
      >
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-mono font-semibold break-all block leading-snug ${
              copied ? 'text-fuchsia-200' : 'text-white'
            }`}
          >
            {address}
          </span>
          {hintText && (
            <span className="text-[11px] text-purple-200/75 block pt-1 font-sans">
              {hintText}
            </span>
          )}
        </div>

        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            copied
              ? 'mixero-cta'
              : 'bg-[#19064f] border border-fuchsia-300/20 text-purple-100 group-hover:text-white'
          }`}
        >
          {copied ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
        </div>
      </button>
    </div>
  );
};
