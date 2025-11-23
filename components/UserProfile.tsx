import React, { useState, useRef } from 'react';
import { User, Task, TaskStatus } from '../types';
import { X, Star, Calendar, ArrowRight, ImageIcon, Building2, Bell, LogOut, Settings, LayoutGrid, ListChecks, Heart, Edit3, Wallet, CreditCard, Save, Check, Loader2, TrendingUp, Landmark, Briefcase } from 'lucide-react';
import { StarRating } from './StarRating';
import { updateUserProfile } from '../services/authService';
import { CATEGORIES_LIST } from '../constants';

interface UserProfileProps {
  user: User;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onTaskClick: (task: Task) => void;
  isCurrentUserProfile?: boolean;
  onUserUpdate?: (data: Partial<User>) => void;
}

// Needo Logo Placeholder
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=N&background=2563eb&color=fff&size=128&bold=true&length=1";

export const UserProfile: React.FC<UserProfileProps> = ({ 
  user, 
  tasks, 
  isOpen, 
  onClose, 
  onLogout, 
  onTaskClick,
  isCurrentUserProfile = true,
  onUserUpdate
}) => {
  // Tabs: CREATED, COMPLETED, REVIEWS, FINANCES, SETTINGS
  const [activeTab, setActiveTab] = useState<'CREATED' | 'COMPLETED' | 'REVIEWS' | 'FINANCES' | 'SETTINGS'>('CREATED');
  
  // Settings / Business State
  const [isCompany, setIsCompany] = useState(user.isCompany || false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(user.businessCategories || []);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Bank Account State
  const [iban, setIban] = useState(user.bankIban || '');
  const [bic, setBic] = useState(user.bankBic || '');
  const [holder, setHolder] = useState(user.bankHolder || '');
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [saveBankSuccess, setSaveBankSuccess] = useState(false);
  
  // Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Robust fallback image
  const fallbackImage = 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&auto=format&fit=crop&q=60';

  if (!isOpen) return null;

  // 1. Created Tasks: Tasks where requesterId === user.id
  const createdTasks = tasks.filter(t => t.requesterId === user.id).sort((a, b) => b.createdAt - a.createdAt);

  // 2. Completed Tasks: Tasks where acceptedOffer.providerId === user.id AND status is CLOSED
  const completedTasks = tasks.filter(t => {
    const acceptedOffer = t.offers.find(o => o.id === t.acceptedOfferId);
    return acceptedOffer && acceptedOffer.providerId === user.id && t.status === TaskStatus.CLOSED;
  }).sort((a, b) => b.createdAt - a.createdAt);

  // 3. Reviews: Reviews where toUserId === user.id
  const reviews = tasks.flatMap(t => t.reviews || []).filter(r => r.toUserId === user.id).sort((a, b) => b.createdAt - a.createdAt);

  // DYNAMIC RATING CALCULATION
  // Use real-time data from reviews array instead of potentially stale user object properties
  const liveRating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0;
  const liveReviewCount = reviews.length;

  // 4. Finances Logic
  const totalEarnings = completedTasks.reduce((sum, task) => {
     const offer = task.offers.find(o => o.id === task.acceptedOfferId);
     return sum + (offer ? offer.price : 0);
  }, 0);
  const avgEarnings = completedTasks.length > 0 ? Math.round(totalEarnings / completedTasks.length) : 0;

  const handleCategoryToggle = (category: string) => {
      if (selectedCategories.includes(category)) {
          setSelectedCategories(selectedCategories.filter(c => c !== category));
      } else {
          setSelectedCategories([...selectedCategories, category]);
      }
  };

  const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_SIZE = 400;
                  let width = img.width;
                  let height = img.height;
                  
                  if (width > height) {
                      if (width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                      }
                  } else {
                      if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                      }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.85));
              };
              img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
      });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploadingAvatar(true);
      try {
          const base64 = await resizeImage(file);
          await updateUserProfile(user.id, { avatarUrl: base64 });
          if (onUserUpdate) onUserUpdate({ avatarUrl: base64 });
      } catch (err) {
          console.error(err);
          alert("Грешка при качването на снимката.");
      } finally {
          setIsUploadingAvatar(false);
      }
  };

  const handleSaveSettings = async () => {
      setIsSavingSettings(true);
      try {
          await updateUserProfile(user.id, {
              isCompany: isCompany,
              businessCategories: selectedCategories
          });
          if (onUserUpdate) onUserUpdate({ isCompany, businessCategories: selectedCategories });
          setSaveSettingsSuccess(true);
          setTimeout(() => setSaveSettingsSuccess(false), 3000);
      } catch (e) {
          console.error("Save settings failed", e);
          alert("Възникна грешка при запазването.");
      } finally {
          setIsSavingSettings(false);
      }
  };

  const handleSaveBankDetails = async () => {
      setIsSavingBank(true);
      try {
          await updateUserProfile(user.id, {
              bankIban: iban,
              bankBic: bic,
              bankHolder: holder
          });
          if (onUserUpdate) onUserUpdate({ bankIban: iban, bankBic: bic, bankHolder: holder });
          setSaveBankSuccess(true);
          setTimeout(() => setSaveBankSuccess(false), 3000);
      } catch (e) {
          console.error("Save bank details failed", e);
          alert("Възникна грешка при запазването на банкови данни.");
      } finally {
          setIsSavingBank(false);
      }
  };

  const getAvatar = (url?: string) => {
    if (!url || url.includes('dicebear')) return DEFAULT_AVATAR;
    return url;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>

      {/* Main Modal Card */}
      <div className="relative w-full h-full md:h-[85vh] md:max-w-4xl bg-[#F8FAFC] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col transform transition-all">
        
        {/* --- COMPACT HEADER --- */}
        <div className="bg-white relative shrink-0 shadow-sm z-20">
             {/* Colorful Top Accent Line */}
             <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500"></div>

             <div className="px-5 py-5 md:px-8">
                {/* Top Control Row */}
                <div className="flex justify-between items-start mb-4">
                    {/* User Info Block */}
                    <div className="flex items-center gap-4 md:gap-6">
                        
                        {/* Avatar with Upload */}
                        <div className="relative group shrink-0">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl p-1 bg-white shadow-lg border border-slate-100 overflow-hidden">
                                <img 
                                    src={getAvatar(user.avatarUrl)} 
                                    alt={user.name}
                                    className="w-full h-full rounded-xl object-cover bg-slate-100"
                                />
                            </div>
                            {/* Compact Camera Button */}
                            {isCurrentUserProfile && (
                                <button 
                                    onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-2 rounded-xl shadow-md border-2 border-white hover:bg-blue-600 transition-all active:scale-95"
                                    title="Смени снимка"
                                >
                                    {isUploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Edit3 size={12} />}
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </div>

                        {/* Name & Details */}
                        <div>
                             <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight mb-1 flex items-center gap-2">
                                {user.name}
                                {user.isCompany && (
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-sm" title="Бизнес профил">
                                        <Building2 size={12} />
                                    </span>
                                )}
                             </h2>
                             <p className="text-xs font-medium text-slate-400 mb-2">
                                Член от {new Date(user.joinedAt).getFullYear()}
                             </p>
                             
                             {/* Stats Row */}
                             <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                    <span className="text-xs font-bold text-slate-700">{liveRating.toFixed(1)}</span>
                                    <span className="text-[10px] text-slate-400">({liveReviewCount})</span>
                                </div>
                                
                                {user.isCompany && (
                                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 text-blue-700">
                                        <span className="text-[10px] font-bold uppercase">Фирма</span>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    {/* Actions (Logout & Close) */}
                    <div className="flex items-center gap-2">
                         {isCurrentUserProfile && (
                            <button 
                                onClick={onLogout}
                                className="hidden md:flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                title="Изход"
                            >
                                <LogOut size={20} />
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide border-t border-slate-100 pt-4">
                    <TabButton 
                        active={activeTab === 'CREATED'} 
                        onClick={() => setActiveTab('CREATED')} 
                        icon={<LayoutGrid size={16} />} 
                        label={`Обяви (${createdTasks.length})`} 
                    />
                    <TabButton 
                        active={activeTab === 'COMPLETED'} 
                        onClick={() => setActiveTab('COMPLETED')} 
                        icon={<ListChecks size={16} />} 
                        label={`Изпълнени (${completedTasks.length})`} 
                    />
                    <TabButton 
                        active={activeTab === 'REVIEWS'} 
                        onClick={() => setActiveTab('REVIEWS')} 
                        icon={<Heart size={16} />} 
                        label={`Отзиви (${reviews.length})`} 
                    />
                    {isCurrentUserProfile && (
                        <>
                            <TabButton 
                                active={activeTab === 'FINANCES'} 
                                onClick={() => setActiveTab('FINANCES')} 
                                icon={<Wallet size={16} />} 
                                label="Финанси" 
                            />
                            <TabButton 
                                active={activeTab === 'SETTINGS'} 
                                onClick={() => setActiveTab('SETTINGS')} 
                                icon={<Settings size={16} />} 
                                label="Настройки" 
                            />
                        </>
                    )}
                </div>
             </div>
        </div>
        
        {/* --- CONTENT SECTION --- */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-[#F8FAFC] scrollbar-thin">
           
           {/* TAB: CREATED TASKS */}
           {activeTab === 'CREATED' && (
             <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {createdTasks.length === 0 && <EmptyState icon={<LayoutGrid size={40} />} text="Няма публикувани задачи." subtext="Тук ще се покажат задачите, които сте създали." />}
                
                {createdTasks.map(task => (
                    <div 
                        key={task.id} 
                        onClick={() => onTaskClick(task)} 
                        className="group bg-white p-3 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex gap-4 items-center"
                    >
                        <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            <img 
                                src={task.imageUrl || fallbackImage} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                alt="" 
                            />
                        </div>
                        
                        <div className="flex-1 min-w-0 py-1">
                            <div className="flex justify-between items-start mb-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.category || 'Общи'}</span>
                                <StatusBadge status={task.status} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight truncate mb-1 group-hover:text-blue-600 transition-colors">
                                {task.title}
                            </h3>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium mt-1">
                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(task.createdAt).toLocaleDateString('bg-BG')}</span>
                                {task.offers.length > 0 && <span className="text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded">{task.offers.length} оферти</span>}
                            </div>
                        </div>
                        
                        <div className="pr-2 hidden sm:block text-slate-300 group-hover:text-blue-500 transition-colors">
                             <ArrowRight size={18} />
                        </div>
                    </div>
                ))}
             </div>
           )}

           {/* TAB: COMPLETED TASKS */}
           {activeTab === 'COMPLETED' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {completedTasks.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState icon={<ListChecks size={40} />} text="Няма изпълнени задачи." subtext="Тук ще видите историята на вашата работа." />
                    </div>
                )}
                
                {completedTasks.map(task => {
                    const review = task.reviews?.find(r => r.toUserId === user.id);
                    return (
                        <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full">
                            {/* Before/After Header */}
                            <div className="h-36 relative flex" onClick={() => onTaskClick(task)}>
                                <div className="w-1/2 relative overflow-hidden border-r border-white/20">
                                    <img src={task.imageUrl || fallbackImage} className="w-full h-full object-cover" alt="Before" />
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">ПРЕДИ</div>
                                </div>
                                <div className="w-1/2 relative overflow-hidden">
                                    {task.completionImageUrl ? (
                                        <img src={task.completionImageUrl} className="w-full h-full object-cover" alt="After" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon size={20}/></div>
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-green-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">СЛЕД</div>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-blue-600 transition-colors cursor-pointer truncate" onClick={() => onTaskClick(task)}>{task.title}</h3>
                                <p className="text-[10px] text-slate-400 mb-3">{new Date(task.createdAt).toLocaleDateString('bg-BG')}</p>
                                
                                {review ? (
                                    <div className="mt-auto bg-slate-50 p-2.5 rounded-xl border border-slate-100 relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">{review.fromUser}</span>
                                            <StarRating rating={review.rating} size={10} />
                                        </div>
                                        <p className="text-xs text-slate-600 italic line-clamp-2">"{review.comment}"</p>
                                    </div>
                                ) : (
                                    <div className="mt-auto text-center py-2 text-[10px] text-slate-300 italic">Няма оставен отзив</div>
                                )}
                            </div>
                        </div>
                    );
                })}
             </div>
           )}

           {/* TAB: REVIEWS */}
           {activeTab === 'REVIEWS' && (
             <div className="columns-1 md:columns-2 gap-3 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {reviews.length === 0 && <EmptyState icon={<Heart size={40} />} text="Няма отзиви." subtext="Тук ще се появят оценките от други потребители." />}
                
                {reviews.map(review => {
                    const task = tasks.find(t => t.id === review.taskId);
                    return (
                        <div 
                            key={review.id} 
                            onClick={() => task && onTaskClick(task)}
                            className="break-inside-avoid bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer mb-3"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-xs shadow-inner">
                                        {review.fromUser.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-slate-800">{review.fromUser}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(review.createdAt).toLocaleDateString('bg-BG')}</p>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 px-1.5 py-0.5 rounded-md">
                                    <StarRating rating={review.rating} size={10} />
                                </div>
                            </div>
                            
                            <div className="relative pl-2 border-l-2 border-slate-100">
                                <p className="text-xs text-slate-600 leading-relaxed italic">"{review.comment}"</p>
                            </div>

                            {task && (
                                <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-1.5 text-[9px] text-slate-400 uppercase tracking-wide font-bold group">
                                    <Briefcase size={10} />
                                    <span className="group-hover:text-blue-600 transition-colors truncate">За: {task.title}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
             </div>
           )}

           {/* TAB: FINANCES (NEW) */}
           {activeTab === 'FINANCES' && isCurrentUserProfile && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 space-y-8">
                 
                 {/* Earnings Stats */}
                 <div>
                     <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2"><TrendingUp size={18} /> Статистика</h4>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-5 -mt-5 blur-xl"></div>
                             <p className="text-xs font-medium text-emerald-100 mb-1">Общо Спечелени</p>
                             <p className="text-3xl font-black">{totalEarnings} <span className="text-lg">лв.</span></p>
                         </div>
                         <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">Изпълнени Задачи</p>
                             <div className="flex items-end gap-2">
                                 <p className="text-3xl font-black text-slate-800">{completedTasks.length}</p>
                                 <p className="text-xs font-medium text-slate-400 mb-1.5">бр.</p>
                             </div>
                             <p className="text-[10px] text-slate-400 mt-1">Средно по <span className="font-bold text-slate-600">{avgEarnings} лв.</span></p>
                         </div>
                     </div>
                 </div>

                 {/* Bank Account Form */}
                 <div>
                     <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2"><Landmark size={18} /> Банкова Сметка</h4>
                     <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                         <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Тук можете да въведете вашата банкова сметка (IBAN), по която ще бъдат превеждани заработените средства от задачите в платформата.
                         </p>
                         
                         <div className="space-y-4">
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Титуляр на сметката</label>
                                 <input 
                                    type="text" 
                                    value={holder}
                                    onChange={(e) => setHolder(e.target.value)}
                                    placeholder="Име Презиме Фамилия"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">IBAN</label>
                                 <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        value={iban}
                                        onChange={(e) => setIban(e.target.value.toUpperCase())}
                                        placeholder="BG00 BANK 0000 0000 0000 00"
                                        className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none focus:border-blue-500 transition-colors uppercase tracking-widest"
                                    />
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">BIC / SWIFT Код</label>
                                 <input 
                                    type="text" 
                                    value={bic}
                                    onChange={(e) => setBic(e.target.value.toUpperCase())}
                                    placeholder="BANKBGSF"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors uppercase tracking-widest"
                                 />
                             </div>
                         </div>

                         <button 
                            onClick={handleSaveBankDetails}
                            disabled={isSavingBank}
                            className={`w-full mt-6 py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 ${
                                saveBankSuccess ? 'bg-green-500 shadow-green-200' : 'bg-slate-900 hover:bg-blue-600 shadow-slate-300'
                            }`}
                         >
                             {isSavingBank ? <Loader2 className="animate-spin" size={16} /> : saveBankSuccess ? <><Check size={16} /> Запазено</> : 'Запази Данните'}
                         </button>
                     </div>
                 </div>
              </div>
           )}

           {/* TAB: SETTINGS (Renamed from Business) */}
           {activeTab === 'SETTINGS' && isCurrentUserProfile && (
               <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
                   
                   {/* 1. Company Toggle (Moved to Top) */}
                   <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 flex items-center justify-between gap-4 relative overflow-hidden">
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                       <div className="flex gap-3 items-center">
                            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                                    <Building2 size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Бизнес Профил</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Активирай, ако си фирма или професионалист.</p>
                            </div>
                       </div>
                       
                       <label className="relative inline-flex items-center cursor-pointer">
                           <input 
                               type="checkbox" 
                               className="sr-only peer"
                               checked={isCompany}
                               onChange={(e) => setIsCompany(e.target.checked)} 
                           />
                           <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                       </label>
                   </div>

                   {/* 2. Categories Grid */}
                   <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
                       <div className="flex justify-between items-center mb-4">
                           <h4 className="font-bold text-slate-800 text-sm">Абонамент за задачи</h4>
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                               {selectedCategories.length} избрани
                           </span>
                       </div>
                       
                       <p className="text-xs text-slate-500 mb-4">Изберете категориите, за които искате да получавате известия, когато се появи нова задача.</p>

                       <div className="flex flex-wrap gap-2">
                           {CATEGORIES_LIST.map(cat => (
                               <button
                                   key={cat.id}
                                   onClick={() => handleCategoryToggle(cat.id)}
                                   className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                       selectedCategories.includes(cat.id)
                                       ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                       : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                                   }`}
                               >
                                   <span>{cat.icon}</span>
                                   {cat.label}
                                   {selectedCategories.includes(cat.id) && <Check size={12} className="text-blue-400 ml-0.5" strokeWidth={3} />}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Promo Banner */}
                   <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                       <div className="relative z-10 flex gap-4 items-start">
                           <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md h-fit">
                                <Bell size={20} className="text-white" />
                           </div>
                           <div>
                               <h3 className="text-base font-bold mb-1">Известия</h3>
                               <p className="text-xs text-slate-300 leading-relaxed">
                                   Ще бъдете известявани мигновено при нови задачи в избраните категории.
                               </p>
                           </div>
                       </div>
                   </div>

                   {/* Floating Save Button */}
                   <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[500px] z-50">
                       <button 
                           onClick={handleSaveSettings}
                           disabled={isSavingSettings}
                           className={`w-full py-3.5 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 shadow-xl transition-all transform active:scale-95 ${
                               saveSettingsSuccess ? 'bg-green-500 shadow-green-200' : 'bg-slate-900 hover:bg-blue-600 shadow-slate-300'
                           }`}
                       >
                           {isSavingSettings ? (
                               <Loader2 className="animate-spin" size={18} />
                           ) : saveSettingsSuccess ? (
                               <>
                                   <Check size={18} strokeWidth={3} /> Запазено!
                               </>
                           ) : (
                               <>
                                   <Save size={18} /> Запази Настройките
                               </>
                           )}
                       </button>
                   </div>
               </div>
           )}

        </div>
        
        {/* Mobile Logout (Inside content footer if needed) */}
         {isCurrentUserProfile && (
            <div className="md:hidden p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
                 <button onClick={onLogout} className="text-red-500 font-bold text-xs flex items-center justify-center gap-2 w-full py-2.5 bg-white rounded-xl shadow-sm border border-red-100">
                    <LogOut size={14} /> Изход от профила
                 </button>
            </div>
         )}
      </div>
    </div>
  );
};

// --- Subcomponents ---

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            active 
            ? 'bg-slate-900 text-white shadow-md' 
            : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
        {icon}
        {label}
    </button>
);

const StatusBadge = ({ status }: { status: TaskStatus }) => {
    let styles = "bg-slate-100 text-slate-500";
    let text = "Приключена";
    
    if (status === TaskStatus.OPEN) {
        styles = "bg-blue-100 text-blue-700";
        text = "Активна";
    } else if (status === TaskStatus.IN_PROGRESS) {
        styles = "bg-purple-100 text-purple-700";
        text = "Работи се";
    }
    
    return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${styles}`}>
            {text}
        </span>
    );
};

const EmptyState = ({ icon, text, subtext }: { icon: React.ReactNode, text: string, subtext: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-300">
            {icon}
        </div>
        <h3 className="text-sm font-bold text-slate-700 mb-1">{text}</h3>
        <p className="text-xs text-slate-400 max-w-xs">{subtext}</p>
    </div>
);