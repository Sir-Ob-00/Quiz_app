// Debug utility for testing module loading and dynamic timing
window.debugQuizApp = {
    clearCache: function() {
        console.log('🧹 Clearing all caches...');
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                console.log('✅ All caches cleared!');
                console.log('🔄 Please refresh the page now.');
            });
        } else {
            console.log('❌ Cache API not available');
        }
    },
    
    testDynamicTiming: function() {
        console.log('=== Testing Dynamic Timing ===');
        
        // Test calculateTimer function
        const testCases = [5, 10, 15, 20];
        testCases.forEach(count => {
            const seconds = count * 15;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const display = remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
            console.log(`${count} questions = ${seconds}s = ${display}`);
        });
        
        // Test if questionLoader is available
        if (window.questionLoader) {
            console.log('✅ QuestionLoader is available');
        } else {
            console.log('❌ QuestionLoader is not available');
        }
        
        // Test if performanceMonitor is available
        if (window.performanceMonitor) {
            console.log('✅ PerformanceMonitor is available');
        } else {
            console.log('❌ PerformanceMonitor is not available');
        }
    },
    
    testCategoryLoading: async function(category) {
        console.log(`=== Testing Category Loading: ${category} ===`);
        
        if (!window.questionLoader) {
            console.log('❌ QuestionLoader not available');
            return;
        }
        
        try {
            const questions = await window.questionLoader.loadQuestionModule(category);
            console.log(`✅ Loaded ${questions.length} questions for ${category}`);
            console.log('Questions:', questions.slice(0, 2)); // Show first 2 questions
            
            // Test timer calculation
            const timer = questions.length * 15;
            console.log(`⏱️ Timer for ${questions.length} questions: ${timer}s`);
            
        } catch (error) {
            console.log(`❌ Failed to load ${category}:`, error);
        }
    }
};

// Auto-run test when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Debug loader initialized');
    
    // Function to test the dynamic timing functions
    function testFunctions() {
        console.log('🧪 Testing dynamic timing functions...');
        
        if (window.calculateTimer) {
            console.log('✅ calculateTimer function available');
            console.log('🧮 Testing calculateTimer function:');
            console.log('5 questions =', window.calculateTimer(5), 'seconds');
            console.log('10 questions =', window.calculateTimer(10), 'seconds');
            console.log('15 questions =', window.calculateTimer(15), 'seconds');
            console.log('20 questions =', window.calculateTimer(20), 'seconds');
        } else {
            console.log('❌ calculateTimer function not available');
        }
        
        if (window.formatTimeForDisplay) {
            console.log('✅ formatTimeForDisplay function available');
            console.log('⏰ Testing formatTimeForDisplay function:');
            console.log('75s =', window.formatTimeForDisplay(75));
            console.log('150s =', window.formatTimeForDisplay(150));
            console.log('225s =', window.formatTimeForDisplay(225));
            console.log('300s =', window.formatTimeForDisplay(300));
        } else {
            console.log('❌ formatTimeForDisplay function not available');
        }
        
        if (window.questionLoader) {
            console.log('✅ questionLoader available');
        } else {
            console.log('❌ questionLoader not available');
        }
    }
    
    // Try multiple times with increasing delays
    setTimeout(testFunctions, 500);
    setTimeout(testFunctions, 1500);
    setTimeout(testFunctions, 3000);
    
    // Also test when window loads
    window.addEventListener('load', function() {
        console.log('🌐 Window loaded, testing functions...');
        setTimeout(testFunctions, 500);
    });
}); 