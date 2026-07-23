import { supabase } from '../lib/supabaseClient';
import {
  Category,
  Supplier,
  Batch,
  Medicine,
  BatchStatus,
  Movement,
  MovementType,
  Bill,
  BillItem,
  CustomerDetails,
  PaymentMethod,
  Pharmacy,
  ExchangeListing,
  NeedMedicine,
  ExchangeRequest,
  ExchangeActivity,
  Notification,
  NotificationType,
  PurchaseOrder,
} from '../types';
import { formatCurrency } from '../utils/currency';



// --- CATEGORIES ---
function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    color: row.color,
    createdAt: row.created_at,
  };
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function addCategory(pharmacyId: string, name: string, description: string, color: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ pharmacy_id: pharmacyId, name, description, color })
    .select()
    .single();
  if (error) throw error;
  return mapCategory(data);
}

export async function updateCategory(id: string, name: string, description: string, color: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name, description, color })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCategory(data);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// --- SUPPLIERS ---
function mapSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    gst: row.gst,
    createdAt: row.created_at,
  };
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSupplier);
}

export async function addSupplier(pharmacyId: string, s: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      pharmacy_id: pharmacyId,
      name: s.name,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
      gst: s.gst,
    })
    .select()
    .single();
  if (error) throw error;
  return mapSupplier(data);
}

