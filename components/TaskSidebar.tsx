
import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, Offer, Review, AppUser } from '../types';
import { X, DollarSign, Clock, User as UserIcon, ShieldCheck, Briefcase, MapPin, Calendar, AlignLeft, ChevronDown, Zap, TrendingDown, Image as ImageIcon, Camera, UploadCloud, Quote, Star, ChevronRight, ChevronLeft, CheckCircle, MessageSquare, Timer, CalendarClock, ArrowRight, Map, Phone, Lock, ZoomIn, Heart, Sparkles, LogIn, Trash2, Building2, PlayCircle, CreditCard, AlertTriangle, AlertCircle, Coins, Info, Check, Trophy, Rocket, ExternalLink, MessageCircle, Tag, Navigation, Verified, Eye, Layers, Wand2, Loader2, FileWarning, Hourglass, Share2, Link2, Copy, Hammer, Award, FileText, BadgeCheck, Users, Maximize2, CheckCircle2, XCircle } from 'lucide-react';
import { StarRating } from './StarRating';
import { getUserById, syncUserProfile } from '../services/authService';
import { calculateDistance } from '../utils/geo';
import { getOfferHelpQuestion, generateOfferPitch } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../firebase';

interface TaskSidebarProps {
    task: Task | null;
    onClose: () => void;
    isRequester: boolean;
    currentUserId?: string;
    onAddOffer: (taskId: string, price: number, duration: string, description: string, date: string, billingType: 'individual' | 'company') => void;
    onAcceptOffer: (taskId: string, offerId: string) => void;
    onFundEscrow: (taskId: string) => void;
    onProviderSubmitWork: (taskId: string, completionImage: string, requesterRating: number, requesterReview: string) => void;
    onRequesterApproveWork: (taskId: string, providerRating: number, providerReview: string, completionImage?: string) => void;
    onRaiseDispute: (taskId: string, reason: string, description: string, evidenceImage?: string) => void;
    getProviderRating: (providerId: string) => { average: number; count: number };
    onUserClick: (userId: string) => void;
    onAuthRequest: () => void;
    onDeleteTask?: (taskId: string) => Promise<void>;
    userLocation?: [number, number] | null;
    onOpenQA?: () => void;
    onOpenChat?: () => void;
    // New Management Props
    onMaterialsRequest?: (taskId: string, amount: number, description: string) => Promise<void>;
    onPayMaterials?: (taskId: string, paymentId: string) => Promise<void>;
    onRejectMaterials?: (taskId: string, paymentId: string, reason: string) => Promise<void>;
    onExtensionRequest?: (taskId: string, newDate: string, reason: string) => Promise<void>;
    onHandleExtension?: (taskId: string, requestId: string, action: 'ACCEPT' | 'REJECT', reason?: string) => Promise<void>;
    onReportCircumstance?: (taskId: string, description: string, extraPrice?: number, extraTime?: string) => Promise<void>;
    onHandleCircumstance?: (taskId: string, circumstanceId: string, action: 'ACCEPT' | 'REJECT', reason?: string) => Promise<void>;
    onMutualCancel?: (taskId: string, reason?: string) => Promise<void>;
    onReportProblem?: (taskId: string, reason: string) => Promise<void>;
}

