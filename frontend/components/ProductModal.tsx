
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Order, OrderStatus, User as UserType, ChildPharmacy, UserRole } from '../types';
import { AIService } from '../services/aiService';
import { DataService } from '../services/mockData';
import { X, ShoppingCart, Sparkles, Loader2, FileText, Activity, Globe, Package, Video, Play, ChevronLeft, ChevronRight, Image as ImageIcon, Phone, MessageCircle, Mail, User, CheckCircle, Languages, ChevronRight as ChevronRightIcon, Gift, Download, FileCheck, Handshake } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  /**
   * Called once per (pharmacy, quantity) pair the user wants to add.
   * - Non-masters: called once with no customerId (defaults to the requester).
   * - Pharmacy Masters: called once per selected child pharmacy with that pharmacy's id.
   */
  onRequestOrder: (product: Product, quantity: number, customerId?: string) => void;
  viewMode?: 'order' | 'interest';
  /** Pass the current user so the modal can render the multi-pharmacy grid for masters. */
  currentUser?: UserType;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onRequestOrder, viewMode = 'order', currentUser }) => {
  const { t, dir } = useLanguage();
  const [quantity, setQuantity] = useState<number>(1);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'ai' | 'video'>('details');
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [itemAdded, setItemAdded] = useState(false);
  
  // Translation State
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Pharmacy Master multi-pharmacy state — keyed by pharmacy id; only items with qty > 0 get added to cart.
  const isMaster = currentUser?.role === UserRole.PHARMACY_MASTER;
  const childPharmacies: ChildPharmacy[] = currentUser?.childPharmacies ?? [];
  const [perPharmacyQty, setPerPharmacyQty] = useState<Record<string, number>>({});

  // Combine main image and gallery images into one list for the carousel
  const allImages = [product.image, ...(product.images || [])].filter(Boolean);

  useEffect(() => {
      setSelectedImage(product.image);
      setActiveTab('details');
      setItemAdded(false);
      setQuantity(1);
      setTranslatedDesc(null);
      setIsTranslating(false);
      setPerPharmacyQty({});
  }, [product]);

  // Bonus Calculation Logic
  const bonusQuantity = useMemo(() => {
      if (!product.bonusThreshold || !product.bonusValue || quantity < product.bonusThreshold) {
          return 0;
      }
      if (product.bonusType === 'fixed') {
          return product.bonusValue;
      } else {
          // Percentage
          return Math.floor(quantity * (product.bonusValue / 100));
      }
  }, [product, quantity]);

  // Aggregate the master's per-pharmacy selection so we can show totals + drive button enablement.
  const masterSelection = useMemo(() => {
    const entries = Object.entries(perPharmacyQty).filter(([_id, q]) => q > 0);
    const totalQty = entries.reduce((sum, [_id, q]) => sum + q, 0);
    let totalBonus = 0;
    if (product.bonusThreshold && product.bonusValue) {
      for (const [, q] of entries) {
        if (q >= product.bonusThreshold) {
          totalBonus += product.bonusType === 'fixed'
            ? product.bonusValue
            : Math.floor(q * (product.bonusValue / 100));
        }
      }
    }
    return { entries, totalQty, totalBonus, count: entries.length };
  }, [perPharmacyQty, product]);

  const handleRequest = () => {
    if (isMaster && childPharmacies.length > 0) {
      if (masterSelection.entries.length === 0) return;
      // Submit one onRequestOrder call per selected child pharmacy
      masterSelection.entries.forEach(([pharmacyId, qty]) => {
        onRequestOrder(product, qty, pharmacyId);
      });
      setItemAdded(true);
      setPerPharmacyQty({});
      setTimeout(() => setItemAdded(false), 2000);
      return;
    }
    onRequestOrder(product, quantity);
    setItemAdded(true);
    setQuantity(1);
    setTimeout(() => setItemAdded(false), 2000);
  };

  const setPharmQty = (pharmacyId: string, q: number) => {
    setPerPharmacyQty(prev => ({ ...prev, [pharmacyId]: Math.max(0, q) }));
  };

  const handleAiAnalysis = async () => {
    setActiveTab('ai');
    if (!aiAnalysis) {
      setLoadingAi(true);
      const result = await AIService.analyzeProduct(product);
      setAiAnalysis(result);
      setLoadingAi(false);
    }
  };

  const handleTranslate = async () => {
    if (translatedDesc) return;
    setIsTranslating(true);
    const translation = await AIService.translateToArabic(product.description);
    setTranslatedDesc(translation);
    setIsTranslating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" dir={dir}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]">
        
        {/* Gallery / Media Section */}
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Left: Media Gallery */}
            <div className="h-72 md:h-auto md:w-1/2 bg-gray-100 flex flex-col shrink-0">
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                    <img src={selectedImage} alt={product.name} className="max-w-full max-h-full object-contain" />
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 left-4 rtl:left-auto rtl:right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 md:hidden z-10"
                    >
                        <X size={20} />
                    </button>
                    
                    {/* Badge Overlay */}
                     <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white">
                             <p className="text-sm font-bold truncate">{product.name}</p>
                             <p className="text-xs text-gray-300 truncate">{product.brandName || product.manufacturer}</p>
                        </div>
                    </div>
                </div>
                
                {/* Thumbnails */}
                {allImages.length > 1 && (
                    <div className="h-16 md:h-20 bg-white border-t border-gray-200 p-2 flex gap-2 overflow-x-auto shrink-0">
                        {allImages.map((img, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setSelectedImage(img)}
                                className={`h-full aspect-square rounded-md overflow-hidden border-2 transition-all shrink-0 ${selectedImage === img ? 'border-teal-600 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Details & Actions */}
            <div className="flex-1 md:w-1/2 flex flex-col bg-white relative min-h-0">
                 <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-gray-400 hover:text-gray-600 z-10 hidden md:block"
                >
                    <X size={24} />
                </button>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 pt-2 px-2 shrink-0 bg-white z-10">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${activeTab === 'details' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    >
                        <FileText size={16} /> {t('details')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('specs')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${activeTab === 'specs' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    >
                        <Activity size={16} /> {t('tab_specs')}
                    </button>
                    {product.video && (
                         <button 
                            onClick={() => setActiveTab('video')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${activeTab === 'video' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                        >
                            <Video size={16} /> {t('tab_video')}
                        </button>
                    )}
                    <button 
                        onClick={handleAiAnalysis}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${activeTab === 'ai' ? 'text-purple-600 border-purple-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    >
                        <Sparkles size={16} /> {t('tab_ai')}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div>
                                {/* Category Breadcrumbs */}
                                <div className="flex items-center flex-wrap gap-1 text-xs text-gray-500 mb-2">
                                    <span className="font-medium text-teal-700">{product.categoryLevel1}</span>
                                    {product.categoryLevel2 && (
                                        <>
                                            <ChevronRightIcon size={12} />
                                            <span>{product.categoryLevel2}</span>
                                        </>
                                    )}
                                    {product.categoryLevel3 && (
                                        <>
                                            <ChevronRightIcon size={12} />
                                            <span>{product.categoryLevel3}</span>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{product.name}</h2>
                                    {product.stockLevel <= 0 ? (
                                         <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200 whitespace-nowrap">{t('status_out_of_stock')}</span>
                                    ) : (
                                         <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full border border-green-200 whitespace-nowrap">{t('in_stock')}</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mb-2">{product.manufacturer} • {product.countryOfOrigin}</p>
                                
                                {product.productRegistrationDataUrl && (
                                    <div className="mb-4">
                                        <a 
                                            href={product.productRegistrationDataUrl} 
                                            download={product.productRegistrationFileName || 'Product_Registration.pdf'}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                                        >
                                            <FileCheck size={14} />
                                            View Registration Document
                                        </a>
                                    </div>
                                )}

                                {/* Bonus Offer Badge - Only show in 'order' mode */}
                                {viewMode === 'order' && product.bonusThreshold && product.bonusThreshold > 0 && (
                                    <div className="bg-pink-50 border border-pink-100 rounded-lg p-3 mb-4 flex items-start gap-3">
                                        <Gift className="text-pink-500 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-sm font-bold text-pink-700">{t('bonus_offer')}</p>
                                            <p className="text-xs text-pink-600">
                                                {t('buy')} <span className="font-bold">{product.bonusThreshold}</span>+, 
                                                {t('get')} {product.bonusType === 'fixed' ? `${product.bonusValue} ${t('free_items')}` : `${product.bonusValue}% ${t('extra_free')}`}.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('description')}</h3>
                                <p className="text-gray-700 text-sm leading-relaxed">{product.description}</p>
                                
                                {/* AI Translation Tool */}
                                <div className="mt-2">
                                    {isTranslating ? (
                                        <div className="flex items-center gap-2 text-xs text-teal-600 animate-pulse mt-2">
                                            <Loader2 size={12} className="animate-spin"/> {t('translating')}
                                        </div>
                                    ) : translatedDesc ? (
                                        <div className="mt-2 p-3 bg-teal-50/50 rounded-lg border border-teal-100 text-right shadow-sm" dir="rtl">
                                            <div className="flex items-center gap-1.5 text-xs text-teal-700 font-bold mb-1">
                                                <Languages size={12} /> ترجمة
                                            </div>
                                            <p className="text-sm text-gray-800 leading-relaxed font-['Almarai']">{translatedDesc}</p>
                                            <p className="text-[10px] text-gray-400 mt-1 text-left" dir="ltr">{t('translated_by_ai')}</p>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleTranslate}
                                            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors mt-2 p-1.5 hover:bg-teal-50 rounded-md -ml-1.5"
                                        >
                                            <Languages size={14} /> {t('translate_to_arabic')}
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-teal-600 font-bold uppercase mb-1">{t('unit_price')}</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</p>
                                        <span className="text-sm font-medium text-teal-800">/ {product.unitOfMeasurement || 'Unit'}</span>
                                    </div>
                                </div>
                                <div className="text-right rtl:text-left">
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">{t('supplier')}</p>
                                    <p className="text-sm font-medium text-teal-800">{product.supplierName}</p>
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-xs text-gray-500 uppercase font-semibold">{t('sku')}</span>
                                    <span className="text-sm font-semibold text-gray-900 truncate">{product.sku}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-xs text-gray-500 uppercase font-semibold">{t('category')}</span>
                                    <span className="text-sm font-semibold text-gray-900 truncate">{product.categoryLevel1}</span>
                                </div>
                            </div>

                            {/* Medical Representative Card */}
                            {(product.medicalRepName || product.medicalRepPhone || product.medicalRepEmail) && (
                                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <User size={16} className="text-teal-600"/> 
                                        {t('med_rep')}
                                    </h4>
                                    <div className="space-y-3">
                                        {product.medicalRepName && (
                                            <p className="text-sm font-medium text-gray-800">{product.medicalRepName}</p>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            {product.medicalRepEmail && (
                                                <a href={`mailto:${product.medicalRepEmail}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-teal-600 transition-colors">
                                                    <Mail size={14} /> {product.medicalRepEmail}
                                                </a>
                                            )}
                                            {product.medicalRepPhone && (
                                                <a href={`tel:${product.medicalRepPhone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-teal-600 transition-colors">
                                                    <Phone size={14} /> {product.medicalRepPhone}
                                                </a>
                                            )}
                                            {product.medicalRepWhatsapp && (
                                                <a 
                                                    href={`https://wa.me/${product.medicalRepWhatsapp.replace(/[^0-9]/g, '')}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 transition-colors font-medium"
                                                >
                                                    <MessageCircle size={14} /> {t('chat_whatsapp')}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'specs' && (
                        <div className="space-y-4 pb-2">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detailed Specifications</h3>
                             <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <tbody className="divide-y divide-gray-200">
                                        <tr className="bg-gray-50"><td className="px-4 py-3 font-medium text-gray-500 w-1/3">{t('generic_name')}</td><td className="px-4 py-3 text-gray-900">{product.genericName || '-'}</td></tr>
                                        <tr><td className="px-4 py-3 font-medium text-gray-500">{t('brand_name')}</td><td className="px-4 py-3 text-gray-900">{product.brandName || '-'}</td></tr>
                                        <tr className="bg-gray-50"><td className="px-4 py-3 font-medium text-gray-500">{t('manufacturer')}</td><td className="px-4 py-3 text-gray-900">{product.manufacturer}</td></tr>
                                        <tr><td className="px-4 py-3 font-medium text-gray-500">{t('origin')}</td><td className="px-4 py-3 text-gray-900">{product.countryOfOrigin || '-'}</td></tr>
                                        <tr className="bg-gray-50"><td className="px-4 py-3 font-medium text-gray-500">{t('dosage_form')}</td><td className="px-4 py-3 text-gray-900">{product.dosageForm || '-'}</td></tr>
                                        <tr><td className="px-4 py-3 font-medium text-gray-500">{t('strength')}</td><td className="px-4 py-3 text-gray-900">{product.strength || '-'}</td></tr>
                                        <tr className="bg-gray-50"><td className="px-4 py-3 font-medium text-gray-500">{t('pack_size')}</td><td className="px-4 py-3 text-gray-900">{product.packSize || '-'}</td></tr>
                                        <tr><td className="px-4 py-3 font-medium text-gray-500">{t('registration_no')}</td><td className="px-4 py-3 text-gray-900">{product.registrationNumber || '-'}</td></tr>
                                        <tr className="bg-gray-50"><td className="px-4 py-3 font-medium text-gray-500">{t('therapeutic_class')}</td><td className="px-4 py-3 text-gray-900">{product.therapeuticClass || '-'}</td></tr>
                                        <tr><td className="px-4 py-3 font-medium text-gray-500">{t('indication')}</td><td className="px-4 py-3 text-gray-900">{product.indication || '-'}</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Product Registration Document */}
                            {product.productRegistrationDataUrl && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                                            <FileText className="text-teal-600" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Product Registration Document</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{product.productRegistrationFileName || 'Registration.pdf'}</p>
                                        </div>
                                    </div>
                                    <a 
                                        href={product.productRegistrationDataUrl} 
                                        download={product.productRegistrationFileName || 'Product_Registration.pdf'}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                    >
                                        <Download size={14} /> Download PDF
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'video' && product.video && (
                        <div className="h-full flex flex-col">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Product Demonstration</h3>
                             <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-sm flex items-center justify-center relative group min-h-[200px]">
                                <video 
                                    src={product.video} 
                                    controls 
                                    className="w-full h-full max-h-[400px]"
                                    playsInline
                                >
                                    Your browser does not support the video tag.
                                </video>
                             </div>
                             <p className="text-xs text-gray-500 mt-2 text-center">Video provided by {product.supplierName}</p>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="h-full">
                        {loadingAi ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <p>{t('ai_analyzing')}</p>
                            </div>
                        ) : (
                            <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 text-purple-900 h-full overflow-y-auto">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="text-purple-600" size={20} />
                                <h3 className="font-semibold">{t('ai_summary')}</h3>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                                {aiAnalysis}
                            </p>
                            </div>
                        )}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-3 shrink-0 safe-area-bottom">
                    {viewMode === 'order' && isMaster && childPharmacies.length > 0 ? (
                        /* ── Pharmacy Master multi-pharmacy mode ── */
                        <>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                {t('add_to_cart_for')}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                                {childPharmacies.map(p => {
                                    const qty = perPharmacyQty[p.id] || 0;
                                    const isSelected = qty > 0;
                                    const pharmacyBonus = product.bonusThreshold && product.bonusValue && qty >= product.bonusThreshold
                                        ? (product.bonusType === 'fixed'
                                            ? product.bonusValue
                                            : Math.floor(qty * (product.bonusValue / 100)))
                                        : 0;
                                    return (
                                        <div
                                            key={p.id}
                                            className={`flex items-center gap-2 bg-white border rounded-lg p-2 transition-colors ${isSelected ? 'border-teal-500 ring-1 ring-teal-500' : 'border-gray-200'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => setPharmQty(p.id, e.target.checked ? Math.max(1, qty) : 0)}
                                                className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 shrink-0"
                                            />
                                            <span className="text-xs font-bold text-gray-800 flex-1 truncate" title={p.name}>{p.name}</span>
                                            <div className="flex items-center bg-gray-50 border border-gray-300 rounded h-7 shrink-0">
                                                <button
                                                    type="button"
                                                    className="px-1.5 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                                                    onClick={() => setPharmQty(p.id, qty - 1)}
                                                    disabled={qty <= 0 || itemAdded}
                                                >−</button>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className="w-12 h-full text-center text-xs bg-transparent border-none focus:ring-0 text-gray-800"
                                                    value={qty}
                                                    onChange={(e) => setPharmQty(p.id, parseInt(e.target.value) || 0)}
                                                    disabled={itemAdded}
                                                />
                                                <button
                                                    type="button"
                                                    className="px-1.5 h-full text-gray-600 hover:bg-gray-100"
                                                    onClick={() => setPharmQty(p.id, qty + 1)}
                                                    disabled={itemAdded}
                                                >+</button>
                                            </div>
                                            {pharmacyBonus > 0 && (
                                                <span className="text-[9px] font-bold text-pink-600 whitespace-nowrap">+{pharmacyBonus}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {masterSelection.count > 0 && (
                                <div className="flex items-center justify-between text-[11px] text-gray-600 px-1">
                                    <span>{masterSelection.count} {masterSelection.count === 1 ? 'pharmacy' : 'pharmacies'} • {masterSelection.totalQty} {product.unitOfMeasurement}s total</span>
                                    {masterSelection.totalBonus > 0 && (
                                        <span className="font-bold text-pink-600">+ {masterSelection.totalBonus} {t('free_items')}</span>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="h-10 px-4 rounded-lg font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
                                >
                                    {t('close')}
                                </button>
                                <button
                                    onClick={handleRequest}
                                    disabled={product.stockLevel === 0 || itemAdded || masterSelection.count === 0}
                                    className={`flex-1 h-10 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all shadow-md
                                        ${itemAdded
                                            ? 'bg-green-600 shadow-none cursor-default'
                                            : (product.stockLevel > 0 && masterSelection.count > 0)
                                                ? 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg'
                                                : 'bg-gray-400 cursor-not-allowed'}`}
                                >
                                    {itemAdded ? (
                                        <><CheckCircle size={18} /> {t('item_added')}</>
                                    ) : (
                                        <><ShoppingCart size={18} />
                                          {product.stockLevel === 0 ? t('unavailable') : `${t('add_to_cart')} (${masterSelection.count})`}
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* ── Standard single-quantity mode ── */
                        <div className="flex items-center gap-3">
                            {viewMode === 'order' ? (
                                <>
                                    <div className="flex items-center bg-white border border-gray-300 rounded-lg h-10 shadow-sm shrink-0">
                                        <button
                                            className="px-3 h-full hover:bg-gray-100 text-gray-600 font-bold border-r rtl:border-l rtl:border-r-0 disabled:opacity-50"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            disabled={itemAdded}
                                        >−</button>
                                        <input
                                            type="number"
                                            className="w-16 h-full text-center border-none focus:ring-0 text-gray-800"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            disabled={itemAdded}
                                        />
                                        <button
                                            className="px-3 h-full hover:bg-gray-100 text-gray-600 font-bold border-l rtl:border-l-0 rtl:border-r disabled:opacity-50"
                                            onClick={() => setQuantity(quantity + 1)}
                                            disabled={itemAdded}
                                        >+</button>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-500">{product.unitOfMeasurement}s</span>
                                        {bonusQuantity > 0 && (
                                            <span className="text-xs font-bold text-pink-600 flex items-center gap-1">
                                                + {bonusQuantity} {t('free_items')}
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-gray-500 flex-1">
                                    Express interest to discuss distribution rights.
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="ml-auto h-10 px-4 rounded-lg font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
                            >
                                {t('close')}
                            </button>

                            <button
                                onClick={handleRequest}
                                disabled={(viewMode === 'order' && product.stockLevel === 0) || itemAdded}
                                className={`flex-1 h-10 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all shadow-md
                                    ${itemAdded
                                        ? 'bg-green-600 shadow-none cursor-default'
                                        : (viewMode === 'interest' || product.stockLevel > 0)
                                            ? 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg'
                                            : 'bg-gray-400 cursor-not-allowed'}`}
                            >
                                {itemAdded ? (
                                    <><CheckCircle size={18} /> {viewMode === 'interest' ? 'Interest Sent' : t('item_added')}</>
                                ) : viewMode === 'interest' ? (
                                    <><Handshake size={18} /> Express Interest</>
                                ) : (
                                    <><ShoppingCart size={18} />
                                      {product.stockLevel > 0 ? t('add_to_cart') : t('unavailable')}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};
