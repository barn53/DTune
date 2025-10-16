/**
 * Test Utilities for SVG Shaper Editor
 *
 * Provides helper functions, DOM utilities, and test fixtures
 * specifically designed for testing the SVG Shaper Editor application.
 */

class TestUtils {
    /**
     * Create a test DOM container
     */
    static createTestContainer() {
        const container = document.createElement('div');
        container.id = 'test-container';
        container.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 1000px;
            height: 800px;
            overflow: hidden;
        `;
        document.body.appendChild(container);
        return container;
    }

    /**
     * Clean up test DOM containers
     */
    static cleanupTestContainers() {
        const containers = document.querySelectorAll('#test-container');
        containers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
    }

    /**
     * Create a minimal SVG element for testing
     */
    static createTestSVG(options = {}) {
        const {
            width = 100,
            height = 100,
            elements = []
        } = options;

        const svgNamespace = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNamespace, 'svg');
        svg.setAttribute('width', `${width}px`);
        svg.setAttribute('height', `${height}px`);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('xmlns', svgNamespace);

        elements.forEach((elementConfig, index) => {
            const element = this.createSVGElement(elementConfig);
            element.setAttribute('data-app-id', `test-element-${index}`);
            svg.appendChild(element);
        });

        return svg;
    }

    /**
     * Create individual SVG elements for testing
     */
    static createSVGElement(config) {
        const svgNamespace = 'http://www.w3.org/2000/svg';
        const { type, attributes = {}, shaperAttributes = {} } = config;

        const element = document.createElementNS(svgNamespace, type);

        // Set standard attributes
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        // Set shaper attributes
        Object.entries(shaperAttributes).forEach(([key, value]) => {
            element.setAttribute(`shaper:${key}`, value);
        });

        return element;
    }

    /**
     * Create test SVG with typical shaper scenarios
     */
    static createTestSVGWithShaper() {
        return this.createTestSVG({
            width: 200,
            height: 150,
            elements: [
                {
                    type: 'rect',
                    attributes: { x: '10', y: '10', width: '50', height: '30' },
                    shaperAttributes: { cutType: 'outside', cutDepth: '15mm', toolDia: '6mm' }
                },
                {
                    type: 'circle',
                    attributes: { cx: '120', cy: '40', r: '25' },
                    shaperAttributes: { cutType: 'inside', cutDepth: '10mm', cutOffset: '1mm' }
                },
                {
                    type: 'path',
                    attributes: { d: 'M 10 80 L 60 80 L 35 110 Z' },
                    shaperAttributes: { cutType: 'online', cutDepth: '12mm' }
                }
            ]
        });
    }

    /**
     * Wait for DOM updates and rendering
     */
    static async waitForDOM(ms = 10) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    /**
     * Wait for next animation frame
     */
    static async waitForAnimationFrame() {
        return new Promise(resolve => {
            requestAnimationFrame(resolve);
        });
    }

    /**
     * Simulate file input change event
     */
    static simulateFileInput(fileInput, file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
    }

    /**
     * Create a test SVG file blob
     */
    static createTestSVGFile(svgContent, filename = 'test.svg') {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const file = new File([blob], filename, { type: 'image/svg+xml' });
        return file;
    }

    /**
     * Mock localStorage for testing
     */
    static mockLocalStorage() {
        const storage = {};

        return {
            getItem: (key) => storage[key] || null,
            setItem: (key, value) => { storage[key] = value; },
            removeItem: (key) => { delete storage[key]; },
            clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
            get length() { return Object.keys(storage).length; },
            key: (index) => Object.keys(storage)[index] || null
        };
    }

    /**
     * Create mock DOM events
     */
    static createMouseEvent(type, options = {}) {
        const defaultOptions = {
            bubbles: true,
            cancelable: true,
            clientX: 0,
            clientY: 0,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false
        };

        return new MouseEvent(type, { ...defaultOptions, ...options });
    }

    static createKeyboardEvent(type, key, options = {}) {
        const defaultOptions = {
            bubbles: true,
            cancelable: true,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
            altKey: false
        };

        return new KeyboardEvent(type, { key, ...defaultOptions, ...options });
    }

    /**
     * Assert DOM structure
     */
    static assertElementExists(selector, message) {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(message || `Element with selector '${selector}' does not exist`);
        }
        return element;
    }

    static assertElementNotExists(selector, message) {
        const element = document.querySelector(selector);
        if (element) {
            throw new Error(message || `Element with selector '${selector}' should not exist`);
        }
    }

    /**
     * Assert CSS classes
     */
    static assertHasClass(element, className, message) {
        if (!element.classList.contains(className)) {
            throw new Error(message || `Element should have class '${className}'`);
        }
    }

    static assertNotHasClass(element, className, message) {
        if (element.classList.contains(className)) {
            throw new Error(message || `Element should not have class '${className}'`);
        }
    }

    /**
     * Measure test performance
     */
    static measurePerformance(fn, name = 'test') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();

        if (result && typeof result.then === 'function') {
            // Handle promises
            return result.then(value => {
                console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
                return value;
            });
        } else {
            console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
            return result;
        }
    }

    /**
     * Create viewport mock for testing
     */
    static createViewportMock() {
        return {
            zoom: 1,
            pan: { x: 0, y: 0 },

            getZoom: () => this.zoom,
            setZoom: (zoom) => { this.zoom = zoom; },
            getPan: () => ({ ...this.pan }),
            setPan: (x, y) => { this.pan = { x, y }; },
            resetViewport: () => { this.zoom = 1; this.pan = { x: 0, y: 0 }; },
            zoomIn: () => { this.zoom *= 1.2; },
            zoomOut: () => { this.zoom /= 1.2; },
            zoomTo100: () => { this.zoom = 1; },
            centerView: () => { this.pan = { x: 0, y: 0 }; },
            updateTransform: () => {},
            updateZoomLevel: () => {}
        };
    }

    /**
     * Test fixture data
     */
    static get fixtures() {
        return {
            simpleRect: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60">
                <rect x="10" y="10" width="80" height="40" fill="none" stroke="black"/>
            </svg>`,

            rectWithShaper: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:shaper="http://www.shapertools.com/namespaces/shaper" width="100" height="60" viewBox="0 0 100 60">
                <rect x="10" y="10" width="80" height="40" fill="none" stroke="black" shaper:cutType="outside" shaper:cutDepth="15mm" shaper:toolDia="6mm"/>
            </svg>`,

            multipleElements: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:shaper="http://www.shapertools.com/namespaces/shaper" width="200" height="150" viewBox="0 0 200 150">
                <rect x="10" y="10" width="50" height="30" shaper:cutType="outside" shaper:cutDepth="15mm"/>
                <circle cx="120" cy="40" r="25" shaper:cutType="inside" shaper:cutDepth="10mm"/>
                <path d="M 10 80 L 60 80 L 35 110 Z" shaper:cutType="online" shaper:cutDepth="12mm"/>
            </svg>`,

            complexPath: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                <path d="M 50 50 Q 100 20 150 50 Q 180 100 150 150 Q 100 180 50 150 Q 20 100 50 50 Z" fill="none" stroke="black"/>
            </svg>`
        };
    }

    /**
     * Validation helpers
     */
    static validateSVGString(svgString) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const parserError = doc.querySelector('parsererror');

            if (parserError) {
                throw new Error(`Invalid SVG: ${parserError.textContent}`);
            }

            const svg = doc.querySelector('svg');
            if (!svg) {
                throw new Error('No SVG element found');
            }

            return true;
        } catch (error) {
            throw new Error(`SVG validation failed: ${error.message}`);
        }
    }

    /**
     * Test data generators
     */
    static generateMeasurementTestData() {
        return [
            { input: '10mm', expected: { value: 10, unit: 'mm' } },
            { input: '0.5in', expected: { value: 0.5, unit: 'in' } },
            { input: '25.4mm', expected: { value: 25.4, unit: 'mm' } },
            { input: '1in', expected: { value: 1, unit: 'in' } },
            { input: '10', expected: { value: 10, unit: null } },
            { input: '5.5', expected: { value: 5.5, unit: null } },
            { input: '0', expected: { value: 0, unit: null } }
        ];
    }

    static generateDecimalSeparatorTestData() {
        return [
            { input: '10.5', separator: '.', expected: '10.5' },
            { input: '10,5', separator: ',', expected: '10,5' },
            { input: '10.5', separator: ',', expected: '10,5' },
            { input: '10,5', separator: '.', expected: '10.5' },
            { input: '1000.50', separator: '.', expected: '1000.5' },
            { input: '1000,50', separator: ',', expected: '1000,5' }
        ];
    }

    /**
     * Cleanup helper for afterEach hooks
     */
    static cleanup() {
        // Clear test containers
        this.cleanupTestContainers();

        // Clear any test elements with data-test attribute
        const testElements = document.querySelectorAll('[data-test]');
        testElements.forEach(el => el.remove());

        // Reset any global test state
        if (window.shaperEditor) {
            // Reset editor state if needed
            if (window.shaperEditor.elementManager) {
                window.shaperEditor.elementManager.clearSelection();
            }
        }

        // Clear localStorage test data
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('test-') || key.startsWith('svgShaperEditor-test')) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * Console capture for testing logging
     */
    static captureConsole() {
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            logs.push({ type: 'log', args });
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            logs.push({ type: 'error', args });
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            logs.push({ type: 'warn', args });
            originalWarn.apply(console, args);
        };

        return {
            logs,
            restore: () => {
                console.log = originalLog;
                console.error = originalError;
                console.warn = originalWarn;
            }
        };
    }
}

// Export for use in tests
window.TestUtils = TestUtils;
