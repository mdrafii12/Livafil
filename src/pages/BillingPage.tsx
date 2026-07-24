import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus, User, 
  CreditCard, Receipt, History, RotateCcw, BarChart3, Settings, 
  Sparkles, AlertCircle, RefreshCw, Printer, Download, Filter, 
  FileText, ArrowRight, Check, X, Tag, DollarSign, Percent, Info, Camera, Mic
} from 'lucide-react';
import VoiceAgentModal from '../components/VoiceAgentModal';
import { 
  BarChart, Bar, Cell, PieChart, Pie, Legend, Tooltip, 
  ResponsiveContainer, XAxis, YAxis
} from 'recharts';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Medicine, Batch, Category, Movement, Bill, BillItem, CustomerDetails, PaymentMethod, Pharmacy } from '../types';
import { IntelligenceService } from '../services/intelligence';
import { formatCurrency } from '../utils/currency';
import BarcodeScanner from '../components/BarcodeScanner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react';

export default function BillingPage() {
  // DB States
  const { profile } = useAuth();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'checkout' | 'history' | 'returns' | 'analytics'>('checkout');

  // Checkout Module States
  const [cart, setCart] = useState<Array<BillItem & { maxQty: number; expDate: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  
  // Billing Totals and Payment
  const [cartDiscount, setCartDiscount] = useState(0); // general cart discount percentage
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [cardUpiAmount, setCardUpiAmount] = useState(''); // for mixed payments

  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPrescriptionImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Prescriptions tracking
  const [prescriptionInputs, setPrescriptionInputs] = useState<{
    [medicineId: string]: {
      activePrescription?: import('../types').Prescription | null;
      suppliedDays: string;
      totalDays: string;
      loaded: boolean;
      phone: string;
    }
  }>({});

  // History & Returns States
  const [bills, setBills] = useState<Bill[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterPayment, setHistoryFilterPayment] = useState<string>('all');
  const [historyFilterDate, setHistoryFilterDate] = useState<string>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  
  // Return flow
  const [returningBill, setReturningBill] = useState<Bill | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{ [batchId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Customer Request');

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<Bill | null>(null);
  
  // Notification system
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Keyboard navigation focus refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load Initial DB States
  const loadDBState = async () => {
    try {
      const [m, b, c, bl, p] = await Promise.all([
        db.getMedicines(),
        db.getBatches(),
        db.getCategories(),
        db.getBills(),
        profile?.pharmacy_id ? db.getMyPharmacy(profile.pharmacy_id) : Promise.resolve(null)
      ]);
      setMedicines(m);
      setBatches(b);
      setCategories(c);
      setBills(bl);
      if (p) setPharmacy(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDBState();
  }, [profile]);

  // Effect to load active prescriptions when cart or customer phone changes
  useEffect(() => {
    if (!profile?.pharmacy_id || customerPhone.trim().length < 10) return;
    
    const reqMeds = cart.filter(item => {
      const med = medicines.find(m => m.id === item.medicineId);
      return med?.prescriptionRequired;
    });
    
    if (reqMeds.length === 0) return;

    const loadPrescriptions = async () => {
      const newInputs = { ...prescriptionInputs };
      let changed = false;
      
      for (const item of reqMeds) {
        if (!newInputs[item.medicineId]?.loaded || newInputs[item.medicineId].phone !== customerPhone) {
           const ap = await db.getActivePrescription(profile.pharmacy_id, customerPhone, item.medicineId);
           newInputs[item.medicineId] = {
             activePrescription: ap,
             suppliedDays: newInputs[item.medicineId]?.suppliedDays || '',
             totalDays: ap ? '' : (newInputs[item.medicineId]?.totalDays || ''),
             loaded: true,
             phone: customerPhone
           };
           changed = true;
        }
      }
      if (changed) setPrescriptionInputs(newInputs);
    };
    
    const timer = setTimeout(loadPrescriptions, 500);
    return () => clearTimeout(timer);
  }, [customerPhone, cart, profile?.pharmacy_id, medicines]);

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  useEffect(() => {
    // Setup Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+S (or F2) - Focus Medicine Search
      if ((e.altKey && e.key === 's') || e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        showToast('success', 'Focused Medicine Search (Shortcut)');
      }
      // Alt+C (or F4) - Focus Barcode Search
      if ((e.altKey && e.key === 'c') || e.key === 'F4') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        showToast('success', 'Focused Barcode Scanner (Shortcut)');
      }
      // Alt+P (or F8) - Quick Checkout
      if ((e.altKey && e.key === 'p') || e.key === 'F8') {
        e.preventDefault();
        if (activeTab === 'checkout') {
          handleCheckout();
        }
      }
      // Esc - Clear Search
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedMed(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customerName, customerPhone, customerEmail, customerNotes, paymentMethod, cartDiscount, cashReceived, cardUpiAmount]);

  // Toast Helper
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // -------------------------------------------------------------
  // MEDICINE & BARCODE SEARCH LOGIC
  // -------------------------------------------------------------
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      const results = medicines.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.genericName.toLowerCase().includes(q) || 
        m.barcode.includes(q) || 
        m.manufacturer.toLowerCase().includes(q)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, medicines]);

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMed(med);
    // Find active non-expired batches for this medicine
    const medBatches = batches.filter(b => b.medicineId === med.id && b.quantity > 0 && b.status !== 'Expired');
    
    // Sort batches by Expiry Date ascending (FEFO - Earliest Expiry First)
    const sorted = [...medBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    
    setAvailableBatches(sorted);
    
    if (sorted.length > 0) {
      setSelectedBatchId(sorted[0].id); // Auto select FEFO batch
    } else {
      setSelectedBatchId('');
    }
  };

  // Add Item From Search to Cart
  const handleAddFromSearch = () => {
    if (!selectedMed || !selectedBatchId) {
      showToast('error', 'Please select a medicine and active stock batch.');
      return;
    }

    const targetBatch = batches.find(b => b.id === selectedBatchId);
    if (!targetBatch) return;

    // Check if stock is sufficient
    const existingInCart = cart.find(item => item.batchId === targetBatch.id);
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;

    if (currentCartQty + 1 > targetBatch.quantity) {
      showToast('error', `Insufficient stock in batch ${targetBatch.batchNumber}. Only ${targetBatch.quantity} units available.`);
      return;
    }

    if (existingInCart) {
      // Increment
      setCart(cart.map(item => 
        item.batchId === targetBatch.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: parseFloat(((item.quantity + 1) * item.sellingPrice * (1 - item.discount / 100) * (1 + item.tax / 100)).toFixed(2)) }
          : item
      ));
      showToast('success', `Incremented ${selectedMed.name} in cart.`);
    } else {
      // New Item
      const taxRate = 12; // Flat 12% pharmaceutical tax rate
      const sub = parseFloat((1 * targetBatch.sellingPrice * (1 + taxRate / 100)).toFixed(2));
      
      const newItem: BillItem & { maxQty: number; expDate: string } = {
        medicineId: selectedMed.id,
        medicineName: selectedMed.name,
        batchId: targetBatch.id,
        batchNumber: targetBatch.batchNumber,
        quantity: 1,
        mrp: targetBatch.mrp,
        sellingPrice: targetBatch.sellingPrice,
        discount: 0,
        tax: taxRate,
        subtotal: sub,
        maxQty: targetBatch.quantity,
        expDate: targetBatch.expiryDate
      };
      setCart([...cart, newItem]);
      showToast('success', `Added ${selectedMed.name} (Batch: ${targetBatch.batchNumber}) to cart.`);
    }

    // Reset selection
    setSelectedMed(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Simulate Barcode Scanner input
  const handleBarcodeSubmit = (e?: React.FormEvent, explicitBarcode?: string) => {
    if (e) e.preventDefault();
    const codeToSearch = explicitBarcode || barcodeInput.trim();
    if (!codeToSearch) return;

    // Find medicine with exact barcode matching
    const match = medicines.find(m => m.barcode === codeToSearch);
    if (!match) {
      showToast('error', `No medicine found with barcode "${codeToSearch}". Please search manually by name.`);
      if (!explicitBarcode) setBarcodeInput('');
      return;
    }

    // Find active non-expired batches for this medicine
    const medBatches = batches.filter(b => b.medicineId === match.id && b.quantity > 0 && b.status !== 'Expired');
    if (medBatches.length === 0) {
      showToast('error', `Stock unavailable or expired for scanned item: ${match.name}`);
      setBarcodeInput('');
      return;
    }

    // Sort by FEFO (Earliest Expiry First)
    const sortedBatches = [...medBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    const targetBatch = sortedBatches[0]; // Earliest expiry batch

    // Validate cart quantity
    const existingInCart = cart.find(item => item.batchId === targetBatch.id);
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;

    if (currentCartQty + 1 > targetBatch.quantity) {
      showToast('error', `Out of stock for batch ${targetBatch.batchNumber}. Only ${targetBatch.quantity} left.`);
      setBarcodeInput('');
      return;
    }

    if (existingInCart) {
      setCart(cart.map(item => 
        item.batchId === targetBatch.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: parseFloat(((item.quantity + 1) * item.sellingPrice * (1 - item.discount / 100) * (1 + item.tax / 100)).toFixed(2)) }
          : item
      ));
    } else {
      const taxRate = 12;
      const sub = parseFloat((1 * targetBatch.sellingPrice * (1 + taxRate / 100)).toFixed(2));
      
      const newItem: BillItem & { maxQty: number; expDate: string } = {
        medicineId: match.id,
        medicineName: match.name,
        batchId: targetBatch.id,
        batchNumber: targetBatch.batchNumber,
        quantity: 1,
        mrp: targetBatch.mrp,
        sellingPrice: targetBatch.sellingPrice,
        discount: 0,
        tax: taxRate,
        subtotal: sub,
        maxQty: targetBatch.quantity,
        expDate: targetBatch.expiryDate
      };
      setCart([...cart, newItem]);
    }

    showToast('success', `Scanned: ${match.name} (Earliest Batch Auto-selected)`);
    setBarcodeInput('');
  };

  // Quick scanner shortcuts for testing
  const scanShortcut = (barcode: string) => {
    setBarcodeInput(barcode);
    setTimeout(() => {
      // Find matching medicine and execute scanning log
      const match = medicines.find(m => m.barcode === barcode);
      if (match) {
        setBarcodeInput(barcode);
        // Dispatch scanning
        const medBatches = batches.filter(b => b.medicineId === match.id && b.quantity > 0 && b.status !== 'Expired');
        if (medBatches.length > 0) {
          const sorted = [...medBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
          const targetBatch = sorted[0];
          
          const existing = cart.find(item => item.batchId === targetBatch.id);
          const currentQty = existing ? existing.quantity : 0;
          
          if (currentQty + 1 > targetBatch.quantity) {
            showToast('error', `Out of stock in FIFO batch!`);
            setBarcodeInput('');
            return;
          }

          if (existing) {
            setCart(cart.map(item => 
              item.batchId === targetBatch.id 
                ? { ...item, quantity: item.quantity + 1, subtotal: parseFloat(((item.quantity + 1) * item.sellingPrice * (1 - item.discount / 100) * (1 + item.tax / 100)).toFixed(2)) }
                : item
            ));
          } else {
            const taxRate = 12;
            const sub = parseFloat((1 * targetBatch.sellingPrice * (1 + taxRate / 100)).toFixed(2));
            setCart([...cart, {
              medicineId: match.id,
              medicineName: match.name,
              batchId: targetBatch.id,
              batchNumber: targetBatch.batchNumber,
              quantity: 1,
              mrp: targetBatch.mrp,
              sellingPrice: targetBatch.sellingPrice,
              discount: 0,
              tax: taxRate,
              subtotal: sub,
              maxQty: targetBatch.quantity,
              expDate: targetBatch.expiryDate
            }]);
          }
          showToast('success', `Scanned barcode for ${match.name}`);
        } else {
          showToast('error', `Stock is currently unavailable for ${match.name}.`);
        }
      }
      setBarcodeInput('');
    }, 100);
  };

  // -------------------------------------------------------------
  // CART ACTIONS
  // -------------------------------------------------------------
  const updateCartQty = (batchId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter(item => item.batchId !== batchId));
      showToast('success', 'Removed item from cart.');
      return;
    }

    const item = cart.find(c => c.batchId === batchId);
    if (!item) return;

    if (newQty > item.maxQty) {
      showToast('error', `Cannot exceed available batch stock (${item.maxQty} units).`);
      return;
    }

    setCart(cart.map(c => {
      if (c.batchId === batchId) {
        const discountedPrice = c.sellingPrice * (1 - c.discount / 100);
        const sub = parseFloat((newQty * discountedPrice * (1 + c.tax / 100)).toFixed(2));
        return { ...c, quantity: newQty, subtotal: sub };
      }
      return c;
    }));
  };

  const updateCartItemDiscount = (batchId: string, discPercent: number) => {
    const val = Math.max(0, Math.min(100, discPercent));
    setCart(cart.map(c => {
      if (c.batchId === batchId) {
        const discountedPrice = c.sellingPrice * (1 - val / 100);
        const sub = parseFloat((c.quantity * discountedPrice * (1 + c.tax / 100)).toFixed(2));
        return { ...c, discount: val, subtotal: sub };
      }
      return c;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerNotes('');
    setCartDiscount(0);
    setPaymentMethod('Cash');
    setCashReceived('');
    setCardUpiAmount('');
    showToast('success', 'Cart and billing information cleared.');
  };

  // Calculate Subtotals
  const getCartTotals = () => {
    let rawSubtotal = 0; // MRP or raw selling price
    let discountTotal = 0;
    let taxTotal = 0;

    cart.forEach(item => {
      const itemRawSub = item.sellingPrice * item.quantity;
      const itemDisc = itemRawSub * (item.discount / 100);
      const taxable = itemRawSub - itemDisc;
      const itemTax = taxable * (item.tax / 100);
      
      rawSubtotal += itemRawSub;
      discountTotal += itemDisc;
      taxTotal += itemTax;
    });

    // Apply global cart discount
    const globalDiscAmount = (rawSubtotal - discountTotal) * (cartDiscount / 100);
    discountTotal += globalDiscAmount;

    const grandTotal = Math.max(0, parseFloat((rawSubtotal - discountTotal + taxTotal).toFixed(2)));

    return {
      subtotal: parseFloat(rawSubtotal.toFixed(2)),
      discountTotal: parseFloat(discountTotal.toFixed(2)),
      taxTotal: parseFloat(taxTotal.toFixed(2)),
      grandTotal
    };
  };

  const totals = getCartTotals();

  // -------------------------------------------------------------
  // CHECKOUT PROCESSING (INVENTORY SYNC ENGINE)
  // -------------------------------------------------------------
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('error', 'The shopping cart is empty.');
      return;
    }

    if (!profile?.pharmacy_id) {
      showToast('error', 'Authentication error: No cashier session found.');
      return;
    }

    // Validate stock one final time
    for (const item of cart) {
      const batchObj = batches.find(b => b.id === item.batchId);
      if (!batchObj || batchObj.quantity < item.quantity) {
        showToast('error', `Checkout failed: ${item.medicineName} (Batch: ${item.batchNumber}) has insufficient stock in inventory.`);
        return;
      }
      
      // Validate prescription fields
      const med = medicines.find(m => m.id === item.medicineId);
      if (med?.prescriptionRequired) {
        if (customerPhone.trim().length < 10) {
          showToast('error', `A valid customer phone number is required for prescription medicine: ${item.medicineName}`);
          return;
        }
        const pState = prescriptionInputs[item.medicineId];
        if (!pState || !pState.suppliedDays) {
          showToast('error', `Please enter the 'Days supplied' for prescription medicine: ${item.medicineName}`);
          return;
        }
        if (!pState.activePrescription && !pState.totalDays) {
          showToast('error', `Please enter the 'Total prescription duration' for prescription medicine: ${item.medicineName}`);
          return;
        }
      }
    }

    // Prepare Customer Payload
    const customerPayload: CustomerDetails = {
      name: customerName.trim() || 'Walk-in Guest',
      phone: customerPhone.trim() || 'N/A',
      email: customerEmail.trim() || 'guest@livafil.com',
      notes: customerNotes.trim() || undefined
    };

    try {
      let finalPrescriptionImageUrl = undefined;
      
      if (prescriptionImage && prescriptionImage.startsWith('data:image')) {
        try {
          const res = await fetch(prescriptionImage);
          const blob = await res.blob();
          finalPrescriptionImageUrl = await db.uploadPrescriptionImageUrl(blob, profile.pharmacy_id);
        } catch (err) {
          console.error('Failed to upload image', err);
          showToast('error', 'Failed to upload prescription image to storage');
          return;
        }
      } else if (prescriptionImage) {
         finalPrescriptionImageUrl = prescriptionImage;
      }

      // db.addBill handles: creating the bill, creating bill_items, deducting stock,
      // and logging a Sale movement for every item — all in one call.
      const checkoutBill = await db.addBill(profile.pharmacy_id, profile.id, {
        customer: customerPayload,
        items: cart.map(({ maxQty, expDate, ...rest }) => rest), // Strip out UI properties
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        paymentMethod: paymentMethod,
        notes: `Dispensed on ${new Date().toLocaleDateString('en-IN')} via Cashier Terminal`,
        prescriptionImageUrl: finalPrescriptionImageUrl
      });

      // Handle Prescriptions and Reminders
      if (customerPayload.phone && customerPayload.phone !== 'N/A') {
        const reminderSchedules: any[] = [];
        
        for (const item of cart) {
          const med = medicines.find(m => m.id === item.medicineId);
          if (med?.prescriptionRequired) {
            const presData = prescriptionInputs[item.medicineId];
            if (presData && presData.suppliedDays) {
              const supplied = parseInt(presData.suppliedDays);
              let prescriptionId = presData.activePrescription?.id;
              let isCompleted = false;

              if (presData.activePrescription) {
                const newFilled = presData.activePrescription.filledDays + supplied;
                isCompleted = newFilled >= presData.activePrescription.totalDurationDays;
                await db.updatePrescription(
                  presData.activePrescription.id,
                  newFilled,
                  isCompleted ? 'Completed' : 'Active'
                );
              } else if (presData.totalDays) {
                const total = parseInt(presData.totalDays);
                isCompleted = supplied >= total;
                const newPresc = await db.addPrescription({
                  pharmacyId: profile.pharmacy_id,
                  customerPhone: customerPayload.phone,
                  customerName: customerPayload.name,
                  medicineId: med.id,
                  medicineName: med.name,
                  totalDurationDays: total,
                  filledDays: supplied,
                  status: isCompleted ? 'Completed' : 'Active'
                });
                prescriptionId = newPresc.id;
              }

              if (!isCompleted && prescriptionId) {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + supplied);
                reminderSchedules.push({
                  pharmacyId: profile.pharmacy_id,
                  customerPhone: customerPayload.phone,
                  customerName: customerPayload.name,
                  medicineId: med.id,
                  medicineName: med.name,
                  billId: checkoutBill.id,
                  prescriptionId: prescriptionId,
                  daysSuppliedThisFill: supplied,
                  dueDate: dueDate.toISOString().split('T')[0],
                });
              }
            }
          }
        }
        
        if (reminderSchedules.length > 0) {
          await db.addReminderSchedules(reminderSchedules);
        }
      }

      // Trigger Intelligence and Expiry Recalculation Engine
      IntelligenceService.runNotificationEngine();

      showToast('success', `Success! Dispensed invoice ${checkoutBill.invoiceNumber}. Inventory updated.`);

      // Auto launch visual thermal receipt print modal
      setActiveReceipt(checkoutBill);

      // Reset State
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerNotes('');
      setPrescriptionImage(null);
      setCartDiscount(0);
      setPaymentMethod('Cash');
      setCashReceived('');
      setCardUpiAmount('');

      // Reload DB states
      await loadDBState();
    } catch (err: any) {
      showToast('error', err.message || 'Checkout failed.');
    }
  };

  // -------------------------------------------------------------
  // RETURNS MANAGEMENT ENGINE
  // -------------------------------------------------------------
  const initiateReturnFlow = (bill: Bill) => {
    setReturningBill(bill);
    const initialQtys: { [batchId: string]: number } = {};
    bill.items.forEach(item => {
      initialQtys[item.batchId] = 0; // default zero returning
    });
    setReturnQuantities(initialQtys);
    setReturnReason('Patient Request');
    setActiveTab('returns');
  };

  const handleProcessReturn = async () => {
    if (!returningBill || !profile?.pharmacy_id) return;

    // Verify returning quantities are valid
    let totalItemsReturned = 0;
    const itemsToProcess: Array<{ batchId: string; medicineId: string; qty: number }> = [];

    for (const item of returningBill.items) {
      const returningQty = returnQuantities[item.batchId] || 0;
      if (returningQty < 0) {
        showToast('error', 'Returned quantities cannot be negative.');
        return;
      }

      const alreadyReturned = returningBill.returnedItems?.[item.batchId] || 0;
      const remainingQty = item.quantity - alreadyReturned;

      if (returningQty > remainingQty) {
        showToast('error', `Cannot return more units than purchased (${remainingQty} units remaining for ${item.medicineName}).`);
        return;
      }

      if (returningQty > 0) {
        totalItemsReturned += returningQty;
        itemsToProcess.push({
          batchId: item.batchId,
          medicineId: item.medicineId,
          qty: returningQty
        });
      }
    }

    if (totalItemsReturned === 0) {
      showToast('error', 'Please select at least 1 item and quantity to return.');
      return;
    }

    // Determine status: Partially Returned or Fully Returned
    const newReturnedMap = { ...(returningBill.returnedItems || {}) };
    returningBill.items.forEach(item => {
      const q = returnQuantities[item.batchId] || 0;
      if (q > 0) {
        newReturnedMap[item.batchId] = (newReturnedMap[item.batchId] || 0) + q;
      }
    });

    let isFullyReturned = true;
    returningBill.items.forEach(item => {
      const totalRet = newReturnedMap[item.batchId] || 0;
      if (totalRet < item.quantity) {
        isFullyReturned = false;
      }
    });

    const updatedStatus = isFullyReturned ? 'Returned' : 'Partially Returned';
    const newNotes = `${returningBill.notes || ''} [Returned ${totalItemsReturned} units on ${new Date().toLocaleDateString('en-IN')}]`.trim();

    try {
      await db.processReturn(
        profile.pharmacy_id,
        profile.id,
        returningBill.id,
        returningBill.invoiceNumber,
        itemsToProcess,
        returnReason,
        updatedStatus,
        newNotes
      );

      IntelligenceService.runNotificationEngine();

      showToast('success', `Returned successfully. Refund processed. Batch stocks replenished.`);

      setReturningBill(null);
      setReturnQuantities({});
      setActiveTab('history');
      await loadDBState();
    } catch (err: any) {
      showToast('error', err.message || 'Return processing failed.');
    }
  };

  // -------------------------------------------------------------
  // STATS & VISUAL ANALYTICS COMPUTATION
  // -------------------------------------------------------------
  const computeAnalyticsData = () => {
    // Current date filter
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Filter bills for today
    const todayBills = bills.filter(b => b.date === todayStr);
    
    const salesCount = todayBills.filter(b => b.status === 'Completed' || b.status === 'Partially Returned').length;
    
    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let totalDiscountAvailed = 0;
    let todayItemsCount = 0;

    todayBills.forEach(b => {
      // Deduct refunds if items were returned
      totalRevenue += b.grandTotal;
      totalTaxCollected += b.taxTotal;
      totalDiscountAvailed += b.discountTotal;
      b.items.forEach(item => todayItemsCount += item.quantity);
    });

    const averageBill = salesCount > 0 ? parseFloat((totalRevenue / salesCount).toFixed(2)) : 0;

    // Payment Methods Breakdown (Pie chart format)
    const paymentMap: { [key: string]: number } = { Cash: 0, UPI: 0, Card: 0, Mixed: 0, Pending: 0 };
    bills.forEach(b => {
      paymentMap[b.paymentMethod] = (paymentMap[b.paymentMethod] || 0) + b.grandTotal;
    });
    const paymentData = Object.keys(paymentMap).map(key => ({
      name: key,
      value: parseFloat(paymentMap[key].toFixed(2))
    })).filter(d => d.value > 0);

    // Top Selling Medicines (Horizontal Bar chart format)
    const medSalesMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    bills.forEach(b => {
      b.items.forEach(item => {
        if (!medSalesMap[item.medicineId]) {
          medSalesMap[item.medicineId] = { name: item.medicineName, quantity: 0, revenue: 0 };
        }
        medSalesMap[item.medicineId].quantity += item.quantity;
        medSalesMap[item.medicineId].revenue += item.subtotal;
      });
    });
    const topMedicines = Object.values(medSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by Category
    const categorySalesMap: { [key: string]: { name: string; value: number } } = {};
    bills.forEach(b => {
      b.items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicineId);
        const catId = med ? med.categoryId : 'uncategorized';
        const cat = categories.find(c => c.id === catId);
        const catName = cat ? cat.name : 'Other';

        if (!categorySalesMap[catName]) {
          categorySalesMap[catName] = { name: catName, value: 0 };
        }
        categorySalesMap[catName].value += item.subtotal;
      });
    });
    const categorySalesData = Object.values(categorySalesMap);

    return {
      todaySalesCount: salesCount,
      todayRevenue: parseFloat(totalRevenue.toFixed(2)),
      todayTax: parseFloat(totalTaxCollected.toFixed(2)),
      todayDiscounts: parseFloat(totalDiscountAvailed.toFixed(2)),
      todayItemsCount,
      averageBill,
      paymentData,
      topMedicines,
      categorySalesData
    };
  };

  const analyticsData = computeAnalyticsData();

  // -------------------------------------------------------------
  // SALES HISTORY LOOKUP FILTERS
  // -------------------------------------------------------------
  const getFilteredBills = () => {
    return bills.filter(b => {
      const q = historySearch.toLowerCase();
      const matchesSearch = !q || 
        b.invoiceNumber.toLowerCase().includes(q) || 
        b.customer.name.toLowerCase().includes(q) || 
        b.customer.phone.includes(q) ||
        b.items.some(item => item.medicineName.toLowerCase().includes(q));

      const matchesPayment = historyFilterPayment === 'all' || b.paymentMethod === historyFilterPayment;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const matchesDate = historyFilterDate === 'all' || 
        (historyFilterDate === 'today' && b.date === todayStr);

      return matchesSearch && matchesPayment && matchesDate;
    });
  };

  const filteredBills = getFilteredBills();

  // Export CSV Simulation
  const exportHistoryCSV = () => {
    let csv = 'Invoice Number,Date,Cashier,Customer,Items Sold,Grand Total,Payment Method,Status\n';
    filteredBills.forEach(b => {
      const itemsText = b.items.map(i => `${i.medicineName} (x${i.quantity})`).join('; ');
      csv += `"${b.invoiceNumber}","${b.date}","${b.cashier}","${b.customer.name} (${b.customer.phone})",${b.items.length},${b.grandTotal},"${b.paymentMethod}","${b.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `livafil-sales-export-${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
    showToast('success', 'Sales history exported successfully as CSV.');
  };

  // Receipt printable handler
  const handlePrintReceipt = () => {
    window.print();
    showToast('success', 'Dispatched thermal print job to hardware spooler.');
  };

 const handleDownloadPDF = (receipt: Bill) => {
  showToast('success', `Generating PDF for ${receipt.invoiceNumber}...`);
  try {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(pharmacy?.name || 'Pharmacy Invoice', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    const fullAddress = [pharmacy?.address, pharmacy?.city, pharmacy?.state, pharmacy?.pincode].filter(Boolean).join(', ');
    if (fullAddress) {
      doc.text(fullAddress, 105, 28, { align: 'center' });
    }
    const detailsLine = [
      pharmacy?.phone ? `Phone: ${pharmacy.phone}` : null,
      pharmacy?.gst ? `GSTIN: ${pharmacy.gst}` : null,
      pharmacy?.licenseNumber ? `Lic: ${pharmacy.licenseNumber}` : null
    ].filter(Boolean).join(' | ');
    doc.text(detailsLine || 'Tax Invoice', 105, 34, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);
    
    doc.text(`Invoice No: ${receipt.invoiceNumber}`, 14, 50);
    doc.text(`Date: ${receipt.date}`, 14, 56);
    doc.text(`Cashier: ${receipt.cashier}`, 14, 62);
    
    doc.text(`Patient: ${receipt.customer.name}`, 140, 50);
    doc.text(`Phone: ${receipt.customer.phone}`, 140, 56);
    
    const tableColumn = ["Medicine", "Batch", "Qty", "Price", "Subtotal"];
    const tableRows = receipt.items.map(item => [
      item.medicineName,
      item.batchNumber,
      item.quantity.toString(),
      formatCurrency(item.sellingPrice),
      formatCurrency(item.subtotal)
    ]);
    
    (doc as any).autoTable({
      startY: 70,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 70;
    
    doc.text(`Subtotal: ${formatCurrency(receipt.subtotal)}`, 140, finalY + 10);
    doc.text(`Tax (12%): ${formatCurrency(receipt.taxTotal)}`, 140, finalY + 16);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ${formatCurrency(receipt.grandTotal)}`, 140, finalY + 24);
    
    if (pharmacy?.upiId) {
      const qrCanvas = document.getElementById('upi-qr-canvas') as HTMLCanvasElement;
      if (qrCanvas) {
        const qrDataUrl = qrCanvas.toDataURL('image/png');
        doc.addImage(qrDataUrl, 'PNG', 14, finalY + 10, 30, 30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Scan to Pay via UPI`, 14, finalY + 45);
        doc.text(`UPI ID: ${pharmacy.upiId}`, 14, finalY + 50);
      }
    }
    
    doc.save(`Invoice_${receipt.invoiceNumber}.pdf`);
    showToast('success', 'PDF downloaded successfully.');
  } catch (err: any) {
    showToast('error', `PDF generation failed: ${err.message}`);
  }
};

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // The autoPlay attribute on the video tag should handle play, but we can explicitly call it
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Camera access denied or unavailable.');
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPrescriptionImage(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Toast Notification Alert */}
      {toastMsg && (
        <div className={`print:hidden fixed top-16 right-4 z-50 flex items-center gap-2 p-4 rounded-xl shadow-lg border animate-bounce ${
          toastMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/90 dark:text-red-300 dark:border-red-800'
        }`}>
          {toastMsg.type === 'success' ? <Check className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
          <span className="text-sm font-medium">{toastMsg.text}</span>
        </div>
      )}

      <div className="print:hidden">
      {/* Header and Quick stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-600" /> Quick Billing POS
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dispense prescriptions instantly. Automatic FEFO/FIFO selection, live inventory updates &amp; intelligence recalculation.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 select-none">
          <button 
            onClick={() => setActiveTab('checkout')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'checkout' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Checkout POS
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" /> Sales Ledger
          </button>
          {returningBill && (
            <button 
              onClick={() => setActiveTab('returns')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'returns' 
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-4 h-4" /> Returns Drawer
            </button>
          )}
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Live Insights
          </button>
        </div>
      </div>

      {/* TODAY'S SALES TOP BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(analyticsData.todayRevenue)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Completed Bills</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {analyticsData.todaySalesCount}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Average Cart</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(analyticsData.averageBill)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Prescriptions Dispensed</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {analyticsData.todayItemsCount} units
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CHECKOUT POS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SECTION: MEDICINE SEARCH, AUTOCOMPLETE, BARCODE SIMULATION, CART ITEMS (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* SEARCH PANEL */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Medicine Live Search */}
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Search Prescription Drugs <span className="text-slate-400 text-[10px] font-normal">(Alt+S / F2)</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type name, generic ingredient, batch..."
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm outline-none transition-all"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown Search Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                      {searchResults.map(med => {
                        const activeBts = batches.filter(b => b.medicineId === med.id && b.quantity > 0 && b.status !== 'Expired');
                        const totalStock = activeBts.reduce((acc, curr) => acc + curr.quantity, 0);
                        
                        return (
                          <div 
                            key={med.id}
                            onClick={() => handleSelectMedicine(med)}
                            className="p-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{med.name} <span className="text-slate-500 text-xs font-normal">({med.strength})</span></p>
                              <p className="text-xs text-slate-400 italic font-mono">{med.genericName} • {med.dosageForm}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                totalStock > 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                                totalStock > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
                                'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                              }`}>
                                {totalStock > 0 ? `${totalStock} units` : 'Out of Stock'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Simulated Barcode Input */}
                <div>
                  <form onSubmit={handleBarcodeSubmit}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex justify-between items-center">
                      <span>Barcode Scanning <span className="text-slate-400 text-[10px] font-normal">(Alt+C / F4)</span></span>
                      <button 
                        type="button" 
                        onClick={() => setShowCameraScanner(true)}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" /> Use Camera
                      </button>
                    </label>
                    <div className="relative">
                      <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan or type barcode, press Enter..."
                        className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm outline-none transition-all"
                      />
                    </div>
                  </form>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setVoiceModalOpen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
                    title="Start Voice-to-Cart Billing"
                  >
                    <Mic className="w-4 h-4 animate-pulse" /> Voice Billing
                  </button>
                </div>

              </div>

              {/* QUICK BARCODE SELECTION PALETTE FOR RAPID CASHIER ENTRY */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Barcodes:
                  </span>
                  {medicines.map(med => (
                    <button
                      key={med.id}
                      onClick={() => scanShortcut(med.barcode)}
                      className="text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors font-medium"
                    >
                      <Barcode className="w-3 h-3 text-emerald-500" />
                      <span>Scan {med.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CHOSEN MEDICINE DETAIL INTERACTION FOR MANUAL BATCH/FIFO OVERRIDE */}
              {selectedMed && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">{selectedMed.name} details</h4>
                      <p className="text-xs text-slate-400">{selectedMed.genericName} • strength: {selectedMed.strength}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedMed(null)}
                      className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Select Batch (FEFO First Priority)
                      </label>
                      <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs outline-none focus:border-emerald-500 dark:text-white font-mono"
                      >
                        {availableBatches.length === 0 ? (
                          <option value="">No stock available</option>
                        ) : (
                          availableBatches.map((b, index) => {
                            const now = new Date();
                            const expDate = new Date(b.expiryDate);
                            const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <option key={b.id} value={b.id}>
                                Batch {b.batchNumber} (Stock: {b.quantity} | Selling: {formatCurrency(b.sellingPrice)} | Exp: {b.expiryDate} - {daysLeft}d left) {index === 0 ? '⭐️ FEFO' : ''}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleAddFromSearch}
                        disabled={!selectedBatchId}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Item To Cart
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CART CONTAINER */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[350px]">
              <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 dark:text-white text-base">Cashier Shopping Cart</h2>
                    <p className="text-xs text-slate-400">{cart.length} unique medicines in basket</p>
                  </div>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={clearCart}
                    className="text-xs font-medium text-slate-400 hover:text-red-500 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Empty Basket
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                    <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Receipt Cart is Empty</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    Scan barcodes or search drug names to assemble customer purchases.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                        <th className="py-3 px-4">Medicine Item</th>
                        <th className="py-3 px-3">Batch No.</th>
                        <th className="py-3 px-3 text-center">Qty / Stock</th>
                        <th className="py-3 px-3 text-right">Selling P.</th>
                        <th className="py-3 px-3 text-center">Disc %</th>
                        <th className="py-3 px-3 text-center">Tax %</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {cart.map(item => (
                        <tr key={item.batchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800 dark:text-white text-xs">{item.medicineName}</p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Exp: {item.expDate}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                            {item.batchNumber}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => updateCartQty(item.batchId, item.quantity - 1)}
                                className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-slate-800 dark:text-white w-6 text-center text-xs">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQty(item.batchId, item.quantity + 1)}
                                className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">/ {item.maxQty}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-white">
                            {formatCurrency(item.sellingPrice)}
                            <p className="text-[10px] text-slate-400 line-through">MRP {formatCurrency(item.mrp)}</p>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) => updateCartItemDiscount(item.batchId, parseInt(e.target.value) || 0)}
                                className="w-12 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white py-1 px-1.5 rounded text-center text-xs outline-none border border-slate-200 dark:border-slate-700"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-medium">
                            {item.tax}%
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-white">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              onClick={() => updateCartQty(item.batchId, 0)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SECTION: CUSTOMER DETAILS, PAYMENT SELECTION, GRAND TOTAL (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* CUSTOMER CARD */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" /> Customer Information <span className="text-[10px] bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-slate-400 font-normal rounded-full border border-slate-200 dark:border-slate-700 ml-2">Optional</span>
                </h3>
                {prescriptionImage ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPrescriptionImage(null)} className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors">REMOVE PHOTO</button>
                    <div className="h-8 w-8 rounded overflow-hidden border border-emerald-200 cursor-pointer" onClick={() => window.open(prescriptionImage, '_blank')}>
                      <img src={prescriptionImage} alt="Prescription" className="h-full w-full object-cover" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button onClick={startCamera} className="text-[10px] flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase cursor-pointer">
                      <Camera className="w-3.5 h-3.5" /> Capture Photo
                    </button>
                    <span className="text-slate-300 text-xs">|</span>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="text-[10px] flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase cursor-pointer">
                      Upload Photo
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                  <input 
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest Patient / Walker"
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mobile Phone</label>
                    <input 
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                    <input 
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="patient@gmail.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prescription Notes</label>
                  <textarea 
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Add special dispensing directives..."
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* PAYMENT SUMMARY */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-400" /> Cart &amp; Payment Dispensing
              </h3>

              {/* Totals Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col gap-2.5">
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span>Gross Subtotal</span>
                  <span className="font-medium text-slate-800 dark:text-white">{formatCurrency(totals.subtotal)}</span>
                </div>
                
                {/* Global Discount input field */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-500" /> Apply Promo Discount
                  </span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={cartDiscount}
                      onChange={(e) => setCartDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-0.5 px-1 rounded text-center text-[11px] outline-none font-bold"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>

                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <span>Discount Availed</span>
                    <span>-{formatCurrency(totals.discountTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span>GST Tax (12%)</span>
                  <span className="font-medium text-slate-800 dark:text-white">{formatCurrency(totals.taxTotal)}</span>
                </div>

                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-2.5 mt-1 flex justify-between text-slate-900 dark:text-white font-bold text-sm">
                  <span>Grand Net Payable</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Payment Option</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'UPI', 'Card'] as PaymentMethod[]).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all ${
                        paymentMethod === method 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px]">{method}</span>
                    </button>
                  ))}
                  {(['Mixed', 'Pending'] as PaymentMethod[]).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`col-span-1 py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all ${
                        paymentMethod === method 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px]">{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Context Specific Inputs */}
              {paymentMethod === 'Cash' && (
                <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800 animate-slideDown">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Cash Received:</span>
                    <input 
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="₹0.00"
                      className="w-24 bg-white dark:bg-slate-800 text-right font-semibold p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                  {parseFloat(cashReceived) > totals.grandTotal && (
                    <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 font-bold mt-2">
                      <span>Change to Refund:</span>
                      <span>{formatCurrency(parseFloat(cashReceived) - totals.grandTotal)}</span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'Mixed' && (
                <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 animate-slideDown">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Cash Fraction:</span>
                    <input 
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="₹0.00"
                      className="w-24 bg-white dark:bg-slate-800 text-right p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Card/UPI Fraction:</span>
                    <input 
                      type="number"
                      value={cardUpiAmount}
                      onChange={(e) => setCardUpiAmount(e.target.value)}
                      placeholder="₹0.00"
                      className="w-24 bg-white dark:bg-slate-800 text-right p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* REQUIRED PRESCRIPTIONS UI */}
              {cart.filter(i => medicines.find(m => m.id === i.medicineId)?.prescriptionRequired).length > 0 && customerPhone.length >= 10 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800 animate-slideDown flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 mb-1 text-blue-700 dark:text-blue-400">
                    <Info className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Required Prescriptions</span>
                  </div>
                  {cart.filter(i => medicines.find(m => m.id === i.medicineId)?.prescriptionRequired).map(item => {
                    const med = medicines.find(m => m.id === item.medicineId);
                    const pState = prescriptionInputs[item.medicineId];
                    if (!pState) return null;
                    return (
                      <div key={item.medicineId} className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">{med?.name}</div>
                        {pState.activePrescription ? (
                          <div className="space-y-2">
                            <div className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                              Continuing prescription: {pState.activePrescription.filledDays} / {pState.activePrescription.totalDurationDays} days filled
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Days supplied this purchase:</span>
                              <input 
                                type="number"
                                value={pState.suppliedDays}
                                onChange={(e) => setPrescriptionInputs(prev => ({...prev, [item.medicineId]: {...prev[item.medicineId], suppliedDays: e.target.value}}))}
                                placeholder="Days"
                                className="w-20 bg-slate-50 dark:bg-slate-900 text-right p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Total prescription duration:</span>
                              <input 
                                type="number"
                                value={pState.totalDays}
                                onChange={(e) => setPrescriptionInputs(prev => ({...prev, [item.medicineId]: {...prev[item.medicineId], totalDays: e.target.value}}))}
                                placeholder="Days"
                                className="w-20 bg-slate-50 dark:bg-slate-900 text-right p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Days supplied this purchase:</span>
                              <input 
                                type="number"
                                value={pState.suppliedDays}
                                onChange={(e) => setPrescriptionInputs(prev => ({...prev, [item.medicineId]: {...prev[item.medicineId], suppliedDays: e.target.value}}))}
                                placeholder="Days"
                                className="w-20 bg-slate-50 dark:bg-slate-900 text-right p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ACTION: COMPOSE & GENERATE RECEIPT */}
              <button
                onClick={handleCheckout}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
              >
                <Receipt className="w-5 h-5" /> Dispense &amp; Print Receipt <span className="text-slate-300 text-[10px] font-normal">(Alt+P)</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SALES HISTORY LEDGER VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fadeIn">
          
          {/* Filters Bar */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search Invoice No., Customer Name, Drug..."
                className="w-full bg-white dark:bg-slate-800 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
              <select
                value={historyFilterPayment}
                onChange={(e) => setHistoryFilterPayment(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs outline-none"
              >
                <option value="all">All Payments</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Mixed">Mixed</option>
                <option value="Pending">Pending</option>
              </select>

              <select
                value={historyFilterDate}
                onChange={(e) => setHistoryFilterDate(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs outline-none"
              >
                <option value="all">All Dates</option>
                <option value="today">Today's Transactions</option>
              </select>

              <button
                onClick={exportHistoryCSV}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          {filteredBills.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm">No transaction records matched your search filters.</p>
              <p className="text-xs mt-1">Dispense some bills on the Checkout screen first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-5">Invoice Number</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Patient Customer</th>
                    <th className="py-3 px-3 text-center">Items count</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Payment Method</th>
                    <th className="py-3 px-4 text-center">Receipt Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10">
                      <td className="py-3 px-5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {bill.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {bill.date}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {bill.cashier}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 dark:text-white">{bill.customer.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{bill.customer.phone}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-semibold">
                        {bill.items.reduce((acc, c) => acc + c.quantity, 0)} units
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(bill.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          bill.paymentMethod === 'Cash' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30' :
                          bill.paymentMethod === 'UPI' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30' :
                          bill.paymentMethod === 'Card' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30' :
                          'bg-purple-50 text-purple-700 dark:bg-purple-950/30'
                        }`}>
                          {bill.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          bill.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' :
                          bill.status === 'Returned' ? 'bg-red-50 text-red-700 dark:bg-red-950/30' :
                          'bg-amber-50 text-amber-700 dark:bg-amber-950/30'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setActiveReceipt(bill)}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1 font-semibold text-[11px]"
                          title="Show Thermal Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" /> Receipt
                        </button>

                        {bill.status !== 'Returned' && (
                          <button 
                            onClick={() => initiateReturnFlow(bill)}
                            className="bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 p-1.5 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold text-[11px]"
                            title="Return Prescriptions"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RETURNS DRAWER INVENTORY REPLENISHMENT VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && returningBill && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 max-w-2xl mx-auto animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white text-base">Process Refund / Return</h2>
                <p className="text-xs text-slate-400">Restoring stock for invoice {returningBill.invoiceNumber}</p>
              </div>
            </div>
            <button 
              onClick={() => setReturningBill(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Refund Details */}
          <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 mb-4 text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Original Grand Total:</span>
              <span className="font-bold text-slate-850 dark:text-white">{formatCurrency(returningBill.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Patient / Customer:</span>
              <span className="font-medium text-slate-800 dark:text-white">{returningBill.customer.name} ({returningBill.customer.phone})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dispense Cashier:</span>
              <span className="font-medium text-slate-850 dark:text-white">{returningBill.cashier}</span>
            </div>
          </div>

          {/* Items Selector */}
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Configure Refund Volumes</h3>
          <div className="flex flex-col gap-3 mb-5">
            {returningBill.items.map(item => {
              const alreadyReturned = returningBill.returnedItems?.[item.batchId] || 0;
              const remainingQty = item.quantity - alreadyReturned;

              return (
                <div 
                  key={item.batchId}
                  className="flex items-center justify-between border border-slate-100 dark:border-slate-800 p-3 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                >
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-xs">{item.medicineName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">Batch: {item.batchNumber} | Sold: {item.quantity} (Returned: {alreadyReturned})</span>
                  </div>
                  
                  {remainingQty === 0 ? (
                    <span className="text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/20 px-2.5 py-1 rounded-full">
                      Fully Refunded
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Qty returning:</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setReturnQuantities({
                            ...returnQuantities,
                            [item.batchId]: Math.max(0, (returnQuantities[item.batchId] || 0) - 1)
                          })}
                          className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="font-bold text-slate-800 dark:text-white w-6 text-center text-xs">
                          {returnQuantities[item.batchId] || 0}
                        </span>
                        <button 
                          onClick={() => setReturnQuantities({
                            ...returnQuantities,
                            [item.batchId]: Math.min(remainingQty, (returnQuantities[item.batchId] || 0) + 1)
                          })}
                          className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">/ {remainingQty} left</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Return Auditing Reason</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 text-xs border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none"
            >
              <option value="Customer Request">Patient Request / Return</option>
              <option value="Expired Drug">Expired Drug Dispensed (Audit Alert)</option>
              <option value="Damaged Stock">Damaged Physical Product</option>
              <option value="Wrong Dispensing">Cashier Wrong Dosage Selection</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => setReturningBill(null)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessReturn}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-md"
            >
              <RotateCcw className="w-4 h-4" /> Process Restock &amp; Refund
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REALTIME ANALYTICS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* Sales Revenue Breakdown Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[300px]">
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">
              Sales Distribution By Payment Method
            </h3>
            {analyticsData.paymentData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                No payment data compiled yet. Complete sales checkout first.
              </div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={analyticsData.paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analyticsData.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[
                          '#10b981', // Cash - Emerald
                          '#3b82f6', // UPI - Blue
                          '#6366f1', // Card - Indigo
                          '#a855f7', // Mixed - Purple
                          '#f59e0b'  // Pending - Amber
                        ][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Sales Volume by Drug Category */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[300px]">
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">
              Revenue Volume By Drug Category (₹)
            </h3>
            {analyticsData.categorySalesData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                No category sales recorded.
              </div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analyticsData.categorySalesData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {analyticsData.categorySalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[
                          '#3b82f6', '#10b981', '#6366f1', '#a855f7', '#f59e0b'
                        ][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top 5 Medicines Dispensed */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2 flex flex-col min-h-[300px]">
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">
              Top Selling Prescriptions Today (Qty Dispensed)
            </h3>
            {analyticsData.topMedicines.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                No prescriptions dispensed yet today.
              </div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analyticsData.topMedicines} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip formatter={(value, name) => [value, name === 'quantity' ? 'Units Sold' : 'Revenue (₹)']} />
                    <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* 5. RECEIPT VISUAL MODAL (THERMAL INVOICE GENERATOR) */}
      {/* ========================================================================= */}
      {activeReceipt && (
        <>
          {pharmacy?.upiId && (
            <div className="hidden">
              <QRCodeCanvas 
                id="upi-qr-canvas" 
                value={`upi://pay?pa=${pharmacy.upiId}&pn=${encodeURIComponent(pharmacy.name)}&am=${activeReceipt.grandTotal}&cu=INR`} 
                size={200}
                level="M"
              />
            </div>
          )}
      <div id="receipt-overlay" className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div id="receipt-modal-box" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-2xl w-full relative animate-scaleUp max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setActiveReceipt(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print Friendly Segment */}
            <div id="print-area" className="flex flex-col gap-4 font-sans text-xs text-slate-800 dark:text-slate-200 p-2">
              
              {/* Pharmacy Details Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-200 dark:border-slate-700">
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                  {pharmacy?.name || 'Pharmacy Name'}
                </h2>
                {[pharmacy?.address, pharmacy?.city, pharmacy?.state, pharmacy?.pincode].filter(Boolean).join(', ') && (
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {[pharmacy?.address, pharmacy?.city, pharmacy?.state, pharmacy?.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
                <p className="text-[9px] text-slate-400">
                  {pharmacy?.phone ? `Phone: ${pharmacy.phone}` : ''}
                  {pharmacy?.gst ? `${pharmacy?.phone ? ' • ' : ''}GSTIN: ${pharmacy.gst}` : ''}
                  {pharmacy?.licenseNumber ? `${(pharmacy?.phone || pharmacy?.gst) ? ' • ' : ''}Lic: ${pharmacy.licenseNumber}` : ''}
                </p>
              </div>

              {/* Invoice Meta */}
              <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-mono pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>INVOICE NO:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-300">{activeReceipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{activeReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{activeReceipt.cashier}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                  <span>PATIENT:</span>
                  <span className="font-bold text-slate-850 dark:text-slate-300">{activeReceipt.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>PHONE:</span>
                  <span>{activeReceipt.customer.phone}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-2 pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-12 font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  <span className="col-span-6">Medicine Drug</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-4 text-right">Price</span>
                </div>
                {activeReceipt.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-start text-[10px]">
                    <div className="col-span-6">
                      <p className="font-bold text-slate-900 dark:text-white">{item.medicineName}</p>
                      <span className="text-[9px] text-slate-400 font-mono">B:{item.batchNumber}</span>
                    </div>
                    <span className="col-span-2 text-center text-slate-700 dark:text-slate-300 font-bold">{item.quantity}</span>
                    <span className="col-span-4 text-right text-slate-900 dark:text-white font-semibold">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex flex-col gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(activeReceipt.subtotal)}</span>
                </div>
                {activeReceipt.discountTotal > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                    <span>Discount Deductions</span>
                    <span>-{formatCurrency(activeReceipt.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST Taxes (12%)</span>
                  <span>{formatCurrency(activeReceipt.taxTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-950 dark:text-white pt-1">
                  <span>GRAND NET AMOUNT</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(activeReceipt.grandTotal)}</span>
                </div>
                <div className="flex justify-between mt-1 text-[9px] font-mono uppercase">
                  <span>PAID VIA:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Thank you note */}
              <div className="text-center pt-2 font-mono text-[9px] text-slate-400">
                <p>--- THANK YOU ---</p>
                <p className="mt-0.5">Drugs dispensed are non-refundable without valid audit checks.</p>
                <p className="mt-1 font-sans text-[8px] text-emerald-600">Prescription sync powered by Livafil Intelligence</p>
              </div>

            </div>

            {/* Actions Panel */}
            <div className="mt-6 flex gap-3.5 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print Thermal
              </button>
              <button
                onClick={() => handleDownloadPDF(activeReceipt)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
        </>
      )}

      {/* CAMERA MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-scaleIn">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Capture Prescription
              </h2>
              <button 
                onClick={stopCamera} 
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px]">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full max-h-[60vh] object-contain"
              />
            </div>
            
            <div className="p-4 flex justify-center bg-slate-50 dark:bg-slate-800/50">
              <button 
                onClick={capturePhoto}
                className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 border-4 border-blue-200 dark:border-blue-900/50 shadow-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraScanner && (
        <BarcodeScanner 
          onScan={(code) => {
            setShowCameraScanner(false);
            handleBarcodeSubmit(undefined, code);
          }}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
      {/* VOICE BILLING MODAL OVERLAY */}
      <VoiceAgentModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        mode="billing"
        medicines={medicines}
        onAddToCart={(drugQuery, qty) => {
          const match = medicines.find(m => 
            m.name.toLowerCase().includes(drugQuery.toLowerCase()) || 
            m.genericName.toLowerCase().includes(drugQuery.toLowerCase())
          ) || medicines[0];

          if (match) {
            handleSelectMedicine(match);
            showToast('success', `Added ${qty}x ${match.name} to cart by Voice command!`);
          } else {
            showToast('error', `Could not find stock for ${drugQuery}.`);
          }
        }}
      />
    </div>
  );
}
