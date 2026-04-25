
import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, User, ReturnReason } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatModal } from './ChatModal';
import { Clock, CheckCircle, Package, Truck, AlertTriangle, ArrowRight, MessageCircle, Gift, Calendar, ArrowDown, Ban, Info, AlertOctagon, Check, Hash, Search, Filter, ArrowUpDown, X, Building, RefreshCw, AlertCircle } from 'lucide-react';

interface CustomerRequestsProps {
  orders: Order[];
  currentUser: User;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>, note?: string) => void;
}

export const CustomerRequests: React.FC<CustomerRequestsProps> = ({ orders, currentUser, onUpdateOrder }) => {
  const { t, dir } = useLanguage();

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSupplier, setFilterSupplier] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  
  // Chat State
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Return State
  const [returnModal, setReturnModal] = useState<{ isOpen: boolean; orderId: string }>({ isOpen: false, orderId: '' });
  const [returnFormData, setReturnFormData] = useState<{ reason: ReturnReason; note: string }>({ reason: 'DAMAGED', note: '' });

  // Check Permissions
  const canChat = true;

  // Compute unique suppliers
  const uniqueSuppliers = useMemo(() => {
      const customerOrders = orders.filter(o => o.customerId === currentUser.id);
      return Array.from(new Set(customerOrders.map(o => o.supplierName))).sort();
  }, [orders, currentUser.id]);

  const processedOrders = useMemo(() => {
    let filtered = orders.filter(o => o.customerId === currentUser.id);
    if (filterStatus !== 'ALL') filtered = filtered.filter(o => o.status === filterStatus);
    if (filterSupplier !== 'ALL') filtered = filtered.filter(o => o.supplierName === filterSupplier);
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(o => 
            o.productName.toLowerCase().includes(term) || 
            o.supplierName.toLowerCase().includes(term) ||
            o.orderNumber.toLowerCase().includes(term)
        );
    }
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date_desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
            case 'date_asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
            case 'qty_desc': return b.quantity - a.quantity;
            case 'qty_asc': return a.quantity - b.quantity;
            default: return 0;
        }
    });
    return filtered;
  }, [orders, currentUser.id, filterStatus, filterSupplier, searchTerm, sortBy]);

  const handleConfirmChanges = (orderId: string) => {
      onUpdateOrder?.(orderId, { status: OrderStatus.IN_PROGRESS }, 'Customer confirmed proposed changes');
  };

  const handleDeclineOrder = (orderId: string) => {
      onUpdateOrder?.(orderId, { status: OrderStatus.DECLINED }, 'Customer declined changes');
  };

  const handleConfirmReceipt = (orderId: string) => {
      onUpdateOrder?.(orderId, { status: OrderStatus.CONFIRMED_BY_CUSTOMER }, 'Customer confirmed receiving the order');
  };

  const openReturnModal = (orderId: string) => {
      setReturnModal({ isOpen: true, orderId });
      setReturnFormData({ reason: 'DAMAGED', note: '' });
  };

  const submitReturnRequest = () => {
      if (!onUpdateOrder) return;
      onUpdateOrder(returnModal.orderId, { 
          status: OrderStatus.RETURN_REQUESTED,
          returnRequested: true,
          returnReason: returnFormData.reason,
          returnNote: returnFormData.note
      }, `Return requested: ${returnFormData.reason}. Note: ${returnFormData.note}`);
      setReturnModal({ isOpen: false, orderId: '' });
  };

  const clearFilters = () => {
      setSearchTerm('');
      setFilterStatus('ALL');
      setFilterSupplier('ALL');
      setSortBy('date_desc');
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.RECEIVED: return <Clock size={16} />;
      case OrderStatus.PENDING_CUSTOMER_APPROVAL: return <AlertOctagon size={16} />;
      case OrderStatus.IN_PROGRESS: return <Package size={16} />;
      case OrderStatus.SHIPMENT_OTW: return <Truck size={16} />;
      case OrderStatus.COMPLETED: return <Check size={16} />;
      case OrderStatus.CONFIRMED_BY_CUSTOMER: return <CheckCircle size={16} />;
      case OrderStatus.RETURN_REQUESTED: return <RefreshCw size={16} />;
      case OrderStatus.DECLINED: return <Ban size={16} />;
      case OrderStatus.OUT_OF_STOCK: return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.RECEIVED: return 'bg-blue-50 text-blue-800 border-blue-200';
      case OrderStatus.PENDING_CUSTOMER_APPROVAL: return 'bg-orange-50 text-orange-800 border-orange-200';
      case OrderStatus.IN_PROGRESS: return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case OrderStatus.SHIPMENT_OTW: return 'bg-purple-100 text-purple-800 border-purple-200';
      case OrderStatus.COMPLETED: return 'bg-teal-100 text-teal-800 border-teal-200';
      case OrderStatus.CONFIRMED_BY_CUSTOMER: return 'bg-green-100 text-green-800 border-green-200';
      case OrderStatus.RETURN_REQUESTED: return 'bg-pink-100 text-pink-800 border-pink-200';
      case OrderStatus.DECLINED: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const hasActiveFilters = searchTerm !== '' || filterStatus !== 'ALL' || filterSupplier !== 'ALL' || sortBy !== 'date_desc';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('requests_analysis')}</h1>
        <p className="text-gray-500 mt-1">Track delivery status and verify received medical products.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder={t('search_requests_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 transition-all text-sm"
              />
          </div>

          <div className="flex flex-wrap items-center gap-3">
              <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">
                  <option value="ALL">{t('all_suppliers')}</option>
                  {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">
                  <option value="ALL">{t('all')}</option>
                  {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">
                  <option value="date_desc">{t('sort_date_newest')}</option>
                  <option value="date_asc">{t('sort_date_oldest')}</option>
              </select>
              {hasActiveFilters && <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"><X size={14}/> {t('clear_filters')}</button>}
          </div>
      </div>

      <div className="grid gap-6">
        {processedOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed text-gray-400">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t('no_products_found')}</p>
          </div>
        ) : (
          processedOrders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
              <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 bg-gray-100 w-fit px-2 py-0.5 rounded text-gray-500 border border-gray-200 mb-1">
                        <Hash size={12} /><span className="text-[10px] font-mono font-bold">{order.orderNumber}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{order.productName}</h3>
                    <p className="text-sm text-teal-600">{order.supplierName}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)} {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Quantity</span>
                    <span className="font-bold text-gray-900">{order.quantity} {order.unitOfMeasurement}s</span>
                  </div>
                   <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                       <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Placed On</span>
                       <span className="font-bold text-gray-900">{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Delivery Verification Actions */}
                {order.status === OrderStatus.COMPLETED && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mb-6">
                        <div className="flex gap-3 mb-4">
                            <Info className="text-teal-600 shrink-0" size={20} />
                            <div>
                                <p className="text-sm font-bold text-teal-900">{t('confirm_receipt')}</p>
                                <p className="text-xs text-teal-700">{t('confirm_receipt_desc')}</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => handleConfirmReceipt(order.id)} className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"><CheckCircle size={18} /> {t('confirm_receipt')}</button>
                            <button onClick={() => openReturnModal(order.id)} className="flex-1 py-3 bg-white border-2 border-pink-100 text-pink-600 hover:bg-pink-50 rounded-lg text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"><RefreshCw size={18} /> {t('request_return')}</button>
                        </div>
                    </div>
                )}

                {order.status === OrderStatus.RETURN_REQUESTED && (
                    <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-6 flex gap-4">
                        <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shrink-0"><AlertCircle size={24} /></div>
                        <div>
                            <p className="text-sm font-bold text-pink-900 uppercase tracking-tighter">Return Under Review</p>
                            <p className="text-xs text-pink-700 font-medium mt-1">Reason: <span className="font-bold">{order.returnReason}</span></p>
                            {order.returnNote && <p className="text-[11px] text-pink-600 italic mt-1 bg-white/50 p-2 rounded">"{order.returnNote}"</p>}
                        </div>
                    </div>
                )}

                {order.status === OrderStatus.PENDING_CUSTOMER_APPROVAL && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <p className="text-sm font-bold text-orange-900 mb-2">{t('supplier_proposed_changes')}</p>
                        <div className="flex gap-2">
                            <button onClick={() => handleConfirmChanges(order.id)} className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold">{t('accept_changes')}</button>
                            <button onClick={() => handleDeclineOrder(order.id)} className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold">{t('decline_order')}</button>
                        </div>
                    </div>
                )}

                {canChat && (
                    <button onClick={() => setActiveChatOrder(order)} className="w-full py-2.5 flex items-center justify-center gap-2 border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl font-bold text-sm transition-all"><MessageCircle size={16} /> {t('contact_agent')}</button>
                )}
              </div>

              <div className="p-6 flex-1 bg-gray-50/50">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-teal-600"/> {t('status_history')}</h4>
                <div className="relative pl-4 rtl:pl-0 rtl:pr-4 border-l-2 rtl:border-l-0 rtl:border-r-2 border-gray-200 space-y-6">
                  {(order.statusHistory || []).map((log, idx) => (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[21px] rtl:-right-[21px] top-0 h-3 w-3 rounded-full border-2 border-white ${idx === order.statusHistory!.length - 1 ? 'bg-teal-600' : 'bg-gray-300'}`}></div>
                        <p className="text-sm font-bold text-gray-800 leading-none">{log.status}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                        {log.note && <p className="text-xs text-gray-500 mt-1 italic">"{log.note}"</p>}
                      </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Return Request Modal */}
      {returnModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="p-8 bg-pink-50 border-b border-pink-100 text-center">
                      <div className="h-16 w-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner"><RefreshCw size={32} /></div>
                      <h3 className="text-2xl font-black text-pink-900">{t('request_return')}</h3>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('return_reason_label')}</label>
                          <div className="grid grid-cols-1 gap-2">
                              {([
                                  { id: 'DAMAGED', label: t('reason_damaged') },
                                  { id: 'BROKEN', label: t('reason_broken') },
                                  { id: 'INCORRECT_DETAILS', label: t('reason_mismatch') },
                                  { id: 'OTHER', label: t('reason_other') }
                              ] as {id: ReturnReason, label: string}[]).map(r => (
                                  <label key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${returnFormData.reason === r.id ? 'border-pink-500 bg-pink-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                                      <input type="radio" className="w-5 h-5 text-pink-600 focus:ring-pink-500 border-gray-300" checked={returnFormData.reason === r.id} onChange={() => setReturnFormData({...returnFormData, reason: r.id})} />
                                      <span className="text-sm font-bold text-gray-700">{r.label}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Detailed Notes</label>
                          <textarea 
                            rows={3} 
                            placeholder={t('return_notes_placeholder')}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-4 text-sm font-medium outline-none focus:border-pink-500 transition-all"
                            value={returnFormData.note}
                            onChange={e => setReturnFormData({...returnFormData, note: e.target.value})}
                          />
                      </div>
                  </div>
                  <div className="p-4 bg-gray-50 grid grid-cols-2 gap-4">
                      <button onClick={() => setReturnModal({ isOpen: false, orderId: '' })} className="py-4 text-gray-500 font-bold uppercase text-xs tracking-widest">{t('cancel')}</button>
                      <button onClick={submitReturnRequest} className="py-4 bg-pink-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-pink-100 hover:bg-pink-700 transition-all">{t('submit_return')}</button>
                  </div>
              </div>
          </div>
      )}

      {activeChatOrder && <ChatModal order={activeChatOrder} currentUser={currentUser} onClose={() => setActiveChatOrder(null)} />}
    </div>
  );
};
