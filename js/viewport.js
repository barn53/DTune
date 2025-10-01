/**
 * Viewport Module
 *
 * Handles all viewport transformations including zoom, pan, and user interactions.
 * Provides a unified interface for navigating SVG content with support for both
 * mouse and touch gestures
 *      if (event.ctrlKey && Math.abs(event.deltaY) > 0) {
            // Trackpad pinch gesture - exponential zoom for natural feel
            shouldZoom = true;
            zoomFactor = Math.exp(-event.deltaY * 0.01);
            console.log('🤏 TRACKPAD PINCH ZOOM:', { deltaY: event.deltaY, zoomFactor });
        } else if (event.altKey && Math.abs(event.deltaY) > 0) {
            // Mouse wheel with Alt modifier - discrete zoom steps
            shouldZoom = true;
            zoomFactor = Math.exp(-event.deltaY * 0.01);
            console.log('🖱️ MOUSE WHEEL ZOOM:', { deltaY: event.deltaY, zoomFactor });
        } else {
            // Two-finger trackpad scroll - interpreted as pan
            console.log('👆 TRACKPAD PAN:', { deltaX: event.deltaX, deltaY: event.deltaY });
        }
*
 * Key features:
 * - Smooth zoom in/out with configurable limits
 * - Pan support via mouse drag or trackpad gestures
 * - Touch gesture support for mobile devices
 * - Grid alignment system for precise positioning
 * - Viewport state persistence and restoration
 * - Callback system for coordinating with other modules
 */
class Viewport {
    /**
     * Initialize viewport with default transformation state
     *
     * Sets up all interaction tracking variables and establishes the coordinate
     * system anchor point for grid alignment calculations.
     */
    constructor() {
        // Core transformation state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        // Mouse/touch interaction state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // DOM element references
        this.svgContainer = null;
        this.svgElement = null;

        // Event callbacks for coordinating with other modules
        this.onViewportChange = null; // Full viewport state changes
        this.onViewportDragEnd = null; // Lightweight pan-only changes

        // Touch and gesture tracking for mobile/trackpad support
        this.touchStartDistance = 0;
        this.touchStartZoom = 1;
        this.touchStartPanX = 0;
        this.touchStartPanY = 0;
        this.isTrackpadPanning = false;

        // Trackpad panning cursor timeout
        this.trackpadPanTimeout = null;

        // SVG helper for element operations
        this.svgHelper = new SVGHelper();

        // Grid coordinate system anchor point (extracted from viewBox)
        this.anchorLogicalX = 0;
        this.anchorLogicalY = 0;
    }

    /**
     * Connect viewport to SVG elements for transformation control
     *
     * Establishes the DOM element references and extracts the logical coordinate
     * system anchor from the SVG viewBox. This anchor is used for precise grid
     * alignment and coordinate calculations.
     *
     * @param {Element} container - HTML container element wrapping the SVG
     * @param {Element} svgElement - The main SVG element to control
     */
    setSVGElements(container, svgElement) {
        this.svgContainer = container;
        this.svgElement = svgElement;

        // Extract logical coordinate system anchor from SVG viewBox
        // This defines the origin point for grid alignment calculations
        if (this.svgElement) {
            const vb = this.svgElement.getAttribute('viewBox');
            if (vb) {
                const parts = vb.trim().split(/\s+/).map(Number);
                if (parts.length === 4 && parts.every(v => !isNaN(v))) {
                    this.anchorLogicalX = parts[0]; // viewBox minX
                    this.anchorLogicalY = parts[1]; // viewBox minY
                }
            }
        }
    }