export async function updateSupplier(id: string, s: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: s.name,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
      gst: s.gst,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapSupplier(data);
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

// --- PURCHASE ORDERS ---
function mapPurchaseOrder(row: any): PurchaseOrder {
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    medicineId: row.medicine_id,
    supplierId: row.supplier_id,
    quantity: row.quantity,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function addPurchaseOrder(pharmacyId: string, po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'pharmacyId'>): Promise<PurchaseOrder> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      pharmacy_id: pharmacyId,
      medicine_id: po.medicineId,
      supplier_id: po.supplierId,
      quantity: po.quantity,
      status: po.status,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPurchaseOrder(data);
}

// --- MEDICINES ---
function mapMedicine(row: any): Medicine {
  return {
    id: row.id,
    name: row.name,
    genericName: row.generic_name ?? '',
    manufacturer: row.manufacturer ?? '',
    strength: row.strength ?? '',
    dosageForm: row.dosage_form ?? '',
    barcode: row.barcode ?? '',
    categoryId: row.category_id ?? '',
    prescriptionRequired: row.prescription_required ?? false,
    refillIntervalDays: row.refill_interval_days ?? null,
    createdAt: row.created_at,
  };
}

export async function getMedicines(): Promise<Medicine[]> {
  const { data, error } = await supabase.from('medicines').select('*');
  if (error) throw error;
  return (data ?? []).map(mapMedicine);
}

export async function addMedicine(pharmacyId: string, m: Omit<Medicine, 'id' | 'createdAt'>): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .insert({
      pharmacy_id: pharmacyId,
      name: m.name,
      generic_name: m.genericName,
      manufacturer: m.manufacturer,
      strength: m.strength,
      dosage_form: m.dosageForm,
      barcode: m.barcode,
      category_id: m.categoryId || null,
      prescription_required: m.prescriptionRequired,
      refill_interval_days: m.refillIntervalDays ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapMedicine(data);
}

export async function updateMedicine(id: string, m: Omit<Medicine, 'id' | 'createdAt'>): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .update({
      name: m.name,
      generic_name: m.genericName,
      manufacturer: m.manufacturer,
      strength: m.strength,
      dosage_form: m.dosageForm,
      barcode: m.barcode,
      category_id: m.categoryId || null,
      prescription_required: m.prescriptionRequired,
      refill_interval_days: m.refillIntervalDays ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapMedicine(data);
}

export async function deleteMedicine(id: string): Promise<void> {
  const { error } = await supabase.from('medicines').delete().eq('id', id);
  if (error) throw error;
}

// --- BATCHES (read-only for now — full CRUD comes in the Batches step) ---

// Recalculates status live based on today's date and quantity — matches old LocalDB behavior.
// This runs on every read, so status is never stale even if nobody edits the batch.
function computeBatchStatus(quantity: number, expiryDate: string, minimumStock: number): BatchStatus {
  const now = new Date();
  const expDate = new Date(expiryDate);
  const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (quantity <= 0) return 'Out of Stock';
  if (diffDays <= 0) return 'Expired';
  if (diffDays <= 90) return 'Expiring';
  if (quantity < minimumStock) return 'Low Stock';
  return 'Active';
}

function mapBatch(row: any): Batch {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    batchNumber: row.batch_number,
    quantity: row.quantity,
    purchasePrice: row.purchase_price,
    sellingPrice: row.selling_price,
    mrp: row.mrp,
    expiryDate: row.expiry_date,
    manufactureDate: row.manufacture_date ?? '',
    receivedDate: row.received_date ?? '',
    supplierId: row.supplier_id ?? '',
    minimumStock: row.minimum_stock ?? 0,
    notes: row.notes ?? '',
    status: computeBatchStatus(row.quantity, row.expiry_date, row.minimum_stock ?? 0),
    createdAt: row.created_at,
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    timestamp: row.created_at,
    read: row.read,
  };
}

async function createNotification(pharmacyId: string, type: NotificationType, title: string, message: string): Promise<void> {
  if (!pharmacyId) return;

  try {
    const { data: existingRows, error: lookupError } = await supabase
      .from('notifications')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .eq('read', false)
      .eq('title', title)
      .eq('message', message)
      .limit(1);

    if (lookupError) throw lookupError;
    if ((existingRows ?? []).length > 0) return;

    const { error } = await supabase.from('notifications').insert({
      pharmacy_id: pharmacyId,
      type,
      title,
      message,
      read: false,
    });

    if (error) throw error;
  } catch (err) {
    console.error('Failed to create notification', err);
  }
}

export async function syncBatchNotifications(pharmacyId: string, batches: Batch[]): Promise<void> {
  if (!pharmacyId) return;

  const now = new Date();
  await Promise.all(batches.map(async (batch) => {
    const diffTime = new Date(batch.expiryDate).getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 90) {
      const title = diffDays <= 0 ? `Batch ${batch.batchNumber} has expired` : `Batch ${batch.batchNumber} is expiring soon`;
      const message = diffDays <= 0
        ? `Batch ${batch.batchNumber} has expired and should be removed or flagged for recovery.`
        : `Batch ${batch.batchNumber} will expire in ${diffDays} day${diffDays === 1 ? '' : 's'}.`;
      await createNotification(pharmacyId, 'expiry', title, message);
    }

    if (batch.quantity < batch.minimumStock) {
      await createNotification(
        pharmacyId,
        'low_stock',
        `Low stock for ${batch.batchNumber}`,
        `Batch ${batch.batchNumber} has ${batch.quantity} units remaining, below the ${batch.minimumStock} unit minimum.`
      );
    }
  }));
}

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function getBatches(): Promise<Batch[]> {
  const { data, error } = await supabase.from('batches').select('*');
  if (error) throw error;
  return (data ?? []).map(mapBatch);
}

// Minimal movement logger — full Movements CRUD/read comes in the Movements step.
async function logMovement(pharmacyId: string, createdBy: string | undefined, m: {
  batchId: string; medicineId: string; type: 'Purchase' | 'Adjustment' | 'Return' | 'Sale' | 'Expired'; quantity: number; notes?: string;
}): Promise<void> {
  const { error } = await supabase.from('movements').insert({
    pharmacy_id: pharmacyId,
    batch_id: m.batchId,
    medicine_id: m.medicineId,
    type: m.type,
    quantity: m.quantity,
    created_by: createdBy ?? null,
    notes: m.notes ?? null,
  });
  if (error) throw error;
}

export async function addBatch(pharmacyId: string, createdBy: string, b: Omit<Batch, 'id' | 'createdAt' | 'status'>): Promise<Batch> {
  const { data, error } = await supabase
    .from('batches')
    .insert({
      pharmacy_id: pharmacyId,
      medicine_id: b.medicineId,
      batch_number: b.batchNumber,
      quantity: b.quantity,
      purchase_price: b.purchasePrice,
      selling_price: b.sellingPrice,
      mrp: b.mrp,
      expiry_date: b.expiryDate,
      manufacture_date: b.manufactureDate || null,
      received_date: b.receivedDate || null,
      supplier_id: b.supplierId || null,
      minimum_stock: b.minimumStock,
      notes: b.notes || null,
    })
    .select()
    .single();
  if (error) throw error;

  const newBatch = mapBatch(data);

  await logMovement(pharmacyId, createdBy, {
    batchId: newBatch.id,
    medicineId: newBatch.medicineId,
    type: 'Purchase',
    quantity: newBatch.quantity,
    notes: `Initial stock receipt for batch ${newBatch.batchNumber}`,
  });

  return newBatch;
}

export async function updateBatch(id: string, pharmacyId: string, createdBy: string, oldQuantity: number, b: Omit<Batch, 'id' | 'createdAt' | 'status'>): Promise<Batch> {
  const { data, error } = await supabase
    .from('batches')
    .update({
      medicine_id: b.medicineId,
      batch_number: b.batchNumber,
      quantity: b.quantity,
      purchase_price: b.purchasePrice,
      selling_price: b.sellingPrice,
      mrp: b.mrp,
      expiry_date: b.expiryDate,
      manufacture_date: b.manufactureDate || null,
      received_date: b.receivedDate || null,
      supplier_id: b.supplierId || null,
      minimum_stock: b.minimumStock,
      notes: b.notes || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  const diff = b.quantity - oldQuantity;
  if (diff !== 0) {
    await logMovement(pharmacyId, createdBy, {
      batchId: id,
      medicineId: b.medicineId,
      type: 'Adjustment',
      quantity: diff,
      notes: `Manual stock quantity adjustment (Previous: ${oldQuantity}, New: ${b.quantity})`,
    });
  }

  return mapBatch(data);
}

export async function deleteBatch(id: string): Promise<void> {
  // Movements for this batch are deleted automatically by the database
  // (movements.batch_id has ON DELETE CASCADE — set up back in Step 2)
  const { error } = await supabase.from('batches').delete().eq('id', id);
  if (error) throw error;
}


function mapMovement(row: any): Movement {
  return {
    id: row.id,
    batchId: row.batch_id,
    medicineId: row.medicine_id,
    type: row.type,
    quantity: row.quantity,
    timestamp: row.timestamp,
    createdBy: row.profiles?.name ?? 'System',
    notes: row.notes ?? '',
  };
}

export async function getMovements(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movements')
    .select('*, profiles(name)')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapMovement);
}

// For MANUAL movement entries only (from the Movements page "New Stock Transaction" form).
// Purchase/Adjustment movements from the Batches page use the internal logMovement() helper instead —
// don't call this for those, or batch quantity math will double up.
export async function addManualMovement(
  pharmacyId: string,
  createdBy: string,
  data: { batchId: string; medicineId: string; type: MovementType; quantity: number; notes?: string }
): Promise<Movement> {
  const { data: row, error } = await supabase
    .from('movements')
    .insert({
      pharmacy_id: pharmacyId,
      batch_id: data.batchId,
      medicine_id: data.medicineId,
      type: data.type,
      quantity: data.quantity,
      created_by: createdBy,
      notes: data.notes ?? null,
    })
    .select('*, profiles(name)')
    .single();
  if (error) throw error;

  // Mirror old LocalDB behavior: Sale/Return/Expired directly adjust batch quantity.
  // Purchase/Adjustment don't — those are only ever created via addBatch/updateBatch,
  // which already changed the batch row themselves.
  if (data.type !== 'Purchase' && data.type !== 'Adjustment') {
    const { data: batchRow, error: fetchErr } = await supabase
      .from('batches')
      .select('quantity')
      .eq('id', data.batchId)
      .single();
    if (fetchErr) throw fetchErr;

    const newQuantity = Math.max(0, batchRow.quantity + data.quantity);
    const { error: updateErr } = await supabase
      .from('batches')
      .update({ quantity: newQuantity })
      .eq('id', data.batchId);
    if (updateErr) throw updateErr;
  }

  return mapMovement(row);
}


function mapBillItem(row: any): BillItem {
  return {
    medicineId: row.medicine_id,
    medicineName: row.medicines?.name ?? 'Unknown Medicine',
    batchId: row.batch_id,
    batchNumber: row.batches?.batch_number ?? 'N/A',
    quantity: row.quantity,
    mrp: row.mrp,
    sellingPrice: row.selling_price,
    discount: row.discount,
    tax: row.tax,
    subtotal: row.subtotal,
  };
}

function mapBill(row: any): Bill {
  const returnedItems: { [batchId: string]: number } = {};
  (row.bill_items ?? []).forEach((bi: any) => {
    if (bi.returned_quantity > 0) returnedItems[bi.batch_id] = bi.returned_quantity;
  });
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.created_at,
    cashier: row.profiles?.name ?? 'Unknown',
    customer: {
      name: row.customer_name ?? 'Walk-in Guest',
      phone: row.customer_phone ?? 'N/A',
      email: row.customer_email ?? 'guest@medguard.com',
      notes: row.customer_notes ?? undefined,
    },
    items: (row.bill_items ?? []).map(mapBillItem),
    subtotal: row.subtotal,
    discountTotal: row.discount_total,
    taxTotal: row.tax_total,
    grandTotal: row.grand_total,
    paymentMethod: row.payment_method,
    notes: row.notes ?? undefined,
    returnedItems,
    status: row.status,
    prescriptionImageUrl: row.prescription_image ?? undefined,
  };
}

export async function getBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*, profiles(name), bill_items(*, medicines(name), batches(batch_number))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBill);
}

