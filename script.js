// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }

    // Discord members loading
    if (document.getElementById('membersGrid')) {
        loadDiscordMembers();
    }

    // Download button handler
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
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
        discordInviteBtn.addEventListener('click', function(e) {
            window.location.href = 'https://discord.gg/tNB5du6bPC';
        });
    }
});

// Discord members with Lanyard API
async function loadDiscordMembers() {
    const membersGrid = document.getElementById('membersGrid');
    if (!membersGrid) return;

    const discordIds = [
        { id: '312062402273345537', role: 'Web Developer' },
        { id: '1239262498239287427', role: 'Owner, Developer' },
        { id: '1148706768919208046', role: 'Üst Yetkili' },
        { id: '1375894690553008181', role: 'Üst Yetkili' }
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
            const musicImage = musicActivity?.assets?.large_image 
                ? `https://cdn.discordapp.com/app-assets/${musicActivity.application_id}/${musicActivity.assets.large_image}.png`
                : null;
            
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

