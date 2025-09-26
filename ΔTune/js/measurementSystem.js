// Measurement System Module
// Handles unit conversion, decimal separators, and formatting

class MeasurementSystem {
    constructor() {
        this._units = 'mm'; // Private property
        this.decimalSeparator = this.detectLocalDecimalSeparator();
        this.detectedUnits = null;
        this.dpi = 96; // Standard web DPI
        this.mmPerInch = 25.4;
        // --- REMOVED: Calibration logic is no longer needed ---
        // --- Debugging ---
        this.lastMeasurementCloneHTML = null;
    }

    // Getter and setter for units to track all changes
    get units() {
        return this._units;
    }

    set units(newUnits) {
        this._units = newUnits;
    }

    // Decimal separator detection and handling
    detectLocalDecimalSeparator() {
        const testNumber = 1.1;
        const formatted = testNumber.toLocaleString();
        return formatted.includes(',') ? ',' : '.';
    }

    getDecimalSeparator() {
        return this.decimalSeparator;
    }

    setDecimalSeparator(separator) {
        this.decimalSeparator = separator;
    }

    // Number formatting with decimal separator support
    formatGridNumber(value) {
        // Format number to show up to 3 decimal places, ensuring at least 1 decimal place
        const fixed3 = parseFloat(value).toFixed(3);

        // Remove trailing zeros but keep at least one decimal place
        let trimmed = parseFloat(fixed3).toString();

        // Ensure at least one decimal place
        if (!trimmed.includes('.')) {
            trimmed += '.0';
        }

        // Use appropriate decimal separator
        const decimalSeparator = this.getDecimalSeparator();
        return trimmed.replace('.', decimalSeparator);
    }

    formatAngle(angleDegrees) {
        // Normalize angle to 0-360 degrees
        let normalizedAngle = angleDegrees % 360;
        if (normalizedAngle < 0) {
            normalizedAngle += 360;
        }

        // Format to 1 decimal place for angles
        const formattedValue = normalizedAngle.toFixed(1);

        // Use appropriate decimal separator
        const decimalSeparator = this.getDecimalSeparator();
        return formattedValue.replace('.', decimalSeparator);
    }

    formatWithUnits(value, precision = 3) {
        const fixed = parseFloat(value).toFixed(precision);
        const trimmed = parseFloat(fixed).toString();
        return `${trimmed}${this.units}`;
    }

    // Unit management
    setUnits(newUnits) {
        this._units = newUnits;
    }

    getUnits() {
        return this.units;
    }

    // Value parsing and conversion utilities
    stripUnitsFromValue(value) {
        return parseFloat(value.toString().replace(/[a-zA-Z]/g, ''));
    }

    addUnitsToValue(value) {
        return `${value}${this.units}`;
    }

    parseValueWithUnits(valueString, targetUnit = null) {
        if (!valueString) return null;

        const valueStr = valueString.toString().trim();
        if (!valueStr) return null;

        // Handle both decimal separators - accept both "." and "," as input
        // Always normalize to "." for parseFloat
        let normalizedValue = valueStr;
        if (valueStr.includes(',') && !valueStr.includes('.')) {
            // If only comma is present, treat it as decimal separator
            normalizedValue = valueStr.replace(',', '.');
        } else if (valueStr.includes('.') && valueStr.includes(',')) {
            // If both are present, assume the last one is decimal separator
            const lastCommaIndex = valueStr.lastIndexOf(',');
            const lastDotIndex = valueStr.lastIndexOf('.');

            if (lastCommaIndex > lastDotIndex) {
                normalizedValue = valueStr.replace(/\./g, '').replace(',', '.');
            } else {
                normalizedValue = valueStr.replace(/,/g, '');
            }
        }

        const match = normalizedValue.match(/^([+-]?\d*\.?\d+)\s*([a-zA-Z]*)$/);
        if (!match) return null;

        const [, numStr, unit] = match;
        const numValue = parseFloat(numStr);

        if (isNaN(numValue)) return null;

        if (targetUnit && unit && unit !== targetUnit) {
            return this.convertBetweenUnits(numValue, unit, targetUnit);
        }

        if (!targetUnit && unit && unit !== this.units && (unit === 'mm' || unit === 'in')) {
            return this.convertBetweenUnits(numValue, unit, this.units);
        }

        return numValue;
    }

    convertValueToCurrentUnit(valueWithUnits) {
        if (!valueWithUnits || valueWithUnits === '') {
            return '';
        }
        const parsedValue = this.parseValueWithUnits(valueWithUnits, this.units);
        if (parsedValue !== null) {
            return this.formatGridNumber(parsedValue);
        }
        const stripped = this.stripUnitsFromValue(valueWithUnits);
        return isNaN(stripped) ? '' : this.formatGridNumber(stripped);
    }

    // Unit conversion between different measurement systems
    convertBetweenUnits(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;
        let pixels;
        switch (fromUnit) {
            case 'mm':
                pixels = value * this.dpi / this.mmPerInch;
                break;
            case 'in':
                pixels = value * this.dpi;
                break;
            case 'px':
                pixels = value;
                break;
            default:
                return value;
        }
        switch (toUnit) {
            case 'mm':
                return pixels * this.mmPerInch / this.dpi;
            case 'in':
                return pixels / this.dpi;
            case 'px':
                return pixels;
            default:
                return value;
        }
    }