const DEFAULT_AVATAR = "/logo.jpg";

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
    onOpenQA,
    onOpenChat,
    onMaterialsRequest,
    onPayMaterials,
    onRejectMaterials,
    onExtensionRequest,
    onHandleExtension,
    onReportCircumstance,
    onHandleCircumstance,
    onMutualCancel,
    onReportProblem
}) => {
    const { t } = useLanguage();

    // --- STATE ---
    const [isVisible, setIsVisible] = useState(false);
    const [me, setMe] = useState<AppUser | null>(null);

    // Real-time requester data (to fix 0.0 rating issue)
    const [requesterProfile, setRequesterProfile] = useState<AppUser | null>(null);

    // Form States
    const [offerPrice, setOfferPrice] = useState('');
    const [durationValue, setDurationValue] = useState('');
    const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('days');
    const [offerDateTime, setOfferDateTime] = useState('');
    const [offerDescription, setOfferDescription] = useState('');
    const [isOfferFormOpen, setIsOfferFormOpen] = useState(false);
    const [isCompanyOffer, setIsCompanyOffer] = useState(false);

    // AI & Action States
    const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);
    const [aiQuestion, setAiQuestion] = useState('');
    const [providerAiAnswer, setProviderAiAnswer] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [completionImage, setCompletionImage] = useState('');
    const [providerRateRequester, setProviderRateRequester] = useState(0);
    const [providerReviewRequester, setProviderReviewRequester] = useState('');
    const [isSubmittingWork, setIsSubmittingWork] = useState(false);
    const [requesterRateProvider, setRequesterRateProvider] = useState(0);
    const [requesterReviewProvider, setRequesterReviewProvider] = useState('');
    const [requesterEvidenceImage, setRequesterEvidenceImage] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteStep, setDeleteStep] = useState<'IDLE' | 'CONFIRM'>('IDLE');

    // Management Tool States
    const [isMaterialsFormOpen, setIsMaterialsFormOpen] = useState(false);
    const [materialsAmount, setMaterialsAmount] = useState('');
    const [materialsDesc, setMaterialsDesc] = useState('');
    
    const [isExtensionFormOpen, setIsExtensionFormOpen] = useState(false);
    const [extensionDate, setExtensionDate] = useState('');
    const [extensionReason, setExtensionReason] = useState('');

    const [isCircumstanceFormOpen, setIsCircumstanceFormOpen] = useState(false);
    const [circumstanceDesc, setCircumstanceDesc] = useState('');
    const [circumstanceExtraPrice, setCircumstanceExtraPrice] = useState('');
    const [circumstanceExtraTime, setCircumstanceExtraTime] = useState('');

    const [cancelStep, setCancelStep] = useState<'IDLE' | 'FORM' | 'CONFIRM'>('IDLE');
    const [cancelReasonInput, setCancelReasonInput] = useState('');
    const [isReportFormOpen, setIsReportFormOpen] = useState(false);
    const [reportReasonInput, setReportReasonInput] = useState('');
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    
    // Rejection States
    const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
    const [rejectionType, setRejectionType] = useState<'MATERIALS' | 'CIRCUMSTANCE' | 'EXTENSION' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Share State
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

    // Load current user profile for form defaults
    useEffect(() => {
        if (auth.currentUser) {
            syncUserProfile(auth.currentUser).then(user => {
                setMe(user);
                setIsCompanyOffer(user.isCompany || false);
            });
        }
    }, [currentUserId]);

    const handleRejectionSubmit = async () => {
        if (!rejectionReason.trim() || !rejectingItemId) return;
        setIsProcessingAction(true);
        try {
            if (rejectionType === 'MATERIALS') {
                await onRejectMaterials?.(task.id, rejectingItemId, rejectionReason);
            } else if (rejectionType === 'EXTENSION') {
                await onHandleExtension?.(task.id, rejectingItemId, 'REJECT', rejectionReason);
            } else if (rejectionType === 'CIRCUMSTANCE') {
                await onHandleCircumstance?.(task.id, rejectingItemId, 'REJECT', rejectionReason);
            }
            // Reset states
            setRejectingItemId(null);
            setRejectionType(null);
            setRejectionReason('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessingAction(false);
        }
    };

    // Load fresh requester profile (Fix for 0.0 rating)
    useEffect(() => {
        if (task?.requesterId) {
            getUserById(task.requesterId).then(user => {
                if (user) setRequesterProfile(user);
            });
        }
    }, [task?.requesterId]);

    // Fetch live provider data for all offers to ensure ratings are correct
    const [providerProfiles, setProviderProfiles] = useState<Record<string, AppUser>>({});
    useEffect(() => {
        if (task?.offers && task.offers.length > 0) {
            task.offers.forEach(offer => {
                if (!providerProfiles[offer.providerId]) {
                    getUserById(offer.providerId).then(user => {
                        if (user) {
                            setProviderProfiles(prev => ({ ...prev, [offer.providerId]: user }));
                        }
                    });
                }
            });
        }
    }, [task?.offers]);

    // --- ANIMATION LOGIC ---
    useEffect(() => {
        const timer = requestAnimationFrame(() => {
            setIsVisible(true);
        });
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleCloseAction = () => {
        if (window.innerWidth < 768) {
            onClose();
        } else {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }
    };

    const handleShare = async () => {
        if (!task) return;

        const shareUrl = `${window.location.origin}?taskId=${task.id}`;
        const shareData = {
            title: task.title,
            text: task.description,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share canceled');
            }
        } else {
            handleCopyLink();
        }
    };

    const handleCopyLink = () => {
        if (!task) return;
        const shareUrl = `${window.location.origin}?taskId=${task.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 2000);
        });
    };

    if (!task) return null;

    const getStatusLabel = (status: TaskStatus): string => {
        return t(`status_${status}` as any) || status;
    };

    const distance = userLocation ? calculateDistance(userLocation[0], userLocation[1], task.location.lat, task.location.lng) : null;
    const acceptedOffer = task.offers?.find(o => o.id === task.acceptedOfferId);


    // Fallback logic for completed tasks with missing/lazy-loaded offer data
    const finalPrice = acceptedOffer?.price || task.escrowAmount || 0;
    const providerId = acceptedOffer?.providerId || task.reviews?.find(r => r.toUserId !== task.requesterId)?.toUserId;
    const providerName = acceptedOffer?.providerName || task.reviews?.find(r => r.toUserId !== task.requesterId)?.toUser || 'Изпълнител';

    const iAmProvider = currentUserId && ((acceptedOffer && currentUserId === acceptedOffer.providerId) || (providerId && currentUserId === providerId));

    const taskImages = task.images && task.images.length > 0 ? task.images : [task.imageUrl || 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&auto=format&fit=crop&q=60'];

    // --- AUTO SLIDE & NAVIGATION ---
    useEffect(() => {
        if (taskImages.length <= 1) return;
        // Removed auto-slide to prevent annoying jumps while reading, or can keep it longer
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % taskImages.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [taskImages.length]);

    const nextImage = (e?: React.MouseEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        setCurrentImageIndex((prev) => (prev + 1) % taskImages.length);
    };
    const prevImage = (e?: React.MouseEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        setCurrentImageIndex((prev) => (prev - 1 + taskImages.length) % taskImages.length);
    };

    const openLightbox = (url: string) => {
        setLightboxImageUrl(url);
        setIsLightboxOpen(true);
        // Sync index if the clicked image is part of the gallery
        const idx = taskImages.indexOf(url);
        if (idx !== -1) setCurrentImageIndex(idx);
    };

    // --- HANDLERS ---
    const handleOfferAccept = async (offerId: string) => {
        if (isAccepting) return;
        setIsAccepting(true);
        try {
            await onAcceptOffer(task.id, offerId);
        } catch (e) {
            console.error("Offer accept wrapper failed", e);
        } finally {
            setIsAccepting(false);
        }
    };

    const handleProviderSubmit = async () => {
        if (!completionImage) { alert('Задължително е да качите снимка на свършената работа.'); return; }
        if (providerRateRequester === 0) { alert('Моля, оставете рейтинг за клиента.'); return; }
        setIsProcessingAction(true);
        try {
            await onProviderSubmitWork(task.id, completionImage, providerRateRequester, providerReviewRequester);
            setIsSubmittingWork(false);
        } catch (e) {
            console.error("Submit work failed", e);
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleRequesterApprove = async () => {
        if (requesterRateProvider === 0) { alert('Моля, дайте оценка на изпълнителя.'); return; }
        setIsProcessingAction(true);
        try {
            await onRequesterApproveWork(task.id, requesterRateProvider, requesterReviewProvider, requesterEvidenceImage);
            setIsApproving(false);
        } catch (e) {
            console.error("Approve work failed", e);
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        if (!onDeleteTask || isDeleting) return;

        if (deleteStep === 'IDLE') {
            setDeleteStep('CONFIRM');
            // Reset if user doesn't confirm within 5 seconds
            setTimeout(() => setDeleteStep('IDLE'), 5000);
            return;
        }

        if (deleteStep === 'CONFIRM') {
            setIsDeleting(true);
            try {
                await onDeleteTask(task.id);
            }
            catch (error) {
                setIsDeleting(false);
                setDeleteStep('IDLE');
                alert("Възникна грешка при изтриването.");
            }
        }
    };

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 1024;
                    let w = img.width, h = img.height;
                    if (w > h && w > MAX) { h *= MAX / w; w = MAX; }
                    else if (h > MAX) { w *= MAX / h; h = MAX; }
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (ctx) { ctx.drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.6)); }
                    else { reject(new Error("Canvas context missing")); }
                };
                img.onerror = () => reject(new Error("Failed to load image"));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resized = await resizeImage(file);
                setter(resized);
            } catch (err) {
                console.error("Image resize error:", err instanceof Error ? err.message : String(err));
            }
        }
    };

    const getSafeAvatar = (url?: string) => (!url || url.includes('dicebear')) ? DEFAULT_AVATAR : url;

    const handleOfferSubmit = () => {
        if (!offerPrice || !durationValue || !offerDateTime || !offerDescription || offerDescription.length < 20) return;
        onAddOffer(task.id, parseFloat(offerPrice), `${durationValue} ${durationUnit === 'hours' ? 'Часа' : 'Дни'}`, offerDescription, offerDateTime, isCompanyOffer);
        setIsOfferFormOpen(false);
        setOfferPrice(''); setDurationValue(''); setOfferDescription(''); setOfferDateTime('');
    };

    const startAiAssist = async () => {
        setIsAiAssistOpen(true); setAiQuestion(''); setProviderAiAnswer(''); setIsAiLoading(true);
        const q = await getOfferHelpQuestion(task.title, task.description);
        setAiQuestion(q); setIsAiLoading(false);
    };

    const generateDescription = async () => {
        if (!providerAiAnswer.trim()) return;
        setIsAiLoading(true);
        const pitch = await generateOfferPitch(task.title, providerAiAnswer);
        setOfferDescription(pitch); setIsAiLoading(false); setIsAiAssistOpen(false);
    };

    const getTimingConfig = (tStr: string | undefined) => {
        const time = tStr || '';
        const lowerTime = time.toLowerCase();
        if (lowerTime.includes('възможно най-скоро') || lowerTime.includes('asap') || lowerTime.includes('спешно')) {
            return { icon: <Zap size={18} className="text-amber-400 fill-amber-400/20 animate-pulse" />, label: 'СПЕШНО ИЗПЪЛНЕНИЕ', bg: 'bg-amber-500/10 border-amber-500/20', text: 'Възможно най-скоро', textColor: 'text-amber-100', labelColor: 'text-amber-500' };
        }
        if (lowerTime.includes('на ') || /\d/.test(time)) {
            return { icon: <CalendarClock size={18} className="text-blue-400" />, label: 'ФИКСИРАНА ДАТА И ЧАС', bg: 'bg-blue-500/10 border-blue-500/20', text: time, textColor: 'text-blue-100', labelColor: 'text-blue-500' };
        }
        return { icon: <Hourglass size={18} className="text-emerald-400" />, label: 'ГЪВКАВО ВРЕМЕ', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'По договаряне', textColor: 'text-emerald-100', labelColor: 'text-emerald-500' };
    };

    const timingConfig = getTimingConfig(task.timing || new Date(task.createdAt).toLocaleDateString('bg-BG'));

    // --- RATING AGGREGATION FIX ---
    // Calculates the rating dynamically using ALL reviews in the system, similar to the UserProfile
    const { average: calculatedRequesterRating } = getProviderRating(task.requesterId);

    // Use live requester data if available, or the calculated rating, otherwise fall back to task snapshot
    const displayRequesterName = requesterProfile ? requesterProfile.name : task.requesterName;
    const displayRequesterAvatar = requesterProfile ? requesterProfile.avatarUrl : task.requesterAvatar;

    // Use calculated rating > 0, otherwise profile rating, otherwise snapshot
    const displayRequesterRating = (requesterProfile?.rating !== undefined && requesterProfile.rating > 0)
        ? requesterProfile.rating
        : (calculatedRequesterRating > 0 ? calculatedRequesterRating : (task.requesterRating || 0));

    const displayRequesterIsCompany = requesterProfile ? requesterProfile.isCompany : task.requesterIsCompany;

    const handleMaterialsRequest = async () => {
        if (!materialsAmount || !materialsDesc || !onMaterialsRequest) return;
        setIsProcessingAction(true);
        try {
            await onMaterialsRequest(task.id, parseFloat(materialsAmount), materialsDesc);
            setIsMaterialsFormOpen(false);
            setMaterialsAmount('');
            setMaterialsDesc('');
        } catch (e) { console.error(e); }
        finally { setIsProcessingAction(false); }
    };

    const handleExtensionRequest = async () => {
        if (!extensionDate || !extensionReason || !onExtensionRequest) return;
        setIsProcessingAction(true);
        try {
            await onExtensionRequest(task.id, extensionDate, extensionReason);
            setIsExtensionFormOpen(false);
            setExtensionDate('');
            setExtensionReason('');
        } catch (e) { console.error(e); }
        finally { setIsProcessingAction(false); }
    };

    const handleReportCircumstance = async () => {
        if (!circumstanceDesc || !onReportCircumstance) return;
        setIsProcessingAction(true);
        try {
            await onReportCircumstance(
                task.id, 
                circumstanceDesc, 
                circumstanceExtraPrice ? parseFloat(circumstanceExtraPrice) : undefined, 
                circumstanceExtraTime || undefined
            );
            setIsCircumstanceFormOpen(false);
            setCircumstanceDesc('');
            setCircumstanceExtraPrice('');
            setCircumstanceExtraTime('');
        } catch (e) { console.error(e); }
        finally { setIsProcessingAction(false); }
    };

    const handleMutualCancel = async () => {
        if (!onMutualCancel) return;
        
        // If the other party initiated, we don't need a form, just accept
        const otherInitiated = task.cancelInitiatedBy && task.cancelInitiatedBy !== currentUserId;
        
        if (otherInitiated) {
            setIsProcessingAction(true);
            try {
                await onMutualCancel(task.id);
            } catch (e) { console.error(e); }
            finally { setIsProcessingAction(false); }
            return;
        }

        if (cancelStep === 'IDLE') {
            setCancelStep('FORM');
            return;
        }

        if (cancelStep === 'FORM') {
            if (!cancelReasonInput.trim()) return;
            setCancelStep('CONFIRM');
            return;
        }

        setIsProcessingAction(true);
        try {
            await onMutualCancel(task.id, cancelReasonInput);
            setCancelStep('IDLE');
            setCancelReasonInput('');
        } catch (e) { console.error(e); }
        finally { setIsProcessingAction(false); }
    };

    const handleReportProblem = async () => {
        if (!reportReasonInput.trim() || !onReportProblem) return;
        setIsProcessingAction(true);
        try {
            await onReportProblem(task.id, reportReasonInput);
            setIsReportFormOpen(false);
            setReportReasonInput('');
        } catch (e) { console.error(e); }
        finally { setIsProcessingAction(false); }
    };

    return (
        <>
            <div
                className={`
        fixed inset-0 h-[100dvh] md:h-full md:left-auto md:right-0 md:w-[480px] z-[200] 
        bg-slate-950 border-l-0 md:border-l border-slate-800 shadow-2xl flex flex-col
        md:transform-gpu md:transition-transform md:duration-300 md:ease-out md:will-change-transform md:translate-z-0
        ${isVisible ? 'translate-x-0' : 'md:translate-x-full'}
      `}
            >
                <div className="flex-1 overflow-y-auto scrollbar-hide pb-32 overscroll-contain bg-slate-950">

                    {/* --- HERO IMAGE --- */}
                    <div className="relative w-full h-[55dvh] md:h-[500px] shrink-0 bg-slate-950 overflow-hidden cursor-zoom-in group" onClick={() => openLightbox(taskImages[currentImageIndex])}>
                        <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
                            <ImageIcon className="text-slate-700 animate-pulse" size={48} />
                        </div>

                        {/* Main Image with transition key */}
                        <img
                            key={taskImages[currentImageIndex]}
                            src={taskImages[currentImageIndex]}
                            alt="Task"
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-10 animate-in fade-in"
                            decoding="async"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const retryCount = (target as any)._retryCount || 0;
                                if (retryCount < 3) {
                                    (target as any)._retryCount = retryCount + 1;
                                    setTimeout(() => {
                                        const currentSrc = target.src;
                                        target.src = '';
                                        target.src = currentSrc;
                                    }, 1000);
                                }
                            }}
                        />

                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-slate-950 pointer-events-none z-20" />

                        {/* Navigation Arrows - Moved HIGHER to avoid covering profile */}
                        {taskImages.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-2 md:left-4 top-[25%] md:top-[30%] -translate-y-1/2 p-2 md:p-3 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full text-white active:scale-95 border border-white/10 z-40 transition-all shadow-lg"
                                >
                                    <ChevronLeft size={20} className="md:w-6 md:h-6" />
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-2 md:right-4 top-[25%] md:top-[30%] -translate-y-1/2 p-2 md:p-3 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full text-white active:scale-95 border border-white/10 z-40 transition-all shadow-lg"
                                >
                                    <ChevronRight size={20} className="md:w-6 md:h-6" />
                                </button>

                                {/* Dots Indicator */}
                                <div className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 pointer-events-none">
                                    {taskImages.map((_, idx) => (
                                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/40'}`} />
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-30 pt-safe-top">
                            <div className="flex flex-col gap-2">
                                <span className={`px-3 py-1.5 rounded-xl bg-black/40 md:backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wide shadow-lg
                        ${task.status === TaskStatus.OPEN ? 'text-blue-400' : ''}
                        ${task.status === TaskStatus.AWAITING_PAYMENT ? 'text-amber-400' : ''}
                        ${task.status === TaskStatus.IN_PROGRESS ? 'text-purple-400' : ''}
                        ${task.status === TaskStatus.IN_REVIEW ? 'text-indigo-400' : ''}
                        ${task.status === TaskStatus.DISPUTED ? 'text-red-400' : ''}
                        ${task.status === TaskStatus.CLOSED ? 'text-green-400' : ''}
                     `}>
                                    {getStatusLabel(task.status)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleCopyLink(); }} className="w-10 h-10 bg-black/40 hover:bg-white/20 md:backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 transition-transform" title="Копирай линк"><Link2 size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="w-10 h-10 bg-black/40 hover:bg-white/20 md:backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 transition-transform" title="Сподели"><Share2 size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleCloseAction(); }} className="w-10 h-10 bg-black/40 hover:bg-white/20 md:backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 transition-transform"><X size={20} /></button>
                            </div>
                        </div>

                        {/* COPIED TOAST */}
                        {showCopiedToast && (
                            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-xl z-50 animate-in fade-in zoom-in duration-200 flex items-center gap-2">
                                <Check size={14} className="text-green-400" /> Линкът е копиран!
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 w-full p-4 z-30 flex flex-col gap-2 justify-end bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pt-20">
                            <div onClick={(e) => { e.stopPropagation(); onUserClick(task.requesterId); }} className="flex items-center gap-3 bg-black/40 md:backdrop-blur-md border border-white/10 p-1.5 pr-4 rounded-full w-fit cursor-pointer active:bg-white/20 transition-all shadow-lg shrink-0">
                                <img 
                                    key={getSafeAvatar(displayRequesterAvatar)}
                                    src={getSafeAvatar(displayRequesterAvatar)} 
                                    className="w-8 h-8 rounded-full border-2 border-white/50 object-cover" 
                                    alt="" 
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src !== DEFAULT_AVATAR) target.src = DEFAULT_AVATAR;
                                    }}
                                />
                                <div>
                                    <p className="text-xs font-bold text-white leading-none mb-0.5 flex items-center gap-1">{displayRequesterName} {displayRequesterIsCompany && <Verified size={10} className="text-blue-400 fill-blue-400" />}</p>
                                    <div className="flex items-center gap-1"><Star size={8} className="text-yellow-400 fill-yellow-400" /><span className="text-[10px] font-medium text-blue-100">{displayRequesterRating.toFixed(1)}</span></div>
                                </div>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-white leading-tight shadow-sm shrink-0 drop-shadow-md">{task.title}</h2>
                            <div className={`p-2.5 rounded-2xl flex items-center gap-3 md:backdrop-blur-md border shadow-sm ${timingConfig.bg} shrink-0 bg-black/20 md:bg-inherit`}>
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">{timingConfig.icon}</div>
                                <div className="flex-1">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${timingConfig.labelColor}`}>{timingConfig.label}</p>
                                    <p className={`text-xs md:text-sm font-bold leading-none ${timingConfig.textColor} drop-shadow-sm`}>{timingConfig.text}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- DETAILS --- */}
                    <div className="relative z-30 bg-slate-950 px-4 pb-12 pt-6">

                        {/* Stripe Missing Warning for Providers */}
                        {!isRequester && me && !me.stripeOnboardingComplete && (
                            <div className="mb-8 p-5 rounded-[24px] bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 animate-in slide-in-from-top-4 duration-500 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                        <AlertCircle size={28} />
                                    </div>
                                    <div>
                                        <h4 className="text-amber-100 font-black text-sm uppercase tracking-tight mb-1">Завършете своя Stripe профил</h4>
                                        <p className="text-amber-100/70 text-[11px] leading-relaxed mb-3">
                                            За да можете да **приемате плащания** и да вдъхвате доверие на клиентите, трябва да свържете банковата си сметка в секция „Финанси“ на вашия профил.
                                        </p>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onUserClick(me.id); }}
                                            className="px-4 py-2 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                                        >
                                            КЪМ МОЯ ПРОФИЛ <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PANEL 1: TASK DETAILS */}
                        <div className="mb-8">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 px-2"><AlignLeft size={12} /> Детайли за задачата</h3>
                            
                            {/* NEW: Quick Info Row */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                                    <Calendar size={14} className="text-blue-400 mb-1.5" />
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mb-0.5">Добавена</span>
                                    <span className="text-[10px] text-slate-200 font-black">{new Date(task.createdAt).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                                    <MapPin size={14} className="text-emerald-400 mb-1.5" />
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mb-0.5">Адрес</span>
                                    <span className="text-[10px] text-slate-200 font-black truncate w-full px-1">{task.address || 'Център'}</span>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                                    <Navigation size={14} className="text-purple-400 mb-1.5" />
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mb-0.5">Дистанция</span>
                                    <span className="text-[10px] text-slate-200 font-black">{distance !== null ? `${distance.toFixed(1)} км` : '--'}</span>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[28px] p-5 border border-slate-800 shadow-sm relative overflow-hidden">
                                <div className="text-slate-400 text-[13px] leading-6 font-medium whitespace-pre-line relative z-10">{task.description}</div>
                                <div className="h-px bg-slate-800 my-5"></div>
                                <button onClick={onOpenQA} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between px-4 group border border-slate-700/50">
                                    <span className="flex items-center gap-2 uppercase tracking-wider"><MessageCircle size={14} className="text-blue-400" /> Виж Въпроси и Отговори</span>
                                    <div className="flex items-center gap-2"><span className="bg-slate-900 text-slate-400 px-2 py-0.5 rounded text-[10px]">{Math.max(task.questions?.length || 0, task.questionsCount || 0)}</span><ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" /></div>
                                </button>
                            </div>
                        </div>

                        {/* --- RESULTS SECTION (When CLOSED) --- */}
                        {task.status === TaskStatus.CLOSED && (
                            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2 px-2"><CheckCircle size={12} /> Резултат от задачата</h3>
                                <div className="bg-slate-900 rounded-[28px] border border-emerald-500/20 shadow-lg overflow-hidden">

                                    {/* Completion Image */}
                                    {task.completionImageUrl && (
                                        <div className="relative aspect-video w-full group cursor-pointer" onClick={() => openLightbox(task.completionImageUrl!)}>
                                            <img 
                                                key={task.completionImageUrl}
                                                src={task.completionImageUrl} 
                                                className="w-full h-full object-cover" 
                                                alt="Result" 
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    const retryCount = (target as any)._retryCount || 0;
                                                    if (retryCount < 3) {
                                                        (target as any)._retryCount = retryCount + 1;
                                                        setTimeout(() => {
                                                            const currentSrc = target.src;
                                                            target.src = '';
                                                            target.src = currentSrc;
                                                        }, 1500);
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Maximize2 className="text-white" size={24} />
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                                            <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none">
                                                <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg"><Camera size={16} /></div>
                                                <span className="text-white font-black text-xs uppercase tracking-widest drop-shadow-md">Снимка на изпълнението</span>
                                            </div>
                                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold border border-white/10 uppercase pointer-events-none">След</div>
                                        </div>
                                    )}

                                    {/* Reviews */}
                                    <div className="p-6 space-y-6">
                                        {/* Review for Provider */}
                                        {(() => {
                                            const providerReview = task.reviews?.find(r => r.toUserId === providerId || (providerId === undefined && r.toUserId !== task.requesterId));
                                            if (!providerReview) return null;
                                            return (
                                                <div className="relative pl-4 border-l-2 border-emerald-500/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <StarRating rating={providerReview.rating} size={14} />
                                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Оценка за Майстора</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-300 text-sm italic leading-relaxed">
                                                        "{providerReview.comment}"
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <img 
                                                            key={getSafeAvatar(task.requesterAvatar)}
                                                            src={getSafeAvatar(task.requesterAvatar)} 
                                                            className="w-5 h-5 rounded-full" 
                                                            alt="" 
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                if (target.src !== DEFAULT_AVATAR) target.src = DEFAULT_AVATAR;
                                                            }}
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-500">От {task.requesterName}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Review for Requester */}
                                        {(() => {
                                            const requesterReview = task.reviews?.find(r => r.toUserId === task.requesterId);
                                            if (!requesterReview) return null;
                                            return (
                                                <div className="relative pl-4 border-l-2 border-blue-500/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <StarRating rating={requesterReview.rating} size={14} />
                                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Оценка за Клиента</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-300 text-sm italic leading-relaxed">
                                                        "{requesterReview.comment}"
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center"><UserIcon size={10} className="text-slate-500" /></div>
                                                        <span className="text-[10px] font-bold text-slate-500">От {requesterReview.fromUser || providerName}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Award size={20} /></div>
                                                <div>
                                                    <h4 className="text-slate-100 font-bold text-xs uppercase tracking-wide">Задачата е успешна</h4>
                                                    <p className="text-slate-500 text-[10px]">Плащането е освободено.</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest">Сума</span>
                                                <span className="text-xl font-black text-white">{finalPrice} €</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACTION BLOCKS (Statuses) */}
                        {task.status === TaskStatus.AWAITING_PAYMENT && acceptedOffer && (
                            <div className="mt-6 mb-4 bg-slate-900 rounded-2xl border border-amber-500/20 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500"><CreditCard size={20} /></div>
                                    <div><h4 className="font-bold text-slate-100 text-sm">Офертата е приета</h4><p className="text-xs text-slate-400">{isRequester ? 'Депозирайте сумата.' : 'Изчаква се депозит.'}</p></div>
                                </div>
                                {isRequester ? (
                                    <button onClick={() => onFundEscrow(task.id)} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"><ShieldCheck size={18} /> Депозирай {acceptedOffer.price} €</button>
                                ) : (
                                    <div className="w-full py-2 bg-amber-900/20 text-amber-500 rounded-xl font-bold text-xs text-center border border-amber-500/20 animate-pulse">Очаква се плащане...</div>
                                )}
                            </div>
                        )}

                        {task.status === TaskStatus.IN_PROGRESS && (
                            <div className="mt-6 mb-4 space-y-4">
                                {/* MAIN STATUS CARD */}
                                <div className="bg-slate-900 rounded-3xl border border-purple-500/20 p-5 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 shadow-inner"><Briefcase size={24} /></div>
                                            <div>
                                                <h4 className="font-black text-slate-100 text-sm uppercase tracking-tight">Работата е в процес</h4>
                                                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10} /> Сумата е защитена</p>
                                            </div>
                                        </div>
                                        {/* QUICK ACTION BUTTONS */}
                                        <div className="flex gap-3">
                                            {onOpenChat && (
                                                <button 
                                                    onClick={onOpenChat}
                                                    className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
                                                >
                                                    <MessageSquare size={20} className="fill-white/20" />
                                                </button>
                                            )}
                                            {(() => {
                                                const partnerPhone = isRequester 
                                                    ? (providerProfiles[acceptedOffer?.providerId || '']?.phoneNumber || task.acceptedProviderPhone)
                                                    : (requesterProfile?.phoneNumber || task.requesterPhone);
                                                
                                                if (!partnerPhone) return null;
                                                
                                                return (
                                                    <a 
                                                        href={`tel:${partnerPhone}`} 
                                                        className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all shrink-0"
                                                    >
                                                        <Phone size={20} className="fill-white/20" />
                                                    </a>
                                                );
                                            })()}
                                        </div>
                                    </div>


                                    {isRequester && !task.reportedByRequester && (
                                        <>
                                            <button 
                                                onClick={() => setIsReportFormOpen(true)}
                                                className="w-full py-3 mb-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-red-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <AlertTriangle size={14} />
                                                СИГНАЛ - ДОКЛАДВАЙ ПРОБЛЕМ
                                            </button>
                                            
                                            {isReportFormOpen && (
                                                <div className="bg-slate-900 rounded-3xl p-5 border border-red-500/40 shadow-2xl animate-in slide-in-from-top-4 mb-4">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h5 className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Сигнал за проблем</h5>
                                                        <button onClick={() => setIsReportFormOpen(false)} className="text-slate-500"><X size={16} /></button>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-200 flex gap-2">
                                                            <Info size={14} className="shrink-0" />
                                                            <span>Използвайте това, ако изпълнителят не отговаря или има сериозна нередност. Администратор ще разгледа сигнала и може да върне средствата ви (минус банковите такси).</span>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Опишете проблема</label>
                                                            <textarea 
                                                                value={reportReasonInput} 
                                                                onChange={(e) => setReportReasonInput(e.target.value)} 
                                                                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs outline-none focus:border-red-500/50 resize-none" 
                                                                rows={3} 
                                                                placeholder="Напишете детайли за администратора..." 
                                                            />
                                                        </div>
                                                        {task.completionImageUrl && (
                                                            <div className="relative aspect-video rounded-xl overflow-hidden border border-indigo-500/30 group cursor-zoom-in" onClick={() => openLightbox(task.completionImageUrl!)}>
                                                                <img 
                                                                    key={task.completionImageUrl}
                                                                    src={task.completionImageUrl} 
                                                                    className="w-full h-full object-cover" 
                                                                    alt="Completion" 
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        const retryCount = (target as any)._retryCount || 0;
                                                                        if (retryCount < 3) {
                                                                            (target as any)._retryCount = retryCount + 1;
                                                                            setTimeout(() => {
                                                                                const currentSrc = target.src;
                                                                                target.src = '';
                                                                                target.src = currentSrc;
                                                                            }, 1500);
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Maximize2 className="text-white" size={24} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <button 
                                                            onClick={handleReportProblem} 
                                                            disabled={!reportReasonInput.trim() || isProcessingAction}
                                                            className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                                                        >
                                                            {isProcessingAction ? 'Изпращане...' : 'Изпрати сигнал до АДМИН'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* REPORTED STATUS */}
                                    {isRequester && task.reportedByRequester && (
                                        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30"><AlertTriangle size={14} /></div>
                                            <div>
                                                <p className="text-red-200 font-black text-[10px] uppercase tracking-wider">Сигналът е изпратен</p>
                                                <p className="text-red-300/70 text-[9px] font-bold">Администратор ще прегледа случая.</p>
                                            </div>
                                        </div>
                                    )}


                                    {/* FINISH TASK BUTTON (Provider Only) */}
                                    {iAmProvider && !isSubmittingWork && (
                                        <button 
                                            onClick={() => setIsSubmittingWork(true)} 
                                            disabled={isProcessingAction}
                                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                                        >
                                            {isProcessingAction ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle size={20} /> ЗАВЪРШИХ ЗАДАЧАТА</>}
                                        </button>
                                    )}

                                    {iAmProvider && isSubmittingWork && (
                                        <div className="bg-slate-950 p-5 rounded-2xl border border-purple-500/30 animate-in fade-in space-y-5 mt-2">
                                            <div className="flex justify-between items-center">
                                                <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Финализиране</h5>
                                                <button onClick={() => setIsSubmittingWork(false)} className="text-slate-500"><X size={16} /></button>
                                            </div>
                                            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 bg-slate-900/50 text-center cursor-pointer hover:border-purple-500/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                                <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, setCompletionImage)} className="hidden" accept="image/*" />
                                                {completionImage ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <img src={completionImage} className="w-20 h-20 object-cover rounded-xl border border-purple-500/30" alt="" />
                                                        <span className="text-green-400 text-[10px] font-black">СНИМКАТА Е ПРИКАЧЕНА</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500"><Camera size={20} /></div>
                                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Качи снимка на резултата</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Оцени сътрудничеството</p>
                                                <div className="flex justify-center">
                                                    <StarRating rating={providerRateRequester} setRating={setProviderRateRequester} size={32} interactive={true} />
                                                </div>
                                            </div>

                                            <textarea
                                                value={providerReviewRequester}
                                                onChange={(e) => setProviderReviewRequester(e.target.value)}
                                                placeholder="Какво беше отношението на клиента? (незадължително)"
                                                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 text-xs outline-none focus:border-purple-500/50 transition-all resize-none"
                                                rows={3}
                                            />

                                            <button 
                                                onClick={handleProviderSubmit} 
                                                disabled={isProcessingAction}
                                                className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-black text-xs shadow-lg shadow-purple-600/20 uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isProcessingAction ? <Loader2 size={16} className="animate-spin" /> : 'Предай за Одобрение'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* MANAGEMENT TOOLS (Both sides can cancel now) */}
                                <div className="bg-slate-900/50 rounded-3xl p-2 border border-slate-800 flex flex-wrap gap-2 mt-4">
                                    {iAmProvider && !isSubmittingWork && (
                                        <>
                                            <button 
                                                onClick={() => setIsMaterialsFormOpen(true)}
                                                className="flex-1 min-w-[120px] p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all group flex flex-col items-center gap-1"
                                            >
                                                <Coins size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Материали</span>
                                            </button>
                                            <button 
                                                onClick={() => setIsExtensionFormOpen(true)}
                                                className="flex-1 min-w-[120px] p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all group flex flex-col items-center gap-1"
                                            >
                                                <CalendarClock size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Удължаване</span>
                                            </button>
                                            <button 
                                                onClick={() => setIsCircumstanceFormOpen(true)}
                                                className="flex-1 min-w-[120px] p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all group flex flex-col items-center gap-1"
                                            >
                                                <AlertCircle size={18} className="text-orange-400 group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Обстоятелство</span>
                                            </button>
                                        </>
                                    )}
                                    
                                    {/* MUTUAL CANCEL BUTTON - Visible to both */}
                                    <button 
                                        onClick={handleMutualCancel}
                                        disabled={(isRequester && task.requesterAgreedCancel) || (iAmProvider && task.providerAgreedCancel)}
                                        className={`flex-1 min-w-[120px] p-3 rounded-2xl transition-all group flex flex-col items-center gap-1 
                                            ${cancelStep === 'CONFIRM' ? 'bg-red-600 text-white shadow-lg' : 
                                              cancelStep === 'FORM' ? 'bg-amber-600 text-white shadow-lg' :
                                              ((isRequester && task.requesterAgreedCancel) || (iAmProvider && task.providerAgreedCancel)) ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed' :
                                              'bg-slate-800 hover:bg-red-900/20 text-red-400'}`}
                                    >
                                        <FileWarning size={18} className={cancelStep !== 'IDLE' ? 'animate-pulse' : ''} />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">
                                            {((isRequester && task.requesterAgreedCancel) || (iAmProvider && task.providerAgreedCancel)) ? 'Очаква се съгласие' :
                                             cancelStep === 'CONFIRM' ? 'СИГУРНИ ЛИ СТЕ?' : 
                                             cancelStep === 'FORM' ? 'НАПИШЕТЕ ПРИЧИНА' : 
                                             'Взаимно анулиране'}
                                        </span>
                                    </button>
                                </div>

                                {/* ACTIVE CANCELLATION REQUEST (Visible to the side that hasn't agreed yet) */}
                                {((isRequester && task.providerAgreedCancel && !task.requesterAgreedCancel) || 
                                  (iAmProvider && task.requesterAgreedCancel && !task.providerAgreedCancel)) && (
                                    <div className="bg-slate-900 rounded-3xl border border-red-500/30 p-5 shadow-xl animate-in zoom-in mt-4">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 shrink-0"><FileWarning size={24} /></div>
                                            <div className="flex-1">
                                                <h5 className="text-white font-black text-xs uppercase tracking-tight mb-1">Искане за анулиране</h5>
                                                <p className="text-slate-400 text-[11px] leading-relaxed mb-2">От: {task.cancelInitiatedBy === task.requesterId ? 'Клиента' : 'Изпълнителя'}</p>
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5 mb-3">
                                                    <p className="text-[10px] text-slate-300 font-medium italic">"{task.cancelReason}"</p>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                    <AlertCircle size={12} className="text-amber-500 shrink-0" />
                                                    <p className="text-[8px] text-amber-200/70 uppercase font-black tracking-tight leading-tight">Таксата на сайта и банковите такси няма да бъдат възстановени.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleMutualCancel}
                                            className="w-full py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                                        >
                                            Приемам Анулирането
                                        </button>
                                    </div>
                                )}


                                {/* FORMS (Modals/Overlays) */}
                                {isMaterialsFormOpen && (
                                    <div className="bg-slate-900 rounded-3xl p-5 border border-blue-500/40 shadow-2xl animate-in slide-in-from-bottom-4 mt-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Coins size={14} /> Пари за материали</h5>
                                            <button onClick={() => setIsMaterialsFormOpen(false)} className="text-slate-500"><X size={16} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Сума (EUR)</label>
                                                <input type="number" value={materialsAmount} onChange={(e) => setMaterialsAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-blue-500/50" placeholder="0.00" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Описание на материалите</label>
                                                <textarea value={materialsDesc} onChange={(e) => setMaterialsDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs outline-none focus:border-blue-500/50 resize-none" rows={2} placeholder="Цимент, боя, инструменти..." />
                                            </div>
                                            <button 
                                                onClick={handleMaterialsRequest} 
                                                disabled={!materialsAmount || !materialsDesc || isProcessingAction}
                                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                                            >
                                                {isProcessingAction ? 'Изпращане...' : 'Изпрати заявка'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isExtensionFormOpen && (
                                    <div className="bg-slate-900 rounded-3xl p-5 border border-amber-500/40 shadow-2xl animate-in slide-in-from-bottom-4 mt-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><CalendarClock size={14} /> Удължаване на срока</h5>
                                            <button onClick={() => setIsExtensionFormOpen(false)} className="text-slate-500"><X size={16} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Нова крайна дата</label>
                                                <input type="datetime-local" value={extensionDate} onChange={(e) => setExtensionDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500/50" style={{ colorScheme: 'dark' }} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Причина за забавянето</label>
                                                <textarea value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs outline-none focus:border-amber-500/50 resize-none" rows={2} placeholder="Наложи се допълнително време за..." />
                                            </div>
                                            <button 
                                                onClick={handleExtensionRequest} 
                                                disabled={!extensionDate || !extensionReason || isProcessingAction}
                                                className="w-full py-3 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                                            >
                                                {isProcessingAction ? 'Изпращане...' : 'Поискай Удължаване'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isCircumstanceFormOpen && (
                                    <div className="bg-slate-900 rounded-3xl p-5 border border-orange-500/40 shadow-2xl animate-in slide-in-from-bottom-4 mt-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} /> Непредвидено обстоятелство</h5>
                                            <button onClick={() => setIsCircumstanceFormOpen(false)} className="text-slate-500"><X size={16} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Какво се случи?</label>
                                                <textarea value={circumstanceDesc} onChange={(e) => setCircumstanceDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs outline-none focus:border-orange-500/50 resize-none" rows={3} placeholder="Описание на ситуацията..." />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Доп. заплащане (€)</label>
                                                    <input type="number" value={circumstanceExtraPrice} onChange={(e) => setCircumstanceExtraPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs outline-none" placeholder="+ 0.00" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Нов срок (опц.)</label>
                                                    <input type="date" value={circumstanceExtraTime} onChange={(e) => setCircumstanceExtraTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-[10px] outline-none" style={{ colorScheme: 'dark' }} />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleReportCircumstance} 
                                                disabled={!circumstanceDesc || isProcessingAction}
                                                className="w-full py-3 bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                                            >
                                                {isProcessingAction ? 'Изпращане...' : 'Изпрати отчет'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {cancelStep === 'FORM' && (
                                    <div className="bg-slate-900 rounded-3xl p-5 border border-red-500/40 shadow-2xl animate-in slide-in-from-bottom-4 mt-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><FileWarning size={14} /> Взаимно анулиране</h5>
                                            <button onClick={() => setCancelStep('IDLE')} className="text-slate-500"><X size={16} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-200 flex gap-2">
                                                <Info size={14} className="shrink-0" />
                                                <span>При взаимно анулиране, сумата се връща на клиента, но таксите на платформата и Stripe се удържат. Задачата ще бъде върната онлайн за нови оферти.</span>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Причина за анулирането</label>
                                                <textarea 
                                                    value={cancelReasonInput} 
                                                    onChange={(e) => setCancelReasonInput(e.target.value)} 
                                                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs outline-none focus:border-red-500/50 resize-none" 
                                                    rows={3} 
                                                    placeholder="Опишете защо се налага анулиране..." 
                                                />
                                            </div>
                                            <button 
                                                onClick={handleMutualCancel} 
                                                disabled={!cancelReasonInput.trim()}
                                                className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                                            >
                                                Продължи
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* MATERIALS REQUESTS & HISTORY (Visible to both) */}
                                {task.materialsPayments && task.materialsPayments.length > 0 && (
                                    <div className="p-4 rounded-[32px] bg-blue-500/[0.03] border border-blue-500/10 space-y-3 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] -mr-16 -mt-16"></div>
                                        <div className="px-1 flex items-center justify-between relative z-10">
                                            <h5 className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Hammer size={12} /> Материали
                                            </h5>
                                        </div>
                                        {task.materialsPayments.map(pay => (
                                            <div key={pay.id} className={`relative p-[1px] rounded-[24px] bg-gradient-to-br ${pay.status === 'PAID' ? 'from-emerald-500/40 to-emerald-900/40' : 'from-blue-500/40 to-indigo-900/40'} shadow-2xl animate-in slide-in-from-right-4 group hover:scale-[1.01] transition-transform`}>
                                                <div className="bg-slate-900 rounded-[23px] p-5">
                                                    <div className="flex items-start gap-3 sm:gap-4 mb-4">
                                                        <div className={`w-12 h-12 sm:w-14 sm:h-14 ${pay.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'} rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                                                            {pay.status === 'PAID' ? <BadgeCheck size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} /> : <Coins size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1.5 sm:gap-0">
                                                            <h5 className="text-white font-black text-xs sm:text-sm uppercase tracking-tighter leading-tight truncate w-full sm:w-auto">Заявка за материали</h5>
                                                            <div className="flex flex-col items-start sm:items-end shrink-0">
                                                                <span className="text-xl sm:text-2xl font-black text-white leading-none">{pay.amount} €</span>
                                                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Директно плащане</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 mb-3">
                                                        <p className="text-slate-300 text-xs font-medium leading-relaxed italic">"{pay.description}"</p>
                                                    </div>
                                                    
                                                    {pay.status === 'PAID' && (
                                                        <div className="flex items-center gap-2 text-emerald-400 mb-3 bg-emerald-500/5 py-1.5 px-3 rounded-full border border-emerald-500/10 w-fit">
                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Платено на {new Date(pay.paidAt || 0).toLocaleDateString('bg-BG')}</span>
                                                        </div>
                                                    )}

                                                    {pay.status === 'REJECTED' && (
                                                        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl mb-3">
                                                            <div className="flex items-center gap-2 text-red-400 mb-1">
                                                                <XCircle size={14} />
                                                                <span className="text-[10px] font-black uppercase">Отказано</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 leading-tight">Причина: {pay.rejectionReason || 'Не е посочена'}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {isRequester && pay.status === 'PENDING' && (
                                                        <div className="space-y-4 pt-2">
                                                            {rejectingItemId === pay.id && rejectionType === 'MATERIALS' ? (
                                                                <div className="bg-slate-950 p-4 rounded-2xl border border-red-500/30 animate-in fade-in zoom-in-95 duration-200">
                                                                    <label className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2 block">Посочете причина за отказа</label>
                                                                    <textarea 
                                                                        value={rejectionReason}
                                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                                        placeholder="Защо отказвате тази заявка?"
                                                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-[11px] mb-3 focus:border-red-500/50 outline-none transition-all min-h-[80px]"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            onClick={() => { setRejectingItemId(null); setRejectionType(null); setRejectionReason(''); }}
                                                                            className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                                        >
                                                                            Назад
                                                                        </button>
                                                                        <button 
                                                                            disabled={!rejectionReason.trim() || isProcessingAction}
                                                                            onClick={handleRejectionSubmit}
                                                                            className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50 transition-all"
                                                                        >
                                                                            {isProcessingAction ? 'Изпращане...' : 'Потвърди Отказа'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setRejectingItemId(pay.id);
                                                                            setRejectionType('MATERIALS');
                                                                            setRejectionReason('');
                                                                        }}
                                                                        className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/30 active:scale-95 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center"
                                                                    >
                                                                        Откажи
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            window.dispatchEvent(new CustomEvent('NEEDO_PAYMENT_TRIGGERED', { detail: { taskId: task.id, paymentId: pay.id } }));
                                                                            console.log("Premium Pay Button Clicked!", { taskId: task.id, paymentId: pay.id });
                                                                            onPayMaterials?.(task.id, pay.id);
                                                                        }}
                                                                        className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-3"
                                                                    >
                                                                        <CreditCard size={18} />
                                                                        Плати Сега
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3 items-center">
                                                                <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                                                                    <Info size={14} className="text-amber-500" />
                                                                </div>
                                                                <p className="text-[10px] text-amber-200/60 font-bold leading-snug">
                                                                    Тези средства се превеждат <span className="text-amber-400 uppercase">директно</span> на изпълнителя. Needo не задържа тези пари в ескроу и не носи отговорност за тях.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {iAmProvider && pay.status === 'PENDING' && (
                                                        <div className="w-full py-3 bg-slate-800/50 rounded-2xl text-center border border-slate-700/50 flex items-center justify-center gap-2 mt-2">
                                                            <Loader2 size={12} className="animate-spin text-blue-400" />
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Очаква се плащане от клиента...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* EXTENSIONS HISTORY */}
                                {task.extensionRequests && task.extensionRequests.length > 0 && (
                                    <div className="p-4 rounded-[32px] bg-amber-500/[0.03] border border-amber-500/10 space-y-3 relative overflow-hidden mt-4">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] -mr-16 -mt-16"></div>
                                        <div className="px-1 flex items-center justify-between relative z-10">
                                            <h5 className="text-[10px] font-black text-amber-400/60 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <CalendarClock size={12} /> Удължавания
                                            </h5>
                                        </div>
                                        {task.extensionRequests.map(req => (
                                            <div key={req.id} className={`bg-slate-900 rounded-3xl border ${req.status === 'APPROVED' ? 'border-emerald-500/30' : req.status === 'REJECTED' ? 'border-red-500/30' : 'border-amber-500/30'} p-5 shadow-xl animate-in slide-in-from-right-4 relative z-10`}>
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : req.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                        <CalendarClock size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h5 className="text-white font-black text-xs uppercase tracking-tight">Заявка за удължаване</h5>
                                                            {req.status === 'APPROVED' && <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-full">Одобрено</span>}
                                                            {req.status === 'REJECTED' && <span className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-full">Отказано</span>}
                                                        </div>
                                                        <p className="text-slate-400 text-[11px] leading-relaxed mb-1">{req.reason}</p>
                                                        {req.status === 'REJECTED' && req.rejectionReason && (
                                                            <p className="text-red-400/70 text-[9px] italic mt-1 font-medium">Отказ: {req.rejectionReason}</p>
                                                        )}
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <span className="text-[9px] text-slate-500 uppercase font-black">НОВА ДАТА:</span>
                                                            <span className={`text-[10px] font-bold ${req.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}`}>{new Date(req.newDate).toLocaleString('bg-BG')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isRequester && req.status === 'PENDING' && (
                                                    <div className="flex flex-col gap-3">
                                                        {rejectingItemId === req.id && rejectionType === 'EXTENSION' ? (
                                                            <div className="bg-slate-950 p-4 rounded-2xl border border-red-500/30 animate-in fade-in zoom-in-95 duration-200">
                                                                <label className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2 block">Причина за отказа</label>
                                                                <textarea 
                                                                    value={rejectionReason}
                                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                                    placeholder="Обяснете защо отказвате..."
                                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-[11px] mb-3 focus:border-red-500/50 outline-none transition-all min-h-[60px]"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => { setRejectingItemId(null); setRejectionType(null); setRejectionReason(''); }}
                                                                        className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                                    >
                                                                        Назад
                                                                    </button>
                                                                    <button 
                                                                        disabled={!rejectionReason.trim() || isProcessingAction}
                                                                        onClick={handleRejectionSubmit}
                                                                        className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                                                                    >
                                                                        {isProcessingAction ? 'Изпращане...' : 'Потвърди'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        setRejectingItemId(req.id);
                                                                        setRejectionType('EXTENSION');
                                                                        setRejectionReason('');
                                                                    }}
                                                                    className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-700 active:scale-95 transition-all hover:bg-red-500/10 hover:text-red-400"
                                                                >
                                                                    Откажи
                                                                </button>
                                                                <button 
                                                                    onClick={() => onHandleExtension?.(task.id, req.id, 'ACCEPT')}
                                                                    className="flex-[2] py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:brightness-110"
                                                                >
                                                                    Приеми Новата Дата
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {iAmProvider && req.status === 'PENDING' && (
                                                    <div className="w-full py-3 bg-slate-800/50 rounded-2xl text-center border border-slate-700/50 flex items-center justify-center gap-2">
                                                        <Loader2 size={12} className="animate-spin text-amber-400" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Очаква се отговор от клиента...</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* CIRCUMSTANCES HISTORY */}
                                {task.circumstances && task.circumstances.length > 0 && (
                                    <div className="p-4 rounded-[32px] bg-orange-500/[0.03] border border-orange-500/10 space-y-3 relative overflow-hidden mt-4">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -mr-16 -mt-16"></div>
                                        <div className="px-1 flex items-center justify-between relative z-10">
                                            <h5 className="text-[10px] font-black text-orange-400/60 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <AlertCircle size={12} /> Обстоятелства
                                            </h5>
                                        </div>
                                        {task.circumstances.map(circ => (
                                            <div key={circ.id} className={`bg-slate-900 rounded-3xl border ${circ.status === 'APPROVED' ? 'border-emerald-500/30' : circ.status === 'REJECTED' ? 'border-red-500/30' : 'border-orange-500/30'} p-5 shadow-xl animate-in slide-in-from-right-4 relative z-10`}>
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${circ.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : circ.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                                        <AlertCircle size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h5 className="text-white font-black text-xs uppercase tracking-tight">Непредвидено обстоятелство</h5>
                                                            {circ.status === 'APPROVED' && <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-full">Одобрено</span>}
                                                            {circ.status === 'REJECTED' && <span className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-full">Отказано</span>}
                                                        </div>
                                                        <p className="text-slate-400 text-[11px] leading-relaxed mb-3">{circ.description}</p>
                                                        {circ.status === 'REJECTED' && circ.rejectionReason && (
                                                            <p className="text-red-400/70 text-[9px] italic mt-1 font-medium">Отказ: {circ.rejectionReason}</p>
                                                        )}
                                                        
                                                        {circ.requestedPrice && (
                                                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/50 mb-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] text-slate-500 font-black uppercase">Искано доплащане</span>
                                                                    <span className={`text-sm font-black ${circ.status === 'APPROVED' ? 'text-emerald-400' : 'text-white'}`}>+ {circ.requestedPrice} €</span>
                                                                </div>
                                                                {circ.status === 'PENDING' && <p className="text-[8px] text-slate-600 mt-1 uppercase tracking-tight">Сумата се задържа в ескроу до края</p>}
                                                            </div>
                                                        )}
                                                        {circ.requestedExtension && (
                                                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/50">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] text-slate-500 font-black uppercase">Искано удължаване</span>
                                                                    <span className={`text-[10px] font-black ${circ.status === 'APPROVED' ? 'text-emerald-400' : 'text-white'}`}>{new Date(circ.requestedExtension).toLocaleDateString('bg-BG')}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {isRequester && circ.status === 'PENDING' && (
                                                    <div className="flex flex-col gap-3">
                                                        {rejectingItemId === circ.id && rejectionType === 'CIRCUMSTANCE' ? (
                                                            <div className="bg-slate-950 p-4 rounded-2xl border border-red-500/30 animate-in fade-in zoom-in-95 duration-200">
                                                                <label className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2 block">Причина за отказа</label>
                                                                <textarea 
                                                                    value={rejectionReason}
                                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                                    placeholder="Обяснете защо отказвате..."
                                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-[11px] mb-3 focus:border-red-500/50 outline-none transition-all min-h-[60px]"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => { setRejectingItemId(null); setRejectionType(null); setRejectionReason(''); }}
                                                                        className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                                    >
                                                                        Назад
                                                                    </button>
                                                                    <button 
                                                                        disabled={!rejectionReason.trim() || isProcessingAction}
                                                                        onClick={handleRejectionSubmit}
                                                                        className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                                                                    >
                                                                        {isProcessingAction ? 'Изпращане...' : 'Потвърди'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        setRejectingItemId(circ.id);
                                                                        setRejectionType('CIRCUMSTANCE');
                                                                        setRejectionReason('');
                                                                    }}
                                                                    >
                                                                    Откажи
                                                                </button>
                                                                <button 
                                                                    onClick={() => onHandleCircumstance?.(task.id, circ.id, 'ACCEPT')}
                                                                    className="flex-[2] py-3 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:brightness-110"
                                                                >
                                                                    Приеми
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                        {task.status === TaskStatus.IN_REVIEW && (
                            <div className="mt-6 mb-4 bg-slate-900 rounded-2xl border border-indigo-500/20 p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500"><Clock size={20} /></div>
                                    <div><h4 className="font-bold text-slate-100 text-sm">Изчаква Одобрение</h4><p className="text-xs text-slate-400">Преглед на предадената работа.</p></div>
                                </div>

                                {/* SHOW COMPLETION IMAGE FOR REVIEW */}
                                {task.completionImageUrl && (
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-indigo-500/30 group cursor-zoom-in" onClick={() => openLightbox(task.completionImageUrl!)}>
                                        <img src={task.completionImageUrl} className="w-full h-full object-cover" alt="Completion" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                            <Camera size={14} className="text-white" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Снимка на резултата</span>
                                        </div>
                                    </div>
                                )}

                                {isRequester && !isApproving && (
                                    <button 
                                        onClick={() => setIsApproving(true)} 
                                        disabled={isProcessingAction}
                                        className="w-full py-3 bg-green-500 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isProcessingAction ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Прегледай и Оцени</>}
                                    </button>
                                )}
                                {isRequester && isApproving && (
                                    <div className="bg-slate-950 p-4 rounded-xl border border-green-500/30 animate-in fade-in">
                                        <div className="mb-4 flex justify-center"><StarRating rating={requesterRateProvider} setRating={setRequesterRateProvider} size={32} interactive={true} /></div>
                                        <textarea value={requesterReviewProvider} onChange={(e) => setRequesterReviewProvider(e.target.value)} placeholder="Напишете отзив за майстора..." className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-base mb-3 outline-none" rows={3} />
                                        <button 
                                            onClick={handleRequesterApprove} 
                                            disabled={isProcessingAction}
                                            className="w-full py-3 bg-green-500 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
                                        >
                                            {isProcessingAction ? <Loader2 size={18} className="animate-spin" /> : 'Освободи Плащането'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OFFERS LIST */}
                        {task.status === TaskStatus.OPEN && (
                            <>
                                <div className="relative py-8 flex items-center justify-center">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-600/50 to-transparent"></div>
                                    </div>
                                    <div className="relative bg-slate-950 px-6">
                                        <span className="text-blue-300 font-black text-xl uppercase tracking-[0.25em] drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] flex items-center gap-3">
                                            <Users size={24} className="text-blue-400" />
                                            Кандидатури
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide mb-3 flex items-center justify-between px-2">Подадени Оферти <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">{Math.max(task.offers?.length || 0, task.offersCount || 0)}</span></h3>
                                    {task.offers.length === 0 ? (
                                        <div className="bg-slate-900 rounded-[24px] border border-slate-800 overflow-hidden relative shadow-sm group">
                                            <div className="p-6 pb-8 text-center relative z-10">
                                                {isRequester ? (
                                                    <div className="animate-in fade-in zoom-in duration-500">
                                                        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50 shadow-inner">
                                                            <Clock size={28} className="text-slate-500" />
                                                        </div>
                                                        <h4 className="text-slate-200 font-bold text-base mb-1">В очакване на оферти</h4>
                                                        <p className="text-slate-500 text-xs font-medium max-w-[200px] mx-auto">Ще получите известие веднага щом някой кандидатства.</p>
                                                    </div>
                                                ) : (
                                                    <div className="animate-in fade-in zoom-in duration-500">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
                                                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 border border-slate-700/50 shadow-inner">
                                                            <Rocket size={28} className="text-orange-400 fill-orange-400/20 animate-pulse" />
                                                            <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                                                        </div>
                                                        <h4 className="text-slate-200 font-bold text-base mb-3">Все още няма оферти</h4>
                                                        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 mx-4">
                                                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                                                <span className="text-orange-400 font-bold uppercase text-[10px] tracking-wider block mb-1 flex items-center justify-center gap-1"><Trophy size={10} /> Твоят шанс</span>
                                                                Не е нужно да си фирма или да имаш офис. Ако можеш да свършиш работата, <span className="text-white font-bold">подай оферта сега</span> и бъди първият кандидат!
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {task.aiEstimatedPrice && (
                                                <div className="relative">
                                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                                                    <div className="bg-black/20 p-5 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                                        <div className="relative z-10 flex flex-col items-center">
                                                            <div className="flex items-center gap-1.5 mb-2 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/10">
                                                                <Sparkles size={12} className="text-indigo-400" />
                                                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">AI Пазарна Оценка</span>
                                                            </div>
                                                            <div className="text-2xl font-black text-white tracking-tight drop-shadow-sm mb-2">{task.aiEstimatedPrice.replace(/лв\.?|BGN/gi, '€')}</div>
                                                            <p className="text-[10px] text-slate-500 text-center leading-relaxed font-medium">Това е само ориентир. <span className="text-slate-400">Реалните оферти често са по-ниски.</span></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {(() => {
                                                // Logic for Cheapest/Soonest badges calculation
                                                const offers = task.offers;
                                                const minPrice = offers.length > 0 ? Math.min(...offers.map(o => o.price)) : 0;
                                                const validTimestamps = offers
                                                    .map(o => new Date(o.startDate || '').getTime())
                                                    .filter(t => !isNaN(t) && t > 0);
                                                const minTime = validTimestamps.length > 0 ? Math.min(...validTimestamps) : 0;

                                                return offers.map((offer, index) => {
                                                    const liveProfile = providerProfiles[offer.providerId];
                                                    const { average, count } = liveProfile 
                                                        ? { average: liveProfile.rating || 0, count: liveProfile.reviewCount || 0 }
                                                        : getProviderRating(offer.providerId);
                                                    const isAccepted = task.acceptedOfferId === offer.id;
                                                    const isCompany = offer.providerIsCompany;

                                                    // Badge conditions
                                                    const isCheapest = offers.length > 1 && offer.price === minPrice;
                                                    const offerTime = new Date(offer.startDate || '').getTime();
                                                    const isSoonest = offers.length > 1 && minTime > 0 && offerTime === minTime;

                                                    return (
                                                        <div key={offer.id} className={`relative p-[1px] rounded-[20px] bg-gradient-to-br ${isAccepted ? 'from-green-400 to-emerald-600' : isCompany ? 'from-indigo-400 via-blue-500 to-indigo-600' : 'from-slate-700 via-slate-600 to-slate-800'} shadow-lg`}>
                                                            <div className="bg-slate-900 rounded-[19px] relative overflow-hidden flex flex-col p-4 pt-8">
                                                                <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1.5 rounded-br-xl z-20 shadow-sm">{t('badge_offer_num')}{index + 1}</div>

                                                                <div className="absolute top-0 right-0 flex gap-1 z-20">
                                                                    {isCheapest && <div className="bg-emerald-500 text-white text-[9px] font-black px-2 py-1 shadow-sm flex items-center gap-1"><TrendingDown size={10} strokeWidth={3} /> НАЙ-ЕВТИНА</div>}
                                                                    {isSoonest && <div className="bg-amber-500 text-white text-[9px] font-black px-2 py-1 shadow-sm flex items-center gap-1"><Clock size={10} strokeWidth={3} /> НАЙ-СКОРО</div>}

                                                                    {isCompany && <div className="bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1"><Verified size={10} fill="currentColor" /> ФИРМА</div>}
                                                                    {!isCompany && <div className="bg-slate-700 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1"><UserIcon size={10} /> {t('badge_individual')}</div>}
                                                                    {isAccepted && <div className="bg-green-50 text-white text-[9px] font-bold px-3 py-1 shadow-sm flex items-center gap-1 border-l border-white/20"><CheckCircle size={10} /> {t('badge_accepted')}</div>}
                                                                    {offer.providerStripeVerified ? (
                                                                        <div className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-1 shadow-sm flex items-center gap-1 border-l border-white/10" title="Stripe Verified Payouts"><ShieldCheck size={10} strokeWidth={3} /> VERIFIED</div>
                                                                    ) : (
                                                                        <div className="bg-amber-500/20 text-amber-400 text-[9px] font-black px-2 py-1 shadow-sm flex items-center gap-1 border-l border-white/10" title="Missing Stripe Setup"><AlertTriangle size={10} strokeWidth={3} /> NO STRIPE</div>
                                                                    )}
                                                                </div>

                                                                {/* COMPACT ROW PROFILE HEADER (Redesigned) */}
                                                                <div
                                                                    onClick={(e) => { e.stopPropagation(); onUserClick(offer.providerId); }}
                                                                    className={`
                                                            flex items-center gap-3 mb-4 p-2 rounded-xl transition-all cursor-pointer group/profile relative mt-6
                                                            ${isCompany ? 'bg-indigo-900/20 border border-indigo-500/20' : ''}
                                                        `}
                                                                >
                                                                    <div className="relative shrink-0">
                                                                        <img src={getSafeAvatar(offer.providerAvatar)} className="w-12 h-12 rounded-full object-cover border-2 border-white/10 shadow-md group-hover/profile:border-white/30 transition-colors" alt="" />
                                                                        <div className="absolute -bottom-1 -right-1 bg-slate-900 text-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white/10 flex items-center gap-0.5 shadow-sm">
                                                                            <Star size={8} fill="currentColor" /> {average.toFixed(1)}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`font-black text-lg leading-tight truncate mb-0.5 ${isCompany ? 'text-indigo-100' : 'text-white'}`}>
                                                                            {offer.providerName}
                                                                        </p>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                                {count} отзива
                                                                            </p>
                                                                            {isCompany && <span className="bg-indigo-500/20 text-indigo-300 px-1.5 rounded text-[9px] font-bold tracking-wider">PRO</span>}
                                                                        </div>
                                                                    </div>

                                                                    <ChevronRight size={16} className="text-slate-600 group-hover/profile:text-white transition-colors" />
                                                                </div>

                                                                {/* Company Perks */}
                                                                {isCompany && (
                                                                    <div className="grid grid-cols-2 gap-2 mb-4 bg-indigo-900/20 p-2 rounded-xl border border-indigo-500/10">
                                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-300 uppercase tracking-tighter"><FileText size={10} /> Фактура</div>
                                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-300 uppercase tracking-tighter"><BadgeCheck size={10} /> Гаранция</div>
                                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-300 uppercase tracking-tighter"><Hammer size={10} /> Проф. Оборудване</div>
                                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-300 uppercase tracking-tighter"><Users size={10} /> Екип</div>
                                                                    </div>
                                                                )}

                                                                <div className="grid grid-cols-2 gap-2 mb-4">
                                                                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center"><span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 flex items-center gap-1"><Timer size={10} /> {t('offer_time')}</span><span className="text-xs font-bold text-white">{offer.duration}</span></div>
                                                                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center"><span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 flex items-center gap-1"><CalendarClock size={10} /> {t('offer_start')}</span><span className="text-xs font-bold text-white">{offer.startDate ? new Date(offer.startDate).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'По договаряне'}</span></div>
                                                                </div>
                                                                <div className="relative mb-2"><div className="bg-white/5 pl-4 pr-4 py-3 rounded-xl border border-white/5 relative overflow-hidden"><Quote className="absolute top-2 right-2 text-white/5 transform rotate-180 pointer-events-none" size={32} /><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 relative z-10"><MessageSquare size={10} /> {t('offer_note')}</p><p className="text-xs text-slate-300 font-medium leading-relaxed relative z-10">{offer.comment}</p></div></div>
                                                                <div className={`px-5 pb-5 pt-2 bg-gradient-to-t from-black/40 to-transparent border-t -mx-4 -mb-4 mt-2 ${isCompany ? 'border-indigo-500/20' : 'border-white/5'}`}>
                                                                    <div className="flex flex-col gap-1 relative z-10 items-center text-center">
                                                                        <div className="flex justify-center items-center"><span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isCompany ? 'text-indigo-400' : 'text-emerald-400'}`}><Tag size={12} /> {t('offer_price_label')}</span></div>
                                                                        <div className="flex items-baseline justify-center gap-1 mt-1"><span className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{offer.price}</span><span className={`text-lg font-bold ${isCompany ? 'text-indigo-400' : 'text-emerald-400'}`}>€</span></div>
                                                                        {isRequester && task.status === TaskStatus.OPEN && (
                                                                            <div className="mt-4 w-full">
                                                                                <button 
                                                                                    onClick={() => handleOfferAccept(offer.id)} 
                                                                                    disabled={isAccepting}
                                                                                    className="w-full bg-white text-slate-900 py-3 rounded-xl text-sm font-black shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                                                                                >
                                                                                    {isAccepting ? <Loader2 size={16} className="animate-spin" /> : (
                                                                                        <>{t('btn_accept')} <ArrowRight size={16} /></>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* DELETE BUTTON */}
                        {isRequester && task.status === TaskStatus.OPEN && (
                            <div className="mt-8 pt-6 border-t border-slate-800 mb-6 relative z-50 pb-20">
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className={`w-full py-3 rounded-xl font-bold text-sm active:scale-95 flex items-center justify-center gap-2 transition-all duration-300 ${deleteStep === 'CONFIRM'
                                        ? 'bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                                        : 'bg-slate-900 border border-red-900/30 text-red-400'
                                        }`}
                                >
                                    {isDeleting ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={18} className={deleteStep === 'CONFIRM' ? 'animate-bounce' : ''} />
                                    )}
                                    {isDeleting
                                        ? 'Изтриване...'
                                        : (deleteStep === 'CONFIRM' ? 'Сигурни ли сте?' : t('btn_delete'))
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER ACTION (Make Offer) - ULTRA MODERN FLOATING DESIGN */}
                {!isRequester && task.status === TaskStatus.OPEN && (
                    <div className="absolute bottom-8 left-0 w-full px-8 z-40 transition-all duration-500">
                        <div className={`w-full relative transition-all duration-500 ${isOfferFormOpen ? 'bg-gradient-to-tr from-teal-950 via-emerald-900 to-green-950 border border-emerald-500/30 rounded-[32px] shadow-2xl pb-safe-bottom' : 'bg-white/5 backdrop-blur-3xl rounded-[26px] border border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] p-1.5'}`}>
                            {!isOfferFormOpen && (
                                <button
                                    onClick={() => { if (currentUserId) { setIsOfferFormOpen(true); const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); setOfferDateTime(now.toISOString().slice(0, 16)); } else onAuthRequest(); }}
                                    className="
                                        relative w-full py-4.5 
                                        bg-[#007aff] hover:bg-[#0071e3]
                                        text-white rounded-[21px] font-semibold 
                                        shadow-[0_15px_35px_-5px_rgba(0,122,255,0.4)] 
                                        hover:shadow-[0_20px_45px_-5px_rgba(0,122,255,0.5)] 
                                        hover:scale-[1.01] active:scale-[0.97]
                                        transition-all duration-300 group overflow-hidden
                                        flex items-center justify-center gap-3.5
                                    "
                                >
                                    {/* Top Edge Highlight (Apple Physics) */}
                                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/20 z-20"></div>

                                    <div className="flex items-center justify-center gap-3 relative z-10">
                                        <Zap className="text-white fill-white/20 transition-transform group-hover:scale-110" size={20} />
                                        <span className="uppercase tracking-[0.2em] text-sm md:text-base font-bold">
                                            {t('btn_make_offer')}
                                        </span>
                                    </div>

                                    {/* Liquid Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                                </button>
                            )}
                            {isOfferFormOpen && (
                                <div className="p-5 text-white animate-in slide-in-from-bottom duration-300">
                                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white text-lg drop-shadow-md">{t('mo_title')}</h3><button onClick={() => setIsOfferFormOpen(false)} className="p-2 bg-white/10 rounded-full active:bg-white/20 text-white backdrop-blur-md"><ChevronDown size={20} /></button></div>
                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide pb-4">

                                        {/* OFFER TYPE SELECTION */}
                                         <div>
                                             <label className="text-[10px] font-bold text-emerald-100/70 uppercase mb-1.5 block">Подай оферта като:</label>
                                             <div className="flex bg-black/20 rounded-xl p-1 border border-white/10 mb-2">
                                                 <button 
                                                     disabled={!me?.stripeOnboardingComplete_individual && !me?.stripeOnboardingComplete}
                                                     onClick={() => setIsCompanyOffer(false)} 
                                                     className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isCompanyOffer ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                                                 >
                                                     <UserIcon size={14} /> Лице
                                                 </button>
                                                 <button 
                                                     disabled={!me?.stripeOnboardingComplete_company}
                                                     onClick={() => setIsCompanyOffer(true)} 
                                                     className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isCompanyOffer ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                                                 >
                                                     <Building2 size={14} /> Фирма
                                                 </button>
                                             </div>
                                             
                                             {/* Warning if no account connected */}
                                             {!me?.stripeOnboardingComplete_individual && !me?.stripeOnboardingComplete && !me?.stripeOnboardingComplete_company && (
                                                 <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-200 flex gap-2">
                                                     <AlertTriangle size={14} className="shrink-0" />
                                                     <span>Трябва да свържете поне една сметка в Stripe (Лична или Фирмена) в своя профил, за да подадете оферта.</span>
                                                 </div>
                                             )}
                                             
                                             {isCompanyOffer && !me?.stripeOnboardingComplete_company && (
                                                 <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-200 flex gap-2">
                                                     <Info size={14} className="shrink-0" />
                                                     <span>Нямате свързан фирмен акаунт. Направете го в своя профил в секция Финанси.</span>
                                                 </div>
                                             )}
                                         </div>

                                         <div><label className="text-[10px] font-bold text-emerald-100/70 uppercase mb-1.5 block">{t('mo_price')} (EUR)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-400">€</span><input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className="w-full pl-14 pr-4 py-3 bg-black/20 border border-emerald-500/20 rounded-xl font-bold text-white focus:border-emerald-400 outline-none text-base placeholder-emerald-700/50" placeholder="0.00" autoFocus /></div></div>
                                         <div className="flex gap-3"><div className="flex-1"><label className="text-[10px] font-bold text-emerald-100/70 uppercase mb-1.5 block">{t('mo_duration')}</label><input type="number" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className="w-full p-3 bg-black/20 border border-emerald-500/20 rounded-xl font-bold text-white focus:border-emerald-400 outline-none text-base placeholder-emerald-700/50" placeholder="3" /></div><div className="w-1/3"><label className="text-[10px] font-bold text-emerald-100/70 uppercase mb-1.5 block">&nbsp;</label><div className="flex bg-black/20 rounded-xl border border-emerald-500/20 p-1"><button onClick={() => setDurationUnit('hours')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${durationUnit === 'hours' ? 'bg-emerald-600 text-white' : 'text-emerald-200/60'}`}>{t('mo_unit_hours')}</button><button onClick={() => setDurationUnit('days')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${durationUnit === 'days' ? 'bg-emerald-600 text-white' : 'text-emerald-200/60'}`}>{t('mo_unit_days')}</button></div></div></div>
                                         <div><label className="text-[10px] font-bold text-emerald-100/70 uppercase mb-1.5 block">{t('mo_start_date')}</label><div className="relative w-full"><input type="datetime-local" value={offerDateTime} onChange={(e) => setOfferDateTime(e.target.value)} className="w-full p-3 pl-10 bg-black/20 border border-emerald-500/20 rounded-xl font-bold text-white focus:border-emerald-400 outline-none text-base placeholder-emerald-700/50" style={{ minHeight: '46px', colorScheme: 'dark' }} /><CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={18} /></div></div>
                                         {!isAiAssistOpen && <div className="flex justify-end"><button onClick={startAiAssist} className="text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30"><Wand2 size={14} /> ✨ {t('mo_ai_btn')}</button></div>}
                                         {isAiAssistOpen && <div className="bg-black/30 rounded-xl p-4 border border-emerald-500/40 mb-3 animate-in fade-in"><div className="relative z-10"><h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Wand2 size={12} /> {t('mo_ai_title')}</h4>{isAiLoading && !aiQuestion && <div className="flex items-center gap-2 text-xs text-emerald-300 py-2"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> {t('mo_ai_analyzing')}</div>}{aiQuestion && <><p className="text-sm font-medium text-white mb-3 italic">"{aiQuestion}"</p><div className="flex gap-2"><input type="text" value={providerAiAnswer} onChange={(e) => setProviderAiAnswer(e.target.value)} placeholder={t('mo_ai_ph')} className="flex-1 bg-black/40 border border-emerald-500/30 rounded-lg px-3 py-2 text-base text-white focus:border-emerald-400 outline-none" /><button onClick={generateDescription} disabled={!providerAiAnswer.trim() || isAiLoading} className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 shrink-0">{isAiLoading ? '...' : t('mo_ai_generate')}</button></div></>}</div></div>}
                                         <div>
                                             <label className="text-[10px] font-bold text-emerald-100/70 uppercase mb-1.5 block">{t('mo_desc_label')}</label>
                                             <div className="relative group">
                                                 <textarea
                                                     value={offerDescription}
                                                     onChange={(e) => setOfferDescription(e.target.value)}
                                                     className="w-full p-3 bg-black/20 border border-emerald-500/20 rounded-xl font-medium text-base text-white outline-none resize-none focus:border-emerald-400"
                                                     rows={4}
                                                     placeholder={t('mo_desc_ph')}
                                                 />
                                                 {/* CHARACTER COUNTER */}
                                                 <div className="flex justify-end mt-1.5">
                                                     {offerDescription.length < 20 ? (
                                                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 animate-pulse bg-orange-400/10 px-2 py-1 rounded-md">
                                                             <AlertCircle size={10} />
                                                             <span>{20 - offerDescription.length} {t('mo_chars_left')}</span>
                                                         </div>
                                                     ) : (
                                                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                                                             <CheckCircle size={10} />
                                                             <span>{t('mo_ready')}</span>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         </div>
                                         <button
                                             onClick={() => {
                                                 onAddOffer(task.id, Number(offerPrice), `${durationValue} ${durationUnit === 'hours' ? t('mo_unit_hours') : t('mo_unit_days')}`, offerDescription, offerDateTime, isCompanyOffer ? 'company' : 'individual');
                                                 setIsOfferFormOpen(false);
                                                 setOfferPrice('');
                                                 setOfferDescription('');
                                             }}
                                             disabled={!offerPrice || !durationValue || !offerDateTime || offerDescription.length < 20 || (isCompanyOffer ? !me?.stripeOnboardingComplete_company : (!me?.stripeOnboardingComplete_individual && !me?.stripeOnboardingComplete))}
                                             className="
                                                 w-full py-4 mt-6
                                                 bg-slate-950 text-white 
                                                 rounded-[22px] font-black text-lg 
                                                 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] 
                                                 hover:scale-[1.02] active:scale-[0.98] 
                                                 disabled:opacity-40 disabled:scale-100
                                                 transition-all flex items-center justify-center gap-3 
                                                 group border border-emerald-500/30
                                             "
                                         >
                                             <span className="uppercase tracking-widest">{t('btn_make_offer')}</span>
                                             <div className="bg-emerald-500/20 p-1.5 rounded-full group-hover:bg-emerald-500/40 transition-colors">
                                                 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-emerald-400" />
                                             </div>
                                         </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Lightbox */}
                {isLightboxOpen && (
                    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300" onClick={() => setIsLightboxOpen(false)}>

                        {/* Image */}
                        <img
                            src={lightboxImageUrl || taskImages[currentImageIndex]}
                            className="max-w-full max-h-full object-contain transition-all duration-300"
                            alt="Full view"
                        />

                        {/* Close Button */}
                        <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all" onClick={() => setIsLightboxOpen(false)}>
                            <X size={24} />
                        </button>

                        {/* Lightbox Navigation - Only if part of the gallery array */}
                        {taskImages.length > 1 && (taskImages.includes(lightboxImageUrl!) || !lightboxImageUrl || taskImages.includes(taskImages[currentImageIndex])) && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); prevImage(); setLightboxImageUrl(null); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextImage(); setLightboxImageUrl(null); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                >
                                    <ChevronRight size={32} />
                                </button>

                                {/* Counter */}
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-xs font-bold border border-white/10">
                                    {currentImageIndex + 1} / {taskImages.length}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
