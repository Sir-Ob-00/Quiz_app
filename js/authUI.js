// Authentication UI Components
class AuthUI {
    constructor(userManager) {
        this.userManager = userManager;
        this.currentModal = null;
    }

    // Show login modal
    showLoginModal() {
        const modalHTML = `
            <div class="auth-modal">
                <div class="modal-content auth-content">
                    <div class="auth-header">
                        <h2>Welcome Back!</h2>
                        <p>Sign in to continue your learning journey</p>
                    </div>
                    
                    <form id="login-form" class="auth-form">
                        <div class="form-group">
                            <label for="login-email">Email Address</label>
                            <input type="email" id="login-email" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" name="password" required>
                        </div>
                        
                        <button type="submit" class="auth-btn login-btn">
                            <span class="btn-text">Sign In</span>
                            <span class="btn-loading">Signing In...</span>
                        </button>
                    </form>
                    
                    <div class="auth-footer">
                        <p>Don't have an account? <a href="#" id="show-register">Sign Up</a></p>
                    </div>
                    
                    <button class="modal-close" id="close-auth-modal">&times;</button>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
        this.setupLoginForm();
    }

    // Show registration modal
    showRegisterModal() {
        const modalHTML = `
            <div class="auth-modal">
                <div class="modal-content auth-content">
                    <div class="auth-header">
                        <h2>Create Account</h2>
                        <p>Join us and start your learning journey</p>
                    </div>
                    
                    <form id="register-form" class="auth-form">
                        <div class="form-group">
                            <label for="register-username">Username</label>
                            <input type="text" id="register-username" name="username" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="register-email">Email Address</label>
                            <input type="email" id="register-email" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="register-password">Password</label>
                            <input type="password" id="register-password" name="password" required minlength="6">
                            <small>Minimum 6 characters</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="register-confirm-password">Confirm Password</label>
                            <input type="password" id="register-confirm-password" name="confirmPassword" required>
                        </div>
                        
                        <button type="submit" class="auth-btn register-btn">
                            <span class="btn-text">Create Account</span>
                            <span class="btn-loading">Creating Account...</span>
                        </button>
                    </form>
                    
                    <div class="auth-footer">
                        <p>Already have an account? <a href="#" id="show-login">Sign In</a></p>
                    </div>
                    
                    <button class="modal-close" id="close-auth-modal">&times;</button>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
        this.setupRegisterForm();
    }

