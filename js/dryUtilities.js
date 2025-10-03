/**
 * DRY Utilities Module - Centralized Common Operations
 *
 * Eliminates code duplication by providing reusable utility functions
 * for common patterns found throughout the codebase.
 *
 * Key Features:
 * - DOM element binding utilities
 * - Unit conversion and formatting shortcuts
 * - Mathematical calculation helpers
 * - Element positioning utilities
 * - String template generators
 */
class DRYUtilities {
    /**
     * Initialize utilities with system dependencies
     *
     * @param {MeasurementSystem} measurementSystem - Unit conversion and formatting
     */
    constructor(measurementSystem = null) {
        this.measurementSystem = measurementSystem;
    }

    /**
     * Bind multiple DOM elements by their IDs to an object
     * Eliminates repetitive document.getElementById calls
     *
     * @param {Object} elementMap - Object mapping property names to element IDs
     * @param {Object} target - Target object to bind elements to (defaults to new object)
     * @returns {Object} Object with bound elements
     *
     * @example
     * const elements = DRYUtilities.bindElements({
     *   modal: 'attributeModal',
     *   closeBtn: 'modalClose'
     * });
     * // Result: { modal: HTMLElement, closeBtn: HTMLElement }
     */
    static bindElements(elementMap, target = {}) {
        Object.entries(elementMap).forEach(([prop, id]) => {
            target[prop] = document.getElementById(id);
            if (!target[prop]) {
                console.warn(`Element with ID '${id}' not found for property '${prop}'`);
            }
        });
        return target;
    }

    /**
     * Convert pixels to display string with current units
     * Combines convertPixelsToCurrentUnit + formatDisplayNumber + units
     *
     * @param {number} pixels - Pixel value to convert
     * @returns {string} Formatted display string (e.g., "15.2mm")
     */
    formatPixelsToDisplay(pixels) {
        if (!this.measurementSystem) return `${pixels}px`;

        const converted = this.measurementSystem.convertPixelsToCurrentUnit(pixels);
        const formatted = this.measurementSystem.formatDisplayNumber(converted);
        return `${formatted}${this.measurementSystem.units}`;
    }

    /**
     * Create measurement object with name and formatted value
     *
     * @param {string} name - Measurement name
     * @param {number} pixelValue - Value in pixels
     * @returns {Object} Measurement object with name and formatted value
     */
    createMeasurement(name, pixelValue) {
        return {
            name,
            value: this.formatPixelsToDisplay(pixelValue)
        };
    }

    /**
     * Calculate distance between two points
     *
     * @param {number} x1 - First point X coordinate
     * @param {number} y1 - First point Y coordinate
     * @param {number} x2 - Second point X coordinate
     * @param {number} y2 - Second point Y coordinate
     * @returns {number} Distance between points
     */
    static calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * Calculate angle between two points in degrees
     *
     * @param {number} x1 - First point X coordinate
     * @param {number} y1 - First point Y coordinate
     * @param {number} x2 - Second point X coordinate
     * @param {number} y2 - Second point Y coordinate
     * @returns {number} Angle in degrees
     */
    static calculateAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    }

    /**
     * Position element relative to another element with bounds checking
     *
     * @param {HTMLElement} element - Element to position
     * @param {number} x - Target X coordinate
     * @param {number} y - Target Y coordinate
     * @param {Object} options - Positioning options
     * @param {number} options.offsetX - X offset from target position
     * @param {number} options.offsetY - Y offset from target position
     * @param {number} options.margin - Margin from viewport edges
     * @returns {Object} Final position {x, y}
     */
    static positionElement(element, x, y, options = {}) {
        const { offsetX = 0, offsetY = 0, margin = 10 } = options;

        // Get element dimensions
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate initial position
        let finalX = x + offsetX;
        let finalY = y + offsetY;

        // Bounds checking - keep element within viewport
        if (finalX + rect.width > viewportWidth - margin) {
            finalX = viewportWidth - rect.width - margin;
        }
        if (finalX < margin) {
            finalX = margin;
        }

        if (finalY + rect.height > viewportHeight - margin) {
            finalY = viewportHeight - rect.height - margin;
        }
        if (finalY < margin) {
            finalY = margin;
        }

        // Apply position
        element.style.left = `${finalX}px`;
        element.style.top = `${finalY}px`;

        return { x: finalX, y: finalY };
    }

    /**
     * Create CSS transform string for element positioning
     *
     * @param {number} translateX - X translation in pixels
     * @param {number} translateY - Y translation in pixels
     * @param {number} scale - Scale factor (default 1)
     * @returns {string} CSS transform string
     */
    static createTransform(translateX, translateY, scale = 1) {
        return `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    /**
     * Parse numeric value with fallback
     *
     * @param {any} value - Value to parse
     * @param {number} fallback - Fallback value if parsing fails
     * @returns {number} Parsed number or fallback
     */
    static parseNumericValue(value, fallback = 0) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }

    /**
     * Clamp value between min and max bounds
     *
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum bound
     * @param {number} max - Maximum bound
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    /**
     * Create shaper attribute name with namespace
     *
     * @param {string} attr - Attribute name
     * @returns {string} Namespaced attribute name
     */
    static createShaperAttribute(attr) {
        return `shaper:${attr}`;
    }

    /**
     * Create element description template
     *
     * @param {string} type - Element type
     * @param {Object} measurements - Measurement values
     * @returns {string} Formatted description
     */
    formatElementDescription(type, measurements) {
        if (!this.measurementSystem) return `${type} element`;

        switch (type.toLowerCase()) {
            case 'circle':
                return `Circle: ⌀${this.formatPixelsToDisplay(measurements.diameter)}; Radius: ${this.formatPixelsToDisplay(measurements.radius)}`;
            case 'line':
                const length = this.formatPixelsToDisplay(measurements.length);
                const angle = this.measurementSystem.formatAngle(measurements.angle);
                return `Line - Length: ${length}; Angle: ${angle}°`;
            default:
                if (measurements.width && measurements.height) {
                    return `${type} - W: ${this.formatPixelsToDisplay(measurements.width)}; H: ${this.formatPixelsToDisplay(measurements.height)}`;
                }
                return `${type.charAt(0).toUpperCase() + type.slice(1)} element`;
        }
    }

    /**
     * Debounce function calls to prevent excessive execution
     *
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
}

// Export for use in other modules
window.DRYUtilities = DRYUtilities;