// Measurement System Module
// Handles unit conversion, decimal separators, and formatting

class MeasurementSystem {
    constructor() {
        this._units = 'mm'; // Private property
        this.decimalSeparator = this.detectLocalDecimalSeparator();
        this.detectedUnits = null;
        this.dpi = 96; // Standard web DPI
        this.mmPerInch = 25.4;
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
            // e.g., "1,234.56" or "1.234,56"
            const lastCommaIndex = valueStr.lastIndexOf(',');
            const lastDotIndex = valueStr.lastIndexOf('.');

            if (lastCommaIndex > lastDotIndex) {
                // Comma is the decimal separator, remove dots (thousands separators)
                normalizedValue = valueStr.replace(/\./g, '').replace(',', '.');
            } else {
                // Dot is the decimal separator, remove commas (thousands separators)
                normalizedValue = valueStr.replace(/,/g, '');
            }
        }
        // If only dots are present, keep as is (already normalized)

        // Extract numeric value and unit
        const match = normalizedValue.match(/^([+-]?\d*\.?\d+)\s*([a-zA-Z]*)$/);
        if (!match) return null;

        const [, numStr, unit] = match;
        const numValue = parseFloat(numStr);

        if (isNaN(numValue)) return null;

        // If target unit specified, convert to it
        if (targetUnit && unit && unit !== targetUnit) {
            return this.convertBetweenUnits(numValue, unit, targetUnit);
        }

        // If no target unit specified but input has a unit different from current system, convert to current system
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

        // Try to strip units and parse
        const stripped = this.stripUnitsFromValue(valueWithUnits);
        return isNaN(stripped) ? '' : this.formatGridNumber(stripped);
    }

    // Unit conversion between different measurement systems
    convertBetweenUnits(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;

        // Convert to pixels first (common base)
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
                return value; // Unknown unit, return as-is
        }

        // Convert from pixels to target unit
        switch (toUnit) {
            case 'mm':
                return pixels * this.mmPerInch / this.dpi;
            case 'in':
                return pixels / this.dpi;
            case 'px':
                return pixels;
            default:
                return value; // Unknown unit, return as-is
        }
    }

    pixelsToUnits(pixels) {
        return this.convertBetweenUnits(pixels, 'px', this.units);
    }

    unitsToPixels(value) {
        return this.convertBetweenUnits(value, this.units, 'px');
    }

    // Unit detection from SVG content
    detectUnits(svgElement) {
        // This method analyzes SVG content to detect units
        const unitCounts = {
            'mm': 0,
            'in': 0,
            'px': 0
        };

        if (svgElement) {
            // Check viewBox and dimensions
            const viewBox = svgElement.getAttribute('viewBox');
            const width = svgElement.getAttribute('width');
            const height = svgElement.getAttribute('height');

            this.countUnitInString(viewBox, unitCounts);
            this.countUnitInString(width, unitCounts);
            this.countUnitInString(height, unitCounts);

            // Check all elements for unit-bearing attributes
            const allElements = svgElement.querySelectorAll('*');
            allElements.forEach(element => {
                const attributes = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'stroke-width'];
                attributes.forEach(attr => {
                    const value = element.getAttribute(attr);
                    if (value) {
                        this.countUnitInString(value, unitCounts);
                    }
                });
            });
        }

        // Return the most common unit or default
        const maxCount = Math.max(...Object.values(unitCounts));
        if (maxCount === 0) {
            this.detectedUnits = 'mm'; // Default
        } else {
            this.detectedUnits = Object.keys(unitCounts).find(unit => unitCounts[unit] === maxCount);
        }

        // Detect units from SVG but preserve user preferences
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
}

// Export for use in other modules
window.MeasurementSystem = MeasurementSystem;