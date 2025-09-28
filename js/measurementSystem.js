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
    formatDisplayNumber(value) {
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
            return this.formatDisplayNumber(parsedValue);
        }
        const stripped = this.stripUnitsFromValue(valueWithUnits);
        return isNaN(stripped) ? '' : this.formatDisplayNumber(stripped);
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