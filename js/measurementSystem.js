/**
 * Measurement System Module - Unit Conversion and Formatting
 *
 * Provides comprehensive measurement handling with unit conversion, decimal
 * separator localization, and precise SVG measurement capabilities. Handles
 * the complexity of converting between pixels, millimeters, and inches while
 * maintaining accuracy for manufacturing applications.
 *
 * Key Features:
 * - Multi-unit support (mm, inches) with DPI-based conversion
 * - Localized decimal separator handling (comma/period)
 * - Precise SVG measurement using clone technique
 * - Number formatting with configurable precision
 * - Angle normalization and formatting
 * - Unit detection from SVG metadata
 */
class MeasurementSystem {
    /**
     * Initialize measurement system with default metric units
     */
    constructor() {
        this._units = 'mm'; // Default to millimeters
        this.decimalSeparator = this.detectLocalDecimalSeparator();
        this.detectedUnits = null; // Auto-detected from SVG
        this.dpi = 96; // Standard web DPI for pixel conversion
        this.mmPerInch = 25.4; // Conversion constant

        // Debug information for measurement troubleshooting
        this.lastMeasurementCloneHTML = null;
    }

    /**
     * Get current measurement units
     * @returns {string} Current units ('mm' or 'in')
     */
    get units() {
        return this._units;
    }

    /**
     * Set measurement units with validation
     * @param {string} newUnits - New units to use ('mm' or 'in')
     */
    set units(newUnits) {
        this._units = newUnits;
    }

    /**
     * Detect locale-appropriate decimal separator
     *
     * Uses browser locale formatting to determine whether the user's
     * region uses comma or period as decimal separator.
     *
     * @returns {string} Detected decimal separator (',' or '.')
     */
    detectLocalDecimalSeparator() {
        const testNumber = 1.1;
        const formatted = testNumber.toLocaleString();
        return formatted.includes(',') ? ',' : '.';
    }

    /**
     * Get current decimal separator setting
     * @returns {string} Current decimal separator character
     */
    getDecimalSeparator() {
        return this.decimalSeparator;
    }

    /**
     * Set decimal separator for number formatting
     * @param {string} separator - Decimal separator to use (',' or '.')
     */
    setDecimalSeparator(separator) {
        this.decimalSeparator = separator;
    }

    /**
     * Format numeric values for display with localized decimal separator
     *
     * Formats numbers to up to 3 decimal places with trailing zero removal,
     * ensuring at least one decimal place for consistency. Applies user's
     * preferred decimal separator.
     *
     * @param {number} value - Numeric value to format
     * @returns {string} Formatted number string with appropriate decimal separator
     */
    formatDisplayNumber(value) {
        // Format to 3 decimal places for precision
        const fixed3 = parseFloat(value).toFixed(3);

        // Remove trailing zeros while preserving at least one decimal place
        let trimmed = parseFloat(fixed3).toString();

        // Ensure consistent decimal format
        if (!trimmed.includes('.')) {
            trimmed += '.0';
        }

        // Apply localized decimal separator
        const decimalSeparator = this.getDecimalSeparator();
        return trimmed.replace('.', decimalSeparator);
    }

    /**
     * Format angles with normalization and localized decimal separator
     *
     * Normalizes angles to 0-360 degree range and formats to one decimal
     * place with appropriate decimal separator. Handles negative angles
     * by converting to positive equivalent.
     *
     * @param {number} angleDegrees - Angle in degrees (can be negative)
     * @returns {string} Formatted angle string (0-360 range)
     */
    formatAngle(angleDegrees) {
        // Normalize angle to positive 0-360 degree range
        let normalizedAngle = angleDegrees % 360;
        if (normalizedAngle < 0) {
            normalizedAngle += 360;
        }

        // Format to 1 decimal place for angles
        const formattedValue = normalizedAngle.toFixed(1);

        // Apply localized decimal separator
        const decimalSeparator = this.getDecimalSeparator();
        return formattedValue.replace('.', decimalSeparator);
    }

    /**
     * Format number with unit suffix
     *
     * @param {number} value - Numeric value to format
     * @param {number} precision - Decimal places (default: 3)
     * @returns {string} Formatted number with unit suffix
     */
    formatWithUnits(value, precision = 3) {
        const fixed = parseFloat(value).toFixed(precision);
        const trimmed = parseFloat(fixed).toString();
        return `${trimmed}${this.units}`;
    }

    /**
     * Set measurement units and trigger UI updates
     * @param {string} newUnits - New unit system ('mm' or 'in')
     */
    setUnits(newUnits) {
        this._units = newUnits;
    }

    /**
     * Get current measurement units
     * @returns {string} Current units ('mm' or 'in')
     */
    getUnits() {
        return this.units;
    }

    /**
     * Remove unit suffixes from numeric strings
     *
     * Extracts numeric value from strings that may contain unit suffixes,
     * enabling clean numeric parsing for calculations.
     *
     * @param {string|number} value - Value with or without units
     * @returns {number} Pure numeric value
     */
    stripUnitsFromValue(value) {
        return parseFloat(value.toString().replace(/[a-zA-Z]/g, ''));
    }

