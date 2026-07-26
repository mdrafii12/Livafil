export type UserRole = 'Owner' | 'Manager' | 'Staff';
export type UserStatus = 'Active' | 'Inactive' | 'Pending';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  pharmacyId?: string;
  avatarUrl?: string;
}

export interface StaffInvite {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'Pending' | 'Accepted' | 'Cancelled';
  createdAt: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  ownerName: string;
  licenseNumber: string;
  gst: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  upiId?: string;
  whatsappAdminPhone?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string; // e.g. hex or tailwind color class name (e.g. 'bg-blue-100 text-blue-800')
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gst: string;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  strength: string; // e.g. "500mg"
  dosageForm: string; // e.g. "Tablet", "Syrup"
  barcode: string;
  categoryId: string;
  prescriptionRequired: boolean;
  refillIntervalDays?: number | null;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  pharmacyId?: string;
  medicineId: string;
  supplierId: string;
  quantity: number;
  status: 'Sent' | 'Pending' | 'Completed';
  createdAt: string;
}

export type BatchStatus = 'Active' | 'Expiring' | 'Expired' | 'Low Stock' | 'Out of Stock';

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  expiryDate: string; // YYYY-MM-DD
  manufactureDate: string; // YYYY-MM-DD
  receivedDate: string; // YYYY-MM-DD
  supplierId: string;
  minimumStock: number;
  notes?: string;
  status: BatchStatus;
  createdAt: string;
}

export type MovementType = 'Purchase' | 'Adjustment' | 'Return' | 'Sale' | 'Expired';

export interface Movement {
  id: string;
  batchId: string;
  medicineId: string;
  type: MovementType;
  quantity: number; // Positive or negative
  timestamp: string;
  createdBy: string; // User Name or ID
  notes?: string;
}

export type NotificationType = 'expiry' | 'low_stock' | 'exchange_match' | 'exchange_request' | 'system';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
}

export interface SystemSettings {
  general: {
    pharmacyName: string;
    timezone: string;
    currency: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    density: 'comfortable' | 'compact';
  };
  notifications: {
    expiryAlertDays: number; // e.g. 90 days before
    lowStockAlert: boolean;
    emailDigest: boolean;
  };
}

// ==========================================
// PHASE 3: LIVAFIL EXCHANGE INTERFACES
// ==========================================

export type ExchangeListingStatus = 'Active' | 'Reserved' | 'Sold' | 'Cancelled';
export type ExchangeListingReason = 'Near Expiry' | 'Overstock' | 'Slow Moving' | 'Other';

export interface ExchangeListing {
  id: string;
  pharmacyId: string;
  pharmacyName: string; // Seller pharmacy name (masked to buyers initially)
  medicineId: string;
  medicineName: string;
  genericName: string;
  strength: string;
  manufacturer: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  mrp: number;
  sellingPrice: number;
  discountPercentage: number;
  minimumOrder: number;
  reason: ExchangeListingReason;
  notes?: string;
  status: ExchangeListingStatus;
  createdAt: string;
}

export type NeedMedicineStatus = 'Open' | 'Matched' | 'Closed';

export interface NeedMedicine {
  id: string;
  pharmacyId: string;
  pharmacyName: string; // Buyer pharmacy name (masked to sellers initially)
  medicineName: string;
  strength: string;
  manufacturer: string;
  requiredQuantity: number;
  maximumPrice: number;
  requiredBefore: string; // YYYY-MM-DD
  notes?: string;
  status: NeedMedicineStatus;
  createdAt: string;
}

export type ExchangeRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Countered';

export interface ExchangeRequest {
  id: string;
  listingId: string;
  buyerPharmacyId: string;
  buyerPharmacyName: string;
  buyerContactEmail: string;
  buyerContactPhone: string;
  buyerAddress: string;
  sellerPharmacyId: string;
  status: ExchangeRequestStatus;
  counterPrice?: number;
  notes?: string;
  createdAt: string;
}

export interface ListingMatch {
  id: string;
  needId: string;
  listingId: string;
  distanceKm: number;
  status: 'Active' | 'Dismissed';
  createdAt: string;
}

export interface ExchangeActivity {
  id: string;
  pharmacyId: string;
  type: 'listing_created' | 'need_created' | 'interest_expressed' | 'request_accepted' | 'request_rejected' | 'match_found';
  message: string;
  timestamp: string;
}

// ==========================================
// PHASE 4: LIVAFIL ENTERPRISE SAAS TYPES
// ==========================================

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  category: 'Medicine' | 'Inventory' | 'Exchange' | 'User' | 'Subscription' | 'Security';
  details: string;
  ipAddress: string;
  device: string;
}

