import React from 'react';
import { Download, Share2, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { MixeroLogo } from './GymLogo';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-[#022024]/50 backdrop-blur-sm">
      <div className="w-full max-w-md mixero-card rounded-3xl p-6 relative text-[#F2FCFC] pb-safe">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-11 h-11 flex items-center justify-center text-[#F2FCFC] hover:border-[#FF9436] rounded-2xl mixero-pill transition"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5 pr-10">
          <MixeroLogo size={48} hasGlow={true} />
          <div>
            <h3 className="mixero-display text-base font-extrabold text-[#F2FCFC] flex items-center">
              <span>MIXERO</span>
              <span className="text-[#FF8424] mx-0.5">•</span>
              <span>CRYPTO</span>
            </h3>
            <p className="text-xs text-[#96C8CB] font-semibold">
              iOS / PWA приложение на главный экран
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="bg-[#063E2A]/90 border border-[#22D96E]/50 rounded-2xl p-5 text-center my-3 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#42F28B] mx-auto" />
            <p className="text-sm font-extrabold text-[#F2FCFC]">Приложение установлено</p>
            <p className="text-xs text-[#96C8CB] font-medium">
              MIXERO запущено в полноэкранном режиме iOS PWA.
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-3 my-3">
            <p className="text-sm text-[#96C8CB] leading-relaxed font-medium">
              Добавьте <strong className="text-[#F2FCFC]">MIXERO•CRYPTO</strong> на рабочий стол iPhone для мгновенного запуска в полноэкранном нативном режиме без адресной строки:
            </p>

            <div className="space-y-3 mixero-inset rounded-2xl p-4 text-sm text-[#F2FCFC]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#022024] text-[#FF9838] flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <span>
                  1. Нажмите <strong>«Поделиться»</strong> внизу экрана Safari.
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FF8424] border border-[#FFB36B] text-[#140800] flex items-center justify-center shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <span>
                  2. Выберите <strong>«На экран «Домой»»</strong>.
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#063E2A]/90 border border-[#22D96E]/50 text-[#42F28B] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>
                  3. Нажмите <strong>«Добавить»</strong> в правом верхнем углу.
                </span>
              </div>
            </div>
          </div>
        ) : isInstallable ? (
          <div className="space-y-4 my-3">
            <p className="text-sm text-[#96C8CB] font-medium">
              Установите MIXERO•CRYPTO как отдельное приложение для мгновенного запуска и работы с протоколом.
            </p>
            <button
              type="button"
              onClick={async () => {
                const res = await install();
                if (res) onClose();
              }}
              className="w-full min-h-[52px] px-4 mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Установить MIXERO•CRYPTO</span>
            </button>
          </div>
        ) : (
          <div className="my-3 text-sm text-[#96C8CB] leading-relaxed font-medium">
            Откройте меню браузера и выберите <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong>.
          </div>
        )}

        <div className="pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] mixero-secondary-btn font-bold text-sm rounded-2xl transition active:scale-[0.98]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
