// Question Bank Lazy Loading Manager
class QuestionLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.modulePaths = {
            // HTML Categories
            'HTML Introduction': '/js/questions-html-intro.js',
            'Text Formatting': '/js/questions-text-formatting.js',
            'Lists': '/js/questions-lists.js',
            'Links': '/js/questions-links.js',
            'Images': '/js/questions-images.js',
            'Media': '/js/questions-media.js',
            'Media (Audio, Video)': '/js/questions-media.js',
            'Tables': '/js/questions-tables.js',
            'Forms': '/js/questions-forms.js',
            'Other Questions (Semantic tags and attributes)': '/js/questions-other.js',
            
            // CSS Categories
            'Introduction to CSS': '/js/css-questions/questions-css-intro.js',
            'CSS Selectors': '/js/css-questions/questions-css-selectors.js',
            'Box Model': '/js/css-questions/questions-css-box-model.js',
            'Typography': '/js/css-questions/questions-css-typography.js',
            'Colors': '/js/css-questions/questions-css-colors.js',
            'Borders': '/js/css-questions/questions-css-borders.js',
            'Box/Text Shadow': '/js/css-questions/questions-css-shadows.js',
            'Display Properties': '/js/css-questions/questions-css-display.js'
        };
        
        // Performance metrics
        this.metrics = {
            loadTimes: new Map(),
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    // Load a question module asynchronously
    async loadQuestionModule(category) {
        const startTime = performance.now();
        
        // Check if already loaded
        if (this.loadedModules.has(category)) {
            this.metrics.cacheHits++;
            console.log(`Question module '${category}' already loaded (cache hit)`);
            return this.loadedModules.get(category);
        }

        // Check if currently loading
        if (this.loadingPromises.has(category)) {
            console.log(`Question module '${category}' is currently loading, waiting...`);
            return this.loadingPromises.get(category);
        }

        this.metrics.cacheMisses++;
        const modulePath = this.modulePaths[category];
        
        if (!modulePath) {
            throw new Error(`Unknown category: ${category}`);
        }

        console.log(`Loading question module: ${category} from ${modulePath}`);
        console.log(`Full URL will be: ${window.location.origin}${modulePath}`);
        
        // Create loading promise
        const loadPromise = this._loadModule(modulePath, category, startTime);
        this.loadingPromises.set(category, loadPromise);
        
        try {
            const questions = await loadPromise;
            this.loadedModules.set(category, questions);
            this.loadingPromises.delete(category);
            return questions;
        } catch (error) {
            this.loadingPromises.delete(category);
            throw error;
        }
    }

    // Internal method to load a module
    async _loadModule(modulePath, category, startTime) {
        try {
            console.log(`Attempting to load module: ${modulePath}`);
            
            // Try to load from cache first (service worker)
            const cachedModule = await this._tryLoadFromCache(modulePath);
            if (cachedModule) {
                console.log(`Loaded '${category}' from cache`);
                this._recordLoadTime(category, performance.now() - startTime);
                return this._extractQuestionsFromModule(cachedModule, category);
            }

            // Load from network
            console.log(`Loading from network: ${modulePath}`);
            const module = await import(modulePath);
            console.log(`Successfully loaded '${category}' from network:`, module);
            this._recordLoadTime(category, performance.now() - startTime);
            return this._extractQuestionsFromModule(module, category);
            
        } catch (error) {
            console.error(`Failed to load question module '${category}' from ${modulePath}:`, error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                modulePath,
                category
            });
            throw new Error(`Failed to load questions for ${category}: ${error.message}`);
        }
    }

    // Try to load from cache
    async _tryLoadFromCache(modulePath) {
        if ('caches' in window) {
            try {
                const cache = await caches.open('quiz-dynamic-v1.0.0');
                const response = await cache.match(modulePath);
                if (response) {
                    const text = await response.text();
                    // Create a module-like object from cached text
                    return this._createModuleFromText(text);
                }
            } catch (error) {
                console.log('Cache access failed:', error);
            }
        }
        return null;
    }

    // Create module object from cached text
    _createModuleFromText(text) {
        // This is a simplified approach - in production you might want to use a proper module parser
        try {
            // Create a blob URL for the cached module
            const blob = new Blob([text], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            return import(url).finally(() => URL.revokeObjectURL(url));
        } catch (error) {
            console.log('Failed to create module from cached text:', error);
            return null;
        }
    }

    // Extract questions from loaded module
    _extractQuestionsFromModule(module, category) {
        const questionKeys = Object.keys(module).filter(key => key.startsWith('questions'));
        
        if (questionKeys.length === 0) {
            throw new Error(`No question arrays found in module for ${category}`);
        }

        // Get the first question array (assuming one per module)
        const questions = module[questionKeys[0]];
        
        if (!Array.isArray(questions)) {
            throw new Error(`Invalid question format for ${category}`);
        }

        return questions;
    }

    // Preload specific categories
    async preloadCategories(categories) {
        console.log(`Preloading categories: ${categories.join(', ')}`);
        const preloadPromises = categories.map(category => 
            this.loadQuestionModule(category).catch(error => {
                console.warn(`Failed to preload ${category}:`, error);
                return null;
            })
        );
        
        await Promise.allSettled(preloadPromises);
        console.log('Preloading completed');
    }

    // Preload next likely categories based on user behavior
    async preloadNextLikelyCategories(currentCategory) {
        const categoryOrder = [
            // HTML Categories
            'HTML Introduction',
            'Text Formatting', 
            'Lists',
            'Links',
            'Images',
            'Media',
            'Tables',
            'Forms',
            'Other Questions (Semantic tags and attributes)',
            
            // CSS Categories
            'Introduction to CSS',
            'CSS Selectors',
            'Box Model',
            'Typography',
            'Colors',
            'Borders',
            'Box/Text Shadow',
            'Display Properties'
        ];
        
        const currentIndex = categoryOrder.indexOf(currentCategory);
        if (currentIndex === -1) return;

        const nextCategories = categoryOrder
            .slice(currentIndex + 1, currentIndex + 3) // Preload next 2 categories
            .filter(category => !this.loadedModules.has(category));

        if (nextCategories.length > 0) {
            console.log(`Preloading next likely categories: ${nextCategories.join(', ')}`);
            this.preloadCategories(nextCategories);
        }
    }

    // Get loading status
    getLoadingStatus(category) {
        if (this.loadedModules.has(category)) {
            return 'loaded';
        }
        if (this.loadingPromises.has(category)) {
            return 'loading';
        }
        return 'not-loaded';
    }

    // Get performance metrics
    getMetrics() {
        const avgLoadTime = Array.from(this.metrics.loadTimes.values()).reduce((a, b) => a + b, 0) / this.metrics.loadTimes.size || 0;
        const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
        
        return {
            totalModules: this.loadedModules.size,
            cacheHitRate: totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0,
            averageLoadTime: avgLoadTime,
            loadTimes: Object.fromEntries(this.metrics.loadTimes),
            cacheHits: this.metrics.cacheHits,
            cacheMisses: this.metrics.cacheMisses,
            estimatedSizeKB: this.getMemoryUsage().estimatedSizeKB
        };
    }

    // Record load time for performance tracking
    _recordLoadTime(category, loadTime) {
        this.metrics.loadTimes.set(category, loadTime);
    }

    // Clear cache (for testing or memory management)
    clearCache() {
        this.loadedModules.clear();
        this.loadingPromises.clear();
        console.log('Question cache cleared');
    }

    // Get memory usage estimate
    getMemoryUsage() {
        let totalSize = 0;
        for (const [category, questions] of this.loadedModules) {
            if (Array.isArray(questions)) {
                totalSize += JSON.stringify(questions).length;
            }
        }
        return {
            modulesLoaded: this.loadedModules.size,
            estimatedSize: totalSize,
            estimatedSizeKB: Math.round(totalSize / 1024 * 100) / 100
        };
    }
}

// Export for use in other modules
export default QuestionLoader; 