// Slider configuration
const sliderConfig = {
    slides: [
        {
            image: 'slide/library.png',
            titleKey: 'slide_library_title',
            descKey: 'slide_library_desc'
        },
        {
            image: 'slide/settings.png',
            titleKey: 'slide_settings_title',
            descKey: 'slide_settings_desc'
        },
        {
            image: 'slide/news.png',
            titleKey: 'slide_news_title',
            descKey: 'slide_news_desc'
        },
        {
            image: 'slide/manuelgameadd.png',
            titleKey: 'slide_manual_title',
            descKey: 'slide_manual_desc'
        },
        {
            image: 'slide/onlinefixandbypass.png',
            titleKey: 'slide_online_title',
            descKey: 'slide_online_desc'
        },
        {
            image: 'slide/about.png',
            titleKey: 'slide_about_title',
            descKey: 'slide_about_desc'
        },
        {
            image: 'slide/manageaccount.png',
            titleKey: 'slide_account_title',
            descKey: 'slide_account_desc'
        },
        {
            image: 'slide/steamstore.png',
            titleKey: 'slide_store_title',
            descKey: 'slide_store_desc'
        }
    ],
    autoPlayInterval: 5000,
    transitionDuration: 600
};

class ImageSlider {
    constructor(config) {
        this.config = config;
        this.currentIndex = 0;
        this.autoPlayTimer = null;
        this.isTransitioning = false;
        this.init();
    }

    init() {
        this.createSliderHTML();
        this.attachEventListeners();
        this.startAutoPlay();
        this.updateSlider(0);
    }

    createSliderHTML() {
        const sliderContainer = document.getElementById('imageSlider');
        if (!sliderContainer) return;

        const html = `
            <div class="slider-wrapper">
                <div class="slider-text-section">
                    <h2 class="slider-title" data-i18n-dynamic="title"></h2>
                    <p class="slider-description" data-i18n-dynamic="desc"></p>
                </div>
                
                <div class="slider-main">
                    <div class="slider-main-image">
                        <img src="" alt="" id="mainSlideImage">
                    </div>
                    <button class="slider-nav slider-nav-prev" aria-label="Previous">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="slider-nav slider-nav-next" aria-label="Next">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="slider-thumbnails">
                    ${this.config.slides.map((slide, index) => `
                        <div class="slider-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                            <img src="${slide.image}" alt="" loading="lazy">
                            <div class="thumbnail-overlay">
                                <span class="thumbnail-title" data-i18n="${slide.titleKey}"></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        sliderContainer.innerHTML = html;
    }

    attachEventListeners() {
        // Thumbnail clicks
        document.querySelectorAll('.slider-thumbnail').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.getAttribute('data-index'));
                this.goToSlide(index);
            });
        });

        // Navigation buttons
        const prevBtn = document.querySelector('.slider-nav-prev');
        const nextBtn = document.querySelector('.slider-nav-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousSlide());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.previousSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });

        // Pause on hover
        const sliderMain = document.querySelector('.slider-main');
        if (sliderMain) {
            sliderMain.addEventListener('mouseenter', () => this.pauseAutoPlay());
            sliderMain.addEventListener('mouseleave', () => this.startAutoPlay());
        }
    }

    updateSlider(index, direction = 'next') {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const slide = this.config.slides[index];
        const mainImage = document.getElementById('mainSlideImage');
        const title = document.querySelector('.slider-title');
        const desc = document.querySelector('.slider-description');
        const mainSlide = document.querySelector('.slider-main-image');
        const textSection = document.querySelector('.slider-text-section');

        // Smooth fade out
        mainSlide.style.transition = 'opacity 0.3s ease';
        mainSlide.style.opacity = '0';

        if (textSection) {
            textSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            textSection.style.opacity = '0';
            textSection.style.transform = 'translateY(-10px)';
        }

        // Update content
        setTimeout(() => {
            mainImage.src = slide.image;
            mainImage.alt = this.getTranslation(slide.titleKey);

            if (title) {
                title.textContent = this.getTranslation(slide.titleKey);
                title.setAttribute('data-i18n', slide.titleKey);
            }

            if (desc) {
                desc.textContent = this.getTranslation(slide.descKey);
                desc.setAttribute('data-i18n', slide.descKey);
            }

            // Update thumbnails
            document.querySelectorAll('.slider-thumbnail').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });

            // Smooth fade in
            setTimeout(() => {
                mainSlide.style.opacity = '1';

                if (textSection) {
                    textSection.style.opacity = '1';
                    textSection.style.transform = 'translateY(0)';
                }

                setTimeout(() => {
                    this.isTransitioning = false;
                }, 300);
            }, 50);
        }, 300);

        this.currentIndex = index;
    }

    getTranslation(key) {
        if (window.langManager) {
            return window.langManager.translate(key);
        }
        return key;
    }

    goToSlide(index) {
        if (index === this.currentIndex) return;

        const direction = index > this.currentIndex ? 'next' : 'prev';
        this.updateSlider(index, direction);
        this.resetAutoPlay();
    }

    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.config.slides.length;
        this.goToSlide(nextIndex);
    }

    previousSlide() {
        const prevIndex = (this.currentIndex - 1 + this.config.slides.length) % this.config.slides.length;
        this.goToSlide(prevIndex);
    }

    startAutoPlay() {
        this.pauseAutoPlay();
        this.autoPlayTimer = setInterval(() => {
            this.nextSlide();
        }, this.config.autoPlayInterval);
    }

    pauseAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }

    resetAutoPlay() {
        this.startAutoPlay();
    }
}

// Initialize slider when DOM is ready
window.slider = null;
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for language manager to initialize
    setTimeout(() => {
        window.slider = new ImageSlider(sliderConfig);

        // Apply translations to thumbnails after slider is created
        if (window.langManager) {
            window.langManager.applyTranslations();
        }
    }, 100);
});
