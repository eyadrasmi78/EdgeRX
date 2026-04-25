
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, FeedItem, FeedType, Product } from '../types';
import { DataService } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import { Package, Building, ShoppingBag, MessageCircle, Clock, Send, Filter, CheckCircle, AlertTriangle, Crown, Megaphone, X, Calendar, FileText, Link as LinkIcon, Video, Plus, Info, Upload, Download } from 'lucide-react';

interface NewsFeedProps {
  currentUser: User;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [filterType, setFilterType] = useState<FeedType | 'ALL'>('ALL');
  
  // Customer Request State
  const [requestText, setRequestText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Advertisement State
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [adSelectedProduct, setAdSelectedProduct] = useState<Product | null>(null);
  const [adDuration, setAdDuration] = useState<number>(7);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);

  // News State
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [newsForm, setNewsForm] = useState({ 
      title: '', 
      content: '', 
      mediaUrl: '', // Will store URL or Base64
      externalLink: '', 
      mediaType: 'image' as 'image'|'video'|'pdf',
      attachmentName: ''
  });
  const [inputType, setInputType] = useState<'url' | 'file'>('url');

  useEffect(() => {
    // Load feed items
    setFeedItems(DataService.getFeedItems());
    
    // If supplier, load products for ad selection
    if (currentUser.role === UserRole.SUPPLIER || currentUser.role === UserRole.FOREIGN_SUPPLIER) {
        setSupplierProducts(DataService.getProducts().filter(p => p.supplierName === currentUser.name));
    }
  }, [currentUser]);

  const handlePostRequest = (e: React.FormEvent) => {
      e.preventDefault();
      if (!requestText.trim()) return;
      
      setIsPosting(true);
      // Simulate API call
      setTimeout(() => {
          DataService.createCustomerRequest(currentUser, requestText);
          setFeedItems(DataService.getFeedItems());
          setRequestText('');
          setIsPosting(false);
      }, 500);
  };

  const handleCreateAd = () => {
      if (adSelectedProduct) {
          DataService.createAdvertisement(currentUser, adSelectedProduct, adDuration);
          setFeedItems(DataService.getFeedItems());
          setIsAdModalOpen(false);
          setAdSelectedProduct(null);
      }
  };

