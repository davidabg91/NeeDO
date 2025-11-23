
import React from 'react';
import { Map, List, User, Plus, Bell, ShieldCheck } from 'lucide-react';

interface BottomNavProps {
  currentView: 'MAP' | 'LIST' | 'PROFILE' | 'NOTIFICATIONS' | 'ADMIN';
  onChangeView: (view: 'MAP' | 'LIST' | 'PROFILE' | 'NOTIFICATIONS' | 'ADMIN') => void;
  isLoggedIn: boolean;
  userAvatar?: string;
  onCreateClick: () => void;
  unreadNotificationsCount?: number;
  isAdmin?: boolean;
  onOpenLegal?: () => void; // Prop to open legal modal
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  currentView, 
  onChangeView, 
  isLoggedIn, 
  userAvatar,
  onCreateClick,
  unreadNotificationsCount = 0,
  isAdmin,
  onOpenLegal
}) => {
  
  // Container: Smaller dimensions, compact padding, adjusted border radius
  const containerClass = "w-full max-w-[320px] bg-[#0a0a0a] p-1.5 rounded-[24px] flex items-center justify-between gap-1.5 shadow-2xl shadow-black/60 border border-[#222] backdrop-blur-xl relative z-50";

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[85%] max-w-[320px] flex flex-col items-center gap-2">
      <div className={containerClass}>
        
        {isAdmin && (
           <NavButton 
              active={currentView === 'ADMIN'} 
              onClick={() => onChangeView('ADMIN')} 
              icon={<ShieldCheck size={20} />} 
           />
        )}

        <NavButton 
          active={currentView === 'MAP'} 
          onClick={() => onChangeView('MAP')} 
          icon={<Map size={20} />} 
        />
        
        <NavButton 
          active={currentView === 'LIST'} 
          onClick={() => onChangeView('LIST')} 
          icon={<List size={20} />} 
        />

        {/* Create Action Button - Special Style */}
        <NavButton 
           active={false}
           onClick={onCreateClick}
           icon={<Plus size={26} strokeWidth={2.5} />}
           highlight={true}
        />

        {/* Notification Button - Integrated Badge */}
        <NavButton 
          active={currentView === 'NOTIFICATIONS'} 
          onClick={() => onChangeView('NOTIFICATIONS')} 
          icon={<Bell size={20} />} 
          badge={unreadNotificationsCount > 0 ? (
             <span className="block w-2 h-2 bg-red-500 border-[1.5px] border-[#1a1a1a] rounded-full shadow-sm"></span>
          ) : null}
        />

        <NavButton 
          active={currentView === 'PROFILE'} 
          onClick={() => onChangeView('PROFILE')} 
          icon={
            isLoggedIn && userAvatar ? (
              <img src={userAvatar} alt="Profile" className={`w-5 h-5 rounded-full object-cover ${currentView === 'PROFILE' ? 'ring-2 ring-[#8b5cf6]' : 'opacity-80'}`} />
            ) : (
              <User size={20} />
            )
          } 
        />
      </div>

      {/* Thin Legal Text below the navbar */}
      {onOpenLegal && (
        <button 
           onClick={onOpenLegal}
           className="text-[9px] font-medium text-slate-400 hover:text-slate-600 transition-colors opacity-80 shadow-sm"
        >
           Условия за ползване и Поверителност
        </button>
      )}
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  highlight?: boolean;
  badge?: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, highlight, badge }) => {
  return (
    <button 
      onClick={onClick}
      className={`
        relative group flex-1 aspect-square rounded-[18px] flex items-center justify-center transition-all duration-300 ease-out
        ${highlight 
            // Special Button Style: Blue Border, Dark BG, Glow (Scaled down slightly)
            ? 'bg-[#0f0f0f] text-blue-500 border-[2px] border-blue-600 shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] z-20 scale-105 hover:scale-110' 
            : active 
                // Active State
                ? 'bg-[#1a1a1a] text-[#8b5cf6] shadow-inner border border-[#222]' 
                // Inactive State
                : 'bg-[#151515] text-[#555] hover:text-[#8b5cf6] hover:bg-[#1c1c1c] border border-transparent'
        }
        ${!highlight ? 'active:scale-95' : 'active:scale-105'}
      `}
    >
      <div className={`transform transition-transform duration-300 ${active && !highlight ? 'scale-105' : ''}`}>
         {icon}
      </div>

      {/* Badge Positioning */}
      {badge && (
         <div className="absolute top-2.5 right-2.5 pointer-events-none">
            {badge}
         </div>
      )}
    </button>
  );
};
