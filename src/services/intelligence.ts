import { Batch, Medicine, Movement, Category, Supplier, Notification } from '../types';
import { formatCurrency } from '../utils/currency';
// Interfaces for our Intelligence Platform
export interface HealthScore {
  score: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical';
  color: string;
  bgColor: string;
  borderColor: string;
  reason: string;
  breakdown: {
    expiredImpact: number;
    expiringImpact: number;
    lowStockImpact: number;
    deadStockImpact: number;
  };
}

export interface RecoveryMetrics {
  potentialRecoveryValue: number;
  potentialLoss: number;
  recoveryPercentage: number;
  recommendations: string[];
}

export interface ExpiryGroup {
  id: string;
  name: string;
  color: string;
  textColor: string;
  bgColor: string;
  count: number;
  totalValue: number;
  batches: Array<Batch & { medicineName: string }>;
}

export interface DeadStockItem {
  id: string;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  value: number;
  estimatedLoss: number;
  daysSinceLastMovement: number;
  expiryDate: string;
  recoverySuggestion: string;
}

export interface SlowMovingItem {
  id: string;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  value: number;
  daysSinceLastMovement: number;
  remainingShelfLifeDays: number;
  recoveryProbability: number; // 0-100
}

export interface LowStockItem {
  id: string;
  medicineName: string;
  currentStock: number;
  minimumStock: number;
  recommendedReorderQty: number;
  supplierName: string;
  supplierId?: string;
  supplierPhone?: string;
}

export interface ValueAnalytics {
  inventoryCost: number;
  inventorySellingValue: number;
  inventoryMrpValue: number;
  potentialProfit: number;
  potentialLoss: number;
  categoryDistribution: { name: string; costValue: number; percentage: number }[];
  supplierDistribution: { name: string; costValue: number; percentage: number }[];
}

export interface SmartRecommendation {
  id: string;
  type: 'discount' | 'reorder' | 'marketplace' | 'reduce_purchase' | 'monitor';
  title: string;
  description: string;
  impactValue: number;
  impactLabel: string;
  medicineId?: string;
  batchNumber?: string;
  priority: 'high' | 'medium' | 'low';
}

export class IntelligenceService {
  static runNotificationEngine(): void {
    // Placeholder to keep billing flows and notification hooks compatible with the migrated Supabase backend.
  }

  /**
   * 1. INVENTORY HEALTH SCORE (0 - 100)
   */
  static getInventoryHealth(batches: Batch[], medicines: Medicine[]): HealthScore {
    if (batches.length === 0) {
      return {
        score: 100,
        rating: 'Excellent',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        borderColor: 'border-emerald-200 dark:border-emerald-900/30',
        reason: 'No stock registered. Add stock to begin measuring health.',
        breakdown: { expiredImpact: 0, expiringImpact: 0, lowStockImpact: 0, deadStockImpact: 0 }
      };
    }

    const totalCost = batches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    const expiredVal = batches.filter(b => b.status === 'Expired').reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    
    const now = new Date();
    const expiringSoonVal = batches.filter(b => {
      if (b.quantity <= 0) return false;
      const diff = new Date(b.expiryDate).getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 90;
    }).reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);

    const lowStockCount = batches.filter(b => b.quantity < b.minimumStock && b.quantity > 0).length;
    const outOfStockCount = batches.filter(b => b.quantity <= 0).length;

    // Calculate deductions
    const expiredRatio = totalCost > 0 ? (expiredVal / totalCost) : 0;
    const expiringRatio = totalCost > 0 ? (expiringSoonVal / totalCost) : 0;
    const lowStockRatio = batches.length > 0 ? ((lowStockCount + outOfStockCount) / batches.length) : 0;

    // Deduct points based on ratios
    // Expired: up to 45 points deduction (e.g. 20% expired is max penalty)
    const expiredImpact = Math.min(45, Math.round(expiredRatio * 200));
    // Expiring within 90 days: up to 25 points deduction
    const expiringImpact = Math.min(25, Math.round(expiringRatio * 100));
    // Low/Out of Stock: up to 20 points deduction
    const lowStockImpact = Math.min(20, Math.round(lowStockRatio * 50));
    // Dead stock estimate (completely non-moving and expired or near-expired): up to 10 points
    const deadStockVal = expiredVal; // Simple proxy
    const deadStockRatio = totalCost > 0 ? (deadStockVal / totalCost) : 0;
    const deadStockImpact = Math.min(10, Math.round(deadStockRatio * 50));

