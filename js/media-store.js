(function () {
    const DB_NAME = 'les-mejor-media';
    const DB_VERSION = 1;
    const STORE_NAME = 'files';
    const PREFIX = 'idb-media:';
    const SERVER_PREFIX = 'server-media:';
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

    async function prepareImageForUpload(file) {
        if (!(file instanceof File) || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
        if (file.size < 4 * 1024 * 1024) return file;
        let bitmap;
        try {
            bitmap = await createImageBitmap(file);
            const maxDimension = 2560;
            const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d', { alpha: true }).drawImage(bitmap, 0, 0, width, height);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.88));
            if (!blob || blob.size >= file.size) return file;
            const baseName = String(file.name || 'gorsel').replace(/\.[^.]+$/, '');
            return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
        } catch (error) {
            console.warn('Görsel otomatik sıkıştırılamadı, özgün dosya kullanılacak:', error);
            return file;
        } finally {
            bitmap?.close?.();
        }
    }

    async function save(file, category = 'media') {
        if (!(file instanceof Blob)) throw new Error('Geçerli bir dosya seçilmedi.');
        const uploadFile = await prepareImageForUpload(file);
        const serverStatus = await window.SiteServer?.status?.();
        if (serverStatus) return window.SiteServer.upload(uploadFile, category);
        const id = `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const database = await openDatabase();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).put({
                id,
                blob: uploadFile,
                name: uploadFile.name || id,
                type: uploadFile.type || '',
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
        const value = String(reference || '');
        if (value.startsWith(SERVER_PREFIX)) return value.slice(SERVER_PREFIX.length);
        const id = mediaId(reference);
        if (!id) return value;
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
        const value = String(reference || '');
        if (value.startsWith(SERVER_PREFIX)) {
            await window.SiteServer?.remove?.(value);
            return;
        }
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
        isStored: reference => Boolean(mediaId(reference)) || String(reference || '').startsWith(SERVER_PREFIX),
        save,
        resolve,
        remove
    };
})();
