(function () {
    const STORAGE_KEY = 'sb_site_data';
    const DATABASE_NAME = 'sb_site_admin';
    const DATABASE_STORE = 'content';
    const isLocalPreview = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
    let storageMode = 'loading';
    let lastError = null;

    const clone = value => JSON.parse(JSON.stringify(value || {}));

    function mergeData(defaults, saved) {
        return { ...clone(defaults), ...(saved && typeof saved === 'object' ? saved : {}) };
    }

    function openLocalDatabase() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB kullanılamıyor.'));
                return;
            }
            const request = indexedDB.open(DATABASE_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(DATABASE_STORE)) {
                    request.result.createObjectStore(DATABASE_STORE);
                }
            };
            request.onsuccess = () => resolve(request.result);
        });
    }

    async function readIndexedData() {
        const database = await openLocalDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(DATABASE_STORE, 'readonly');
            const request = transaction.objectStore(DATABASE_STORE).get(STORAGE_KEY);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || null);
            transaction.oncomplete = () => database.close();
        });
    }

    async function writeIndexedData(data) {
        const database = await openLocalDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(DATABASE_STORE, 'readwrite');
            transaction.objectStore(DATABASE_STORE).put(data, STORAGE_KEY);
            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => {
                database.close();
                resolve();
            };
        });
    }

    async function loadLocal(defaults) {
        try {
            let saved = await readIndexedData();
            if (!saved) {
                const legacy = localStorage.getItem(STORAGE_KEY);
                if (legacy) {
                    saved = JSON.parse(legacy);
                    await writeIndexedData(saved);
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
            storageMode = 'local';
            return mergeData(defaults, saved);
        } catch (error) {
            lastError = error;
            storageMode = 'local';
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                return mergeData(defaults, saved ? JSON.parse(saved) : null);
            } catch {
                return clone(defaults);
            }
        }
    }

    async function load(defaults) {
        if (isLocalPreview) {
            return await loadLocal(defaults);
        }
        try {
            const response = await fetch('/api/site-data', {
                method: 'GET',
                cache: 'no-store',
                headers: { Accept: 'application/json' }
            });
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
                const payload = await response.json();
                storageMode = 'cloud';
                lastError = null;
                return mergeData(defaults, payload.data);
            }
            throw new Error(`Site verisi alınamadı (${response.status}).`);
        } catch (error) {
            lastError = error;
            storageMode = 'unavailable';
            return clone(defaults);
        }
    }

    async function readError(response) {
        try {
            const payload = await response.json();
            return payload.error || `İşlem tamamlanamadı (${response.status}).`;
        } catch {
            return `İşlem tamamlanamadı (${response.status}).`;
        }
    }

    async function save(data) {
        if (isLocalPreview) {
            try {
                await writeIndexedData(data);
            } catch {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
            storageMode = 'local';
            return { ok: true, local: true };
        }

        if (storageMode === 'cloud') {
            const response = await fetch('/api/site-data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = new Error(await readError(response));
                error.status = response.status;
                throw error;
            }
            return response.json();
        }

        throw lastError || new Error('Kalıcı depolama şu anda kullanılamıyor.');
    }

    function fileToOptimizedDataUrl(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Lütfen geçerli bir görsel dosyası seçin.'));
                return;
            }
            if (file.size > 20 * 1024 * 1024) {
                reject(new Error('Görsel en fazla 20 MB olabilir.'));
                return;
            }

            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Görsel okunamadı.'));
            reader.onload = event => {
                const image = new Image();
                image.onerror = () => reject(new Error('Görsel açılamadı.'));
                image.onload = () => {
                    const scale = Math.min(1, 1080 / image.naturalWidth, 1350 / image.naturalHeight);
                    const width = Math.max(1, Math.round(image.naturalWidth * scale));
                    const height = Math.max(1, Math.round(image.naturalHeight * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/webp', 0.82));
                };
                image.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function uploadImage(file) {
        if (isLocalPreview) {
            storageMode = 'local';
            return fileToOptimizedDataUrl(file);
        }

        if (storageMode === 'cloud') {
            const form = new FormData();
            form.append('file', file, file.name);
            const response = await fetch('/api/upload', { method: 'POST', body: form });
            if (!response.ok) {
                const error = new Error(await readError(response));
                error.status = response.status;
                throw error;
            }
            const payload = await response.json();
            return payload.url;
        }

        throw lastError || new Error('Görsel yükleme şu anda kullanılamıyor.');
    }

    async function getAdminSession() {
        if (storageMode !== 'cloud') {
            return { authenticated: true, authorized: true, configured: true, local: true };
        }
        const response = await fetch('/api/admin/session', {
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(await readError(response));
        return response.json();
    }

    function getStorageMode() {
        return storageMode;
    }

    window.SiteDataApi = {
        getAdminSession,
        getStorageMode,
        isLocalPreview,
        load,
        save,
        uploadImage
    };
})();