    // Show user profile modal
    showProfileModal() {
        const user = this.userManager.getCurrentUser();
        const stats = this.userManager.getUserStats();

        // List of all categories in display order
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

        // Build score update section
        let scoreUpdateHTML = `<div class="score-update-section"><h3>Score Update</h3><ul class="score-update-list">`;
        categories.forEach(cat => {
            const catStats = stats.categoryStats[cat];
            if (catStats && catStats.attempts > 0) {
                scoreUpdateHTML += `<li><b>${cat}:</b> ${catStats.bestScore}/20</li>`;
            } else {
                scoreUpdateHTML += `<li><b>${cat}:</b> <span class="not-taken">Not taken</span></li>`;
            }
        });
        scoreUpdateHTML += '</ul></div>';

        const modalHTML = `
            <div class="auth-modal">
                <div class="modal-content profile-content">
                    <div class="profile-header">
                        <h2>Your Profile</h2>
                        <div class="user-info">
                            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                            <div class="user-details">
                                <h3>${user.username}</h3>
                                <p>${user.email}</p>
                                <small>Member since ${new Date(user.createdAt).toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-stats">
                        <h3>Your Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-number">${stats.totalQuizzes}</div>
                                <div class="stat-label">Quizzes Taken</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${stats.averageScore}%</div>
                                <div class="stat-label">Average Score</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${stats.streakDays}</div>
                                <div class="stat-label">Day Streak</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${stats.categoriesCompleted}</div>
                                <div class="stat-label">Categories</div>
                            </div>
                        </div>
                    </div>
                    ${scoreUpdateHTML}
                    <div class="profile-actions profile-actions-grid">
                        <button class="profile-btn" id="export-data">Export Data</button>
                        <button class="profile-btn" id="import-data">Import Data</button>
                        <button class="profile-btn danger" id="reset-progress">Reset Progress</button>
                        <button class="profile-btn danger" id="logout-user">Sign Out</button>
                    </div>
                    
                    <button class="modal-close" id="close-auth-modal">&times;</button>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
        this.setupProfileActions();
    }

    // Show modal helper
    showModal(html) {
        // Remove existing modal
        if (this.currentModal) {
            this.currentModal.remove();
        }

        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = html;
        this.currentModal = modalContainer.firstElementChild;
        
        // Add to page
        document.body.appendChild(this.currentModal);
        
        // Show modal
        setTimeout(() => {
            this.currentModal.classList.add('active');
        }, 10);

        // Setup close button
        const closeBtn = this.currentModal.querySelector('#close-auth-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on outside click
        this.currentModal.addEventListener('click', (e) => {
            if (e.target === this.currentModal) {
                this.closeModal();
            }
        });
    }

    // Close modal
    closeModal() {
        if (this.currentModal) {
            this.currentModal.classList.remove('active');
            setTimeout(() => {
                this.currentModal.remove();
                this.currentModal = null;
            }, 300);
        }
    }

    // Setup login form
    setupLoginForm() {
        const form = document.getElementById('login-form');
        const showRegisterLink = document.getElementById('show-register');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(form);
        });

        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal();
            setTimeout(() => this.showRegisterModal(), 300);
        });
    }

    // Setup register form
    setupRegisterForm() {
        const form = document.getElementById('register-form');
        const showLoginLink = document.getElementById('show-login');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(form);
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal();
            setTimeout(() => this.showLoginModal(), 300);
        });
    }

    // Setup profile actions
    setupProfileActions() {
        const exportBtn = document.getElementById('export-data');
        const importBtn = document.getElementById('import-data');
        const logoutBtn = document.getElementById('logout-user');
        const resetBtn = document.getElementById('reset-progress');

        exportBtn.addEventListener('click', () => this.exportUserData());
        importBtn.addEventListener('click', () => this.importUserData());
        logoutBtn.addEventListener('click', () => this.handleLogout());
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleResetProgress());
        }
    }

    // Handle login
    async handleLogin(form) {
        const submitBtn = form.querySelector('.login-btn');
        const formData = new FormData(form);
        
        submitBtn.classList.add('loading');
        
        const result = this.userManager.loginUser(
            formData.get('email'),
            formData.get('password')
        );

        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                this.closeModal();
                if (window.renderNavbar) window.renderNavbar();
            }, 1500);
        } else {
            this.showMessage(result.message, 'error');
        }

        submitBtn.classList.remove('loading');
    }

    // Handle registration
    async handleRegister(form) {
        const submitBtn = form.querySelector('.register-btn');
        const formData = new FormData(form);
        
        // Validate password confirmation
        if (formData.get('password') !== formData.get('confirmPassword')) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        submitBtn.classList.add('loading');
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        const result = this.userManager.registerUser(userData);

        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                this.closeModal();
                this.updateUIForLoggedInUser();
            }, 1500);
        } else {
            this.showMessage(result.message, 'error');
        }

        submitBtn.classList.remove('loading');
    }

    // Handle logout
    handleLogout() {
        const result = this.userManager.logoutUser();
        this.showMessage(result.message, 'success');
        setTimeout(() => {
            this.closeModal();
            if (window.renderNavbar) window.renderNavbar();
        }, 1500);
    }

    // Handle reset progress
    handleResetProgress() {
        // Show custom confirmation modal instead of JS confirm
        const confirmModal = document.createElement('div');
        confirmModal.className = 'auth-modal';
        confirmModal.innerHTML = `
            <div class="modal-content confirm-content">
                <div class="confirm-icon">⚠️</div>
                <h2>Reset Progress?</h2>
                <p style="margin-bottom:1.2rem;">Are you sure you want to clear all your quiz progress and statistics? <b>This cannot be undone.</b></p>
                <div class="confirm-actions">
                    <button class="profile-btn danger" id="confirm-reset-progress">Yes, Reset</button>
                    <button class="profile-btn" id="cancel-reset-progress">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
        setTimeout(() => confirmModal.classList.add('active'), 10);

        // Handle confirm
        confirmModal.querySelector('#confirm-reset-progress').onclick = () => {
            if (this.userManager && this.userManager.currentUser) {
                this.userManager.resetProgress();
                this.showMessage('Your progress has been reset.', 'success');
                setTimeout(() => {
                    confirmModal.remove();
                    this.closeModal();
                    this.showProfileModal();
                }, 1200);
            }
        };
        // Handle cancel
        confirmModal.querySelector('#cancel-reset-progress').onclick = () => {
            confirmModal.classList.remove('active');
            setTimeout(() => confirmModal.remove(), 300);
        };
        // Close on outside click
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
                setTimeout(() => confirmModal.remove(), 300);
            }
        });
    }

    // Export user data
    exportUserData() {
        const data = this.userManager.exportUserData();
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiz-app-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showMessage('Data exported successfully!', 'success');
        }
    }

    // Import user data
    importUserData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        const result = this.userManager.importUserData(data);
                        this.showMessage(result.message, result.success ? 'success' : 'error');
                        
                        if (result.success) {
                            setTimeout(() => {
                                this.closeModal();
                                this.updateUIForLoggedInUser();
                            }, 1500);
                        }
                    } catch (error) {
                        this.showMessage('Invalid file format', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });
        
        input.click();
    }

    // Show message
    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.textContent = message;
        
        const modalContent = this.currentModal.querySelector('.modal-content');
        modalContent.insertBefore(messageDiv, modalContent.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // Update UI for logged in user
    updateUIForLoggedInUser() {
        const user = this.userManager.getCurrentUser();
        if (user) {
            // Update navbar to show user info
            // this.updateNavbarForUser(user); // Removed as per edit hint
            
            // Trigger custom event for other components
            document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
        }
    }

    // Update UI for logged out user
    updateUIForLoggedOutUser() {
        // Update navbar to show login button
        // this.updateNavbarForGuest(); // Removed as per edit hint
        
        // Trigger custom event for other components
        document.dispatchEvent(new CustomEvent('userLoggedOut'));
    }

    // Update navbar for logged in user
    // updateNavbarForUser(user) { // Removed as per edit hint
    //     const navbar = document.querySelector('.navbar');
    //     if (navbar) {
    //         const userSection = navbar.querySelector('.user-section') || this.createUserSection();
    //         const usernameSpan = userSection.querySelector('.username');
    //         if (usernameSpan) {
    //             usernameSpan.textContent = user.username;
    //         }
    //     }
    // }

    // Update navbar for guest
    // updateNavbarForGuest() { // Removed as per edit hint
    //     const navbar = document.querySelector('.navbar');
    //     if (navbar) {
    //         const userSection = navbar.querySelector('.user-section');
    //         if (userSection) {
    //             userSection.remove();
    //         }
    //     }
    // }

    // Create user section for navbar
    // createUserSection() { // Removed as per edit hint
    //     const userSection = document.createElement('div');
    //     userSection.className = 'user-section';
    //     userSection.innerHTML = `
    //         <span class="username"></span>
    //         <button class="profile-btn">Profile</button>
    //     `;
        
    //     const navbar = document.querySelector('.navbar');
    //     if (navbar) {
    //         navbar.appendChild(userSection);
    //     }
        
    //     return userSection;
    // }
}

// Export for use in other modules
window.AuthUI = AuthUI; 