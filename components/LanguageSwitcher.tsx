
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronDown, Check, Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'light' | 'dark'; // light = white text (for dark bg), dark = dark text (for light bg)
  align?: 'left' | 'right';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '', 
  variant = 'light',
  align = 'left' 
}) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'bg', label: 'Български', flag: '🇧🇬' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' }
  ] as const;

  const currentLang = languages.find(l => l.code === language) || languages[0];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseButtonStyles = variant === 'light' 
    ? 'bg-black/30 text-white hover:bg-black/40 border-white/20 shadow-lg' 
    : 'bg-white/90 text-slate-900 hover:bg-white border-slate-200 shadow-lg';

  return (
    <div className={`relative z-[60] ${className}`} ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border backdrop-blur-xl transition-all active:scale-95 duration-200 ${baseButtonStyles}`}
      >
        <Globe size={16} className={variant === 'light' ? 'text-blue-200' : 'text-blue-600'} />
        <span className="text-xs font-black uppercase tracking-wide min-w-[20px]">{currentLang.code}</span>
        <ChevronDown 
            size={14} 
            className={`transition-transform duration-300 opacity-60 ${isOpen ? 'rotate-180' : ''}`} 
            strokeWidth={3}
        />
      </button>

      {isOpen && (
        <div 
            className={`absolute top-[calc(100%+8px)] min-w-[180px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ring-1 ring-black/5 origin-top-${align === 'right' ? 'right' : 'left'}`}
            style={{ [align === 'right' ? 'right' : 'left']: 0 }}
        >
          <div className="p-1.5 space-y-0.5">
            {languages.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                    key={lang.code}
                    onClick={(e) => {
                        e.stopPropagation();
                        setLanguage(lang.code as any);
                        setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                        isActive 
                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg leading-none filter drop-shadow-sm">{lang.flag}</span>
                        <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                            {lang.label}
                        </span>
                    </div>
                    {isActive && (
                        <div className="bg-blue-600 text-white rounded-full p-0.5 animate-in zoom-in duration-200">
                            <Check size={10} strokeWidth={4} />
                        </div>
                    )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
