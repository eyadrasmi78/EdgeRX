
export enum UserRole {
  CUSTOMER = 'CUSTOMER', // Hospital, Pharmacy
  SUPPLIER = 'SUPPLIER', // Local Agent, Vendor
  FOREIGN_SUPPLIER = 'FOREIGN_SUPPLIER', // International Manufacturer/Marketer
  ADMIN = 'ADMIN', // System Admin
  PHARMACY_MASTER = 'PHARMACY_MASTER' // Owner of multiple pharmacy CUSTOMER accounts
}

/** Lightweight pharmacy reference used by Pharmacy Master flows. */
export interface ChildPharmacy {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER';
  status: RegistrationStatus;
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
  /** Populated when role === PHARMACY_MASTER */
  childPharmacies?: ChildPharmacy[];
  /** Populated for CUSTOMER users that have a master */
  master?: { id: string; name: string } | null;
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
  /** Populated when a Pharmacy Master adds the item on behalf of a child pharmacy. */
  onBehalfOfCustomerId?: string;
  onBehalfOfCustomerName?: string;
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
  supplierId?: string;
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

  /** When a Pharmacy Master placed the order on behalf of a child pharmacy. */
  placedByUserId?: string;
  placedByUserName?: string;

  /** When the order was released from a virtual buying group (Phase B). */
  buyingGroupId?: string;
  buyingGroupName?: string;

  /** Phase D2 — pricing source provenance per order line. */
  pricingSource?: 'CATALOG' | 'PROMO' | 'CONTRACT' | 'BUYING_GROUP';
  pricingAgreementId?: string | null;
  pricingAgreementVersion?: number | null;
  contractedUnitPrice?: number | null;
  catalogUnitPrice?: number | null;
  savingsAmount?: number | null;
}

/* ───── Buying Groups (Phase B — Feature 2) ───── */

export type BuyingGroupStatus =
  | 'OPEN'
  | 'COLLECTING'
  | 'LOCKED'
  | 'RELEASED'
  | 'DISSOLVED';

export type BuyingGroupMemberStatus =
  | 'INVITED'
  | 'COMMITTED'
  | 'ACCEPTED'
  | 'DECLINED';

export interface BuyingGroupMember {
  id: number;
  /** null when the viewer is a non-admin and this row is NOT theirs (privacy) */
  customerId: string | null;
  customerName: string | null;
  committedQuantity: number | null;
  apportionedBonus: number | null;
  status: BuyingGroupMemberStatus;
  resultingOrderId: string | null;
  isOwn: boolean;
}