    /**
     * Increase zoom level by 20% with upper limit at 10x
     *
     * Uses a fixed zoom factor of 1.2 for consistent zoom steps.
     * Updates both the SVG transform and UI controls after zoom change.
     */
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 10);
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    /**
     * Decrease zoom level by 20% with lower limit at 0.1x
     *
     * Uses a fixed zoom factor of 1/1.2 for consistent zoom steps.
     * Updates both the SVG transform and UI controls after zoom change.
     */
    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.1);
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    /**
     * Auto-fit SVG content to viewport with 90% padding
     *
     * Calculates optimal zoom level to fit the entire SVG content within
     * the visible container. Uses 90% of available space to provide visual
     * breathing room. Resets pan position to center the content.
     *
     * The zoom level is capped at 2x to prevent excessive magnification
     * of small SVG content.
     */
    zoomToFit() {
        const svg = this.svgHelper.getDisplayedSVG();
        if (!svg || !this.svgContainer) return;

        try {
            const containerRect = this.svgContainer.getBoundingClientRect();
            const svgRect = this.svgHelper.getSafeBBox(svg);
            if (!svgRect) return;

            // Calculate scale factors for both dimensions with 90% padding
            const scaleX = (containerRect.width * 0.9) / svgRect.width;
            const scaleY = (containerRect.height * 0.9) / svgRect.height;

            // Use the smaller scale factor to ensure content fits entirely
            this.zoom = Math.min(scaleX, scaleY, 2);
            this.panX = 0;
            this.panY = 0;

            this.updateTransform();
            this.updateZoomLevel();
            this.notifyViewportChange();
            if (this.onZoomChange) {
                this.onZoomChange();
            }
        } catch (error) {
            console.warn('Could not auto-fit SVG:', error);
        }
    }

    /**
     * Reset pan position to center without changing zoom level
     *
     * Resets both horizontal and vertical pan offsets to zero,
     * effectively centering the content in the viewport while
     * maintaining the current zoom level.
     */
    centerView() {
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.notifyViewportChange();
    }

    /**
     * Handle mouse wheel and trackpad gesture events
     *
     * Implements intelligent gesture detection to differentiate between:
     * - Trackpad pinch (wheel + ctrlKey) → zoom
     * - Mouse wheel + Alt → zoom
     * - Trackpad two-finger scroll → pan
     *
     * Uses exponential zoom factor for smooth zoom experience.
     * Zoom is centered on mouse cursor position for intuitive interaction.
     *
     * @param {WheelEvent} event - The wheel/gesture event to handle
     */
    handleWheel(event) {
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

        // Gesture detection logic:
        // - Trackpad pinch: wheel + ctrlKey = zoom
        // - Mouse wheel + Alt: zoom
        // - Everything else: pan

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

            // Show grab cursor during trackpad panning
            if (this.svgContainer) {
                this.svgContainer.classList.add('trackpad-panning');

                // Clear the cursor after a short delay when panning stops
                clearTimeout(this.trackpadPanTimeout);
                this.trackpadPanTimeout = setTimeout(() => {
                    if (this.svgContainer) {
                        this.svgContainer.classList.remove('trackpad-panning');
                    }
                }, 150); // Remove cursor after 150ms of no pan events
            }
        }

        if (shouldZoom) {
            // Zoom operation - center zoom on mouse cursor position
            const rect = this.svgContainer.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const oldZoom = this.zoom;
            this.zoom = Math.max(0.1, Math.min(this.zoom * zoomFactor, 10));

            // Adjust pan to maintain cursor position during zoom
            // This creates the illusion of zooming "into" the mouse point
            const zoomRatio = this.zoom / oldZoom;
            this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
            this.panY = mouseY - (mouseY - this.panY) * zoomRatio;

            this.updateTransform();
            this.updateZoomLevel();
            this.notifyViewportChange();

            if (this.onZoomChange) {
                this.onZoomChange();
            }

        } else {
            // Pan operation - direct trackpad scroll translation
            const panSensitivity = 1.0;

            this.panX -= event.deltaX * panSensitivity;
            this.panY -= event.deltaY * panSensitivity;

            this.updateTransform();

            // Throttle state saves to prevent excessive saves during smooth scrolling
            if (Math.abs(event.deltaX) > 5 || Math.abs(event.deltaY) > 5) {
                this.notifyViewportDragEnd(); // Lightweight pan-only state save
            }
        }
    }

    /**
     * Handle mouse button press for drag operations
     *
     * Supports two pan interaction modes:
     * - Middle mouse button (universal)
     * - Ctrl + left click (Windows/Linux compatibility)
     *
     * Stores initial cursor position and sets up drag state with
     * visual feedback via CSS class.
     *
     * @param {MouseEvent} event - Mouse button press event
     */
    handleMouseDown(event) {
        console.log('🖱️ MOUSE DOWN:', {
            button: event.button,
            buttons: event.buttons,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            clientX: event.clientX,
            clientY: event.clientY
        });

        // Cross-platform pan gesture detection
        const isMiddleButton = event.button === 1; // Universal middle mouse
        const isCtrlDrag = event.ctrlKey && event.button === 0; // Windows/Linux alternative

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
    }    /**
     * Initialize multi-touch gesture tracking (primarily for macOS trackpads)
     *
     * Detects two-finger touch gestures and captures initial state for
     * subsequent pinch-to-zoom and pan gesture calculations. Stores the
     * baseline distance between touches and viewport state.
     *
     * @param {TouchEvent} event - Touch start event with finger positions
     */
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

            // Capture initial finger distance for pinch zoom detection
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);

            // Snapshot current viewport state for relative calculations
            this.touchStartZoom = this.zoom;
            this.touchStartPanX = this.panX;
            this.touchStartPanY = this.panY;

            // Track gesture center point for pan calculations
            this.lastMouseX = (touch1.clientX + touch2.clientX) / 2;
            this.lastMouseY = (touch1.clientY + touch2.clientY) / 2;

            this.isTrackpadPanning = true;
        }
    }

    /**
     * Process multi-touch gesture movement for zoom and pan
     *
     * Intelligently detects gesture type by comparing finger distance changes
     * vs center point movement. Uses heuristic thresholds to distinguish
     * between pinch-to-zoom and two-finger panning gestures.
     *
     * Pinch detection: When finger distance change exceeds 50% of center
     * point movement, interprets as zoom gesture.
     *
     * @param {TouchEvent} event - Touch move event with updated positions
     */
    handleTouchMove(event) {
        if (event.touches.length === 2 && this.isTrackpadPanning) {
            event.preventDefault();

            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            // Calculate current finger distance
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            // Calculate current gesture center point
            const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
            const currentCenterY = (touch1.clientY + touch2.clientY) / 2;

            // Gesture disambiguation: pinch vs pan detection
            const distanceChange = Math.abs(currentDistance - this.touchStartDistance);
            const panDistance = Math.sqrt(
                Math.pow(currentCenterX - this.lastMouseX, 2) +
                Math.pow(currentCenterY - this.lastMouseY, 2)
            );

            if (distanceChange > panDistance * 0.5) {
                // Primary gesture: pinch-to-zoom
                const zoomFactor = currentDistance / this.touchStartDistance;
                this.zoom = Math.max(0.1, Math.min(this.touchStartZoom * zoomFactor, 10));
            } else {
                // Primary gesture: two-finger pan
                const deltaX = currentCenterX - this.lastMouseX;
                const deltaY = currentCenterY - this.lastMouseY;

                this.panX = this.touchStartPanX + deltaX;
                this.panY = this.touchStartPanY + deltaY;
            }

            this.updateTransform();
            this.updateZoomLevel();
        }
    }

    /**
     * Complete multi-touch gesture and finalize viewport state
     *
     * Clears gesture tracking flags and triggers viewport change
     * notifications to update dependent UI components and persist
     * the final viewport state.
     *
     * @param {TouchEvent} event - Touch end event
     */
    handleTouchEnd(event) {
        if (this.isTrackpadPanning) {
            this.isTrackpadPanning = false;
            this.notifyViewportChange();

            if (this.onZoomChange) {
                this.onZoomChange();
            }
        }
    }

    /**
     * Handle mouse movement during drag operations
     *
     * Calculates movement delta from previous position and applies
     * it as pan offset. Updates cursor tracking for subsequent moves.
     * Only processes movement when in active drag state.
     *
     * @param {MouseEvent} event - Mouse movement event
     */
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

    /**
     * Complete mouse drag operation and finalize viewport state
     *
     * Clears drag state flags, removes visual drag feedback,
     * and triggers lightweight state save notification for
     * pan-only changes (avoiding heavy full saves).
     *
     * @param {MouseEvent} event - Mouse button release event
     */
    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;

            if (this.svgContainer) {
                this.svgContainer.classList.remove('dragging');
            }

            // Use lightweight save for pan-only operations
            this.notifyViewportDragEnd();
        }
    }

    /**
     * Apply viewport transformation to SVG content
     *
     * Updates CSS transform on the main SVG content container to reflect
     * current pan and zoom state. Maintains fixed transform origin at (0,0)
     * for predictable scaling behavior.
     *
     * Coordinates with grid overlay and stroke width systems to maintain
     * visual consistency during transformations.
     */
    updateTransform() {
        const svgContent = document.getElementById('svgContent');
        const gutterOverlay = document.getElementById('gutterOverlay');

        if (!svgContent) return;

        // Ensure scaling always originates from top-left corner
        if (svgContent.style.transformOrigin !== '0px 0px') {
            svgContent.style.transformOrigin = '0 0';
        }

        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        svgContent.style.transform = transform;

        // Update grid overlay without direct transformation (simulated infinite grid)
        this.updateInfiniteGrid();

        // Maintain constant visual stroke width regardless of zoom
        this.updateStrokeWidths();
    }

    /**
     * Update infinite grid overlay positioning and appearance
     *
     * Calculates grid cell size based on current zoom and positions the
     * CSS background grid pattern to maintain alignment with the logical
     * coordinate system anchor point.
     *
     * The grid creates an illusion of infinite extent by using CSS background
     * patterns that align precisely with the viewport's coordinate system.
     * Includes a visual origin marker at the coordinate anchor point.
     */
    updateInfiniteGrid() {
        const gutterOverlay = document.getElementById('gutterOverlay');
        if (!gutterOverlay || gutterOverlay.style.display === 'none') return;

        const baseCell = parseFloat(gutterOverlay.dataset.baseCell || '0');
        if (!baseCell || baseCell <= 0) return;

        const zoom = this.zoom;
        const cell = baseCell * zoom;
        if (cell < 2) return; // Skip rendering when cells become too small

        gutterOverlay.style.backgroundSize = `${cell}px ${cell}px`;

        // Transform logical anchor to screen coordinates
        // Formula: screen = zoom * logical + pan
        const anchorScreenX = zoom * this.anchorLogicalX + this.panX;
        const anchorScreenY = zoom * this.anchorLogicalY + this.panY;

        // Align grid pattern so lines pass exactly through anchor point
        const offsetX = ((anchorScreenX % cell) + cell) % cell;
        const offsetY = ((anchorScreenY % cell) + cell) % cell;
        gutterOverlay.style.backgroundPosition = `${offsetX}px ${offsetY}px`;

        // Render coordinate origin marker at anchor position
        let originMarker = gutterOverlay.querySelector('.gutter-intersection');
        if (!originMarker) {
            originMarker = document.createElement('div');
            originMarker.className = 'gutter-intersection';
            Object.assign(originMarker.style, {
                position: 'absolute',
                width: '6px',
                height: '6px',
                background: '#1673ff',
                border: 'none',
                pointerEvents: 'none',
                zIndex: '10'
            });
            gutterOverlay.appendChild(originMarker);
        }
        const markerSize = originMarker.offsetWidth || 6;
        originMarker.style.left = `${anchorScreenX - markerSize / 2}px`;
        originMarker.style.top = `${anchorScreenY - markerSize / 2}px`;

        // Update debug display if available (live anchor coordinates)
        if (window.shaperEditor && typeof window.shaperEditor.refreshGridDebugAnchors === 'function') {
            window.shaperEditor.refreshGridDebugAnchors(anchorScreenX, anchorScreenY);
        }
    }

    /**
     * Update stroke widths (deprecated - now handled by CSS)
     *
     * All SVG elements now use vector-effect: non-scaling-stroke in CSS
     * for automatic zoom-independent stroke widths. This method is kept
     * for compatibility but no longer performs dynamic adjustments.
     */
    updateStrokeWidths() {
        // All stroke width management moved to CSS with vector-effect: non-scaling-stroke
        // No JavaScript intervention needed
    }

    /**
     * Synchronize zoom level display in UI controls
     *
     * Updates the zoom input field to show current zoom as a percentage.
     * Rounds to nearest integer for clean display.
     */
    updateZoomLevel() {
        const zoomInput = document.getElementById('zoomLevel');
        if (zoomInput) {
            zoomInput.value = Math.round(this.zoom * 100).toString();
        }
    }

    /**
     * Validate and apply zoom level from user input
     *
     * Processes text input from zoom control, handles international decimal
     * separators (comma/period), validates range (10%-1000%), and applies zoom.
     * Invalid inputs reset to 100%. Rounds to integer percentages for
     * consistent behavior.
     *
     * @param {string} inputValue - Raw text from zoom input field
     */
    validateAndApplyZoom(inputValue) {
        // Normalize decimal separator (support both comma and period)
        let value = inputValue.replace(',', '.');

        // Parse the numeric value
        let zoomPercent = parseFloat(value);

        // Validate numeric input
        if (isNaN(zoomPercent)) {
            // Invalid input - reset to 100%
            this.zoom = 1;
        } else {
            // Round to nearest integer percentage
            zoomPercent = Math.round(zoomPercent);

            // Clamp to valid range (10% to 1000%)
            zoomPercent = Math.max(10, Math.min(1000, zoomPercent));

            // Convert percentage to zoom factor
            this.zoom = zoomPercent / 100;
        }

        // Apply changes and update UI
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();

        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    /**
     * Initialize zoom input field event handlers
     *
     * Connects zoom input field to validation and application logic.
     * Handles both blur (focus loss) and Enter key events for
     * immediate zoom application.
     */
    setupZoomInput() {
        const zoomInput = document.getElementById('zoomLevel');
        if (zoomInput) {
            // Validate and apply when user leaves input field
            zoomInput.addEventListener('blur', (event) => {
                this.validateAndApplyZoom(event.target.value);
            });

            // Handle Enter key for immediate application
            zoomInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.target.blur(); // Trigger blur event for validation
                }
            });
        }
    }

    /**
     * Reset viewport to default state (100% zoom, centered)
     *
     * Restores initial viewport state for clean slate viewing.
     * Updates transform and UI controls but doesn't trigger
     * full state notifications.
     */
    resetViewport() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.updateZoomLevel();
    }

    /**
     * Set zoom to exactly 100% without changing pan
     *
     * Quick zoom reset function that maintains current pan position
     * but restores 1:1 scale ratio. Triggers full state notifications
     * for dependent UI updates.
     */
    zoomTo100() {
        this.zoom = 1;
        this.updateTransform();
        this.updateZoomLevel();
        this.notifyViewportChange();
        if (this.onZoomChange) {
            this.onZoomChange();
        }
    }

    /**
     * Get current zoom level
     * @returns {number} Current zoom factor (1.0 = 100%)
     */
    getZoom() {
        return this.zoom;
    }

    /**
     * Get current pan offset
     * @returns {Object} Pan position as {x, y} coordinates in pixels
     */
    getPan() {
        return { x: this.panX, y: this.panY };
    }

    /**
     * Set zoom level with bounds checking
     * @param {number} zoom - Zoom factor to apply (clamped to 0.1-10 range)
     */
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(zoom, 10));
    }

    /**
     * Set pan offset for state restoration
     * @param {number} x - Horizontal pan offset in pixels
     * @param {number} y - Vertical pan offset in pixels
     */
    setPan(x, y) {
        this.panX = x;
        this.panY = y;
    }

    /**
     * Get last recorded mouse position for tooltip positioning
     * @returns {Object} Mouse coordinates as {x, y} in pixels
     */
    getLastMousePosition() {
        return { x: this.lastMouseX, y: this.lastMouseY };
    }

    /**
     * Update mouse position tracking for tooltip system
     * @param {number} x - Mouse X coordinate in pixels
     * @param {number} y - Mouse Y coordinate in pixels
     */
    updateMousePosition(x, y) {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    /**
     * Notify dependent systems of viewport state changes
     *
     * Triggers full state save callbacks for significant viewport changes
     * like zoom operations that affect the entire application state.
     */
    notifyViewportChange() {
        if (this.onViewportChange) {
            this.onViewportChange();
        }
    }

    /**
     * Notify dependent systems of pan-only viewport changes
     *
     * Triggers lightweight state save callbacks for pan operations
     * that don't require full application state persistence.
     */
    notifyViewportDragEnd() {
        if (this.onViewportDragEnd) {
            this.onViewportDragEnd();
        }
    }
}

// Export for use in other modules
window.Viewport = Viewport;