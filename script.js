import { DiscordAuth } from './discordAuth.js';

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function () {
    // Initialize Discord Auth
    DiscordAuth.init();

    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });

        // Clone Language Switcher into Mobile Menu
        const langSwitcher = document.querySelector('.lang-switcher');
        if (langSwitcher && !document.querySelector('.nav-menu .mobile-lang-wrapper')) {
            const mobileLangWrapper = document.createElement('li');
            mobileLangWrapper.className = 'nav-item mobile-lang-wrapper';
            mobileLangWrapper.innerHTML = langSwitcher.innerHTML;
            navMenu.appendChild(mobileLangWrapper);

            // Re-bind events for new buttons
            mobileLangWrapper.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lang = btn.getAttribute('data-lang');
                    if (window.langManager) window.langManager.setLanguage(lang);
                });
            });
        }
    }

    // Discord members loading
    if (document.getElementById('membersGrid')) {
        loadDiscordMembers();
    }

    // Download button handler
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function (e) {
            e.preventDefault();
            // Zoream_Setup.exe dosyasını indir
            const link = document.createElement('a');
            link.href = 'https://github.com/WolfGames156/zoreamrelease/releases/download/release/Zoream_Setup.exe';
            link.download = 'https://github.com/WolfGames156/zoreamrelease/releases/download/release/Zoream_Setup.exe';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Discord invite button handler
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

// Discord members with Lanyard API
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
                            discriminator: user.discord_user?.discriminator || '0000',
                            avatar: user.discord_user?.avatar
                                ? `https://cdn.discordapp.com/avatars/${id}/${user.discord_user.avatar}.png?size=256`
                                : `https://cdn.discordapp.com/embed/avatars/${(parseInt(id) >> 22) % 5}.png`,
                            status: user.discord_status || 'offline',
                            activities: user.activities || []
                        };
                    }
                } catch (error) {
                    console.error(`Error fetching user ${id}:`, error);
                }
                return null;
            })
        );

        const validMembers = members.filter(m => m !== null);

        if (validMembers.length === 0) {
            membersGrid.innerHTML = '<div class="error">Üyeler yüklenemedi. Lütfen daha sonra tekrar deneyin.</div>';
            return;
        }

        membersGrid.innerHTML = validMembers.map(member => {
            // Custom status (type 4) ve diğer etkinlikleri ayır
            const customStatus = member.activities?.find(a => a.type === 4) || null;
            const otherActivities = member.activities?.filter(a => a.type !== 4) || [];

            // Durum metni
            const statusText = {
                'online': 'Çevrimiçi',
                'idle': 'Boşta',
                'dnd': 'Rahatsız Etmeyin',
                'offline': 'Çevrimdışı'
            }[member.status] || 'Bilinmeyen';

            // Etkinlik tipi metinleri
            const activityTypeText = {
                0: 'Oynuyor',
                1: 'Yayınlıyor',
                2: 'Dinliyor',
                3: 'İzliyor',
                5: 'Yarışıyor'
            };

            // Müzik dinliyorsa müzik resmini al
            const musicActivity = otherActivities.find(a => a.type === 2);
            let musicImage = null;
            if (musicActivity?.assets?.large_image) {
                const largeImg = musicActivity.assets.large_image;
                if (largeImg.startsWith('spotify:')) {
                    // Spotify ID'sini al (örnek: "spotify:ab123456" → "ab123456")
                    const spotifyId = largeImg.replace('spotify:', '');
                    musicImage = `https://i.scdn.co/image/${spotifyId}`;
                } else {
                    // Normal oyun veya uygulama resmi
                    musicImage = `https://cdn.discordapp.com/app-assets/${musicActivity.application_id}/${largeImg}.png`;
                }
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
                <div class="member-info">
                ${customStatus ? `
                    <div class="member-custom-status">
                        ${customStatus.emoji?.id ?
                        `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.png" alt="${customStatus.emoji.name || 'emoji'}" class="custom-status-emoji" onerror="this.style.display='none'">` :
                        customStatus.emoji?.name ? `<span class="custom-status-emoji">${customStatus.emoji.name}</span>` : ''
                    }
                        <span class="custom-status-text">${customStatus.state || 'Özel Durum'}</span>
                    </div>
                ` : ''}
                ${musicImage ? `
                    <div class="member-music-preview">
                        <img src="${musicImage}" alt="${musicActivity.name}" class="music-cover-image">
                        <div class="music-info">
                            <div class="music-title">${musicActivity.name || 'Müzik Dinliyor'}</div>
                            ${musicActivity.details ? `<div class="music-artist">${musicActivity.details}</div>` : ''}
                            ${musicActivity.state ? `<div class="music-album">${musicActivity.state}</div>` : ''}
                        </div>
                    </div>
                ` : ''}
                ${otherActivities.filter(a => a.type !== 2).length > 0 ? otherActivities.filter(a => a.type !== 2).map(activity => {
                        const activityImage = activity.assets?.large_image
                            ? `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`
                            : null;
                        const activityIcon = activity.type === 0 ? 'fa-gamepad' :
                            activity.type === 1 ? 'fa-video' :
                                activity.type === 3 ? 'fa-tv' : 'fa-circle';

                        return `
                            <div class="member-activity">
                                ${activityImage ?
                                `<img src="${activityImage}" alt="${activity.name}" class="activity-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''
                            }
                                <div class="activity-icon" ${activityImage ? 'style="display:none;"' : ''}>
                                    <i class="fas ${activityIcon}"></i>
                                </div>
                                <div class="activity-info">
                                    <div class="activity-type">${activityTypeText[activity.type] || 'Aktif'}</div>
                                    <div class="activity-name">${activity.name || 'Aktif'}</div>
                                    ${activity.details ? `<div class="activity-details">${activity.details}</div>` : ''}
                                    ${activity.state ? `<div class="activity-state">${activity.state}</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('') : ''}
                </div>
            </div>
            </a>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading Discord members:', error);
        membersGrid.innerHTML = '<div class="error">Üyeler yüklenirken bir hata oluştu.</div>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const footerContainer = document.querySelector("footer.footer .container");
    if (!footerContainer) return;

    // Aynı şey 2 kere eklenmesin
    if (document.getElementById("footer-contact-email")) return;

    const emailRow = document.createElement("p");
    emailRow.id = "footer-contact-email";
    emailRow.className = "footer-contact-email";
    emailRow.style.marginTop = "8px";

    emailRow.innerHTML = `
        <span>İletişim:</span>
        <a href="mailto:ktme156@gmail.com">ktme156@gmail.com</a>
    `;

    footerContainer.appendChild(emailRow);
});
// === Global Favicon + SEO META ===
document.addEventListener("DOMContentLoaded", () => {
    // Try to read a page-provided logo meta; fallback to Pages-hosted logo.
    const pageLogoMeta = document.querySelector('meta[name="zoream:logo"]');
    const LOGO_URL = (pageLogoMeta && pageLogoMeta.content) ? pageLogoMeta.content : "https://zoream.pages.dev/zoreamlogo.png";

    // Generate multiple favicon/link variants (browsers & devices)
    const iconSizes = ["16x16", "32x32", "48x48", "96x96", "180x180", "192x192", "512x512"];
    iconSizes.forEach(size => {
        const l = document.createElement('link');
        l.rel = size === '180x180' ? 'apple-touch-icon' : 'icon';
        l.sizes = size;
        l.href = LOGO_URL;
        l.type = 'image/png';
        document.head.appendChild(l);
    });

    // Add a standard shortcut icon and manifest-friendly links
    const shortcut = document.createElement('link');
    shortcut.rel = 'shortcut icon';
    shortcut.href = LOGO_URL;
    document.head.appendChild(shortcut);

    // --- SEO / Social META (ensure not duplicating important tags that exist server-side) ---
    const metaToEnsure = [
        { property: 'og:image', content: LOGO_URL },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: document.title || 'Zoream' },
        { name: 'twitter:description', content: (document.querySelector('meta[name="description"]') || {}).content || 'Zoream' },
        { name: 'twitter:image', content: LOGO_URL }
    ];

    metaToEnsure.forEach(metaData => {
        // If a matching meta already exists, update it; otherwise create it.
        let selector = metaData.property ? `meta[property="${metaData.property}"]` : `meta[name="${metaData.name}"]`;
        let existing = document.head.querySelector(selector);
        if (existing) {
            existing.setAttribute('content', metaData.content);
        } else {
            const m = document.createElement('meta');
            if (metaData.property) m.setAttribute('property', metaData.property);
            if (metaData.name) m.setAttribute('name', metaData.name);
            m.setAttribute('content', metaData.content);
            document.head.appendChild(m);
        }
    });
});


// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