export interface BuyingGroup {
  id: string;
  name: string;
  productId: string;
  productName?: string;
  productImage?: string;
  unitOfMeasurement?: string;
  productBonusThreshold?: number | null;
  productBonusType?: 'percentage' | 'fixed' | null;
  productBonusValue?: number | null;
  supplierId: string;
  supplierName?: string;
  targetQuantity: number;
  windowEndsAt?: string | null;
  status: BuyingGroupStatus;
  createdByAdminId: string;
  releasedAt?: string | null;
  dissolvedAt?: string | null;
  createdAt?: string;
  /** Aggregate stats — visible to every viewer (admin, member, master, supplier). */
  aggregate: {
    memberCount: number;
    acceptedCount: number;
    acceptedQuantity: number;
    committedQuantity: number;
    thresholdMet: boolean;
    percentToTarget: number;
  };
  /** Members — non-admins see ONLY their own row. */
  members: BuyingGroupMember[];
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

/* ───── Phase D1 — Pharmacy-to-Pharmacy Transfers ───── */

export type TransferStatus =
  | 'INITIATED'
  | 'SUPPLIER_REVIEW'
  | 'ACCEPTED_BY_SUPPLIER'
  | 'B_CONFIRMED'
  | 'QC_INTAKE'
  | 'QC_INSPECTION'
  | 'QC_PASSED'
  | 'QC_FAILED'
  | 'AWAITING_B_PAYMENT'
  | 'RELEASED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TransferDiscoveryMode = 'DIRECT' | 'MARKETPLACE';

export interface TransferRequestItem {
  id: number;
  productId: string;
  productName?: string;
  quantity: number;
  unitPriceRefund?: number;
  unitPriceResale?: number;
  lineRefund?: number;
  lineResale?: number;
  batchNumber: string;
  lotNumber?: string | null;
  expiryDate: string;
  gs1Barcode?: string | null;
  isColdChain?: boolean;
  temperatureLogPath?: string | null;
  photoPaths?: string[];
  qcStatus: 'PENDING' | 'PASSED' | 'FAILED';
  qcFailedReason?: string | null;
}

export interface TransferRequest {
  id: string;
  sourceUserId: string;
  sourceUserName?: string;
  targetUserId?: string | null;
  targetUserName?: string | null;
  supplierId: string;
  supplierName?: string;
  discoveryMode: TransferDiscoveryMode;
  status: TransferStatus;
  escrowStatus: 'NONE' | 'LOCKED' | 'RELEASED' | 'REFUNDED';
  sourceOrderId?: string | null;
  returnOrderId?: string | null;
  purchaseOrderId?: string | null;
  sourceCreditNoteNo?: string | null;
  targetInvoiceNo?: string | null;
  auditPdfPath?: string | null;
  qcInspectorId?: string | null;
  qcInspectorName?: string | null;
  qcPassedAt?: string | null;
  qcFailedReason?: string | null;
  releasedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  totals: {
    sourceRefundAmount?: number;
    supplierFeeApplied?: number;
    supplierFeeFlat?: number;
    supplierFeePercent?: number;
    targetPurchaseAmount?: number;
  };
  items: TransferRequestItem[];
}

/* ───── Phase D2 — Pricing Agreements ───── */

export type PricingAgreementStatus =
  | 'DRAFT'
  | 'PENDING_CUSTOMER'
  | 'PENDING_ADMIN'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED';

export interface PricingAgreementItem {
  id: number;
  productId: string;
  productName?: string;
  productImage?: string;
  unitOfMeasurement?: string;
  unitPrice: number;
  minOrderQuantity: number;
  maxPeriodQuantity?: number | null;
  committedPeriodQuantity?: number | null;
  tierBreaks: { qty: number; price: number }[];
  catalogPrice: number;
}

export interface PricingAgreement {
  id: string;
  agreementNumber: string;
  customerId: string;
  customerName?: string;
  supplierId: string;
  supplierName?: string;
  status: PricingAgreementStatus;
  version: number;
  validFrom: string;
  validTo: string;
  autoRenew: boolean;
  renewNoticeDays: number;
  moqFallbackMode: 'FALLBACK_CATALOG' | 'BLOCK' | 'SPLIT';
  scope: 'CUSTOMER_ONLY' | 'MASTER_AND_CHILDREN' | 'SPECIFIC_CHILDREN';
  scopedPharmacyIds: string[];
  bonusesApply: boolean;
  currency: string;
  sentToCustomerAt?: string | null;
  signedByCustomerAt?: string | null;
  approvedByAdminAt?: string | null;
  approvedByAdminId?: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  signedPdfPath?: string | null;
  notes?: string | null;
  isActive: boolean;
  isExpired: boolean;
  createdAt?: string;
  updatedAt?: string;
  items: PricingAgreementItem[];
}

export interface PricingQuote {
  unitPrice: number;
  pricingSource: 'CATALOG' | 'CONTRACT';
  pricingAgreementId?: string | null;
  pricingAgreementNumber?: string | null;
  pricingAgreementVersion?: number | null;
  catalogUnitPrice: number;
  contractedUnitPrice?: number | null;
  savingsAmount: number;
  minOrderQuantity?: number | null;
  warning?: string | null;
  splitRecommended?: number | null;
}