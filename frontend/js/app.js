/* app.js — Application logic + Google Maps */

let map;
let markers       = [];
let infoWindows   = [];
let allCafes      = [];
let favorites     = new Set();   // set of place_ids
let favoritesData = [];          // full favourite objects from API

// ── Initialise Map ────────────────────────────────────────────────────────────
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -33.8688, lng: 151.2093 },
        zoom: 12,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
    });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const isGuest = sessionStorage.getItem('cafespot_guest') === 'true';

    // Set username in header
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = isGuest ? 'Guest' : (Auth.getUsername() || '');

    // Load favourites for logged-in users
    if (!isGuest && Auth.isLoggedIn()) {
        await loadFavorites();
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', Auth.logout);

    // Search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) searchForm.addEventListener('submit', handleSearch);

    // Autocomplete
    const suburbInput = document.getElementById('suburbInput');
    if (suburbInput) {
        let acTimer;
        suburbInput.addEventListener('input', () => {
            clearTimeout(acTimer);
            const val = suburbInput.value.trim();
            if (val.length < 2) { hideAutocomplete(); return; }
            acTimer = setTimeout(() => fetchAutocomplete(val), 300);
        });
        suburbInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') hideAutocomplete();
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('.search-box')) hideAutocomplete();
        });
    }

    // Filters — re-render on change
    ['filterOpen', 'filterRating', 'filterPrice'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderFilteredCafes);
    });

    // Favourites dropdown toggle
    setupFavDropdown();
});

// ── Favourites Dropdown ───────────────────────────────────────────────────────
function setupFavDropdown() {
    const btn      = document.getElementById('favToggle');
    const dropdown = document.getElementById('favDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        if (isOpen) {
            closeFavDropdown();
        } else {
            openFavDropdown();
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.fav-dropdown-wrapper')) {
            closeFavDropdown();
        }
    });
}

function openFavDropdown() {
    const dropdown = document.getElementById('favDropdown');
    if (!dropdown) return;
    renderFavDropdownList();
    dropdown.classList.add('open');
}

function closeFavDropdown() {
    const dropdown = document.getElementById('favDropdown');
    if (dropdown) dropdown.classList.remove('open');
}

function renderFavDropdownList() {
    const list = document.getElementById('favDropdownList');
    if (!list) return;

    if (sessionStorage.getItem('cafespot_guest') === 'true') {
        list.innerHTML = '<p class="fav-dd-empty">Sign in to save favourites.</p>';
        return;
    }

    if (favoritesData.length === 0) {
        list.innerHTML = '<p class="fav-dd-empty">No saved cafes yet.<br>Tap ❤️ on a cafe to save it.</p>';
        return;
    }

    list.innerHTML = favoritesData.map(fav => `
        <div class="fav-dd-item" data-place-id="${fav.place_id}">
            <div class="fav-dd-info">
                <span class="fav-dd-name">${fav.name || 'Unknown'}</span>
                <span class="fav-dd-addr">${fav.vicinity || ''}</span>
                ${fav.rating ? `<span class="fav-dd-rating">★ ${fav.rating}</span>` : ''}
            </div>
            <button class="fav-dd-remove" data-place-id="${fav.place_id}" title="Remove">✕</button>
        </div>
    `).join('');

    // Click on the item row → close dropdown and open detail modal
    list.querySelectorAll('.fav-dd-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if the remove button was clicked
            if (e.target.closest('.fav-dd-remove')) return;
            const pid = item.dataset.placeId;
            closeFavDropdown();
            openDetailModal(pid);
        });
    });

    // Click on remove button → remove from favourites
    list.querySelectorAll('.fav-dd-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const pid = btn.dataset.placeId;
            await toggleFavorite(pid, null);
        });
    });
}

// ── Load Favourites from API ──────────────────────────────────────────────────
async function loadFavorites() {
    try {
        const data    = await API.getFavorites();
        favoritesData = data.favorites || [];
        favorites     = new Set(favoritesData.map(f => f.place_id));
        updateFavCount();
    } catch (e) {
        console.error('Could not load favourites', e);
    }
}

function updateFavCount() {
    const badge = document.getElementById('favCount');
    if (badge) badge.textContent = favorites.size > 0 ? favorites.size : '';
}

