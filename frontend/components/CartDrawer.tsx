
import React, { useMemo } from 'react';
import { CartItem, Product } from '../types';
import { X, Trash2, ShoppingCart, Send, Plus, Minus, Gift, Building } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  /** 2nd arg `customerId` distinguishes the same product staged for different pharmacies (Pharmacy Master). */
  onRemove: (productId: string, customerId?: string) => void;
  onUpdateQuantity: (productId: string, quantity: number, customerId?: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemove,
  onUpdateQuantity,
  onCheckout
}) => {
  const { t, dir } = useLanguage();

  // If ANY cart line carries a pharmacy name, we're in Pharmacy Master mode and
  // need a two-level group: pharmacy → supplier → items.
  const isMasterCart = cart.some(c => !!c.onBehalfOfCustomerName);

  // Standard supplier grouping (non-master flow).
  const supplierGroups = useMemo<Record<string, CartItem[]>>(() => {
    const groups: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const k = item.product.supplierName;
      if (!groups[k]) groups[k] = [];
      groups[k].push(item);
    });
    return groups;
  }, [cart]);

  // Pharmacy → supplier nested grouping (master flow).
  const pharmacyGroups = useMemo(() => {
    const map: Record<string, { pharmacyName: string; suppliers: Record<string, CartItem[]> }> = {};
    cart.forEach(item => {
      const phKey = item.onBehalfOfCustomerId || '_self';
      const phName = item.onBehalfOfCustomerName || '';
      if (!map[phKey]) map[phKey] = { pharmacyName: phName, suppliers: {} };
      const sup = item.product.supplierName;
      if (!map[phKey].suppliers[sup]) map[phKey].suppliers[sup] = [];
      map[phKey].suppliers[sup].push(item);
    });
    return map;
  }, [cart]);

  const totalCost = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const calculateBonus = (product: Product, quantity: number) => {
    if (!product.bonusThreshold || !product.bonusValue || quantity < product.bonusThreshold) return 0;
    return product.bonusType === 'fixed'
      ? product.bonusValue
      : Math.floor(quantity * (product.bonusValue / 100));
  };

  if (!isOpen) return null;

  /** Renders one cart line — used by both single-level and two-level grouping. */
  const renderItem = (item: CartItem) => {
    const bonus = calculateBonus(item.product, item.quantity);
    const cid = item.onBehalfOfCustomerId;
    return (
      <div key={`${item.product.id}::${cid ?? '_self'}`} className="p-4 flex gap-4">
        <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 truncate">{item.product.name}</h4>
          <p className="text-xs text-gray-500 mb-2">{item.product.brandName} • {item.product.unitOfMeasurement}</p>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-teal-600">
                ${(item.product.price * item.quantity).toFixed(2)}
              </span>
              {bonus > 0 && (
                <span className="text-[10px] text-pink-600 font-bold flex items-center gap-1">
                  <Gift size={10}/> +{bonus} Free
                </span>
              )}
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg h-8">
              <button
                className="px-2 h-full text-gray-600 hover:text-gray-900 disabled:opacity-50"
                onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1), cid)}
              ><Minus size={12} /></button>
              <span className="text-xs font-bold w-8 text-center">{item.quantity}</span>
              <button
                className="px-2 h-full text-gray-600 hover:text-gray-900"
                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, cid)}
              ><Plus size={12} /></button>
            </div>
          </div>
        </div>
        <button
          onClick={() => onRemove(item.product.id, cid)}
          className="text-gray-400 hover:text-red-500 self-start p-1"
        ><Trash2 size={16} /></button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${dir === 'rtl' ? 'translate-x-0' : ''}`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-teal-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900">{t('cart_title')} ({cart.length})</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-4 opacity-50" />
              <p>{t('cart_empty')}</p>
            </div>
          ) : isMasterCart ? (
            /* ── Pharmacy Master: pharmacy → supplier → items ── */
            <>
              {Object.entries(pharmacyGroups).map(([phKey, ph]) => {
                const supplierEntries = Object.entries(ph.suppliers);
                const phTotalItems = supplierEntries.reduce((s, [, items]) => s + items.length, 0);
                return (
                  <div key={phKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-slate-900 px-4 py-3 border-b flex items-center gap-2">
                      <Building className="text-white" size={14} />
                      <span className="text-sm font-bold text-white flex-1 truncate">{ph.pharmacyName}</span>
                      <span className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">{phTotalItems} items</span>
                    </div>
                    {supplierEntries.map(([supplier, items]) => (
                      <div key={`${phKey}::${supplier}`} className="border-b last:border-b-0 border-gray-100">
                        <div className="bg-teal-50 px-4 py-2 border-b border-teal-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-teal-800">{supplier}</span>
                          <span className="text-[10px] text-teal-600 font-medium">{items.length}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {items.map(renderItem)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            /* ── Standard: supplier → items ── */
            <>
              {Object.entries(supplierGroups).map(([supplier, items]) => (
                <div key={supplier} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-teal-50 px-4 py-3 border-b border-teal-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-teal-800">{supplier}</span>
                    <span className="text-xs text-teal-600 font-medium">{items.length} items</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map(renderItem)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 border-t border-gray-200 bg-white safe-area-bottom">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('total_items')}</span>
                <span className="font-medium">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>{t('total_est_cost')}</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mb-4 bg-yellow-50 p-2 rounded text-yellow-700">
              {t('requests_grouped')}
            </p>

            <button
              onClick={() => { onCheckout(); onClose(); }}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-200 transition-all active:scale-[0.98]"
            >
              <Send size={18} />
              {t('checkout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
