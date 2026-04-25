
import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductCategory, Order, UserRole, User, TeamMember, Permission, OrderStatus } from '../types';
import { DataService } from '../services/mockData';
import { ProductModal } from './ProductModal';
import { Search, Filter, Box, Check, LayoutGrid, List, ArrowDownAZ, Layers, ChevronDown, FileCheck, Users, Plus, Edit2, Mail, Phone, Lock, Key, X, BarChart3, TrendingUp, ShoppingBag, Activity, PieChart, CheckCircle, User as UserIcon, Clock, Hash, ChevronRight, RefreshCw, AlertCircle, UserCheck, Globe, SlidersHorizontal, ArrowUpDown, Microscope, FlaskConical, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CustomerPortalProps {
  products: Product[];
  onRequestOrder: (product: Product, quantity: number) => void;
  currentUser: User;
  orders: Order[];
  onUpdateProfile?: (user: User) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ products, onRequestOrder, currentUser, orders, onUpdateProfile }) => {
  const { t, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'catalog' | 'team' | 'reports'>('catalog');
  
  // --- Catalog State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel1, setSelectedLevel1] = useState<string>('All');
  const [selectedLevel2, setSelectedLevel2] = useState<string>('All');
  const [selectedLevel3, setSelectedLevel3] = useState<string>('All');
  const [stockStatus, setStockStatus] = useState<'All' | 'In Stock' | 'Out of Stock'>('All');
  
  // New Technical Filters
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('All');
  const [selectedStrength, setSelectedStrength] = useState<string>('All');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('All');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [groupBy, setGroupBy] = useState<'none' | 'categoryLevel1' | 'manufacturer'>('none');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // --- Team Management State ---
  const [localTeamMembers, setLocalTeamMembers] = useState<TeamMember[]>(currentUser.teamMembers || []);
  const [userModal, setUserModal] = useState<{ isOpen: boolean, mode: 'create' | 'edit', editingId?: string }>({ isOpen: false, mode: 'create' });
  const [userFormData, setUserFormData] = useState({
      name: '',
      email: '',
      phone: '',
      password: '',
      permissions: [] as Permission[]
  });

  useEffect(() => {
      setLocalTeamMembers(currentUser.teamMembers || []);
  }, [currentUser]);

  // --- Analytics Logic ---
  const metrics = useMemo(() => {
    const myOrders = orders.filter(o => o.customerId === currentUser.id);
    const completed = myOrders.filter(o => [OrderStatus.CONFIRMED_BY_CUSTOMER, OrderStatus.COMPLETED, OrderStatus.FULFILLED].includes(o.status));
    
    let totalSpend = 0;
    completed.forEach(o => {
        const product = products.find(p => p.id === o.productId);
        if (product) totalSpend += o.quantity * product.price;
    });

    const categoryStats: Record<string, number> = {};
    completed.forEach(o => {
        const product = products.find(p => p.id === o.productId);
        if (product) {
            categoryStats[product.category] = (categoryStats[product.category] || 0) + (o.quantity * product.price);
        }
    });

    return {
        totalSpend,
        orderCount: myOrders.length,
        myOrders: myOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        fulfillmentRate: myOrders.length > 0 ? (myOrders.filter(o => o.status === OrderStatus.CONFIRMED_BY_CUSTOMER).length / myOrders.length) * 100 : 0,
        categoryBreakdown: Object.entries(categoryStats).sort((a,b) => b[1] - a[1]),
        statusCounts: {
            pending: myOrders.filter(o => [OrderStatus.RECEIVED, OrderStatus.IN_PROGRESS, OrderStatus.SHIPMENT_OTW].includes(o.status)).length,
            awaitingAction: myOrders.filter(o => o.status === OrderStatus.COMPLETED).length,
            confirmed: myOrders.filter(o => o.status === OrderStatus.CONFIRMED_BY_CUSTOMER).length,
            returns: myOrders.filter(o => o.status === OrderStatus.RETURN_REQUESTED).length
        }
    };
  }, [orders, products, currentUser.id]);

  // --- Catalog Filtering Logic ---
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(term) || 
        product.supplierName.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.genericName || '').toLowerCase().includes(term) ||
        (product.manufacturer || '').toLowerCase().includes(term);

      const matchesL1 = selectedLevel1 === 'All' || product.categoryLevel1 === selectedLevel1;
      const matchesL2 = selectedLevel2 === 'All' || product.categoryLevel2 === selectedLevel2;
      const matchesL3 = selectedLevel3 === 'All' || product.categoryLevel3 === selectedLevel3;
      const matchesStock = stockStatus === 'All' ? true : stockStatus === 'In Stock' ? product.stockLevel > 0 : product.stockLevel === 0;
      
      const matchesDosage = selectedDosageForm === 'All' || product.dosageForm === selectedDosageForm;
      const matchesStrength = selectedStrength === 'All' || product.strength === selectedStrength;
      const matchesOrigin = selectedOrigin === 'All' || product.countryOfOrigin === selectedOrigin;

      return matchesSearch && matchesL1 && matchesL2 && matchesL3 && matchesStock && matchesDosage && matchesStrength && matchesOrigin;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_desc') return b.stockLevel - a.stockLevel;
      return 0;
    });
    return filtered;
  }, [products, searchTerm, selectedLevel1, selectedLevel2, selectedLevel3, stockStatus, selectedDosageForm, selectedStrength, selectedOrigin, sortBy]);

  const groupedProducts = useMemo(() => {
    if (groupBy === 'none') return { 'All Products': filteredProducts };
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const key = product[groupBy as keyof Product] as string || 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredProducts, groupBy]);

  const level1Options = useMemo(() => ['All', ...new Set(products.map(p => p.categoryLevel1))].sort(), [products]);
  const level2Options = useMemo(() => ['All', ...new Set(products.filter(p => selectedLevel1 === 'All' || p.categoryLevel1 === selectedLevel1).map(p => p.categoryLevel2))].filter(Boolean).sort(), [products, selectedLevel1]);
  const level3Options = useMemo(() => ['All', ...new Set(products.filter(p => (selectedLevel1 === 'All' || p.categoryLevel1 === selectedLevel1) && (selectedLevel2 === 'All' || p.categoryLevel2 === selectedLevel2)).map(p => p.categoryLevel3))].filter(Boolean).sort(), [products, selectedLevel1, selectedLevel2]);
  
  // New Options
  const dosageFormOptions = useMemo(() => ['All', ...new Set(products.map(p => p.dosageForm).filter(Boolean))].sort(), [products]);
  const strengthOptions = useMemo(() => ['All', ...new Set(products.map(p => p.strength).filter(Boolean))].sort(), [products]);
  const originOptions = useMemo(() => ['All', ...new Set(products.map(p => p.countryOfOrigin).filter(Boolean))].sort(), [products]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.RECEIVED: return 'bg-blue-50 text-blue-800 border-blue-200';
      case OrderStatus.IN_PROGRESS: return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case OrderStatus.COMPLETED: return 'bg-teal-50 text-teal-800 border-teal-200';
      case OrderStatus.CONFIRMED_BY_CUSTOMER: return 'bg-green-50 text-green-800 border-green-200';
      case OrderStatus.RETURN_REQUESTED: return 'bg-pink-50 text-pink-800 border-pink-200';
      case OrderStatus.DECLINED: return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-gray-50 text-gray-800';
    }
  };

  const handleOpenAddUser = () => {
      setUserFormData({ name: '', email: '', phone: '', password: '', permissions: [] });
      setUserModal({ isOpen: true, mode: 'create' });
  };

  const handleOpenEditUser = (member: TeamMember | User) => {
      const isMain = member.id === currentUser.id;
      setUserFormData({
          name: member.name,
          email: member.email,
          phone: isMain ? (member as User).phone || '' : (member as TeamMember).phone,
          password: member.password,
          permissions: isMain ? [] : (member as TeamMember).permissions
      });
      setUserModal({ isOpen: true, mode: 'edit', editingId: member.id });
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (userModal.mode === 'create') {
          const newMember: TeamMember = {
              id: Math.random().toString(36).substr(2, 9),
              name: userFormData.name,
              email: userFormData.email,
              phone: userFormData.phone,
              password: userFormData.password,
              permissions: userFormData.permissions,
              createdAt: new Date().toISOString()
          };
          const result = DataService.addTeamMember(currentUser.id, newMember);
          if (result.success) {
              setLocalTeamMembers(prev => [...prev, newMember]);
              setUserModal({ isOpen: false, mode: 'create' });
          }
      } else if (userModal.editingId) {
          if (userModal.editingId === currentUser.id && onUpdateProfile) {
              onUpdateProfile({ ...currentUser, name: userFormData.name, email: userFormData.email, phone: userFormData.phone, password: userFormData.password });
              setUserModal({ isOpen: false, mode: 'create' });
              return;
          }
          const memberIndex = localTeamMembers.findIndex(m => m.id === userModal.editingId);
          if (memberIndex > -1) {
              const updatedMember = { ...localTeamMembers[memberIndex], name: userFormData.name, email: userFormData.email, phone: userFormData.phone, password: userFormData.password, permissions: userFormData.permissions };
              DataService.updateTeamMember(currentUser.id, updatedMember);
              const newMembers = [...localTeamMembers];
              newMembers[memberIndex] = updatedMember;
              setLocalTeamMembers(newMembers);
              setUserModal({ isOpen: false, mode: 'create' });
          }
      }
  };

  const togglePermission = (perm: Permission) => {
      setUserFormData(prev => {
          if (prev.permissions.includes(perm)) return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
          return { ...prev, permissions: [...prev.permissions, perm] };
      });
  };

  const clearFilters = () => {
      setSearchTerm('');
      setSelectedLevel1('All');
      setSelectedLevel2('All');
      setSelectedLevel3('All');
      setStockStatus('All');
      setSelectedDosageForm('All');
      setSelectedStrength('All');
      setSelectedOrigin('All');
      setGroupBy('none');
      setSortBy('name_asc');
  };

  const inputClasses = "w-full border-gray-300 rounded-xl shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-slate-50 transition-all focus:bg-white text-sm py-2.5 px-4";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in" dir={dir}>
      <div className="flex space-x-8 mb-8 border-b border-gray-200">
         <button onClick={() => setActiveTab('catalog')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'catalog' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <LayoutGrid size={18} /> {t('nav_catalog')}
         </button>
         <button onClick={() => setActiveTab('reports')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <BarChart3 size={18} /> {t('nav_reports')}
         </button>
         <button onClick={() => setActiveTab('team')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'team' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Users size={18} /> {t('manage_team')}
         </button>
      </div>

      {activeTab === 'catalog' && (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 bg-white border-b border-gray-100">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type="text" placeholder="Search by Name, SKU, Manufacturer..." className="block w-full pl-12 pr-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button onClick={() => setIsFilterExpanded(!isFilterExpanded)} className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-black uppercase transition-all ${isFilterExpanded ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}><SlidersHorizontal size={18} /> Filters</button>
                        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="text-xs border-none rounded-2xl px-4 py-3 bg-gray-50 font-black uppercase text-gray-500 outline-none"><option value="none">No Grouping</option><option value="categoryLevel1">Group by Category</option><option value="manufacturer">Group by Manufacturer</option></select>
                    </div>
                </div>

                {isFilterExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category (L1)</label><select value={selectedLevel1} onChange={(e) => { setSelectedLevel1(e.target.value); setSelectedLevel2('All'); setSelectedLevel3('All'); }} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">{level1Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sub-Category (L2)</label><select value={selectedLevel2} onChange={(e) => { setSelectedLevel2(e.target.value); setSelectedLevel3('All'); }} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">{level2Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Class (L3)</label><select value={selectedLevel3} onChange={(e) => setSelectedLevel3(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">{level3Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Availability</label><select value={stockStatus} onChange={(e) => setStockStatus(e.target.value as any)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none"><option value="All">All Items</option><option value="In Stock">In Stock</option><option value="Out of Stock">Out of Stock</option></select></div>
                        
                        {/* New Technical Filters */}
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={10}/> {t('origin')}</label><select value={selectedOrigin} onChange={(e) => setSelectedOrigin(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">{originOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FlaskConical size={10}/> {t('dosage_form')}</label><select value={selectedDosageForm} onChange={(e) => setSelectedDosageForm(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">{dosageFormOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Microscope size={10}/> {t('strength')}</label><select value={selectedStrength} onChange={(e) => setSelectedStrength(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">{strengthOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                    </div>
                )}
            </div>
            <div className="px-8 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-100"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredProducts.length} Results</span><div className="flex items-center gap-2"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort:</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs font-black uppercase text-teal-700 bg-transparent border-none focus:ring-0 cursor-pointer"><option value="name_asc">{t('sort_name_asc')}</option><option value="name_desc">{t('sort_name_desc')}</option><option value="price_asc">{t('sort_price_asc')}</option><option value="price_desc">{t('sort_price_desc')}</option></select></div></div>
        </div>

        <div className="space-y-12">
          {Object.entries(groupedProducts).map(([groupName, groupItems]: [string, Product[]]) => (
            <div key={groupName}>
              {groupBy !== 'none' && (
                <div className="flex items-center gap-4 mb-6"><h2 className="text-lg font-black text-gray-800 uppercase tracking-widest">{groupName}</h2><div className="h-px bg-gray-100 flex-1"></div><span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg uppercase">{groupItems.length} items</span></div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {groupItems.map(product => (
                  <div key={product.id} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 cursor-pointer hover:border-teal-500 hover:shadow-2xl transition-all group flex flex-col" onClick={() => setSelectedProduct(product)}>
                    <div className="h-48 w-full overflow-hidden rounded-2xl mb-4 bg-gray-50 relative"><img src={product.image} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />{product.stockLevel <= 0 && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"><span className="bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">Sold Out</span></div>}</div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2"><h3 className="font-black text-gray-900 text-base leading-tight line-clamp-2">{product.name}</h3><span className="text-sm font-black text-teal-600">${product.price.toFixed(2)}</span></div>
                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-3">{product.manufacturer}</p>
                        <div className="flex flex-wrap gap-1 mt-auto pt-3 border-t border-gray-50"><span className="text-[9px] font-black uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">{product.categoryLevel1}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
              <div className="py-24 text-center"><Search className="mx-auto text-gray-200 mb-4" size={48} /><h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Matches Found</h3><button onClick={clearFilters} className="mt-4 text-teal-600 font-black uppercase text-xs hover:underline">Clear all filters</button></div>
          )}
        </div>
      </div>
      )}

      {/* Reports and Team Sections */}
      {activeTab === 'reports' && (
          <div className="animate-in fade-in space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl"><h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">{t('total_spend')}</h3><p className="text-2xl font-black text-gray-900">${metrics.totalSpend.toLocaleString()}</p></div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl"><h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Confirmation Rate</h3><p className="text-2xl font-black text-gray-900">{metrics.fulfillmentRate.toFixed(1)}%</p></div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl"><h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Active Shipments</h3><p className="text-2xl font-black text-gray-900">{metrics.statusCounts.pending}</p></div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl"><h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Returns Filed</h3><p className="text-2xl font-black text-pink-600">{metrics.statusCounts.returns}</p></div>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/50"><div><h3 className="text-xl font-black text-gray-900 flex items-center gap-2">Order Tracking History</h3></div></div>
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-white">
                              <tr>
                                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Ref</th>
                                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 bg-white">
                              {metrics.myOrders.map(order => (
                                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-8 py-5"><div className="text-[10px] font-mono font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 w-fit">{order.orderNumber}</div></td>
                                      <td className="px-8 py-5"><div className="flex flex-col"><span className="text-sm font-bold text-gray-900">{order.productName}</span><span className="text-[10px] text-teal-600 font-black uppercase">{order.supplierName}</span></div></td>
                                      <td className="px-8 py-5"><span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${getStatusColor(order.status)}`}>{order.status}</span></td>
                                      <td className="px-8 py-5 text-right text-xs text-gray-400">{new Date(order.date).toLocaleDateString()}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'team' && (
          <div className="bg-white shadow-xl rounded-3xl border border-gray-100 overflow-hidden animate-in fade-in">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                  <div><h3 className="text-xl font-black text-gray-900">{t('manage_team')}</h3><p className="text-sm text-gray-500">Control staff access and permissions.</p></div>
                  <button onClick={handleOpenAddUser} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-2"><Plus size={16} /> {t('add_user')}</button>
              </div>
              <div className="p-8 grid gap-4">
                  <div className="flex items-center justify-between p-5 bg-teal-50 border border-teal-100 rounded-3xl">
                      <div className="flex items-center gap-4"><div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100"><UserIcon size={24} /></div><div><p className="font-black text-teal-900">{currentUser.name} (Owner)</p><p className="text-xs text-teal-700">{currentUser.email}</p></div></div>
                      <button onClick={() => handleOpenEditUser(currentUser)} className="p-3 text-teal-400 hover:text-teal-700 bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18}/></button>
                  </div>
                  {localTeamMembers.map((member: TeamMember) => (
                      <div key={member.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:border-teal-200 transition-all">
                          <div className="flex items-center gap-4"><div className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100"><UserIcon size={24} /></div><div><p className="font-black text-gray-900">{member.name}</p><p className="text-xs text-gray-500">{member.email}</p></div></div>
                          <div className="flex items-center gap-3">
                              <div className="flex flex-wrap gap-1">{(member.permissions || []).map(p => (<span key={p} className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">{p.split('_').pop()}</span>))}</div>
                              <button onClick={() => handleOpenEditUser(member)} className="p-3 text-gray-400 hover:text-teal-600 rounded-xl transition-all"><Edit2 size={18}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onRequestOrder={onRequestOrder} />}
      
      {userModal.isOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50"><h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">{userModal.mode === 'create' ? t('add_user') : t('edit')}</h3><button onClick={() => setUserModal({ isOpen: false, mode: 'create' })} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-xl shadow-sm"><X size={20} /></button></div>
               <form onSubmit={handleSaveUser} className="p-8 space-y-6">
                   <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('full_name')}</label><input required type="text" className={inputClasses} value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
                   <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('email_address')}</label><input required type="email" className={inputClasses} value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} /></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('password')}</label><input required type="text" className={inputClasses} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div>
                   </div>
                   <div className="pt-6 flex justify-end gap-3"><button type="button" onClick={() => setUserModal({ isOpen: false, mode: 'create' })} className="px-8 py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">{t('cancel')}</button><button type="submit" className="px-10 py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all">{t('save')}</button></div>
               </form>
           </div>
       </div>
      )}
    </div>
  );
};
