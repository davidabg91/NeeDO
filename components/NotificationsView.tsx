
import React from 'react';
import { Notification } from '../types';
import { Bell, CheckCircle, DollarSign, Briefcase, Info, Clock } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ 
  notifications, 
  onNotificationClick,
  onMarkAllRead
}) => {

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'OFFER_RECEIVED': return <Briefcase size={20} className="text-blue-500" />;
      case 'OFFER_ACCEPTED': return <CheckCircle size={20} className="text-green-500" />;
      case 'TASK_COMPLETED': return <CheckCircle size={20} className="text-purple-500" />;
      case 'PAYMENT_RELEASED': return <DollarSign size={20} className="text-yellow-500" />;
      default: return <Info size={20} className="text-gray-500" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'OFFER_RECEIVED': return 'bg-blue-100';
      case 'OFFER_ACCEPTED': return 'bg-green-100';
      case 'TASK_COMPLETED': return 'bg-purple-100';
      case 'PAYMENT_RELEASED': return 'bg-yellow-100';
      default: return 'bg-gray-100';
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="absolute inset-0 bg-slate-50 pt-24 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Bell size={40} className="text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Нямате известия</h3>
        <p className="text-slate-500 max-w-xs">Тук ще виждате информация за нови оферти, статус на задачи и плащания.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-slate-50 pt-24 pb-32 px-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-slate-900">Известия</h2>
          <button 
            onClick={onMarkAllRead}
            className="text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            Маркирай всички като прочетени
          </button>
        </div>

        <div className="space-y-3">
          {notifications.map(notification => (
            <div 
              key={notification.id}
              onClick={() => onNotificationClick(notification)}
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
                    <h4 className={`font-bold truncate pr-2 ${notification.isRead ? 'text-slate-800' : 'text-blue-900'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock size={10} />
                      {getTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  <p className={`text-sm line-clamp-2 ${notification.isRead ? 'text-gray-600' : 'text-slate-700 font-medium'}`}>
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
      </div>
    </div>
  );
};

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'току-що';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч.`;
  const days = Math.floor(hours / 24);
  return `${days} дни`;
}
