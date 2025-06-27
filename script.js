
// AdBluMedia API Configuration
const ADBLUMEDIA_CONFIG = {
    user_id: "389414",
    api_key: "da6ad75173e53c627efbabc259db22ec",
    feed_url: "https://d2jgih9urxpa47.cloudfront.net/public/offers/feed.php"
};

// Dynamic CPA Offers - Will be populated from AdBluMedia API
let CPA_OFFERS = {};
let OFFER_HISTORY = JSON.parse(localStorage.getItem('offerHistory') || '[]');

// Global variables
let userProgress = {
    completedTasks: 0,
    tasks: {},
    userInfo: {}
};

let currentTaskId = null;
let isLoading = false;

// Fetch offers from AdBluMedia API
async function fetchOffersFromAPI(country) {
    try {
        const apiUrl = `${ADBLUMEDIA_CONFIG.feed_url}?user_id=${ADBLUMEDIA_CONFIG.user_id}&api_key=${ADBLUMEDIA_CONFIG.api_key}&country=${country}&s1=giveaway&s2=${country}`;
        
        console.log('Fetching offers from:', apiUrl);
        
        // Try direct fetch first
        try {
            const directResponse = await fetch(apiUrl);
            if (directResponse.ok) {
                const offers = await directResponse.json();
                console.log('Fetched offers directly:', offers);
                return processAdBluMediaOffers(offers, country);
            }
        } catch (directError) {
            console.log('Direct fetch failed, trying proxy:', directError.message);
        }
        
        // Fallback to CORS proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.contents) {
            try {
                const offers = JSON.parse(data.contents);
                console.log('Fetched offers via proxy:', offers);
                
                // Process and format offers for our system
                return processAdBluMediaOffers(offers, country);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.log('Raw contents:', data.contents);
                return null;
            }
        }
        
        console.log('No contents in response:', data);
        return null;
    } catch (error) {
        console.error('Error fetching offers:', error);
        return null;
    }
}

// Process AdBluMedia offers into our format
function processAdBluMediaOffers(apiOffers, country) {
    const processedOffers = {};
    let taskId = 1;

    // Ensure apiOffers is an array
    if (!Array.isArray(apiOffers)) {
        console.log('API offers is not an array:', apiOffers);
        return null;
    }

    // Take first 5 offers or all if less than 5
    const offersToUse = apiOffers.slice(0, 5);

    offersToUse.forEach((offer, index) => {
        // Ensure offer object exists
        if (!offer || typeof offer !== 'object') {
            console.log('Invalid offer object:', offer);
            return;
        }

        const offerName = offer.name || offer.anchor || `Task ${taskId}`;
        const offerUrl = offer.url || `#task-${taskId}`;
        const offerCategory = determineCategory(offer);

        // Create detailed instructions based on offer type
        let detailedInstructions = generateDetailedInstructions(offer);

        processedOffers[taskId] = {
            id: offer.id || taskId,
            name: offerName,
            url: offerUrl,
            description: offer.anchor || offer.conversion || 'Complete this offer to earn points',
            instructions: detailedInstructions,
            estimatedTime: estimateTaskTime(offer),
            payout: offer.user_payout || offer.payout || "Points",
            country: country,
            category: offerCategory,
            requirements: offer.conversion || 'Complete all steps as instructed',
            epc: offer.epc || '0',
            network_icon: offer.network_icon || '',
            originalOffer: offer
        };
        taskId++;
    });

    // Add to history
    OFFER_HISTORY.push({
        country: country,
        timestamp: new Date().toISOString(),
        offers: processedOffers,
        totalOffers: Object.keys(processedOffers).length
    });

    // Keep only last 10 history entries
    if (OFFER_HISTORY.length > 10) {
        OFFER_HISTORY = OFFER_HISTORY.slice(-10);
    }

    localStorage.setItem('offerHistory', JSON.stringify(OFFER_HISTORY));

    return processedOffers;
}

