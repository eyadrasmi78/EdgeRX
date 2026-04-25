
export enum UserRole {
  CUSTOMER = 'CUSTOMER', // Hospital, Pharmacy
  SUPPLIER = 'SUPPLIER', // Local Agent, Vendor
  FOREIGN_SUPPLIER = 'FOREIGN_SUPPLIER', // International Manufacturer/Marketer
  ADMIN = 'ADMIN' // System Admin
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ForeignBusinessType {
  MANUFACTURER = 'Manufacturer',
  AUTHORIZED_MARKETING = 'Authorized Marketing Supplier'
}

export enum ProductCategory {
  MEDICINE = 'Medicine',
  DEVICE = 'Device',
  SUPPLEMENT = 'Supplement',
  HERB = 'Herb',
  EQUIPMENT = 'Equipment'
}

export enum OrderStatus {
  RECEIVED = 'Received',
  PENDING_CUSTOMER_APPROVAL = 'Pending Customer Approval', 
  IN_PROGRESS = 'In Progress',
  SHIPMENT_OTW = 'Shipment On The Way', 
  COMPLETED = 'Completed', // Supplier marked as delivered
  CONFIRMED_BY_CUSTOMER = 'Confirmed by Customer', // Final Verified State
  RETURN_REQUESTED = 'Return Requested', // Issues found
  DECLINED = 'Declined', 
  // Legacy support
  FULFILLED = 'Fulfilled',
  OUT_OF_STOCK = 'Out of Stock' 
}

export type ReturnReason = 'DAMAGED' | 'BROKEN' | 'INCORRECT_DETAILS' | 'OTHER';

export type Permission = 'VIEW_PRODUCTS' | 'MANAGE_PRODUCTS' | 'VIEW_ORDERS' | 'MANAGE_ORDERS' | 'ADMIN_ACCESS' | 'MANAGE_CHATS';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface ChatRoom {
  orderId: string;
  messages: ChatMessage[];
}

export interface FeedItem {
  id: string;
  type: FeedType;
  title: string;
  description: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  isPinned?: boolean; 
  expiryDate?: string; 
  metadata?: {
    productId?: string;
    productImage?: string;
    supplierId?: string;
    stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK';
    price?: number;
    newsUrl?: string; 
    mediaUrl?: string; 
    mediaType?: 'image' | 'video' | 'pdf';
    attachmentName?: string; 
  };
}

export enum FeedType {
  NEW_PRODUCT = 'NEW_PRODUCT',
  NEW_SUPPLIER = 'NEW_SUPPLIER',
  STOCK_UPDATE = 'STOCK_UPDATE',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  ADVERTISEMENT = 'ADVERTISEMENT',
  NEWS = 'NEWS'
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle?: string; // New field for categorization (e.g., Medical Rep)
  password: string;
  permissions: Permission[];
  createdAt: string;
}

export interface CompanyDetails {
  address: string;
  website: string;
  country?: string; 
  
  tradeLicenseNumber?: string;
  tradeLicenseExpiry?: string; 
  tradeLicenseFileName?: string; 
  tradeLicenseDataUrl?: string; 
  
  authorizedSignatory?: string;
  authorizedSignatoryExpiry?: string; 
  authorizedSignatoryFileName?: string; 
  authorizedSignatoryDataUrl?: string; 

  businessType?: ForeignBusinessType;
  isoCertificateFileName?: string;
  isoCertificateExpiry?: string;
  isoCertificateDataUrl?: string; 
  
  labTestFileName?: string; 
  labTestDataUrl?: string; 
}

export interface User {
  id: string;
  email: string;
  password: string; 
  name: string; 
  phone?: string; 
  role: UserRole;
  status: RegistrationStatus;
  companyDetails?: CompanyDetails;
  teamMembers?: TeamMember[]; 
}

export interface Product {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  registrationNumber?: string;
  countryOfOrigin?: string;
  indication?: string;
  therapeuticClass?: string;
  detailedCategory?: string; 
  
  productRegistrationFileName?: string;
  productRegistrationDataUrl?: string;

  manufacturer: string;
  supplierName: string; 
  supplierId?: string; 
  
  category: ProductCategory; 
  categoryLevel1: string; 
  categoryLevel2: string; 
  categoryLevel3: string; 

  description: string;
  price: number;
  unitOfMeasurement: string; 
  stockLevel: number;
  sku: string; 
  
  image: string; 
  images?: string[]; 
  video?: string; 

  bonusThreshold?: number; 
  bonusType?: 'percentage' | 'fixed';
  bonusValue?: number; 

  medicalRepName?: string;
  medicalRepEmail?: string;
  medicalRepPhone?: string;
  medicalRepWhatsapp?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderHistoryLog {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string; 
  orderNumber: string; 
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  supplierName: string;
  quantity: number;
  bonusQuantity?: number; 
  unitOfMeasurement: string; 
  status: OrderStatus;
  declineReason?: string; 
  date: string;
  statusHistory?: OrderHistoryLog[]; 
  
  // Return Tracking
  returnRequested?: boolean;
  returnReason?: ReturnReason;
  returnNote?: string;
}

export interface PartnershipRequest {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toForeignSupplierId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  date: string;
  message?: string;
  // New fields for product specific interest
  productId?: string;
  productName?: string;
  requestType?: 'GENERAL_CONNECTION' | 'PRODUCT_INTEREST';
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: number;
}