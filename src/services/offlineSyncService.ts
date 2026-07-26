import { OfflineSyncItem } from '../types';

const OFFLINE_QUEUE_KEY = 'livafil_offline_queue_v1';
const CACHE_PREFIX = 'livafil_offline_cache_';

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<(isOnline: boolean, pendingCount: number) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public subscribe(callback: (isOnline: boolean, pendingCount: number) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnlineStatus, this.getQueue().length);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const count = this.getQueue().length;
    this.listeners.forEach((cb) => cb(this.isOnlineStatus, count));
  }

  private handleNetworkChange(isOnline: boolean) {
    this.isOnlineStatus = isOnline;
    this.notify();
    if (isOnline) {
      this.triggerAutoSync();
    }
  }

  // --- LOCAL CACHE MANAGEMENT ---
  public cacheData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to cache data offline:', e);
    }
  }

  public getCachedData<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // --- OFFLINE QUEUE MANAGEMENT ---
  public getQueue(): OfflineSyncItem[] {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  public enqueue(entity: OfflineSyncItem['entity'], action: OfflineSyncItem['action'], payload: any): OfflineSyncItem {
    const queue = this.getQueue();
    const newItem: OfflineSyncItem = {
      id: 'off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      entity,
      action,
      payload,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    queue.push(newItem);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    this.notify();
    return newItem;
  }

  public clearQueue(): void {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    this.notify();
  }

  // --- BACKGROUND SYNC PROCESSOR ---
  public async triggerAutoSync(syncExecutor?: (item: OfflineSyncItem) => Promise<boolean>): Promise<{ success: number; failed: number }> {
    if (!this.isOnlineStatus) return { success: 0, failed: 0 };
    const queue = this.getQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };

    let successCount = 0;
    let failedCount = 0;
    const remainingQueue: OfflineSyncItem[] = [];

    for (const item of queue) {
      try {
        if (syncExecutor) {
          const ok = await syncExecutor(item);
          if (ok) {
            successCount++;
          } else {
            failedCount++;
            remainingQueue.push(item);
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Failed to sync offline item:', item, err);
        failedCount++;
        remainingQueue.push(item);
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    this.notify();
    return { success: successCount, failed: failedCount };
  }
}

export const offlineSync = OfflineSyncService.getInstance();
