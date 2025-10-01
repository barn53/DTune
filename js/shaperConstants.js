/**
 * Shaper Constants and Utilities
 *
 * Centralized configuration and utility functions for the Shaper SVG editor.
 * This module eliminates code duplication and provides consistent access to
 * shaper-specific constants, validation rules, and utility operations.
 *
 * Key responsibilities:
 * - XML namespace management for shaper attributes
 * - Attribute validation and error checking
 * - SVG element synchronization and manipulation
 * - CSS class name constants for UI states
 */

/**
 * Constants class containing all shaper-related configuration values
 *
 * This class uses static properties to provide compile-time constants
 * for XML namespaces, attribute names, validation patterns, and UI classes.
 */
class ShaperConstants {
    /** XML namespace for shaper attributes in exported SVG files */
    static NAMESPACE = 'http://www.shapertools.com/namespaces/shaper';
    /** Namespace prefix used in SVG attribute names */
    static NAMESPACE_PREFIX = 'shaper';

    /** Attributes that contain numeric values requiring unit conversion */
    static MEASUREMENT_ATTRIBUTES = ['cutDepth', 'cutOffset', 'toolDia'];

    /** Attributes that contain string values stored without conversion */
    static SIMPLE_ATTRIBUTES = ['cutType'];

    /** Complete list of all supported shaper attributes */
    static ALL_ATTRIBUTES = [...this.MEASUREMENT_ATTRIBUTES, ...this.SIMPLE_ATTRIBUTES];

    /**
     * Generate properly namespaced attribute name for SVG export
     * @param {string} attr - Base attribute name (e.g., 'cutDepth')
     * @returns {string} Namespaced attribute name (e.g., 'shaper:cutDepth')
     */
    static getNamespacedAttributeName(attr) {
        return `${this.NAMESPACE_PREFIX}:${attr}`;
    }

    /**
     * Generate legacy raw attribute name (deprecated, used during migration)
     * @param {string} attr - Base attribute name
     * @returns {string} Raw attribute name with hyphenated format
     * @deprecated This format is being phased out in favor of namespaced attributes
     */
    static getRawAttributeName(attr) {
        return `${this.NAMESPACE_PREFIX}-${attr}-raw`;
    }

    /** Values considered empty for validation purposes */
    static EMPTY_VALUES = ['', '0', '0.0', '0,0'];

    /**
     * Check if a value should be treated as empty/unset
     *
     * Handles various representations of "no value" including empty strings,
     * zero values, and different decimal separator formats.
     *
     * @param {string} value - Value to check for emptiness
     * @returns {boolean} True if value is considered empty
     */
    static isEmptyValue(value) {
        return this.EMPTY_VALUES.includes(value?.trim?.() || '');
    }

    /** CSS class names used throughout the application for consistent styling */
    static CSS_CLASSES = {
        SELECTED: 'path-selected',
        HOVER: 'hover-active',
        OVERLAY: 'path-overlay',
        BOUNDARY_OUTLINE: 'svg-boundary-outline',
        NO_EXPORT: 'no-export'
    };

    /** CSS selector for SVG elements that support shaper functionality */
    static ELEMENT_SELECTORS = 'path, rect, circle, ellipse, line, polygon, polyline, text';
}

/**
 * Shaper Utilities - Common operations for SVG element manipulation
 *
 * This class provides static utility methods for common shaper operations
 * to reduce code duplication and ensure consistent behavior across modules.
 *
 * Key functionality areas:
 * - Attribute synchronization between elements
 * - Namespaced attribute management
 * - Element validation and error checking
 * - CSS class management for UI states
 */
class ShaperUtils {
    /**
     * Synchronize a single attribute between two SVG elements
     *
     * Copies an attribute from source to target element, handling both
     * presence and absence of the attribute correctly.
     *
     * @param {Element} fromElement - Source element to copy from
     * @param {Element} toElement - Target element to copy to
     * @param {string} attrName - Name of attribute to synchronize
     */
    static syncAttribute(fromElement, toElement, attrName) {
        const value = fromElement.getAttribute(attrName);
        if (value !== null) {
            toElement.setAttribute(attrName, value);
        } else {
            toElement.removeAttribute(attrName);
        }
    }

    /**
     * Synchronize all shaper attributes between two elements
     *
     * Copies all shaper-specific attributes from source to target using
     * the legacy raw attribute format. Used during element duplication.
     *
     * @param {Element} fromElement - Source element with attributes to copy
     * @param {Element} toElement - Target element to receive attributes
     */
    static syncAllShaperAttributes(fromElement, toElement) {
        ShaperConstants.ALL_ATTRIBUTES.forEach(attr => {
            const rawAttrName = ShaperConstants.getRawAttributeName(attr);
            this.syncAttribute(fromElement, toElement, rawAttrName);
        });
    }

    /**
     * Set or remove a raw (legacy) attribute based on value validity
     *
     * Sets the attribute if the value is valid and positive, removes it otherwise.
     * Uses the legacy hyphenated attribute naming format.
     *
     * @param {Element} element - SVG element to modify
     * @param {string} attr - Base attribute name
     * @param {number} rawValue - Numeric value to set (or null to remove)
     */
    static setRawAttribute(element, attr, rawValue) {
        const attrName = ShaperConstants.getRawAttributeName(attr);

        if (rawValue !== null && rawValue !== undefined && rawValue > 0) {
            element.setAttribute(attrName, rawValue.toString());
        } else {
            element.removeAttribute(attrName);
        }
    }

