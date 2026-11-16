import React from 'react';
import { Smartphone, Wallet } from 'lucide-react';
import { MixeroLogo } from './GymLogo';

interface HeaderProps {
  onOpenPWAInstall: () => void;
  onSecretAdminClick: () => void;
  balance?: number;
  onOpenAccount?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPWAInstall,
  onSecretAdminClick,
  balance,
  onOpenAccount,
}) => {
  return (
    <header className="relative flex items-center justify-between w-full pb-3.5 pt-1 border-b border-[#22A8AC]/28 gap-2">
      {/* Brand Lockup */}
      <button
        type="button"
        onClick={onSecretAdminClick}
        className="flex items-center gap-2.5 sm:gap-3 text-left cursor-pointer active:scale-[0.98] transition-transform select-none min-h-[44px] min-w-0"
        title="MIXERO•CRYPTO"
      >
        <MixeroLogo size={42} hasGlow={true} />

        <div className="min-w-0">
          <h1 className="mixero-display font-extrabold text-[14px] sm:text-lg tracking-[-0.02em] text-[#F2FCFC] flex items-center whitespace-nowrap">
            <span>MIXERO</span>
            <span className="text-[#FF8424] mx-0.5">•</span>
            <span>CRYPTO</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.06em] text-[#96C8CB] font-bold whitespace-nowrap">
            NO-LOG USDT · PROTOCOL
          </p>
        </div>
      </button>

      {/* Action Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {balance !== undefined && onOpenAccount && (
          <button
            type="button"
            onClick={onOpenAccount}
            className="min-h-[44px] px-3.5 rounded-xl mixero-pill text-[#F2FCFC] hover:border-[#FF9436] transition flex items-center gap-2 text-xs font-mono font-bold active:scale-[0.97] whitespace-nowrap"
            title="Открыть кабинет"
          >
            <Wallet className="w-4 h-4 text-[#FF9838]" />
            <span className="tabular-nums">
              {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} $
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPWAInstall}
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl mixero-secondary-btn transition flex items-center justify-center gap-1.5 text-xs font-bold active:scale-[0.97] whitespace-nowrap"
          title="Установить на iPhone"
        >
          <Smartphone className="w-4 h-4 text-[#FF9838]" />
          <span className="hidden sm:inline">iOS App</span>
        </button>
      </div>
    </header>
  );
};
