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
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.particleCount = reducedMotion ? 18 : window.innerWidth <= 600 ? 35 : window.innerWidth <= 1024 ? 60 : 100;
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
                color: Math.random() > 0.5 ? '#C90B0E' : '#ffffff',
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
                        this.ctx.strokeStyle = `rgba(201, 11, 14, ${opacity})`;
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
    // DYNAMIC SITE DATA (FROM LOCALSTORAGE OR DATA.JS)
    // ============================================
    function getSiteData() {
        try {
            const saved = localStorage.getItem('sb_site_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof siteData !== 'undefined') {
                    let updated = false;
                    const savedHero = parsed.hero || {};
                    const hadHeroVideo = Boolean(savedHero.bgVideo);
                    parsed.hero = { ...(siteData.hero || {}), ...(parsed.hero || {}) };
                    if (!hadHeroVideo && siteData.hero?.bgVideo) {
                        parsed.hero.bgVideo = siteData.hero.bgVideo;
                        updated = true;
                    }
                    if (Object.prototype.hasOwnProperty.call(parsed.hero, 'bgImage')) {
                        delete parsed.hero.bgImage;
                        updated = true;
                    }
                    if (!parsed.artists && siteData.artists) {
                        parsed.artists = siteData.artists;
                        updated = true;
                    } else if (parsed.artists && siteData.artists) {
                        // Merge concertName if missing
                        parsed.artists.forEach(a => {
                            if (!a.concertName) {
                                const matched = siteData.artists.find(sa => sa.id === a.id);
                                if (matched && matched.concertName) {
                                    a.concertName = matched.concertName;
                                    updated = true;
                                }
                            }
                        });
                    }

                    if (!parsed.homeGallery && siteData.homeGallery) {
                        parsed.homeGallery = siteData.homeGallery;
                        updated = true;
                    }

                    const defaultVisibility = siteData.sectionVisibility || {};
                    const savedVisibility = parsed.sectionVisibility || {};
                    parsed.sectionVisibility = { ...defaultVisibility, ...savedVisibility };
                    parsed.siteMedia = { ...(siteData.siteMedia || {}), ...(parsed.siteMedia || {}) };
                    parsed.contact = { ...(siteData.contact || {}), ...(parsed.contact || {}) };
                    parsed.siteText = { ...(siteData.siteText || {}), ...(parsed.siteText || {}) };
                    parsed.typography = { ...(siteData.typography || {}), ...(parsed.typography || {}) };
                    const savedContentVersion = Number(parsed.contentVersion || 0);
                    const currentContentVersion = Number(siteData.contentVersion || 0);
                    if (savedContentVersion < 5) {
                        parsed.sectionVisibility.homeServices = false;
                        updated = true;
                    }
                    if (savedContentVersion < 6) {
                        parsed.siteText.footerCopyright = siteData.siteText?.footerCopyright || 'All rights are reserved. No part of this publication may be reproduced,';
                        parsed.siteText.footerLegal = siteData.siteText?.footerLegal || 'lesmejorcreative Copyright © 2026';
                        updated = true;
                    }
                    if (savedContentVersion < currentContentVersion && Array.isArray(siteData.graphicProjects)) {
                        const existingGraphicIds = new Set((parsed.graphicProjects || []).map(item => String(item.id)));
                        const missingGraphicProjects = siteData.graphicProjects
                            .filter(item => !existingGraphicIds.has(String(item.id)))
                            .map(item => JSON.parse(JSON.stringify(item)));
                        parsed.graphicProjects = [...(parsed.graphicProjects || []), ...missingGraphicProjects];
                        parsed.about = {
                            ...(siteData.about || {}),
                            ...(parsed.about || {}),
                            tag: siteData.about?.tag || parsed.about?.tag,
                            name: siteData.about?.name || parsed.about?.name,
                            owner: siteData.about?.owner || parsed.about?.owner,
                            lead: siteData.about?.lead || parsed.about?.lead,
                            p1: siteData.about?.p1 || parsed.about?.p1,
                            p2: siteData.about?.p2 || parsed.about?.p2,
                            vision: siteData.about?.vision || parsed.about?.vision,
                            mission: siteData.about?.mission || parsed.about?.mission
                        };
                        parsed.contact = {
                            ...(siteData.contact || {}),
                            ...(parsed.contact || {}),
                            instagram: siteData.contact?.instagram || parsed.contact?.instagram
                        };
                        parsed.testimonials = (parsed.testimonials || siteData.testimonials || []).map(testimonial => {
                            if (!String(testimonial?.text || '').startsWith('Songül hanım')) return testimonial;
                            return { ...testimonial, text: String(testimonial.text).replace('Songül hanım', 'Les Mejor Creative ekibi') };
                        });
                        parsed.contentVersion = currentContentVersion;
                        updated = true;
                    } else if (!parsed.graphicProjects && siteData.graphicProjects) {
                        parsed.graphicProjects = siteData.graphicProjects;
                        updated = true;
                    }
                    if (!parsed.videoClips && siteData.videoClips) {
                        parsed.videoClips = siteData.videoClips;
                        updated = true;
                    }

                    if (!parsed.youtubeProjects && siteData.youtubeProjects) {
                        parsed.youtubeProjects = siteData.youtubeProjects;
                        updated = true;
                    } else if (Array.isArray(parsed.youtubeProjects) && siteData.youtubeProjects?.[0]) {
                        parsed.youtubeProjects = parsed.youtubeProjects.map(project => {
                            const isOldDemo = project?.title === 'Afyonkarahisar Belediyesi'
                                && project?.url === 'https://www.youtube.com/c/AfyonkarahisarBelediyesi';
                            if (!isOldDemo) return project;
                            updated = true;
                            return JSON.parse(JSON.stringify(siteData.youtubeProjects[0]));
                        });
                    }

                    if (!parsed.partners && siteData.partners) {
                        parsed.partners = siteData.partners;
                        updated = true;
                    }

                    if (updated) localStorage.setItem('sb_site_data', JSON.stringify(parsed));
                }
                return parsed;
            }
        } catch (e) {
            console.error('LocalStorage read error:', e);
        }
        return typeof siteData !== 'undefined' ? siteData : {};
    }

    let currentSiteData = getSiteData();
    try {
        const serverData = await window.SiteServer?.loadData?.();
        if (serverData) {
            currentSiteData = serverData;
            localStorage.setItem('sb_site_data', JSON.stringify(serverData));
        }
    } catch (error) {
        console.error('Sunucu verisi yüklenemedi, yerel veri kullanılıyor:', error);
    }
    const dataUtils = window.SiteDataUtils;
    const escapeHtml = value => dataUtils ? dataUtils.escapeHtml(value) : String(value || '');
    const resolveMediaUrl = async value => {
        const reference = String(value || '');
        if (!window.SiteMediaStore?.isStored(reference)) return reference;
        try {
            return await window.SiteMediaStore.resolve(reference);
        } catch (error) {
            console.error('Medya dosyası yüklenemedi:', error);
            return '';
        }
    };
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
    async function hydrateStaticContent(data) {
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

            const heroVideo = document.querySelector('.hero-video');
            const heroVideoSource = heroVideo?.querySelector('source');
            const heroVideoReference = data.hero.bgVideo || (typeof siteData !== 'undefined' ? siteData.hero?.bgVideo : '');
            const heroVideoUrl = await resolveMediaUrl(heroVideoReference);
            if (heroVideo && heroVideoSource && heroVideoUrl && heroVideoSource.getAttribute('src') !== heroVideoUrl) {
                const normalizedVideoUrl = heroVideoUrl.split('?')[0].toLowerCase();
                heroVideoSource.src = heroVideoUrl;
                heroVideoSource.type = normalizedVideoUrl.endsWith('.webm') ? 'video/webm' : 'video/mp4';
                heroVideo.load();
                const playRequest = heroVideo.play();
                if (playRequest?.catch) playRequest.catch(() => {});
            }
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
            if (aboutImg && data.about.image) setStoredImageSource(aboutImg, data.about.image);

            const aboutName = document.querySelector('.about-content h1, .about-content h2');
            if (aboutName && data.about.name) aboutName.textContent = data.about.name;

            const aboutOwner = document.getElementById('aboutOwner');
            if (aboutOwner && data.about.owner) aboutOwner.textContent = data.about.owner;

            const aboutLead = document.querySelector('.about-content .lead');
            if (aboutLead && data.about.lead) aboutLead.textContent = data.about.lead;

            const pElements = document.querySelectorAll('.about-content .about-copy');
            if (pElements[0] && data.about.p1) pElements[0].textContent = data.about.p1;
            if (pElements[1] && data.about.p2) pElements[1].textContent = data.about.p2;

            const aboutVision = document.getElementById('aboutVision');
            const aboutMission = document.getElementById('aboutMission');
            if (aboutVision && data.about.vision) aboutVision.textContent = data.about.vision;
            if (aboutMission && data.about.mission) aboutMission.textContent = data.about.mission;
        }

        // Testimonials
        const testimonialsGrid = document.getElementById('testimonialsGrid');
        if (testimonialsGrid) {
            const testimonials = (data.testimonials || []).filter(item => item && item.enabled !== false).slice(0, 8);
            testimonialsGrid.innerHTML = testimonials.length ? testimonials.map(tm => `<article class="testimonial-card reveal active"><i class="fas fa-quote-left quote-icon" aria-hidden="true"></i><p class="testimonial-text">${escapeHtml(tm.text || '')}</p><div class="testimonial-author"><span class="author-name">${escapeHtml(tm.name || '')}</span><span class="author-title">${escapeHtml(tm.title || '')}</span></div></article>`).join('') : '<p class="featured-artists-empty">Henüz yorum eklenmedi.</p>';
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
            const socialLinks = document.querySelectorAll('.social-links a');
            const socialUrls = [data.contact.instagram, data.contact.youtube, data.contact.twitter, data.contact.linkedin];
            socialLinks.forEach((link, index) => {
                const url = safeExternalUrl(socialUrls[index]);
                link.hidden = !url;
                if (url) {
                    link.href = url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                }
            });
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
                cursorOutline.style.backgroundColor = 'rgba(201, 11, 14, 0.2)';
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
    const scrollToTopButton = document.getElementById('scrollToTop');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateScrollControls = () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        if (scrollProgress) {
            scrollProgress.style.width = `${scrolled}%`;
        }

        if (scrollToTopButton) {
            const revealPoint = Math.max(420, window.innerHeight * 0.65);
            scrollToTopButton.classList.toggle('is-visible', winScroll > revealPoint);
        }
    };

    window.addEventListener('scroll', updateScrollControls, { passive: true });
    updateScrollControls();

    if (scrollToTopButton) {
        scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
            });
        });
    }

    // ============================================
    // NAVIGATION & MOBILE DRAWER
    // ============================================
    function setupCorporateNavigation() {
        const menu = document.getElementById('mainMenu');
        if (!menu || menu.querySelector('.nav-dropdown')) return;

        if (!menu.querySelector('[data-nav-section="testimonialsPage"]')) {
            const testimonialLink = document.createElement('a');
            testimonialLink.href = 'yorumlar.html';
            testimonialLink.className = 'nav-link';
            testimonialLink.dataset.navSection = 'testimonialsPage';
            testimonialLink.textContent = 'NE DİYORLAR';
            menu.appendChild(testimonialLink);
        }
        const corporateLinks = ['referencesPage', 'aboutPage', 'testimonialsPage', 'contactPage']
            .map(key => menu.querySelector(`[data-nav-section="${key}"]`))
            .filter(Boolean);
        if (!corporateLinks.length) return;

        const dropdown = document.createElement('div');
        dropdown.className = 'nav-dropdown';
        const toggle = document.createElement('button');
        toggle.className = 'nav-link nav-dropdown-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = `${escapeHtml(currentSiteData.siteText?.navCorporate || 'KURUMSAL')} <i class="fas fa-chevron-down" aria-hidden="true"></i>`;

        const panel = document.createElement('div');
        panel.className = 'nav-dropdown-menu';
        panel.setAttribute('aria-label', 'Kurumsal sayfalar');
        corporateLinks.forEach(link => {
            link.classList.add('nav-dropdown-link');
            panel.appendChild(link);
        });
        if (corporateLinks.some(link => link.classList.contains('active'))) toggle.classList.add('active');
        dropdown.append(toggle, panel);
        menu.appendChild(dropdown);

        const setOpen = open => {
            dropdown.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
        };
        toggle.addEventListener('click', event => {
            event.stopPropagation();
            setOpen(!dropdown.classList.contains('is-open'));
        });
        document.addEventListener('click', event => {
            if (!dropdown.contains(event.target)) setOpen(false);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && dropdown.classList.contains('is-open')) {
                setOpen(false);
                toggle.focus();
            }
        });
    }

    setupCorporateNavigation();
    function applyEditableTextAndTypography() {
        const text = currentSiteData.siteText || {};
        const selectors = {
            navHome: 'a.nav-link[href*="index.html#home"]', navWorks: '[data-nav-section="worksPage"]', navClip: '[data-nav-section="clipShootings"]', navVideo: '[data-nav-section="videoClips"]', navGraphic: '[data-nav-section="graphicDesign"]', navReferences: '[data-nav-section="referencesPage"]', navAbout: '[data-nav-section="aboutPage"]', navTestimonials: '[data-nav-section="testimonialsPage"]', navContact: '[data-nav-section="contactPage"]',
            footerCopyright: '.footer .copyright', footerLegal: '.footer .footer-signature'
        };
        Object.entries(selectors).forEach(([key, selector]) => {
            if (!text[key]) return;
            document.querySelectorAll(selector).forEach(element => { element.textContent = text[key]; });
        });
        const pageSection = document.body.dataset.pageSection || '';
        const pageMap = {
            graphicDesign: ['graphicTag', 'graphicTitle'], clipShootings: ['clipTag', 'clipTitle'], videoClips: ['videoTag', 'videoTitle'], referencesPage: ['referencesTag', 'referencesTitle'], testimonialsPage: ['testimonialsTag', 'testimonialsTitle']
        };
        const pageKeys = pageMap[pageSection];
        if (pageKeys) {
            const tag = document.querySelector('main .section-tag'); const title = document.querySelector('main .section-title');
            if (tag && text[pageKeys[0]]) tag.textContent = text[pageKeys[0]];
            if (title && text[pageKeys[1]]) title.textContent = text[pageKeys[1]];
        }
        if (document.body.classList.contains('home-page') || document.getElementById('featuredArtistsGrid')) {
            const serviceSection = document.querySelector('[data-section-key="homeServices"]');
            if (serviceSection) {
                const serviceFields = {
                    servicesTag: '#servicesTag', servicesTitle: '#servicesTitle',
                    service1Kicker: '[data-service-card="1"] .video-placeholder span', service1Title: '[data-service-card="1"] .video-info h3', service1Description: '[data-service-card="1"] .video-info p',
                    service2Kicker: '[data-service-card="2"] .video-placeholder span', service2Title: '[data-service-card="2"] .video-info h3', service2Description: '[data-service-card="2"] .video-info p',
                    service3Kicker: '[data-service-card="3"] .video-placeholder span', service3Title: '[data-service-card="3"] .video-info h3', service3Description: '[data-service-card="3"] .video-info p'
                };
                Object.entries(serviceFields).forEach(([key, selector]) => {
                    if (!Object.prototype.hasOwnProperty.call(text, key)) return;
                    const element = serviceSection.querySelector(selector);
                    if (element) element.textContent = text[key] || '';
                });
            }
            const featured = document.querySelector('[data-section-key="featuredArtists"]');
            if (featured) { const tag = featured.querySelector('.section-tag'); const title = featured.querySelector('.section-title'); if (tag && text.featuredTag) tag.textContent = text.featuredTag; if (title && text.featuredTitle) title.textContent = text.featuredTitle; }
            const testimonialSection = document.querySelector('[data-section-key="testimonials"]');
            if (testimonialSection) { const tag = testimonialSection.querySelector('.section-tag'); const title = testimonialSection.querySelector('.section-title'); if (tag && text.testimonialsTag) tag.textContent = text.testimonialsTag; if (title && text.testimonialsTitle) title.textContent = text.testimonialsTitle; }
        }
        const typography = currentSiteData.typography || {};
        const root = document.documentElement;
        root.style.setProperty('--body-weight', typography.bodyWeight || '400');
        root.style.setProperty('--heading-weight', typography.headingWeight || '700');
        root.style.setProperty('--nav-weight', typography.navWeight || '600');
        root.style.setProperty('--button-weight', typography.buttonWeight || '600');
    }
    applyEditableTextAndTypography();
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
        const setMobileMenuState = (isOpen) => {
            navToggle.classList.toggle('active', isOpen);
            navLinksContainer.classList.toggle('active', isOpen);
            navToggle.setAttribute('aria-expanded', String(isOpen));
            navToggle.setAttribute('aria-label', isOpen ? 'Menüyü kapat' : 'Menüyü aç');
            document.body.classList.toggle('menu-open', isOpen);
            if (!isOpen) {
                const corporateDropdown = navLinksContainer.querySelector('.nav-dropdown');
                corporateDropdown?.classList.remove('is-open');
                corporateDropdown?.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
            }
        };

        navToggle.addEventListener('click', () => {
            setMobileMenuState(!navLinksContainer.classList.contains('active'));
        });

        navLinks.forEach(link => {
            if (link.classList.contains('nav-dropdown-toggle')) return;
            link.addEventListener('click', () => {
                setMobileMenuState(false);
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && navLinksContainer.classList.contains('active')) {
                setMobileMenuState(false);
                navToggle.focus();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900 && navLinksContainer.classList.contains('active')) {
                setMobileMenuState(false);
            }
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
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-background, .reveal-logo');

    const revealObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })
        : null;

    const observeReveal = element => {
        if (!element) return;
        if (revealObserver) {
            revealObserver.observe(element);
        } else {
            element.classList.add('active');
        }
    };

    reveals.forEach(observeReveal);

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
    const featuredArtistsGrid = document.getElementById('featuredArtistsGrid');
    const featuredArtistsActions = document.getElementById('featuredArtistsActions');
    const featuredArtistsMore = document.getElementById('featuredArtistsMore');

    function loadArtistDirectory() {
        if (!artistDirectory) return;
        artistDirectory.innerHTML = '';

        const visibleArtists = artistsList.filter(artist => artist.visible !== false);
        const sortedArtists = dataUtils ? dataUtils.sortArtists(visibleArtists) : [...visibleArtists];
        if (artistDirectoryCount) artistDirectoryCount.textContent = `${sortedArtists.length} sanatçı`;

        if (!sortedArtists.length) {
            artistDirectory.innerHTML = '<div class="artist-directory-empty"><h2>Henüz sanatçı eklenmedi</h2><p>Yeni sanatçılar yönetim panelinden eklendiğinde burada alfabetik olarak sıralanacak.</p></div>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'artist-directory-grid';

        sortedArtists.forEach((artist, artistIndex) => {
            const photoCount = artist.concerts.reduce((total, concert) => total + (concert.images?.length || 0), 0);
            const link = document.createElement('a');
            link.className = 'artist-directory-card reveal active';
            link.href = `sanatci.html?artist=${encodeURIComponent(artist.slug)}`;
            link.dataset.searchText = `${artist.name || ''} ${artist.bio || ''}`.toLocaleLowerCase('tr-TR');
            link.innerHTML = `
                <img src="${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name)}" loading="${artistIndex < 4 ? 'eager' : 'lazy'}" decoding="async">
                <span class="artist-directory-overlay">
                    <small>${artist.concerts.length} KONSER · ${photoCount} KARE</small>
                    <strong>${escapeHtml(artist.name)}</strong>
                    <span>Arşivi Aç <i class="fas fa-arrow-right"></i></span>
                </span>
            `;
            grid.appendChild(link);
            const cover = link.querySelector('img');
            if (cover && window.SiteMediaStore?.isStored(artist.cover)) setStoredImageSource(cover, artist.cover);
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
        const artist = artistsList.find(item => item.visible !== false && (item.slug === artistParam || String(item.id) === String(artistParam)));

        if (!artist) {
            document.title = 'Sanatçı Bulunamadı | Les Mejor Creative';
            artistDetailRoot.innerHTML = `
                <section class="artist-not-found"><div class="container">
                    <span class="section-tag">404</span><h1>Sanatçı bulunamadı</h1>
                    <p>Aradığınız sanatçı kaldırılmış veya bağlantı değişmiş olabilir.</p>
                    <a href="calismalarim.html" class="btn btn-primary">Tüm Sanatçılar</a>
                </div></section>`;
            return;
        }

        document.title = `${artist.name} Konserleri | Les Mejor Creative`;
        if (artistDetailCover) {
            setStoredImageSource(artistDetailCover, artist.cover);
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
                    ${concert.videoUrl && concert.videoEnabled !== false ? `
                        <div class="concert-video-panel">
                            <span><i class="fas fa-play"></i> VİDEO BAĞLANTISI</span>
                            <a href="${escapeHtml(concert.videoUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                                ${escapeHtml(concert.videoLabel || 'Konser Çekimine Git')} <i class="fas fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>` : ''}
                </header>
                <div class="concert-gallery-shell">
                    <div class="concert-gallery-nav" ${gallery.length > 1 ? '' : 'hidden'}>
                        <button type="button" class="concert-gallery-arrow is-prev" aria-label="Önceki görsel"><i class="fas fa-arrow-left"></i></button>
                        <button type="button" class="concert-gallery-arrow is-next" aria-label="Sonraki görsel"><i class="fas fa-arrow-right"></i></button>
                    </div>
                    <div class="concert-photo-grid" tabindex="0" aria-label="${escapeHtml(concert.name)} fotoğraf galerisi"></div>
                </div>
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
                    const photo = button.querySelector('img');
                    if (photo && window.SiteMediaStore?.isStored(image.src)) setStoredImageSource(photo, image.src);
                });

                const previousButton = article.querySelector('.concert-gallery-arrow.is-prev');
                const nextButton = article.querySelector('.concert-gallery-arrow.is-next');
                const updateGalleryButtons = () => {
                    const maxScroll = Math.max(0, photoGrid.scrollWidth - photoGrid.clientWidth - 2);
                    if (previousButton) previousButton.disabled = photoGrid.scrollLeft <= 2;
                    if (nextButton) nextButton.disabled = photoGrid.scrollLeft >= maxScroll;
                };
                const moveGallery = direction => {
                    const card = photoGrid.querySelector('.concert-photo-card');
                    const gap = Number.parseFloat(getComputedStyle(photoGrid).columnGap || getComputedStyle(photoGrid).gap) || 20;
                    const distance = (card?.getBoundingClientRect().width || photoGrid.clientWidth * 0.75) + gap;
                    photoGrid.scrollBy({ left: direction * distance, behavior: 'smooth' });
                };
                previousButton?.addEventListener('click', () => moveGallery(-1));
                nextButton?.addEventListener('click', () => moveGallery(1));
                photoGrid.addEventListener('scroll', updateGalleryButtons, { passive: true });
                requestAnimationFrame(updateGalleryButtons);
            }

            artistConcertsList.appendChild(article);
            observeReveal(article);
        });
    }

    function loadFeaturedArtists() {
        if (!featuredArtistsGrid) return;
        featuredArtistsGrid.innerHTML = '';

        const featuredArtists = [...artistsList]
            .filter(artist => artist.visible !== false && artist.featured === true && artist.cover)
            .sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0));
        const initialLimit = window.matchMedia('(max-width: 600px)').matches ? 4 : 8;

        if (!featuredArtists.length) {
            featuredArtistsGrid.innerHTML = '<p class="featured-artists-empty">Henüz öne çıkan sanatçı seçilmedi.</p>';
            if (featuredArtistsActions) featuredArtistsActions.hidden = true;
            return;
        }

        featuredArtists.forEach((artist, index) => {
            const photoCount = artist.concerts.reduce((total, concert) => total + (concert.images?.length || 0), 0);
            const card = document.createElement('a');
            card.className = 'featured-artist-card';
            card.href = `sanatci.html?artist=${encodeURIComponent(artist.slug)}`;
            card.dataset.featuredExtra = index >= initialLimit ? 'true' : 'false';
            card.hidden = index >= initialLimit;
            card.setAttribute('aria-label', `${artist.name} sanatçı sayfasını aç`);
            card.innerHTML = `
                <span class="featured-artist-media">
                    <img src="${escapeHtml(artist.cover)}" alt="${escapeHtml(artist.name)}" loading="${index < 8 ? 'eager' : 'lazy'}" decoding="async">
                    <small>SANATÇI</small>
                </span>
                <span class="featured-artist-info">
                    <strong>${escapeHtml(artist.name)}</strong>
                    <span><small>${artist.concerts.length} konser</small><small>${photoCount} kare</small></span>
                </span>`;
            featuredArtistsGrid.appendChild(card);
            const coverImage = card.querySelector('img');
            if (coverImage && window.SiteMediaStore?.isStored(artist.cover)) setStoredImageSource(coverImage, artist.cover);
        });

        if (featuredArtistsActions) featuredArtistsActions.hidden = featuredArtists.length <= initialLimit;
        if (featuredArtistsMore) {
            featuredArtistsMore.setAttribute('aria-expanded', 'false');
            featuredArtistsMore.innerHTML = `${escapeHtml(currentSiteData.siteText?.featuredMore || 'Daha Fazla')} <i class="fas fa-arrow-down" aria-hidden="true"></i>`;
        }
    }

    featuredArtistsMore?.addEventListener('click', () => {
        const expanded = featuredArtistsMore.getAttribute('aria-expanded') === 'true';
        featuredArtistsGrid?.querySelectorAll('[data-featured-extra="true"]').forEach(card => {
            card.hidden = expanded;
        });
        featuredArtistsMore.setAttribute('aria-expanded', String(!expanded));
        featuredArtistsMore.innerHTML = expanded
            ? `${escapeHtml(currentSiteData.siteText?.featuredMore || 'Daha Fazla')} <i class="fas fa-arrow-down" aria-hidden="true"></i>`
            : 'Daha Az <i class="fas fa-arrow-up" aria-hidden="true"></i>';
    });

    function safeExternalUrl(value) {
        const url = String(value || '').trim();
        return /^https?:\/\//i.test(url) ? url : '';
    }

    const sectionVisibility = {
        homeHero: true,
        homeStats: true,
        homeServices: false,
        featuredArtists: true,
        partnerLogos: true,
        homeAbout: true,
        testimonials: true,
        homeContact: true,
        homeSignature: true,
        worksPage: true,
        referencesPage: true,
        clipShootings: true,
        graphicDesign: true,
        videoClips: true,
        aboutPage: true,
        contactPage: true,
        aboutOwner: true,
        aboutVisionMission: true,
        contactDetails: true,
        contactForm: true,
        siteFooter: true,
        scrollTop: true,
        ...(currentSiteData.sectionVisibility || {})
    };

    function isSectionVisible(key) {
        return sectionVisibility[key] !== false;
    }

    async function applyManagedMedia() {
        const media = {
            ...(typeof siteData !== 'undefined' ? siteData.siteMedia || {} : {}),
            ...(currentSiteData.siteMedia || {})
        };
        const asCssUrl = source => {
            let normalized = String(source || '');
            try {
                normalized = new URL(normalized, document.baseURI).href;
            } catch (_) {
                // Blob/data URL'leri ve geçerli göreli yollar olduğu gibi kullanılabilir.
            }
            return `url("${normalized.replace(/"/g, '%22')}")`;
        };
        for (const element of document.querySelectorAll('[data-managed-media]')) {
            const reference = media[element.dataset.managedMedia] || '';
            const source = await resolveMediaUrl(reference);
            if (source) element.style.setProperty('--managed-background-image', asCssUrl(source));
        }
        for (const image of document.querySelectorAll('[data-managed-media-image]')) {
            const reference = media[image.dataset.managedMediaImage] || '';
            const source = await resolveMediaUrl(reference);
            if (source) image.src = source;
        }
    }

    function applySectionVisibility() {
        document.querySelectorAll('[data-nav-section]').forEach(link => {
            link.hidden = !isSectionVisible(link.dataset.navSection);
        });
        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            const visibleLinks = [...dropdown.querySelectorAll('[data-nav-section]')].some(link => !link.hidden);
            dropdown.hidden = !visibleLinks;
        });

        const activePageSection = document.body.dataset.pageSection || '';
        if (activePageSection && !isSectionVisible(activePageSection)) {
            const main = document.querySelector('main');
            if (main) {
                main.innerHTML = `
                    <section class="disabled-page-message">
                        <span class="section-tag">LES MEJOR CREATIVE</span>
                        <h1>BU BÖLÜM ŞU ANDA YAYINDA DEĞİL</h1>
                        <a class="btn btn-outline" href="index.html">Ana Sayfaya Dön</a>
                    </section>`;
            }
        }
        document.querySelectorAll('[data-section-key]').forEach(section => {
            const key = section.dataset.sectionKey;
            section.hidden = !isSectionVisible(key);
        });
        document.querySelectorAll('.about-owner').forEach(element => {
            element.hidden = !isSectionVisible('aboutOwner');
        });
        document.querySelectorAll('.vision-mission-grid').forEach(element => {
            element.hidden = !isSectionVisible('aboutVisionMission');
        });
        document.querySelectorAll('.contact-info').forEach(element => {
            element.hidden = !isSectionVisible('contactDetails');
        });
        document.querySelectorAll('.contact-form').forEach(element => {
            element.hidden = !isSectionVisible('contactForm');
        });
        document.querySelectorAll('.footer').forEach(element => {
            element.hidden = !isSectionVisible('siteFooter');
        });
        if (scrollToTopButton) scrollToTopButton.hidden = !isSectionVisible('scrollTop');
    }

    function extractYouTubeVideoId(value) {
        const source = safeExternalUrl(value);
        if (!source) return '';

        try {
            const url = new URL(source);
            const host = url.hostname.toLowerCase().replace(/^www\./, '');
            let videoId = '';

            if (host === 'youtu.be') {
                videoId = url.pathname.split('/').filter(Boolean)[0] || '';
            } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
                if (url.pathname === '/watch') {
                    videoId = url.searchParams.get('v') || '';
                } else {
                    const parts = url.pathname.split('/').filter(Boolean);
                    if (['shorts', 'embed', 'live'].includes(parts[0])) videoId = parts[1] || '';
                }
            }

            return /^[A-Za-z0-9_-]{6,}$/.test(videoId) ? videoId : '';
        } catch (error) {
            return '';
        }
    }

    function youtubeThumbnail(videoId, quality = 'maxresdefault') {
        return videoId ? `https://img.youtube.com/vi/${videoId}/${quality}.jpg` : '';
    }

    let activeYoutubePlayer = null;
    let youtubeApiPromise = null;
    let youtubeFallbackTimer = null;

    function ensureYoutubeFrame() {
        const wrap = document.querySelector('#youtubeVideoModal .youtube-video-frame-wrap');
        if (!wrap) return null;
        let frame = document.getElementById('youtubeVideoFrame');
        if (frame) return frame;
        frame = document.createElement('iframe');
        frame.id = 'youtubeVideoFrame';
        frame.title = 'YouTube videosu';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.allowFullscreen = true;
        wrap.prepend(frame);
        return frame;
    }

    function ensureYoutubeFallback() {
        const wrap = document.querySelector('#youtubeVideoModal .youtube-video-frame-wrap');
        if (!wrap) return null;
        let fallback = wrap.querySelector('.youtube-player-fallback');
        if (fallback) return fallback;
        fallback = document.createElement('div');
        fallback.className = 'youtube-player-fallback';
        fallback.hidden = true;
        fallback.innerHTML = `
            <img class="youtube-player-fallback-image" src="" alt="">
            <div class="youtube-player-fallback-shade"></div>
            <div class="youtube-player-fallback-content">
                <i class="fab fa-youtube" aria-hidden="true"></i>
                <strong>Video YouTube'da açılacak</strong>
                <p>Bu tarayıcı YouTube oynatıcısına gerekli güvenlik bilgisini iletmedi.</p>
                <a class="btn btn-primary youtube-player-fallback-link" href="#" target="_blank" rel="noopener noreferrer">YouTube'da İzle <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
            </div>`;
        wrap.appendChild(fallback);
        return fallback;
    }

    function resetYoutubeFallback() {
        const fallback = ensureYoutubeFallback();
        if (fallback) fallback.hidden = true;
        if (youtubeFallbackTimer) clearTimeout(youtubeFallbackTimer);
        youtubeFallbackTimer = null;
    }

    function showYoutubeFallback(videoId, title = '') {
        const modal = document.getElementById('youtubeVideoModal');
        const frame = document.getElementById('youtubeVideoFrame');
        if (!modal?.classList.contains('active') || !videoId || (frame?.dataset.videoId && frame.dataset.videoId !== videoId)) return;
        if (youtubeFallbackTimer) clearTimeout(youtubeFallbackTimer);
        youtubeFallbackTimer = null;
        try { activeYoutubePlayer?.stopVideo?.(); } catch (error) { /* YouTube already stopped. */ }
        if (frame) {
            frame.hidden = true;
            frame.src = '';
        }
        const fallback = ensureYoutubeFallback();
        if (!fallback) return;
        const image = fallback.querySelector('.youtube-player-fallback-image');
        const link = fallback.querySelector('.youtube-player-fallback-link');
        const heading = fallback.querySelector('strong');
        if (image) {
            image.src = youtubeThumbnail(videoId, 'hqdefault');
            image.alt = title ? `${title} video kapağı` : 'YouTube video kapağı';
        }
        if (link) link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        if (heading) heading.textContent = title || "Video YouTube'da açılacak";
        fallback.hidden = false;
    }

    function loadYoutubeIframeApi() {
        if (window.YT?.Player) return Promise.resolve(window.YT);
        if (youtubeApiPromise) return youtubeApiPromise;
        youtubeApiPromise = new Promise((resolve, reject) => {
            const previousReady = window.onYouTubeIframeAPIReady;
            const timeout = window.setTimeout(() => reject(new Error('YouTube API zaman aşımı')), 8000);
            window.onYouTubeIframeAPIReady = () => {
                if (typeof previousReady === 'function') previousReady();
                window.clearTimeout(timeout);
                resolve(window.YT);
            };
            let script = document.querySelector('script[data-youtube-iframe-api]');
            if (!script) {
                script = document.createElement('script');
                script.src = 'https://www.youtube.com/iframe_api';
                script.async = true;
                script.dataset.youtubeIframeApi = 'true';
                script.addEventListener('error', () => {
                    window.clearTimeout(timeout);
                    reject(new Error('YouTube API yüklenemedi'));
                }, { once: true });
                document.head.appendChild(script);
            }
        }).catch(error => {
            youtubeApiPromise = null;
            throw error;
        });
        return youtubeApiPromise;
    }

    function openYouTubeModal(videoId, title = '') {
        const modal = document.getElementById('youtubeVideoModal');
        const heading = document.getElementById('youtubeVideoTitle');
        if (!modal || !videoId) return;
        try { activeYoutubePlayer?.destroy?.(); } catch (error) { /* Player may already be gone. */ }
        activeYoutubePlayer = null;
        const frame = ensureYoutubeFrame();
        if (!frame) return;
        resetYoutubeFallback();
        const player = document.getElementById('projectVideoPlayer');
        if (player) { player.pause(); player.removeAttribute('src'); player.hidden = true; }
        frame.hidden = false;
        frame.dataset.videoId = videoId;
        const playerParams = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1', enablejsapi: '1' });
        if (/^https?:$/.test(window.location.protocol)) {
            playerParams.set('origin', window.location.origin);
            playerParams.set('widget_referrer', window.location.href);
        }
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${playerParams.toString()}`;
        frame.title = title || 'YouTube videosu';
        if (heading) heading.textContent = title || 'Klip Çekimi';
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modal.querySelector('.youtube-video-modal-close')?.focus();
        youtubeFallbackTimer = window.setTimeout(() => showYoutubeFallback(videoId, title), 9000);
        loadYoutubeIframeApi().then(YT => {
            const currentFrame = document.getElementById('youtubeVideoFrame');
            if (!currentFrame || currentFrame.dataset.videoId !== videoId || !modal.classList.contains('active')) return;
            activeYoutubePlayer = new YT.Player(currentFrame, {
                events: {
                    onReady: () => {
                        if (youtubeFallbackTimer) clearTimeout(youtubeFallbackTimer);
                        youtubeFallbackTimer = null;
                    },
                    onStateChange: event => {
                        if (event.data === YT.PlayerState.PLAYING && youtubeFallbackTimer) {
                            clearTimeout(youtubeFallbackTimer);
                            youtubeFallbackTimer = null;
                        }
                    },
                    onError: () => showYoutubeFallback(videoId, title)
                }
            });
        }).catch(() => {
            if (!youtubeFallbackTimer) showYoutubeFallback(videoId, title);
        });
    }

    async function openUploadedVideo(reference, title = '') {
        const modal = document.getElementById('youtubeVideoModal');
        const frame = ensureYoutubeFrame();
        const player = document.getElementById('projectVideoPlayer');
        const heading = document.getElementById('youtubeVideoTitle');
        if (!modal || !player || !reference) return;
        const source = await resolveMediaUrl(reference);
        if (!source) return;
        resetYoutubeFallback();
        try { activeYoutubePlayer?.destroy?.(); } catch (error) { /* Player may already be gone. */ }
        activeYoutubePlayer = null;
        if (frame) { frame.src = ''; frame.hidden = true; }
        player.src = source; player.hidden = false; player.load(); player.play().catch(() => {});
        if (heading) heading.textContent = title || 'Video';
        modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
        modal.querySelector('.youtube-video-modal-close')?.focus();
    }

    function closeYouTubeModal() {
        const modal = document.getElementById('youtubeVideoModal');
        const frame = document.getElementById('youtubeVideoFrame');
        const player = document.getElementById('projectVideoPlayer');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        resetYoutubeFallback();
        try { activeYoutubePlayer?.destroy?.(); } catch (error) { /* Player may already be gone. */ }
        activeYoutubePlayer = null;
        if (frame) frame.src = '';
        if (player) { player.pause(); player.removeAttribute('src'); player.hidden = true; }
        document.body.style.overflow = '';
    }

    const youtubeVideoModal = document.getElementById('youtubeVideoModal');
    youtubeVideoModal?.querySelector('.youtube-video-modal-close')?.addEventListener('click', closeYouTubeModal);
    youtubeVideoModal?.addEventListener('click', event => {
        if (event.target === youtubeVideoModal) closeYouTubeModal();
    });

    async function loadYoutubeProjects() {
        const grid = document.getElementById('youtubeProjectsGrid');
        if (!grid) return;

        if (!isSectionVisible('clipShootings')) {
            grid.innerHTML = '<p class="youtube-projects-empty">Klip çekimleri bölümü şu anda yayında değil.</p>';
            return;
        }

        const projects = (currentSiteData.youtubeProjects || (typeof siteData !== 'undefined' ? siteData.youtubeProjects : []) || [])
            .map((project, index) => ({ ...project, _savedOrder: index }))
            .filter(project => project && (project.artist || project.song || project.title) && project.enabled !== false)
            .sort((a, b) => {
                const yearDifference = (Number.parseInt(b.year, 10) || 0) - (Number.parseInt(a.year, 10) || 0);
                return yearDifference || a._savedOrder - b._savedOrder;
            });
        grid.innerHTML = '';

        if (!projects.length) {
            grid.innerHTML = '<p class="youtube-projects-empty">Henüz klip çekimi eklenmedi.</p>';
            return;
        }

        for (const project of projects) {
            const article = document.createElement('article');
            article.className = 'youtube-project-card reveal active';
            const artistName = String(project.artist || project.title || '').trim();
            const songName = String(project.song || '').trim();
            const accessibleTitle = [artistName, songName].filter(Boolean).join(' — ');
            const projectUrl = safeExternalUrl(project.url);
            const videoId = extractYouTubeVideoId(projectUrl);
            const usesAutomaticThumbnail = !project.thumbnail && Boolean(videoId);
            const thumbnailReference = project.thumbnail || youtubeThumbnail(videoId);
            const thumbnail = await resolveMediaUrl(thumbnailReference);
            const hasPlayableMedia = Boolean(videoId);
            const cardTag = hasPlayableMedia ? 'button' : projectUrl ? 'a' : 'div';
            const linkAttributes = hasPlayableMedia
                ? `type="button" aria-label="${escapeHtml(accessibleTitle)} klibini sitede izle"`
                : projectUrl ? `href="${escapeHtml(projectUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(accessibleTitle)} klip çekimini aç"` : '';
            article.innerHTML = `
                <${cardTag} class="youtube-project-link" ${linkAttributes}>
                    <span class="youtube-project-media ${project.thumbnailFit === 'contain' && !usesAutomaticThumbnail ? 'is-contain' : ''} ${thumbnail ? '' : 'is-missing'}">
                        ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(accessibleTitle)}" loading="lazy" decoding="async"${usesAutomaticThumbnail ? ` data-youtube-video-id="${escapeHtml(videoId)}"` : ''}>` : ''}
                        <span class="youtube-project-placeholder"><i class="fab fa-youtube" aria-hidden="true"></i><small>${escapeHtml(accessibleTitle)}</small></span>
                        ${hasPlayableMedia ? '<span class="youtube-project-play"><i class="fas fa-play" aria-hidden="true"></i></span>' : ''}
                    </span>
                    <span class="youtube-project-info">
                        ${String(project.category || '').trim() ? `<small class="youtube-project-type">${escapeHtml(project.category)}</small>` : ''}
                        <strong>${escapeHtml(artistName)}</strong>
                        ${songName ? `<em>${escapeHtml(songName)}</em>` : ''}
                        <span><small>${escapeHtml(project.year || '')}</small><small>${videoId ? 'Sitede İzle' : projectUrl ? 'Videoyu Aç' : 'Yakında'}</small></span>
                    </span>
                </${cardTag}>
            `;
            const media = article.querySelector('.youtube-project-media');
            const image = article.querySelector('img');
            if (videoId) {
                article.querySelector('.youtube-project-link')?.addEventListener('click', () => openYouTubeModal(videoId, accessibleTitle));
            }
            image?.addEventListener('error', () => {
                const automaticVideoId = image.dataset.youtubeVideoId;
                if (automaticVideoId && image.dataset.thumbnailFallback !== 'true') {
                    image.dataset.thumbnailFallback = 'true';
                    image.src = youtubeThumbnail(automaticVideoId, 'hqdefault');
                    return;
                }
                media?.classList.add('is-missing');
            });
            grid.appendChild(article);
        }
    }

    async function loadCreativeProjects(containerId, dataKey, sectionKey, emptyText, fallbackCategory, isVideo = false) {
        const grid = document.getElementById(containerId);
        if (!grid) return;

        if (!isSectionVisible(sectionKey)) {
            grid.innerHTML = `<p class="creative-projects-empty">${escapeHtml(emptyText)} bölümü şu anda yayında değil.</p>`;
            return;
        }

        const items = (currentSiteData[dataKey] || (typeof siteData !== 'undefined' ? siteData[dataKey] : []) || [])
            .filter(item => item && item.title && item.enabled !== false);
        grid.innerHTML = '';

        if (!items.length) {
            grid.innerHTML = `<p class="creative-projects-empty">${escapeHtml(emptyText)} henüz eklenmedi.</p>`;
            return;
        }

        for (const [index, item] of items.entries()) {
            const projectUrl = safeExternalUrl(item.url);
            const videoId = isVideo ? extractYouTubeVideoId(projectUrl) : '';
            const automaticThumbnail = isVideo && !item.image && Boolean(videoId);
            const imageReference = item.image || youtubeThumbnail(videoId);
            const imageUrl = await resolveMediaUrl(imageReference);
            const hasPlayableMedia = isVideo && Boolean(item.videoFile || videoId);
            const card = document.createElement(hasPlayableMedia ? 'button' : isVideo && projectUrl ? 'a' : isVideo ? 'article' : 'button');
            card.className = 'creative-project-card reveal active';
            card.dataset.searchText = `${item.title || ''} ${item.category || ''} ${item.year || ''}`.toLocaleLowerCase('tr-TR');
            if (!isVideo) {
                card.type = 'button';
                card.setAttribute('aria-label', `${item.title} görselini büyüt`);
            } else if (hasPlayableMedia) {
                card.type = 'button';
                card.setAttribute('aria-label', `${item.title} videosunu sitede izle`);
            } else if (projectUrl) {
                card.href = projectUrl;
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
                card.setAttribute('aria-label', `${item.title} projesini aç`);
            }
            card.innerHTML = `
                <span class="creative-project-media ${imageUrl ? '' : 'is-missing'}">
                    ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}" loading="${index < 4 ? 'eager' : 'lazy'}" decoding="async"${automaticThumbnail ? ` data-youtube-video-id="${escapeHtml(videoId)}"` : ''}>` : ''}
                    <span class="creative-project-placeholder"><i class="fas ${isVideo ? 'fa-play' : 'fa-pen-ruler'}" aria-hidden="true"></i></span>
                    ${isVideo && String(item.category || '').trim() ? `<small class="creative-project-badge">${escapeHtml(item.category)}</small>` : ''}
                </span>
                <span class="creative-project-info">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${isVideo
                        ? `<small>${hasPlayableMedia || projectUrl ? 'Projeyi Aç' : ''}</small><small>${escapeHtml(item.year || '')}</small>`
                        : `<small>${escapeHtml(item.year || '')}</small><small>${imageUrl ? 'Büyüt' : ''}</small>`}
                    </span>
                </span>`;

            const media = card.querySelector('.creative-project-media');
            const image = card.querySelector('img');
            image?.addEventListener('error', () => {
                const automaticVideoId = image.dataset.youtubeVideoId;
                if (automaticVideoId && image.dataset.thumbnailFallback !== 'true') {
                    image.dataset.thumbnailFallback = 'true';
                    image.src = youtubeThumbnail(automaticVideoId, 'hqdefault');
                    return;
                }
                media?.classList.add('is-missing');
            });
            if (!isVideo && imageUrl) {
                card.addEventListener('click', () => openLightbox({
                    src: imageUrl,
                    title: item.title,
                    desc: item.year || ''
                }));
            } else if (item.videoFile) {
                card.addEventListener('click', () => openUploadedVideo(item.videoFile, item.title));
            } else if (videoId) {
                card.addEventListener('click', event => { event.preventDefault(); openYouTubeModal(videoId, item.title); });
            }
            grid.appendChild(card);
        }
    }

    async function setStoredImageSource(image, reference) {
        const source = await resolveMediaUrl(reference);
        if (!source) {
            image.remove();
            return;
        }
        image.src = source;
    }

    function createPartnerCard(partner, options = {}) {
        const partnerUrl = safeExternalUrl(partner.url);
        const element = document.createElement(partnerUrl ? 'a' : 'span');
        element.className = options.grid ? 'reference-logo-card' : 'partner-logo-card';
        if (partnerUrl) {
            element.href = partnerUrl;
            element.target = '_blank';
            element.rel = 'noopener noreferrer';
            element.setAttribute('aria-label', `${partner.name || 'Kurum'} web sitesini aç`);
        }

        if (partner.logo) {
            const image = document.createElement('img');
            image.alt = options.duplicate ? '' : `${partner.name || 'Kurum'} logosu`;
            image.loading = options.duplicate ? 'lazy' : 'eager';
            image.decoding = 'async';
            image.addEventListener('error', () => image.remove());
            setStoredImageSource(image, partner.logo);
            element.appendChild(image);
        }

        const name = document.createElement('strong');
        name.textContent = partner.name || 'Kurum';
        element.appendChild(name);
        return element;
    }

    function activePartners(homeOnly = false) {
        const seen = new Set();
        const partners = (currentSiteData.partners || (typeof siteData !== 'undefined' ? siteData.partners : []) || [])
            .filter(partner => partner && partner.enabled !== false && (!homeOnly || partner.homeFeatured === true) && (partner.logo || partner.name))
            .filter(partner => {
                const key = String(partner.id || `${partner.name}|${partner.logo}`);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        return homeOnly ? partners.slice(0, 8) : partners;
    }

    function loadPartnerLogos() {
        const track = document.getElementById('partnerLogoTrack');
        if (!track) return;

        const partners = activePartners(true);
        track.innerHTML = '';

        if (!partners.length) {
            track.innerHTML = '<p class="partner-logo-empty">Henüz kurum logosu eklenmedi.</p>';
            track.classList.add('is-empty');
            return;
        }

        track.classList.remove('is-empty');
        const repeatedPartners = [];
        const minimumItems = Math.max(6, partners.length);
        for (let index = 0; index < minimumItems; index += 1) {
            repeatedPartners.push(partners[index % partners.length]);
        }
        track.style.setProperty('--partner-duration', `${Math.max(26, repeatedPartners.length * 4.5)}s`);

        const createGroup = (isDuplicate = false) => {
            const group = document.createElement('div');
            group.className = 'brand-marquee-group partner-logo-group';
            if (isDuplicate) group.setAttribute('aria-hidden', 'true');

            repeatedPartners.forEach(partner => {
                group.appendChild(createPartnerCard(partner, { duplicate: isDuplicate }));
            });
            return group;
        };

        track.append(createGroup(), createGroup(true));
    }

    function loadReferences() {
        const grid = document.getElementById('referencesGrid');
        if (!grid) return;
        const partners = activePartners();
        grid.innerHTML = '';
        if (!partners.length) {
            grid.innerHTML = '<p class="partner-logo-empty">Henüz referans eklenmedi.</p>';
            return;
        }
        partners.forEach(partner => grid.appendChild(createPartnerCard(partner, { grid: true })));
    }

    function setupContentSearch({ inputId, clearId, emptyId, gridId, cardSelector, countId }) {
        const input = document.getElementById(inputId);
        const clear = document.getElementById(clearId);
        const empty = document.getElementById(emptyId);
        const grid = document.getElementById(gridId);
        if (!input || !grid) return;

        const filter = () => {
            const query = input.value.trim().toLocaleLowerCase('tr-TR');
            const cards = [...grid.querySelectorAll(cardSelector)];
            let visibleCount = 0;
            cards.forEach(card => {
                const searchText = card.dataset.searchText || card.textContent.toLocaleLowerCase('tr-TR');
                const matches = !query || searchText.includes(query);
                card.hidden = !matches;
                if (matches) visibleCount += 1;
            });
            if (clear) clear.hidden = !query;
            if (empty) empty.hidden = !query || visibleCount > 0;
            const count = countId ? document.getElementById(countId) : null;
            if (count) count.textContent = query ? `${visibleCount} sanatçı bulundu` : `${cards.length} sanatçı`;
        };

        input.addEventListener('input', filter);
        clear?.addEventListener('click', () => {
            input.value = '';
            filter();
            input.focus();
        });
        filter();
    }

    applyManagedMedia();
    applySectionVisibility();
    loadArtistDirectory();
    setupContentSearch({ inputId: 'artistSearchInput', clearId: 'artistSearchClear', emptyId: 'artistSearchEmpty', gridId: 'artistDirectory', cardSelector: '.artist-directory-card', countId: 'artistDirectoryCount' });
    loadArtistDetail();
    loadFeaturedArtists();
    loadYoutubeProjects();
    loadCreativeProjects('graphicDesignGrid', 'graphicProjects', 'graphicDesign', 'Grafik tasarım çalışmaları', 'Grafik Tasarım');
    loadCreativeProjects('videoClipsGrid', 'videoClips', 'videoClips', 'Video klipleri', '', true).then(() => {
        setupContentSearch({ inputId: 'videoClipSearchInput', clearId: 'videoClipSearchClear', emptyId: 'videoClipSearchEmpty', gridId: 'videoClipsGrid', cardSelector: '.creative-project-card' });
    });
    loadPartnerLogos();
    loadReferences();

    // ============================================
    // LIGHTBOX
    // ============================================
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');
    const lightboxClose = document.getElementById('lightboxClose');

    async function openLightbox(item) {
        if (!lightbox || !lightboxImage) return;

        const source = await resolveMediaUrl(item.src || item.image || '');
        if (!source) return;
        lightboxImage.src = source;
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
            if (youtubeVideoModal?.classList.contains('active')) {
                closeYouTubeModal();
            }
        }
    });

    // ============================================
    // CONTACT FORM
    // ============================================
    const contactForm = document.getElementById('contactForm');
    const projectTypes = Array.isArray(currentSiteData.contact?.projectTypes) && currentSiteData.contact.projectTypes.length
        ? currentSiteData.contact.projectTypes.map(value => String(value || '').trim()).filter(Boolean)
        : ['Konser Çekimi', 'Müzik Klibi', 'Etkinlik Çekimi', 'Diğer'];

    document.querySelectorAll('select[name="projectType"]').forEach(select => {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Proje Türü Seçin';
        select.replaceChildren(placeholder);
        projectTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            select.appendChild(option);
        });
    });

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerHTML;
            let phoneDigits = String(currentSiteData.contact?.whatsapp || currentSiteData.contact?.phone || '').replace(/\D/g, '').replace(/^0+/, '');
            if (phoneDigits.length === 10) phoneDigits = `90${phoneDigits}`;
            if (phoneDigits.length < 10) {
                window.alert('WhatsApp telefon numarası henüz ayarlanmamış.');
                return;
            }

            const formData = new FormData(contactForm);
            const projectSelect = contactForm.querySelector('[name="projectType"]');
            const projectLabel = projectSelect?.selectedOptions?.[0]?.textContent?.trim() || 'Belirtilmedi';
            const message = [
                'Merhaba Les Mejor Creative,',
                '',
                'Yeni proje talebi:',
                `Ad Soyad: ${formData.get('name') || ''}`,
                `Firma İsmi: ${formData.get('company') || ''}`,
                `Telefon: ${formData.get('phone') || ''}`,
                `Proje Türü: ${projectLabel}`,
                `Proje Detayı: ${formData.get('message') || ''}`
            ].join('\n');
            window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            btn.innerHTML = '<i class="fab fa-whatsapp"></i> WhatsApp Açıldı';
            btn.style.background = '#25d366';
            contactForm.reset();
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2600);
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
