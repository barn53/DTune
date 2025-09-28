// SVG Helper Class
// Handles SVG manipulation, cleaning, and serialization operations

class SVGHelper {
    constructor() {
        // Initialize with reference to common dependencies
    }

    /**
     * Creates a clean copy of an SVG element suitable for export
     * Removes all temporary elements, overlays, and viewport-related attributes
     * @param {Element} svgElement - The SVG element to clean
     * @param {boolean} removeViewportAttributes - Whether to remove viewport transforms (default: true)
     * @param {FileManager} fileManager - Optional FileManager instance for export preparation
     * @returns {Element} Clean copy of the SVG element
     */
    createCleanSVGCopy(svgElement, removeViewportAttributes = true, fileManager = null) {
        if (!svgElement) {
            console.warn('SVGHelper.createCleanSVGCopy: No SVG element provided');
            return null;
        }

        // Create a deep copy of the SVG element
        const cleanSVG = svgElement.cloneNode(true);

        // Remove viewport-related attributes/styles if requested
        if (removeViewportAttributes) {
            this.removeViewportAttributes(cleanSVG);
        }

        // Remove all overlay and temporary elements
        this.removeOverlayElements(cleanSVG);

        // Remove boundary elements
        this.removeBoundaryElements(cleanSVG);

        // Clean up temporary classes and attributes on all elements
        this.cleanupTemporaryAttributes(cleanSVG, fileManager);

        return cleanSVG;
    }

    /**
     * Removes viewport-related transforms and styles from SVG
     * @param {Element} svgElement - The SVG element to clean
     */
    removeViewportAttributes(svgElement) {
        // Remove transform styles that are viewport-related
        if (svgElement.style) {
            svgElement.style.transform = '';

            // If style attribute is empty after removing transform, remove it entirely
            if (!svgElement.style.cssText || svgElement.style.cssText.trim() === '') {
                svgElement.removeAttribute('style');
            }
        }

        // Remove any viewport-specific attributes if they exist
        const viewportAttributes = ['data-zoom', 'data-pan-x', 'data-pan-y'];
        viewportAttributes.forEach(attr => {
            if (svgElement.hasAttribute(attr)) {
                svgElement.removeAttribute(attr);
            }
        });
    }

    /**
     * Removes all overlay elements from the SVG
     * @param {Element} svgElement - The SVG element to clean
     */
    removeOverlayElements(svgElement) {
        // Remove all elements marked as no-export
        const noExportElements = svgElement.querySelectorAll(`.${ShaperConstants.CSS_CLASSES.NO_EXPORT}`);
        noExportElements.forEach(element => element.remove());
    }

    /**
     * Removes boundary outline elements from the SVG
     * @param {Element} svgElement - The SVG element to clean
     */
    removeBoundaryElements(svgElement) {
        const boundarySelectors = [
            `.${ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE}`,
            '.boundary-outline',
            '.boundary-element',
            '.boundary-highlight', // Remove highlighted boundary elements
            '.svg-boundary-outline' // Additional safety for boundary elements
        ];

        boundarySelectors.forEach(selector => {
            const boundaries = svgElement.querySelectorAll(selector);
            boundaries.forEach(boundary => boundary.remove());
        });
    }

    /**
     * Cleans up temporary attributes and classes from all elements
     * @param {Element} svgElement - The SVG element to clean
     * @param {FileManager} fileManager - Optional FileManager instance for export preparation
     */
    cleanupTemporaryAttributes(svgElement, fileManager = null) {
        // Get all paths and other shaper elements
        const elements = svgElement.querySelectorAll(ShaperConstants.ELEMENT_SELECTORS);

        elements.forEach(element => {
            // Remove temporary CSS classes first
            this.removeTemporaryClasses(element);

            // Prepare element for export if FileManager is provided
            if (fileManager && typeof fileManager.prepareElementForExport === 'function') {
                fileManager.prepareElementForExport(element);
            } else {
                // Basic cleanup if no FileManager available
                ShaperUtils.removeTempClasses(element);
                ShaperUtils.removeAllRawAttributes(element);
            }
        });

        // Ensure shaper namespace is properly set
        this.ensureShaperNamespace(svgElement);
    }

