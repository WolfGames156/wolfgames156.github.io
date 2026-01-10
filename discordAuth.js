/**
 * Discord Authentication Module for Zoream (Static Site)
 * Uses Implicit Grant Flow (Client-Side Only)
 */

const CONFIG = {
    CLIENT_ID: "1385990402229669938",
    REDIRECT_URI: window.location.origin + window.location.pathname, // Dynamic
    GUILD_ID: "1345444426239180850",
    SCOPE: "identify guilds",
};

// Auto-detect current URL for Redirect (Root Only as requested, WITH trailing slash)
const REDIRECT_URL = window.location.origin + '/'; 

export const DiscordAuth = {
    user: null,
    token: null,

    t(key) {
        const lang = localStorage.getItem('zoream_language') || 'tr';
        return window.translations?.[lang]?.[key] || key;
    },

    init() {
        this.token = localStorage.getItem('discord_access_token');
        
        let hasValidCache = false;

        // 🚀 Cache Check (Prevent flickering & unnecessary requests)
        const cachedUser = localStorage.getItem('zoream_user_cache');
        if (cachedUser) {
            try {
                this.user = JSON.parse(cachedUser);
                this.updateUI(); // Render immediately with cached data
                
                // If we have data, we assume it's valid for this session.
                // We'll avoid re-fetching immediately to prevent rate limits.
                hasValidCache = !!this.user;
            } catch (e) {
                console.error('Cache parse error', e);
                localStorage.removeItem('zoream_user_cache');
            }
        }

        if (this.token) {
            // Only re-fetch if we don't have valid cache OR if we want to ensure freshness.
            // But to prevent random "logouts" due to network/rate-limits, we prioritize cache.
            if (!hasValidCache) {
                this.fetchUserProfile();
            }
        } else {
            // No token, ensure UI reflects "logged out" state unless we have some stray cache (which shouldn't happen)
            if (!this.user) this.updateUI(); 
        }
        
        this.checkCallback();
        this.checkInviteParam();
    },

    login() {
        console.log("Redirecting to Discord with URI:", REDIRECT_URL);
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&response_type=token&scope=${encodeURIComponent(CONFIG.SCOPE)}&prompt=consent`;
        window.location.href = authUrl;
    },

    logout() {
        localStorage.removeItem('discord_access_token');
        localStorage.removeItem('zoream_user_cache');
        this.user = null;
        this.token = null;
        window.location.reload();
    },

    checkCallback() {
        // Parse hash for access_token
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');

        if (accessToken) {
            localStorage.setItem('discord_access_token', accessToken);
            this.token = accessToken;
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Force fetch on fresh login
            this.fetchUserProfile();
        }
    },

    async fetchUserProfile() {
        if (!this.token) return;

        try {
            // 1. Fetch User Data
            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${this.token}` }
            });

            if (userRes.status === 401) {
                // Token invalid/expired -> Logout
                throw new Error('Unauthorized');
            }
            if (!userRes.ok) {
                // Other error (429, 500) -> Keep existing/cached user if available, don't logout
                console.warn('User fetch failed (Rate limit/Network), using fallback if available.');
                return;
            }

            const userData = await userRes.json();
            this.user = userData;

            // 2. Check Guild Membership
            const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            
            if (guildsRes.ok) {
                const guilds = await guildsRes.json();
                this.user.isMember = guilds.some(g => g.id === CONFIG.GUILD_ID);
            } else {
                // If guilds fetch fails, don't overwrite if we already had a value, or default false
                this.user.isMember = this.user.isMember || false;
            }

            // Save to Cache (Update with fresh data)
            localStorage.setItem('zoream_user_cache', JSON.stringify(this.user));

            this.updateUI();

        } catch (error) {
            console.error('Auth Error:', error);
            if (error.message === 'Unauthorized') {
                this.logout(); 
            }
            // For other errors, do nothing (stay logged in with potentially old data)
        }
    },

    updateUI() {
        const loginContainer = document.getElementById('user-profile-container');
        if (!loginContainer) return; // Only if element exists

        if (this.user) {
            const avatarUrl = this.user.avatar 
                ? `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png` 
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(this.user.discriminator) % 5}.png`;

            // Translate Status
            // status_member / status_guest should be in translations.js
            const statusKey = this.user.isMember ? 'status_member' : 'status_guest';
            const statusText = this.t(statusKey) || (this.user.isMember ? 'Sunucu Üyesi' : 'Misafir');
            const statusClass = this.user.isMember ? 'status-member' : 'status-guest';

            loginContainer.innerHTML = `
    <div class="user-profile">
        <img src="${avatarUrl}" class="user-avatar" alt="Profile">

        <div class="user-info">
            <span class="user-name">${this.user.username}</span>
            <span class="user-status ${statusClass}">${statusText}</span>
        </div>

        <div class="user-dropdown">
            <div class="user-dropdown-item" id="copy-invite">
                <i class="fas fa-link"></i> ${this.t('auth_copy_invite')}
            </div>
            <div class="user-dropdown-item logout" id="logout-btn">
                <i class="fas fa-sign-out-alt"></i> ${this.t('auth_logout')}
            </div>
        </div>
    </div>
`;

            // Mobile Toggle Support
            const profileBtn = loginContainer.querySelector('.user-profile');
            const dropdown = loginContainer.querySelector('.user-dropdown');
            
            profileBtn.addEventListener('click', (e) => {
                // Ignore clicks on children (like buttons) to prevent double-firing if needed
                if (!e.target.closest('.user-dropdown-item')) {
                     dropdown.classList.toggle('active');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!loginContainer.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });

            // Add Event Listeners
            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault(); // Stop bubbling
                this.logout();
            });
            document.getElementById('copy-invite').addEventListener('click', (e) => {
                e.preventDefault();
                this.copyInviteLink();
            });

        } else {
            // Login Button
            const loginText = this.t('login_discord') || 'Discord ile Giriş';
            loginContainer.innerHTML = `
                <button id="login-btn" class="login-btn">
                    <i class="fab fa-discord"></i> ${loginText}
                </button>
            `;
            document.getElementById('login-btn').addEventListener('click', () => this.login());
        }
    },

    copyInviteLink() {
        if (!this.user) return;
        const link = `${window.location.origin}?inviter=${this.user.id}`;
        navigator.clipboard.writeText(link).then(() => {
            const copyText = this.t('download_copy_success') || 'Kopyalandı!';
            alert(copyText);
        }).catch(err => {
            console.error('Copy failed', err);
            prompt("Copy Link:", link); // Fallback
        });
    },



    async checkInviteParam() {
        // 1. Check for Server-Side Injected Data (Fastest, SEO-friendly)
        if (window.ZOREAM_INVITER) {
            this.showInviteModal(window.ZOREAM_INVITER);
            return;
        }

        // 2. Fallback to Internal API (If middleware didn't run or failed)
        const params = new URLSearchParams(window.location.search);
        const inviterId = params.get('inviter');

        if (inviterId) {
            try {
                // Fetch from our own secure backend function
                const res = await fetch(`/invite?id=${inviterId}`);
                if (res.ok) {
                    const inviter = await res.json();
                    if (inviter.id) {
                        this.showInviteModal(inviter);
                    }
                } else {
                    console.warn('Invite lookup failed:', res.statusText);
                }
            } catch (error) {
                console.error('Invite API error:', error);
            }
        }
    },

    showInviteModal(inviter) {
        // Create Modal HTML
        const modal = document.createElement('div');
        modal.className = 'invite-modal-overlay';
        
        const avatarUrl = inviter.avatar 
            ? `https://cdn.discordapp.com/avatars/${inviter.id}/${inviter.avatar}.png` 
            : `https://cdn.discordapp.com/embed/avatars/0.png`;

        modal.innerHTML = `
            <div class="invite-modal">
                <div class="inviter-profile">
                    <img src="${avatarUrl}" alt="${inviter.username}">
                </div>
                <h2>${this.t('invite_modal_title')}</h2>
                <p>${this.t('invite_modal_desc').replace('{username}', inviter.username)}</p>
                <button class="invite-accept-btn">${this.t('invite_modal_btn')}</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on click and Redirect
        modal.querySelector('.invite-accept-btn').addEventListener('click', () => {
            modal.remove();
            // Remove param from URL
            const url = new URL(window.location);
            url.searchParams.delete('inviter');
            window.history.replaceState({}, '', url);
            
            // Redirect to Download Page
            window.location.href = 'indir.html';
        });
    }
};

