
import React, { useMemo } from 'react';
import { User, UserRole, Order, Product, OrderStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { NewsFeed } from './NewsFeed';
import { 
  BarChart3, CheckCircle, Clock, RefreshCw, Hash, AlertCircle, 
  TrendingUp, Activity, Package, DollarSign, UserCheck, ShieldCheck, 
  ChevronRight, Building, Globe, ShoppingBag, User as UserIcon
} from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  orders: Order[];
  products: Product[];
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, orders, products }) => {
  const { t, dir } = useLanguage();

  // Metrics Calculation
  const metrics = useMemo(() => {
    const isSupplier = currentUser.role === UserRole.SUPPLIER || currentUser.role === UserRole.FOREIGN_SUPPLIER;
    const myOrders = isSupplier 
        ? orders.filter(o => o.supplierName === currentUser.name)
        : orders.filter(o => o.customerId === currentUser.id);

    const completedStates = [OrderStatus.CONFIRMED_BY_CUSTOMER, OrderStatus.COMPLETED, OrderStatus.FULFILLED];
    const successful = myOrders.filter(o => completedStates.includes(o.status));
    
    let financialTotal = 0;
    successful.forEach(o => {
        const product = products.find(p => p.id === o.productId);
        if (product) financialTotal += o.quantity * product.price;
    });

    return {
        total: myOrders.length,
        financialTotal,
        successRate: myOrders.length > 0 ? (myOrders.filter(o => o.status === OrderStatus.CONFIRMED_BY_CUSTOMER).length / myOrders.length) * 100 : 0,
        pending: myOrders.filter(o => [OrderStatus.RECEIVED, OrderStatus.IN_PROGRESS, OrderStatus.SHIPMENT_OTW].includes(o.status)).length,
        returns: myOrders.filter(o => o.status === OrderStatus.RETURN_REQUESTED).length,
    };
  }, [orders, products, currentUser]);

  const isCustomer = currentUser.role === UserRole.CUSTOMER;
  const isSupplier = currentUser.role === UserRole.SUPPLIER || currentUser.role === UserRole.FOREIGN_SUPPLIER;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500" dir={dir}>
      
      {/* Welcome Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('welcome')}, {currentUser.name}</h1>
            <p className="text-gray-500 font-medium">Performance summary and real-time market updates.</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Live Network</span>
          </div>
      </div>

      {/* Analytics Grid - Performance Summary */}
      {!isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={80} className="text-teal-600" /></div>
                <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">{isCustomer ? t('total_spend') : t('total_revenue')}</h3>
                <p className="text-2xl font-black text-gray-900">${metrics.financialTotal.toLocaleString()}</p>
                <div className="mt-4 flex items-center gap-1.5 text-green-600 font-bold text-[10px] bg-green-50 w-fit px-2 py-0.5 rounded-full"><TrendingUp size={12}/> Global performance</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle size={80} className="text-blue-600" /></div>
                <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">{isCustomer ? 'Confirmation Rate' : 'Fulfillment Rate'}</h3>
                <p className="text-2xl font-black text-gray-900">{metrics.successRate.toFixed(1)}%</p>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${metrics.successRate}%` }}></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={80} className="text-orange-600" /></div>
                <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Active Requests</h3>
                <p className="text-2xl font-black text-gray-900">{metrics.pending}</p>
                <p className="mt-4 text-[10px] text-gray-500 flex items-center gap-1 font-bold uppercase"><Activity size={12}/> Needs attention</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><RefreshCw size={80} className="text-pink-600" /></div>
                <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Returns</h3>
                <p className="text-2xl font-black text-pink-600">{metrics.returns}</p>
                <p className="mt-4 text-[10px] text-pink-500 flex items-center gap-1 font-bold uppercase"><AlertCircle size={12}/> Issue tracking</p>
            </div>
          </div>
      )}

      {/* Market Feed - Full Width */}
      <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-1.5 bg-teal-600 rounded-full"></div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t('market_feed')}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Network Announcements & Updates</p>
              </div>
          </div>
          <NewsFeed currentUser={currentUser} />
      </div>

    </div>
  );
};
