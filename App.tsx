
import React, { useState, useEffect, useMemo } from 'react';
import { MapBoard } from './components/MapBoard';
import { AIChatCreation } from './components/AIChatCreation';
import { TaskSidebar } from './components/TaskSidebar';
import { TaskQAPanel } from './components/TaskQAPanel';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { BottomNav } from './components/BottomNav';
import { TaskCard } from './components/TaskCard';
import { NotificationsView } from './components/NotificationsView';
import { AdminDashboard } from './components/AdminDashboard';
import { LegalInfoModal } from './components/LegalInfoModal';
import { WelcomeOnboardingModal } from './components/WelcomeOnboardingModal';
import { Task, TaskStatus, AIAnalysisResult, Offer, Review, User, Notification, TaskQuestion, Dispute } from './types';
import { calculateDistance } from './utils/geo';
import { getAllUsers, getUserById, logoutUser, syncUserProfile, getProvidersByCategory } from './services/authService';
import {
    subscribeToTasks,
    createTask,
    addOfferToTask,
    updateTaskStatus,
    addReviewToTask,
    addQuestionToTask,
    answerQuestionInTask,
    subscribeToNotifications,
    sendNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteTask,
    resetMockMode,
    subscribeToMockMode,
    subscribeToTaskOffers,
    subscribeToTaskQuestions,
    subscribeToTaskReviews
} from './services/dataService';
import { Search, ChevronDown, ChevronUp, WifiOff, Info, MapPin, Clock, TrendingUp, Filter, SortAsc, X, Users, Layers, Check, Loader2, ShieldCheck, Zap, Radio, Camera, Coins, Command, LayoutGrid, ChevronRight, Globe } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CATEGORIES_LIST } from './constants';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';

const UI_CATEGORIES = [
    { id: 'Всички', labelKey: 'cat_all', icon: '🌍' },
    ...CATEGORIES_LIST.map(c => ({ id: c.id, label: c.label, icon: c.icon, labelKey: c.labelKey }))
];

type SortOption = 'DISTANCE' | 'NEWEST' | 'POPULAR';

