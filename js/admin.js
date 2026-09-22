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
                localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
                appData = loadData();
            }
        } catch (error) {
            console.error('Sunucu verisi yüklenemedi:', error);
            showToast('Sunucu verisi yüklenemedi. Lütfen sayfayı yenileyin.', 'error');
        }
    }

    function loadData() {
        const defaults = typeof siteData !== 'undefined' ? clone(siteData) : {
            hero: {}, stats: [], artists: [], homeGallery: [], youtubeProjects: [], graphicProjects: [], videoClips: [], partners: [], sectionVisibility: {}, siteMedia: {}, about: {}, testimonials: [], contact: {}
        };
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            const merged = { ...defaults, ...parsed };
            merged.hero = { ...(defaults.hero || {}), ...(parsed.hero || {}) };
            merged.contact = { ...(defaults.contact || {}), ...(parsed.contact || {}) };
            merged.sectionVisibility = { ...(defaults.sectionVisibility || {}), ...(parsed.sectionVisibility || {}) };
            merged.siteMedia = { ...(defaults.siteMedia || {}), ...(parsed.siteMedia || {}) };
            merged.siteText = { ...(defaults.siteText || {}), ...(parsed.siteText || {}) };
            merged.typography = { ...(defaults.typography || {}), ...(parsed.typography || {}) };
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            defaults.artists = utils ? utils.normalizeArtists(defaults.artists) : defaults.artists;
            return defaults;
        }
    }

    async function saveData(notify = true) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
            if (serverEnabled) await window.SiteServer.saveData(appData);
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
            if (typographyCard) homePanel.appendChild(typographyCard);
        }
        Object.entries(pageAdminConfig).forEach(([pageKey, config]) => makePageSettingsCards(pageKey, config));
        document.getElementById('tab-visibility')?.remove();
        document.getElementById('tab-stats')?.remove();
        document.getElementById('tab-texts')?.remove();
    }
    organizeAdminPanels();

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

    const artistsListEl = document.getElementById('artistsList');
    const artistsCount = document.getElementById('artistsCount');
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
    const photoSrc = document.getElementById('photoSrc');
    const photoTitle = document.getElementById('photoTitle');
    const photoDesc = document.getElementById('photoDesc');
    const photoPreview = document.getElementById('photoPreview');

    function renderArtistsList() {
        if (!artistsListEl) return;
        artistsListEl.innerHTML = '';
        appData.artists = utils ? utils.normalizeArtists(appData.artists) : (appData.artists || []);
        const artists = utils ? utils.sortArtists(appData.artists) : [...appData.artists];
        const featuredArtists = [...appData.artists].filter(item => item.featured !== false).sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0));
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
                        <div class="admin-state-row"><span class="admin-state ${artist.visible !== false ? 'is-on' : 'is-off'}">${artist.visible !== false ? 'Sitede açık' : 'Sitede kapalı'}</span><span class="admin-state ${artist.featured !== false ? 'is-on' : 'is-off'}">${artist.featured !== false ? `Öne çıkan sıra: ${featuredArtists.findIndex(item => String(item.id) === String(artist.id)) + 1}` : 'Öne çıkarılmıyor'}</span></div>
                        ${artist.bio ? `<p class="artist-bio-preview">${escapeHtml(artist.bio)}</p>` : ''}
                    </div>
                    <div class="artist-actions-wrap">
                        ${artist.featured !== false ? `<button class="btn btn-secondary btn-sm" data-action="featured-up" data-artist-id="${artist.id}" title="Öne çıkanlarda yukarı taşı"><i class="fas fa-arrow-up"></i></button><button class="btn btn-secondary btn-sm" data-action="featured-down" data-artist-id="${artist.id}" title="Öne çıkanlarda aşağı taşı"><i class="fas fa-arrow-down"></i></button>` : ''}
                        <button class="btn btn-primary btn-sm" data-action="add-concert" data-artist-id="${artist.id}"><i class="fas fa-plus"></i> Yeni Konser</button>
                        <button class="btn btn-secondary btn-sm" data-action="edit-artist" data-artist-id="${artist.id}"><i class="fas fa-edit"></i> Sanatçı</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-artist" data-artist-id="${artist.id}" aria-label="Sanatçıyı sil"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="artist-concerts-admin-list">${concertsHtml}</div>`;
            artistsListEl.appendChild(card);
            const coverImage = card.querySelector('.artist-cover-thumb');
            if (coverImage && window.SiteMediaStore?.isStored(artist.cover)) resolveAdminMedia(artist.cover).then(source => { if (source) coverImage.src = source; });
            card.querySelectorAll('[data-media-reference]').forEach(image => {
                const reference = image.dataset.mediaReference;
                if (window.SiteMediaStore?.isStored(reference)) resolveAdminMedia(reference).then(source => { if (source) image.src = source; });
            });
        });
    }

    function renderConcertAdminCard(artist, concert) {
        const photos = (concert.images || []).map(image => `
            <div class="artist-subphoto-item">
                <img src="${escapeHtml(image.src)}" data-media-reference="${escapeHtml(image.src)}" alt="${escapeHtml(image.title || artist.name)}">
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
        if (action === 'featured-up' || action === 'featured-down') {
            const ordered = [...appData.artists].filter(item => item.featured !== false).sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0));
            const currentIndex = ordered.findIndex(item => String(item.id) === String(artist.id));
            const nextIndex = action === 'featured-up' ? currentIndex - 1 : currentIndex + 1;
            if (nextIndex >= 0 && nextIndex < ordered.length) {
                [ordered[currentIndex], ordered[nextIndex]] = [ordered[nextIndex], ordered[currentIndex]];
                ordered.forEach((item, index) => { item.featuredOrder = index; });
                saveData(false); renderArtistsList(); showToast('Öne çıkan sanatçı sırası güncellendi.');
            }
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
        artistVisible.checked = artist?.visible !== false;
        artistFeatured.checked = artist?.featured !== false;
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
        const visible = artistVisible.checked;
        const featured = artistFeatured.checked;
        if (existing) {
            existing.name = name; existing.bio = bio; existing.cover = cover; existing.visible = visible; existing.featured = featured; showToast('Sanatçı güncellendi.');
        } else {
            const id = Date.now();
            const featuredOrder = Math.max(-1, ...appData.artists.map(item => Number(item.featuredOrder) || 0)) + 1;
            appData.artists.push({ id, slug: utils ? utils.slugify(name) : String(id), name, bio, cover, visible, featured, featuredOrder, concerts: [] });
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
                showToast('Görsel yüklenemedi. Tarayıcı depolama alanını kontrol edin.', 'error');
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
    setupDropzone('photoDropZone', 'photoFileInput', 'photoPreview', 'photoSrc');

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
            showToast('Video yüklenemedi. Tarayıcı depolama alanını kontrol edin.', 'error');
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

    function renderCreativeProjectsForm(container, items, options) {
        if (!container) return;
        container.innerHTML = '';
        if (!items.length) {
            container.innerHTML = `<p class="admin-empty compact">Henüz ${escapeHtml(options.emptyLabel)} eklenmedi.</p>`;
            return;
        }

        items.forEach((project, index) => {
            const card = document.createElement('div');
            card.className = 'admin-form-card media-admin-card';
            card.dataset.creativeProject = String(project.id || Date.now() + index);
            card.innerHTML = `
                <div class="media-admin-card-header">
                    <strong>${escapeHtml(options.itemLabel)} ${index + 1}</strong>
                    <span class="admin-order-actions"><button class="btn btn-secondary btn-sm" type="button" data-move-creative="up" aria-label="Yukarı taşı"><i class="fas fa-arrow-up"></i></button><button class="btn btn-secondary btn-sm" type="button" data-move-creative="down" aria-label="Aşağı taşı"><i class="fas fa-arrow-down"></i></button><button class="btn btn-danger btn-sm" type="button" data-delete-creative aria-label="${escapeHtml(options.itemLabel)} projesini sil"><i class="fas fa-trash-alt"></i></button></span>
                </div>
                <div class="form-grid">
                    <label class="admin-toggle form-full"><input type="checkbox" class="creative-enabled" ${project.enabled !== false ? 'checked' : ''}><span><strong>Yayında</strong><small>Kapatılırsa kart sayfada görünmez.</small></span></label>
                    <div class="form-group"><label>Proje / Sanatçı Adı</label><input type="text" class="form-control creative-title" value="${escapeHtml(project.title)}" placeholder="${escapeHtml(options.titlePlaceholder)}"></div>
                    <div class="form-group"><label>Yıl</label><input type="text" class="form-control creative-year" value="${escapeHtml(project.year)}" placeholder="2026"></div>
                    ${options.showCategory ? `<div class="form-group form-full"><label>Etiket (isteğe bağlı)</label><input type="text" class="form-control creative-category" value="${escapeHtml(project.category ?? '')}" placeholder="Boş bırakırsanız sitede gösterilmez"></div>` : ''}
                    <div class="form-group form-full"><label>${options.isVideo ? 'Özel Kapak Görseli (isteğe bağlı)' : 'Proje Görseli'}</label><input type="file" class="form-control creative-image-file" accept="image/*"><input type="hidden" class="creative-image" value="${escapeHtml(project.image)}"><p class="form-help">${options.isVideo ? 'Görsel yüklemezseniz YouTube kapağı otomatik kullanılır.' : 'Görseli doğrudan bilgisayarınızdan seçin.'}</p></div>
                    ${options.isVideo ? `<div class="form-group form-full"><label>Video Dosyası (reklamsız oynatma)</label><input type="file" class="form-control creative-video-file" accept="video/mp4,video/webm,video/quicktime"><input type="hidden" class="creative-video" value="${escapeHtml(project.videoFile || '')}"><p class="form-help">Bilgisayardan yüklenen video YouTube kullanılmadan, doğrudan sitede oynatılır.</p></div><div class="form-group form-full"><label>YouTube Video Bağlantısı (isteğe bağlı)</label><input type="url" class="form-control creative-url" value="${escapeHtml(project.url)}" placeholder="https://www.youtube.com/watch?v=..."><p class="form-help">Yalnızca video dosyası yüklenmediyse kullanılır. YouTube reklamları site tarafından kapatılamaz.</p></div>` : '<input type="hidden" class="creative-url" value="">'}
                </div>`;
            container.appendChild(card);
        });
    }

    function readCreativeProjectsForm(container, defaultCategory) {
        if (!container) return [];
        return [...container.querySelectorAll('[data-creative-project]')].map(card => ({
            id: Number(card.dataset.creativeProject) || Date.now(),
            title: card.querySelector('.creative-title')?.value.trim() || '',
            year: card.querySelector('.creative-year')?.value.trim() || '',
            category: card.querySelector('.creative-category')?.value.trim() || defaultCategory,
            image: card.querySelector('.creative-image')?.value.trim() || '',
            videoFile: card.querySelector('.creative-video')?.value.trim() || '',
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
        appData.videoClips.push({ id: Date.now(), title: '', year: String(new Date().getFullYear()), category: '', image: '', videoFile: '', url: '', enabled: true });
        renderVideoClipsForm();
        videoClipsAdmin.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.getElementById('btnAddGraphicProject')?.addEventListener('click', () => {
        appData.graphicProjects = readCreativeProjectsForm(graphicProjectsAdmin, '');
        appData.graphicProjects.push({ id: Date.now(), title: '', year: String(new Date().getFullYear()), category: '', image: '', url: '', enabled: true });
        renderGraphicProjectsForm();
        graphicProjectsAdmin.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    function bindCreativeActions(container, dataKey, defaultCategory, render, label) {
        container?.addEventListener('click', event => {
            const button = event.target.closest('[data-delete-creative], [data-move-creative]');
            if (!button) return;
            appData[dataKey] = readCreativeProjectsForm(container, defaultCategory);
            const card = button.closest('[data-creative-project]');
            const index = appData[dataKey].findIndex(project => String(project.id) === card?.dataset.creativeProject);
            if (button.matches('[data-delete-creative]')) {
                if (!confirm(`Bu ${label} projesi silinsin mi?`)) return;
                appData[dataKey].splice(index, 1);
            } else {
                const nextIndex = button.dataset.moveCreative === 'up' ? index - 1 : index + 1;
                if (index < 0 || nextIndex < 0 || nextIndex >= appData[dataKey].length) return;
                [appData[dataKey][index], appData[dataKey][nextIndex]] = [appData[dataKey][nextIndex], appData[dataKey][index]];
            }
            saveData(false);
            render();
            showToast(button.matches('[data-delete-creative]') ? `${label} projesi silindi.` : 'Sıralama güncellendi.');
        });
        container?.addEventListener('change', async event => {
            const fileInput = event.target.closest('.creative-image-file, .creative-video-file');
            if (!fileInput?.files?.[0]) return;
            const card = fileInput.closest('[data-creative-project]');
            const isVideoFile = fileInput.classList.contains('creative-video-file');
            const target = card?.querySelector(isVideoFile ? '.creative-video' : '.creative-image');
            if (!target) return;
            try {
                const previous = target.value.trim();
                target.value = await window.SiteMediaStore.save(fileInput.files[0], isVideoFile ? 'project-video' : 'project-image');
                if (window.SiteMediaStore.isStored(previous)) await window.SiteMediaStore.remove(previous);
                showToast(`${isVideoFile ? 'Video' : 'Görsel'} yüklendi. Kaydetmeyi unutmayın.`);
            } catch (error) { console.error(error); showToast('Dosya yüklenemedi.', 'error'); }
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
            return;
        }

        projects.forEach((project, index) => {
            const card = document.createElement('div');
            card.className = 'admin-form-card media-admin-card';
            card.dataset.youtubeProject = String(project.id || Date.now() + index);
            card.innerHTML = `
                <div class="media-admin-card-header">
                    <strong>Klip Çekimi ${index + 1}</strong>
                    <span class="admin-order-actions"><button class="btn btn-secondary btn-sm" type="button" data-move-youtube="up" aria-label="Yukarı taşı"><i class="fas fa-arrow-up"></i></button><button class="btn btn-secondary btn-sm" type="button" data-move-youtube="down" aria-label="Aşağı taşı"><i class="fas fa-arrow-down"></i></button><button class="btn btn-danger btn-sm" type="button" data-delete-youtube aria-label="Klip çekimini sil"><i class="fas fa-trash-alt"></i></button></span>
                </div>
                <div class="form-grid">
                    <label class="admin-toggle form-full"><input type="checkbox" class="youtube-enabled" ${project.enabled !== false ? 'checked' : ''}><span><strong>Yayında</strong><small>Kapatılırsa bu kart klip çekimleri sayfasında görünmez.</small></span></label>
                    <div class="form-group"><label>Sanatçı / Klip Adı</label><input type="text" class="form-control youtube-title" value="${escapeHtml(project.title)}" placeholder="Kubilay Karça"></div>
                    <div class="form-group"><label>Yıl</label><input type="text" class="form-control youtube-year" value="${escapeHtml(project.year)}" placeholder="2026"></div>
                    <div class="form-group"><label>Etiket (isteğe bağlı)</label><input type="text" class="form-control youtube-category" value="${escapeHtml(project.category ?? '')}" placeholder="Boş bırakırsanız sitede gösterilmez"></div>
                    <div class="form-group"><label>Kapak Yerleşimi</label><select class="form-control youtube-fit"><option value="cover" ${project.thumbnailFit !== 'contain' ? 'selected' : ''}>Görseli kapla</option><option value="contain" ${project.thumbnailFit === 'contain' ? 'selected' : ''}>Logoyu sığdır</option></select></div>
                    <div class="form-group form-full"><label>Özel Kapak Görseli (isteğe bağlı)</label><input type="file" class="form-control youtube-thumbnail-file" accept="image/*"><input type="hidden" class="youtube-thumbnail" value="${escapeHtml(project.thumbnail)}"><p class="form-help">Yüklemezseniz YouTube kapağı otomatik alınır.</p></div>
                    <div class="form-group form-full"><label>YouTube Klip Bağlantısı</label><input type="url" class="form-control youtube-url" value="${escapeHtml(project.url)}" placeholder="https://www.youtube.com/watch?v=..."><p class="form-help">Klip sitedeki oynatıcıda YouTube üzerinden açılır. Özel kapak yüklemezseniz YouTube kapağı otomatik alınır.</p></div>
                </div>`;
            youtubeProjectsAdmin.appendChild(card);
        });
    }

    function readYoutubeProjectsForm() {
        if (!youtubeProjectsAdmin) return;
        appData.youtubeProjects = [...youtubeProjectsAdmin.querySelectorAll('[data-youtube-project]')].map(card => ({
            id: Number(card.dataset.youtubeProject) || Date.now(),
            title: card.querySelector('.youtube-title')?.value.trim() || '',
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
        appData.youtubeProjects.push({ id: Date.now(), title: '', year: String(new Date().getFullYear()), category: '', thumbnail: '', thumbnailFit: 'cover', videoFile: '', url: '', enabled: true });
        renderYoutubeProjectsForm();
        youtubeProjectsAdmin.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    youtubeProjectsAdmin?.addEventListener('click', event => {
        const button = event.target.closest('[data-delete-youtube], [data-move-youtube]');
        if (!button) return;
        readYoutubeProjectsForm();
        const card = button.closest('[data-youtube-project]');
        const index = appData.youtubeProjects.findIndex(project => String(project.id) === card?.dataset.youtubeProject);
        if (button.matches('[data-delete-youtube]')) {
            if (!confirm('Bu klip çekimi silinsin mi?')) return;
            appData.youtubeProjects.splice(index, 1);
        } else {
            const nextIndex = button.dataset.moveYoutube === 'up' ? index - 1 : index + 1;
            if (index < 0 || nextIndex < 0 || nextIndex >= appData.youtubeProjects.length) return;
            [appData.youtubeProjects[index], appData.youtubeProjects[nextIndex]] = [appData.youtubeProjects[nextIndex], appData.youtubeProjects[index]];
        }
        saveData(false);
        renderYoutubeProjectsForm();
        showToast(button.matches('[data-delete-youtube]') ? 'Klip çekimi silindi.' : 'Sıralama güncellendi.');
    });

    youtubeProjectsAdmin?.addEventListener('change', async event => {
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

    function renderPartnersForm() {
        if (!partnersAdmin) return;
        partnersAdmin.innerHTML = '';
        const partners = appData.partners || [];
        if (!partners.length) {
            partnersAdmin.innerHTML = '<p class="admin-empty compact">Henüz kurum logosu eklenmedi.</p>';
            return;
        }

        partners.forEach((partner, index) => {
            const card = document.createElement('div');
            card.className = 'admin-form-card media-admin-card';
            card.dataset.partner = String(partner.id || Date.now() + index);
            card.innerHTML = `
                <div class="media-admin-card-header">
                    <strong>Kurum Logosu ${index + 1}</strong>
                    <button class="btn btn-danger btn-sm" type="button" data-delete-partner aria-label="Kurum logosunu sil"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="form-grid">
                    <label class="admin-toggle form-full"><input type="checkbox" class="partner-enabled" ${partner.enabled !== false ? 'checked' : ''}><span><strong>Yayında</strong><small>Kapatılırsa logo ana sayfada görünmez.</small></span></label>
                    <div class="form-group"><label>Kurum Adı</label><input type="text" class="form-control partner-name" value="${escapeHtml(partner.name)}" placeholder="Afyonkarahisar Belediyesi"></div>
                    <div class="form-group"><label>Kurum Web Sitesi</label><input type="url" class="form-control partner-url" value="${escapeHtml(partner.url)}" placeholder="https://..."></div>
                    <div class="form-group form-full">
                        <label>Logo Dosyası</label>
                        <input type="file" class="form-control partner-file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
                        <input type="hidden" class="partner-logo" value="${escapeHtml(partner.logo)}">
                        <p class="form-help">PNG, JPG, WebP veya SVG dosyasını bilgisayarınızdan seçin.</p>
                        <div class="partner-file-preview"><img alt="${escapeHtml(partner.name || 'Kurum')} logo önizlemesi"></div>
                    </div>
                </div>`;
            partnersAdmin.appendChild(card);
            const preview = card.querySelector('.partner-file-preview img');
            resolveAdminMedia(partner.logo).then(source => {
                if (source && preview) preview.src = source;
                card.querySelector('.partner-file-preview')?.classList.toggle('is-empty', !source);
            });
        });
    }

    function readPartnersForm() {
        if (!partnersAdmin) return;
        appData.partners = [...partnersAdmin.querySelectorAll('[data-partner]')].map(card => ({
            id: Number(card.dataset.partner) || Date.now(),
            name: card.querySelector('.partner-name')?.value.trim() || '',
            logo: card.querySelector('.partner-logo')?.value.trim() || '',
            url: card.querySelector('.partner-url')?.value.trim() || '',
            enabled: card.querySelector('.partner-enabled')?.checked !== false
        }));
    }

    document.getElementById('btnAddPartner')?.addEventListener('click', () => {
        readPartnersForm();
        appData.partners.push({ id: Date.now(), name: '', logo: '', url: '', enabled: true });
        renderPartnersForm();
        partnersAdmin.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            showToast('Logo yüklenemedi. Tarayıcı depolama alanını kontrol edin.', 'error');
        }
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
        } catch (error) { console.error(error); showToast('Görsel yüklenemedi.', 'error'); }
    });
    function populateAboutForm() { if (!appData.about) return; aboutName.value = appData.about.name || ''; aboutImage.value = appData.about.image || ''; aboutLead.value = appData.about.lead || ''; aboutP1.value = appData.about.p1 || ''; aboutP2.value = appData.about.p2 || ''; aboutVision.value = appData.about.vision || ''; aboutMission.value = appData.about.mission || ''; }
    function readAboutForm() { appData.about = { ...appData.about, name: aboutName.value.trim(), image: aboutImage.value.trim(), owner: '', lead: aboutLead.value.trim(), p1: aboutP1.value.trim(), p2: aboutP2.value.trim(), vision: aboutVision.value.trim(), mission: aboutMission.value.trim() }; }

    const testimonialsContainer = document.getElementById('testimonialsContainer');
    function renderTestimonialsForm() {
        testimonialsContainer.innerHTML = '';
        (appData.testimonials || []).forEach((item, index) => {
            const card = document.createElement('div'); card.className = 'admin-form-card'; card.dataset.testimonial = String(item.id || Date.now() + index);
            card.innerHTML = `<div class="media-admin-card-header"><strong>Yorum ${index + 1}</strong><span class="admin-order-actions"><button class="btn btn-secondary btn-sm" type="button" data-move-testimonial="up" aria-label="Yukarı taşı"><i class="fas fa-arrow-up"></i></button><button class="btn btn-secondary btn-sm" type="button" data-move-testimonial="down" aria-label="Aşağı taşı"><i class="fas fa-arrow-down"></i></button><button class="btn btn-danger btn-sm" type="button" data-delete-testimonial aria-label="Yorumu sil"><i class="fas fa-trash-alt"></i></button></span></div><div class="form-grid"><label class="admin-toggle form-full"><input type="checkbox" class="test-enabled" ${item.enabled !== false ? 'checked' : ''}><span><strong>Yorumu Göster</strong><small>Kapatılırsa yorum ana sayfada ve Ne Diyorlar sayfasında görünmez.</small></span></label><div class="form-group"><label>Sanatçı / Müşteri Adı</label><input type="text" class="form-control test-name" value="${escapeHtml(item.name)}"></div><div class="form-group"><label>Ünvan</label><input type="text" class="form-control test-title" value="${escapeHtml(item.title)}"></div><div class="form-group form-full"><label>Yorum Metni</label><textarea class="form-control test-text" rows="2">${escapeHtml(item.text)}</textarea></div></div>`;
            testimonialsContainer.appendChild(card);
        });
    }
    function readTestimonialsForm() { appData.testimonials = [...testimonialsContainer.querySelectorAll('[data-testimonial]')].map(card => ({ id: Number(card.dataset.testimonial) || Date.now(), name: card.querySelector('.test-name')?.value.trim() || '', title: card.querySelector('.test-title')?.value.trim() || '', text: card.querySelector('.test-text')?.value.trim() || '', enabled: card.querySelector('.test-enabled')?.checked !== false })); }
    document.getElementById('btnAddTestimonial')?.addEventListener('click', () => {
        readTestimonialsForm();
        if (appData.testimonials.length >= 8) return showToast('En fazla 8 yorum ekleyebilirsiniz.', 'error');
        appData.testimonials.push({ id: Date.now(), name: '', title: '', text: '', enabled: true });
        renderTestimonialsForm();
    });
    testimonialsContainer?.addEventListener('click', event => {
        const button = event.target.closest('[data-delete-testimonial], [data-move-testimonial]');
        if (!button) return;
        readTestimonialsForm();
        const card = button.closest('[data-testimonial]');
        const index = appData.testimonials.findIndex(item => String(item.id) === card?.dataset.testimonial);
        if (button.matches('[data-delete-testimonial]')) {
            if (!confirm('Bu yorum silinsin mi?')) return;
            appData.testimonials.splice(index, 1);
        } else {
            const nextIndex = button.dataset.moveTestimonial === 'up' ? index - 1 : index + 1;
            if (index < 0 || nextIndex < 0 || nextIndex >= appData.testimonials.length) return;
            [appData.testimonials[index], appData.testimonials[nextIndex]] = [appData.testimonials[nextIndex], appData.testimonials[index]];
        }
        saveData(false); renderTestimonialsForm(); showToast('Yorum sıralaması güncellendi.');
    });

    const textFieldLabels = {
        navHome: 'Menü: Ana Sayfa', navWorks: 'Menü: Çalışmalarım', navClip: 'Menü: Klip Çekimleri', navVideo: 'Menü: Video Klipleri', navGraphic: 'Menü: Grafik Tasarım', navCorporate: 'Menü: Kurumsal', navReferences: 'Menü: Referanslarımız', navAbout: 'Menü: Hakkımızda', navTestimonials: 'Menü: Ne Diyorlar', navContact: 'Menü: İletişim', featuredTag: 'Öne Çıkanlar Üst Etiketi', featuredTitle: 'Öne Çıkanlar Başlığı', featuredMore: 'Daha Fazla Butonu', servicesTag: 'Çekim Stili Üst Etiketi', servicesTitle: 'Çekim Stili Başlığı', service1Kicker: 'Çekim Stili 1 Kısa Başlık', service1Title: 'Çekim Stili 1 Başlık', service1Description: 'Çekim Stili 1 Açıklama', service2Kicker: 'Çekim Stili 2 Kısa Başlık', service2Title: 'Çekim Stili 2 Başlık', service2Description: 'Çekim Stili 2 Açıklama', service3Kicker: 'Çekim Stili 3 Kısa Başlık', service3Title: 'Çekim Stili 3 Başlık', service3Description: 'Çekim Stili 3 Açıklama', testimonialsTag: 'Yorumlar Üst Etiketi', testimonialsTitle: 'Yorumlar Başlığı', graphicTag: 'Grafik Tasarım Üst Etiketi', graphicTitle: 'Grafik Tasarım Başlığı', clipTag: 'Klip Çekimleri Üst Etiketi', clipTitle: 'Klip Çekimleri Başlığı', videoTag: 'Video Klipleri Üst Etiketi', videoTitle: 'Video Klipleri Başlığı', referencesTag: 'Referanslar Üst Etiketi', referencesTitle: 'Referanslar Başlığı', aboutTag: 'Hakkımızda Üst Etiketi', contactTag: 'İletişim Üst Etiketi', contactTitle: 'İletişim Başlığı', footerCopyright: 'Footer Yasal Metin 1', footerLegal: 'Footer Yasal Metin 2'
    };
    const siteTextAdmin = document.getElementById('siteTextAdmin');
    const typographyAdmin = document.getElementById('typographyAdmin');
    function renderTextAndTypographyForms() {
        document.querySelectorAll('[data-site-text-fields]').forEach(container => {
            const keys = String(container.dataset.siteTextFields || '').split(',').filter(Boolean);
            container.innerHTML = keys.map(key => `<div class="form-group"><label>${escapeHtml(textFieldLabels[key] || key)}</label><input class="form-control site-text-input" data-text-key="${key}" value="${escapeHtml(appData.siteText?.[key] || '')}"></div>`).join('');
        });
        const weights = [['bodyWeight', 'Gövde Yazıları'], ['headingWeight', 'Başlıklar'], ['navWeight', 'Menü Yazıları'], ['buttonWeight', 'Buton Yazıları']];
        if (typographyAdmin) typographyAdmin.innerHTML = weights.map(([key, label]) => `<div class="form-group"><label>${label}</label><select class="form-control typography-input" data-typography-key="${key}">${['300','400','500','600','700','800'].map(weight => `<option value="${weight}" ${String(appData.typography?.[key] || '') === weight ? 'selected' : ''}>${weight}</option>`).join('')}</select></div>`).join('');
    }
    function readTextAndTypographyForms() {
        appData.siteText = { ...(appData.siteText || {}) };
        document.querySelectorAll('.site-text-input[data-text-key]').forEach(input => { appData.siteText[input.dataset.textKey] = input.value.trim(); });
        appData.typography = { ...(appData.typography || {}) };
        typographyAdmin?.querySelectorAll('[data-typography-key]').forEach(input => { appData.typography[input.dataset.typographyKey] = input.value; });
    }

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
            showToast('Görsel yüklenemedi. Tarayıcı depolama alanını kontrol edin.', 'error');
        }
    });

    const contactFields = { email: document.getElementById('contactEmail'), phone: document.getElementById('contactPhone'), whatsapp: document.getElementById('contactWhatsapp'), location: document.getElementById('contactLocation'), instagram: document.getElementById('contactInstagram'), youtube: document.getElementById('contactYoutube'), twitter: document.getElementById('contactTwitter'), linkedin: document.getElementById('contactLinkedin') };
    function populateContactForm() { Object.entries(contactFields).forEach(([key, input]) => { input.value = appData.contact?.[key] || ''; }); }
    function readContactForm() { appData.contact = Object.fromEntries(Object.entries(contactFields).map(([key, input]) => [key, input.value.trim()])); }

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
