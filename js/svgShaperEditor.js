/**
 * SVG Shaper Editor - Main Application Orchestrator
 *
 * Central coordination hub that manages all application subsystems and
 * handles the complete application lifecycle. Provides module integration,
 * event coordination, and state management for the SVG editing environment.
 *
 * Architecture:
 * - Modular design with loose coupling between subsystems
 * - Event-driven communication between modules
 * - Centralized state management with localStorage persistence
 * - Responsive UI with touch and desktop interaction support
 * - Real-time measurement and unit conversion system
 *
 * Key Responsibilities:
 * - Module initialization and dependency injection
 * - Event binding and delegation
 * - File loading and processing coordination
 * - Viewport and interaction management
 * - State persistence and restoration
 * - Error handling and user feedback
 */
class SVGShaperEditor {
    /**
     * Initialize SVG Shaper Editor with all subsystems
     */
    constructor() {
        // Core subsystem initialization with dependency injection
        this.measurementSystem = new MeasurementSystem();
        this.fileManager = new FileManager(this.measurementSystem);

        // Element data cache for performance optimization
        this.elementDataMap = new Map();

        // Module initialization with dependency wiring
        this.elementManager = new ElementManager(this.measurementSystem, this.fileManager, this.elementDataMap);
        this.viewport = new Viewport();
        this.uiComponents = new UIComponents(this.measurementSystem, this.elementManager);
        this.attributeSystem = new AttributeSystem(this.measurementSystem, this.fileManager, this.elementManager);

        // SVG processing utilities
        this.svgHelper = new SVGHelper();

        // Application initialization sequence
        this.initializeElements();
        this.bindEvents();
        this.setupModuleConnections();

        // Application state tracking
        this.boundaryTooltipActive = false;
        this.isLoadingFromLocalStorage = false;
    }

    /**
     * Initialize DOM element references and UI components
     *
     * Caches references to all critical DOM elements for efficient access
     * throughout the application lifecycle. Sets up UI component initialization.
     */
    initializeElements() {
        // Main application sections
        this.uploadSection = document.getElementById('uploadSection');
        this.editorSection = document.getElementById('editorSection');

        // File upload interface elements
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.uploadButton = document.getElementById('uploadBtn');
        this.floatingImportBtn = document.getElementById('floatingImportBtn');
        this.floatingExportBtn = document.getElementById('floatingExportBtn');

        // SVG viewport and display elements
        this.svgContainer = document.getElementById('svgContainer');
        this.svgWrapper = document.getElementById('svgWrapper');
        this.svgContent = document.getElementById('svgContent');
        this.gutterOverlay = document.getElementById('gutterOverlay');

        // User control elements
        this.unitsToggle = document.getElementById('unitToggle');
        this.decimalToggle = document.getElementById('decimalToggle');
        this.gutterToggle = document.getElementById('gutterToggle');
        this.gutterSize = document.getElementById('gutterSize');
        this.gutterUnitLabel = document.getElementById('gutterUnitLabel');

        // Viewport control buttons
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.zoom100Btn = document.getElementById('zoom100');
        this.zoomFitBtn = document.getElementById('zoomFit');
        this.centerViewBtn = document.getElementById('centerView');

        // Application state display
        this.currentFileNameDisplay = document.getElementById('titlebarFilename');

        // Initialize complex UI components
        this.uiComponents.initializeElements();
    }

    /**
     * Establish inter-module connections and callback systems
     *
     * Creates the communication pathways between modules using dependency
     * injection and callback patterns. Ensures loose coupling while enabling
     * coordinated functionality across the application.
     */
    setupModuleConnections() {
        // Connect elementManager to fileManager for coordinated export operations
        this.fileManager.setElementManager(this.elementManager);

        // Establish SVG loading pipeline with comprehensive callback handling
        this.fileManager.setLoadCallback((svgElement, svgData, fileName) => {
            this.currentFileName = fileName;
            this.updateFileNameDisplay();
            this.showEditor();

            // --- NEW: Analyze the SVG and populate the data map ---
            // This is the one-time measurement of all elements
            if (!this.isLoadingFromLocalStorage) {
                // Only clear and re-analyze when loading a new file, not from localStorage
                this.elementDataMap.clear(); // Clear old data
                const newMap = this.measurementSystem.analyzeSVG(svgElement);
                newMap.forEach((value, key) => this.elementDataMap.set(key, value));
            } else {
                // When loading from localStorage, merge new measurements with existing shaper attributes
                const newMap = this.measurementSystem.analyzeSVG(svgElement);
                newMap.forEach((newData, appId) => {
                    const existingData = this.elementDataMap.get(appId);
                    if (existingData && existingData.shaperAttributes) {
                        // Keep the shaper attributes from localStorage, update measurements
                        newData.shaperAttributes = existingData.shaperAttributes;
                    }
                    this.elementDataMap.set(appId, newData);
                });
            }


            this.displaySVG(svgElement);

            // Only reset viewport when loading a new file (not from localStorage)
            if (!this.isLoadingFromLocalStorage) {
                this.viewport.resetViewport();
                // Save data immediately for new files
                this.saveToLocalStorage();
            }
            // For localStorage loading, saveToLocalStorage will be called after viewport restoration
        });

        // Connect UI components save method to attribute system
        this.uiComponents.saveAttributes = () => {
            this.attributeSystem.saveAttributes();

            // Update SVG data to match what would be exported, then save to localStorage
            this.fileManager.updateSVGData();
            this.saveToLocalStorage();

            // Refresh tooltip BEFORE closing modal (while selection is still active)
            this.uiComponents.refreshTooltipIfVisible();
            this.uiComponents.closeModal();
        };

        // Provide access to utility methods
        this.attributeSystem.editor = this;
        this.uiComponents.editor = this;

        // Connect viewport zoom changes to gutter updates
        this.viewport.onZoomChange = () => {
            this.updateGutterSize();
        };

        // Connect viewport changes to localStorage persistence
        this.viewport.onViewportChange = () => {
            // Full save for zoom and other viewport changes
            this.saveToLocalStorage();
        };

        this.viewport.onViewportDragEnd = () => {
            // Lightweight save for panning (drag end)
            this.saveViewportOnly();
        };

        // Connect context menu actions
        this.uiComponents.onExportSVG = () => {
            this.fileManager.exportSVG();
        };

        this.uiComponents.onCopyToClipboard = () => {
            this.copyToClipboard();
        };

        this.uiComponents.onZoomToFit = () => {
            this.viewport.zoomToFit();
        };

        this.uiComponents.onCenterView = () => {
            this.viewport.centerView();
        };

        this.uiComponents.onZoom100 = () => {
            this.viewport.zoomTo100();
        };

        // Load saved data from localStorage
        this.loadFromLocalStorage();
    }

