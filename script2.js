const userId = '1375902690609205291';
const BANNER_URL = 'https://cdn.discordapp.com/banners/1375902690609205291/20f72484188d593512240a411ef72c11.webp?size=1024&width=922&height=0';


let isSoundEnabled = false;




const ANIMATION_CONFIG = {
    fadeIn: {
        opacity: [0, 1],
        transform: ['translateY(20px)', 'translateY(0)']
    }
};


let ws;
let heartbeat;

function connectWebSocket() {
    ws = new WebSocket('wss://api.lanyard.rest/socket');
    
    ws.onopen = () => {
        console.log('Connected to Lanyard WebSocket');
        ws.send(JSON.stringify({
            op: 2,
            d: {
                subscribe_to_id: userId
            }
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.op) {
            case 1:
                // Heartbeat
                heartbeat = setInterval(() => {
                    ws.send(JSON.stringify({ op: 3 }));
                }, data.d.heartbeat_interval);
                ws.send(JSON.stringify({ op: 3 }));
                break;
            case 0:
                // Event
                if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') {
                    updateProfile(data.d[userId]);
                }
                break;
        }
    };
    
    ws.onclose = () => {
        console.log('WebSocket connection closed, reconnecting...');
        clearInterval(heartbeat);
        setTimeout(connectWebSocket, 1000);
    };
}

async function fetchDiscordProfile() {
    try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
        if (!response.ok) throw new Error('Profil bilgileri alınamadı');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Hata:', error);
        return null;
    }
}

function updateStatusIndicator(status) {
    const statusIndicator = document.getElementById('status-indicator');
    
    statusIndicator.className = 'status-indicator ' + status;
}


let spotifyInterval = null;

function createSpotifyActivity(spotify) {
    const activity = document.createElement('div');
    activity.className = 'activity spotify';
    
    const albumArt = document.createElement('img');
    albumArt.className = 'album-art';
    albumArt.src = spotify.album_art_url;
    albumArt.alt = 'Album Art';

    const spotifyInfo = document.createElement('div');
    spotifyInfo.className = 'spotify-info';
    spotifyInfo.innerHTML = `
        <div class="song-name">${spotify.song}</div>
        <div class="artist-name">${spotify.artist}</div>
        <div class="progress-container">
            <div class="progress-bar" style="width: 0%">
                <div class="progress-glow"></div>
            </div>
        </div>
        <div class="time-info">
            <span class="current-time">0:00</span>
            <span class="total-time">0:00</span>
        </div>
    `;

    activity.appendChild(albumArt);
    activity.appendChild(spotifyInfo);

    const progressBar = spotifyInfo.querySelector('.progress-bar');
    const currentTimeSpan = spotifyInfo.querySelector('.current-time');
    const totalTimeSpan = spotifyInfo.querySelector('.total-time');

    const updateSpotifyProgress = () => {
        const progressPercent = calculateProgress(spotify.timestamps.start, spotify.timestamps.end);
        const currentTime = Date.now() - spotify.timestamps.start;
        const totalTime = spotify.timestamps.end - spotify.timestamps.start;
        
        progressBar.style.width = `${progressPercent}%`;
        currentTimeSpan.textContent = formatTime(currentTime);
        totalTimeSpan.textContent = formatTime(totalTime);

      
        if (progressPercent >= 100) {
            clearInterval(spotifyInterval);
            spotifyInterval = null;
        }
    };


    updateSpotifyProgress();


    if (spotifyInterval) {
        clearInterval(spotifyInterval);
    }


    spotifyInterval = setInterval(updateSpotifyProgress, 1000);
    
    return activity;
}

function createGameActivity(activity) {
    const gameIcon = activity.assets?.large_image 
        ? `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`
        : 'default-game-icon.png';
    
    return `
        <div class="activity game">
            <img src="${gameIcon}" alt="Game Icon" class="game-icon">
            <div class="game-info">
                <div class="game-name">${activity.name}</div>
                ${activity.details ? `<div class="game-details">${activity.details}</div>` : ''}
                ${activity.state ? `<div class="game-state">${activity.state}</div>` : ''}
            </div>
        </div>
    `;
}

