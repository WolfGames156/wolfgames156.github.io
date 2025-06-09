const ANIMATION_CONFIG = {
    fadeIn: {
        opacity: [0, 1],
        transform: ['translateY(20px)', 'translateY(0)']
    }
};

let soundEnabled = false;
let spotifyIntervals = {};

function connectWebSocket(section, userId) {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    let heartbeat;

    ws.onopen = () => {
        ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: userId }
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.op === 1) {
            heartbeat = setInterval(() => {
                ws.send(JSON.stringify({ op: 3 }));
            }, data.d.heartbeat_interval);
        } else if (data.op === 0 && (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE')) {
            updateProfile(section, userId);
        }
    };

    ws.onclose = () => {
        clearInterval(heartbeat);
        setTimeout(() => connectWebSocket(section, userId), 1000);
    };
}

async function fetchDiscordProfile(userId) {
    try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
        if (!response.ok) throw new Error('API Hatası');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function updateStatusIndicator(section, status) {
    const indicator = section.querySelector('.status-indicator');
    if (indicator) {
        indicator.className = `status-indicator ${status}`;
    }
}

function calculateProgress(start, end) {
    const now = Date.now();
    const total = end - start;
    const current = now - start;
    return Math.min((current / total) * 100, 100);
}

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor(ms / 1000 / 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createSpotifyActivity(spotify, section, userId) {
    const activity = document.createElement('div');
    activity.className = 'activity spotify';

    activity.innerHTML = `
        <img src="${spotify.album_art_url}" alt="Album Art" class="album-art">
        <div class="spotify-info">
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
        </div>
    `;

    const progressBar = activity.querySelector('.progress-bar');
    const currentTimeSpan = activity.querySelector('.current-time');
    const totalTimeSpan = activity.querySelector('.total-time');

    const updateSpotifyProgress = () => {
        const progress = calculateProgress(spotify.timestamps.start, spotify.timestamps.end);
        const currentTime = Date.now() - spotify.timestamps.start;
        const totalTime = spotify.timestamps.end - spotify.timestamps.start;

        progressBar.style.width = `${progress}%`;
        currentTimeSpan.textContent = formatTime(currentTime);
        totalTimeSpan.textContent = formatTime(totalTime);

        if (progress >= 100) {
            clearInterval(spotifyIntervals[userId]);
            spotifyIntervals[userId] = null;
        }
    };

    if (spotifyIntervals[userId]) clearInterval(spotifyIntervals[userId]);
    updateSpotifyProgress();
    spotifyIntervals[userId] = setInterval(updateSpotifyProgress, 1000);

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

async function updateProfile(section, userId) {
    const data = await fetchDiscordProfile(userId);
    if (!data) return;

    const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${data.discord_user.avatar}.png`;
    const avatar = section.querySelector('.avatar-image');
    if (avatar) avatar.src = avatarUrl;

    const username = section.querySelector('.username');
    if (username) username.textContent = data.discord_user.username;

    updateStatusIndicator(section, data.discord_status);

    const activitiesContainer = section.querySelector('.activities');
    if (activitiesContainer) {
        activitiesContainer.innerHTML = '';

        if (!data.spotify && spotifyIntervals[userId]) {
            clearInterval(spotifyIntervals[userId]);
            spotifyIntervals[userId] = null;
        }

        if (data.spotify) {
            activitiesContainer.appendChild(createSpotifyActivity(data.spotify, section, userId));
        }

        const gameActivities = (data.activities || []).filter(
            a => a.type === 0 && a.application_id !== 'spotify:1'
        );
        gameActivities.forEach(activity => {
            activitiesContainer.insertAdjacentHTML('beforeend', createGameActivity(activity));
        });

        if (!data.spotify && gameActivities.length === 0) {
            activitiesContainer.innerHTML = `
                <div class="activity no-activity">
                    <span>Şu anda bir aktivite yok.</span>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.profile-section').forEach(section => {
        const userId = section.getAttribute('data-user');
        connectWebSocket(section, userId);
        updateProfile(section, userId);
    });

    // Animasyonlar
    const animatedElements = document.querySelectorAll('.section-header, .about-content, .contact-container, .pricing-card');
    const observer = new IntersectionObserver(entries => {
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
    }, { threshold: 0.1 });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });

    // Scroll animasyonu
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Sesli hover
    const hoverSound = new Audio('hover.mp3'); // Hover efekti sesi
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundToggle.innerHTML = `<i class="fas fa-volume-${soundEnabled ? 'up' : 'mute'}"></i>`;
        });
    }

    document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (soundEnabled) {
                hoverSound.currentTime = 0;
                hoverSound.play().catch(() => {});
            }
        });
    });
});