    // localStorage persistence methods
    saveToLocalStorage() {
        // Save full settings including SVG data
        this.saveFullSettings();
    }

    saveViewportOnly() {
        // Lightweight save - only viewport changes, triggered on mouse release
        try {
            const savedSettings = localStorage.getItem('shaperEditorSettings');
            let settings = savedSettings ? JSON.parse(savedSettings) : {};

            // Update only viewport state
            settings.zoom = this.viewport.getZoom();
            settings.panX = this.viewport.getPan().x;
            settings.panY = this.viewport.getPan().y;

            localStorage.setItem('shaperEditorSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save viewport state:', error);
        }
    }

    saveFullSettings() {
        // Complete save - all settings including SVG data
        // Get raw value in mm for gutter size to maintain precision across unit changes
        const rawGutterSizeMm = this.getRawValue(this.gutterSize);

        const settings = {
            gutterEnabled: this.gutterToggle.checked,
            units: this.measurementSystem.units,
            decimalSeparator: this.measurementSystem.decimalSeparator,
            gutterSizeRawMm: !isNaN(rawGutterSizeMm) ? rawGutterSizeMm : parseFloat(this.gutterSize.value) || 10,
            // Save viewport state
            zoom: this.viewport.getZoom(),
            panX: this.viewport.getPan().x,
            panY: this.viewport.getPan().y,
            // Save measurement data for debugging
            dpi: this.measurementSystem.dpi,
            elementData: Array.from(this.elementDataMap.entries()).map(([appId, data]) => ({
                elementId: appId,
                data: data
            })),
            originalSVG: this.fileManager.svg ? {
                svg: this.fileManager.svg,
                fileName: this.currentFileName || 'untitled.svg'
            } : null,
            // --- Debugging ---
            displayCloneSVG: this.svgContent.innerHTML,
            measurementCloneSVG: this.measurementSystem.lastMeasurementCloneHTML,
            // Debug: Current boundary dimensions
            boundaryDebug: this.getBoundaryDebugInfo()
        };

        localStorage.setItem('shaperEditorSettings', JSON.stringify(settings));
    }

