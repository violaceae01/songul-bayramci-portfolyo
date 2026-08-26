document.addEventListener('DOMContentLoaded', () => {

    const STORAGE_KEY = 'sb_site_data';

    // State
    let appData = loadData();

    function loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof siteData !== 'undefined' && siteData.portfolio && parsed.portfolio) {
                    const existingSrcs = new Set(parsed.portfolio.map(p => p.src));
                    const newItems = siteData.portfolio.filter(p => !existingSrcs.has(p.src));
                    if (newItems.length > 0) {
                        parsed.portfolio = [...newItems, ...parsed.portfolio];
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
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
            portfolio: [],
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
    const portfolioList = document.getElementById('portfolioList');
    const portfolioCount = document.getElementById('portfolioCount');
    const portfolioModal = document.getElementById('portfolioModal');
    const portfolioForm = document.getElementById('portfolioForm');
    const btnOpenAddModal = document.getElementById('btnOpenAddModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const modalTitle = document.getElementById('modalTitle');
    const editItemId = document.getElementById('editItemId');

    const itemSrc = document.getElementById('itemSrc');
    const itemTitle = document.getElementById('itemTitle');
    const itemCategory = document.getElementById('itemCategory');
    const itemDesc = document.getElementById('itemDesc');
    const modalImgPreview = document.getElementById('modalImgPreview');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    function renderPortfolioList() {
        if (!portfolioList) return;
        portfolioList.innerHTML = '';
        const items = appData.portfolio || [];
        if (portfolioCount) portfolioCount.textContent = items.length;

        if (items.length === 0) {
            portfolioList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Henüz hiç görsel eklenmemiş.</p>';
            return;
        }

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'portfolio-admin-item';
            card.innerHTML = `
                <img src="${item.src}" alt="${item.title}" class="item-thumb" onerror="this.src='https://via.placeholder.com/400x250?text=Görsel+Bulunamadı'">
                <div class="item-details">
                    <span class="item-badge">${item.category || 'genel'}</span>
                    <h3 class="item-title">${item.title || 'Başlıksız'}</h3>
                    <p class="item-desc">${item.desc || ''}</p>
                    <div class="item-actions">
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${item.id}" style="flex:1;">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;

            // Edit button
            card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(item));

            // Delete button
            card.querySelector('.delete-btn').addEventListener('click', () => deletePortfolioItem(item.id));

            portfolioList.appendChild(card);
        });
    }

    function openAddModal() {
        modalTitle.textContent = 'Yeni Görsel Ekle';
        portfolioForm.reset();
        editItemId.value = '';
        modalImgPreview.style.display = 'none';
        portfolioModal.classList.add('active');
    }

    function openEditModal(item) {
        modalTitle.textContent = 'Görseli Düzenle';
        editItemId.value = item.id;
        itemSrc.value = item.src;
        itemTitle.value = item.title;
        itemCategory.value = item.category;
        itemDesc.value = item.desc;

        if (item.src) {
            modalImgPreview.src = item.src;
            modalImgPreview.style.display = 'block';
        } else {
            modalImgPreview.style.display = 'none';
        }

        portfolioModal.classList.add('active');
    }

    function closeModal() {
        portfolioModal.classList.remove('active');
    }

    function deletePortfolioItem(id) {
        if (confirm('Bu görseli portföyden silmek istediğinize emin misiniz?')) {
            appData.portfolio = (appData.portfolio || []).filter(item => item.id !== id);
            saveData(false);
            renderPortfolioList();
            showToast('Görsel silindi!', 'success');
        }
    }

    // Dropzone & File Input
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    itemSrc.value = event.target.result;
                    modalImgPreview.src = event.target.result;
                    modalImgPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    itemSrc.value = event.target.result;
                    modalImgPreview.src = event.target.result;
                    modalImgPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    itemSrc?.addEventListener('input', () => {
        if (itemSrc.value.trim()) {
            modalImgPreview.src = itemSrc.value.trim();
            modalImgPreview.style.display = 'block';
        } else {
            modalImgPreview.style.display = 'none';
        }
    });

    if (btnOpenAddModal) btnOpenAddModal.addEventListener('click', openAddModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

    portfolioForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editItemId.value ? parseInt(editItemId.value, 10) : Date.now();
        const src = itemSrc.value.trim();
        const title = itemTitle.value.trim();
        const category = itemCategory.value;
        const desc = itemDesc.value.trim();

        if (!src) {
            showToast('Lütfen bir görsel seçin veya dosya yolu girin!', 'error');
            return;
        }

        if (!appData.portfolio) appData.portfolio = [];

        const existingIndex = appData.portfolio.findIndex(item => item.id === id);
        if (existingIndex > -1) {
            appData.portfolio[existingIndex] = { id, src, title, category, desc };
            showToast('Görsel güncellendi!', 'success');
        } else {
            appData.portfolio.unshift({ id, src, title, category, desc });
            showToast('Yeni görsel eklendi!', 'success');
        }

        saveData(false);
        renderPortfolioList();
        closeModal();
    });

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
        renderPortfolioList();
        populateHeroForm();
        renderStatsForm();
        populateAboutForm();
        renderTestimonialsForm();
        populateContactForm();
    }

    initAll();

});
