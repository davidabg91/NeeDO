
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
    subscribeToMockMode
} from './services/dataService';
import { Search, ChevronDown, ChevronUp, WifiOff, Info, MapPin, Clock, TrendingUp, Filter, SortAsc, X, Users } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CATEGORIES_LIST } from './constants';

const UI_CATEGORIES = [
  { id: 'Всички', label: 'Всички', icon: null },
  ...CATEGORIES_LIST.map(c => ({ id: c.id, label: `${c.icon} ${c.label}`, icon: null }))
];

type SortOption = 'DISTANCE' | 'NEWEST' | 'POPULAR';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQAExpanded, setIsQAExpanded] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState('Всички');
  const [showAllCategories, setShowAllCategories] = useState(false);
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

  const [pendingTaskData, setPendingTaskData] = useState<{analysis: AIAnalysisResult, images: string[], locationMode: string, manualAddress?: string, manualCoordinates?: {lat: number, lng: number}, estimatedPrice?: string} | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

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
          if (updated && updated !== selectedTask) {
              setSelectedTask(updated);
          }
      }
  }, [tasks, selectedTask]);

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
            console.log('Location error:', error);
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
      if (window.confirm('Сигурни ли сте, че искате да изтриете тази задача?')) {
          await deleteTask(taskId);
          setSelectedTask(null);
      }
  };

  const executeTaskCreation = async (analysis: AIAnalysisResult, images: string[], locationMode: string, manualAddress?: string, manualCoordinates?: {lat: number, lng: number}, estimatedPrice?: string, user?: User) => {
    const userToUse = user || currentUser;
    if (!userToUse) return;

    let finalLocation = { lat: mapCenter[0], lng: mapCenter[1] };
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
          console.error("Geocoding failed", error);
      }
      if (!finalAddress) finalAddress = "GPS Локация";
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
      aiEstimatedPrice: estimatedPrice || 'По договаряне' 
    };

    await createTask(newTask);
    setMapCenter([finalLocation.lat, finalLocation.lng]);
    setMapViewTrigger(prev => prev + 1);
    setIsChatOpen(false);
    setViewMode('LIST');
    setPendingTaskData(null);
  };

  const handleCreateTask = (analysis: AIAnalysisResult, images: string[], locationMode: 'GPS' | 'MANUAL', manualAddress?: string, manualCoordinates?: {lat: number, lng: number}, estimatedPrice?: string) => {
    if (!currentUser) {
      setPendingTaskData({ analysis, images, locationMode, manualAddress, manualCoordinates, estimatedPrice });
      setIsAuthModalOpen(true);
      return;
    }
    executeTaskCreation(analysis, images, locationMode, manualAddress, manualCoordinates, estimatedPrice);
  };

  const handleAddOffer = async (taskId: string, price: number, duration: string, description: string, date: string) => {
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
      providerIsCompany: currentUser.isCompany,
      price,
      currency: 'BGN',
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
            message: `${currentUser.name} предложи ${price} лв.`,
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

    // Simulate payment by immediately setting status to IN_PROGRESS (Test Mode)
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

  // --- NEW HANDLERS FOR COMPLETION FLOW ---

  // 1. Provider Marks as Done (Submit Work)
  const handleProviderSubmitWork = async (taskId: string, completionImage: string, requesterRating: number, requesterReview: string) => {
     if (!currentUser) return;
     const task = tasks.find(t => t.id === taskId);
     if (!task) return;

     // Add review FOR requester immediately, or store it to reveal later.
     // For simplicity, we add it now.
     const newReview: Review = {
        id: Date.now().toString(),
        taskId: task.id,
        fromUserId: currentUser.id, // Provider
        fromUser: currentUser.name,
        toUserId: task.requesterId, // Requester
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

  // 2. Requester Approves Work (With potential Dispute logic if rating is low)
  const handleRequesterApproveWork = async (taskId: string, providerRating: number, providerReview: string, completionImage?: string) => {
     if (!currentUser) return;
     const task = tasks.find(t => t.id === taskId);
     if (!task) return;
     const offer = task.offers.find(o => o.id === task.acceptedOfferId);
     if (!offer) return;

     // Add review FOR provider
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

     // Note: If completionImage was passed here (optional additional photo from requester), it could be added.
     // For now, we rely on provider's image in task.completionImageUrl
     
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

  // 3. Dispute
  const handleRaiseDispute = async (taskId: string, reason: string, description: string, evidenceImage?: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const disputeData: Dispute = {
          reason,
          description,
          evidenceImageUrl: evidenceImage,
          createdAt: Date.now(),
          status: 'OPEN'
      };

      await updateTaskStatus(taskId, TaskStatus.DISPUTED, { dispute: disputeData });

      // Notify Provider
      const offer = task.offers.find(o => o.id === task.acceptedOfferId);
      if (offer) {
          await sendNotification({
              userId: offer.providerId,
              type: 'DISPUTE_OPENED',
              title: 'Сигнал за проблем',
              message: `Клиентът оспори изпълнението на задачата "${task.title}". Администратор ще прегледа случая.`,
              taskId: task.id,
              isRead: false,
              createdAt: Date.now()
          });
      }
      
      // We could also simulate notifying Admin here
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
  };

  const handleAnswerQuestion = async (taskId: string, questionId: string, answer: string) => {
    await answerQuestionInTask(taskId, questionId, answer);
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

  const displayedCategories = showAllCategories ? UI_CATEGORIES : UI_CATEGORIES.slice(0, 6);
  const userNotifications = notifications; 
  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  if (authLoading) {
      return (
          <div className="flex items-center justify-center h-screen bg-slate-50">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-bold animate-pulse">Зареждане на Needo...</p>
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

  return (
    <div className="h-[100dvh] w-screen relative overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {isDemoMode && !currentUser && (
          <div className="absolute top-0 left-0 w-full z-[60] bg-amber-500 text-white text-xs font-bold px-4 py-1 text-center shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top">
              <Info size={14} />
              <span>Разглеждате демо версия. Влезте, за да взаимодействате.</span>
              <button onClick={() => setIsAuthModalOpen(true)} className="underline hover:text-amber-100 ml-1">Вход</button>
          </div>
      )}

      {/* NEW: Onboarding Modal */}
      <WelcomeOnboardingModal />

      <div className={`absolute top-0 left-0 w-full z-30 p-4 pointer-events-none pt-safe-top ${isDemoMode && !currentUser ? 'mt-6' : ''}`}>
        <div className="flex justify-center pointer-events-auto">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-900/20 px-6 py-2.5 rounded-2xl flex items-center justify-center border border-white/10 ring-1 ring-black/5 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={() => setViewMode('MAP')}>
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 bg-blue-500/30 rounded-lg rotate-6"></div>
                    <div className="absolute inset-0 bg-transparent border-2 border-white/20 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <span className="font-black text-lg italic leading-none -ml-0.5">N</span>
                    </div>
                </div>
                <span className="font-black text-2xl tracking-tighter text-white leading-none">NEEDO</span>
              </div>
           </div>
        </div>
      </div>

      <div className="w-full h-full relative">
        <div className={`absolute inset-0 transition-opacity duration-500 ${viewMode === 'MAP' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
           <MapBoard 
            tasks={tasks.filter(t => t.status === TaskStatus.OPEN)} 
            onTaskClick={setSelectedTask} 
            center={mapCenter}
            onLocateMe={handleLocateMe}
            userLocation={userLocation}
            viewTrigger={mapViewTrigger}
          />
        </div>

        {viewMode === 'LIST' && (
          <div className="absolute inset-0 z-20 bg-slate-50 overflow-y-auto scroll-smooth scrollbar-hide">
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/80 to-transparent"></div>
            </div>

            <div className={`relative z-10 pt-28 pb-36 px-4 sm:px-6 ${isDemoMode && !currentUser ? 'mt-4' : ''}`}>
               <div className="max-w-6xl mx-auto">
                 <div className="flex flex-col items-center text-center mb-6 space-y-6">
                   <div className="space-y-3">
                      <h2 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                        Намерете услугата, <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">която ви трябва</span>
                      </h2>
                   </div>

                   <div className="w-full max-w-3xl mx-auto relative group">
                      <div className="relative flex items-center p-1 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50">
                         <div className="pl-3 text-gray-400"><Search size={20} /></div>
                         <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Каква услуга търсите?" 
                            className="w-full py-3 px-3 text-slate-800 placeholder-gray-400 bg-transparent border-none focus:ring-0 text-base outline-none font-medium"
                         />
                      </div>
                   </div>

                   <div className="w-full max-w-4xl mx-auto overflow-x-auto scrollbar-hide pb-2">
                      <div className="flex flex-nowrap md:flex-wrap justify-start md:justify-center gap-2 px-1">
                          {displayedCategories.map((cat) => (
                            <button 
                              key={cat.id} 
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition-all transform active:scale-95 whitespace-nowrap flex items-center gap-2 ${
                              selectedCategory === cat.id
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-300' 
                                : 'bg-white text-slate-600 border border-gray-100 shadow-sm'
                            }`}>
                                <span>{cat.label}</span>
                            </button>
                          ))}
                          <button 
                             onClick={() => setShowAllCategories(!showAllCategories)}
                             className="px-4 py-2 rounded-full text-xs font-bold bg-blue-50 text-blue-600 flex items-center gap-1 whitespace-nowrap"
                          >
                             {showAllCategories ? <>Скрий <ChevronUp size={14}/></> : <>Още <ChevronDown size={14}/></>}
                          </button>
                      </div>
                   </div>
                 </div>
                 
                 <div className="max-w-4xl mx-auto mb-8 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1 md:pb-0">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 whitespace-nowrap flex items-center gap-1">
                          <SortAsc size={12} /> Сортирай:
                       </span>
                       <button onClick={() => setSortBy('DISTANCE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${sortBy === 'DISTANCE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><MapPin size={12} /> Най-близки</button>
                       <button onClick={() => setSortBy('NEWEST')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${sortBy === 'NEWEST' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Clock size={12} /> Най-нови</button>
                       <button onClick={() => setSortBy('POPULAR')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${sortBy === 'POPULAR' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Users size={12} /> По кандидати</button>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-200 hidden md:block"></div>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                       <div className="relative w-full md:w-48 group">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={14} />
                          <input type="text" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Филтър по град..." className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-blue-500 focus:bg-white outline-none transition-all" />
                          {cityFilter && <button onClick={() => setCityFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {processedTasks.length > 0 ? (
                     processedTasks.map(task => (
                       <div key={task.id}>
                          <TaskCard 
                            task={task}
                            distanceKm={userLocation ? calculateDistance(userLocation[0], userLocation[1], task.location.lat, task.location.lng) : null}
                            onClick={() => setSelectedTask(task)}
                            onOfferClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                          />
                       </div>
                     ))
                   ) : (
                     <div className="col-span-full text-center py-20 opacity-60 bg-white rounded-3xl border border-dashed border-slate-300">
                        <Filter size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-lg font-bold text-slate-400">Няма намерени задачи по тези критерии.</p>
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
               onNotificationClick={handleNotificationClick}
               onMarkAllRead={() => currentUser && markAllNotificationsRead(currentUser.id)}
             />
           </div>
        )}
      </div>

      <BottomNav 
        currentView={viewMode}
        onChangeView={handleViewChange}
        isLoggedIn={!!currentUser}
        userAvatar={currentUser?.avatarUrl}
        onCreateClick={() => currentUser ? setIsChatOpen(true) : setIsAuthModalOpen(true)}
        unreadNotificationsCount={unreadCount}
        isAdmin={currentUser?.isAdmin}
        onOpenLegal={() => setIsLegalModalOpen(true)}
      />

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
              executeTaskCreation(pendingTaskData.analysis, pendingTaskData.images, pendingTaskData.locationMode, pendingTaskData.manualAddress, pendingTaskData.manualCoordinates, pendingTaskData.estimatedPrice, user);
           }
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
      />
    </div>
  );
};

export default App;
