import { questionsHtmlIntro } from './questions-html-intro.js';
import { questionsTextFormatting } from './questions-text-formatting.js';
import { questionsLists } from './questions-lists.js';
import { questionsLinks } from './questions-links.js';
import { questionsImages } from './questions-images.js'; 
import { questionsMedia } from './questions-media.js';
import { questionsTables } from './questions-tables.js';
import { questionsForms } from './questions-forms.js';
import { questionsOther } from './questions-other.js';

document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    // Quiz state
    let quizState = {
        questions: [],
        current: 0,
        answers: Array(20).fill(null),
        timer: 300,
        interval: null,
        category: null
    };

    // Restore quiz state if present in sessionStorage
    let savedState = sessionStorage.getItem('quizState');
    if (savedState) {
        quizState = JSON.parse(savedState);
        quizState.questions = getQuestionsForCategory(quizState.category);
        renderNavbar();
        renderFooter();
        renderQuestionPage();
        startTimer();
        return;
    }

    // Check for time up on load
    if (sessionStorage.getItem('quizTimeUp') === '1') {
        renderNavbar();
        renderFooter();
        showTimeUpModal();
        return;
    }

    // If no quiz in progress, render home and welcome modal
    renderNavbar();
    renderHomePage();
    renderFooter();
    renderWelcomeModal();

    function startQuiz(category) {
        quizState.questions = getQuestionsForCategory(category);
        quizState.current = 0;
        quizState.answers = Array(20).fill(null);
        quizState.timer = 300;
        quizState.category = category;
        saveQuizState();
        renderQuestionPage();
        startTimer();
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
        const q = quizState.questions[quizState.current];
        mainContent.innerHTML = `
            <div class="quiz-header">
                <span>Category: ${quizState.category}</span>
                <span id="timer">Time left: ${formatTime(quizState.timer)}</span>
            </div>
            <div class="question-box">
                <h2>Question ${quizState.current + 1} of 20</h2>
                <p>${escapeHTML(q.q)}</p>
                <form id="question-form">
                    ${q.options.map((opt, i) => `
                        <label class="option-label">
                            <input type="radio" name="option" value="${i}" ${quizState.answers[quizState.current] === i ? 'checked' : ''} />
                            ${escapeHTML(opt)}
                        </label><br>
                    `).join('')}
                </form>
            </div>
            <div class="quiz-nav">
                <button id="prev-btn" ${quizState.current === 0 ? 'disabled' : ''}>Previous</button>
                <button id="next-btn">${quizState.current === 19 ? 'Finish' : 'Next'}</button>
                <button id="exit-btn" class="exit">Exit</button>
            </div>
        `;
        document.getElementById('prev-btn').onclick = (e) => {
            e.preventDefault();
            if (quizState.current > 0) {
                quizState.current--;
                renderQuestionPage();
            }
        };
        document.getElementById('next-btn').onclick = (e) => {
            e.preventDefault();
            const selected = document.querySelector('input[name="option"]:checked');
            quizState.answers[quizState.current] = selected ? parseInt(selected.value) : null;
            if (quizState.current < 19) {
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
        document.getElementById('question-form').onsubmit = (e) => e.preventDefault();
        // Ensure the selected answer is checked after refresh
        const selected = quizState.answers[quizState.current];
        if (selected !== null) {
            const radio = document.querySelector(`input[name='option'][value='${selected}']`);
            if (radio) radio.checked = true;
        }
        saveQuizState();
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

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
            timer: quizState.timer
        }));
    }

    // Show exit confirmation modal
    function showExitModal() {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal">
                <div class="modal-content">
                    <h2>Exit Quiz?</h2>
                    <p>Are you sure you want to exit? Your progress will be lost.</p>
                    <button id="confirm-exit">Yes, Exit</button>
                    <button id="cancel-exit">Cancel</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('confirm-exit').onclick = function() {
            modalRoot.classList.remove('active');
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
            warning.style.color = 'red';
            warning.style.margin = '1rem 0';
            warning.textContent = 'You have unanswered questions. Please answer all questions before viewing results.';
            mainContent.insertBefore(warning, mainContent.firstChild);
        }
    }

    function showResultsPage() {
        clearInterval(quizState.interval);
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
        mainContent.innerHTML = `
            <section class="results-section">
                <h2>Quiz Results</h2>
                <div class="results-list">${resultsHtml}</div>
                <div class="results-summary">
                    <p><b>Score:</b> ${score} / 20</p>
                    <p><b>Time Left:</b> ${formatTime(quizState.timer)}</p>
                </div>
                <button id="go-home-btn">Go Home</button>
            </section>
        `;
        document.getElementById('go-home-btn').onclick = () => location.reload();
    }

    // Helper to get 20 questions (repeat if less for demo)
    function getQuestionsForCategory(category) {
        let arr = [];
        switch (category) {
            case 'HTML Introduction': arr = questionsHtmlIntro; break;
            case 'Text Formatting': arr = questionsTextFormatting; break;
            case 'Lists': arr = questionsLists; break;
            case 'Links': arr = questionsLinks; break;
            case 'Images': arr = questionsImages; break; // No questions for Images
            case 'Media (Audio, Video)': arr = questionsMedia; break;
            case 'Tables': arr = questionsTables; break;
            case 'Forms': arr = questionsForms; break;
            case 'Other Questions (Semantic tags and attributes)': arr = questionsOther; break;
            default: arr = []; break;
        }
        let out = [];
        for (let i = 0; i < 20; i++) out.push(arr[i % arr.length]);
        return out;
    }

    function showInstructionsModal(category) {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal">
                <div class="modal-content">
                    <h2>Instructions for ${category}</h2>
                    <ul style="text-align:left; margin-bottom:1.5rem;">
                        <li>You have <b>5 minutes</b> to complete 20 questions.</li>
                        <li>Each question is on a separate page.</li>
                        <li>Use <b>Next</b> and <b>Previous</b> to navigate.</li>
                        <li>Click <b>Exit</b> anytime to leave the quiz (confirmation required).</li>
                        <li>Unanswered questions will be highlighted before you can view results.</li>
                    </ul>
                    <button id="proceed-quiz-btn">Proceed to Start</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('proceed-quiz-btn').onclick = function() {
            const questions = getQuestionsForCategory(category);
            // Check if the category has any real questions (not just repeated empty array)
            if (!questions.length || (questions.length === 20 && questions[0] === undefined)) {
                showNoQuestionsModal();
                return;
            }
            modalRoot.classList.remove('active');
            startQuiz(category);
        };
    }

    function showNoQuestionsModal() {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal">
                <div class="modal-content">
                    <h2>No Questions</h2>
                    <p>There are no questions in this category.</p>
                    <button id="close-no-questions">Close</button>
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
        navbar.innerHTML = `
            <nav class="navbar">
                <div class="navbar-brand">Quiz App</div>
                <div class="hamburger" id="hamburger" tabindex="0" aria-label="Open navigation" aria-expanded="false">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <ul class="navbar-links" id="navbar-links">
                    <li><a href="#">Home</a></li>
                    <li><a href="#">About</a></li>
                    <li><a href="#">Contact</a></li>
                </ul>
            </nav>
        `;
        // Hamburger menu toggle
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navbar-links');
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            const expanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !expanded);
        });
        hamburger.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                navLinks.classList.toggle('active');
                const expanded = hamburger.getAttribute('aria-expanded') === 'true';
                hamburger.setAttribute('aria-expanded', !expanded);
            }
        });
    }

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
    function renderHomePage() {
        const categories = [
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
        const completed = getCompletedCategories();
        mainContent.innerHTML = `
            <section class="categories-section">
                <h1>Quiz Categories</h1>
                <div class="categories-buttons">
                    ${categories.map(cat => `<button class="category-btn" data-category="${cat}" ${completed.includes(cat) ? 'disabled style=\"opacity:0.5;cursor:not-allowed;\"' : ''}>${cat}${completed.includes(cat) ? ' (Completed)' : ''}</button>`).join('')}
                </div>
                <div style="margin-top:2rem; text-align:center;">
                    <button id="reset-progress-btn" style="background:#dc3545;color:#fff;padding:0.7rem 1.5rem;border:none;border-radius:6px;font-size:1rem;cursor:pointer;">Reset All Progress</button>
                </div>
            </section>
        `;
        let selectedCategory = null;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selectedCategory = this.textContent.replace(' (Completed)', '');
                if (completed.includes(selectedCategory)) {
                    showAlreadyCompletedModal(selectedCategory);
                } else {
                    showInstructionsModal(selectedCategory);
                }
            });
        });
        // Reset button logic
        const resetBtn = document.getElementById('reset-progress-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                sessionStorage.removeItem('quizState');
                sessionStorage.removeItem('completedCategories');
                location.reload();
            };
        }
    }

    function showAlreadyCompletedModal(category) {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal">
                <div class="modal-content">
                    <h2>Quiz Already Completed</h2>
                    <p>You have already completed the <b>${category}</b> quiz. You cannot attempt it again.</p>
                    <button id="close-already-completed">Close</button>
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
            <div class="welcome-modal">
                <div class="modal-content">
                    <h2>Welcome to the Quiz App!</h2>
                    <p>Test your knowledge across various HTML topics. Ready to begin?</p>
                    <button id="continue-btn">Continue to Start Quiz</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('continue-btn').onclick = function() {
            modalRoot.classList.remove('active');
        };
    }

    function showTimeUpModal() {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="welcome-modal">
                <div class="modal-content">
                    <h2>Time Up!</h2>
                    <p>Your time for this quiz has elapsed. Please go home to start a new quiz.</p>
                    <button id="go-home-timeup">Go Home</button>
                </div>
            </div>
        `;
        modalRoot.classList.add('active');
        document.getElementById('go-home-timeup').onclick = function() {
            sessionStorage.removeItem('quizTimeUp');
            sessionStorage.removeItem('quizState');
            location.reload();
        };
    }
});