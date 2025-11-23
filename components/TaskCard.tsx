
import React from 'react';
import { Task, TaskStatus } from '../types';
import { MapPin, ArrowRight, Zap } from 'lucide-react';
import { StarRating } from './StarRating';

interface TaskCardProps {
  task: Task;
  distanceKm: number | null;
  onClick: () => void;
  onOfferClick: (e: React.MouseEvent) => void;
}

// Needo Logo Placeholder
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=N&background=2563eb&color=fff&size=128&bold=true&length=1";

export const TaskCard: React.FC<TaskCardProps> = ({ task, distanceKm, onClick, onOfferClick }) => {
  
  const offersCount = task.offers.length;

  // Find last offer (most recent)
  const lastOffer = task.offers.length > 0 
    ? task.offers.reduce((latest, current) => current.createdAt > latest.createdAt ? current : latest) 
    : null;

  const isHot = offersCount > 2;
  const fallbackImage = 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&auto=format&fit=crop&q=60';
  
  // Robust rating display logic
  const hasValidRating = task.requesterRating && task.requesterRating > 0;
  
  // If reviewCount is present and 0, they are new.
  // If reviewCount is UNDEFINED (legacy data) and rating is 5.0 (legacy default), they are considered new.
  // If rating is 0, they are new.
  const isNewUser = (task.requesterReviewCount === 0) || 
                    (!hasValidRating) || 
                    (task.requesterReviewCount === undefined && task.requesterRating === 5);

  const getAvatar = (url?: string) => {
      if (!url || url.includes('dicebear')) return DEFAULT_AVATAR;
      return url;
  };

  return (
    <div 
      onClick={onClick}
      className="group relative w-full p-[3px] rounded-[26px] bg-gradient-to-br from-sky-300 via-blue-600 to-indigo-900 shadow-lg transition-transform duration-300 md:hover:-translate-y-1 active:scale-[0.98] hover:shadow-xl cursor-pointer transform-gpu touch-manipulation"
      style={{ 
        isolation: 'isolate', 
        WebkitBackfaceVisibility: 'hidden', 
        backfaceVisibility: 'hidden',
        transform: 'translate3d(0,0,0)' 
      }}
    >
      {/* Inner Content Card */}
      <div className="w-full h-full bg-white rounded-[23px] overflow-hidden flex flex-col relative">
      
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-slate-50 opacity-50 pointer-events-none"></div>
        
        {/* Image Section */}
        <div 
          className="relative h-48 md:h-56 w-full overflow-hidden"
          style={{ 
            WebkitMaskImage: '-webkit-radial-gradient(white, black)', 
            transform: 'translate3d(0,0,0)'
          }} 
        >
          <img 
            src={task.imageUrl || fallbackImage} 
            alt={task.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== fallbackImage) {
                  target.src = fallbackImage;
              }
            }}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

          {/* Top Badges */}
          {isHot && (
            <div className="absolute top-3 left-3 z-10">
               <div className="w-8 h-8 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center shadow-lg">
                  <Zap className="text-yellow-400 fill-yellow-400" size={16} />
               </div>
            </div>
          )}

          <div className="absolute top-3 right-3 z-10">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-lg
              ${task.status === TaskStatus.OPEN ? 'bg-blue-600/90 text-white' : ''}
              ${task.status === TaskStatus.IN_PROGRESS ? 'bg-purple-600/90 text-white' : ''}
              ${task.status === TaskStatus.CLOSED ? 'bg-green-600/90 text-white' : ''}
            `}>
              {task.status === TaskStatus.OPEN ? 'ACTIVE' : task.status}
            </span>
          </div>

          {/* Title on Image */}
          <div className="absolute bottom-0 left-0 w-full p-4 translate-y-1 md:group-hover:translate-y-0 transition-transform duration-300">
             <div className="flex flex-wrap gap-2 mb-1.5 opacity-90">
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md text-white text-[9px] font-bold border border-white/10">
                   <MapPin size={9} className="text-blue-400" />
                   <span className="truncate max-w-[100px]">{task.address || 'Локация'}</span>
                   {distanceKm !== null && (
                      <span className="shrink-0 border-l border-white/30 pl-1 ml-1">• {distanceKm} км</span>
                   )}
                </div>
             </div>
             <h3 className="text-base md:text-lg font-black text-white leading-tight drop-shadow-md line-clamp-2">
              {task.title}
             </h3>
          </div>
        </div>

        {/* Content Body - Compact Stack */}
        <div className="flex flex-col p-4 gap-3 bg-white relative z-10 flex-1">
          
          {/* Description */}
          <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">
            {task.description}
          </p>

          {/* Info Grid (Category + Offers) */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
             <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex flex-col items-start">
                <span className="text-[9px] font-black text-slate-400 uppercase">КАТЕГОРИЯ</span>
                <span className="font-bold text-slate-700 text-xs line-clamp-1">{task.category || 'Общи'}</span>
             </div>
             <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex flex-col items-start">
                <span className="text-[9px] font-black text-slate-400 uppercase">ОФЕРТИ</span>
                <span className="font-bold text-slate-900 text-xs">{offersCount} оферти</span>
             </div>
          </div>

          {/* Requester & Last Offer Row */}
          <div className="flex items-center justify-between pt-1">
               <div className="flex items-center gap-2">
                   <div className="h-8 w-8 rounded-full ring-1 ring-slate-100 bg-slate-50 overflow-hidden">
                      <img 
                        src={getAvatar(task.requesterAvatar)} 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                   </div>
                   <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">{task.requesterName}</p>
                       {!isNewUser ? (
                            <div className="flex items-center gap-1">
                                <StarRating rating={task.requesterRating || 0} size={10} />
                                <span className="text-[10px] font-bold text-slate-700">{task.requesterRating?.toFixed(1)}</span>
                            </div>
                       ) : (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">НОВ</span>
                       )}
                   </div>
               </div>

               <div className="text-right flex flex-col items-end">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">ПОСЛЕДНА ОФЕРТА:</p>
                    <span className={`font-black ${lastOffer ? 'text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200' : 'text-sm text-slate-300'}`}>
                        {lastOffer ? `${lastOffer.price} лв.` : '---'}
                    </span>
               </div>
          </div>

          {/* Button */}
          <button className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-md">
             Виж Детайли <ArrowRight size={14} />
          </button>

        </div>
      </div>
    </div>
  );
};
