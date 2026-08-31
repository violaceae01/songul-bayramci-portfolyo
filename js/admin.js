document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'sb_site_data';
    const utils = window.SiteDataUtils;
    const clone = value => JSON.parse(JSON.stringify(value));
    const escapeHtml = value => utils ? utils.escapeHtml(value) : String(value || '');
    const findById = (list, id) => (list || []).find(item => String(item.id) === String(id));

    let appData = loadData();

    function loadData() {
        const defaults = typeof siteData !== 'undefined' ? clone(siteData) : {
            hero: {}, stats: [], artists: [], homeGallery: [], about: {}, testimonials: [], contact: {}
        };
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            const merged = { ...defaults, ...parsed };
            merged.hero = { ...(defaults.hero || {}), ...(parsed.hero || {}) };
            if (!merged.hero.bgVideo && defaults.hero?.bgVideo) merged.hero.bgVideo = defaults.hero.bgVideo;
            delete merged.hero.bgImage;
            merged.artists = utils ? utils.normalizeArtists(parsed.artists || defaults.artists) : (parsed.artists || defaults.artists);
            if (utils) {
                const defaultArtists = utils.normalizeArtists(defaults.artists);
                merged.artists.forEach(artist => {
                    const defaultArtist = defaultArtists.find(item => String(item.id) === String(artist.id));
                    if (!artist.bio && defaultArtist?.bio) artist.bio = defaultArtist.bio;
                });
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            defaults.artists = utils ? utils.normalizeArtists(defaults.artists) : defaults.artists;
            return defaults;
        }
    }

    function saveData(notify = true) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
            if (notify) showToast('Tüm değişiklikler başarıyla kaydedildi!', 'success');
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            showToast('Veri boyutu tarayıcı sınırını aştı. Büyük görselleri dosya yolu olarak ekleyin.', 'error');
        }
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i><span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    const tabDescriptions = {
        'tab-portfolio': { title: 'Sanatçı & Konser Yönetimi', desc: 'Sanatçıları, konserlerini, galerilerini ve video bağlantılarını yönetin.' },
        'tab-hero': { title: 'Hero & Başlıklar', desc: 'Ana sayfa giriş alanındaki başlıkları, alt başlığı ve arka plan videosunu güncelleyin.' },
        'tab-stats': { title: 'İstatistik Sayaçları', desc: 'Sitede yer alan deneyim ve istatistik sayılarını düzenleyin.' },
        'tab-about': { title: 'Hakkımda Bölümü', desc: 'Biyografi metinlerini ve profil fotoğrafını yönetin.' },
        'tab-testimonials': { title: 'Referanslar & Yorumlar', desc: 'Sanatçı ve müşteri referanslarını düzenleyin.' },
        'tab-contact': { title: 'İletişim & Sosyal Medya', desc: 'İletişim bilgilerini ve sosyal medya bağlantılarını güncelleyin.' },
        'tab-backup': { title: 'Yedekleme & Dışa Aktar', desc: 'Verilerinizi kalıcı dosya olarak indirin veya varsayılanlara sıfırlayın.' }
    };

    document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const targetId = link.dataset.tab;
            document.querySelectorAll('.sidebar-link[data-tab]').forEach(item => item.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(targetId)?.classList.add('active');
            if (tabDescriptions[targetId]) {
                document.getElementById('pageTitle').textContent = tabDescriptions[targetId].title;
                document.getElementById('pageDesc').textContent = tabDescriptions[targetId].desc;
            }
        });
    });

    const artistsListEl = document.getElementById('artistsList');
    const artistsCount = document.getElementById('artistsCount');
    const artistModal = document.getElementById('artistModal');
    const artistForm = document.getElementById('artistForm');
    const editArtistId = document.getElementById('editArtistId');
    const artistName = document.getElementById('artistName');
    const artistBio = document.getElementById('artistBio');
    const artistCover = document.getElementById('artistCover');
    const artistCoverPreview = document.getElementById('artistCoverPreview');

    const concertModal = document.getElementById('concertModal');
    const concertForm = document.getElementById('concertForm');
    const targetConcertArtistId = document.getElementById('targetConcertArtistId');
    const editConcertId = document.getElementById('editConcertId');
    const concertName = document.getElementById('concertName');
    const concertDate = document.getElementById('concertDate');
    const concertVenue = document.getElementById('concertVenue');
    const concertVideoLabel = document.getElementById('concertVideoLabel');
    const concertVideoUrl = document.getElementById('concertVideoUrl');

    const photoModal = document.getElementById('photoModal');
    const photoForm = document.getElementById('photoForm');
    const targetArtistId = document.getElementById('targetArtistId');
    const targetConcertId = document.getElementById('targetConcertId');
    const photoSrc = document.getElementById('photoSrc');
    const photoTitle = document.getElementById('photoTitle');
    const photoDesc = document.getElementById('photoDesc');
    const photoPreview = document.getElementById('photoPreview');

    function renderArtistsList() {
        if (!artistsListEl) return;
        artistsListEl.innerHTML = '';
        appData.artists = utils ? utils.normalizeArtists(appData.artists) : (appData.artists || []);
        const artists = utils ? utils.sortArtists(appData.artists) : [...appData.artists];
        if (artistsCount) artistsCount.textContent = artists.length;

        if (!artists.length) {
            artistsListEl.innerHTML = '<p class="admin-empty">Henüz sanatçı eklenmedi.</p>';
            return;
        }

        artists.forEach(artist => {
            const concertsHtml = artist.concerts.length
                ? artist.concerts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(concert => renderConcertAdminCard(artist, concert)).join('')
                : '<div class="admin-empty compact">Bu sanatçıya henüz konser eklenmedi.</div>';
            const card = document.createElement('article');
            card.className = 'artist-admin-card';
            card.innerHTML = `
                <div class="artist-card-header">
                    <div class="artist-cover-wrap"><img src="${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name)}" class="artist-cover-thumb"></div>
                    <div class="artist-info-wrap">
                        <h3>${escapeHtml(artist.name)}</h3>
                        <p>${artist.concerts.length} konser · <a href="sanatci.html?artist=${encodeURIComponent(artist.slug)}" target="_blank">sanatçı sayfasını aç</a></p>
                        ${artist.bio ? `<p class="artist-bio-preview">${escapeHtml(artist.bio)}</p>` : ''}
                    </div>
                    <div class="artist-actions-wrap">
                        <button class="btn btn-primary btn-sm" data-action="add-concert" data-artist-id="${artist.id}"><i class="fas fa-plus"></i> Yeni Konser</button>
                        <button class="btn btn-secondary btn-sm" data-action="edit-artist" data-artist-id="${artist.id}"><i class="fas fa-edit"></i> Sanatçı</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-artist" data-artist-id="${artist.id}" aria-label="Sanatçıyı sil"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="artist-concerts-admin-list">${concertsHtml}</div>`;
            artistsListEl.appendChild(card);
        });
    }

    function renderConcertAdminCard(artist, concert) {
        const photos = (concert.images || []).map(image => `
            <div class="artist-subphoto-item">
                <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.title || artist.name)}">
                <button class="btn-delete-subphoto" data-action="delete-photo" data-artist-id="${artist.id}" data-concert-id="${concert.id}" data-photo-id="${image.id}" title="Fotoğrafı Sil"><i class="fas fa-times"></i></button>
            </div>`).join('');

        return `
            <section class="admin-concert-card">
                <div class="admin-concert-header">
                    <div><span class="admin-concert-date">${escapeHtml(concert.date || 'Tarih eklenmedi')}</span><h4>${escapeHtml(concert.name)}</h4><p>${escapeHtml(concert.venue || 'Mekân eklenmedi')} · ${(concert.images || []).length} fotoğraf</p></div>
                    <div class="admin-concert-actions">
                        <button class="btn btn-primary btn-sm" data-action="add-photo" data-artist-id="${artist.id}" data-concert-id="${concert.id}"><i class="fas fa-image"></i> Fotoğraf</button>
                        <button class="btn btn-secondary btn-sm" data-action="edit-concert" data-artist-id="${artist.id}" data-concert-id="${concert.id}"><i class="fas fa-edit"></i> Konser</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-concert" data-artist-id="${artist.id}" data-concert-id="${concert.id}" aria-label="Konseri sil"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                ${concert.videoUrl ? `<a class="admin-video-link" href="${escapeHtml(concert.videoUrl)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-play"></i>${escapeHtml(concert.videoLabel || 'Konser Çekimine Git')}</a>` : '<span class="admin-video-missing"><i class="fas fa-video-slash"></i> Video bağlantısı eklenmedi</span>'}
                <div class="artist-subphotos-grid">${photos || '<span class="admin-photo-empty">Henüz fotoğraf eklenmedi.</span>'}</div>
            </section>`;
    }

    artistsListEl?.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const artist = findById(appData.artists, button.dataset.artistId);
        if (!artist) return;
        const concert = findById(artist.concerts, button.dataset.concertId);

        if (action === 'edit-artist') openArtistModal(artist);
        if (action === 'add-concert') openConcertModal(artist.id);
        if (action === 'edit-concert' && concert) openConcertModal(artist.id, concert);
        if (action === 'add-photo' && concert) openPhotoModal(artist.id, concert.id);
        if (action === 'delete-artist' && confirm(`${artist.name} ve tüm konserleri silinsin mi?`)) {
            appData.artists = appData.artists.filter(item => String(item.id) !== String(artist.id));
            saveData(false); renderArtistsList(); showToast('Sanatçı silindi.');
        }
        if (action === 'delete-concert' && concert && confirm(`${concert.name} konseri ve tüm fotoğrafları silinsin mi?`)) {
            artist.concerts = artist.concerts.filter(item => String(item.id) !== String(concert.id));
            saveData(false); renderArtistsList(); showToast('Konser silindi.');
        }
        if (action === 'delete-photo' && concert && confirm('Bu fotoğraf silinsin mi?')) {
            concert.images = concert.images.filter(item => String(item.id) !== String(button.dataset.photoId));
            saveData(false); renderArtistsList(); showToast('Fotoğraf silindi.');
        }
    });

    function openArtistModal(artist = null) {
        artistForm.reset();
        artistCoverPreview.style.display = 'none';
        document.getElementById('artistModalTitle').textContent = artist ? 'Sanatçıyı Düzenle' : 'Yeni Sanatçı Ekle';
        editArtistId.value = artist?.id || '';
        artistName.value = artist?.name || '';
        artistBio.value = artist?.bio || '';
        artistCover.value = artist?.cover || '';
        if (artist?.cover) { artistCoverPreview.src = artist.cover; artistCoverPreview.style.display = 'block'; }
        artistModal.classList.add('active');
    }
    const closeArtistModal = () => artistModal.classList.remove('active');
    document.getElementById('btnOpenAddArtistModal')?.addEventListener('click', () => openArtistModal());
    document.getElementById('btnCloseArtistModal')?.addEventListener('click', closeArtistModal);
    document.getElementById('btnCancelArtistModal')?.addEventListener('click', closeArtistModal);

    artistForm?.addEventListener('submit', event => {
        event.preventDefault();
        const existing = findById(appData.artists, editArtistId.value);
        const name = artistName.value.trim();
        const bio = artistBio.value.trim();
        const cover = artistCover.value.trim();
        if (existing) {
            existing.name = name; existing.bio = bio; existing.cover = cover; showToast('Sanatçı güncellendi.');
        } else {
            const id = Date.now();
            appData.artists.push({ id, slug: utils ? utils.slugify(name) : String(id), name, bio, cover, concerts: [] });
            showToast('Yeni sanatçı eklendi.');
        }
        saveData(false); renderArtistsList(); closeArtistModal();
    });

    function openConcertModal(artistId, concert = null) {
        concertForm.reset();
        targetConcertArtistId.value = artistId;
        editConcertId.value = concert?.id || '';
        document.getElementById('concertModalTitle').textContent = concert ? 'Konseri Düzenle' : 'Yeni Konser Ekle';
        concertName.value = concert?.name || ''; concertDate.value = concert?.date || '';
        concertVenue.value = concert?.venue || ''; concertVideoLabel.value = concert?.videoLabel || 'Konser Çekimine Git';
        concertVideoUrl.value = concert?.videoUrl || '';
        concertModal.classList.add('active');
    }
    const closeConcertModal = () => concertModal.classList.remove('active');
    document.getElementById('btnCloseConcertModal')?.addEventListener('click', closeConcertModal);
    document.getElementById('btnCancelConcertModal')?.addEventListener('click', closeConcertModal);

    concertForm?.addEventListener('submit', event => {
        event.preventDefault();
        const artist = findById(appData.artists, targetConcertArtistId.value);
        if (!artist) return;
        const existing = findById(artist.concerts, editConcertId.value);
        const values = { name: concertName.value.trim(), date: concertDate.value, venue: concertVenue.value.trim(), videoLabel: concertVideoLabel.value.trim(), videoUrl: concertVideoUrl.value.trim() };
        if (existing) { Object.assign(existing, values); showToast('Konser güncellendi.'); }
        else { artist.concerts.push({ id: Date.now(), ...values, cover: '', images: [] }); showToast('Yeni konser eklendi.'); }
        saveData(false); renderArtistsList(); closeConcertModal();
    });

    function openPhotoModal(artistId, concertId) {
        photoForm.reset(); targetArtistId.value = artistId; targetConcertId.value = concertId;
        photoPreview.style.display = 'none'; photoModal.classList.add('active');
    }
    const closePhotoModal = () => photoModal.classList.remove('active');
    document.getElementById('btnClosePhotoModal')?.addEventListener('click', closePhotoModal);
    document.getElementById('btnCancelPhotoModal')?.addEventListener('click', closePhotoModal);

    photoForm?.addEventListener('submit', event => {
        event.preventDefault();
        const artist = findById(appData.artists, targetArtistId.value);
        const concert = findById(artist?.concerts, targetConcertId.value);
        if (!artist || !concert) return;
        concert.images.push({ id: Date.now(), src: photoSrc.value.trim(), title: photoTitle.value.trim() || artist.name, desc: photoDesc.value.trim() });
        if (!concert.cover) concert.cover = photoSrc.value.trim();
        saveData(false); renderArtistsList(); closePhotoModal(); showToast('Fotoğraf konsere eklendi.');
    });

    function setupDropzone(zoneId, inputId, previewId, pathInputId) {
        const zone = document.getElementById(zoneId); const fileInput = document.getElementById(inputId);
        const pathInput = document.getElementById(pathInputId); const preview = document.getElementById(previewId);
        if (!zone || !fileInput || !pathInput || !preview) return;
        const handleFile = file => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => { pathInput.value = event.target.result; preview.src = event.target.result; preview.style.display = 'block'; };
            reader.readAsDataURL(file);
        };
        zone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', event => handleFile(event.target.files[0]));
        zone.addEventListener('dragover', event => { event.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
        zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
        zone.addEventListener('drop', event => { event.preventDefault(); zone.style.borderColor = ''; const file = event.dataTransfer.files[0]; if (file?.type.startsWith('image/')) handleFile(file); });
        pathInput.addEventListener('input', () => { preview.style.display = pathInput.value.trim() ? 'block' : 'none'; if (pathInput.value.trim()) preview.src = pathInput.value.trim(); });
    }
    setupDropzone('artistDropZone', 'artistFileInput', 'artistCoverPreview', 'artistCover');
    setupDropzone('photoDropZone', 'photoFileInput', 'photoPreview', 'photoSrc');

    const heroTag = document.getElementById('heroTag'); const heroSubtitle = document.getElementById('heroSubtitle');
    const heroTitleLine1 = document.getElementById('heroTitleLine1'); const heroTitleLine2 = document.getElementById('heroTitleLine2');
    const heroBgVideo = document.getElementById('heroBgVideo'); const heroVideoPreview = document.getElementById('heroVideoPreview');
    function updateHeroVideoPreview() {
        if (!heroVideoPreview) return;
        const videoUrl = heroBgVideo?.value.trim() || '';
        if (!videoUrl) {
            heroVideoPreview.removeAttribute('src');
            heroVideoPreview.style.display = 'none';
            heroVideoPreview.load();
            return;
        }
        if (heroVideoPreview.getAttribute('src') !== videoUrl) {
            heroVideoPreview.src = videoUrl;
            heroVideoPreview.load();
        }
        heroVideoPreview.style.display = 'block';
    }
    function populateHeroForm() {
        if (!appData.hero) return;
        heroTag.value = appData.hero.tag || '';
        heroSubtitle.value = appData.hero.subtitle || '';
        heroTitleLine1.value = appData.hero.titleLine1 || '';
        heroTitleLine2.value = appData.hero.titleLine2 || '';
        heroBgVideo.value = appData.hero.bgVideo || 'assets/hero_bg.mp4';
        updateHeroVideoPreview();
    }
    function readHeroForm() {
        appData.hero = {
            tag: heroTag.value.trim(),
            subtitle: heroSubtitle.value.trim(),
            titleLine1: heroTitleLine1.value.trim(),
            titleLine2: heroTitleLine2.value.trim(),
            bgVideo: heroBgVideo.value.trim()
        };
    }
    heroBgVideo?.addEventListener('input', updateHeroVideoPreview);

    const statsContainer = document.getElementById('statsInputsContainer');
    function renderStatsForm() {
        statsContainer.innerHTML = '';
        (appData.stats || []).forEach((item, index) => {
            const group = document.createElement('div'); group.className = 'form-group';
            group.innerHTML = `<label>İstatistik ${index + 1}</label><div class="admin-inline-fields"><input type="text" class="form-control stat-num-input" value="${escapeHtml(item.number)}"><input type="text" class="form-control stat-lbl-input" value="${escapeHtml(item.label)}"></div>`;
            statsContainer.appendChild(group);
        });
    }
    function readStatsForm() { const nums = document.querySelectorAll('.stat-num-input'); const labels = document.querySelectorAll('.stat-lbl-input'); appData.stats = [...nums].map((input, index) => ({ id: index + 1, number: input.value.trim(), label: labels[index]?.value.trim() || '' })); }

    const aboutName = document.getElementById('aboutName'); const aboutImage = document.getElementById('aboutImage');
    const aboutLead = document.getElementById('aboutLead'); const aboutP1 = document.getElementById('aboutP1'); const aboutP2 = document.getElementById('aboutP2');
    function populateAboutForm() { if (!appData.about) return; aboutName.value = appData.about.name || ''; aboutImage.value = appData.about.image || ''; aboutLead.value = appData.about.lead || ''; aboutP1.value = appData.about.p1 || ''; aboutP2.value = appData.about.p2 || ''; }
    function readAboutForm() { appData.about = { ...appData.about, name: aboutName.value.trim(), image: aboutImage.value.trim(), lead: aboutLead.value.trim(), p1: aboutP1.value.trim(), p2: aboutP2.value.trim() }; }

    const testimonialsContainer = document.getElementById('testimonialsContainer');
    function renderTestimonialsForm() {
        testimonialsContainer.innerHTML = '';
        (appData.testimonials || []).forEach(item => {
            const card = document.createElement('div'); card.className = 'admin-form-card';
            card.innerHTML = `<div class="form-grid"><div class="form-group"><label>Sanatçı / Müşteri Adı</label><input type="text" class="form-control test-name" value="${escapeHtml(item.name)}"></div><div class="form-group"><label>Ünvan</label><input type="text" class="form-control test-title" value="${escapeHtml(item.title)}"></div><div class="form-group form-full"><label>Yorum Metni</label><textarea class="form-control test-text" rows="2">${escapeHtml(item.text)}</textarea></div></div>`;
            testimonialsContainer.appendChild(card);
        });
    }
    function readTestimonialsForm() { const names = document.querySelectorAll('.test-name'); const titles = document.querySelectorAll('.test-title'); const texts = document.querySelectorAll('.test-text'); appData.testimonials = [...names].map((input, index) => ({ id: index + 1, name: input.value.trim(), title: titles[index]?.value.trim() || '', text: texts[index]?.value.trim() || '' })); }

    const contactFields = { email: document.getElementById('contactEmail'), phone: document.getElementById('contactPhone'), location: document.getElementById('contactLocation'), instagram: document.getElementById('contactInstagram'), youtube: document.getElementById('contactYoutube'), twitter: document.getElementById('contactTwitter'), linkedin: document.getElementById('contactLinkedin') };
    function populateContactForm() { Object.entries(contactFields).forEach(([key, input]) => { input.value = appData.contact?.[key] || ''; }); }
    function readContactForm() { appData.contact = Object.fromEntries(Object.entries(contactFields).map(([key, input]) => [key, input.value.trim()])); }

    function readAllForms() { readHeroForm(); readStatsForm(); readAboutForm(); readTestimonialsForm(); readContactForm(); }
    document.getElementById('btnSaveAll')?.addEventListener('click', () => { readAllForms(); saveData(true); });
    document.getElementById('btnResetData')?.addEventListener('click', () => { if (!confirm('Tüm veriler varsayılana sıfırlansın mı?')) return; localStorage.removeItem(STORAGE_KEY); appData = loadData(); initAll(); showToast('Varsayılan veriler geri yüklendi.'); });
    document.getElementById('btnDownloadDataJs')?.addEventListener('click', () => {
        readAllForms(); const blob = new Blob([`const siteData = ${JSON.stringify(appData, null, 2)};\n`], { type: 'application/javascript;charset=utf-8' });
        const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.download = 'data.js'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); showToast('data.js dosyası indirildi.');
    });
    document.getElementById('btnCopyJson')?.addEventListener('click', () => { readAllForms(); navigator.clipboard.writeText(JSON.stringify(appData, null, 2)).then(() => showToast('JSON panoya kopyalandı.')).catch(() => showToast('Kopyalama başarısız.', 'error')); });

    function initAll() { renderArtistsList(); populateHeroForm(); renderStatsForm(); populateAboutForm(); renderTestimonialsForm(); populateContactForm(); }
    initAll();
});
