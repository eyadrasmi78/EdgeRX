import React, { useEffect } from 'react';
import { Notification } from '../types';
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface NotificationToastProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notif) => (
        <ToastItem key={notif.id} notification={notif} onDismiss={() => removeNotification(notif.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: Notification; onDismiss: () => void }> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const bgClass = 
    notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
    notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
    'bg-blue-50 border-blue-200 text-blue-800';

  const Icon = 
    notification.type === 'success' ? CheckCircle :
    notification.type === 'warning' ? AlertCircle : Info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border w-80 transition-all transform animate-in slide-in-from-right ${bgClass}`}>
      <Icon size={20} />
      <p className="flex-1 text-sm font-medium">{notification.message}</p>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
};