  const handleCreateNews = (e: React.FormEvent) => {
      e.preventDefault();
      DataService.createAdminNews(currentUser, newsForm.title, newsForm.content, newsForm.mediaType, newsForm.mediaUrl, newsForm.externalLink, newsForm.attachmentName);
      setFeedItems(DataService.getFeedItems());
      setIsNewsModalOpen(false);
      setNewsForm({ title: '', content: '', mediaUrl: '', externalLink: '', mediaType: 'image', attachmentName: '' });
      setInputType('url');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              // Determine media type from file type
              let type: 'image' | 'video' | 'pdf' = 'image';
              if (file.type.startsWith('video/')) type = 'video';
              else if (file.type === 'application/pdf') type = 'pdf';
              
              setNewsForm({
                  ...newsForm,
                  mediaUrl: reader.result as string,
                  mediaType: type,
                  attachmentName: file.name
              });
          };
          reader.readAsDataURL(file);
      }
  };

  const { pinnedItems, regularItems } = useMemo(() => {
      const now = new Date().getTime();
      let all = feedItems.filter(item => filterType === 'ALL' || item.type === filterType);
      
      // Restrict visibility of Foreign Supplier promotions from Customers
      if (currentUser.role === UserRole.CUSTOMER) {
          all = all.filter(item => 
              !(item.type === FeedType.ADVERTISEMENT && item.authorRole === UserRole.FOREIGN_SUPPLIER)
          );
      }

      // Separate Pinned Ads
      const pinned = all.filter(item => {
          if (item.type !== FeedType.ADVERTISEMENT || !item.isPinned) return false;
          if (item.expiryDate && new Date(item.expiryDate).getTime() < now) return false;
          return true;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const regular = all
        .filter(item => !pinned.includes(item))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return { pinnedItems: pinned, regularItems: regular };
  }, [feedItems, filterType, currentUser.role]);

  const getFeedIcon = (type: FeedType, meta: any) => {
      switch(type) {
          case FeedType.NEW_PRODUCT: return <Package size={20} className="text-teal-600" />;
          case FeedType.NEW_SUPPLIER: return <Building size={20} className="text-blue-600" />;
          case FeedType.STOCK_UPDATE: 
            return meta?.stockStatus === 'IN_STOCK' 
                ? <CheckCircle size={20} className="text-green-600" />
                : <AlertTriangle size={20} className="text-red-600" />;
          case FeedType.CUSTOMER_REQUEST: return <MessageCircle size={20} className="text-purple-600" />;
          case FeedType.ADVERTISEMENT: return <Crown size={20} className="text-yellow-600" />;
          case FeedType.NEWS: return <Info size={20} className="text-indigo-600" />;
          default: return <Clock size={20} className="text-gray-500" />;
      }
  };

  const getFeedLabel = (type: FeedType, meta: any) => {
      switch(type) {
          case FeedType.NEW_PRODUCT: return t('new_product');
          case FeedType.NEW_SUPPLIER: return t('new_supplier');
          case FeedType.STOCK_UPDATE: return meta?.stockStatus === 'IN_STOCK' ? t('back_in_stock') : t('out_of_stock');
          case FeedType.CUSTOMER_REQUEST: return t('customer_request');
          case FeedType.ADVERTISEMENT: return t('sponsored');
          case FeedType.NEWS: return t('news_feed');
          default: return 'Update';
      }
  };

  const getDaysRemaining = (dateStr?: string) => {
      if (!dateStr) return 0;
      const diff = new Date(dateStr).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      
      {/* ... Header and filter buttons ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('market_feed')}</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time updates from the network.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <button 
                    onClick={() => setFilterType('ALL')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === 'ALL' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {t('feed_all')}
                </button>
                <button 
                    onClick={() => setFilterType(FeedType.NEWS)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === FeedType.NEWS ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {t('news_feed')}
                </button>
                <button 
                    onClick={() => setFilterType(FeedType.NEW_PRODUCT)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === FeedType.NEW_PRODUCT ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {t('feed_products')}
                </button>
                <button 
                    onClick={() => setFilterType(FeedType.NEW_SUPPLIER)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === FeedType.NEW_SUPPLIER ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {t('feed_suppliers')}
                </button>
                <button 
                    onClick={() => setFilterType(FeedType.STOCK_UPDATE)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === FeedType.STOCK_UPDATE ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {t('feed_stock')}
                </button>
                <button 
                    onClick={() => setFilterType(FeedType.CUSTOMER_REQUEST)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterType === FeedType.CUSTOMER_REQUEST ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {t('feed_requests')}
                </button>
              </div>

              {/* Admin News Button */}
              {currentUser.role === UserRole.ADMIN && (
                  <button 
                    onClick={() => setIsNewsModalOpen(true)}
                    className="ml-auto md:ml-2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
                  >
                      <Plus size={12} /> {t('post_news')}
                  </button>
              )}

              {/* Supplier Promote Button */}
              {(currentUser.role === UserRole.SUPPLIER || currentUser.role === UserRole.FOREIGN_SUPPLIER) && (
                  <button 
                    onClick={() => setIsAdModalOpen(true)}
                    className="ml-auto md:ml-2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-yellow-500 text-white hover:bg-yellow-600 flex items-center gap-1 shadow-sm"
                  >
                      <Megaphone size={12} /> {t('promote_product')}
                  </button>
              )}
          </div>
      </div>

      {/* Customer Request Input */}
      {currentUser.role === UserRole.CUSTOMER && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
              <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0">
                      {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                      <form onSubmit={handlePostRequest}>
                          <textarea
                            value={requestText}
                            onChange={(e) => setRequestText(e.target.value)}
                            placeholder={t('request_content')}
                            className="w-full border-0 bg-gray-50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 min-h-[80px] resize-none"
                          />
                          <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-gray-400">{t('post_request_desc')}</span>
                              <button 
                                type="submit" 
                                disabled={!requestText.trim() || isPosting}
                                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                  <Send size={14} /> {isPosting ? 'Posting...' : t('post')}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* Feed Timeline */}
      <div className="space-y-6">
          {pinnedItems.length === 0 && regularItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No activity to show.</div>
          ) : (
              <>
                {/* Pinned Advertisements */}
                {pinnedItems.map(item => (
                    <div key={item.id} className="relative pl-8 md:pl-0">
                        {/* Timeline Line */}
                        <div className="hidden md:block absolute left-[19px] top-8 bottom-[-24px] w-0.5 bg-yellow-200"></div>

                        <div className="flex flex-col md:flex-row gap-4 relative">
                            {/* Icon Column */}
                            <div className="hidden md:flex flex-col items-center shrink-0 w-10 relative z-10">
                                <div className="h-10 w-10 rounded-full bg-yellow-50 border-2 border-yellow-200 shadow-sm flex items-center justify-center">
                                    <Crown size={20} className="text-yellow-600" />
                                </div>
                            </div>

                            {/* Ad Card */}
                            <div className="flex-1 bg-gradient-to-br from-yellow-50 to-white rounded-xl shadow-md border border-yellow-200 overflow-hidden hover:shadow-lg transition-shadow relative">
                                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                                    {t('sponsored')}
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                                            <p className="text-xs text-yellow-700 font-medium flex items-center gap-1 mt-1">
                                                <Clock size={12}/> {t('expires_in')} {getDaysRemaining(item.expiryDate)} {t('days')}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-700 mb-3">{item.description}</p>

                                    {item.metadata?.productImage && (
                                        <div className="mt-3 mb-3 h-48 rounded-lg overflow-hidden border border-yellow-100 bg-white">
                                            <img src={item.metadata.productImage} alt="Ad" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-yellow-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-yellow-200 flex items-center justify-center text-[10px] font-bold text-yellow-800">
                                                {item.authorName.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-gray-800">{item.authorName}</span>
                                        </div>
                                        {item.metadata?.price && (
                                            <span className="text-sm font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded">
                                                ${item.metadata.price.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Regular Feed Items */}
                {regularItems.map((item, index) => (
                  <div key={item.id} className="relative pl-8 md:pl-0">
                      
                      {/* Timeline Line (Desktop Only) */}
                      <div className={`hidden md:block absolute left-[19px] top-8 bottom-[-24px] w-0.5 bg-gray-200 ${index === regularItems.length - 1 ? 'hidden' : ''}`}></div>

                      <div className="flex flex-col md:flex-row gap-4 relative">
                          
                          {/* Avatar/Icon Column */}
                          <div className="hidden md:flex flex-col items-center shrink-0 w-10 relative z-10">
                              <div className="h-10 w-10 rounded-full bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center">
                                  {getFeedIcon(item.type, item.metadata)}
                              </div>
                          </div>

                          {/* Content Card */}
                          <div className={`flex-1 rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${item.type === FeedType.NEWS ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white border-gray-200'}`}>
                              <div className="p-5">
                                  {/* Mobile Icon Header */}
                                  <div className="flex items-center gap-3 md:hidden mb-3">
                                      <div className="h-8 w-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
                                          {getFeedIcon(item.type, item.metadata)}
                                      </div>
                                      <div>
                                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                              {getFeedLabel(item.type, item.metadata)}
                                          </span>
                                      </div>
                                  </div>

                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <span className={`hidden md:inline-block text-xs font-bold uppercase tracking-wider mb-1 ${item.type === FeedType.NEWS ? 'text-indigo-500' : 'text-gray-400'}`}>
                                              {getFeedLabel(item.type, item.metadata)}
                                          </span>
                                          <h3 className={`text-lg font-bold ${item.type === FeedType.NEWS ? 'text-indigo-900' : 'text-gray-900'}`}>{item.title}</h3>
                                      </div>
                                      <span className="text-xs text-gray-400 whitespace-nowrap">
                                          {new Date(item.timestamp).toLocaleString()}
                                      </span>
                                  </div>

                                  <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{item.description}</p>

                                  {/* Item Metadata / Visuals */}
                                  {/* News Media */}
                                  {item.type === FeedType.NEWS && item.metadata?.mediaUrl && (
                                       <div className="mt-3 mb-3 rounded-lg overflow-hidden">
                                           {item.metadata.mediaType === 'video' ? (
                                               <video src={item.metadata.mediaUrl} controls className="w-full max-h-64 object-contain mx-auto bg-black" />
                                           ) : item.metadata.mediaType === 'pdf' ? (
                                               <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors">
                                                   <div className="bg-red-100 p-2.5 rounded-lg text-red-600">
                                                       <FileText size={24} />
                                                   </div>
                                                   <div className="flex-1 overflow-hidden">
                                                       <p className="text-sm font-bold text-gray-900 truncate">{item.metadata.attachmentName || 'Attached Document.pdf'}</p>
                                                       <p className="text-xs text-gray-500">PDF Document</p>
                                                   </div>
                                                   <a 
                                                       href={item.metadata.mediaUrl} 
                                                       download={item.metadata.attachmentName || 'document.pdf'} 
                                                       className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-800 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-teal-50 transition-colors shadow-sm"
                                                   >
                                                       <Download size={16} /> Download
                                                   </a>
                                               </div>
                                           ) : (
                                               <img src={item.metadata.mediaUrl} alt="News Media" className="w-full max-h-64 object-contain mx-auto rounded-lg border border-gray-200 bg-gray-50" />
                                           )}
                                       </div>
                                  )}
                                  
                                  {/* Product Image */}
                                  {item.metadata?.productImage && item.type !== FeedType.NEWS && (
                                      <div className="mt-3 mb-3 h-48 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                          <img src={item.metadata.productImage} alt="Product" className="w-full h-full object-cover" />
                                      </div>
                                  )}

                                  {/* External Links (News) */}
                                  {item.type === FeedType.NEWS && item.metadata?.newsUrl && (
                                      <div className="mt-2">
                                          <a href={item.metadata.newsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                              {t('read_more')} <LinkIcon size={14} />
                                          </a>
                                      </div>
                                  )}

                                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                          {item.authorName.charAt(0)}
                                      </div>
                                      <span className="text-xs font-medium text-gray-700">{item.authorName}</span>
                                      <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100">
                                          {item.authorRole}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
              </>
          )}
      </div>

      {/* Ad Creation Modal */}
      {isAdModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Megaphone size={20} className="text-yellow-500" />
                          {t('create_ad')}
                      </h3>
                      <button onClick={() => setIsAdModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6 overflow-y-auto">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('select_product')}</label>
                          <select 
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                            onChange={(e) => setAdSelectedProduct(supplierProducts.find(p => p.id === e.target.value) || null)}
                            value={adSelectedProduct?.id || ''}
                          >
                              <option value="">-- Choose from inventory --</option>
                              {supplierProducts.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} - {p.stockLevel} units</option>
                              ))}
                          </select>
                      </div>

                      {adSelectedProduct && (
                          <div className="bg-gray-50 p-4 rounded-lg flex gap-4 items-start border border-gray-200">
                              <img src={adSelectedProduct.image} alt="" className="w-16 h-16 rounded object-cover bg-white" />
                              <div>
                                  <p className="font-bold text-gray-900">{adSelectedProduct.name}</p>
                                  <p className="text-xs text-gray-500 line-clamp-2">{adSelectedProduct.description}</p>
                                  <p className="text-sm font-bold text-teal-600 mt-1">${adSelectedProduct.price}</p>
                              </div>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('ad_duration')}</label>
                          <select 
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                            value={adDuration}
                            onChange={(e) => setAdDuration(Number(e.target.value))}
                          >
                              <option value={1}>1 {t('days')}</option>
                              <option value={3}>3 {t('days')}</option>
                              <option value={7}>7 {t('days')}</option>
                              <option value={14}>14 {t('days')}</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Admin defined duration limits.</p>
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button onClick={() => setIsAdModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                          {t('cancel')}
                      </button>
                      <button 
                        onClick={handleCreateAd} 
                        disabled={!adSelectedProduct}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                          <Crown size={16} /> {t('promote_product')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Admin News Modal */}
      {isNewsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Info size={20} className="text-indigo-600" />
                          {t('post_news')}
                      </h3>
                      <button onClick={() => setIsNewsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleCreateNews} className="p-6 space-y-4 overflow-y-auto">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('news_title')}</label>
                          <input required type="text" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('news_content')}</label>
                          <textarea required rows={4} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (Image/Video/PDF)</label>
                          
                          <div className="flex gap-4 mb-2">
                              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="inputType" 
                                    checked={inputType === 'url'} 
                                    onChange={() => { setInputType('url'); setNewsForm({...newsForm, mediaUrl: '', attachmentName: '', mediaType: 'image'}) }}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>Use URL</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="inputType" 
                                    checked={inputType === 'file'} 
                                    onChange={() => { setInputType('file'); setNewsForm({...newsForm, mediaUrl: '', attachmentName: '', mediaType: 'image'}) }}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>Upload File</span>
                              </label>
                          </div>

                          {inputType === 'url' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                      <select className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                          value={newsForm.mediaType} onChange={e => setNewsForm({...newsForm, mediaType: e.target.value as any})}>
                                          <option value="image">Image</option>
                                          <option value="video">Video</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('media_url')}</label>
                                      <input type="text" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                          value={newsForm.mediaUrl} onChange={e => setNewsForm({...newsForm, mediaUrl: e.target.value})} placeholder="https://..." />
                                  </div>
                              </div>
                          ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                                  <input 
                                    type="file" 
                                    id="file-upload" 
                                    className="hidden" 
                                    accept="image/*,video/*,application/pdf"
                                    onChange={handleFileChange}
                                  />
                                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                      {newsForm.attachmentName ? (
                                          <div className="flex items-center gap-2 text-indigo-600 font-medium">
                                              <CheckCircle size={20} />
                                              {newsForm.attachmentName}
                                          </div>
                                      ) : (
                                          <>
                                              <Upload size={24} className="text-gray-400 mb-2" />
                                              <span className="text-sm text-gray-600">Click to upload Image, Video or PDF</span>
                                          </>
                                      )}
                                  </label>
                              </div>
                          )}
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('external_link')}</label>
                          <input type="text" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              value={newsForm.externalLink} onChange={e => setNewsForm({...newsForm, externalLink: e.target.value})} placeholder="Optional read more link" />
                      </div>

                      <div className="pt-2 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsNewsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                              {t('cancel')}
                          </button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm flex items-center gap-2">
                              <Send size={16} /> {t('post')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
