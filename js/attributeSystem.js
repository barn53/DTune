/**
 * Attribute System Module
 *
 * Manages shaper attributes for SVG elements, handling the storage, retrieval,
 * and conversion of manufacturing-related attributes like cut depth, tool diameter, etc.
 *
 * Key implementation details:
 * - Attributes are stored in elementData map during editing (not in DOM)
 * - Values are stored internally as pixels for consistency
 * - Only exported to SVG with proper units during file export
 * - Supports unit conversion without data loss through pixel-based storage
 */
class AttributeSystem {
    /**
     * Initialize the attribute system with required dependencies
     * @param {MeasurementSystem} measurementSystem - Handles unit conversions and formatting
     * @param {FileManager} fileManager - Manages SVG file operations
     * @param {ElementManager} elementManager - Manages element selection and data
     * @param {MetaData} metaData - Centralized data management for persistence
     */
    constructor(measurementSystem, fileManager, elementManager, metaData = null) {
        this.measurementSystem = measurementSystem;
        this.fileManager = fileManager;
        this.elementManager = elementManager;
        this.metaData = metaData;
    }

    /**
     * Extract shaper attributes from an SVG element's namespace attributes
     * This method reads directly from the DOM element's namespaced attributes
     * @param {Element} element - SVG element to extract attributes from
     * @returns {Object} Map of attribute names to values
     */
    getShaperAttributes(element) {
        const attributes = {};

        ShaperConstants.ALL_ATTRIBUTES.forEach(attr => {
            const value = element.getAttributeNS(ShaperConstants.NAMESPACE, attr);
            if (value) {
                attributes[attr] = value;
            }
        });

        return attributes;
    }

    /**
     * Set a namespaced shaper attribute on an SVG element
     * Uses ShaperUtils to ensure proper namespace handling and SVG compliance
     * @param {Element} element - Target SVG element
     * @param {string} name - Attribute name (without namespace prefix)
     * @param {string} value - Attribute value to set
     */
    setShaperAttribute(element, name, value) {
        ShaperUtils.setNamespacedAttribute(element, name, value);
    }

    /**
     * Save all attributes from the modal form to element data
     *
     * This is the main method called when user clicks "Save" in the attribute modal.
     * It processes both cut type and measurement attributes, storing them in the
     * element data map rather than directly in the SVG DOM (for export flexibility).
     *
     * Implementation notes:
     * - Validates that a path is selected before proceeding
     * - Stores measurement values as pixels internally for unit-agnostic storage
     * - Updates SVG data for export preparation
     * - Does NOT modify the master SVG DOM directly during editing
     */
    saveAttributes() {
        const selectedPath = this.getSelectedPath();
        if (!selectedPath) {
            console.error('No selected path found');
            return;
        }

        // Process cut type (string attribute, no unit conversion needed)
        this.saveCutTypeAttribute(selectedPath);

        // Process measurement attributes (convert to pixels for internal storage)
        this.saveMeasurementAttributes(selectedPath);

        // Important: Shaper attributes are kept only in elementData during editing
        // This allows for unit conversions and tooltips without polluting the master SVG
        // Attributes will be properly formatted and added to SVG only during export

        // Update internal SVG data representation for export preparation
        this.fileManager.updateSVGData();

        // MetaData automatically handles persistence when element data changes
    }

    /**
     * Save cut type attribute from the modal form to element data
     *
     * Cut type is a string attribute (online, inside, outside, pocket, guide)
     * that doesn't require unit conversion. Stored directly in element data.
     *
     * @param {Element} element - SVG element to save attribute for
     */
    saveCutTypeAttribute(element) {
        const cutType = document.getElementById('cutType').value.trim();

        // Get element data object and ensure shaper attributes section exists
        const dimensions = this.elementManager.getElementDimensions(element);
        if (!dimensions.shaperAttributes) {
            dimensions.shaperAttributes = {};
        }

        // Remove empty or 'none' values, otherwise store the cut type
        if (ShaperConstants.isEmptyValue(cutType) || cutType === 'none') {
            delete dimensions.shaperAttributes['shaper:cutType'];
        } else {
            dimensions.shaperAttributes['shaper:cutType'] = cutType;
        }
    }

