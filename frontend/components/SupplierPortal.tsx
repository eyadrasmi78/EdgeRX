
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, Product, User, ProductCategory, UserRole, PartnershipRequest, TeamMember, Permission, RegistrationStatus, ForeignBusinessType } from '../types';
import { DataService } from '../services/mockData';
import { ChatModal } from './ChatModal';
import { ProductModal } from './ProductModal';
import { 
  Package, Truck, CheckCircle, Clock, AlertCircle, ShoppingBag, 
  Edit2, Plus, X, Video, 
  Image as ImageIcon, User as UserIcon, Phone, MessageCircle, 
  Mail, Globe, Send, Handshake, Eye, FileText, Activity, 
  HardDrive, Download, Gift, Ban, Building, 
  ChevronRight, Settings, Search, Filter, ArrowLeft, Users, 
  Key, Shield, Lock, Hash, ArrowRight, Calendar, Check, MoreHorizontal, 
  CheckSquare, Navigation, Archive, LayoutGrid, MessageSquare, ExternalLink,
  MapPin, BarChart3, TrendingUp, DollarSign, UserCheck, RefreshCw, UserPlus, Save, Microscope, Tag, Beaker, SlidersHorizontal, FileSpreadsheet, UploadCloud, Trash2, Briefcase
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SupplierPortalProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>, note?: string) => void;
  products: Product[];
  onUpdateProduct: (product: Product) => void;
  onBulkAddProducts: (products: Product[]) => void;
  currentUser: User;
  onUpdateProfile?: (user: User) => void;
  viewMode?: 'orders' | 'partners' | 'reports' | 'team';
}

const UOM_OPTIONS = [
  'Ampoule', 'Bag', 'Blister', 'Bottle', 'Box', 'Can', 'Capsule', 'Carton', 
  'Case', 'Container', 'Drum', 'Gallon', 'Gram', 'Jar', 'Kg', 'Kit', 
  'Litre', 'Meter', 'Milligram', 'Milliliter', 'Pack', 'Pair', 'Piece', 
  'Roll', 'Sachet', 'Set', 'Strip', 'Syringe', 'Tablet', 'Tube', 'Unit', 'Vial'
];

