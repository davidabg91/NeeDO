
import React, { useState } from 'react';
import { User, Task, TaskStatus } from '../types';
import { Users, Briefcase, DollarSign, TrendingUp, Search, ShieldAlert, LogOut, Map, Trash2, Ban, CheckCircle, AlertTriangle } from 'lucide-react';

interface AdminDashboardProps {
  users: User[];
  tasks: Task[];
  onLogout: () => void;
  onSwitchToApp: () => void;
  onBanUser: (userId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

type AdminTab = 'DASHBOARD' | 'USERS' | 'TASKS' | 'DISPUTES' | 'FINANCES';

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
  
  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const activeTasksCount = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.OPEN).length;
  const disputedTasksCount = tasks.filter(t => t.status === TaskStatus.DISPUTED).length;

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm));
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderContent = () => {
    switch (activeTab) {
      case 'USERS':
        return (
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800">Управление на Потребители</h3>
                  <div className="relative group">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                     <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Търсене..." className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none" />
                  </div>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                     <thead className="bg-gray-50/50 text-xs uppercase font-bold text-gray-400">
                        <tr>
                           <th className="px-6 py-4">Потребител</th>
                           <th className="px-6 py-4">Статус</th>
                           <th className="px-6 py-4 text-right">Действия</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map(user => (
                           <tr key={user.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 flex items-center gap-3">
                                 <img src={user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                                 {user.name}
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${user.status === 'BANNED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{user.status || 'ACTIVE'}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button onClick={() => onBanUser(user.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Ban size={16} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
           </div>
        );

      case 'DISPUTES':
          const disputedTasks = tasks.filter(t => t.status === TaskStatus.DISPUTED);
          return (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
                  <div className="p-6 border-b border-gray-100">
                      <h3 className="font-bold text-lg text-slate-800">Активни Диспути ({disputedTasks.length})</h3>
                  </div>
                  {disputedTasks.length === 0 ? (
                      <div className="p-10 text-center text-gray-400">Няма активни диспути.</div>
                  ) : (
                      <div className="divide-y divide-gray-100">
                          {disputedTasks.map(task => (
                              <div key={task.id} className="p-4 hover:bg-red-50/10 transition-colors">
                                  <div className="flex justify-between items-start mb-2">
                                      <h4 className="font-bold text-slate-800">{task.title}</h4>
                                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-bold">ОСПОРВАНА</span>
                                  </div>
                                  <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-3">
                                      <p className="text-xs font-bold text-red-800 mb-1">{task.dispute?.reason}</p>
                                      <p className="text-xs text-red-600">"{task.dispute?.description}"</p>
                                  </div>
                                  {task.dispute?.evidenceImageUrl && (
                                      <img src={task.dispute.evidenceImageUrl} className="h-32 rounded-lg border border-gray-200 mb-3" alt="Evidence" />
                                  )}
                                  <div className="flex gap-2 justify-end">
                                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold shadow-sm">Освободи на Изпълнителя</button>
                                      <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm">Върни на Възложителя</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          );

      case 'TASKS':
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800">Всички Задачи</h3>
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Търсене..." className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none" />
               </div>
               <div className="divide-y divide-gray-100">
                  {filteredTasks.map(task => (
                     <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                               <img src={task.imageUrl} className="w-full h-full object-cover" alt="" />
                           </div>
                           <div>
                              <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
                              <span className="text-xs text-gray-500">{task.status}</span>
                           </div>
                        </div>
                        <button onClick={() => onDeleteTask(task.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                     </div>
                  ))}
               </div>
            </div>
        );

      case 'DASHBOARD':
      default:
        return (
           <div className="space-y-6 animate-in fade-in">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Потребители" value={totalUsers} icon={<Users size={24} className="text-blue-600" />} color="bg-blue-50" />
                  <StatCard title="Задачи" value={totalTasks} icon={<Briefcase size={24} className="text-purple-600" />} color="bg-purple-50" />
                  <StatCard title="Диспути" value={disputedTasksCount} icon={<AlertTriangle size={24} className="text-red-600" />} color="bg-red-50" />
               </div>
           </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
         <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="text-blue-500" /> Admin</h2>
         </div>
         <nav className="flex-1 p-4 space-y-2">
            <button onClick={onSwitchToApp} className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 rounded-xl font-bold mb-6"><Map size={18} /> Към App</button>
            <NavButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<TrendingUp size={18} />} label="Табло" />
            <NavButton active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<Users size={18} />} label="Потребители" />
            <NavButton active={activeTab === 'TASKS'} onClick={() => setActiveTab('TASKS')} icon={<Briefcase size={18} />} label="Задачи" />
            <NavButton active={activeTab === 'DISPUTES'} onClick={() => setActiveTab('DISPUTES')} icon={<AlertTriangle size={18} />} label="Диспути" />
         </nav>
         <div className="p-4 border-t border-slate-800">
             <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-xl"><LogOut size={18} /> Изход</button>
         </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
         <h1 className="text-2xl font-bold text-slate-800 mb-6">{activeTab}</h1>
         {renderContent()}
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
   <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      {icon} {label}
   </button>
);

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
   <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
         <p className="text-xs text-gray-400 font-bold uppercase">{title}</p>
         <p className="text-2xl font-black text-slate-800">{value}</p>
      </div>
   </div>
);
