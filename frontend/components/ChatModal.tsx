
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Order, User } from '../types';
import { DataService } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Send, Hash, User as UserIcon, MessageSquare } from 'lucide-react';

interface ChatModalProps {
  order: Order;
  currentUser: User;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ order, currentUser, onClose }) => {
  const { t, dir } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial load
    setMessages(DataService.getMessages(order.id));
    
    // Simple polling mock
    const interval = setInterval(() => {
        setMessages(DataService.getMessages(order.id));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [order.id]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: inputText,
        timestamp: new Date().toISOString()
    };

    DataService.sendMessage(order.id, newMessage);
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };

  const isCustomer = currentUser.id === order.customerId;
  const chatPartnerName = isCustomer ? order.supplierName : order.customerName;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[80vh] md:h-[600px] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <UserIcon size={20} />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {t('chat_with')} {chatPartnerName}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono font-bold">
                 <Hash size={10} /> {order.orderNumber}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Messages area */}
        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 opacity-60">
              <MessageSquare size={48} />
              <p className="text-sm font-medium">{t('chat_no_messages')}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'}`}>
                    {msg.text}
                  </div>
                  <div className="mt-1 flex items-center gap-1 px-1">
                      {!isMe && <span className="text-[9px] font-bold text-gray-400">{msg.senderName} • </span>}
                      <span className="text-[9px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder={t('chat_placeholder')}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              autoFocus
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