    /**
     * Add current unit suffix to numeric value
     * @param {number} value - Numeric value to suffix
     * @returns {string} Value with unit suffix
     */
    addUnitsToValue(value) {
        return `${value}${this.units}`;
    }

    /**
     * Parse value strings with intelligent unit and decimal separator handling
     *
     * Parses user input that may contain various decimal separators and unit
     * suffixes. Handles international decimal formats and performs automatic
     * unit conversion to target units when specified.
     *
     * @param {string} valueString - Input string with value and optional units
     * @param {string} targetUnit - Optional target unit for conversion
     * @returns {number|null} Parsed and converted numeric value, or null if invalid
     */
    parseValueWithUnits(valueString, targetUnit = null) {
        if (!valueString) return null;

        const valueStr = valueString.toString().trim();
        if (!valueStr) return null;

        // Normalize decimal separators for reliable parsing
        let normalizedValue = valueStr;
        if (valueStr.includes(',') && !valueStr.includes('.')) {
            // Single comma treated as decimal separator
            normalizedValue = valueStr.replace(',', '.');
        } else if (valueStr.includes('.') && valueStr.includes(',')) {
            // Both present: last occurrence is decimal separator
            const lastCommaIndex = valueStr.lastIndexOf(',');
            const lastDotIndex = valueStr.lastIndexOf('.');

            if (lastCommaIndex > lastDotIndex) {
                // Comma is decimal, periods are thousands separators
                normalizedValue = valueStr.replace(/\./g, '').replace(',', '.');
            } else {
                // Period is decimal, commas are thousands separators
                normalizedValue = valueStr.replace(/,/g, '');
            }
        }

        // Extract numeric value and optional unit suffix
        const match = normalizedValue.match(/^([+-]?\d*\.?\d+)\s*([a-zA-Z]*)$/);
        if (!match) return null;

        const [, numStr, unit] = match;
        const numValue = parseFloat(numStr);

        if (isNaN(numValue)) return null;

        // Perform unit conversion if needed
        if (targetUnit && unit && unit !== targetUnit) {
            return this.convertBetweenUnits(numValue, unit, targetUnit);
        }

        // Auto-convert to current system units if different valid unit detected
        if (!targetUnit && unit && unit !== this.units && (unit === 'mm' || unit === 'in')) {
            return this.convertBetweenUnits(numValue, unit, this.units);
        }

        return numValue;
    }

    /**
     * Convert value to current unit system and format for display
     *
     * Takes a value string with optional units and converts it to the current
     * measurement system, returning a formatted display string. Handles empty
     * values gracefully and provides fallback parsing for unitless values.
     *
     * @param {string} valueWithUnits - Input value with optional unit suffix
     * @returns {string} Formatted value in current units, or empty string if invalid
     */
    convertValueToCurrentUnit(valueWithUnits) {
        if (!valueWithUnits || valueWithUnits === '') {
            return '';
        }
        const parsedValue = this.parseValueWithUnits(valueWithUnits, this.units);
        if (parsedValue !== null) {
            return this.formatDisplayNumber(parsedValue);
        }
        const stripped = this.stripUnitsFromValue(valueWithUnits);
        return isNaN(stripped) ? '' : this.formatDisplayNumber(stripped);
    }

    /**
     * Convert values between different measurement units
     *
     * Performs precise unit conversion using DPI-based calculations with
     * pixels as intermediate format. Supports millimeters, inches, and pixels
     * with standard web DPI (96) and metric conversion constants.
     *
     * @param {number} value - Numeric value to convert
     * @param {string} fromUnit - Source unit ('mm', 'in', 'px')
     * @param {string} toUnit - Target unit ('mm', 'in', 'px')
     * @returns {number} Converted value in target units
     */
    convertBetweenUnits(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;

        // Convert source unit to pixels as intermediate format
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
                return value; // Unknown unit, return unchanged
        }

