(function () {
    const API_URL = 'api.php';
    let statusCache = null;

    async function request(action, options = {}) {
        const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
            credentials: 'same-origin',
            cache: 'no-store',
            ...options,
            headers: {
                Accept: 'application/json',
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                ...(options.headers || {})
            }
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error(payload?.message || `Sunucu isteği başarısız (${response.status}).`);
        return payload;
    }

    async function status(force = false) {
        if (statusCache && !force) return statusCache;
        try {
            const payload = await request('status');
            if (payload.api !== 'les-mejor-server') return null;
            statusCache = payload;
            return payload;
        } catch (error) {
            return null;
        }
    }

    async function loadData() {
        const currentStatus = await status();
        if (!currentStatus) return null;
        const payload = await request('data');
        return payload.data || null;
    }

    async function saveData(data) {
        const payload = await request('save', { method: 'POST', body: JSON.stringify({ data }) });
        return payload;
    }

    async function upload(file, category) {
        const form = new FormData();
        form.append('file', file);
        form.append('category', category || 'media');
        const payload = await request('upload', { method: 'POST', body: form });
        return payload.reference;
    }

    async function remove(reference) {
        return request('delete-media', { method: 'POST', body: JSON.stringify({ reference }) });
    }

    async function changePassword(currentPassword, newPassword) {
        return request('change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    }

    function createAuthOverlay(currentStatus) {
        const setupToken = new URLSearchParams(window.location.search).get('setup') || '';
        const isSetup = !currentStatus.configured;
        const overlay = document.createElement('div');
        overlay.className = 'server-auth-overlay';
        overlay.innerHTML = `
            <form class="server-auth-card">
                <img src="assets/images/les-mejor-logo.png" alt="Les Mejor Creative" onerror="this.hidden=true">
                <span class="server-auth-kicker">LES MEJOR ADMIN</span>
                <h1>${isSetup ? 'İlk Kurulum' : 'Yönetim Paneli Girişi'}</h1>
                <p>${isSetup ? 'Sunucu paneli için güçlü bir şifre belirleyin.' : 'İçerikleri yönetmek için admin şifrenizi girin.'}</p>
                ${isSetup ? `<label>Kurulum Anahtarı<input name="setupToken" type="password" value="${setupToken.replace(/[&<>"']/g, '')}" autocomplete="off" required></label>` : ''}
                <label>Admin Şifresi<input name="password" type="password" minlength="10" autocomplete="${isSetup ? 'new-password' : 'current-password'}" required></label>
                ${isSetup ? '<label>Şifre Tekrar<input name="confirmPassword" type="password" minlength="10" autocomplete="new-password" required></label>' : ''}
                <button class="btn btn-primary" type="submit">${isSetup ? 'Kurulumu Tamamla' : 'Giriş Yap'}</button>
                <p class="server-auth-message" role="alert"></p>
            </form>`;
        document.body.appendChild(overlay);
        return { overlay, form: overlay.querySelector('form'), isSetup };
    }

    async function ensureAdminSession() {
        const currentStatus = await status(true);
        if (!currentStatus) return false;
        if (currentStatus.authenticated) return true;
        const { overlay, form, isSetup } = createAuthOverlay(currentStatus);
        return new Promise(resolve => {
            form.addEventListener('submit', async event => {
                event.preventDefault();
                const button = form.querySelector('button');
                const message = form.querySelector('.server-auth-message');
                const values = new FormData(form);
                const password = String(values.get('password') || '');
                if (isSetup && password !== String(values.get('confirmPassword') || '')) {
                    message.textContent = 'Şifreler eşleşmiyor.';
                    return;
                }
                button.disabled = true;
                message.textContent = 'Kontrol ediliyor...';
                try {
                    await request(isSetup ? 'setup' : 'login', {
                        method: 'POST',
                        body: JSON.stringify({ password, setupToken: String(values.get('setupToken') || '') })
                    });
                    statusCache = null;
                    overlay.remove();
                    const cleanUrl = new URL(window.location.href);
                    cleanUrl.searchParams.delete('setup');
                    window.history.replaceState({}, '', cleanUrl);
                    resolve(true);
                } catch (error) {
                    message.textContent = error.message;
                    button.disabled = false;
                }
            });
        });
    }

    window.SiteServer = { status, loadData, saveData, upload, remove, changePassword, ensureAdminSession };
})();
