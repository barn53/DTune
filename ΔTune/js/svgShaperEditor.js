// Main SVG Shaper Editor Application
// Orchestrates all modules and handles application lifecycle

class SVGShaperEditor {
    constructor() {
        // Initialize all subsystems
        this.measurementSystem = new MeasurementSystem();
        this.fileManager = new FileManager(this.measurementSystem);
        this.elementManager = new ElementManager(this.measurementSystem);
        this.viewport = new Viewport();
        this.uiComponents = new UIComponents(this.measurementSystem, this.elementManager);
        this.attributeSystem = new AttributeSystem(this.measurementSystem, this.fileManager, this.elementManager);

        // Initialize SVG helper for SVG operations
        this.svgHelper = new SVGHelper();

        // UI elements
        this.initializeElements();

        // Bind events
        this.bindEvents();

        // Set up module connections
        this.setupModuleConnections();

        // Boundary tooltip tracking
        this.boundaryTooltipActive = false;

        // Flag to track if we're loading from localStorage
        this.isLoadingFromLocalStorage = false;
    }

    initializeElements() {

        // Main sections
        this.uploadSection = document.getElementById('uploadSection');
        this.editorSection = document.getElementById('editorSection');

        // Upload elements
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.uploadButton = document.getElementById('uploadBtn');
        this.floatingImportBtn = document.getElementById('floatingImportBtn');
        this.floatingExportBtn = document.getElementById('floatingExportBtn');

        // SVG display elements
        this.svgContainer = document.getElementById('svgContainer');
        this.svgWrapper = document.getElementById('svgWrapper');
        this.svgContent = document.getElementById('svgContent');
        this.gutterOverlay = document.getElementById('gutterOverlay');

        // Controls
        this.unitsToggle = document.getElementById('unitToggle');
        this.decimalToggle = document.getElementById('decimalToggle');
        this.gutterToggle = document.getElementById('gutterToggle');
        this.gutterSize = document.getElementById('gutterSize');
        this.gutterUnitLabel = document.getElementById('gutterUnitLabel');

        // Buttons
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.zoom100Btn = document.getElementById('zoom100');
        this.zoomFitBtn = document.getElementById('zoomFit');
        this.centerViewBtn = document.getElementById('centerView');

        // Filename display
        this.currentFileNameDisplay = document.getElementById('currentFileName');

        // Initialize UI components
        this.uiComponents.initializeElements();
    }