    pixelsToUnits(pixels) {
        return this.convertBetweenUnits(pixels, 'px', this.units);
    }

    unitsToPixels(value) {
        return this.convertBetweenUnits(value, this.units, 'px');
    }

    // --- REMOVED: `calibrateUserUnitScale` and `userLengthToDisplayUnits` are gone ---

    // Unit detection from SVG content
    detectUnits(svgElement) {
        const unitCounts = { 'mm': 0, 'in': 0, 'px': 0 };
        if (svgElement) {
            const viewBox = svgElement.getAttribute('viewBox');
            const width = svgElement.getAttribute('width');
            const height = svgElement.getAttribute('height');
            this.countUnitInString(viewBox, unitCounts);
            this.countUnitInString(width, unitCounts);
            this.countUnitInString(height, unitCounts);
            const allElements = svgElement.querySelectorAll('*');
            allElements.forEach(element => {
                const attributes = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'stroke-width'];
                attributes.forEach(attr => {
                    const value = element.getAttribute(attr);
                    if (value) this.countUnitInString(value, unitCounts);
                });
            });
        }
        const maxCount = Math.max(...Object.values(unitCounts));
        if (maxCount === 0) {
            this.detectedUnits = 'mm';
        } else {
            this.detectedUnits = Object.keys(unitCounts).find(unit => unitCounts[unit] === maxCount);
        }
        this.detectedUnits = this.detectedUnits || 'mm';
        return this.detectedUnits;
    }

    countUnitInString(str, unitCounts) {
        if (!str) return;
        const mmMatches = str.match(/\bmm\b/g);
        const inMatches = str.match(/\bin\b/g);
        const pxMatches = str.match(/\bpx\b/g);
        if (mmMatches) unitCounts.mm += mmMatches.length;
        if (inMatches) unitCounts.in += inMatches.length;
        if (pxMatches) unitCounts.px += pxMatches.length;
    }

    // --- Visual Measurement using getBoundingClientRect ---
    getVisualDimensions(elementToMeasure, masterSVGElement) {
        if (!elementToMeasure || !masterSVGElement || !elementToMeasure.dataset.appId) {
            return { width: 0, height: 0 };
        }
        const appId = elementToMeasure.dataset.appId;
        const tempContainer = document.createElement('div');
        tempContainer.style.all = 'initial';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        try {
            const measurementClone = masterSVGElement.cloneNode(true);
            const viewBox = measurementClone.getAttribute('viewBox');
            if (viewBox) {
                const [, , vbWidth, vbHeight] = viewBox.split(/[ ,]+/);
                measurementClone.style.width = `${vbWidth}px`;
                measurementClone.style.height = `${vbHeight}px`;
            }
            tempContainer.appendChild(measurementClone);
            document.body.appendChild(tempContainer);
            const elementInClone = measurementClone.querySelector(`[data-app-id="${appId}"]`);
            if (elementInClone) {
                const bbox = elementInClone.getBoundingClientRect();
                this.lastMeasurementCloneHTML = measurementClone.outerHTML;
                return { width: bbox.width, height: bbox.height };
            }
            this.lastMeasurementCloneHTML = measurementClone.outerHTML;
            return { width: 0, height: 0 };
        } finally {
            if (tempContainer.firstChild) {
                this.lastMeasurementCloneHTML = tempContainer.firstChild.outerHTML;
            }
            if (tempContainer.parentNode) {
                tempContainer.parentNode.removeChild(tempContainer);
            }
        }
    }

    // --- SIMPLIFIED: Full SVG Analysis ---
    analyzeSVG(masterSVGElement) {
        const elementDataMap = new Map();
        if (!masterSVGElement) {
            return elementDataMap;
        }

        const elementsToAnalyze = masterSVGElement.querySelectorAll('[data-app-id]');

        elementsToAnalyze.forEach(element => {
            const appId = element.dataset.appId;
            if (!appId) return;

            // 1. Get precise visual dimensions in pixels for ALL elements
            const visualPx = this.getVisualDimensions(element, masterSVGElement);

            // 2. Convert pixel dimensions to the current display units
            const width = this.pixelsToUnits(visualPx.width);
            const height = this.pixelsToUnits(visualPx.height);

            const tagName = element.tagName.toLowerCase();
            const elementData = {
                tagName: tagName,
                width: width,
                height: height
            };

            // 3. Special handling for circles (still useful)
            if (tagName === 'circle' || (tagName === 'ellipse' && Math.abs(width - height) < 0.1)) {
                elementData.diameter = (width + height) / 2;
                elementData.radius = elementData.diameter / 2;
                elementData.isCircle = true;
            }

            // --- REMOVED: Special handling for <line> is gone. It's now treated like any other shape. ---

            // 4. Store the collected data in the map
            elementDataMap.set(appId, elementData);
        });

        return elementDataMap;
    }
}

// Export for use in other modules
window.MeasurementSystem = MeasurementSystem;