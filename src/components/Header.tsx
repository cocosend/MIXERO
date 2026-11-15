import React from 'react';
import { Smartphone, Wallet } from 'lucide-react';
import { MixeroLogo } from './GymLogo';

interface HeaderProps {
  onOpenPWAInstall: () => void;
  onSecretAdminClick: () => void;
  adminClickCount: number;
  balance?: number;
  onOpenAccount?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPWAInstall,
  onSecretAdminClick,
  adminClickCount,
  balance,
  onOpenAccount,
}) => {
  return (
    <header className="relative flex items-center justify-between w-full pb-3.5 pt-1 border-b border-white/[0.07]">
      {/* Brand Lockup (5 taps opens Admin Panel) */}
      <button
        type="button"
        onClick={onSecretAdminClick}
        className="flex items-center gap-3 text-left cursor-pointer active:scale-[0.98] transition-transform select-none min-h-[44px]"
        title="MIXERO (5 нажатий для панели управления)"
      >
        <MixeroLogo size={42} hasGlow={true} />

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
              <span className="mixero-fade-text">MIXERO</span>
              <span className="text-base leading-none" role="img" aria-label="cassette">
                📼
              </span>
            </h1>
            {adminClickCount > 0 && adminClickCount < 5 && (
              <span className="text-[11px] font-mono text-amber-300 font-bold">
                {5 - adminClickCount}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
            No-Log · USDT Protocol
          </p>
        </div>
      </button>

      {/* Action Controls (Large Touch Targets for iPhone) */}
      <div className="flex items-center gap-2 shrink-0">
        {balance !== undefined && onOpenAccount && (
          <button
            type="button"
            onClick={onOpenAccount}
            className="min-h-[44px] px-3.5 py-2 rounded-2xl border border-white/10 bg-[#101621] hover:border-teal-400/40 text-white transition flex items-center gap-2 text-xs font-mono font-bold active:scale-[0.97] whitespace-nowrap"
            title="Открыть кабинет"
          >
            <Wallet className="w-4 h-4 text-teal-400" />
            <span className="tabular-nums text-amber-300">
              {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} $
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPWAInstall}
          className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-2xl border border-white/10 bg-[#101621] hover:border-sky-400/40 text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-[0.97] whitespace-nowrap"
          title="Установить на iPhone"
        >
          <Smartphone className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">iOS App</span>
        </button>
      </div>
    </header>
  );
};
