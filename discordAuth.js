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
        if (this.token) {
            this.fetchUserProfile();
        } else {
            this.updateUI(); // Render Login Button for guests
        }
        this.checkCallback();
        this.checkInviteParam();
    },

    login() {
        console.log("Redirecting to Discord with URI:", REDIRECT_URL);
        // Implicit Grant Flow URL
        // FIX: Discord API REQUIRES 'redirect_uri'. 'redirect_url' is wrong and causes the localhost:5000 bug.
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&response_type=token&scope=${encodeURIComponent(CONFIG.SCOPE)}&prompt=consent`;
        
        window.location.href = authUrl;
    },

    logout() {
        localStorage.removeItem('discord_access_token');
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

            if (!userRes.ok) throw new Error('Failed to fetch user');
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
                this.user.isMember = false;
            }

            this.updateUI();

        } catch (error) {
            console.error('Auth Error:', error);
            this.logout(); // Token likely invalid
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
                    <div class="user-info">
                        <span class="user-name">${this.user.username}</span>
                        <span class="user-status ${statusClass}">${statusText}</span>
                    </div>
                    <img src="${avatarUrl}" class="user-avatar" alt="Profile">
                    <div class="user-dropdown">
                        <div class="user-dropdown-item" id="copy-invite">
                            <i class="fas fa-link"></i> Davet Linki Kopyala
                        </div>
                        <div class="user-dropdown-item logout" id="logout-btn">
                            <i class="fas fa-sign-out-alt"></i> Çıkış Yap
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
        const params = new URLSearchParams(window.location.search);
        const inviterId = params.get('inviter');

        if (inviterId) {
            try {
                // Use Lanyard to get Inviter Info (Public API, no token needed)
                const res = await fetch(`https://api.lanyard.rest/v1/users/${inviterId}`);
                const data = await res.json();

                if (data.success) {
                    const inviter = data.data.discord_user;
                    this.showInviteModal(inviter);
                }
            } catch (error) {
                console.error('Invite lookup failed:', error);
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
