// File Manager Module
// Handles SVG file loading, parsing, and export functionality

class FileManager {
    constructor(measurementSystem) {
        this.measurementSystem = measurementSystem;
        this.svgData = null;
        this.svgElement = null;
        this.onSVGLoaded = null; // Callback for when SVG is loaded

        // Initialize SVG helper for clean operations
        this.svgHelper = new SVGHelper();
    }

    // Set callback for SVG loading events
    setLoadCallback(callback) {
        this.onSVGLoaded = callback;
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

    // Parse SVG content
    parseSVG(svgString, fileName = 'untitled.svg') {
        // Parse the SVG string and create DOM element
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');

        // Check for parsing errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Invalid SVG file');
        }

        this.svgElement = this.svgHelper.getSVGRoot(doc.documentElement);
        this.svgData = svgString;
        this.fileName = fileName;

        // Create raw mm values from existing shaper attributes
        this.createRawValuesFromShaperAttributes();

        // Detect measurement units from the SVG
        this.measurementSystem.detectUnits(this.svgElement);

        // Notify that SVG is loaded
        if (this.onSVGLoaded) {
            this.onSVGLoaded(this.svgElement, this.svgData, this.fileName);
        }
    }

    // Create internal raw values from shaper namespaced attributes
    createRawValuesFromShaperAttributes() {
        if (!this.svgElement) return;

        // Find all elements with namespaced shaper attributes
        const allElements = this.svgElement.querySelectorAll('*');

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

    // Get current SVG data
    getSVGData() {
        return this.svgData;
    }

    getSVGElement() {
        return this.svgElement;
    }

    // Update SVG data after modifications - use displayed SVG which has the user's edits
    updateSVGData() {
        // Use SVGHelper to get clean SVG string from displayed SVG
        // Pass this FileManager instance for proper export preparation
        const cleanSVGString = this.svgHelper.getCleanDisplayedSVGString(this);

        if (cleanSVGString) {
            this.svgData = cleanSVGString;
        }
    }    // Prepare a single element for export
    prepareElementForExport(element) {
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
    }    // Export SVG with current modifications
    exportSVG() {
        if (!this.svgData) {
            alert('No SVG file loaded to export.');
            return;
        }

        // Update SVG data to include current modifications
        this.updateSVGData();

        // Create blob and download - no conversion needed since we use proper namespace throughout
        const blob = new Blob([this.svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'shaper-file.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    // Clear loaded SVG
    clearSVG() {
        this.svgData = null;
        this.svgElement = null;
    }

    // Check if SVG is loaded
    hasLoadedSVG() {
        return this.svgElement !== null;
    }
}

// Export for use in other modules
window.FileManager = FileManager;