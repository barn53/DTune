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

        // Touch/Trackpad gesture tracking
        this.touchStartDistance = 0;
        this.touchStartZoom = 1;
        this.touchStartPanX = 0;
        this.touchStartPanY = 0;
        this.isTrackpadPanning = false;

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

    // Mouse wheel zoom and trackpad gestures
    handleWheel(event) {
        // LOG ALL EVENT PROPERTIES
        console.log('🎡 WHEEL EVENT:', {
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaZ: event.deltaZ,
            deltaMode: event.deltaMode,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            type: event.type,
            target: event.target.tagName
        });

        event.preventDefault();

        if (!this.svgContainer) return;

        // Universal zoom logic (based on the provided example)
        // Trackpad Pinch: wheel + ctrlKey = zoom
        // Mouse Wheel: wheel + altKey = zoom (or just wheel for now)
        // Everything else: pan

        let shouldZoom = false;
        let zoomFactor = 1;

        if (event.ctrlKey && Math.abs(event.deltaY) > 0) {
            // Trackpad Pinch - use exponential zoom like in the example
            shouldZoom = true;
            zoomFactor = Math.exp(-event.deltaY * 0.01);
            console.log('🤏 TRACKPAD PINCH ZOOM:', { deltaY: event.deltaY, zoomFactor });
        } else if (event.altKey && Math.abs(event.deltaY) > 0) {
            // Mouse wheel zoom (with Alt key modifier)
            shouldZoom = true;
            zoomFactor = Math.exp(-event.deltaY * 0.01);
            console.log('�️ MOUSE WHEEL ZOOM:', { deltaY: event.deltaY, zoomFactor });
        } else {
            // Everything else is trackpad pan
            console.log('👆 TRACKPAD PAN:', { deltaX: event.deltaX, deltaY: event.deltaY });
        }

        if (shouldZoom) {
        // ZOOM (Pinch gesture or mouse wheel with Alt)
            const rect = this.svgContainer.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const oldZoom = this.zoom;
            this.zoom = Math.max(0.1, Math.min(this.zoom * zoomFactor, 10));            // Adjust pan to zoom into mouse position
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

        } else {
            // PAN (Two-finger scroll on trackpad - everything that's not zoom)
            const panSensitivity = 1.0;

            this.panX -= event.deltaX * panSensitivity;
            this.panY -= event.deltaY * panSensitivity;

            this.updateTransform();

            // Only save state on significant movement to avoid too many saves
            if (Math.abs(event.deltaX) > 5 || Math.abs(event.deltaY) > 5) {
                this.notifyViewportDragEnd(); // Use lightweight save for panning
            }
        }
    }

    handleMouseDown(event) {
        console.log('🖱️ MOUSE DOWN:', {
            button: event.button,
            buttons: event.buttons,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            clientX: event.clientX,
            clientY: event.clientY
        });

        // For Windows/Linux: Use middle mouse button or Ctrl+drag
        const isMiddleButton = event.button === 1; // Middle mouse button
        const isCtrlDrag = event.ctrlKey && event.button === 0; // Ctrl+left click

        if (isMiddleButton || isCtrlDrag) {
            console.log('✅ STARTING MOUSE DRAG');
            event.preventDefault();
            this.isDragging = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;

            if (this.svgContainer) {
                this.svgContainer.classList.add('dragging');
            }
        }
    }        // Touch events for trackpad gestures (macOS)
    handleTouchStart(event) {
        console.log('👆 TOUCH START:', {
            touchCount: event.touches.length,
            touches: Array.from(event.touches).map(t => ({ x: t.clientX, y: t.clientY }))
        });

        if (event.touches.length === 2) {
            console.log('✅ STARTING TOUCH GESTURE');
            event.preventDefault();

            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            // Calculate initial distance for pinch detection
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);

            // Store initial state
            this.touchStartZoom = this.zoom;
            this.touchStartPanX = this.panX;
            this.touchStartPanY = this.panY;

            // Calculate center point
            this.lastMouseX = (touch1.clientX + touch2.clientX) / 2;
            this.lastMouseY = (touch1.clientY + touch2.clientY) / 2;

            this.isTrackpadPanning = true;
        }
    }

    handleTouchMove(event) {
        if (event.touches.length === 2 && this.isTrackpadPanning) {
            event.preventDefault();

            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            // Calculate current distance
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            // Calculate center point
            const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
            const currentCenterY = (touch1.clientY + touch2.clientY) / 2;

            // Determine if this is primarily a pinch (zoom) or pan gesture
            const distanceChange = Math.abs(currentDistance - this.touchStartDistance);
            const panDistance = Math.sqrt(
                Math.pow(currentCenterX - this.lastMouseX, 2) +
                Math.pow(currentCenterY - this.lastMouseY, 2)
            );

            if (distanceChange > panDistance * 0.5) {
                // Pinch gesture - ZOOM
                const zoomFactor = currentDistance / this.touchStartDistance;
                this.zoom = Math.max(0.1, Math.min(this.touchStartZoom * zoomFactor, 10));
            } else {
                // Pan gesture - DRAG
                const deltaX = currentCenterX - this.lastMouseX;
                const deltaY = currentCenterY - this.lastMouseY;

                this.panX = this.touchStartPanX + deltaX;
                this.panY = this.touchStartPanY + deltaY;
            }

            this.updateTransform();
            this.updateZoomLevel();
        }
    }

    handleTouchEnd(event) {
        if (this.isTrackpadPanning) {
            this.isTrackpadPanning = false;
            this.notifyViewportChange();

            if (this.onZoomChange) {
                this.onZoomChange();
            }
        }
    } handleMouseMove(event) {
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

        // Do NOT transform gutter overlay – we simulate infinite grid instead
        this.updateInfiniteGrid();

        // Update stroke widths to maintain constant pixel size
        this.updateStrokeWidths();
    }

    updateInfiniteGrid() {
        const gutterOverlay = document.getElementById('gutterOverlay');
        if (!gutterOverlay || gutterOverlay.style.display === 'none') return;

        // Base cell size stored on overlay (set when gutter size changes)
        const baseCell = parseFloat(gutterOverlay.dataset.baseCell || '0');
        if (!baseCell || baseCell <= 0) return;

        // Cell size scales linearly with zoom (no smoothing to prevent transient shrink)
        const cell = baseCell * this.zoom;
        if (cell < 2) return; // too small to render meaningfully
        gutterOverlay.style.backgroundSize = `${cell}px ${cell}px`;

        const boundaryOutline = document.querySelector('.svg-boundary-outline');
        if (!boundaryOutline) return; // no boundary yet

        const boundaryRect = boundaryOutline.getBoundingClientRect();
        const overlayRect = gutterOverlay.getBoundingClientRect();
        const boundaryX = boundaryRect.left - overlayRect.left;
        const boundaryY = boundaryRect.top - overlayRect.top;

        const offsetX = ((-boundaryX) % cell + cell) % cell;
        const offsetY = ((-boundaryY) % cell + cell) % cell;
        gutterOverlay.style.backgroundPosition = `${offsetX}px ${offsetY}px`;

        // Ensure origin marker exists
        let originMarker = gutterOverlay.querySelector('.gutter-intersection');
        if (!originMarker) {
            originMarker = document.createElement('div');
            originMarker.className = 'gutter-intersection';
            Object.assign(originMarker.style, {
                position: 'absolute',
                width: '8px',
                height: '8px',
                background: 'rgba(255,0,0,0.9)',
                border: '2px solid #0000ff',
                borderRadius: '2px',
                pointerEvents: 'none',
                zIndex: '10'
            });
            gutterOverlay.appendChild(originMarker);
        }
        const markerSize = originMarker.offsetWidth || 8;
        originMarker.style.left = `${boundaryX - markerSize / 2}px`;
        originMarker.style.top = `${boundaryY - markerSize / 2}px`;
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