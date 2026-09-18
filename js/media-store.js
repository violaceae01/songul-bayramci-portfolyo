(function () {
    const DB_NAME = 'les-mejor-media';
    const DB_VERSION = 1;
    const STORE_NAME = 'files';
    const PREFIX = 'idb-media:';
    const objectUrls = new Map();

    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function mediaId(reference) {
        const value = String(reference || '');
        return value.startsWith(PREFIX) ? value.slice(PREFIX.length) : '';
    }

    async function save(file, category = 'media') {
        if (!(file instanceof Blob)) throw new Error('Geçerli bir dosya seçilmedi.');
        const id = `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const database = await openDatabase();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).put({
                id,
                blob: file,
                name: file.name || id,
                type: file.type || '',
                updatedAt: Date.now()
            });
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
        database.close();
        return `${PREFIX}${id}`;
    }

    async function resolve(reference) {
        const id = mediaId(reference);
        if (!id) return String(reference || '');
        if (objectUrls.has(id)) return objectUrls.get(id);

        const database = await openDatabase();
        const record = await new Promise((resolveRecord, reject) => {
            const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
            request.onsuccess = () => resolveRecord(request.result || null);
            request.onerror = () => reject(request.error);
        });
        database.close();
        if (!record?.blob) return '';
        const url = URL.createObjectURL(record.blob);
        objectUrls.set(id, url);
        return url;
    }

    async function remove(reference) {
        const id = mediaId(reference);
        if (!id) return;
        const url = objectUrls.get(id);
        if (url) URL.revokeObjectURL(url);
        objectUrls.delete(id);
        const database = await openDatabase();
        await new Promise((resolveDelete, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).delete(id);
            transaction.oncomplete = resolveDelete;
            transaction.onerror = () => reject(transaction.error);
        });
        database.close();
    }

    window.SiteMediaStore = {
        isStored: reference => Boolean(mediaId(reference)),
        save,
        resolve,
        remove
    };
})();