export type SubscriptionPlan = 'Free Trial' | 'Starter' | 'Professional' | 'Enterprise';
export type SubscriptionStatus = 'Active' | 'Cancelled' | 'Past Due' | 'Expired';

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  plan: SubscriptionPlan;
  status: 'Paid' | 'Unpaid';
  pdfUrl?: string;
}

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEnd: string; // YYYY-MM-DD
  billingCycle: 'Monthly' | 'Yearly';
  currentPeriodEnd: string; // YYYY-MM-DD
  billingHistory: Invoice[];
}

export type TicketCategory = 'Bug' | 'Feature Request' | 'Feedback' | 'Billing' | 'Technical';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

export interface TicketReply {
  sender: string;
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  status: TicketStatus;
  createdAt: string;
  replies: TicketReply[];
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

export interface BillItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discount: number; // percentage (e.g. 10 for 10%)
  tax: number; // percentage (e.g. 12 for 12%)
  subtotal: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Mixed' | 'Pending';

export interface Bill {
  id: string;
  invoiceNumber: string;
  date: string;
  cashier: string;
  customer: CustomerDetails;
  items: BillItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  returnedItems?: { [batchId: string]: number }; // Maps batchId to quantity returned
  status: 'Completed' | 'Returned' | 'Partially Returned';
  prescriptionImageUrl?: string;
}

export interface ReminderSchedule {
  id: string;
  pharmacyId: string;
  customerPhone: string;
  customerName: string;
  medicineId: string;
  medicineName: string;
  billId: string;
  prescriptionId?: string;
  daysSuppliedThisFill?: number;
  dueDate: string;
  status: 'Pending' | 'Sent' | 'Confirmed' | 'Cancelled' | 'Ready';
  createdAt: string;
}

export interface Prescription {
  id: string;
  pharmacyId: string;
  customerPhone: string;
  customerName: string;
  medicineId: string;
  medicineName: string;
  totalDurationDays: number;
  filledDays: number;
  status: 'Active' | 'Completed';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PHASE 5: OUT-PATIENT (OPD) INTERFACES
// ==========================================

export interface Patient {
  id: string;
  pharmacyId: string;
  uhid: string; // e.g. "OP-2026-1001"
  name: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  bloodGroup?: string;
  address?: string;
  allergies?: string;
  chronicConditions?: string;
  createdAt: string;
}

export interface OpPrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string; // e.g. "1-0-1 After Food"
  durationDays: number;
  quantity: number;
  notes?: string;
}

export type OpConsultationStatus = 'Waiting' | 'Consulting' | 'Completed' | 'Sent to POS';

export interface OpConsultation {
  id: string;
  pharmacyId: string;
  uhid: string;
  patientName: string;
  patientPhone: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  doctorName: string;
  vitals?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    weight?: number;
    sugar?: number;
  };
  diagnosis?: string;
  medicines: OpPrescriptionItem[];
  consultationFee: number;
  tokenNumber: string;
  status: OpConsultationStatus;
  createdAt: string;
}

export interface RegisteredDoctor {
  id: string;
  pharmacyId: string;
  name: string;
  qualification: string;
  specialty: string;
  phone: string;
  email: string;
  regNumber: string;
  consultationFee: number;
  roomNumber: string;
  availabilityDays: string[];
  timingSlots: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  createdAt: string;
}

// --- HMS LAB & DIAGNOSTIC REPORTS TYPES ---
export interface LabTestMaster {
  id: string;
  pharmacyId?: string;
  code: string;
  name: string;
  category: string; // e.g. 'Haematology', 'Biochemistry', 'Radiology', 'Pathology'
  sampleType: string; // e.g. 'Blood', 'Urine', 'Swab'
  price: number;
  normalRange: string; // e.g. '13.5 - 17.5 g/dL'
  unit: string; // e.g. 'g/dL', 'mg/dL'
  parameters?: {
    name: string;
    unit: string;
    normalRange: string;
    defaultValue?: string;
  }[];
  description?: string;
  createdAt: string;
}

export type LabReportStatus = 'Ordered' | 'Sample Collected' | 'In Progress' | 'Completed' | 'Cancelled';

export interface LabReportParameterResult {
  parameterName: string;
  observedValue: string;
  unit: string;
  normalRange: string;
  flag: 'Normal' | 'High' | 'Low' | 'Abnormal';
}

export interface LabReport {
  id: string;
  pharmacyId: string;
  reportNumber: string; // e.g. LAB-20260726-001
  uhid: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  patientPhone: string;
  doctorName: string;
  testId: string;
  testName: string;
  category: string;
  status: LabReportStatus;
  sampleCollectedAt?: string;
  completedAt?: string;
  results: LabReportParameterResult[];
  technicianNotes?: string;
  labTechnicianName?: string;
  price: number;
  createdAt: string;
}

// --- OFFLINE SYNC QUEUE ITEM ---
export interface OfflineSyncItem {
  id: string;
  entity: 'patient' | 'op_consultation' | 'lab_report' | 'bill' | 'medicine';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  createdAt: string;
  synced: boolean;
}





