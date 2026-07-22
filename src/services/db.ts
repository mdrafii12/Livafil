import { 
  User, Pharmacy, Category, Supplier, Medicine, Batch, Movement, Notification, SystemSettings, BatchStatus, MovementType, UserRole,
  ExchangeListing, NeedMedicine, ExchangeRequest, ListingMatch, ExchangeActivity, ExchangeListingStatus, ExchangeListingReason, NeedMedicineStatus, ExchangeRequestStatus,
  AuditLog, Subscription, SupportTicket, FeatureFlag,
  Bill, BillItem, CustomerDetails, PaymentMethod
} from '../types';
import { formatCurrency } from '../utils/currency';

// Helper to generate UUIDs
const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// Default seed categories
const SEED_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Analgesics', description: 'Pain relief medicines', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50', createdAt: new Date().toISOString() },
  { id: 'cat-2', name: 'Antibiotics', description: 'Bacterial infection treatments', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50', createdAt: new Date().toISOString() },
  { id: 'cat-3', name: 'Cardiovascular', description: 'Heart and blood pressure', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50', createdAt: new Date().toISOString() },
  { id: 'cat-4', name: 'Diabetes', description: 'Blood sugar management', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50', createdAt: new Date().toISOString() },
  { id: 'cat-5', name: 'Gastrointestinal', description: 'Stomach and digestive care', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50', createdAt: new Date().toISOString() },
];

// Default seed suppliers (Clean real state)
const SEED_SUPPLIERS: Supplier[] = [];

// Default seed medicines (Clean real state)
const SEED_MEDICINES: Medicine[] = [];

// Helper to shift dates relative to current date
const getRelativeDate = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

// Default seed batches (Clean real state)
const SEED_BATCHES: Batch[] = [];

// Seed inventory movements (Clean real state)
const SEED_MOVEMENTS: Movement[] = [];

// Seed notifications (Clean real state)
const SEED_NOTIFICATIONS: Notification[] = [];

const DEFAULT_SETTINGS: SystemSettings = {
  general: {
    pharmacyName: 'LIVAFIL Pharmacy',
    timezone: 'Asia/Kolkata',
    currency: 'INR'
  },
  appearance: {
    theme: 'light',
    density: 'comfortable'
  },
  notifications: {
    expiryAlertDays: 90,
    lowStockAlert: true,
    emailDigest: true
  }
};

// Seed default owner user
const SEED_OWNER: User = {
  id: 'usr-owner',
  email: 'mohammed.rafii0306@gmail.com',
  name: 'Mohammed Rafii',
  role: 'Owner',
  status: 'Active',
  pharmacyId: 'phar-1',
};

const SEED_PHARMACY: Pharmacy = {
  id: 'phar-1',
  name: 'LIVAFIL Pharmacy Main Branch',
  ownerName: 'Mohammed Rafii',
  licenseNumber: 'PH-2026-LIVAFIL',
  gst: '36AAAAA0000A1Z5',
  phone: '+91 9876543210',
  email: 'support@livafil.com',
  address: 'Main Road, Commercial Center',
  state: 'Telangana',
  district: 'Hyderabad',
  city: 'Hyderabad',
  pincode: '500001',
  createdAt: new Date().toISOString()
};

// Helper keys for LocalStorage
const STORAGE_KEYS = {
  USERS: 'livafil_users',
  PHARMACY: 'livafil_pharmacy',
  CATEGORIES: 'livafil_categories',
  SUPPLIERS: 'livafil_suppliers',
  MEDICINES: 'livafil_medicines',
  BATCHES: 'livafil_batches',
  MOVEMENTS: 'livafil_movements',
  NOTIFICATIONS: 'livafil_notifications',
  SETTINGS: 'livafil_settings',
  CURRENT_USER: 'livafil_current_user',
  ONBOARDED: 'livafil_onboarded',
  EXCHANGE_LISTINGS: 'livafil_exchange_listings',
  NEED_MEDICINES: 'livafil_need_medicines',
  EXCHANGE_REQUESTS: 'livafil_exchange_requests',
  EXCHANGE_ACTIVITY: 'livafil_exchange_activity',
  AUDIT_LOGS: 'livafil_audit_logs',
  SUBSCRIPTION: 'livafil_subscription',
  SUPPORT_TICKETS: 'livafil_support_tickets',
  FEATURE_FLAGS: 'livafil_feature_flags',
  BILLS: 'livafil_bills',
};

// Seed audit logs
const SEED_AUDIT_LOGS: AuditLog[] = [];

// Seed subscription
const SEED_SUBSCRIPTION: Subscription = {
  plan: 'Professional',
  status: 'Active',
  trialEnd: getRelativeDate(14),
  billingCycle: 'Monthly',
  currentPeriodEnd: getRelativeDate(25),
  billingHistory: []
};

// Seed tickets
const SEED_TICKETS: SupportTicket[] = [];

// Seed feature flags
const SEED_FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'enable_auto_discounts', name: 'AI Expiry Smart Discounts', description: 'Enable automatic price-markdown suggestions for batches expiring within 45 days', enabled: true, category: 'Inventory' },
  { key: 'enable_whatsapp_sync', name: 'WhatsApp Dispatch Integrations', description: 'Send instant delivery notification alerts via secure WhatsApp Gateway', enabled: true, category: 'Communication' },
  { key: 'enable_b2b_matching', name: 'Proximity Match Engine v2', description: 'Auto-pair listing surplus with partner open requested needs', enabled: true, category: 'Exchange' },
  { key: 'strict_hipaa_compliance', name: 'Security Guarding', description: 'Force masking of pharmacy contact details until reciprocal double-opt-in', enabled: true, category: 'Security' }
];

export class LocalDB {
  static init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([SEED_OWNER]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PHARMACY)) {
      localStorage.setItem(STORAGE_KEYS.PHARMACY, JSON.stringify(SEED_PHARMACY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(SEED_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(SEED_SUPPLIERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEDICINES)) {
      localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(SEED_MEDICINES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BATCHES)) {
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(SEED_BATCHES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(SEED_MOVEMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ONBOARDED)) {
      localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION)) {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(SEED_SUBSCRIPTION));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPORT_TICKETS)) {
      localStorage.setItem(STORAGE_KEYS.SUPPORT_TICKETS, JSON.stringify(SEED_TICKETS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FEATURE_FLAGS)) {
      localStorage.setItem(STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(SEED_FEATURE_FLAGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BILLS)) {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
    }
    
    // Auto login seed owner for seamless testing
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(SEED_OWNER));
    }

    // --- SEED EXCHANGE DATA ---
    if (!localStorage.getItem(STORAGE_KEYS.EXCHANGE_LISTINGS)) {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_LISTINGS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.NEED_MEDICINES)) {
      localStorage.setItem(STORAGE_KEYS.NEED_MEDICINES, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.EXCHANGE_REQUESTS)) {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_REQUESTS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.EXCHANGE_ACTIVITY)) {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_ACTIVITY, JSON.stringify([]));
    }
  }

  // --- GENERAL READ/WRITE ---
  static get<T>(key: string): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : ([] as unknown as T);
  }

  static set<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- AUTH & SESSION ---
  static getCurrentUser(): User | null {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  }

  static login(email: string, role: UserRole = 'Owner'): User | null {
    const users = this.get<User[]>(STORAGE_KEYS.USERS);
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Auto-create user for testing if they log in with a new email
      user = {
        id: generateId(),
        email: email.toLowerCase(),
        name: email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        role: role,
        status: 'Active'
      };
      users.push(user);
      this.set(STORAGE_KEYS.USERS, users);
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    
    // Check onboarding status
    const isOwner = user.role === 'Owner';
    const pharmacy = localStorage.getItem(STORAGE_KEYS.PHARMACY);
    if (!isOwner || pharmacy) {
      localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    } else {
      localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'false');
    }

    return user;
  }

  static register(email: string, name: string, role: UserRole = 'Owner'): User {
    const users = this.get<User[]>(STORAGE_KEYS.USERS);
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const newUser: User = {
      id: generateId(),
      email: email.toLowerCase(),
      name: name,
      role: role,
      status: 'Active'
    };

    users.push(newUser);
    this.set(STORAGE_KEYS.USERS, users);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'false'); // Must onboard pharmacy next
    localStorage.removeItem(STORAGE_KEYS.PHARMACY); // Reset pharmacy for new user
    return newUser;
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  static isOnboarded(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDED) === 'true';
  }

  static completeOnboarding(pharmacyData: Omit<Pharmacy, 'id' | 'createdAt'>): Pharmacy {
    const newPharmacy: Pharmacy = {
      ...pharmacyData,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.PHARMACY, JSON.stringify(newPharmacy));
    localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');

    // Link user to pharmacy
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      currentUser.pharmacyId = newPharmacy.id;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      
      // Update users list
      const users = this.get<User[]>(STORAGE_KEYS.USERS);
      const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, pharmacyId: newPharmacy.id } : u);
      this.set(STORAGE_KEYS.USERS, updatedUsers);
    }

    return newPharmacy;
  }

  static getPharmacy(): Pharmacy | null {
    const p = localStorage.getItem(STORAGE_KEYS.PHARMACY);
    return p ? JSON.parse(p) : null;
  }

  // --- CATEGORIES ---
  static getCategories(): Category[] {
    return this.get<Category[]>(STORAGE_KEYS.CATEGORIES);
  }

  static addCategory(name: string, description: string, color: string): Category {
    const categories = this.getCategories();
    const newCat: Category = {
      id: generateId(),
      name,
      description,
      color,
      createdAt: new Date().toISOString()
    };
    categories.push(newCat);
    this.set(STORAGE_KEYS.CATEGORIES, categories);
    return newCat;
  }

  static updateCategory(id: string, name: string, description: string, color: string): Category {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    
    categories[index] = {
      ...categories[index],
      name,
      description,
      color
    };
    this.set(STORAGE_KEYS.CATEGORIES, categories);
    return categories[index];
  }

  static deleteCategory(id: string): void {
    const categories = this.getCategories();
    this.set(STORAGE_KEYS.CATEGORIES, categories.filter(c => c.id !== id));
  }

  // --- SUPPLIERS ---
  static getSuppliers(): Supplier[] {
    return this.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS);
  }

  static addSupplier(data: Omit<Supplier, 'id' | 'createdAt'>): Supplier {
    const suppliers = this.getSuppliers();
    const newSup: Supplier = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    suppliers.push(newSup);
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers);
    return newSup;
  }

  static updateSupplier(id: string, data: Omit<Supplier, 'id' | 'createdAt'>): Supplier {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Supplier not found');

    suppliers[index] = {
      ...suppliers[index],
      ...data
    };
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers);
    return suppliers[index];
  }

  static deleteSupplier(id: string): void {
    const suppliers = this.getSuppliers();
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers.filter(s => s.id !== id));
  }

  // --- MEDICINES ---
  static getMedicines(): Medicine[] {
    return this.get<Medicine[]>(STORAGE_KEYS.MEDICINES);
  }

  static addMedicine(data: Omit<Medicine, 'id' | 'createdAt'>): Medicine {
    const medicines = this.getMedicines();
    const newMed: Medicine = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    medicines.push(newMed);
    this.set(STORAGE_KEYS.MEDICINES, medicines);
    return newMed;
  }

  static updateMedicine(id: string, data: Omit<Medicine, 'id' | 'createdAt'>): Medicine {
    const medicines = this.getMedicines();
    const index = medicines.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Medicine not found');

    medicines[index] = {
      ...medicines[index],
      ...data
    };
    this.set(STORAGE_KEYS.MEDICINES, medicines);
    return medicines[index];
  }

  static deleteMedicine(id: string): void {
    const medicines = this.getMedicines();
    this.set(STORAGE_KEYS.MEDICINES, medicines.filter(m => m.id !== id));
    
    // Cascading delete for batches and movements
    const batches = this.getBatches();
    const activeBatches = batches.filter(b => b.medicineId === id);
    activeBatches.forEach(b => this.deleteBatch(b.id));
  }

  // --- BATCHES ---
  static getBatches(): Batch[] {
    const batches = this.get<Batch[]>(STORAGE_KEYS.BATCHES);
    
    // Automatically recalculate status based on current dates and quantities
    const updated = batches.map(b => {
      let status: BatchStatus = 'Active';
      const now = new Date();
      const expDate = new Date(b.expiryDate);
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (b.quantity <= 0) {
        status = 'Out of Stock';
      } else if (diffDays <= 0) {
        status = 'Expired';
      } else if (diffDays <= 90) {
        status = 'Expiring';
      } else if (b.quantity < b.minimumStock) {
        status = 'Low Stock';
      }
      return { ...b, status };
    });
    
    return updated;
  }

  static addBatch(data: Omit<Batch, 'id' | 'createdAt' | 'status'>): Batch {
    const batches = this.get<Batch[]>(STORAGE_KEYS.BATCHES);
    const newBatch: Batch = {
      ...data,
      id: generateId(),
      status: 'Active', // Auto-calculated upon retrieval
      createdAt: new Date().toISOString()
    };
    batches.push(newBatch);
    this.set(STORAGE_KEYS.BATCHES, batches);

    // Track a movement for purchasing this stock
    this.addMovement({
      batchId: newBatch.id,
      medicineId: newBatch.medicineId,
      type: 'Purchase',
      quantity: newBatch.quantity,
      notes: `Initial stock receipt for batch ${newBatch.batchNumber}`
    });

    return newBatch;
  }

  static updateBatch(id: string, data: Omit<Batch, 'id' | 'createdAt' | 'status'>): Batch {
    const batches = this.get<Batch[]>(STORAGE_KEYS.BATCHES);
    const index = batches.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Batch not found');

    const oldQuantity = batches[index].quantity;
    batches[index] = {
      ...batches[index],
      ...data
    };
    this.set(STORAGE_KEYS.BATCHES, batches);

    // If quantity was updated, register a stock adjustment movement
    const diff = data.quantity - oldQuantity;
    if (diff !== 0) {
      this.addMovement({
        batchId: id,
        medicineId: data.medicineId,
        type: 'Adjustment',
        quantity: diff,
        notes: `Manual stock quantity adjustment (Previous: ${oldQuantity}, New: ${data.quantity})`
      });
    }

    return batches[index];
  }

  static deleteBatch(id: string): void {
    const batches = this.get<Batch[]>(STORAGE_KEYS.BATCHES);
    const batch = batches.find(b => b.id === id);
    if (!batch) return;

    this.set(STORAGE_KEYS.BATCHES, batches.filter(b => b.id !== id));

    // Delete movements associated with this batch
    const movements = this.getMovements();
    this.set(STORAGE_KEYS.MOVEMENTS, movements.filter(m => m.batchId !== id));
  }

  // --- MOVEMENTS ---
  static getMovements(): Movement[] {
    return this.get<Movement[]>(STORAGE_KEYS.MOVEMENTS);
  }

  static addMovement(data: Omit<Movement, 'id' | 'timestamp' | 'createdBy'>): Movement {
    const movements = this.getMovements();
    const currentUser = this.getCurrentUser();
    
    const newMovement: Movement = {
      ...data,
      id: generateId(),
      timestamp: new Date().toISOString(),
      createdBy: currentUser ? currentUser.name : 'System'
    };

    movements.unshift(newMovement); // Add to beginning (latest first)
    this.set(STORAGE_KEYS.MOVEMENTS, movements);

    // If it's a movement added directly, adjust batch quantity
    // Exception: avoid feedback loops where addBatch/updateBatch already handles movement logs
    const batches = this.get<Batch[]>(STORAGE_KEYS.BATCHES);
    const index = batches.findIndex(b => b.id === data.batchId);
    if (index !== -1 && data.type !== 'Purchase' && data.type !== 'Adjustment') {
      batches[index].quantity += data.quantity;
      if (batches[index].quantity < 0) batches[index].quantity = 0;
      this.set(STORAGE_KEYS.BATCHES, batches);
    }

    return newMovement;
  }

  // --- NOTIFICATIONS ---
  static getNotifications(): Notification[] {
    return this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS);
  }

  static markNotificationRead(id: string): void {
    const list = this.getNotifications();
    const index = list.findIndex(n => n.id === id);
    if (index !== -1) {
      list[index].read = true;
      this.set(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  }

  static markAllNotificationsRead(): void {
    const list = this.getNotifications();
    list.forEach(n => n.read = true);
    this.set(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  static deleteNotification(id: string): void {
    const list = this.getNotifications();
    this.set(STORAGE_KEYS.NOTIFICATIONS, list.filter(n => n.id !== id));
  }

  // --- USERS MANAGEMENT ---
  static getUsers(): User[] {
    return this.get<User[]>(STORAGE_KEYS.USERS);
  }

  static inviteUser(email: string, name: string, role: UserRole): User {
    const users = this.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error('User already exists');

    const newUser: User = {
      id: generateId(),
      email: email.toLowerCase(),
      name,
      role,
      status: 'Active',
      pharmacyId: this.getPharmacy()?.id
    };
    users.push(newUser);
    this.set(STORAGE_KEYS.USERS, users);
    return newUser;
  }

  static updateUserRole(id: string, role: UserRole): User {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    users[index].role = role;
    this.set(STORAGE_KEYS.USERS, users);
    
    // Update active user context if modified self
    const curr = this.getCurrentUser();
    if (curr && curr.id === id) {
      curr.role = role;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(curr));
    }

    return users[index];
  }

  static deactivateUser(id: string): User {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    users[index].status = 'Inactive';
    this.set(STORAGE_KEYS.USERS, users);
    return users[index];
  }

  static activateUser(id: string): User {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    users[index].status = 'Active';
    this.set(STORAGE_KEYS.USERS, users);
    return users[index];
  }

  static addUser(user: Omit<User, 'id'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: generateId()
    };
    users.push(newUser);
    this.set(STORAGE_KEYS.USERS, users);
    return newUser;
  }

  static deleteUser(id: string): void {
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    this.set(STORAGE_KEYS.USERS, filtered);
  }

  static updateCurrentUser(data: Partial<User>): User | null {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;
    const updated = { ...currentUser, ...data };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));

    // Also sync in general users array
    const users = this.getUsers();
    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, ...data } : u);
    this.set(STORAGE_KEYS.USERS, updatedUsers);

    return updated;
  }

  static updatePharmacy(data: Partial<Pharmacy>): Pharmacy | null {
    const pharm = this.getPharmacy();
    if (!pharm) return null;
    const updated = { ...pharm, ...data };
    localStorage.setItem(STORAGE_KEYS.PHARMACY, JSON.stringify(updated));
    return updated;
  }

  // --- SYSTEM SETTINGS ---
  static getSettings(): SystemSettings {
    const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return s ? JSON.parse(s) : DEFAULT_SETTINGS;
  }

  static updateSettings(settings: SystemSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- EXCHANGE LISTINGS ---
  static getExchangeListings(): ExchangeListing[] {
    return this.get<ExchangeListing[]>(STORAGE_KEYS.EXCHANGE_LISTINGS);
  }

  static addExchangeListing(listing: Omit<ExchangeListing, 'id' | 'createdAt'>): ExchangeListing {
    const listings = this.getExchangeListings();
    const newListing: ExchangeListing = {
      ...listing,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    listings.push(newListing);
    this.set(STORAGE_KEYS.EXCHANGE_LISTINGS, listings);
    this.addExchangeActivity('listing_created', `Your pharmacy listed ${newListing.quantity} units of ${newListing.medicineName} ${newListing.strength} on the exchange.`);
    return newListing;
  }

  static updateExchangeListing(id: string, updates: Partial<ExchangeListing>): ExchangeListing {
    const listings = this.getExchangeListings();
    const idx = listings.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Listing not found');
    listings[idx] = { ...listings[idx], ...updates };
    this.set(STORAGE_KEYS.EXCHANGE_LISTINGS, listings);
    return listings[idx];
  }

  static deleteExchangeListing(id: string): void {
    const listings = this.getExchangeListings();
    this.set(STORAGE_KEYS.EXCHANGE_LISTINGS, listings.filter(l => l.id !== id));
  }

  // --- NEED MEDICINES ---
  static getNeedMedicines(): NeedMedicine[] {
    return this.get<NeedMedicine[]>(STORAGE_KEYS.NEED_MEDICINES);
  }

  static addNeedMedicine(need: Omit<NeedMedicine, 'id' | 'createdAt'>): NeedMedicine {
    const needs = this.getNeedMedicines();
    const newNeed: NeedMedicine = {
      ...need,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    needs.push(newNeed);
    this.set(STORAGE_KEYS.NEED_MEDICINES, needs);
    this.addExchangeActivity('need_created', `Your pharmacy requested ${newNeed.requiredQuantity} units of ${newNeed.medicineName} ${newNeed.strength}.`);
    return newNeed;
  }

  static updateNeedMedicine(id: string, updates: Partial<NeedMedicine>): NeedMedicine {
    const needs = this.getNeedMedicines();
    const idx = needs.findIndex(n => n.id === id);
    if (idx === -1) throw new Error('Need request not found');
    needs[idx] = { ...needs[idx], ...updates };
    this.set(STORAGE_KEYS.NEED_MEDICINES, needs);
    return needs[idx];
  }

  static deleteNeedMedicine(id: string): void {
    const needs = this.getNeedMedicines();
    this.set(STORAGE_KEYS.NEED_MEDICINES, needs.filter(n => n.id !== id));
  }

  // --- EXCHANGE REQUESTS ---
  static getExchangeRequests(): ExchangeRequest[] {
    return this.get<ExchangeRequest[]>(STORAGE_KEYS.EXCHANGE_REQUESTS);
  }

  static addExchangeRequest(req: Omit<ExchangeRequest, 'id' | 'createdAt'>): ExchangeRequest {
    const reqs = this.getExchangeRequests();
    const newReq: ExchangeRequest = {
      ...req,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    reqs.push(newReq);
    this.set(STORAGE_KEYS.EXCHANGE_REQUESTS, reqs);
    this.addExchangeActivity('interest_expressed', `Interest expressed in exchange listing.`);
    return newReq;
  }

  static updateExchangeRequest(id: string, updates: Partial<ExchangeRequest>): ExchangeRequest {
    const reqs = this.getExchangeRequests();
    const idx = reqs.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Request not found');
    reqs[idx] = { ...reqs[idx], ...updates };
    this.set(STORAGE_KEYS.EXCHANGE_REQUESTS, reqs);
    return reqs[idx];
  }

  // --- EXCHANGE ACTIVITIES ---
  static getExchangeActivities(): ExchangeActivity[] {
    return this.get<ExchangeActivity[]>(STORAGE_KEYS.EXCHANGE_ACTIVITY);
  }

  static addExchangeActivity(type: ExchangeActivity['type'], message: string): ExchangeActivity {
    const acts = this.getExchangeActivities();
    const pharm = this.getPharmacy();
    const newAct: ExchangeActivity = {
      id: generateId(),
      pharmacyId: pharm ? pharm.id : 'phar-1',
      type,
      message,
      timestamp: new Date().toISOString()
    };
    acts.unshift(newAct);
    this.set(STORAGE_KEYS.EXCHANGE_ACTIVITY, acts.slice(0, 100)); // Cap at 100
    return newAct;
  }

  // --- AUDIT LOGS ---
  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS) || [];
  }

  static addAuditLog(category: AuditLog['category'], action: string, details: string): AuditLog {
    const logs = this.getAuditLogs();
    const user = this.getCurrentUser();
    const newLog: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      username: user ? user.name : 'System',
      role: user ? user.role : 'System',
      category,
      action,
      details,
      ipAddress: '198.51.100.42',
      device: 'Chrome 118 on macOS Big Sur (Desktop)'
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 500)); // Cap at 500 logs
    return newLog;
  }

  // --- SUBSCRIPTIONS ---
  static getSubscription(): Subscription {
    const s = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    if (!s) return SEED_SUBSCRIPTION;
    return JSON.parse(s);
  }

  static updateSubscription(updates: Partial<Subscription>): Subscription {
    const sub = this.getSubscription();
    const updated = { ...sub, ...updates };
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
    this.addAuditLog('Subscription', 'Update Subscription', `Plan state updated to ${updated.plan} (${updated.status})`);
    return updated;
  }

  // --- SUPPORT TICKETS ---
  static getSupportTickets(): SupportTicket[] {
    return this.get<SupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS) || [];
  }

  static addSupportTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'replies' | 'status'>): SupportTicket {
    const tkts = this.getSupportTickets();
    const newTkt: SupportTicket = {
      ...ticket,
      id: 'tkt-' + Math.random().toString(36).substring(2, 7),
      status: 'Open',
      createdAt: new Date().toISOString(),
      replies: []
    };
    tkts.unshift(newTkt);
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, tkts);
    this.addAuditLog('User', 'Raise Ticket', `Opened a new support ticket: ${newTkt.title}`);
    return newTkt;
  }

  static addTicketReply(id: string, sender: string, message: string): SupportTicket {
    const tkts = this.getSupportTickets();
    const idx = tkts.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Ticket not found');
    tkts[idx].replies.push({
      sender,
      message,
      timestamp: new Date().toISOString()
    });
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, tkts);
    return tkts[idx];
  }

  static updateTicketStatus(id: string, status: SupportTicket['status']): SupportTicket {
    const tkts = this.getSupportTickets();
    const idx = tkts.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Ticket not found');
    tkts[idx].status = status;
    this.set(STORAGE_KEYS.SUPPORT_TICKETS, tkts);
    return tkts[idx];
  }

  // --- FEATURE FLAGS ---
  static getFeatureFlags(): FeatureFlag[] {
    return this.get<FeatureFlag[]>(STORAGE_KEYS.FEATURE_FLAGS) || [];
  }

  static setFeatureFlag(key: string, enabled: boolean): void {
    const flags = this.getFeatureFlags();
    const idx = flags.findIndex(f => f.key === key);
    if (idx !== -1) {
      flags[idx].enabled = enabled;
      this.set(STORAGE_KEYS.FEATURE_FLAGS, flags);
      this.addAuditLog('Security', 'Toggle Feature Flag', `Feature flag '${flags[idx].name}' toggled to ${enabled}`);
    }
  }

  // --- BILLS AND SALES ---
  static getBills(): Bill[] {
    return this.get<Bill[]>(STORAGE_KEYS.BILLS) || [];
  }

  static addBill(billData: Omit<Bill, 'id' | 'invoiceNumber' | 'date' | 'status'>): Bill {
    const bills = this.getBills();
    
    // Generate Invoice number
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const sequentialNum = String(bills.length + 1).padStart(4, '0');
    const invoiceNumber = `BILL-${dateStr}-${sequentialNum}`;

    const newBill: Bill = {
      ...billData,
      id: generateId(),
      invoiceNumber,
      date: today.toISOString().split('T')[0],
      status: 'Completed',
      returnedItems: {}
    };

    bills.unshift(newBill); // Latest first
    this.set(STORAGE_KEYS.BILLS, bills);

    // Audit log
    this.addAuditLog('Inventory', 'Dispense Sale', `Completed billing ${newBill.invoiceNumber} for ${formatCurrency(newBill.grandTotal)} (${newBill.items.length} items)`);

    return newBill;
  }

  static updateBill(id: string, updates: Partial<Bill>): Bill {
    const bills = this.getBills();
    const index = bills.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Bill not found');

    bills[index] = {
      ...bills[index],
      ...updates
    };

    this.set(STORAGE_KEYS.BILLS, bills);
    return bills[index];
  }
}