        // Convert pixels to target unit
        switch (toUnit) {
            case 'mm':
                return pixels * this.mmPerInch / this.dpi;
            case 'in':
                return pixels / this.dpi;
            case 'px':
                return pixels;
            default:
                return value; // Unknown unit, return unchanged
        }
    }

    convertPixelsToCurrentUnit(pixels) {
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

            // 2. Store pixel dimensions as base data (will be converted on display)
            const widthPx = visualPx.width;
            const heightPx = visualPx.height;

            const tagName = element.tagName.toLowerCase();
            const elementData = {
                tagName: tagName,
                widthPx: widthPx,
                heightPx: heightPx
            };

            // 3. Special handling for circles (store pixel-based diameter/radius)
            if (tagName === 'circle' || (tagName === 'ellipse' && Math.abs(widthPx - heightPx) < 0.1)) {
                elementData.diameterPx = (widthPx + heightPx) / 2;
                elementData.radiusPx = elementData.diameterPx / 2;
                elementData.isCircle = true;
            }

            // 4. Extract shaper attributes from the element and convert to pixels
            const shaperAttributes = {};
            Array.from(element.attributes).forEach(attr => {
                if (attr.name.startsWith('shaper:')) {
                    const attrValue = attr.value;
                    if (attr.name === 'shaper:cutType') {
                        // cutType is stored as-is (no unit conversion)
                        shaperAttributes[attr.name] = attrValue;
                    } else {
                        // Measurement attributes: convert from original units to pixels
                        const pixelValue = this.parseValueWithUnits(attrValue);
                        if (pixelValue !== null) {
                            const pixelsFromUnits = this.unitsToPixels(pixelValue);
                            shaperAttributes[attr.name] = pixelsFromUnits.toString();
                        } else {
                            shaperAttributes[attr.name] = attrValue; // Keep as-is if not parseable
                        }
                    }
                }
            });
            elementData.shaperAttributes = shaperAttributes;

            // 5. Store the collected data in the map (use appId as key for safe mapping)
            elementDataMap.set(appId, elementData);
        });

        return elementDataMap;
    }

    // Get SVG boundary measurements using clean clone from fileManager
    measureSVGBoundaryWithClone(svgElement, fileManager = null) {
        // If we have a fileManager, use its clean clone - this is the preferred method
        if (fileManager && fileManager.getCleanSVGClone) {
            const cleanSvg = fileManager.getCleanSVGClone();
            if (cleanSvg) {
                return this._measureCleanSVG(cleanSvg, 'fileManager_cleanClone');
            }
        }

    // Fallback: Try to detect real dimensions from current SVG
        const realDimensions = this.detectRealSVGDimensions(svgElement);
        if (realDimensions) {
            this.lastMeasurementCloneHTML = `Real dimensions detected: ${realDimensions.width}${realDimensions.widthUnit} × ${realDimensions.height}${realDimensions.heightUnit}`;

            // Convert to pixels using the detected units
            const widthPx = this.convertBetweenUnits(realDimensions.width, realDimensions.widthUnit, 'px');
            const heightPx = this.convertBetweenUnits(realDimensions.height, realDimensions.heightUnit, 'px');

            return {
                width: widthPx,
                height: heightPx,
                method: 'realDimensions',
                originalWidth: `${realDimensions.width}${realDimensions.widthUnit}`,
                originalHeight: `${realDimensions.height}${realDimensions.heightUnit}`
            };
        }

        // Final fallback: Manual cleanup of current SVG
        return this._measureCleanSVG(svgElement, 'manual_cleanup');
    }

    // Internal method to measure a clean SVG
    _measureCleanSVG(svgElement, method) {
        const tempContainer = document.createElement('div');
        tempContainer.style.all = 'initial';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';

        try {
            // Clone the SVG
            tempContainer.innerHTML = svgElement.outerHTML;
            document.body.appendChild(tempContainer);

            const measurementClone = tempContainer.querySelector('svg');

            // Remove UI elements
            const uiElements = measurementClone.querySelectorAll('.no-export, .svg-boundary-outline, .boundary-overlay, .path-overlay');
            uiElements.forEach(el => el.remove());

            // Set up proper sizing based on ViewBox
            const viewBox = measurementClone.getAttribute('viewBox');
            if (viewBox) {
                const [, , width, height] = viewBox.split(/[ ,]+/).map(Number);
                measurementClone.style.width = `${width}px`;
                measurementClone.style.height = `${height}px`;
            }

            // Measure the SVG
            const svgBbox = measurementClone.getBoundingClientRect();
            this.lastMeasurementCloneHTML = measurementClone.outerHTML;

            return {
                width: svgBbox.width,
                height: svgBbox.height,
                method: method,
                viewBox: viewBox
            };
        } finally {
            if (tempContainer.parentNode) {
                tempContainer.parentNode.removeChild(tempContainer);
            }
        }
    }

    // Try to detect real SVG dimensions from width/height attributes with units
    detectRealSVGDimensions(svgElement) {
        const width = svgElement.getAttribute('width');
        const height = svgElement.getAttribute('height');

        // Skip percentage or viewport units
        if (!width || !height || width.includes('%') || height.includes('%')) {
            return null;
        }

        // Parse width with units
        const widthMatch = width.match(/^([0-9.]+)\s*(mm|in|px|pt|pc|cm)?$/);
        const heightMatch = height.match(/^([0-9.]+)\s*(mm|in|px|pt|pc|cm)?$/);

        if (widthMatch && heightMatch) {
            const widthValue = parseFloat(widthMatch[1]);
            const heightValue = parseFloat(heightMatch[1]);
            const widthUnit = widthMatch[2] || 'px'; // default to px if no unit
            const heightUnit = heightMatch[2] || 'px';

            return {
                width: widthValue,
                height: heightValue,
                widthUnit: widthUnit,
                heightUnit: heightUnit
            };
        }

        return null;
    }

    /**
     * Analyzes an entire SVG to get dimensions of all its elements.
     * This is a simplified version that focuses on getting the job done
     * without the extra features like caching or advanced unit detection.
     */
}

// Export for use in other modules
window.MeasurementSystem = MeasurementSystem;