// Creates the bill + its line items, then deducts stock and logs a Sale movement
// for every item — mirrors what LocalDB.addMovement + LocalDB.addBill used to do together.
export async function addBill(
  pharmacyId: string,
  cashierId: string,
  bill: {
    customer: CustomerDetails;
    items: BillItem[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    prescriptionImageUrl?: string;
  }
): Promise<Bill> {
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  const { data: billRow, error: billErr } = await supabase
    .from('bills')
    .insert({
      pharmacy_id: pharmacyId,
      invoice_number: invoiceNumber,
      cashier_id: cashierId,
      customer_name: bill.customer.name,
      customer_phone: bill.customer.phone,
      customer_email: bill.customer.email,
      customer_notes: bill.customer.notes ?? null,
      subtotal: bill.subtotal,
      discount_total: bill.discountTotal,
      tax_total: bill.taxTotal,
      grand_total: bill.grandTotal,
      payment_method: bill.paymentMethod,
      notes: bill.notes ?? null,
      status: 'Completed',
      prescription_image: bill.prescriptionImageUrl ?? null,
    })
    .select()
    .single();
  if (billErr) throw billErr;

  const itemRows = bill.items.map(item => ({
    bill_id: billRow.id,
    medicine_id: item.medicineId,
    batch_id: item.batchId,
    quantity: item.quantity,
    mrp: item.mrp,
    selling_price: item.sellingPrice,
    discount: item.discount,
    tax: item.tax,
    subtotal: item.subtotal,
  }));
  const { error: itemsErr } = await supabase.from('bill_items').insert(itemRows);
  if (itemsErr) throw itemsErr;

  for (const item of bill.items) {
    await addManualMovement(pharmacyId, cashierId, {
      batchId: item.batchId,
      medicineId: item.medicineId,
      type: 'Sale',
      quantity: -item.quantity,
      notes: `Quick Billing: Dispensed to ${bill.customer.name} (Invoice ${invoiceNumber})`,
    });
  }

  const bills = await getBills();
  return bills.find(b => b.id === billRow.id)!;
}

// Refills batch stock + logs Return movements, updates each bill_item's returned_quantity,
// and updates the bill's overall status/notes — mirrors the old LocalDB return flow.
export async function processReturn(
  pharmacyId: string,
  cashierId: string,
  billId: string,
  invoiceNumber: string,
  itemsToProcess: Array<{ batchId: string; medicineId: string; qty: number }>,
  returnReason: string,
  newStatus: 'Returned' | 'Partially Returned',
  newNotes: string
): Promise<void> {
  for (const proc of itemsToProcess) {
    await addManualMovement(pharmacyId, cashierId, {
      batchId: proc.batchId,
      medicineId: proc.medicineId,
      type: 'Return',
      quantity: proc.qty,
      notes: `Customer Return: Refunded from Invoice ${invoiceNumber}. Reason: ${returnReason}`,
    });

    const { data: biRow, error: fetchErr } = await supabase
      .from('bill_items')
      .select('id, returned_quantity')
      .eq('bill_id', billId)
      .eq('batch_id', proc.batchId)
      .single();
    if (fetchErr) throw fetchErr;

    const { error: updErr } = await supabase
      .from('bill_items')
      .update({ returned_quantity: (biRow.returned_quantity ?? 0) + proc.qty })
      .eq('id', biRow.id);
    if (updErr) throw updErr;
  }

  const { error: billErr } = await supabase
    .from('bills')
    .update({ status: newStatus, notes: newNotes })
    .eq('id', billId);
  if (billErr) throw billErr;
}


// --- OWN PHARMACY RECORD ---
function mapPharmacy(row: any): Pharmacy {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    licenseNumber: row.license_number,
    gst: row.gst,
    phone: row.phone,
    email: row.email,
    address: row.address,
    state: row.state,
    district: row.district,
    city: row.city,
    pincode: row.pincode,
    upiId: row.upi_id,
    whatsappAdminPhone: row.whatsapp_admin_phone,
    createdAt: row.created_at,
  };
}