    setupModuleConnections() {
        // Connect file manager to display system
        this.fileManager.setLoadCallback((svgElement, svgData, fileName) => {
            this.currentFileName = fileName;
            this.updateFileNameDisplay();
            this.showEditor();
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
            lastOpenedFile: this.fileManager.svgData ? {
                svgData: this.fileManager.svgData,
                fileName: this.currentFileName || 'untitled.svg'
            } : null
        };

        localStorage.setItem('shaperEditorSettings', JSON.stringify(settings));
    }

    loadFromLocalStorage() {
        console.log('loadFromLocalStorage called'); // Debug log
        try {
            const savedSettings = localStorage.getItem('shaperEditorSettings');
            console.log('Raw localStorage data:', savedSettings); // Debug log
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                console.log('Parsed settings:', settings); // Debug log

                // Apply gutter toggle
                if (typeof settings.gutterEnabled === 'boolean') {
                    this.gutterToggle.checked = settings.gutterEnabled;
                    this.gutterOverlay.style.display = settings.gutterEnabled ? 'block' : 'none';
                }

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
                    this.gutterSize.value = this.measurementSystem.formatGridNumber(displayValue);
                }

                // Update gutter display with loaded values
                this.updateGutterSize();

                // Restore last opened file if available
                if (settings.lastOpenedFile && settings.lastOpenedFile.svgData) {
                    try {
                        // Set flag to indicate we're loading from localStorage
                        this.isLoadingFromLocalStorage = true;

                        this.currentFileName = settings.lastOpenedFile.fileName || 'untitled.svg';
                        this.updateFileNameDisplay();
                        this.fileManager.parseSVG(settings.lastOpenedFile.svgData, this.currentFileName);

                        // Restore viewport state after the file is loaded
                        // Use setTimeout to ensure this happens after the load callback
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
            this.viewport.zoom = Math.max(0.1, Math.min(settings.zoom, 10)); // Clamp to valid range
        }
        if (typeof settings.panX === 'number' && !isNaN(settings.panX)) {
            this.viewport.panX = settings.panX;
        }
        if (typeof settings.panY === 'number' && !isNaN(settings.panY)) {
            this.viewport.panY = settings.panY;
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
    }

    displaySVG(svgElement) {
        // Clear previous content
        this.svgContent.innerHTML = '';

        // Clone and append the SVG element
        const svgClone = this.svgHelper.cloneSVGElement(svgElement, this.svgContent);

        // Add boundary outline to show SVG boundaries
        this.addBoundaryOutline(svgClone);

        // Set up viewport
        this.viewport.setSVGElements(this.svgWrapper, svgClone);
        this.viewport.resetViewport();

        // Add overlays and click handlers
        this.addOverlaysToDisplayedSVG(svgClone);

        // Auto-fit the SVG after a short delay
        setTimeout(() => {
            this.viewport.zoomToFit();
        }, 100);

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

            // Test if element can receive events
            overlay.addEventListener('mouseover', () => {
                console.log('MOUSEOVER detected on overlay!');
            });            // Add event handlers to overlay
            overlay.addEventListener('click', (e) => {
                console.log('Overlay clicked!', overlay);
                e.stopPropagation();
                this.uiComponents.openAttributeModal(path);
            });

            // Allow mousedown events to bubble up for panning functionality
            overlay.addEventListener('mousedown', (e) => {
                // Don't stop propagation - let it bubble up to svgWrapper for panning
                // Only handle this if it's not a drag operation
            });

            overlay.addEventListener('mouseenter', (e) => {
                console.log('Overlay mouse enter!', overlay);
                path.classList.add(ShaperConstants.CSS_CLASSES.HOVER);
                this.elementManager.setHoveredPath(path);
                this.uiComponents.showTooltip(path, e.clientX, e.clientY);
            }); overlay.addEventListener('mousemove', (e) => {
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

        // Temporarily expand the SVG viewBox to accommodate the stroke extending outside
        const svgElement = boundaryPath.parentNode;
        const currentViewBox = svgElement.getAttribute('viewBox');
        if (currentViewBox) {
            const [vx, vy, vw, vh] = currentViewBox.split(' ').map(Number);
            const strokeOffset = 10; // Half the stroke width
            svgElement.setAttribute('viewBox', `${vx - strokeOffset} ${vy - strokeOffset} ${vw + strokeOffset * 2} ${vh + strokeOffset * 2}`);
        }

        console.log('Created precise donut hit area');

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
            const formattedValue = this.measurementSystem.formatGridNumber(convertedValue);

            input.value = formattedValue;
        }
    }

    updateGutterSize() {
        if (this.gutterToggle.checked) {
            let gutterValue;

            // First try to use the raw value if available (stored in mm)
            const rawValueMm = this.getRawValue(this.gutterSize);

            if (!isNaN(rawValueMm)) {
                // Convert from raw mm to current units
                gutterValue = this.measurementSystem.convertBetweenUnits(rawValueMm, 'mm', this.measurementSystem.units);
            } else {
                // Fallback: parse display value and initialize raw value
                const rawDisplayValue = this.gutterSize.value;
                gutterValue = this.measurementSystem.parseValueWithUnits(rawDisplayValue) || 10;

                // Initialize raw value from display for future use
                if (!isNaN(gutterValue) && gutterValue > 0) {
                    this.updateRawValueFromDisplay(this.gutterSize, this.measurementSystem.units);
                }
            }

            // Convert to pixels based on unit system
            const unitsToPixels = this.measurementSystem.unitsToPixels(gutterValue);
            const gutterPixels = unitsToPixels;

            // Get boundary position to align gutter
            const boundaryOffset = this.getBoundaryOffset();

            // Only update if we have a reasonable pixel value
            if (gutterPixels > 0.1) {
                this.gutterOverlay.style.backgroundSize = `${gutterPixels}px ${gutterPixels}px`;
                this.gutterOverlay.style.backgroundPosition = `0px 0px`;

                // Add intersection markers
                this.addGutterIntersectionMarkers(gutterPixels, boundaryOffset);
            }
        }
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
    } addGutterIntersectionMarkers(gutterPixels, boundaryOffset) {
        // Remove existing markers
        const existingMarkers = this.gutterOverlay.querySelectorAll('.gutter-intersection');
        existingMarkers.forEach(marker => marker.remove());

        // Position marker at (0,0) - simplified from complex calculations
        const boundaryX = 0;
        const boundaryY = 0;
        const markerSize = 6;

        // Create and position marker
        const marker = document.createElement('div');
        marker.className = 'gutter-intersection';
        Object.assign(marker.style, {
            position: 'absolute',
            left: `${boundaryX}px`,
            top: `${boundaryY}px`,
            width: `${markerSize}px`,
            height: `${markerSize}px`,
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            border: '2px solid blue',
            pointerEvents: 'none',
            zIndex: '10'
        });

        this.gutterOverlay.appendChild(marker);
    }

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
                this.gutterSize.value = this.measurementSystem.formatGridNumber(currentValue);
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
        const formattedValue = this.measurementSystem.formatGridNumber(convertedValue);

        input.value = formattedValue;
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