
import React, { useState, useEffect } from 'react';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { CustomerPortal } from './components/CustomerPortal';
import { SupplierPortal } from './components/SupplierPortal';
import { AdminPortal } from './components/AdminPortal';
import { CartDrawer } from './components/CartDrawer';
import { NotificationToast } from './components/NotificationToast';
import { Dashboard } from './components/Dashboard';
import { CustomerRequests } from './components/CustomerRequests';
import { DataService } from './services/mockData';
import { User, Product, Order, Notification, CartItem, UserRole, OrderStatus, RegistrationStatus } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { LogOut, ShoppingCart, User as UserIcon, Bell, Home, Globe, LayoutGrid, ShoppingBag, Clock, Settings, CheckCircle, X, Clipboard, ExternalLink, Activity, BarChart3, Users, ShieldCheck } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Navigation State
  const [activeView, setActiveView] = useState<string>('home');
  
  const { t, toggleLanguage, language, dir } = useLanguage();

  useEffect(() => {
    // Initial Data Load
    setProducts(DataService.getProducts());
    setOrders(DataService.getOrders());
  }, []);

  const addNotification = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, timestamp: Date.now() }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveView('home'); 
    addNotification(`${t('welcome')} ${loggedInUser.name}`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
    setIsCartOpen(false);
    setActiveView('home');
  };

  const handleAddToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
    addNotification(t('item_added'), 'success');
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  const handleCheckout = () => {
    if (!user) return;
    
    const newOrders = cart.map((item, index) => ({
      id: `ord-${Date.now()}-${index}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      productId: item.product.id,
      productName: item.product.name,
      customerId: user.id,
      customerName: user.name,
      supplierName: item.product.supplierName,
      quantity: item.quantity,
      unitOfMeasurement: item.product.unitOfMeasurement,
      status: OrderStatus.RECEIVED,
      date: new Date().toISOString(),
      statusHistory: [{ status: OrderStatus.RECEIVED, timestamp: new Date().toISOString() }]
    }));

    newOrders.forEach(order => DataService.createOrder(order));
    setOrders(DataService.getOrders());
    setCart([]);
    addNotification('Orders placed successfully!', 'success');
    setActiveView(user.role === UserRole.CUSTOMER ? 'my_requests' : 'orders');
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, note?: string) => {
    DataService.updateOrderStatus(orderId, status, note);
    setOrders(DataService.getOrders());
    addNotification(`Order status updated to ${status}`, 'success');
  };

  const handleUpdateOrder = (orderId: string, updates: Partial<Order>, note?: string) => {
      DataService.updateOrder(orderId, updates, note);
      setOrders(DataService.getOrders());
      addNotification('Order updated', 'success');
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    DataService.updateProduct(updatedProduct);
    setProducts(DataService.getProducts());
    addNotification('Product updated successfully', 'success');
  };

  const handleBulkAddProducts = (newProducts: Product[]) => {
    newProducts.forEach(p => DataService.addProduct(p));
    setProducts(DataService.getProducts());
    addNotification(`${newProducts.length} products added successfully`, 'success');
  };

  const handleUpdateProfile = (updatedUser: User) => {
      DataService.updateUser(updatedUser);
      setUser(updatedUser);
      addNotification('Profile updated', 'success');
  };

  const getNavItems = () => {
    if (!user) return [];
    
    const common = [{ id: 'home', label: t('nav_home'), icon: Home }];

    if (user.role === UserRole.CUSTOMER) {
      return [
        ...common,
        { id: 'catalog', label: t('nav_catalog'), icon: LayoutGrid },
        { id: 'my_requests', label: t('nav_requests'), icon: Clock }
      ];
    }

    if (user.role === UserRole.SUPPLIER) {
      return [
        ...common,
        { id: 'supplier_orders', label: t('nav_orders'), icon: ShoppingBag },
        { id: 'supplier_partners', label: t('nav_partners'), icon: Globe },
        { id: 'supplier_reports', label: t('nav_reports'), icon: BarChart3 },
        { id: 'supplier_team', label: t('manage_team'), icon: Users },
      ];
    }

    if (user.role === UserRole.FOREIGN_SUPPLIER) {
      return [
        ...common,
        { id: 'foreign_dashboard', label: t('nav_dashboard'), icon: LayoutGrid },
        { id: 'foreign_reports', label: t('nav_reports'), icon: BarChart3 },
        { id: 'foreign_team', label: t('manage_team'), icon: Users },
      ];
    }

    if (user.role === UserRole.ADMIN) {
      return [
        ...common,
        { id: 'admin_portal', label: t('nav_admin'), icon: Settings }
      ];
    }

    return common;
  };

  const renderActiveView = () => {
    if (!user) return null;

    if (activeView === 'home') {
        return <Dashboard currentUser={user} orders={orders} products={products} />;
    }

    // Customer Views
    if (user.role === UserRole.CUSTOMER) {
        switch (activeView) {
            case 'catalog':
                return <CustomerPortal products={products} onRequestOrder={handleAddToCart} currentUser={user} orders={orders} onUpdateProfile={handleUpdateProfile} />;
            case 'my_requests':
                return <CustomerRequests orders={orders} currentUser={user} onUpdateOrder={handleUpdateOrder} />;
            default:
                return <Dashboard currentUser={user} orders={orders} products={products} />;
        }
    }

    // Supplier Views
    if (user.role === UserRole.SUPPLIER) {
        switch(activeView) {
            case 'supplier_orders':
                return (
                    <SupplierPortal 
                        orders={orders} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        onUpdateOrder={handleUpdateOrder}
                        products={products}
                        onUpdateProduct={handleUpdateProduct}
                        onBulkAddProducts={handleBulkAddProducts}
                        currentUser={user}
                        onUpdateProfile={handleUpdateProfile}
                        viewMode="orders"
                    />
                );
            case 'supplier_partners':
                return (
                    <SupplierPortal 
                        orders={orders} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        products={products}
                        onUpdateProduct={handleUpdateProduct}
                        onBulkAddProducts={handleBulkAddProducts}
                        currentUser={user}
                        onUpdateProfile={handleUpdateProfile}
                        viewMode="partners"
                    />
                );
            case 'supplier_reports':
                return (
                    <SupplierPortal 
                        orders={orders} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        products={products}
                        onUpdateProduct={handleUpdateProduct}
                        onBulkAddProducts={handleBulkAddProducts}
                        currentUser={user}
                        onUpdateProfile={handleUpdateProfile}
                        viewMode="reports"
                    />
                );
            case 'supplier_team':
                return (
                    <SupplierPortal 
                        orders={orders} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        products={products}
                        onUpdateProduct={handleUpdateProduct}
                        onBulkAddProducts={handleBulkAddProducts}
                        currentUser={user}
                        onUpdateProfile={handleUpdateProfile}
                        viewMode="team"
                    />
                );
            default:
                return <Dashboard currentUser={user} orders={orders} products={products} />;
        }
    }

    // Foreign Supplier Views
    if (user.role === UserRole.FOREIGN_SUPPLIER) {
        switch(activeView) {
            case 'foreign_reports':
                return (
                    <SupplierPortal 
                        orders={orders} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        onUpdateOrder={handleUpdateOrder}
                        products={products}
                        onUpdateProduct={handleUpdateProduct}
                        onBulkAddProducts={handleBulkAddProducts}
                        currentUser={user}
                        onUpdateProfile={handleUpdateProfile}
                        viewMode="reports"
                    />
                );
            case 'foreign_team':
                return (
                    <SupplierPortal 
                        orders={orders} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        onUpdateOrder={handleUpdateOrder}
                        products={products}
                        onUpdateProduct={handleUpdateProduct}
                        onBulkAddProducts={handleBulkAddProducts}
                        currentUser={user}
                        onUpdateProfile={handleUpdateProfile}
                        viewMode="team"
                    />
                );
            default: // foreign_dashboard maps to 'orders' viewMode for reusability
                return (
                    <SupplierPortal 
                        orders={orders} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        onUpdateOrder={handleUpdateOrder}
                        products={products}
                        onUpdateProduct={handleUpdateProduct}
                        onBulkAddProducts={handleBulkAddProducts}
                        currentUser={user}
                        onUpdateProfile={handleUpdateProfile}
                        viewMode="orders" 
                    />
                );
        }
    }

    // Admin Views
    if (user.role === UserRole.ADMIN) {
        return <AdminPortal products={products} orders={orders} onUpdateProduct={handleUpdateProduct} />;
    }

    return <div>View not found</div>;
  };

  if (isRegistering) {
    return <Register onNavigateToLogin={() => setIsRegistering(false)} />;
  }

  if (!user) {
    return <Login onLoginSuccess={handleLogin} onNavigateToRegister={() => setIsRegistering(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900" dir={dir}>
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('home')}>
                <div className="bg-teal-600 p-1.5 rounded-lg">
                    <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-black tracking-tight text-slate-900">Edge<span className="text-teal-600">Rx</span></span>
              </div>
              <div className="hidden md:flex space-x-1">
                {getNavItems().map(item => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeView === item.id 
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </button>
                    );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleLanguage} className="p-2 text-gray-400 hover:text-teal-600 transition-colors font-bold text-xs uppercase">
                  {language === 'en' ? 'AR' : 'EN'}
              </button>
              
              <div className="relative">
                  <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer" />
                  {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
              </div>

              {user.role === UserRole.CUSTOMER && (
                <button 
                  className="relative p-2 text-gray-400 hover:text-teal-600 transition-colors"
                  onClick={() => setIsCartOpen(true)}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cart.length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-teal-600 rounded-full">
                      {cart.reduce((a, b) => a + b.quantity, 0)}
                    </span>
                  )}
                </button>
              )}
              
              <div className="h-8 w-px bg-gray-200 mx-1"></div>
              
              <div className="flex items-center gap-3 pl-1">
                  <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title={t('logout')}>
                    <LogOut size={20} />
                  </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className="md:hidden border-t border-gray-100 overflow-x-auto">
            <div className="flex p-2 gap-2">
                {getNavItems().map(item => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${
                            activeView === item.id 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-white text-gray-600 border border-gray-200'
                            }`}
                        >
                            <Icon size={16} />
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
      </nav>

      <main className="pb-20">
        {renderActiveView()}
      </main>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        onRemove={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onCheckout={handleCheckout}
      />

      <NotificationToast 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
    </div>
  );
}
