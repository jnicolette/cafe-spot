/* api.js — All backend API calls */
const API = (() => {

    async function geocode(suburb) {
        const res = await fetch(`${CONFIG.API_BASE}/api/geocode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suburb }),
        });
        return res.json();
    }

    async function searchCafes(lat, lng, radius = 5000) {
        const res = await fetch(`${CONFIG.API_BASE}/api/cafes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng, radius }),
        });
        return res.json();
    }

    async function getDistances(origin_lat, origin_lng, place_ids) {
        const res = await fetch(`${CONFIG.API_BASE}/api/distances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin_lat, origin_lng, place_ids }),
        });
        return res.json();
    }

    async function getDetails(place_id) {
        const res = await fetch(`${CONFIG.API_BASE}/api/details/${place_id}`);
        return res.json();
    }

    function photoUrl(ref, maxwidth = 400) {
        return `${CONFIG.API_BASE}/api/photo?ref=${encodeURIComponent(ref)}&maxwidth=${maxwidth}`;
    }

    async function autocomplete(input) {
        const res = await fetch(`${CONFIG.API_BASE}/api/autocomplete?input=${encodeURIComponent(input)}`);
        return res.json();
    }

    async function getFavorites() {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites`, {
            headers: Auth.authHeaders(),
        });
        if (!res.ok) return { favorites: [] };
        return res.json();
    }

    async function addFavorite(cafe) {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...Auth.authHeaders() },
            body: JSON.stringify({
                place_id: cafe.place_id,
                name:     cafe.name,
                vicinity: cafe.vicinity,
                rating:   cafe.rating,
                lat:      cafe.lat,
                lng:      cafe.lng,
            }),
        });
        return res.json();
    }

    async function removeFavorite(place_id) {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites/${encodeURIComponent(place_id)}`, {
            method: 'DELETE',
            headers: Auth.authHeaders(),
        });
        return res.json();
    }

    return { geocode, searchCafes, getDistances, getDetails, photoUrl, autocomplete, getFavorites, addFavorite, removeFavorite };
})();
