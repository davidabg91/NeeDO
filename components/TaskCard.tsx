
import React from 'react';
import { Task, TaskStatus } from '../types';
import { MapPin, ArrowRight, TrendingDown, Calendar, Star, Clock, Sparkles, CheckCircle2, Navigation, Zap } from 'lucide-react';
import { StarRating } from './StarRating';
import { CATEGORIES_LIST } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface TaskCardProps {
    task: Task;
    distanceKm: number | null;
    onClick: () => void;
    onOfferClick: (e: React.MouseEvent) => void;
}

// Needo Logo Placeholder
const DEFAULT_AVATAR = "/logo.jpg";

export const TaskCard: React.FC<TaskCardProps> = ({ task, distanceKm, onClick, onOfferClick }) => {
    const { t } = useLanguage();

    // NOTE: For scalability, we don't fetch all offers in the list view.
    // We use denormalized counters and potentially a 'lowestPrice' field (if implemented).
    const offersCount = task.offersCount || 0;
    const bestOffer = null; // We would need a dedicated field in the main doc for this now

    const fallbackImage = 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&auto=format&fit=crop&q=60';

    const hasValidRating = task.requesterRating && task.requesterRating > 0;
    const isNewUser = (task.requesterReviewCount === 0) || (!hasValidRating);

    const getAvatar = (url?: string) => {
        if (!url || url.includes('dicebear')) return DEFAULT_AVATAR;
        return url;
    };

    const categoryItem = CATEGORIES_LIST.find(c => c.id === task.category);
    const categoryIcon = categoryItem?.icon || '📌';

    const getStatusLabel = (status: TaskStatus) => {
        return t(`status_${status}` as any) || status;
    };

    // Format Address: Take only first 2 parts (City, Quarter)
    const addressParts = task.address ? task.address.split(',') : [];
    const displayAddress = addressParts.length >= 2
        ? `${addressParts[0].trim()}, ${addressParts[1].trim()}`
        : (addressParts[0] || t('label_location'));

    return (
        <div
            onClick={onClick}
            className="group relative w-full h-full cursor-pointer transition-all duration-300 hover:-translate-y-1"
        >
            {/* Main Card Container */}
            <div className="relative w-full h-full bg-white rounded-[28px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_12px_30px_rgb(0,0,0,0.08)] hover:border-blue-200 transition-all duration-300 flex flex-col">

                {/* --- TOP IMAGE SECTION --- */}
                <div className="relative h-56 w-full shrink-0 overflow-hidden">

                    {/* Image with Zoom Effect */}
                    <img
                        src={task.imageUrl || fallbackImage}
                        alt={task.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== fallbackImage) target.src = fallbackImage;
                        }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                        <div className="flex gap-2">
                            {/* Status Pill */}
                            <div className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1.5 
                        ${task.status === TaskStatus.OPEN ? 'bg-blue-500/80 text-white' : ''}
                        ${task.status === TaskStatus.IN_PROGRESS ? 'bg-purple-500/80 text-white' : ''}
                        ${task.status === TaskStatus.CLOSED ? 'bg-emerald-500/80 text-white' : ''}
                        ${task.status === TaskStatus.AWAITING_PAYMENT ? 'bg-amber-500/80 text-white' : ''}
                        ${task.status === TaskStatus.DISPUTED ? 'bg-red-500/80 text-white' : ''}
                     `}>
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    {getStatusLabel(task.status)}
                                </span>
                            </div>

                            {/* Distance Badge */}
                            {distanceKm !== null && (
                                <div className="px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1 text-white">
                                    <Navigation size={10} className="text-yellow-400 fill-yellow-400" />
                                    <span className="text-[10px] font-black">{distanceKm} км</span>
                                </div>
                            )}
                        </div>

                        {/* Category */}
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm shadow-sm">
                            {categoryIcon}
                        </div>
                    </div>
                </div>

                {/* --- CONTENT SECTION --- */}
                <div className="flex-1 flex flex-col p-4 gap-4">

                    {/* Title & Description */}
                    <div>
                        <h3 className="text-[16px] font-black text-slate-900 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {task.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                            {task.description}
                        </p>
                    </div>

                    {/* INFO PANEL (Location & Date) */}
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                        <div className="flex items-center gap-2 max-w-[60%]">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                                <MapPin size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Локация</span>
                                <span className="text-[10px] font-bold text-slate-700 truncate block w-full">
                                    {displayAddress}
                                </span>
                            </div>
                        </div>

                        <div className="w-px h-8 bg-slate-200 mx-1"></div>

                        <div className="flex items-center gap-2 max-w-[40%] justify-end">
                            <div className="flex flex-col items-end min-w-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">ПУБЛИКУВАНО</span>
                                <span className="text-[10px] font-bold text-slate-700 truncate">
                                    {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                                <Calendar size={14} />
                            </div>
                        </div>
                    </div>

                    {/* PRICE / OFFER PANEL */}
                    <div className="mt-auto">
                        {bestOffer ? (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex justify-between items-center relative overflow-hidden group/offer">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/10 rounded-full blur-xl -mr-6 -mt-6"></div>

                                <div className="flex items-center gap-2.5 relative z-10">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                        <TrendingDown size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">АКТИВНИ ОФЕРТИ</span>
                                        <span className="text-[10px] font-medium text-emerald-800/70">{offersCount} кандидати</span>
                                    </div>
                                </div>

                                <div className="text-right relative z-10">
                                    <div className="flex items-baseline justify-end gap-0.5">
                                        <span className="text-xl font-black text-emerald-900 tracking-tighter">{bestOffer.price}</span>
                                        <span className="text-xs font-bold text-emerald-600">€</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-3 flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                                        <Clock size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ОЧАКВА ОФЕРТИ</span>
                                        <span className="text-[10px] font-medium text-slate-400">Бъди първият</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400">-- €</span>
                            </div>
                        )}
                    </div>

                    {/* Footer: User Info */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img
                                src={getAvatar(task.requesterAvatar)}
                                className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-50"
                                alt=""
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-900 leading-none">{task.requesterName}</span>
                                {!isNewUser ? (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Star size={8} className="fill-amber-400 text-amber-400" />
                                        <span className="text-[9px] font-bold text-slate-500">{task.requesterRating?.toFixed(1)}</span>
                                    </div>
                                ) : (
                                    <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1 rounded mt-0.5 w-fit">НОВ</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={onOfferClick}
                            className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 hover:scale-105 active:scale-95 transform transition-all duration-300 group/btn border border-emerald-400/20"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                            <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover/btn:animate-shine" />

                            <Zap size={12} className="text-yellow-300 fill-yellow-300 animate-pulse relative z-10" />
                            <span className="relative z-10 text-white drop-shadow-sm">ДАЙ ОФЕРТА!</span>
                        </button>
                    </div>

                </div>
            </div>
            <style>{`
        @keyframes shine {
            100% {
                left: 125%;
            }
        }
        .group-hover\\/btn\\:animate-shine {
            animation: shine 1s;
        }
      `}</style>
        </div>
    );
};
