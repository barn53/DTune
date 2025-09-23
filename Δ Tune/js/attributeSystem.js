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

        // Sync attributes to original SVG for export consistency
        this.syncAttributesToOriginalSVG(selectedPath);

        // Update SVG data for export
        this.fileManager.updateSVGData();
        console.log('AttributeSystem.saveAttributes completed'); // Debug log
    }

    // Save cutType attribute (non-measurement)
    saveCutTypeAttribute(element) {
        const cutType = document.getElementById('cutType').value.trim();

        if (ShaperConstants.isEmptyValue(cutType) || cutType === 'none') {
            element.removeAttribute(ShaperConstants.getRawAttributeName('cutType'));
        } else {
            element.setAttribute(ShaperConstants.getRawAttributeName('cutType'), cutType);
        }
    }

    // Save measurement attributes using raw mm values
    saveMeasurementAttributes(element) {
        if (!this.editor) return;

        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const input = document.getElementById(attr);
            const inputValue = input.value.trim();

            if (ShaperConstants.isEmptyValue(inputValue)) {
                element.removeAttribute(ShaperConstants.getRawAttributeName(attr));
            } else {
                const rawValue = this.editor.getRawValue(input);
                ShaperUtils.setRawAttribute(element, attr, rawValue);
            }
        });
    }

    // Sync attributes from displayed element back to original SVG in file manager
    syncAttributesToOriginalSVG(displayedElement) {
        console.log('syncAttributesToOriginalSVG called with:', displayedElement); // Debug log
        const originalSVG = this.fileManager.getSVGElement();
        console.log('Original SVG:', originalSVG); // Debug log
        if (!originalSVG || !displayedElement) {
            console.log('Missing originalSVG or displayedElement'); // Debug log
            return;
        }

        const correspondingElement = ShaperUtils.findCorrespondingElement(displayedElement, originalSVG);
        console.log('Corresponding element found:', correspondingElement); // Debug log
        if (correspondingElement) {
            ShaperUtils.syncAllShaperAttributes(displayedElement, correspondingElement);
            console.log('Attributes synced'); // Debug log
        }
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
        if (!selectedPath || !this.editor) return;

        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            const input = document.getElementById(attr);
            const rawValueMm = ShaperUtils.getRawAttributeValue(selectedPath, attr);

            if (rawValueMm !== null && !isNaN(rawValueMm) && input) {
                // Convert raw mm to current display units
                const convertedValue = this.measurementSystem.convertBetweenUnits(rawValueMm, 'mm', this.measurementSystem.units);
                const displayValue = this.measurementSystem.formatGridNumber(convertedValue);
                input.value = displayValue;

                // Update stored raw value in input
                this.editor.setRawValue(input, rawValueMm);
            }
        });
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
            const attrs = this.getShaperAttributes(element);

            if (attrs.cutType) {
                summary.cutTypes.add(attrs.cutType);
            }

            ['cutDepth', 'cutOffset'].forEach(attr => {
                if (attrs[attr]) {
                    const value = this.measurementSystem.parseValueWithUnits(attrs[attr], 'mm');
                    if (value !== null) {
                        const range = attr === 'cutDepth' ? summary.depthRange : summary.offsetRange;
                        if (range.min === null || value < range.min) range.min = value;
                        if (range.max === null || value > range.max) range.max = value;
                    }
                }
            });

            if (attrs.toolDia) {
                summary.toolDiameters.add(attrs.toolDia);
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