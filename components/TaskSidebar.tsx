
// ... existing imports ...
import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, Offer, Review, User } from '../types';
import { X, DollarSign, Clock, User as UserIcon, ShieldCheck, Briefcase, MapPin, Calendar, AlignLeft, ChevronDown, Zap, TrendingDown, Image as ImageIcon, Camera, UploadCloud, Quote, Star, ChevronRight, ChevronLeft, CheckCircle, MessageSquare, Timer, CalendarClock, ArrowRight, Map, Phone, Lock, ZoomIn, Heart, Sparkles, LogIn, Trash2, Building2, PlayCircle, CreditCard, AlertTriangle, AlertCircle, Coins, Info, Check, Trophy, Rocket, ExternalLink, MessageCircle } from 'lucide-react';
import { StarRating } from './StarRating';
import { getUserById } from '../services/authService';
import { calculateDistance } from '../utils/geo';

interface TaskSidebarProps {
  task: Task | null;
  onClose: () => void;
  isRequester: boolean; // True if current user created the task
  currentUserId?: string;
  onAddOffer: (taskId: string, price: number, duration: string, description: string, date: string) => void;
  onAcceptOffer: (taskId: string, offerId: string) => void;
  onFundEscrow: (taskId: string) => void;
  
  // Updated signatures
  onProviderSubmitWork: (taskId: string, completionImage: string, requesterRating: number, requesterReview: string) => void;
  onRequesterApproveWork: (taskId: string, providerRating: number, providerReview: string, completionImage?: string) => void;
  onRaiseDispute: (taskId: string, reason: string, description: string, evidenceImage?: string) => void;

  getProviderRating: (providerId: string) => { average: number; count: number };
  onUserClick: (userId: string) => void;
  onAuthRequest: () => void; 
  onDeleteTask?: (taskId: string) => void;
  userLocation?: [number, number] | null;
  onOpenQA?: () => void;
}

// Helper function for status labels
const getStatusLabel = (status: TaskStatus): string => {
  switch (status) {
    case TaskStatus.OPEN: return 'Активна';
    case TaskStatus.AWAITING_PAYMENT: return 'Очаква плащане';
    case TaskStatus.IN_PROGRESS: return 'В процес';
    case TaskStatus.IN_REVIEW: return 'Предадена / Преглед';
    case TaskStatus.DISPUTED: return 'Оспорвана';
    case TaskStatus.CLOSED: return 'Приключена';
    default: return status;
  }
};

// Needo Logo Placeholder (Blue background with White N)
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=N&background=2563eb&color=fff&size=128&bold=true&length=1";