    /**
     * Removes temporary CSS classes from an element
     * @param {Element} element - The element to clean
     */
    removeTemporaryClasses(element) {
        // Only remove the no-export class (other temporary classes are fine to keep in exported SVG)
        element.classList.remove(ShaperConstants.CSS_CLASSES.NO_EXPORT);
    }    /**
     * Serializes an SVG element to a clean XML string
     * @param {Element} svgElement - The SVG element to serialize
     * @param {boolean} createCleanCopy - Whether to create a clean copy first (default: true)
     * @returns {string} Serialized SVG string
     */
    serializeSVG(svgElement, createCleanCopy = true) {
        if (!svgElement) {
            console.warn('SVGHelper.serializeSVG: No SVG element provided');
            return '';
        }

        let elementToSerialize = svgElement;

        if (createCleanCopy) {
            elementToSerialize = this.createCleanSVGCopy(svgElement);
            if (!elementToSerialize) {
                return '';
            }
        }

        // Use XMLSerializer to convert to string
        const serializer = new XMLSerializer();
        return serializer.serializeToString(elementToSerialize);
    }

    /**
     * Gets the currently displayed SVG element from the DOM
     * @returns {Element|null} The displayed SVG element or null if not found
     */
    getDisplayedSVG() {
        return document.querySelector('#svgContent svg');
    }

    /**
     * Creates a clean copy of the currently displayed SVG
     * @param {boolean} removeViewportAttributes - Whether to remove viewport transforms
     * @returns {Element|null} Clean copy of the displayed SVG or null if not found
     */
    createCleanDisplayedSVGCopy(removeViewportAttributes = true) {
        const displayedSVG = this.getDisplayedSVG();
        return this.createCleanSVGCopy(displayedSVG, removeViewportAttributes);
    }

    /**
     * Gets a clean serialized string of the currently displayed SVG
     * @param {FileManager} fileManager - Optional FileManager instance for proper export preparation
     * @returns {string} Clean SVG string ready for export/storage
     */
    getCleanDisplayedSVGString(fileManager = null) {
        const displayedSVG = this.getDisplayedSVG();
        if (!displayedSVG) {
            return '';
        }

        const cleanCopy = this.createCleanSVGCopy(displayedSVG, true, fileManager);
        return this.serializeSVG(cleanCopy, false); // Don't create another clean copy
    }

    /**
     * Validates that an SVG element is valid and contains expected structure
     * @param {Element} svgElement - The SVG element to validate
     * @returns {boolean} True if valid SVG structure
     */
    validateSVGStructure(svgElement) {
        if (!svgElement) {
            return false;
        }

        // Check if it's actually an SVG element
        if (svgElement.tagName.toLowerCase() !== 'svg') {
            return false;
        }

        // Check for basic SVG attributes
        const hasValidNamespace = svgElement.namespaceURI === 'http://www.w3.org/2000/svg';

        return hasValidNamespace;
    }

    /**
     * Ensures proper shaper namespace is set on SVG for export
     * @param {Element} svgElement - The SVG element to update
     */
    ensureShaperNamespace(svgElement) {
        if (svgElement && !svgElement.hasAttribute(`xmlns:${ShaperConstants.NAMESPACE_PREFIX}`)) {
            svgElement.setAttribute(`xmlns:${ShaperConstants.NAMESPACE_PREFIX}`, ShaperConstants.NAMESPACE);
        }
    }

    // =================
    // COMMON SVG OPERATIONS
    // =================

    /**
     * Creates an SVG element with proper namespace
     * @param {string} tagName - The SVG element tag name (e.g., 'path', 'rect', 'circle')
     * @param {Object} attributes - Optional attributes to set on the element
     * @returns {Element} New SVG element
     */
    createSVGElement(tagName, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);

