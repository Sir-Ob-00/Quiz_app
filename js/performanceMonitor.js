// Performance Monitoring Utility
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoadTime: 0,
            questionLoadTimes: new Map(),
            cacheHitRate: 0,
            memoryUsage: 0,
            networkRequests: 0,
            errors: []
        };
        
        this.startTime = performance.now();
        this.init();
    }

    init() {
        this.measurePageLoad();
        this.setupPerformanceObserver();
        this.setupErrorTracking();
        this.createMetricsDisplay();
    }

    // Measure page load time
    measurePageLoad() {
        window.addEventListener('load', () => {
            this.metrics.pageLoadTime = performance.now() - this.startTime;
            console.log(`Page load time: ${this.metrics.pageLoadTime.toFixed(2)}ms`);
            this.updateMetricsDisplay();
        });
    }

    // Setup performance observer for navigation timing
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'navigation') {
                            this.metrics.pageLoadTime = entry.loadEventEnd - entry.loadEventStart;
                        }
                    }
                });
                observer.observe({ entryTypes: ['navigation'] });
            } catch (error) {
                console.log('PerformanceObserver not supported:', error);
            }
        }
    }

    // Track question loading performance
    recordQuestionLoad(category, loadTime) {
        this.metrics.questionLoadTimes.set(category, loadTime);
        console.log(`Question load time for ${category}: ${loadTime.toFixed(2)}ms`);
        this.updateMetricsDisplay();
    }

    // Track cache performance
    updateCacheMetrics(hitRate, hits, misses) {
        this.metrics.cacheHitRate = hitRate;
        this.metrics.cacheHits = hits;
        this.metrics.cacheMisses = misses;
        this.updateMetricsDisplay();
    }

    // Track memory usage
    updateMemoryUsage(usage) {
        this.metrics.memoryUsage = usage;
        this.updateMetricsDisplay();
    }

    // Track network requests
    incrementNetworkRequests() {
        this.metrics.networkRequests++;
        this.updateMetricsDisplay();
    }

    // Setup error tracking
    setupErrorTracking() {
        window.addEventListener('error', (event) => {
            this.metrics.errors.push({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                timestamp: new Date().toISOString()
            });
            this.updateMetricsDisplay();
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.metrics.errors.push({
                message: event.reason,
                type: 'Promise Rejection',
                timestamp: new Date().toISOString()
            });
            this.updateMetricsDisplay();
        });
    }

    // Create metrics display
    createMetricsDisplay() {
        const metricsDiv = document.createElement('div');
        metricsDiv.className = 'performance-metrics';
        metricsDiv.id = 'performance-metrics';
        metricsDiv.innerHTML = `
            <h4>Performance Metrics</h4>
            <p><strong>Page Load:</strong> <span id="page-load-time">-</span></p>
            <p><strong>Cache Hit Rate:</strong> <span id="cache-hit-rate">-</span></p>
            <p><strong>Memory Usage:</strong> <span id="memory-usage">-</span></p>
            <p><strong>Network Requests:</strong> <span id="network-requests">-</span></p>
            <p><strong>Errors:</strong> <span id="error-count">-</span></p>
            <button id="toggle-metrics" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.7rem;">Hide</button>
        `;
        
        document.body.appendChild(metricsDiv);
        
        // Toggle visibility
        const toggleBtn = document.getElementById('toggle-metrics');
        toggleBtn.addEventListener('click', () => {
            const isVisible = metricsDiv.classList.contains('show');
            if (isVisible) {
                metricsDiv.classList.remove('show');
                toggleBtn.textContent = 'Show';
            } else {
                metricsDiv.classList.add('show');
                toggleBtn.textContent = 'Hide';
            }
        });

        // Show metrics in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            metricsDiv.classList.add('show');
        }
    }

    // Update metrics display
    updateMetricsDisplay() {
        const pageLoadTime = document.getElementById('page-load-time');
        const cacheHitRate = document.getElementById('cache-hit-rate');
        const memoryUsage = document.getElementById('memory-usage');
        const networkRequests = document.getElementById('network-requests');
        const errorCount = document.getElementById('error-count');

        if (pageLoadTime && typeof this.metrics.pageLoadTime === 'number') {
            pageLoadTime.textContent = `${this.metrics.pageLoadTime.toFixed(0)}ms`;
        } else if (pageLoadTime) {
            pageLoadTime.textContent = '-';
        }
        
        if (cacheHitRate && typeof this.metrics.cacheHitRate === 'number') {
            cacheHitRate.textContent = `${(this.metrics.cacheHitRate * 100).toFixed(1)}%`;
        } else if (cacheHitRate) {
            cacheHitRate.textContent = '-';
        }
        
        if (memoryUsage && typeof this.metrics.memoryUsage === 'number') {
            memoryUsage.textContent = `${this.metrics.memoryUsage.toFixed(1)}KB`;
        } else if (memoryUsage) {
            memoryUsage.textContent = '-';
        }
        
        if (networkRequests && typeof this.metrics.networkRequests === 'number') {
            networkRequests.textContent = this.metrics.networkRequests;
        } else if (networkRequests) {
            networkRequests.textContent = '-';
        }
        
        if (errorCount && Array.isArray(this.metrics.errors)) {
            errorCount.textContent = this.metrics.errors.length;
        } else if (errorCount) {
            errorCount.textContent = '-';
        }
    }

    // Get performance report
    getPerformanceReport() {
        const avgQuestionLoadTime = Array.from(this.metrics.questionLoadTimes.values())
            .reduce((a, b) => a + b, 0) / this.metrics.questionLoadTimes.size || 0;

        return {
            pageLoadTime: this.metrics.pageLoadTime,
            averageQuestionLoadTime: avgQuestionLoadTime,
            cacheHitRate: this.metrics.cacheHitRate,
            memoryUsage: this.metrics.memoryUsage,
            networkRequests: this.metrics.networkRequests,
            errorCount: this.metrics.errors.length,
            errors: this.metrics.errors,
            questionLoadTimes: Object.fromEntries(this.metrics.questionLoadTimes),
            timestamp: new Date().toISOString()
        };
    }

    // Export performance data
    exportPerformanceData() {
        const report = this.getPerformanceReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Monitor specific performance metrics
    startTimer(name) {
        const start = performance.now();
        return {
            end: () => {
                const duration = performance.now() - start;
                console.log(`${name} took ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    // Monitor memory usage
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usageKB = (memory.usedJSHeapSize / 1024).toFixed(1);
                this.updateMemoryUsage(parseFloat(usageKB));
            }, 5000); // Check every 5 seconds
        }
    }

    // Cleanup
    destroy() {
        const metricsDiv = document.getElementById('performance-metrics');
        if (metricsDiv) {
            metricsDiv.remove();
        }
    }
}

// Export for use in other modules
export default PerformanceMonitor; 