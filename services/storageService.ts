const DB_NAME = 'HadiahDB';
const STORE_NAME = 'generated_images';

// ✅ 1. 增加环境检查，防止在不支持的环境下崩溃
const isIndexedDBSupported = () => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB not supported or blocked'));
      return;
    }

    // 加上 try-catch 防止直接调用 indexedDB.open 就报错
    try {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unknown DB Error'));
    } catch (e) {
      reject(e);
    }
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
    // ✅ 2. 保存失败只是小事，打印警告即可，不要让程序崩溃
    console.warn('Unable to save image to IndexedDB (likely privacy mode):', err);
  }
};

export const loadImagesFromDB = async (): Promise<Record<number, string>> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAllKeys();
        const valueRequest = store.getAll();

        // 简单的获取所有数据的逻辑
        request.onsuccess = () => {
             const keys = request.result;
             const values = valueRequest.result;
             // 如果需要更复杂的 cursor 逻辑可以保留原来的，但 getAll 更简单
        };
        
        // 这里的逻辑有点复杂，为了简化并修复你的问题，
        // 我们改用更稳健的 cursor 方式，或者直接返回空对象如果出错
        const images: Record<number, string> = {};
        
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            images[cursor.key as number] = cursor.value;
            cursor.continue();
          } else {
            resolve(images);
          }
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  } catch (err) {
    // ✅ 3. 关键修复点！
    // 如果数据库打不开（比如 access denied），捕获错误，并返回一个空对象 {}
    // 这样 React 就会以为“缓存里没图片”，然后去网上重新下载，从而避免白屏。
    console.warn('Unable to load images from DB, falling back to network:', err);
    return {}; 
  }
};
