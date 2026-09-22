/**
 * BhoomiLens AI - Persistent Client-Side Document Store
 * Combines memory cache with browser IndexedDB to ensure uploaded document scans
 * are permanently visible across browser sessions, page refreshes, and navigation.
 */

const DB_NAME = 'bhoomilens_documents_db';
const STORE_NAME = 'document_blobs';
const blobUrlMap = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not supported'));
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

/**
 * Stores a file in memory and saves it persistently to browser IndexedDB
 */
export function storeBlobUrl(docId: string, file: File | Blob): string {
  // 1. Create fast memory URL
  const existing = blobUrlMap.get(docId);
  if (existing) {
    try { URL.revokeObjectURL(existing); } catch {}
  }
  const url = URL.createObjectURL(file);
  blobUrlMap.set(docId, url);

  // 2. Persist to IndexedDB asynchronously
  getIDB().then((db) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, docId);
  }).catch((err) => {
    console.warn('IndexedDB persistence warning:', err);
  });

  return url;
}

/**
 * Quick synchronous memory lookup
 */
export function getBlobUrl(docId: string): string | null {
  return blobUrlMap.get(docId) ?? null;
}

/**
 * Checks memory or IndexedDB for the document
 */
export async function getPersistentBlobUrl(docId: string): Promise<string | null> {
  const inMemory = blobUrlMap.get(docId);
  if (inMemory) return inMemory;

  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(docId);
      req.onsuccess = () => {
        const fileBlob = req.result;
        if (fileBlob instanceof Blob) {
          const url = URL.createObjectURL(fileBlob);
          blobUrlMap.set(docId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function hasBlobUrl(docId: string): boolean {
  return blobUrlMap.has(docId);
}

export function openDocument(docId: string, fallbackUrl?: string) {
  const url = blobUrlMap.get(docId) ?? fallbackUrl;
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    getPersistentBlobUrl(docId).then((persistentUrl) => {
      if (persistentUrl) {
        window.open(persistentUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Document preview not available. Please re-upload or select the digitized record.');
      }
    });
  }
}
