document.addEventListener('DOMContentLoaded', async () => {
    const STORAGE_KEY = 'sb_site_data';
    const utils = window.SiteDataUtils;
    const clone = value => JSON.parse(JSON.stringify(value));
    const escapeHtml = value => utils ? utils.escapeHtml(value) : String(value || '');
    const findById = (list, id) => (list || []).find(item => String(item.id) === String(id));
    const resolveAdminMedia = async reference => {
        const value = String(reference || '');
        if (!window.SiteMediaStore?.isStored(value)) return value;
        return window.SiteMediaStore.resolve(value);
    };

    const serverEnabled = Boolean(await window.SiteServer?.ensureAdminSession?.());
    let appData = loadData();
    if (serverEnabled) {
        try {
            const serverData = await window.SiteServer.loadData();
            if (serverData) {
                appData = loadData(serverData);
            }
        } catch (error) {
            console.error('Sunucu verisi yüklenemedi:', error);
            showToast('Sunucu verisi yüklenemedi. Lütfen sayfayı yenileyin.', 'error');
        }
    }

    function loadData(sourceData = null) {
        const defaults = typeof siteData !== 'undefined' ? clone(siteData) : {
            hero: {}, stats: [], artists: [], homeGallery: [], youtubeProjects: [], graphicProjects: [], videoClips: [], partners: [], sectionVisibility: {}, siteMedia: {}, about: {}, testimonials: [], contact: {}, textStyles: {}
        };
        try {
            const saved = sourceData ? null : localStorage.getItem(STORAGE_KEY);
            const parsed = sourceData && typeof sourceData === 'object' ? clone(sourceData) : (saved ? JSON.parse(saved) : {});
            const merged = { ...defaults, ...parsed };
            merged.hero = { ...(defaults.hero || {}), ...(parsed.hero || {}) };
            merged.contact = { ...(defaults.contact || {}), ...(parsed.contact || {}) };
            merged.sectionVisibility = { ...(defaults.sectionVisibility || {}), ...(parsed.sectionVisibility || {}) };
            merged.siteMedia = { ...(defaults.siteMedia || {}), ...(parsed.siteMedia || {}) };
            merged.siteText = { ...(defaults.siteText || {}), ...(parsed.siteText || {}) };
            merged.typography = { ...(defaults.typography || {}), ...(parsed.typography || {}) };
            merged.textStyles = { ...(defaults.textStyles || {}), ...(parsed.textStyles || {}) };
            merged.contact.socialVisibility = { instagram: true, youtube: true, twitter: false, linkedin: false, ...(defaults.contact?.socialVisibility || {}), ...(parsed.contact?.socialVisibility || {}) };
            merged.contact.infoOrder = Array.isArray(parsed.contact?.infoOrder) ? parsed.contact.infoOrder : (defaults.contact?.infoOrder || ['phone', 'email', 'location']);
            merged.testimonials = (merged.testimonials || []).map((item, index) => ({
                ...item,
                mobileFeatured: item.mobileFeatured === undefined ? index < 4 : item.mobileFeatured === true,
                pageOrder: Number.isFinite(Number(item.pageOrder)) ? Number(item.pageOrder) : index,
                homeOrder: Number.isFinite(Number(item.homeOrder)) ? Number(item.homeOrder) : index
            }));
            if (!merged.siteText.featuredMore || merged.siteText.featuredMore === 'Daha Fazla') merged.siteText.featuredMore = 'Tüm Çalışmalarımı Gör';
            const savedContentVersion = Number(parsed.contentVersion || 0);
            const currentContentVersion = Number(defaults.contentVersion || 0);
            if (savedContentVersion < 5) {
                merged.sectionVisibility.homeServices = false;
            }
            if (savedContentVersion < 6) {
                merged.siteText.footerCopyright = defaults.siteText?.footerCopyright || 'All rights are reserved. No part of this publication may be reproduced,';
                merged.siteText.footerLegal = defaults.siteText?.footerLegal || 'lesmejorcreative Copyright © 2026';
            }
            if (savedContentVersion < currentContentVersion && Array.isArray(defaults.graphicProjects)) {
                const existingGraphicIds = new Set((parsed.graphicProjects || []).map(item => String(item.id)));
                const missingGraphicProjects = defaults.graphicProjects
                    .filter(item => !existingGraphicIds.has(String(item.id)))
                    .map(clone);
                merged.graphicProjects = [...(parsed.graphicProjects || []), ...missingGraphicProjects];
                merged.about = {
                    ...(defaults.about || {}),
                    ...(parsed.about || {}),
                    tag: defaults.about?.tag || parsed.about?.tag,
                    name: defaults.about?.name || parsed.about?.name,
                    owner: defaults.about?.owner || parsed.about?.owner,
                    lead: defaults.about?.lead || parsed.about?.lead,
                    p1: defaults.about?.p1 || parsed.about?.p1,
                    p2: defaults.about?.p2 || parsed.about?.p2,
                    vision: defaults.about?.vision || parsed.about?.vision,
                    mission: defaults.about?.mission || parsed.about?.mission
                };
                merged.contact = {
                    ...(defaults.contact || {}),
                    ...(parsed.contact || {}),
                    instagram: defaults.contact?.instagram || parsed.contact?.instagram
                };
                merged.testimonials = (parsed.testimonials || defaults.testimonials || []).map(testimonial => {
                    if (!String(testimonial?.text || '').startsWith('Songül hanım')) return testimonial;
                    return { ...testimonial, text: String(testimonial.text).replace('Songül hanım', 'Les Mejor Creative ekibi') };
                });
                merged.contentVersion = currentContentVersion;
            }
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
            if (Array.isArray(merged.youtubeProjects) && defaults.youtubeProjects?.[0]) {
                merged.youtubeProjects = merged.youtubeProjects.map(project => {
                    const isOldDemo = project?.title === 'Afyonkarahisar Belediyesi'
                        && project?.url === 'https://www.youtube.com/c/AfyonkarahisarBelediyesi';
                    return isOldDemo ? clone(defaults.youtubeProjects[0]) : project;
                });
            }
            if (!serverEnabled) localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            defaults.artists = utils ? utils.normalizeArtists(defaults.artists) : defaults.artists;
            return defaults;
        }
    }

    async function saveData(notify = true) {
        try {
            if (serverEnabled) await window.SiteServer.saveData(appData);
            else localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
            if (notify) showToast(serverEnabled ? 'Değişiklikler canlı siteye kaydedildi!' : 'Tüm değişiklikler başarıyla kaydedildi!', 'success');
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            showToast(serverEnabled ? 'Değişiklikler sunucuya kaydedilemedi.' : 'Metin verisi tarayıcı sınırını aştı. Görsel ve videoları dosya yükleme alanlarından seçin.', 'error');
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

    function showUploadError(error, label = 'Dosya') {
        const detail = String(error?.message || '').trim();
        const fallback = serverEnabled
            ? 'Sunucu yüklemeyi tamamlayamadı. Lütfen yeniden deneyin.'
            : 'Tarayıcı depolama alanını kontrol edin.';
        showToast(`${label} yüklenemedi. ${detail || fallback}`, 'error');
    }

    const pageAdminConfig = {
        home: {
            panel: 'tab-home',
            groups: [
                { title: 'Ana Menü', description: 'Ana sayfada görünen menü başlıklarını düzenleyin.', textFields: ['navHome', 'navCorporate'] },
                { title: 'Ana Banner', description: 'Banner görünürlüğü ile video ve başlık ayarları bu alanın hemen altında yer alır.', visibility: ['homeHero'] },
                { title: 'İstatistikler', description: 'Sayaç bölümünü açıp kapatın; sayılar aynı alanın altındaki karttan düzenlenir.', visibility: ['homeStats'] },
                { title: 'Çekim Stili', description: 'Bu bölüme ait görünürlük, başlık ve kart metinleri.', visibility: ['homeServices'], textFields: ['servicesTag', 'servicesTitle', 'service1Kicker', 'service1Title', 'service1Description', 'service2Kicker', 'service2Title', 'service2Description', 'service3Kicker', 'service3Title', 'service3Description'] },
                { title: 'Öne Çıkan Sanatçılar', description: 'Ana sayfadaki sanatçı bölümünün görünürlüğü ve sabit metinleri.', visibility: ['featuredArtists'], textFields: ['featuredTag', 'featuredTitle', 'featuredMore'] },
                { title: 'Referans Logo Şeridi', description: 'Ana sayfadaki kayan marka logolarını açıp kapatın.', visibility: ['partnerLogos'] },
                { title: 'Hakkımızda', description: 'Ana sayfa Hakkımızda alanı ve hareketli Les Mejor görseli.', visibility: ['homeAbout', 'homeSignature'] },
                { title: 'Müşteri Yorumları', description: 'Ana sayfadaki yorum bölümünü açıp kapatın. Yorum içerikleri Ne Diyorlar sekmesindedir.', visibility: ['testimonials'] },
                { title: 'Projemiz Var ve Footer', description: 'İletişim alanı, alt bilgi ve yukarı çık düğmesini birlikte yönetin.', visibility: ['homeContact', 'siteFooter', 'scrollTop'], textFields: ['footerCopyright', 'footerLegal'] }
            ]
        },
        about: { panel: 'tab-about', groups: [{ title: 'Hakkımızda Sayfası', description: 'Sayfa görünürlüğü, menü adı ve bölüm başlığı.', visibility: ['aboutPage', 'aboutVisionMission'], textFields: ['navAbout', 'aboutTag'] }] },
        works: { panel: 'tab-portfolio', groups: [{ title: 'Çalışmalarım Sayfası', description: 'Sanatçı ve konser sayfasının görünürlüğü ile menü adı.', visibility: ['worksPage'], textFields: ['navWorks'] }] },
        clips: { panel: 'tab-clips', groups: [{ title: 'Klip Çekimleri Sayfası', description: 'Sayfanın görünürlüğü, menü adı ve üst başlıkları.', visibility: ['clipShootings'], textFields: ['navClip', 'clipTag', 'clipTitle'] }] },
        video: { panel: 'tab-video-clips', groups: [{ title: 'Video Klipleri Sayfası', description: 'Sayfanın görünürlüğü, menü adı ve üst başlıkları.', visibility: ['videoClips'], textFields: ['navVideo', 'videoTag', 'videoTitle'] }] },
        graphics: { panel: 'tab-graphics', groups: [{ title: 'Grafik Tasarım Sayfası', description: 'Sayfanın görünürlüğü, menü adı ve üst başlıkları.', visibility: ['graphicDesign'], textFields: ['navGraphic', 'graphicTag', 'graphicTitle'] }] },
        contact: { panel: 'tab-contact', groups: [{ title: 'İletişim Sayfası', description: 'İletişim alanlarının görünürlüğü, menü adı ve başlıkları.', visibility: ['contactPage', 'contactDetails', 'contactForm'], textFields: ['navContact', 'contactTag', 'contactTitle'] }] },
        references: { panel: 'tab-references', groups: [{ title: 'Referanslar Sayfası', description: 'Referans sayfasının görünürlüğü, menü adı ve başlıkları.', visibility: ['referencesPage'], textFields: ['navReferences', 'referencesTag', 'referencesTitle'] }] },
        testimonials: { panel: 'tab-testimonials', groups: [{ title: 'Ne Diyorlar Sayfası', description: 'Yorum sayfasının görünürlüğü, menü adı ve başlıkları.', visibility: ['testimonialsPage'], textFields: ['navTestimonials', 'testimonialsTag', 'testimonialsTitle'] }] }
    };

    function makePageSettingsCards(pageKey, config) {
        const panel = document.getElementById(config.panel);
        if (!panel) return;
        const fragment = document.createDocumentFragment();
        (config.groups || []).forEach((group, index) => {
            const visibilityLabels = (group.visibility || []).map(key => document.querySelector(`[data-section-toggle="${key}"]`)?.closest('.admin-toggle')).filter(Boolean);
            const textFields = group.textFields || [];
            if (!visibilityLabels.length && !textFields.length) return;
            const card = document.createElement('div');
            card.className = 'admin-card page-settings-card';
            card.dataset.adminArea = `${pageKey}-${index}`;
            card.innerHTML = `<div class="card-header"><div><h2>${escapeHtml(group.title)}</h2><p class="admin-card-description">${escapeHtml(group.description || 'Bu alana ait görünürlük ve metin ayarları.')}</p></div></div>${visibilityLabels.length ? `<div class="admin-toggle-grid" data-page-visibility="${pageKey}-${index}"></div>` : ''}${textFields.length ? `<div class="form-grid page-text-grid" data-site-text-fields="${escapeHtml(textFields.join(','))}"></div>` : ''}`;
            visibilityLabels.forEach(label => card.querySelector('[data-page-visibility]')?.appendChild(label));
            fragment.appendChild(card);
        });
        panel.prepend(fragment);
    }

    function organizeAdminPanels() {
        const homePanel = document.getElementById('tab-home');
        const statsCard = document.getElementById('tab-stats')?.querySelector('.admin-card');
        const typographyCard = document.getElementById('typographyAdmin')?.closest('.admin-card');
        const mediaCard = document.getElementById('siteMediaAdmin')?.closest('.admin-card');
        if (homePanel) {
            if (statsCard) homePanel.appendChild(statsCard);
            if (mediaCard) homePanel.appendChild(mediaCard);
            if (typographyCard) typographyCard.remove();
        }
        Object.entries(pageAdminConfig).forEach(([pageKey, config]) => makePageSettingsCards(pageKey, config));
        document.getElementById('tab-visibility')?.remove();
        document.getElementById('tab-stats')?.remove();
        document.getElementById('tab-texts')?.remove();
    }
    organizeAdminPanels();

    const orderSelectOptions = (length, selectedIndex) => Array.from({ length }, (_, index) => `<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${index + 1}. sıra</option>`).join('');
    const moveArrayItem = (items, fromIndex, toIndex) => {
        if (!Array.isArray(items) || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex) return items;
        const [item] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, item);
        return items;
    };

    const tabDescriptions = {
        'tab-home': { title: 'Anasayfa', desc: 'Anasayfada görünen banner, bölümler, metinler ve görselleri yönetin.' },
        'tab-portfolio': { title: 'Çalışmalarım', desc: 'Sanatçıları, konserlerini, galerilerini ve video bağlantılarını yönetin.' },
        'tab-clips': { title: 'Klip Çekimleri', desc: 'Klipleri sıralayın, YouTube bağlantılarını ve isteğe bağlı kapak görsellerini yönetin.' },
        'tab-video-clips': { title: 'Video Klipleri', desc: 'Video klipleri sıralayın ve medya dosyalarını yönetin.' },
        'tab-graphics': { title: 'Grafik Tasarım', desc: 'Afiş ve tasarım çalışmalarını sıralayın ve doğrudan yükleyin.' },
        'tab-references': { title: 'Referanslar', desc: 'Çalışılan markaları ve logo dosyalarını yönetin.' },
        'tab-about': { title: 'Hakkımda', desc: 'Marka, vizyon, misyon ve hakkımızda metinlerini yönetin.' },
        'tab-testimonials': { title: 'Ne Diyorlar', desc: 'Sanatçı ve müşteri yorumlarını düzenleyin.' },
        'tab-contact': { title: 'İletişim', desc: 'İletişim bilgilerini ve sosyal medya bağlantılarını güncelleyin.' },
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

    const normalizeAdminSearch = value => String(value || '').toLocaleLowerCase('tr-TR').trim();
    function setupAdminSearch(inputId, container, itemSelector, emptyId) {
        const input = document.getElementById(inputId);
        const empty = document.getElementById(emptyId);
        const clearButton = document.querySelector(`[data-admin-search-clear="${inputId}"]`);
        const refresh = () => {
            if (!input || !container) return;
            const query = normalizeAdminSearch(input.value);
            const cards = [...container.querySelectorAll(itemSelector)];
            let visibleCount = 0;
            cards.forEach(card => {
                const fieldValues = [...card.querySelectorAll('input, textarea, select')].map(field => field.value);
                const matches = !query || normalizeAdminSearch([card.textContent, ...fieldValues].join(' ')).includes(query);
                card.hidden = !matches;
                if (matches) visibleCount += 1;
            });
            if (empty) empty.hidden = !query || visibleCount > 0 || cards.length === 0;
            if (clearButton) clearButton.classList.toggle('is-visible', Boolean(query));
        };
        input?.addEventListener('input', refresh);
        clearButton?.addEventListener('click', () => {
            input.value = '';
            refresh();
            input.focus();
        });
        return refresh;
    }

    const artistsListEl = document.getElementById('artistsList');
    const artistsCount = document.getElementById('artistsCount');
    const refreshArtistSearch = setupAdminSearch('portfolioAdminSearch', artistsListEl, '.artist-admin-card', 'portfolioAdminSearchEmpty');
    const artistModal = document.getElementById('artistModal');
    const artistForm = document.getElementById('artistForm');
    const editArtistId = document.getElementById('editArtistId');
    const artistName = document.getElementById('artistName');
    const artistBio = document.getElementById('artistBio');
    const artistCover = document.getElementById('artistCover');
    const artistCoverPreview = document.getElementById('artistCoverPreview');
    const artistVisible = document.getElementById('artistVisible');
    const artistFeatured = document.getElementById('artistFeatured');

    const concertModal = document.getElementById('concertModal');
    const concertForm = document.getElementById('concertForm');
    const targetConcertArtistId = document.getElementById('targetConcertArtistId');
    const editConcertId = document.getElementById('editConcertId');
    const concertName = document.getElementById('concertName');
    const concertDate = document.getElementById('concertDate');
    const concertVenue = document.getElementById('concertVenue');
    const concertVideoLabel = document.getElementById('concertVideoLabel');
    const concertVideoUrl = document.getElementById('concertVideoUrl');
    const concertVideoEnabled = document.getElementById('concertVideoEnabled');

    const photoModal = document.getElementById('photoModal');
    const photoForm = document.getElementById('photoForm');
    const targetArtistId = document.getElementById('targetArtistId');
    const targetConcertId = document.getElementById('targetConcertId');
    const photoFileInput = document.getElementById('photoFileInput');
    const photoSelectionSummary = document.getElementById('photoSelectionSummary');

    function renderArtistsList() {
        if (!artistsListEl) return;
        artistsListEl.innerHTML = '';
        appData.artists = utils ? utils.normalizeArtists(appData.artists) : (appData.artists || []);
        const artists = utils ? utils.sortArtists(appData.artists) : [...appData.artists];
        const featuredArtists = [...appData.artists].filter(item => item.featured !== false).sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0));
        if (artistsCount) artistsCount.textContent = artists.length;

        if (!artists.length) {
            artistsListEl.innerHTML = '<p class="admin-empty">Henüz sanatçı eklenmedi.</p>';
            refreshArtistSearch();
            return;
        }

        artists.forEach((artist, artistIndex) => {
            const concertsHtml = artist.concerts.length
                ? artist.concerts.map(concert => renderConcertAdminCard(artist, concert)).join('')
                : '<div class="admin-empty compact">Bu sanatçıya henüz konser eklenmedi.</div>';
            const card = document.createElement('article');
            card.className = 'artist-admin-card';
            card.innerHTML = `
                <div class="artist-card-header">
                    <div class="artist-cover-wrap"><img src="${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name)}" class="artist-cover-thumb"></div>
                    <div class="artist-info-wrap">
                        <h3>${escapeHtml(artist.name)}</h3>
                        <p>${artist.concerts.length} konser · <a href="sanatci?artist=${encodeURIComponent(artist.slug)}" target="_blank">sanatçı sayfasını aç</a></p>
                        <div class="admin-state-row"><span class="admin-state ${artist.visible !== false ? 'is-on' : 'is-off'}">${artist.visible !== false ? 'Sitede açık' : 'Sitede kapalı'}</span><span class="admin-state ${artist.featured !== false ? 'is-on' : 'is-off'}">${artist.featured !== false ? `Öne çıkan sıra: ${featuredArtists.findIndex(item => String(item.id) === String(artist.id)) + 1}` : 'Öne çıkarılmıyor'}</span></div>
                    </div>
                    <div class="artist-actions-wrap">
                        <label class="admin-order-picker">Çalışmalarım <select data-artist-page-position="${artist.id}">${orderSelectOptions(artists.length, artistIndex)}</select></label>
                        ${artist.featured !== false ? `<label class="admin-order-picker">Anasayfa <select data-artist-featured-position="${artist.id}">${orderSelectOptions(featuredArtists.length, featuredArtists.findIndex(item => String(item.id) === String(artist.id)))}</select></label>` : ''}
                        <button class="btn btn-primary btn-sm" type="button" data-open-admin-editor><i class="fas fa-pen"></i> Düzenle</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-artist" data-artist-id="${artist.id}" aria-label="Sanatçıyı sil"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="modal admin-item-editor-modal" aria-hidden="true">
                    <div class="modal-content admin-item-editor-content admin-artist-editor-content" role="dialog" aria-modal="true">
                        <div class="modal-header admin-item-editor-header"><h2 class="admin-item-editor-title">${escapeHtml(artist.name)} Düzenle</h2><button class="modal-close" type="button" data-close-admin-editor aria-label="Düzenleme penceresini kapat">&times;</button></div>
                        <div class="artist-editor-summary">
                            <div class="artist-editor-cover"><img src="${escapeHtml(artist.cover)}" data-media-reference="${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name)}"></div>
                            <div>
                                <div class="admin-state-row"><span class="admin-state ${artist.visible !== false ? 'is-on' : 'is-off'}">${artist.visible !== false ? 'Sitede açık' : 'Sitede kapalı'}</span><span class="admin-state ${artist.featured !== false ? 'is-on' : 'is-off'}">${artist.featured !== false ? `Öne çıkan sıra: ${featuredArtists.findIndex(item => String(item.id) === String(artist.id)) + 1}` : 'Öne çıkarılmıyor'}</span></div>
                                <label class="admin-toggle artist-featured-switch"><input type="checkbox" data-action="toggle-featured" data-artist-id="${artist.id}" ${artist.featured === true ? 'checked' : ''}><span><strong>Ana Sayfada Öne Çıkar</strong><small>Kapatıldığında sanatçı ana sayfadan hemen kaldırılır.</small></span></label>
                                ${artist.bio ? `<p class="artist-bio-preview artist-editor-bio">${escapeHtml(artist.bio)}</p>` : '<p class="artist-bio-preview artist-editor-bio">Hakkında metni eklenmedi.</p>'}
                            </div>
                        </div>
                        <div class="artist-editor-actions">
                            <button class="btn btn-primary" data-action="add-concert" data-artist-id="${artist.id}"><i class="fas fa-plus"></i> Yeni Konser</button>
                            <button class="btn btn-secondary" data-action="edit-artist" data-artist-id="${artist.id}"><i class="fas fa-edit"></i> Sanatçı Bilgileri</button>
                        </div>
                        <div class="artist-concerts-admin-list">${concertsHtml}</div>
                        <div class="admin-item-editor-footer"><button class="btn btn-primary" type="button" data-close-admin-editor><i class="fas fa-check"></i> Düzenlemeyi Bitir</button></div>
                    </div>
                </div>`;
            artistsListEl.appendChild(card);
            const coverImage = card.querySelector('.artist-cover-thumb');
            if (coverImage && window.SiteMediaStore?.isStored(artist.cover)) resolveAdminMedia(artist.cover).then(source => { if (source) coverImage.src = source; });
            card.querySelectorAll('[data-media-reference]').forEach(image => {
                const reference = image.dataset.mediaReference;
                if (window.SiteMediaStore?.isStored(reference)) resolveAdminMedia(reference).then(source => { if (source) image.src = source; });
            });
        });
        refreshArtistSearch();
    }

    function renderConcertAdminCard(artist, concert) {
        const photos = (concert.images || []).map((image, imageIndex) => `
            <div class="artist-subphoto-item">
                <img src="${escapeHtml(image.src)}" data-media-reference="${escapeHtml(image.src)}" alt="${escapeHtml(image.title || artist.name)}">
                <select class="subphoto-order" data-action="photo-position" data-artist-id="${artist.id}" data-concert-id="${concert.id}" data-photo-id="${image.id}" aria-label="Fotoğraf sırası">${orderSelectOptions((concert.images || []).length, imageIndex)}</select>
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
                ${concert.videoUrl && concert.videoEnabled !== false ? `<a class="admin-video-link" href="${escapeHtml(concert.videoUrl)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-play"></i>${escapeHtml(concert.videoLabel || 'Konser Çekimine Git')}</a>` : concert.videoUrl ? '<span class="admin-video-missing"><i class="fas fa-eye-slash"></i> Video butonu sitede kapalı</span>' : '<span class="admin-video-missing"><i class="fas fa-video-slash"></i> Video bağlantısı eklenmedi</span>'}
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
        const parentEditor = button.closest('.admin-item-editor-modal');

        if (action === 'edit-artist') { closeAdminItemEditor(parentEditor); openArtistModal(artist); }
        if (action === 'add-concert') { closeAdminItemEditor(parentEditor); openConcertModal(artist.id); }
        if (action === 'edit-concert' && concert) { closeAdminItemEditor(parentEditor); openConcertModal(artist.id, concert); }
        if (action === 'add-photo' && concert) { closeAdminItemEditor(parentEditor); openPhotoModal(artist.id, concert.id); }
        if (action === 'delete-artist' && confirm(`${artist.name} ve tüm konserleri silinsin mi?`)) {
            const references = [artist.cover, ...artist.concerts.flatMap(item => (item.images || []).map(image => image.src))].filter(reference => window.SiteMediaStore?.isStored(reference));
            Promise.allSettled(references.map(reference => window.SiteMediaStore.remove(reference)));
            appData.artists = appData.artists.filter(item => String(item.id) !== String(artist.id));
            saveData(false); renderArtistsList(); showToast('Sanatçı silindi.');
        }
        if (action === 'delete-concert' && concert && confirm(`${concert.name} konseri ve tüm fotoğrafları silinsin mi?`)) {
            Promise.allSettled((concert.images || []).map(image => image.src).filter(reference => window.SiteMediaStore?.isStored(reference)).map(reference => window.SiteMediaStore.remove(reference)));
            artist.concerts = artist.concerts.filter(item => String(item.id) !== String(concert.id));
            saveData(false); renderArtistsList(); showToast('Konser silindi.');
        }
        if (action === 'delete-photo' && concert && confirm('Bu fotoğraf silinsin mi?')) {
            const removed = concert.images.find(item => String(item.id) === String(button.dataset.photoId));
            concert.images = concert.images.filter(item => String(item.id) !== String(button.dataset.photoId));
            concert.cover = concert.images[0]?.src || '';
            if (window.SiteMediaStore?.isStored(removed?.src)) window.SiteMediaStore.remove(removed.src).catch(() => {});
            saveData(false); renderArtistsList(); showToast('Fotoğraf silindi.');
        }
        if (action === 'toggle-featured') {
            artist.featured = button.checked === true;
            if (artist.featured) {
                artist.featuredOrder = Math.max(-1, ...appData.artists.filter(item => item.featured === true && String(item.id) !== String(artist.id)).map(item => Number(item.featuredOrder) || 0)) + 1;
            }
            saveData(false);
            renderArtistsList();
            showToast(artist.featured ? 'Sanatçı ana sayfada öne çıkarılacak.' : 'Sanatçı ana sayfadaki öne çıkanlardan kaldırıldı.');
        }
    });

    function openArtistModal(artist = null) {
        artistForm.reset();
        artistForm.querySelectorAll('.artist-record-style').forEach(element => element.remove());
        artistCoverPreview.style.display = 'none';
        document.getElementById('artistModalTitle').textContent = artist ? 'Sanatçıyı Düzenle' : 'Yeni Sanatçı Ekle';
        editArtistId.value = artist?.id || '';
        artistName.value = artist?.name || '';
        artistBio.value = artist?.bio || '';
        artistCover.value = artist?.cover || '';
        artistVisible.checked = artist?.visible !== false;
        artistFeatured.checked = artist?.featured !== false;
        if (artist) {
            const nameStyle = document.createElement('div'); nameStyle.className = 'artist-record-style'; nameStyle.innerHTML = textStyleControls(`artist.${artist.id}.name`); artistName.closest('.form-group')?.appendChild(nameStyle);
            const bioStyle = document.createElement('div'); bioStyle.className = 'artist-record-style'; bioStyle.innerHTML = textStyleControls(`artist.${artist.id}.bio`); artistBio.closest('.form-group')?.appendChild(bioStyle);
        }
        if (artist?.cover) { resolveAdminMedia(artist.cover).then(source => { artistCoverPreview.src = source || ''; artistCoverPreview.style.display = source ? 'block' : 'none'; }); }
        artistModal.classList.add('active');
    }
    const closeArtistModal = () => artistModal.classList.remove('active');
    document.getElementById('btnOpenAddArtistModal')?.addEventListener('click', () => openArtistModal());
    document.getElementById('btnCloseArtistModal')?.addEventListener('click', closeArtistModal);
    document.getElementById('btnCancelArtistModal')?.addEventListener('click', closeArtistModal);

    artistForm?.addEventListener('submit', event => {
        event.preventDefault();
        readTextAndTypographyForms();
        const existing = findById(appData.artists, editArtistId.value);
        const name = artistName.value.trim();
        const bio = artistBio.value.trim();
        const cover = artistCover.value.trim();
        const visible = artistVisible.checked;
        const featured = artistFeatured.checked;
        if (existing) {
            existing.name = name; existing.bio = bio; existing.cover = cover; existing.visible = visible; existing.featured = featured; showToast('Sanatçı güncellendi.');
        } else {
            const id = Date.now();
            appData.artists.forEach(item => {
                item.siteOrder = (Number(item.siteOrder) || 0) + 1;
                if (item.featured === true) item.featuredOrder = (Number(item.featuredOrder) || 0) + 1;
            });
            appData.artists.unshift({ id, slug: utils ? utils.slugify(name) : String(id), name, bio, cover, visible, featured, siteOrder: 0, featuredOrder: 0, concerts: [] });
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
        concertVideoEnabled.checked = concert?.videoEnabled !== false;
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
        const values = { name: concertName.value.trim(), date: concertDate.value, venue: concertVenue.value.trim(), videoLabel: concertVideoLabel.value.trim(), videoUrl: concertVideoUrl.value.trim(), videoEnabled: concertVideoEnabled.checked };
        if (existing) { Object.assign(existing, values); showToast('Konser güncellendi.'); }
        else { artist.concerts.unshift({ id: Date.now(), ...values, cover: '', images: [] }); showToast('Yeni konser eklendi.'); }
        saveData(false); renderArtistsList(); closeConcertModal();
    });

    function openPhotoModal(artistId, concertId) {
        photoForm.reset(); targetArtistId.value = artistId; targetConcertId.value = concertId;
        if (photoSelectionSummary) photoSelectionSummary.textContent = 'Henüz fotoğraf seçilmedi.';
        photoModal.classList.add('active');
    }
    const closePhotoModal = () => photoModal.classList.remove('active');
    document.getElementById('btnClosePhotoModal')?.addEventListener('click', closePhotoModal);
    document.getElementById('btnCancelPhotoModal')?.addEventListener('click', closePhotoModal);

    photoFileInput?.addEventListener('change', () => {
        if (photoSelectionSummary) photoSelectionSummary.textContent = photoFileInput.files?.length ? `${photoFileInput.files.length} fotoğraf seçildi.` : 'Henüz fotoğraf seçilmedi.';
    });

    photoForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const artist = findById(appData.artists, targetArtistId.value);
        const concert = findById(artist?.concerts, targetConcertId.value);
        if (!artist || !concert) return;
        const files = [...(photoFileInput?.files || [])].filter(file => file.type.startsWith('image/'));
        if (!files.length) return showToast('En az bir fotoğraf seçin.', 'error');
        const saveButton = document.getElementById('btnSavePhotoModal');
        if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Yükleniyor...'; }
        try {
            const uploaded = [];
            for (const [index, file] of files.entries()) {
                if (photoSelectionSummary) photoSelectionSummary.textContent = `${index + 1} / ${files.length} yükleniyor...`;
                const src = await window.SiteMediaStore.save(file, 'concert-photo');
                uploaded.push({ id: `${Date.now()}-${index}`, src, title: '', desc: '' });
            }
            concert.images.unshift(...uploaded);
            concert.cover = concert.images[0]?.src || concert.cover || '';
            await saveData(false); renderArtistsList(); closePhotoModal(); showToast(`${uploaded.length} fotoğraf konsere eklendi.`);
        } catch (error) {
            console.error(error); showUploadError(error, 'Fotoğraflar');
        } finally {
            if (saveButton) { saveButton.disabled = false; saveButton.textContent = 'Seçilenleri Yükle'; }
        }
    });

    function setupDropzone(zoneId, inputId, previewId, pathInputId) {
        const zone = document.getElementById(zoneId); const fileInput = document.getElementById(inputId);
        const pathInput = document.getElementById(pathInputId); const preview = document.getElementById(previewId);
        if (!zone || !fileInput || !pathInput || !preview) return;
        const handleFile = async file => {
            if (!file) return;
            try {
                const previousReference = pathInput.value.trim();
                pathInput.value = await window.SiteMediaStore.save(file, zoneId === 'artistDropZone' ? 'artist-cover' : 'concert-photo');
                if (window.SiteMediaStore.isStored(previousReference)) await window.SiteMediaStore.remove(previousReference);
                preview.src = await resolveAdminMedia(pathInput.value);
                preview.style.display = 'block';
                showToast('Görsel yüklendi. Kaydetmeyi unutmayın.');
            } catch (error) {
                console.error('Görsel yükleme hatası:', error);
                showUploadError(error, 'Görsel');
            }
        };
        zone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', event => handleFile(event.target.files[0]));
        zone.addEventListener('dragover', event => { event.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
        zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
        zone.addEventListener('drop', event => { event.preventDefault(); zone.style.borderColor = ''; const file = event.dataTransfer.files[0]; if (file?.type.startsWith('image/')) handleFile(file); });
        pathInput.addEventListener('input', () => { preview.style.display = pathInput.value.trim() ? 'block' : 'none'; if (pathInput.value.trim()) preview.src = pathInput.value.trim(); });
    }
    setupDropzone('artistDropZone', 'artistFileInput', 'artistCoverPreview', 'artistCover');
    const photoDropZone = document.getElementById('photoDropZone');
    photoDropZone?.addEventListener('click', () => photoFileInput?.click());
    photoDropZone?.addEventListener('dragover', event => { event.preventDefault(); photoDropZone.style.borderColor = 'var(--accent)'; });
    photoDropZone?.addEventListener('dragleave', () => { photoDropZone.style.borderColor = ''; });
    photoDropZone?.addEventListener('drop', event => {
        event.preventDefault(); photoDropZone.style.borderColor = '';
        const files = [...event.dataTransfer.files].filter(file => file.type.startsWith('image/'));
        if (!files.length || !photoFileInput) return;
        const transfer = new DataTransfer(); files.forEach(file => transfer.items.add(file)); photoFileInput.files = transfer.files;
        photoFileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const heroTag = document.getElementById('heroTag'); const heroSubtitle = document.getElementById('heroSubtitle');
    const heroTitleLine1 = document.getElementById('heroTitleLine1'); const heroTitleLine2 = document.getElementById('heroTitleLine2');
    const heroBgVideo = document.getElementById('heroBgVideo'); const heroVideoPreview = document.getElementById('heroVideoPreview');
    const heroVideoFile = document.getElementById('heroVideoFile');
    async function updateHeroVideoPreview() {
        if (!heroVideoPreview) return;
        const videoUrl = await resolveAdminMedia(heroBgVideo?.value.trim() || '');
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
    heroVideoFile?.addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            showToast('Lütfen MP4 veya WebM video dosyası seçin.', 'error');
            event.target.value = '';
            return;
        }
        try {
            const previousReference = heroBgVideo.value.trim();
            heroBgVideo.value = await window.SiteMediaStore.save(file, 'hero-video');
            if (window.SiteMediaStore.isStored(previousReference)) await window.SiteMediaStore.remove(previousReference);
            await updateHeroVideoPreview();
            showToast('Banner videosu bilgisayardan yüklendi. Kaydetmeyi unutmayın.');
        } catch (error) {
            console.error('Video yükleme hatası:', error);
            showUploadError(error, 'Video');
        }
    });

    artistsListEl?.addEventListener('change', event => {
        const pageSelect = event.target.closest('[data-artist-page-position]');
        const featuredSelect = event.target.closest('[data-artist-featured-position]');
        const photoSelect = event.target.closest('[data-action="photo-position"]');
        if (pageSelect) {
            const ordered = utils ? utils.sortArtists(appData.artists) : [...appData.artists];
            const fromIndex = ordered.findIndex(item => String(item.id) === pageSelect.dataset.artistPagePosition);
            moveArrayItem(ordered, fromIndex, Number(pageSelect.value));
            ordered.forEach((item, index) => { item.siteOrder = index; });
            appData.artists = ordered;
            saveData(false); renderArtistsList(); showToast('Çalışmalarım sırası güncellendi.');
            return;
        }
        if (featuredSelect) {
            const ordered = appData.artists.filter(item => item.featured !== false).sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0));
            const fromIndex = ordered.findIndex(item => String(item.id) === featuredSelect.dataset.artistFeaturedPosition);
            moveArrayItem(ordered, fromIndex, Number(featuredSelect.value));
            ordered.forEach((item, index) => { item.featuredOrder = index; });
            saveData(false); renderArtistsList(); showToast('Anasayfa sanatçı sırası güncellendi.');
            return;
        }
        if (photoSelect) {
            const artist = findById(appData.artists, photoSelect.dataset.artistId);
            const concert = findById(artist?.concerts, photoSelect.dataset.concertId);
            const fromIndex = concert?.images?.findIndex(item => String(item.id) === photoSelect.dataset.photoId) ?? -1;
            if (!concert || fromIndex < 0) return;
            moveArrayItem(concert.images, fromIndex, Number(photoSelect.value));
            concert.cover = concert.images[0]?.src || '';
            saveData(false); renderArtistsList(); showToast('Fotoğraf sırası güncellendi.');
        }
    });

    const sectionVisibilityAdmin = document.getElementById('sectionVisibilityAdmin');
    function populateSectionVisibilityForm() {
        document.querySelectorAll('[data-section-toggle]').forEach(input => {
            input.checked = appData.sectionVisibility?.[input.dataset.sectionToggle] !== false;
        });
    }
    function readSectionVisibilityForm() {
        const nextVisibility = { ...(appData.sectionVisibility || {}) };
        document.querySelectorAll('[data-section-toggle]').forEach(input => {
            nextVisibility[input.dataset.sectionToggle] = input.checked;
        });
        appData.sectionVisibility = nextVisibility;
    }

    const youtubeProjectsAdmin = document.getElementById('youtubeProjectsAdmin');
    const videoClipsAdmin = document.getElementById('videoClipsAdmin');
    const graphicProjectsAdmin = document.getElementById('graphicProjectsAdmin');
    const partnersAdmin = document.getElementById('partnersAdmin');
    const refreshYoutubeSearch = setupAdminSearch('clipsAdminSearch', youtubeProjectsAdmin, '[data-youtube-project]', 'clipsAdminSearchEmpty');
    const refreshVideoClipsSearch = setupAdminSearch('videoClipsAdminSearch', videoClipsAdmin, '[data-creative-project]', 'videoClipsAdminSearchEmpty');
    const refreshGraphicsSearch = setupAdminSearch('graphicsAdminSearch', graphicProjectsAdmin, '[data-creative-project]', 'graphicsAdminSearchEmpty');
    const refreshReferencesSearch = setupAdminSearch('referencesAdminSearch', partnersAdmin, '[data-partner]', 'referencesAdminSearchEmpty');
    const refreshMediaSearch = container => {
        if (container === videoClipsAdmin) refreshVideoClipsSearch();
        if (container === graphicProjectsAdmin) refreshGraphicsSearch();
    };

    function closeAdminItemEditor(editor = document.querySelector('.admin-item-editor-modal.active')) {
        if (!editor) return;
        editor.classList.remove('active');
        editor.setAttribute('aria-hidden', 'true');
        if (!document.querySelector('.modal.active, .admin-item-editor-modal.active')) {
            document.body.classList.remove('admin-editor-open');
        }
    }

    function openAdminItemEditor(card) {
        const editor = card?.querySelector('.admin-item-editor-modal');
        if (!editor) return;
        document.querySelectorAll('.admin-item-editor-modal.active').forEach(item => closeAdminItemEditor(item));
        const label = card.querySelector('.media-admin-title-input')?.value.trim()
            || card.querySelector('.artist-info-wrap h3')?.textContent.trim()
            || 'Kart';
        const title = editor.querySelector('.admin-item-editor-title');
        if (title) title.textContent = `${label} Düzenle`;
        editor.classList.add('active');
        editor.setAttribute('aria-hidden', 'false');
        document.body.classList.add('admin-editor-open');
        editor.querySelector('[data-close-admin-editor]')?.focus();
    }

    document.addEventListener('click', event => {
        const openButton = event.target.closest('[data-open-admin-editor]');
        if (openButton) {
            openAdminItemEditor(openButton.closest('.media-admin-card, .artist-admin-card'));
            return;
        }
        const closeButton = event.target.closest('[data-close-admin-editor]');
        if (closeButton) {
            closeAdminItemEditor(closeButton.closest('.admin-item-editor-modal'));
            return;
        }
        const editor = event.target.closest('.admin-item-editor-modal');
        if (editor && event.target === editor) closeAdminItemEditor(editor);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeAdminItemEditor();
    });

    document.addEventListener('change', event => {
        if (!event.target.matches('.media-admin-title-input')) return;
        readAllForms();
        saveData(false);
        showToast('Kart adı güncellendi.');
    });

    function revealNewestAdminCard(container, searchInputId, selector) {
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) searchInput.value = '';
        if (container === youtubeProjectsAdmin) refreshYoutubeSearch();
        else if (container === partnersAdmin) refreshReferencesSearch();
        else refreshMediaSearch(container);
        const cards = container ? [...container.querySelectorAll(selector)] : [];
        const card = cards[0];
        if (card) openAdminItemEditor(card);
    }

    function renderCreativeProjectsForm(container, items, options) {
        if (!container) return;
        container.innerHTML = '';
        if (!items.length) {
            container.innerHTML = `<p class="admin-empty compact">Henüz ${escapeHtml(options.emptyLabel)} eklenmedi.</p>`;
            refreshMediaSearch(container);
            return;
        }

        items.forEach((project, index) => {
            const adminLabel = project.adminLabel || `${options.itemLabel} ${index + 1}`;
            const card = document.createElement('div');
            card.className = 'admin-form-card media-admin-card';
            card.dataset.creativeProject = String(project.id || Date.now() + index);
            card.innerHTML = `
                <div class="media-admin-card-header">
                    <input type="text" class="media-admin-title-input creative-admin-label" value="${escapeHtml(adminLabel)}" placeholder="${escapeHtml(options.itemLabel)} ${index + 1}" aria-label="Admin kart adı">
                    <span class="admin-order-actions"><label class="admin-order-picker">Sıra <select class="creative-position">${orderSelectOptions(items.length, index)}</select></label><button class="btn btn-danger btn-sm" type="button" data-delete-creative aria-label="${escapeHtml(options.itemLabel)} projesini sil"><i class="fas fa-trash-alt"></i></button></span>
                </div>
                <button class="media-admin-edit" type="button" data-open-admin-editor><i class="fas fa-pen" aria-hidden="true"></i><span>Düzenle</span><i class="fas fa-expand-alt" aria-hidden="true"></i></button>
                <div class="modal admin-item-editor-modal" aria-hidden="true">
                    <div class="modal-content admin-item-editor-content" role="dialog" aria-modal="true">
                        <div class="modal-header admin-item-editor-header"><h2 class="admin-item-editor-title">${escapeHtml(adminLabel)} Düzenle</h2><button class="modal-close" type="button" data-close-admin-editor aria-label="Düzenleme penceresini kapat">&times;</button></div>
                        <div class="form-grid">
                    <label class="admin-toggle form-full"><input type="checkbox" class="creative-enabled" ${project.enabled !== false ? 'checked' : ''}><span><strong>Yayında</strong><small>Kapatılırsa kart sayfada görünmez.</small></span></label>
                    <div class="form-group"><label>Proje / Sanatçı Adı</label><input type="text" class="form-control creative-title" value="${escapeHtml(project.title)}" placeholder="${escapeHtml(options.titlePlaceholder)}">${textStyleControls(`creative.${project.id}.title`)}</div>
                    <div class="form-group"><label>Yıl</label><input type="text" class="form-control creative-year" value="${escapeHtml(project.year)}" placeholder="2026">${textStyleControls(`creative.${project.id}.year`)}</div>
                    ${options.showCategory ? `<div class="form-group form-full"><label>Etiket (isteğe bağlı)</label><input type="text" class="form-control creative-category" value="${escapeHtml(project.category ?? '')}" placeholder="Boş bırakırsanız sitede gösterilmez">${textStyleControls(`creative.${project.id}.category`)}</div>` : ''}
                    <div class="form-group form-full"><label>${options.isVideo ? 'Özel Kapak Görseli (isteğe bağlı)' : 'Proje Görseli'}</label><input type="file" class="form-control creative-image-file" accept="image/*"><input type="hidden" class="creative-image" value="${escapeHtml(project.image)}"><button type="button" class="btn btn-danger btn-sm admin-media-remove" data-media-field=".creative-image"><i class="fas fa-trash-alt"></i> Görseli Kaldır</button><p class="form-help">${options.isVideo ? 'Görsel yüklemezseniz YouTube kapağı otomatik kullanılır.' : 'Görseli doğrudan bilgisayarınızdan seçin.'}</p></div>
                    ${options.isVideo ? `<div class="form-group form-full"><label>YouTube Video Bağlantısı</label><input type="url" class="form-control creative-url" value="${escapeHtml(project.url)}" placeholder="https://www.youtube.com/watch?v=..."><p class="form-help">Video sitedeki oynatıcıda YouTube üzerinden açılır. Özel kapak yüklemezseniz YouTube kapağı otomatik alınır.</p></div>` : '<input type="hidden" class="creative-url" value="">'}
                        </div>
                        <div class="admin-item-editor-footer"><button class="btn btn-primary" type="button" data-close-admin-editor><i class="fas fa-check"></i> Düzenlemeyi Bitir</button></div>
                    </div>
                </div>`;
            container.appendChild(card);
        });
        refreshMediaSearch(container);
    }

    function readCreativeProjectsForm(container, defaultCategory) {
        if (!container) return [];
        return [...container.querySelectorAll('[data-creative-project]')].map(card => ({
            id: Number(card.dataset.creativeProject) || Date.now(),
            adminLabel: card.querySelector('.creative-admin-label')?.value.trim() || '',
            title: card.querySelector('.creative-title')?.value.trim() || '',
            year: card.querySelector('.creative-year')?.value.trim() || '',
            category: card.querySelector('.creative-category')?.value.trim() || defaultCategory,
            image: card.querySelector('.creative-image')?.value.trim() || '',
            videoFile: '',
            url: card.querySelector('.creative-url')?.value.trim() || '',
            enabled: card.querySelector('.creative-enabled')?.checked !== false
        }));
    }

    function renderVideoClipsForm() {
        renderCreativeProjectsForm(videoClipsAdmin, appData.videoClips || [], {
            itemLabel: 'Video Klip', emptyLabel: 'video klip', titlePlaceholder: 'Kubilay Karça', defaultCategory: '', isVideo: true, showCategory: true
        });
    }

    function renderGraphicProjectsForm() {
        renderCreativeProjectsForm(graphicProjectsAdmin, appData.graphicProjects || [], {
            itemLabel: 'Grafik Tasarım', emptyLabel: 'grafik tasarım projesi', titlePlaceholder: 'Proje adı', defaultCategory: '', isVideo: false, showCategory: false
        });
    }

    document.getElementById('btnAddVideoClip')?.addEventListener('click', () => {
        appData.videoClips = readCreativeProjectsForm(videoClipsAdmin, '');
        appData.videoClips.unshift({ id: Date.now(), adminLabel: `Video Klip ${(appData.videoClips?.length || 0) + 1}`, title: '', year: String(new Date().getFullYear()), category: '', image: '', videoFile: '', url: '', enabled: true });
        renderVideoClipsForm();
        revealNewestAdminCard(videoClipsAdmin, 'videoClipsAdminSearch', '[data-creative-project]');
    });

    document.getElementById('btnAddGraphicProject')?.addEventListener('click', () => {
        appData.graphicProjects = readCreativeProjectsForm(graphicProjectsAdmin, '');
        appData.graphicProjects.unshift({ id: Date.now(), adminLabel: `Grafik Tasarım ${(appData.graphicProjects?.length || 0) + 1}`, title: '', year: String(new Date().getFullYear()), category: '', image: '', url: '', enabled: true });
        renderGraphicProjectsForm();
        revealNewestAdminCard(graphicProjectsAdmin, 'graphicsAdminSearch', '[data-creative-project]');
    });

    function bindCreativeActions(container, dataKey, defaultCategory, render, label) {
        container?.addEventListener('click', event => {
            const button = event.target.closest('[data-delete-creative]');
            if (!button) return;
            appData[dataKey] = readCreativeProjectsForm(container, defaultCategory);
            const card = button.closest('[data-creative-project]');
            const index = appData[dataKey].findIndex(project => String(project.id) === card?.dataset.creativeProject);
            if (!confirm(`Bu ${label} projesi silinsin mi?`)) return;
            const removed = appData[dataKey][index];
            [removed?.image, removed?.videoFile].filter(reference => window.SiteMediaStore?.isStored(reference)).forEach(reference => window.SiteMediaStore.remove(reference).catch(() => {}));
            appData[dataKey].splice(index, 1);
            saveData(false);
            render();
            showToast(`${label} projesi silindi.`);
        });
        container?.addEventListener('change', async event => {
            const position = event.target.closest('.creative-position');
            if (position) {
                appData[dataKey] = readCreativeProjectsForm(container, defaultCategory);
                const card = position.closest('[data-creative-project]');
                const fromIndex = appData[dataKey].findIndex(project => String(project.id) === card?.dataset.creativeProject);
                moveArrayItem(appData[dataKey], fromIndex, Number(position.value));
                await saveData(false); render(); showToast('Sıralama güncellendi.');
                return;
            }
            const fileInput = event.target.closest('.creative-image-file');
            if (!fileInput?.files?.[0]) return;
            const card = fileInput.closest('[data-creative-project]');
            const target = card?.querySelector('.creative-image');
            if (!target) return;
            try {
                const previous = target.value.trim();
                target.value = await window.SiteMediaStore.save(fileInput.files[0], 'project-image');
                if (window.SiteMediaStore.isStored(previous)) await window.SiteMediaStore.remove(previous);
                showToast('Görsel yüklendi. Kaydetmeyi unutmayın.');
            } catch (error) { console.error(error); showToast('Dosya yüklenemedi.', 'error'); }
        });
        container?.addEventListener('input', event => {
            const labelInput = event.target.closest('.media-admin-title-input');
            if (!labelInput) return;
            const title = labelInput.closest('[data-creative-project]')?.querySelector('.admin-item-editor-title');
            if (title) title.textContent = `${labelInput.value.trim() || label} Düzenle`;
        });
    }

    bindCreativeActions(videoClipsAdmin, 'videoClips', '', renderVideoClipsForm, 'video klip');
    bindCreativeActions(graphicProjectsAdmin, 'graphicProjects', '', renderGraphicProjectsForm, 'grafik tasarım');

    function renderYoutubeProjectsForm() {
        if (!youtubeProjectsAdmin) return;
        youtubeProjectsAdmin.innerHTML = '';
        const projects = appData.youtubeProjects || [];
        if (!projects.length) {
            youtubeProjectsAdmin.innerHTML = '<p class="admin-empty compact">Henüz klip çekimi eklenmedi.</p>';
            refreshYoutubeSearch();
            return;
        }

        projects.forEach((project, index) => {
            const adminLabel = project.adminLabel || `Klip Çekimi ${index + 1}`;
            const artistName = project.artist || project.title || '';
            const card = document.createElement('div');
            card.className = 'admin-form-card media-admin-card';
            card.dataset.youtubeProject = String(project.id || Date.now() + index);
            card.innerHTML = `
                <div class="media-admin-card-header">
                    <input type="text" class="media-admin-title-input youtube-admin-label" value="${escapeHtml(adminLabel)}" placeholder="Klip Çekimi ${index + 1}" aria-label="Admin kart adı">
                    <span class="admin-order-actions"><label class="admin-order-picker">Sıra <select class="youtube-position">${orderSelectOptions(projects.length, index)}</select></label><button class="btn btn-danger btn-sm" type="button" data-delete-youtube aria-label="Klip çekimini sil"><i class="fas fa-trash-alt"></i></button></span>
                </div>
                <button class="media-admin-edit" type="button" data-open-admin-editor><i class="fas fa-pen" aria-hidden="true"></i><span>Düzenle</span><i class="fas fa-expand-alt" aria-hidden="true"></i></button>
                <div class="modal admin-item-editor-modal" aria-hidden="true">
                    <div class="modal-content admin-item-editor-content" role="dialog" aria-modal="true">
                        <div class="modal-header admin-item-editor-header"><h2 class="admin-item-editor-title">${escapeHtml(adminLabel)} Düzenle</h2><button class="modal-close" type="button" data-close-admin-editor aria-label="Düzenleme penceresini kapat">&times;</button></div>
                        <div class="form-grid">
                    <label class="admin-toggle form-full"><input type="checkbox" class="youtube-enabled" ${project.enabled !== false ? 'checked' : ''}><span><strong>Yayında</strong><small>Kapatılırsa bu kart klip çekimleri sayfasında görünmez.</small></span></label>
                    <div class="form-group"><label>Sanatçı Adı</label><input type="text" class="form-control youtube-artist" value="${escapeHtml(artistName)}" placeholder="Kubilay Karça">${textStyleControls(`youtube.${project.id}.artist`)}</div>
                    <div class="form-group"><label>Şarkı Adı</label><input type="text" class="form-control youtube-song" value="${escapeHtml(project.song || '')}" placeholder="Şarkı adı">${textStyleControls(`youtube.${project.id}.song`)}</div>
                    <div class="form-group"><label>Yıl</label><input type="text" class="form-control youtube-year" value="${escapeHtml(project.year)}" placeholder="2026">${textStyleControls(`youtube.${project.id}.year`)}</div>
                    <div class="form-group"><label>Etiket (isteğe bağlı)</label><input type="text" class="form-control youtube-category" value="${escapeHtml(project.category ?? '')}" placeholder="Boş bırakırsanız sitede gösterilmez">${textStyleControls(`youtube.${project.id}.category`)}</div>
                    <div class="form-group"><label>Kapak Yerleşimi</label><select class="form-control youtube-fit"><option value="cover" ${project.thumbnailFit !== 'contain' ? 'selected' : ''}>Görseli kapla</option><option value="contain" ${project.thumbnailFit === 'contain' ? 'selected' : ''}>Logoyu sığdır</option></select></div>
                    <div class="form-group form-full"><label>Özel Kapak Görseli (isteğe bağlı)</label><input type="file" class="form-control youtube-thumbnail-file" accept="image/*"><input type="hidden" class="youtube-thumbnail" value="${escapeHtml(project.thumbnail)}"><button type="button" class="btn btn-danger btn-sm admin-media-remove" data-media-field=".youtube-thumbnail"><i class="fas fa-trash-alt"></i> Kapak Görselini Kaldır</button><p class="form-help">Yüklemezseniz YouTube kapağı otomatik alınır.</p></div>
                    <div class="form-group form-full"><label>YouTube Klip Bağlantısı</label><input type="url" class="form-control youtube-url" value="${escapeHtml(project.url)}" placeholder="https://www.youtube.com/watch?v=..."><p class="form-help">Klip sitedeki oynatıcıda YouTube üzerinden açılır. Özel kapak yüklemezseniz YouTube kapağı otomatik alınır.</p></div>
                        </div>
                        <div class="admin-item-editor-footer"><button class="btn btn-primary" type="button" data-close-admin-editor><i class="fas fa-check"></i> Düzenlemeyi Bitir</button></div>
                    </div>
                </div>`;
            youtubeProjectsAdmin.appendChild(card);
        });
        refreshYoutubeSearch();
    }

    function readYoutubeProjectsForm() {
        if (!youtubeProjectsAdmin) return;
        appData.youtubeProjects = [...youtubeProjectsAdmin.querySelectorAll('[data-youtube-project]')].map(card => ({
            id: Number(card.dataset.youtubeProject) || Date.now(),
            adminLabel: card.querySelector('.youtube-admin-label')?.value.trim() || '',
            artist: card.querySelector('.youtube-artist')?.value.trim() || '',
            song: card.querySelector('.youtube-song')?.value.trim() || '',
            title: card.querySelector('.youtube-artist')?.value.trim() || card.querySelector('.youtube-song')?.value.trim() || '',
            year: card.querySelector('.youtube-year')?.value.trim() || '',
            category: card.querySelector('.youtube-category')?.value.trim() || '',
            thumbnail: card.querySelector('.youtube-thumbnail')?.value.trim() || '',
            videoFile: '',
            thumbnailFit: card.querySelector('.youtube-fit')?.value || 'cover',
            url: card.querySelector('.youtube-url')?.value.trim() || '',
            enabled: card.querySelector('.youtube-enabled')?.checked !== false
        }));
    }

    document.getElementById('btnAddYoutubeProject')?.addEventListener('click', () => {
        readYoutubeProjectsForm();
        appData.youtubeProjects.unshift({ id: Date.now(), adminLabel: `Klip Çekimi ${(appData.youtubeProjects?.length || 0) + 1}`, title: '', artist: '', song: '', year: String(new Date().getFullYear()), category: '', thumbnail: '', thumbnailFit: 'cover', videoFile: '', url: '', enabled: true });
        renderYoutubeProjectsForm();
        revealNewestAdminCard(youtubeProjectsAdmin, 'clipsAdminSearch', '[data-youtube-project]');
    });

    youtubeProjectsAdmin?.addEventListener('click', event => {
        const button = event.target.closest('[data-delete-youtube]');
        if (!button) return;
        readYoutubeProjectsForm();
        const card = button.closest('[data-youtube-project]');
        const index = appData.youtubeProjects.findIndex(project => String(project.id) === card?.dataset.youtubeProject);
        if (!confirm('Bu klip çekimi silinsin mi?')) return;
        const removed = appData.youtubeProjects[index];
        if (window.SiteMediaStore?.isStored(removed?.thumbnail)) window.SiteMediaStore.remove(removed.thumbnail).catch(() => {});
        appData.youtubeProjects.splice(index, 1);
        saveData(false);
        renderYoutubeProjectsForm();
        showToast('Klip çekimi silindi.');
    });

    youtubeProjectsAdmin?.addEventListener('change', async event => {
        const position = event.target.closest('.youtube-position');
        if (position) {
            readYoutubeProjectsForm();
            const card = position.closest('[data-youtube-project]');
            const fromIndex = appData.youtubeProjects.findIndex(project => String(project.id) === card?.dataset.youtubeProject);
            moveArrayItem(appData.youtubeProjects, fromIndex, Number(position.value));
            await saveData(false); renderYoutubeProjectsForm(); showToast('Klip çekimi sırası güncellendi.');
            return;
        }
        const fileInput = event.target.closest('.youtube-thumbnail-file');
        if (!fileInput?.files?.[0]) return;
        const card = fileInput.closest('[data-youtube-project]');
        const target = card?.querySelector('.youtube-thumbnail');
        if (!target) return;
        try {
            const previous = target.value.trim();
            target.value = await window.SiteMediaStore.save(fileInput.files[0], 'clip-thumbnail');
            if (window.SiteMediaStore.isStored(previous)) await window.SiteMediaStore.remove(previous);
            showToast('Kapak görseli yüklendi. Kaydetmeyi unutmayın.');
        } catch (error) { console.error(error); showToast('Dosya yüklenemedi.', 'error'); }
    });
    youtubeProjectsAdmin?.addEventListener('input', event => {
        const labelInput = event.target.closest('.youtube-admin-label');
        if (!labelInput) return;
        const title = labelInput.closest('[data-youtube-project]')?.querySelector('.admin-item-editor-title');
        if (title) title.textContent = `${labelInput.value.trim() || 'Klip Çekimi'} Düzenle`;
    });

    function renderPartnersForm() {
        if (!partnersAdmin) return;
        partnersAdmin.innerHTML = '';
        const partners = appData.partners || [];
        const homePartners = partners.filter(item => item.homeFeatured === true).sort((a, b) => (Number(a.homeOrder) || 0) - (Number(b.homeOrder) || 0));
        if (!partners.length) {
            partnersAdmin.innerHTML = '<p class="admin-empty compact">Henüz kurum logosu eklenmedi.</p>';
            refreshReferencesSearch();
            return;
        }

        partners.forEach((partner, index) => {
            const adminLabel = partner.adminLabel || `Kurum Logosu ${index + 1}`;
            const card = document.createElement('div');
            card.className = 'admin-form-card media-admin-card';
            card.dataset.partner = String(partner.id || Date.now() + index);
            card.innerHTML = `
                <div class="media-admin-card-header">
                    <input type="text" class="media-admin-title-input partner-admin-label" value="${escapeHtml(adminLabel)}" placeholder="Kurum Logosu ${index + 1}" aria-label="Admin kart adı">
                    <span class="admin-order-actions"><label class="admin-order-picker">Sayfa <select class="partner-position">${orderSelectOptions(partners.length, index)}</select></label><button class="btn btn-danger btn-sm" type="button" data-delete-partner aria-label="Kurum logosunu sil"><i class="fas fa-trash-alt"></i></button></span>
                </div>
                <button class="media-admin-edit" type="button" data-open-admin-editor><i class="fas fa-pen" aria-hidden="true"></i><span>Düzenle</span><i class="fas fa-expand-alt" aria-hidden="true"></i></button>
                <div class="modal admin-item-editor-modal" aria-hidden="true">
                    <div class="modal-content admin-item-editor-content" role="dialog" aria-modal="true">
                        <div class="modal-header admin-item-editor-header"><h2 class="admin-item-editor-title">${escapeHtml(adminLabel)} Düzenle</h2><button class="modal-close" type="button" data-close-admin-editor aria-label="Düzenleme penceresini kapat">&times;</button></div>
                        <div class="form-grid">
                    <label class="admin-toggle"><input type="checkbox" class="partner-enabled" ${partner.enabled !== false ? 'checked' : ''}><span><strong>Referanslarda Yayında</strong><small>Kapatılırsa Referanslarımız sayfasında görünmez.</small></span></label>
                    <label class="admin-toggle"><input type="checkbox" class="partner-home-featured" ${partner.homeFeatured === true ? 'checked' : ''}><span><strong>Ana Sayfa Şeridinde Göster</strong><small>En fazla 8 farklı logo seçebilirsiniz.</small></span></label>
                    ${partner.homeFeatured === true ? `<div class="form-group"><label>Anasayfa Logo Sırası</label><select class="form-control partner-home-position">${orderSelectOptions(homePartners.length, homePartners.findIndex(item => String(item.id) === String(partner.id)))}</select></div>` : ''}
                    <div class="form-group"><label>Kurum Adı</label><input type="text" class="form-control partner-name" value="${escapeHtml(partner.name)}" placeholder="Afyonkarahisar Belediyesi">${textStyleControls(`partner.${partner.id}.name`)}</div>
                    <div class="form-group"><label>Kurum Web Sitesi</label><input type="url" class="form-control partner-url" value="${escapeHtml(partner.url)}" placeholder="https://..."></div>
                    <div class="form-group form-full">
                        <label>Logo Dosyası</label>
                        <input type="file" class="form-control partner-file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
                        <input type="hidden" class="partner-logo" value="${escapeHtml(partner.logo)}">
                        <button type="button" class="btn btn-danger btn-sm admin-media-remove" data-media-field=".partner-logo" data-media-preview=".partner-file-preview"><i class="fas fa-trash-alt"></i> Logoyu Kaldır</button>
                        <p class="form-help">PNG, JPG, WebP veya SVG dosyasını bilgisayarınızdan seçin.</p>
                        <div class="partner-file-preview"><img alt="${escapeHtml(partner.name || 'Kurum')} logo önizlemesi"></div>
                    </div>
                        </div>
                        <div class="admin-item-editor-footer"><button class="btn btn-primary" type="button" data-close-admin-editor><i class="fas fa-check"></i> Düzenlemeyi Bitir</button></div>
                    </div>
                </div>`;
            partnersAdmin.appendChild(card);
            const preview = card.querySelector('.partner-file-preview img');
            resolveAdminMedia(partner.logo).then(source => {
                if (source && preview) preview.src = source;
                card.querySelector('.partner-file-preview')?.classList.toggle('is-empty', !source);
            });
        });
        refreshReferencesSearch();
    }

    function readPartnersForm() {
        if (!partnersAdmin) return;
        appData.partners = [...partnersAdmin.querySelectorAll('[data-partner]')].map(card => ({
            id: Number(card.dataset.partner) || Date.now(),
            adminLabel: card.querySelector('.partner-admin-label')?.value.trim() || '',
            name: card.querySelector('.partner-name')?.value.trim() || '',
            logo: card.querySelector('.partner-logo')?.value.trim() || '',
            url: card.querySelector('.partner-url')?.value.trim() || '',
            enabled: card.querySelector('.partner-enabled')?.checked !== false,
            homeFeatured: card.querySelector('.partner-home-featured')?.checked === true,
            homeOrder: Number(card.querySelector('.partner-home-position')?.value ?? appData.partners?.find(item => String(item.id) === card.dataset.partner)?.homeOrder ?? 0)
        }));
    }

    document.getElementById('btnAddPartner')?.addEventListener('click', () => {
        readPartnersForm();
        appData.partners.unshift({ id: Date.now(), adminLabel: `Kurum Logosu ${(appData.partners?.length || 0) + 1}`, name: '', logo: '', url: '', enabled: true, homeFeatured: false, homeOrder: 0 });
        renderPartnersForm();
        revealNewestAdminCard(partnersAdmin, 'referencesAdminSearch', '[data-partner]');
    });

    partnersAdmin?.addEventListener('click', event => {
        const button = event.target.closest('[data-delete-partner]');
        if (!button || !confirm('Bu kurum logosu silinsin mi?')) return;
        const card = button.closest('[data-partner]');
        const storedLogo = card?.querySelector('.partner-logo')?.value.trim() || '';
        readPartnersForm();
        appData.partners = appData.partners.filter(partner => String(partner.id) !== card?.dataset.partner);
        if (window.SiteMediaStore?.isStored(storedLogo)) window.SiteMediaStore.remove(storedLogo).catch(() => {});
        saveData(false);
        renderPartnersForm();
        showToast('Kurum logosu silindi.');
    });

    partnersAdmin?.addEventListener('change', async event => {
        const pagePosition = event.target.closest('.partner-position');
        if (pagePosition) {
            readPartnersForm();
            const card = pagePosition.closest('[data-partner]');
            const fromIndex = appData.partners.findIndex(item => String(item.id) === card?.dataset.partner);
            moveArrayItem(appData.partners, fromIndex, Number(pagePosition.value));
            await saveData(false); renderPartnersForm(); showToast('Referans sayfası sırası güncellendi.');
            return;
        }
        const homePosition = event.target.closest('.partner-home-position');
        if (homePosition) {
            readPartnersForm();
            const card = homePosition.closest('[data-partner]');
            const ordered = appData.partners.filter(item => item.homeFeatured === true).sort((a, b) => (Number(a.homeOrder) || 0) - (Number(b.homeOrder) || 0));
            const fromIndex = ordered.findIndex(item => String(item.id) === card?.dataset.partner);
            moveArrayItem(ordered, fromIndex, Number(homePosition.value));
            ordered.forEach((item, index) => { item.homeOrder = index; });
            await saveData(false); renderPartnersForm(); showToast('Anasayfa logo sırası güncellendi.');
            return;
        }
        const homeToggle = event.target.closest('.partner-home-featured');
        if (homeToggle) {
            const selectedCount = partnersAdmin.querySelectorAll('.partner-home-featured:checked').length;
            if (selectedCount > 8) {
                homeToggle.checked = false;
                showToast('Ana sayfa şeridi için en fazla 8 logo seçebilirsiniz.', 'error');
            }
            readPartnersForm();
            const enabledHome = appData.partners.filter(item => item.homeFeatured === true);
            enabledHome.forEach((item, index) => { item.homeOrder = index; });
            await saveData(false); renderPartnersForm();
            return;
        }
        const input = event.target.closest('.partner-file');
        if (!input) return;
        const file = input.files?.[0];
        const card = input.closest('[data-partner]');
        if (!file || !card) return;
        if (!file.type.startsWith('image/')) {
            showToast('Lütfen bir görsel dosyası seçin.', 'error');
            input.value = '';
            return;
        }
        try {
            const logoInput = card.querySelector('.partner-logo');
            const previousReference = logoInput.value.trim();
            logoInput.value = await window.SiteMediaStore.save(file, 'reference-logo');
            if (window.SiteMediaStore.isStored(previousReference)) await window.SiteMediaStore.remove(previousReference);
            const preview = card.querySelector('.partner-file-preview img');
            if (preview) preview.src = await resolveAdminMedia(logoInput.value);
            card.querySelector('.partner-file-preview')?.classList.remove('is-empty');
            showToast('Logo dosyası yüklendi. Kaydetmeyi unutmayın.');
        } catch (error) {
            console.error('Logo yükleme hatası:', error);
            showUploadError(error, 'Logo');
        }
    });
    partnersAdmin?.addEventListener('input', event => {
        const labelInput = event.target.closest('.partner-admin-label');
        if (!labelInput) return;
        const title = labelInput.closest('[data-partner]')?.querySelector('.admin-item-editor-title');
        if (title) title.textContent = `${labelInput.value.trim() || 'Kurum Logosu'} Düzenle`;
    });

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
    const aboutVision = document.getElementById('aboutVision'); const aboutMission = document.getElementById('aboutMission');
    const aboutLead = document.getElementById('aboutLead'); const aboutP1 = document.getElementById('aboutP1'); const aboutP2 = document.getElementById('aboutP2');
    document.getElementById('aboutImageFile')?.addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const previous = aboutImage.value.trim();
            aboutImage.value = await window.SiteMediaStore.save(file, 'about-image');
            if (window.SiteMediaStore.isStored(previous)) await window.SiteMediaStore.remove(previous);
            showToast('Hakkımızda görseli yüklendi. Kaydetmeyi unutmayın.');
        } catch (error) { console.error(error); showUploadError(error, 'Görsel'); }
    });
    function populateAboutForm() { if (!appData.about) return; aboutName.value = appData.about.name || ''; aboutImage.value = appData.about.image || ''; aboutLead.value = appData.about.lead || ''; aboutP1.value = appData.about.p1 || ''; aboutP2.value = appData.about.p2 || ''; aboutVision.value = appData.about.vision || ''; aboutMission.value = appData.about.mission || ''; }
    function readAboutForm() { appData.about = { ...appData.about, name: aboutName.value.trim(), image: aboutImage.value.trim(), owner: '', lead: aboutLead.value.trim(), p1: aboutP1.value.trim(), p2: aboutP2.value.trim(), vision: aboutVision.value.trim(), mission: aboutMission.value.trim() }; }

    const testimonialsContainer = document.getElementById('testimonialsContainer');
    function renderTestimonialsForm() {
        testimonialsContainer.innerHTML = '';
        appData.testimonials = [...(appData.testimonials || [])].sort((a, b) => (Number(a.pageOrder) || 0) - (Number(b.pageOrder) || 0));
        const homeTestimonials = [...appData.testimonials].sort((a, b) => (Number(a.homeOrder) || 0) - (Number(b.homeOrder) || 0));
        appData.testimonials.forEach((item, index) => {
            const homeIndex = homeTestimonials.findIndex(entry => String(entry.id) === String(item.id));
            const displayName = item.name || `Yorum ${index + 1}`;
            const card = document.createElement('div'); card.className = 'admin-form-card media-admin-card'; card.dataset.testimonial = String(item.id || Date.now() + index);
            card.innerHTML = `
                <div class="media-admin-card-header"><strong>${escapeHtml(displayName)}</strong><span class="admin-order-actions"><label class="admin-order-picker">Yorum Sayfası <select class="testimonial-page-position">${orderSelectOptions(appData.testimonials.length, index)}</select></label><label class="admin-order-picker">Anasayfa <select class="testimonial-home-position">${orderSelectOptions(homeTestimonials.length, homeIndex)}</select></label><button class="btn btn-danger btn-sm" type="button" data-delete-testimonial aria-label="Yorumu sil"><i class="fas fa-trash-alt"></i></button></span></div>
                <button class="media-admin-edit" type="button" data-open-admin-editor><i class="fas fa-pen" aria-hidden="true"></i><span>Düzenle</span><i class="fas fa-expand-alt" aria-hidden="true"></i></button>
                <div class="modal admin-item-editor-modal" aria-hidden="true">
                    <div class="modal-content admin-item-editor-content" role="dialog" aria-modal="true">
                        <div class="modal-header admin-item-editor-header"><h2 class="admin-item-editor-title">${escapeHtml(displayName)} Düzenle</h2><button class="modal-close" type="button" data-close-admin-editor aria-label="Düzenleme penceresini kapat">&times;</button></div>
                        <div class="form-grid"><label class="admin-toggle"><input type="checkbox" class="test-enabled" ${item.enabled !== false ? 'checked' : ''}><span><strong>Yorumu Göster</strong><small>Kapatılırsa yorum hiçbir sayfada görünmez.</small></span></label><label class="admin-toggle"><input type="checkbox" class="test-mobile-featured" ${item.mobileFeatured === true ? 'checked' : ''}><span><strong>Mobilde Öne Çıkar</strong><small>Anasayfada mobil görünüm için en fazla 4 yorum seçin.</small></span></label><div class="form-group"><label>Sanatçı / Müşteri Adı</label><input type="text" class="form-control test-name" value="${escapeHtml(item.name)}">${textStyleControls(`testimonial.${item.id}.name`)}</div><div class="form-group"><label>Ünvan</label><input type="text" class="form-control test-title" value="${escapeHtml(item.title)}">${textStyleControls(`testimonial.${item.id}.title`)}</div><div class="form-group form-full"><label>Yorum Metni</label><textarea class="form-control test-text" rows="2">${escapeHtml(item.text)}</textarea>${textStyleControls(`testimonial.${item.id}.text`)}</div></div>
                        <div class="admin-item-editor-footer"><button class="btn btn-primary" type="button" data-close-admin-editor><i class="fas fa-check"></i> Düzenlemeyi Bitir</button></div>
                    </div>
                </div>`;
            testimonialsContainer.appendChild(card);
        });
    }
    function readTestimonialsForm() { appData.testimonials = [...testimonialsContainer.querySelectorAll('[data-testimonial]')].map((card, index) => ({ id: Number(card.dataset.testimonial) || Date.now(), name: card.querySelector('.test-name')?.value.trim() || '', title: card.querySelector('.test-title')?.value.trim() || '', text: card.querySelector('.test-text')?.value.trim() || '', enabled: card.querySelector('.test-enabled')?.checked !== false, mobileFeatured: card.querySelector('.test-mobile-featured')?.checked === true, pageOrder: index, homeOrder: Number(card.querySelector('.testimonial-home-position')?.value ?? index) })); }
    document.getElementById('btnAddTestimonial')?.addEventListener('click', () => {
        readTestimonialsForm();
        if (appData.testimonials.length >= 8) return showToast('En fazla 8 yorum ekleyebilirsiniz.', 'error');
        appData.testimonials.forEach(item => { item.pageOrder = (Number(item.pageOrder) || 0) + 1; item.homeOrder = (Number(item.homeOrder) || 0) + 1; });
        appData.testimonials.unshift({ id: Date.now(), name: '', title: '', text: '', enabled: true, mobileFeatured: false, pageOrder: 0, homeOrder: 0 });
        renderTestimonialsForm();
    });
    testimonialsContainer?.addEventListener('click', event => {
        const button = event.target.closest('[data-delete-testimonial]');
        if (!button) return;
        readTestimonialsForm();
        const card = button.closest('[data-testimonial]');
        const index = appData.testimonials.findIndex(item => String(item.id) === card?.dataset.testimonial);
        if (!confirm('Bu yorum silinsin mi?')) return;
        appData.testimonials.splice(index, 1);
        saveData(false); renderTestimonialsForm(); showToast('Yorum silindi.');
    });
    testimonialsContainer?.addEventListener('change', async event => {
        const pagePosition = event.target.closest('.testimonial-page-position');
        if (pagePosition) {
            readTestimonialsForm();
            const card = pagePosition.closest('[data-testimonial]');
            const fromIndex = appData.testimonials.findIndex(item => String(item.id) === card?.dataset.testimonial);
            moveArrayItem(appData.testimonials, fromIndex, Number(pagePosition.value));
            appData.testimonials.forEach((item, index) => { item.pageOrder = index; });
            await saveData(false); renderTestimonialsForm(); showToast('Yorum sayfası sırası güncellendi.');
            return;
        }
        const homePosition = event.target.closest('.testimonial-home-position');
        if (homePosition) {
            readTestimonialsForm();
            const card = homePosition.closest('[data-testimonial]');
            const ordered = [...appData.testimonials].sort((a, b) => (Number(a.homeOrder) || 0) - (Number(b.homeOrder) || 0));
            const fromIndex = ordered.findIndex(item => String(item.id) === card?.dataset.testimonial);
            moveArrayItem(ordered, fromIndex, Number(homePosition.value));
            ordered.forEach((item, index) => { item.homeOrder = index; });
            await saveData(false); renderTestimonialsForm(); showToast('Anasayfa yorum sırası güncellendi.');
            return;
        }
        const mobileToggle = event.target.closest('.test-mobile-featured');
        if (mobileToggle && testimonialsContainer.querySelectorAll('.test-mobile-featured:checked').length > 4) {
            mobileToggle.checked = false;
            showToast('Mobil anasayfa için en fazla 4 yorum seçebilirsiniz.', 'error');
        }
    });

    const textFieldLabels = {
        navHome: 'Menü: Ana Sayfa', navWorks: 'Menü: Çalışmalarım', navClip: 'Menü: Klip Çekimleri', navVideo: 'Menü: Video Klipleri', navGraphic: 'Menü: Grafik Tasarım', navCorporate: 'Menü: Kurumsal', navReferences: 'Menü: Referanslarımız', navAbout: 'Menü: Hakkımızda', navTestimonials: 'Menü: Ne Diyorlar', navContact: 'Menü: İletişim', featuredTag: 'Öne Çıkanlar Üst Etiketi', featuredTitle: 'Öne Çıkanlar Başlığı', featuredMore: 'Tüm Çalışmalarımı Gör Butonu', servicesTag: 'Çekim Stili Üst Etiketi', servicesTitle: 'Çekim Stili Başlığı', service1Kicker: 'Çekim Stili 1 Kısa Başlık', service1Title: 'Çekim Stili 1 Başlık', service1Description: 'Çekim Stili 1 Açıklama', service2Kicker: 'Çekim Stili 2 Kısa Başlık', service2Title: 'Çekim Stili 2 Başlık', service2Description: 'Çekim Stili 2 Açıklama', service3Kicker: 'Çekim Stili 3 Kısa Başlık', service3Title: 'Çekim Stili 3 Başlık', service3Description: 'Çekim Stili 3 Açıklama', testimonialsTag: 'Yorumlar Üst Etiketi', testimonialsTitle: 'Yorumlar Başlığı', graphicTag: 'Grafik Tasarım Üst Etiketi', graphicTitle: 'Grafik Tasarım Başlığı', clipTag: 'Klip Çekimleri Üst Etiketi', clipTitle: 'Klip Çekimleri Başlığı', videoTag: 'Video Klipleri Üst Etiketi', videoTitle: 'Video Klipleri Başlığı', referencesTag: 'Referanslar Üst Etiketi', referencesTitle: 'Referanslar Başlığı', aboutTag: 'Hakkımızda Üst Etiketi', contactTag: 'İletişim Üst Etiketi', contactTitle: 'İletişim Başlığı', footerCopyright: 'Footer Yasal Metin 1', footerLegal: 'Footer Yasal Metin 2'
    };
    const siteTextAdmin = document.getElementById('siteTextAdmin');
    const typographyAdmin = document.getElementById('typographyAdmin');
    function textStyleControls(key) {
        const style = appData.textStyles?.[key] || {};
        return `<div class="inline-text-style" data-text-style-key="${escapeHtml(key)}"><strong>Yazı görünümü</strong><label class="style-color-toggle"><input type="checkbox" class="text-style-use-color" ${style.color ? 'checked' : ''}> Özel renk</label><input type="color" class="text-style-color" value="${escapeHtml(style.color || '#ffffff')}" aria-label="Yazı rengi"><label>Boyut <input type="number" class="text-style-size" min="8" max="160" step="1" value="${escapeHtml(style.size || '')}" placeholder="Otomatik"> px</label><label>Kalınlık <select class="text-style-weight"><option value="">Otomatik</option>${['300','400','500','600','700','800'].map(weight => `<option value="${weight}" ${String(style.weight || '') === weight ? 'selected' : ''}>${weight}</option>`).join('')}</select></label></div>`;
    }

    function attachStaticTextStyleControls() {
        const mappings = {
            heroTag: 'hero.tag', heroSubtitle: 'hero.subtitle', heroTitleLine1: 'hero.titleLine1', heroTitleLine2: 'hero.titleLine2',
            aboutName: 'about.name', aboutLead: 'about.lead', aboutP1: 'about.p1', aboutP2: 'about.p2', aboutVision: 'about.vision', aboutMission: 'about.mission',
            contactEmail: 'contact.email', contactPhone: 'contact.phone', contactLocation: 'contact.location'
        };
        Object.entries(mappings).forEach(([id, key]) => {
            const input = document.getElementById(id);
            const group = input?.closest('.form-group');
            if (!group || group.querySelector(`[data-text-style-key="${key}"]`)) return;
            group.insertAdjacentHTML('beforeend', textStyleControls(key));
        });
    }
    function renderTextAndTypographyForms() {
        document.querySelectorAll('[data-site-text-fields]').forEach(container => {
            const keys = String(container.dataset.siteTextFields || '').split(',').filter(Boolean);
            container.innerHTML = keys.map(key => `<div class="form-group"><label>${escapeHtml(textFieldLabels[key] || key)}</label><input class="form-control site-text-input" data-text-key="${key}" value="${escapeHtml(appData.siteText?.[key] || '')}">${textStyleControls(`siteText.${key}`)}</div>`).join('');
        });
        const weights = [['bodyWeight', 'Gövde Yazıları'], ['headingWeight', 'Başlıklar'], ['navWeight', 'Menü Yazıları'], ['buttonWeight', 'Buton Yazıları']];
        if (typographyAdmin) typographyAdmin.innerHTML = weights.map(([key, label]) => `<div class="form-group"><label>${label}</label><select class="form-control typography-input" data-typography-key="${key}">${['300','400','500','600','700','800'].map(weight => `<option value="${weight}" ${String(appData.typography?.[key] || '') === weight ? 'selected' : ''}>${weight}</option>`).join('')}</select></div>`).join('');
        attachStaticTextStyleControls();
    }
    function readTextAndTypographyForms() {
        appData.siteText = { ...(appData.siteText || {}) };
        document.querySelectorAll('.site-text-input[data-text-key]').forEach(input => { appData.siteText[input.dataset.textKey] = input.value.trim(); });
        appData.typography = { ...(appData.typography || {}) };
        typographyAdmin?.querySelectorAll('[data-typography-key]').forEach(input => { appData.typography[input.dataset.typographyKey] = input.value; });
        appData.textStyles = { ...(appData.textStyles || {}) };
        document.querySelectorAll('[data-text-style-key]').forEach(control => {
            const key = control.dataset.textStyleKey;
            const color = control.querySelector('.text-style-use-color')?.checked ? control.querySelector('.text-style-color')?.value : '';
            const size = control.querySelector('.text-style-size')?.value.trim() || '';
            const weight = control.querySelector('.text-style-weight')?.value || '';
            if (color || size || weight) appData.textStyles[key] = { color, size, weight };
            else delete appData.textStyles[key];
        });
    }
    document.addEventListener('input', event => {
        if (!event.target.matches('.text-style-color')) return;
        const toggle = event.target.closest('[data-text-style-key]')?.querySelector('.text-style-use-color');
        if (toggle) toggle.checked = true;
    });

    const siteMediaAdmin = document.getElementById('siteMediaAdmin');
    async function updateSiteMediaPreview(key) {
        const reference = siteMediaAdmin?.querySelector(`.site-media-reference[data-media-key="${key}"]`)?.value.trim() || '';
        const preview = siteMediaAdmin?.querySelector(`[data-media-preview="${key}"]`);
        if (!preview) return;
        const source = await resolveAdminMedia(reference);
        preview.src = source || '';
        preview.style.display = source ? 'block' : 'none';
    }
    function populateSiteMediaForm() {
        siteMediaAdmin?.querySelectorAll('.site-media-reference').forEach(input => {
            const key = input.dataset.mediaKey;
            input.value = appData.siteMedia?.[key] || '';
            input.setAttribute('value', input.value);
            updateSiteMediaPreview(key);
        });
    }
    function readSiteMediaForm() {
        appData.siteMedia = { ...(appData.siteMedia || {}) };
        siteMediaAdmin?.querySelectorAll('.site-media-reference').forEach(input => {
            appData.siteMedia[input.dataset.mediaKey] = input.value.trim();
        });
    }
    siteMediaAdmin?.addEventListener('change', async event => {
        const input = event.target.closest('.site-media-file');
        if (!input) return;
        const file = input.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Lütfen bir görsel dosyası seçin.', 'error');
            input.value = '';
            return;
        }
        const key = input.dataset.mediaKey;
        const referenceInput = siteMediaAdmin.querySelector(`.site-media-reference[data-media-key="${key}"]`);
        if (!referenceInput) return;
        try {
            const previousReference = referenceInput.value.trim();
            referenceInput.value = await window.SiteMediaStore.save(file, `site-${key}`);
            referenceInput.setAttribute('value', referenceInput.value);
            if (window.SiteMediaStore.isStored(previousReference)) await window.SiteMediaStore.remove(previousReference);
            await updateSiteMediaPreview(key);
            showToast('Arka plan görseli yüklendi. Tümünü Kaydet düğmesine basın.');
        } catch (error) {
            console.error('Arka plan görseli yükleme hatası:', error);
            showUploadError(error, 'Görsel');
        }
    });

    document.addEventListener('click', async event => {
        const button = event.target.closest('.admin-media-remove');
        if (!button) return;
        let input = null;
        if (button.dataset.mediaKey) input = siteMediaAdmin?.querySelector(`.site-media-reference[data-media-key="${button.dataset.mediaKey}"]`);
        if (!input && button.dataset.mediaInput) input = document.querySelector(button.dataset.mediaInput);
        if (!input && button.dataset.mediaField) input = button.closest('.admin-item-editor-modal, .form-group, .modal-content')?.querySelector(button.dataset.mediaField);
        if (!input) return;
        const reference = input.value.trim();
        if (!reference) return showToast('Kaldırılacak dosya bulunamadı.', 'error');
        if (!confirm('Bu dosya bu alandan kaldırılsın mı?')) return;
        try {
            if (window.SiteMediaStore?.isStored(reference)) await window.SiteMediaStore.remove(reference);
            input.value = '';
            input.setAttribute('value', '');
            const scope = button.closest('.admin-item-editor-modal, .form-group, .modal-content') || document;
            const preview = button.dataset.mediaPreview ? scope.querySelector(button.dataset.mediaPreview) || document.querySelector(button.dataset.mediaPreview) : scope.querySelector('img, video, .partner-file-preview');
            if (preview?.tagName === 'IMG') { preview.removeAttribute('src'); preview.style.display = 'none'; }
            if (preview?.tagName === 'VIDEO') { preview.removeAttribute('src'); preview.style.display = 'none'; preview.load?.(); }
            if (preview?.classList?.contains('partner-file-preview')) preview.classList.add('is-empty');
            if (input === artistCover) {
                const artist = findById(appData.artists, editArtistId.value);
                if (artist) artist.cover = '';
            }
            readAllForms();
            await saveData(false);
            showToast('Dosya kaldırıldı.');
        } catch (error) {
            console.error(error); showToast('Dosya kaldırılamadı.', 'error');
        }
    });

    const contactFields = { email: document.getElementById('contactEmail'), phone: document.getElementById('contactPhone'), whatsapp: document.getElementById('contactWhatsapp'), location: document.getElementById('contactLocation'), instagram: document.getElementById('contactInstagram'), youtube: document.getElementById('contactYoutube'), twitter: document.getElementById('contactTwitter'), linkedin: document.getElementById('contactLinkedin') };
    const socialVisibilityFields = { instagram: document.getElementById('contactInstagramVisible'), youtube: document.getElementById('contactYoutubeVisible'), twitter: document.getElementById('contactTwitterVisible'), linkedin: document.getElementById('contactLinkedinVisible') };
    const contactOrderFields = { email: document.getElementById('contactEmailOrder'), phone: document.getElementById('contactPhoneOrder'), location: document.getElementById('contactLocationOrder') };
    const contactProjectTypes = document.getElementById('contactProjectTypes');
    function populateContactForm() {
        Object.entries(contactFields).forEach(([key, input]) => { input.value = appData.contact?.[key] || ''; });
        Object.entries(socialVisibilityFields).forEach(([key, input]) => { if (input) input.checked = appData.contact?.socialVisibility?.[key] !== false; });
        const infoOrder = Array.isArray(appData.contact?.infoOrder) ? appData.contact.infoOrder : ['phone', 'email', 'location'];
        Object.entries(contactOrderFields).forEach(([key, input]) => { if (input) input.value = String(Math.max(0, infoOrder.indexOf(key))); });
        if (contactProjectTypes) contactProjectTypes.value = (appData.contact?.projectTypes || ['Konser Çekimi', 'Müzik Klibi', 'Etkinlik Çekimi', 'Diğer']).join('\n');
    }
    function readContactForm() {
        const projectTypes = String(contactProjectTypes?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
        appData.contact = {
            ...(appData.contact || {}),
            ...Object.fromEntries(Object.entries(contactFields).map(([key, input]) => [key, input.value.trim()])),
            socialVisibility: Object.fromEntries(Object.entries(socialVisibilityFields).map(([key, input]) => [key, input?.checked === true])),
            infoOrder: Object.entries(contactOrderFields).sort((a, b) => Number(a[1]?.value || 0) - Number(b[1]?.value || 0)).map(([key]) => key),
            projectTypes
        };
    }
    Object.entries(contactOrderFields).forEach(([key, select]) => select?.addEventListener('change', () => {
        const current = Object.entries(contactOrderFields).sort((a, b) => Number(a[1]?.value || 0) - Number(b[1]?.value || 0)).map(([itemKey]) => itemKey).filter(itemKey => itemKey !== key);
        current.splice(Number(select.value), 0, key);
        current.forEach((itemKey, index) => { if (contactOrderFields[itemKey]) contactOrderFields[itemKey].value = String(index); });
    }));

    document.getElementById('changePasswordForm')?.addEventListener('submit', async event => {
        event.preventDefault();
        const currentPassword = document.getElementById('currentAdminPassword')?.value || '';
        const newPassword = document.getElementById('newAdminPassword')?.value || '';
        const confirmation = document.getElementById('confirmAdminPassword')?.value || '';
        if (newPassword !== confirmation) return showToast('Yeni şifreler eşleşmiyor.', 'error');
        try {
            await window.SiteServer?.changePassword?.(currentPassword, newPassword);
            event.currentTarget.reset();
            showToast('Admin şifresi değiştirildi.');
        } catch (error) {
            showToast(error.message || 'Şifre değiştirilemedi.', 'error');
        }
    });

    function readAllForms() {
        readHeroForm();
        readSectionVisibilityForm();
        readYoutubeProjectsForm();
        appData.videoClips = readCreativeProjectsForm(videoClipsAdmin, '');
        appData.graphicProjects = readCreativeProjectsForm(graphicProjectsAdmin, '');
        readPartnersForm();
        readStatsForm();
        readAboutForm();
        readTestimonialsForm();
        readContactForm();
        readTextAndTypographyForms();
        readSiteMediaForm();
    }
    document.getElementById('btnSaveAll')?.addEventListener('click', async () => { readAllForms(); await saveData(true); });
    document.getElementById('btnResetData')?.addEventListener('click', () => { if (!confirm('Tüm veriler varsayılana sıfırlansın mı?')) return; localStorage.removeItem(STORAGE_KEY); appData = loadData(); initAll(); showToast('Varsayılan veriler geri yüklendi.'); });
    document.getElementById('btnDownloadDataJs')?.addEventListener('click', () => {
        readAllForms(); const blob = new Blob([`const siteData = ${JSON.stringify(appData, null, 2)};\n`], { type: 'application/javascript;charset=utf-8' });
        const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.download = 'data.js'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); showToast('data.js dosyası indirildi.');
    });
    document.getElementById('btnCopyJson')?.addEventListener('click', () => { readAllForms(); navigator.clipboard.writeText(JSON.stringify(appData, null, 2)).then(() => showToast('JSON panoya kopyalandı.')).catch(() => showToast('Kopyalama başarısız.', 'error')); });

    const adminScrollToTop = document.getElementById('adminScrollToTop');
    const updateAdminScrollButton = () => adminScrollToTop?.classList.toggle('is-visible', window.scrollY > 420);
    window.addEventListener('scroll', updateAdminScrollButton, { passive: true });
    adminScrollToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    updateAdminScrollButton();

    function initAll() {
        renderArtistsList();
        populateHeroForm();
        populateSectionVisibilityForm();
        renderYoutubeProjectsForm();
        renderVideoClipsForm();
        renderGraphicProjectsForm();
        renderPartnersForm();
        renderStatsForm();
        populateAboutForm();
        renderTestimonialsForm();
        populateContactForm();
        renderTextAndTypographyForms();
        populateSiteMediaForm();
    }
    initAll();
});
