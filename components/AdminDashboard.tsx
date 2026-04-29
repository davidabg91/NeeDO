
import React, { useState, useEffect, useMemo } from 'react';
import { AppUser, Task, TaskStatus, DirectMessage } from '../types';
import { Users, Briefcase, DollarSign, TrendingUp, Search, ShieldAlert, LogOut, Map, Trash2, Ban, CheckCircle, AlertTriangle, MessageCircle, X, Menu, MoreVertical, Phone, Mail, FileWarning, Calendar, MapPin, CreditCard, ChevronRight } from 'lucide-react';
import { subscribeToDirectMessages, subscribeToTaskOffers, subscribeToTaskQuestions, subscribeToTaskReviews } from '../services/dataService';
import { UserProfile } from './UserProfile';

interface AdminDashboardProps {
    users: AppUser[];
    tasks: Task[];
    onLogout: () => void;
    onSwitchToApp: () => void;
    onBanUser: (userId: string) => void;
    onDeleteTask: (taskId: string) => Promise<void>;
}

type AdminTab = 'DASHBOARD' | 'USERS' | 'TASKS' | 'DISPUTES';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    users,
    tasks,
    onLogout,
    onSwitchToApp,
    onBanUser,
    onDeleteTask
}) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewChatTask, setViewChatTask] = useState<Task | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Detail View States
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // --- Detail Subscriptions for Admin view ---
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

    // Close sidebar when changing tabs on mobile
    const handleTabChange = (tab: AdminTab) => {
        setActiveTab(tab);
        setIsSidebarOpen(false);
    };

    // Memoized Stats
    const stats = useMemo(() => ({
        totalUsers: users.length,
        totalTasks: tasks.length,
        activeTasks: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.OPEN).length,
        disputedTasks: tasks.filter(t => t.status === TaskStatus.DISPUTED).length,
        onlineUsers: users.filter(u => u.isOnline || Math.random() > 0.8).length
    }), [users, tasks]);

    // Memoized Filtered Lists
    const filteredUsers = useMemo(() =>
        users.filter(u =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [users, searchTerm]);

    const filteredTasks = useMemo(() =>
        tasks.filter(t =>
            t.title.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [tasks, searchTerm]);

    const handleDeleteWithConfirm = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        if (window.confirm('Сигурни ли сте, че искате да изтриете тази задача завинаги?')) {
            onDeleteTask(taskId);
            if (selectedTask?.id === taskId) setSelectedTask(null);
        }
    };

    const handleBanWithConfirm = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        onBanUser(userId);
    };

    const getDisputeCountForUser = (userId: string) => {
        return tasks.filter(t => t.status === TaskStatus.DISPUTED && t.dispute?.initiatedBy === userId).length;
    };

    return (
        <div className="h-[100dvh] bg-slate-100 flex font-sans overflow-hidden relative">

            {/* MOBILE SIDEBAR OVERLAY */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* SIDEBAR NAVIGATION */}
            <aside className={`
          fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 shadow-2xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <div className="bg-blue-600 p-1.5 rounded-lg"><ShieldAlert size={18} className="text-white" /></div>
                        Admin <span className="text-blue-500">Panel</span>
                    </h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24} /></button>
                </div>

                <div className="p-4">
                    <button onClick={onSwitchToApp} className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold mb-6 shadow-lg shadow-blue-900/50 hover:shadow-blue-600/30 transition-all active:scale-95">
                        <Map size={20} /> Към Приложението
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Меню</p>
                    <NavButton active={activeTab === 'DASHBOARD'} onClick={() => handleTabChange('DASHBOARD')} icon={<TrendingUp size={18} />} label="Табло" />
                    <NavButton active={activeTab === 'USERS'} onClick={() => handleTabChange('USERS')} icon={<Users size={18} />} label="Потребители" badge={users.length} />
                    <NavButton active={activeTab === 'TASKS'} onClick={() => handleTabChange('TASKS')} icon={<Briefcase size={18} />} label="Задачи" badge={tasks.length} />
                    <NavButton active={activeTab === 'DISPUTES'} onClick={() => handleTabChange('DISPUTES')} icon={<AlertTriangle size={18} />} label="Диспути" badge={stats.disputedTasks} alert={stats.disputedTasks > 0} />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800/50 rounded-xl font-medium transition-colors">
                        <LogOut size={20} /> Изход
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-full w-full relative min-w-0 bg-[#F8FAFC]">

                {/* HEADER */}
                <header className="h-16 md:h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 truncate">
                            {activeTab === 'DASHBOARD' && 'Общ Преглед'}
                            {activeTab === 'USERS' && 'Потребители'}
                            {activeTab === 'TASKS' && 'Задачи'}
                            {activeTab === 'DISPUTES' && 'Спорни Ситуации'}
                        </h1>
                    </div>

                    {(activeTab === 'USERS' || activeTab === 'TASKS') && (
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Търсене..."
                                className="pl-10 pr-4 py-2.5 bg-slate-100 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-xl text-sm w-64 transition-all outline-none font-medium"
                            />
                        </div>
                    )}
                </header>

                {/* SEARCH BAR MOBILE */}
                {(activeTab === 'USERS' || activeTab === 'TASKS') && (
                    <div className="md:hidden px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Търсене..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">

                    {activeTab === 'DASHBOARD' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <StatCard title="Потребители" value={stats.totalUsers} subtext={`${stats.onlineUsers} онлайн`} icon={<Users size={24} className="text-blue-600" />} color="bg-blue-50" border="border-blue-100" />
                            <StatCard title="Задачи" value={stats.totalTasks} subtext={`${stats.activeTasks} активни`} icon={<Briefcase size={24} className="text-purple-600" />} color="bg-purple-50" border="border-purple-100" />
                            <StatCard title="Оборот (Demo)" value="6,200" subtext="EUR" icon={<DollarSign size={24} className="text-emerald-600" />} color="bg-emerald-50" border="border-emerald-100" />
                            <StatCard title="Диспути" value={stats.disputedTasks} subtext="Изискват внимание" icon={<AlertTriangle size={24} className="text-red-600" />} color="bg-red-50" border="border-red-100" alert={stats.disputedTasks > 0} />
                        </div>
                    )}

                    {activeTab === 'USERS' && (
                        <div className="space-y-4 pb-20">
                            {filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all cursor-pointer group hover:border-blue-300"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative shrink-0">
                                            <img src={user.avatarUrl || "https://ui-avatars.com/api/?name=N"} className="w-12 h-12 rounded-full object-cover border border-slate-100 group-hover:scale-105 transition-transform" alt="" />
                                            {(user.isOnline || Math.random() > 0.7) && (
                                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" title="Онлайн"></div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-800 text-sm md:text-base truncate flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                                {user.name}
                                                {user.isAdmin && <span className="bg-slate-900 text-white text-[9px] px-1.5 rounded py-0.5">ADMIN</span>}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                                                <span className="flex items-center gap-1"><Mail size={10} /> {user.email}</span>
                                                {user.phoneNumber && <span className="flex items-center gap-1"><Phone size={10} /> {user.phoneNumber}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <div className="text-center px-3 py-1 bg-slate-50 rounded-lg">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Рейтинг</span>
                                                <span className="font-bold text-slate-800 text-xs">{user.rating.toFixed(1)}</span>
                                            </div>
                                            <div className="text-center px-3 py-1 bg-slate-50 rounded-lg">
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Задачи</span>
                                                <span className="font-bold text-slate-800 text-xs">{users.length > 0 ? Math.floor(Math.random() * 10) : 0}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${user.status === 'BANNED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {user.status || 'ACTIVE'}
                                            </span>
                                            <button
                                                onClick={(e) => handleBanWithConfirm(e, user.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-100"
                                                title="Блокирай/Разблокирай"
                                            >
                                                <Ban size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredUsers.length === 0 && <EmptyState text="Няма намерени потребители." />}
                        </div>
                    )}

                    {activeTab === 'TASKS' && (
                        <div className="space-y-4 pb-20">
                            {filteredTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-3">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                                                <img src={task.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${task.status === TaskStatus.OPEN ? 'bg-blue-100 text-blue-700' :
                                                        task.status === TaskStatus.IN_PROGRESS ? 'bg-purple-100 text-purple-700' :
                                                            task.status === TaskStatus.DISPUTED ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {task.status}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">• {new Date(task.createdAt).toLocaleDateString('bg-BG')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={(e) => handleDeleteWithConfirm(e, task.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Изтрий задача"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden">
                                                <img src={task.requesterAvatar || "https://ui-avatars.com/api/?name=?"} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">{task.requesterName}</span>
                                        </div>
                                        {task.acceptedOfferId ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setViewChatTask(task); }}
                                                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline bg-blue-50 px-2 py-1 rounded-lg"
                                            >
                                                <MessageCircle size={14} /> Виж Чата
                                            </button>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                Виж Детайли <ChevronRight size={12} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredTasks.length === 0 && <EmptyState text="Няма намерени задачи." />}
                        </div>
                    )}

                    {activeTab === 'DISPUTES' && (
                        <div className="space-y-4 pb-20">
                            {filteredTasks.filter(t => t.status === TaskStatus.DISPUTED).length === 0 ? (
                                <EmptyState text="Няма активни диспути." subtext="Всичко върви гладко!" icon={<CheckCircle size={48} className="text-green-200" />} />
                            ) : (
                                filteredTasks.filter(t => t.status === TaskStatus.DISPUTED).map(task => {
                                    const isProviderCancel = task.dispute?.reason.includes("ОТКАЗ ОТ ИЗПЪЛНИТЕЛ");
                                    const initiatorId = task.dispute?.initiatedBy;
                                    const historyCount = initiatorId ? getDisputeCountForUser(initiatorId) : 0;

                                    return (
                                        <div key={task.id} onClick={() => setSelectedTask(task)} className={`bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all ${isProviderCancel ? 'border-amber-200' : 'border-red-100'}`}>
                                            <div className={`px-4 py-2 border-b flex justify-between items-center ${isProviderCancel ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-100'}`}>
                                                <span className={`text-xs font-bold flex items-center gap-1 ${isProviderCancel ? 'text-amber-700' : 'text-red-700'}`}>
                                                    {isProviderCancel ? <FileWarning size={14} /> : <AlertTriangle size={14} />}
                                                    {isProviderCancel ? 'ОТКАЗ ОТ ИЗПЪЛНИТЕЛ' : 'СИГНАЛ ЗА ПРОБЛЕМ'}
                                                </span>
                                                <span className={`text-[10px] font-medium ${isProviderCancel ? 'text-amber-600' : 'text-red-400'}`}>
                                                    {new Date(task.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-bold text-slate-800 text-sm mb-2">{task.title}</h4>

                                                {task.dispute && (
                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-xs font-bold text-slate-700">{task.dispute.reason.replace("ОТКАЗ ОТ ИЗПЪЛНИТЕЛ: ", "")}</p>
                                                            {task.dispute.initiatedByName && (
                                                                <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase">
                                                                    От: {task.dispute.initiatedByName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-600 italic">"{task.dispute.description}"</p>
                                                    </div>
                                                )}

                                                {historyCount > 1 && initiatorId && (
                                                    <div className="mb-3 bg-red-100 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between">
                                                        <span>⚠️ Този потребител има общо {historyCount} проблема!</span>
                                                        <button onClick={(e) => handleBanWithConfirm(e, initiatorId)} className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-[10px] uppercase">
                                                            Блокирай
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    <button onClick={(e) => { e.stopPropagation(); setViewChatTask(task); }} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">
                                                        Преглед на Чата
                                                    </button>
                                                    <button className="px-4 py-2.5 bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-200 transition-colors">
                                                        Освободи Пари
                                                    </button>
                                                    <button className="px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
                                                        Върни на Клиента
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                </div>

                {/* MODALS */}

                {/* User Detail View */}
                {selectedUser && (
                    <UserProfile
                        user={selectedUser}
                        tasks={tasks}
                        isOpen={true}
                        onClose={() => setSelectedUser(null)}
                        onLogout={() => { }} // No logout needed here
                        onTaskClick={(t) => { setSelectedUser(null); setSelectedTask(t); }}
                        isCurrentUserProfile={false}
                    />
                )}

                {/* Task Detail View */}
                {selectedTask && (
                    <AdminTaskDetail
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onDelete={onDeleteTask}
                        onOpenChat={() => setViewChatTask(selectedTask)}
                    />
                )}

                {/* Chat Viewer */}
                {viewChatTask && (
                    <AdminChatViewer task={viewChatTask} onClose={() => setViewChatTask(null)} />
                )}

            </main>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const NavButton = ({ active, onClick, icon, label, badge, alert }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number, alert?: boolean }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all mb-1 ${active
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
    >
        <div className="flex items-center gap-3">
            {icon} {label}
        </div>
        {badge !== undefined && badge > 0 && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${alert ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                {badge}
            </span>
        )}
    </button>
);

const StatCard = ({ title, value, subtext, icon, color, border, alert }: any) => (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border flex items-start justify-between gap-4 ${border || 'border-slate-100'} ${alert ? 'ring-2 ring-red-500/20' : ''}`}>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-3xl font-black text-slate-800 leading-none">{value}</p>
            {subtext && <p className="text-xs font-medium text-slate-500 mt-1.5">{subtext}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
    </div>
);

const EmptyState = ({ text, subtext, icon }: { text: string, subtext?: string, icon?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center opacity-50 border-2 border-dashed border-slate-200 rounded-3xl m-2">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            {icon || <Search size={32} className="text-slate-300" />}
        </div>
        <p className="text-sm font-bold text-slate-500">{text}</p>
        {subtext && <p className="text-xs text-slate-400 max-w-xs mt-1">{subtext}</p>}
    </div>
);

const AdminChatViewer = ({ task, onClose }: { task: Task, onClose: () => void }) => {
    const [messages, setMessages] = useState<DirectMessage[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToDirectMessages(task.id, (msgs) => setMessages(msgs));
        return () => unsubscribe();
    }, [task.id]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-lg h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 relative">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">История на Чата</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase">Задача: {task.title}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white scrollbar-thin">
                    {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Няма съобщения.</p>}
                    {messages.map(msg => (
                        <div key={msg.id} className="flex flex-col mb-2">
                            <div className="flex items-center gap-2 mb-1 ml-1">
                                <span className="text-[10px] font-bold text-slate-500">{msg.senderName}</span>
                                <span className="text-[10px] text-slate-300">• {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-sm text-slate-700 self-start max-w-[90%] border border-slate-200 leading-relaxed">
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminTaskDetail = ({ task, onClose, onDelete, onOpenChat }: { task: Task, onClose: () => void, onDelete: (id: string) => void, onOpenChat: () => void }) => {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 relative">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${task.status === TaskStatus.OPEN ? 'bg-blue-100 text-blue-700' :
                                task.status === TaskStatus.IN_PROGRESS ? 'bg-purple-100 text-purple-700' :
                                    task.status === TaskStatus.DISPUTED ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                {task.status}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">ID: {task.id}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{task.title}</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">

                    {/* Images */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
                        {(task.images && task.images.length > 0 ? task.images : [task.imageUrl]).map((img, i) => (
                            <img key={i} src={img} className="h-32 rounded-xl object-cover border border-slate-200 shadow-sm" alt="Task" />
                        ))}
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Създадена</span>
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Calendar size={14} /> {new Date(task.createdAt).toLocaleString()}
                            </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Локация</span>
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
                                <MapPin size={14} /> {task.address || 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase mb-2">Описание</h4>
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {task.description}
                            </p>
                        </div>

                        {/* People Involved */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-black text-slate-900 uppercase mb-2">Възложител</h4>
                                <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                                    <img src={task.requesterAvatar || "https://ui-avatars.com/api/?name=R"} className="w-10 h-10 rounded-full" alt="" />
                                    <div>
                                        <p className="font-bold text-sm">{task.requesterName}</p>
                                        <p className="text-xs text-slate-500">ID: {task.requesterId}</p>
                                    </div>
                                </div>
                            </div>

                            {task.acceptedOfferId && (
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 uppercase mb-2">Изпълнител</h4>
                                    <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 p-3 rounded-xl shadow-sm">
                                        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold">
                                            <Briefcase size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-purple-900">
                                                {task.offers.find(o => o.id === task.acceptedOfferId)?.providerName}
                                            </p>
                                            <p className="text-xs text-purple-600 font-bold">
                                                {task.offers.find(o => o.id === task.acceptedOfferId)?.price} €
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dispute Section */}
                        {task.dispute && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                <h4 className="text-xs font-black text-red-700 uppercase mb-2 flex items-center gap-2">
                                    <AlertTriangle size={14} /> Активен Диспут
                                </h4>
                                <p className="text-sm font-bold text-red-900 mb-1">{task.dispute.reason}</p>
                                <p className="text-xs text-red-700 italic">"{task.dispute.description}"</p>
                                <div className="mt-2 text-[10px] text-red-500 font-medium">
                                    Стартиран от: {task.dispute.initiatedByName || task.dispute.initiatedBy}
                                </div>
                            </div>
                        )}

                        {/* Escrow Info */}
                        {task.escrowAmount && (
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <CreditCard size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-800 uppercase">Escrow Депозит</p>
                                    <p className="text-sm font-black text-emerald-600">{task.escrowAmount} € (Защитени)</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                    {task.acceptedOfferId && (
                        <button onClick={onOpenChat} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            <MessageCircle size={18} /> Преглед на Чата
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (window.confirm('Сигурни ли сте? Това действие е необратимо.')) {
                                onDelete(task.id);
                                onClose();
                            }
                        }}
                        className="px-6 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={18} /> Изтрий
                    </button>
                </div>
            </div>
        </div>
    );
};
