(function () {
    const trLowerMap = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };

    function slugify(value = '') {
        return String(value)
            .split('')
            .map(char => trLowerMap[char] || char)
            .join('')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'sanatci';
    }

    function normalizeImage(image, index, artistName) {
        return {
            id: image?.id ?? `photo-${Date.now()}-${index}`,
            src: image?.src || '',
            title: image?.title || artistName || '',
            desc: image?.desc || image?.description || ''
        };
    }

    function normalizeConcert(concert, index, artist) {
        const images = Array.isArray(concert?.images) ? concert.images : [];
        return {
            id: concert?.id ?? `concert-${artist.id}-${index + 1}`,
            name: concert?.name || concert?.concertName || `Konser ${index + 1}`,
            date: concert?.date || '',
            venue: concert?.venue || '',
            cover: concert?.cover || images[0]?.src || artist.cover || '',
            videoLabel: concert?.videoLabel || concert?.actionText || 'Konser Çekimine Git',
            videoUrl: concert?.videoUrl || concert?.actionUrl || '',
            videoEnabled: concert?.videoEnabled !== false,
            images: images.map((image, imageIndex) => normalizeImage(image, imageIndex, artist.name))
        };
    }

    function normalizeArtist(artist, index = 0) {
        const normalized = {
            id: artist?.id ?? `artist-${Date.now()}-${index}`,
            slug: artist?.slug || slugify(artist?.name || `sanatci-${index + 1}`),
            name: artist?.name || `Sanatçı ${index + 1}`,
            bio: artist?.bio || '',
            cover: artist?.cover || '',
            visible: artist?.visible !== false,
            featured: artist?.featured !== false,
            featuredOrder: Number.isFinite(Number(artist?.featuredOrder)) ? Number(artist.featuredOrder) : index,
            concerts: []
        };

        if (Array.isArray(artist?.concerts)) {
            normalized.concerts = artist.concerts.map((concert, concertIndex) => normalizeConcert(concert, concertIndex, normalized));
        } else if (artist?.concertName || artist?.actionUrl || (artist?.images && artist.images.length)) {
            normalized.concerts = [normalizeConcert({
                id: `concert-${normalized.id}-1`,
                name: artist.concertName || 'Konser Çekimi',
                venue: artist.concertName || '',
                cover: artist.cover,
                videoLabel: artist.actionText,
                videoUrl: artist.actionUrl,
                images: artist.images || []
            }, 0, normalized)];
        }

        return normalized;
    }

    function normalizeArtists(artists) {
        return (Array.isArray(artists) ? artists : []).map(normalizeArtist);
    }

    function sortArtists(artists) {
        return [...normalizeArtists(artists)].sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
    }

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>'"]/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[char]));
    }

    window.SiteDataUtils = { slugify, normalizeArtists, normalizeArtist, normalizeConcert, sortArtists, escapeHtml };
})();
