
import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<string, { en: string; ar: string }> = {
  // Navigation
  'nav_home': { en: 'Home', ar: 'الرئيسية' },
  'nav_catalog': { en: 'Product Catalog', ar: 'كتالوج المنتجات' },
  'nav_requests': { en: 'My Requests', ar: 'طلباتي' },
  'nav_dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'nav_orders': { en: 'Orders & Inventory', ar: 'الطلبات والمخزون' },
  'nav_partners': { en: 'Global Partners', ar: 'شركاء عالميون' },
  'nav_admin': { en: 'Admin Panel', ar: 'لوحة الإدارة' },
  'nav_reports': { en: 'Reports', ar: 'التقارير' },

  // General
  'sign_in': { en: 'Sign In', ar: 'تسجيل الدخول' },
  'register_company': { en: 'Register Company', ar: 'تسجيل شركة' },
  'email_placeholder': { en: 'Email address', ar: 'البريد الإلكتروني' },
  'password': { en: 'Password', ar: 'كلمة المرور' },
  'dont_have_account': { en: "Don't have an account?", ar: 'ليس لديك حساب؟' },
  'welcome': { en: 'Welcome', ar: 'مرحباً' },
  'logout': { en: 'Logout', ar: 'تسجيل الخروج' },
  'back': { en: 'Back', ar: 'عودة' },
  'save': { en: 'Save', ar: 'حفظ' },
  'cancel': { en: 'Cancel', ar: 'إلغاء' },
  'close': { en: 'Close', ar: 'إغلاق' },
  'submit_app': { en: 'Submit Application', ar: 'تقديم الطلب' },
  'search_placeholder': { en: 'Search...', ar: 'بحث...' },
  'all': { en: 'All', ar: 'الكل' },
  
  // Reporting
  'total_revenue': { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  'total_spend': { en: 'Total Spend', ar: 'إجمالي الإنفاق' },
  'order_volume': { en: 'Order Volume', ar: 'حجم الطلبات' },
  'fulfillment_rate': { en: 'Fulfillment Rate', ar: 'معدل التنفيذ' },
  'category_spend': { en: 'Spending by Category', ar: 'الإنفاق حسب الفئة' },
  'top_suppliers': { en: 'Top Suppliers', ar: 'أفضل الموردين' },
  'top_customers': { en: 'Top Customers', ar: 'أفضل العملاء' },
  'avg_processing_time': { en: 'Avg. Processing Time', ar: 'متوسط وقت المعالجة' },
  'analytics_summary': { en: 'Analytics Summary', ar: 'ملخص التحليلات' },

  // Returns & Confirmation
  'confirm_receipt': { en: 'Confirm Receipt', ar: 'تأكيد الاستلام' },
  'request_return': { en: 'Request Return', ar: 'طلب إرجاع' },
  'confirm_receipt_desc': { en: 'I have received the items and they match my requirements.', ar: 'لقد استلمت العناصر وهي تطابق متطلباتي.' },
  'return_reason_label': { en: 'Reason for Return', ar: 'سبب الإرجاع' },
  'reason_damaged': { en: 'Damaged during shipping', ar: 'تالف أثناء الشحن' },
  'reason_broken': { en: 'Broken / Non-functional', ar: 'مكسور / لا يعمل' },
  'reason_mismatch': { en: 'Does not match product details', ar: 'لا يطابق تفاصيل المنتج' },
  'reason_other': { en: 'Other reason', ar: 'سبب آخر' },
  'return_notes_placeholder': { en: 'Additional details about the issue...', ar: 'تفاصيل إضافية حول المشكلة...' },
  'submit_return': { en: 'Submit Return Request', ar: 'إرسال طلب الإرجاع' },

  // Statuses & Workflow
  'status_received': { en: 'Received', ar: 'تم الاستلام' },
  'status_in_progress': { en: 'In Progress', ar: 'قيد التنفيذ' },
  'status_fulfilled': { en: 'Fulfilled', ar: 'تم التنفيذ' },
  'status_completed': { en: 'Delivered', ar: 'تم التوصيل' },
  'status_confirmed': { en: 'Confirmed by Customer', ar: 'مؤكد من العميل' },
  'status_returned': { en: 'Return Requested', ar: 'طلب إرجاع' },
  'status_declined': { en: 'Declined', ar: 'مرفوض' },
  'status_out_of_stock': { en: 'Out of Stock', ar: 'نفد المخزون' },
  'status_shipment_otw': { en: 'Shipment On The Way', ar: 'الشحنة بالطريق' },
  'status_pending_approval': { en: 'Pending Customer Approval', ar: 'بانتظار موافقة العميل' },
  'decline_reason': { en: 'Decline Reason', ar: 'سبب الرفض' },

  // ... (rest of translations remain same)
  'sort_name_asc': { en: 'Name (A-Z)', ar: 'الاسم (أ-ي)' },
  'sort_name_desc': { en: 'Name (Z-A)', ar: 'الاسم (ي-أ)' },
  'sort_supplier_asc': { en: 'Supplier (A-Z)', ar: 'المورد (أ-ي)' },
  'sort_supplier_desc': { en: 'Supplier (Z-A)', ar: 'المورد (ي-أ)' },
  'sort_manufacturer_asc': { en: 'Manufacturer (A-Z)', ar: 'المصنع (أ-ي)' },
  'sort_manufacturer_desc': { en: 'Manufacturer (Z-A)', ar: 'المصنع (ي-أ)' },
  'sort_price_asc': { en: 'Price (Low to High)', ar: 'السعر (من الأقل للأعلى)' },
  'sort_price_desc': { en: 'Price (High to Low)', ar: 'السعر (من الأعلى للأقل)' },
  'search_requests_placeholder': { en: 'Search product or supplier...', ar: 'ابحث عن منتج أو مورد...' },
  'filter_status': { en: 'Status', ar: 'الحالة' },
  'filter_supplier': { en: 'Supplier', ar: 'المورد' },
  'all_suppliers': { en: 'All Suppliers', ar: 'كل الموردين' },
  'sort_by': { en: 'Sort By', ar: 'ترتيب حسب' },
  'sort_date_newest': { en: 'Date (Newest)', ar: 'التاريخ (الأحدث)' },
  'sort_date_oldest': { en: 'Date (Oldest)', ar: 'التاريخ (الأقدم)' },
  'sort_qty_highest': { en: 'Quantity (Highest)', ar: 'الكمية (الأعلى)' },
  'sort_qty_lowest': { en: 'Quantity (Lowest)', ar: 'الكمية (الأقل)' },
  'no_matching_requests': { en: 'No requests found matching your filters.', ar: 'لم يتم العور على طلبات تطابق الفلاتر المختارة.' },
  'chat_title': { en: 'Conversation', ar: 'محادثة' },
  'chat_placeholder': { en: 'Type a message...', ar: 'اكتب رسالة...' },
  'chat_send': { en: 'Send', ar: 'إرسال' },
  'chat_no_messages': { en: 'No messages yet. Start the conversation!', ar: 'لا توجد رسائل بعد. ابدأ المحادثة!' },
  'chat_with': { en: 'Chat with', ar: 'محادثة مع' },
  'contact_agent': { en: 'Contact Agent', ar: 'تواصل مع الممثل' },
  'contact_customer': { en: 'Contact Customer', ar: 'تواصل مع العميل' },
  'perm_manage_chats': { en: 'Manage Conversations', ar: 'إدارة المحادثات' },
  'hero_title': { en: 'Advanced Medical Procurement', ar: 'نظام المشتريات الطبية المتقدم' },
  'hero_desc': { en: 'Connect with verified suppliers, manage inventory with AI-driven insights, and streamline your medical supply chain.', ar: 'تواصل مع موردين موثوقين، وأدر مخزونك برؤى مدعومة بالذكاء الاصطناعي، وقم بتبسيط سلسلة التوريد الطبية الخاصة بك.' },
  'sign_in_subtitle': { en: 'Sign in to access your dashboard', ar: 'سجل الدخول للوصول إلى لوحة التحكم' },
  'role_customer': { en: 'Customer (Hospital/Pharmacy)', ar: 'عميل (مستشفى/صيدلية)' },
  'role_supplier': { en: 'Local Supplier', ar: 'مورد محلي' },
  'role_foreign_supplier': { en: 'Foreign Supplier', ar: 'مورد أجنبي' },
  'company_info': { en: 'Company Information', ar: 'معلومات الشركة' },
  'company_name': { en: 'Company Name', ar: 'اسم الشركة' },
  'address': { en: 'Address', ar: 'العنوان' },
  'address_hint': { en: '(Country/City)', ar: '(الدولة/المدينة)' },
  'website': { en: 'Website', ar: 'الموقع الإلكتروني' },
  'email_address': { en: 'Email Address', ar: 'البريد الإلكتروني' },
  'local_docs': { en: 'Local Verification Documents', ar: 'وثائق التحقق المحلية' },
  'intl_docs': { en: 'International Verification Documents', ar: 'وثائق التحقق الدولية' },
  'trade_license': { en: 'Trade License Number', ar: 'رقم الرخصة التجارية' },
  'expiry_date': { en: 'Expiry Date', ar: 'تاريخ الانتهاء' },
  'attach_license': { en: 'Attach Trade License', ar: 'إرفاق الرخصة التجارية' },
  'auth_signatory': { en: 'Authorized Signatory Name', ar: 'اسم المفوض بالتوقيع' },
  'signatory_expiry': { en: 'Visa/ID Expiry', ar: 'تاريخ انتهاء الهوية/الإقامة' },
  'attach_signatory': { en: 'Attach ID/Passport', ar: 'إرفاق الهوية/جواز السفر' },
  'business_type': { en: 'Business Type', ar: 'نوع العمل' },
  'iso_expiry': { en: 'ISO Certificate Expiry', ar: 'تاريخ انتهاء شهادة الآيزو' },
  'attach_iso': { en: 'Attach ISO Certificate', ar: 'إرفاق شهادة الآيزو' },
  'attach_lab': { en: 'Attach Lab Test Reports', ar: 'إرفاق تقارير المختبر' },
  'upload_file': { en: 'Upload a file', ar: 'رفع ملف' },
  'registration_successful': { en: 'Registration Submitted!', ar: 'تم تقديم التسجيل!' },
  'redirecting': { en: 'Redirecting to login...', ar: 'جاري التوجيه لتسجيل الدخول...' },
  'market_feed': { en: 'Market Feed', ar: 'أخبار السوق' },
  'news_feed': { en: 'News', ar: 'الأخبار' },
  'feed_all': { en: 'All', ar: 'الكل' },
  'feed_products': { en: 'Products', ar: 'المنتجات' },
  'feed_suppliers': { en: 'Suppliers', ar: 'الموردين' },
  'feed_stock': { en: 'Stock', ar: 'المخزون' },
  'feed_requests': { en: 'Requests', ar: 'الطلبات' },
  'post_news': { en: 'Post News', ar: 'نشر خبر' },
  'promote_product': { en: 'Promote Product', ar: 'ترويج منتج' },
  'request_content': { en: 'What are you looking for?', ar: 'عن ماذا تبحث؟' },
  'post_request_desc': { en: 'Suppliers will see this request.', ar: 'سيشاهد الموردون هذا الطلب.' },
  'post': { en: 'Post', ar: 'نشر' },
  'sponsored': { en: 'Sponsored', ar: 'ممول' },
  'expires_in': { en: 'Expires in', ar: 'ينتهي خلال' },
  'days': { en: 'days', ar: 'أيام' },
  'read_more': { en: 'Read More', ar: 'اقرأ المزيد' },
  'new_product': { en: 'New Product', ar: 'منتج جديد' },
  'new_supplier': { en: 'New Supplier', ar: 'مورد جديد' },
  'back_in_stock': { en: 'Back in Stock', ar: 'توفر بالمخزون' },
  'out_of_stock': { en: 'Out of Stock', ar: 'نفد المخزون' },
  'customer_request': { en: 'Customer Request', ar: 'طلب عميل' },
  'news_title': { en: 'Title', ar: 'العنوان' },
  'news_content': { en: 'Content', ar: 'المحتوى' },
  'media_url': { en: 'Media URL', ar: 'رابط الوسائط' },
  'external_link': { en: 'External Link', ar: 'رابط خارجي' },
  'create_ad': { en: 'Create Advertisement', ar: 'إنشاء إعلان' },
  'select_product': { en: 'Select Product', ar: 'اختر المنتج' },
  'ad_duration': { en: 'Duration', ar: 'المدة' },
  'details': { en: 'Details', ar: 'التفاصيل' },
  'sku': { en: 'SKU', ar: 'رمز المنتج' },
  'category': { en: 'Category', ar: 'الفئة' },
  'unit_price': { en: 'Unit Price', ar: 'سعر الوحدة' },
  'supplier': { en: 'Supplier', ar: 'المورد' },
  'manufacturer': { en: 'Manufacturer', ar: 'المصنع' },
  'brand_name': { en: 'Brand Name', ar: 'العلامة التجارية' },
  'generic_name': { en: 'Generic Name', ar: 'الاسم العلمي' },
  'description': { en: 'Description', ar: 'الوصف' },
  'add_to_cart': { en: 'Add to Cart', ar: 'أضف للسلة' },
  'item_added': { en: 'Added!', ar: 'تمت الإضافة!' },
  'unavailable': { en: 'Unavailable', ar: 'غير متوفر' },
  'bonus_offer': { en: 'Bonus Offer', ar: 'عرض إضافي' },
  'buy': { en: 'Buy', ar: 'اشتري' },
  'get': { en: 'Get', ar: 'احصل على' },
  'free_items': { en: 'Free Items', ar: 'عناصر مجانية' },
  'extra_free': { en: 'Extra Free', ar: 'زيادة مجانية' },
  'translate_to_arabic': { en: 'Translate to Arabic', ar: 'ترجم للعربية' },
  'translating': { en: 'Translating...', ar: 'جاري الترجمة...' },
  'translated_by_ai': { en: 'Translated by Gemini AI', ar: 'ترجمة بواسطة Gemini AI' },
  'med_rep': { en: 'Medical Representative', ar: 'الممثل الطبي' },
  'chat_whatsapp': { en: 'Chat on WhatsApp', ar: 'محادثة واتساب' },
  'tab_specs': { en: 'Specs', ar: 'المواصفات' },
  'tab_video': { en: 'Video', ar: 'فيديو' },
  'tab_ai': { en: 'AI Analysis', ar: 'تحليل الذكاء الاصطناعي' },
  'ai_analyzing': { en: 'Analyzing product data...', ar: 'جاري تحليل البيانات...' },
  'ai_summary': { en: 'AI Expert Summary', ar: 'ملخص الخبير الذكي' },
  'in_stock': { en: 'In Stock', ar: 'متوفر' },
  'origin': { en: 'Country of Origin', ar: 'بلد المنشأ' },
  'dosage_form': { en: 'Dosage Form', ar: 'الشكل الدوائي' },
  'strength': { en: 'Strength', ar: 'التركيز' },
  'pack_size': { en: 'Pack Size', ar: 'حجم العبوة' },
  'registration_no': { en: 'Registration No.', ar: 'رقم التسجيل' },
  'therapeutic_class': { en: 'Therapeutic Class', ar: 'الفئة العلاجية' },
  'indication': { en: 'Indication', ar: 'دواعي الاستعمال' },
  'cart_title': { en: 'Shopping Cart', ar: 'سلة التسوق' },
  'cart_empty': { en: 'Your cart is empty', ar: 'سلتك فارغة' },
  'checkout': { en: 'Submit Orders', ar: 'إرسال الطلبات' },
  'total_items': { en: 'Total Items', ar: 'إجمالي العناصر' },
  'total_est_cost': { en: 'Est. Cost', ar: 'التكلفة التقديرية' },
  'requests_grouped': { en: 'Requests will be sent to respective suppliers.', ar: 'سيتم إرسال الطلبات للموردين المعنيين.' },
  'dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'my_orders': { en: 'My Requests', ar: 'طلباتي' },
  'requests_analysis': { en: 'Requests Analysis', ar: 'تحليل الطلبات' },
  'status_history': { en: 'Status History', ar: 'سجل الحالة' },
  'no_products_found': { en: 'No items found.', ar: 'لم يتم العور على عناصر.' },
  'clear_filters': { en: 'Clear Filters', ar: 'مسح الفلاتر' },
  'all_categories': { en: 'All Categories', ar: 'كل الفئات' },
  'cat_l2': { en: 'Sub-Category', ar: 'فئة فرعية' },
  'cat_l3': { en: 'Class', ar: 'صنف' },
  'group_by': { en: 'Group By', ar: 'تجميع حسب' },
  'none': { en: 'None', ar: 'لا يوجد' },
  'total_requests': { en: 'Total Requests', ar: 'إجمالي الطلبات' },
  'tab_my_orders': { en: 'Received Orders', ar: 'الطلبات الواردة' },
  'tab_partnership': { en: 'Partnerships', ar: 'الشراكات' },
  'tab_portfolio': { en: 'Portfolio', ar: 'المحفظة' },
  'tab_inventory': { en: 'Inventory', ar: 'المخزون' },
  'tab_media': { en: 'Media Library', ar: 'مكتبة الوسائط' },
  'tab_find_foreign': { en: 'Find Foreign Suppliers', ar: 'البحث عن موردين أجانب' },
  'approve': { en: 'Approve', ar: 'قبول' },
  'reject': { en: 'Reject', ar: 'رفض' },
  'edit': { en: 'Edit', ar: 'تعديل' },
  'add_product': { en: 'Add Product', ar: 'إضافة منتج' },
  'user_management': { en: 'User Management', ar: 'إدارة المستخدمين' },
  'product_registry': { en: 'Product Registry', ar: 'سجل المنتجات' },
  'admin_dashboard': { en: 'Admin Dashboard', ar: 'لوحة تحكم المسؤول' },
  'pending_registrations': { en: 'Pending Registrations', ar: 'تسجيلات معلقة' },
  'active_directory': { en: 'Active Directory', ar: 'الدليل النشط' },
  'manage_team': { en: 'Manage Team', ar: 'إدارة الفريق' },
  'view_items': { en: 'View Items', ar: 'عرض العناصر' },
  'full_name': { en: 'Full Name', ar: 'الاسم الكامل' },
  'phone_number': { en: 'Phone Number', ar: 'رقم الهاتف' },
  'permissions': { en: 'Permissions', ar: 'الصلاحيات' },
  'add_user': { en: 'Add User', ar: 'إضافة مستخدم' },
  'document_expired': { en: 'Expired', ar: 'منتهي' },
  'expiring_soon': { en: 'Expiring Soon', ar: 'ينتهي قريباً' },
  'document_valid': { en: 'Valid', ar: 'صالح' },
  'local_only': { en: 'Local Only', ar: 'محلي فقط' },
  'foreign_only': { en: 'Foreign Only', ar: 'أجنبي فقط' },
  'all_types': { en: 'All Types', ar: 'كل الأنواع' },
  'contact_supplier': { en: 'Contact Supplier', ar: 'تواصل مع المورد' },
  'enter_decline_reason': { en: 'Please enter the reason for declining this request:', ar: 'يرجى إدخل سبب رفض هذا طلب:' },
  'confirm_decline': { en: 'Confirm Decline', ar: 'تأكيد الرفض' },
  'supplier_proposed_changes': { en: 'Supplier Proposed Changes', ar: 'اقتراح تغييرات من المورد' },
  'qty_changed_msg': { en: 'Quantity changed from', ar: 'تغيرت الكمية من' },
  'to': { en: 'to', ar: 'إلى' },
  'accept_changes': { en: 'Accept Changes', ar: 'قبول التغييرات' },
  'decline_order': { en: 'Decline Order', ar: 'رفض الطلب' },
  'confirm_process': { en: 'Confirm & Process', ar: 'تأكيد ومعالجة' },
  'review_qty': { en: 'Review Quantity', ar: 'مراجعة الكمية' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
