/**
 * Unit Tests for ShaperConstants and ShaperUtils
 *
 * Tests the constants, validation rules, and utility functions
 * used throughout the SVG Shaper Editor application.
 */

describe('ShaperConstants', () => {
    describe('Constants', () => {
        it('should have correct namespace configuration', () => {
            expect(ShaperConstants.NAMESPACE).toBe('http://www.shapertools.com/namespaces/shaper');
            expect(ShaperConstants.NAMESPACE_PREFIX).toBe('shaper');
        });

        it('should define measurement attributes', () => {
            expect(ShaperConstants.MEASUREMENT_ATTRIBUTES).toContain('cutDepth');
            expect(ShaperConstants.MEASUREMENT_ATTRIBUTES).toContain('cutOffset');
            expect(ShaperConstants.MEASUREMENT_ATTRIBUTES).toContain('toolDia');
        });

        it('should define simple attributes', () => {
            expect(ShaperConstants.SIMPLE_ATTRIBUTES).toContain('cutType');
        });

        it('should define all attributes', () => {
            expect(ShaperConstants.ALL_ATTRIBUTES).toContain('cutDepth');
            expect(ShaperConstants.ALL_ATTRIBUTES).toContain('cutOffset');
            expect(ShaperConstants.ALL_ATTRIBUTES).toContain('toolDia');
            expect(ShaperConstants.ALL_ATTRIBUTES).toContain('cutType');
        });

        it('should define negative allowed attributes', () => {
            expect(ShaperConstants.NEGATIVE_ALLOWED_ATTRIBUTES).toContain('cutOffset');
        });

        it('should define CSS classes', () => {
            expect(ShaperConstants.CSS_CLASSES.SELECTED).toBe('path-selected');
            expect(ShaperConstants.CSS_CLASSES.HOVER).toBe('hover-active');
            expect(ShaperConstants.CSS_CLASSES.OVERLAY).toBe('path-overlay');
            expect(ShaperConstants.CSS_CLASSES.BOUNDARY_OUTLINE).toBe('svg-boundary-outline');
            expect(ShaperConstants.CSS_CLASSES.NO_EXPORT).toBe('no-export');
        });

        it('should define element selectors', () => {
            expect(ShaperConstants.ELEMENT_SELECTORS).toContain('path');
            expect(ShaperConstants.ELEMENT_SELECTORS).toContain('rect');
            expect(ShaperConstants.ELEMENT_SELECTORS).toContain('circle');
        });
    });

    describe('Namespaced Attribute Names', () => {
        it('should generate correct namespaced attribute names', () => {
            expect(ShaperConstants.getNamespacedAttributeName('cutDepth')).toBe('shaper:cutDepth');
            expect(ShaperConstants.getNamespacedAttributeName('cutType')).toBe('shaper:cutType');
            expect(ShaperConstants.getNamespacedAttributeName('toolDia')).toBe('shaper:toolDia');
        });
    });

    describe('Raw Attribute Names', () => {
        it('should generate correct raw attribute names', () => {
            expect(ShaperConstants.getRawAttributeName('cutDepth')).toBe('shaper-cutDepth-raw');
            expect(ShaperConstants.getRawAttributeName('cutOffset')).toBe('shaper-cutOffset-raw');
            expect(ShaperConstants.getRawAttributeName('toolDia')).toBe('shaper-toolDia-raw');
        });
    });

    describe('Empty Value Detection', () => {
        it('should detect empty values', () => {
            expect(ShaperConstants.isEmptyValue('')).toBeTruthy();
            expect(ShaperConstants.isEmptyValue('0')).toBeTruthy();
            expect(ShaperConstants.isEmptyValue('0.0')).toBeTruthy();
            expect(ShaperConstants.isEmptyValue('0,0')).toBeTruthy();
            expect(ShaperConstants.isEmptyValue('  ')).toBeTruthy(); // trimmed
        });

        it('should not detect valid values as empty', () => {
            expect(ShaperConstants.isEmptyValue('10')).toBeFalsy();
            expect(ShaperConstants.isEmptyValue('5.5')).toBeFalsy();
            expect(ShaperConstants.isEmptyValue('-1')).toBeFalsy();
            expect(ShaperConstants.isEmptyValue('0.1')).toBeFalsy();
        });

        it('should handle null and undefined', () => {
            expect(ShaperConstants.isEmptyValue(null)).toBeTruthy();
            expect(ShaperConstants.isEmptyValue(undefined)).toBeTruthy();
        });
    });

    describe('Negative Value Allowance', () => {
        it('should allow negative values for cutOffset', () => {
            expect(ShaperConstants.allowsNegativeValues('cutOffset')).toBeTruthy();
        });

        it('should not allow negative values for other attributes', () => {
            expect(ShaperConstants.allowsNegativeValues('cutDepth')).toBeFalsy();
            expect(ShaperConstants.allowsNegativeValues('toolDia')).toBeFalsy();
            expect(ShaperConstants.allowsNegativeValues('cutType')).toBeFalsy();
        });

        it('should handle unknown attributes', () => {
            expect(ShaperConstants.allowsNegativeValues('unknownAttribute')).toBeFalsy();
        });
    });
});

