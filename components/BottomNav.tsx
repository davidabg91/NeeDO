
import React from 'react';
import { Map, List, User, Plus, Bell, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavProps {
  currentView: 'MAP' | 'LIST' | 'PROFILE' | 'NOTIFICATIONS' | 'ADMIN';
  onChangeView: (view: 'MAP' | 'LIST' | 'PROFILE' | 'NOTIFICATIONS' | 'ADMIN') => void;
  isLoggedIn: boolean;
  userAvatar?: string;
  onCreateClick: () => void;
  unreadNotificationsCount?: number;
  isAdmin?: boolean;
  onOpenLegal?: () => void;
  showTooltips?: boolean;
  showProfileWarning?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onChangeView,
  isLoggedIn,
  userAvatar,
  onCreateClick,
  unreadNotificationsCount = 0,
  isAdmin,
  onOpenLegal,
  showTooltips = false,
  showProfileWarning = false
}) => {
  const { t } = useLanguage();

  const containerClass = "w-full max-w-[380px] bg-[#0f0f0f]/95 backdrop-blur-2xl px-2 h-[54px] rounded-full flex items-center justify-between gap-1 shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-white/10 relative z-50";

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-[380px] flex flex-col items-center gap-2 pointer-events-none">
      <div className={`${containerClass} pointer-events-auto`}>

        {isAdmin && (
          <NavButton
            active={currentView === 'ADMIN'}
            onClick={() => onChangeView('ADMIN')}
            icon={<ShieldCheck size={18} />}
            label={t('nav_admin')}
          />
        )}

        <NavButton
          active={currentView === 'MAP'}
          onClick={() => onChangeView('MAP')}
          icon={<Map size={20} />}
          label={t('nav_map')}
          tooltip={showTooltips ? "КАРТА" : undefined}
        />

        <NavButton
          active={currentView === 'LIST'}
          onClick={() => onChangeView('LIST')}
          icon={<List size={20} />}
          label={t('nav_list')}
          tooltip={showTooltips ? "СПИСЪК" : undefined}
        />

        <div className="relative -top-5">
          {showTooltips && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 pointer-events-none">
              ДОБАВИ ЗАДАЧА
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/40 rotate-45 border-r border-b border-white/10"></div>
            </div>
          )}
          <button
            onClick={onCreateClick}
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] border-[3px] border-[#0f0f0f] flex items-center justify-center transform transition-transform active:scale-95 hover:scale-105"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        <NavButton
          active={currentView === 'NOTIFICATIONS'}
          onClick={() => onChangeView('NOTIFICATIONS')}
          icon={<Bell size={20} />}
          label=""
          tooltip={showTooltips ? "ИЗВЕСТИЯ" : undefined}
          badge={unreadNotificationsCount > 0 ? (
            <span className="block w-2 h-2 bg-red-500 border-[1.5px] border-[#1a1a1a] rounded-full shadow-sm"></span>
          ) : null}
        />

        <NavButton
          active={currentView === 'PROFILE'}
          onClick={() => onChangeView('PROFILE')}
          tooltip={showTooltips ? "ПРОФИЛ" : undefined}
          icon={
            isLoggedIn ? (
              <img 
                src={userAvatar || "/logo.jpg"} 
                alt="Profile" 
                className={`w-5 h-5 rounded-full object-cover border border-white/20 ${currentView === 'PROFILE' ? 'ring-2 ring-blue-500' : 'opacity-80'}`} 
              />
            ) : (
              <User size={20} />
            )
          }
          label={t('nav_profile')}
          // Only show warning badge if user is logged in and needs stripe setup
          badge={isLoggedIn && showProfileWarning ? (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-[#0f0f0f] items-center justify-center">
                <span className="text-[9px] text-white font-black leading-none">!</span>
              </span>
            </span>
          ) : null}
        />

      </div>

      {onOpenLegal && (
        <button
          onClick={onOpenLegal}
          className="text-[10px] font-bold text-black hover:text-slate-800 transition-colors opacity-90 shadow-sm pointer-events-auto mt-1"
        >
          Условия и Поверителност
        </button>
      )}
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
  tooltip?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, badge, label, tooltip }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative group h-10 w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center transition-all duration-300 ease-out flex-col
        ${active
          ? 'bg-white/10 text-white shadow-inner'
          : 'text-gray-500 hover:text-white hover:bg-white/5'
        }
        active:scale-90
      `}
      title={label}
    >
      {tooltip && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-bottom-2 duration-700 pointer-events-none">
          {tooltip}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/40 rotate-45 border-r border-b border-white/10"></div>
        </div>
      )}

      <div className={`transform transition-transform duration-300 ${active ? 'scale-105' : ''}`}>
        {icon}
      </div>

      {badge && (
        <div className="absolute top-1 right-1 pointer-events-none">
          {badge}
        </div>
      )}
    </button>
  );
};
