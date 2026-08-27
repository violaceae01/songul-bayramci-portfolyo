document.addEventListener('DOMContentLoaded', () => {

    const STORAGE_KEY = 'sb_site_data';

    // State
    let appData = loadData();

    function loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof siteData !== 'undefined') {
                    if (!parsed.artists && siteData.artists) {
                        parsed.artists = siteData.artists;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                    } else if (parsed.artists && siteData.artists) {
                        let updated = false;
                        parsed.artists.forEach(a => {
                            if (!a.concertName) {
                                const matched = siteData.artists.find(sa => sa.id === a.id);
                                if (matched && matched.concertName) {
                                    a.concertName = matched.concertName;
                                    updated = true;
                                }
                            }
                        });
                        if (updated) {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                        }
                    }
                }
                return parsed;
            }
        } catch (e) {
            console.error('Veri yükleme hatası:', e);
        }
        // Fallback to siteData from data.js
        return typeof siteData !== 'undefined' ? JSON.parse(JSON.stringify(siteData)) : {
            hero: {},
            stats: [],
            artists: [],
            about: {},
            testimonials: [],
            contact: {}
        };
    }

    function saveData(notify = true) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
            if (notify) showToast('Tüm değişiklikler başarıyla kaydedildi!', 'success');
        } catch (e) {
            console.error('Kaydetme hatası:', e);
            if (notify) showToast('Kaydedilirken bir hata oluştu!', 'error');
        }
    }

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================
    // TAB SWITCHING
    // ============================================
    const tabLinks = document.querySelectorAll('.sidebar-link[data-tab]');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const pageTitle = document.getElementById('pageTitle');
    const pageDesc = document.getElementById('pageDesc');

    const tabDescriptions = {
        'tab-portfolio': { title: 'Portföy & Görsel Yönetimi', desc: 'Çalışmalarım bölümünde sergilenen fotoğrafları düzenleyin, silin veya yeni görsel ekleyin.' },
        'tab-hero': { title: 'Hero & Başlıklar', desc: 'Ana sayfa giriş alanındaki başlıkları, alt başlığı ve arka plan görselini güncelleyin.' },
        'tab-stats': { title: 'İstatistik Sayaçları', desc: 'Sitede yer alan 4 adet deneyim ve istatistik sayısını düzenleyin.' },
        'tab-about': { title: 'Hakkımda Bölümü', desc: 'Hakkımda biyografi metinlerini, profil fotoğrafını ve yetenekleri yönetin.' },
        'tab-testimonials': { title: 'Referanslar & Yorumlar', desc: 'Sanatçı ve müşteri referanslarını düzenleyin.' },
        'tab-contact': { title: 'İletişim & Sosyal Medya', desc: 'E-posta, telefon, konum ve Instagram başta olmak üzere sosyal medya linklerini güncelleyin.' },
        'tab-backup': { title: 'Yedekleme & Dışa Aktar', desc: 'Verilerinizi kalıcı dosya olarak indirin veya varsayılanlara sıfırlayın.' }
    };

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-tab');

            tabLinks.forEach(l => l.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            link.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('active');

            if (tabDescriptions[targetId]) {
                pageTitle.textContent = tabDescriptions[targetId].title;
                pageDesc.textContent = tabDescriptions[targetId].desc;
            }
        });
    });

    // ============================================
    // 1. PORTFOLIO MANAGEMENT
    // ============================================
    const artistsListEl = document.getElementById('artistsList');
    const artistsCount = document.getElementById('artistsCount');
    const btnOpenAddArtistModal = document.getElementById('btnOpenAddArtistModal');
    
    // Artist Modal
    const artistModal = document.getElementById('artistModal');
    const artistForm = document.getElementById('artistForm');
    const editArtistId = document.getElementById('editArtistId');
    const artistName = document.getElementById('artistName');
    const artistConcertName = document.getElementById('artistConcertName');
    const artistCover = document.getElementById('artistCover');
    const artistCoverPreview = document.getElementById('artistCoverPreview');
    const artistActionText = document.getElementById('artistActionText');
    const artistActionUrl = document.getElementById('artistActionUrl');
    
    // Photo Modal
    const photoModal = document.getElementById('photoModal');
    const photoForm = document.getElementById('photoForm');
    const targetArtistId = document.getElementById('targetArtistId');
    const photoSrc = document.getElementById('photoSrc');
    const photoTitle = document.getElementById('photoTitle');
    const photoDesc = document.getElementById('photoDesc');
    const photoPreview = document.getElementById('photoPreview');
    
    function renderArtistsList() {
        if (!artistsListEl) return;
        artistsListEl.innerHTML = '';
        const artists = appData.artists || [];
        if (artistsCount) artistsCount.textContent = artists.length;

        if (artists.length === 0) {
            artistsListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Henüz hiç sanatçı eklenmemiş.</p>';
            return;
        }

        artists.forEach(artist => {
            const card = document.createElement('div');
            card.className = 'artist-admin-card';
            
            let photosHtml = '';
            (artist.images || []).forEach(img => {
                photosHtml += `
                    <div class="artist-subphoto-item">
                        <img src="${img.src}" alt="${img.title || ''}" onerror="this.src='https://via.placeholder.com/150?text=Görsel'">
                        <button class="btn-delete-subphoto" data-artist="${artist.id}" data-photo="${img.id}" title="Fotoğrafı Sil"><i class="fas fa-times"></i></button>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="artist-card-header">
                    <div class="artist-cover-wrap">
                        <img src="${artist.cover}" alt="${artist.name}" class="artist-cover-thumb" onerror="this.src='https://via.placeholder.com/150?text=Görsel'">
                    </div>
                    <div class="artist-info-wrap">
                        <h3 style="margin-bottom: 5px; font-size: 1.2rem;">${artist.name} <span style="font-size:0.85rem; color:#888; font-weight:normal;">- ${artist.concertName || ''}</span></h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">
                            <i class="fas fa-link"></i> ${artist.actionText || 'Konser Çekimine Git'} -> <a href="${artist.actionUrl}" target="_blank" style="color: var(--accent);">${artist.actionUrl}</a>
                        </p>
                    </div>
                    <div class="artist-actions-wrap">
                        <button class="btn btn-secondary btn-sm btn-edit-artist" data-id="${artist.id}">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-artist" data-id="${artist.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="artist-photos-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="font-size: 0.95rem;">Bağlı Fotoğraflar (${(artist.images || []).length})</h4>
                        <button class="btn btn-primary btn-sm btn-add-subphoto" data-id="${artist.id}">
                            <i class="fas fa-plus"></i> Yeni Fotoğraf Ekle
                        </button>
                    </div>
                    <div class="artist-subphotos-grid">
                        ${photosHtml}
                    </div>
                </div>
            `;
            
            artistsListEl.appendChild(card);
        });

        // Events
        document.querySelectorAll('.btn-edit-artist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                openArtistModal(appData.artists.find(a => a.id === id));
            });
        });

        document.querySelectorAll('.btn-delete-artist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (confirm('Bu sanatçıyı ve tüm fotoğraflarını silmek istediğinize emin misiniz?')) {
                    appData.artists = appData.artists.filter(a => a.id !== id);
                    saveData(false);
                    renderArtistsList();
                    showToast('Sanatçı silindi!', 'success');
                }
            });
        });

        document.querySelectorAll('.btn-add-subphoto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                openPhotoModal(id);
            });
        });

        document.querySelectorAll('.btn-delete-subphoto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const artistId = parseInt(e.currentTarget.dataset.artist);
                const photoId = parseInt(e.currentTarget.dataset.photo);
                if (confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) {
                    const artist = appData.artists.find(a => a.id === artistId);
                    if (artist) {
                        artist.images = artist.images.filter(img => img.id !== photoId);
                        saveData(false);
                        renderArtistsList();
                        showToast('Fotoğraf silindi!', 'success');
                    }
                }
            });
        });
    }

    // Artist Modal Functions
    function openArtistModal(artist = null) {
        artistForm.reset();
        artistCoverPreview.style.display = 'none';
        
        if (artist) {
            document.getElementById('artistModalTitle').textContent = 'Sanatçıyı Düzenle';
            editArtistId.value = artist.id;
            artistName.value = artist.name;
            artistConcertName.value = artist.concertName || '';
            artistCover.value = artist.cover;
            artistActionText.value = artist.actionText || '';
            artistActionUrl.value = artist.actionUrl || '';
            
            if (artist.cover) {
                artistCoverPreview.src = artist.cover;
                artistCoverPreview.style.display = 'block';
            }
        } else {
            document.getElementById('artistModalTitle').textContent = 'Yeni Sanatçı Ekle';
            editArtistId.value = '';
        }
        
        artistModal.classList.add('active');
    }
    
    function closeArtistModal() {
        artistModal.classList.remove('active');
    }

    if (btnOpenAddArtistModal) btnOpenAddArtistModal.addEventListener('click', () => openArtistModal());
    document.getElementById('btnCloseArtistModal')?.addEventListener('click', closeArtistModal);
    document.getElementById('btnCancelArtistModal')?.addEventListener('click', closeArtistModal);

    artistForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editArtistId.value ? parseInt(editArtistId.value) : Date.now();
        const name = artistName.value.trim();
        const concertName = artistConcertName.value.trim();
        const cover = artistCover.value.trim();
        const actionText = artistActionText.value.trim();
        const actionUrl = artistActionUrl.value.trim();

        if (!appData.artists) appData.artists = [];

        const existing = appData.artists.find(a => a.id === id);
        if (existing) {
            existing.name = name;
            existing.concertName = concertName;
            existing.cover = cover;
            existing.actionText = actionText;
            existing.actionUrl = actionUrl;
            showToast('Sanatçı güncellendi!', 'success');
        } else {
            appData.artists.unshift({ id, name, concertName, cover, actionText, actionUrl, images: [] });
            showToast('Yeni sanatçı eklendi!', 'success');
        }

        saveData(false);
        renderArtistsList();
        closeArtistModal();
    });

    // Photo Modal Functions
    function openPhotoModal(artistId) {
        photoForm.reset();
        targetArtistId.value = artistId;
        photoPreview.style.display = 'none';
        photoModal.classList.add('active');
    }
    
    function closePhotoModal() {
        photoModal.classList.remove('active');
    }

    document.getElementById('btnClosePhotoModal')?.addEventListener('click', closePhotoModal);
    document.getElementById('btnCancelPhotoModal')?.addEventListener('click', closePhotoModal);

    photoForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const artistId = parseInt(targetArtistId.value);
        const src = photoSrc.value.trim();
        const title = photoTitle.value.trim();
        const desc = photoDesc.value.trim();
        
        const artist = appData.artists.find(a => a.id === artistId);
        if (artist) {
            if (!artist.images) artist.images = [];
            artist.images.push({ id: Date.now(), src, title, desc });
            saveData(false);
            renderArtistsList();
            showToast('Fotoğraf eklendi!', 'success');
            closePhotoModal();
        }
    });

    // Setup Dropzones
    function setupDropzone(zoneId, inputId, previewId, pathInputId) {
        const zone = document.getElementById(zoneId);
        const fileInput = document.getElementById(inputId);
        const pathInput = document.getElementById(pathInputId);
        const preview = document.getElementById(previewId);
        
        if (!zone || !fileInput) return;
        
        zone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
        zone.addEventListener('dragleave', () => zone.style.borderColor = '');
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) handleFile(file);
        });

        function handleFile(file) {
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    pathInput.value = event.target.result;
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }

        pathInput?.addEventListener('input', () => {
            if (pathInput.value.trim()) {
                preview.src = pathInput.value.trim();
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        });
    }

    setupDropzone('artistDropZone', 'artistFileInput', 'artistCoverPreview', 'artistCover');
    setupDropzone('photoDropZone', 'photoFileInput', 'photoPreview', 'photoSrc');

    // ============================================
    // 2. HERO FORM
    // ============================================
    const heroTag = document.getElementById('heroTag');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const heroTitleLine1 = document.getElementById('heroTitleLine1');
    const heroTitleLine2 = document.getElementById('heroTitleLine2');
    const heroBgImage = document.getElementById('heroBgImage');

    function populateHeroForm() {
        if (!appData.hero) return;
        if (heroTag) heroTag.value = appData.hero.tag || '';
        if (heroSubtitle) heroSubtitle.value = appData.hero.subtitle || '';
        if (heroTitleLine1) heroTitleLine1.value = appData.hero.titleLine1 || '';
        if (heroTitleLine2) heroTitleLine2.value = appData.hero.titleLine2 || '';
        if (heroBgImage) heroBgImage.value = appData.hero.bgImage || '';
    }

    function readHeroForm() {
        appData.hero = {
            tag: heroTag?.value.trim() || '',
            subtitle: heroSubtitle?.value.trim() || '',
            titleLine1: heroTitleLine1?.value.trim() || '',
            titleLine2: heroTitleLine2?.value.trim() || '',
            bgImage: heroBgImage?.value.trim() || ''
        };
    }

    // ============================================
    // 3. STATS FORM
    // ============================================
    const statsContainer = document.getElementById('statsInputsContainer');

    function renderStatsForm() {
        if (!statsContainer) return;
        statsContainer.innerHTML = '';
        const stats = appData.stats || [];

        stats.forEach((st, idx) => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label>İstatistik ${idx + 1}</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" class="form-control stat-num-input" value="${st.number || ''}" placeholder="Örn: 50+" style="width: 100px;">
                    <input type="text" class="form-control stat-lbl-input" value="${st.label || ''}" placeholder="Örn: Etkinlik Çekimi">
                </div>
            `;
            statsContainer.appendChild(group);
        });
    }

    function readStatsForm() {
        const numInputs = document.querySelectorAll('.stat-num-input');
        const lblInputs = document.querySelectorAll('.stat-lbl-input');
        const newStats = [];

        numInputs.forEach((input, idx) => {
            newStats.push({
                id: idx + 1,
                number: input.value.trim(),
                label: lblInputs[idx] ? lblInputs[idx].value.trim() : ''
            });
        });

        appData.stats = newStats;
    }

    // ============================================
    // 4. ABOUT FORM
    // ============================================
    const aboutName = document.getElementById('aboutName');
    const aboutImage = document.getElementById('aboutImage');
    const aboutLead = document.getElementById('aboutLead');
    const aboutP1 = document.getElementById('aboutP1');
    const aboutP2 = document.getElementById('aboutP2');

    function populateAboutForm() {
        if (!appData.about) return;
        if (aboutName) aboutName.value = appData.about.name || '';
        if (aboutImage) aboutImage.value = appData.about.image || '';
        if (aboutLead) aboutLead.value = appData.about.lead || '';
        if (aboutP1) aboutP1.value = appData.about.p1 || '';
        if (aboutP2) aboutP2.value = appData.about.p2 || '';
    }

    function readAboutForm() {
        if (!appData.about) appData.about = {};
        appData.about.name = aboutName?.value.trim() || '';
        appData.about.image = aboutImage?.value.trim() || '';
        appData.about.lead = aboutLead?.value.trim() || '';
        appData.about.p1 = aboutP1?.value.trim() || '';
        appData.about.p2 = aboutP2?.value.trim() || '';
    }

    // ============================================
    // 5. TESTIMONIALS FORM
    // ============================================
    const testimonialsContainer = document.getElementById('testimonialsContainer');

    function renderTestimonialsForm() {
        if (!testimonialsContainer) return;
        testimonialsContainer.innerHTML = '';
        const list = appData.testimonials || [];

        list.forEach((item, idx) => {
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--bg-darker); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin-bottom: 15px;';
            card.innerHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>Sanatçı / Müşteri Adı</label>
                        <input type="text" class="form-control test-name" value="${item.name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Ünvan</label>
                        <input type="text" class="form-control test-title" value="${item.title || ''}">
                    </div>
                    <div class="form-group form-full">
                        <label>Yorum Metni</label>
                        <textarea class="form-control test-text" rows="2">${item.text || ''}</textarea>
                    </div>
                </div>
            `;
            testimonialsContainer.appendChild(card);
        });
    }

    function readTestimonialsForm() {
        const names = document.querySelectorAll('.test-name');
        const titles = document.querySelectorAll('.test-title');
        const texts = document.querySelectorAll('.test-text');
        const list = [];

        names.forEach((n, idx) => {
            list.push({
                id: idx + 1,
                name: n.value.trim(),
                title: titles[idx] ? titles[idx].value.trim() : '',
                text: texts[idx] ? texts[idx].value.trim() : ''
            });
        });

        appData.testimonials = list;
    }

    // ============================================
    // 6. CONTACT & SOCIAL FORM
    // ============================================
    const contactEmail = document.getElementById('contactEmail');
    const contactPhone = document.getElementById('contactPhone');
    const contactLocation = document.getElementById('contactLocation');
    const contactInstagram = document.getElementById('contactInstagram');
    const contactYoutube = document.getElementById('contactYoutube');
    const contactTwitter = document.getElementById('contactTwitter');
    const contactLinkedin = document.getElementById('contactLinkedin');

    function populateContactForm() {
        if (!appData.contact) return;
        if (contactEmail) contactEmail.value = appData.contact.email || '';
        if (contactPhone) contactPhone.value = appData.contact.phone || '';
        if (contactLocation) contactLocation.value = appData.contact.location || '';
        if (contactInstagram) contactInstagram.value = appData.contact.instagram || '';
        if (contactYoutube) contactYoutube.value = appData.contact.youtube || '';
        if (contactTwitter) contactTwitter.value = appData.contact.twitter || '';
        if (contactLinkedin) contactLinkedin.value = appData.contact.linkedin || '';
    }

    function readContactForm() {
        appData.contact = {
            email: contactEmail?.value.trim() || '',
            phone: contactPhone?.value.trim() || '',
            location: contactLocation?.value.trim() || '',
            instagram: contactInstagram?.value.trim() || '',
            youtube: contactYoutube?.value.trim() || '',
            twitter: contactTwitter?.value.trim() || '',
            linkedin: contactLinkedin?.value.trim() || ''
        };
    }

    // ============================================
    // 7. SAVE ALL & BACKUP TOOLS
    // ============================================
    const btnSaveAll = document.getElementById('btnSaveAll');
    const btnResetData = document.getElementById('btnResetData');
    const btnDownloadDataJs = document.getElementById('btnDownloadDataJs');
    const btnCopyJson = document.getElementById('btnCopyJson');

    btnSaveAll?.addEventListener('click', () => {
        readHeroForm();
        readStatsForm();
        readAboutForm();
        readTestimonialsForm();
        readContactForm();
        saveData(true);
    });

    btnResetData?.addEventListener('click', () => {
        if (confirm('Tüm verileri varsayılana sıfırlamak istediğinize emin misiniz?')) {
            localStorage.removeItem(STORAGE_KEY);
            appData = typeof siteData !== 'undefined' ? JSON.parse(JSON.stringify(siteData)) : {};
            initAll();
            showToast('Tüm veriler varsayılana sıfırlandı!', 'success');
        }
    });

    btnDownloadDataJs?.addEventListener('click', () => {
        readHeroForm();
        readStatsForm();
        readAboutForm();
        readTestimonialsForm();
        readContactForm();

        const fileContent = `const siteData = ${JSON.stringify(appData, null, 2)};\n`;
        const blob = new Blob([fileContent], { type: 'application/javascript;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data.js';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('data.js dosyası indirildi!', 'success');
    });

    btnCopyJson?.addEventListener('click', () => {
        readHeroForm();
        readStatsForm();
        readAboutForm();
        readTestimonialsForm();
        readContactForm();

        navigator.clipboard.writeText(JSON.stringify(appData, null, 2)).then(() => {
            showToast('JSON panoya kopyalandı!', 'success');
        }).catch(() => {
            showToast('Kopyalama başarısız!', 'error');
        });
    });

    // ============================================
    // INITIALIZATION
    // ============================================
    function initAll() {
        renderArtistsList();
        populateHeroForm();
        renderStatsForm();
        populateAboutForm();
        renderTestimonialsForm();
        populateContactForm();
    }

    initAll();

});
