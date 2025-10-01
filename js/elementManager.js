/**
 * Element Manager Module - SVG Element State and Measurement Management
 *
 * Manages SVG element selection states, hover tracking, and measurement
 * calculations. Provides centralized interface for element operations
 * including dimension queries and visual state management.
 *
 * Key Features:
 * - Element selection and hover state management
 * - Cached dimension data retrieval via element data map
 * - Smart element description generation with unit conversion
 * - Integration with measurement system for unit display
 * - SVG geometry calculations for complex elements
 */
class ElementManager {
    /**
     * Initialize element manager with system dependencies
     *
     * @param {MeasurementSystem} measurementSystem - Unit conversion and formatting
     * @param {FileManager} fileManager - SVG file operations
     * @param {Map} elementDataMap - Cached element dimension data
     */
    constructor(measurementSystem, fileManager, elementDataMap) {
        this.measurementSystem = measurementSystem;
        this.fileManager = fileManager;
        this.elementDataMap = elementDataMap; // Cached element data storage
        this.selectedPaths = new Set(); // Multiple selection support
        this.hoveredPath = null;
        this.svgHelper = new SVGHelper();
    }

    /**
     * Select SVG path element with multi-selection support
     *
     * @param {Element} path - SVG path to select
     * @param {boolean} multiSelect - If true, add to selection; if false, replace selection
     */
    selectPath(path, multiSelect = false) {
        if (!multiSelect) {
            // Clear all previous selections
            this.clearSelection();
        }

        if (path) {
            if (this.selectedPaths.has(path)) {
                // Deselect if already selected (toggle behavior)
                this.deselectPath(path);
            } else {
            // Add to selection
                path.classList.add(ShaperConstants.CSS_CLASSES.SELECTED);
                this.selectedPaths.add(path);
            }
        }
    }

