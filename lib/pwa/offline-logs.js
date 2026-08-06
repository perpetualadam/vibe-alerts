/**
 * IndexedDB cache for notification history (offline-friendly dashboard).
 * Browser-only — safe to import from client components.
 */

const DB_NAME = 'vibealerts-offline';
const DB_VERSION = 1;
const STORE = 'notification_logs';
const MAX_CACHED_ROWS = 100;

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'cacheKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

/**
 * @param {URLSearchParams|string} params
 */
export function logsCacheKey(params) {
  const qs = typeof params === 'string' ? params : params.toString();
  return `logs:${qs || 'default'}`;
}

/**
 * @param {string} cacheKey
 * @param {{ rows: unknown[], total: number, savedAt?: string }} payload
 */
export async function cacheNotificationLogs(cacheKey, payload) {
  try {
    const db = await openDb();
    const rows = Array.isArray(payload.rows)
      ? payload.rows.slice(0, MAX_CACHED_ROWS)
      : [];
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put({
        cacheKey,
        rows,
        total: payload.total ?? rows.length,
        savedAt: new Date().toISOString(),
      });
    });
    db.close();
  } catch {
    // Offline cache is best-effort
  }
}

/**
 * @param {string} cacheKey
 * @returns {Promise<{ rows: unknown[], total: number, savedAt: string }|null>}
 */
export async function getCachedNotificationLogs(cacheKey) {
  try {
    const db = await openDb();
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(cacheKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!row) return null;
    return {
      rows: row.rows ?? [],
      total: row.total ?? 0,
      savedAt: row.savedAt || null,
    };
  } catch {
    return null;
  }
}