// Generate detailed instructions for each offer type
function generateDetailedInstructions(offer) {
    const name = (offer.name || '').toLowerCase();
    const anchor = (offer.anchor || '').toLowerCase();
    const conversion = (offer.conversion || '').toLowerCase();

    let instructions = `<div class="task-instructions">
        <h4 class="instruction-title">📋 Cara Menyelesaikan "${offer.name || offer.anchor}"</h4>`;

    if (conversion.includes('email') || anchor.includes('email')) {
        instructions += `
        <div class="instruction-steps">
            <div class="step"><span class="step-num">1</span> Klik tombol "Lanjutkan Task" di bawah</div>
            <div class="step"><span class="step-num">2</span> Halaman offer akan terbuka di tab baru</div>
            <div class="step"><span class="step-num">3</span> Masukkan alamat email yang valid dan aktif</div>
            <div class="step"><span class="step-num">4</span> Klik tombol submit/send/continue</div>
            <div class="step"><span class="step-num">5</span> Periksa email dan konfirmasi jika diperlukan</div>
            <div class="step"><span class="step-num">6</span> Kembali ke halaman ini untuk melanjutkan</div>
        </div>
        <div class="instruction-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Penting:</strong> Gunakan email yang valid dan aktif!
        </div>`;
    } else if (conversion.includes('mobile') || conversion.includes('sms') || anchor.includes('sms')) {
        instructions += `
        <div class="instruction-steps">
            <div class="step"><span class="step-num">1</span> Klik tombol "Lanjutkan Task" di bawah</div>
            <div class="step"><span class="step-num">2</span> Halaman offer akan terbuka di tab baru</div>
            <div class="step"><span class="step-num">3</span> Masukkan nomor HP yang valid dan aktif</div>
            <div class="step"><span class="step-num">4</span> Klik tombol untuk mengirim SMS</div>
            <div class="step"><span class="step-num">5</span> Tunggu dan konfirmasi SMS yang diterima</div>
            <div class="step"><span class="step-num">6</span> Kembali ke halaman ini</div>
        </div>
        <div class="instruction-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Penting:</strong> Pastikan nomor HP aktif dan dapat menerima SMS!
        </div>`;
    } else if (conversion.includes('download') || name.includes('app')) {
        instructions += `
        <div class="instruction-steps">
            <div class="step"><span class="step-num">1</span> Klik tombol "Lanjutkan Task" di bawah</div>
            <div class="step"><span class="step-num">2</span> Halaman offer akan terbuka di tab baru</div>
            <div class="step"><span class="step-num">3</span> Download aplikasi yang ditawarkan</div>
            <div class="step"><span class="step-num">4</span> Install aplikasi di perangkat Anda</div>
            <div class="step"><span class="step-num">5</span> Buka aplikasi setidaknya sekali</div>
            <div class="step"><span class="step-num">6</span> Kembali ke halaman ini</div>
        </div>
        <div class="instruction-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Penting:</strong> Jangan uninstall aplikasi sampai task selesai!
        </div>`;
    } else if (conversion.includes('survey') || name.includes('survey')) {
        instructions += `
        <div class="instruction-steps">
            <div class="step"><span class="step-num">1</span> Klik tombol "Lanjutkan Task" di bawah</div>
            <div class="step"><span class="step-num">2</span> Halaman survey akan terbuka di tab baru</div>
            <div class="step"><span class="step-num">3</span> Isi semua pertanyaan dengan lengkap dan jujur</div>
            <div class="step"><span class="step-num">4</span> Luangkan waktu untuk membaca setiap pertanyaan</div>
            <div class="step"><span class="step-num">5</span> Submit survey hingga selesai</div>
            <div class="step"><span class="step-num">6</span> Kembali ke halaman ini</div>
        </div>
        <div class="instruction-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Penting:</strong> Jawab semua pertanyaan dengan serius!
        </div>`;
    } else if (conversion.includes('registration') || conversion.includes('register')) {
        instructions += `
        <div class="instruction-steps">
            <div class="step"><span class="step-num">1</span> Klik tombol "Lanjutkan Task" di bawah</div>
            <div class="step"><span class="step-num">2</span> Halaman registrasi akan terbuka di tab baru</div>
            <div class="step"><span class="step-num">3</span> Isi form registrasi dengan data yang benar</div>
            <div class="step"><span class="step-num">4</span> Masukkan email dan password yang kuat</div>
            <div class="step"><span class="step-num">5</span> Selesaikan proses registrasi</div>
            <div class="step"><span class="step-num">6</span> Konfirmasi email jika diperlukan</div>
            <div class="step"><span class="step-num">7</span> Kembali ke halaman ini</div>
        </div>
        <div class="instruction-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Penting:</strong> Gunakan data yang valid dan simpan password Anda!
        </div>`;
    } else {
        instructions += `
        <div class="instruction-steps">
            <div class="step"><span class="step-num">1</span> Klik tombol "Lanjutkan Task" di bawah</div>
            <div class="step"><span class="step-num">2</span> Halaman offer akan terbuka di tab baru</div>
            <div class="step"><span class="step-num">3</span> Baca instruksi dengan teliti</div>
            <div class="step"><span class="step-num">4</span> ${offer.conversion || 'Ikuti semua langkah yang diminta'}</div>
            <div class="step"><span class="step-num">5</span> Selesaikan hingga halaman konfirmasi muncul</div>
            <div class="step"><span class="step-num">6</span> Kembali ke halaman ini</div>
        </div>
        <div class="instruction-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Penting:</strong> Ikuti semua instruksi dengan lengkap!
        </div>`;
    }

    instructions += `
        <div class="instruction-info">
            <div class="info-item">
                <i class="fas fa-dollar-sign"></i>
                <span><strong>Reward:</strong> $${offer.user_payout || offer.payout || '0.20'}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-clock"></i>
                <span><strong>Estimasi Waktu:</strong> ${estimateTaskTime(offer)}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-tag"></i>
                <span><strong>Kategori:</strong> ${determineCategory(offer)}</span>
            </div>
        </div>
    </div>`;

    return instructions;
}

// Estimate task completion time
function estimateTaskTime(offer) {
    const conversion = (offer.conversion || '').toLowerCase();
    const name = (offer.name || '').toLowerCase();

    if (conversion.includes('email') || conversion.includes('subscribe')) {
        return '1-2 menit';
    } else if (conversion.includes('sms') || conversion.includes('mobile')) {
        return '2-3 menit';
    } else if (conversion.includes('download') || name.includes('app')) {
        return '3-5 menit';
    } else if (conversion.includes('survey')) {
        return '5-10 menit';
    } else if (conversion.includes('registration')) {
        return '3-7 menit';
    } else {
        return '2-5 menit';
    }
}

