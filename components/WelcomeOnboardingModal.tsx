
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Camera, Sparkles, ShieldCheck, Wallet, ChevronRight, Zap, Star } from 'lucide-react';

export const WelcomeOnboardingModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let shouldShow = true;
    try {
        // Check if user has seen onboarding safely
        const hasSeen = localStorage.getItem('needo_onboarding_seen');
        if (hasSeen) {
            shouldShow = false;
        }
    } catch (e) {
        // Fallback for restricted environments (e.g. Incognito / Iframes)
        console.warn("LocalStorage access denied, skipping persistent check.");
    }

    if (shouldShow) {
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    try {
        localStorage.setItem('needo_onboarding_seen', 'true');
    } catch (e) {
        // Silent fail
    }
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
      icon: <Sparkles size={40} className="text-white" />,
      bg: 'bg-gradient-to-br from-blue-600 to-indigo-600',
      title: 'Добре дошли в Needo',
      subtitle: 'Платформата от бъдещето',
      description: 'NeeDo е разработен с цел да помогне на хората да намерят най-подходящите услуги по най-изгодния и прозрачен начин. Вярваме, че всеки трябва да има достъп до качествени услуги на справедливи цени.',
      benefits: []
    },
    {
      id: 'requester',
      icon: <Camera size={40} className="text-white" />,
      bg: 'bg-gradient-to-br from-sky-400 to-blue-500',
      title: 'Имаш проблем? Снимай го!',
      subtitle: 'За Възложители',
      description: 'Край на дългите обяснения. Просто снимай проблема (спукана тръба, нужда от ремонт, мръсен диван) и нашият AI ще напише задачата вместо теб.',
      benefits: [
        'AI Анализ на снимки',
        'Без губене на време',
        'Сравняване на оферти'
      ]
    },
    {
      id: 'provider',
      icon: <Wallet size={40} className="text-white" />,
      bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      title: 'Печели от уменията си',
      subtitle: 'За Изпълнители',
      description: 'Търсиш допълнителни доходи? Намери задачи близо до теб, кандидатствай и получавай парите си сигурно чрез нашата Escrow система.',
      benefits: [
        'Гарантирано плащане',
        'Гъвкаво работно време',
        'Бърз достъп до клиенти'
      ]
    },
    {
      id: 'start',
      icon: <Zap size={40} className="text-white" />,
      bg: 'bg-slate-900',
      title: 'Готови ли сте?',
      subtitle: 'Стартирай сега',
      description: 'Присъедини се към хиляди потребители, които вече използват Needo за по-лесен и уреден живот.',
      benefits: []
    }
  ];

  const currentData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-500"></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ring-1 ring-white/10">
        
        {/* Top Graphics Area */}
        <div className={`relative h-48 ${currentData.bg} transition-colors duration-500 flex items-center justify-center overflow-hidden shrink-0`}>
           {/* Abstract Circles */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse"></div>
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-5 -mb-5"></div>
           
           {/* Icon with Ring Animation */}
           <div key={currentStep} className="relative z-10 p-5 bg-white/20 backdrop-blur-md rounded-full shadow-lg border border-white/20 animate-in zoom-in spin-in-3 duration-500">
              {currentData.icon}
           </div>

           {/* Skip Button */}
           <button 
             onClick={handleClose} 
             className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm transition-colors z-20"
           >
             ПРОПУСНИ
           </button>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 flex-1 flex flex-col text-center">
            
            <div key={currentStep + 'text'} className="animate-in slide-in-from-right-4 fade-in duration-300">
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2 block">{currentData.subtitle}</span>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 leading-tight">{currentData.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">
                    {currentData.description}
                </p>

                {/* Benefits List (if any) */}
                {currentData.benefits.length > 0 && (
                   <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {currentData.benefits.map((benefit, idx) => (
                         <span key={idx} className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-100 flex items-center gap-1 shadow-sm">
                            <ShieldCheck size={12} className="text-green-500" /> {benefit}
                         </span>
                      ))}
                   </div>
                )}
            </div>

            {/* Navigation & Progress */}
            <div className="mt-auto pt-4">
                {/* Dots */}
                <div className="flex justify-center gap-2 mb-6">
                    {steps.map((_, idx) => (
                        <div 
                           key={idx} 
                           className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-blue-600' : 'w-1.5 bg-slate-200'}`} 
                        />
                    ))}
                </div>

                <button 
                    onClick={nextStep}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-300 hover:bg-blue-600 hover:shadow-blue-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                    {currentStep === steps.length - 1 ? 'Започни Сега' : 'Напред'} 
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
