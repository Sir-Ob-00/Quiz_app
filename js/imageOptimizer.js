// Image Optimization Utility
class ImageOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.observer = null;
        this.intersectionOptions = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };
        
        // Supported formats and their WebP equivalents
        this.supportedFormats = {
            'jpg': 'webp',
            'jpeg': 'webp',
            'png': 'webp'
        };
        
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.detectWebPSupport();
    }

    // Check if WebP is supported
    async detectWebPSupport() {
        const webP = new Image();
        webP.onload = webP.onerror = () => {
            this.webPSupported = webP.height === 2;
            console.log(`WebP support: ${this.webPSupported}`);
        };
        webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    }

    // Setup intersection observer for lazy loading
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, this.intersectionOptions);
        }
    }

    // Optimize image element
    optimizeImage(imgElement, options = {}) {
        const {
            src,
            alt = '',
            width,
            height,
            lazy = true,
            responsive = true,
            quality = 0.8
        } = options;

        if (!imgElement || !src) return;

        // Set basic attributes
        imgElement.alt = alt;
        if (width) imgElement.width = width;
        if (height) imgElement.height = height;

        // Add loading attribute for native lazy loading
        if (lazy && 'loading' in HTMLImageElement.prototype) {
            imgElement.loading = 'lazy';
        }

        // Generate responsive srcset if supported
        if (responsive && this.webPSupported) {
            this.generateResponsiveSrcset(imgElement, src, quality);
        } else {
            imgElement.src = src;
        }

        // Setup lazy loading with intersection observer
        if (lazy && this.observer && !('loading' in HTMLImageElement.prototype)) {
            imgElement.dataset.src = imgElement.src;
            imgElement.src = this.getPlaceholderDataURL(width, height);
            imgElement.classList.add('lazy-image');
            this.observer.observe(imgElement);
        }

        // Add error handling
        imgElement.onerror = () => {
            this.handleImageError(imgElement, src);
        };
    }

    // Generate responsive srcset for different screen sizes
    generateResponsiveSrcset(imgElement, originalSrc, quality) {
        const sizes = [320, 480, 768, 1024, 1200];
        const srcset = [];
        const webpSrcset = [];

        sizes.forEach(size => {
            const webpSrc = this.convertToWebP(originalSrc, size, quality);
            const originalSrcResized = this.resizeImageURL(originalSrc, size);
            
            if (webpSrc) {
                webpSrcset.push(`${webpSrc} ${size}w`);
            }
            srcset.push(`${originalSrcResized} ${size}w`);
        });

        // Set picture element if WebP is supported
        if (this.webPSupported && webpSrcset.length > 0) {
            const picture = document.createElement('picture');
            
            // WebP source
            const webpSource = document.createElement('source');
            webpSource.srcset = webpSrcset.join(', ');
            webpSource.sizes = '(max-width: 320px) 320px, (max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, 1200px';
            webpSource.type = 'image/webp';
            picture.appendChild(webpSource);

            // Fallback source
            const fallbackSource = document.createElement('source');
            fallbackSource.srcset = srcset.join(', ');
            fallbackSource.sizes = '(max-width: 320px) 320px, (max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, 1200px';
            picture.appendChild(fallbackSource);

            // Original img as fallback
            imgElement.srcset = srcset.join(', ');
            imgElement.sizes = '(max-width: 320px) 320px, (max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, 1200px';
            picture.appendChild(imgElement);

            // Replace img with picture
            imgElement.parentNode.insertBefore(picture, imgElement);
            picture.appendChild(imgElement);
        } else {
            imgElement.srcset = srcset.join(', ');
            imgElement.sizes = '(max-width: 320px) 320px, (max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, 1200px';
        }
    }

    // Convert image to WebP format (simplified - in production you'd use a server-side solution)
    convertToWebP(originalSrc, width, quality) {
        // This is a placeholder - in a real implementation, you'd have server-side image processing
        // For now, we'll return the original URL with a WebP extension
        const url = new URL(originalSrc, window.location.origin);
        const pathParts = url.pathname.split('.');
        if (pathParts.length > 1) {
            const extension = pathParts.pop();
            if (this.supportedFormats[extension.toLowerCase()]) {
                pathParts.push('webp');
                url.pathname = pathParts.join('.');
                return url.toString();
            }
        }
        return null;
    }

    // Resize image URL (simplified - in production you'd use a CDN or server-side processing)
    resizeImageURL(originalSrc, width) {
        // This is a placeholder - in a real implementation, you'd have server-side image processing
        // For now, we'll return the original URL
        return originalSrc;
    }

    // Load image when it comes into view
    loadImage(imgElement) {
        const src = imgElement.dataset.src;
        if (src) {
            imgElement.src = src;
            imgElement.classList.remove('lazy-image');
            imgElement.classList.add('loaded');
        }
    }

    // Handle image loading errors
    handleImageError(imgElement, originalSrc) {
        console.warn(`Failed to load image: ${originalSrc}`);
        
        // Try fallback to original format
        if (originalSrc.includes('.webp')) {
            const fallbackSrc = originalSrc.replace('.webp', '.jpg');
            imgElement.src = fallbackSrc;
        } else {
            // Show placeholder
            imgElement.src = this.getPlaceholderDataURL(
                imgElement.width || 300, 
                imgElement.height || 200
            );
            imgElement.classList.add('image-error');
        }
    }

    // Generate placeholder data URL
    getPlaceholderDataURL(width = 300, height = 200) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // Create a simple placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', width / 2, height / 2);
        
        return canvas.toDataURL();
    }

    // Preload critical images
    preloadImages(imageUrls) {
        imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
            this.imageCache.set(url, img);
        });
    }

    // Optimize background images
    optimizeBackgroundImage(element, imageUrl, options = {}) {
        const {
            size = 'cover',
            position = 'center',
            repeat = 'no-repeat'
        } = options;

        // Set background properties
        element.style.backgroundImage = `url(${imageUrl})`;
        element.style.backgroundSize = size;
        element.style.backgroundPosition = position;
        element.style.backgroundRepeat = repeat;

        // Add loading class
        element.classList.add('bg-loading');

        // Preload the image
        const img = new Image();
        img.onload = () => {
            element.classList.remove('bg-loading');
            element.classList.add('bg-loaded');
        };
        img.onerror = () => {
            element.classList.remove('bg-loading');
            element.classList.add('bg-error');
        };
        img.src = imageUrl;
    }

    // Get image dimensions
    getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    // Compress image data (for user uploads)
    async compressImage(file, options = {}) {
        const {
            maxWidth = 1920,
            maxHeight = 1080,
            quality = 0.8,
            format = 'webp'
        } = options;

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
                canvas.toBlob(resolve, mimeType, quality);
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // Cleanup
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.imageCache.clear();
    }
}

// Export for use in other modules
export default ImageOptimizer; 