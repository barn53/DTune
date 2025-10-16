/**
 * Unit Tests for MeasurementSystem
 *
 * Tests the core measurement functionality including unit conversion,
 * decimal separator handling, number formatting, and SVG analysis.
 */

describe('MeasurementSystem', () => {
    let measurementSystem;

    beforeEach(() => {
        measurementSystem = new MeasurementSystem();
    });

    afterEach(() => {
        TestUtils.cleanup();
    });

    describe('Initialization', () => {
        it('should initialize with default metric units', () => {
            expect(measurementSystem.units).toBe('mm');
            expect(measurementSystem.dpi).toBe(96);
            expect(measurementSystem.mmPerInch).toBe(25.4);
        });

        it('should detect local decimal separator', () => {
            expect(measurementSystem.decimalSeparator).toBeDefined();
            expect([',' , '.'].includes(measurementSystem.decimalSeparator)).toBeTruthy();
        });
    });

    describe('Unit Management', () => {
        it('should set and get units correctly', () => {
            measurementSystem.setUnits('in');
            expect(measurementSystem.getUnits()).toBe('in');
            expect(measurementSystem.units).toBe('in');
        });

        it('should handle direct unit assignment', () => {
            measurementSystem.units = 'in';
            expect(measurementSystem.units).toBe('in');
        });
    });

    describe('Decimal Separator', () => {
        it('should set decimal separator', () => {
            measurementSystem.setDecimalSeparator(',');
            expect(measurementSystem.getDecimalSeparator()).toBe(',');
        });

        it('should format numbers with correct decimal separator', () => {
            measurementSystem.setDecimalSeparator(',');
            const formatted = measurementSystem.formatDisplayNumber(10.5);
            expect(formatted).toBe('10,5');
        });

        it('should format numbers with period separator', () => {
            measurementSystem.setDecimalSeparator('.');
            const formatted = measurementSystem.formatDisplayNumber(10.5);
            expect(formatted).toBe('10.5');
        });
    });

    describe('Number Formatting', () => {
        beforeEach(() => {
            measurementSystem.setDecimalSeparator('.');
        });

        it('should format display numbers with up to 3 decimal places', () => {
            expect(measurementSystem.formatDisplayNumber(10)).toBe('10.0');
            expect(measurementSystem.formatDisplayNumber(10.5)).toBe('10.5');
            expect(measurementSystem.formatDisplayNumber(10.123)).toBe('10.123');
            expect(measurementSystem.formatDisplayNumber(10.12345)).toBe('10.123');
        });

        it('should remove trailing zeros while keeping at least one decimal', () => {
            expect(measurementSystem.formatDisplayNumber(10.000)).toBe('10.0');
            expect(measurementSystem.formatDisplayNumber(10.100)).toBe('10.1');
            expect(measurementSystem.formatDisplayNumber(10.120)).toBe('10.12');
        });

        it('should handle edge cases', () => {
            expect(measurementSystem.formatDisplayNumber(0)).toBe('0.0');
            expect(measurementSystem.formatDisplayNumber(0.001)).toBe('0.001');
            expect(measurementSystem.formatDisplayNumber(-5.5)).toBe('-5.5');
        });
    });

    describe('Angle Formatting', () => {
        beforeEach(() => {
            measurementSystem.setDecimalSeparator('.');
        });

        it('should normalize angles to 0-360 range', () => {
            expect(measurementSystem.formatAngle(45)).toBe('45.0');
            expect(measurementSystem.formatAngle(0)).toBe('0.0');
            expect(measurementSystem.formatAngle(360)).toBe('0.0');
            expect(measurementSystem.formatAngle(450)).toBe('90.0');
        });

        it('should handle negative angles', () => {
            expect(measurementSystem.formatAngle(-90)).toBe('270.0');
            expect(measurementSystem.formatAngle(-180)).toBe('180.0');
            expect(measurementSystem.formatAngle(-45)).toBe('315.0');
        });

        it('should format with correct decimal separator', () => {
            measurementSystem.setDecimalSeparator(',');
            expect(measurementSystem.formatAngle(45.5)).toBe('45,5');
        });
    });

    describe('Unit Conversion', () => {
        it('should return same value for same units', () => {
            expect(measurementSystem.convertBetweenUnits(10, 'mm', 'mm')).toBe(10);
            expect(measurementSystem.convertBetweenUnits(5, 'in', 'in')).toBe(5);
            expect(measurementSystem.convertBetweenUnits(100, 'px', 'px')).toBe(100);
        });

        it('should convert millimeters to pixels', () => {
            const result = measurementSystem.convertBetweenUnits(25.4, 'mm', 'px');
            expect(result).toBeCloseTo(96, 1); // 25.4mm = 1in = 96px
        });

        it('should convert inches to pixels', () => {
            const result = measurementSystem.convertBetweenUnits(1, 'in', 'px');
            expect(result).toBe(96);
        });

        it('should convert pixels to millimeters', () => {
            const result = measurementSystem.convertBetweenUnits(96, 'px', 'mm');
            expect(result).toBeCloseTo(25.4, 1);
        });

        it('should convert pixels to inches', () => {
            const result = measurementSystem.convertBetweenUnits(96, 'px', 'in');
            expect(result).toBe(1);
        });

        it('should handle conversions between mm and inches', () => {
            const mmToIn = measurementSystem.convertBetweenUnits(25.4, 'mm', 'in');
            expect(mmToIn).toBeCloseTo(1, 2);

            const inToMm = measurementSystem.convertBetweenUnits(1, 'in', 'mm');
            expect(inToMm).toBeCloseTo(25.4, 1);
        });

        it('should handle unknown units gracefully', () => {
            expect(measurementSystem.convertBetweenUnits(10, 'unknown', 'mm')).toBe(10);
            expect(measurementSystem.convertBetweenUnits(10, 'mm', 'unknown')).toBe(10);
        });
    });

    describe('Value Parsing', () => {
        it('should parse simple numeric values', () => {
            expect(measurementSystem.parseValueWithUnits('10')).toBe(10);
            expect(measurementSystem.parseValueWithUnits('10.5')).toBe(10.5);
            expect(measurementSystem.parseValueWithUnits('0')).toBe(0);
        });

        it('should parse values with units', () => {
            expect(measurementSystem.parseValueWithUnits('10mm')).toBe(10);
            expect(measurementSystem.parseValueWithUnits('0.5in')).toBe(0.5);
            expect(measurementSystem.parseValueWithUnits('25.4 mm')).toBe(25.4);
        });

        it('should handle different decimal separators', () => {
            expect(measurementSystem.parseValueWithUnits('10,5')).toBe(10.5);
            expect(measurementSystem.parseValueWithUnits('10.5')).toBe(10.5);
        });

        it('should handle mixed separators', () => {
            // Last occurrence is decimal separator
            expect(measurementSystem.parseValueWithUnits('1,000.5')).toBe(1000.5);
            expect(measurementSystem.parseValueWithUnits('1.000,5')).toBe(1000.5);
        });

        it('should return null for invalid inputs', () => {
            expect(measurementSystem.parseValueWithUnits('')).toBeNull();
            expect(measurementSystem.parseValueWithUnits(null)).toBeNull();
            expect(measurementSystem.parseValueWithUnits('invalid')).toBeNull();
            expect(measurementSystem.parseValueWithUnits('mm10')).toBeNull();
        });

        it('should handle negative values', () => {
            expect(measurementSystem.parseValueWithUnits('-10')).toBe(-10);
            expect(measurementSystem.parseValueWithUnits('-5.5mm')).toBe(-5.5);
        });

        it('should convert units to target unit', () => {
            measurementSystem.setUnits('mm');
            const result = measurementSystem.parseValueWithUnits('1in', 'mm');
            expect(result).toBeCloseTo(25.4, 1);
        });
    });

    describe('Value Conversion', () => {
        beforeEach(() => {
            measurementSystem.setUnits('mm');
            measurementSystem.setDecimalSeparator('.');
        });

        it('should convert values to current unit', () => {
            const result = measurementSystem.convertValueToCurrentUnit('1in');
            expect(parseFloat(result)).toBeCloseTo(25.4, 1);
        });

        it('should handle empty values', () => {
            expect(measurementSystem.convertValueToCurrentUnit('')).toBe('');
            expect(measurementSystem.convertValueToCurrentUnit(null)).toBe('');
        });

        it('should handle values already in current unit', () => {
            const result = measurementSystem.convertValueToCurrentUnit('10mm');
            expect(result).toBe('10.0');
        });
    });

    describe('Utility Methods', () => {
        it('should strip units from values', () => {
            expect(measurementSystem.stripUnitsFromValue('10mm')).toBe(10);
            expect(measurementSystem.stripUnitsFromValue('5.5in')).toBe(5.5);
            expect(measurementSystem.stripUnitsFromValue('10')).toBe(10);
            expect(measurementSystem.stripUnitsFromValue(15)).toBe(15);
        });

        it('should add units to values', () => {
            measurementSystem.setUnits('mm');
            expect(measurementSystem.addUnitsToValue(10)).toBe('10mm');

            measurementSystem.setUnits('in');
            expect(measurementSystem.addUnitsToValue(0.5)).toBe('0.5in');
        });

        it('should format with units', () => {
            measurementSystem.setUnits('mm');
            expect(measurementSystem.formatWithUnits(10.123)).toBe('10.123mm');
            expect(measurementSystem.formatWithUnits(10.123, 1)).toBe('10.1mm');
        });

        it('should convert pixels to current unit', () => {
            measurementSystem.setUnits('mm');
            const result = measurementSystem.convertPixelsToCurrentUnit(96);
            expect(result).toBeCloseTo(25.4, 1);

            measurementSystem.setUnits('in');
            const result2 = measurementSystem.convertPixelsToCurrentUnit(96);
            expect(result2).toBe(1);
        });

        it('should convert units to pixels', () => {
            measurementSystem.setUnits('mm');
            const result = measurementSystem.unitsToPixels(25.4);
            expect(result).toBeCloseTo(96, 1);

            measurementSystem.setUnits('in');
            const result2 = measurementSystem.unitsToPixels(1);
            expect(result2).toBe(96);
        });
    });

    describe('Path Closure Detection', () => {
        let testContainer;

        beforeEach(() => {
            testContainer = TestUtils.createTestContainer();
        });

        it('should detect basic shapes as closed', () => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

            expect(measurementSystem.isClosedShape(rect)).toBeTruthy();
            expect(measurementSystem.isClosedShape(circle)).toBeTruthy();
            expect(measurementSystem.isClosedShape(polygon)).toBeTruthy();
        });

        it('should detect lines as open', () => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');

            expect(measurementSystem.isClosedShape(line)).toBeFalsy();
            expect(measurementSystem.isClosedShape(polyline)).toBeFalsy();
        });

        it('should detect Z-closed paths', () => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M 10 10 L 50 10 L 50 50 L 10 50 Z');

            expect(measurementSystem.isClosedPath(path)).toBeTruthy();
            expect(measurementSystem.isClosedByZ(path)).toBeTruthy();
        });

        it('should detect open paths', () => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M 10 10 L 50 10 L 50 50 L 10 50');

            expect(measurementSystem.isClosedByZ(path)).toBeFalsy();
        });
    });

    describe('SVG Analysis', () => {
        it('should analyze empty SVG', () => {
            const svg = TestUtils.createTestSVG();
            const result = measurementSystem.analyzeSVG(svg);

            expect(result).toBeDefined();
            expect(result instanceof Map).toBeTruthy();
            expect(result.size).toBe(0);
        });

        it('should analyze SVG with elements', () => {
            const svg = TestUtils.createTestSVGWithShaper();
            const result = measurementSystem.analyzeSVG(svg);

            expect(result.size).toBe(3); // rect, circle, path

            // Check that elements have required data
            result.forEach((data, appId) => {
                expect(data.tagName).toBeDefined();
                expect(data.widthPx).toBeDefined();
                expect(data.heightPx).toBeDefined();
                expect(typeof data.widthPx).toBe('number');
                expect(typeof data.heightPx).toBe('number');
            });
        });

        it('should handle null SVG gracefully', () => {
            const result = measurementSystem.analyzeSVG(null);
            expect(result instanceof Map).toBeTruthy();
            expect(result.size).toBe(0);
        });
    });

    describe('Unit Detection', () => {
        it('should detect units from SVG attributes', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100mm');
            svg.setAttribute('height', '80mm');

            const result = measurementSystem.detectUnits(svg);
            expect(result).toBe('mm');
        });

        it('should default to mm when no units found', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100');
            svg.setAttribute('height', '80');

            const result = measurementSystem.detectUnits(svg);
            expect(result).toBe('mm');
        });

        it('should handle mixed units by selecting most frequent', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100mm');
            svg.setAttribute('height', '80mm');
            svg.setAttribute('viewBox', '0 0 100 80');

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '50mm');
            svg.appendChild(rect);

            const result = measurementSystem.detectUnits(svg);
            expect(result).toBe('mm'); // mm appears more frequently
        });
    });

    describe('Performance Tests', () => {
        it('should handle large number conversions efficiently', () => {
            const testData = Array.from({ length: 1000 }, (_, i) => i + 1);

            const startTime = performance.now();
            testData.forEach(value => {
                measurementSystem.convertBetweenUnits(value, 'mm', 'in');
            });
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
        });

        it('should parse values efficiently', () => {
            const testValues = ['10mm', '5.5in', '25.4mm', '1in', '10', '0.5'];

            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                testValues.forEach(value => {
                    measurementSystem.parseValueWithUnits(value);
                });
            }
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(200); // Should complete in < 200ms
        });
    });
});