// Determine category based on offer data
function determineCategory(offer) {
    const name = (offer.name || offer.anchor || '').toLowerCase();
    const description = (offer.conversion || '').toLowerCase();
    
    if (name.includes('survey') || description.includes('survey')) return 'Survey';
    if (name.includes('app') || name.includes('download')) return 'Mobile';
    if (name.includes('email') || name.includes('subscribe')) return 'Email';
    if (name.includes('shop') || name.includes('store')) return 'Shopping';
    if (name.includes('trial') || name.includes('free')) return 'Trial';
    if (name.includes('credit') || name.includes('loan') || name.includes('finance')) return 'Finance';
    if (name.includes('game') || name.includes('casino')) return 'Gaming';
    if (name.includes('health') || name.includes('medical')) return 'Health';
    if (name.includes('education') || name.includes('course')) return 'Education';
    if (name.includes('travel') || name.includes('hotel')) return 'Travel';
    
    return 'General';
}

// Get fallback offers if API fails
function getFallbackOffers() {
    return {
        1: {
            name: "Survey Berkualitas",
            url: "https://track.adblumedia.com/survey-offer",
            instructions: generateDetailedInstructions({
                name: "Survey Berkualitas",
                conversion: "Complete survey",
                user_payout: "0.30"
            }),
            estimatedTime: "3-5 menit",
            category: "Survey",
            payout: "0.30"
        },
        2: {
            name: "Download Aplikasi",
            url: "https://track.adblumedia.com/app-download",
            instructions: generateDetailedInstructions({
                name: "Download Aplikasi",
                conversion: "Download and install app",
                user_payout: "0.25"
            }),
            estimatedTime: "2-3 menit",
            category: "Mobile",
            payout: "0.25"
        },
        3: {
            name: "Email Newsletter",
            url: "https://track.adblumedia.com/email-submit",
            instructions: generateDetailedInstructions({
                name: "Email Newsletter",
                conversion: "Submit valid email",
                user_payout: "0.15"
            }),
            estimatedTime: "1-2 menit",
            category: "Email",
            payout: "0.15"
        },
        4: {
            name: "Shopping Deals",
            url: "https://track.adblumedia.com/shopping",
            instructions: generateDetailedInstructions({
                name: "Shopping Deals",
                conversion: "Browse products",
                user_payout: "0.20"
            }),
            estimatedTime: "2-4 menit",
            category: "Shopping",
            payout: "0.20"
        },
        5: {
            name: "Free Trial Service",
            url: "https://track.adblumedia.com/trial",
            instructions: generateDetailedInstructions({
                name: "Free Trial Service",
                conversion: "Sign up for free trial",
                user_payout: "0.50"
            }),
            estimatedTime: "4-6 menit",
            category: "Trial",
            payout: "0.50"
        }
    };
}

