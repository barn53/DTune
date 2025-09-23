// Viewport Module
// Handles zoom, pan, and viewport transformation controls

class Viewport {
    constructor() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.svgContainer = null;
        this.svgElement = null;
        this.onViewportChange = null; // Callback for when viewport state changes

        // Initialize SVG helper for SVG operations
        this.svgHelper = new SVGHelper();
    }

    setSVGElements(container, svgElement) {
        this.svgContainer = container;
        this.svgElement = svgElement;
    }

    // Zoom controls
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 10);
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();
        // Update gutter if callback is available
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.1);
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();
        // Update gutter if callback is available
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    zoomToFit() {
        // Find the SVG element within the content
        const svg = this.svgHelper.getDisplayedSVG();
        if (!svg || !this.svgContainer) return;

        try {
            const containerRect = this.svgContainer.getBoundingClientRect();
            const svgRect = this.svgHelper.getSafeBBox(svg);
            if (!svgRect) return;

            const scaleX = (containerRect.width * 0.9) / svgRect.width;
            const scaleY = (containerRect.height * 0.9) / svgRect.height;

            this.zoom = Math.min(scaleX, scaleY, 2);
            this.panX = 0;
            this.panY = 0;

            this.updateTransform();
            this.updateZoomLevel();
            this.notifyViewportChange();
            // Update gutter if callback is available
            if (this.onZoomChange) {
                this.onZoomChange();
            }
        } catch (error) {
            console.warn('Could not auto-fit SVG:', error);
        }
    }

    // Center the view without changing zoom
    centerView() {
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.notifyViewportChange();
    }

    // Mouse wheel zoom
    handleWheel(event) {
        event.preventDefault();

        if (!this.svgContainer) return;

        const rect = this.svgContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const oldZoom = this.zoom;
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.1, Math.min(this.zoom * zoomFactor, 10));

        // Adjust pan to zoom into mouse position
        const zoomRatio = this.zoom / oldZoom;
        this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
        this.panY = mouseY - (mouseY - this.panY) * zoomRatio;

        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();

        // Update gutter if callback is available
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    // Mouse pan controls
    handleMouseDown(event) {
        // Don't start panning if clicking on interactive overlays (but allow panning on regular SVG elements)
        if (event.target.classList.contains('path-overlay') ||
            event.target.classList.contains('boundary-overlay')) {
            return;
        }

        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        if (this.svgContainer) {
            this.svgContainer.classList.add('dragging');
        }
        event.preventDefault();
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        this.panX += deltaX;
        this.panY += deltaY;

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        this.updateTransform();
    }

    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;

            if (this.svgContainer) {
                this.svgContainer.classList.remove('dragging');
            }

            // Notify that viewport state changed due to panning - use lightweight save
            this.notifyViewportDragEnd();
        }
    }

    // Transform application
    updateTransform() {
        const svgContent = document.getElementById('svgContent');
        const gutterOverlay = document.getElementById('gutterOverlay');

        if (!svgContent) return;

        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        svgContent.style.transform = transform;

        // Apply the same transform to the gutter overlay so it moves with the SVG
        if (gutterOverlay) {
            gutterOverlay.style.transform = transform;
        }

        // Update stroke widths to maintain constant pixel size
        this.updateStrokeWidths();
    }

    updateStrokeWidths() {
        // Calculate inverse scale to maintain constant pixel widths
        const inverseScale = 1 / this.zoom;

        // Update boundary outline stroke widths (target: 2px)
        const boundaryOutlines = document.querySelectorAll('.svg-boundary-outline');
        boundaryOutlines.forEach(outline => {
            outline.setAttribute('stroke-width', (2 * inverseScale).toString());
        });

        // Update overlay stroke widths (target: 10px)
        const overlays = document.querySelectorAll('.boundary-overlay');
        overlays.forEach(overlay => {
            overlay.setAttribute('stroke-width', (10 * inverseScale).toString());
        });

        // Update path overlays (target: 10px)
        const pathOverlays = document.querySelectorAll('path[stroke="transparent"]');
        pathOverlays.forEach(overlay => {
            overlay.setAttribute('stroke-width', (10 * inverseScale).toString());
        });
    }

    updateZoomLevel() {
        const zoomInput = document.getElementById('zoomLevel');
        if (zoomInput) {
            zoomInput.value = Math.round(this.zoom * 100).toString();
        }
    }

    // Validate and apply zoom from input
    validateAndApplyZoom(inputValue) {
        // Replace comma with period for decimal separator
        let value = inputValue.replace(',', '.');

        // Parse the number
        let zoomPercent = parseFloat(value);

        // Check if it's a valid number
        if (isNaN(zoomPercent)) {
            // Invalid input - reset to 100%
            this.zoom = 1;
        } else {
            // Round to nearest integer
            zoomPercent = Math.round(zoomPercent);

            // Clamp to valid range (10% to 1000%)
            zoomPercent = Math.max(10, Math.min(1000, zoomPercent));

            // Convert to zoom factor
            this.zoom = zoomPercent / 100;
        }

        // Apply the zoom and update display
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();

        // Update gutter if callback is available
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    // Setup zoom input event listeners
    setupZoomInput() {
        const zoomInput = document.getElementById('zoomLevel');
        if (zoomInput) {
            // Handle when user leaves the input field
            zoomInput.addEventListener('blur', (event) => {
                this.validateAndApplyZoom(event.target.value);
            });

            // Handle Enter key press
            zoomInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.target.blur(); // This will trigger the blur event
                }
            });
        }
    }

    // Reset viewport
    resetViewport() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.updateZoomLevel();
    }

    zoomTo100() {
        this.zoom = 1;
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();
        // Update gutter if callback is available
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    // Getters for current state
    getZoom() {
        return this.zoom;
    }

    getPan() {
        return { x: this.panX, y: this.panY };
    }

    // Setters for state restoration
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(zoom, 10));
    }

    setPan(x, y) {
        this.panX = x;
        this.panY = y;
    }

    // Mouse position tracking for tooltips
    getLastMousePosition() {
        return { x: this.lastMouseX, y: this.lastMouseY };
    }

    updateMousePosition(x, y) {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    // Notify when viewport state changes (for saving to localStorage)
    notifyViewportChange() {
        // For regular viewport changes (zoom, etc.) - call full save
        if (this.onViewportChange) {
            this.onViewportChange();
        }
    }

    notifyViewportDragEnd() {
        // For drag end - call lightweight viewport-only save
        if (this.onViewportDragEnd) {
            this.onViewportDragEnd();
        }
    }
}

// Export for use in other modules
window.Viewport = Viewport;