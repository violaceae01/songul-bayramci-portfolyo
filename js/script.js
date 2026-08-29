document.addEventListener('DOMContentLoaded', async () => {

    // ============================================
    // IMAGE PARTICLE SYSTEM - ON ALL SECTIONS
    // ============================================
    class ImageParticleSystem {
        constructor() {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'image-particles';
            this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;pointer-events:none;';
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.particleCount = 100;
            this.mouse = { x: null, y: null };
            this.imageLoaded = false;

            // Load the image
            this.image = new Image();
            this.image.src = 'Code_Generated_Image.png';
            this.image.onload = () => {
                this.imageLoaded = true;
                this.init();
                this.animate();
            };
            this.image.onerror = () => {
                // Fallback: create colored particles
                this.initFallback();
                this.animate();
            };

            window.addEventListener('resize', () => this.resize());
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
        }

        init() {
            this.resize();
            this.particles = [];
            for (let i = 0; i < this.particleCount; i++) {
                this.particles.push(this.createImageParticle());
            }
        }

        initFallback() {
            this.resize();
            this.particles = [];
            for (let i = 0; i < this.particleCount; i++) {
                this.particles.push(this.createFallbackParticle());
            }
        }

        createImageParticle() {
            const baseSize = 10; // Boyut
            const scale = 0.6 + Math.random() * 1;
            return {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                width: baseSize * scale,
                height: baseSize * scale,
                speedX: (Math.random() - 0.5) * 0.6,
                speedY: (Math.random() - 0.5) * 0.6,
                opacity: 0.35 + Math.random() * 0.45,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 0.02 + Math.random() * 0.03
            };
        }

        createFallbackParticle() {
            return {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 3 + Math.random() * 5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: 0.2 + Math.random() * 0.3,
                color: Math.random() > 0.5 ? '#e63946' : '#ffffff',
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 0.02 + Math.random() * 0.02
            };
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        update() {
            this.particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0);
                p.pulse += p.pulseSpeed;

                // Mouse interaction - push away
                if (this.mouse.x !== null && this.mouse.y !== null) {
                    const dx = this.mouse.x - p.x;
                    const dy = this.mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        const force = (150 - dist) / 150;
                        p.x -= dx * force * 0.02;
                        p.y -= dy * force * 0.02;
                    }
                }

                // Wrap around edges
                if (p.x < -50) p.x = this.canvas.width + 50;
                if (p.x > this.canvas.width + 50) p.x = -50;
                if (p.y < -50) p.y = this.canvas.height + 50;
                if (p.y > this.canvas.height + 50) p.y = -50;
            });
        }

        draw() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw image particles
            if (this.imageLoaded) {
                this.particles.forEach(p => {
                    const pulse = 1 + Math.sin(p.pulse) * 0.1;
                    const w = p.width * pulse;
                    const h = p.height * pulse;

                    this.ctx.save();
                    this.ctx.globalAlpha = p.opacity * (0.8 + Math.sin(p.pulse) * 0.2);
                    this.ctx.translate(p.x, p.y);
                    this.ctx.rotate(p.rotation);
                    this.ctx.drawImage(
                        this.image,
                        -w / 2,
                        -h / 2,
                        w,
                        h
                    );
                    this.ctx.restore();
                });
            } else {
                // Fallback colored particles
                this.particles.forEach(p => {
                    const size = p.size * (1 + Math.sin(p.pulse) * 0.2);

                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    this.ctx.fillStyle = p.color;
                    this.ctx.globalAlpha = p.opacity * (0.8 + Math.sin(p.pulse) * 0.2);
                    this.ctx.fill();
                    this.ctx.globalAlpha = 1;
                });
            }

            // Draw connections
            this.particles.forEach((p1, i) => {
                this.particles.slice(i + 1).forEach(p2 => {
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        const opacity = (1 - dist / 120) * 0.08;
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = `rgba(230, 57, 70, ${opacity})`;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.moveTo(p1.x, p1.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.stroke();
                    }
                });
            });
        }

        animate() {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.animate());
        }
    }

    // Initialize on all pages
    new ImageParticleSystem();

    // ============================================
    // DYNAMIC SITE DATA (FROM CLOUD STORAGE OR LOCAL PREVIEW)
    // ============================================
    async function getSiteData() {
        const defaults = typeof siteData !== 'undefined' ? siteData : {};
        if (!window.SiteDataApi) return defaults;
        try {
            return await window.SiteDataApi.load(defaults);
        } catch (error) {
            console.error('Site data read error:', error);
            return defaults;
        }
    }

    const currentSiteData = await getSiteData();
    const dataUtils = window.SiteDataUtils;
    let artistsList = dataUtils
        ? dataUtils.normalizeArtists(currentSiteData.artists || (typeof siteData !== 'undefined' ? siteData.artists : []))
        : (currentSiteData.artists || (typeof siteData !== 'undefined' ? siteData.artists : []));

    if (dataUtils && typeof siteData !== 'undefined' && siteData.artists) {
        const defaultArtists = dataUtils.normalizeArtists(siteData.artists);
        artistsList.forEach(artist => {
            const defaultArtist = defaultArtists.find(item => String(item.id) === String(artist.id));
            if (!artist.bio && defaultArtist?.bio) artist.bio = defaultArtist.bio;
        });
    }

    // Hydrate Hero & About & Contact
    function hydrateStaticContent(data) {
        if (!data) return;

        // Hero
        if (data.hero) {
            const heroTag = document.querySelector('.hero-tag');
            if (heroTag && data.hero.tag) heroTag.textContent = data.hero.tag;

            const titleLine1 = document.querySelector('.hero-title .title-line:not(.accent)');
            if (titleLine1 && data.hero.titleLine1) titleLine1.textContent = data.hero.titleLine1;

            const titleLine2 = document.querySelector('.hero-title .title-line.accent');
            if (titleLine2 && data.hero.titleLine2) titleLine2.textContent = data.hero.titleLine2;

            const heroSub = document.querySelector('.hero-subtitle');
            if (heroSub && data.hero.subtitle) heroSub.textContent = data.hero.subtitle;
        }

        // Stats
        if (data.stats && data.stats.length) {
            const statItems = document.querySelectorAll('.stat-item');
            data.stats.forEach((st, idx) => {
                if (statItems[idx]) {
                    const num = statItems[idx].querySelector('.stat-number');
                    const lbl = statItems[idx].querySelector('.stat-label');
                    if (num) num.textContent = st.number;
                    if (lbl) lbl.textContent = st.label;
                }
            });
        }

        // About
        if (data.about) {
            const aboutImg = document.querySelector('.about-image img');
            if (aboutImg && data.about.image) aboutImg.src = data.about.image;

            const aboutName = document.querySelector('.about-content h1, .about-content h2');
            if (aboutName && data.about.name) aboutName.textContent = data.about.name;

            const aboutLead = document.querySelector('.about-content .lead');
            if (aboutLead && data.about.lead) aboutLead.textContent = data.about.lead;

            const pElements = document.querySelectorAll('.about-content p:not(.lead)');
            if (pElements[0] && data.about.p1) pElements[0].textContent = data.about.p1;
            if (pElements[1] && data.about.p2) pElements[1].textContent = data.about.p2;
        }

        // Testimonials
        if (data.testimonials && data.testimonials.length) {
            const testimonialCards = document.querySelectorAll('.testimonial-card');
            data.testimonials.forEach((tm, idx) => {
                if (testimonialCards[idx]) {
                    const txt = testimonialCards[idx].querySelector('.testimonial-text');
                    const auth = testimonialCards[idx].querySelector('.author-info h4');
                    const role = testimonialCards[idx].querySelector('.author-info span');
                    if (txt) txt.textContent = `"${tm.text}"`;
                    if (auth) auth.textContent = tm.name;
                    if (role) role.textContent = tm.title;
                }
            });
        }

        // Contact & Social Links
        if (data.contact) {
            const contactItems = document.querySelectorAll('.contact-item');
            if (contactItems[0] && data.contact.email) {
                const p = contactItems[0].querySelector('p');
                if (p) p.textContent = data.contact.email;
            }
            if (contactItems[1] && data.contact.phone) {
                const p = contactItems[1].querySelector('p');
                if (p) p.textContent = data.contact.phone;
            }
            if (contactItems[2] && data.contact.location) {
                const p = contactItems[2].querySelector('p');
                if (p) p.textContent = data.contact.location;
            }

            const instaLink = document.querySelector('.social-links a[href*="instagram"], .social-links a:first-child');
            if (instaLink && data.contact.instagram) {
                instaLink.href = data.contact.instagram;
            }
        }
    }

    hydrateStaticContent(currentSiteData);

    // ============================================
    // CUSTOM CURSOR (DESKTOP ONLY)
    // ============================================
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (cursorDot && cursorOutline && isFinePointer) {
        document.addEventListener('mousemove', (e) => {
            cursorDot.style.left = `${e.clientX}px`;
            cursorDot.style.top = `${e.clientY}px`;

            cursorOutline.animate({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`
            }, { duration: 500, fill: "forwards" });
        });

        const hoverElements = document.querySelectorAll('a, button, .portfolio-item, .video-card, .testimonial-card, .skill-item');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(2)';
                cursorOutline.style.backgroundColor = 'rgba(230, 57, 70, 0.2)';
                cursorOutline.style.borderWidth = '2px';
            });
            el.addEventListener('mouseleave', () => {
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
                cursorOutline.style.backgroundColor = 'transparent';
                cursorOutline.style.borderWidth = '2px';
            });
        });
    }

    // ============================================
    // SCROLL PROGRESS
    // ============================================
    const scrollProgress = document.getElementById('scrollProgress');
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if (scrollProgress) {
            scrollProgress.style.width = `${scrolled}%`;
        }
    });

    // ============================================
    // NAVIGATION & MOBILE DRAWER
    // ============================================
    const nav = document.getElementById('mainNav');
    const navToggle = document.getElementById('navToggle');
    const navLinksContainer = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-link');
    const samePageNavLinks = document.querySelectorAll('.nav-link[href^="#"]');
    const sections = document.querySelectorAll('section[id]');

    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav?.classList.add('scrolled');
        } else {
            nav?.classList.remove('scrolled');
        }

        // Active nav link
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        samePageNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });

    // Mobile menu toggle
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            const isActive = navToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
            document.body.style.overflow = isActive ? 'hidden' : '';
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinksContainer.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ============================================
    // SCROLL REVEAL
    // ============================================
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(el => revealObserver.observe(el));

    // ============================================
    // ARTIST DIRECTORY, DETAIL PAGE & HOME GALLERY
    // ============================================
    const artistDirectory = document.getElementById('artistDirectory');
    const artistDirectoryCount = document.getElementById('artistDirectoryCount');
    const artistDetailRoot = document.getElementById('artistDetailRoot');
    const artistDetailCover = document.getElementById('artistDetailCover');
    const artistDetailName = document.getElementById('artistDetailName');
    const artistDetailTag = document.getElementById('artistDetailTag');
    const artistDetailBio = document.getElementById('artistDetailBio');
    const artistConcertsList = document.getElementById('artistConcertsList');
    const artistDetailEmpty = document.getElementById('artistDetailEmpty');
    const homeRotatingGalleryTrack = document.getElementById('homeRotatingGalleryTrack');

    const escapeHtml = value => dataUtils ? dataUtils.escapeHtml(value) : String(value || '');

    function loadArtistDirectory() {
        if (!artistDirectory) return;
        artistDirectory.innerHTML = '';

        const sortedArtists = dataUtils ? dataUtils.sortArtists(artistsList) : [...artistsList];
        if (artistDirectoryCount) artistDirectoryCount.textContent = `${sortedArtists.length} sanatçı`;

        if (!sortedArtists.length) {
            artistDirectory.innerHTML = '<div class="artist-directory-empty"><h2>Henüz sanatçı eklenmedi</h2><p>Yeni sanatçılar yönetim panelinden eklendiğinde burada alfabetik olarak sıralanacak.</p></div>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'artist-directory-grid';

        sortedArtists.forEach(artist => {
            const photoCount = artist.concerts.reduce((total, concert) => total + (concert.images?.length || 0), 0);
            const link = document.createElement('a');
            link.className = 'artist-directory-card reveal';
            link.href = `sanatci.html?artist=${encodeURIComponent(artist.slug)}`;
            link.innerHTML = `
                <img src="${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name)}" loading="lazy">
                <span class="artist-directory-overlay">
                    <small>${artist.concerts.length} KONSER · ${photoCount} KARE</small>
                    <strong>${escapeHtml(artist.name)}</strong>
                    <span>Arşivi Aç <i class="fas fa-arrow-right"></i></span>
                </span>
            `;
            grid.appendChild(link);
            revealObserver.observe(link);
        });

        artistDirectory.appendChild(grid);
    }

    function formatConcertDate(value) {
        if (!value) return '';
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
    }

    function loadArtistDetail() {
        if (!artistDetailRoot || !artistConcertsList) return;

        const artistParam = new URLSearchParams(window.location.search).get('artist');
        const artist = artistsList.find(item => item.slug === artistParam || String(item.id) === String(artistParam));

        if (!artist) {
            document.title = 'Sanatçı Bulunamadı | Songül Bayramcı';
            artistDetailRoot.innerHTML = `
                <section class="artist-not-found"><div class="container">
                    <span class="section-tag">404</span><h1>Sanatçı bulunamadı</h1>
                    <p>Aradığınız sanatçı kaldırılmış veya bağlantı değişmiş olabilir.</p>
                    <a href="calismalarim.html" class="btn btn-primary">Tüm Sanatçılar</a>
                </div></section>`;
            return;
        }

        document.title = `${artist.name} Konserleri | Songül Bayramcı`;
        if (artistDetailCover) {
            artistDetailCover.src = artist.cover;
            artistDetailCover.alt = artist.name;
        }
        if (artistDetailName) artistDetailName.textContent = artist.name;
        if (artistDetailTag) artistDetailTag.textContent = `${artist.concerts.length} KONSER ARŞİVİ`;
        if (artistDetailBio) artistDetailBio.textContent = artist.bio || `${artist.name} konser çekimleri ve sahne çalışmalarından oluşan arşiv.`;

        const concerts = [...artist.concerts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        artistConcertsList.innerHTML = '';

        if (!concerts.length) {
            if (artistDetailEmpty) artistDetailEmpty.hidden = false;
            return;
        }

        if (artistDetailEmpty) artistDetailEmpty.hidden = true;
        concerts.forEach((concert, concertIndex) => {
            const article = document.createElement('article');
            article.className = 'artist-concert-block reveal';
            const dateText = formatConcertDate(concert.date);
            const meta = [dateText, concert.venue].filter(Boolean);
            const gallery = concert.images || [];

            article.innerHTML = `
                <header class="artist-concert-header">
                    <div>
                        <span class="concert-index">${String(concertIndex + 1).padStart(2, '0')}</span>
                        ${meta.length ? `<p class="concert-meta">${meta.map(escapeHtml).join(' · ')}</p>` : ''}
                        <h2>${escapeHtml(concert.name)}</h2>
                        <p>${gallery.length} fotoğraf çekimi</p>
                    </div>
                    ${concert.videoUrl ? `
                        <div class="concert-video-panel">
                            <span><i class="fas fa-play"></i> VİDEO BAĞLANTISI</span>
                            <a href="${escapeHtml(concert.videoUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                                ${escapeHtml(concert.videoLabel || 'Konser Çekimine Git')} <i class="fas fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>` : ''}
                </header>
                <div class="concert-photo-grid"></div>
            `;

            const photoGrid = article.querySelector('.concert-photo-grid');
            if (!gallery.length) {
                photoGrid.innerHTML = '<p class="concert-gallery-empty">Bu konsere henüz fotoğraf eklenmedi.</p>';
            } else {
                gallery.forEach(image => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'concert-photo-card';
                    button.setAttribute('aria-label', `${image.title || artist.name} görselini büyüt`);
                    button.innerHTML = `
                        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.title || artist.name)}" loading="lazy">
                        <span><strong>${escapeHtml(image.title || artist.name)}</strong><small>${escapeHtml(image.desc || concert.name)}</small></span>
                    `;
                    button.addEventListener('click', () => openLightbox(image));
                    photoGrid.appendChild(button);
                });
            }

            artistConcertsList.appendChild(article);
            revealObserver.observe(article);
        });
    }

    function loadHomeRotatingGallery() {
        if (!homeRotatingGalleryTrack) return;
        homeRotatingGalleryTrack.innerHTML = '';

        const galleryItems = ((typeof siteData !== 'undefined' ? siteData.homeGallery : null) || currentSiteData.homeGallery || [])
            .filter(item => item && item.src);

        if (!galleryItems.length) {
            homeRotatingGalleryTrack.innerHTML = '<p class="rotating-gallery-empty">Galeriye henüz görsel eklenmedi.</p>';
            homeRotatingGalleryTrack.classList.add('is-empty');
            return;
        }

        homeRotatingGalleryTrack.classList.remove('is-empty');
        homeRotatingGalleryTrack.style.setProperty('--gallery-duration', `${Math.max(32, galleryItems.length * 4.5)}s`);

        const createGroup = (isDuplicate = false) => {
            const group = document.createElement('div');
            group.className = 'rotating-gallery-group';
            if (isDuplicate) group.setAttribute('aria-hidden', 'true');

            galleryItems.forEach((item, index) => {
                const card = document.createElement('button');
                card.className = 'rotating-gallery-card';
                card.type = 'button';
                card.tabIndex = isDuplicate ? -1 : 0;
                card.setAttribute('aria-label', `${item.title || 'Galeri'} görselini büyüt`);
                card.innerHTML = `
                    <img src="${item.src}" alt="${isDuplicate ? '' : (item.title || 'Galeri görseli')}" loading="lazy">
                    <span class="rotating-gallery-number">${String(index + 1).padStart(2, '0')}</span>
                    <span class="rotating-gallery-overlay">
                        <strong>${item.title || 'Songül Bayramcı'}</strong>
                        <small>${item.desc || ''}</small>
                        <i class="fas fa-expand-alt" aria-hidden="true"></i>
                    </span>
                `;
                card.addEventListener('click', () => openLightbox(item));
                group.appendChild(card);
            });

            return group;
        };

        homeRotatingGalleryTrack.append(createGroup(), createGroup(true));
    }

    loadArtistDirectory();
    loadArtistDetail();
    loadHomeRotatingGallery();

    // ============================================
    // LIGHTBOX
    // ============================================
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');
    const lightboxClose = document.getElementById('lightboxClose');

    function openLightbox(item) {
        if (!lightbox || !lightboxImage) return;

        lightboxImage.src = item.src;
        lightboxImage.alt = item.title || '';
        if (lightboxTitle) lightboxTitle.textContent = item.title || '';
        if (lightboxDesc) lightboxDesc.textContent = item.desc || '';

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Escape key listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (lightbox && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        }
    });

    // ============================================
    // CONTACT FORM
    // ============================================
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-check"></i> Gönderildi!';
                btn.style.background = '#28a745';
                contactForm.reset();

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }

    // ============================================
    // MAGNETIC BUTTONS
    // ============================================
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });

    // ============================================
    // PARALLAX ON SCROLL
    // ============================================
    const heroImage = document.querySelector('.hero-bg::before');

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const hero = document.querySelector('.hero-bg');
        if (hero && scrolled < window.innerHeight) {
            hero.style.transform = `translateY(${scrolled * 0.3}px)`;
        }
    });

});