// --- NEW COMPONENT: LIVE STATUS TICKER ---
const LiveStatusTicker = () => {
    const messages = [
        { icon: <Search size={10} className="text-blue-400" />, text: "Намери точния изпълнител за секунди" },
        { icon: <Camera size={10} className="text-yellow-400" />, text: "Снимай проблема – AI създава задачата" },
        { icon: <TrendingUp size={10} className="text-green-400" />, text: "Сравни оферти и избери най-добрата" },
        { icon: <ShieldCheck size={10} className="text-purple-400" />, text: "Сигурни плащания и проверени профили" },
        { icon: <Coins size={10} className="text-emerald-400" />, text: "Печели пари като изпълняваш задачи" }
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center justify-center pointer-events-none mt-2 animate-in fade-in zoom-in duration-700">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                {messages[index].icon}
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider animate-in fade-in slide-in-from-bottom-1 duration-500 key={index}">
                    {messages[index].text}
                </span>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { t, language } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isQAExpanded, setIsQAExpanded] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('Всички');
    const [visibleLabelId, setVisibleLabelId] = useState<string | null>(null);

    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);

    const [mapSearchTerm, setMapSearchTerm] = useState('');
    const [isSearchingMapCity, setIsSearchingMapCity] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('DISTANCE');
    const [cityFilter, setCityFilter] = useState('');

    const [mapCenter, setMapCenter] = useState<[number, number]>([42.6977, 23.3219]);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [mapViewTrigger, setMapViewTrigger] = useState(0);

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [viewMode, setViewMode] = useState<'MAP' | 'LIST' | 'PROFILE' | 'NOTIFICATIONS' | 'ADMIN'>('MAP');

    const [pendingTaskData, setPendingTaskData] = useState<{ analysis: AIAnalysisResult, images: string[], locationMode: string, manualAddress?: string, manualCoordinates?: { lat: number, lng: number }, estimatedPrice?: string, timing?: string } | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
    const [legalModalSection, setLegalModalSection] = useState<'ABOUT' | 'TERMS' | 'PAYMENTS' | 'PRIVACY'>('ABOUT');

    const [isDirectMessageOpen, setIsDirectMessageOpen] = useState(false);
    const [targetChatTask, setTargetChatTask] = useState<Task | null>(null);
    const [viewedTaskIds, setViewedTaskIds] = useState<Set<string>>(new Set());

    // Tooltips & Welcome State
    const [showTooltips, setShowTooltips] = useState(true);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

    // Check for Welcome Modal on Mount
    useEffect(() => {
        let shouldShow = true;
        try {
            const hasSeen = localStorage.getItem('needo_onboarding_seen');
            if (hasSeen) {
                shouldShow = false;
            }
        } catch (e) {
            console.warn("LocalStorage access denied");
        }

        if (shouldShow) {
            const timer = setTimeout(() => setIsWelcomeModalOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // URL Deep Linking Logic (For shared tasks)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('taskId');

        if (taskId && tasks.length > 0 && !selectedTask) {
            const found = tasks.find(t => t.id === taskId);
            if (found) {
                setSelectedTask(found);
                // Clean URL without refresh
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [tasks]); // Run when tasks load

    // --- HISTORY HANDLING LOGIC ---
    // Push state when opening a modal/view
    useEffect(() => {
        // Only push if we are ENTERING a modal state
        if (selectedTask || isChatOpen || isAuthModalOpen || viewingProfileUser || isCategoryMenuOpen || isLegalModalOpen || isDirectMessageOpen || (viewMode !== 'MAP' && viewMode !== 'ADMIN')) {
            window.history.pushState({ needo_modal: true }, '');
        }
    }, [selectedTask, isChatOpen, isAuthModalOpen, viewingProfileUser, isCategoryMenuOpen, isLegalModalOpen, isDirectMessageOpen, viewMode]);

    // Global click listener to dismiss tooltips - FIXED LOGIC
    useEffect(() => {
        // Don't attach listener if Welcome Modal is open
        if (isWelcomeModalOpen) return;

        const handleGlobalClick = () => {
            if (showTooltips) {
                setShowTooltips(false);
            }
        };

        // Add delay to prevent immediate dismissal when closing the Welcome modal
        const timer = setTimeout(() => {
            window.addEventListener('click', handleGlobalClick);
        }, 1000); // Increased delay to ensure Welcome Modal click doesn't trigger this

        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, [showTooltips, isWelcomeModalOpen]);

    // Handle Back Button (Pop State)
    useEffect(() => {
        const handlePop = (e: PopStateEvent) => {
            // Close items in priority order
            if (isDirectMessageOpen) { setIsDirectMessageOpen(false); return; }
            if (isAuthModalOpen) { setIsAuthModalOpen(false); return; }
            if (isLegalModalOpen) { setIsLegalModalOpen(false); return; }
            if (isChatOpen) { setIsChatOpen(false); return; } // AI Wizard
            if (selectedTask) { setSelectedTask(null); return; }
            if (viewingProfileUser) { setViewingProfileUser(null); return; }
            if (isCategoryMenuOpen) { setIsCategoryMenuOpen(false); return; }
            if (viewMode !== 'MAP' && viewMode !== 'ADMIN') { setViewMode('MAP'); return; }
        };

        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, [isDirectMessageOpen, isAuthModalOpen, isLegalModalOpen, isChatOpen, selectedTask, viewingProfileUser, isCategoryMenuOpen, viewMode]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userData = await syncUserProfile(firebaseUser);
                setCurrentUser(userData);
            } else {
                setCurrentUser(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (currentUser) {
            resetMockMode();
        }
        const unsubscribe = subscribeToTasks((updatedTasks) => {
            setTasks(updatedTasks);
        });
        const unsubscribeMock = subscribeToMockMode((isMock) => {
            setIsDemoMode(isMock);
        });
        return () => {
            unsubscribe();
            unsubscribeMock();
        };
    }, [currentUser]);

    useEffect(() => {
        if (selectedTask) {
            const updated = tasks.find(t => t.id === selectedTask.id);
            if (updated) {
                // IMPORTANT: Only update if the main doc data actually changed to avoid infinite loops
                // We compare title or createdAt as a proxy for 'new doc version' from subscribeToTasks
                const needsUpdate = updated.title !== selectedTask.title ||
                    updated.status !== selectedTask.status ||
                    updated.description !== selectedTask.description;

                if (needsUpdate) {
                    setSelectedTask(prev => prev ? { ...updated, offers: prev.offers, questions: prev.questions, reviews: prev.reviews } : updated);
                }
            }
            setViewedTaskIds(prev => new Set(prev).add(selectedTask.id));
        }
    }, [tasks, selectedTask?.id, selectedTask?.title, selectedTask?.status, selectedTask?.description, selectedTask?.createdAt]); // Added more dependencies for stability

    // --- NEW: Sub-collection subscriptions for Selected Task ---
    useEffect(() => {
        if (!selectedTask) return;

        const unsubscribeOffers = subscribeToTaskOffers(selectedTask.id, (offers) => {
            setSelectedTask(prev => (prev && prev.id === selectedTask.id) ? { ...prev, offers } : prev);
        });

        const unsubscribeQuestions = subscribeToTaskQuestions(selectedTask.id, (questions) => {
            setSelectedTask(prev => (prev && prev.id === selectedTask.id) ? { ...prev, questions } : prev);
        });

        const unsubscribeReviews = subscribeToTaskReviews(selectedTask.id, (reviews) => {
            setSelectedTask(prev => (prev && prev.id === selectedTask.id) ? { ...prev, reviews } : prev);
        });

        return () => {
            unsubscribeOffers();
            unsubscribeQuestions();
            unsubscribeReviews();
        };
    }, [selectedTask?.id]);


    useEffect(() => {
        if (currentUser) {
            const unsubscribe = subscribeToNotifications(currentUser.id, (updatedNotifs) => {
                setNotifications(updatedNotifs);
            });
            return () => unsubscribe();
        } else {
            setNotifications([]);
        }
    }, [currentUser]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setMapCenter(loc);
                    setUserLocation(loc);
                    setMapViewTrigger(prev => prev + 1);
                },
                (error) => {
                    console.log('Location error:', error instanceof Error ? error.message : String(error));
                    setSortBy('NEWEST');
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
            );
        } else {
            setSortBy('NEWEST');
        }
    }, []);

    useEffect(() => {
        if (viewMode === 'ADMIN') {
            getAllUsers().then(users => setAllUsers(users));
        }
    }, [viewMode]);

    useEffect(() => {
        setIsQAExpanded(false);
    }, [selectedTask?.id]);

    useEffect(() => {
        if (selectedCategory) {
            setVisibleLabelId(selectedCategory);
            const timer = setTimeout(() => setVisibleLabelId(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [selectedCategory]);

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setMapCenter(loc);
                    setUserLocation(loc);
                    setMapViewTrigger(prev => prev + 1);
                },
                () => alert('Не успяхме да вземем вашата локация.'),
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
            );
        }
    };

    const handleMapCitySearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mapSearchTerm.trim()) return;

        setIsSearchingMapCity(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchTerm)}&countrycodes=bg&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setMapCenter([parseFloat(lat), parseFloat(lon)]);
                setMapViewTrigger(prev => prev + 1);
                setIsCategoryMenuOpen(false);
                setMapSearchTerm('');
            } else {
                alert('Градът не е намерен.');
            }
        } catch (error) {
            console.error("City search error", error instanceof Error ? error.message : String(error));
        } finally {
            setIsSearchingMapCity(false);
        }
    };

    const handleUserClick = async (userId: string) => {
        const user = await getUserById(userId);
        if (user) {
            setViewingProfileUser(user);
        }
    };

    const handleBanUser = (userId: string) => {
        // Simulate ban
    };

    const handleDeleteTask = async (taskId: string) => {
        // Removed window.confirm from here to allow UI components to handle loading state appropriately
        try {
            await deleteTask(taskId);
            setSelectedTask(null);
        } catch (e) {
            console.error("Delete failed in UI", e instanceof Error ? e.message : String(e));
            throw e; // Rethrow so component knows it failed
        }
    };

    const executeTaskCreation = async (analysis: AIAnalysisResult, images: string[], locationMode: string, manualAddress?: string, manualCoordinates?: { lat: number, lng: number }, estimatedPrice?: string, timing?: string, user?: User) => {
        const userToUse = user || currentUser;
        if (!userToUse) return;

        let finalLocation = { lat: 0, lng: 0 };
        let finalAddress = manualAddress;

        if (locationMode === 'MANUAL' && manualCoordinates) {
            finalLocation = { lat: manualCoordinates.lat, lng: manualCoordinates.lng };
        } else if (locationMode === 'GPS' && userLocation) {
            finalLocation = { lat: userLocation[0], lng: userLocation[1] };
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${finalLocation.lat}&lon=${finalLocation.lng}&zoom=18&addressdetails=1&accept-language=bg`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data && !data.error) {
                        finalAddress = data.display_name.split(',').slice(0, 3).join(', ');
                    }
                }
            } catch (error) {
                console.error("Geocoding failed", error instanceof Error ? error.message : String(error));
            }
            if (!finalAddress) finalAddress = "GPS Локация";
        } else {
            // Fallback to map center ONLY if absolutely necessary, but we should probably block here
            // matches user's request for "mandatory" manual if GPS fails
            if (locationMode === 'MANUAL' && !manualCoordinates) {
                console.error("Manual location required but not provided");
                return;
            }
            finalLocation = { lat: mapCenter[0], lng: mapCenter[1] };
        }

        const newTask = {
            title: analysis.title,
            description: analysis.description,
            category: analysis.category || 'Други',
            location: finalLocation,
            address: finalAddress || 'Локация',
            status: TaskStatus.OPEN,
            createdAt: Date.now(),
            requesterId: userToUse.id,
            requesterName: userToUse.name,
            requesterRating: userToUse.rating,
            requesterReviewCount: userToUse.reviewCount,
            requesterAvatar: userToUse.avatarUrl,
            requesterIsCompany: userToUse.isCompany,
            offers: [],
            questions: [],
            imageUrl: images[0],
            images: images,
            aiEstimatedPrice: estimatedPrice || 'По договаряне',
            timing: timing || 'Възможно най-скоро'
        };

        await createTask(newTask);
        setMapCenter([finalLocation.lat, finalLocation.lng]);
        setMapViewTrigger(prev => prev + 1);
        setIsChatOpen(false);
        setViewMode('LIST');
        setPendingTaskData(null);
    };

    const handleCreateTask = (analysis: AIAnalysisResult, images: string[], locationMode: 'GPS' | 'MANUAL', manualAddress?: string, manualCoordinates?: { lat: number, lng: number }, estimatedPrice?: string, timing?: string) => {
        if (!currentUser) {
            setPendingTaskData({ analysis, images, locationMode, manualAddress, manualCoordinates, estimatedPrice, timing });
            setIsAuthModalOpen(true);
            return;
        }
        executeTaskCreation(analysis, images, locationMode, manualAddress, manualCoordinates, estimatedPrice, timing);
    };

    const handleAddOffer = async (taskId: string, price: number, duration: string, description: string, date: string, isCompanyOverride?: boolean) => {
        if (!currentUser) {
            setIsAuthModalOpen(true);
            return;
        }
        const task = tasks.find(t => t.id === taskId);
        const newOffer: Offer = {
            id: Date.now().toString(),
            taskId,
            providerId: currentUser.id,
            providerName: currentUser.name,
            providerAvatar: currentUser.avatarUrl,
            providerIsCompany: isCompanyOverride !== undefined ? isCompanyOverride : currentUser.isCompany,
            price,
            currency: 'EUR', // UPDATED to EUR
            duration,
            comment: description,
            startDate: date,
            createdAt: Date.now()
        };

        await addOfferToTask(taskId, newOffer);

        if (task) {
            await sendNotification({
                userId: task.requesterId,
                type: 'OFFER_RECEIVED',
                title: `Нова оферта: ${task.title}`,
                message: `${currentUser.name} предложи ${price} €`, // UPDATED to €
                taskId: task.id,
                isRead: false,
                createdAt: Date.now()
            });
        }
    };

    const handleAcceptOffer = async (taskId: string, offerId: string) => {
        const task = tasks.find(t => t.id === taskId);
        const offer = task?.offers.find(o => o.id === offerId);
        if (!task || !offer) return;

        await updateTaskStatus(taskId, TaskStatus.AWAITING_PAYMENT, { acceptedOfferId: offerId });

        await sendNotification({
            userId: offer.providerId,
            type: 'OFFER_ACCEPTED',
            title: 'Офертата ви е приета!',
            message: `${task.requesterName} избра вас за "${task.title}".`,
            taskId: task.id,
            isRead: false,
            createdAt: Date.now()
        });
    };

    const handleFundEscrow = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const offer = task.offers.find(o => o.id === task.acceptedOfferId);

        await updateTaskStatus(taskId, TaskStatus.IN_PROGRESS, { escrowAmount: offer?.price });

        if (offer) {
            await sendNotification({
                userId: offer.providerId,
                type: 'PAYMENT_RELEASED',
                title: 'Плащането е депозирано (Escrow)',
                message: `Можете да започнете работа по "${task.title}". Сумата е защитена.`,
                taskId: task.id,
                isRead: false,
                createdAt: Date.now()
            });
        }
    };

    const handleProviderSubmitWork = async (taskId: string, completionImage: string, requesterRating: number, requesterReview: string) => {
        if (!currentUser) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newReview: Review = {
            id: Date.now().toString(),
            taskId: task.id,
            fromUserId: currentUser.id,
            fromUser: currentUser.name,
            toUserId: task.requesterId,
            toUser: task.requesterName,
            rating: requesterRating,
            comment: requesterReview,
            createdAt: Date.now()
        };

        await addReviewToTask(taskId, newReview);
        await updateTaskStatus(taskId, TaskStatus.IN_REVIEW, { completionImageUrl: completionImage, submittedAt: Date.now() });

        await sendNotification({
            userId: task.requesterId,
            type: 'TASK_SUBMITTED',
            title: 'Работата е предадена!',
            message: `${currentUser.name} маркира задачата като изпълнена. Прегледайте и одобрете.`,
            taskId: task.id,
            isRead: false,
            createdAt: Date.now()
        });
    };

    const handleRequesterApproveWork = async (taskId: string, providerRating: number, providerReview: string, completionImage?: string) => {
        if (!currentUser) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const offer = task.offers.find(o => o.id === task.acceptedOfferId);
        if (!offer) return;

        const newReview: Review = {
            id: (Date.now() + 1).toString(),
            taskId: task.id,
            fromUserId: currentUser.id,
            fromUser: currentUser.name,
            toUserId: offer.providerId,
            toUser: offer.providerName,
            rating: providerRating,
            comment: providerReview,
            createdAt: Date.now()
        };

        await addReviewToTask(taskId, newReview);
        await updateTaskStatus(taskId, TaskStatus.CLOSED);

        await sendNotification({
            userId: offer.providerId,
            type: 'TASK_COMPLETED',
            title: 'Плащането е освободено!',
            message: `${task.requesterName} одобри работата ви и остави оценка.`,
            taskId: task.id,
            isRead: false,
            createdAt: Date.now()
        });
    };

    const handleRaiseDispute = async (taskId: string, reason: string, description: string, evidenceImage?: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || !currentUser) return;

        const disputeData: Dispute = {
            reason,
            description,
            evidenceImageUrl: evidenceImage,
            createdAt: Date.now(),
            status: 'OPEN',
            initiatedBy: currentUser.id, // Store who started it
            initiatedByName: currentUser.name
        };

        await updateTaskStatus(taskId, TaskStatus.DISPUTED, { dispute: disputeData });

        // Notify the other party
        const isRequester = task.requesterId === currentUser.id;
        const offer = task.offers.find(o => o.id === task.acceptedOfferId);

        const recipientId = isRequester ? offer?.providerId : task.requesterId;

        if (recipientId) {
            const title = isRequester ? 'Сигнал за проблем' : 'Отказ от изпълнител';
            const message = isRequester
                ? `Клиентът оспори изпълнението на задачата "${task.title}".`
                : `Изпълнителят отказа задачата "${task.title}".`;

            await sendNotification({
                userId: recipientId,
                type: 'DISPUTE_OPENED',
                title: title,
                message: message + ' Администратор ще прегледа случая.',
                taskId: task.id,
                isRead: false,
                createdAt: Date.now()
            });
        }
    };

    const handleAskQuestion = async (taskId: string, text: string) => {
        if (!currentUser) {
            setIsAuthModalOpen(true);
            return;
        }
        const newQuestion: TaskQuestion = {
            id: Date.now().toString(),
            text,
            userId: currentUser.id,
            userName: currentUser.name,
            createdAt: Date.now()
        };
        await addQuestionToTask(taskId, newQuestion);

        const task = tasks.find(t => t.id === taskId);
        if (task && task.requesterId !== currentUser.id) {
            await sendNotification({
                userId: task.requesterId,
                type: 'SYSTEM',
                title: `Нова въпрос за "${task.title}"`,
                message: `${currentUser.name} попита: "${text}"`,
                taskId: task.id,
                isRead: false,
                createdAt: Date.now()
            });
        }
    };

    const handleAnswerQuestion = async (taskId: string, questionId: string, answer: string) => {
        await answerQuestionInTask(taskId, questionId, answer);

        const task = tasks.find(t => t.id === taskId);
        const question = task?.questions?.find(q => q.id === questionId);

        if (task && question) {
            await sendNotification({
                userId: question.userId,
                type: 'SYSTEM',
                title: `Отговор на вашия въпрос`,
                message: `Възложителят отговори на въпроса ви за "${task.title}".`,
                taskId: task.id,
                isRead: false,
                createdAt: Date.now()
            });
        }
    };

    const getProviderRating = (providerId: string) => {
        let totalRating = 0;
        let count = 0;
        tasks.forEach(task => {
            if (task.reviews) {
                task.reviews.forEach(review => {
                    if (review.toUserId === providerId) {
                        totalRating += review.rating;
                        count++;
                    }
                });
            }
        });
        return { average: count > 0 ? totalRating / count : 0, count };
    };

    const handleViewChange = (view: 'MAP' | 'LIST' | 'PROFILE' | 'NOTIFICATIONS' | 'ADMIN') => {
        if (view === 'PROFILE' || view === 'NOTIFICATIONS' || view === 'ADMIN') {
            if (!currentUser) {
                setIsAuthModalOpen(true);
                return;
            }
            if (view === 'PROFILE') setViewingProfileUser(currentUser);
            else setViewMode(view);
        } else {
            setViewMode(view);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        await markNotificationRead(notif.id);
        if (notif.taskId) {
            const task = tasks.find(t => t.id === notif.taskId);
            if (task) setSelectedTask(task);
        }
    };

    const processedTasks = useMemo(() => {
        let result = tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'Всички' || task.category === selectedCategory;
            const matchesCity = cityFilter ? (task.address?.toLowerCase().includes(cityFilter.toLowerCase()) || false) : true;
            const matchesStatus = task.status === TaskStatus.OPEN;
            return matchesSearch && matchesCategory && matchesStatus && matchesCity;
        });

        result.sort((a, b) => {
            switch (sortBy) {
                case 'NEWEST': return b.createdAt - a.createdAt;
                case 'POPULAR': return b.offers.length - a.offers.length;
                case 'DISTANCE':
                    if (userLocation) {
                        const distA = calculateDistance(userLocation[0], userLocation[1], a.location.lat, a.location.lng);
                        const distB = calculateDistance(userLocation[0], userLocation[1], b.location.lat, b.location.lng);
                        return distA - distB;
                    }
                    return b.createdAt - a.createdAt;
                default: return 0;
            }
        });
        return result;
    }, [tasks, searchQuery, selectedCategory, cityFilter, sortBy, userLocation]);

    const mapFilteredTasks = useMemo(() => {
        return tasks.filter(t =>
            t.status === TaskStatus.OPEN &&
            (selectedCategory === 'Всички' || t.category === selectedCategory)
        );
    }, [tasks, selectedCategory]);

    const categoriesToShow = showAllCategories ? UI_CATEGORIES : UI_CATEGORIES.slice(0, 5);

    const userNotifications = notifications;
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    // Logic for profile warning
    const showProfileWarning = !!(currentUser && !currentUser.stripeOnboardingComplete);

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-50 animate-in fade-in duration-500">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 rounded-[20px] overflow-hidden shadow-xl border-4 border-white animate-in zoom-in duration-700">
                        <img src="logo.jpg" alt="Needo" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">
                            needo<span className="text-blue-600">.</span>
                        </h2>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'ADMIN' && currentUser?.isAdmin) {
        return (
            <AdminDashboard
                users={allUsers}
                tasks={tasks}
                onLogout={async () => {
                    await logoutUser();
                    setViewMode('MAP');
                }}
                onSwitchToApp={() => setViewMode('MAP')}
                onBanUser={handleBanUser}
                onDeleteTask={handleDeleteTask}
            />
        );
    }

    const handleLogoClick = () => {
        setIsDirectMessageOpen(false);
        setTargetChatTask(null);
        setSelectedTask(null);
        setViewMode('MAP');
    };

    const getActiveCategoryIcon = () => {
        const cat = UI_CATEGORIES.find(c => c.id === selectedCategory);
        return cat ? cat.icon : '🌍';
    };

    return (
        <div className="h-[100dvh] w-screen relative overflow-hidden bg-slate-50 font-sans text-slate-900">

            {/* --- ONBOARDING TOOLTIPS - MAP INFO --- */}
            {showTooltips && viewMode === 'MAP' && (
                <div className="absolute top-48 left-6 z-[60] pointer-events-none animate-in fade-in slide-in-from-left-4 duration-700">
                    <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-white">
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-600/30 p-2 rounded-full border border-white/10">
                                <MapPin size={20} className="text-white" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wide mb-1 text-blue-200">КАРТА СЪС ЗАДАЧИ</h4>
                                <p className="text-[10px] font-bold text-white/90 leading-relaxed max-w-[180px]">
                                    Тук виждате всички активни задачи на живо. Кликнете, за да видите детайли.
                                </p>
                            </div>
                        </div>
                        {/* Decorative caret/arrow pointing slightly up/left contextually */}
                        <div className="absolute -top-1 left-8 w-3 h-3 bg-black/40 border-t border-l border-white/10 rotate-45 transform"></div>
                    </div>
                </div>
            )}

            {isDemoMode && !currentUser && (
                <div className="absolute top-0 left-0 w-full z-[60] bg-amber-50 text-white text-xs font-bold px-4 py-1 text-center shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top">
                    <Info size={14} />
                    <span>Разглеждате демо версия. Влезте, за да взаимодействате.</span>
                    <button onClick={() => setIsAuthModalOpen(true)} className="underline hover:text-amber-100 ml-1">Вход</button>
                </div>
            )}

            <WelcomeOnboardingModal
                isOpen={isWelcomeModalOpen}
                onClose={() => {
                    setIsWelcomeModalOpen(false);
                    try {
                        localStorage.setItem('needo_onboarding_seen', 'true');
                    } catch (e) { }
                }}
            />

            {viewMode === 'MAP' && (
                <>
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-900/80 via-indigo-800/20 to-transparent pointer-events-none z-20"></div>
                    <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-blue-900/50 via-indigo-800/10 to-transparent pointer-events-none z-20"></div>
                    <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>
                </>
            )}

            <div className={`absolute top-0 left-0 w-full z-30 p-4 pointer-events-none pt-safe-top ${isDemoMode && !currentUser ? 'mt-6' : ''}`}>
                <div className="flex flex-col items-center pointer-events-auto">

                    <div
                        className="group relative cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95"
                        onClick={handleLogoClick}
                    >
                        <div className="bg-black/30 backdrop-blur-xl border border-white/10 px-6 py-2.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.2)] ring-1 ring-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 relative flex items-center justify-center overflow-hidden rounded-lg">
                                <img src="logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-2xl tracking-tighter text-white leading-none drop-shadow-md">
                                    needo<span className="text-blue-400">.</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {viewMode === 'MAP' && <LiveStatusTicker />}
                </div>
            </div>

            {/* FIXED LANGUAGE SWITCHER FOR LIST VIEW - MOVED HERE FOR CLICKABILITY */}
            {viewMode === 'LIST' && (
                <div className="fixed top-0 right-0 z-[60] p-4 pt-safe-top pointer-events-none">
                    <div className="pointer-events-auto mt-1 mr-1">
                        <LanguageSwitcher variant="dark" align="right" />
                    </div>
                </div>
            )}

            <div className="w-full h-full relative">
                <div className={`absolute inset-0 transition-opacity duration-500 ${viewMode === 'MAP' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <MapBoard
                        tasks={mapFilteredTasks}
                        onTaskClick={setSelectedTask}
                        center={mapCenter}
                        onLocateMe={handleLocateMe}
                        userLocation={userLocation}
                        viewTrigger={mapViewTrigger}
                        viewedTaskIds={viewedTaskIds}
                        onMeClick={() => {
                            if (currentUser) {
                                setViewingProfileUser(currentUser);
                            } else {
                                setIsAuthModalOpen(true);
                            }
                        }}
                        selectedTask={selectedTask}
                    />

                    <button
                        onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                        className={`
                  absolute left-4 top-32 z-30 pointer-events-auto
                  w-12 h-12 bg-[#0f0f0f]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center shadow-2xl
                  text-white hover:scale-110 active:scale-95 transition-all duration-300 group
                  ${isCategoryMenuOpen ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}
              `}
                    >
                        {selectedCategory === 'Всички' ? (
                            <Layers size={22} className="group-hover:text-blue-400 transition-colors" />
                        ) : (
                            <span className="text-xl">{getActiveCategoryIcon()}</span>
                        )}
                    </button>

                    {isCategoryMenuOpen && (
                        <div className="absolute left-4 top-32 z-40 pointer-events-auto flex flex-col w-80 max-h-[60vh] bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in slide-in-from-left-4 duration-300 origin-top-left ring-1 ring-white/5">
                            <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                                <div>
                                    <h3 className="text-sm font-bold text-white leading-none">Категории</h3>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Филтрирай задачите</p>
                                </div>
                                <button
                                    onClick={() => setIsCategoryMenuOpen(false)}
                                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="px-4 py-3 shrink-0">
                                <form onSubmit={handleMapCitySearch} className="relative group">
                                    <input
                                        type="text"
                                        value={mapSearchTerm}
                                        onChange={(e) => setMapSearchTerm(e.target.value)}
                                        placeholder="Намери град..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all"
                                    />
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                                </form>
                            </div>

                            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-3 space-y-1">
                                {UI_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            setIsCategoryMenuOpen(false);
                                        }}
                                        className={`
                                  w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left group
                                  ${selectedCategory === cat.id
                                                ? 'bg-blue-600/20 border border-blue-500/50 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                                                : 'hover:bg-white/5 border border-transparent text-slate-400 hover:text-white'
                                            }
                              `}
                                    >
                                        <div className={`
                                  w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm transition-all
                                  ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white/10 group-hover:bg-white/20'}
                              `}>
                                            {cat.icon}
                                        </div>

                                        <span className="text-xs font-bold truncate flex-1">
                                            {(cat as any).labelKey ? t((cat as any).labelKey) : (cat as any).label}
                                        </span>

                                        {selectedCategory === cat.id && (
                                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa] shrink-0 animate-pulse"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {viewMode === 'LIST' && (
                    <div className={`absolute inset-0 z-20 bg-[#F2F2F7] scroll-smooth scrollbar-hide overflow-y-auto`}>

                        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-400/20 blur-[100px] rounded-full animate-pulse"></div>
                            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-400/20 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                            <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-purple-300/20 blur-[80px] rounded-full"></div>
                        </div>

                        <div className={`relative z-10 pt-36 pb-36 px-4 sm:px-6 ${isDemoMode && !currentUser ? 'mt-4' : ''}`}>

                            <div className="max-w-6xl mx-auto">
                                <div className="flex flex-col items-center text-center mb-10 space-y-6">
                                    <div className="space-y-4">
                                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] md:leading-[0.95] mb-4">
                                            <span className="block text-slate-900 drop-shadow-sm">{t('hero_title_1')}</span>
                                            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent pb-2">
                                                {t('hero_title_2')}
                                            </span>
                                        </h2>
                                        <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                                            {t('hero_desc')} <span className="text-blue-600 font-bold">{t('hero_desc_highlight')}</span>
                                        </p>
                                    </div>

                                    <div className="w-full max-w-4xl mx-auto z-20 relative flex flex-col md:flex-row gap-4 items-stretch">

                                        <div className="flex-1 bg-white p-2 rounded-[24px] shadow-sm border border-slate-100 flex flex-col justify-center px-5 py-3 relative group focus-within:ring-2 ring-blue-500/20 transition-all hover:shadow-md">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left flex items-center gap-1">
                                                <Search size={10} /> {t('search_label')}
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder={t('search_placeholder')}
                                                    className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder-slate-400 font-bold text-lg outline-none p-0"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 md:max-w-[300px] bg-white p-2 rounded-[24px] shadow-sm border border-slate-100 flex flex-col justify-center px-5 py-3 relative group focus-within:ring-2 ring-blue-500/20 transition-all hover:shadow-md">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left flex items-center gap-1">
                                                <MapPin size={10} /> {t('city_label')}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={cityFilter}
                                                    onChange={(e) => setCityFilter(e.target.value)}
                                                    placeholder={t('city_placeholder')}
                                                    className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder-slate-400 font-bold text-lg outline-none p-0"
                                                />
                                                {cityFilter && (
                                                    <button onClick={() => setCityFilter('')} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`w-full flex gap-2 items-center py-2 px-1 max-w-4xl transition-all duration-300 ${showAllCategories ? 'flex-wrap justify-center' : 'overflow-x-auto scrollbar-hide flex-nowrap justify-start md:justify-center mask-linear-gradient'}`}>
                                        {categoriesToShow.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border shrink-0 ${selectedCategory === cat.id
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                    : 'bg-white/60 backdrop-blur-sm text-slate-600 border-white/20 hover:bg-white hover:shadow-sm'
                                                    }`}>
                                                <span>{cat.icon}</span>
                                                <span>{(cat as any).labelKey ? t((cat as any).labelKey) : (cat as any).label}</span>
                                            </button>
                                        ))}

                                        {!showAllCategories && (
                                            <button
                                                onClick={() => setShowAllCategories(true)}
                                                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border shrink-0 bg-white/60 backdrop-blur-sm text-blue-600 border-blue-200 hover:bg-white hover:shadow-sm group"
                                            >
                                                <span>✨</span>
                                                <span className="group-hover:translate-x-0.5 transition-transform">{t('cat_more')}</span>
                                            </button>
                                        )}

                                        {showAllCategories && (
                                            <button
                                                onClick={() => setShowAllCategories(false)}
                                                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border shrink-0 bg-white/60 backdrop-blur-sm text-red-500 border-red-200 hover:bg-white hover:shadow-sm"
                                            >
                                                <ChevronRight className="rotate-180" size={14} />
                                                <span>{t('cat_less')}</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-2 p-1 bg-black/5 rounded-2xl backdrop-blur-sm">
                                        <button onClick={() => setSortBy('DISTANCE')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'DISTANCE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t('sort_dist')}</button>
                                        <button onClick={() => setSortBy('NEWEST')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'NEWEST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t('sort_new')}</button>
                                        <button onClick={() => setSortBy('POPULAR')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'POPULAR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t('sort_pop')}</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                    {processedTasks.length > 0 ? (
                                        processedTasks.map(task => (
                                            <div key={task.id} className="h-full">
                                                <TaskCard
                                                    task={task}
                                                    distanceKm={userLocation ? calculateDistance(userLocation[0], userLocation[1], task.location.lat, task.location.lng) : null}
                                                    onClick={() => setSelectedTask(task)}
                                                    onOfferClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center py-24">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-200/50 mb-4 backdrop-blur-sm">
                                                <Filter size={32} className="text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-700">Няма намерени задачи</h3>
                                            <p className="text-slate-500">Опитайте да промените филтрите или търсенето.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'NOTIFICATIONS' && (
                    <div className="absolute inset-0 z-20 bg-slate-50">
                        <NotificationsView
                            notifications={userNotifications}
                            tasks={tasks}
                            currentUser={currentUser}
                            onNotificationClick={handleNotificationClick}
                            onMarkAllRead={() => currentUser && markAllNotificationsRead(currentUser.id)}
                            onChatOpen={setIsDirectMessageOpen}
                            onTaskClick={setSelectedTask}
                            initialChatTask={targetChatTask}
                            onClearInitialChat={() => setTargetChatTask(null)}
                            isChatActiveExternal={isDirectMessageOpen}
                        />
                    </div>
                )}
            </div>

            {!isDirectMessageOpen && (
                <BottomNav
                    currentView={viewMode}
                    onChangeView={handleViewChange}
                    isLoggedIn={!!currentUser}
                    userAvatar={currentUser?.avatarUrl}
                    onCreateClick={() => currentUser ? setIsChatOpen(true) : setIsAuthModalOpen(true)}
                    unreadNotificationsCount={unreadCount}
                    isAdmin={currentUser?.isAdmin}
                    onOpenLegal={() => {
                        setLegalModalSection('TERMS');
                        setIsLegalModalOpen(true);
                    }}
                    showTooltips={showTooltips && !isWelcomeModalOpen}
                    showProfileWarning={showProfileWarning}
                />
            )}

            <AIChatCreation
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onTaskCreated={handleCreateTask}
                userLocation={userLocation}
            />

            {selectedTask && (
                <>
                    <TaskQAPanel
                        task={selectedTask}
                        currentUser={currentUser}
                        onAskQuestion={handleAskQuestion}
                        onAnswerQuestion={handleAnswerQuestion}
                        isOpen={true}
                        isExpanded={isQAExpanded}
                        onToggle={() => setIsQAExpanded(!isQAExpanded)}
                    />
                    <TaskSidebar
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        isRequester={!!currentUser && !!selectedTask && currentUser.id === selectedTask.requesterId}
                        currentUserId={currentUser?.id}
                        onAddOffer={handleAddOffer}
                        onAcceptOffer={handleAcceptOffer}
                        onFundEscrow={handleFundEscrow}
                        onProviderSubmitWork={handleProviderSubmitWork}
                        onRequesterApproveWork={handleRequesterApproveWork}
                        onRaiseDispute={handleRaiseDispute}
                        getProviderRating={getProviderRating}
                        onUserClick={handleUserClick}
                        onAuthRequest={() => setIsAuthModalOpen(true)}
                        onDeleteTask={handleDeleteTask}
                        userLocation={userLocation}
                        onOpenQA={() => setIsQAExpanded(true)}
                        onOpenChat={() => {
                            if (currentUser) {
                                setTargetChatTask(selectedTask);
                                setSelectedTask(null);
                                setViewMode('NOTIFICATIONS');
                            } else {
                                setIsAuthModalOpen(true);
                            }
                        }}
                    />
                </>
            )}

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onLoginSuccess={(user) => {
                    setCurrentUser(user);
                    setIsAuthModalOpen(false);
                    if (user.isAdmin) setViewMode('ADMIN');
                    if (pendingTaskData) {
                        executeTaskCreation(pendingTaskData.analysis, pendingTaskData.images, pendingTaskData.locationMode, pendingTaskData.manualAddress, pendingTaskData.manualCoordinates, pendingTaskData.estimatedPrice, pendingTaskData.timing, user);
                    }
                }}
                onOpenLegal={(section) => {
                    setLegalModalSection(section);
                    setIsLegalModalOpen(true);
                }}
            />

            {viewingProfileUser && (
                <UserProfile
                    user={viewingProfileUser}
                    tasks={tasks}
                    isOpen={!!viewingProfileUser}
                    onClose={() => setViewingProfileUser(null)}
                    onLogout={async () => {
                        await logoutUser();
                        setCurrentUser(null);
                        setViewingProfileUser(null);
                        setViewMode('MAP');
                    }}
                    isCurrentUserProfile={currentUser?.id === viewingProfileUser.id}
                    onTaskClick={(task) => {
                        setSelectedTask(task);
                        setViewingProfileUser(null);
                    }}
                    onUserUpdate={(updatedData) => {
                        setViewingProfileUser(prev => prev ? ({ ...prev, ...updatedData }) : null);
                        if (currentUser?.id === viewingProfileUser.id) {
                            setCurrentUser(prev => prev ? ({ ...prev, ...updatedData }) : null);
                        }
                    }}
                />
            )}

            <LegalInfoModal
                isOpen={isLegalModalOpen}
                onClose={() => setIsLegalModalOpen(false)}
                initialSection={legalModalSection}
            />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
};

export default App;