// Initialize the website
document.addEventListener('DOMContentLoaded', function() {
    initializeCountdown();
    loadUserProgress();
    initializeAnimations();
    
    // Form submission handler
    const form = document.getElementById('giveawayForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
    
    // Smooth scroll for navigation
    initializeSmoothScroll();
});

// Initialize animations
function initializeAnimations() {
    // Add scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.prize-card, .step-item, .form-container').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Initialize smooth scroll
function initializeSmoothScroll() {
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
}

// Handle form submission with better UX
async function handleFormSubmission(e) {
    e.preventDefault();
    
    if (isLoading) return;
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        country: document.getElementById('country').value
    };
    
    // Validate form
    if (!validateForm(formData)) {
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Store user info
        userProgress.userInfo = formData;
        saveUserProgress();
        
        // Show task section first
        showTaskSection();
        
        // Fetch country-specific offers
        const countryOffers = await fetchOffersFromAPI(formData.country);
        
        if (countryOffers && Object.keys(countryOffers).length > 0) {
            CPA_OFFERS = countryOffers;
            console.log('Using API offers for country:', formData.country);
        } else {
            CPA_OFFERS = getFallbackOffers();
            console.log('Using fallback offers for country:', formData.country);
        }
        
        // Render task section with fetched offers
        renderTaskSection();
        
        // Track form submission
        trackEvent('form_submitted', formData);
        
        // Show success message
        showNotification('🎉 Berhasil! Silakan selesaikan tasks di bawah untuk mengikuti giveaway.', 'success');
        
    } catch (error) {
        console.error('Error loading offers:', error);
        CPA_OFFERS = getFallbackOffers();
        renderTaskSection();
        showNotification('⚠️ Menggunakan tasks cadangan. Tetap bisa mengikuti giveaway!', 'warning');
    } finally {
        setLoadingState(false);
    }
}

// Validate form data
function validateForm(formData) {
    if (!formData.name) {
        showNotification('❌ Nama lengkap wajib diisi', 'error');
        document.getElementById('name').focus();
        return false;
    }
    
    if (!formData.email || !isValidEmail(formData.email)) {
        showNotification('❌ Email yang valid wajib diisi', 'error');
        document.getElementById('email').focus();
        return false;
    }
    
    if (!formData.phone) {
        showNotification('❌ Nomor WhatsApp wajib diisi', 'error');
        document.getElementById('phone').focus();
        return false;
    }
    
    if (!formData.country) {
        showNotification('❌ Pilih negara Anda', 'error');
        document.getElementById('country').focus();
        return false;
    }
    
    return true;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Set loading state
function setLoadingState(loading) {
    isLoading = loading;
    const submitBtn = document.querySelector('.submit-btn');
    
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Memuat Tasks...';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> MULAI TASKS & RAIH HADIAH';
    }
}

// Show task section and hide other sections
function showTaskSection() {
    // Hide all other sections
    const sectionsToHide = [
        '.hero-section',
        '.prizes-section', 
        '.how-it-works',
        '.entry-section',
        '.countdown-section'
    ];
    
    sectionsToHide.forEach(selector => {
        const section = document.querySelector(selector);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Show task section
    let taskSection = document.getElementById('taskSection');
    if (taskSection) {
        taskSection.style.display = 'block';
        taskSection.innerHTML = `
            <div class="container">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <h3>🔄 Memuat Tasks Khusus Untuk Anda...</h3>
                    <p>Sedang mengambil penawaran terbaik dari ${getCountryName(userProgress.userInfo.country)}</p>
                </div>
            </div>
        `;
        
        // Scroll to top since this is now the main content
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Render task section with dynamic offers
function renderTaskSection() {
    const taskSection = document.getElementById('taskSection');
    if (!taskSection) return;
    
    const totalTasks = Object.keys(CPA_OFFERS).length;
    
    taskSection.innerHTML = `
        <div class="container">
            <div class="task-header-section">
                <div class="hero-badge">🔥 MEGA GIVEAWAY 2024</div>
                <h1 class="gradient-text">Complete Tasks</h1>
                <p>Selesaikan semua tasks di bawah untuk mengikuti giveaway dan berkesempatan memenangkan hadiah fantastis!</p>
            </div>
            
            <h3>🎯 Selesaikan Tasks Untuk Mengikuti Giveaway</h3>
            
            <div class="task-progress">
                <div class="progress-info">
                    <h4>Progress Anda</h4>
                    <span id="progressText">0/${totalTasks} Tasks Selesai</span>
                </div>
                <div class="progress-bar">
                    <div id="progressFill" class="progress-fill"></div>
                </div>
            </div>

            <div class="offer-info">
                <div class="offer-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span><strong>Tasks untuk:</strong> ${getCountryName(userProgress.userInfo.country)}</span>
                </div>
                <div class="offer-detail">
                    <i class="fas fa-clock"></i>
                    <span><strong>Diperbarui:</strong> ${new Date().toLocaleString('id-ID')}</span>
                </div>
                <div class="offer-detail">
                    <i class="fas fa-shield-alt"></i>
                    <span><strong>Aman & Terpercaya</strong></span>
                </div>
            </div>

            <div class="tasks-list">
                ${generateTasksHTML()}
            </div>

            <div id="completionSection" class="completion-section" style="display: none;">
                <div class="success-message">
                    <i class="fas fa-trophy" style="font-size: 3rem; margin-bottom: 20px; color: #ffeaa7;"></i>
                    <h3>🎉 Selamat! Anda Telah Mengikuti Giveaway!</h3>
                    <p>Semua tasks telah selesai. Anda sekarang resmi mengikuti MEGA GIVEAWAY 2024!</p>
                    <p><strong>Pemenang akan diumumkan dalam 24-48 jam via email.</strong></p>
                    <button onclick="shareGiveaway()" class="share-btn">
                        <i class="fas fa-share-alt"></i>
                        Share untuk Kesempatan Extra
                    </button>
                </div>
            </div>

            <div class="offer-history">
                <button onclick="showOfferHistory()" class="history-btn">
                    <i class="fas fa-history"></i>
                    Lihat Riwayat Offers
                </button>
            </div>
        </div>
    `;
    
    updateProgressBar();
    
    // Restore completed tasks if any
    Object.keys(userProgress.tasks).forEach(taskId => {
        if (userProgress.tasks[taskId].completed) {
            updateTaskStatus(parseInt(taskId), 'completed');
        }
    });
    
    // Check if all tasks are completed
    if (userProgress.completedTasks >= totalTasks) {
        showCompletionMessage();
    }
}

// Generate HTML for tasks
function generateTasksHTML() {
    return Object.keys(CPA_OFFERS).map(taskId => {
        const offer = CPA_OFFERS[taskId];
        const isCompleted = userProgress.tasks[taskId]?.completed;
        
        return `
            <div class="task-item" data-task="${taskId}" data-status="${isCompleted ? 'completed' : 'pending'}">
                <div class="task-header">
                    <div class="task-icon">${getTaskIcon(offer.category)}</div>
                    <div class="task-info">
                        <h4>${offer.name}</h4>
                        <p>${offer.description}</p>
                        <div class="task-meta">
                            <span class="task-category">
                                <i class="fas fa-tag"></i>
                                ${offer.category || 'General'}
                            </span>
                            <span class="task-time">
                                <i class="fas fa-clock"></i>
                                ${offer.estimatedTime}
                            </span>
                            <span class="task-reward">
                                <i class="fas fa-dollar-sign"></i>
                                $${offer.payout}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-btn ${isCompleted ? 'completed' : ''}" 
                            onclick="startTask(${taskId})" 
                            ${isCompleted ? 'disabled' : ''}>
                        ${isCompleted ? '<i class="fas fa-check"></i> Selesai' : '<i class="fas fa-play"></i> Mulai Task'}
                    </button>
                    <span class="task-status">
                        ${isCompleted ? '✅ Selesai' : '⏳ Menunggu'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// Get task icon based on category
function getTaskIcon(category) {
    const icons = {
        'Survey': '📋',
        'Mobile': '📱',
        'Email': '📧',
        'Shopping': '🛒',
        'Trial': '🆓',
        'Finance': '💳',
        'Gaming': '🎮',
        'Health': '🏥',
        'Education': '📚',
        'Travel': '✈️',
        'General': '⭐'
    };
    return icons[category] || icons['General'];
}

// Get country name from code
function getCountryName(code) {
    const countries = {
        'ID': 'Indonesia',
        'US': 'United States',
        'UK': 'United Kingdom',
        'CA': 'Canada',
        'AU': 'Australia',
        'DE': 'Germany',
        'FR': 'France',
        'ES': 'Spain',
        'IT': 'Italy',
        'NL': 'Netherlands',
        'BE': 'Belgium',
        'CH': 'Switzerland',
        'AT': 'Austria',
        'SE': 'Sweden',
        'NO': 'Norway',
        'DK': 'Denmark',
        'FI': 'Finland',
        'PL': 'Poland',
        'CZ': 'Czech Republic',
        'HU': 'Hungary',
        'PT': 'Portugal',
        'GR': 'Greece',
        'IE': 'Ireland',
        'NZ': 'New Zealand',
        'SG': 'Singapore',
        'MY': 'Malaysia',
        'TH': 'Thailand',
        'PH': 'Philippines',
        'VN': 'Vietnam',
        'IN': 'India',
        'JP': 'Japan',
        'KR': 'South Korea',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'AR': 'Argentina',
        'CL': 'Chile',
        'CO': 'Colombia',
        'PE': 'Peru',
        'ZA': 'South Africa',
        'EG': 'Egypt',
        'AE': 'United Arab Emirates',
        'SA': 'Saudi Arabia',
        'IL': 'Israel',
        'TR': 'Turkey',
        'RU': 'Russia',
        'UA': 'Ukraine'
    };
    return countries[code] || code;
}

// Start a specific task
function startTask(taskId) {
    currentTaskId = taskId;
    const offer = CPA_OFFERS[taskId];

    if (!offer) {
        showNotification('❌ Task tidak tersedia. Silakan coba lagi nanti.', 'error');
        return;
    }

    // Check if task is already completed
    if (userProgress.tasks[taskId]?.completed) {
        showNotification('✅ Task ini sudah selesai!', 'success');
        return;
    }

    // Show task modal with detailed instructions
    document.getElementById('taskInstructions').innerHTML = offer.instructions;
    document.getElementById('taskModal').style.display = 'flex';
}

// Open the CPA offer link
function openOfferLink() {
    if (!currentTaskId) {
        showNotification('❌ Task ID tidak ditemukan. Silakan coba lagi.', 'error');
        return;
    }
    
    const offer = CPA_OFFERS[currentTaskId];
    
    if (!offer) {
        showNotification('❌ Offer tidak ditemukan. Silakan coba lagi.', 'error');
        return;
    }
    
    // Close modal
    closeModal();
    
    // Add user parameters to the offer URL
    const params = new URLSearchParams({
        user_id: generateUserId(),
        email: userProgress.userInfo.email,
        country: userProgress.userInfo.country,
        task_id: currentTaskId,
        source: 'giveaway_website'
    });
    
    const fullUrl = `${offer.url}?${params.toString()}`;
    
    // Open offer in new tab
    const offerWindow = window.open(fullUrl, '_blank');
    
    if (!offerWindow) {
        showNotification('❌ Popup diblokir! Silakan izinkan popup dan coba lagi.', 'error');
        return;
    }
    
    // Start task completion check
    startTaskVerification(currentTaskId, offerWindow);
    
    // Update task status to "In Progress"
    updateTaskStatus(currentTaskId, 'in_progress');
    
    // Track task start
    trackEvent('task_started', {
        task_id: currentTaskId,
        task_name: offer.name,
        user_email: userProgress.userInfo.email
    });
    
    showNotification('🚀 Task dimulai! Selesaikan di tab yang baru dibuka.', 'info');
}

// Start task verification process
function startTaskVerification(taskId, offerWindow) {
    let checkCount = 0;
    const maxChecks = 300; // 5 minutes
    
    const checkInterval = setInterval(() => {
        checkCount++;
        
        // Check if offer window is closed
        if (offerWindow.closed) {
            clearInterval(checkInterval);
            
            setTimeout(() => {
                if (!userProgress.tasks[taskId]?.completed) {
                    const confirmed = confirm(
                        `Apakah Anda telah menyelesaikan task "${CPA_OFFERS[taskId].name}" dengan sukses?\n\n` +
                        `Klik OK jika sudah selesai, Cancel jika belum.`
                    );
                    if (confirmed) {
                        completeTask(taskId);
                    } else {
                        updateTaskStatus(taskId, 'pending');
                    }
                }
            }, 2000);
            return;
        }
        
        // Auto-complete after timeout
        if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            
            if (!userProgress.tasks[taskId]?.completed) {
                const autoComplete = confirm(
                    `Waktu verifikasi habis. Apakah Anda sudah menyelesaikan task "${CPA_OFFERS[taskId].name}"?\n\n` +
                    `Klik OK jika sudah selesai, Cancel untuk mencoba lagi nanti.`
                );
                if (autoComplete) {
                    completeTask(taskId);
                } else {
                    updateTaskStatus(taskId, 'pending');
                }
            }
        }
    }, 1000);
}

// Complete a task
function completeTask(taskId) {
    if (userProgress.tasks[taskId]?.completed) {
        return; // Task already completed
    }
    
    userProgress.tasks[taskId] = {
        completed: true,
        completedAt: new Date().toISOString()
    };
    
    userProgress.completedTasks++;
    
    // Update UI
    updateTaskStatus(taskId, 'completed');
    updateProgressBar();
    
    // Save progress
    saveUserProgress();
    
    // Track completion
    trackEvent('task_completed', {
        task_id: taskId,
        task_name: CPA_OFFERS[taskId].name,
        user_email: userProgress.userInfo.email
    });
    
    // Show success notification
    showNotification(`🎉 Task "${CPA_OFFERS[taskId].name}" berhasil diselesaikan!`, 'success');
    
    // Check if all tasks are completed
    if (userProgress.completedTasks >= Object.keys(CPA_OFFERS).length) {
        setTimeout(() => {
            showCompletionMessage();
            createConfetti();
        }, 1000);
    }
}

// Update task status in UI
function updateTaskStatus(taskId, status) {
    const taskElement = document.querySelector(`[data-task="${taskId}"]`);
    if (!taskElement) return;
    
    taskElement.setAttribute('data-status', status);
    
    const button = taskElement.querySelector('.task-btn');
    const statusSpan = taskElement.querySelector('.task-status');
    
    switch (status) {
        case 'in_progress':
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> Sedang Berjalan...';
            statusSpan.textContent = '🔄 Berjalan';
            break;
        case 'completed':
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-check"></i> Selesai';
            button.classList.add('completed');
            statusSpan.textContent = '✅ Selesai';
            taskElement.classList.add('success-animation');
            break;
        case 'pending':
        default:
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-play"></i> Mulai Task';
            button.classList.remove('completed');
            statusSpan.textContent = '⏳ Menunggu';
            break;
    }
}

// Update progress bar
function updateProgressBar() {
    const totalTasks = Object.keys(CPA_OFFERS).length;
    const progressPercentage = totalTasks > 0 ? (userProgress.completedTasks / totalTasks) * 100 : 0;
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) {
        progressFill.style.width = progressPercentage + '%';
    }
    
    if (progressText) {
        progressText.textContent = `${userProgress.completedTasks}/${totalTasks} Tasks Selesai`;
    }
}

// Show completion message
function showCompletionMessage() {
    const completionSection = document.getElementById('completionSection');
    if (completionSection) {
        completionSection.style.display = 'block';
        completionSection.scrollIntoView({ behavior: 'smooth' });
        
        // Track giveaway entry
        trackEvent('giveaway_entered', {
            user_email: userProgress.userInfo.email,
            completion_time: new Date().toISOString(),
            total_tasks: Object.keys(CPA_OFFERS).length
        });
    }
}

// Show offer history
function showOfferHistory() {
    if (OFFER_HISTORY.length === 0) {
        showNotification('📊 Belum ada riwayat offer.', 'info');
        return;
    }
    
    let historyHTML = '<div class="history-content"><h4>📊 Riwayat Offers</h4>';
    OFFER_HISTORY.forEach((entry, index) => {
        historyHTML += `
            <div class="history-item">
                <div class="history-header">
                    <strong>Sesi ${index + 1}:</strong> ${getCountryName(entry.country)}
                    <span class="offer-count">${entry.totalOffers} offers</span>
                </div>
                <div class="history-date">${new Date(entry.timestamp).toLocaleString('id-ID')}</div>
            </div>
        `;
    });
    historyHTML += '</div>';
    
    document.getElementById('taskInstructions').innerHTML = historyHTML;
    document.getElementById('taskModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentTaskId = null;
}

// Share giveaway
function shareGiveaway() {
    const shareText = "🎁 Saya baru saja ikut MEGA GIVEAWAY 2024! Bergabunglah untuk kesempatan memenangkan hadiah fantastis senilai jutaan rupiah!";
    const shareUrl = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: 'MEGA GIVEAWAY 2024',
            text: shareText,
            url: shareUrl
        }).then(() => {
            showNotification('🎉 Berhasil dibagikan! Terima kasih!', 'success');
        }).catch((error) => {
            console.log('Error sharing:', error);
            fallbackShare(shareText, shareUrl);
        });
    } else {
        fallbackShare(shareText, shareUrl);
    }
    
    trackEvent('share_clicked', {
        user_email: userProgress.userInfo.email
    });
}

// Fallback share method
function fallbackShare(text, url) {
    const fullText = `${text} ${url}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(fullText).then(() => {
            showNotification('📋 Link berhasil disalin ke clipboard!', 'success');
        }).catch(() => {
            showShareModal(fullText);
        });
    } else {
        showShareModal(fullText);
    }
}

// Show share modal
function showShareModal(text) {
    document.getElementById('taskInstructions').innerHTML = `
        <div class="share-modal-content">
            <h4>📱 Bagikan Giveaway</h4>
            <p>Salin link di bawah ini dan bagikan ke teman-teman Anda:</p>
            <textarea readonly style="width: 100%; height: 80px; padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid #ddd;">${text}</textarea>
            <button onclick="copyToClipboard('${text.replace(/'/g, "\\'")}'); closeModal();" class="btn-primary">
                <i class="fas fa-copy"></i> Salin Link
            </button>
        </div>
    `;
    document.getElementById('taskModal').style.display = 'flex';
}

// Copy to clipboard
function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showNotification('📋 Link berhasil disalin!', 'success');
}

// Initialize countdown timer
function initializeCountdown() {
    // Set end date (48 hours from now)
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + 48);
    
    function updateTimer() {
        const now = new Date().getTime();
        const distance = endDate.getTime() - now;
        
        if (distance < 0) {
            const countdownContainer = document.querySelector('.countdown-timer');
            if (countdownContainer) {
                countdownContainer.innerHTML = '<div class="time-block"><span class="time-number">00</span><span class="time-label">BERAKHIR</span></div>';
            }
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 1.2rem;
        opacity: 0.8;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Get notification color based on type
function getNotificationColor(type) {
    const colors = {
        success: '#00b894',
        error: '#d63031',
        warning: '#fdcb6e',
        info: '#0984e3'
    };
    return colors[type] || colors.info;
}

// Generate unique user ID
function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Save user progress to localStorage
function saveUserProgress() {
    try {
        localStorage.setItem('giveawayProgress', JSON.stringify(userProgress));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Load user progress from localStorage
function loadUserProgress() {
    try {
        const saved = localStorage.getItem('giveawayProgress');
        if (saved) {
            userProgress = JSON.parse(saved);
            
            // If user has completed form, restore state
            if (userProgress.userInfo && userProgress.userInfo.email) {
                // Fill form with saved data
                const form = document.getElementById('giveawayForm');
                if (form) {
                    document.getElementById('name').value = userProgress.userInfo.name || '';
                    document.getElementById('email').value = userProgress.userInfo.email || '';
                    document.getElementById('phone').value = userProgress.userInfo.phone || '';
                    document.getElementById('country').value = userProgress.userInfo.country || '';
                }
                
                // Show task section if tasks exist
                if (Object.keys(CPA_OFFERS).length > 0) {
                    document.getElementById('taskSection').style.display = 'block';
                    renderTaskSection();
                }
            }
        }
    } catch (error) {
        console.error('Error loading progress:', error);
        userProgress = { completedTasks: 0, tasks: {}, userInfo: {} };
    }
}

// Track events for analytics
function trackEvent(eventName, data) {
    console.log('Event:', eventName, data);
    
    // Send to analytics services
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, data);
    }
    
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, data);
    }
}

// Create confetti effect
function createConfetti() {
    const confettiCount = 150;
    const confettiColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#ffeaa7', '#fab1a0'];
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                left: ${Math.random() * 100}vw;
                top: -10px;
                width: ${Math.random() * 8 + 4}px;
                height: ${Math.random() * 8 + 4}px;
                background: ${confettiColors[Math.floor(Math.random() * confettiColors.length)]};
                z-index: 9999;
                pointer-events: none;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                transform: rotate(${Math.random() * 360}deg);
            `;
            
            document.body.appendChild(confetti);
            
            // Animate falling
            let pos = -10;
            let rotation = Math.random() * 360;
            const interval = setInterval(() => {
                pos += Math.random() * 5 + 2;
                rotation += Math.random() * 10 - 5;
                confetti.style.top = pos + 'px';
                confetti.style.transform = `rotate(${rotation}deg)`;
                
                if (pos > window.innerHeight) {
                    clearInterval(interval);
                    if (confetti.parentElement) {
                        confetti.remove();
                    }
                }
            }, 50);
        }, i * 30);
    }
}

// Handle window focus events
window.addEventListener('focus', function() {
    if (currentTaskId && !userProgress.tasks[currentTaskId]?.completed) {
        setTimeout(() => {
            const taskName = CPA_OFFERS[currentTaskId]?.name || 'task';
            const completed = confirm(
                `Selamat datang kembali! 👋\n\n` +
                `Apakah Anda sudah menyelesaikan task "${taskName}"?\n\n` +
                `Klik OK jika sudah selesai, Cancel jika belum.`
            );
            if (completed) {
                completeTask(currentTaskId);
            }
        }, 1000);
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && currentTaskId && !userProgress.tasks[currentTaskId]?.completed) {
        // User returned to page while task is in progress
        console.log('User returned to page during task:', currentTaskId);
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Show terms modal
function showTerms() {
    document.getElementById('taskInstructions').innerHTML = `
        <div class="terms-content">
            <h4>📋 Syarat & Ketentuan</h4>
            <div class="terms-text">
                <p><strong>1. Persyaratan Peserta:</strong></p>
                <ul>
                    <li>Peserta minimal berusia 18 tahun</li>
                    <li>Memiliki alamat email dan nomor WhatsApp yang aktif</li>
                    <li>Menyelesaikan semua task yang diberikan</li>
                </ul>
                
                <p><strong>2. Cara Mengikuti:</strong></p>
                <ul>
                    <li>Isi form pendaftaran dengan data yang valid</li>
                    <li>Selesaikan semua task yang tersedia</li>
                    <li>Tunggu pengumuman pemenang</li>
                </ul>
                
                <p><strong>3. Pengumuman Pemenang:</strong></p>
                <ul>
                    <li>Pemenang akan diumumkan dalam 24-48 jam</li>
                    <li>Pemberitahuan akan dikirim via email</li>
                    <li>Pemenang harus merespon dalam 7 hari</li>
                </ul>
                
                <p><strong>4. Lain-lain:</strong></p>
                <ul>
                    <li>Keputusan panitia tidak dapat diganggu gugat</li>
                    <li>Giveaway ini tidak terkait dengan platform media sosial</li>
                    <li>Data peserta akan dijaga kerahasiaannya</li>
                </ul>
            </div>
        </div>
    `;
    document.getElementById('taskModal').style.display = 'flex';
}

// Show privacy modal
function showPrivacy() {
    document.getElementById('taskInstructions').innerHTML = `
        <div class="privacy-content">
            <h4>🔒 Kebijakan Privasi</h4>
            <div class="privacy-text">
                <p><strong>Pengumpulan Data:</strong></p>
                <p>Kami mengumpulkan data pribadi Anda (nama, email, nomor telefon) hanya untuk keperluan giveaway ini.</p>
                
                <p><strong>Penggunaan Data:</strong></p>
                <ul>
                    <li>Verifikasi peserta giveaway</li>
                    <li>Komunikasi terkait giveaway</li>
                    <li>Pengiriman hadiah kepada pemenang</li>
                </ul>
                
                <p><strong>Perlindungan Data:</strong></p>
                <ul>
                    <li>Data Anda disimpan dengan aman</li>
                    <li>Tidak akan dibagikan kepada pihak ketiga</li>
                    <li>Akan dihapus setelah giveaway selesai</li>
                </ul>
                
                <p><strong>Hak Anda:</strong></p>
                <ul>
                    <li>Mengakses data pribadi Anda</li>
                    <li>Meminta penghapusan data</li>
                    <li>Mengajukan pertanyaan tentang privasi</li>
                </ul>
            </div>
        </div>
    `;
    document.getElementById('taskModal').style.display = 'flex';
}

// Show contact modal
function showContact() {
    document.getElementById('taskInstructions').innerHTML = `
        <div class="contact-content">
            <h4>📞 Informasi Kontak</h4>
            <div class="contact-info">
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <span><strong>Email:</strong> support@megagiveaway.com</span>
                </div>
                <div class="contact-item">
                    <i class="fab fa-whatsapp"></i>
                    <span><strong>WhatsApp:</strong> +62 812-3456-7890</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-clock"></i>
                    <span><strong>Jam Operasional:</strong> 08:00 - 22:00 WIB</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span><strong>Alamat:</strong> Jakarta, Indonesia</span>
                </div>
            </div>
            <p style="margin-top: 20px; color: #666;">
                Jika Anda memiliki pertanyaan atau membutuhkan bantuan, 
                jangan ragu untuk menghubungi tim support kami.
            </p>
        </div>
    `;
    document.getElementById('taskModal').style.display = 'flex';
}

// Add CSS for notifications
const notificationCSS = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(102, 126, 234, 0.3);
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }
    
    .loading-container {
        text-align: center;
        padding: 60px 20px;
    }
    
    .loading-container h3 {
        color: #667eea;
        margin-bottom: 15px;
    }
    
    .loading-container p {
        color: #666;
    }
    
    .instruction-steps {
        margin: 20px 0;
    }
    
    .step {
        display: flex;
        align-items: center;
        margin: 12px 0;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .step-num {
        background: #667eea;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 600;
        margin-right: 12px;
        flex-shrink: 0;
    }
    
    .instruction-warning {
        background: #fff3cd;
        border: 1px solid #ffeeba;
        color: #856404;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .instruction-info {
        display: grid;
        gap: 10px;
        margin-top: 20px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .info-item {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .info-item i {
        color: #667eea;
        width: 20px;
    }
    
    .task-header {
        display: flex;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .task-icon {
        font-size: 2.5rem;
        margin-top: 5px;
    }
    
    .task-meta {
        display: flex;
        gap: 20px;
        margin-top: 10px;
        flex-wrap: wrap;
    }
    
    .task-meta span {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9rem;
        color: #666;
    }
    
    .task-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-top: 15px;
    }
    
    .task-btn.completed {
        background: #00b894 !important;
    }
    
    .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .progress-info h4 {
        margin: 0;
        color: #2d3436;
    }
    
    .offer-detail {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #2d3436;
    }
    
    .history-item {
        padding: 15px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin-bottom: 10px;
    }
    
    .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
    }
    
    .offer-count {
        background: #667eea;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
    }
    
    .history-date {
        font-size: 0.9rem;
        color: #666;
    }
    
    .contact-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px 0;
        border-bottom: 1px solid #eee;
    }
    
    .contact-item:last-child {
        border-bottom: none;
    }
    
    .contact-item i {
        color: #667eea;
        width: 20px;
    }
    
    .terms-text ul, .privacy-text ul {
        padding-left: 20px;
        margin: 10px 0;
    }
    
    .terms-text li, .privacy-text li {
        margin: 5px 0;
    }
`;

// Inject CSS
const styleSheet = document.createElement("style");
styleSheet.innerText = notificationCSS;
document.head.appendChild(styleSheet);
