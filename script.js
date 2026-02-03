import { DiscordAuth } from './discordAuth.js';

// Mobile menu toggle & Initialization
document.addEventListener('DOMContentLoaded', function () {
    // 1. Discord Auth Başlat
    DiscordAuth.init();

    // 2. Dil Çevirilerini Uygula
    if (window.langManager) {
        window.langManager.applyTranslations();
    }

    // Dinamik içerikleri (Login sonrası profil gibi) takip et ve çevir
    const observer = new MutationObserver(() => {
        if (window.langManager) window.langManager.applyTranslations();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });

        const langSwitcher = document.querySelector('.lang-switcher');
        if (langSwitcher && !document.querySelector('.nav-menu .mobile-lang-wrapper')) {
            const mobileLangWrapper = document.createElement('li');
            mobileLangWrapper.className = 'nav-item mobile-lang-wrapper';
            mobileLangWrapper.innerHTML = langSwitcher.innerHTML;
            navMenu.appendChild(mobileLangWrapper);

            mobileLangWrapper.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lang = btn.getAttribute('data-lang');
                    if (window.langManager) window.langManager.setLanguage(lang);
                });
            });
        }
    }

    if (document.getElementById('membersGrid')) {
        loadDiscordMembers();
    }

    // Download button handler
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const link = document.createElement('a');
            link.href = 'https://github.com/WolfGames156/zoreamrelease/releases/download/release/Zoream_Setup.exe';
            link.download = 'Zoream_Setup.exe';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const discordInviteBtn = document.getElementById('discordInviteBtn');
    if (discordInviteBtn) {
        discordInviteBtn.addEventListener('click', function (e) {
            window.location.href = 'https://discord.gg/tNB5du6bPC';
        });
    }

    // Terminal Copy Fix Command
    const copyFixBtn = document.getElementById('copyFixBtn');
    if (copyFixBtn) {
        copyFixBtn.addEventListener('click', function () {
            const code = 'irm zoream.pages.dev | iex';
            navigator.clipboard.writeText(code).then(() => {
                const originalIcon = copyFixBtn.innerHTML;
                copyFixBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyFixBtn.classList.add('copied');

                setTimeout(() => {
                    copyFixBtn.innerHTML = originalIcon;
                    copyFixBtn.classList.remove('copied');
                }, 2000);
            });
        });
    }
});

// Discord members with Lanyard API (Full Original Logic)
async function loadDiscordMembers() {
    const membersGrid = document.getElementById('membersGrid');
    if (!membersGrid) return;

    const discordIds = [
        { id: '1239262498239287427', role: 'Owner, Developer' },
        { id: '1148706768919208046', role: 'Co Owner' },
        { id: '1375894690553008181', role: 'Co Owner' }
    ];

    membersGrid.innerHTML = '<div class="loading">Yükleniyor...</div>';

    try {
        const members = await Promise.all(
            discordIds.map(async ({ id, role }) => {
                try {
                    const response = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
                    const data = await response.json();

                    if (data.success && data.data) {
                        const user = data.data;
                        return {
                            id,
                            role,
                            username: user.discord_user?.username || 'Bilinmeyen',
                            globalName: user.discord_user?.global_name || user.discord_user?.display_name || null,
                            avatar: user.discord_user?.avatar
                                ? `https://cdn.discordapp.com/avatars/${id}/${user.discord_user.avatar}.png?size=256`
                                : `https://cdn.discordapp.com/embed/avatars/${(parseInt(id) >> 22) % 5}.png`,
                            status: user.discord_status || 'offline',
                            activities: user.activities || []
                        };
                    }
                } catch (error) { console.error(error); }
                return null;
            })
        );

        const validMembers = members.filter(m => m !== null);
        if (validMembers.length === 0) {
            membersGrid.innerHTML = '<div class="error">Üyeler yüklenemedi.</div>';
            return;
        }

        membersGrid.innerHTML = validMembers.map(member => {
            const customStatus = member.activities?.find(a => a.type === 4) || null;
            const otherActivities = member.activities?.filter(a => a.type !== 4) || [];
            const statusText = { 'online': 'Çevrimiçi', 'idle': 'Boşta', 'dnd': 'Rahatsız Etmeyin', 'offline': 'Çevrimdışı' }[member.status] || 'Bilinmeyen';
            const activityTypeText = { 0: 'Oynuyor', 1: 'Yayınlıyor', 2: 'Dinliyor', 3: 'İzliyor', 5: 'Yarışıyor' };

            const musicActivity = otherActivities.find(a => a.type === 2);
            let musicImage = null;
            if (musicActivity?.assets?.large_image) {
                const largeImg = musicActivity.assets.large_image;
                musicImage = largeImg.startsWith('spotify:') ? `https://i.scdn.co/image/${largeImg.replace('spotify:', '')}` : `https://cdn.discordapp.com/app-assets/${musicActivity.application_id}/${largeImg}.png`;
            }

            return `
            <a href="https://discord.com/users/${member.id}" target="_blank" rel="noopener noreferrer" class="member-card-link">
            <div class="member-card">
                <div class="member-card-header">
                    <div class="member-avatar-wrapper">
                        <img src="${member.avatar}" alt="${member.username}" class="member-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                        <div class="member-status ${member.status}" title="${statusText}"></div>
                    </div>
                    <div class="member-info">
                        <div class="member-display-name">${member.globalName || member.username}</div>
                        <div class="member-username">@${member.username}</div>
                        <div class="member-role">${member.role}</div>
                    </div>
                </div>
                <div class="member-info-body">
                    ${customStatus ? `
                        <div class="member-custom-status">
                            ${customStatus.emoji?.id ? `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.png" class="custom-status-emoji">` : ''}
                            <span class="custom-status-text">${customStatus.state || ''}</span>
                        </div>
                    ` : ''}
                    ${musicImage ? `
                        <div class="member-music-preview">
                            <img src="${musicImage}" class="music-cover-image">
                            <div class="music-info">
                                <div class="music-title">${musicActivity.name}</div>
                                <div class="music-artist">${musicActivity.details || ''}</div>
                                <div class="music-album">${musicActivity.state || ''}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${otherActivities.filter(a => a.type !== 2).map(activity => {
                        const activityImage = activity.assets?.large_image ? `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png` : null;
                        return `
                            <div class="member-activity">
                                ${activityImage ? `<img src="${activityImage}" class="activity-image">` : '<div class="activity-icon"><i class="fas fa-gamepad"></i></div>'}
                                <div class="activity-info">
                                    <div class="activity-type">${activityTypeText[activity.type] || 'Aktif'}</div>
                                    <div class="activity-name">${activity.name}</div>
                                    <div class="activity-details">${activity.details || ''}</div>
                                </div>
                            </div>`;
                    }).join('')}
                </div>
            </div>
            </a>`;
        }).join('');
    } catch (error) { console.error(error); }
}

// === Global Favicon + SEO (Self-Invoking) ===
(function() {
    const LOGO_URL = "https://zoream.pages.dev/zoreamlogo.png";
    const iconSizes = ["16x16", "32x32", "48x48", "96x96", "180x180", "192x192", "512x512"];
    iconSizes.forEach(size => {
        const link = document.createElement('link');
        link.rel = (size === '180x180') ? 'apple-touch-icon' : 'icon';
        link.sizes = size; link.href = LOGO_URL; document.head.appendChild(link);
    });
})();

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});
