
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Notification, Task, User, DirectMessage, TaskStatus } from '../types';
import { Bell, CheckCircle, DollarSign, Briefcase, Info, Clock, MessageCircle, Send, ChevronLeft, User as UserIcon, ExternalLink, Loader2, ArrowUpCircle } from 'lucide-react';
import { subscribeToDirectMessages, sendDirectMessage, markNotificationRead, fetchOlderMessages } from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationsViewProps {
  notifications: Notification[];
  tasks: Task[]; // Need tasks to generate chat list
  currentUser: User | null;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onChatOpen?: (isOpen: boolean) => void; // Call this to hide nav bar in App.tsx
  onTaskClick?: (task: Task) => void; // New prop to open task details from chat
  initialChatTask?: Task | null; // NEW: Task to open chat for immediately
  onClearInitialChat?: () => void; // NEW: Cleanup function
  isChatActiveExternal?: boolean; // NEW: Control chat state from parent
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ 
  notifications, 
  tasks,
  currentUser,
  onNotificationClick,
  onMarkAllRead,
  onChatOpen,
  onTaskClick,
  initialChatTask,
  onClearInitialChat,
  isChatActiveExternal
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'MESSAGES'>('NOTIFICATIONS');
  const [activeChatTask, setActiveChatTask] = useState<Task | null>(null);

  // ... filtering logic ...
  // 1. General notifications (exclude messages to keep the list clean)
  const generalNotifications = notifications.filter(n => n.type !== 'NEW_MESSAGE');
  const unreadGeneralCount = generalNotifications.filter(n => !n.isRead).length;

  // 2. Message notifications (only used for counting/badging in the Messages tab)
  const messageNotifications = notifications.filter(n => n.type === 'NEW_MESSAGE');
  const unreadMessageCount = messageNotifications.filter(n => !n.isRead).length;

  // Handle Initial Chat Auto-Open
  useEffect(() => {
    if (initialChatTask && currentUser) {
        setActiveTab('MESSAGES');
        setActiveChatTask(initialChatTask);
        if (onClearInitialChat) onClearInitialChat();
    }
  }, [initialChatTask, currentUser]);

  // Sync with external control (Back button support)
  useEffect(() => {
      if (isChatActiveExternal === false && activeChatTask) {
          setActiveChatTask(null);
      }
  }, [isChatActiveExternal]);

  // Notify parent about chat state change
  useEffect(() => {
    if (onChatOpen) {
        onChatOpen(!!activeChatTask);
    }
  }, [activeChatTask, onChatOpen]);

  const handleOpenChat = (task: Task) => {
      setActiveChatTask(task);
      
      // Mark all notifications related to this task's messages as read
      const relatedNotifs = messageNotifications.filter(n => n.taskId === task.id && !n.isRead);
      relatedNotifs.forEach(n => {
          markNotificationRead(n.id);
      });
  };

  // If we open a chat, this becomes true
  if (activeChatTask && currentUser) {
      return (
          <ChatWindow 
              task={activeChatTask} 
              currentUser={currentUser} 
              onBack={() => setActiveChatTask(null)} 
              onTaskClick={onTaskClick}
          />
      );
  }

  return (
    // Replaced absolute inset-0 with fixed for mobile to allow natural document scroll if needed
    // md:absolute keeps desktop layout constrained to the app container
    <div className="fixed inset-0 z-30 bg-slate-50 flex flex-col md:absolute md:inset-0">
      
      {/* Scroll Container */}
      {/* Mobile: overflow-y-auto allows whole page scroll. Desktop: overflow-hidden to keep it app-like */}
      <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col pt-safe-top">
        
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-4 pt-24 pb-32 md:pt-12 md:pb-4 md:h-full">
            
            {/* Header with Tabs */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-3xl font-bold text-slate-900">{t('center_title')}</h2>
              {activeTab === 'NOTIFICATIONS' && unreadGeneralCount > 0 && (
                 <button 
                    onClick={onMarkAllRead}
                    className="text-xs text-blue-600 font-bold hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full"
                 >
                   {t('center_clear')}
                 </button>
              )}
            </div>

            {/* Tab Switcher */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex mb-6 shrink-0">
                <button 
                    onClick={() => setActiveTab('NOTIFICATIONS')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
                        activeTab === 'NOTIFICATIONS' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Bell size={16} /> {t('center_tab_notifs')}
                    {unreadGeneralCount > 0 && (
                        <span className="bg-red-500 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">{unreadGeneralCount}</span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
                        activeTab === 'MESSAGES' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <MessageCircle size={16} /> {t('center_tab_msgs')}
                    {unreadMessageCount > 0 && (
                        <span className="bg-red-500 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center animate-pulse">{unreadMessageCount}</span>
                    )}
                </button>
            </div>

            {/* Content Area */}
            {/* Mobile: Flows naturally. Desktop: Internal scroll */}
            <div className="flex-1 md:overflow-y-auto md:scrollbar-hide md:-mx-4 md:px-4">
                
                {activeTab === 'NOTIFICATIONS' && (
                    <NotificationList 
                        notifications={generalNotifications} 
                        onClick={onNotificationClick} 
                    />
                )}

                {activeTab === 'MESSAGES' && (
                    <ChatList 
                        tasks={tasks} 
                        currentUser={currentUser} 
                        notifications={messageNotifications} // Pass message notifs to highlight specific chats
                        onSelectTask={handleOpenChat} 
                    />
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

// ... existing SUB-COMPONENTS (NotificationList) ...

const NotificationList = ({ notifications, onClick }: { notifications: Notification[], onClick: (n: Notification) => void }) => {
    const { t } = useLanguage();
    if (notifications.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Bell size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">{t('center_empty_notifs')}</p>
          </div>
        );
    }

    const getIcon = (type: Notification['type']) => {
        switch (type) {
          case 'OFFER_RECEIVED': return <Briefcase size={20} className="text-blue-500" />;
          case 'OFFER_ACCEPTED': return <CheckCircle size={20} className="text-green-500" />;
          case 'TASK_COMPLETED': return <CheckCircle size={20} className="text-purple-500" />;
          case 'PAYMENT_RELEASED': return <DollarSign size={20} className="text-yellow-500" />;
          case 'NEW_MESSAGE': return <MessageCircle size={20} className="text-indigo-500" />; // Should ideally be filtered out
          default: return <Info size={20} className="text-gray-500" />;
        }
    };

    const getBgColor = (type: Notification['type']) => {
        switch (type) {
          case 'OFFER_RECEIVED': return 'bg-blue-100';
          case 'OFFER_ACCEPTED': return 'bg-green-100';
          case 'TASK_COMPLETED': return 'bg-purple-100';
          case 'PAYMENT_RELEASED': return 'bg-yellow-100';
          case 'NEW_MESSAGE': return 'bg-indigo-100';
          default: return 'bg-gray-100';
        }
    };

    return (
        <div className="space-y-3">
          {notifications.map(notification => (
            <div 
              key={notification.id}
              onClick={() => onClick(notification)}
              className={`relative p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                notification.isRead 
                  ? 'bg-white border-gray-100' 
                  : 'bg-blue-50/50 border-blue-100 shadow-sm'
              }`}
            >
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${getBgColor(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-bold truncate pr-2 text-sm ${notification.isRead ? 'text-slate-800' : 'text-blue-900'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock size={10} />
                      {getTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  <p className={`text-xs line-clamp-2 ${notification.isRead ? 'text-gray-600' : 'text-slate-700 font-medium'}`}>
                    {notification.message}
                  </p>
                </div>
              </div>
              
              {!notification.isRead && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          ))}
        </div>
    );
};

const ChatList = ({ tasks, currentUser, notifications, onSelectTask }: { tasks: Task[], currentUser: User | null, notifications: Notification[], onSelectTask: (t: Task) => void }) => {
    const { t } = useLanguage();
    if (!currentUser) return null;

    // ... filtering and sorting logic ...
    // Filter active conversations (Airbnb Style)
    // Only show chats for tasks that are IN_PROGRESS, IN_REVIEW, DISPUTED, or CLOSED
    // And where user is either requester or accepted provider
    const chatTasks = tasks.filter(t => {
        const isParticipant = (t.requesterId === currentUser.id) || (t.offers.find(o => o.id === t.acceptedOfferId)?.providerId === currentUser.id);
        const isActiveState = [TaskStatus.AWAITING_PAYMENT, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DISPUTED, TaskStatus.CLOSED].includes(t.status);
        return isParticipant && isActiveState;
    });

    const sortedChatTasks = chatTasks.sort((a, b) => {
        const getStatusWeight = (status: TaskStatus) => {
            switch (status) {
                case TaskStatus.DISPUTED: return 5;
                case TaskStatus.IN_REVIEW: return 4;
                case TaskStatus.AWAITING_PAYMENT: return 3;
                case TaskStatus.IN_PROGRESS: return 2;
                case TaskStatus.CLOSED: return 0;
                default: return 1;
            }
        };

        const weightA = getStatusWeight(a.status);
        const weightB = getStatusWeight(b.status);

        if (weightA !== weightB) return weightB - weightA;

        const offerA = a.offers?.find(o => o.id === a.acceptedOfferId);
        const offerB = b.offers?.find(o => o.id === b.acceptedOfferId);
        const timeA = offerA ? offerA.createdAt : a.createdAt;
        const timeB = offerB ? offerB.createdAt : b.createdAt;
        return timeB - timeA;
    });

    if (sortedChatTasks.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <MessageCircle size={32} className="text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">{t('center_empty_msgs')}</h3>
            <p className="text-xs text-slate-400 max-w-xs">
                {t('center_empty_msgs_sub')}
            </p>
          </div>
        );
    }

    const getStatusBadge = (status: TaskStatus) => {
        const label = t(`status_${status}` as any) || status;
        switch (status) {
            case TaskStatus.IN_PROGRESS: 
                return { label: label, style: 'bg-green-100 text-green-600 border-green-200 shadow-green-100 shadow-sm' };
            case TaskStatus.AWAITING_PAYMENT: 
                return { label: label, style: 'bg-amber-100 text-amber-700 border-amber-200' };
            case TaskStatus.IN_REVIEW: 
                return { label: label, style: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
            case TaskStatus.DISPUTED: 
                return { label: label, style: 'bg-red-100 text-red-700 border-red-200' };
            case TaskStatus.CLOSED: 
                return { label: label, style: 'bg-slate-100 text-slate-400 border-slate-200 grayscale' };
            default: 
                return { label: label, style: 'bg-green-100 text-green-600 border-green-200' };
        }
    };

    return (
        <div className="space-y-3">
            {sortedChatTasks.map(task => {
                const isRequester = task.requesterId === currentUser.id;
                const acceptedOffer = task.offers.find(o => o.id === task.acceptedOfferId);
                const partnerName = isRequester ? acceptedOffer?.providerName : task.requesterName;
                const partnerAvatar = isRequester ? acceptedOffer?.providerAvatar : task.requesterAvatar;

                // Check for unread messages specific to this task
                const hasUnread = notifications.some(n => n.taskId === task.id && !n.isRead);

                // Fallback avatar
                const safeAvatar = (!partnerAvatar || partnerAvatar.includes('dicebear')) 
                    ? "https://ui-avatars.com/api/?name=N&background=2563eb&color=fff&size=128&bold=true&length=1"
                    : partnerAvatar;

                const statusBadge = getStatusBadge(task.status);

                return (
                    <div 
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all ${
                            hasUnread 
                                ? 'bg-indigo-50 border-indigo-200 shadow-md' 
                                : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'
                        } ${task.status === TaskStatus.CLOSED ? 'opacity-75 hover:opacity-100' : ''}`}
                    >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-100 shrink-0">
                             <img src={safeAvatar} className={`w-full h-full object-cover ${task.status === TaskStatus.CLOSED ? 'grayscale' : ''}`} alt="" />
                             {hasUnread && (
                                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                             )}
                        </div>
                        <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-center mb-1">
                                 <h4 className={`text-sm truncate ${hasUnread ? 'font-black text-indigo-900' : 'font-bold text-slate-800'}`}>{partnerName}</h4>
                                 <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wide ${statusBadge.style}`}>
                                     {statusBadge.label}
                                 </span>
                             </div>
                             <p className={`text-xs truncate ${hasUnread ? 'text-indigo-700 font-bold' : 'text-slate-500'}`}>
                                {hasUnread ? t('chat_new_msg') : task.title}
                             </p>
                        </div>
                        <div className={`text-slate-300 ${hasUnread ? 'text-indigo-400' : ''}`}>
                             <ChevronLeft size={20} className="rotate-180" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- CHAT WINDOW (Inside Notifications View) ---

const ChatWindow = ({ task, currentUser, onBack, onTaskClick }: { task: Task, currentUser: User, onBack: () => void, onTaskClick?: (t: Task) => void }) => {
    const { t } = useLanguage();
    // ... existing chat logic ...
    const [liveMessages, setLiveMessages] = useState<DirectMessage[]>([]);
    const [historyMessages, setHistoryMessages] = useState<DirectMessage[]>([]);
    
    const [text, setText] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // 1. Subscribe to Live Messages (Tail)
    useEffect(() => {
        const unsubscribe = subscribeToDirectMessages(task.id, (msgs) => {
            setLiveMessages(msgs);
            // Auto scroll to bottom
            if (scrollRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                if (isNearBottom || msgs.length < 5) {
                   setTimeout(() => {
                       if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                   }, 50);
                }
            }
        });
        return () => unsubscribe();
    }, [task.id]);

    // 2. Function to Load Older Messages (Pagination)
    const loadOlder = async () => {
        if (isLoadingHistory || !hasMoreHistory) return;
        
        // Find the oldest message we currently have (either from history or live)
        const combined = [...historyMessages, ...liveMessages];
        if (combined.length === 0) return;
        
        const oldestMsg = combined[0];
        
        setIsLoadingHistory(true);
        const scrollContainer = scrollRef.current;
        const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;

        try {
            const olderBatch = await fetchOlderMessages(task.id, oldestMsg.createdAt);
            
            if (olderBatch.length < 15) {
                setHasMoreHistory(false); // No more to load
            }
            
            if (olderBatch.length > 0) {
                setHistoryMessages(prev => [...olderBatch, ...prev]);
                
                // Restore scroll position
                setTimeout(() => {
                    if (scrollContainer) {
                        const newScrollHeight = scrollContainer.scrollHeight;
                        scrollContainer.scrollTop = newScrollHeight - oldScrollHeight;
                    }
                }, 10);
            }
        } catch (e) {
            console.error("Failed to load history", e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const allMessages = React.useMemo(() => {
        const map = new Map<string, DirectMessage>();
        [...historyMessages, ...liveMessages].forEach(m => map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
    }, [historyMessages, liveMessages]);

    const acceptedOffer = task.offers.find(o => o.id === task.acceptedOfferId);
    const isRequester = task.requesterId === currentUser.id;
    const partnerName = isRequester ? acceptedOffer?.providerName : task.requesterName;
    const partnerAvatar = isRequester ? acceptedOffer?.providerAvatar : task.requesterAvatar;
    const partnerId = isRequester ? acceptedOffer?.providerId : task.requesterId;
    
    // Fallback avatar
    const safeAvatar = (!partnerAvatar || partnerAvatar.includes('dicebear')) 
        ? "https://ui-avatars.com/api/?name=N&background=2563eb&color=fff&size=128&bold=true&length=1"
        : partnerAvatar;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        await sendDirectMessage(task.id, {
            senderId: currentUser.id,
            senderName: currentUser.name,
            text: text,
            createdAt: Date.now(),
            isAdmin: false
        }, partnerId); 
        
        setText('');
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh] pt-safe-top">
            
            {/* Chat Header */}
            <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-md sticky top-0 z-40">
                <button 
                    onClick={onBack} 
                    className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-all active:scale-95 cursor-pointer relative z-50 pointer-events-auto"
                >
                    <ChevronLeft size={28} />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                     <img src={safeAvatar} className="w-full h-full object-cover" alt="" />
                </div>
                
                {/* Clickable Header Info */}
                <div 
                    className="flex-1 min-w-0 cursor-pointer group"
                    onClick={() => onTaskClick && onTaskClick(task)}
                >
                    <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">{partnerName}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium group-hover:text-blue-500 transition-colors">
                        <span className="truncate max-w-[180px]">{task.title}</span>
                        <ExternalLink size={10} />
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                
                {/* Load More Button */}
                {hasMoreHistory && allMessages.length >= 15 && (
                    <div className="flex justify-center py-2">
                        <button 
                            onClick={loadOlder}
                            disabled={isLoadingHistory}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 transition-colors"
                        >
                            {isLoadingHistory ? <Loader2 size={12} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                            {t('chat_load_older')}
                        </button>
                    </div>
                )}

                {allMessages.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('chat_start')}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{t('chat_secure')}</p>
                    </div>
                )}
                
                {allMessages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed relative ${
                                isMe 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                            }`}>
                                {msg.text}
                                <span className={`text-[9px] block text-right mt-1 opacity-60 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-100 bg-white pb-safe-bottom">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t('chat_input_ph')}
                        className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none font-medium placeholder:text-slate-400"
                    />
                    <button 
                        type="submit" 
                        disabled={!text.trim()}
                        className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${
                            text.trim() ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        <Send size={18} className={text.trim() ? 'ml-0.5' : ''} />
                    </button>
                </form>
            </div>
        </div>
    );
};

// Utility
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
