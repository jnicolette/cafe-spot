/* auth.js — JWT login / register / logout */
const Auth = (() => {
    const TOKEN_KEY    = 'cafespot_token';
    const USERNAME_KEY = 'cafespot_username';
    const EMAIL_KEY    = 'cafespot_email';

    function getToken()    { return localStorage.getItem(TOKEN_KEY); }
    function getUsername() { return localStorage.getItem(USERNAME_KEY); }
    function getEmail()    { return localStorage.getItem(EMAIL_KEY); }
    function isLoggedIn()  { return !!getToken(); }

    function saveSession(data) {
        localStorage.setItem(TOKEN_KEY,    data.token);
        localStorage.setItem(USERNAME_KEY, data.username);
        localStorage.setItem(EMAIL_KEY,    data.email);
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(EMAIL_KEY);
        sessionStorage.removeItem('cafespot_guest');
    }

    async function register(username, email, password) {
        const res = await fetch(`${CONFIG.API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        saveSession(data);
        return data;
    }

    async function login(email, password) {
        const res = await fetch(`${CONFIG.API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        saveSession(data);
        return data;
    }

    function logout() {
        clearSession();
        window.location.href = '/index.html';
    }

    function authHeaders() {
        const token = getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    return { register, login, logout, isLoggedIn, getToken, getUsername, getEmail, authHeaders };
})();
