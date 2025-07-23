// Import performance optimization modules
import QuestionLoader from './questionLoader.js';
import ImageOptimizer from './imageOptimizer.js';
import PerformanceMonitor from './performanceMonitor.js';

// Initialize performance optimizations
let questionLoader = null;
let imageOptimizer = null;
let performanceMonitor = null;

// Make userManager and authUI global
let userManager = null;
let authUI = null;

document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    
    // Detect current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Initialize performance optimizations
    questionLoader = new QuestionLoader();
    imageOptimizer = new ImageOptimizer();
    performanceMonitor = new PerformanceMonitor();
    
    // Make available globally for debugging
    window.questionLoader = questionLoader;
    window.performanceMonitor = performanceMonitor;
    
    // Start memory monitoring
    performanceMonitor.monitorMemoryUsage();
    
    // Initialize user system if UserManager is available
    if (typeof UserManager !== 'undefined') {
        userManager = new UserManager();
        authUI = new AuthUI(userManager);
    }
    
    // Quiz state
    let quizState = {
        questions: [],
        current: 0,
        answers: [],
        timer: 300, 
        interval: null,
        category: null,
        totalQuestions: 0
    };

    // Calculate timer based on number of questions (15 seconds per question)
    function calculateTimer(questionCount) {
        return questionCount * 15;
    }
    
    // Make available globally for debugging
    window.calculateTimer = calculateTimer;
    
    // App state
    let appState = {
        hamburgerEnabled: false
    };
    
    // Enable hamburger menu for About and Contact pages
    if (currentPage === 'about.html' || currentPage === 'contact.html') {
        appState.hamburgerEnabled = true;
    }

    // Only run quiz-specific code on the main page
    if (currentPage === 'index.html' || currentPage === '') {
        // Restore quiz state if present in sessionStorage
        let savedState = sessionStorage.getItem('quizState');
        if (savedState) {
            quizState = JSON.parse(savedState);
            // Load questions asynchronously
            questionLoader.loadQuestionModule(quizState.category)
                .then(questions => {
                    quizState.questions = questions;
                    quizState.totalQuestions = questions.length;
                    // Recalculate timer based on actual question count
                    if (!quizState.timer || quizState.timer === 300) {
                        quizState.timer = calculateTimer(quizState.totalQuestions);
                    }
                    // Enable hamburger menu if quiz is in progress
                    appState.hamburgerEnabled = true;
                    renderNavbar();
                    renderFooter();
                    renderQuestionPage();
                    startTimer();
                })
                .catch(error => {
                    console.error('Failed to restore quiz state:', error);
                    // Clear invalid state
                    sessionStorage.removeItem('quizState');
                    renderNavbar();
                    renderHomePage().then(() => {
                        renderFooter();
                        renderWelcomeModal();
                    });
                });
            return;
        }

        // Check for time up on load
        if (sessionStorage.getItem('quizTimeUp') === '1') {
            // Enable hamburger menu if time is up (user has interacted with quiz)
            appState.hamburgerEnabled = true;
            renderNavbar();
            renderFooter();
            showTimeUpModal();
            return;
        }

        // If no quiz in progress, render home and welcome modal
        renderNavbar();
        renderHomePage().then(() => {
            renderFooter();
            renderWelcomeModal();
        });
    } else {
        // For About and Contact pages, just render navbar and footer
        renderNavbar();
        renderFooter();
    }

    async function startQuiz(category) {
        try {
            // Show loading indicator
            mainContent.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading questions...</p>
                </div>
            `;
            
            // Load questions with lazy loading
            const questions = await questionLoader.loadQuestionModule(category);
            quizState.questions = questions; // Use all available questions
            quizState.totalQuestions = questions.length;
            quizState.timer = calculateTimer(quizState.totalQuestions); // Calculate dynamic timer
            
            // Update performance metrics
            try {
                const metrics = questionLoader.getMetrics();
                if (metrics && performanceMonitor) {
                    performanceMonitor.updateCacheMetrics(
                        metrics.cacheHitRate || 0,
                        metrics.cacheHits || 0,
                        metrics.cacheMisses || 0
                    );
                    performanceMonitor.updateMemoryUsage(metrics.estimatedSizeKB || 0);
                }
            } catch (error) {
                console.warn('Failed to update performance metrics:', error);
            }
            quizState.current = 0;
            quizState.answers = Array(quizState.totalQuestions).fill(null);
            quizState.category = category;
            saveQuizState();
            renderQuestionPage();
            startTimer();
            
            // Preload next likely categories
            questionLoader.preloadNextLikelyCategories(category);
            
        } catch (error) {
            console.error('Failed to start quiz:', error);
            mainContent.innerHTML = `
                <div class="error-container">
                    <h2>Error Loading Quiz</h2>
                    <p>Failed to load questions for ${category}.</p>
                    <p><small>Error: ${error.message}</small></p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    // Escape HTML for safe display of options
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderQuestionPage() {
        const currentIndex = quizState.current;
        const totalQuestions = quizState.totalQuestions;
        
        // Determine which questions to show in carousel
        const isMobile = window.innerWidth <= 600;
        let visibleQuestions = [];
        
        if (isMobile) {
            // Mobile: show only current question
            visibleQuestions = [currentIndex];
        } else {
            // Desktop: show previous, current, and next questions
            visibleQuestions = [
                currentIndex > 0 ? currentIndex - 1 : null,
                currentIndex,
                currentIndex < totalQuestions - 1 ? currentIndex + 1 : null
            ].filter(index => index !== null);
        }
        
        // Generate carousel HTML
        const carouselHTML = visibleQuestions.map((index, carouselIndex) => {
            const q = quizState.questions[index];
            const isActive = index === currentIndex;
            const cardClass = isActive ? 'active' : 
                            index < currentIndex ? 'prev' : 'next';
            
            return `
                <div class="question-card ${cardClass}" data-question-index="${index}">
                    <h2>Question ${index + 1} of ${totalQuestions}</h2>
                    <p>${escapeHTML(q.q)}</p>
                    <form class="question-form" data-question-index="${index}">
                        ${q.options.map((opt, i) => `
                            <label class="option-label">
                                <input type="radio" name="option-${index}" value="${i}" 
                                    ${quizState.answers[index] === i ? 'checked' : ''} 
                                    aria-label="Answer option ${escapeHTML(opt)}" />
                                ${escapeHTML(opt)}
                            </label><br>
                        `).join('')}
                    </form>
                </div>
            `;
        }).join('');
        
        mainContent.innerHTML = `
            <div class="quiz-header">
                <span>Category: ${quizState.category}</span>
                <span id="timer">Time left: ${formatTime(quizState.timer)}</span>
                <span class="time-per-question">(${formatTimeForDisplay(15)} per question)</span>
            </div>
            <button class="carousel-arrow prev" id="carousel-prev" 
                        ${currentIndex === 0 ? 'disabled' : ''} 
                        aria-label="Previous question">
                    ‹
                </button>
            <div class="quiz-carousel-container">
            
                <div class="quiz-carousel" id="quiz-carousel">
                    ${carouselHTML}
                </div>
        
            </div>
            <button class="carousel-arrow next" id="carousel-next" 
                        ${currentIndex === totalQuestions - 1 ? 'disabled' : ''} 
                        aria-label="Next question">
                    ›
                </button>
            <div class="quiz-nav">
                <button id="prev-btn" ${currentIndex === 0 ? 'disabled' : ''} aria-label="Previous question">Previous</button>
                <button id="next-btn" aria-label="${currentIndex === totalQuestions - 1 ? 'Finish quiz' : 'Next question'}">${currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'}</button>
                <button id="exit-btn" class="exit" aria-label="Exit quiz">Exit</button>
            </div>
        `;
        // Carousel navigation
        document.getElementById('carousel-prev').onclick = (e) => {
            e.preventDefault();
            if (currentIndex > 0) {
                quizState.current--;
                renderQuestionPage();
            }
        };
        
        document.getElementById('carousel-next').onclick = (e) => {
            e.preventDefault();
            if (currentIndex < totalQuestions - 1) {
                quizState.current++;
                renderQuestionPage();
            }
        };
        
        // Bottom navigation buttons
        document.getElementById('prev-btn').onclick = (e) => {
            e.preventDefault();
            if (currentIndex > 0) {
                quizState.current--;
                renderQuestionPage();
            }
        };
        
        document.getElementById('next-btn').onclick = (e) => {
            e.preventDefault();
            const selected = document.querySelector(`input[name=\"option-${currentIndex}\"]:checked`);
            quizState.answers[currentIndex] = selected ? parseInt(selected.value) : null;
            if (currentIndex < totalQuestions - 1) {
                quizState.current++;
                renderQuestionPage();
            } else {
                // Check for unanswered questions
                if (quizState.answers.includes(null)) {
                    showUnansweredWarning();
                } else {
                    showResultsPage();
                }
            }
        };
        
        document.getElementById('exit-btn').onclick = (e) => {
            e.preventDefault();
            showExitModal();
        };
        
        // Handle form submissions and answer selection for all visible cards
        document.querySelectorAll('.question-form').forEach(form => {
            form.onsubmit = (e) => e.preventDefault();
            const qIndex = parseInt(form.getAttribute('data-question-index'));
            form.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.onchange = (e) => {
                    quizState.answers[qIndex] = parseInt(radio.value);
                    saveQuizState();
                };
            });
        });
        
        // Ensure the selected answer is checked after refresh (for all visible cards)
        visibleQuestions.forEach(index => {
            const selected = quizState.answers[index];
            if (selected !== null) {
                const radio = document.querySelector(`input[name='option-${index}'][value='${selected}']`);
                if (radio) radio.checked = true;
            }
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
        
        // Add touch/swipe support for mobile
        if (isMobile) {
            addTouchSupport();
        }
        
        // Clean up event listeners when component unmounts
        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyboardNavigation);
        };
        
        // Store cleanup function for later use
        window.quizCleanup = cleanup;
        
        saveQuizState();
    }

    // Keyboard navigation for carousel
    function handleKeyboardNavigation(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (quizState.current > 0) {
                quizState.current--;
                renderQuestionPage();
            }
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (quizState.current < quizState.totalQuestions - 1) {
                quizState.current++;
                renderQuestionPage();
            }
        }
    }
    
    // Touch/swipe support for mobile
    function addTouchSupport() {
        const carousel = document.getElementById('quiz-carousel');
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        carousel.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Check if it's a horizontal swipe (not vertical scroll)
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // Swipe left - go to next question
                    if (quizState.current < quizState.totalQuestions - 1) {
                        quizState.current++;
                        renderQuestionPage();
                    }
                } else {
                    // Swipe right - go to previous question
                    if (quizState.current > 0) {
                        quizState.current--;
                        renderQuestionPage();
                    }
                }
            }
        }, { passive: true });
    }
    
    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // Format time for display in instructions (e.g., "2m 30s")
    function formatTimeForDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes === 0) {
            return `${remainingSeconds}s`;
        } else if (remainingSeconds === 0) {
            return `${minutes}m`;
        } else {
            return `${minutes}m ${remainingSeconds}s`;
        }
    }
    
    // Make available globally for debugging
    window.formatTimeForDisplay = formatTimeForDisplay;

    function startTimer() {
        if (quizState.interval) clearInterval(quizState.interval);
        quizState.interval = setInterval(() => {
            quizState.timer--;
            saveQuizState();
            const timerEl = document.getElementById('timer');
            if (timerEl) timerEl.textContent = `Time left: ${formatTime(quizState.timer)}`;
            if (quizState.timer <= 0) {
                clearInterval(quizState.interval);
                sessionStorage.setItem('quizTimeUp', '1');
                showTimeUpModal();
            }
        }, 1000);
    }

    // Use sessionStorage for quizState instead of localStorage
    function saveQuizState() {
        sessionStorage.setItem('quizState', JSON.stringify({
            category: quizState.category,
            current: quizState.current,
            answers: quizState.answers,
            timer: quizState.timer,
            totalQuestions: quizState.totalQuestions
        }));
    }

    // Show exit confirmation modal
    function showExitModal() {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="exit-modal-title">
                <div class="modal-content">
                    <h2 id="exit-modal-title">Exit Quiz?</h2>
                    <p>Are you sure you want to exit? Your progress will be lost.</p>
                    <button id="confirm-exit" aria-label="Confirm exit">Yes, Exit</button>
                    <button id="cancel-exit" aria-label="Cancel exit">Cancel</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('confirm-exit').onclick = function() {
            modalRoot.classList.remove('active');
            
            // Clean up event listeners
            if (window.quizCleanup) {
                window.quizCleanup();
                window.quizCleanup = null;
            }
            
            sessionStorage.removeItem('quizState');
            // Return to category page
            location.reload();
        };
        document.getElementById('cancel-exit').onclick = function() {
            modalRoot.classList.remove('active');
        };
    }

    function showUnansweredWarning() {
        let warning = document.getElementById('unanswered-warning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'unanswered-warning';
            warning.setAttribute('role', 'alert');
            warning.style.color = 'red';
            warning.style.margin = '1rem 0';
            warning.textContent = 'You have unanswered questions. Please answer all questions before viewing results.';
            mainContent.insertBefore(warning, mainContent.firstChild);
        }
    }

    function showResultsPage() {
        clearInterval(quizState.interval);
        
        // Clean up event listeners
        if (window.quizCleanup) {
            window.quizCleanup();
            window.quizCleanup = null;
        }
        
        addCompletedCategory(quizState.category);
        sessionStorage.removeItem('quizState');
        let score = 0;
        let resultsHtml = quizState.questions.map((q, i) => {
            const userAns = quizState.answers[i];
            const isCorrect = userAns === q.answer;
            if (isCorrect) score++;
            return `
                <div class="result-question">
                    <h3>Q${i + 1}: ${escapeHTML(q.q)}</h3>
                    <ul>
                        ${q.options.map((opt, idx) => {
                            let style = '';
                            if (idx === q.answer) style = 'color: green; font-weight: bold;';
                            if (userAns === idx && !isCorrect) style = 'color: red; font-weight: bold;';
                            return `<li style="${style}">${escapeHTML(opt)}${idx === q.answer ? ' (Correct)' : ''}${userAns === idx && !isCorrect ? ' (Your answer)' : ''}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }).join('');
        
        // Update user progress if logged in
        if (userManager && userManager.getCurrentUser()) {
            const quizData = {
                category: quizState.category,
                score: score,
                totalQuestions: quizState.totalQuestions,
                timeLeft: quizState.timer
            };
            userManager.updateProgress(quizData);
            
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('quizCompleted', { detail: quizData }));
        }
        
        mainContent.innerHTML = `
            <section class="results-section">
                <h2>Quiz Results</h2>
                <div class="results-list">${resultsHtml}</div>
                <div class="results-summary">
                    <p><b>Score:</b> ${score} / ${quizState.totalQuestions}</p>
                    <p><b>Time Left:</b> ${formatTime(quizState.timer)}</p>
                    ${userManager && userManager.getCurrentUser() ? `
                        <p><b>Progress Saved!</b> Your results have been recorded.</p>
                    ` : `
                        <p><small>Sign in to save your progress and track your performance!</small></p>
                    `}
                </div>
                <button id="go-home-btn">Go Home</button>
            </section>
        `;
        document.getElementById('go-home-btn').onclick = () => location.reload();
    }

    // Helper to get 20 questions (repeat if less for demo)
    // Legacy function for backward compatibility
    function getQuestionsForCategory(category) {
        // This function is now deprecated in favor of questionLoader
        // It's kept for compatibility with existing code
        console.warn('getQuestionsForCategory is deprecated. Use questionLoader.loadQuestionModule() instead.');
        return [];
    }

    // Helper function to get question count for a category
    async function getQuestionCountForCategory(category) {
        try {
            const questions = await questionLoader.loadQuestionModule(category);
            return questions.length;
        } catch (error) {
            console.warn(`Failed to get question count for ${category}:`, error);
            return 0;
        }
    }

    async function showInstructionsModal(category) {
        console.log(`🔍 showInstructionsModal called for: ${category}`);
        
        // Get question count to calculate time
        let questionCount = 0;
        let timeDisplay = "5 minutes";
        
        try {
            console.log(`📥 Loading questions for ${category}...`);
            const questions = await questionLoader.loadQuestionModule(category);
            questionCount = questions.length;
            console.log(`✅ Loaded ${questionCount} questions for ${category}`);
            
            const totalSeconds = calculateTimer(questionCount);
            timeDisplay = formatTimeForDisplay(totalSeconds);
            console.log(`⏱️ Calculated time: ${totalSeconds}s = ${timeDisplay}`);
            
        } catch (error) {
            console.error('❌ Could not load questions for time calculation:', error);
            timeDisplay = "5 minutes"; // fallback
        }

        console.log(`🎨 Creating modal with: timeDisplay="${timeDisplay}", questionCount=${questionCount}`);
        
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="instructions-modal-title">
                <div class="modal-content">
                    <h2 id="instructions-modal-title">Instructions for ${category}</h2>
                    <ul style="text-align:left; margin-bottom:1.5rem;">
                        <li>You have <b>${timeDisplay}</b> to complete ${questionCount || 'the'} question${questionCount !== 1 ? 's' : ''}.</li>
                        <li>Each question is on a separate page.</li>
                        <li>Use <b>Next</b> and <b>Previous</b> to navigate.</li>
                        <li>Click <b>Exit</b> anytime to leave the quiz (confirmation required).</li>
                        <li>Unanswered questions will be highlighted before you can view results.</li>
                    </ul>
                    <button id="proceed-quiz-btn" aria-label="Proceed to start quiz">Proceed to Start</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('proceed-quiz-btn').onclick = async function() {
            try {
                const questions = await questionLoader.loadQuestionModule(category);
                // Check if the category has any real questions
                if (!questions.length) {
                    showNoQuestionsModal();
                    return;
                }
                modalRoot.classList.remove('active');
                startQuiz(category);
            } catch (error) {
                console.error('Failed to load questions:', error);
                showNoQuestionsModal();
            }
        };
    }

    function showNoQuestionsModal() {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="no-questions-title">
                <div class="modal-content">
                    <h2 id="no-questions-title">No Questions</h2>
                    <p>There are no questions in this category.</p>
                    <button id="close-no-questions" aria-label="Close no questions modal">Close</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('close-no-questions').onclick = function() {
            modalRoot.classList.remove('active');
        };
    }

    //Navigation bar and footer rendering
    function renderNavbar() {
        const navbar = document.getElementById('navbar');
        if (!navbar) {
            console.warn('Navbar element not found!');
            return;
        }
        const currentUser = userManager ? userManager.getCurrentUser() : null;
        const isMobile = window.innerWidth <= 700;
        // Theme switcher button (sun/moon)
        const themeIcon = document.body.classList.contains('dark-mode')
            ? '<span id="theme-switcher" class="theme-switcher" title="Switch to light mode" aria-label="Switch to light mode" tabindex="0">🌞</span>'
            : '<span id="theme-switcher" class="theme-switcher" title="Switch to dark mode" aria-label="Switch to dark mode" tabindex="0">🌙</span>';
        navbar.innerHTML = `
            <nav class="navbar" role="navigation" aria-label="Main Navigation">
                <div class="navbar-brand">Master Quiz</div>
                <div class="navbar-center">
                    <ul class="navbar-links" id="navbar-links">
                        <li><a href="index.html">Home</a></li>
                        <li><a href="about.html">About</a></li>
                        <li><a href="contact.html">Contact</a></li>
                    </ul>
                </div>
                <div class="navbar-right">
                    <div class="hamburger" id="hamburger" tabindex="0" aria-label="Open navigation menu" aria-expanded="false" style="${!appState.hamburgerEnabled ? 'pointer-events: none; opacity: 0.5;' : ''}">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    ${themeIcon}
                    ${!isMobile ? (
                        currentUser ? `
                            <div class="user-section">
                                <span class="username">${currentUser.username}</span>
                                <button class="profile-btn" id="show-profile" aria-label="Open profile modal">Profile</button>
                            </div>
                        ` : `
                            <div class="auth-buttons">
                                <button class="auth-btn-small" id="show-login" aria-label="Sign in">Sign In</button>
                                <button class="auth-btn-small primary" id="show-register" aria-label="Sign up">Sign Up</button>
                            </div>
                        `
                    ) : ''}
                </div>
            </nav>
        `;
        // Insert auth/user buttons into dropdown for mobile
        if (isMobile) {
            const navLinks = navbar.querySelector('#navbar-links');
            console.log('🍔 Mobile view - navLinks found:', !!navLinks);
            if (navLinks) {
                if (currentUser) {
                    const userSection = document.createElement('li');
                    userSection.className = 'user-section';
                    userSection.innerHTML = `
                        <span class="username">${currentUser.username}</span>
                        <button class="profile-btn" id="show-profile" aria-label="Open profile modal">Profile</button>
                    `;
                    navLinks.appendChild(userSection);
                    console.log('🍔 Added user section to mobile nav');
                } else {
                    const authButtons = document.createElement('li');
                    authButtons.className = 'auth-buttons';
                    authButtons.innerHTML = `
                        <button class="auth-btn-small" id="show-login" aria-label="Sign in">Sign In</button>
                        <button class="auth-btn-small primary" id="show-register" aria-label="Sign up">Sign Up</button>
                    `;
                    navLinks.appendChild(authButtons);
                    console.log('🍔 Added auth buttons to mobile nav');
                }
            } else {
                console.warn('🍔 navLinks element not found in mobile view');
            }
        }
        
        // Hamburger menu toggle
        const hamburgerBtn = document.getElementById('hamburger');
        const navLinksDropdown = document.getElementById('navbar-links');
        
        if (hamburgerBtn && navLinksDropdown) {
            console.log('🍔 Hamburger menu elements found successfully');
            hamburgerBtn.addEventListener('click', function() {
                console.log('🍔 Hamburger clicked!');
                console.log('🍔 Hamburger enabled:', appState.hamburgerEnabled);
                console.log('🍔 navLinksDropdown element:', navLinksDropdown);
                console.log('🍔 navLinksDropdown classes before:', navLinksDropdown.className);
                if (appState.hamburgerEnabled) {
                    navLinksDropdown.classList.toggle('active');
                    hamburgerBtn.classList.toggle('active');
                    const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
                    hamburgerBtn.setAttribute('aria-expanded', !expanded);
                    console.log('🍔 Navigation toggled, active:', navLinksDropdown.classList.contains('active'));
                    console.log('🍔 navLinksDropdown classes after:', navLinksDropdown.className);
                }
            });
        } else {
            console.warn('🍔 Hamburger menu elements not found:', { hamburgerBtn: !!hamburgerBtn, navLinksDropdown: !!navLinksDropdown });
            console.log('🍔 Available elements in navbar:', navbar.querySelectorAll('*'));
        }
        if (hamburgerBtn && navLinksDropdown) {
            hamburgerBtn.addEventListener('keydown', function(e) {
                if (appState.hamburgerEnabled && (e.key === 'Enter' || e.key === ' ')) {
                    navLinksDropdown.classList.toggle('active');
                    hamburgerBtn.classList.toggle('active');
                    const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
                    hamburgerBtn.setAttribute('aria-expanded', !expanded);
                }
            });
        }
        
        // Add navigation event listeners
        const navLinksElements = document.querySelectorAll('.navbar-links a');
        navLinksElements.forEach(link => {
            link.addEventListener('click', function(e) {
                if (navLinksDropdown && hamburgerBtn) {
                    navLinksDropdown.classList.remove('active');
                    hamburgerBtn.classList.remove('active');
                    hamburgerBtn.setAttribute('aria-expanded', 'false');
                }
            });
        });
        
        // Add authentication event listeners
        if (authUI) {
            const showLoginBtn = document.getElementById('show-login');
            const showRegisterBtn = document.getElementById('show-register');
            const showProfileBtn = document.getElementById('show-profile');
            
            if (showLoginBtn) {
                showLoginBtn.addEventListener('click', () => authUI.showLoginModal());
            }
            if (showRegisterBtn) {
                showRegisterBtn.addEventListener('click', () => authUI.showRegisterModal());
            }
            if (showProfileBtn) {
                showProfileBtn.addEventListener('click', () => authUI.showProfileModal());
            }
        }
        // Theme switcher logic
        const themeSwitcher = document.getElementById('theme-switcher');
        if (themeSwitcher) {
            themeSwitcher.addEventListener('click', toggleTheme);
            themeSwitcher.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTheme();
                }
            });
        }
    }
    window.renderNavbar = renderNavbar;

    // Theme logic
    function applyThemeFromStorage() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        renderNavbar(); // update icon
    }
    // On load, apply theme
    applyThemeFromStorage();

    function renderFooter() {
        const footer = document.getElementById('footer');
        footer.innerHTML = `
            <div class="footer-content">
                &copy; ${new Date().getFullYear()} Quiz App. All rights reserved.
            </div>
        `;
    }

    // Track completed categories in sessionStorage (not localStorage)
    function getCompletedCategories() {
        return JSON.parse(sessionStorage.getItem('completedCategories') || '[]');
    }
    function addCompletedCategory(category) {
        const completed = getCompletedCategories();
        if (!completed.includes(category)) {
            completed.push(category);
            sessionStorage.setItem('completedCategories', JSON.stringify(completed));
        }
    }

    // Update renderHomePage to disable completed categories
    async function renderHomePage() {
        // Ensure theme is applied when returning to home
        applyThemeFromStorage();
        
        const htmlCategories = [
            'HTML Introduction',
            'Text Formatting',
            'Lists',
            'Links',
            'Images',
            'Media',
            'Tables',
            'Forms',
            'Other Questions (Semantic tags and attributes)'
        ];
        
        const cssCategories = [
            'Introduction to CSS',
            'CSS Selectors',
            'Box Model',
            'Typography',
            'Colors',
            'Borders',
            'Box/Text Shadow',
            'Display Properties'
        ];
        
        const jsCategories = [
            // JavaScript categories will be added later
        ];
        
        // Get all categories for progress tracking
        const allCategories = [...htmlCategories, ...cssCategories, ...jsCategories];
        const completed = getCompletedCategories();
        let userStats = null;
        if (userManager && userManager.getCurrentUser()) {
            userStats = userManager.getUserStats().categoryStats;
        }
        // Get in-progress quiz state for partial progress
        let inProgressState = null;
        let inProgressCategory = null;
        let inProgressAnswered = 0;
        let inProgressTotal = 0;
        const savedState = sessionStorage.getItem('quizState');
        if (savedState) {
            inProgressState = JSON.parse(savedState);
            inProgressCategory = inProgressState.category;
            inProgressAnswered = Array.isArray(inProgressState.answers) ? inProgressState.answers.filter(a => a !== null).length : 0;
            inProgressTotal = inProgressState.totalQuestions || 0;
        }
        // Get question counts for all categories
        const questionCounts = {};
        for (const cat of allCategories) {
            questionCounts[cat] = await getQuestionCountForCategory(cat);
        }

        mainContent.innerHTML = `
            <section class="categories-section">
                <h1>Quiz Categories</h1>
                
                <!-- Tab Navigation -->
                <div class="category-tabs">
                    <button class="tab-btn active" data-tab="html">🌐 HTML</button>
                    <button class="tab-btn" data-tab="css">🎨 CSS</button>
                    <button class="tab-btn" data-tab="js">⚡ JavaScript</button>
                </div>
                
                <!-- HTML Categories Tab -->
                <div id="html-categories" class="tab-content active">
                    <div class="categories-buttons">
                        ${htmlCategories.map(cat => {
                            const questionCount = questionCounts[cat] || 0;
                            // Progress calculation
                            let percent = 0;
                            let label = '';
                            let ariaValue = 0;
                            let ariaMax = questionCount;
                            if (userStats && userStats[cat]) {
                                // Show best score if available, else attempts
                                if (userStats[cat].bestScore !== undefined) {
                                    percent = Math.round((userStats[cat].bestScore / questionCount) * 100);
                                    label = `Score: ${userStats[cat].bestScore}/${questionCount}`;
                                    ariaValue = userStats[cat].bestScore;
                                } else if (userStats[cat].attempts > 0) {
                                    percent = 100;
                                    label = 'Completed';
                                    ariaValue = questionCount;
                                }
                            } else if (completed.includes(cat)) {
                                percent = 100;
                                label = 'Completed';
                                ariaValue = questionCount;
                            } else if (inProgressCategory === cat && inProgressAnswered > 0) {
                                percent = Math.round((inProgressAnswered / inProgressTotal) * 100);
                                label = `${inProgressAnswered}/${questionCount} answered`;
                                ariaValue = inProgressAnswered;
                            }
                            return `
                            <div class="category-btn-wrapper">
                                <button class="category-btn" data-category="${cat}" ${completed.includes(cat) ? 'disabled style=\"opacity:0.5;cursor:not-allowed;\"' : ''}>${cat}${completed.includes(cat) ? ' (Completed)' : ''}</button>
                                <div class="category-progress-label" style="font-size:0.95rem;margin-bottom:0.1rem;color:#007bff;min-height:1.2em;">${label}</div>
                                <div class="category-progress-bar" role="progressbar" aria-valuenow="${ariaValue}" aria-valuemin="0" aria-valuemax="${questionCount}" aria-label="${cat} progress: ${label}">
                                    <div class="category-progress-fill" style="width:${percent}%;"></div>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- CSS Categories Tab -->
                <div id="css-categories" class="tab-content">
                    <div class="categories-buttons">
                        ${cssCategories.map(cat => {
                            const questionCount = questionCounts[cat] || 0;
                            // Progress calculation
                            let percent = 0;
                            let label = '';
                            let ariaValue = 0;
                            let ariaMax = questionCount;
                            if (userStats && userStats[cat]) {
                                // Show best score if available, else attempts
                                if (userStats[cat].bestScore !== undefined) {
                                    percent = Math.round((userStats[cat].bestScore / questionCount) * 100);
                                    label = `Score: ${userStats[cat].bestScore}/${questionCount}`;
                                    ariaValue = userStats[cat].bestScore;
                                } else if (userStats[cat].attempts > 0) {
                                    percent = 100;
                                    label = 'Completed';
                                    ariaValue = questionCount;
                                }
                            } else if (completed.includes(cat)) {
                                percent = 100;
                                label = 'Completed';
                                ariaValue = questionCount;
                            } else if (inProgressCategory === cat && inProgressAnswered > 0) {
                                percent = Math.round((inProgressAnswered / inProgressTotal) * 100);
                                label = `${inProgressAnswered}/${questionCount} answered`;
                                ariaValue = inProgressAnswered;
                            }
                            return `
                            <div class="category-btn-wrapper">
                                <button class="category-btn" data-category="${cat}" ${completed.includes(cat) ? 'disabled style=\"opacity:0.5;cursor:not-allowed;\"' : ''}>${cat}${completed.includes(cat) ? ' (Completed)' : ''}</button>
                                <div class="category-progress-label" style="font-size:0.95rem;margin-bottom:0.1rem;color:#007bff;min-height:1.2em;">${label}</div>
                                <div class="category-progress-bar" role="progressbar" aria-valuenow="${ariaValue}" aria-valuemin="0" aria-valuemax="${questionCount}" aria-label="${cat} progress: ${label}">
                                    <div class="category-progress-fill" style="width:${percent}%;"></div>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- JavaScript Categories Tab -->
                <div id="js-categories" class="tab-content">
                    <div class="categories-buttons">
                        <div class="coming-soon">
                            <h3>🚧 Coming Soon!</h3>
                            <p>JavaScript categories are being prepared. Stay tuned!</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top:2rem; text-align:center;">
                    <button id="reset-progress-btn" style="background:#dc3545;color:#fff;padding:0.7rem 1.5rem;border:none;border-radius:6px;font-size:1rem;cursor:pointer;">Reset All Progress</button>
                </div>
            </section>
        `;
        // Tab switching functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                // Remove active class from all tabs and content
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                this.classList.add('active');
                document.getElementById(`${tabName}-categories`).classList.add('active');
            });
        });
        
        let selectedCategory = null;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                selectedCategory = this.textContent.replace(' (Completed)', '');
                if (completed.includes(selectedCategory)) {
                    showAlreadyCompletedModal(selectedCategory);
                } else {
                    await showInstructionsModal(selectedCategory);
                }
            });
        });
        // Reset button logic
        const resetBtn = document.getElementById('reset-progress-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                sessionStorage.removeItem('quizState');
                sessionStorage.removeItem('completedCategories');
                applyThemeFromStorage();
                location.reload();
            };
        }
    }

    function showAlreadyCompletedModal(category) {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="already-completed-title">
                <div class="modal-content">
                    <h2 id="already-completed-title">Quiz Already Completed</h2>
                    <p>You have already completed the <b>${category}</b> quiz. You cannot attempt it again.</p>
                    <button id="close-already-completed" aria-label="Close already completed modal">Close</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('close-already-completed').onclick = function() {
            modalRoot.classList.remove('active');
        };
    }

    function renderWelcomeModal() {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-modal-title">
                <div class="modal-content">
                    <h2 id="welcome-modal-title">Welcome to the Quiz App!</h2>
                    <p>Test your knowledge across various HTML topics. Ready to begin?</p>
                    <button id="continue-btn" aria-label="Continue to start quiz">Continue to Start Quiz</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('continue-btn').onclick = function() {
            modalRoot.classList.remove('active');
            // Enable hamburger menu after clicking continue
            appState.hamburgerEnabled = true;
            renderNavbar();
        };
    }

    function showTimeUpModal() {
        // Score and save the quiz as if completed, but only for answered questions
        clearInterval(quizState.interval);
        let score = 0;
        quizState.questions.forEach((q, i) => {
            const userAns = quizState.answers[i];
            if (userAns !== null && userAns === q.answer) score++;
        });
        // Save progress for logged in user
        if (userManager && userManager.getCurrentUser()) {
            const quizData = {
                category: quizState.category,
                score: score,
                totalQuestions: quizState.totalQuestions,
                timeLeft: 0
            };
            userManager.updateProgress(quizData);
            document.dispatchEvent(new CustomEvent('quizCompleted', { detail: quizData }));
        }
        // Store a flag so results page knows it's a time up partial
        sessionStorage.setItem('quizTimeUpResultsReady', '1');
        sessionStorage.setItem('quizTimeUpScore', score);
        sessionStorage.setItem('quizTimeUpAnswers', JSON.stringify(quizState.answers));
        sessionStorage.setItem('quizTimeUpCategory', quizState.category);
        sessionStorage.setItem('quizTimeUpQuestions', JSON.stringify(quizState.questions));
        sessionStorage.setItem('quizTimeUpTotalQuestions', quizState.totalQuestions);

        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="timeup-modal-title">
                <div class="modal-content">
                    <h2 id="timeup-modal-title">Time Up!</h2>
                    <p>Your time for this quiz has elapsed. Please go home to start a new quiz.</p>
                    <button id="go-home-timeup" aria-label="Go home after time up">Go Home</button>
                    <button id="view-results-timeup" aria-label="View results after time up">View Results</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('go-home-timeup').onclick = function() {
            sessionStorage.removeItem('quizTimeUp');
            sessionStorage.removeItem('quizState');
            sessionStorage.removeItem('quizTimeUpResultsReady');
            sessionStorage.removeItem('quizTimeUpScore');
            sessionStorage.removeItem('quizTimeUpAnswers');
            sessionStorage.removeItem('quizTimeUpCategory');
            sessionStorage.removeItem('quizTimeUpQuestions');
            sessionStorage.removeItem('quizTimeUpTotalQuestions');
            applyThemeFromStorage();
            location.reload();
        };
        document.getElementById('view-results-timeup').onclick = function() {
            modalRoot.classList.remove('active');
            setTimeout(() => {
                showTimeUpResultsPage();
                // Clean up time up session flags
                sessionStorage.removeItem('quizTimeUp');
                sessionStorage.removeItem('quizState');
                sessionStorage.removeItem('quizTimeUpResultsReady');
                sessionStorage.removeItem('quizTimeUpScore');
                sessionStorage.removeItem('quizTimeUpAnswers');
                sessionStorage.removeItem('quizTimeUpCategory');
                sessionStorage.removeItem('quizTimeUpQuestions');
                sessionStorage.removeItem('quizTimeUpTotalQuestions');
            }, 300);
        };
    }

    // Show results page for time up scenario
    function showTimeUpResultsPage() {
        let score = Number(sessionStorage.getItem('quizTimeUpScore')) || 0;
        let answers = JSON.parse(sessionStorage.getItem('quizTimeUpAnswers') || '[]');
        let category = sessionStorage.getItem('quizTimeUpCategory') || '';
        let questions = JSON.parse(sessionStorage.getItem('quizTimeUpQuestions') || '[]');
        let totalQuestions = Number(sessionStorage.getItem('quizTimeUpTotalQuestions')) || questions.length;
        mainContent.innerHTML = `
            <section class="results-section">
                <h2>Quiz Results (Time Up)</h2>
                <div class="results-list">${questions.map((q, i) => {
                    const userAns = answers[i];
                    const isCorrect = userAns !== null && userAns === q.answer;
                    return `
                        <div class="result-question">
                            <h3>Q${i + 1}: ${escapeHTML(q.q)}</h3>
                            <ul>
                                ${q.options.map((opt, idx) => {
                                    let style = '';
                                    if (idx === q.answer) style = 'color: green; font-weight: bold;';
                                    if (userAns === idx && !isCorrect) style = 'color: red; font-weight: bold;';
                                    return `<li style=\"${style}\">${escapeHTML(opt)}${idx === q.answer ? ' (Correct)' : ''}${userAns === idx && !isCorrect ? ' (Your answer)' : ''}</li>`;
                                }).join('')}
                            </ul>
                        </div>
                    `;
                }).join('')}</div>
                <div class="results-summary">
                    <p><b>Score:</b> ${score} / ${totalQuestions}</p>
                    <p><b>Note:</b> Only answered questions were scored. Unanswered questions are not counted as correct.</p>
                </div>
                <button id="go-home-btn">Go Home</button>
            </section>
        `;
        document.getElementById('go-home-btn').onclick = () => {
            applyThemeFromStorage();
            location.reload();
        };
    }
});
window.addEventListener('resize', renderNavbar);