export async function getMyPharmacy(pharmacyId: string): Promise<Pharmacy> {
  const { data, error } = await supabase.from('pharmacies').select('*').eq('id', pharmacyId).single();
  if (error) throw error;
  return mapPharmacy(data);
}

// --- EXCHANGE ACTIVITY (own pharmacy's private feed) ---
function mapActivity(row: any): ExchangeActivity {
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    type: row.type,
    message: row.message,
    timestamp: row.timestamp,
  };
}

export async function getExchangeActivities(): Promise<ExchangeActivity[]> {
  const { data, error } = await supabase
    .from('exchange_activity')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapActivity);
}

async function logExchangeActivity(pharmacyId: string, type: ExchangeActivity['type'], message: string): Promise<void> {
  const { error } = await supabase.from('exchange_activity').insert({
    pharmacy_id: pharmacyId,
    type,
    message,
  });
  if (error) throw error;
}

// --- EXCHANGE LISTINGS (marketplace-wide read, own-pharmacy write) ---
function mapExchangeListing(row: any): ExchangeListing {
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    pharmacyName: row.pharmacy_name,
    medicineId: row.medicine_id ?? '',
    medicineName: row.medicine_name,
    genericName: row.generic_name ?? '',
    strength: row.strength ?? '',
    manufacturer: row.manufacturer ?? '',
    batchNumber: row.batch_number ?? '',
    quantity: row.quantity,
    expiryDate: row.expiry_date,
    mrp: row.mrp,
    sellingPrice: row.selling_price,
    discountPercentage: row.discount_percentage ?? 0,
    minimumOrder: row.minimum_order ?? 1,
    reason: row.reason,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getExchangeListings(): Promise<ExchangeListing[]> {
  const { data, error } = await supabase
    .from('exchange_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapExchangeListing);
}

export async function addExchangeListing(
  pharmacyId: string,
  listing: Omit<ExchangeListing, 'id' | 'createdAt' | 'pharmacyId'> & { medicineId: string }
): Promise<ExchangeListing> {
  const { data, error } = await supabase
    .from('exchange_listings')
    .insert({
      pharmacy_id: pharmacyId,
      pharmacy_name: listing.pharmacyName,
      medicine_name: listing.medicineName,
      generic_name: listing.genericName,
      strength: listing.strength,
      manufacturer: listing.manufacturer,
      batch_number: listing.batchNumber,
      quantity: listing.quantity,
      expiry_date: listing.expiryDate,
      mrp: listing.mrp,
      selling_price: listing.sellingPrice,
      discount_percentage: listing.discountPercentage,
      minimum_order: listing.minimumOrder,
      reason: listing.reason,
      notes: listing.notes ?? null,
      status: listing.status,
    })
    .select()
    .single();
  if (error) throw error;

  await logExchangeActivity(
    pharmacyId,
    'listing_created',
    `Your pharmacy listed ${listing.quantity} units of ${listing.medicineName} ${listing.strength} on the exchange.`
  );

  const { data: matchingNeeds, error: needsError } = await supabase
    .from('need_medicines')
    .select('*')
    .eq('status', 'Open')
    .eq('medicine_name', listing.medicineName)
    .eq('strength', listing.strength);

  if (!needsError && (matchingNeeds ?? []).length > 0) {
    await Promise.all((matchingNeeds ?? []).map(async (need: any) => {
      if (need.pharmacy_id === pharmacyId) return;
      await createNotification(
        need.pharmacy_id,
        'exchange_match',
        'New exchange match available',
        `${listing.pharmacyName} posted a matching listing for ${listing.medicineName} ${listing.strength}.`
      );
    }));
  }

  return mapExchangeListing(data);
}

export async function updateExchangeListing(id: string, updates: Partial<ExchangeListing>): Promise<ExchangeListing> {
  const patch: any = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.quantity !== undefined) patch.quantity = updates.quantity;
  if (updates.sellingPrice !== undefined) patch.selling_price = updates.sellingPrice;

  const { data, error } = await supabase.from('exchange_listings').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return mapExchangeListing(data);
}

export async function deleteExchangeListing(id: string): Promise<void> {
  const { error } = await supabase.from('exchange_listings').delete().eq('id', id);
  if (error) throw error;
}

// --- NEED MEDICINES (read-only for now — writes come in the Needs step) ---
function mapNeedMedicine(row: any): NeedMedicine {
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    pharmacyName: row.pharmacy_name,
    medicineName: row.medicine_name,
    strength: row.strength ?? '',
    manufacturer: row.manufacturer ?? '',
    requiredQuantity: row.required_quantity,
    maximumPrice: row.maximum_price ?? 0,
    requiredBefore: row.required_before ?? '',
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getNeedMedicines(): Promise<NeedMedicine[]> {
  const { data, error } = await supabase
    .from('need_medicines')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapNeedMedicine);
}

export async function addNeedMedicine(
  pharmacyId: string,
  need: Omit<NeedMedicine, 'id' | 'createdAt' | 'pharmacyId'>
): Promise<NeedMedicine> {
  const { data, error } = await supabase
    .from('need_medicines')
    .insert({
      pharmacy_id: pharmacyId,
      pharmacy_name: need.pharmacyName,
      medicine_name: need.medicineName,
      strength: need.strength,
      manufacturer: need.manufacturer,
      required_quantity: need.requiredQuantity,
      maximum_price: need.maximumPrice,
      required_before: need.requiredBefore || null,
      notes: need.notes ?? null,
      status: need.status,
    })
    .select()
    .single();
  if (error) throw error;

  await logExchangeActivity(
    pharmacyId,
    'need_created',
    `Your pharmacy posted a request for ${need.requiredQuantity} units of ${need.medicineName}.`
  );

  const { data: matchingListings, error: listingsError } = await supabase
    .from('exchange_listings')
    .select('*')
    .eq('status', 'Active')
    .eq('medicine_name', need.medicineName)
    .eq('strength', need.strength);

  if (!listingsError && (matchingListings ?? []).length > 0) {
    await Promise.all((matchingListings ?? []).map(async (listing: any) => {
      if (listing.pharmacy_id === pharmacyId) return;
      await createNotification(
        pharmacyId,
        'exchange_match',
        'New exchange match available',
        `${listing.pharmacy_name} has a matching listing for ${need.medicineName} ${need.strength}.`
      );
    }));
  }

  return mapNeedMedicine(data);
}

export async function updateNeedMedicine(id: string, status: 'Open' | 'Matched' | 'Closed'): Promise<void> {
  const { error } = await supabase.from('need_medicines').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteNeedMedicine(id: string): Promise<void> {
  const { error } = await supabase.from('need_medicines').delete().eq('id', id);
  if (error) throw error;
}

// --- EXCHANGE REQUESTS (read-only for now — writes come in the Requests step) ---
function mapExchangeRequest(row: any): ExchangeRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerPharmacyId: row.buyer_pharmacy_id,
    buyerPharmacyName: row.buyer_pharmacy_name,
    buyerContactEmail: row.buyer_contact_email ?? '',
    buyerContactPhone: row.buyer_contact_phone ?? '',
    buyerAddress: row.buyer_address ?? '',
    sellerPharmacyId: row.seller_pharmacy_id,
    status: row.status,
    counterPrice: row.counter_price ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getExchangeRequests(): Promise<ExchangeRequest[]> {
  const { data, error } = await supabase
    .from('exchange_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapExchangeRequest);
}

export async function addExchangeRequest(
  pharmacyId: string,
  request: Omit<ExchangeRequest, 'id' | 'createdAt' | 'buyerPharmacyId'>
): Promise<ExchangeRequest> {
  const { data, error } = await supabase
    .from('exchange_requests')
    .insert({
      listing_id: request.listingId,
      buyer_pharmacy_id: pharmacyId,
      buyer_pharmacy_name: request.buyerPharmacyName,
      buyer_contact_email: request.buyerContactEmail,
      buyer_contact_phone: request.buyerContactPhone,
      buyer_address: request.buyerAddress,
      seller_pharmacy_id: request.sellerPharmacyId,
      status: request.status,
      counter_price: request.counterPrice ?? null,
      notes: request.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await logExchangeActivity(
    pharmacyId,
    'interest_expressed',
    `Your pharmacy sent an exchange request${request.counterPrice ? ` with a counter-offer of ${formatCurrency(request.counterPrice)}` : ''}.`
  );

  await createNotification(
    request.sellerPharmacyId,
    'exchange_request',
    'New exchange request received',
    `${request.buyerPharmacyName} requested an exchange for your listing.`
  );

  return mapExchangeRequest(data);
}

export async function updateExchangeRequest(
  id: string,
  sellerPharmacyId: string,
  updates: { status: 'Accepted' | 'Rejected' | 'Countered'; counterPrice?: number },
  activityMessage: string
): Promise<void> {
  const patch: any = { status: updates.status };
  if (updates.counterPrice !== undefined) patch.counter_price = updates.counterPrice;

  const { error } = await supabase.from('exchange_requests').update(patch).eq('id', id);
  if (error) throw error;

  const activityType =
    updates.status === 'Accepted' ? 'request_accepted' :
    updates.status === 'Rejected' ? 'request_rejected' : 'interest_expressed';

  await logExchangeActivity(sellerPharmacyId, activityType, activityMessage);
}

import { StaffInvite } from '../types';

// --- TEAM MEMBERS (real profiles belonging to your pharmacy) ---
export async function getTeamMembers(): Promise<any[]> {
  const { data, error } = await supabase.from('profiles').select('*').not('pharmacy_id', 'is', null);
  if (error) throw error;
  return data ?? [];
}

export async function updateStaffRole(profileId: string, role: 'Owner' | 'Manager' | 'Staff'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
  if (error) throw error;
}

// Can't delete another user's auth account from the client (needs admin privileges).
// Instead, unlink them from this pharmacy — RLS then blocks their access to all your data.
export async function removeStaffMember(profileId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ pharmacy_id: null, status: 'Inactive' }).eq('id', profileId);
  if (error) throw error;
}

// --- STAFF INVITES ---
function mapInvite(row: any) {
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    pharmacyName: row.pharmacy_name,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getPendingInvites(): Promise<StaffInvite[]> {
  const { data, error } = await supabase
    .from('staff_invites')
    .select('*')
    .eq('status', 'Pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapInvite);
}

export async function inviteStaffMember(pharmacyId: string, pharmacyName: string, name: string, email: string, role: 'Owner' | 'Manager' | 'Staff'): Promise<void> {
  const { error } = await supabase.from('staff_invites').insert({
    pharmacy_id: pharmacyId,
    pharmacy_name: pharmacyName,
    name,
    email,
    role,
    status: 'Pending',
  });
  if (error) throw error;
}

export async function cancelInvite(id: string): Promise<void> {
  const { error } = await supabase.from('staff_invites').delete().eq('id', id);
  if (error) throw error;
}

// Called from OnboardingPage right after a fresh signup, to check if this email was invited
export async function checkMyInvite(email: string): Promise<StaffInvite | null> {
  const { data, error } = await supabase
    .from('staff_invites')
    .select('*')
    .eq('email', email)
    .eq('status', 'Pending')
    .maybeSingle();
  if (error) throw error;
  return data ? mapInvite(data) : null;
}

export async function acceptInvite(inviteId: string, profileId: string, pharmacyId: string, role: 'Owner' | 'Manager' | 'Staff'): Promise<void> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ pharmacy_id: pharmacyId, role })
    .eq('id', profileId);
  if (profileError) throw profileError;

  const { error: inviteError } = await supabase
    .from('staff_invites')
    .update({ status: 'Accepted' })
    .eq('id', inviteId);
  if (inviteError) throw inviteError;
}
function mapSalvageLog(row: any) {
  return {
    id: row.id,
    batchNumber: row.batch_number,
    medicineName: row.medicine_name,
    quantity: row.quantity,
    method: row.method,
    recoveredAmount: row.recovered_amount,
    lossAvoided: row.loss_avoided,
    date: row.created_at,
  };
}

export async function getSalvageLogs(): Promise<any[]> {
  const { data, error } = await supabase
    .from('salvage_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSalvageLog);
}

// Handles the "Supplier Return / Charity Donation / Liquidation" salvage paths in one go:
// zeroes out the batch, logs the stock movement, and records the salvage log entry.
export async function resolveBatchViaSalvage(
  pharmacyId: string,
  createdBy: string,
  batch: { id: string; medicineId: string; batchNumber: string; quantity: number },
  medicineName: string,
  method: 'Supplier Return' | 'Charity Donation' | 'Liquidation',
  recoveredAmount: number,
  lossAvoided: number
): Promise<void> {
  const { error: batchErr } = await supabase
    .from('batches')
    .update({ quantity: 0 })
    .eq('id', batch.id);
  if (batchErr) throw batchErr;

  const { error: movErr } = await supabase.from('movements').insert({
    pharmacy_id: pharmacyId,
    batch_id: batch.id,
    medicine_id: batch.medicineId,
    type: method === 'Supplier Return' ? 'Return' : 'Adjustment',
    quantity: -batch.quantity,
    created_by: createdBy,
    notes: `Recovery Center Action: Resolved via ${method}`,
  });
  if (movErr) throw movErr;

  const { error: logErr } = await supabase.from('salvage_logs').insert({
    pharmacy_id: pharmacyId,
    batch_number: batch.batchNumber,
    medicine_name: medicineName,
    quantity: batch.quantity,
    method,
    recovered_amount: recoveredAmount,
    loss_avoided: lossAvoided,
  });
  if (logErr) throw logErr;
}

export async function updatePharmacy(pharmacyId: string, data: {
  name: string; licenseNumber: string; gst: string; address: string; phone: string; email: string; upiId?: string; whatsappAdminPhone?: string;
}): Promise<void> {
  const { error } = await supabase.from('pharmacies').update({
    name: data.name,
    license_number: data.licenseNumber,
    gst: data.gst,
    address: data.address,
    phone: data.phone,
    email: data.email,
    upi_id: data.upiId,
    whatsapp_admin_phone: data.whatsappAdminPhone
  }).eq('id', pharmacyId);
  if (error) throw error;
}

export async function updateMyProfileName(profileId: string, name: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ name }).eq('id', profileId);
  if (error) throw error;
}

function mapTicket(row: any) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    priority: row.priority,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    replies: (row.ticket_replies ?? []).map((r: any) => ({
      sender: r.sender,
      message: r.message,
      timestamp: r.created_at,
    })),
  };
}