// ── Toggle Favourite ──────────────────────────────────────────────────────────
async function toggleFavorite(place_id, cafeData) {
    const isGuest = sessionStorage.getItem('cafespot_guest') === 'true';
    if (isGuest || !Auth.isLoggedIn()) {
        UI.toast('Sign in to save favourites', 'info');
        return;
    }

    try {
        if (favorites.has(place_id)) {
            await API.removeFavorite(place_id);
            favorites.delete(place_id);
            favoritesData = favoritesData.filter(f => f.place_id !== place_id);
            UI.toast('Removed from favourites', 'info');
        } else {
            if (!cafeData) {
                cafeData = allCafes.find(c => c.place_id === place_id) || { place_id };
            }
            await API.addFavorite(cafeData);
            favorites.add(place_id);
            favoritesData.unshift(cafeData);
            UI.toast('Added to favourites ❤️', 'success');
        }
        updateFavCount();
        updateFavButtonsInGrid(place_id);
        // If dropdown is open, re-render it
        if (document.getElementById('favDropdown')?.classList.contains('open')) {
            renderFavDropdownList();
        }
    } catch (err) {
        UI.toast('Something went wrong', 'error');
    }
}

function updateFavButtonsInGrid(place_id) {
    document.querySelectorAll(`.fav-btn[data-place-id="${place_id}"]`).forEach(btn => {
        btn.textContent = favorites.has(place_id) ? '❤️' : '🤍';
        btn.title = favorites.has(place_id) ? 'Remove from favourites' : 'Add to favourites';
    });
}

// ── Autocomplete ──────────────────────────────────────────────────────────────
async function fetchAutocomplete(input) {
    try {
        const data        = await API.autocomplete(input);
        const predictions = data.predictions || [];
        const dropdown    = document.getElementById('autocompleteDropdown');
        if (!dropdown) return;

        if (predictions.length === 0) { hideAutocomplete(); return; }

        dropdown.innerHTML = '';
        predictions.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.description;
            li.addEventListener('click', () => {
                document.getElementById('suburbInput').value = p.description;
                hideAutocomplete();
                document.getElementById('searchForm').requestSubmit();
            });
            dropdown.appendChild(li);
        });
        dropdown.hidden = false;
    } catch (e) { hideAutocomplete(); }
}

function hideAutocomplete() {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown) dropdown.hidden = true;
}

// ── Search ────────────────────────────────────────────────────────────────────
async function handleSearch(e) {
    e.preventDefault();
    const input   = document.getElementById('suburbInput').value.trim();
    const searchBtn = document.getElementById('searchBtn');
    if (!input) return;
    hideAutocomplete();

    searchBtn.disabled = true;
    searchBtn.innerHTML = '<span class="spinner"></span> Searching...';
    setResultsCount('');
    clearMarkers();

    try {
        const geo = await API.geocode(input);
        if (!geo.valid) {
            UI.toast(geo.error || 'Suburb not found', 'error');
            return;
        }

        if (map) map.setCenter({ lat: geo.lat, lng: geo.lng });

        const cafesData = await API.searchCafes(geo.lat, geo.lng);
        let cafes       = cafesData.cafes || [];

        if (cafes.length === 0) {
            setResultsCount('No cafes found nearby.');
            document.getElementById('resultsGrid').innerHTML =
                '<div class="empty-state"><div class="empty-icon">☕</div><p>No cafes found in this area.</p></div>';
            return;
        }

        // Get distances
        const place_ids   = cafes.map(c => c.place_id);
        const distData    = await API.getDistances(geo.lat, geo.lng, place_ids);
        const distMap     = {};
        (distData.distances || []).forEach(d => { distMap[d.place_id] = d; });

        cafes = cafes.map(c => ({
            ...c,
            distance_text:  distMap[c.place_id]?.distance_text  || null,
            duration_text:  distMap[c.place_id]?.duration_text  || null,
            distance_value: distMap[c.place_id]?.distance_value ?? 999999,
        }));

        cafes.sort((a, b) => a.distance_value - b.distance_value);
        allCafes = cafes;

        renderFilteredCafes();
        placeMarkers(cafes);
    } catch (err) {
        UI.toast('Search failed. Please try again.', 'error');
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = 'Find Cafes';
    }
}

// ── Filters ───────────────────────────────────────────────────────────────────
function renderFilteredCafes() {
    const openOnly  = document.getElementById('filterOpen')?.checked;
    const minRating = parseFloat(document.getElementById('filterRating')?.value || '0');
    const maxPrice  = parseInt(document.getElementById('filterPrice')?.value || '4', 10);

    let cafes = allCafes.filter(c => {
        if (openOnly  && c.open_now !== true) return false;
        if (c.rating  && c.rating < minRating) return false;
        if (c.price_level != null && c.price_level > maxPrice - 1) return false;
        return true;
    });

    setResultsCount(cafes.length > 0 ? `${cafes.length} cafe${cafes.length !== 1 ? 's' : ''} found` : 'No cafes match filters');
    renderCafes(cafes);
}