    loadFromLocalStorage() {
        try {
            const savedSettings = localStorage.getItem('shaperEditorSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);

                // Apply gutter toggle
                if (typeof settings.gutterEnabled === 'boolean') {
                    this.gutterToggle.checked = settings.gutterEnabled;
                    this.gutterOverlay.style.display = settings.gutterEnabled ? 'block' : 'none';
                }

                // ...existing code...

                // Apply units with toggle synchronization
                this.applySetting(
                    settings.units,
                    ['mm', 'in'],
                    (units) => {
                        this.measurementSystem.setUnits(units);
                        this.updateUnitDisplay();
                    },
                    this.unitsToggle,
                    (units) => units === 'in'
                );

                // Apply decimal separator with toggle synchronization
                this.applySetting(
                    settings.decimalSeparator,
                    ['.', ','],
                    (separator) => this.measurementSystem.setDecimalSeparator(separator),
                    this.decimalToggle,
                    (separator) => separator === ','
                );

                // Apply gutter size from raw value
                let gutterSizeRawMm = settings.gutterSizeRawMm;

                // Handle backwards compatibility with old gutterSize format
                if (!gutterSizeRawMm && settings.gutterSize && !isNaN(parseFloat(settings.gutterSize))) {
                    // Convert old display value to raw mm if we had old format
                    gutterSizeRawMm = parseFloat(settings.gutterSize);
                    // If it was saved in inches, convert to mm (assuming default was mm)
                    if (settings.units === 'in' && gutterSizeRawMm < 5) {
                        gutterSizeRawMm = gutterSizeRawMm * 25.4;
                    }
                }

                if (gutterSizeRawMm && !isNaN(parseFloat(gutterSizeRawMm))) {
                    // Set the raw value first
                    this.setRawValue(this.gutterSize, gutterSizeRawMm);

                    // Convert from raw mm to current unit and display
                    const displayValue = this.measurementSystem.convertBetweenUnits(gutterSizeRawMm, 'mm', this.measurementSystem.units);
                    this.gutterSize.value = this.measurementSystem.formatDisplayNumber(displayValue);
                }

                // Update gutter display with loaded values
                this.updateGutterSize();

                // Restore elementData if available
                if (settings.elementData && Array.isArray(settings.elementData)) {
                    this.elementDataMap.clear();
                    settings.elementData.forEach(item => {
                        if (item.elementId && item.data) {
                            this.elementDataMap.set(item.elementId, item.data);
                        }
                    });
                }

                // Restore original SVG if available
                if (settings.originalSVG && settings.originalSVG.svg) {
                    try {
                        // Set flag to indicate we're loading from localStorage
                        this.isLoadingFromLocalStorage = true;

                        this.currentFileName = settings.originalSVG.fileName || 'untitled.svg';
                        this.updateFileNameDisplay();
                        this.fileManager.parseSVG(settings.originalSVG.svg, this.currentFileName);

                        // CRITICAL: Event loop deferral trick for proper initialization sequence
                        //
                        // Why setTimeout(0) is necessary here:
                        // 1. parseSVG() triggers the fileManager.setLoadCallback() asynchronously
                        // 2. The load callback modifies DOM, measures elements, and updates viewport
                        // 3. We need viewport restoration to happen AFTER the load callback completes
                        // 4. setTimeout(0) defers execution to the next event loop cycle
                        // 5. This ensures the load callback's DOM modifications are complete before restoration
                        //
                        // Without this pattern: Race condition where viewport gets restored before
                        // SVG is properly loaded and measured, leading to incorrect zoom/pan state.
                        setTimeout(() => {
                            this.restoreViewportState(settings);
                            this.isLoadingFromLocalStorage = false;
                            // Save data after viewport is properly restored
                            this.saveToLocalStorage();
                        }, 0);
                    } catch (error) {
                        console.error('Error restoring last opened file:', error);
                        this.isLoadingFromLocalStorage = false;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
        }
    }

    // Restore viewport state from localStorage settings
    restoreViewportState(settings) {
        // Temporarily disable viewport change callback to prevent immediate re-saving
        const originalCallback = this.viewport.onViewportChange;
        this.viewport.onViewportChange = null;

        // Restore viewport state (zoom and pan) only when loading from localStorage
        if (typeof settings.zoom === 'number' && !isNaN(settings.zoom)) {
            this.viewport.setZoom(Math.max(0.1, Math.min(settings.zoom, 10))); // Clamp to valid range
        }
        if (typeof settings.panX === 'number' && !isNaN(settings.panX)) {
            this.viewport.setPan(settings.panX, settings.panY || 0);
        }

        // Apply the restored viewport transform
        this.viewport.updateTransform();
        this.viewport.updateZoomLevel();

        // Restore the viewport change callback
        this.viewport.onViewportChange = originalCallback;

    }    // Helper method to apply a setting with proper toggle synchronization
    applySetting(settingValue, validValues, applyFn, toggleElement, toggleCondition) {
        if (validValues.includes(settingValue)) {
            // Prevent toggle override during localStorage load
            const wasLoadingFromLocalStorage = this.isLoadingFromLocalStorage;
            this.isLoadingFromLocalStorage = true;

            applyFn(settingValue);

            this.isLoadingFromLocalStorage = wasLoadingFromLocalStorage;

            // Set toggle state after setting is applied
            if (toggleElement) {
                toggleElement.checked = toggleCondition(settingValue);
            }
        }
    }

    bindEvents() {
        // File upload events
        this.fileInput.addEventListener('change', (e) => {
            this.fileManager.handleFileSelect(e);
        });
        this.uploadArea.addEventListener('click', (e) => {
            // Only trigger file input if not clicking the button
            if (!e.target.closest('#uploadBtn')) {
                this.fileInput.click();
            }
        });
        this.uploadArea.addEventListener('dragover', (e) => this.fileManager.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.fileManager.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.fileManager.handleDrop(e));

        this.uploadButton.addEventListener('click', () => this.fileInput.click());

        // Floating button events
        this.floatingImportBtn.addEventListener('click', () => this.fileInput.click());
        this.floatingExportBtn.addEventListener('click', () => this.fileManager.exportSVG());

        // Toolbar events
        this.gutterSize.addEventListener('blur', () => this.handleGutterInput());
        this.gutterSize.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.gutterSize.blur();
            }
        });

        this.unitsToggle.addEventListener('change', () => this.toggleUnits());
        this.decimalToggle.addEventListener('change', () => this.toggleDecimalSeparator());
        this.gutterToggle.addEventListener('change', () => this.toggleGutter());

        // Setup zoom input events
        this.viewport.setupZoomInput();

        // Zoom and pan events
        this.zoomInBtn.addEventListener('click', () => {
            this.viewport.zoomIn();
            this.updateGutterSize();
        });
        this.zoomOutBtn.addEventListener('click', () => {
            this.viewport.zoomOut();
            this.updateGutterSize();
        });
        this.zoom100Btn.addEventListener('click', () => {
            this.viewport.zoomTo100();
            this.updateGutterSize();
        });
        this.zoomFitBtn.addEventListener('click', () => {
            this.viewport.zoomToFit();
            this.updateGutterSize();
        });
        this.centerViewBtn.addEventListener('click', () => {
            this.viewport.centerView();
        });

        // Modal events
        document.getElementById('modalClose').addEventListener('click', () => this.uiComponents.closeModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.uiComponents.closeModal());
        document.getElementById('modalSave').addEventListener('click', () => {
            this.uiComponents.saveAttributes(); // Use the proper method that includes localStorage save
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.uiComponents.modal) {
                this.uiComponents.closeModal();
            }
        });

