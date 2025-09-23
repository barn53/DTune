// Shaper Constants and Utilities
// Centralized configuration and utility functions to eliminate code duplication

class ShaperConstants {
    // Shaper attribute configuration
    static NAMESPACE = 'http://www.shapertools.com/namespaces/shaper';
    static NAMESPACE_PREFIX = 'shaper';

    // Measurement attributes (require unit conversion)
    static MEASUREMENT_ATTRIBUTES = ['cutDepth', 'cutOffset', 'toolDia'];

    // Non-measurement attributes (stored as-is)
    static SIMPLE_ATTRIBUTES = ['cutType'];

    // All shaper attributes
    static ALL_ATTRIBUTES = [...this.MEASUREMENT_ATTRIBUTES, ...this.SIMPLE_ATTRIBUTES];

    // Raw attribute names for internal storage
    static getRawAttributeName(attr) {
        return this.SIMPLE_ATTRIBUTES.includes(attr)
            ? `shaper-${attr}-raw`
            : `shaper-${attr}-raw-mm`;
    }

    // Namespaced attribute names for export
    static getNamespacedAttributeName(attr) {
        return `${this.NAMESPACE_PREFIX}:${attr}`;
    }

    // Input validation patterns
    static EMPTY_VALUES = ['', '0', '0.0', '0,0'];

    // Check if value is considered empty
    static isEmptyValue(value) {
        return this.EMPTY_VALUES.includes(value?.trim?.() || '');
    }

    // CSS class names
    static CSS_CLASSES = {
        SELECTED: 'path-selected',
        HOVER: 'hover-active',
        OVERLAY: 'path-overlay',
        BOUNDARY_OUTLINE: 'svg-boundary-outline',
        NO_EXPORT: 'no-export'
    };

    // Element selectors that have shaper functionality
    static ELEMENT_SELECTORS = 'path, rect, circle, ellipse, line, polygon, polyline';
}

// Shaper Utilities - Common operations to reduce duplication
class ShaperUtils {
    // Sync a single attribute between elements
    static syncAttribute(fromElement, toElement, attrName) {
        const value = fromElement.getAttribute(attrName);
        if (value !== null) {
            toElement.setAttribute(attrName, value);
        } else {
            toElement.removeAttribute(attrName);
        }
    }

    // Sync all shaper attributes between elements
    static syncAllShaperAttributes(fromElement, toElement) {
        ShaperConstants.ALL_ATTRIBUTES.forEach(attr => {
            const rawAttrName = ShaperConstants.getRawAttributeName(attr);
            this.syncAttribute(fromElement, toElement, rawAttrName);
        });
    }

    // Set or remove raw attribute based on value
    static setRawAttribute(element, attr, rawValue) {
        const attrName = ShaperConstants.getRawAttributeName(attr);

        if (rawValue !== null && rawValue !== undefined && rawValue > 0) {
            element.setAttribute(attrName, rawValue.toString());
        } else {
            element.removeAttribute(attrName);
        }
    }

    // Get raw attribute value as number
    static getRawAttributeValue(element, attr) {
        const attrName = ShaperConstants.getRawAttributeName(attr);
        const value = element.getAttribute(attrName);
        return value ? parseFloat(value) : null;
    }

    // Set namespaced attribute for export
    static setNamespacedAttribute(element, attr, value) {
        if (value && value.trim() !== '') {
            // Ensure namespace is declared on root SVG
            const svgHelper = new SVGHelper();
            const svgRoot = svgHelper.getSVGRoot(element);
            svgHelper.ensureShaperNamespace(svgRoot);

            element.setAttributeNS(ShaperConstants.NAMESPACE, ShaperConstants.getNamespacedAttributeName(attr), value);
        } else {
            element.removeAttributeNS(ShaperConstants.NAMESPACE, attr);
        }
    }

    // Remove all raw attributes from element
    static removeAllRawAttributes(element) {
        ShaperConstants.ALL_ATTRIBUTES.forEach(attr => {
            element.removeAttribute(ShaperConstants.getRawAttributeName(attr));
        });
    }

    // Remove temporary CSS classes
    static removeTempClasses(element) {
        element.classList.remove(ShaperConstants.CSS_CLASSES.SELECTED, ShaperConstants.CSS_CLASSES.HOVER);
    }

    // Find corresponding element in another SVG by index and tag
    static findCorrespondingElement(sourceElement, targetSVG) {
        console.log('findCorrespondingElement called'); // Debug log
        if (!targetSVG || !sourceElement) {
            console.log('Missing targetSVG or sourceElement'); // Debug log
            return null;
        }

        // Skip if source element is an overlay or boundary element
        if (sourceElement.classList.contains(ShaperConstants.CSS_CLASSES.OVERLAY) ||
            sourceElement.classList.contains(ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE)) {
            console.log('Source element is overlay/boundary, skipping'); // Debug log
            return null;
        }

        // Get all non-overlay, non-boundary elements from the source parent
        const sourceParent = sourceElement.parentNode;
        const sourceElements = Array.from(sourceParent.children).filter(el =>
            !el.classList.contains(ShaperConstants.CSS_CLASSES.OVERLAY) &&
            !el.classList.contains(ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE) &&
            !el.classList.contains('boundary-overlay')
        );

        // Get all elements from target (original should not have overlays)
        const targetElements = Array.from(targetSVG.children);

        console.log('Source elements (filtered):', sourceElements.length); // Debug log
        console.log('Target elements:', targetElements.length); // Debug log

        // Find the index of source element among filtered elements
        const elementIndex = sourceElements.indexOf(sourceElement);

        console.log('Element index:', elementIndex); // Debug log

        if (elementIndex === -1 || elementIndex >= targetElements.length) {
            console.log('Index not found or out of bounds'); // Debug log
            return null;
        }

        const correspondingElement = targetElements[elementIndex];
        console.log('Found corresponding element:', correspondingElement); // Debug log

        return (correspondingElement && correspondingElement.tagName === sourceElement.tagName)
            ? correspondingElement
            : null;
    }

    // Validation utilities
    static validateAttributeValue(value, attributeName) {
        const errors = [];
        const numValue = parseFloat(value);

        if (value && isNaN(numValue)) {
            errors.push(`${attributeName} must be a valid number`);
            return errors;
        }

        switch (attributeName) {
            case 'cutDepth':
                if (numValue < 0) {
                    errors.push('Cut depth cannot be negative');
                }
                break;
            case 'toolDia':
                if (numValue <= 0 && value) {
                    errors.push('Tool diameter must be positive');
                }
                break;
            case 'cutOffset':
                // Cut offset can be negative (inside cuts)
                break;
        }

        return errors;
    }

    // Validate all shaper attributes
    static validateAllAttributes(attributes) {
        const allErrors = [];

        ShaperConstants.MEASUREMENT_ATTRIBUTES.forEach(attr => {
            if (attributes[attr]) {
                const errors = this.validateAttributeValue(attributes[attr], attr);
                allErrors.push(...errors);
            }
        });

        return allErrors;
    }

    // Create SVG boundary outline rectangle
    static createBoundaryOutline(svgElement) {
        // Use SVGHelper for consistent boundary outline creation
        const svgHelper = new SVGHelper();
        return svgHelper.createBoundaryOutline(svgElement);
    }
}

// Export for use in other modules
window.ShaperConstants = ShaperConstants;
window.ShaperUtils = ShaperUtils;