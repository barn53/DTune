/**
 * File Manager Module - SVG File Operations and Processing
 *
 * Handles comprehensive SVG file lifecycle including loading, parsing,
 * validation, and export preparation. Manages the "master model" concept
 * where a source-of-truth SVG maintains element IDs while the display
 * version handles interactive overlays and transformations.
 *
 * Key Features:
 * - Drag-and-drop and file input SVG loading
 * - Master model management with unique element IDs
 * - SVG parsing with measurement unit detection
 * - Export preparation with attribute cleanup
 * - Error handling for malformed SVG files
 * - Integration with measurement system for unit conversion
 */
class FileManager {
    /**
     * Initialize file manager with measurement system integration
     *
     * @param {MeasurementSystem} measurementSystem - Unit conversion and formatting
     */
    constructor(measurementSystem) {
        this.measurementSystem = measurementSystem;
        this.svg = null; // Master SVG string representation
        this.svgElement = null; // Legacy display element reference
        this.masterSVGElement = null; // Source of truth DOM element with app IDs
        this.onSVGLoaded = null; // Callback for successful SVG loading
        this.elementManager = null; // Set by main application during initialization

        // Initialize SVG processing utilities
        this.svgHelper = new SVGHelper();
    }

    /**
     * Set callback function for SVG loading completion events
     * @param {Function} callback - Function to call when SVG loading completes
     */
    setLoadCallback(callback) {
        this.onSVGLoaded = callback;
    }

    /**
     * Connect element manager for coordinated element operations
     * @param {ElementManager} elementManager - Element state and selection manager
     */
    setElementManager(elementManager) {
        this.elementManager = elementManager;
    }

    /**
     * Add unique application IDs to SVG graphical elements (private method)
     *
     * Assigns unique identifiers to all interactive SVG elements for tracking
     * selection, attributes, and measurements. Uses data attributes to avoid
     * conflicts with existing SVG IDs.
     *
     * @param {Element} svgElement - SVG root element to process
     * @returns {Element} SVG element with app IDs added to child elements
     * @private
     */
    _addAppIds(svgElement) {
        // Target specific graphical elements, excluding structural groups
        const relevantElements = svgElement.querySelectorAll(ShaperConstants.ELEMENT_SELECTORS);
        relevantElements.forEach(el => {
            // Only add ID if not already present
            if (!el.dataset.appId) {
                el.dataset.appId = Math.random().toString(36).slice(2, 11);
            }
        });
        return svgElement;
    }