    /**
     * Save measurement attributes from modal form, converting to pixels for storage
     *
     * This method handles cutDepth, cutOffset, and toolDia attributes that have
     * numeric values with units. The implementation stores values as pixels internally
     * to allow lossless unit conversions during editing.
     *
     * Implementation details:
     * - Reads values from DOM input fields
     * - Strips units and converts to numeric values
     * - Converts from current display units to pixels for storage
     * - Removes empty values from element data
     *
     * @param {Element} element - SVG element to save attributes for
     */
    saveMeasurementAttributes(element) {
        // Get element data object and ensure shaper attributes section exists
        const dimensions = this.elementManager.getElementDimensions(element);
        if (!dimensions.shaperAttributes) {
            dimensions.shaperAttributes = {};
        }

        // Process each measurement attribute (cutDepth, cutOffset, toolDia)
        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const input = document.getElementById(attr);
            const inputValue = input.value.trim();
            const attrName = `shaper:${attr}`;

            if (ShaperConstants.isEmptyValue(inputValue)) {
                // Remove empty values from element data
                delete dimensions.shaperAttributes[attrName];
            } else {
                // Convert display value (with current units) to pixels for internal storage
                const numValue = this.measurementSystem.stripUnitsFromValue(inputValue);
                if (!isNaN(numValue)) {
                    const pixelValue = this.measurementSystem.unitsToPixels(numValue);
                    dimensions.shaperAttributes[attrName] = pixelValue.toString();
                }
            }
        });
    }

    /**
     * Handle unit system changes by updating SVG export data
     *
     * When the user switches between mm/inches, the pixel-based internal storage
     * remains unchanged, but the export format needs updating. This method ensures
     * the SVG export data reflects the new unit system.
     *
     * @param {string} fromUnit - Previous unit system (mm/in)
     * @param {string} toUnit - New unit system (mm/in)
     */
    convertAttributeValues(fromUnit, toUnit) {
        if (fromUnit === toUnit) return;

        // Update SVG data to reflect new unit system for export
        // Internal pixel values remain unchanged for precision
        this.fileManager.updateSVGData();
    }

    /**
     * Refresh attribute dialog values after unit system changes
     *
     * When units change (mm ↔ inches), this method updates the modal form inputs
     * to display the same physical values in the new unit system. The conversion
     * is lossless because values are stored internally as pixels.
     *
     * Implementation approach:
     * - Reads pixel values from element data (not DOM)
     * - Converts pixels to current display units
     * - Updates form inputs with converted values
     * - Handles both measurement and cut type attributes
     */
    refreshDialogValues() {
        const selectedPath = this.getSelectedPath();
        if (!selectedPath) return;

        // Retrieve stored shaper attributes from element data (not DOM)
        const dimensions = this.elementManager.getElementDimensions(selectedPath);
        const shaperAttrs = dimensions.shaperAttributes || {};

        // Update measurement attribute inputs with unit-converted values
        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const input = document.getElementById(attr);
            const attrName = `shaper:${attr}`;
            const pixelValue = shaperAttrs[attrName];

            if (pixelValue && pixelValue.trim() !== '' && input) {
                const numPixels = parseFloat(pixelValue);
                if (!isNaN(numPixels)) {
                    // Convert stored pixel value to current display units
                    const unitValue = this.measurementSystem.convertPixelsToCurrentUnit(numPixels);
                    const displayValue = this.measurementSystem.formatDisplayNumber(unitValue);
                    input.value = displayValue;
                }
            } else if (input) {
                input.value = '';
            }
        });

        // Update cut type input (no conversion needed for string values)
        const cutType = shaperAttrs['shaper:cutType'] || '';
        const cutTypeInput = document.getElementById('cutType');
        if (cutTypeInput) {
            cutTypeInput.value = cutType;
        }
    }

    /**
     * Get currently selected SVG path element
     * Delegates to ElementManager for consistency with selection state
     * @returns {Element|null} Selected SVG element or null if none selected
     */
    getSelectedPath() {
        return this.elementManager ? this.elementManager.getSelectedPath() : null;
    }

    /**
     * Validate shaper attribute values for correctness
     *
     * Delegates to ShaperUtils for consistent validation logic across the app.
     * Checks for valid numeric ranges, positive values where required, etc.
     *
     * @param {number} cutDepth - Cut depth value to validate
     * @param {number} cutOffset - Cut offset value to validate
     * @param {number} toolDia - Tool diameter value to validate
     * @returns {Array<string>} Array of validation error messages (empty if valid)
     */
    validateAttributes(cutDepth, cutOffset, toolDia) {
        const attributes = { cutDepth, cutOffset, toolDia };
        return ShaperUtils.validateAllAttributes(attributes);
    }

    /**
     * Find all SVG elements that have shaper attributes in the DOM
     *
     * This method scans the master SVG element for any elements with namespaced
     * shaper attributes. Used for export operations and attribute summaries.
     *
     * @returns {Array<Element>} Array of SVG elements with shaper attributes
     */
    getElementsWithShaperAttributes() {
        const svgElement = this.fileManager.getSVGElement();
        if (!svgElement) return [];

        // Search all SVG child elements for namespaced shaper attributes
        return Array.from(svgElement.querySelectorAll('*')).filter(element => {
            return ShaperConstants.ALL_ATTRIBUTES.some(attr => {
                return element.getAttributeNS(ShaperConstants.NAMESPACE, attr);
            });
        });
    }

    /**
     * Remove all shaper attributes from an SVG element
     *
     * Cleans up both the DOM element and element data storage.
     * Used when resetting or clearing shaper data from elements.
     *
     * @param {Element} element - SVG element to clear attributes from
     */
    clearShaperAttributes(element) {
        ShaperUtils.removeAllRawAttributes(element);
    }

    /**
     * Copy all shaper attributes from one element to another
     *
     * Useful for duplicating shaper configuration between similar elements.
     * Copies both the DOM attributes and internal element data.
     *
     * @param {Element} fromElement - Source element with attributes to copy
     * @param {Element} toElement - Target element to receive copied attributes
     */
    copyShaperAttributes(fromElement, toElement) {
        const attributes = this.getShaperAttributes(fromElement);

        // Copy each attribute to the target element
        Object.entries(attributes).forEach(([key, value]) => {
            this.setShaperAttribute(toElement, key, value);
        });
    }

    /**
     * Generate a statistical summary of all shaper attributes in the SVG
     *
     * Analyzes all elements with shaper attributes to provide an overview of:
     * - Total count of elements with shaper data
     * - All cut types used
     * - Range of cut depths and offsets
     * - All tool diameters specified
     *
     * This is useful for manufacturing planning and quality checks.
     * Values are normalized to millimeters for consistent comparison.
     *
     * @returns {Object} Summary object with statistics about shaper attributes
     */
    getShaperAttributesSummary() {
        const elementsWithShaper = this.getElementsWithShaperAttributes();

        const summary = {
            totalElements: elementsWithShaper.length,
            cutTypes: new Set(),
            depthRange: { min: null, max: null },
            offsetRange: { min: null, max: null },
            toolDiameters: new Set()
        };

        elementsWithShaper.forEach(element => {
            // Read attributes from element data storage (not DOM) for accuracy
            const dimensions = this.elementManager.getElementDimensions(element);
            const shaperAttrs = dimensions.shaperAttributes || {};

            // Collect unique cut types
            const cutType = shaperAttrs['shaper:cutType'];
            if (cutType) {
                summary.cutTypes.add(cutType);
            }

            // Analyze depth and offset ranges (convert pixels to mm for comparison)
            ['cutDepth', 'cutOffset'].forEach(attr => {
                const attrName = `shaper:${attr}`;
                const pixelValue = shaperAttrs[attrName];
                if (pixelValue && pixelValue.trim() !== '') {
                    const numPixels = parseFloat(pixelValue);
                    if (!isNaN(numPixels)) {
                        // Convert stored pixel values to millimeters for range analysis
                        const mmValue = this.measurementSystem.convertBetweenUnits(numPixels, 'px', 'mm');
                        const range = attr === 'cutDepth' ? summary.depthRange : summary.offsetRange;
                        if (range.min === null || mmValue < range.min) range.min = mmValue;
                        if (range.max === null || mmValue > range.max) range.max = mmValue;
                    }
                }
            });

            // Collect unique tool diameters
            const toolDia = shaperAttrs['shaper:toolDia'];
            if (toolDia && toolDia.trim() !== '') {
                const numPixels = parseFloat(toolDia);
                if (!isNaN(numPixels)) {
                    const mmValue = this.measurementSystem.convertBetweenUnits(numPixels, 'px', 'mm');
                    const formattedValue = this.measurementSystem.formatDisplayNumber(mmValue);
                    summary.toolDiameters.add(`${formattedValue}mm`);
                }
            }
        });

        // Convert Sets to Arrays for easier JSON serialization and iteration
        summary.cutTypes = Array.from(summary.cutTypes);
        summary.toolDiameters = Array.from(summary.toolDiameters);

        return summary;
    }
}

// Export for use in other modules
window.AttributeSystem = AttributeSystem;