// User Management System
class UserManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check if user is logged in
        this.currentUser = this.getCurrentUser();
        this.setupEventListeners();
    }

    // User Registration
    registerUser(userData) {
        try {
            // Validate user data
            if (!this.validateUserData(userData)) {
                return { success: false, message: 'Please fill in all required fields' };
            }

            // Check if user already exists
            const existingUsers = this.getAllUsers();
            const userExists = existingUsers.find(user => user.email === userData.email);
            
            if (userExists) {
                return { success: false, message: 'User with this email already exists' };
            }

            // Create new user
            const newUser = {
                id: this.generateUserId(),
                username: userData.username,
                email: userData.email,
                password: this.hashPassword(userData.password), // Simple hash for demo
                createdAt: new Date().toISOString(),
                preferences: {
                    difficulty: 'medium',
                    quizLength: 20,
                    categories: [],
                    theme: 'light'
                },
                progress: {
                    completedQuizzes: [],
                    totalScore: 0,
                    averageScore: 0,
                    streakDays: 0,
                    lastQuizDate: null,
                    totalQuizzesTaken: 0
                },
                achievements: []
            };

            // Save user
            existingUsers.push(newUser);
            localStorage.setItem('quizApp_users', JSON.stringify(existingUsers));
            
            // Auto login
            this.loginUser(userData.email, userData.password);
            
            return { success: true, message: 'Registration successful!' };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Registration failed. Please try again.' };
        }
    }

    // User Login
    loginUser(email, password) {
        try {
            const users = this.getAllUsers();
            const user = users.find(u => u.email === email && u.password === this.hashPassword(password));
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('quizApp_currentUser', JSON.stringify(user));
                this.updateLastLogin(user.id);
                return { success: true, message: 'Login successful!' };
            } else {
                return { success: false, message: 'Invalid email or password' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed. Please try again.' };
        }
    }

    // User Logout
    logoutUser() {
        this.currentUser = null;
        localStorage.removeItem('quizApp_currentUser');
        return { success: true, message: 'Logged out successfully!' };
    }

    // Get current user
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('quizApp_currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    // Update user progress
    updateProgress(quizData) {
        if (!this.currentUser) return false;

        try {
            const users = this.getAllUsers();
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            
            if (userIndex === -1) return false;

            const user = users[userIndex];
            
            // Prevent double-counting: only increment if this quiz is not already in completedQuizzes
            const alreadyRecorded = user.progress.completedQuizzes.some(q => q.category === quizData.category && q.date && Math.abs(new Date(q.date) - new Date()) < 10000);
            if (!alreadyRecorded) {
                user.progress.completedQuizzes.push({
                    category: quizData.category,
                    score: quizData.score,
                    totalQuestions: quizData.totalQuestions,
                    timeLeft: quizData.timeLeft,
                    date: new Date().toISOString()
                });
                user.progress.totalQuizzesTaken++;
                user.progress.totalScore += quizData.score;
                user.progress.averageScore = Math.round(user.progress.totalScore / user.progress.totalQuizzesTaken);
                user.progress.lastQuizDate = new Date().toISOString();
            }

            // Update streak
            this.updateStreak(user);

            // Update current user
            this.currentUser = user;
            localStorage.setItem('quizApp_currentUser', JSON.stringify(user));
            
            // Update users array
            users[userIndex] = user;
            localStorage.setItem('quizApp_users', JSON.stringify(users));

            return true;
        } catch (error) {
            console.error('Error updating progress:', error);
            return false;
        }
    }

    // Update user preferences
    updatePreferences(preferences) {
        if (!this.currentUser) return false;

        try {
            const users = this.getAllUsers();
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            
            if (userIndex === -1) return false;

            const user = users[userIndex];
            user.preferences = { ...user.preferences, ...preferences };

            // Update current user
            this.currentUser = user;
            localStorage.setItem('quizApp_currentUser', JSON.stringify(user));
            
            // Update users array
            users[userIndex] = user;
            localStorage.setItem('quizApp_users', JSON.stringify(users));

            return true;
        } catch (error) {
            console.error('Error updating preferences:', error);
            return false;
        }
    }

    // Get user statistics
    getUserStats() {
        if (!this.currentUser) return null;

        const progress = this.currentUser.progress;
        const completedQuizzes = progress.completedQuizzes;

        return {
            totalQuizzes: progress.totalQuizzesTaken,
            averageScore: progress.averageScore,
            streakDays: progress.streakDays,
            totalScore: progress.totalScore,
            categoriesCompleted: [...new Set(completedQuizzes.map(q => q.category))].length,
            recentQuizzes: completedQuizzes.slice(-5).reverse(),
            categoryStats: this.getCategoryStats(completedQuizzes)
        };
    }

    // Get category statistics
    getCategoryStats(completedQuizzes) {
        const stats = {};
        
        completedQuizzes.forEach(quiz => {
            if (!stats[quiz.category]) {
                stats[quiz.category] = {
                    attempts: 0,
                    totalScore: 0,
                    averageScore: 0,
                    bestScore: 0
                };
            }
            
            stats[quiz.category].attempts++;
            stats[quiz.category].totalScore += quiz.score;
            stats[quiz.category].bestScore = Math.max(stats[quiz.category].bestScore, quiz.score);
        });

        // Calculate averages
        Object.keys(stats).forEach(category => {
            stats[category].averageScore = Math.round(stats[category].totalScore / stats[category].attempts);
        });

        return stats;
    }

    // Export user data
    exportUserData() {
        if (!this.currentUser) return null;
        
        return {
            user: this.currentUser,
            stats: this.getUserStats(),
            exportDate: new Date().toISOString()
        };
    }

    // Import user data
    importUserData(data) {
        try {
            if (!data.user || !data.user.id) {
                return { success: false, message: 'Invalid data format' };
            }

            const users = this.getAllUsers();
            const existingUserIndex = users.findIndex(u => u.id === data.user.id);
            
            if (existingUserIndex !== -1) {
                // Update existing user
                users[existingUserIndex] = data.user;
            } else {
                // Add new user
                users.push(data.user);
            }

            localStorage.setItem('quizApp_users', JSON.stringify(users));
            
            // Login the imported user
            this.currentUser = data.user;
            localStorage.setItem('quizApp_currentUser', JSON.stringify(data.user));

            return { success: true, message: 'Data imported successfully!' };
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, message: 'Import failed. Please check your data.' };
        }
    }

    // Helper methods
    getAllUsers() {
        try {
            const users = localStorage.getItem('quizApp_users');
            return users ? JSON.parse(users) : [];
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    validateUserData(userData) {
        return userData.username && 
               userData.email && 
               userData.password && 
               userData.password.length >= 6;
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    hashPassword(password) {
        // Simple hash for demo purposes (in production, use proper hashing)
        return btoa(password + 'salt');
    }

    updateLastLogin(userId) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            localStorage.setItem('quizApp_users', JSON.stringify(users));
        }
    }

    updateStreak(user) {
        const today = new Date().toDateString();
        const lastQuizDate = user.progress.lastQuizDate ? new Date(user.progress.lastQuizDate).toDateString() : null;
        
        if (lastQuizDate === today) {
            // Already took a quiz today, don't update streak
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();

        if (lastQuizDate === yesterdayString) {
            // Consecutive day
            user.progress.streakDays++;
        } else if (lastQuizDate !== today) {
            // Break in streak
            user.progress.streakDays = 1;
        }
    }

    resetProgress() {
        if (!this.currentUser) return false;
        try {
            const users = this.getAllUsers();
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex === -1) return false;
            const user = users[userIndex];
            user.progress = {
                completedQuizzes: [],
                totalScore: 0,
                averageScore: 0,
                streakDays: 0,
                lastQuizDate: null,
                totalQuizzesTaken: 0
            };
            this.currentUser = user;
            localStorage.setItem('quizApp_currentUser', JSON.stringify(user));
            users[userIndex] = user;
            localStorage.setItem('quizApp_users', JSON.stringify(users));
            return true;
        } catch (error) {
            console.error('Error resetting progress:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Listen for quiz completion events
        document.addEventListener('quizCompleted', (e) => {
            this.updateProgress(e.detail);
        });
    }
}

// Export for use in other modules
window.UserManager = UserManager; 