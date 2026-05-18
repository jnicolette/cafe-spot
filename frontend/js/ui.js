/* ui.js — DOM rendering helpers */
const UI = (() => {

    // ── Toast ─────────────────────────────────────────────────────────────────
    function toast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    // ── Stars ─────────────────────────────────────────────────────────────────
    function renderStars(rating) {
        if (!rating) return '';
        const full  = Math.floor(rating);
        const half  = rating - full >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    }

    // ── Price ─────────────────────────────────────────────────────────────────
    function priceLevel(level) {
        if (level === null || level === undefined) return '';
        return '$'.repeat(level + 1);
    }

    // ── Cafe Card ─────────────────────────────────────────────────────────────
    function renderCafeCard(cafe, rank, isFav) {
        const photo = cafe.photo_reference
            ? `<img class="cafe-photo" src="${API.photoUrl(cafe.photo_reference)}" alt="${cafe.name}" loading="lazy" onerror="this.style.display='none'">`
            : '';

        const ratingHtml = cafe.rating
            ? `<span class="stars">${renderStars(cafe.rating)}</span>
               <span class="rating-num">${cafe.rating}</span>
               <span class="review-count">(${(cafe.user_ratings_total || 0).toLocaleString()})</span>`
            : `<span class="no-rating">No rating</span>`;

        const openBadge = cafe.open_now === true
            ? `<span class="badge badge-open">Open</span>`
            : cafe.open_now === false
                ? `<span class="badge badge-closed">Closed</span>`
                : '';

        const price = cafe.price_level != null
            ? `<span class="price-badge">${priceLevel(cafe.price_level)}</span>`
            : '';

        const distance = cafe.distance_text
            ? `<span class="distance">📍 ${cafe.distance_text} · ${cafe.duration_text}</span>`
            : '';

        const favIcon = isFav ? '❤️' : '🤍';

        const card = document.createElement('div');
        card.className = 'cafe-card';
        card.dataset.placeId = cafe.place_id;
        card.innerHTML = `
            <span class="cafe-rank">#${rank}</span>
            <button class="fav-btn" data-place-id="${cafe.place_id}" title="${isFav ? 'Remove from favourites' : 'Add to favourites'}">${favIcon}</button>
            ${photo}
            <div class="cafe-body">
                <div class="cafe-name">${cafe.name}</div>
                <div class="cafe-address">${cafe.vicinity || ''}</div>
                <div class="cafe-meta">
                    ${ratingHtml}
                    ${price}
                    ${openBadge}
                </div>
                ${distance}
                <button class="btn-details" data-place-id="${cafe.place_id}">View Details</button>
            </div>
        `;
        return card;
    }

    // ── Detail Modal ──────────────────────────────────────────────────────────
    function renderDetailModal(details, place_id, isFav) {
        const photos = (details.photos || []).slice(0, 3).map(p =>
            `<img class="detail-photo" src="${API.photoUrl(p.photo_reference, 600)}" alt="Photo" loading="lazy">`
        ).join('');

        const hoursHtml = details.opening_hours?.weekday_text?.length
            ? `<div class="modal-hours">
                <h4>Opening Hours</h4>
                <ul>${details.opening_hours.weekday_text.map(h => `<li>${h}</li>`).join('')}</ul>
               </div>`
            : '';

        const reviewsHtml = (details.reviews || []).slice(0, 3).map(r => `
            <div class="review">
                <div class="review-header">
                    <strong>${r.author_name}</strong>
                    <span class="review-stars">${renderStars(r.rating)}</span>
                    <span class="review-time">${r.relative_time_description}</span>
                </div>
                <p>${r.text || ''}</p>
            </div>
        `).join('');

        const phoneHtml = details.formatted_phone_number
            ? `<a href="tel:${details.formatted_phone_number}" class="modal-link">${details.formatted_phone_number}</a>` : '';
        const websiteHtml = details.website
            ? `<a href="${details.website}" target="_blank" rel="noopener" class="modal-link">Website ↗</a>` : '';
        const ratingHtml = details.rating
            ? `<span class="stars">${renderStars(details.rating)}</span> <strong>${details.rating}</strong> (${(details.user_ratings_total || 0).toLocaleString()} reviews)` : '';

        const favIcon = isFav ? '❤️ Remove Favourite' : '🤍 Add to Favourites';

        return `
            <div class="modal-overlay" id="detailModal">
                <div class="modal-box">
                    <button class="modal-close" id="modalClose">✕</button>
                    <div class="modal-photos">${photos}</div>
                    <div class="modal-streetview" id="streetviewArea">
                        <div class="no-streetview">Loading Street View...</div>
                    </div>
                    <div class="modal-content">
                        <h2>${details.name || 'Cafe'}</h2>
                        <p class="modal-address">${details.formatted_address || ''}</p>
                        <div class="modal-meta">
                            ${ratingHtml}
                            ${details.price_level != null ? `<span class="price-badge">${priceLevel(details.price_level)}</span>` : ''}
                            ${phoneHtml}
                            ${websiteHtml}
                        </div>
                        ${hoursHtml}
                        <button class="fav-btn-modal btn-details" data-place-id="${place_id}" style="margin-bottom:16px">${favIcon}</button>
                        ${reviewsHtml ? `<div class="modal-reviews"><h4>Reviews</h4>${reviewsHtml}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    return { toast, renderStars, priceLevel, renderCafeCard, renderDetailModal };
})();