export const SupplierPortal: React.FC<SupplierPortalProps> = ({ 
  orders, 
  onUpdateStatus, 
  onUpdateOrder, 
  products, 
  onUpdateProduct, 
  onBulkAddProducts, 
  currentUser, 
  onUpdateProfile,
  viewMode = 'orders' // Default to orders view logic
}) => {
  const { t, dir } = useLanguage();
  const isForeign = currentUser.role === UserRole.FOREIGN_SUPPLIER;
  
  // Tab management logic
  // If viewMode is provided, we use it to determine the active tab
  const initialTab = useMemo(() => {
      // Direct view modes take precedence
      if (viewMode === 'reports') return 'reports';
      if (viewMode === 'team') return 'team';
      if (viewMode === 'partners') return 'find_foreign';

      // Defaults for "Dashboard" view (mapped from viewMode="orders")
      if (isForeign) return 'requests'; 
      return 'orders'; 
  }, [viewMode, isForeign]);

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'requests' | 'team' | 'reports' | 'find_foreign' | 'media'>(initialTab as any);
  
  // Sync activeTab when viewMode changes
  useEffect(() => {
      setActiveTab(initialTab as any);
  }, [initialTab]);

  // --- Product Management State ---
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [stockLevelFilter, setStockLevelFilter] = useState<'All' | 'Low Stock' | 'Out of Stock' | 'In Stock'>('All');
  const [inventoryGroupBy, setInventoryGroupBy] = useState<'none' | 'category' | 'manufacturer'>('none');
  const [isProductFilterExpanded, setIsProductFilterExpanded] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Product Editor Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productFormTab, setProductFormTab] = useState<'basic' | 'specs' | 'bonus'>('basic');

  // New State for viewing Foreign Products Details
  const [selectedForeignProduct, setSelectedForeignProduct] = useState<Product | null>(null);

  // Media Library State
  const [mediaGallery, setMediaGallery] = useState<string[]>([
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80'
  ]);

  // Orders logic (Local only)
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  const [declineModal, setDeclineModal] = useState<{isOpen: boolean, orderId: string}>({isOpen: false, orderId: ''});
  const [declineReason, setDeclineReason] = useState('');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Partnership Requests logic
  const [partnershipRequests, setPartnershipRequests] = useState<PartnershipRequest[]>([]);
  // Store details of agents who sent requests
  const [requestSenders, setRequestSenders] = useState<Record<string, User>>({});

  // Foreign Supplier Discovery (Local Only)
  const [foreignSuppliers, setForeignSuppliers] = useState<User[]>([]);
  const [sentRequestsStatus, setSentRequestsStatus] = useState<Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'>>({});
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);

  // Team logic
  const [localTeamMembers, setLocalTeamMembers] = useState<TeamMember[]>(currentUser.teamMembers || []);
  const [userModal, setUserModal] = useState<{ isOpen: boolean, mode: 'create' | 'edit', editingId?: string }>({ isOpen: false, mode: 'create' });
  const [userFormData, setUserFormData] = useState({
      name: '',
      email: '',
      phone: '',
      jobTitle: '',
      password: '',
      permissions: [] as Permission[]
  });

  useEffect(() => {
      setLocalTeamMembers(currentUser.teamMembers || []);
      
      if (isForeign) {
          const requests = DataService.getPartnershipRequests().filter(r => r.toForeignSupplierId === currentUser.id);
          setPartnershipRequests(requests);
          
          // Fetch details for agents who sent requests to display in the UI
          const allUsers = DataService.getUsers();
          const sendersMap: Record<string, User> = {};
          requests.forEach(req => {
              const sender = allUsers.find(u => u.id === req.fromAgentId);
              if (sender) {
                  sendersMap[req.fromAgentId] = sender;
              }
          });
          setRequestSenders(sendersMap);

      } else {
          const allUsers = DataService.getUsers();
          setForeignSuppliers(allUsers.filter(u => u.role === UserRole.FOREIGN_SUPPLIER && u.status === RegistrationStatus.APPROVED));
          const mySentRequests = DataService.getPartnershipRequests().filter(r => r.fromAgentId === currentUser.id);
          
          // Map supplier ID to request status for General Connections
          const statusMap: Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'> = {};
          mySentRequests.forEach(req => {
              if (req.requestType === 'GENERAL_CONNECTION' || !req.requestType) {
                  statusMap[req.toForeignSupplierId] = req.status;
              }
          });
          setSentRequestsStatus(statusMap);
      }
  }, [currentUser, isForeign]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
      if (newStatus === OrderStatus.DECLINED) {
          setDeclineModal({ isOpen: true, orderId });
          setDeclineReason('');
      } else {
          onUpdateStatus(orderId, newStatus as OrderStatus);
      }
  };

  const submitDecline = () => {
    if (declineModal.orderId && declineReason.trim()) {
        onUpdateStatus(declineModal.orderId, OrderStatus.DECLINED, declineReason.trim());
        setDeclineModal({ isOpen: false, orderId: '' });
        setDeclineReason('');
    }
  };

  const handleReviewOrder = (order: Order) => {
      if (!onUpdateOrder) return;
      const proposedQty = editedQuantities[order.id];
      const hasChanged = proposedQty !== undefined && proposedQty !== order.quantity;
      if (hasChanged) {
          onUpdateOrder(order.id, { 
              status: OrderStatus.PENDING_CUSTOMER_APPROVAL,
              quantity: proposedQty
          }, `Quantity proposed change to ${proposedQty}`);
      } else {
          onUpdateOrder(order.id, { status: OrderStatus.IN_PROGRESS });
      }
      const newEdits = { ...editedQuantities };
      delete newEdits[order.id];
      setEditedQuantities(newEdits);
  };

  const handleConnect = (supplierId: string) => {
      const result = DataService.sendPartnershipRequest(currentUser, supplierId);
      if (result.success) {
          setSentRequestsStatus(prev => ({...prev, [supplierId]: 'PENDING'}));
      } else {
          alert(result.message);
      }
  };

  const handleProductInterest = (product: Product) => {
      if (!viewingSupplierId) return;
      const result = DataService.sendPartnershipRequest(currentUser, viewingSupplierId, { id: product.id, name: product.name });
      if (!result.success && result.message !== 'Request sent successfully.') {
          // alert(result.message); 
      }
  };

  const handleRequestResponse = (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
      DataService.updatePartnershipRequest(requestId, status);
      // Update local state to reflect change immediately
      setPartnershipRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
  };

  const downloadBulkTemplate = () => {
    const headers = "Name,Category,Price,Stock,Description,Manufacturer,SKU,UnitOfMeasurement\n";
    const sample = "Paracetamol 500mg,Medicine,5.00,1000,Pain reliever,PharmaInc,MED-001,Box";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const lines = text.split('\n').slice(1);
        const newProducts: Product[] = lines.filter(l => l.trim()).map((line, idx) => {
          const [name, cat, price, stock, desc, manuf, sku, uom] = line.split(',');
          return {
            id: `bulk-${Date.now()}-${idx}`,
            name: name?.trim() || 'New Product',
            category: (cat?.trim() as any) || ProductCategory.MEDICINE,
            categoryLevel1: (cat?.trim() as any) || 'Medicine',
            categoryLevel2: '',
            categoryLevel3: '',
            price: parseFloat(price) || 0,
            stockLevel: parseInt(stock) || 0,
            description: desc?.trim() || '',
            manufacturer: manuf?.trim() || currentUser.name,
            supplierName: currentUser.name,
            image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80',
            sku: sku?.trim() || `BLK-${Math.floor(Math.random()*10000)}`,
            unitOfMeasurement: uom?.trim() || 'Unit'
          };
        });
        onBulkAddProducts(newProducts);
        if (bulkInputRef.current) bulkInputRef.current.value = '';
      };
      reader.readAsText(file);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach(file => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setMediaGallery(prev => [reader.result as string, ...prev]);
              };
              reader.readAsDataURL(file);
          });
      }
  };

  const removeMedia = (index: number) => {
      setMediaGallery(prev => prev.filter((_, i) => i !== index));
  };

  const myOrders = useMemo(() => {
    return orders.filter(o => o.supplierName === currentUser.name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, currentUser.name]);

  const myProducts = useMemo(() => {
    return products.filter(p => p.supplierName === currentUser.name);
  }, [products, currentUser.name]);

  const foreignPortfolioProducts = useMemo(() => {
      if (!viewingSupplierId) return [];
      const supplier = foreignSuppliers.find(s => s.id === viewingSupplierId);
      if (!supplier) return [];
      return products.filter(p => p.supplierName === supplier.name);
  }, [products, viewingSupplierId, foreignSuppliers]);

  const filteredProducts = useMemo(() => {
    return myProducts.filter(p => {
      const term = productSearch.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(term) || 
        (p.sku || '').toLowerCase().includes(term) ||
        (p.genericName || '').toLowerCase().includes(term) ||
        (p.brandName || '').toLowerCase().includes(term);

      const matchesCategory = productCategoryFilter === 'All' || p.category === productCategoryFilter;
      
      let matchesStock = true;
      if (stockLevelFilter === 'Low Stock') matchesStock = p.stockLevel > 0 && p.stockLevel < 100;
      else if (stockLevelFilter === 'Out of Stock') matchesStock = p.stockLevel === 0;
      else if (stockLevelFilter === 'In Stock') matchesStock = p.stockLevel > 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [myProducts, productSearch, productCategoryFilter, stockLevelFilter]);

  const groupedInventory = useMemo(() => {
    if (inventoryGroupBy === 'none') return { 'All Items': filteredProducts };
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const key = product[inventoryGroupBy as keyof Product] as string || 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    return groups;
  }, [filteredProducts, inventoryGroupBy]);

  const metrics = useMemo(() => {
    const successfulStates = [OrderStatus.COMPLETED, OrderStatus.CONFIRMED_BY_CUSTOMER, OrderStatus.FULFILLED];
    const successful = myOrders.filter(o => successfulStates.includes(o.status));
    let revenue = 0;
    successful.forEach(o => {
        const product = products.find(p => p.id === o.productId);
        if (product) revenue += o.quantity * product.price;
    });
    return {
      total: myOrders.length,
      revenue,
      fulfillmentRate: myOrders.length > 0 ? (myOrders.filter(o => o.status === OrderStatus.CONFIRMED_BY_CUSTOMER).length / myOrders.length) * 100 : 0
    };
  }, [myOrders, products]);

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
    setUserFormData({ name: '', email: '', phone: '', jobTitle: '', password: '', permissions: [] });
    setUserModal({ isOpen: true, mode: 'create' });
  };

  const handleOpenEditUser = (member: TeamMember | User) => {
      const isMain = member.id === currentUser.id;
      setUserFormData({
          name: member.name,
          email: member.email,
          phone: isMain ? (member as User).phone || '' : (member as TeamMember).phone,
          jobTitle: !isMain ? (member as TeamMember).jobTitle || '' : 'Administrator',
          password: member.password,
          permissions: isMain ? ['ADMIN_ACCESS'] : (member as TeamMember).permissions
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
            jobTitle: userFormData.jobTitle,
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
        const memberIdx = localTeamMembers.findIndex(m => m.id === userModal.editingId);
        if (memberIdx > -1) {
            const updated = { 
                ...localTeamMembers[memberIdx], 
                name: userFormData.name, 
                email: userFormData.email, 
                phone: userFormData.phone, 
                jobTitle: userFormData.jobTitle,
                password: userFormData.password, 
                permissions: userFormData.permissions 
            };
            DataService.updateTeamMember(currentUser.id, updated);
            const newList = [...localTeamMembers];
            newList[memberIdx] = updated;
            setLocalTeamMembers(newList);
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

  const openProductEditor = (product?: Product) => {
      if (product) {
          setEditingProduct({ ...product });
      } else {
          setEditingProduct({
              id: `p-${Math.random().toString(36).substr(2, 6)}`,
              name: '',
              category: ProductCategory.MEDICINE,
              categoryLevel1: 'Medicine',
              categoryLevel2: '',
              categoryLevel3: '',
              price: 0,
              stockLevel: 0,
              sku: '',
              supplierName: currentUser.name,
              manufacturer: '',
              description: '',
              unitOfMeasurement: 'Box',
              image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
              bonusThreshold: 0,
              bonusType: 'percentage',
              bonusValue: 0,
              genericName: '',
              brandName: '',
              dosageForm: '',
              strength: '',
              packSize: '',
              registrationNumber: '',
              countryOfOrigin: '',
              indication: '',
              therapeuticClass: ''
          });
      }
      setProductFormTab('basic');
      setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
        onUpdateProduct(editingProduct as Product);
        setIsProductModalOpen(false);
        setEditingProduct(null);
    }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({ ...editingProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "w-full border-gray-300 rounded-xl shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-slate-50 transition-all focus:bg-white text-sm py-2.5 px-4";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300" dir={dir}>
      
      {/* Stats Header (Only show for full view or orders) */}
      {(viewMode === 'orders') && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {!isForeign ? (
              <>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('total_revenue')}</p>
                        <p className="text-2xl font-black text-gray-900">${metrics.revenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-2xl text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all"><DollarSign size={24} /></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Orders</p>
                        <p className="text-2xl font-black text-gray-900">{myOrders.filter(o => o.status !== OrderStatus.CONFIRMED_BY_CUSTOMER && o.status !== OrderStatus.DECLINED).length}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><ShoppingBag size={24} /></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Success Rate</p>
                        <p className="text-2xl font-black text-green-600">{metrics.fulfillmentRate.toFixed(0)}%</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-2xl text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all"><CheckCircle size={24} /></div>
                </div>
              </>
          ) : (
              <>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Portfolio Items</p>
                        <p className="text-2xl font-black text-gray-900">{myProducts.length}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Package size={24} /></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Agent Requests</p>
                        <p className="text-2xl font-black text-gray-900">{partnershipRequests.length}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all"><UserPlus size={24} /></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Market Reach</p>
                        <p className="text-2xl font-black text-blue-600">Global</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Globe size={24} /></div>
                </div>
              </>
          )}
      </div>
      )}

      {/* Tabs - Only show if in 'orders' view mode for Local Suppliers OR always for Foreign Suppliers */}
      {(!isForeign && viewMode === 'orders') && (
      <div className="flex space-x-8 mb-8 border-b border-gray-200 overflow-x-auto">
         <button onClick={() => setActiveTab('orders')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <ShoppingBag size={18} /> {t('tab_my_orders')}
         </button>
         <button onClick={() => setActiveTab('products')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <LayoutGrid size={18} /> {t('tab_inventory')}
         </button>
         <button onClick={() => setActiveTab('media')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'media' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <ImageIcon size={18} /> {t('tab_media')}
         </button>
      </div>
      )}

      {/* Foreign Supplier Tabs (Show only on Dashboard view) */}
      {isForeign && viewMode === 'orders' && (
      <div className="flex space-x-8 mb-8 border-b border-gray-200 overflow-x-auto">
         <button onClick={() => setActiveTab('requests')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'requests' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Handshake size={18} /> Partnership Requests
         </button>
         <button onClick={() => setActiveTab('products')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <LayoutGrid size={18} /> {t('tab_portfolio')}
         </button>
         <button onClick={() => setActiveTab('media')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'media' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <ImageIcon size={18} /> {t('tab_media')}
         </button>
      </div>
      )}

      {/* Main Content Areas */}
      {/* Partnership Requests (Foreign Supplier Only) */}
      {activeTab === 'requests' && isForeign && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {partnershipRequests.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <Handshake size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No partnership requests received yet.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {partnershipRequests.map(req => {
                        const sender = requestSenders[req.fromAgentId];
                        const isProductInterest = req.requestType === 'PRODUCT_INTEREST';
                        const isPending = req.status === 'PENDING';
                        
                        return (
                            <div key={req.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col md:flex-row gap-6">
                                {/* Sender Details */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
                                            {sender?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">{sender?.name || req.fromAgentName}</h3>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{sender?.companyDetails?.country || 'Local Agent'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="flex items-center gap-2"><Mail size={14} className="text-gray-400"/> {sender?.email}</p>
                                        <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {sender?.phone || 'No phone'}</p>
                                        <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400"/> {sender?.companyDetails?.address || 'No address'}</p>
                                        {sender?.companyDetails?.website && (
                                            <p className="flex items-center gap-2"><Globe size={14} className="text-gray-400"/> <a href={`https://${sender.companyDetails.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{sender.companyDetails.website}</a></p>
                                        )}
                                    </div>
                                </div>

                                {/* Request Details */}
                                <div className="flex-1 flex flex-col border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-6 md:pt-0">
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isProductInterest ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                                {isProductInterest ? <Tag size={12}/> : <Handshake size={12}/>}
                                                {isProductInterest ? 'Product Interest' : 'Partnership Request'}
                                            </span>
                                            {!isPending && (
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {req.status}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {isProductInterest && (
                                            <div className="mb-4 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                                                <p className="text-xs text-teal-600 font-bold uppercase tracking-widest mb-1">Interested Product</p>
                                                <p className="font-black text-gray-900">{req.productName}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-1">ID: {req.productId}</p>
                                            </div>
                                        )}
                                        
                                        <p className="text-sm text-gray-600 italic">"{req.message}"</p>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(req.date).toLocaleDateString()}</p>
                                    </div>

                                    {isPending && (
                                        <div className="mt-auto flex gap-3">
                                            <button 
                                                onClick={() => handleRequestResponse(req.id, 'ACCEPTED')}
                                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                            >
                                                Accept
                                            </button>
                                            <button 
                                                onClick={() => handleRequestResponse(req.id, 'REJECTED')}
                                                className="flex-1 py-3 bg-white border-2 border-gray-100 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      )}

      {/* Orders View */}
      {activeTab === 'orders' && !isForeign && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {myOrders.map(order => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900">{order.productName}</span>
                                        <div className="flex items-center gap-1.5 mt-1 text-gray-400">
                                            <Hash size={10}/><span className="text-[10px] font-mono font-bold">{order.orderNumber}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-600">{order.customerName}</td>
                                <td className="px-6 py-4">
                                    {order.status === OrderStatus.RECEIVED ? (
                                        <input type="number" className="w-20 border-2 border-slate-100 rounded-lg px-2 py-1 text-sm font-black focus:border-teal-500" value={editedQuantities[order.id] || order.quantity} onChange={(e) => setEditedQuantities({...editedQuantities, [order.id]: parseInt(e.target.value) || 0})}/>
                                    ) : (
                                        <span className="text-sm font-black text-gray-900">{order.quantity} <span className="text-[10px] text-gray-400 uppercase ml-1">{order.unitOfMeasurement}s</span></span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => setActiveChatOrder(order)} className="p-2.5 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all"><MessageSquare size={16} /></button>
                                        {order.status === OrderStatus.RECEIVED && (
                                            <>
                                                <button onClick={() => handleReviewOrder(order)} className="px-4 py-2 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100">{t('confirm_process')}</button>
                                                <button onClick={() => handleStatusChange(order.id, OrderStatus.DECLINED)} className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all"><Ban size={16}/></button>
                                            </>
                                        )}
                                        {order.status === OrderStatus.IN_PROGRESS && <button onClick={() => onUpdateStatus(order.id, OrderStatus.SHIPMENT_OTW)} className="px-4 py-2 bg-amber-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-amber-600 transition-all flex items-center gap-2"><Truck size={14}/> Dispatch</button>}
                                        {order.status === OrderStatus.SHIPMENT_OTW && <button onClick={() => onUpdateStatus(order.id, OrderStatus.COMPLETED)} className="px-4 py-2 bg-teal-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2"><Navigation size={14}/> Delivered</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {myOrders.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-24 text-center text-gray-400 font-bold italic">No active orders in queue.</td></tr>
                        )}
                    </tbody>
                </table>
          </div>
      )}

      {/* Global Partners (Local Only) */}
      {activeTab === 'find_foreign' && !isForeign && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              {viewingSupplierId ? (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
                      <div className="flex items-center gap-4 mb-8">
                          <button onClick={() => setViewingSupplierId(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-all">
                              <ArrowLeft size={20} />
                          </button>
                          <div>
                              <h3 className="text-xl font-black text-gray-900">{foreignSuppliers.find(s => s.id === viewingSupplierId)?.name}</h3>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Public Portfolio</p>
                          </div>
                      </div>
                      {foreignPortfolioProducts.length === 0 ? (
                          <div className="text-center py-20 text-gray-400"><Package size={48} className="mx-auto mb-4 opacity-50" /><p>No products listed in public portfolio.</p></div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {foreignPortfolioProducts.map(product => (
                                  <div 
                                    key={product.id} 
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:border-blue-300 transition-all cursor-pointer"
                                    onClick={() => setSelectedForeignProduct(product)}
                                  >
                                      <div className="h-40 bg-gray-50 relative overflow-hidden"><img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={product.name}/></div>
                                      <div className="p-4"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{product.category}</p><h4 className="font-bold text-gray-900 mb-1 truncate">{product.name}</h4><p className="text-xs text-gray-500 line-clamp-2">{product.description}</p></div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {foreignSuppliers.map(supplier => {
                          const requestStatus = sentRequestsStatus[supplier.id];
                          const isSent = !!requestStatus;
                          const isAccepted = requestStatus === 'ACCEPTED';
                          const isRejected = requestStatus === 'REJECTED';

                          return (
                            <div key={supplier.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col hover:border-blue-200 transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">{supplier.name.charAt(0)}</div>
                                        <div><h3 className="text-lg font-black text-gray-900 leading-tight">{supplier.name}</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1"><Globe size={12} /> {supplier.companyDetails?.country || 'International'}</p></div>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-6 flex-1">
                                    <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-xl"><span className="text-gray-500 font-medium">Business Type</span><span className="font-bold text-gray-900">{supplier.companyDetails?.businessType || 'Manufacturer'}</span></div>
                                    <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-xl"><span className="text-gray-500 font-medium">Compliance</span><span className="font-bold text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Verified</span></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setViewingSupplierId(supplier.id)} className="flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50">Portfolio</button>
                                    <button 
                                        onClick={() => !isSent && handleConnect(supplier.id)} 
                                        disabled={isSent && !isRejected} 
                                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all 
                                            ${isAccepted 
                                                ? 'bg-green-600 text-white shadow-lg shadow-green-100 cursor-default' 
                                                : isRejected
                                                    ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                                    : isSent 
                                                        ? 'bg-gray-100 text-gray-400 cursor-default' 
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
                                    >
                                        {isAccepted ? <CheckCircle size={16} /> : isRejected ? <X size={16} /> : isSent ? <Clock size={16} /> : <Handshake size={16} />}
                                        {isAccepted ? 'Partner' : isRejected ? 'Declined' : isSent ? 'Pending' : 'Connect'}
                                    </button>
                                </div>
                            </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

      {/* Inventory View */}
      {activeTab === 'products' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                {/* ... Search and Filters ... */}
                <div className="p-8 border-b border-gray-100 bg-white">
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" placeholder="Advanced Search: Name, SKU, Generic name..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 transition-all text-sm outline-none"/>
                        </div>
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <button onClick={() => setIsProductFilterExpanded(!isProductFilterExpanded)} className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-black uppercase transition-all ${isProductFilterExpanded ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}><SlidersHorizontal size={16} /> Filters</button>
                            <select value={inventoryGroupBy} onChange={(e) => setInventoryGroupBy(e.target.value as any)} className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs font-black uppercase text-gray-500 outline-none"><option value="none">Group: No</option><option value="category">Category</option><option value="manufacturer">Manufacturer</option></select>
                            <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                                <button onClick={downloadBulkTemplate} className="p-3 text-gray-500 hover:text-teal-600 bg-gray-50 hover:bg-teal-50 rounded-2xl"><FileSpreadsheet size={18} /></button>
                                <label className="p-3 text-gray-500 hover:text-teal-600 bg-gray-50 hover:bg-teal-50 rounded-2xl cursor-pointer"><UploadCloud size={18} /><input type="file" accept=".csv" className="hidden" ref={bulkInputRef} onChange={handleBulkUpload} /></label>
                            </div>
                            <button onClick={() => openProductEditor()} className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-teal-700 shadow-lg shadow-teal-100 flex items-center gap-2"><Plus size={16} /> Add</button>
                        </div>
                    </div>
                    {isProductFilterExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Inventory Status</label><select value={stockLevelFilter} onChange={e => setStockLevelFilter(e.target.value as any)} className="w-full text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"><option value="All">All Stock Levels</option><option value="In Stock">In Stock Only</option><option value="Low Stock">Low Stock Warning</option><option value="Out of Stock">Out of Stock</option></select></div>
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category Filter</label><select value={productCategoryFilter} onChange={e => setProductCategoryFilter(e.target.value)} className="w-full text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"><option value="All">{t('all_categories')}</option>{Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        </div>
                    )}
                </div>
              </div>

              <div className="space-y-12">
                  {Object.entries(groupedInventory).map(([sectionName, sectionItems]: [string, Product[]]) => (
                      <div key={sectionName}>
                          {inventoryGroupBy !== 'none' && (
                              <div className="flex items-center gap-4 mb-6">
                                  <div className="h-8 w-1.5 bg-teal-600 rounded-full"></div>
                                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest">{sectionName}</h3>
                                  <div className="h-px bg-gray-100 flex-1"></div>
                                  <span className="text-[10px] font-black text-gray-400">{sectionItems.length} items</span>
                              </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                              {sectionItems.map(product => (
                                  <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden group hover:border-teal-500 transition-all flex flex-col">
                                      <div className="h-48 w-full bg-slate-50 relative overflow-hidden">
                                          <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name}/>
                                          <div className="absolute top-4 right-4">
                                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border bg-white shadow-sm ${product.stockLevel > 50 ? 'text-green-600 border-green-100' : product.stockLevel > 0 ? 'text-orange-600 border-orange-100' : 'text-red-600 border-red-100'}`}>{product.stockLevel} units</span>
                                          </div>
                                      </div>
                                      <div className="p-6 flex-1 flex flex-col">
                                          <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-2">{product.category}</p>
                                          <h3 className="font-black text-gray-900 text-lg leading-tight mb-2 truncate" title={product.name}>{product.name}</h3>
                                          <p className="text-xs text-gray-500 line-clamp-2 mb-6 font-medium">{product.description}</p>
                                          <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                              <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Price</p><p className="text-lg font-black text-teal-700">${product.price.toFixed(2)}</p></div>
                                              <button onClick={() => openProductEditor(product)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-teal-600 hover:text-white transition-all"><Edit2 size={18}/></button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
                  {filteredProducts.length === 0 && (
                      <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-24 text-center">
                          <Search className="mx-auto text-gray-200 mb-4" size={48} />
                          <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Matches Found</h3>
                          <button onClick={() => { setProductSearch(''); setProductCategoryFilter('All'); setStockLevelFilter('All'); }} className="mt-4 text-teal-600 font-bold hover:underline">Reset search criteria</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Media Library */}
      {activeTab === 'media' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
                  <div className="flex justify-between items-center mb-8">
                      <div><h3 className="text-xl font-black text-gray-900">{t('tab_media')}</h3><p className="text-sm text-gray-500">Manage product images and assets.</p></div>
                      <label className="bg-pink-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-pink-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-pink-100"><UploadCloud size={16} /> Upload New<input type="file" multiple accept="image/*" className="hidden" onChange={handleMediaUpload} /></label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {mediaGallery.map((url, idx) => (
                          <div key={idx} className="group relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-pink-200 transition-all shadow-sm">
                              <img src={url} alt={`Media ${idx}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button onClick={() => window.open(url, '_blank')} className="p-2 bg-white/20 hover:bg-white/40 rounded-xl text-white backdrop-blur-sm"><Eye size={18}/></button>
                                  <button onClick={() => removeMedia(idx)} className="p-2 bg-red-500/80 hover:bg-red-600 rounded-xl text-white backdrop-blur-sm"><Trash2 size={18}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
          <div className="bg-white shadow-xl rounded-3xl border border-gray-100 overflow-hidden animate-in fade-in">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                  <div><h3 className="text-xl font-black text-gray-900">{t('manage_team')}</h3><p className="text-sm text-gray-500">Control staff access and permissions.</p></div>
                  <button onClick={handleOpenAddUser} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center gap-2"><Plus size={16} /> {t('add_user')}</button>
              </div>
              <div className="p-8 grid gap-4">
                  <div className="flex items-center justify-between p-5 bg-teal-50/50 border border-teal-100 rounded-3xl">
                      <div className="flex items-center gap-4">
                          <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100"><Shield size={24} /></div>
                          <div>
                              <p className="font-black text-teal-900">{currentUser.name}</p>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs text-teal-700 font-medium">{currentUser.email}</span>
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-teal-100 text-teal-700">Primary Admin</span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => handleOpenEditUser(currentUser)} className="p-3 text-teal-400 hover:text-teal-700 bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18}/></button>
                  </div>
                  {localTeamMembers.map((member: TeamMember) => (
                      <div key={member.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:border-teal-200 transition-all">
                          <div className="flex items-center gap-4">
                              <div className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100"><UserIcon size={24} /></div>
                              <div>
                                  <p className="font-black text-gray-900">{member.name}</p>
                                  <div className="flex items-center gap-2">
                                      <p className="text-xs text-gray-500 font-medium">{member.email}</p>
                                      {member.jobTitle && <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">{member.jobTitle}</span>}
                                  </div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="flex flex-wrap gap-1">{(member.permissions || []).map(p => (<span key={p} className="text-[9px] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg text-slate-500 border border-slate-100">{p.split('_').pop()}</span>))}</div>
                              <button onClick={() => handleOpenEditUser(member)} className="p-3 text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"><Edit2 size={18}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
          <div className="animate-in fade-in space-y-8">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                      <div><h3 className="text-xl font-black text-gray-900 flex items-center gap-3"><Activity size={24} className="text-teal-600" /> Operational Tracking</h3></div>
                      <button className="bg-white border border-gray-100 text-[10px] font-black uppercase text-gray-500 px-6 py-3 rounded-2xl hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"><Download size={16}/> Export Data</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Ref</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer / Product</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {myOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="px-8 py-5"><div className="text-[10px] font-mono font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">{order.orderNumber}</div></td>
                                    <td className="px-8 py-5"><div className="flex flex-col"><span className="text-sm font-bold text-gray-900">{order.customerName}</span><span className="text-[10px] text-teal-600 font-black uppercase">{order.productName}</span></div></td>
                                    <td className="px-8 py-5"><span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${getStatusColor(order.status)}`}>{order.status}</span></td>
                                    <td className="px-8 py-5 text-right text-xs text-gray-400">{new Date(order.date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}

      {/* Shared Modals */}
      {activeChatOrder && <ChatModal order={activeChatOrder} currentUser={currentUser} onClose={() => setActiveChatOrder(null)} />}
      {declineModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden p-10 text-center animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><Ban size={40} /></div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4">{t('decline_order')}</h3>
                  <textarea autoFocus value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason for decline..." className="w-full h-32 p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-red-500 transition-all text-sm font-medium"/>
                  <div className="grid grid-cols-2 gap-4 mt-10"><button onClick={() => setDeclineModal({ isOpen: false, orderId: '' })} className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em]">{t('cancel')}</button><button onClick={submitDecline} disabled={!declineReason.trim()} className="py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-red-100 disabled:opacity-50">{t('confirm_decline')}</button></div>
              </div>
          </div>
      )}

      {/* Foreign Product Details Modal */}
      {selectedForeignProduct && (
          <ProductModal 
            product={selectedForeignProduct} 
            onClose={() => setSelectedForeignProduct(null)} 
            onRequestOrder={(product) => handleProductInterest(product)}
            viewMode="interest"
          />
      )}

      {/* Product Editor Modal */}
      {isProductModalOpen && editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl my-8 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                      <div><h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2"><Tag className="text-teal-600" /> {editingProduct.id?.startsWith('p-') ? 'Add New Product' : 'Edit Product'}</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Detailed Medical Product Entry</p></div>
                      <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-xl shadow-sm"><X size={24}/></button>
                  </div>
                  <div className="flex border-b border-gray-100 bg-white">
                      {[ { id: 'basic', label: 'Basic Info', icon: FileText }, { id: 'specs', label: 'Medical Specs', icon: Beaker }, { id: 'bonus', label: 'Pricing & Bonus', icon: Gift } ].map(tab => (<button key={tab.id} onClick={() => setProductFormTab(tab.id as any)} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-4 transition-all ${productFormTab === tab.id ? 'border-teal-600 text-teal-600 bg-teal-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}><tab.icon size={16}/> {tab.label}</button>))}
                  </div>
                  <form onSubmit={handleSaveProduct} className="p-8 space-y-8 overflow-y-auto flex-1 max-h-[60vh]">
                      {productFormTab === 'basic' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                              <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Product Name</label><input required type="text" className={inputClasses} value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}/></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Category</label><select required className={inputClasses} value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as ProductCategory, categoryLevel1: e.target.value})}><option value="">Select Category</option>{Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">SKU / Reference</label><input required type="text" className={inputClasses} value={editingProduct.sku} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}/></div>
                              
                              <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Briefcase size={14}/> Assign Contact Person (Medical Rep)</label>
                                  <select 
                                    className={inputClasses} 
                                    onChange={(e) => {
                                        const member = localTeamMembers.find(m => m.id === e.target.value);
                                        if (member) {
                                            setEditingProduct({
                                                ...editingProduct,
                                                medicalRepName: member.name,
                                                medicalRepEmail: member.email,
                                                medicalRepPhone: member.phone,
                                                medicalRepWhatsapp: member.phone 
                                            });
                                        }
                                    }}
                                    defaultValue=""
                                  >
                                      <option value="" disabled>Select a team member to handle this product...</option>
                                      {localTeamMembers.map(m => (
                                          <option key={m.id} value={m.id}>{m.name} {m.jobTitle ? `- ${m.jobTitle}` : ''}</option>
                                      ))}
                                  </select>
                                  {editingProduct.medicalRepName && <p className="text-xs text-blue-500 mt-2 font-medium">Currently assigned to: {editingProduct.medicalRepName}</p>}
                              </div>

                              <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label><textarea rows={3} className={inputClasses} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}/></div>
                              <div className="md:col-span-2 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center">
                                  <div className="flex items-center gap-6"><img src={editingProduct.image} className="h-24 w-24 rounded-3xl object-cover shadow-lg border-2 border-white" alt="Preview"/><div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Image</p><input type="file" onChange={handleProductImageUpload} accept="image/*" className="text-sm file:bg-teal-600 file:text-white file:border-none file:px-4 file:py-2 file:rounded-xl file:mr-4 file:font-black file:uppercase file:cursor-pointer"/></div></div>
                              </div>
                          </div>
                      )}
                      {productFormTab === 'specs' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Generic Name</label><input type="text" className={inputClasses} value={editingProduct.genericName || ''} onChange={e => setEditingProduct({...editingProduct, genericName: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Brand Name</label><input type="text" className={inputClasses} value={editingProduct.brandName || ''} onChange={e => setEditingProduct({...editingProduct, brandName: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Manufacturer</label><input type="text" className={inputClasses} value={editingProduct.manufacturer || ''} onChange={e => setEditingProduct({...editingProduct, manufacturer: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Country of Origin</label><input type="text" className={inputClasses} value={editingProduct.countryOfOrigin || ''} onChange={e => setEditingProduct({...editingProduct, countryOfOrigin: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dosage Form</label><input type="text" className={inputClasses} value={editingProduct.dosageForm || ''} onChange={e => setEditingProduct({...editingProduct, dosageForm: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Strength</label><input type="text" className={inputClasses} value={editingProduct.strength || ''} onChange={e => setEditingProduct({...editingProduct, strength: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pack Size</label><input type="text" className={inputClasses} value={editingProduct.packSize || ''} onChange={e => setEditingProduct({...editingProduct, packSize: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Registration No.</label><input type="text" className={inputClasses} value={editingProduct.registrationNumber || ''} onChange={e => setEditingProduct({...editingProduct, registrationNumber: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Therapeutic Class</label><input type="text" className={inputClasses} value={editingProduct.therapeuticClass || ''} onChange={e => setEditingProduct({...editingProduct, therapeuticClass: e.target.value})} /></div>
                              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Indication</label><input type="text" className={inputClasses} value={editingProduct.indication || ''} onChange={e => setEditingProduct({...editingProduct, indication: e.target.value})} /></div>
                          </div>
                      )}
                      {productFormTab === 'bonus' && (
                          <div className="space-y-8 animate-in fade-in">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                                  <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Unit Price ($)</label><input required type="number" step="0.01" className={inputClasses} value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} /></div>
                                  <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Stock</label><input required type="number" className={inputClasses} value={editingProduct.stockLevel} onChange={e => setEditingProduct({...editingProduct, stockLevel: parseInt(e.target.value)})} /></div>
                                  <div>
                                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">UOM</label>
                                      <select 
                                        required 
                                        className={inputClasses} 
                                        value={editingProduct.unitOfMeasurement} 
                                        onChange={e => setEditingProduct({...editingProduct, unitOfMeasurement: e.target.value})}
                                      >
                                          <option value="" disabled>Select Unit</option>
                                          {UOM_OPTIONS.map(u => (
                                              <option key={u} value={u}>{u}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                              
                              <div className="p-8 bg-pink-50 rounded-[2rem] border border-pink-100">
                                  <h4 className="text-pink-800 font-bold mb-6 flex items-center gap-2"><Gift size={20}/> Bonus Scheme Configuration</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <div>
                                          <label className="block text-[10px] font-black text-pink-700 uppercase tracking-widest mb-2">Threshold (Qty)</label><input type="number" placeholder="Min qty to trigger" className={inputClasses} value={editingProduct.bonusThreshold || ''} onChange={e => setEditingProduct({...editingProduct, bonusThreshold: parseInt(e.target.value) || 0})} />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black text-pink-700 uppercase tracking-widest mb-2">Bonus Type</label>
                                          <select className={inputClasses} value={editingProduct.bonusType || 'percentage'} onChange={e => setEditingProduct({...editingProduct, bonusType: e.target.value as any})}>
                                              <option value="percentage">Percentage (Free %)</option>
                                              <option value="fixed">Fixed (Free Units)</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black text-pink-700 uppercase tracking-widest mb-2">Bonus Value</label>
                                          <input type="number" placeholder="e.g. 10" className={inputClasses} value={editingProduct.bonusValue || ''} onChange={e => setEditingProduct({...editingProduct, bonusValue: parseFloat(e.target.value) || 0})} />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </form>
                  <div className="p-8 bg-slate-50 border-t border-gray-100 flex justify-end gap-4"><button type="button" onClick={() => setIsProductModalOpen(false)} className="px-8 py-4 text-gray-500 font-black uppercase text-xs tracking-widest">{t('cancel')}</button><button onClick={handleSaveProduct} className="px-12 py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-teal-100 hover:bg-teal-700 flex items-center gap-2"><Save size={18}/> {editingProduct.id?.startsWith('p-') ? 'Create Registry' : 'Update Registry'}</button></div>
              </div>
          </div>
      )}

      {userModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50"><h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">{userModal.mode === 'create' ? 'Add Team Member to ' + currentUser.name : 'Edit Team Member'}</h3><button onClick={() => setUserModal({ isOpen: false, mode: 'create' })} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-xl shadow-sm"><X size={20} /></button></div>
              <form onSubmit={handleSaveUser} className="p-8 space-y-6">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('full_name')}</label><input required type="text" className={inputClasses} value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
                
                {/* New Job Title Field */}
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Job Title / Role</label><input type="text" placeholder="e.g. Medical Representative, Sales Manager" className={inputClasses} value={userFormData.jobTitle || ''} onChange={e => setUserFormData({...userFormData, jobTitle: e.target.value})} /></div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('email_address')}</label><input required type="email" className={inputClasses} value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('password')}</label><input required type="text" className={inputClasses} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-1">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('phone_number')}</label><input required type="text" className={inputClasses} value={userFormData.phone} onChange={e => setUserFormData({...userFormData, phone: e.target.value})} /></div>
                </div>
                <div className="pt-6 flex justify-end gap-3"><button type="button" onClick={() => setUserModal({ isOpen: false, mode: 'create' })} className="px-8 py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">{t('cancel')}</button><button type="submit" className="px-10 py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all">{t('save')}</button></div>
              </form>
            </div>
          </div>
      )}
    </div>
  );
};
