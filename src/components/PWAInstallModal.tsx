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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md mixero-card rounded-3xl p-6 relative text-slate-100 pb-safe">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-2xl bg-[#0d121b] border border-white/10 transition"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5 pr-10">
          <MixeroLogo size={48} hasGlow={true} />
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span className="mixero-fade-text">MIXERO</span> 📼
            </h3>
            <p className="text-xs text-slate-400">
              Установка на главный экран iPhone
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-5 text-center my-3 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto" />
            <p className="text-sm font-bold text-white">Приложение установлено</p>
            <p className="text-xs text-slate-300">
              MIXERO запущено в полноэкранном режиме PWA.
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-3 my-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              Добавьте MIXERO на рабочий стол iPhone для быстрого доступа без адресной строки:
            </p>

            <div className="space-y-3 bg-[#080c12] border border-white/8 rounded-2xl p-4 text-sm text-slate-200">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#111824] border border-white/10 flex items-center justify-center shrink-0 text-sky-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <span>
                  1. Нажмите <strong>«Поделиться»</strong> внизу экрана Safari.
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#111824] border border-white/10 flex items-center justify-center shrink-0 text-teal-400">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <span>
                  2. Выберите <strong>«На экран «Домой»»</strong>.
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#111824] border border-white/10 flex items-center justify-center shrink-0 text-amber-400">
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
            <p className="text-sm text-slate-300">
              Установите MIXERO как отдельное приложение для мгновенного запуска.
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
              <span>Установить MIXERO</span>
            </button>
          </div>
        ) : (
          <div className="my-3 text-sm text-slate-300 leading-relaxed">
            Откройте меню браузера и выберите <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong>.
          </div>
        )}

        <div className="pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] bg-[#111824] hover:bg-[#172030] border border-white/10 text-slate-200 font-bold text-sm rounded-2xl transition active:scale-[0.98]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
