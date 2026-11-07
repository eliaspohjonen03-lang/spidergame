// Pieni IndexedDB-avain-arvo-säilö. Kaikki data pysyy laitteella.

const DB_NAME = 'custom-spider';
const STORE = 'kv';
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? req.result : (undefined as T));
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export const db = {
  get<T>(key: string): Promise<T | undefined> {
    return tx<T>('readonly', (s) => s.get(key));
  },
  set(key: string, value: unknown): Promise<void> {
    return tx('readwrite', (s) => {
      s.put(value, key);
    });
  },
  del(key: string): Promise<void> {
    return tx('readwrite', (s) => {
      s.delete(key);
    });
  },
};

/** Pyytää selaimelta pysyvää tallennustilaa, jotta kuvat eivät katoa. */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* ei tuettu */
  }
}