export const TaskSidebar: React.FC<TaskSidebarProps> = ({ 
  task, 
  onClose, 
  isRequester, 
  currentUserId,
  onAddOffer, 
  onAcceptOffer, 
  onFundEscrow, 
  onProviderSubmitWork,
  onRequesterApproveWork,
  onRaiseDispute,
  getProviderRating,
  onUserClick,
  onAuthRequest,
  onDeleteTask,
  userLocation,
  onOpenQA
}) => {
  const [offerPrice, setOfferPrice] = useState('');
  
  // New Duration State
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('days');

  const [offerDateTime, setOfferDateTime] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [isOfferFormOpen, setIsOfferFormOpen] = useState(false);
  
  // Provider Completion State
  const [completionImage, setCompletionImage] = useState('');
  const [providerRateRequester, setProviderRateRequester] = useState(0);
  const [providerReviewRequester, setProviderReviewRequester] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Requester Approval / Dispute State
  const [requesterRateProvider, setRequesterRateProvider] = useState(0);
  const [requesterReviewProvider, setRequesterReviewProvider] = useState('');
  const [requesterEvidenceImage, setRequesterEvidenceImage] = useState(''); // For completing the task or disputing
  const [isApproving, setIsApproving] = useState(false);
  
  // Dispute Specific
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Лошо изпълнение');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeImage, setDisputeImage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disputeFileRef = useRef<HTMLInputElement>(null);
  const requesterEvidenceRef = useRef<HTMLInputElement>(null);
  // dateInputRef removed as not strictly needed for direct input

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [contactUser, setContactUser] = useState<User | null>(null);

  useEffect(() => {
    const acceptedOffer = task?.offers?.find(o => o.id === task.acceptedOfferId);
    const isDealActive = task && (
        task.status !== TaskStatus.OPEN
    );
    const isParticipant = currentUserId && (currentUserId === task?.requesterId || (acceptedOffer && currentUserId === acceptedOffer.providerId));
    
    if (isDealActive && isParticipant && acceptedOffer && task) {
        const userIdToFetch = (currentUserId === task.requesterId) 
            ? acceptedOffer.providerId 
            : task.requesterId;
        
        getUserById(userIdToFetch).then(user => {
            if (user) setContactUser(user);
        });
    } else {
        setContactUser(null);
    }
  }, [task, currentUserId]);

  if (!task) return null;

  const distance = userLocation ? calculateDistance(userLocation[0], userLocation[1], task.location.lat, task.location.lng) : null;
  const acceptedOffer = task.offers?.find(o => o.id === task.acceptedOfferId);
  const isParticipant = currentUserId && (currentUserId === task.requesterId || (acceptedOffer && currentUserId === acceptedOffer.providerId));
  
  // Determine if I am the provider for this task
  const iAmProvider = isParticipant && !isRequester;

  const taskImages = task.images && task.images.length > 0 ? task.images : [task.imageUrl || 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&auto=format&fit=crop&q=60'];

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % taskImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + taskImages.length) % taskImages.length);

  // Logic for Badges in Offers List
  const safeOffers = task.offers || [];
  const minPrice = safeOffers.length > 0 ? Math.min(...safeOffers.map(o => o.price)) : 0;
  
  // Sort offers by start date to find the earliest one
  // Added safety check for invalid dates to prevent crashes
  const sortedOffersByDate = [...safeOffers]
    .filter(o => o.startDate && !isNaN(new Date(o.startDate).getTime()))
    .sort((a, b) => {
      return new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime();
  });
  const earliestOfferId = sortedOffersByDate.length > 0 ? sortedOffersByDate[0].id : null;


  // Contact Info Logic
  // Show contact info only after payment is deposited (Status is not OPEN and not AWAITING_PAYMENT)
  const showContactInfo = isParticipant && acceptedOffer && 
                          task.status !== TaskStatus.OPEN && 
                          task.status !== TaskStatus.AWAITING_PAYMENT;

  let contactName = '', contactPhone = '', contactRole = '';

  if (acceptedOffer) {
      if (isRequester) {
          contactName = acceptedOffer.providerName;
          contactPhone = contactUser?.phoneNumber || '...';
          contactRole = 'Изпълнител';
      } else {
          contactName = task.requesterName;
          contactPhone = contactUser?.phoneNumber || '...';
          contactRole = 'Възложител';
      }
  }

  // --- HANDLERS ---

  const handleProviderSubmit = () => {
      if (!completionImage) {
          alert('Задължително е да качите снимка на свършената работа.');
          return;
      }
      onProviderSubmitWork(task.id, completionImage, providerRateRequester, providerReviewRequester);
      setIsSubmittingWork(false);
  };

  const handleRequesterApprove = () => {
      // Logic: If rating is 1, it becomes a dispute automatically
      if (requesterRateProvider === 1) {
          if (!requesterReviewProvider.trim()) {
             alert("При оценка 1 звезда е задължително да опишете проблема.");
             return;
          }
          // Raise dispute instead of approving
          onRaiseDispute(task.id, "Ниска оценка (1 звезда)", requesterReviewProvider, requesterEvidenceImage);
          setIsApproving(false);
          return;
      }

      if (requesterRateProvider === 0) {
          alert('Моля, дайте оценка на изпълнителя.');
          return;
      }
      
      onRequesterApproveWork(task.id, requesterRateProvider, requesterReviewProvider, requesterEvidenceImage);
      setIsApproving(false);
  };

  const handleDisputeSubmit = () => {
      if (!disputeDesc) {
          alert('Моля, опишете проблема.');
          return;
      }
      onRaiseDispute(task.id, disputeReason, disputeDesc, disputeImage);
      setIsDisputing(false);
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1024;
          let w = img.width, h = img.height;
          if (w > h && w > MAX) { h *= MAX/w; w = MAX; }
          else if (h > MAX) { w *= MAX/h; h = MAX; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const resized = await resizeImage(file);
            setter(resized);
        } catch(err) { console.error(err); }
    }
  };

  // Clean up avatar if it is legacy dicebear
  const getSafeAvatar = (url?: string) => {
      if (!url || url.includes('dicebear')) return DEFAULT_AVATAR;
      return url;
  };

  return (
    <>
    <div 
      className="fixed right-0 top-0 h-full w-full md:w-[480px] z-50 flex flex-col animate-in slide-in-from-right duration-300 font-sans bg-white shadow-[-10px_0_50px_rgba(0,0,0,0.2)] border-l border-slate-200"
    >
      {/* HEADER IMAGE */}
      <div className="relative h-56 w-full shrink-0 group cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
        <img 
          src={taskImages[currentImageIndex]} 
          alt="Task"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />
        
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 w-8 h-8 bg-black/30 hover:bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white transition-all z-20">
          <X size={18} />
        </button>

        <div className="absolute bottom-0 left-0 w-full p-5 text-white">
            <h2 className="text-xl font-black leading-tight mb-2">{task.title}</h2>
            <div className="flex flex-wrap gap-2">
                 <span className={`px-2 py-0.5 rounded-md backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wide
                    ${task.status === TaskStatus.OPEN ? 'bg-blue-500/60' : ''}
                    ${task.status === TaskStatus.AWAITING_PAYMENT ? 'bg-amber-500/60' : ''}
                    ${task.status === TaskStatus.IN_PROGRESS ? 'bg-purple-500/60' : ''}
                    ${task.status === TaskStatus.IN_REVIEW ? 'bg-indigo-500/60' : ''}
                    ${task.status === TaskStatus.DISPUTED ? 'bg-red-500/60' : ''}
                    ${task.status === TaskStatus.CLOSED ? 'bg-green-500/60' : ''}
                 `}>
                    {getStatusLabel(task.status)}
                 </span>
                 <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md backdrop-blur-md border border-white/10 text-[10px] font-bold">
                    <MapPin size={10} /> {task.address || 'Локация'}
                 </span>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 scrollbar-hide bg-slate-50">
        
        {/* --- STATUS ACTION BLOCKS --- */}

        {/* 1. AWAITING PAYMENT */}
        {task.status === TaskStatus.AWAITING_PAYMENT && acceptedOffer && (
             <div className="mb-4 bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                     <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                         <CreditCard size={20} />
                     </div>
                     <div>
                         <h4 className="font-bold text-slate-800 text-sm">Офертата е приета</h4>
                         <p className="text-xs text-slate-500">
                           {isRequester ? 'Депозирайте сумата, за да стартира работата.' : 'Изчаква се депозит от възложителя.'}
                         </p>
                     </div>
                </div>
                {isRequester ? (
                    <button 
                        onClick={() => onFundEscrow(task.id)}
                        className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                    >
                        <ShieldCheck size={18} />
                        Депозирай {acceptedOffer.price} лв. (Escrow)
                    </button>
                ) : (
                    <div className="w-full py-2 bg-amber-50 text-amber-600 rounded-xl font-bold text-xs text-center border border-amber-100 animate-pulse">
                        Очаква се плащане...
                    </div>
                )}
             </div>
        )}

        {/* 2. IN PROGRESS (Active Work) */}
        {task.status === TaskStatus.IN_PROGRESS && (
             <div className="mb-4 bg-white rounded-2xl border border-purple-100 p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                <div className="flex items-center gap-3 mb-3">
                     <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                         <Briefcase size={20} />
                     </div>
                     <div>
                         <h4 className="font-bold text-slate-800 text-sm">Работата е в процес</h4>
                         <p className="text-xs text-slate-500">Сумата е защитена. {iAmProvider ? 'Изпълнете задачата и я предайте.' : 'Изчакайте изпълнителя да приключи.'}</p>
                     </div>
                </div>
                
                {/* PROVIDER ACTION: SUBMIT WORK */}
                {iAmProvider && !isSubmittingWork && (
                    <button 
                        onClick={() => setIsSubmittingWork(true)}
                        className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} />
                        Завърших Задачата
                    </button>
                )}

                {iAmProvider && isSubmittingWork && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-purple-100 animate-in fade-in">
                        <h5 className="font-bold text-sm text-slate-800 mb-3">Отчитане на дейност</h5>
                        
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">1. Доказателство (Снимка) *</label>
                            <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-white text-center cursor-pointer hover:bg-purple-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, setCompletionImage)} className="hidden" accept="image/*" />
                                {completionImage ? (
                                    <div className="relative">
                                        <img src={completionImage} className="h-32 w-full object-cover rounded-lg" alt="Proof" />
                                        <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-2 rounded-full">OK</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 py-4 text-slate-400">
                                        <Camera size={24} />
                                        <span className="text-xs font-bold">Натисни за снимка</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">2. Оцени клиента</label>
                            <div className="bg-white p-2 rounded-xl border border-slate-200 flex justify-center">
                                <StarRating rating={providerRateRequester} setRating={setProviderRateRequester} size={24} interactive={true} />
                            </div>
                        </div>

                        <textarea 
                            value={providerReviewRequester}
                            onChange={(e) => setProviderReviewRequester(e.target.value)}
                            placeholder="Беше ли коректен клиента? (Коментар)"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs mb-3 outline-none focus:border-purple-400 resize-none"
                            rows={2}
                        />

                        <div className="flex gap-2">
                             <button onClick={handleProviderSubmit} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs shadow-md">Предай за Одобрение</button>
                             <button onClick={() => setIsSubmittingWork(false)} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs">Отказ</button>
                        </div>
                    </div>
                )}
             </div>
        )}

        {/* 3. IN REVIEW (Provider Submitted) */}
        {task.status === TaskStatus.IN_REVIEW && (
             <div className="mb-4 bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex items-center gap-3 mb-3">
                     <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                         <Clock size={20} />
                     </div>
                     <div>
                         <h4 className="font-bold text-slate-800 text-sm">Изчаква Одобрение</h4>
                         <p className="text-xs text-slate-500">
                            {isRequester 
                                ? 'Прегледайте работата и освободете плащането.' 
                                : 'Клиентът има 24ч да прегледа работата.'}
                         </p>
                     </div>
                </div>

                {/* SHOW SUBMITTED WORK */}
                {task.completionImageUrl && (
                    <div className="mb-4 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                        <div className="relative h-40 w-full group cursor-zoom-in">
                            <img src={task.completionImageUrl} alt="Completed Work" className="w-full h-full object-cover" onClick={() => { setIsLightboxOpen(true); setCurrentImageIndex(0); /* Hacky but works for demo */ }} />
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Свършена работа</div>
                        </div>
                    </div>
                )}

                {/* REQUESTER ACTIONS */}
                {isRequester && !isApproving && !isDisputing && (
                    <div className="flex flex-col gap-2">
                         <button 
                            onClick={() => setIsApproving(true)}
                            className="w-full py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={18} />
                            Прегледай и Оцени
                        </button>
                        <button 
                            onClick={() => setIsDisputing(true)}
                            className="w-full py-2.5 bg-white border border-red-100 text-red-500 rounded-xl font-bold text-xs hover:bg-red-50 transition-colors"
                        >
                            Задачата НЕ е изпълнена
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-1">
                            Автоматично одобрение след: <span className="font-bold text-slate-600">23ч 59мин</span>
                        </p>
                    </div>
                )}

                {/* APPROVAL FORM */}
                {isRequester && isApproving && (
                     <div className="bg-slate-50 p-4 rounded-xl border border-green-100 animate-in fade-in">
                        <h5 className="font-bold text-sm text-slate-800 mb-3 text-center">Оценка и Плащане</h5>
                        
                        <div className="mb-4 flex flex-col items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2">Оценете Изпълнителя</label>
                            <StarRating rating={requesterRateProvider} setRating={setRequesterRateProvider} size={32} interactive={true} />
                            
                            {requesterRateProvider === 1 && (
                                <div className="mt-2 bg-red-100 text-red-700 p-2 rounded-lg text-xs font-bold text-center border border-red-200">
                                    Внимание: Оценка 1 звезда ще отвори диспут и ще изпрати задачата към администратор!
                                </div>
                            )}
                        </div>

                        <textarea 
                            value={requesterReviewProvider}
                            onChange={(e) => setRequesterReviewProvider(e.target.value)}
                            placeholder={requesterRateProvider === 1 ? "Моля опишете защо не сте доволни..." : "Напишете отзив (опционално)..."}
                            className={`w-full p-3 bg-white border rounded-xl text-xs mb-3 outline-none resize-none transition-colors ${requesterRateProvider === 1 ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-green-400'}`}
                            rows={3}
                        />

                        {/* Optional photo for review/dispute */}
                        <div className="mb-3 border border-dashed border-slate-300 rounded-xl p-2 bg-white text-center cursor-pointer hover:bg-slate-50" onClick={() => requesterEvidenceRef.current?.click()}>
                                <input type="file" ref={requesterEvidenceRef} onChange={(e) => handleFileChange(e, setRequesterEvidenceImage)} className="hidden" accept="image/*" />
                                {requesterEvidenceImage ? (
                                    <div className="text-xs font-bold text-green-600 flex items-center justify-center gap-1"><CheckCircle size={12} /> Снимка добавена</div>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400 flex items-center justify-center gap-1"><Camera size={12}/> Добави снимка (опция)</span>
                                )}
                        </div>

                        <div className="flex gap-2">
                             <button 
                                onClick={handleRequesterApprove} 
                                className={`flex-1 py-2.5 text-white rounded-xl font-bold text-xs shadow-md transition-colors ${requesterRateProvider === 1 ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                             >
                                {requesterRateProvider === 1 ? 'Изпрати Сигнал (Админ)' : 'Освободи Плащането'}
                             </button>
                             <button onClick={() => setIsApproving(false)} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs">Отказ</button>
                        </div>
                     </div>
                )}

                {/* DISPUTE FORM (Direct "Not Done" Click) */}
                {isRequester && isDisputing && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in">
                        <h5 className="font-bold text-sm text-red-800 mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} /> Оспорване на задачата
                        </h5>
                        
                        <p className="text-xs text-red-600 mb-3">
                            Подаването на сигнал ще замрази плащането и ще извика администратор за преглед.
                        </p>

                        <select 
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            className="w-full p-2 bg-white border border-red-200 rounded-xl text-xs font-bold text-slate-700 mb-3 outline-none"
                        >
                            <option>Задачата не е изпълнена</option>
                            <option>Лошо изпълнение</option>
                            <option>Некоректно отношение</option>
                            <option>Друго</option>
                        </select>

                        <textarea 
                            value={disputeDesc}
                            onChange={(e) => setDisputeDesc(e.target.value)}
                            placeholder="Опишете проблема детайлно..."
                            className="w-full p-3 bg-white border border-red-200 rounded-xl text-xs mb-3 outline-none focus:border-red-400 resize-none"
                            rows={3}
                        />

                        <div className="border border-dashed border-red-200 rounded-xl p-3 bg-white mb-3 text-center cursor-pointer" onClick={() => disputeFileRef.current?.click()}>
                            <input type="file" ref={disputeFileRef} onChange={(e) => handleFileChange(e, setDisputeImage)} className="hidden" accept="image/*" />
                            {disputeImage ? (
                                <div className="text-xs font-bold text-green-600 flex items-center justify-center gap-1"><CheckCircle size={12} /> Снимка качена</div>
                            ) : (
                                <span className="text-xs font-bold text-slate-400">+ Доказателство за проблем</span>
                            )}
                        </div>

                        <div className="flex gap-2">
                             <button onClick={handleDisputeSubmit} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-xs shadow-md">Изпрати на Админ</button>
                             <button onClick={() => setIsDisputing(false)} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs">Отказ</button>
                        </div>
                    </div>
                )}
             </div>
        )}

        {/* 4. DISPUTED */}
        {task.status === TaskStatus.DISPUTED && (
             <div className="mb-4 bg-red-50 rounded-2xl border border-red-100 p-5 shadow-sm">
                 <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                         <ShieldCheck size={20} />
                     </div>
                     <div>
                         <h4 className="font-bold text-red-800 text-sm">Задачата е оспорена</h4>
                         <p className="text-xs text-red-600">Администратор разглежда случая.</p>
                     </div>
                 </div>
                 {task.dispute && (
                     <div className="bg-white p-3 rounded-xl border border-red-100 text-xs text-slate-600 mt-2">
                         <p className="font-bold mb-1 text-red-700">{task.dispute.reason}</p>
                         <p className="italic">"{task.dispute.description}"</p>
                     </div>
                 )}
             </div>
        )}

        {/* 5. CLOSED */}
        {task.status === TaskStatus.CLOSED && (
             <div className="mb-4 bg-green-50 rounded-2xl border border-green-100 p-5 shadow-sm text-center">
                 <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                     <CheckCircle size={24} />
                 </div>
                 <h4 className="font-bold text-green-800 text-sm">Успешно завършена!</h4>
                 <p className="text-xs text-green-600 mb-2">Плащането е освободено.</p>
                 
                 {/* Show Reviews Summary */}
                 {task.reviews && task.reviews.length > 0 && (
                     <div className="mt-4 text-left bg-white rounded-xl p-3 border border-green-100 shadow-sm">
                         {task.reviews.map((rev, i) => (
                             <div key={i} className="mb-3 last:mb-0 border-b last:border-0 border-slate-50 pb-2 last:pb-0">
                                 <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase mb-1">
                                     <span>{rev.fromUser}</span>
                                     <StarRating rating={rev.rating} size={10} />
                                 </div>
                                 <p className="text-xs text-slate-700 italic">"{rev.comment}"</p>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        )}

        {/* --- DETAILS CARD --- */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-900 rounded-[24px] shadow-lg mb-6 overflow-hidden text-white relative">
            {/* Subtle Pattern */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>

            <div className="p-4 flex items-center justify-between relative z-10">
                 {/* User Info - White Text */}
                 <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(task.requesterId)}>
                     <img 
                        src={getSafeAvatar(task.requesterAvatar)} 
                        className="w-10 h-10 rounded-full border-2 border-white/30" 
                        alt="" 
                     />
                     <div>
                         <p className="text-sm font-bold text-white">{task.requesterName}</p>
                         <div className="flex items-center gap-1 text-blue-100">
                            <StarRating rating={task.requesterRating || 0} size={10} />
                         </div>
                     </div>
                 </div>
                 <span className="text-[10px] font-bold text-blue-100 bg-white/10 px-2 py-1 rounded-lg">
                    {new Date(task.createdAt).toLocaleDateString('bg-BG')}
                 </span>
            </div>
            
            {/* Description Box - The "Middle" part (MODERN BEIGE STYLE) */}
            <div className="mx-2 mb-4 bg-gradient-to-br from-[#FFFAF0] to-[#FFF5E1] rounded-[24px] p-6 shadow-sm border border-amber-100 relative z-10 overflow-hidden group-hover:shadow-md transition-all">
                {/* Decorative quote icon */}
                <div className="absolute top-2 right-4 text-amber-900/5">
                     <Quote size={60} />
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-amber-400 rounded-full"></div>
                    <span className="text-[10px] font-black text-amber-800/60 uppercase tracking-widest">Описание на задачата</span>
                </div>

                <p className="text-sm font-medium leading-relaxed whitespace-pre-line text-slate-800 relative z-10">
                    {task.description}
                </p>
            </div>

            {/* Questions Section - Footer */}
            <div className="px-5 py-3 flex items-center justify-between relative z-10">
                 <div className="flex items-center gap-2 text-xs font-bold text-blue-100">
                     <MessageCircle size={16} />
                     {task.questions?.length || 0} въпроса
                 </div>
                 <button 
                    onClick={onOpenQA} 
                    className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-full text-xs font-black hover:bg-yellow-300 transition-all shadow-lg flex items-center gap-2"
                 >
                     Задай въпрос <ChevronRight size={12} />
                 </button>
            </div>
        </div>

        {/* --- CONTACT INFO (When Active - PAID) --- */}
        {showContactInfo && (
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm mb-6 flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                     <Phone size={18} />
                 </div>
                 <div>
                     <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Контакт с {contactRole}</p>
                     <p className="font-bold text-slate-800 text-sm">{contactName}</p>
                     <a href={`tel:${contactPhone}`} className="text-lg font-black text-slate-900 hover:text-blue-600 transition-colors">
                         {contactPhone}
                     </a>
                 </div>
            </div>
        )}

        {/* --- LOCKED CONTACT INFO (Awaiting Payment) --- */}
        {isParticipant && acceptedOffer && task.status === TaskStatus.AWAITING_PAYMENT && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                     <Lock size={18} />
                 </div>
                 <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Контактни данни</p>
                     <p className="font-bold text-slate-500 text-xs">Скрити до извършване на депозит</p>
                 </div>
            </div>
        )}

        {/* --- AI PRICE PANEL (Enhanced) --- */}
        {/* ONLY SHOW IF NO OFFERS YET */}
        {task.aiEstimatedPrice && safeOffers.length === 0 && (
            <div className="mb-6 rounded-[24px] bg-gradient-to-r from-blue-600 to-indigo-900 p-5 text-white shadow-xl relative overflow-hidden group">
                 {/* Decorative elements */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                 <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
                 
                 <div className="relative z-10">
                     <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-2">
                             <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                 <Sparkles size={20} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                             </div>
                             <div>
                                 <h4 className="font-black text-lg leading-none">AI Прогноза</h4>
                                 <p className="text-[10px] text-blue-200 uppercase tracking-wider font-bold mt-1">Пазарен Анализ</p>
                             </div>
                         </div>
                         <div className="text-right">
                             <span className="block text-2xl font-black tracking-tight">{task.aiEstimatedPrice}</span>
                         </div>
                     </div>
                     
                     <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-xs font-medium text-blue-50 leading-relaxed flex items-start gap-2">
                         <Info size={14} className="shrink-0 mt-0.5" />
                         <p>
                             Цената е базирана на подобни задачи в района и текущите пазарни нива за категорията "{task.category}". 
                             Крайната сума зависи от използваните материали и експертизата на изпълнителя.
                         </p>
                     </div>
                 </div>
            </div>
        )}

        {/* --- OFFERS LIST --- */}
        <div className="mt-4">
             <div className="flex items-center justify-between mb-3 px-1">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Оферти ({safeOffers.length})</h3>
             </div>
             
             {safeOffers.length === 0 && (
                 <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                     <p className="text-sm font-bold text-slate-500 mb-1">Няма оферти все още</p>
                     <p className="text-xs text-slate-400">Бъди първият, който ще предложи цена!</p>
                 </div>
             )}

             <div className="space-y-4">
                 {safeOffers.map(offer => {
                     // Hide other offers if accepted
                     if (task.acceptedOfferId && task.acceptedOfferId !== offer.id) return null;
                     
                     const isAccepted = task.acceptedOfferId === offer.id;
                     const isBestPrice = offer.price === minPrice && safeOffers.length > 1;
                     const isEarliest = offer.id === earliestOfferId && safeOffers.length > 1;

                     // Calculate REAL rating for this provider
                     const providerRatingInfo = getProviderRating(offer.providerId);
                     const hasRatings = providerRatingInfo.count > 0;

                     return (
                         <div key={offer.id} className={`rounded-[24px] p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md mb-4
                            ${isAccepted 
                                ? 'border-2 border-green-500 ring-4 ring-green-100 bg-white' 
                                : 'border-2 border-sky-200 hover:border-sky-400 bg-white'
                            } 
                         `}>
                             
                             {/* Header Row: Provider Info & Price Label */}
                             <div className="flex justify-between items-start mb-4">
                                 
                                 {/* Clickable Provider Panel - SEPARATE MODERN CARD */}
                                 <div 
                                    className="flex items-center gap-3 cursor-pointer group p-2 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 pr-4"
                                    onClick={(e) => { e.stopPropagation(); onUserClick(offer.providerId); }}
                                 >
                                     <div className="relative">
                                         <img src={getSafeAvatar(offer.providerAvatar)} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                                         {offer.providerIsCompany && (
                                            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full border-2 border-white">
                                                <Briefcase size={10} />
                                            </div>
                                         )}
                                     </div>
                                     <div>
                                         <div className="flex items-center gap-1">
                                             <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 max-w-[100px]">{offer.providerName}</p>
                                         </div>
                                         <div className="flex items-center gap-1 text-[10px] mt-0.5">
                                             {hasRatings ? (
                                                 <>
                                                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                                    <span className="font-bold text-slate-700">{providerRatingInfo.average.toFixed(1)}</span>
                                                    <span className="text-slate-400">({providerRatingInfo.count})</span>
                                                 </>
                                             ) : (
                                                 <span className="text-slate-400 italic">Нов</span>
                                             )}
                                         </div>
                                     </div>
                                     <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors ml-1" />
                                 </div>

                                 {/* Price Section - MODERN GREEN BUBBLE */}
                                 <div className="text-right">
                                     <div className="flex flex-col items-end gap-1">
                                         {isBestPrice && (
                                            <span className="bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wide border border-green-200">
                                                <Trophy size={9} /> Най-изгодна
                                            </span>
                                         )}
                                         {isEarliest && !isBestPrice && (
                                            <span className="bg-purple-100 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wide border border-purple-200">
                                                <Rocket size={9} /> Най-скоро
                                            </span>
                                         )}
                                         <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl shadow-md shadow-emerald-200 flex items-center gap-1">
                                             <span className="block text-xl font-black tracking-tight leading-none">{offer.price}</span>
                                             <span className="text-xs font-bold opacity-80">лв.</span>
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Details Grid */}
                             <div className="grid grid-cols-2 gap-3 mb-4">
                                 <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50 flex flex-col justify-center">
                                     <div className="flex items-center gap-1.5 mb-1">
                                         <Clock size={12} className="text-indigo-400" />
                                         <span className="text-[9px] font-bold text-indigo-400 uppercase">Време на изпълнение:</span>
                                     </div>
                                     <span className="text-xs font-bold text-indigo-700">{offer.duration}</span>
                                 </div>
                                 <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50 flex flex-col justify-center">
                                      <div className="flex items-center gap-1.5 mb-1">
                                         <Calendar size={12} className="text-emerald-500" />
                                         <span className="text-[9px] font-bold text-emerald-500 uppercase">Старт на услугата:</span>
                                     </div>
                                     <span className="text-xs font-bold text-emerald-700">
                                        {offer.startDate && !isNaN(new Date(offer.startDate).getTime()) 
                                            ? new Date(offer.startDate).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' }) 
                                            : 'По договаряне'}
                                        {offer.startDate && !isNaN(new Date(offer.startDate).getTime()) 
                                            ? ` ${new Date(offer.startDate).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}` 
                                            : ''}
                                     </span>
                                 </div>
                             </div>
                             
                             {/* Comment Section */}
                             {offer.comment && (
                                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                                     <p className="text-xs text-slate-600 leading-relaxed">
                                        <span className="font-bold text-slate-700 mr-1">Информация:</span>
                                        {offer.comment}
                                     </p>
                                 </div>
                             )}

                             {isRequester && task.status === TaskStatus.OPEN && (
                                 <button 
                                    onClick={() => onAcceptOffer(task.id, offer.id)}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                 >
                                    Приеми Офертата <ArrowRight size={14} />
                                 </button>
                             )}
                         </div>
                     );
                 })}
             </div>
        </div>

        {/* MAKE OFFER BUTTON */}
        {!isRequester && task.status === TaskStatus.OPEN && (
            <div className="mt-8 px-2">
                <button 
                    onClick={() => currentUserId ? setIsOfferFormOpen(true) : onAuthRequest()}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    <Zap size={18} className="fill-white" />
                    КАНДИДАТСТВАЙ СЕГА
                </button>
            </div>
        )}

      </div>
      
      {/* OFFER FORM MODAL OVERLAY (REDESIGNED) */}
      {isOfferFormOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden ring-1 ring-black/5">
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                      <div>
                          <h3 className="font-black text-xl text-slate-800">Изпрати Оферта</h3>
                          <p className="text-xs text-slate-500 font-medium">Попълнете детайлите внимателно</p>
                      </div>
                      <button onClick={() => setIsOfferFormOpen(false)} className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  {/* Scrollable Form */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                      
                      {/* Price Input */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Вашата цена (лв.)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">BGN</span>
                              <input 
                                  type="number" 
                                  placeholder="0.00" 
                                  value={offerPrice} 
                                  onChange={e => setOfferPrice(e.target.value)} 
                                  className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-3xl font-black text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300" 
                                  autoFocus
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                          {/* Duration Input Split */}
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Срок на изпълнение</label>
                              <div className="flex gap-2">
                                <div className="relative group flex-1">
                                    <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={durationValue} 
                                        onChange={e => setDurationValue(e.target.value)} 
                                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm shadow-sm" 
                                    />
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                    <button 
                                        onClick={() => setDurationUnit('days')}
                                        className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${durationUnit === 'days' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Дни
                                    </button>
                                    <button 
                                        onClick={() => setDurationUnit('hours')}
                                        className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${durationUnit === 'hours' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Часа
                                    </button>
                                </div>
                              </div>
                          </div>

                          {/* Date Time Picker Button - REPLACED WITH NATIVE INPUT FOR STABILITY */}
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Дата и час на стартиране</label>
                              <div className="relative w-full group">
                                  {/* Icon - Decorative */}
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 z-10 pointer-events-none group-hover:bg-blue-100 transition-colors">
                                      <CalendarClock size={20} />
                                  </div>

                                  {/* Real Input */}
                                  <input 
                                      type="datetime-local" 
                                      value={offerDateTime} 
                                      onChange={e => setOfferDateTime(e.target.value)}
                                      className="w-full pl-[68px] pr-4 py-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm min-h-[64px]"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Description Input */}
                      <div>
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Описание на офертата</label>
                             <span className={`text-[10px] font-bold ${offerDescription.length >= 10 ? 'text-green-500' : 'text-red-400'}`}>
                                {offerDescription.length} / 10 мин.
                             </span>
                          </div>
                          <textarea 
                              placeholder="Здравейте! Имам над 5 години опит в тази сфера. Разполагам с професионални инструменти и собствен транспорт. Ще използвам качествени материали като..." 
                              value={offerDescription} 
                              onChange={e => setOfferDescription(e.target.value)} 
                              className={`w-full p-4 bg-white border rounded-xl font-medium text-slate-700 focus:ring-2 outline-none transition-all resize-none min-h-[140px] leading-relaxed text-sm placeholder:text-slate-300 shadow-sm ${
                                offerDescription.length > 0 && offerDescription.length < 10 ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                              }`} 
                          />
                          {offerDescription.length > 0 && offerDescription.length < 10 && (
                              <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold animate-in fade-in">Моля, въведете поне 10 символа.</p>
                          )}
                      </div>

                  </div>

                  {/* Footer Button */}
                  <div className="p-5 bg-white border-t border-slate-100 sticky bottom-0 z-10 safe-area-bottom">
                      <button 
                          onClick={() => {
                              const finalDuration = `${durationValue} ${durationUnit === 'days' ? 'дни' : 'часа'}`;
                              if(offerPrice && durationValue && offerDescription.length >= 10 && offerDateTime) {
                                  onAddOffer(task.id, Number(offerPrice), finalDuration, offerDescription, offerDateTime);
                                  setIsOfferFormOpen(false);
                              }
                          }}
                          // Added offerDateTime to disabled condition
                          disabled={!offerPrice || !durationValue || offerDescription.length < 10 || !offerDateTime}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          Изпрати Офертата <ArrowRight size={20} />
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
    
    {/* LIGHTBOX */}
    {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in" onClick={() => setIsLightboxOpen(false)}>
            <img src={taskImages[currentImageIndex]} className="max-w-full max-h-full" alt="" />
        </div>
    )}
    </>
  );
};