    /**
     * Retrieve a raw attribute value as a parsed number
     *
     * Reads a legacy raw attribute and converts it to a numeric value.
     * Returns null if the attribute doesn't exist or can't be parsed.
     *
     * @param {Element} element - SVG element to read from
     * @param {string} attr - Base attribute name
     * @returns {number|null} Parsed numeric value or null
     */
    static getRawAttributeValue(element, attr) {
        const attrName = ShaperConstants.getRawAttributeName(attr);
        const value = element.getAttribute(attrName);
        return value ? parseFloat(value) : null;
    }

    /**
     * Set a properly namespaced shaper attribute for SVG export
     *
     * This method ensures the shaper namespace is declared on the root SVG
     * and sets the attribute using proper XML namespace methods. Used during
     * export to create standards-compliant SVG files.
     *
     * @param {Element} element - SVG element to set attribute on
     * @param {string} attr - Base attribute name (without namespace)
     * @param {string} value - Attribute value to set
     */
    static setNamespacedAttribute(element, attr, value) {
        if (value && value.trim() !== '') {
            // Ensure the shaper namespace is properly declared on the SVG root element
            const svgHelper = new SVGHelper();
            const svgRoot = svgHelper.getSVGRoot(element);
            svgHelper.ensureShaperNamespace(svgRoot);

            // Set the namespaced attribute using proper XML namespace methods
            element.setAttributeNS(ShaperConstants.NAMESPACE, ShaperConstants.getNamespacedAttributeName(attr), value);
        } else {
            // Remove the attribute if value is empty or invalid
            element.removeAttributeNS(ShaperConstants.NAMESPACE, attr);
        }
    }

    /**
     * Remove all legacy raw attributes from an SVG element
     *
     * Cleans up the old hyphenated attribute format during export preparation
     * or element cleanup operations.
     *
     * @param {Element} element - SVG element to clean up
     */
    static removeAllRawAttributes(element) {
        ShaperConstants.ALL_ATTRIBUTES.forEach(attr => {
            element.removeAttribute(ShaperConstants.getRawAttributeName(attr));
        });
    }

    /**
     * Remove temporary UI-related CSS classes from an element
     *
     * Cleans up visual state classes (selected, hover) that shouldn't
     * be preserved in exported SVG files.
     *
     * @param {Element} element - SVG element to clean up
     */
    static removeTempClasses(element) {
        element.classList.remove(ShaperConstants.CSS_CLASSES.SELECTED, ShaperConstants.CSS_CLASSES.HOVER);
    }

    /**
     * Find corresponding element in another SVG by positional matching
     *
     * This method maps elements between the display SVG (with overlays) and the
     * master SVG (clean data) by comparing their positions among actual content
     * elements (excluding UI overlays and boundary elements).
     *
     * Used during export operations to synchronize data from the display version
     * back to the clean master version.
     *
     * @param {Element} sourceElement - Element from display SVG to find match for
     * @param {Element} targetSVG - Master SVG element to search within
     * @returns {Element|null} Corresponding element in target SVG or null
     */
    static findCorrespondingElement(sourceElement, targetSVG) {
        if (!targetSVG || !sourceElement) {
            return null;
        }

        // Skip UI-only elements that don't exist in the master SVG
        if (sourceElement.classList.contains(ShaperConstants.CSS_CLASSES.OVERLAY) ||
            sourceElement.classList.contains(ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE)) {
            return null;
        }

        // Filter out UI elements from source to get actual content elements only
        const sourceParent = sourceElement.parentNode;
        const sourceElements = Array.from(sourceParent.children).filter(el =>
            !el.classList.contains(ShaperConstants.CSS_CLASSES.OVERLAY) &&
            !el.classList.contains(ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE) &&
            !el.classList.contains('boundary-overlay')
        );

        // Target SVG should contain only content elements (no UI overlays)
        const targetElements = Array.from(targetSVG.children);

        // Find positional index of source element among content elements
        const elementIndex = sourceElements.indexOf(sourceElement);

        if (elementIndex === -1 || elementIndex >= targetElements.length) {
            return null;
        }

        const correspondingElement = targetElements[elementIndex];

        // Verify tag names match to ensure we found the right element
        return (correspondingElement && correspondingElement.tagName === sourceElement.tagName)
            ? correspondingElement
            : null;
    }

    /**
     * Validate a single shaper attribute value for correctness
     *
     * Checks numeric values for valid ranges and constraints specific to
     * each attribute type. Returns an array of error messages for any
     * validation failures.
     *
     * @param {string} value - String value to validate
     * @param {string} attributeName - Name of attribute being validated
     * @returns {Array<string>} Array of validation error messages (empty if valid)
     */
    static validateAttributeValue(value, attributeName) {
        const errors = [];
        const numValue = parseFloat(value);

        // Check for basic numeric validity
        if (value && isNaN(numValue)) {
            errors.push(`${attributeName} must be a valid number`);
            return errors;
        }

        // Apply attribute-specific validation rules
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
                // Cut offset can be negative (inside cuts) - no additional validation needed
                break;
        }

        return errors;
    }

    /**
     * Validate all measurement attributes in a set
     *
     * Runs validation on all provided shaper attributes and aggregates
     * any error messages. Used during form submission and data import.
     *
     * @param {Object} attributes - Map of attribute names to values
     * @returns {Array<string>} Array of all validation errors found
     */
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

    /**
     * Create SVG boundary outline rectangle for visual reference
     *
     * Delegates to SVGHelper for consistent boundary outline creation.
     * The boundary shows the effective drawing area of the SVG.
     *
     * @param {Element} svgElement - SVG element to create outline for
     * @returns {Element} SVG path element representing the boundary
     */
    static createBoundaryOutline(svgElement) {
        // Delegate to SVGHelper for consistent implementation
        const svgHelper = new SVGHelper();
        return svgHelper.createBoundaryOutline(svgElement);
    }
}

// Export for use in other modules
window.ShaperConstants = ShaperConstants;
window.ShaperUtils = ShaperUtils;