function setResultsCount(text) {
    const el = document.getElementById('resultsCount');
    if (el) el.textContent = text;
}

// ── Render Cafes ──────────────────────────────────────────────────────────────
function renderCafes(cafes) {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (cafes.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">☕</div><p>No cafes match your filters.</p></div>';
        return;
    }

    cafes.forEach((cafe, i) => {
        const isFav = favorites.has(cafe.place_id);
        const card  = UI.renderCafeCard(cafe, i + 1, isFav);

        card.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(cafe.place_id, cafe);
        });

        card.querySelector('.btn-details').addEventListener('click', (e) => {
            e.stopPropagation();
            openDetailModal(cafe.place_id);
        });

        card.addEventListener('click', () => {
            if (map && cafe.lat && cafe.lng) {
                map.setCenter({ lat: cafe.lat, lng: cafe.lng });
                map.setZoom(16);
                const markerIdx = allCafes.indexOf(cafe);
                if (infoWindows[markerIdx]) {
                    infoWindows.forEach(iw => iw.close());
                    infoWindows[markerIdx].open(map, markers[markerIdx]);
                }
            }
        });

        grid.appendChild(card);
    });
}

// ── Map Markers ───────────────────────────────────────────────────────────────
function placeMarkers(cafes) {
    clearMarkers();
    cafes.forEach((cafe, i) => {
        if (!cafe.lat || !cafe.lng) return;

        const marker = new google.maps.Marker({
            position: { lat: cafe.lat, lng: cafe.lng },
            map,
            label: { text: String(i + 1), color: '#fff', fontWeight: 'bold', fontSize: '12px' },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 16,
                fillColor: '#b5743a',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
            },
            title: cafe.name,
        });

        const iw = new google.maps.InfoWindow({
            content: `<strong>${cafe.name}</strong><br>${cafe.vicinity || ''}`
                   + (cafe.rating ? `<br>★ ${cafe.rating}` : ''),
        });

        marker.addListener('click', () => {
            infoWindows.forEach(w => w.close());
            iw.open(map, marker);
        });

        markers.push(marker);
        infoWindows.push(iw);
    });
}

function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers      = [];
    infoWindows  = [];
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
async function openDetailModal(place_id) {
    const container = document.getElementById('modalContainer');
    container.hidden = false;
    container.innerHTML = '<div class="modal-overlay"><div class="modal-box"><div class="modal-loading">Loading...</div></div></div>';

    try {
        const details = await API.getDetails(place_id);
        const isFav   = favorites.has(place_id);

        // Look up cafe in search results first, then fall back to favourites data
        const cafe = allCafes.find(c => c.place_id === place_id)
                  || favoritesData.find(f => f.place_id === place_id)
                  || null;

        container.innerHTML = UI.renderDetailModal(details, place_id, isFav);

        // Street View
        if (details.geometry?.location) {
            const { lat, lng } = details.geometry.location;
            const svArea = document.getElementById('streetviewArea');
            const svImg  = new Image();
            svImg.className = 'streetview-img';
            svImg.src = `${CONFIG.API_BASE}/api/streetview?lat=${lat}&lng=${lng}&width=600&height=200`;
            svImg.onload  = () => { if (svArea) { svArea.innerHTML = ''; svArea.appendChild(svImg); } };
            svImg.onerror = () => { if (svArea) svArea.style.display = 'none'; };
        } else {
            const svArea = document.getElementById('streetviewArea');
            if (svArea) svArea.style.display = 'none';
        }

        // Close modal
        document.getElementById('modalClose').addEventListener('click', closeModal);
        container.querySelector('.modal-overlay').addEventListener('click', e => {
            if (e.target === e.currentTarget) closeModal();
        });
        document.addEventListener('keydown', escClose);

        // Fav button in modal
        const favBtnModal = container.querySelector('.fav-btn-modal');
        if (favBtnModal) {
            favBtnModal.addEventListener('click', async () => {
                await toggleFavorite(place_id, cafe);
                favBtnModal.textContent = favorites.has(place_id) ? '❤️ Remove Favourite' : '🤍 Add to Favourites';
            });
        }
    } catch (err) {
        container.innerHTML = '';
        container.hidden = true;
        UI.toast('Could not load cafe details', 'error');
    }
}

function closeModal() {
    const container = document.getElementById('modalContainer');
    container.innerHTML = '';
    container.hidden = true;
    document.removeEventListener('keydown', escClose);
}

function escClose(e) {
    if (e.key === 'Escape') closeModal();
}