export async function getSupportTickets(): Promise<any[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, ticket_replies(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTicket);
}

export async function addSupportTicket(pharmacyId: string, ticket: {
  title: string; category: string; priority: string; description: string;
}): Promise<void> {
  const { error } = await supabase.from('support_tickets').insert({
    pharmacy_id: pharmacyId,
    title: ticket.title,
    category: ticket.category,
    priority: ticket.priority,
    description: ticket.description,
  });
  if (error) throw error;
}

export async function addTicketReply(ticketId: string, sender: string, message: string): Promise<void> {
  const { error } = await supabase.from('ticket_replies').insert({
    ticket_id: ticketId,
    sender,
    message,
  });
  if (error) throw error;
}

export async function getAllPharmacies(): Promise<any[]> {
  const { data, error } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllTeamMembersAdmin(): Promise<any[]> {
  const { data, error } = await supabase.from('profiles').select('*').not('pharmacy_id', 'is', null);
  if (error) throw error;
  return data ?? [];
}

export async function getAllSupportTicketsAdmin(): Promise<any[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, ticket_replies(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTicket); // reuses the mapTicket() you already added in Step 23
}

export async function adminUpdateTicketStatus(ticketId: string, status: 'Open' | 'In Progress' | 'Resolved'): Promise<void> {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
  if (error) throw error;
}

export async function getMySubscription(pharmacyId: string): Promise<any | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('pharmacy_id', pharmacyId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSubscriptionCheckout(pharmacyId: string, plan: string): Promise<{ subscriptionId: string; keyId: string }> {
  const { data, error } = await supabase.functions.invoke('create-razorpay-subscription', {
    body: { pharmacyId, plan },
  });
  if (error) throw error;
  return data;
}

export function mapReminderSchedule(row: any): import('../types').ReminderSchedule {
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    customerPhone: row.customer_phone,
    customerName: row.customer_name,
    medicineId: row.medicine_id,
    medicineName: row.medicine_name,
    billId: row.bill_id,
    prescriptionId: row.prescription_id ?? undefined,
    daysSuppliedThisFill: row.days_supplied_this_fill ?? undefined,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function addReminderSchedules(schedules: Omit<import('../types').ReminderSchedule, 'id' | 'createdAt' | 'status'>[]) {
  if (schedules.length === 0) return;
  const { error } = await supabase.from('reminder_schedule').insert(
    schedules.map(s => ({
      pharmacy_id: s.pharmacyId,
      customer_phone: s.customerPhone,
      customer_name: s.customerName,
      medicine_id: s.medicineId,
      medicine_name: s.medicineName,
      bill_id: s.billId,
      prescription_id: s.prescriptionId || null,
      days_supplied_this_fill: s.daysSuppliedThisFill || null,
      due_date: s.dueDate,
      status: 'Pending',
    }))
  );
  if (error) throw error;
}

export async function getReminderSchedules(pharmacyId: string): Promise<import('../types').ReminderSchedule[]> {
  const { data, error } = await supabase
    .from('reminder_schedule')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapReminderSchedule);
}

// -----------------------------------------------------------------------------
// Storage
// -----------------------------------------------------------------------------

export async function uploadPrescriptionImageUrl(file: File | Blob, pharmacyId: string): Promise<string> {
  const fileName = `${pharmacyId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('prescriptions')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading prescription image:', error);
    throw new Error('Failed to upload prescription image');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('prescriptions')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function updateReminderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_schedule')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export function mapPrescription(row: any): import('../types').Prescription {
  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    customerPhone: row.customer_phone,
    customerName: row.customer_name,
    medicineId: row.medicine_id,
    medicineName: row.medicine_name,
    totalDurationDays: row.total_duration_days,
    filledDays: row.filled_days,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getActivePrescription(pharmacyId: string, customerPhone: string, medicineId: string): Promise<import('../types').Prescription | null> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('customer_phone', customerPhone)
    .eq('medicine_id', medicineId)
    .eq('status', 'Active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw error;
  }
  return data ? mapPrescription(data) : null;
}

export async function addPrescription(p: Omit<import('../types').Prescription, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('../types').Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert([{
      pharmacy_id: p.pharmacyId,
      customer_phone: p.customerPhone,
      customer_name: p.customerName,
      medicine_id: p.medicineId,
      medicine_name: p.medicineName,
      total_duration_days: p.totalDurationDays,
      filled_days: p.filledDays,
      status: p.status,
    }])
    .select()
    .single();
  if (error) throw error;
  return mapPrescription(data);
}

export async function updatePrescription(id: string, filledDays: number, status: string): Promise<import('../types').Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update({ 
      filled_days: filledDays,
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapPrescription(data);
}

export async function getPrescriptions(pharmacyId: string): Promise<import('../types').Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('pharmacy_id', pharmacyId);
  if (error) throw error;
  return (data ?? []).map(mapPrescription);
}

// --- OPD / OUT-PATIENT SYSTEM SERVICES ---

const STORAGE_PATIENTS_KEY = 'livafil_opd_patients';
const STORAGE_CONSULTATIONS_KEY = 'livafil_opd_consultations';

export async function getPatients(pharmacyId: string): Promise<import('../types').Patient[]> {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        pharmacyId: row.pharmacy_id,
        uhid: row.uhid,
        name: row.name,
        phone: row.phone,
        gender: row.gender,
        age: row.age,
        bloodGroup: row.blood_group,
        address: row.address,
        allergies: row.allergies,
        chronicConditions: row.chronic_conditions,
        createdAt: row.created_at,
      }));
    }
  } catch (err) {
    // Fallback to local storage if table doesn't exist
  }

  const raw = localStorage.getItem(`${STORAGE_PATIENTS_KEY}_${pharmacyId}`);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return [];
}

export async function addPatient(pharmacyId: string, p: Omit<import('../types').Patient, 'id' | 'createdAt' | 'pharmacyId'>): Promise<import('../types').Patient> {
  let createdPatient: import('../types').Patient = {
    id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    pharmacyId,
    ...p,
    createdAt: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('patients').insert([{
      pharmacy_id: pharmacyId,
      uhid: p.uhid,
      name: p.name,
      phone: p.phone,
      gender: p.gender,
      age: p.age,
      blood_group: p.bloodGroup,
      address: p.address,
      allergies: p.allergies,
      chronic_conditions: p.chronicConditions
    }]).select().single();

    if (!error && data) {
      createdPatient = {
        id: data.id,
        pharmacyId: data.pharmacy_id,
        uhid: data.uhid,
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        age: data.age,
        bloodGroup: data.blood_group,
        address: data.address,
        allergies: data.allergies,
        chronicConditions: data.chronic_conditions,
        createdAt: data.created_at
      };
    }
  } catch (err) {
    // Silent fallback to local storage
  }

  const existing = await getPatients(pharmacyId);
  const updated = [createdPatient, ...existing.filter(x => x.id !== createdPatient.id)];
  localStorage.setItem(`${STORAGE_PATIENTS_KEY}_${pharmacyId}`, JSON.stringify(updated));
  return createdPatient;
}

export async function getOpConsultations(pharmacyId: string): Promise<import('../types').OpConsultation[]> {
  try {
    const { data, error } = await supabase
      .from('op_consultations')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        pharmacyId: row.pharmacy_id,
        uhid: row.uhid,
        patientName: row.patient_name,
        patientPhone: row.patient_phone,
        gender: row.gender,
        age: row.age,
        doctorName: row.doctor_name,
        vitals: row.vitals,
        diagnosis: row.diagnosis,
        medicines: row.medicines || [],
        consultationFee: row.consultation_fee || 0,
        tokenNumber: row.token_number,
        status: row.status,
        createdAt: row.created_at,
      }));
    }
  } catch (err) {
    // Fallback to local storage
  }

  const raw = localStorage.getItem(`${STORAGE_CONSULTATIONS_KEY}_${pharmacyId}`);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return [];
}

export async function addOpConsultation(pharmacyId: string, c: Omit<import('../types').OpConsultation, 'id' | 'createdAt' | 'pharmacyId'>): Promise<import('../types').OpConsultation> {
  let newConsultation: import('../types').OpConsultation = {
    id: `opc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    pharmacyId,
    ...c,
    createdAt: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('op_consultations').insert([{
      pharmacy_id: pharmacyId,
      uhid: c.uhid,
      patient_name: c.patientName,
      patient_phone: c.patientPhone,
      gender: c.gender,
      age: c.age,
      doctor_name: c.doctorName,
      vitals: c.vitals,
      diagnosis: c.diagnosis,
      medicines: c.medicines,
      consultation_fee: c.consultationFee,
      token_number: c.tokenNumber,
      status: c.status
    }]).select().single();

    if (!error && data) {
      newConsultation = {
        id: data.id,
        pharmacyId: data.pharmacy_id,
        uhid: data.uhid,
        patientName: data.patient_name,
        patientPhone: data.patient_phone,
        gender: data.gender,
        age: data.age,
        doctorName: data.doctor_name,
        vitals: data.vitals,
        diagnosis: data.diagnosis,
        medicines: data.medicines || [],
        consultationFee: data.consultation_fee || 0,
        tokenNumber: data.token_number,
        status: data.status,
        createdAt: data.created_at
      };
    }
  } catch (err) {
    // Silent fallback
  }

  const existing = await getOpConsultations(pharmacyId);
  const updated = [newConsultation, ...existing.filter(x => x.id !== newConsultation.id)];
  localStorage.setItem(`${STORAGE_CONSULTATIONS_KEY}_${pharmacyId}`, JSON.stringify(updated));
  return newConsultation;
}

export async function updateOpConsultationStatus(pharmacyId: string, id: string, status: import('../types').OpConsultationStatus): Promise<void> {
  try {
    await supabase
      .from('op_consultations')
      .update({ status })
      .eq('id', id);
  } catch (err) {}

  const existing = await getOpConsultations(pharmacyId);
  const updated = existing.map(item => item.id === id ? { ...item, status } : item);
  localStorage.setItem(`${STORAGE_CONSULTATIONS_KEY}_${pharmacyId}`, JSON.stringify(updated));
}