        // Set any provided attributes
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        return element;
    }

    /**
     * Gets the root SVG element from various contexts
     * @param {Element} contextElement - Optional element to search from (uses ownerDocument)
     * @param {string} containerId - Optional container ID to search within (default: 'svgContent')
     * @returns {Element|null} The SVG root element or null if not found
     */
    getSVGRoot(contextElement = null, containerId = 'svgContent') {
        if (contextElement) {
            // Use ownerDocument to find SVG root from any element within SVG
            return contextElement.ownerDocument.querySelector('svg');
        }

        // Default: search within specified container
        const container = document.getElementById(containerId);
        return container ? container.querySelector('svg') : null;
    }

    /**
     * Clones an SVG element and optionally inserts it into a container
     * @param {Element} svgElement - The SVG element to clone
     * @param {Element} targetContainer - Optional container to insert clone into
     * @param {boolean} deep - Whether to perform deep clone (default: true)
     * @returns {Element} The cloned element
     */
    cloneSVGElement(svgElement, targetContainer = null, deep = true) {
        if (!svgElement) {
            console.warn('SVGHelper.cloneSVGElement: No SVG element provided');
            return null;
        }

        const clone = svgElement.cloneNode(deep);

        if (targetContainer) {
            targetContainer.appendChild(clone);
        }

        return clone;
    }

    /**
     * Creates a path element with specified path data and attributes
     * @param {string} pathData - The SVG path data (d attribute)
     * @param {Object} attributes - Additional attributes for the path
     * @returns {Element} New path element
     */
    createPath(pathData, attributes = {}) {
        return this.createSVGElement('path', {
            d: pathData,
            ...attributes
        });
    }

    /**
     * Creates an overlay element for interaction (common pattern in the app)
     * @param {Element} originalElement - Element to create overlay for
     * @param {Object} overlayAttributes - Attributes for the overlay
     * @returns {Element} New overlay element
     */
    createOverlayElement(originalElement, overlayAttributes = {}) {
        if (!originalElement) {
            console.warn('SVGHelper.createOverlayElement: No original element provided');
            return null;
        }

        const overlay = this.createSVGElement(originalElement.tagName);

        // Copy essential geometric attributes
        const geometricAttrs = ['d', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height'];
        geometricAttrs.forEach(attr => {
            if (originalElement.hasAttribute(attr)) {
                overlay.setAttribute(attr, originalElement.getAttribute(attr));
            }
        });

        // Apply overlay-specific attributes
        Object.entries(overlayAttributes).forEach(([key, value]) => {
            overlay.setAttribute(key, value);
        });

        return overlay;
    }

    /**
     * Safely gets the bounding box of an SVG element
     * @param {Element} element - The SVG element
     * @returns {Object|null} Bounding box object or null if error
     */
    getSafeBBox(element) {
        try {
            return element.getBBox();
        } catch (error) {
            console.warn('SVGHelper.getSafeBBox: Could not get bounding box', error);
            return null;
        }
    }

    /**
     * Creates a boundary outline path for an SVG element
     * @param {Element} svgElement - The SVG element to create boundary for
     * @param {Object} attributes - Additional attributes for the boundary
     * @returns {Element} Boundary outline path element
     */
    createBoundaryOutline(svgElement, attributes = {}) {
        // Get viewBox or fall back to width/height
        let x = 0, y = 0, width = 400, height = 300;

        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            [x, y, width, height] = viewBox.split(' ').map(Number);
        } else {
            width = parseFloat(svgElement.getAttribute('width')) || 400;
            height = parseFloat(svgElement.getAttribute('height')) || 300;
        }

        // Create boundary outline as a path
        const pathData = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;

        const defaultAttributes = {
            d: pathData,
            class: `${ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE} ${ShaperConstants.CSS_CLASSES.NO_EXPORT}`
        };

        return this.createSVGElement('path', { ...defaultAttributes, ...attributes });
    }
}

// Export for use in other modules
window.SVGHelper = SVGHelper;