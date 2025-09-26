// File Manager Module
// Handles SVG file loading, parsing, and export functionality

class FileManager {
    constructor(measurementSystem) {
        this.measurementSystem = measurementSystem;
        this.svgData = null; // This will hold the string representation of the master model
        this.svgElement = null; // Legacy, will be phased out or repurposed
        this.masterSVGElement = null; // The "source of truth" DOM element with app IDs
        this.onSVGLoaded = null; // Callback for when SVG is loaded

        // Initialize SVG helper for clean operations
        this.svgHelper = new SVGHelper();
    }

    // Set callback for SVG loading events
    setLoadCallback(callback) {
        this.onSVGLoaded = callback;
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

        // Create raw mm values from existing shaper attributes on the master model
        this.createRawValuesFromShaperAttributes();

        // 4. Serialize the master model to a string for storage and export
        this.svgData = new XMLSerializer().serializeToString(this.masterSVGElement);

        // Detect measurement units from the SVG
        this.measurementSystem.detectUnits(this.masterSVGElement);

        // Notify that SVG is loaded, passing the master model
        if (this.onSVGLoaded) {
            this.onSVGLoaded(this.masterSVGElement, this.svgData, this.fileName);
        }
    }

    // Create internal raw values from shaper namespaced attributes
    createRawValuesFromShaperAttributes() {
        if (!this.masterSVGElement) return;

        // Find all elements with namespaced shaper attributes
        const allElements = this.masterSVGElement.querySelectorAll('*');

        allElements.forEach(element => {
            // Handle measurement attributes
            ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
                const namespacedValue = element.getAttributeNS(ShaperConstants.NAMESPACE, attr);

                if (namespacedValue && namespacedValue.trim() !== '') {
                    // Convert to raw mm value for internal precision
                    const rawMmValue = this.measurementSystem.parseValueWithUnits(namespacedValue, 'mm');
                    if (rawMmValue !== null) {
                        element.setAttribute(ShaperConstants.getRawAttributeName(attr), rawMmValue.toString());
                    }
                }
            });

            // Handle cutType attribute
            const cutTypeValue = element.getAttributeNS(ShaperConstants.NAMESPACE, 'cutType');
            if (cutTypeValue && cutTypeValue.trim() !== '') {
                element.setAttribute(ShaperConstants.getRawAttributeName('cutType'), cutTypeValue);
            }
        });
    }

    // Get current SVG data (from master model)
    getSVGData() {
        // Always serialize the master model to ensure it's up-to-date
        if (this.masterSVGElement) {
            this.svgData = new XMLSerializer().serializeToString(this.masterSVGElement);
        }
        return this.svgData;
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
            this.svgData = new XMLSerializer().serializeToString(this.masterSVGElement);
        }
    }

    // Prepare a single element for export
    prepareElementForExport(element) {
        // This function will likely be deprecated, as the master model is always ready for export.
        // For now, we keep the logic but it might not be called.
        // Remove temporary classes
        ShaperUtils.removeTempClasses(element);

        // Set namespaced attributes from raw values
        this.updateShaperAttributesForExport(element);

        // Remove internal raw value attributes
        ShaperUtils.removeAllRawAttributes(element);
    }

    // Update shaper:* attributes from raw values for export
    updateShaperAttributesForExport(element) {
        // Ensure shaper namespace is declared
        const svgRoot = this.svgHelper.getSVGRoot(element);
        this.svgHelper.ensureShaperNamespace(svgRoot);

        // Handle measurement attributes
        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const rawValueMm = ShaperUtils.getRawAttributeValue(element, attr);

            if (rawValueMm !== null && !isNaN(rawValueMm)) {
                // Convert raw mm value to current unit system for export
                const convertedValue = this.measurementSystem.convertBetweenUnits(rawValueMm, 'mm', this.measurementSystem.units);
                const formattedValue = this.measurementSystem.addUnitsToValue(convertedValue);

                ShaperUtils.setNamespacedAttribute(element, attr, formattedValue);
            } else {
                element.removeAttributeNS(ShaperConstants.NAMESPACE, attr);
            }
        });

        // Handle cutType attribute
        const cutTypeRaw = element.getAttribute(ShaperConstants.getRawAttributeName('cutType'));
        ShaperUtils.setNamespacedAttribute(element, 'cutType', cutTypeRaw);
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
        this.svgData = null;
        this.svgElement = null;
        this.masterSVGElement = null;
    }

    // Check if SVG is loaded
    hasLoadedSVG() {
        return this.masterSVGElement !== null;
    }
}

// Export for use in other modules
window.FileManager = FileManager;