        // Add blur handlers for dialog input fields to normalize decimal separators
        ['cutDepth', 'cutOffset', 'toolDia'].forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('blur', () => {
                    this.normalizeInput(input);
                });
            } else {
                console.error(`Could not find input element: ${inputId}`);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.uiComponents.handleKeyDown(e));
        // Global shortcut listener (in separater Listener um bestehende Logik nicht zu stören)
        document.addEventListener('keydown', (e) => {
            // Zoom to Fit: Cmd/Ctrl + 0 (falls Browser nicht vorher abfängt)
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
                if (e.key === '0' || e.code === 'Digit0') {
                    // Nicht auslösen, wenn gerade in einem Eingabefeld gearbeitet wird
                    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
                    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
                    // Manche Browser nutzen Cmd/Ctrl+0 für Page-Zoom-Reset; wir versuchen zu übernehmen
                    e.preventDefault();
                    if (this.viewport && typeof this.viewport.zoomToFit === 'function') {
                        this.viewport.zoomToFit();
                        this.updateGutterSize();
                        this.showNotification('Zoom to Fit', 'info');
                    }
                }
            }
        });
    }

    displaySVG(svgElement) {
        // Clear previous content
        this.svgContent.innerHTML = '';

        // Clone and append the SVG element
        const displayClone = this.svgHelper.cloneSVGElement(svgElement, this.svgContent);

        // Add boundary outline to show SVG boundaries
        this.addBoundaryOutline(displayClone);

        // Set up viewport
        this.viewport.setSVGElements(this.svgWrapper, displayClone);

        // Add overlays and click handlers
        this.addOverlaysToDisplayedSVG(displayClone);

        // Show editor section
        this.showEditor();
    }

    addBoundaryOutline(svgElement) {
        // Create and add boundary outline rectangle using SVGHelper
        const outline = this.svgHelper.createBoundaryOutline(svgElement);

        // Insert as first child so it appears behind other elements
        if (svgElement.firstChild) {
            svgElement.insertBefore(outline, svgElement.firstChild);
        } else {
            svgElement.appendChild(outline);
        }
    }

    addOverlaysToDisplayedSVG(svgElement) {
        // Find all path-like elements (excluding boundary outline)
        const paths = svgElement.querySelectorAll(ShaperConstants.ELEMENT_SELECTORS);

        paths.forEach(path => {
            // Skip boundary outline - it gets special handling
            if (path.classList.contains(ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE)) {
                this.addBoundaryOutlineWithOverlay(path);
                return;
            }

            // Create overlay for better click handling
            const overlay = this.elementManager.createPathOverlay(path);

            // Insert overlay after the original path
            path.parentNode.insertBefore(overlay, path.nextSibling);

            // Add event handlers to overlay
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                this.uiComponents.openAttributeModal(path);
            });

            // Allow mousedown events to bubble up for panning functionality
            overlay.addEventListener('mousedown', (e) => {
                // Don't stop propagation - let it bubble up to svgWrapper for panning
                // Only handle this if it's not a drag operation
            });

            overlay.addEventListener('mouseenter', (e) => {
                path.classList.add(ShaperConstants.CSS_CLASSES.HOVER);
                this.elementManager.setHoveredPath(path);
                this.uiComponents.showTooltip(path, e.clientX, e.clientY);
            });
            overlay.addEventListener('mousemove', (e) => {
                this.viewport.updateMousePosition(e.clientX, e.clientY);
                this.uiComponents.setMousePosition(e.clientX, e.clientY);
                this.uiComponents.updateTooltipPosition(e.clientX, e.clientY);
            });

            overlay.addEventListener('mouseleave', (e) => {
                path.classList.remove(ShaperConstants.CSS_CLASSES.HOVER);
                this.elementManager.setHoveredPath(null);
                this.uiComponents.hideTooltip();
            });
        });

        // Add viewport mouse events to wrapper for dragging
        this.svgWrapper.addEventListener('wheel', (e) => this.viewport.handleWheel(e));
        this.svgWrapper.addEventListener('mousedown', (e) => this.viewport.handleMouseDown(e));

        // Add touch events for trackpad gestures (macOS)
        this.svgWrapper.addEventListener('touchstart', (e) => this.viewport.handleTouchStart(e), { passive: false });
        this.svgWrapper.addEventListener('touchmove', (e) => this.viewport.handleTouchMove(e), { passive: false });
        this.svgWrapper.addEventListener('touchend', (e) => this.viewport.handleTouchEnd(e));

        this.svgWrapper.addEventListener('mousemove', (e) => {
            this.viewport.handleMouseMove(e);

            // Check if boundary tooltip should be hidden
            if (this.boundaryTooltipActive) {
                const target = e.target;
                // Only keep tooltip visible if hovering specifically the boundary overlay (not other elements)
                const isBoundaryOverlay = target.classList.contains('boundary-overlay');

                if (!isBoundaryOverlay) {
                    // Mouse moved away from boundary overlay, hide tooltip and remove highlight
                    const boundaryPaths = this.svgWrapper.querySelectorAll('.svg-boundary-outline');
                    boundaryPaths.forEach(path => path.classList.remove('boundary-highlight'));
                    this.uiComponents.hideTooltip();
                    this.boundaryTooltipActive = false;
                }
            }
        });
        this.svgWrapper.addEventListener('mouseup', (e) => this.viewport.handleMouseUp(e));
    }

    addBoundaryOutlineEvents(boundaryPath) {
        // Add special event handlers for boundary outline
        boundaryPath.addEventListener('mouseenter', (e) => {
            this.uiComponents.showBoundaryTooltip(boundaryPath, e.clientX, e.clientY);
        });

        boundaryPath.addEventListener('mousemove', (e) => {
            this.viewport.updateMousePosition(e.clientX, e.clientY);
            this.uiComponents.setMousePosition(e.clientX, e.clientY);
            this.uiComponents.updateTooltipPosition(e.clientX, e.clientY);
        });

        boundaryPath.addEventListener('mouseleave', (e) => {
            this.uiComponents.hideTooltip();
        });

        // No click events for boundary outline - it's just informational
    }

    addBoundaryOutlineWithOverlay(boundaryPath) {
        // Get the boundary dimensions from the path
        const pathData = boundaryPath.getAttribute('d');
        const match = pathData.match(/M\s*([0-9.-]+)\s+([0-9.-]+)\s+L\s*([0-9.-]+)\s+([0-9.-]+)\s+L\s*([0-9.-]+)\s+([0-9.-]+)\s+L\s*([0-9.-]+)\s+([0-9.-]+)/);

        if (!match) {
            console.error('Could not parse boundary path data:', pathData);
            return;
        }

        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const width = parseFloat(match[3]) - x;
        const height = parseFloat(match[6]) - y;

        // Create precise hit area using a "donut" shape - 5px outside boundary only
        const strokeWidth = 5; // 5px outside the boundary
        const outerPath = `M ${x - strokeWidth} ${y - strokeWidth} L ${x + width + strokeWidth} ${y - strokeWidth} L ${x + width + strokeWidth} ${y + height + strokeWidth} L ${x - strokeWidth} ${y + height + strokeWidth} Z`;
        const innerPath = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`; // Exact boundary path
        const donutPath = `${outerPath} ${innerPath}`;

        const hitArea = this.svgHelper.createPath(donutPath, {
            fill: 'transparent',
            'fill-rule': 'evenodd',
            cursor: 'pointer',
            class: `boundary-overlay ${ShaperConstants.CSS_CLASSES.NO_EXPORT}`
        });

        // WICHTIG: Kein künstliches Vergrößern des viewBox mehr – das führte zu Differenz boundaryPx (original) vs viewBoxWidth (erweitert)
        // Stattdessen akzeptieren wir, dass der äußere Teil des Donut außerhalb des viewBox abgeschnitten wird.
        // Falls vollständige Klickfläche bis ganz außen nötig wäre, könnten wir stattdessen eine separate transparente Ebene außerhalb des SVG benutzen.
        const svgElement = boundaryPath.parentNode;

        // Insert the hit area as the LAST child of the SVG
        svgElement.appendChild(hitArea);

        // Add event handlers to hit area only (the donut shape)
        hitArea.addEventListener('mouseenter', (e) => {
            // Add highlight class to the original boundary path
            boundaryPath.classList.add('boundary-highlight');
            this.uiComponents.showBoundaryTooltip(boundaryPath, e.clientX, e.clientY);
            this.boundaryTooltipActive = true;
        });

        // Allow mousedown events to bubble up for panning functionality
        hitArea.addEventListener('mousedown', (e) => {
            // Don't stop propagation - let it bubble up to svgWrapper for panning
        });

        hitArea.addEventListener('mousemove', (e) => {
            this.viewport.updateMousePosition(e.clientX, e.clientY);
            this.uiComponents.setMousePosition(e.clientX, e.clientY);
            this.uiComponents.updateTooltipPosition(e.clientX, e.clientY);
        });

        hitArea.addEventListener('mouseleave', (e) => {
            // Remove highlight class from the original boundary path
            boundaryPath.classList.remove('boundary-highlight');
            this.uiComponents.hideTooltip();
            this.boundaryTooltipActive = false;
        });

        // No click events for boundary outline - it's just informational
    }

    showEditor() {
        this.uploadSection.style.display = 'none';
        this.editorSection.style.display = 'block';
        this.updateUnitDisplay();
    }

    updateFileNameDisplay() {
        if (this.currentFileNameDisplay) {
            const textSpan = this.currentFileNameDisplay.querySelector('.filename-text');
            if (this.currentFileName) {
                if (textSpan) {
                    textSpan.textContent = this.currentFileName;
                } else {
                    // fallback legacy
                    this.currentFileNameDisplay.textContent = this.currentFileName;
                }
                this.currentFileNameDisplay.style.display = 'inline-flex';
            } else {
                this.currentFileNameDisplay.style.display = 'none';
            }
        }
    }

    newFile() {
        // Clear current state
        this.fileManager.clearSVG();
        this.svgContent.innerHTML = '';
        this.elementManager.selectPath(null);
        this.fileInput.value = '';
        this.currentFileName = null;
        this.updateFileNameDisplay();
        this.uiComponents.closeModal();

        // Directly trigger file selection dialog without showing upload page
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    // Gutter management
    toggleGutter() {
        if (this.gutterToggle.checked) {
            // Use setProperty with important to override any other CSS
            this.gutterOverlay.style.setProperty('display', 'block', 'important');
            this.updateGutterSize();
        } else {
            this.gutterOverlay.style.setProperty('display', 'none', 'important');
        }
        // Save data to localStorage
        this.saveToLocalStorage();
    }

    handleGutterInput() {
        this.normalizeInput(this.gutterSize);

        // Initialize or update raw value based on current input
        const currentValue = this.gutterSize.value;
        if (currentValue && !isNaN(parseFloat(currentValue))) {
            this.initializeRawValue(this.gutterSize, currentValue, this.measurementSystem.units);
        }

        this.updateGutterSize();
        // Save data to localStorage
        this.saveToLocalStorage();
    }

    // Normalize decimal separator in input field on blur
    normalizeInput(input) {
        const inputValue = input.value.trim();

        if (inputValue === '') {
            return;
        }

        // FIRST: Always update the raw value from the current display value
        // This ensures we capture what the user actually typed
        this.updateRawValueFromDisplay(input, this.measurementSystem.units);

        // THEN: Get the raw value and use it for formatting
        const rawValueMm = this.getRawValue(input);

        if (!isNaN(rawValueMm)) {
            // Convert raw mm value to current units for display
            const convertedValue = this.measurementSystem.convertBetweenUnits(rawValueMm, 'mm', this.measurementSystem.units);
            const formattedValue = this.measurementSystem.formatDisplayNumber(convertedValue);

            input.value = formattedValue;
        }
    }

    updateGutterSize() {
        if (!this.gutterToggle.checked) return;
        if (!this.gutterSize || !this.gutterOverlay) return;

        // 1. Rohwert in mm (Single Source of Truth)
        let gutterRawMm = this.getRawValue(this.gutterSize);
        if (isNaN(gutterRawMm) || gutterRawMm <= 0) {
            const parsed = this.measurementSystem.parseValueWithUnits(this.gutterSize.value);
            if (!isNaN(parsed) && parsed > 0) {
                // parsed ist in aktuellen Anzeige-Einheiten -> nach mm
                gutterRawMm = this.measurementSystem.convertBetweenUnits(parsed, this.measurementSystem.units, 'mm');
            } else {
                gutterRawMm = 10; // Default
            }
            this.setRawValue(this.gutterSize, gutterRawMm);
        }

        // 2. Umrechnung mm -> px (96dpi fest)  (1mm = 96/25.4 px)
        const baseCellPx = this.measurementSystem.convertBetweenUnits(gutterRawMm, 'mm', 'px');
        if (!(baseCellPx > 0)) {
            this._updateGridDebugOverlay({ error: 'baseCellPx <= 0', gutterRawMm });
            return;
        }
        this.gutterOverlay.dataset.baseCell = baseCellPx.toString();

        // 3. Boundary messen (Mess-Clone; 1uu = 1px)
        const displayedSVG = this.svgContent.querySelector('svg');
        let boundaryPx = null;
        let measurementMethod = null;
        if (displayedSVG) {
            const m = this.measurementSystem.measureSVGBoundaryWithClone(displayedSVG, this.fileManager);
            if (m && m.width) {
                boundaryPx = m.width;
                measurementMethod = m.method;
            }
        }

        // 4. Erwartete und tatsächliche Zellanzahl (reine Boundary-Messung maßgeblich)
        let expectedCells = null;
        let actualCells = null;
        let totalLogicalMm = null; // aus boundaryPx
        if (boundaryPx) {
            totalLogicalMm = this.measurementSystem.convertBetweenUnits(boundaryPx, 'px', 'mm');
            expectedCells = totalLogicalMm / gutterRawMm;
            actualCells = boundaryPx / baseCellPx; // mathematisch gleich, Debug Check
        }

        // 6. Grid sofort erneuern
        if (this.viewport && typeof this.viewport.updateInfiniteGrid === 'function') {
            this.viewport.updateInfiniteGrid();
        }
        // Ursprung/Marker NICHT mehr extern überschreiben – Marker wird ausschließlich im Viewport.updateInfiniteGrid() positioniert.

        // ...existing code...
    }


    getBoundaryOffset() {
        // Get the actual SVG element and its viewBox/dimensions (not the boundary path donut)
        const svgElement = this.svgHelper.getSVGRoot(null, 'svgWrapper');
        if (!svgElement) {
            console.log('No SVG element found');
            return null;
        }

        // Try to get viewBox first, then fall back to width/height attributes
        let boundaryX = 0, boundaryY = 0, boundaryWidth = 0, boundaryHeight = 0;

        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            const vbParts = viewBox.split(/\s+/);
            boundaryX = parseFloat(vbParts[0]) || 0;
            boundaryY = parseFloat(vbParts[1]) || 0;
            boundaryWidth = parseFloat(vbParts[2]) || 0;
            boundaryHeight = parseFloat(vbParts[3]) || 0;
        } else {
            // Fallback to width/height attributes
            boundaryWidth = parseFloat(svgElement.getAttribute('width')) || 0;
            boundaryHeight = parseFloat(svgElement.getAttribute('height')) || 0;
        }

        // Get the SVG position within the viewport
        const svgRect = svgElement.getBoundingClientRect();
        const wrapperRect = this.svgWrapper.getBoundingClientRect();

        // Calculate the offset of the SVG within the wrapper (accounting for centering)
        const svgOffsetX = svgRect.left - wrapperRect.left;
        const svgOffsetY = svgRect.top - wrapperRect.top;

        // The boundary position in the viewport coordinate system
        const pixelsX = svgOffsetX + boundaryX;
        const pixelsY = svgOffsetY + boundaryY;

        return { x: pixelsX, y: pixelsY };
    }

    // addGutterIntersectionMarkers() entfernt – Marker wird nur noch vom Viewport gesteuert.

    updateUnitDisplay() {
        // Update unit labels throughout the interface
        if (this.gutterUnitLabel) {
            this.gutterUnitLabel.textContent = this.measurementSystem.units;
        }

        if (this.gutterSize) {
            this.gutterSize.placeholder = `10`;
            // Initialize raw value storage with default 10mm if not already set
            if (!this.gutterSize.dataset.rawValueMm) {
                this.setRawValue(this.gutterSize, 10);
            }
        }

        // Update the units toggle to reflect current state (unless loading from localStorage)
        if (this.unitsToggle && !this.isLoadingFromLocalStorage) {
            this.unitsToggle.checked = (this.measurementSystem.units === 'in');
        }

        // Update decimal separator toggle (unless loading from localStorage)
        if (this.decimalToggle && !this.isLoadingFromLocalStorage) {
            this.decimalToggle.checked = (this.measurementSystem.decimalSeparator === ',');
        }

        this.uiComponents.updateDialogUnits();

        // Only update gutter size if not during a unit conversion
        if (!this.isConverting) {
            this.updateGutterSize();
        }
    }

    // Unit system management
    toggleUnits() {
        const oldUnits = this.measurementSystem.units;
        const newUnits = this.unitsToggle.checked ? 'in' : 'mm';

        // Set flag to prevent raw value corruption during conversion
        this.isConverting = true;

        this.measurementSystem.setUnits(newUnits);
        this.updateUnitDisplay();

        // Convert existing values
        this.convertGutterSize(oldUnits, newUnits);
        this.convertDialogValues(oldUnits, newUnits);
        this.attributeSystem.convertAttributeValues(oldUnits, newUnits);

        // Clear conversion flag
        this.isConverting = false;

        // Refresh tooltip to show converted values
        this.uiComponents.refreshTooltip();

        // Save data to localStorage
        this.saveToLocalStorage();
    }

    toggleDecimalSeparator() {
        this.measurementSystem.setDecimalSeparator(this.decimalToggle.checked ? ',' : '.');

        // Update gutter size input - restore from raw value instead of parsing display
        if (this.gutterSize) {
            const rawValueMm = this.getRawValue(this.gutterSize);
            if (!isNaN(rawValueMm)) {
                // Convert raw mm value to current units and reformat with new decimal separator
                const currentValue = this.measurementSystem.convertBetweenUnits(rawValueMm, 'mm', this.measurementSystem.units);
                this.gutterSize.value = this.measurementSystem.formatDisplayNumber(currentValue);
            }
        }

        // Update dialog inputs
        this.attributeSystem.refreshDialogValues();

        // Update dialog description
        if (this.uiComponents.modal && this.uiComponents.modal.style.display !== 'none') {
            const currentPath = this.elementManager.getSelectedPath();
            if (currentPath) {
                this.uiComponents.selectedPathInfo.textContent = this.elementManager.getElementDescription(currentPath);
            }
        }

        // Refresh tooltip
        this.uiComponents.refreshTooltip();

        // Save data to localStorage
        this.saveToLocalStorage();
    }

    convertGutterSize(fromUnit, toUnit) {
        if (fromUnit === toUnit || !this.gutterSize) return;

        this.convertInputWithRawValue(this.gutterSize, 'gutter', fromUnit, toUnit);
    }

    convertDialogValues(fromUnit, toUnit) {
        if (fromUnit === toUnit) return;

        const measurementInputs = ['cutDepth', 'cutOffset', 'toolDia'];
        measurementInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && input.value) {
                this.convertInputWithRawValue(input, inputId, fromUnit, toUnit);
            }
        });
    }

    // Utility methods for raw value storage
    getRawValue(input) {
        return parseFloat(input.dataset.rawValueMm);
    }

    setRawValue(input, valueInMm) {
        input.dataset.rawValueMm = valueInMm.toString();
    }

    initializeRawValue(input, displayValue, currentUnit) {
        if (!input.dataset.rawValueMm) {
            const parsedValue = this.measurementSystem.parseValueWithUnits(displayValue);
            if (parsedValue !== null && parsedValue > 0) {
                const rawValueMm = this.measurementSystem.convertBetweenUnits(parsedValue, currentUnit, 'mm');
                this.setRawValue(input, rawValueMm);
                return rawValueMm;
            }
        }
        return this.getRawValue(input);
    }

    updateRawValueFromDisplay(input, currentUnit) {
        // Only update raw value if this is a user input change, not a programmatic conversion
        if (this.isConverting) {
            return this.getRawValue(input);
        }

        const inputValue = input.value.trim();

        // Normalize decimal separators - simplified logic
        let normalizedInput = inputValue;
        if (inputValue.includes(',') && !inputValue.includes('.')) {
            normalizedInput = inputValue.replace(',', '.');
        } else if (inputValue.includes('.') && inputValue.includes(',')) {
            // Handle mixed separators - use last one as decimal point
            const lastCommaIndex = inputValue.lastIndexOf(',');
            const lastDotIndex = inputValue.lastIndexOf('.');

            if (lastCommaIndex > lastDotIndex) {
                normalizedInput = inputValue.replace(/\./g, '').replace(',', '.');
            } else {
                normalizedInput = inputValue.replace(/,/g, '');
            }
        }

        const match = normalizedInput.match(/^([+-]?\d*\.?\d+)\s*([a-zA-Z]*)$/);
        if (match) {
            const [, numStr, unit] = match;
            const numValue = parseFloat(numStr);

            if (!isNaN(numValue) && numValue > 0) {
                let rawValueMm;

                if (unit === 'mm') {
                    // User specified mm, use directly
                    rawValueMm = numValue;
                } else if (unit === 'in') {
                    // User specified inches, convert to mm
                    rawValueMm = this.measurementSystem.convertBetweenUnits(numValue, 'in', 'mm');
                } else {
                    // No unit specified, assume current unit system
                    rawValueMm = this.measurementSystem.convertBetweenUnits(numValue, currentUnit, 'mm');
                }

                this.setRawValue(input, rawValueMm);
                return rawValueMm;
            }
        }

        return this.getRawValue(input);
    }

    convertInputWithRawValue(input, inputId, fromUnit, toUnit) {
        let rawValueMm = this.getRawValue(input);

        if (isNaN(rawValueMm)) {
            // Initialize raw value from current display
            rawValueMm = this.initializeRawValue(input, input.value, fromUnit);
            if (isNaN(rawValueMm)) {
                return; // Skip if we can't get a valid value
            }
        }

        // Convert from raw mm value to target unit
        const convertedValue = this.measurementSystem.convertBetweenUnits(rawValueMm, 'mm', toUnit);
        const formattedValue = this.measurementSystem.formatDisplayNumber(convertedValue);

        input.value = formattedValue;
    }

    // Get boundary debug information for localStorage debugging
    getBoundaryDebugInfo() {
        try {
            const svgElement = this.svgContent.querySelector('svg');
            if (!svgElement) {
                return { error: 'No SVG element found' };
            }

            // Get boundary using measuring clone with fileManager for clean original
            const boundingBox = this.measurementSystem.measureSVGBoundaryWithClone(svgElement, this.fileManager);

            // Convert to both mm and inches for debugging
            const widthMm = this.measurementSystem.convertBetweenUnits(boundingBox.width, 'px', 'mm');
            const heightMm = this.measurementSystem.convertBetweenUnits(boundingBox.height, 'px', 'mm');
            const widthIn = this.measurementSystem.convertBetweenUnits(boundingBox.width, 'px', 'in');
            const heightIn = this.measurementSystem.convertBetweenUnits(boundingBox.height, 'px', 'in');

            // Get SVG attributes for comparison
            const viewBox = svgElement.getAttribute('viewBox');
            const svgWidth = svgElement.getAttribute('width');
            const svgHeight = svgElement.getAttribute('height');

            return {
                measuringClone: {
                    pixelWidth: boundingBox.width,
                    pixelHeight: boundingBox.height,
                    widthMm: widthMm,
                    heightMm: heightMm,
                    widthIn: widthIn,
                    heightIn: heightIn
                },
                svgAttributes: {
                    viewBox: viewBox,
                    width: svgWidth,
                    height: svgHeight
                },
                detectedUnits: this.measurementSystem.detectedUnits,
                currentUnits: this.measurementSystem.units,
                dpi: this.measurementSystem.dpi,
                // ADD: Debug comparison from measureSVGBoundaryWithClone
                debugComparison: boundingBox.debugComparison || null,
                measurementMethod: boundingBox.method || 'unknown',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { error: error.message, timestamp: new Date().toISOString() };
        }
    }

    // Copy SVG to clipboard
    async copyToClipboard() {
        try {
            // Use the same logic as exportSVG() to ensure consistent results
            const currentSVGData = this.fileManager.getSVGData();
            if (!currentSVGData) {
                throw new Error('No SVG file loaded to copy');
            }

            // Create a clone of the master model to prepare for export
            const exportNode = this.fileManager.masterSVGElement.cloneNode(true);

            // Clean all elements in the cloned node for export (same as exportSVG)
            exportNode.querySelectorAll('[data-app-id]').forEach(el => {
                // Set namespaced attributes from raw values
                this.fileManager.updateShaperAttributesForExport(el);
                // Remove all raw attributes
                ShaperUtils.removeAllRawAttributes(el);
                // Remove the internal app-id for the final export
                el.removeAttribute('data-app-id');
            });

            // Create SVG string
            const svgString = new XMLSerializer().serializeToString(exportNode);

            // Try to use the modern Clipboard API
            if (navigator.clipboard && window.ClipboardItem) {
                // Create a blob with SVG content
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
                const textBlob = new Blob([svgString], { type: 'text/plain' });

                const clipboardItem = new ClipboardItem({
                    'image/svg+xml': svgBlob,
                    'text/plain': textBlob
                });

                await navigator.clipboard.write([clipboardItem]);
                this.showNotification('SVG copied to clipboard!', 'success');
            } else {
                // Fallback for older browsers - copy as text
                await navigator.clipboard.writeText(svgString);
                this.showNotification('SVG code copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showNotification('Failed to copy to clipboard. Please use the export button instead.', 'error');
        }
    }

    // Show notification (simple implementation)
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: opacity 0.3s ease;
        `;

        // Set color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.shaperEditor = new SVGShaperEditor();
    } catch (error) {
        console.error('Error initializing SVG Shaper Editor:', error);
    }
});