// File Manager Module
// Handles SVG file loading, parsing, and export functionality

class FileManager {
    constructor(measurementSystem) {
        this.measurementSystem = measurementSystem;
        this.svg = null; // This will hold the string representation of the master model
        this.svgElement = null; // Legacy, will be phased out or repurposed
        this.masterSVGElement = null; // The "source of truth" DOM element with app IDs
        this.onSVGLoaded = null; // Callback for when SVG is loaded
        this.elementManager = null; // Will be set by main application

        // Initialize SVG helper for clean operations
        this.svgHelper = new SVGHelper();
    }

    // Set callback for SVG loading events
    setLoadCallback(callback) {
        this.onSVGLoaded = callback;
    }

    // Set element manager reference (called after initialization)
    setElementManager(elementManager) {
        this.elementManager = elementManager;
    }

    // --- Private method to add unique IDs to graphical elements ---
    _addAppIds(svgElement) {
        // Use a more specific selector to avoid adding IDs to group elements if not desired
        const relevantElements = svgElement.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline');
        relevantElements.forEach(el => {
            // Use a custom data-attribute to avoid conflicts with existing IDs
            if (!el.dataset.appId) {
                el.dataset.appId = `app-id-${Math.random().toString(36).slice(2, 11)}`;
            }
        });
        return svgElement;
    }

    // File selection handling
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.loadSVGFile(file);
        }
    }

    // Drag and drop handlers
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.loadSVGFile(files[0]);
        }
    }

    // Load SVG file
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