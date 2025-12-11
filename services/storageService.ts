const DB_NAME = 'HadiahDB';
const STORE_NAME = 'generated_images';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveImageToDB = async (id: number, dataUrl: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(dataUrl, id);
    
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving image to IndexedDB:', err);
  }
};

export const loadImagesFromDB = async (): Promise<Record<number, string>> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const images: Record<number, string> = {};
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                images[Number(cursor.key)] = cursor.value;
                cursor.continue();
            } else {
                resolve(images);
            }
        };
        
        request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error loading images from IndexedDB:', err);
    return {};
  }
};