    /**
     * Deselect a specific path
     * @param {Element} path - SVG path to deselect
     */
    deselectPath(path) {
        if (path && this.selectedPaths.has(path)) {
            path.classList.remove(ShaperConstants.CSS_CLASSES.SELECTED);
            this.selectedPaths.delete(path);
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedPaths.forEach(path => {
            path.classList.remove(ShaperConstants.CSS_CLASSES.SELECTED);
        });
        this.selectedPaths.clear();
    }

    /**
     * Track hovered element for tooltip and interaction feedback
     * @param {Element|null} path - SVG path being hovered, or null
     */
    setHoveredPath(path) {
        this.hoveredPath = path;
    }

    /**
     * Get currently selected SVG path elements
     * @returns {Set} Set of selected paths
     */
    getSelectedPaths() {
        return this.selectedPaths;
    }

    /**
     * Get the first selected path (for backward compatibility)
     * @returns {Element|null} First selected path or null if none selected
     */
    getSelectedPath() {
        return this.selectedPaths.size > 0 ? this.selectedPaths.values().next().value : null;
    }

    /**
     * Get currently hovered SVG path element
     * @returns {Element|null} Hovered path or null if none hovered
     */
    getHoveredPath() {
        return this.hoveredPath;
    }

    /**
     * Retrieve cached dimension data for SVG element
     *
     * Accesses pre-calculated element dimensions from the element data map
     * using the element's application ID. Returns cached measurements and
     * shaper attributes for efficient access without recalculation.
     *
     * @param {Element} element - SVG element with app-id data attribute
     * @returns {Object} Cached dimension data including measurements and attributes
     */
    getElementDimensions(element) {
        if (!element || !element.dataset.appId) {
            return {};
        }
        const appId = element.dataset.appId;
        const dimensions = this.elementDataMap.get(appId);
        return dimensions || {};
    }

    /**
     * Generate user-friendly element description with measurements
     *
     * Creates descriptive text for SVG elements including geometry type
     * and key measurements in current units. Handles special cases like
     * circles and lines with appropriate formatting.
     *
     * @param {Element} element - SVG element to describe
     * @returns {string} Human-readable element description with measurements
     */
    getElementDescription(element) {
        const dimensions = this.getElementDimensions(element);
        if (!dimensions || !dimensions.tagName) return "Unknown Element";

        const tagName = dimensions.tagName;

        // Special handling for circular elements
        if (dimensions.isCircle) {
            const { diameterPx, radiusPx } = dimensions;
            const diameter = this.measurementSystem.convertPixelsToCurrentUnit(diameterPx);
            const radius = this.measurementSystem.convertPixelsToCurrentUnit(radiusPx);
            return `Circle: ⌀${this.measurementSystem.formatDisplayNumber(diameter)}${this.measurementSystem.units}; Radius: ${this.measurementSystem.formatDisplayNumber(radius)}${this.measurementSystem.units}`;
        }

        // Handle different SVG element types with appropriate descriptions
        switch (tagName) {
            case 'rect':
            case 'ellipse':
            case 'polygon':
            case 'polyline':
            case 'path':
                {
                    const { widthPx, heightPx } = dimensions;
                    const width = this.measurementSystem.convertPixelsToCurrentUnit(widthPx);
                    const height = this.measurementSystem.convertPixelsToCurrentUnit(heightPx);
                    const shapeName = tagName.charAt(0).toUpperCase() + tagName.slice(1);
                    if (width > 0 || height > 0) {
                        return `${shapeName} - W: ${this.measurementSystem.formatDisplayNumber(width)}${this.measurementSystem.units}; H: ${this.measurementSystem.formatDisplayNumber(height)}${this.measurementSystem.units}`;
                    } else {
                        return `${shapeName} (complex geometry)`;
                    }
                }
            case 'line':
                {
                    // Calculate line length and angle from bounding box dimensions
                    const { width, height } = dimensions;
                    const length = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
                    const angle = Math.atan2(height, width) * (180 / Math.PI);
                    return `Line - Length: ${this.measurementSystem.formatDisplayNumber(length)}${this.measurementSystem.units}; Angle: ${this.measurementSystem.formatAngle(angle)}°`;
                }
            default:
                return `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} element`;
        }
    }

    /**
     * Extract detailed measurements for tooltip display
     *
     * Provides structured measurement data for tooltips with proper unit
     * conversion and formatting. Returns different measurement sets based
     * on element geometry type (circles, rectangles, lines, etc.).
     *
     * @param {Element} element - SVG element to extract measurements from
     * @returns {Array} Array of measurement objects with name and formatted value
     */
    getElementMeasurements(element) {
        const measurements = [];
        const dimensions = this.getElementDimensions(element);
        if (!dimensions || !dimensions.tagName) return measurements;

        const tagName = dimensions.tagName;

        // Special measurement handling for circular elements
        if (dimensions.isCircle) {
            const { diameterPx, radiusPx } = dimensions;
            const diameter = this.measurementSystem.convertPixelsToCurrentUnit(diameterPx);
            const radius = this.measurementSystem.convertPixelsToCurrentUnit(radiusPx);
            measurements.push(
                { name: 'Diameter', value: `${this.measurementSystem.formatDisplayNumber(diameter)}${this.measurementSystem.units}` },
                { name: 'Radius', value: `${this.measurementSystem.formatDisplayNumber(radius)}${this.measurementSystem.units}` }
            );
            return measurements;
        }

        // Generate measurements based on element geometry type
        switch (tagName) {
            case 'rect':
            case 'ellipse':
            case 'polygon':
            case 'polyline':
            case 'path':
                {
                    // Standard width/height measurements for bounding box elements
                    const { widthPx, heightPx } = dimensions;
                    if (widthPx > 0) {
                        const width = this.measurementSystem.convertPixelsToCurrentUnit(widthPx);
                        measurements.push({ name: 'Width', value: `${this.measurementSystem.formatDisplayNumber(width)}${this.measurementSystem.units}` });
                    }
                    if (heightPx > 0) {
                        const height = this.measurementSystem.convertPixelsToCurrentUnit(heightPx);
                        measurements.push({ name: 'Height', value: `${this.measurementSystem.formatDisplayNumber(height)}${this.measurementSystem.units}` });
                    }
                    break;
                }
            case 'line':
                {
                    // Line-specific measurements: length and angle
                    const { widthPx, heightPx } = dimensions;
                    const lengthPx = Math.sqrt(Math.pow(widthPx, 2) + Math.pow(heightPx, 2));
                    const length = this.measurementSystem.convertPixelsToCurrentUnit(lengthPx);
                    const angle = Math.atan2(heightPx, widthPx) * (180 / Math.PI);
                    measurements.push(
                        { name: 'Length', value: `${this.measurementSystem.formatDisplayNumber(length)}${this.measurementSystem.units}` },
                        { name: 'Angle', value: `${this.measurementSystem.formatAngle(angle)}°` }
                    );
                    break;
                }
        }

        return measurements;
    }

    /**
     * Extract coordinate points from SVG path data string
     *
     * Parses path data strings to extract numeric coordinate pairs.
     * Provides coordinate data for path analysis and measurement
     * calculations on complex geometries.
     *
     * @param {string} pathData - SVG path data string (d attribute)
     * @returns {Array} Array of {x, y} coordinate objects
     */
    extractPathCoordinates(pathData) {
        const coords = [];
        if (!pathData) return coords;

        // Extract numeric values from path string
        const matches = pathData.match(/[-+]?\d*\.?\d+/g);
        if (matches) {
            // Group consecutive numbers into coordinate pairs
            for (let i = 0; i < matches.length; i += 2) {
                if (i + 1 < matches.length) {
                    coords.push({
                        x: parseFloat(matches[i]),
                        y: parseFloat(matches[i + 1])
                    });
                }
            }
        }
        return coords;
    }

    createPathOverlay(originalPath) {
        // Get the app-id from the original path for tracking
        const appId = originalPath.getAttribute('delta-app-id');

        // All visual styling is now handled by CSS classes - no inline attributes needed
        const overlayAttributes = {
            class: `${ShaperConstants.CSS_CLASSES.OVERLAY} ${ShaperConstants.CSS_CLASSES.NO_EXPORT}`
        };

        // Add delta-for-id for tracking which element this overlay belongs to
        // (avoids conflicts with existing delta-app-id filtering logic)
        if (appId) {
            overlayAttributes['delta-for-id'] = `${appId}`;
        }

        const overlay = this.svgHelper.createOverlayElement(originalPath, overlayAttributes);
        // No inline styles needed - everything handled by CSS classes
        return overlay;
    }
}

window.ElementManager = ElementManager;