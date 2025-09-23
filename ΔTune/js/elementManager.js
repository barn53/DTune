// Element Manager Module
// Handles SVG element selection, measurements, and overlays

class ElementManager {
    constructor(measurementSystem) {
        this.measurementSystem = measurementSystem;
        this.selectedPath = null;
        this.hoveredPath = null;

        // Initialize SVG helper for SVG operations
        this.svgHelper = new SVGHelper();
    }

    // Element selection
    selectPath(path) {
        // Remove previous selection
        const previousSelected = document.querySelector(`.${ShaperConstants.CSS_CLASSES.SELECTED}`);
        if (previousSelected) {
            previousSelected.classList.remove(ShaperConstants.CSS_CLASSES.SELECTED);
        }

        // Add selection to new path
        if (path) {
            path.classList.add(ShaperConstants.CSS_CLASSES.SELECTED);
            this.selectedPath = path;
        } else {
            this.selectedPath = null;
        }
    }

    setHoveredPath(path) {
        this.hoveredPath = path;
    }

    getSelectedPath() {
        return this.selectedPath;
    }

    getHoveredPath() {
        return this.hoveredPath;
    }

    // Element dimension calculations
    getElementDimensions(element) {
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'rect': {
                const width = this.measurementSystem.pixelsToUnits(parseFloat(element.getAttribute('width')) || 0);
                const height = this.measurementSystem.pixelsToUnits(parseFloat(element.getAttribute('height')) || 0);
                return { width, height };
            }

            case 'circle': {
                const r = this.measurementSystem.pixelsToUnits(parseFloat(element.getAttribute('r')) || 0);
                const diameter = r * 2;
                return { radius: r, diameter };
            }

            case 'ellipse': {
                const rx = this.measurementSystem.pixelsToUnits(parseFloat(element.getAttribute('rx')) || 0);
                const ry = this.measurementSystem.pixelsToUnits(parseFloat(element.getAttribute('ry')) || 0);
                const width = rx * 2;
                const height = ry * 2;
                return { width, height };
            }

            case 'line': {
                const x1 = parseFloat(element.getAttribute('x1')) || 0;
                const y1 = parseFloat(element.getAttribute('y1')) || 0;
                const x2 = parseFloat(element.getAttribute('x2')) || 0;
                const y2 = parseFloat(element.getAttribute('y2')) || 0;

                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const lengthInUnits = this.measurementSystem.pixelsToUnits(length);

                // Calculate angle in degrees from horizontal
                const angleRadians = Math.atan2(y2 - y1, x2 - x1);
                const angleDegrees = angleRadians * (180 / Math.PI);

                return { length: lengthInUnits, angle: angleDegrees };
            }

            case 'polygon':
            case 'polyline': {
                const bbox = this.svgHelper.getSafeBBox(element);
                if (!bbox) return {};
                const width = this.measurementSystem.pixelsToUnits(bbox.width);
                const height = this.measurementSystem.pixelsToUnits(bbox.height);
                return { width, height };
            }

            case 'path': {
                try {
                    const bbox = this.svgHelper.getSafeBBox(element);
                    if (!bbox) return {};
                    const width = this.measurementSystem.pixelsToUnits(bbox.width);
                    const height = this.measurementSystem.pixelsToUnits(bbox.height);
                    return { width, height };
                } catch (e) {
                    console.warn('Could not get bounding box for path element');
                    return { width: 0, height: 0 };
                }
            }

            default:
                return {};
        }
    }

    // Element description generation
    getElementDescription(element) {
        const tagName = element.tagName.toLowerCase();
        const dimensions = this.getElementDimensions(element);

        switch (tagName) {
            case 'rect': {
                const { width, height } = dimensions;
                return `Rectangle - Width: ${this.measurementSystem.formatGridNumber(width)}${this.measurementSystem.units}; Height: ${this.measurementSystem.formatGridNumber(height)}${this.measurementSystem.units}`;
            }

            case 'circle': {
                const { diameter, radius } = dimensions;
                return `Circle: ⌀${this.measurementSystem.formatGridNumber(diameter)}${this.measurementSystem.units}; Radius: ${this.measurementSystem.formatGridNumber(radius)}${this.measurementSystem.units}`;
            }

            case 'ellipse': {
                const { width, height } = dimensions;
                return `Ellipse - Width: ${this.measurementSystem.formatGridNumber(width)}${this.measurementSystem.units}; Height: ${this.measurementSystem.formatGridNumber(height)}${this.measurementSystem.units}`;
            }

            case 'line': {
                const { length, angle } = dimensions;
                return `Line - Length: ${this.measurementSystem.formatGridNumber(length)}${this.measurementSystem.units}; Angle: ${this.measurementSystem.formatAngle(angle)}°`;
            }

            case 'polygon':
            case 'polyline': {
                const { width, height } = dimensions;
                const shapeName = tagName === 'polygon' ? 'Polygon' : 'Polyline';
                return `${shapeName} - Width: ${this.measurementSystem.formatGridNumber(width)}${this.measurementSystem.units}; Height: ${this.measurementSystem.formatGridNumber(height)}${this.measurementSystem.units}`;
            }

            case 'path': {
                const { width, height } = dimensions;
                if (width > 0 || height > 0) {
                    return `Path - Width: ${this.measurementSystem.formatGridNumber(width)}${this.measurementSystem.units}; Height: ${this.measurementSystem.formatGridNumber(height)}${this.measurementSystem.units}`;
                } else {
                    return 'Path (complex geometry)';
                }
            }

            default:
                return `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} element`;
        }
    }

    // Element measurements for tooltips
    getElementMeasurements(element) {
        const measurements = [];
        const dimensions = this.getElementDimensions(element);
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'rect': {
                const { width, height } = dimensions;
                measurements.push(
                    { name: 'Width', value: `${this.measurementSystem.formatGridNumber(width)}${this.measurementSystem.units}` },
                    { name: 'Height', value: `${this.measurementSystem.formatGridNumber(height)}${this.measurementSystem.units}` }
                );
                break;
            }

            case 'circle': {
                const { diameter, radius } = dimensions;
                measurements.push(
                    { name: 'Diameter', value: `${this.measurementSystem.formatGridNumber(diameter)}${this.measurementSystem.units}` },
                    { name: 'Radius', value: `${this.measurementSystem.formatGridNumber(radius)}${this.measurementSystem.units}` }
                );
                break;
            }

            case 'ellipse': {
                const { width, height } = dimensions;
                measurements.push(
                    { name: 'Width', value: `${this.measurementSystem.formatGridNumber(width)}${this.measurementSystem.units}` },
                    { name: 'Height', value: `${this.measurementSystem.formatGridNumber(height)}${this.measurementSystem.units}` }
                );
                break;
            }

            case 'line': {
                const { length, angle } = dimensions;
                measurements.push(
                    { name: 'Length', value: `${this.measurementSystem.formatGridNumber(length)}${this.measurementSystem.units}` },
                    { name: 'Angle', value: `${this.measurementSystem.formatAngle(angle)}°` }
                );
                break;
            }

            case 'polygon':
            case 'polyline':
            case 'path': {
                const { width, height } = dimensions;
                if (width > 0) {
                    measurements.push({ name: 'Width', value: `${this.measurementSystem.formatGridNumber(width)}${this.measurementSystem.units}` });
                }
                if (height > 0) {
                    measurements.push({ name: 'Height', value: `${this.measurementSystem.formatGridNumber(height)}${this.measurementSystem.units}` });
                }
                break;
            }
        }

        return measurements;
    }

    // Path coordinate extraction
    extractPathCoordinates(pathData) {
        const coords = [];
        if (!pathData) return coords;

        // Simple regex to extract coordinate pairs
        const matches = pathData.match(/[-+]?\d*\.?\d+/g);
        if (matches) {
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

    // SVG overlay creation for click handling
    createPathOverlay(originalPath) {
        const overlay = this.svgHelper.createOverlayElement(originalPath, {
            fill: 'transparent',
            stroke: 'transparent',
            'stroke-width': '10',
            'pointer-events': 'all',
            cursor: 'pointer',
            class: `${ShaperConstants.CSS_CLASSES.OVERLAY} ${ShaperConstants.CSS_CLASSES.NO_EXPORT}`
        });

        // Ensure pointer-events is set via style as well
        overlay.style.setProperty('pointer-events', 'all', 'important');

        return overlay;
    }
}

// Export for use in other modules
window.ElementManager = ElementManager;