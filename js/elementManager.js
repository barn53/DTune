// Element Manager Module
// Handles SVG element selection, measurements, and overlays

class ElementManager {
    constructor(measurementSystem, fileManager, elementDataMap) {
        this.measurementSystem = measurementSystem;
        this.fileManager = fileManager;
        this.elementDataMap = elementDataMap; // Store the map
        this.selectedPath = null;
        this.hoveredPath = null;
        this.svgHelper = new SVGHelper();
    }

    selectPath(path) {
        const previousSelected = document.querySelector(`.${ShaperConstants.CSS_CLASSES.SELECTED}`);
        if (previousSelected) {
            previousSelected.classList.remove(ShaperConstants.CSS_CLASSES.SELECTED);
        }
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

    getElementDimensions(element) {
        if (!element || !element.dataset.appId) {
            return {};
        }
        const appId = element.dataset.appId;
        const dimensions = this.elementDataMap.get(appId);
        return dimensions || {};
    }

    // Element description generation
    getElementDescription(element) {
        const dimensions = this.getElementDimensions(element);
        if (!dimensions || !dimensions.tagName) return "Unknown Element";

        const tagName = dimensions.tagName;

        if (dimensions.isCircle) {
            const { diameterPx, radiusPx } = dimensions;
            const diameter = this.measurementSystem.convertPixelsToCurrentUnit(diameterPx);
            const radius = this.measurementSystem.convertPixelsToCurrentUnit(radiusPx);
            return `Circle: ⌀${this.measurementSystem.formatDisplayNumber(diameter)}${this.measurementSystem.units}; Radius: ${this.measurementSystem.formatDisplayNumber(radius)}${this.measurementSystem.units}`;
        }

        // --- REVISED: 'line' gets special handling again, but calculated from BBox ---
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
                    const { width, height } = dimensions;
                    const length = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
                    const angle = Math.atan2(height, width) * (180 / Math.PI);
                    return `Line - Length: ${this.measurementSystem.formatDisplayNumber(length)}${this.measurementSystem.units}; Angle: ${this.measurementSystem.formatAngle(angle)}°`;
                }
            default:
                return `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} element`;
        }
    }

    // Element measurements for tooltips
    getElementMeasurements(element) {
        const measurements = [];
        const dimensions = this.getElementDimensions(element);
        if (!dimensions || !dimensions.tagName) return measurements;

        const tagName = dimensions.tagName;

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

        // --- REVISED: 'line' gets special handling again, but calculated from BBox ---
        switch (tagName) {
            case 'rect':
            case 'ellipse':
            case 'polygon':
            case 'polyline':
            case 'path':
                {
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

    extractPathCoordinates(pathData) {
        const coords = [];
        if (!pathData) return coords;
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

    createPathOverlay(originalPath) {
        const overlay = this.svgHelper.createOverlayElement(originalPath, {
            fill: 'transparent',
            stroke: 'transparent',
            'stroke-width': '10',
            'pointer-events': 'all',
            cursor: 'pointer',
            class: `${ShaperConstants.CSS_CLASSES.OVERLAY} ${ShaperConstants.CSS_CLASSES.NO_EXPORT}`
        });
        overlay.style.setProperty('pointer-events', 'all', 'important');
        return overlay;
    }
}

window.ElementManager = ElementManager;