
import React, { useState, useEffect } from 'react';
import { ArrowRight, Camera, Sparkles, Wallet, Zap, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();

  const handleClose = () => {
    onClose();
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const steps = [
    {
      id: 'intro',
      icon: <Sparkles size={48} className="text-white drop-shadow-lg" />,
      // Deep Cosmic Blue/Purple
      bg: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-800',
      blobColor: 'bg-blue-400/30',
      title: t('ob_intro_title'),
      subtitle: t('ob_intro_subtitle'),
      description: t('ob_intro_desc'),
    },
    {
      id: 'requester',
      icon: <Camera size={48} className="text-white drop-shadow-lg" />,
      // Vibrant Sky/Cyan
      bg: 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-400',
      blobColor: 'bg-white/20',
      title: t('ob_req_title'),
      subtitle: t('ob_req_subtitle'),
      description: t('ob_req_desc'),
    },
    {
      id: 'provider',
      icon: <Wallet size={48} className="text-white drop-shadow-lg" />,
      // Rich Emerald/Green
      bg: 'bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600',
      blobColor: 'bg-yellow-400/20',
      title: t('ob_prov_title'),
      subtitle: t('ob_prov_subtitle'),
      description: t('ob_prov_desc'),
    },
    {
      id: 'start',
      icon: <Zap size={48} className="text-yellow-400 fill-yellow-400 drop-shadow-lg" />,
      // Sleek Dark Mode
      bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-black',
      blobColor: 'bg-indigo-500/30',
      title: t('ob_ready_title'),
      subtitle: t('ob_ready_subtitle'),
      description: t('ob_ready_desc'),
    }
  ];

  const currentData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
      {/* Darkened Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-700"></div>

      {/* Main Card */}
      <div
        className={`
            relative w-full max-w-md h-[600px] max-h-[85vh] 
            rounded-[40px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] 
            overflow-hidden flex flex-col 
            transition-all duration-700 ease-in-out
            ${currentData.bg}
            ring-1 ring-white/10
        `}
      >
        {/* --- DYNAMIC BACKGROUND FX --- */}
        {/* Moving Blob 1 */}
        <div className={`absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full blur-[80px] transition-all duration-1000 ${currentData.blobColor} animate-pulse`}></div>
        {/* Moving Blob 2 */}
        <div className={`absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full blur-[60px] transition-all duration-1000 ${currentData.blobColor} opacity-60`} style={{ animationDelay: '1s' }}></div>
        {/* Noise Texture for Texture */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>

        {/* --- HEADER CONTROLS --- */}
        <div className="relative z-30 flex justify-between items-start p-6">
          <div className="bg-white/10 backdrop-blur-md rounded-full border border-white/10">
            <LanguageSwitcher variant="light" align="left" />
          </div>

          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md text-white/80 text-[10px] font-bold uppercase tracking-wider transition-all hover:text-white border border-white/5"
          >
            {t('skip')}
          </button>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 relative z-20 flex flex-col items-center justify-center text-center px-8 pb-12">

          {/* Animated Icon Container */}
          <div key={currentStep + 'icon'} className="mb-6 relative group">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl transform group-hover:scale-125 transition-transform duration-500"></div>
            <div className="relative w-28 h-28 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in duration-500 floating-animation">
              {currentData.icon}
            </div>
          </div>

          {/* Text Content */}
          <div key={currentStep + 'text'} className="space-y-3 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm mb-2">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                {currentData.subtitle}
              </span>
            </div>

            <h2 className="text-4xl font-black text-white leading-[1.1] tracking-tight drop-shadow-sm">
              {currentData.title}
            </h2>

            <p className="text-base text-blue-50/90 font-medium leading-relaxed max-w-xs mx-auto">
              {currentData.description}
            </p>
          </div>
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="relative z-30 p-6 pt-0 mt-auto">
          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${idx === currentStep
                    ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                    : 'w-1.5 bg-white/20'
                  }`}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            onClick={nextStep}
            className="w-full py-3.5 bg-white text-slate-900 rounded-[20px] font-black text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
          >
            <span className="relative z-10">{currentStep === steps.length - 1 ? t('start') : t('next')}</span>
            <div className="bg-slate-100 p-1 rounded-full group-hover:translate-x-1 transition-transform relative z-10">
              {currentStep === steps.length - 1 ? <Check size={16} strokeWidth={4} /> : <ArrowRight size={16} strokeWidth={4} />}
            </div>
          </button>
        </div>

      </div>

      {/* Floating Animation CSS */}
      <style>{`
        .floating-animation {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};
