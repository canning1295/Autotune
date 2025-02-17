// File: src/utils/localDatabase.ts

/**
 * localDatabase.ts
 * 
 * A TypeScript service that replicates the IndexedDB functionality of localDatabase.js.
 * It provides methods to initialize the DB, save data, retrieve data, etc.
 */

let db: IDBDatabase | null = null;

// We can make this configurable if we still want to vary by user.
// For now, define a default DB name and DB version:
const DEFAULT_DB_NAME = 'Autotune_DB';
const DEFAULT_DB_VERSION = 2;

// Names of object stores, matching the old WPA:
const OBJECT_STORES = [
  'BGs',
  'Profiles',
  'Basal_Rates',
  'Boluses',
  'Combined_Data',
  'Daily_Bolus_Total',
  'Daily_Basal_Total',
  'Daily_Insulin_Total',
];

// A general interface describing how we store items.
export interface IDataObject<T> {
  key: string;
  value: T;
  dataType: string;
  timestamp: string; // or Date as an ISO string
}

/**
 * Initializes the IndexedDB.
 * @param dbName - optional database name if you prefer to pass in something like `Autotune_${userName}`
 * @param dbVersion - optional version
 */
export async function initializeDB(
  dbName: string = DEFAULT_DB_NAME,
  dbVersion: number = DEFAULT_DB_VERSION,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // If already open, just return it
    if (db) {
      return resolve(db);
    }

    // Check for IndexedDB support
    if (!window.indexedDB) {
      alert(
        'This browser does not support IndexedDB. Please use a modern browser (Chrome, Firefox, Safari, etc.).',
      );
      return reject(new Error('IndexedDB not supported in this browser.'));
    }

    const request = window.indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const upgradeDb = request.result;

      // Create object stores if they don't exist
      OBJECT_STORES.forEach((storeName) => {
        if (!upgradeDb.objectStoreNames.contains(storeName)) {
          upgradeDb.createObjectStore(storeName, { keyPath: 'key' });
        }
      });
    };

    request.onsuccess = () => {
      db = request.result;
      // console.log('[localDatabase] DB initialized successfully');
      resolve(db as IDBDatabase);
    };

    request.onerror = () => {
      // console.error('[localDatabase] Error opening DB', request.error);
      reject(request.error);
    };
  });
}

/**
 * Saves data into the given storeName.
 * @param objectStoreName - The store to save into (e.g. 'BGs', 'Profiles', etc.).
 * @param key - The key used to identify this record (e.g. date string).
 * @param value - The data to store (string, object, array, date, number, etc.).
 * @param timestamp - A date or string to store as the record timestamp.
 */
export async function saveData<T>(
  objectStoreName: string,
  key: string,
  value: T,
  timestamp: string | Date,
): Promise<string | number | undefined> {
  if (!db) {
    throw new Error('DB has not been initialized. Call initializeDB first.');
  }

  // Convert date to ISO if needed
  let finalTimestamp: string;
  if (timestamp instanceof Date) {
    finalTimestamp = timestamp.toISOString();
  } else {
    finalTimestamp = timestamp;
  }

  // Determine data type
  let dataType: string = typeof value;
  let storedValue: unknown = value;

  if (value === null) {
    dataType = 'null';
  } else if (value instanceof Date) {
    dataType = 'date';
    storedValue = value.toISOString();
  } else if (dataType === 'object') {
    storedValue = JSON.stringify(value);
  }

  // Prepare object
  const dataObject: IDataObject<unknown> = {
    key,
    value: storedValue,
    dataType,
    timestamp: finalTimestamp,
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction([objectStoreName], 'readwrite');
    const store = tx.objectStore(objectStoreName);

    const request = store.put(dataObject);

    request.onsuccess = (e: Event) => {
      // The result is typically the key path used
      // e.g. the stored key
      resolve((e.target as IDBRequest).result);
    };

    request.onerror = (e: Event) => {
      reject((e.target as IDBRequest).error);
    };
  });
}

/**
 * Retrieves data from a store by key.
 * Automatically parses JSON/dates stored in the old code’s format.
 */
export async function getData<T>(
  objectStoreName: string,
  key: string,
): Promise<T | null> {
  if (!db) {
    throw new Error('DB has not been initialized. Call initializeDB first.');
  }

  return new Promise((resolve, reject) => {
    const tx = db!.transaction([objectStoreName], 'readonly');
    const store = tx.objectStore(objectStoreName);

    const request = store.get(key);

    request.onsuccess = (event: Event) => {
      const dataObject = (event.target as IDBRequest).result as
        | IDataObject<unknown>
        | undefined;

      if (!dataObject) {
        return resolve(null);
      }

      let { value, dataType } = dataObject;

      switch (dataType) {
        case 'object':
        case 'array':
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return resolve(parsed as T);
            } catch (error) {
              // console.error('Failed to parse JSON', error);
              return resolve(null);
            }
          }
          break;
        case 'date':
          // We stored an ISO string
          if (typeof value === 'string') {
            return resolve(new Date(value) as unknown as T);
          }
          break;
        case 'null':
          return resolve(null);
        default:
          // Could be string, number, or something else
          return resolve(value as T);
      }
      // Fallback if anything unexpected
      resolve(value as T);
    };

    request.onerror = (e: Event) => {
      reject((e.target as IDBRequest).error);
    };
  });
}

/**
 * Retrieves the timestamp field for a given object store/key.
 */
export async function getTimestamp(
  objectStoreName: string,
  key: string,
): Promise<string | null> {
  if (!db) {
    throw new Error('DB has not been initialized. Call initializeDB first.');
  }

  return new Promise((resolve, reject) => {
    const tx = db!.transaction([objectStoreName], 'readonly');
    const store = tx.objectStore(objectStoreName);

    const request = store.get(key);

    request.onsuccess = (event: Event) => {
      const dataObject = (event.target as IDBRequest).result as
        | IDataObject<unknown>
        | undefined;
      if (!dataObject) {
        return resolve(null);
      }
      resolve(dataObject.timestamp);
    };

    request.onerror = (e: Event) => {
      reject((e.target as IDBRequest).error);
    };
  });
}

/**
 * Closes the database connection if open.
 */
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}