const DB_NAME = 'nes-emulator';
const DB_VERSION = 1;

interface SaveStateRecord {
  id?: number;
  romName: string;
  slot: number;
  data: ArrayBuffer;
  createdAt: number;
}

interface ROMRecord {
  name: string;
  data: ArrayBuffer;
  createdAt: number;
}

export interface ROMListItem {
  name: string;
  size: number;
  createdAt: number;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('saveStates')) {
        const saveStatesStore = db.createObjectStore('saveStates', {
          keyPath: 'id',
          autoIncrement: true,
        });
        saveStatesStore.createIndex('romName', 'romName', { unique: false });
        saveStatesStore.createIndex('slot', 'slot', { unique: false });
        saveStatesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('roms')) {
        db.createObjectStore('roms', { keyPath: 'name' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function putSaveState(
  romName: string,
  slot: number,
  data: ArrayBuffer
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saveStates', 'readwrite');
    const store = transaction.objectStore('saveStates');

    const record: SaveStateRecord = {
      romName,
      slot,
      data,
      createdAt: Date.now(),
    };

    const request = store.add(record);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getSaveState(
  id: string
): Promise<{
  id: string;
  romName: string;
  slot: number;
  data: ArrayBuffer;
  createdAt: number;
} | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saveStates', 'readonly');
    const store = transaction.objectStore('saveStates');

    const request = store.get(Number(id));

    request.onsuccess = () => {
      const result = request.result as SaveStateRecord | undefined;

      if (result) {
        resolve({
          id: String(result.id),
          romName: result.romName,
          slot: result.slot,
          data: result.data,
          createdAt: result.createdAt,
        });
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function listSaveStates(
  romName: string
): Promise<
  Array<{
    id: string;
    romName: string;
    slot: number;
    dataSize: number;
    createdAt: number;
  }>
> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saveStates', 'readonly');
    const store = transaction.objectStore('saveStates');
    const index = store.index('romName');
    const request = index.getAll(IDBKeyRange.only(romName));

    request.onsuccess = () => {
      const results = (request.result as SaveStateRecord[]).map((record) => ({
        id: String(record.id),
        romName: record.romName,
        slot: record.slot,
        dataSize: record.data.byteLength,
        createdAt: record.createdAt,
      }));
      resolve(results);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteSaveState(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saveStates', 'readwrite');
    const store = transaction.objectStore('saveStates');

    const request = store.delete(Number(id));

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getLatestSaveState(
  romName: string
): Promise<{ id: string; data: ArrayBuffer } | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saveStates', 'readonly');
    const store = transaction.objectStore('saveStates');
    const index = store.index('romName');
    const request = index.getAll(IDBKeyRange.only(romName));

    request.onsuccess = () => {
      const results = request.result as SaveStateRecord[];

      if (results.length === 0) {
        resolve(null);
      } else {
        const latest = results.reduce((a, b) =>
          a.createdAt > b.createdAt ? a : b
        );
        resolve({
          id: String(latest.id),
          data: latest.data,
        });
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function putROM(
  name: string,
  data: ArrayBuffer
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('roms', 'readwrite');
    const store = transaction.objectStore('roms');

    const record: ROMRecord = {
      name,
      data,
      createdAt: Date.now(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getROM(name: string): Promise<ArrayBuffer | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('roms', 'readonly');
    const store = transaction.objectStore('roms');

    const request = store.get(name);

    request.onsuccess = () => {
      const result = request.result as ROMRecord | undefined;
      resolve(result?.data ?? null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function listROMs(): Promise<ROMListItem[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('roms', 'readonly');
    const store = transaction.objectStore('roms');

    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as ROMRecord[])
        .map((record) => ({
          name: record.name,
          size: record.data.byteLength,
          createdAt: record.createdAt,
        }))
        .sort((a, b) => b.createdAt - a.createdAt)
      resolve(results)
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteROM(name: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('roms', 'readwrite');
    const store = transaction.objectStore('roms');

    const request = store.delete(name);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
