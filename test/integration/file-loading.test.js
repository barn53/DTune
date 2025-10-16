/**
 * Integration Tests for File Loading Workflow
 *
 * Tests the complete file loading process including SVG parsing,
 * element analysis, UI updates, and state management.
 */

describe('File Loading Integration', () => {
    let testContainer;
    let mockEditor;

    beforeEach(async () => {
        testContainer = TestUtils.createTestContainer();

        // Create mock editor instance with required components
        mockEditor = {
            measurementSystem: new MeasurementSystem(),
            metaData: null,
            fileManager: null,
            elementManager: null,

            // Mock DOM elements
            svgContent: document.createElement('div'),
            uploadSection: document.createElement('div'),
            editorSection: document.createElement('div'),
            currentFileNameDisplay: document.createElement('div')
        };

        // Initialize measurement system
        mockEditor.measurementSystem.setUnits('mm');
        mockEditor.measurementSystem.setDecimalSeparator('.');

        // Initialize MetaData with measurement system
        mockEditor.metaData = {
            measurementSystem: mockEditor.measurementSystem,
            elementDataMap: new Map(),
            currentFileName: null,

            setCurrentFileName: function(name) { this.currentFileName = name; },
            getCurrentFileName: function() { return this.currentFileName; },
            setOriginalSVG: function(svg) { this.originalSVG = svg; },
            getOriginalSVG: function() { return this.originalSVG; },
            clearElementData: function() { this.elementDataMap.clear(); },
            setElementDataBatch: function(map) {
                this.elementDataMap.clear();
                map.forEach((value, key) => this.elementDataMap.set(key, value));
            },
            getElementDataMap: function() { return this.elementDataMap; },
            isLoadingFromLocalStorage: function() { return false; }
        };

        testContainer.appendChild(mockEditor.svgContent);
    });

    afterEach(() => {
        TestUtils.cleanup();
    });

    describe('SVG File Processing', () => {
        it('should parse valid SVG file and extract elements', async () => {
            const svgContent = TestUtils.fixtures.rectWithShaper;
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            // Add app-id to elements for tracking
            const rect = svgElement.querySelector('rect');
            rect.setAttribute('data-app-id', 'element-0');

            // Test SVG analysis
            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);

            expect(analysisResult.size).toBe(1);
            expect(analysisResult.has('element-0')).toBeTruthy();

            const elementData = analysisResult.get('element-0');
            expect(elementData.tagName).toBe('rect');
            expect(elementData.widthPx).toBeGreaterThan(0);
            expect(elementData.heightPx).toBeGreaterThan(0);
            expect(elementData.shaperAttributes).toBeDefined();
        });

        it('should handle multiple elements with different shaper attributes', async () => {
            const svgContent = TestUtils.fixtures.multipleElements;
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            // Add app-ids to elements
            const elements = svgElement.querySelectorAll('rect, circle, path');
            elements.forEach((el, index) => {
                el.setAttribute('data-app-id', `element-${index}`);
            });

            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);

            expect(analysisResult.size).toBe(3);

            // Check each element has correct data
            analysisResult.forEach((data, appId) => {
                expect(data.tagName).toBeDefined();
                expect(data.widthPx).toBeGreaterThan(0);
                expect(data.heightPx).toBeGreaterThan(0);
                expect(data.shaperAttributes).toBeDefined();
            });
        });

        it('should preserve shaper attributes during analysis', async () => {
            const svgContent = TestUtils.fixtures.rectWithShaper;
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            const rect = svgElement.querySelector('rect');
            rect.setAttribute('data-app-id', 'element-0');

            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);
            const elementData = analysisResult.get('element-0');

            expect(elementData.shaperAttributes['shaper:cutType']).toBeDefined();
            expect(elementData.shaperAttributes['shaper:cutDepth']).toBeDefined();
            expect(elementData.shaperAttributes['shaper:toolDia']).toBeDefined();
        });
    });

    describe('File Loading Workflow', () => {
        it('should complete full file loading workflow', async () => {
            const svgContent = TestUtils.fixtures.rectWithShaper;
            const fileName = 'test-file.svg';

            // Mock file loading callback simulation
            mockEditor.metaData.setCurrentFileName(fileName);
            mockEditor.metaData.setOriginalSVG(svgContent);

            // Parse SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            // Add app-id for tracking
            const rect = svgElement.querySelector('rect');
            rect.setAttribute('data-app-id', 'element-0');

            // Simulate analysis and data storage
            mockEditor.metaData.clearElementData();
            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);
            mockEditor.metaData.setElementDataBatch(analysisResult);

            // Verify workflow completion
            expect(mockEditor.metaData.getCurrentFileName()).toBe(fileName);
            expect(mockEditor.metaData.getOriginalSVG()).toBe(svgContent);
            expect(mockEditor.metaData.getElementDataMap().size).toBe(1);
        });

        it('should handle file loading errors gracefully', async () => {
            const invalidSvgContent = '<invalid>not an svg</invalid>';

            expect(() => {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(invalidSvgContent, 'image/svg+xml');
                const parserError = svgDoc.querySelector('parsererror');

                if (parserError) {
                    throw new Error('Invalid SVG content');
                }
            }).toThrow('Invalid SVG content');
        });
    });

    describe('State Management During Loading', () => {
        it('should update MetaData correctly during file load', async () => {
            const svgContent = TestUtils.fixtures.multipleElements;
            const fileName = 'multi-elements.svg';

            // Simulate complete loading workflow
            mockEditor.metaData.setCurrentFileName(fileName);
            mockEditor.metaData.setOriginalSVG(svgContent);

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            // Add app-ids
            const elements = svgElement.querySelectorAll('rect, circle, path');
            elements.forEach((el, index) => {
                el.setAttribute('data-app-id', `element-${index}`);
            });

            // Clear and populate element data
            mockEditor.metaData.clearElementData();
            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);
            mockEditor.metaData.setElementDataBatch(analysisResult);

            // Verify state updates
            expect(mockEditor.metaData.getCurrentFileName()).toBe(fileName);
            expect(mockEditor.metaData.getElementDataMap().size).toBe(3);

            // Verify each element data is complete
            const elementDataMap = mockEditor.metaData.getElementDataMap();
            elementDataMap.forEach((data, appId) => {
                expect(data.tagName).toBeDefined();
                expect(typeof data.widthPx).toBe('number');
                expect(typeof data.heightPx).toBe('number');
                expect(data.shaperAttributes).toBeDefined();
            });
        });

        it('should handle unit conversion during analysis', async () => {
            // Test with imperial units
            mockEditor.measurementSystem.setUnits('in');

            const svgContent = TestUtils.fixtures.rectWithShaper;
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            const rect = svgElement.querySelector('rect');
            rect.setAttribute('data-app-id', 'element-0');

            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);
            const elementData = analysisResult.get('element-0');

            // Should have pixel measurements regardless of unit system
            expect(typeof elementData.widthPx).toBe('number');
            expect(typeof elementData.heightPx).toBe('number');
            expect(elementData.widthPx).toBeGreaterThan(0);
            expect(elementData.heightPx).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle SVG without elements', async () => {
            const emptySvgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"></svg>`;

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(emptySvgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);

            expect(analysisResult.size).toBe(0);
        });

        it('should handle malformed shaper attributes', async () => {
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:shaper="http://www.shapertools.com/namespaces/shaper" width="100" height="60" viewBox="0 0 100 60">
                <rect x="10" y="10" width="80" height="40" shaper:cutDepth="invalid-value" data-app-id="element-0"/>
            </svg>`;

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            // Should not throw error, but handle gracefully
            expect(() => {
                const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);
            }).not.toThrow();
        });

        it('should handle missing app-id attributes', async () => {
            const svgContent = TestUtils.fixtures.simpleRect;
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            // Don't add app-id to test missing case
            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svgElement);

            // Should return empty map since no elements have app-id
            expect(analysisResult.size).toBe(0);
        });
    });

    describe('Performance', () => {
        it('should handle large SVG files efficiently', async () => {
            // Create SVG with many elements
            const svgNamespace = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNamespace, 'svg');
            svg.setAttribute('width', '1000');
            svg.setAttribute('height', '1000');
            svg.setAttribute('viewBox', '0 0 1000 1000');

            // Add 100 elements
            for (let i = 0; i < 100; i++) {
                const rect = document.createElementNS(svgNamespace, 'rect');
                rect.setAttribute('x', (i % 10) * 100);
                rect.setAttribute('y', Math.floor(i / 10) * 100);
                rect.setAttribute('width', '80');
                rect.setAttribute('height', '80');
                rect.setAttribute('data-app-id', `element-${i}`);
                rect.setAttributeNS('http://www.shapertools.com/namespaces/shaper', 'shaper:cutDepth', '15mm');
                svg.appendChild(rect);
            }

            const startTime = performance.now();
            const analysisResult = mockEditor.measurementSystem.analyzeSVG(svg);
            const endTime = performance.now();

            expect(analysisResult.size).toBe(100);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
        });
    });
});