function calculateProgress(start, end) {
    const now = Date.now();
    const total = end - start;
    const current = now - start;
    return Math.min((current / total) * 100, 100);
}

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60));
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function updateProfile() {
    const data = await fetchDiscordProfile();
    if (!data) return;

   
    const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${data.discord_user.avatar}`;
    const avatar = document.getElementById('profile-avatar');
    if (avatar) {
        avatar.src = avatarUrl;
    }


    const favicon = document.getElementById('favicon');
    if (favicon) {
        favicon.href = avatarUrl;
    }

    
    const username = document.getElementById('username');
    if (username) {
        username.textContent = data.discord_user.username;
    }


    updateStatusIndicator(data.discord_status);


    const activitiesContainer = document.getElementById('activities');
    if (activitiesContainer) {
        activitiesContainer.innerHTML = '';

   
        if (!data.spotify && spotifyInterval) {
             clearInterval(spotifyInterval);
             spotifyInterval = null;
        }


        if (data.spotify) {
            activitiesContainer.appendChild(createSpotifyActivity(data.spotify));
        }


        if (data.activities && data.activities.length > 0) {
            const gameActivities = data.activities.filter(activity => activity.type === 0 && activity.application_id !== 'spotify:1'); 
            gameActivities.forEach(activity => {
                const gameActivityElement = createGameActivity(activity);
          
                if (typeof gameActivityElement === 'string') {
                    activitiesContainer.insertAdjacentHTML('beforeend', gameActivityElement);
                } else if (gameActivityElement instanceof HTMLElement) {
                    activitiesContainer.appendChild(gameActivityElement);
                }
            });
        }

        const activities = data.activities || [];
        const nonSpotifyActivities = activities.filter(a => a.application_id !== 'spotify:1' && a.type === 0);
        const hasNoActivity = !data.spotify && nonSpotifyActivities.length === 0;
        if (hasNoActivity) {
            activitiesContainer.innerHTML = `
                <div class="activity no-activity">
                    <span>Şu anda bir aktivite yok.</span>
                </div>
            `;
        
            if (spotifyInterval) {
                clearInterval(spotifyInterval);
                spotifyInterval = null;
            }
        }
    }
}



const languageIcons = {
    javascript: 'fab fa-js-square',
    python: 'fab fa-python',
    html: 'fab fa-html5',
    css: 'fab fa-css3-alt',
    java: 'fab fa-java',
    csharp: 'fas fa-code', 
    php: 'fab fa-php',
    ruby: 'fas fa-gem',
    go: 'fab fa-golang',
    typescript: 'fas fa-code', 
    swift: 'fab fa-swift',
    kotlin: 'fab fa-kotlin',
    cplusplus: 'fas fa-code', 
    c: 'fas fa-code', 
    shell: 'fas fa-terminal',
    dockerfile: 'fab fa-docker',
    vue: 'fab fa-vuejs',
    react: 'fab fa-react',
    angular: 'fab fa-angular',
    dart: 'fas fa-code', 
    flutter: 'fas fa-mobile-alt' 
};


document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updateProfile(); 
    displayGitHubProjects('wasetrox'); 


    updateProfile();


    const animatedElements = document.querySelectorAll('.section-header, .about-content, .contact-container, .pricing-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.animate(ANIMATION_CONFIG.fadeIn, {
                    duration: 600,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    fill: 'forwards'
                });
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });


    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            isSoundEnabled = !isSoundEnabled;
            soundToggle.innerHTML = `<i class="fas fa-volume-${isSoundEnabled ? 'up' : 'mute'}"></i>`;
        });
    }

    document.querySelectorAll('a, button').forEach(element => {
        element.addEventListener('mouseenter', () => {
            if (isSoundEnabled) {
                hoverSound.currentTime = 0;
                hoverSound.play().catch(error => {
                    console.error('Ses çalma hatası:', error);
                });
            }
        });
    });


    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
});