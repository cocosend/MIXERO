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
      <div className="flex items-center justify-between text-xs text-[#96C8CB] px-0.5">
        <span className="font-bold text-[#F2FCFC]">
          {label} {network ? `· ${network}` : ''}
        </span>
        <span className={`font-mono text-[11px] font-bold ${copied ? 'text-[#42F28B]' : 'text-[#96C8CB]'}`}>
          {copied ? 'Скопировано' : 'Нажмите, чтобы скопировать'}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`w-full text-left group rounded-2xl p-4 min-h-[56px] transition-all duration-200 flex items-center justify-between gap-3 active:scale-[0.985] ${
          copied
            ? 'bg-[#073B40]/90 border border-[#FF8C2E]/55'
            : 'mixero-inset hover:border-[#FF9436]'
        }`}
      >
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-mono font-bold break-all block leading-snug ${
              copied ? 'text-[#F2FCFC]' : 'text-[#F2FCFC]'
            }`}
          >
            {address}
          </span>
          {hintText && (
            <span className="text-xs text-[#96C8CB] block pt-1 font-sans">
              {hintText}
            </span>
          )}
        </div>

        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            copied
              ? 'mixero-cta'
              : 'bg-[#042E34] border border-[#FF8C2E]/40 text-[#F2FCFC]'
          }`}
        >
          {copied ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Copy className="w-4 h-4 text-[#FF9838]" />}
        </div>
      </button>
    </div>
  );
};