    /**
     * Handle file input selection events
     *
     * Processes file selection from input elements and initiates SVG loading.
     *
     * @param {Event} event - File input change event
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.loadSVGFile(file);
        }
    }

    /**
     * Handle drag-over events for file drop zones
     *
     * Prevents default behavior and adds visual feedback for valid drop targets.
     *
     * @param {DragEvent} event - Drag over event
     */
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    /**
     * Handle drag-leave events for file drop zones
     *
     * Removes visual feedback when dragged file leaves drop zone.
     *
     * @param {DragEvent} event - Drag leave event
     */
    handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }

    /**
     * Handle file drop events for drag-and-drop SVG loading
     *
     * Processes dropped files and initiates SVG loading for valid files.
     *
     * @param {DragEvent} event - Drop event containing file data
     */
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.loadSVGFile(files[0]);
        }
    }

    /**
     * Load and process SVG file with validation and error handling
     *
     * Validates file type, reads file content, and initiates SVG parsing
     * with comprehensive error handling for user feedback.
     *
     * @param {File} file - File object from input or drop event
     */
    loadSVGFile(file) {
        if (!file.name.toLowerCase().endsWith('.svg')) {
            alert('Please select a valid SVG file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseSVG(e.target.result, file.name);
            } catch (error) {
                console.error('Error parsing SVG:', error);
                alert('Error loading SVG file. Please check if the file is valid.');
            }
        };
        reader.readAsText(file);
    }

    // Parse SVG content and establish the master data model
    parseSVG(svgString, fileName = 'untitled.svg') {
        // Parse the SVG string and create DOM element
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');

        // Check for parsing errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Invalid SVG file');
        }

        // 1. Get the root SVG element
        const rootElement = this.svgHelper.getSVGRoot(doc.documentElement);

        // 2. Add our internal application IDs to all graphical elements
        this._addAppIds(rootElement);

        // 3. This element with app IDs is now our master data model
        this.masterSVGElement = rootElement;
        this.svgElement = this.masterSVGElement; // For legacy compatibility for now
        this.fileName = fileName;

        // Note: Shaper attributes will be processed by measurementSystem.analyzeSVG()

        // 4. Serialize the master model to a string for storage and export
        this.svg = new XMLSerializer().serializeToString(this.masterSVGElement);

        // Detect measurement units from the SVG
        this.measurementSystem.detectUnits(this.masterSVGElement);

        // Notify that SVG is loaded, passing the master model
        if (this.onSVGLoaded) {
            this.onSVGLoaded(this.masterSVGElement, this.svg, this.fileName);
        }
    }

    // Get current SVG data (from master model)
    getSVGData() {
        // Always serialize the master model to ensure it's up-to-date
        if (this.masterSVGElement) {
            this.svg = new XMLSerializer().serializeToString(this.masterSVGElement);
        }
        return this.svg;
    }

    getSVGElement() {
        return this.masterSVGElement;
    }

    // Update SVG data after modifications - THIS LOGIC WILL CHANGE
    // For now, it just re-serializes the master model.
    updateSVGData() {
        if (this.masterSVGElement) {
            // The "update" now happens on the master model directly.
            // We just need to re-serialize it for saving.
            this.svg = new XMLSerializer().serializeToString(this.masterSVGElement);
        }
    }

    // Prepare a single element for export
    prepareElementForExport(element) {
        // Remove temporary classes
        ShaperUtils.removeTempClasses(element);

        // Set namespaced attributes from elementData for export
        this.updateShaperAttributesForExport(element);

        // Remove any legacy raw value attributes (no longer used)
        ShaperUtils.removeAllRawAttributes(element);
    }

    // Update shaper:* attributes from elementData for export
    updateShaperAttributesForExport(element) {
        // Skip if no elementManager is available
        if (!this.elementManager) {
            return;
        }

        // Ensure shaper namespace is declared
        const svgRoot = this.svgHelper.getSVGRoot(element);
        this.svgHelper.ensureShaperNamespace(svgRoot);

        // Get shaper attributes from elementData
        const dimensions = this.elementManager.getElementDimensions(element);
        const shaperAttrs = dimensions.shaperAttributes || {};

        // Handle measurement attributes
        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const attrName = `shaper:${attr}`;
            const pixelValue = shaperAttrs[attrName];

            if (pixelValue && pixelValue.trim() !== '') {
                const numPixels = parseFloat(pixelValue);
                if (!isNaN(numPixels)) {
                    // Convert pixel value to current unit system for export
                    const unitValue = this.measurementSystem.convertPixelsToCurrentUnit(numPixels);
                    const formattedValue = this.measurementSystem.formatDisplayNumber(unitValue);
                    const valueWithUnit = `${formattedValue}${this.measurementSystem.units}`;

                    ShaperUtils.setNamespacedAttribute(element, attr, valueWithUnit);
                }
            } else {
                element.removeAttributeNS(ShaperConstants.NAMESPACE, attr);
            }
        });

        // Handle cutType attribute
        const cutType = shaperAttrs['shaper:cutType'];
        if (cutType && cutType.trim() !== '') {
            ShaperUtils.setNamespacedAttribute(element, 'cutType', cutType);
        } else {
            element.removeAttributeNS(ShaperConstants.NAMESPACE, 'cutType');
        }
    }

    // Export SVG with current modifications
    exportSVG() {
        // The master model is always the source of truth, so we get its latest state.
        const currentSVGData = this.getSVGData();
        if (!currentSVGData) {
            alert('No SVG file loaded to export.');
            return;
        }

        // Create a clone of the master model to prepare for export without affecting the live model
        const exportNode = this.masterSVGElement.cloneNode(true);

        // Clean all elements in the cloned node for export
        exportNode.querySelectorAll('[data-app-id]').forEach(el => {
            // Set namespaced attributes from raw values
            this.updateShaperAttributesForExport(el);
            // Remove all raw attributes
            ShaperUtils.removeAllRawAttributes(el);
            // IMPORTANT: Remove the internal app-id for the final export
            el.removeAttribute('data-app-id');
        });

        const finalSVGString = new XMLSerializer().serializeToString(exportNode);

        // Create blob and download
        const blob = new Blob([finalSVGString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName || 'shaper-file.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    // Clear loaded SVG
    clearSVG() {
        this.svg = null;
        this.svgElement = null;
        this.masterSVGElement = null;
    }

    // Check if SVG is loaded
    hasLoadedSVG() {
        return this.masterSVGElement !== null;
    }

    // Get a clean SVG clone for measurement purposes
    // This always returns the original SVG without UI elements
    getCleanSVGClone() {
        if (!this.svg) {
            return null;
        }

        // Parse from the original SVG string (not the modified DOM)
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.svg, 'image/svg+xml');
        const cleanSvg = doc.documentElement;

        // Remove any UI elements that might have been added
        const uiElements = cleanSvg.querySelectorAll('.no-export, .svg-boundary-outline, .boundary-overlay, .path-overlay');
        uiElements.forEach(el => el.remove());

        return cleanSvg;
    }
}

// Export for use in other modules
window.FileManager = FileManager;