import React, { useState, useRef, useEffect } from 'react';
import { AppUser, Task, TaskStatus, Review } from '../types';
import { X, Star, Settings, Wallet, CreditCard, Check, Loader2, Building2, LogOut, Camera, ChevronRight, Calendar, ShieldCheck, Briefcase, MapPin, Grid, Heart, Clock, ArrowRight, Layout, Zap, Edit2, ExternalLink, Award, TrendingUp, Bell, User as UserIcon, Tag, Sparkles, AlertCircle, AlertTriangle, Link, DollarSign, Hammer, Info, XCircle } from 'lucide-react';
import { StarRating } from './StarRating';
import { updateUserProfile } from '../services/authService';
import { CATEGORIES_LIST } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { stripeService } from '../services/stripeService';
import { subscribeToUserReviews, fetchTasksByUser } from '../services/dataService';
import { db } from '../firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';

interface UserProfileProps {
  user: AppUser;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onTaskClick: (task: Task) => void;
  isCurrentUserProfile?: boolean;
  onUserUpdate?: (data: Partial<AppUser>) => void;
}

const DEFAULT_AVATAR = "/logo.jpg";

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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'CREATED' | 'COMPLETED' | 'REVIEWS' | 'FINANCES' | 'SETTINGS'>('CREATED');
  const [reviewRole, setReviewRole] = useState<'PROVIDER' | 'REQUESTER'>('PROVIDER');

  // Settings / Business State
  const [isCompany, setIsCompany] = useState(user.isCompany || false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(user.businessCategories || []);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Stripe State
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeBusinessType, setStripeBusinessType] = useState<'individual' | 'company'>('individual');
  const [stripeCompanyName, setStripeCompanyName] = useState('');
  const [stripeTaxId, setStripeTaxId] = useState('');
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [individualBalance, setIndividualBalance] = useState<{ available: number; pending: number } | null>(null);
  const [companyBalance, setCompanyBalance] = useState<{ available: number; pending: number } | null>(null);
  const [individualTransactions, setIndividualTransactions] = useState<any[]>([]);
  const [companyTransactions, setCompanyTransactions] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Fetch real Stripe balances
  useEffect(() => {
    if (activeTab === 'FINANCES' && isCurrentUserProfile) {
      const fetchBalances = async () => {
        try {
          if (user.stripeAccountId_individual || user.stripeAccountId) {
            const bal = await stripeService.getStripeBalance(user.id, 'individual');
            setIndividualBalance(bal);
            const txs = await stripeService.getStripeTransactions(user.id, 'individual');
            setIndividualTransactions(txs);
          }
          if (user.stripeAccountId_company) {
            const bal = await stripeService.getStripeBalance(user.id, 'company');
            setCompanyBalance(bal);
            const txs = await stripeService.getStripeTransactions(user.id, 'company');
            setCompanyTransactions(txs);
          }
        } catch (error) {
          console.error("Failed to fetch Stripe data:", error);
        }
      };
      fetchBalances();
    }
  }, [activeTab, isCurrentUserProfile, user.id, user.stripeAccountId_individual, user.stripeAccountId_company, user.stripeAccountId]);

  // Subscribe to user reviews and fetch user tasks
  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      const loadData = async () => {
        setIsLoadingTasks(true);
        const fetchedTasks = await fetchTasksByUser(user.id);
        if (isMounted) {
          setUserTasks(fetchedTasks);
          setIsLoadingTasks(false);
        }
      };

      loadData();

      const unsubscribe = subscribeToUserReviews(user.id, (reviews) => {
        if (isMounted) setUserReviews(reviews);
      });
      
      return () => {
        isMounted = false;
        unsubscribe();
      };
    }
  }, [user.id, isOpen]);

  // Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const fallbackImage = 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&auto=format&fit=crop&q=60';

  if (!isOpen) return null;

  // Filter Tasks using userTasks (fetched specifically for this user)
  const createdTasks = userTasks.filter(t => t.requesterId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const completedTasks = userTasks.filter(t => 
    t.acceptedProviderId === user.id && t.status === TaskStatus.CLOSED
  ).sort((a, b) => b.createdAt - a.createdAt);

  // Enrich reviews with task context during render
  const enrichedReviews = userReviews.map(r => ({
    ...r,
    taskContext: userTasks.find(t => t.id === r.taskId) || tasks.find(t => t.id === r.taskId)
  }));

  // Reviews Logic - correctly split by role
  const providerReviews = enrichedReviews
      .filter(r => r.taskContext && r.taskContext.requesterId !== user.id)
      .sort((a, b) => b.createdAt - a.createdAt);

  const requesterReviews = enrichedReviews
      .filter(r => r.taskContext && r.taskContext.requesterId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt);

  const calcAvg = (list: Review[]) => list.length > 0 ? list.reduce((a, b) => a + b.rating, 0) / list.length : 0;
  
  const totalReviewsCount = userReviews.length;
  // Use global rating if available, otherwise calculate from fetched reviews
  const calculatedAvg = calcAvg(userReviews);
  const totalRating = user.rating && user.reviewCount > 0 ? user.rating : calculatedAvg;
  const totalEarnings = completedTasks.reduce((sum, task) => {
     return sum + (task.acceptedPrice || 0);
  }, 0);
  
  // Resolve Categories for Display
  const userSkills = (user.businessCategories || []).map(catId => 
      CATEGORIES_LIST.find(c => c.id === catId)
  ).filter(Boolean);

  // Handlers
  const handleCategoryToggle = (category: string) => {
      if (selectedCategories.includes(category)) {
          setSelectedCategories(selectedCategories.filter(c => c !== category));
      } else {
          setSelectedCategories([...selectedCategories, category]);
      }
  };

  const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_SIZE = 600; 
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
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      resolve(canvas.toDataURL('image/jpeg', 0.85));
                  } else {
                      reject(new Error("Canvas context unavailable"));
                  }
              };
              img.onerror = () => reject(new Error("Failed to load image"));
              img.src = e.target?.result as string;
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
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
          console.error("Avatar upload failed:", err instanceof Error ? err.message : String(err));
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
          console.error("Save settings failed", e instanceof Error ? e.message : String(e));
          alert("Възникна грешка при запазването.");
      } finally {
          setIsSavingSettings(false);
      }
  };

  const handleConnectStripe = async (type: 'individual' | 'company') => {
      if (!user.id) return;
      
      // Basic validation for company
      if (type === 'company' && !stripeCompanyName) {
          alert("Моля въведете име на фирмата.");
          return;
      }

      setIsStripeLoading(true);
      try {
          const url = await stripeService.createStripeAccount(
              user.id, 
              type,
              type === 'company' ? stripeCompanyName : undefined,
              type === 'company' ? stripeTaxId : undefined
          );
          // Use window.top to ensure we break out of any potential frames/modals
          window.top.location.href = url;
      } catch (error) {
          console.error("Stripe Connection Error:", error);
          alert("Грешка при свързване със Stripe. Моля опитайте пак.");
      } finally {
          setIsStripeLoading(false);
      }
  };

  const handleRefreshStripeStatus = async (type: 'individual' | 'company') => {
      if (!user.id) return;
      setIsStripeLoading(true);
      try {
          const result = await stripeService.checkStripeStatus(user.id, type);
          if (result.onboardingComplete) {
              alert(`Успешно свързване като ${type === 'company' ? 'фирма' : 'физическо лице'}!`);
          } else {
              alert("Акаунтът все още не е напълно конфигуриран в Stripe. Моля довършете всички стъпки там.");
          }
      } catch (error) {
          console.error("Status check failed:", error);
      } finally {
          setIsStripeLoading(false);
      }
  };

  const handleOpenStripeDashboard = async (type: 'individual' | 'company') => {
      if (!user.id) return;
      setIsStripeLoading(true);
      try {
          const url = await stripeService.createStripeLoginLink(user.id);
          window.open(url, '_blank');
      } catch (error) {
          console.error("Failed to open dashboard:", error);
      } finally {
          setIsStripeLoading(false);
      }
  };

  const getAvatar = (url?: string) => {
    if (!url || url.includes('dicebear')) return DEFAULT_AVATAR;
    return url;
  };

  const handleResetStripe = async () => {
    if (!window.confirm("Сигурни ли сте, че искате да изчистите Stripe данните си? Това ще прекъсне текущата връзка и ще ви позволи да се регистрирате наново.")) return;
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        stripeAccountId: deleteField(),
        stripeOnboardingComplete: deleteField(),
        stripeAccountId_individual: deleteField(),
        stripeOnboardingComplete_individual: deleteField(),
        stripeAccountId_company: deleteField(),
        stripeOnboardingComplete_company: deleteField()
      });
      alert("Stripe данните бяха изчистени успешно! Моля, опреснете страницата.");
      window.location.reload();
    } catch (error) {
      console.error("Reset Stripe failed", error);
      alert("Неуспешно изчистване на данните.");
    }
  };

  const tabs = [
     { id: 'CREATED', label: t('profile_tab_created'), icon: <Briefcase size={16}/> },
     { id: 'COMPLETED', label: t('profile_tab_completed'), icon: <Check size={16}/> },
     { id: 'REVIEWS', label: t('profile_tab_reviews'), icon: <Star size={16}/> },
     ...(isCurrentUserProfile ? [
         { id: 'FINANCES', label: t('profile_tab_finances'), icon: <Wallet size={16}/> },
         { id: 'SETTINGS', label: t('profile_tab_settings'), icon: <Settings size={16}/> }
     ] : [])
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-in fade-in duration-300">
        
        {/* Colorful Mesh Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-0" onClick={onClose}></div>
        
        {/* Main Card */}
        <div className="relative w-full h-[100dvh] md:h-[90vh] md:max-w-6xl bg-slate-50/80 md:rounded-[40px] shadow-2xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden z-10 transition-transform duration-300 scrollbar-hide">
            
            {/* LEFT COLUMN: Profile Info */}
            <div className="w-full md:w-[350px] bg-white/40 backdrop-blur-md border-b md:border-b-0 md:border-r border-slate-200/50 flex flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 md:h-full md:overflow-y-auto">
                
                {/* Mobile Close */}
                <button 
                    onClick={onClose}
                    className="md:hidden absolute top-4 right-4 w-9 h-9 bg-black/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-slate-800 z-50 active:scale-90 transition-transform shadow-sm"
                >
                    <X size={20} />
                </button>

                <div className="p-6 flex flex-col items-center text-center min-h-min">
                    
                    {/* NEW: Identity Card with Mesh Gradient */}
                    <div className="w-full relative overflow-hidden rounded-[32px] p-6 mb-6 shadow-xl shadow-indigo-900/20 group transform transition-all duration-500 hover:shadow-indigo-900/30">
                        
                        {/* Dynamic Mesh Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 z-0"></div>
                        <div className="absolute top-[-50%] left-[-50%] w-[120%] h-[120%] bg-white/20 rounded-full blur-[60px] animate-pulse z-0 pointer-events-none"></div>
                        <div className="absolute bottom-[-30%] right-[-30%] w-[100%] h-[100%] bg-purple-400/30 rounded-full blur-[60px] animate-pulse z-0 pointer-events-none" style={{animationDelay: '2s'}}></div>
                        
                        {/* Overlay Texture */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            {/* Avatar */}
                            <div className="relative mb-4 group/avatar">
                                <div className="w-28 h-28 rounded-full p-1 bg-white/20 backdrop-blur-xl ring-1 ring-white/40 shadow-2xl">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900">
                                        <img 
                                            src={getAvatar(user.avatarUrl)} 
                                            className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-700" 
                                            alt={user.name} 
                                        />
                                    </div>
                                </div>
                                {isCurrentUserProfile && (
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 w-8 h-8 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-90"
                                    >
                                        {isUploadingAvatar ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14} />}
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </div>

                            {/* Name */}
                            <h2 className="text-2xl font-black text-white leading-tight mb-2 tracking-tight drop-shadow-md">{user.name}</h2>
                            
                            {/* Roles & Verification Badges */}
                            <div className="flex flex-wrap justify-center gap-2 mb-4">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-inner">
                                    {user.isCompany ? <Building2 size={10} className="text-blue-200" /> : <UserIcon size={10} className="text-blue-200" />}
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                        {user.isCompany ? 'Pro Business' : 'Частно Лице'}
                                    </span>
                                </div>

                                {user.stripeOnboardingComplete ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-in zoom-in duration-300">
                                        <ShieldCheck size={10} className="text-emerald-300" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                            Проверен
                                        </span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
                                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                                            Непотвърден
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* SKILLS / SECTOR TAGS */}
                            <div className="w-full pt-4 border-t border-white/10">
                                <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-2 flex items-center justify-center gap-1 opacity-80">
                                    <Sparkles size={10} /> {t('profile_skills_title') || 'Компетенции'}
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {userSkills.length > 0 ? (
                                        userSkills.map((skill, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold shadow-sm hover:bg-white/20 transition-colors cursor-default">
                                                <span>{skill?.icon}</span>
                                                <span className="leading-none">{skill?.label}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-blue-100/60 italic">
                                            {isCurrentUserProfile ? t('profile_skills_edit_hint') || 'Добавете умения от настройките' : 'Няма добавена информация'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Colorful Stats Grid */}
                    <div className="w-full grid grid-cols-2 gap-3 mb-8">
                         <div className="bg-white/40 backdrop-blur-md p-4 rounded-3xl flex flex-col items-center justify-center border border-white/40 shadow-sm hover:shadow-md transition-shadow group">
                             <div className="mb-2 p-2 bg-amber-50 rounded-full text-amber-500 group-hover:scale-110 transition-transform">
                                <Star size={18} className="fill-current" />
                             </div>
                             <span className="text-2xl font-black text-slate-800">{totalRating.toFixed(1)}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Рейтинг</span>
                         </div>

                         <div className="bg-white/40 backdrop-blur-md p-4 rounded-3xl flex flex-col items-center justify-center border border-white/40 shadow-sm hover:shadow-md transition-shadow group">
                             <div className="mb-2 p-2 bg-purple-50 rounded-full text-purple-500 group-hover:scale-110 transition-transform">
                                 <Check size={18} strokeWidth={4} />
                             </div>
                             <span className="text-2xl font-black text-slate-800">{totalReviewsCount}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Отзиви</span>
                         </div>

                         <div className="col-span-2 bg-slate-50 p-3 rounded-2xl flex items-center justify-between px-5 border border-slate-100">
                             <span className="text-[11px] font-bold text-slate-400 uppercase">Член от</span>
                             <span className="text-sm font-black text-slate-700">{new Date(user.joinedAt).getFullYear()}</span>
                         </div>
                    </div>

                    {isCurrentUserProfile && (
                         <button 
                            onClick={onLogout}
                            className="w-full py-4 rounded-2xl font-bold text-sm bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mt-auto active:scale-95 group"
                         >
                             <LogOut size={18} className="group-hover:-translate-x-1 transition-transform"/>
                             {t('profile_logout')}
                         </button>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Content */}
            <div className="flex-1 flex flex-col bg-transparent md:h-full relative md:overflow-hidden min-h-0">
                
                {/* Desktop Close */}
                <button 
                    onClick={onClose}
                    className="hidden md:flex absolute top-6 right-6 w-9 h-9 bg-[#E5E5EA] hover:bg-[#D1D1D6] rounded-full items-center justify-center transition-all text-slate-500 z-50 active:scale-90"
                >
                    <X size={20} />
                </button>

                {/* iOS Style Segmented Control Navigation */}
                <div className="px-6 md:px-10 pt-6 md:pt-10 pb-4 shrink-0 bg-white/20 backdrop-blur-md z-30 sticky top-0 md:relative">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 hidden md:block tracking-tight">Профил</h1>
                    
                    <div className="relative group">
                        <div className="p-1 bg-black/5 rounded-xl flex overflow-x-auto scrollbar-hide snap-x md:flex-wrap relative z-10">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] text-xs font-bold whitespace-nowrap transition-all duration-200 snap-center min-w-[30%] md:min-w-0 md:grow
                                        ${activeTab === tab.id 
                                            ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-200/50 transform scale-[1.02]' 
                                            : 'text-slate-500 hover:text-slate-800'
                                        }
                                    `}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {/* Shadow Gradient for scroll on mobile only */}
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none rounded-r-xl flex items-center justify-end pr-1 md:hidden z-20">
                            <ChevronRight size={14} className="text-slate-400 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 md:overflow-y-auto px-6 md:px-10 py-4 scrollbar-thin pb-32 md:pb-10 min-h-[50vh]">
                    
                    {/* STRIPE WARNING BANNER (Visible if not connected) */}
                    {isCurrentUserProfile && !user.stripeOnboardingComplete && (
                        <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-5 mb-6 animate-in slide-in-from-top-4 duration-500 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                        <AlertCircle size={24} />
                                    </div>
                                    <h3 className="font-black text-slate-800 text-base">Изисква се действие</h3>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed mb-4 max-w-lg">
                                    За да <b>получавате плащания</b> и да имате статус <span className="font-bold text-emerald-600">Проверен</span>, трябва да свържете банковата си сметка чрез Stripe.
                                </p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-amber-200 flex items-center gap-1"><ShieldCheck size={10} className="text-emerald-500"/> Сигурни плащания</span>
                                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-amber-200 flex items-center gap-1"><Zap size={10} className="text-blue-500"/> Бързи преводи</span>
                                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-amber-200 flex items-center gap-1"><Award size={10} className="text-purple-500"/> Доверие</span>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('FINANCES')}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    Свържи Акаунт <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- CREATED TASKS --- */}
                    {activeTab === 'CREATED' && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {createdTasks.length === 0 && (
                                <div className="col-span-full">
                                    <EmptyState icon={<Briefcase size={32} />} title={t('profile_empty_created')} sub={t('profile_empty_created_sub')} />
                                </div>
                            )}
                            {createdTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    onClick={() => onTaskClick(task)} 
                                    className="bg-white p-2 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-[0.98] border border-slate-100 flex flex-col h-full"
                                >
                                    <div className="relative aspect-square rounded-[24px] overflow-hidden bg-slate-100 mb-3 shrink-0">
                                        <img src={task.imageUrl || fallbackImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                        <div className="absolute top-2 right-2">
                                            <StatusBadge status={task.status} />
                                        </div>
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <div className="bg-white/90 backdrop-blur-md rounded-xl p-2 shadow-sm flex items-center justify-between border border-white/20">
                                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Calendar size={10} /> {new Date(task.createdAt).toLocaleDateString()}</span>
                                                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                                                    <ArrowRight size={12} className="text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2 pb-2">
                                        <h4 className="font-bold text-slate-800 text-[11px] line-clamp-2 leading-tight uppercase tracking-tight">{task.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- COMPLETED TASKS --- */}
                    {activeTab === 'COMPLETED' && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {completedTasks.length === 0 && (
                                <div className="col-span-full">
                                    <EmptyState icon={<Check size={32} />} title={t('profile_empty_completed')} sub={t('profile_empty_completed_sub')} />
                                </div>
                            )}
                            {completedTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    onClick={() => onTaskClick(task)} 
                                    className="bg-white rounded-[32px] p-2 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group active:scale-[0.98] border border-slate-100 flex flex-col h-full"
                                >
                                    <div className="relative aspect-square rounded-[24px] overflow-hidden bg-slate-100 mb-3 shrink-0">
                                        <img src={task.completionImageUrl || task.imageUrl || fallbackImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                        <div className="absolute top-2 right-2 z-10">
                                            <div className="bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg shadow-emerald-500/30">
                                                <Check size={14} strokeWidth={4} />
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <div className="bg-white/90 backdrop-blur-md rounded-xl p-2 shadow-sm flex items-center justify-between border border-white/20">
                                                <span className="text-[9px] font-black text-slate-800 uppercase truncate pr-1">
                                                    {task.acceptedPrice ? `${task.acceptedPrice}€` : 'Done'}
                                                </span>
                                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                                    <ArrowRight size={10} className="text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2 pb-2 flex-1 flex flex-col">
                                        <h4 className="font-bold text-slate-800 text-[11px] line-clamp-2 leading-tight mb-2 uppercase tracking-tight">{task.title}</h4>
                                        <div className="mt-auto flex items-center gap-1.5 pt-2 border-t border-slate-50">
                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                                                {task.requesterName.charAt(0)}
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 truncate">за {task.requesterName}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- REVIEWS --- */}
                    {activeTab === 'REVIEWS' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-fit mx-auto">
                                <button 
                                    onClick={() => setReviewRole('PROVIDER')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reviewRole === 'PROVIDER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    {t('profile_reviews_provider')}
                                </button>
                                <button 
                                    onClick={() => setReviewRole('REQUESTER')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reviewRole === 'REQUESTER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    {t('profile_reviews_requester')}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(reviewRole === 'PROVIDER' ? providerReviews : requesterReviews).length === 0 && (
                                    <div className="col-span-full">
                                        <EmptyState icon={<Star size={32} />} title="Няма отзиви" sub="Все още няма оставени мнения." />
                                    </div>
                                )}
                                {(reviewRole === 'PROVIDER' ? providerReviews : requesterReviews).map(review => (
                                    <div key={review.id} onClick={() => review.taskContext && onTaskClick(review.taskContext)} className="bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-200">
                                                        {review.fromUser.charAt(0)}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-md border border-slate-50">
                                                        <Star size={10} className="text-amber-400 fill-amber-400" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{review.fromUser}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <StarRating rating={review.rating} size={10} />
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[9px] text-slate-400 font-black bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        
                                        <div className="flex-1 bg-slate-50/50 rounded-[24px] p-4 border border-slate-100/50 mb-4 relative group-hover:bg-indigo-50/30 transition-colors">
                                            <p className="text-xs text-slate-700 italic leading-relaxed">
                                                "{review.comment}"
                                            </p>
                                            <Sparkles size={16} className="absolute -top-2 -right-2 text-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-auto">
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                <Briefcase size={12} className="text-indigo-400" />
                                                <span className="truncate max-w-[120px]">{review.taskContext?.title || "Задача"}</span>
                                            </div>
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <ArrowRight size={12} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- FINANCES (STRIPE CONNECT INTEGRATION) --- */}
                    {activeTab === 'FINANCES' && isCurrentUserProfile && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
                            
                            {/* Wallet Card */}
                            <div className="bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] rounded-[24px] p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden mb-6 h-56 flex flex-col justify-between ring-1 ring-white/10 group transform transition-transform hover:scale-[1.02]">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] -mr-10 -mt-10"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px] -ml-5 -mb-5"></div>
                                
                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold tracking-wide uppercase flex items-center gap-1">
                                        <Wallet size={10} /> Needo Balance
                                    </div>
                                    <div className="text-[10px] font-black tracking-widest opacity-50 uppercase">Powered by Stripe</div>
                                </div>
                                
                                <div className="relative z-10">
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Available for Payout</p>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-5xl font-black tracking-tight">
                                            {((individualBalance?.available || 0) + (companyBalance?.available || 0) || totalEarnings).toFixed(2)}
                                        </span>
                                        <span className="text-xl font-bold text-blue-400">EUR</span>
                                    </div>

                                    {((individualBalance?.pending || 0) + (companyBalance?.pending || 0)) > 0 && (
                                        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-white/70">
                                                Pending: <span className="text-white">{((individualBalance?.pending || 0) + (companyBalance?.pending || 0)).toFixed(2)} EUR</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                                    {user.stripeOnboardingComplete ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Stripe Connected</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">No Payout Method</span>
                                        </div>
                                    )}
                                    <span className="font-mono text-xs text-white/40 tracking-widest">
                                        {user.stripeAccountId ? `ID: ...${user.stripeAccountId.slice(-4)}` : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* INDIVIDUAL ACCOUNT CARD */}
                                <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <UserIcon size={18} className="text-blue-500" />
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Физическо лице</h3>
                                        </div>
                                        {user.stripeOnboardingComplete_individual || user.stripeOnboardingComplete ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-200 uppercase">Свързан</span>
                                        ) : (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-200 uppercase">Неактивен</span>
                                        )}
                                    </div>

                                    {(user.stripeOnboardingComplete_individual || user.stripeOnboardingComplete) ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Наличен Баланс</p>
                                                    <p className="text-xl font-black text-slate-900">{individualBalance?.available || 0} €</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">В изчакване</p>
                                                    <p className="text-sm font-bold text-slate-500">{individualBalance?.pending || 0} €</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleOpenStripeDashboard('individual')}
                                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                            >
                                                <ExternalLink size={14} /> Stripe Dashboard (Личен)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 mb-4">Кандидатствайте като физическо лице и получавайте плащания директно.</p>
                                            <button 
                                                onClick={() => handleConnectStripe('individual')}
                                                disabled={isStripeLoading}
                                                className="w-full py-3 bg-[#635BFF] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                            >
                                                {isStripeLoading ? <Loader2 size={14} className="animate-spin" /> : "Свържи личен акаунт"}
                                            </button>
                                            <button 
                                                onClick={() => handleRefreshStripeStatus('individual')}
                                                className="w-full mt-2 py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                                            >
                                                Провери статус
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* COMPANY ACCOUNT CARD */}
                                <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={18} className="text-indigo-500" />
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Фирма</h3>
                                        </div>
                                        {user.stripeOnboardingComplete_company ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-200 uppercase">Свързан</span>
                                        ) : (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-200 uppercase">Неактивен</span>
                                        )}
                                    </div>

                                    {user.stripeOnboardingComplete_company ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                                                <div>
                                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Баланс Фирма</p>
                                                    <p className="text-xl font-black text-slate-900">{companyBalance?.available || 0} €</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">В изчакване</p>
                                                    <p className="text-sm font-bold text-slate-500">{companyBalance?.pending || 0} €</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleOpenStripeDashboard('company')}
                                                className="w-full py-3 bg-indigo-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                            >
                                                <ExternalLink size={14} /> Stripe Dashboard (Фирма)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="space-y-3 mb-4">
                                                <input 
                                                    type="text"
                                                    value={stripeCompanyName}
                                                    onChange={(e) => setStripeCompanyName(e.target.value)}
                                                    placeholder="Име на фирмата..."
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#635BFF]"
                                                />
                                                <input 
                                                    type="text"
                                                    value={stripeTaxId}
                                                    onChange={(e) => setStripeTaxId(e.target.value)}
                                                    placeholder="ЕИК / Булстат..."
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#635BFF]"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleConnectStripe('company')}
                                                disabled={isStripeLoading}
                                                className="w-full py-3 bg-[#635BFF] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                            >
                                                {isStripeLoading ? <Loader2 size={14} className="animate-spin" /> : "Свържи фирмен акаунт"}
                                            </button>
                                            <button 
                                                onClick={() => handleRefreshStripeStatus('company')}
                                                className="w-full mt-2 py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                                            >
                                                Провери статус
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Transaction History */}
                            <div className="mt-8">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Последни транзакции</h4>
                                <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                                    {(individualTransactions.length > 0 || companyTransactions.length > 0) ? (
                                        <div className="divide-y divide-slate-50">
                                            {[...individualTransactions, ...companyTransactions]
                                                .sort((a, b) => b.created - a.created)
                                                .slice(0, 10)
                                                .map(tx => (
                                                <div key={tx.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                                            {tx.amount > 0 ? <ArrowRight size={16} className="-rotate-45" /> : <Clock size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{tx.description}</p>
                                                            <p className="text-[9px] text-slate-400 font-medium">
                                                                {new Date(tx.created * 1000).toLocaleDateString('bg-BG', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black ${Number(tx.amount) > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                            {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount || 0).toFixed(2)} {(tx.currency || 'eur').toUpperCase()}
                                                        </p>
                                                        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">{tx.status}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-200">
                                                <Wallet size={20} />
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium">Няма открити скорошни транзакции.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* --- SETTINGS (iOS List Style) --- */}
                    {activeTab === 'SETTINGS' && isCurrentUserProfile && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
                            
                             <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.stripeOnboardingComplete_company ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">Статус на акаунта</h4>
                                        <p className="text-[10px] text-slate-500">
                                            {user.stripeOnboardingComplete_company ? 'Активен като Фирма' : 'Активен като Лице'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                    Типът на вашия акаунт се определя автоматично спрямо свързаните Stripe сметки в таб "Финанси".
                                </p>
                            </div>

                            {/* Skills - Grid Selection */}
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-4">Профил и Умения (Публично)</h3>
                            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 mb-8">
                                <p className="text-xs text-slate-500 mb-4 font-medium">Отбележете сферите си на дейност. Те ще се виждат в профила ви и ще получавате известия за тях.</p>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES_LIST.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryToggle(cat.id)}
                                            className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
                                                selectedCategories.includes(cat.id) 
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span>{cat.icon}</span>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* DANGER ZONE */}
                            <div className="mt-12 pt-8 border-t border-red-100">
                                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 ml-4">Опасна зона</h3>
                                <div className="bg-red-50/50 rounded-[24px] p-6 border border-red-100 shadow-sm">
                                    <p className="text-[11px] text-red-400 mb-4 font-medium leading-relaxed">
                                        Ако имате проблеми със свързването на Stripe акаунта (например грешка "Access revoked"), можете да изчистите текущата връзка от тук.
                                    </p>
                                    <button 
                                        onClick={handleResetStripe} 
                                        className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-50"
                                    >
                                        <AlertTriangle size={16} />
                                        Изчисти Stripe връзката
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: TaskStatus }) => {
    let style = "bg-slate-100 text-slate-600";
    switch(status) {
        case TaskStatus.OPEN: style = "bg-blue-100 text-blue-700"; break;
        case TaskStatus.IN_PROGRESS: style = "bg-purple-100 text-purple-700"; break;
        case TaskStatus.CLOSED: style = "bg-green-100 text-green-700"; break;
        case TaskStatus.DISPUTED: style = "bg-red-100 text-red-700"; break;
        case TaskStatus.AWAITING_PAYMENT: style = "bg-amber-100 text-amber-700"; break;
    }
    
    return (
        <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-wide shadow-sm ${style}`}>
            {status}
        </span>
    );
};

const EmptyState = ({ icon, title, sub }: any) => (
    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-white rounded-[20px] flex items-center justify-center mb-4 shadow-sm border border-slate-100 text-slate-300">
            {icon}
        </div>
        <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
        <p className="text-xs text-slate-400 font-medium max-w-[200px]">{sub}</p>
    </div>
);
