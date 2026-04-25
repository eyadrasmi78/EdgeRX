
import React, { useState, useEffect, useMemo } from 'react';
import { DataService } from '../services/mockData';
import { User, RegistrationStatus, UserRole, Product, Order, OrderStatus, ProductCategory, ForeignBusinessType, TeamMember, Permission } from '../types';
import { Check, X, Building, Globe, FileText, User as UserIcon, Calendar, Download, AlertTriangle, Search, Mail, MapPin, Plus, Save, Package, Edit2, Upload, LayoutGrid, Users, Filter, BarChart3, TrendingUp, CheckCircle, ShoppingBag, ShieldCheck, Microscope, ArrowLeft, Phone, Lock, Eye, Key, File as FileIcon, Send, Gift } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AdminPortalProps {
  products?: Product[];
  orders?: Order[];
  onUpdateProduct?: (product: Product) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ products = [], orders = [], onUpdateProduct }) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'products'>('users');
  
  // User Management State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingCompanyUsers, setViewingCompanyUsers] = useState<User | null>(null);
  
  // Product Management State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStock, setFilterStock] = useState<string>('All');
  const [filterSupplierType, setFilterSupplierType] = useState<'All' | 'Local' | 'Foreign'>('All');
  
  const [viewingSupplierProducts, setViewingSupplierProducts] = useState<{supplierName: string, products: Product[]} | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormTab, setProductFormTab] = useState<'basic' | 'specs' | 'bonus'>('basic');

  // Document Viewing State
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string; type: 'image' | 'pdf' | 'unknown' } | null>(null);

  // Create Entity Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: 'password123',
    role: UserRole.CUSTOMER,
    address: '',
    website: '',
    
    // Local / Customer Fields
    tradeLicense: '',
    tradeLicenseExpiry: '',
    tradeLicenseFile: null as File | null,
    signatory: '',
    signatoryExpiry: '',
    signatoryFile: null as File | null,

    // Foreign Supplier Fields
    businessType: ForeignBusinessType.MANUFACTURER,
    isoExpiry: '',
    isoFile: null as File | null,
    labFile: null as File | null
  });

  // User Management Modal State (Create or Edit)
  const [userModal, setUserModal] = useState<{ isOpen: boolean, mode: 'create' | 'edit', editingId?: string | null }>({ isOpen: false, mode: 'create' });
  const [userFormData, setUserFormData] = useState({
      name: '',
      email: '',
      phone: '',
      password: '',
      permissions: [] as Permission[]
  });

  const inputClasses = "w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-slate-50 transition-colors focus:bg-white";

  useEffect(() => {
    refreshData();
  }, []);

  const handleUpdateStatus = (userId: string, status: RegistrationStatus) => {
    DataService.updateUserStatus(userId, status);
    refreshData();
  };

  const handleViewInventory = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    const supplierProducts = products.filter(p => p.supplierName === user.name);
    setViewingSupplierProducts({ supplierName: user.name, products: supplierProducts });
  };

  const handleViewCompanyUsers = (e: React.MouseEvent, user: User) => {
      e.stopPropagation();
      setViewingCompanyUsers(user);
  };

  const openDocument = (url: string | undefined, title: string) => {
      if (!url) {
          alert("This document does not have a preview available (Mock Data).");
          return;
      }
      let type: 'image' | 'pdf' | 'unknown' = 'unknown';
      if (url.startsWith('data:image')) type = 'image';
      else if (url.startsWith('data:application/pdf')) type = 'pdf';
      setViewingDoc({ url, title, type });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct && onUpdateProduct) {
        onUpdateProduct(editingProduct);
        setEditingProduct(null);
        if (viewingSupplierProducts) {
            setViewingSupplierProducts(prev => prev ? {
                ...prev,
                products: prev.products.map(p => p.id === editingProduct.id ? editingProduct : p)
            } : null);
        }
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.random().toString(36).substr(2, 9);
    let companyDetails = { address: createFormData.address, website: createFormData.website } as any;

    if (createFormData.role === UserRole.FOREIGN_SUPPLIER) {
        companyDetails = {
            ...companyDetails,
            businessType: createFormData.businessType,
            isoCertificateExpiry: createFormData.isoExpiry,
            isoCertificateFileName: createFormData.isoFile ? createFormData.isoFile.name : 'admin_uploaded_iso.pdf',
            labTestFileName: createFormData.labFile ? createFormData.labFile.name : 'admin_uploaded_lab.pdf',
            tradeLicenseNumber: createFormData.tradeLicense,
            tradeLicenseExpiry: createFormData.tradeLicenseExpiry,
            tradeLicenseFileName: createFormData.tradeLicenseFile ? createFormData.tradeLicenseFile.name : 'admin_uploaded_license.pdf',
        };
    } else {
        companyDetails = {
            ...companyDetails,
            tradeLicenseNumber: createFormData.tradeLicense,
            tradeLicenseExpiry: createFormData.tradeLicenseExpiry,
            tradeLicenseFileName: createFormData.tradeLicenseFile ? createFormData.tradeLicenseFile.name : 'admin_uploaded_license.pdf',
            authorizedSignatory: createFormData.signatory,
            authorizedSignatoryExpiry: createFormData.signatoryExpiry,
            authorizedSignatoryFileName: createFormData.signatoryFile ? createFormData.signatoryFile.name : 'admin_uploaded_signatory.pdf'
        };
    }

    const newUser: User = {
      id: newId,
      name: createFormData.name,
      email: createFormData.email,
      password: createFormData.password,
      role: createFormData.role,
      status: RegistrationStatus.APPROVED,
      companyDetails: companyDetails,
      teamMembers: []
    };

    const result = await DataService.registerUser(newUser);
    if (result.success) {
      // We don't have the new user's id from the API; refresh and approve any PENDING entry with that email.
      await refreshData();
      const created = DataService.getUsers().find(u => u.email === newUser.email);
      if (created) {
        await DataService.updateUserStatus(created.id, RegistrationStatus.APPROVED);
        await refreshData();
      }
      setIsCreateModalOpen(false);
      setCreateFormData({
        name: '', email: '', password: 'password123', role: UserRole.CUSTOMER, address: '', website: '',
        tradeLicense: '', tradeLicenseExpiry: '', tradeLicenseFile: null,
        signatory: '', signatoryExpiry: '', signatoryFile: null,
        businessType: ForeignBusinessType.MANUFACTURER, isoExpiry: '', isoFile: null, labFile: null
      });
    } else {
      alert(result.message);
    }
  };

  const handleOpenEditUser = (member: TeamMember | User, isPrimary: boolean) => {
      setUserFormData({
          name: member.name,
          email: member.email,
          phone: isPrimary ? (member as User).phone || '' : (member as TeamMember).phone,
          password: member.password,
          permissions: isPrimary ? [] : (member as TeamMember).permissions
      });
      setUserModal({ isOpen: true, mode: 'edit', editingId: member.id });
  };

  const handleOpenAddUser = () => {
      setUserFormData({ name: '', email: '', phone: '', password: '', permissions: [] });
      setUserModal({ isOpen: true, mode: 'create' });
  };

  const handleSaveCompanyUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!viewingCompanyUsers) return;

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
          const result = await DataService.addTeamMember(viewingCompanyUsers.id, newMember);
          if (result.success) {
              refreshData();
              setUserModal({ isOpen: false, mode: 'create' });
          } else {
              alert(result.message);
          }
      } else {
          if (userModal.editingId === viewingCompanyUsers.id) {
              const updatedUser: User = {
                  ...viewingCompanyUsers,
                  name: userFormData.name,
                  email: userFormData.email,
                  phone: userFormData.phone,
                  password: userFormData.password
              };
              await DataService.updateUser(updatedUser);
              refreshData(updatedUser);
          } else {
              const member = viewingCompanyUsers.teamMembers?.find(m => m.id === userModal.editingId);
              if (member) {
                  const updatedMember: TeamMember = {
                      ...member,
                      name: userFormData.name,
                      email: userFormData.email,
                      phone: userFormData.phone,
                      password: userFormData.password,
                      permissions: userFormData.permissions
                  };
                  await DataService.updateTeamMember(viewingCompanyUsers.id, updatedMember);
                  refreshData();
              }
          }
          setUserModal({ isOpen: false, mode: 'create' });
      }
  };

  const refreshData = (optimisticUser?: User) => {
      const freshUsers = DataService.getUsers();
      setUsers(freshUsers);
      if (viewingCompanyUsers) {
          const updatedView = optimisticUser || freshUsers.find(u => u.id === viewingCompanyUsers.id);
          setViewingCompanyUsers(updatedView || null);
      }
  };

  const togglePermission = (perm: Permission) => {
      setUserFormData(prev => {
          if (prev.permissions.includes(perm)) {
              return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
          } else {
              return { ...prev, permissions: [...prev.permissions, perm] };
          }
      });
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) || 
      user.email.toLowerCase().includes(term)
    );
  });

  const supplierRoles = useMemo(() => {
    const map: Record<string, UserRole> = {};
    users.forEach(u => map[u.name] = u.role);
    return map;
  }, [users]);

  const filteredProducts = products.filter(product => {
      if (!product) return false;
      const term = (productSearchTerm || '').toLowerCase();
      const matchesSearch = product.name.toLowerCase().includes(term) || product.supplierName.toLowerCase().includes(term) || (product.sku || '').toLowerCase().includes(term);
      const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
      const matchesStock = filterStock === 'All' ? true : filterStock === 'In Stock' ? product.stockLevel > 0 : product.stockLevel === 0;
      let matchesSupplierType = true;
      if (filterSupplierType !== 'All') {
          const role = supplierRoles[product.supplierName];
          if (role) {
              if (filterSupplierType === 'Local') matchesSupplierType = role === UserRole.SUPPLIER;
              else if (filterSupplierType === 'Foreign') matchesSupplierType = role === UserRole.FOREIGN_SUPPLIER;
          }
      }
      return matchesSearch && matchesCategory && matchesStock && matchesSupplierType;
  });

  const pendingUsers = filteredUsers.filter(u => u.status === RegistrationStatus.PENDING && u.role !== UserRole.ADMIN);
  const activeUsers = filteredUsers.filter(u => u.status === RegistrationStatus.APPROVED && u.role !== UserRole.ADMIN);

  const getExpiryLabel = (dateString?: string) => {
    if (!dateString) return <span className="text-green-600 text-xs font-medium">{t('document_valid')}</span>;
    const end = new Date(dateString);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertTriangle size={10} /> {t('document_expired')}</span>;
    if (days <= 90) return <span className="text-yellow-600 text-xs font-bold flex items-center gap-1"><AlertTriangle size={10} /> {t('expiring_soon')}</span>;
    return <span className="text-green-600 text-xs font-medium">{t('document_valid')}</span>;
  };

  const getDocumentStyles = (dateString?: string) => {
    if (!dateString) return 'bg-white border-gray-200';
    const end = new Date(dateString);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'bg-red-50 border-red-200 ring-1 ring-red-200';
    if (days <= 90) return 'bg-yellow-50 border-yellow-200 ring-1 ring-yellow-200';
    return 'bg-white border-gray-200';
  };

  const getRoleBadge = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPPLIER: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">{t('role_supplier')}</span>;
          case UserRole.FOREIGN_SUPPLIER: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">{t('role_foreign_supplier')}</span>;
          case UserRole.CUSTOMER: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-700">{t('role_customer')}</span>;
          default: return null;
      }
  };

  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPPLIER: return <Building className="text-purple-600 h-6 w-6" />;
          case UserRole.FOREIGN_SUPPLIER: return <Globe className="text-blue-600 h-6 w-6" />;
          case UserRole.CUSTOMER: return <Building className="text-teal-600 h-6 w-6" />;
          default: return <UserIcon className="text-gray-600 h-6 w-6" />;
      }
  };

  const getRoleBg = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPPLIER: return 'bg-purple-100';
          case UserRole.FOREIGN_SUPPLIER: return 'bg-blue-100';
          case UserRole.CUSTOMER: return 'bg-teal-100';
          default: return 'bg-gray-100';
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-gray-200">
         <button onClick={() => { setActiveTab('users'); setViewingSupplierProducts(null); setViewingCompanyUsers(null); }} className={`pb-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Users size={18} /> {t('user_management')}
         </button>
         <button onClick={() => setActiveTab('products')} className={`pb-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'products' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid size={18} /> {t('product_registry')}
         </button>
      </div>

      {activeTab === 'users' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {viewingCompanyUsers ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewingCompanyUsers(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 shadow-sm">
                                <ArrowLeft size={20} /> <span className="font-medium text-sm">Back</span>
                            </button>
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{viewingCompanyUsers.name}</h2>
                                <p className="text-sm text-gray-500">Managing Users & Permissions ({viewingCompanyUsers.teamMembers?.length || 0})</p>
                            </div>
                        </div>
                        <button onClick={handleOpenAddUser} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                            <Plus size={18} /> {t('add_user')}
                        </button>
                     </div>

                     <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('full_name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('email_address')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('phone_number')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('permissions')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr className="bg-blue-50/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            {viewingCompanyUsers.name} <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">Primary Admin</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{viewingCompanyUsers.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{viewingCompanyUsers.phone || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">All Access</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">System</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleOpenEditUser(viewingCompanyUsers, true)} className="text-teal-600 hover:text-teal-900 bg-white border border-teal-200 rounded p-1.5 hover:bg-teal-50">
                                            <Edit2 size={14}/>
                                        </button>
                                    </td>
                                </tr>
                                {(viewingCompanyUsers.teamMembers && viewingCompanyUsers.teamMembers.length > 0) ? (
                                    viewingCompanyUsers.teamMembers.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><UserIcon size={16} /></div>
                                                    <span className="text-sm font-medium text-gray-900">{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.phone}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {member.permissions.map(p => (
                                                        <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">{p.replace('_', ' ')}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(member.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleOpenEditUser(member, false)} className="text-teal-600 hover:text-teal-900 bg-white border border-teal-200 rounded p-1.5 hover:bg-teal-50">
                                                    <Edit2 size={14}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No additional team members added yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>
            ) : !viewingSupplierProducts ? (
              <>
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('admin_dashboard')}</h2>
                    <p className="text-gray-500">Manage supplier & customer registrations and compliance.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pr-3">
                        <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input type="text" placeholder={t('search_placeholder')} className="block w-full pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2 border border-gray-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-teal-500 transition-colors sm:text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap">
                        <Plus size={18} /> Add Entity
                    </button>
                    </div>
                </div>

                <div className="space-y-8">
                    <section>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">{pendingUsers.length}</span> {t('pending_registrations')}
                    </h3>
                    {pendingUsers.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 border border-gray-200">No pending registrations match your search.</div>
                    ) : (
                        <div className="grid gap-4">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col xl:flex-row gap-6">
                            <div className="flex-1 space-y-3 min-w-[250px]">
                                <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getRoleBg(user.role)}`}>{getRoleIcon(user.role)}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-bold text-gray-900">{user.name}</h4> {getRoleBadge(user.role)}
                                    </div>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                </div>
                                <div className="text-sm text-gray-600 mt-2">
                                    <p><Globe size={14} className="inline mr-1 text-gray-400 rtl:ml-1 rtl:mr-0"/> <a href={`http://${user.companyDetails?.website}`} className="hover:underline">{user.companyDetails?.website}</a></p>
                                    <p className="mt-1 text-gray-500 truncate">{user.companyDetails?.address} {user.companyDetails?.country ? `(${user.companyDetails.country})` : ''}</p>
                                    {user.companyDetails?.businessType && <p className="mt-1 text-xs text-blue-600 font-semibold">{user.companyDetails.businessType}</p>}
                                </div>
                            </div>
                            <div className="flex-[2] grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-md border border-gray-100">
                                {/* Shared Trade License Field for all roles */}
                                <div className={`space-y-1 p-3 rounded-md border ${getDocumentStyles(user.companyDetails?.tradeLicenseExpiry)}`}>
                                    <div className="flex justify-between items-start">
                                    <p className="font-semibold text-gray-700 flex items-center gap-2"><FileText size={14}/> {t('trade_license')}</p> {getExpiryLabel(user.companyDetails?.tradeLicenseExpiry)}
                                    </div>
                                    <p className="font-mono text-gray-900 bg-white/50 px-2 py-1 rounded border border-gray-200 inline-block text-xs">{user.companyDetails?.tradeLicenseNumber}</p>
                                    <div className="flex items-center gap-2 mt-1"><span className="text-gray-500 text-xs flex items-center gap-1"><Calendar size={12}/> Exp: {user.companyDetails?.tradeLicenseExpiry}</span></div>
                                    <button onClick={() => openDocument(user.companyDetails?.tradeLicenseDataUrl, 'Trade License')} className="text-teal-600 text-xs hover:underline flex items-center gap-1 mt-1 font-medium"><Eye size={12}/> {user.companyDetails?.tradeLicenseFileName || 'View Document'}</button>
                                </div>

                                {user.role === UserRole.FOREIGN_SUPPLIER ? (
                                    <>
                                    {user.companyDetails?.isoCertificateDataUrl && (
                                        <div className={`space-y-1 p-3 rounded-md border ${getDocumentStyles(user.companyDetails?.isoCertificateExpiry)}`}>
                                            <div className="flex justify-between items-start">
                                            <p className="font-semibold text-gray-700 flex items-center gap-2"><ShieldCheck size={14}/> ISO Certificate</p> {getExpiryLabel(user.companyDetails?.isoCertificateExpiry)}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-gray-500 text-xs flex items-center gap-1"><Calendar size={12}/> Exp: {user.companyDetails?.isoCertificateExpiry}</span>
                                            </div>
                                            <button onClick={() => openDocument(user.companyDetails?.isoCertificateDataUrl, 'ISO Certificate')} className="text-teal-600 text-xs hover:underline flex items-center gap-1 mt-1 font-medium"><Eye size={12}/> {user.companyDetails?.isoCertificateFileName || 'View Document'}</button>
                                        </div>
                                    )}
                                    {user.companyDetails?.labTestDataUrl && (
                                        <div className="space-y-1 p-3 rounded-md border bg-white border-gray-200">
                                            <div className="flex justify-between items-start"><p className="font-semibold text-gray-700 flex items-center gap-2"><Microscope size={14}/> Lab Tests</p></div>
                                            <button onClick={() => openDocument(user.companyDetails?.labTestDataUrl, 'Lab Test Report')} className="text-teal-600 text-xs hover:underline flex items-center gap-1 mt-3 font-medium"><Eye size={12}/> {user.companyDetails?.labTestFileName || 'View Document'}</button>
                                        </div>
                                    )}
                                    </>
                                ) : (
                                    <>
                                    <div className={`space-y-1 p-3 rounded-md border ${getDocumentStyles(user.companyDetails?.authorizedSignatoryExpiry)}`}>
                                        <div className="flex justify-between items-start">
                                        <p className="font-semibold text-gray-700 flex items-center gap-2"><UserIcon size={14}/> {t('auth_signatory')}</p> {getExpiryLabel(user.companyDetails?.authorizedSignatoryExpiry)}
                                        </div>
                                        <p className="text-gray-900 font-medium">{user.companyDetails?.authorizedSignatory}</p>
                                        <div className="flex items-center gap-2 mt-1"><span className="text-gray-500 text-xs flex items-center gap-1"><Calendar size={12}/> Exp: {user.companyDetails?.authorizedSignatoryExpiry}</span></div>
                                        <button onClick={() => openDocument(user.companyDetails?.authorizedSignatoryDataUrl, 'Authorized Signatory')} className="text-teal-600 text-xs hover:underline flex items-center gap-1 mt-1 font-medium"><Eye size={12}/> {user.companyDetails?.authorizedSignatoryFileName || 'View Document'}</button>
                                    </div>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-row xl:flex-col justify-center gap-3 border-t xl:border-t-0 xl:border-l xl:rtl:border-r xl:rtl:border-l-0 border-gray-100 pt-4 xl:pt-0 xl:pl-6 xl:rtl:pr-6 min-w-[140px]">
                                <button onClick={() => handleUpdateStatus(user.id, RegistrationStatus.APPROVED)} className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors"><Check size={18} /> {t('approve')}</button>
                                <button onClick={() => handleUpdateStatus(user.id, RegistrationStatus.REJECTED)} className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"><X size={18} /> {t('reject')}</button>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                    </section>
                    <section className="pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('active_directory')}</h3>
                    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade/ISO</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {activeUsers.length > 0 ? (
                            activeUsers.map(user => (
                                <tr key={user.id} onClick={() => setSelectedUser(user)} className="hover:bg-teal-50 cursor-pointer transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{user.name}</div><div className="text-sm text-gray-500">{user.email}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex flex-col">
                                        <span>{user.companyDetails?.tradeLicenseNumber}</span>
                                        {getExpiryLabel(user.companyDetails?.tradeLicenseExpiry)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-200 flex items-center w-fit gap-1"><Users size={12}/> {1 + (user.teamMembers?.length || 0)}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                                     <button onClick={(e) => handleViewCompanyUsers(e, user)} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-md text-xs font-medium border border-blue-100 transition-all flex items-center gap-1"><Users size={14}/> {t('manage_team')}</button>
                                    {(user.role === UserRole.SUPPLIER || user.role === UserRole.FOREIGN_SUPPLIER) && (
                                    <button onClick={(e) => handleViewInventory(e, user)} className="text-teal-600 hover:text-teal-800 bg-teal-50 px-3 py-1 rounded-md text-xs font-medium border border-teal-100 transition-all flex items-center gap-1"><Package size={14}/> {t('view_items')}</button>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span></td>
                                </tr>
                            ))
                            ) : (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">{searchTerm ? 'No active users match your search.' : 'No active users found.'}</td></tr>
                            )}
                        </tbody>
                        </table>
                    </div>
                    </section>
                </div>
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingSupplierProducts(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 shadow-sm"><ArrowLeft size={20} /> <span className="font-medium text-sm">Back</span></button>
                        <div className="h-8 w-px bg-gray-300"></div>
                        <div><h2 className="text-xl font-bold text-gray-900">{viewingSupplierProducts.supplierName}</h2><p className="text-sm text-gray-500">Managing Inventory ({viewingSupplierProducts.products.length} items)</p></div>
                    </div>
                 </div>
                 <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('details')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sku')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('unit_price')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {viewingSupplierProducts.products.length > 0 ? (
                                viewingSupplierProducts.products.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200"><img src={product.image} alt="" className="h-full w-full object-cover"/></div><div><div className="text-sm font-medium text-gray-900">{product.name}</div><div className="text-xs text-gray-500">{product.brandName}</div></div></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.price.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stockLevel} units</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => { setProductFormTab('basic'); setEditingProduct(product); }} className="text-teal-600 hover:text-teal-800 flex items-center justify-end gap-1 w-full"><Edit2 size={16}/> {t('edit')}</button></td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No products found in this inventory.</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
              </div>
            )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-gray-900">{t('product_registry')}</h2><p className="text-gray-500">Global view of all registered medical products and stock.</p></div>
                <div className="flex flex-col xl:flex-row gap-4 w-full md:w-auto items-end">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:left-auto rtl:right-0 rtl:pr-3"><Search className="h-5 w-5 text-gray-400" /></div>
                        <input type="text" placeholder="Search products..." className="block w-full pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2 border border-gray-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)}/>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-teal-500 focus:border-teal-500"><option value="All">{t('all_types')}</option>{Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <select value={filterSupplierType} onChange={(e) => setFilterSupplierType(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-teal-500 focus:border-teal-500"><option value="All">All Suppliers</option><option value="Local">{t('local_only')}</option><option value="Foreign">{t('foreign_only')}</option></select>
                        <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-teal-500 focus:border-teal-500"><option value="All">All Stock</option><option value="In Stock">{t('in_stock')}</option><option value="Out of Stock">{t('status_out_of_stock')}</option></select>
                    </div>
                </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('details')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('supplier')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('unit_price')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200"><img src={product.image} alt="" className="h-full w-full object-cover"/></div><div><div className="text-sm font-medium text-gray-900">{product.name}</div><div className="text-xs text-gray-500">{product.sku} • {product.category}</div></div></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{product.supplierName}</div><div className="text-xs text-gray-500">{product.manufacturer}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stockLevel > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{product.stockLevel} units</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => { setProductFormTab('basic'); setEditingProduct(product); }} className="text-teal-600 hover:text-teal-800 flex items-center justify-end gap-1 w-full"><Edit2 size={16}/> {t('edit')}</button></td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No products found matching your filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-xl font-bold text-gray-900">{t('edit')} {t('details')}</h3>
                  <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
               </div>
               <div className="flex border-b border-gray-200">
                   <button onClick={() => setProductFormTab('basic')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${productFormTab === 'basic' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}`}>Basic Info</button>
                   <button onClick={() => setProductFormTab('specs')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${productFormTab === 'specs' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}`}>Specifications</button>
                   <button onClick={() => setProductFormTab('bonus')} className={`flex-1 py-3 text-sm font-medium border-b-2 ${productFormTab === 'bonus' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}`}>Bonus & Pricing</button>
               </div>
               <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {productFormTab === 'basic' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Product Name</label><input className={inputClasses + " mt-1"} value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} required/></div>
                          <div><label className="block text-sm font-medium text-gray-700">Category Level 1</label><select className={inputClasses + " mt-1"} value={editingProduct.categoryLevel1} onChange={e => setEditingProduct({...editingProduct, categoryLevel1: e.target.value, category: e.target.value as any})}>{Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                          <div><label className="block text-sm font-medium text-gray-700">Sub Category</label><input className={inputClasses + " mt-1"} value={editingProduct.categoryLevel2 || ''} onChange={e => setEditingProduct({...editingProduct, categoryLevel2: e.target.value})} /></div>
                          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Description</label><textarea rows={3} className={inputClasses + " mt-1"} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label><div className="flex items-center gap-4"><img src={editingProduct.image} alt="Preview" className="h-20 w-20 object-cover rounded border" /><input type="file" onChange={handleProductImageUpload} accept="image/*" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"/></div></div>
                      </div>
                  )}
                  {productFormTab === 'specs' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                          <div><label className="block text-sm font-medium text-gray-700">Generic Name</label><input className={inputClasses + " mt-1"} value={editingProduct.genericName || ''} onChange={e => setEditingProduct({...editingProduct, genericName: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">Brand Name</label><input className={inputClasses + " mt-1"} value={editingProduct.brandName || ''} onChange={e => setEditingProduct({...editingProduct, brandName: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">Manufacturer</label><input className={inputClasses + " mt-1"} value={editingProduct.manufacturer || ''} onChange={e => setEditingProduct({...editingProduct, manufacturer: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">Country of Origin</label><input className={inputClasses + " mt-1"} value={editingProduct.countryOfOrigin || ''} onChange={e => setEditingProduct({...editingProduct, countryOfOrigin: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">Dosage Form</label><input className={inputClasses + " mt-1"} value={editingProduct.dosageForm || ''} onChange={e => setEditingProduct({...editingProduct, dosageForm: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">Strength</label><input className={inputClasses + " mt-1"} value={editingProduct.strength || ''} onChange={e => setEditingProduct({...editingProduct, strength: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">Pack Size</label><input className={inputClasses + " mt-1"} value={editingProduct.packSize || ''} onChange={e => setEditingProduct({...editingProduct, packSize: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">SKU</label><input className={inputClasses + " mt-1"} value={editingProduct.sku} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} /></div>
                      </div>
                  )}
                  {productFormTab === 'bonus' && (
                      <div className="space-y-6 animate-in fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <h4 className="md:col-span-2 font-bold text-gray-800 border-b border-gray-200 pb-2">Inventory & Pricing</h4>
                              <div><label className="block text-sm font-medium text-gray-700">Unit Price</label><input type="number" className={inputClasses + " mt-1"} value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} required/></div>
                              <div><label className="block text-sm font-medium text-gray-700">Stock Level</label><input type="number" className={inputClasses + " mt-1"} value={editingProduct.stockLevel} onChange={e => setEditingProduct({...editingProduct, stockLevel: parseInt(e.target.value)})} /></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-pink-50 rounded-lg border border-pink-200">
                              <h4 className="md:col-span-3 font-bold text-pink-800 flex items-center gap-2 border-b border-pink-200 pb-2"><Gift size={18} /> Bonus Scheme</h4>
                              <div><label className="block text-sm font-medium text-gray-700">Bonus Threshold (Qty)</label><input type="number" className={inputClasses + " mt-1"} value={editingProduct.bonusThreshold || 0} onChange={e => setEditingProduct({...editingProduct, bonusThreshold: parseInt(e.target.value)})} placeholder="0 to disable"/></div>
                              <div><label className="block text-sm font-medium text-gray-700">Bonus Type</label><select className={inputClasses + " mt-1"} value={editingProduct.bonusType || 'percentage'} onChange={e => setEditingProduct({...editingProduct, bonusType: e.target.value as any})}><option value="percentage">Percentage (Extra %)</option><option value="fixed">Fixed Quantity (Extra Units)</option></select></div>
                              <div><label className="block text-sm font-medium text-gray-700">Bonus Value</label><input type="number" className={inputClasses + " mt-1"} value={editingProduct.bonusValue || 0} onChange={e => setEditingProduct({...editingProduct, bonusValue: parseInt(e.target.value)})} /></div>
                          </div>
                      </div>
                  )}
               </form>
               <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3"><button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">{t('cancel')}</button><button onClick={handleSaveProduct} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center gap-2"><Save size={16}/> {t('save')}</button></div>
           </div>
        </div>
      )}

      {/* Expanded Add Entity Modal */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100"><h3 className="text-xl font-bold text-gray-900">Add New Entity</h3><button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button></div>
                  <form onSubmit={handleCreateUser} className="p-6 space-y-6 overflow-y-auto flex-1">
                      <div className="grid grid-cols-3 gap-4">
                        <div className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${createFormData.role === UserRole.CUSTOMER ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setCreateFormData({...createFormData, role: UserRole.CUSTOMER})}><div className="mx-auto w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center mb-2"><Building className="h-4 w-4 text-teal-700" /></div><h3 className="font-semibold text-gray-900 text-sm">{t('role_customer')}</h3></div>
                        <div className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${createFormData.role === UserRole.SUPPLIER ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setCreateFormData({...createFormData, role: UserRole.SUPPLIER})}><div className="mx-auto w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mb-2"><Building className="h-4 w-4 text-purple-700" /></div><h3 className="font-semibold text-gray-900 text-sm">{t('role_supplier')}</h3></div>
                        <div className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${createFormData.role === UserRole.FOREIGN_SUPPLIER ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setCreateFormData({...createFormData, role: UserRole.FOREIGN_SUPPLIER})}><div className="mx-auto w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2"><Globe className="h-4 w-4 text-blue-700" /></div><h3 className="font-semibold text-gray-900 text-sm">{t('role_foreign_supplier')}</h3></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('company_name')}</label><input required type="text" className={inputClasses + " mt-1"} value={createFormData.name} onChange={e => setCreateFormData({...createFormData, name: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">{t('email_address')}</label><input required type="email" className={inputClasses + " mt-1"} value={createFormData.email} onChange={e => setCreateFormData({...createFormData, email: e.target.value})} /></div>
                          <div><label className="block text-sm font-medium text-gray-700">{t('password')}</label><input required type="password" className={inputClasses + " mt-1"} value={createFormData.password} onChange={e => setCreateFormData({...createFormData, password: e.target.value})} /></div>
                          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('address')}</label><input required type="text" className={inputClasses + " mt-1"} value={createFormData.address} onChange={e => setCreateFormData({...createFormData, address: e.target.value})} /></div>
                          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('website')}</label><input required type="text" className={inputClasses + " mt-1"} value={createFormData.website} onChange={e => setCreateFormData({...createFormData, website: e.target.value})} /></div>
                      </div>
                      <div className="pt-4 flex justify-end gap-2"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">{t('cancel')}</button><button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">{t('save')}</button></div>
                  </form>
              </div>
          </div>
      )}

      {/* User Management Modal */}
      {userModal.isOpen && viewingCompanyUsers && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
               <div className="flex justify-between items-center p-6 border-b border-gray-100">
                   <div>
                        <h3 className="text-xl font-bold text-gray-900">{userModal.mode === 'create' ? t('add_user') : 'Edit User'}</h3>
                        <p className="text-sm text-gray-500">{userModal.mode === 'create' ? 'Add a team member to' : 'Editing details for'} {viewingCompanyUsers.name}</p>
                   </div>
                   <button onClick={() => setUserModal({ isOpen: false, mode: 'create' })} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
               </div>
               <form onSubmit={handleSaveCompanyUser} className="p-6 space-y-4">
                   <div><label className="block text-sm font-medium text-gray-700">{t('full_name')}</label><div className="relative mt-1"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon className="h-4 w-4 text-gray-400" /></div><input required type="text" className={inputClasses + " pl-10"} value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div></div>
                   <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-sm font-medium text-gray-700">{t('email_address')}</label><div className="relative mt-1"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-gray-400" /></div><input required type="email" className={inputClasses + " pl-10"} value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} /></div></div>
                       <div><label className="block text-sm font-medium text-gray-700">{t('phone_number')}</label><div className="relative mt-1"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-gray-400" /></div><input required type="tel" className={inputClasses + " pl-10"} value={userFormData.phone} onChange={e => setUserFormData({...userFormData, phone: e.target.value})} /></div></div>
                   </div>
                   <div><label className="block text-sm font-medium text-gray-700">{t('password')}</label><div className="relative mt-1"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400" /></div><input required type="text" className={inputClasses + " pl-10"} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div></div>
                   {userModal.editingId !== viewingCompanyUsers.id && (
                       <div className="border-t border-gray-100 pt-4 mt-2"><label className="block text-sm font-bold text-gray-700 mb-2">{t('permissions')}</label>
                           <div className="space-y-2">
                               <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold bg-gray-50 p-2 rounded border border-gray-200"><input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" checked={userFormData.permissions.includes('ADMIN_ACCESS')} onChange={() => togglePermission('ADMIN_ACCESS')} /> Admin Access (Full Control)</label>
                               <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" checked={userFormData.permissions.includes('VIEW_PRODUCTS')} onChange={() => togglePermission('VIEW_PRODUCTS')} /> View Products</label>
                               <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" checked={userFormData.permissions.includes('MANAGE_ORDERS')} onChange={() => togglePermission('MANAGE_ORDERS')} /> Manage Orders</label>
                               <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" checked={userFormData.permissions.includes('MANAGE_PRODUCTS')} onChange={() => togglePermission('MANAGE_PRODUCTS')} /> Manage Inventory</label>
                           </div>
                       </div>
                   )}
                   <div className="pt-4 flex justify-end gap-2"><button type="button" onClick={() => setUserModal({ isOpen: false, mode: 'create' })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">{t('cancel')}</button><button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm flex items-center gap-2"><Key size={16} /> {userModal.mode === 'create' ? 'Create User' : 'Save Changes'}</button></div>
               </form>
           </div>
       </div>
      )}
    </div>
  );
};
