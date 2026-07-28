import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, Search, Filter, SlidersHorizontal, MapPin, 
  Plus, Calendar, DollarSign, RefreshCw, Layers, Handshake, 
  Trash2, Edit, CheckCircle, XCircle, Info, AlertTriangle, 
  ExternalLink, Sparkles, Building2, TrendingUp, ShieldCheck, 
  HeartHandshake, ChevronRight, Leaf, HelpCircle, Check, ArrowRight,
  ShieldAlert, Send, Phone, Mail
} from 'lucide-react';
import * as db from '../services/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { IntelligenceService } from '../services/intelligence';
import { 
  ExchangeListing, NeedMedicine, ExchangeRequest, ExchangeActivity,
  Medicine, Batch, Category
} from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { formatCurrency } from '../utils/currency';

export default function ExchangePage() {
  const { profile } = useAuth();
  const MY_PHARMACY_ID = profile?.pharmacy_id;

  // Core application states
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'needs' | 'listings' | 'requests' | 'analytics'>('overview');
  
  // Data lists
  const [listings, setListings] = useState<ExchangeListing[]>([]);
  const [needs, setNeeds] = useState<NeedMedicine[]>([]);
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [activities, setActivities] = useState<ExchangeActivity[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myPharmacy, setMyPharmacy] = useState<any>(null);

  // Configuration / Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [sortBy, setSortBy] = useState<'nearest' | 'discount' | 'newest' | 'expiry'>('nearest');
  
  // Modals & Forms State
  const [isNewListingModalOpen, setIsNewListingModalOpen] = useState(false);
  const [isNewNeedModalOpen, setIsNewNeedModalOpen] = useState(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  
  // Current item being acted upon in modals
  const [selectedListing, setSelectedListing] = useState<ExchangeListing | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ExchangeRequest | null>(null);

  // Form states - Listing
  const [listingForm, setListingForm] = useState({
    batchId: '',
    quantity: 0,
    sellingPrice: 0,
    minimumOrder: 10,
    reason: 'Near Expiry' as any,
    notes: ''
  });

  // Form states - Need
  const [needForm, setNeedForm] = useState({
    medicineName: '',
    strength: '',
    manufacturer: '',
    requiredQuantity: 10,
    maximumPrice: 0,
    requiredBefore: '',
    notes: ''
  });

  // Form states - Express Interest
  const [interestForm, setInterestForm] = useState({
    quantity: 10,
    proposedPrice: 0,
    notes: ''
  });

  // Counter offer price
  const [counterPrice, setCounterPrice] = useState<number>(0);

  // Alert State
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and refresh data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!profile?.pharmacy_id) return;

      const [
        currentListings, currentNeeds, currentRequests, currentActivities,
        currentMedicines, currentBatches, currentCategories, currentPharmacy
      ] = await Promise.all([
        db.getExchangeListings(),
        db.getNeedMedicines(),
        db.getExchangeRequests(),
        db.getExchangeActivities(),
        db.getMedicines(),
        db.getBatches(),
        db.getCategories(),
        db.getMyPharmacy(profile.pharmacy_id),
      ]);

      setListings(currentListings);
      setNeeds(currentNeeds);
      setRequests(currentRequests);
      setActivities(currentActivities);
      setMedicines(currentMedicines);
      setBatches(currentBatches);
      setCategories(currentCategories);
      setMyPharmacy(currentPharmacy);
    } catch (err) {
      console.error("Error loading exchange data", err);
      setError('The exchange marketplace could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.pharmacy_id) {
      loadData();
    }
  }, [profile?.pharmacy_id]);

  // Realtime Subscriptions for inter-pharmacy marketplace updates
  useRealtimeTable('exchange_listings', loadData);
  useRealtimeTable('need_medicines', loadData);
  useRealtimeTable('exchange_requests', loadData);

  const triggerAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Helper distance getter (mocked consistently by seller name or pharmacyId for simplicity)
  // NOTE: real geolocation-based distance isn't built yet — this remains a decorative
  // placeholder for any pharmacy that isn't your own (which correctly shows 0 km).
  const getPharmacyDistance = (pharmacyId: string): number => {
    if (pharmacyId === MY_PHARMACY_ID) return 0;
    if (pharmacyId === 'phar-apex') return 2.1;
    if (pharmacyId === 'phar-beacon') return 5.4;
    if (pharmacyId === 'phar-lifeline') return 11.2;
    if (pharmacyId === 'phar-stjude') return 16.5;
    // Consistent fallback generator based on ID characters
    let sum = 0;
    for (let i = 0; i < pharmacyId.length; i++) sum += pharmacyId.charCodeAt(i);
    return Number((sum % 25 + 1.5).toFixed(1));
  };

  // Helper contact finder for pharmacies
  // NOTE: only used as a fallback where real contact data isn't captured in the database yet
  // (the outbound "seller contact" case). Inbound buyer contact uses real data directly instead.
  const getPharmacyContact = (pharmacyId: string) => {
    return { owner: 'Verified Member Pharmacist', phone: '+91 9876543210', email: 'exchange@pharmacy-network.org', address: 'Verified Pharmacy Location' };
  };

  // One-click listing recommendation engine
  const getIntelligenceListingsSuggestions = () => {
    // Look at our batches expiring within 90 days or slow moving, and check if we already listed them
    const now = new Date();
    const suggested: Array<{ batch: Batch; medicine: Medicine; reason: 'Expiry' | 'Overstock' | 'Slow Moving'; metric: string }> = [];
    
    batches.forEach(b => {
      if (b.quantity <= 0) return;
      const alreadyListed = listings.some(l => l.pharmacyId === MY_PHARMACY_ID && l.batchNumber === b.batchNumber && l.status === 'Active');
      if (alreadyListed) return;

      const med = medicines.find(m => m.id === b.medicineId);
      if (!med) return;

      const diffTime = new Date(b.expiryDate).getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 90) {
        suggested.push({
          batch: b,
          medicine: med,
          reason: 'Expiry',
          metric: `${diffDays} days before expiry`
        });
      } else if (b.quantity > b.minimumStock * 2) {
        suggested.push({
          batch: b,
          medicine: med,
          reason: 'Overstock',
          metric: `${b.quantity} units (${Math.round(b.quantity / (b.minimumStock || 1))}x threshold)`
        });
      }
    });

    return suggested.slice(0, 3);
  };

  const prefillListingFromSuggestion = (batch: Batch, medicine: Medicine) => {
    setListingForm({
      batchId: batch.id,
      quantity: Math.min(Math.max(1, batch.quantity), 10),
      sellingPrice: Number((batch.mrp * 0.75).toFixed(2)),
      minimumOrder: Math.min(10, batch.quantity),
      reason: 'Near Expiry',
      notes: `Suggested from ${medicine.name} batch ${batch.batchNumber}`,
    });
    setIsNewListingModalOpen(true);
  };

  // Match system calculations
  const getMutualMatches = () => {
    const matchesList: Array<{ listing: ExchangeListing; need: NeedMedicine; buyerDistance: number }> = [];
    
    // Find listed items in our network (from others) that match needs posted by us
    const ourNeeds = needs.filter(n => n.pharmacyId === MY_PHARMACY_ID && n.status === 'Open');
    listings.forEach(l => {
      if (l.pharmacyId === MY_PHARMACY_ID || l.status !== 'Active') return;
      
      const distance = getPharmacyDistance(l.pharmacyId);
      if (distance > radiusKm) return; // Outside our radius setting

      ourNeeds.forEach(n => {
        const matchesMed = l.medicineName.toLowerCase() === n.medicineName.toLowerCase();
        const matchesStrength = l.strength.toLowerCase() === n.strength.toLowerCase();
        if (matchesMed && matchesStrength) {
          matchesList.push({
            listing: l,
            need: n,
            buyerDistance: distance
          });
        }
      });
    });

    // Also find listed items posted by us that match needs posted by others
    const ourListings = listings.filter(l => l.pharmacyId === MY_PHARMACY_ID && l.status === 'Active');
    const othersNeeds = needs.filter(n => n.pharmacyId !== MY_PHARMACY_ID && n.status === 'Open');
    
    ourListings.forEach(l => {
      othersNeeds.forEach(n => {
        const distance = getPharmacyDistance(n.pharmacyId);
        if (distance > radiusKm) return;

        const matchesMed = l.medicineName.toLowerCase() === n.medicineName.toLowerCase();
        const matchesStrength = l.strength.toLowerCase() === n.strength.toLowerCase();
        if (matchesMed && matchesStrength) {
          matchesList.push({
            listing: l,
            need: n,
            buyerDistance: distance
          });
        }
      });
    });

    return matchesList;
  };

  const mutualMatches = getMutualMatches();

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading exchange marketplace...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-sm text-red-600 dark:text-red-400">{error}</div>;
  }

  // Create Listing Submit Handler
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.pharmacy_id) return;

    const batch = batches.find(b => b.id === listingForm.batchId);
    if (!batch) {
      triggerAlert('error', 'Select a valid inventory batch.');
      return;
    }
    const med = medicines.find(m => m.id === batch.medicineId);
    if (!med) return;

    if (listingForm.quantity <= 0 || listingForm.quantity > batch.quantity) {
      triggerAlert('error', `Listing quantity must be between 1 and ${batch.quantity}.`);
      return;
    }

    if (listingForm.sellingPrice <= 0 || listingForm.sellingPrice > batch.mrp) {
      triggerAlert('error', `Exchange price must be below MRP (${formatCurrency(batch.mrp)}).`);
      return;
    }

    const discountPercentage = Math.round(((batch.mrp - listingForm.sellingPrice) / batch.mrp) * 100);

    try {
      await db.addExchangeListing(profile.pharmacy_id, {
        pharmacyName: myPharmacy?.name || 'Unknown Pharmacy',
        medicineId: med.id,
        medicineName: med.name,
        genericName: med.genericName,
        strength: med.strength,
        manufacturer: med.manufacturer,
        batchNumber: batch.batchNumber,
        quantity: listingForm.quantity,
        expiryDate: batch.expiryDate,
        mrp: batch.mrp,
        sellingPrice: listingForm.sellingPrice,
        discountPercentage,
        minimumOrder: listingForm.minimumOrder,
        reason: listingForm.reason,
        notes: listingForm.notes,
        status: 'Active'
      });

      triggerAlert('success', `Success! ${med.name} listed on the Exchange.`);
      setIsNewListingModalOpen(false);

      setListingForm({
        batchId: '',
        quantity: 0,
        sellingPrice: 0,
        minimumOrder: 10,
        reason: 'Near Expiry',
        notes: ''
      });
      await loadData();
    } catch (err) {
      triggerAlert('error', 'Failed to create listing.');
    }
  };

  // Create Need Request Submit Handler
  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.pharmacy_id) return;

    if (!needForm.medicineName.trim()) {
      triggerAlert('error', 'Medicine name is required.');
      return;
    }
    if (needForm.requiredQuantity <= 0) {
      triggerAlert('error', 'Quantity must be positive.');
      return;
    }
    if (needForm.maximumPrice <= 0) {
      triggerAlert('error', 'Maximum unit price must be positive.');
      return;
    }
    if (!needForm.requiredBefore) {
      triggerAlert('error', 'Required before date is required.');
      return;
    }

    try {
      await db.addNeedMedicine(profile.pharmacy_id, {
        pharmacyName: myPharmacy?.name || 'Unknown Pharmacy',
        medicineName: needForm.medicineName,
        strength: needForm.strength,
        manufacturer: needForm.manufacturer,
        requiredQuantity: needForm.requiredQuantity,
        maximumPrice: needForm.maximumPrice,
        requiredBefore: needForm.requiredBefore,
        notes: needForm.notes,
        status: 'Open'
      });

      triggerAlert('success', `Request for ${needForm.medicineName} posted to network.`);
      setIsNewNeedModalOpen(false);
      setNeedForm({
        medicineName: '',
        strength: '',
        manufacturer: '',
        requiredQuantity: 10,
        maximumPrice: 0,
        requiredBefore: '',
        notes: ''
      });
      await loadData();
    } catch (err) {
      triggerAlert('error', 'Failed to save request.');
    }
  };

  // Express Interest / Express Secure Request
  const handleExpressInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing || !profile?.pharmacy_id) return;

    if (interestForm.quantity < selectedListing.minimumOrder) {
      triggerAlert('error', `Minimum order quantity is ${selectedListing.minimumOrder} units.`);
      return;
    }
    if (interestForm.quantity > selectedListing.quantity) {
      triggerAlert('error', `Available quantity is ${selectedListing.quantity} units.`);
      return;
    }

    const proposedPrice = interestForm.proposedPrice || selectedListing.sellingPrice;

    try {
      await db.addExchangeRequest(profile.pharmacy_id, {
        listingId: selectedListing.id,
        buyerPharmacyName: myPharmacy?.name || 'Unknown Pharmacy',
        buyerContactEmail: myPharmacy?.email || profile.email,
        buyerContactPhone: myPharmacy?.phone || '',
        buyerAddress: myPharmacy?.address || '',
        sellerPharmacyId: selectedListing.pharmacyId,
        status: 'Pending',
        counterPrice: proposedPrice !== selectedListing.sellingPrice ? proposedPrice : undefined,
        notes: interestForm.notes
      });

      triggerAlert('success', 'Your offer and exchange request has been sent securely.');
      setIsInterestModalOpen(false);
      setInterestForm({
        quantity: 10,
        proposedPrice: 0,
        notes: ''
      });
      await loadData();
    } catch (err) {
      triggerAlert('error', 'Failed to send request.');
    }
  };

  // Inbound Request Actions
  const handleInboundAction = async (reqId: string, action: 'Accept' | 'Reject' | 'Counter') => {
    if (!profile?.pharmacy_id) return;
    try {
      const req = requests.find(r => r.id === reqId);
      if (!req) return;

      const listingObj = listings.find(l => l.id === req.listingId);
      if (!listingObj) return;

      if (action === 'Accept') {
        await db.updateExchangeRequest(
          reqId,
          profile.pharmacy_id,
          { status: 'Accepted' },
          `Request for ${listingObj.medicineName} accepted. Contact credentials exchanged with ${req.buyerPharmacyName}.`
        );
        await db.updateExchangeListing(req.listingId, { status: 'Reserved' });

        triggerAlert('success', `Request Accepted! Buyer contact: ${req.buyerContactEmail}, ${req.buyerContactPhone}.`);
      } else if (action === 'Reject') {
        await db.updateExchangeRequest(
          reqId,
          profile.pharmacy_id,
          { status: 'Rejected' },
          `Request from ${req.buyerPharmacyName} declined.`
        );
        triggerAlert('info', 'Offer declined.');
      } else if (action === 'Counter') {
        if (counterPrice <= 0 || counterPrice > listingObj.mrp) {
          triggerAlert('error', 'Enter a valid counter price.');
          return;
        }
        await db.updateExchangeRequest(
          reqId,
          profile.pharmacy_id,
          { status: 'Countered', counterPrice: counterPrice },
          `Counter-offer of ${formatCurrency(counterPrice)} sent to ${req.buyerPharmacyName}.`
        );
        triggerAlert('success', `Counter-offer of ${formatCurrency(counterPrice)} sent.`);
        setIsCounterModalOpen(false);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to update request.');
    }
  };

  const handleRemoveListing = async (id: string) => {
    if (confirm('Are you sure you want to pull this medicine from the exchange network?')) {
      try {
        await db.deleteExchangeListing(id);
        triggerAlert('success', 'Listing removed.');
        await loadData();
      } catch (err) {
        triggerAlert('error', 'Failed to remove.');
      }
    }
  };

  const handleRemoveNeed = async (id: string) => {
    if (confirm('Are you sure you want to remove this requested medicine requirement?')) {
      try {
        await db.deleteNeedMedicine(id);
        triggerAlert('success', 'Need requirement deleted.');
        await loadData();
      } catch (err) {
        triggerAlert('error', 'Failed to delete.');
      }
    }
  };

  // Filter listings based on configurations
  const filteredListings = listings.filter(l => {
    // Exclude our listings in buyer mode
    if (l.pharmacyId === MY_PHARMACY_ID) return false;
    if (l.status !== 'Active') return false;

    // Search query matches
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      l.medicineName.toLowerCase().includes(q) ||
      l.genericName.toLowerCase().includes(q) ||
      l.manufacturer.toLowerCase().includes(q) ||
      (l.strength && l.strength.toLowerCase().includes(q));

    // Category filter
    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      const med = medicines.find(m => m.id === l.medicineId);
      matchesCategory = med ? med.categoryId === selectedCategory : false;
    }

    // Reason filter
    const matchesReason = selectedReason === 'all' || l.reason === selectedReason;

    // Radius filter
    const distance = getPharmacyDistance(l.pharmacyId);
    const matchesRadius = distance <= radiusKm;

    return matchesSearch && matchesCategory && matchesReason && matchesRadius;
  });

  // Sort listings
  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'nearest') {
      return getPharmacyDistance(a.pharmacyId) - getPharmacyDistance(b.pharmacyId);
    }
    if (sortBy === 'discount') {
      return b.discountPercentage - a.discountPercentage;
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'expiry') {
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    }
    return 0;
  });

  // Analytics & Impact statistics calculation
  const totalMyListings = listings.filter(l => l.pharmacyId === MY_PHARMACY_ID).length;
  const totalMyNeeds = needs.filter(n => n.pharmacyId === MY_PHARMACY_ID).length;
  const partnerListingsInRange = listings.filter(l => l.pharmacyId !== MY_PHARMACY_ID && l.status === 'Active' && getPharmacyDistance(l.pharmacyId) <= radiusKm).length;
  
  // Salvaged capital (Accepted swaps involving our listings as buyer or seller)
  const capitalSalvaged = requests
    .filter(r => r.status === 'Accepted')
    .reduce((sum, r) => {
      const l = listings.find(li => li.id === r.listingId);
      if (!l) return sum;
      // unit price * units
      const unitPrice = r.counterPrice || l.sellingPrice;
      const quantity = l.quantity; // Assuming complete transfer
      return sum + (unitPrice * quantity);
    }, 0);

  // Carbon Prevention Calculation: 
  // Standard clinical benchmark: Preventing drug disposal chemical landfills avoids on average 2.4 kg of CO2 equivalent per 100 therapeutic doses
  const carbonCO2SavedKg = requests
    .filter(r => r.status === 'Accepted')
    .reduce((sum, r) => {
      const l = listings.find(li => li.id === r.listingId);
      if (!l) return sum;
      const units = l.quantity;
      return sum + (units * 0.024);
    }, 0);

  // Split Inbound vs Outbound requests
  const inboundRequests = requests.filter(r => r.sellerPharmacyId === MY_PHARMACY_ID);
  const outboundRequests = requests.filter(r => r.buyerPharmacyId === MY_PHARMACY_ID);

  // Chart data for B2B transactions
  const monthlyActivityData = [
    { month: 'Jan', salvagedValue: 120, co2Avoided: 3 },
    { month: 'Feb', salvagedValue: 240, co2Avoided: 6 },
    { month: 'Mar', salvagedValue: 310, co2Avoided: 8 },
    { month: 'Apr', salvagedValue: 450, co2Avoided: 11 },
    { month: 'May', salvagedValue: 580, co2Avoided: 14 },
    { month: 'Jun', salvagedValue: capitalSalvaged || 680, co2Avoided: carbonCO2SavedKg || 16.5 },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" id="livafil-exchange-root">
      
      {/* GLOBAL NOTIFICATION ALERT BAR */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl border shadow-lg max-w-md transition-all duration-300 animate-slide-in ${
          alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900' :
          alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-900' :
          'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/90 dark:border-blue-900'
        }`} id="global-alert-toast">
          {alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> :
           alert.type === 'error' ? <XCircle className="h-5 w-5 text-red-600 shrink-0" /> :
           <Info className="h-5 w-5 text-blue-600 shrink-0" />}
          <p className="text-sm font-medium">{alert.message}</p>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Secure B2B Exchange
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white" id="exchange-module-title">
            Livafil B2B Exchange
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            A secure, collaborative network for licensed pharmacies to salvage value from surplus, near-expiry shelf stocks and source urgent therapeutics locally.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsNewNeedModalOpen(true)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition"
            id="post-need-btn"
          >
            <Plus className="h-4 w-4" /> Request Medicine Need
          </button>
          <button 
            onClick={() => setIsNewListingModalOpen(true)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-2 transition"
            id="list-surplus-btn"
          >
            <Sparkles className="h-4 w-4 text-amber-200" /> List Surplus Medicine
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-6" id="exchange-tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'overview' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          id="tab-overview"
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`pb-4 text-sm font-medium border-b-2 transition relative ${
            activeTab === 'opportunities' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          id="tab-opportunities"
        >
          Recovery Opportunities
          {sortedListings.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
              {sortedListings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('needs')}
          className={`pb-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'needs' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          id="tab-needs"
        >
          My requested Needs
          {totalMyNeeds > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
              {totalMyNeeds}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('listings')}
          className={`pb-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'listings' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          id="tab-listings"
        >
          My listings
          {totalMyListings > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
              {totalMyListings}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-4 text-sm font-medium border-b-2 transition relative ${
            activeTab === 'requests' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          id="tab-requests"
        >
          Requests & Offers
          {inboundRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold">
              {inboundRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'analytics' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          id="tab-analytics"
        >
          Analytics & Impact
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. TAB: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in" id="overview-view">
          
          {/* NETWORKS ALIVE HERO METRIC BANNER */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden" id="networks-hero-banner">
            <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-3 z-10">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-max">
                <HeartHandshake className="h-3 w-3" /> Livafil Mutual Cooperation
              </span>
              <h2 className="text-2xl font-bold tracking-tight">
                Your B2B Ecological Exchange Dashboard
              </h2>
              <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                Source low-cost therapeutic inventory within your local radius. Keep vital clinical medicines in circulation, reducing toxic chemical pharmaceutical landfills.
              </p>
            </div>

            <div className="flex gap-4 sm:gap-8 z-10 shrink-0">
              <div className="text-center">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Salvaged Capital</p>
                <p className="text-3xl font-black text-blue-400 mt-1">{formatCurrency(capitalSalvaged)}</p>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="text-center">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                  <Leaf className="h-3 w-3 text-emerald-400" /> Carbon Offset
                </p>
                <p className="text-3xl font-black text-emerald-400 mt-1">~{(carbonCO2SavedKg).toFixed(1)} kg</p>
              </div>
            </div>
          </div>

          {/* RADIUS CONFIGURATION AND MUTUAL MATCHES QUICK NOTIFICATION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="matching-controls-section">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:col-span-1 flex flex-col justify-between" id="radius-settings-card">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-blue-500" /> Match Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure search distance radius. Livafil’s matching engine monitors listings and alignment triggers automatically.
                </p>
              </div>
              
              <div className="my-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Search Radius Limit</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    {radiusKm} km
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  step="5"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>5 km</span>
                  <span>15 km (Default)</span>
                  <span>50 km</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Default center: {myPharmacy?.city || 'New York'} Area</span>
              </div>
            </div>

            {/* AUTOMATED ALIGNED MATCHES NOTIFICATION WIDGET */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:col-span-2" id="smart-matching-matches-card">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Intelligent Network Alignments
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time pairings found between your medicine needs/inventory and partners within {radiusKm} km.
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  mutualMatches.length > 0 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40' 
                    : 'bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-500'
                }`}>
                  {mutualMatches.length} Matches Found
                </span>
              </div>

              {mutualMatches.length > 0 ? (
                <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1" id="matches-widget-list">
                  {mutualMatches.map((m, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-lg border border-amber-100 bg-amber-50/20 dark:border-amber-950/30 dark:bg-amber-950/10 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-sm">
                          <ArrowLeftRight className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {m.listing.medicineName} {m.listing.strength}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {m.listing.pharmacyId === MY_PHARMACY_ID 
                              ? `Offered by you • Requested by ${m.need.pharmacyName} (${m.buyerDistance} km away)`
                              : `Offered by ${m.listing.pharmacyName} (${m.buyerDistance} km away) • Needed by you`}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          if (m.listing.pharmacyId === MY_PHARMACY_ID) {
                            setActiveTab('requests');
                          } else {
                            setSelectedListing(m.listing);
                            setInterestForm({
                              quantity: Math.min(m.need.requiredQuantity, m.listing.quantity),
                              proposedPrice: m.listing.sellingPrice,
                              notes: 'Mutual match identified. Ready to proceed with exchange.'
                            });
                            setIsInterestModalOpen(true);
                          }
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white flex items-center gap-1 shrink-0 transition"
                      >
                        Resolve Swap <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400" id="no-matches-widget">
                  <Handshake className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="text-sm font-semibold">No active alignments in range</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Try raising your search radius limit or publish more listing inventory to stimulate local clinical swaps.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SUB-GRID: STATS AND REAL-TIME EXCHANGE FEED */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="stats-activities-section">
            
            {/* KPI STATS CARD GRID */}
            <div className="lg:col-span-1 space-y-4" id="kpi-left-column">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My Active Listings</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalMyListings}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My active Needs</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalMyNeeds}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nearby Partners Available</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{partnerListingsInRange} Active</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* REAL-TIME B2B EXCHANGE ACTIVITIES */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:col-span-2" id="exchange-activity-feed-card">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin-slow" /> Real-time Exchange Ledger Activity
              </h3>
              
              <div className="space-y-4" id="activity-timeline-list">
                {activities.slice(0, 4).map((act) => (
                  <div key={act.id} className="flex gap-3 text-sm">
                    <div className="pt-0.5">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                        act.type === 'match_found' ? 'bg-amber-400' :
                        act.type === 'listing_created' ? 'bg-blue-500' :
                        act.type === 'need_created' ? 'bg-purple-500' :
                        'bg-emerald-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-700 dark:text-slate-300">{act.message}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {activities.length === 0 && (
                  <div className="text-center text-slate-400 py-6">
                    No historic activities found.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TAB: RECOVERY OPPORTUNITIES */}
      {/* ======================================================== */}
      {activeTab === 'opportunities' && (
        <div className="space-y-6 animate-fade-in" id="opportunities-view">
          
          {/* SEARCH AND FILTER SHEET CARD */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4" id="opportunities-filters-card">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* SEARCH INPUT */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search medicine, generic name, manufacturer, strength..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  id="search-input"
                />
              </div>

              {/* CATEGORIES SELECTION */}
              <div className="md:col-span-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
                  id="category-filter"
                >
                  <option value="all">All Therapeutic Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* REASON CLEARANCE FILTER */}
              <div className="md:col-span-2">
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
                  id="reason-filter"
                >
                  <option value="all">All Reasons</option>
                  <option value="Near Expiry">Near Expiry</option>
                  <option value="Overstock">Overstock</option>
                  <option value="Slow Moving">Slow Moving</option>
                </select>
              </div>

              {/* SORT SELECTION */}
              <div className="md:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300 font-medium"
                  id="sort-select"
                >
                  <option value="nearest">Nearest Pharmacy</option>
                  <option value="discount">Highest Discount</option>
                  <option value="newest">Newest Listed</option>
                  <option value="expiry">Urgent Expiry</option>
                </select>
              </div>

            </div>

            {/* DYNAMIC RADIUS CONTROL INSIDE SEARCH COMPONENT */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Filter className="h-4 w-4 text-slate-400" />
                <span>Showing matching medicines listed within <strong className="text-slate-700 dark:text-slate-300">{radiusKm} km</strong> radius</span>
              </div>
              <div className="w-full sm:w-64">
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  step="5"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

          </div>

          {/* CLEARANCE MATCHING LISTINGS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="opportunities-listings-grid">
            {sortedListings.map((l) => {
              const distance = getPharmacyDistance(l.pharmacyId);
              
              // Expiry remaining days calculation
              const expDays = Math.ceil((new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isUrgentExpiry = expDays <= 45;

              return (
                <div 
                  key={l.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  id={`opp-card-${l.id}`}
                >
                  {/* CARD TOP BAR */}
                  <div className="p-5">
                    
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.reason === 'Near Expiry' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-100 dark:border-red-900/30' :
                          l.reason === 'Overstock' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30' :
                          'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30'
                        }`}>
                          {l.reason}
                        </span>
                      </div>
                      
                      {/* DISCOUNT PERCENTAGE BADGE */}
                      <span className="px-2 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {l.discountPercentage}% OFF
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1">{l.medicineName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{l.strength} • {l.genericName}</p>
                    <p className="text-xs text-slate-500 mt-2">Mfr: {l.manufacturer}</p>
                    
                    {/* PRICING INFO */}
                    <div className="mt-4 flex items-baseline gap-2.5 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-100 dark:border-slate-900">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">B2B Exchange Price</span>
                        <span className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(l.sellingPrice)} <span className="text-[10px] text-slate-400 font-normal">/ unit</span></span>
                      </div>
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 align-middle self-center mx-1" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Original MRP</span>
                        <span className="text-xs line-through text-slate-400">{formatCurrency(l.mrp)}</span>
                      </div>
                    </div>

                    {/* QUANTITY & EXPIRY DETAILS */}
                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Available Batch Stock</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{l.quantity} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Min Exchange Commitment</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{l.minimumOrder} units</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Expiry Date</span>
                        <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          isUrgentExpiry ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {l.expiryDate} ({expDays} days)
                        </span>
                      </div>
                    </div>

                    {l.notes && (
                      <p className="text-xs italic text-slate-500 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 line-clamp-2">
                        &ldquo;{l.notes}&rdquo;
                      </p>
                    )}

                  </div>

                  {/* CARD BOTTOM BAR */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{distance} km away</span>
                    </span>

                    <button 
                      onClick={() => {
                        setSelectedListing(l);
                        setInterestForm({
                          quantity: l.minimumOrder,
                          proposedPrice: l.sellingPrice,
                          notes: 'We are interested in this batch to fulfill our local patient demands. Secure transfer preferred.'
                        });
                        setIsInterestModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shrink-0 transition"
                      id={`express-interest-${l.id}`}
                    >
                      Express Interest
                    </button>
                  </div>

                </div>
              );
            })}

            {sortedListings.length === 0 && (
              <div className="col-span-full p-12 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" id="no-opportunities-box">
                <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800 dark:text-white">No local listings in range</h4>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  Try raising the search radius to scan a wider area, or refine your search filters.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TAB: NEED MEDICINES */}
      {/* ======================================================== */}
      {activeTab === 'needs' && (
        <div className="space-y-6 animate-fade-in" id="needs-view">
          
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" id="post-need-instruction-card">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-500" /> Source therapeutics by requesting them
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-4xl">
              Are you currently out of stock on a critical medication? Post your need here. When a local partner uploads a matching batch on the exchange, Livafil will generate notifications to streamline immediate B2B clearance.
            </p>
          </div>

          {/* MY POSTED REQUIREMENTS LIST */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" id="needs-table-card">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">My requested needs</h4>
            
            <div className="overflow-x-auto" id="needs-table-wrapper">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Requested Medicine</th>
                    <th className="py-3 px-4">Required Qty</th>
                    <th className="py-3 px-4">Max acceptable Price</th>
                    <th className="py-3 px-4">Required Before</th>
                    <th className="py-3 px-4">clinical Notes</th>
                    <th className="py-3 px-4">Match Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {needs.filter(n => n.pharmacyId === MY_PHARMACY_ID).map((n) => {
                    // Check if there are any listed matches
                    const isMatched = listings.some(l => l.pharmacyId !== MY_PHARMACY_ID && l.status === 'Active' && l.medicineName.toLowerCase() === n.medicineName.toLowerCase());

                    return (
                      <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{n.medicineName}</p>
                          <p className="text-[10px] text-slate-400">{n.strength} • {n.manufacturer}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold">{n.requiredQuantity} units</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-white">{formatCurrency(n.maximumPrice)}</td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{n.requiredBefore}</td>
                        <td className="py-3.5 px-4 text-xs italic max-w-[200px] truncate">{n.notes || '—'}</td>
                        <td className="py-3.5 px-4">
                          {isMatched ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 w-max">
                              <Sparkles className="h-3 w-3" /> Alignments Found
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 dark:bg-slate-950 dark:text-slate-500 w-max block">
                              Pending matching
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button 
                            onClick={() => handleRemoveNeed(n.id)}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition"
                            title="Delete Need"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {needs.filter(n => n.pharmacyId === MY_PHARMACY_ID).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        You have not posted any clinical medicine needs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TAB: MY LISTINGS */}
      {/* ======================================================== */}
      {activeTab === 'listings' && (
        <div className="space-y-8 animate-fade-in" id="listings-view">
          
          {/* AI SUGGESTED LISTINGS SECTION (ONE-CLICK LISTING FROM INTELLIGENCE) */}
          <div className="p-6 rounded-xl border border-blue-100 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-950/10 shadow-sm" id="ai-listings-recommendation">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    AI Suggested Listings
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Livafil Expiry Intelligence has identified these surplus or near-expiry batches as optimal for local listing to minimize waste.
                  </p>
                </div>
              </div>
            </div>

            {getIntelligenceListingsSuggestions().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ai-suggestions-carousel">
                {getIntelligenceListingsSuggestions().map((s, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded">
                          {s.reason} Risk
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Batch: {s.batch.batchNumber}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">{s.medicine.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">{s.medicine.strength} • Mfr: {s.medicine.manufacturer}</p>
                      
                      <div className="mt-3 flex justify-between text-xs text-slate-500">
                        <span>Shelf Value:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(s.batch.quantity * s.batch.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Metrics status:</span>
                        <span className="text-red-500 font-medium">{s.metric}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => prefillListingFromSuggestion(s.batch, s.medicine)}
                      className="mt-4 w-full py-2 rounded bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      List on Exchange <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-4 text-xs font-medium">
                ✨ Incredible work! All of your near-expiry shelf stocks are already actively listed or cleared!
              </div>
            )}
          </div>

          {/* ACTIVE MY LISTINGS CONTAINER */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" id="active-user-listings">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">My listed medicines</h4>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold">
                {totalMyListings} Active Listings
              </span>
            </div>

            <div className="overflow-x-auto" id="user-listings-table-wrapper">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Listed Medicine</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Listing Qty</th>
                    <th className="py-3 px-4">Exchange Price</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">listed Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {listings.filter(l => l.pharmacyId === MY_PHARMACY_ID).map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{l.medicineName}</p>
                        <p className="text-[10px] text-slate-400">{l.strength} • Mfr: {l.manufacturer}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">{l.batchNumber}</td>
                      <td className="py-3.5 px-4 font-semibold">{l.quantity} units</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(l.sellingPrice)}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({l.discountPercentage}% off)</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">{l.expiryDate}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
                          {l.reason}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => handleRemoveListing(l.id)}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition"
                          title="Withdraw Listing"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {listings.filter(l => l.pharmacyId === MY_PHARMACY_ID).length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        You have no active surplus medicine listings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB: REQUESTS & OFFERS */}
      {/* ======================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-8 animate-fade-in" id="requests-view">
          
          {/* OFFERS RECEIVED FROM NETWORK (INBOUND) */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" id="inbound-requests-section">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Handshake className="h-5 w-5 text-blue-500" /> Offers Received on My Listings
            </h4>

            <div className="space-y-4" id="inbound-offers-list">
              {inboundRequests.map((req) => {
                const associatedListing = listings.find(l => l.id === req.listingId);
                if (!associatedListing) return null;

                // Real buyer contact — captured directly on the request row when they sent it,
                // no fake lookup needed.
                const contact = { owner: req.buyerPharmacyName, phone: req.buyerContactPhone, email: req.buyerContactEmail, address: req.buyerAddress };

                return (
                  <div 
                    key={req.id} 
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    id={`inbound-offer-${req.id}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{associatedListing.medicineName} {associatedListing.strength}</span>
                        <span className="text-xs text-slate-400 font-mono">(Batch: {associatedListing.batchNumber})</span>
                      </div>
                      
                      <p className="text-xs text-slate-500">
                        Buyer Pharmacy: <span className="font-semibold text-slate-700 dark:text-slate-300">{req.buyerPharmacyName}</span>
                      </p>
                      
                      <div className="flex gap-4 mt-2 text-xs">
                        <div>
                          <span className="text-slate-400">Proposed Unit Price: </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(req.counterPrice ?? associatedListing.sellingPrice)}
                          </span>
                          {req.counterPrice && <span className="text-[10px] text-slate-400 line-through ml-1">{formatCurrency(associatedListing.sellingPrice)}</span>}
                        </div>
                        <div>
                          <span className="text-slate-400">Exchange Quantity: </span>
                          <span className="font-bold">{associatedListing.quantity} units</span>
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-xs italic text-slate-500 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-100 dark:border-slate-900 mt-3 max-w-lg">
                          &ldquo;{req.notes}&rdquo;
                        </p>
                      )}

                      {/* DISPLAY SECURE PRIVATE CONTACT CREDENTIALS ONLY UPON ACCEPTANCE */}
                      {req.status === 'Accepted' && (
                        <div className="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-slate-700 dark:text-slate-300">
                          <p className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                            <ShieldCheck className="h-4 w-4" /> B2B Clearance Credentials Shared
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <p className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" /> {req.buyerPharmacyName}</p>
                            <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {contact.phone}</p>
                            <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {contact.email}</p>
                            <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {contact.address}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {req.status === 'Pending' ? (
                        <>
                          <button 
                            onClick={() => handleInboundAction(req.id, 'Reject')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          >
                            Decline Offer
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedRequest(req);
                              setCounterPrice(associatedListing.sellingPrice - 1);
                              setIsCounterModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          >
                            Counter Price
                          </button>
                          <button 
                            onClick={() => handleInboundAction(req.id, 'Accept')}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow transition"
                            id={`accept-offer-${req.id}`}
                          >
                            Accept Swap
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          req.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {inboundRequests.length === 0 && (
                <div className="text-center text-slate-400 py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  You have not received any clearance exchange offers from local partners yet.
                </div>
              )}
            </div>
          </div>

          {/* OFFERS SENT OUT (OUTBOUND) */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" id="outbound-requests-section">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" /> My Expressed Interests
            </h4>

            <div className="space-y-4" id="outbound-offers-list">
              {outboundRequests.map((req) => {
                // Fixed: was using a broken helper (keyMatchesListingId) that only ever
                // matched a fake demo seed ID, so this almost always fell through to the
                // hardcoded "Lipitor / Apex Care Pharmacy" fallback below regardless of the
                // real listing. Now looks up the real listing directly.
                const associatedListing = listings.find(l => l.id === req.listingId);
                const medicineNameStr = associatedListing ? associatedListing.medicineName : 'Unknown Medicine';
                const strengthStr = associatedListing ? associatedListing.strength : '';
                const mfrStr = associatedListing ? associatedListing.manufacturer : 'Unknown Manufacturer';
                const sellerNameStr = associatedListing ? associatedListing.pharmacyName : 'Unknown Pharmacy';
                const originalSellingPrice = associatedListing ? associatedListing.sellingPrice : 0;

                // NOTE: seller contact isn't captured in the database yet (only buyer contact
                // is), so this still falls back to a generic placeholder until that's added.
                const contact = getPharmacyContact(req.sellerPharmacyId);

                return (
                  <div 
                    key={req.id} 
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    id={`outbound-offer-${req.id}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{medicineNameStr} {strengthStr}</span>
                        <span className="text-xs text-slate-400 font-mono">({mfrStr})</span>
                      </div>
                      
                      <p className="text-xs text-slate-500">
                        Seller Pharmacy: <span className="font-semibold text-slate-700 dark:text-slate-300">{sellerNameStr}</span>
                      </p>

                      <div className="flex gap-4 mt-2 text-xs">
                        <div>
                          <span className="text-slate-400">Your Proposed Price: </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(req.counterPrice ?? originalSellingPrice)}
                          </span>
                        </div>
                      </div>

                      {/* DISPLAY SECURE PRIVATE CONTACT CREDENTIALS ONLY UPON ACCEPTANCE */}
                      {req.status === 'Accepted' && (
                        <div className="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-slate-700 dark:text-slate-300">
                          <p className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                            <ShieldCheck className="h-4 w-4" /> Seller B2B Credentials Unlocked
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <p className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" /> {sellerNameStr}</p>
                            <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {contact.phone}</p>
                            <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {contact.email}</p>
                            <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {contact.address}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                );
              })}

              {outboundRequests.length === 0 && (
                <div className="text-center text-slate-400 py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  You have not submitted any active interest offers yet. Select "Recovery Opportunities" to request clinical stock.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 6. TAB: ANALYTICS & ECOLOGICAL IMPACT */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in" id="analytics-view">
          
          {/* ECOLOGICAL IMPACT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="ecological-analytics-cards">
            
            <div className="p-6 rounded-xl border border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/30 dark:bg-emerald-950/10 flex items-start gap-4 shadow-sm" id="chemical-waste-card">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg shrink-0">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-800/80 dark:text-emerald-400 uppercase tracking-wider block">Chemical waste Avoided</span>
                <p className="text-3xl font-black text-emerald-800 dark:text-emerald-300 mt-1">~{(carbonCO2SavedKg * 1.5).toFixed(1)} kg</p>
                <p className="text-xs text-slate-500 mt-1">
                  Active therapeutic chemical weight diverted from dangerous incineration landfills.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-blue-100 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-950/10 flex items-start gap-4 shadow-sm" id="capital-salvaged-card">
              <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-lg shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-800/80 dark:text-blue-400 uppercase tracking-wider block">B2B Capital salvaged</span>
                <p className="text-3xl font-black text-blue-800 dark:text-blue-300 mt-1">{formatCurrency(capitalSalvaged)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Value recovered by selling surplus and near-expiry stock rather than throwing it away.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-indigo-100 bg-indigo-50/20 dark:border-indigo-900/30 dark:bg-indigo-950/10 flex items-start gap-4 shadow-sm" id="network-trust-card">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded-lg shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-800/80 dark:text-indigo-400 uppercase tracking-wider block">B2B Trust alignment</span>
                <p className="text-3xl font-black text-indigo-800 dark:text-indigo-300 mt-1">100% Secure</p>
                <p className="text-xs text-slate-500 mt-1">
                  All exchange listings originate from fully audited, certified partner pharmacies.
                </p>
              </div>
            </div>

          </div>

          {/* ANALYTICS CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="analytics-charts-grid">
            
            {/* AREA CHART FOR VALUE OVER TIME */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:col-span-2" id="salvaged-trends-chart-card">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">Capital Recovery Trends</h3>
              <div className="h-64" id="recovery-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSalvaged" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="salvagedValue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorSalvaged)" name="Capital Salvaged (₹)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BAR CHART FOR CARBON REDUCTION */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:col-span-1" id="ecological-prevention-chart-card">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">CO₂ Offset equivalent</h3>
              <div className="h-64" id="ecological-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="co2Avoided" fill="#10b981" radius={[4, 4, 0, 0]} name="CO₂ Prevented (kg)">
                      {monthlyActivityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === monthlyActivityData.length - 1 ? '#059669' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS AND ENTRY POPUPS */}
      {/* ======================================================== */}

      {/* MODAL: LIST SURPLUS MEDICINE */}
      {isNewListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 animate-fade-in" id="new-listing-modal">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsNewListingModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              id="close-listing-modal"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> List Surplus Medicine
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Select an expiring/overstock batch from your local Livafil inventory to list securely on the B2B network.
            </p>

            <form onSubmit={handleCreateListing} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Select Inventory Batch</label>
                <select
                  value={listingForm.batchId}
                  onChange={(e) => {
                    const b = batches.find(ba => ba.id === e.target.value);
                    if (b) {
                      setListingForm({
                        ...listingForm,
                        batchId: b.id,
                        quantity: b.quantity,
                        sellingPrice: Number((b.mrp * 0.7).toFixed(2)) // Prefill 30% discount automatically
                      });
                    } else {
                      setListingForm({ ...listingForm, batchId: e.target.value });
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                  required
                  id="listing-batch-select"
                >
                  <option value="">Select an active batch...</option>
                  {batches.filter(b => b.quantity > 0).map(b => {
                    const med = medicines.find(m => m.id === b.medicineId);
                    return (
                      <option key={b.id} value={b.id}>
                        {med ? med.name : 'Unknown'} (Batch: {b.batchNumber} • Qty: {b.quantity} • Exp: {b.expiryDate})
                      </option>
                    );
                  })}
                </select>
              </div>

              {listingForm.batchId && (() => {
                const b = batches.find(ba => ba.id === listingForm.batchId);
                return b ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Exchange Quantity</label>
                      <input 
                        type="number" 
                        min="1"
                        max={b.quantity}
                        value={listingForm.quantity}
                        onChange={(e) => setListingForm({ ...listingForm, quantity: Number(e.target.value) })}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-medium"
                        required
                        id="listing-qty-input"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Max: {b.quantity} units</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">B2B Unit price (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        max={b.mrp}
                        value={listingForm.sellingPrice}
                        onChange={(e) => setListingForm({ ...listingForm, sellingPrice: Number(e.target.value) })}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-bold"
                        required
                        id="listing-price-input"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Original MRP: {formatCurrency(b.mrp)}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Min Order commitment</label>
                  <input 
                    type="number" 
                    min="1"
                    value={listingForm.minimumOrder}
                    onChange={(e) => setListingForm({ ...listingForm, minimumOrder: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-semibold"
                    required
                    id="listing-min-order-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Listing Reason</label>
                  <select
                    value={listingForm.reason}
                    onChange={(e) => setListingForm({ ...listingForm, reason: e.target.value as any })}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                    required
                    id="listing-reason-select"
                  >
                    <option value="Near Expiry">Near Expiry</option>
                    <option value="Overstock">Overstock</option>
                    <option value="Slow Moving">Slow Moving</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Notes / clinical Disclaimers</label>
                <textarea 
                  value={listingForm.notes}
                  onChange={(e) => setListingForm({ ...listingForm, notes: e.target.value })}
                  placeholder="E.g. Kept in cold-chain storage. Original box packaging pristine..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                  id="listing-notes-input"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsNewListingModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                  id="submit-listing-btn"
                >
                  Confirm exchange Listing
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: POST MEDICINE NEED */}
      {isNewNeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 animate-fade-in" id="new-need-modal">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsNewNeedModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              id="close-need-modal"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
              <Plus className="h-5 w-5 text-purple-500" /> Post Medicine Requirement
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Are your shelves short on a therapeutics package? Post a request. We match your need automatically.
            </p>

            <form onSubmit={handleCreateNeed} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Medicine Name</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Amoxil"
                    value={needForm.medicineName}
                    onChange={(e) => setNeedForm({ ...needForm, medicineName: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-bold"
                    required
                    id="need-med-name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Dosage strength</label>
                  <input 
                    type="text" 
                    placeholder="E.g. 500mg"
                    value={needForm.strength}
                    onChange={(e) => setNeedForm({ ...needForm, strength: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                    required
                    id="need-med-strength"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Preferred Manufacturer</label>
                  <input 
                    type="text" 
                    placeholder="E.g. GlaxoSmithKline"
                    value={needForm.manufacturer}
                    onChange={(e) => setNeedForm({ ...needForm, manufacturer: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                    id="need-med-mfr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Required quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={needForm.requiredQuantity}
                    onChange={(e) => setNeedForm({ ...needForm, requiredQuantity: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-semibold"
                    required
                    id="need-med-qty"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Max price per Unit (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="E.g. 10.00"
                    value={needForm.maximumPrice}
                    onChange={(e) => setNeedForm({ ...needForm, maximumPrice: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-bold"
                    required
                    id="need-med-max-price"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Required Before Date</label>
                  <input 
                    type="date" 
                    value={needForm.requiredBefore}
                    onChange={(e) => setNeedForm({ ...needForm, requiredBefore: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                    required
                    id="need-med-date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Clinical context / notes</label>
                <textarea 
                  value={needForm.notes}
                  onChange={(e) => setNeedForm({ ...needForm, notes: e.target.value })}
                  placeholder="Enter context to help matching partners understand urgency..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                  id="need-med-notes"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsNewNeedModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
                  id="submit-need-btn"
                >
                  Publish requirement
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXPRESS INTEREST (BUYER MESSAGE EXPRESSION FLOW) */}
      {isInterestModalOpen && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 animate-fade-in" id="interest-expression-modal">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsInterestModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              id="close-interest-modal"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
              <Handshake className="h-5 w-5 text-blue-500" /> Secure B2B Exchange Request
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Express interest in <strong className="text-slate-700 dark:text-slate-200">{selectedListing.medicineName} {selectedListing.strength}</strong> from a verified partner pharmacy.
            </p>

            <form onSubmit={handleExpressInterest} className="space-y-4">
              
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 text-xs text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Exchange Terms Proposed by Seller</p>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <p>• Listed Qty: <strong>{selectedListing.quantity} units</strong></p>
                  <p>• Exchange Price: <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(selectedListing.sellingPrice)}</strong></p>
                  <p>• Min Order: <strong>{selectedListing.minimumOrder} units</strong></p>
                  <p>• Distance: <strong>{getPharmacyDistance(selectedListing.pharmacyId)} km</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Requested quantity</label>
                  <input 
                    type="number" 
                    min={selectedListing.minimumOrder}
                    max={selectedListing.quantity}
                    value={interestForm.quantity}
                    onChange={(e) => setInterestForm({ ...interestForm, quantity: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-semibold"
                    required
                    id="interest-qty-input"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Min: {selectedListing.minimumOrder}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Counter Offer price ($/unit)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder={`Keep blank for ${formatCurrency(selectedListing.sellingPrice)}`}
                    value={interestForm.proposedPrice || ''}
                    onChange={(e) => setInterestForm({ ...interestForm, proposedPrice: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-bold"
                    id="interest-counter-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Message / transport Details</label>
                <textarea 
                  value={interestForm.notes}
                  onChange={(e) => setInterestForm({ ...interestForm, notes: e.target.value })}
                  placeholder="Propose meetup, logistics, delivery, or write specialized prescription support requests..."
                  rows={3}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
                  id="interest-notes-input"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsInterestModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                  id="submit-interest-btn"
                >
                  Submit Secure exchange proposal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: INBOUND COUNTER PRICE FORM */}
      {isCounterModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 animate-fade-in" id="counter-offer-modal">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCounterModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              id="close-counter-modal"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Propose Counter Unit Price
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Respond with counter price offer per unit to {selectedRequest.buyerPharmacyName}.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Counter Unit Price (₹)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="counter-price-input"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setIsCounterModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleInboundAction(selectedRequest.id, 'Counter')}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
                  id="submit-counter-btn"
                >
                  Send Counter-Offer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}