    const score = Math.max(0, 100 - expiredImpact - expiringImpact - lowStockImpact - deadStockImpact);

    let rating: HealthScore['rating'] = 'Excellent';
    let color = 'text-emerald-600 dark:text-emerald-400';
    let bgColor = 'bg-emerald-50 dark:bg-emerald-950/20';
    let borderColor = 'border-emerald-200 dark:border-emerald-800/30';
    let reason = 'Excellent operational status. Expired/low stock is extremely low.';

    if (score < 40) {
      rating = 'Critical';
      color = 'text-red-600 dark:text-red-400';
      bgColor = 'bg-red-50 dark:bg-red-950/30';
      borderColor = 'border-red-200 dark:border-red-900/30';
      reason = `${batches.filter(b => b.status === 'Expired').length} batches are fully expired, tying up ${formatCurrency(expiredVal)} in capital. Immediate write-offs or discount clearances are required.`;
    } else if (score < 60) {
      rating = 'Poor';
      color = 'text-orange-600 dark:text-orange-400';
      bgColor = 'bg-orange-50 dark:bg-orange-950/20';
      borderColor = 'border-orange-200 dark:border-orange-900/30';
      reason = `Significant portion of inventory is expiring soon (${formatCurrency(expiringSoonVal)}) or low in stock. Please execute reorders and apply active discount sales.`;
    } else if (score < 80) {
      rating = 'Average';
      color = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-50 dark:bg-amber-950/20';
      borderColor = 'border-amber-200 dark:border-amber-900/30';
      reason = `${lowStockCount} medicines are below thresholds and require restocking. Minor expiry risks detected.`;
    } else if (score < 90) {
      rating = 'Good';
      color = 'text-blue-600 dark:text-blue-400';
      bgColor = 'bg-blue-50 dark:bg-blue-950/20';
      borderColor = 'border-blue-200 dark:border-blue-900/30';
      reason = 'Healthy shelf composition. Some opportunities exist to discount and liquidate items expiring in 60-90 days.';
    }