describe('ShaperUtils', () => {
    let testContainer;
    let testElement1, testElement2;

    beforeEach(() => {
        testContainer = TestUtils.createTestContainer();

        // Create test SVG elements
        const svgNamespace = 'http://www.w3.org/2000/svg';
        testElement1 = document.createElementNS(svgNamespace, 'rect');
        testElement2 = document.createElementNS(svgNamespace, 'rect');

        testContainer.appendChild(testElement1);
        testContainer.appendChild(testElement2);
    });

    afterEach(() => {
        TestUtils.cleanup();
    });

    describe('Attribute Synchronization', () => {
        it('should sync single attribute between elements', () => {
            testElement1.setAttribute('test-attr', 'test-value');

            ShaperUtils.syncAttribute(testElement1, testElement2, 'test-attr');

            expect(testElement2.getAttribute('test-attr')).toBe('test-value');
        });

        it('should remove attribute if source does not have it', () => {
            testElement2.setAttribute('test-attr', 'old-value');

            ShaperUtils.syncAttribute(testElement1, testElement2, 'test-attr');

            expect(testElement2.hasAttribute('test-attr')).toBeFalsy();
        });

        it('should sync all shaper attributes', () => {
            // Set raw attributes on source element
            testElement1.setAttribute('shaper-cutDepth-raw', '15');
            testElement1.setAttribute('shaper-cutOffset-raw', '1');
            testElement1.setAttribute('shaper-toolDia-raw', '6');

            ShaperUtils.syncAllShaperAttributes(testElement1, testElement2);

            expect(testElement2.getAttribute('shaper-cutDepth-raw')).toBe('15');
            expect(testElement2.getAttribute('shaper-cutOffset-raw')).toBe('1');
            expect(testElement2.getAttribute('shaper-toolDia-raw')).toBe('6');
        });
    });

    describe('Raw Attribute Management', () => {
        it('should set raw attribute for valid positive values', () => {
            ShaperUtils.setRawAttribute(testElement1, 'cutDepth', 15);

            expect(testElement1.getAttribute('shaper-cutDepth-raw')).toBe('15');
        });

        it('should set raw attribute for valid negative values when allowed', () => {
            ShaperUtils.setRawAttribute(testElement1, 'cutOffset', -1);

            expect(testElement1.getAttribute('shaper-cutOffset-raw')).toBe('-1');
        });

        it('should not set raw attribute for negative values when not allowed', () => {
            ShaperUtils.setRawAttribute(testElement1, 'cutDepth', -5);

            expect(testElement1.hasAttribute('shaper-cutDepth-raw')).toBeFalsy();
        });

        it('should remove attribute for null values', () => {
            testElement1.setAttribute('shaper-cutDepth-raw', '15');

            ShaperUtils.setRawAttribute(testElement1, 'cutDepth', null);

            expect(testElement1.hasAttribute('shaper-cutDepth-raw')).toBeFalsy();
        });

        it('should get raw attribute values', () => {
            testElement1.setAttribute('shaper-cutDepth-raw', '15.5');

            const value = ShaperUtils.getRawAttributeValue(testElement1, 'cutDepth');

            expect(value).toBe(15.5);
        });

        it('should return null for missing raw attributes', () => {
            const value = ShaperUtils.getRawAttributeValue(testElement1, 'cutDepth');

            expect(value).toBeNull();
        });

        it('should handle invalid numeric values', () => {
            testElement1.setAttribute('shaper-cutDepth-raw', 'invalid');

            const value = ShaperUtils.getRawAttributeValue(testElement1, 'cutDepth');

            expect(value).toBeNull();
        });
    });

    describe('Namespaced Attribute Management', () => {
        let svg;

        beforeEach(() => {
            // Create SVG context for namespace testing
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.appendChild(testElement1);
            testContainer.appendChild(svg);
        });

        it('should set namespaced attribute with valid value', () => {
            // Mock SVGHelper for this test
            window.SVGHelper = window.SVGHelper || class {
                getSVGRoot(element) { return svg; }
                ensureShaperNamespace(svgRoot) {
                    svgRoot.setAttribute('xmlns:shaper', ShaperConstants.NAMESPACE);
                }
            };

            ShaperUtils.setNamespacedAttribute(testElement1, 'cutDepth', '15mm');

            expect(testElement1.getAttributeNS(ShaperConstants.NAMESPACE, 'cutDepth')).toBe('15mm');
        });

        it('should remove namespaced attribute for empty value', () => {
            testElement1.setAttributeNS(ShaperConstants.NAMESPACE, 'cutDepth', '15mm');

            ShaperUtils.setNamespacedAttribute(testElement1, 'cutDepth', '');

            expect(testElement1.hasAttributeNS(ShaperConstants.NAMESPACE, 'cutDepth')).toBeFalsy();
        });
    });

    describe('Attribute Cleanup', () => {
        it('should remove all raw attributes', () => {
            // Set multiple raw attributes
            testElement1.setAttribute('shaper-cutDepth-raw', '15');
            testElement1.setAttribute('shaper-cutOffset-raw', '1');
            testElement1.setAttribute('shaper-toolDia-raw', '6');
            testElement1.setAttribute('other-attr', 'keep-this');

            ShaperUtils.removeAllRawAttributes(testElement1);

            expect(testElement1.hasAttribute('shaper-cutDepth-raw')).toBeFalsy();
            expect(testElement1.hasAttribute('shaper-cutOffset-raw')).toBeFalsy();
            expect(testElement1.hasAttribute('shaper-toolDia-raw')).toBeFalsy();
            expect(testElement1.getAttribute('other-attr')).toBe('keep-this');
        });

        it('should remove temporary CSS classes', () => {
            testElement1.classList.add('path-selected', 'hover-active', 'keep-this');

            ShaperUtils.removeTempClasses(testElement1);

            expect(testElement1.classList.contains('path-selected')).toBeFalsy();
            expect(testElement1.classList.contains('hover-active')).toBeFalsy();
            expect(testElement1.classList.contains('keep-this')).toBeTruthy();
        });
    });

    describe('Element Finding', () => {
        let sourceSVG, targetSVG;

        beforeEach(() => {
            const svgNamespace = 'http://www.w3.org/2000/svg';

            // Create source SVG with overlays
            sourceSVG = document.createElementNS(svgNamespace, 'svg');
            const sourceRect = document.createElementNS(svgNamespace, 'rect');
            const sourceCircle = document.createElementNS(svgNamespace, 'circle');
            const overlay = document.createElementNS(svgNamespace, 'path');
            overlay.classList.add('path-overlay');

            sourceSVG.appendChild(sourceRect);
            sourceSVG.appendChild(overlay);
            sourceSVG.appendChild(sourceCircle);

            // Create target SVG (clean, no overlays)
            targetSVG = document.createElementNS(svgNamespace, 'svg');
            const targetRect = document.createElementNS(svgNamespace, 'rect');
            const targetCircle = document.createElementNS(svgNamespace, 'circle');

            targetSVG.appendChild(targetRect);
            targetSVG.appendChild(targetCircle);

            testContainer.appendChild(sourceSVG);
            testContainer.appendChild(targetSVG);
        });

        it('should find corresponding element by position', () => {
            const sourceRect = sourceSVG.children[0]; // First rect
            const targetRect = targetSVG.children[0]; // First rect

            const found = ShaperUtils.findCorrespondingElement(sourceRect, targetSVG);

            expect(found).toBe(targetRect);
        });

        it('should return null for overlay elements', () => {
            const overlay = sourceSVG.querySelector('.path-overlay');

            const found = ShaperUtils.findCorrespondingElement(overlay, targetSVG);

            expect(found).toBeNull();
        });

        it('should return null when element index exceeds target elements', () => {
            // Try to find element at index that doesn't exist in target
            const sourceCircle = sourceSVG.children[2]; // Third element (circle)
            // But target only has 2 elements

            const found = ShaperUtils.findCorrespondingElement(sourceCircle, targetSVG);

            expect(found).not.toBeNull(); // Should find the circle at index 1
        });

        it('should return null for null inputs', () => {
            expect(ShaperUtils.findCorrespondingElement(null, targetSVG)).toBeNull();
            expect(ShaperUtils.findCorrespondingElement(testElement1, null)).toBeNull();
        });
    });

    describe('Validation', () => {
        it('should validate numeric attribute values', () => {
            expect(ShaperUtils.validateAttributeValue('10', 'cutDepth')).toEqual([]);
            expect(ShaperUtils.validateAttributeValue('5.5', 'toolDia')).toEqual([]);
            expect(ShaperUtils.validateAttributeValue('-1', 'cutOffset')).toEqual([]);
        });

        it('should return errors for invalid values', () => {
            const errors = ShaperUtils.validateAttributeValue('invalid', 'cutDepth');
            expect(errors).toContain('cutDepth must be a valid number');
        });

        it('should validate negative cutDepth', () => {
            const errors = ShaperUtils.validateAttributeValue('-5', 'cutDepth');
            expect(errors).toContain('Cut depth cannot be negative');
        });

        it('should validate zero or negative toolDia', () => {
            const errors1 = ShaperUtils.validateAttributeValue('0', 'toolDia');
            expect(errors1).toContain('Tool diameter must be positive');

            const errors2 = ShaperUtils.validateAttributeValue('-1', 'toolDia');
            expect(errors2).toContain('Tool diameter must be positive');
        });

        it('should allow negative cutOffset', () => {
            const errors = ShaperUtils.validateAttributeValue('-2', 'cutOffset');
            expect(errors).toEqual([]);
        });

        it('should validate all attributes', () => {
            const attributes = {
                cutDepth: '-5',
                toolDia: '0',
                cutOffset: '1'
            };

            const errors = ShaperUtils.validateAllAttributes(attributes);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors).toContain('Cut depth cannot be negative');
            expect(errors).toContain('Tool diameter must be positive');
        });

        it('should pass validation for valid attributes', () => {
            const attributes = {
                cutDepth: '15',
                toolDia: '6',
                cutOffset: '-1'
            };

            const errors = ShaperUtils.validateAllAttributes(attributes);
            expect(errors).toEqual([]);
        });
    });

    describe('Boundary Outline Creation', () => {
        it('should delegate to SVGHelper', () => {
            // Mock SVGHelper
            const mockBoundaryOutline = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            window.SVGHelper = window.SVGHelper || class {
                createBoundaryOutline(svgElement) {
                    return mockBoundaryOutline;
                }
            };

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const result = ShaperUtils.createBoundaryOutline(svg);

            expect(result).toBe(mockBoundaryOutline);
        });
    });

    describe('Edge Cases', () => {
        it('should handle elements without required methods', () => {
            const mockElement = {
                getAttribute: () => null,
                setAttribute: () => {},
                removeAttribute: () => {},
                hasAttribute: () => false
            };

            // Should not throw errors
            expect(() => {
                ShaperUtils.setRawAttribute(mockElement, 'cutDepth', 15);
                ShaperUtils.getRawAttributeValue(mockElement, 'cutDepth');
            }).not.toThrow();
        });

        it('should handle validation with empty attribute map', () => {
            const errors = ShaperUtils.validateAllAttributes({});
            expect(errors).toEqual([]);
        });

        it('should handle sync with missing attributes gracefully', () => {
            expect(() => {
                ShaperUtils.syncAllShaperAttributes(testElement1, testElement2);
            }).not.toThrow();
        });
    });
});
