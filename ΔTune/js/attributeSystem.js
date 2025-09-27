// Attribute System Module
// Handles shaper attribute management and SVG data updates

class AttributeSystem {
    constructor(measurementSystem, fileManager, elementManager) {
        this.measurementSystem = measurementSystem;
        this.fileManager = fileManager;
        this.elementManager = elementManager;
    }

    // Get shaper attributes from an element
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

    // Set a shaper attribute on an element
    setShaperAttribute(element, name, value) {
        ShaperUtils.setNamespacedAttribute(element, name, value);
    }

    // Save attributes from the modal form
    saveAttributes() {
        const selectedPath = this.getSelectedPath();
        if (!selectedPath) {
            console.error('No selected path found');
            return;
        }

        // Save cutType attribute
        this.saveCutTypeAttribute(selectedPath);

        // Save measurement attributes using raw values
        this.saveMeasurementAttributes(selectedPath);

        // Note: Shaper attributes are kept only in elementData for tooltips and editor
        // They will be added to SVG only during export, not to the master SVG

        // Update SVG data for export (no shaper attributes sync needed)
        this.fileManager.updateSVGData();
        console.log('AttributeSystem.saveAttributes completed'); // Debug log
    }

    // Save cutType attribute (non-measurement)
    saveCutTypeAttribute(element) {
        const cutType = document.getElementById('cutType').value.trim();

        // Update elementData for this element
        const dimensions = this.elementManager.getElementDimensions(element);
        if (!dimensions.shaperAttributes) {
            dimensions.shaperAttributes = {};
        }

        if (ShaperConstants.isEmptyValue(cutType) || cutType === 'none') {
            delete dimensions.shaperAttributes['shaper:cutType'];
        } else {
            dimensions.shaperAttributes['shaper:cutType'] = cutType;
        }
    }

    // Save measurement attributes using pixel values
    saveMeasurementAttributes(element) {
        // Get elementData for this element
        const dimensions = this.elementManager.getElementDimensions(element);
        if (!dimensions.shaperAttributes) {
            dimensions.shaperAttributes = {};
        }

        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const input = document.getElementById(attr);
            const inputValue = input.value.trim();

            const attrName = `shaper:${attr}`;

            if (ShaperConstants.isEmptyValue(inputValue)) {
                delete dimensions.shaperAttributes[attrName];
            } else {
                // Convert input value (in current units) to pixels for storage
                const numValue = this.measurementSystem.stripUnitsFromValue(inputValue);
                if (!isNaN(numValue)) {
                    const pixelValue = this.measurementSystem.unitsToPixels(numValue);
                    dimensions.shaperAttributes[attrName] = pixelValue.toString();
                }
            }
        });
    }

    // Convert attribute values when units change (raw values stay the same, only display changes)
    convertAttributeValues(fromUnit, toUnit) {
        if (fromUnit === toUnit) return;

        // Update SVG data to reflect new unit system in export
        this.fileManager.updateSVGData();
    }

    // Refresh dialog values after unit conversion
    refreshDialogValues() {
        const selectedPath = this.getSelectedPath();
        if (!selectedPath) return;

        // Get shaper attributes from elementData
        const dimensions = this.elementManager.getElementDimensions(selectedPath);
        const shaperAttrs = dimensions.shaperAttributes || {};

        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const input = document.getElementById(attr);
            const attrName = `shaper:${attr}`;
            const pixelValue = shaperAttrs[attrName];

            if (pixelValue && pixelValue.trim() !== '' && input) {
                const numPixels = parseFloat(pixelValue);
                if (!isNaN(numPixels)) {
                    // Convert pixel value to current display units
                    const unitValue = this.measurementSystem.convertPixelsToCurrentUnit(numPixels);
                    const displayValue = this.measurementSystem.formatDisplayNumber(unitValue);
                    input.value = displayValue;
                }
            } else if (input) {
                input.value = '';
            }
        });

        // Handle cutType
        const cutType = shaperAttrs['shaper:cutType'] || '';
        const cutTypeInput = document.getElementById('cutType');
        if (cutTypeInput) {
            cutTypeInput.value = cutType;
        }
    }

    // Get the currently selected path
    getSelectedPath() {
        return this.elementManager ? this.elementManager.getSelectedPath() : null;
    }

    // Validate attribute values
    validateAttributes(cutDepth, cutOffset, toolDia) {
        const attributes = { cutDepth, cutOffset, toolDia };
        return ShaperUtils.validateAllAttributes(attributes);
    }

    // Get all elements with shaper attributes
    getElementsWithShaperAttributes() {
        const svgElement = this.fileManager.getSVGElement();
        if (!svgElement) return [];

        return Array.from(svgElement.querySelectorAll('*')).filter(element => {
            return ShaperConstants.ALL_ATTRIBUTES.some(attr => {
                return element.getAttributeNS(ShaperConstants.NAMESPACE, attr);
            });
        });
    }

    // Remove all shaper attributes from an element
    clearShaperAttributes(element) {
        ShaperUtils.removeAllRawAttributes(element);
    }

    // Copy attributes from one element to another
    copyShaperAttributes(fromElement, toElement) {
        const attributes = this.getShaperAttributes(fromElement);

        Object.entries(attributes).forEach(([key, value]) => {
            this.setShaperAttribute(toElement, key, value);
        });
    }

    // Get summary of all shaper attributes in the SVG
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
            // Get attributes from elementData instead of DOM
            const dimensions = this.elementManager.getElementDimensions(element);
            const shaperAttrs = dimensions.shaperAttributes || {};

            const cutType = shaperAttrs['shaper:cutType'];
            if (cutType) {
                summary.cutTypes.add(cutType);
            }

            ['cutDepth', 'cutOffset'].forEach(attr => {
                const attrName = `shaper:${attr}`;
                const pixelValue = shaperAttrs[attrName];
                if (pixelValue && pixelValue.trim() !== '') {
                    const numPixels = parseFloat(pixelValue);
                    if (!isNaN(numPixels)) {
                        // Convert to millimeters for summary comparison
                        const mmValue = this.measurementSystem.convertBetweenUnits(numPixels, 'px', 'mm');
                        const range = attr === 'cutDepth' ? summary.depthRange : summary.offsetRange;
                        if (range.min === null || mmValue < range.min) range.min = mmValue;
                        if (range.max === null || mmValue > range.max) range.max = mmValue;
                    }
                }
            });

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

        // Convert sets to arrays for easier use
        summary.cutTypes = Array.from(summary.cutTypes);
        summary.toolDiameters = Array.from(summary.toolDiameters);

        return summary;
    }
}

// Export for use in other modules
window.AttributeSystem = AttributeSystem;