    return { score, rating, color, bgColor, borderColor, reason, breakdown: { expiredImpact, expiringImpact, lowStockImpact, deadStockImpact } };
  }

  /**
   * 2. RECOVERY SCORE
   */
  static getRecoveryMetrics(batches: Batch[]): RecoveryMetrics {
    const totalCost = batches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    const expiredVal = batches.filter(b => b.status === 'Expired').reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    
    // Potential Loss = value of fully expired stock + 30% of near-expired stock that fails to sell
    const now = new Date();
    const expiringSoon = batches.filter(b => {
      if (b.quantity <= 0) return false;
      const diff = new Date(b.expiryDate).getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 60;
    });
    
    const expiringSoonVal = expiringSoon.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    const potentialLoss = expiredVal + (expiringSoonVal * 0.35); // Estimated that 35% of stock expiring in <60 days is wasted

    // Potential Recovery Value = expired items that can be returned for partial credit (e.g. 40% of cost)
    // + expiring items sold at a partial discount (e.g. 70% of cost)
    const refundFromExpired = expiredVal * 0.20; // Assume 20% supplier return credit
    const clearanceSalesVal = expiringSoonVal * 0.65; // Sell off near-expiry stock at 35% discount (recovers 65% of cost)
    const potentialRecoveryValue = refundFromExpired + clearanceSalesVal;

    const totalRiskedValue = expiredVal + expiringSoonVal;
    const recoveryPercentage = totalRiskedValue > 0 ? Math.round((potentialRecoveryValue / totalRiskedValue) * 100) : 100;

    const recommendations: string[] = [];
    if (expiredVal > 0) {
      recommendations.push(`Initiate immediate supplier buy-back claims for expired batches to claw back an estimated ${formatCurrency(refundFromExpired)} (20% policy credit).`);
    }
    if (expiringSoonVal > 0) {
      recommendations.push(`Configure a "Flash Expiry Sale" with a 25-35% discount on medicines expiring within 60 days to recover up to ${formatCurrency(clearanceSalesVal)} in cost.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Maintain active expiry audits. No critical loss risks detected on current shelves.');
    }

    return { potentialRecoveryValue, potentialLoss, recoveryPercentage, recommendations };
  }

  /**
   * 3. EXPIRY INTELLIGENCE (Classification Bins)
   */
  static getExpiryTimeline(batches: Batch[], medicines: Medicine[]): ExpiryGroup[] {
    const groups: { [key: string]: { name: string; color: string; textColor: string; bgColor: string; daysMin: number; daysMax: number } } = {
      expired: { name: 'Expired', color: '#ef4444', textColor: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 dark:bg-red-950/20', daysMin: -9999, daysMax: 0 },
      d7: { name: 'Within 7 Days', color: '#f97316', textColor: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-50 dark:bg-orange-950/20', daysMin: 1, daysMax: 7 },
      d15: { name: 'Within 15 Days', color: '#f59e0b', textColor: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 dark:bg-amber-950/20', daysMin: 8, daysMax: 15 },
      d30: { name: 'Within 30 Days', color: '#fbbf24', textColor: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-50 dark:bg-yellow-950/20', daysMin: 16, daysMax: 30 },
      d60: { name: 'Within 60 Days', color: '#3b82f6', textColor: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-950/20', daysMin: 31, daysMax: 60 },
      d90: { name: 'Within 90 Days', color: '#6366f1', textColor: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-50 dark:bg-indigo-950/20', daysMin: 61, daysMax: 90 },
      d180: { name: 'Within 180 Days', color: '#10b981', textColor: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 dark:bg-emerald-950/20', daysMin: 91, daysMax: 180 },
    };

    const result: { [key: string]: ExpiryGroup } = {};
    Object.keys(groups).forEach(key => {
      const g = groups[key];
      result[key] = {
        id: key,
        name: g.name,
        color: g.color,
        textColor: g.textColor,
        bgColor: g.bgColor,
        count: 0,
        totalValue: 0,
        batches: []
      };
    });

    const now = new Date();

    batches.forEach(b => {
      if (b.quantity <= 0) return;
      const med = medicines.find(m => m.id === b.medicineId);
      const medicineName = med ? med.name : 'Unknown';

      const diffTime = new Date(b.expiryDate).getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let matchedKey = '';
      Object.keys(groups).forEach(key => {
        const { daysMin, daysMax } = groups[key];
        if (diffDays >= daysMin && diffDays <= daysMax) {
          matchedKey = key;
        }
      });

      if (matchedKey && result[matchedKey]) {
        result[matchedKey].count += 1;
        result[matchedKey].totalValue += b.quantity * b.purchasePrice;
        result[matchedKey].batches.push({
          ...b,
          medicineName
        });
      }
    });

    return Object.values(result).filter(g => g.count > 0 || g.id === 'expired' || g.id === 'd30');
  }

  /**
   * 4. DEAD STOCK DETECTION
   * Automatically detect inventory with: High quantity, no movement, or near expiry
   */
  static getDeadStock(batches: Batch[], movements: Movement[], medicines: Medicine[]): DeadStockItem[] {
    const now = new Date();
    
    return batches
      .filter(b => b.quantity > 0)
      .map(b => {
        const med = medicines.find(m => m.id === b.medicineId);
        const medicineName = med ? med.name : 'Unknown';

        // Find movements for this specific batch
        const batchMovements = movements.filter(m => m.batchId === b.id);
        
        let daysSinceLastMovement = 30; // Default placeholder
        if (batchMovements.length > 0) {
          const sorted = [...batchMovements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          const lastMovTime = new Date(sorted[0].timestamp).getTime();
          daysSinceLastMovement = Math.ceil((now.getTime() - lastMovTime) / (1000 * 60 * 60 * 24));
        } else {
          // If no movements exist, use the receivedDate or creation date
          const createdTime = new Date(b.receivedDate || b.createdAt).getTime();
          daysSinceLastMovement = Math.max(0, Math.ceil((now.getTime() - createdTime) / (1000 * 60 * 60 * 24)));
        }

        const value = b.quantity * b.purchasePrice;
        const isExpired = new Date(b.expiryDate).getTime() < now.getTime();

        // High quantity, zero movement for > 90 days, or expired
        const isDeadStock = isExpired || (daysSinceLastMovement > 60 && b.quantity > b.minimumStock);

        if (!isDeadStock) return null;

        // Estimated loss: 100% of purchase cost for expired stock; 40% depreciation risk for idle non-moving stock
        const estimatedLoss = isExpired ? value : value * 0.45;

        // Suggestions based on state
        let recoverySuggestion = 'Move to active clearance discount program (30% off)';
        if (isExpired) {
          recoverySuggestion = 'Initiate supplier credit return or dispose with ecological documentation';
        } else if (daysSinceLastMovement > 120) {
          recoverySuggestion = 'Flag for B2B Pharmacy Exchange Listing or 50% discount liquidation';
        } else if (b.quantity > 500) {
          recoverySuggestion = 'Stop upcoming purchase orders. Transfer surplus to high-demand branch';
        }

        return {
          id: b.id,
          batchNumber: b.batchNumber,
          medicineName,
          quantity: b.quantity,
          value,
          estimatedLoss,
          daysSinceLastMovement,
          expiryDate: b.expiryDate,
          recoverySuggestion
        };
      })
      .filter((item): item is DeadStockItem => item !== null)
      .sort((a, b) => b.value - a.value);
  }

  /**
   * 5. SLOW MOVING DETECTION
   * Identify medicines that have not moved for long periods
   */
  static getSlowMoving(batches: Batch[], movements: Movement[], medicines: Medicine[]): SlowMovingItem[] {
    const now = new Date();

    return batches
      .filter(b => b.quantity > 0 && b.status !== 'Expired')
      .map(b => {
        const med = medicines.find(m => m.id === b.medicineId);
        const medicineName = med ? med.name : 'Unknown';

        // Check movements
        const batchMovements = movements.filter(m => m.batchId === b.id);
        let daysSinceLastMovement = 15;
        
        if (batchMovements.length > 0) {
          const sorted = [...batchMovements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          const lastMovTime = new Date(sorted[0].timestamp).getTime();
          daysSinceLastMovement = Math.ceil((now.getTime() - lastMovTime) / (1000 * 60 * 60 * 24));
        } else {
          const createdTime = new Date(b.receivedDate || b.createdAt).getTime();
          daysSinceLastMovement = Math.max(0, Math.ceil((now.getTime() - createdTime) / (1000 * 60 * 60 * 24)));
        }

        const remainingShelfLifeDays = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Probability of recovery drops as expiration approaches and idle time rises
        let recoveryProbability = 95;
        if (remainingShelfLifeDays < 30) {
          recoveryProbability = 20;
        } else if (remainingShelfLifeDays < 90) {
          recoveryProbability = 55;
        } else if (daysSinceLastMovement > 90) {
          recoveryProbability = 70;
        }

        // We classify as Slow Moving if idle for > 45 days
        const isSlowMoving = daysSinceLastMovement > 45;

        if (!isSlowMoving) return null;

        return {
          id: b.id,
          batchNumber: b.batchNumber,
          medicineName,
          quantity: b.quantity,
          value: b.quantity * b.purchasePrice,
          daysSinceLastMovement,
          remainingShelfLifeDays,
          recoveryProbability
        };
      })
      .filter((item): item is SlowMovingItem => item !== null)
      .sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement);
  }

  /**
   * 6. LOW STOCK INTELLIGENCE
   * Show medicines below minimum stock, recommend reorders
   */
static getLowStock(batches: Batch[], medicines: Medicine[], suppliers: Supplier[]): LowStockItem[] {
    // Aggregate stock by medicine
    const medStock: { [medId: string]: { currentStock: number; minStock: number; batches: Batch[] } } = {};
    
    medicines.forEach(m => {
      medStock[m.id] = { currentStock: 0, minStock: 0, batches: [] };
    });

    batches.forEach(b => {
      if (medStock[b.medicineId]) {
        medStock[b.medicineId].currentStock += b.quantity;
        // Take maximum minimum stock defined in batches
        medStock[b.medicineId].minStock = Math.max(medStock[b.medicineId].minStock, b.minimumStock);
        medStock[b.medicineId].batches.push(b);
      }
    });

    return medicines
      .map(m => {
        const stats = medStock[m.id];
        if (!stats) return null;

        const isLow = stats.currentStock < stats.minStock || stats.currentStock === 0;
        if (!isLow) return null;

        // Suggested reorder: Twice the minimum stock minus current stock, rounded up to next 50
        const deficit = stats.minStock * 2 - stats.currentStock;
        const recommendedReorderQty = Math.max(50, Math.ceil(deficit / 50) * 50);

        // Get supplier name from latest batch or a generic default
        let supplierName = 'Any Verified Supplier';
        let supplierId: string | undefined = undefined;
        let supplierPhone: string | undefined = undefined;
        if (stats.batches.length > 0) {
          const s = suppliers.find(sup => sup.id === stats.batches[0].supplierId);
          if (s) {
            supplierName = s.name;
            supplierId = s.id;
            supplierPhone = s.phone;
          }
        } else {
          // Look for any supplier
          if (suppliers.length > 0) {
            supplierName = suppliers[0].name;
            supplierId = suppliers[0].id;
            supplierPhone = suppliers[0].phone;
          }
        }

        return {
          id: m.id,
          medicineName: m.name,
          currentStock: stats.currentStock,
          minimumStock: stats.minStock,
          recommendedReorderQty,
          supplierName,
          supplierId: supplierId || '',
          supplierPhone: supplierPhone || ''
        };
      })
      .filter((item): item is any => item !== null)
      .sort((a, b) => (a.currentStock / (a.minimumStock || 1)) - (b.currentStock / (b.minimumStock || 1))) as LowStockItem[];
  }

  /**
   * 7. INVENTORY VALUE ANALYTICS
   */
static getInventoryValueAnalytics(batches: Batch[], categories: Category[], medicines: Medicine[], suppliers: Supplier[]): ValueAnalytics {    const inventoryCost = batches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    const inventorySellingValue = batches.reduce((sum, b) => sum + (b.quantity * b.sellingPrice), 0);
    const inventoryMrpValue = batches.reduce((sum, b) => sum + (b.quantity * b.mrp), 0);
    
    const expiredVal = batches.filter(b => b.status === 'Expired').reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);
    const now = new Date();
    const nearExpiredVal = batches.filter(b => {
      if (b.quantity <= 0) return false;
      const diff = new Date(b.expiryDate).getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 60;
    }).reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);

    const potentialLoss = expiredVal + (nearExpiredVal * 0.40);
    const potentialProfit = Math.max(0, inventorySellingValue - inventoryCost - potentialLoss);

    // Categories Breakdown
    const catMap: { [id: string]: number } = {};
    categories.forEach(c => { catMap[c.id] = 0; });
    
    batches.forEach(b => {
      const med = medicines.find(m => m.id === b.medicineId);
      if (med && catMap[med.categoryId] !== undefined) {
        catMap[med.categoryId] += b.quantity * b.purchasePrice;
      }
    });

    const categoryDistribution = categories.map(c => {
      const val = catMap[c.id] || 0;
      return {
        name: c.name,
        costValue: val,
        percentage: inventoryCost > 0 ? Math.round((val / inventoryCost) * 100) : 0
      };
    }).filter(item => item.costValue > 0);

    // Suppliers Breakdown
   // Suppliers Breakdown
    const supMap: { [id: string]: number } = {};
    suppliers.forEach(s => { supMap[s.id] = 0; });

    batches.forEach(b => {
      if (b.supplierId && supMap[b.supplierId] !== undefined) {
        supMap[b.supplierId] += b.quantity * b.purchasePrice;
      }
    });

    const supplierDistribution = suppliers.map(s => {
      const val = supMap[s.id] || 0;
      return {
        name: s.name,
        costValue: val,
        percentage: inventoryCost > 0 ? Math.round((val / inventoryCost) * 100) : 0
      };
    }).filter(item => item.costValue > 0);

    return {
      inventoryCost,
      inventorySellingValue,
      inventoryMrpValue,
      potentialProfit,
      potentialLoss,
      categoryDistribution,
      supplierDistribution
    };
  }

  /**
   * 8. SMART RECOMMENDATIONS ENGINE
   * Dynamic, highly relevant business suggestions based on inventory data
   */
  static getSmartRecommendations(batches: Batch[], medicines: Medicine[], movements: Movement[]): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const now = new Date();

    // Recommendation 1: Dead/Expired Stock supplier return credit
    const expiredBatches = batches.filter(b => b.status === 'Expired' && b.quantity > 0);
    expiredBatches.forEach(b => {
      const med = medicines.find(m => m.id === b.medicineId);
      if (med) {
        recommendations.push({
          id: `rec-exp-${b.id}`,
          type: 'marketplace',
          title: 'Execute Supplier Return Claim',
          description: `Batch ${b.batchNumber} of ${med.name} is fully expired with ${b.quantity} units remaining. Claim 20% refund credit under policy terms.`,
          impactValue: b.quantity * b.purchasePrice * 0.20,
          impactLabel: 'Estimated Return Credit',
          medicineId: b.medicineId,
          batchNumber: b.batchNumber,
          priority: 'high'
        });
      }
    });

    // Recommendation 2: Applying discounts for near-expiry stock
    const expiringSoon = batches.filter(b => {
      if (b.quantity <= 0) return false;
      const diff = new Date(b.expiryDate).getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 60;
    });

    expiringSoon.forEach(b => {
      const med = medicines.find(m => m.id === b.medicineId);
      if (med) {
        recommendations.push({
          id: `rec-disc-${b.id}`,
          type: 'discount',
          title: 'Run Expiry Flash Discount (30%)',
          description: `Batch ${b.batchNumber} of ${med.name} expires on ${b.expiryDate} (${Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days left). Liquidate at cost to prevent write-off.`,
          impactValue: b.quantity * b.purchasePrice * 0.70,
          impactLabel: 'Recoverable Cost Capital',
          medicineId: b.medicineId,
          batchNumber: b.batchNumber,
          priority: 'high'
        });
      }
    });

    // Recommendation 3: Low stock reorders
    const lowStocks = this.getLowStock(batches, medicines, []);
    lowStocks.slice(0, 3).forEach(ls => {
      recommendations.push({
        id: `rec-reorder-${ls.id}`,
        type: 'reorder',
        title: `Restock Order: ${ls.medicineName}`,
        description: `Current inventory is at ${ls.currentStock} units (Threshold is ${ls.minimumStock}). Place order for ${ls.recommendedReorderQty} units to fulfill upcoming prescriptions.`,
        impactValue: ls.recommendedReorderQty * 5.5, // Arbitrary average order expense
        impactLabel: 'Restock Investment',
        medicineId: ls.id,
        priority: 'medium'
      });
    });

    // Recommendation 4: Overstock reduction / slowing order frequency
    const overstocks = batches.filter(b => b.quantity > b.minimumStock * 3 && b.quantity > 300);
    overstocks.slice(0, 2).forEach(b => {
      const med = medicines.find(m => m.id === b.medicineId);
      if (med) {
        recommendations.push({
          id: `rec-reduce-${b.id}`,
          type: 'reduce_purchase',
          title: `Reduce Order Cap: ${med.name}`,
          description: `You have massive excess stock (${b.quantity} units) relative to minimum limit (${b.minimumStock}). Pause forthcoming auto-purchase schedules.`,
          impactValue: b.quantity * b.purchasePrice * 0.40,
          impactLabel: 'Savings in Carry Fees',
          medicineId: b.medicineId,
          batchNumber: b.batchNumber,
          priority: 'low'
        });
      }
    });

    // Recommendation 5: Marketplace Listing prep
    const slowMoving = this.getSlowMoving(batches, movements, medicines);
    slowMoving.slice(0, 2).forEach(sm => {
      recommendations.push({
        id: `rec-mkt-${sm.id}`,
        type: 'marketplace',
        title: 'List on MedGuard Exchange',
        description: `Batch ${sm.batchNumber} of ${sm.medicineName} has had 0 sales movements for over ${sm.daysSinceLastMovement} days. Recommend list-transferring surplus to partner clinics.`,
        impactValue: sm.value * 0.80,
        impactLabel: 'Exchange Sales Valuation',
        batchNumber: sm.batchNumber,
        priority: 'medium'
      });
    });

    // Sort by priority and impact value
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return b.impactValue - a.impactValue;
    });
  }

  /**
   * 9. NOTIFICATION INTELLIGENCE
   * Auto-run and inject smart notifications into the db
   */
  
}
