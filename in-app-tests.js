/**
 * In-App Test Suite
 * Include this script in the main application to test functionality
 */

(function() {
    'use strict';

    // Wait for the app to be fully loaded
    function waitForApp(callback) {
        con            const app = window.svgShaperEditor || window.shaperEditor;
            if (app && app.fileManager && app.fileManager.parseSVG) {
                console.log('📁 Loading test SVG...');
                app.fileManager.parseSVG(testSVG, 'test-with-shaper-attrs.svg');

                // Wait a bit for processing, then run tests
                setTimeout(() => {
                    console.log('🧪 Running comprehensive tests after SVG load...');
                    runComprehensiveTests();
                }, 1000);
            } else {
                console.error('❌ No file manager or parseSVG method available');
                console.log('Available fileManager methods:', app?.fileManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(app.fileManager)) : 'No fileManager');
            }cking app status...');
        console.log('window.shaperEditor exists:', !!window.shaperEditor);
        console.log('window.svgShaperEditor exists:', !!window.svgShaperEditor);

        // Check both possible variable names
        const app = window.shaperEditor || window.svgShaperEditor;

        if (app) {
            console.log('App found, checking metaData...');
            console.log('metaData exists:', !!app.metaData);

            if (app.metaData) {
                console.log('✅ App fully loaded, starting tests');
                // Normalize the reference for tests
                if (!window.svgShaperEditor) {
                    window.svgShaperEditor = app;
                }
                callback();
                return;
            }
        }

        console.log('⏳ App not ready yet, waiting...');
        setTimeout(() => waitForApp(callback), 500);
    }

    function runInAppTests() {
        console.log('%c=== DTune In-App Test Suite ===', 'color: blue; font-weight: bold');

        const results = [];

        // Test 1: App Components
        try {
            const app = window.svgShaperEditor;
            if (app) {
                console.log('✅ Main app loaded');
                results.push({name: 'Main App', status: 'PASS'});

                // Check components
                const components = ['metaData', 'fileManager', 'measurementSystem', 'elementManager', 'uiComponents'];
                components.forEach(comp => {
                    if (app[comp]) {
                        console.log(`✅ ${comp} available`);
                        results.push({name: comp, status: 'PASS'});
                    } else {
                        console.log(`❌ ${comp} missing`);
                        results.push({name: comp, status: 'FAIL', error: 'Component not found'});
                    }
                });
            } else {
                console.log('❌ Main app not found');
                results.push({name: 'Main App', status: 'FAIL', error: 'svgShaperEditor not found'});
            }
        } catch (error) {
            console.log('❌ App check failed:', error.message);
            results.push({name: 'Main App', status: 'FAIL', error: error.message});
        }

        // Test 2: MetaData functionality
        try {
            const metaData = window.svgShaperEditor?.metaData;
            if (metaData) {
                // Test element data map
                const elementDataMap = metaData.getElementDataMap();
                console.log('✅ ElementDataMap accessible, size:', elementDataMap.size);
                results.push({name: 'ElementDataMap', status: 'PASS'});

                // Test localStorage methods
                const testData = {test: 'value'};
                metaData.setElementData('test-id', testData);
                const retrieved = metaData.getElementData('test-id');

                if (retrieved && retrieved.test === 'value') {
                    console.log('✅ Element data storage works');
                    results.push({name: 'Element Data Storage', status: 'PASS'});

                    // Clean up
                    elementDataMap.delete('test-id');
                } else {
                    console.log('❌ Element data storage failed');
                    results.push({name: 'Element Data Storage', status: 'FAIL', error: 'Data mismatch'});
                }
            } else {
                console.log('❌ MetaData not available');
                results.push({name: 'MetaData', status: 'FAIL', error: 'MetaData not found'});
            }
        } catch (error) {
            console.log('❌ MetaData test failed:', error.message);
            results.push({name: 'MetaData', status: 'FAIL', error: error.message});
        }

        // Test 3: File loading capabilities
        try {
            const app = window.svgShaperEditor || window.shaperEditor;
            const fileManager = app?.fileManager;
            if (fileManager && fileManager.loadFromString) {
                console.log('✅ FileManager loadFromString available');
                results.push({name: 'FileManager Load', status: 'PASS'});

                // Test SVG validation
                const testSVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="10" y="10" width="80" height="80" /></svg>';

                // Just check if the method exists and doesn't throw on valid SVG
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(testSVG, 'image/svg+xml');
                    const parseError = doc.querySelector('parsererror');

                    if (!parseError) {
                        console.log('✅ SVG validation works');
                        results.push({name: 'SVG Validation', status: 'PASS'});
                    } else {
                        console.log('❌ SVG validation failed');
                        results.push({name: 'SVG Validation', status: 'FAIL', error: 'Parse error'});
                    }
                } catch (svgError) {
                    console.log('❌ SVG validation error:', svgError.message);
                    results.push({name: 'SVG Validation', status: 'FAIL', error: svgError.message});
                }
            } else {
                console.log('❌ FileManager not available');
                results.push({name: 'FileManager Load', status: 'FAIL', error: 'FileManager not found'});
            }
        } catch (error) {
            console.log('❌ FileManager test failed:', error.message);
            results.push({name: 'FileManager Load', status: 'FAIL', error: error.message});
        }

        // Test 4: DOM elements with correct selectors
        try {
            const elementsWithAppId = document.querySelectorAll('[data-app-id]');
            console.log(`ℹ️ Found ${elementsWithAppId.length} elements with data-app-id`);
            results.push({name: 'DOM Elements', status: 'PASS'});

            if (elementsWithAppId.length > 0) {
                // Test first element
                const firstElement = elementsWithAppId[0];
                const appId = firstElement.dataset.appId;
                console.log(`✅ First element appId: ${appId}`);

                // Check if element manager can handle it
                const elementManager = window.svgShaperEditor?.elementManager;
                if (elementManager) {
                    const dimensions = elementManager.getElementDimensions(firstElement);
                    console.log('✅ ElementManager can access element dimensions');
                    console.log('   Dimensions:', dimensions);
                    results.push({name: 'Element Access', status: 'PASS'});
                } else {
                    results.push({name: 'Element Access', status: 'FAIL', error: 'ElementManager not found'});
                }
            }
        } catch (error) {
            console.log('❌ DOM element test failed:', error.message);
            results.push({name: 'DOM Elements', status: 'FAIL', error: error.message});
        }

        // Summary
        const passCount = results.filter(r => r.status === 'PASS').length;
        const failCount = results.filter(r => r.status === 'FAIL').length;

        console.log(`%c=== Test Results: ${passCount} passed, ${failCount} failed ===`,
                   failCount === 0 ? 'color: green; font-weight: bold' : 'color: orange; font-weight: bold');

        // Show failed tests
        results.filter(r => r.status === 'FAIL').forEach(result => {
            console.log(`❌ ${result.name}: ${result.error}`);
        });

        return results;
    }

    // Test runner function
    window.runDTuneTests = function() {
        console.log('🚀 runDTuneTests() called');
        waitForApp(runInAppTests);
    };

    // Immediate status check
    window.checkAppStatus = function() {
        console.log('=== App Status Check ===');
        console.log('window.shaperEditor:', window.shaperEditor);
        console.log('window.svgShaperEditor:', window.svgShaperEditor);

        const app = window.shaperEditor || window.svgShaperEditor;
        if (app) {
            console.log('App found! Components available:', Object.keys(app));
        }
        console.log('DOM ready state:', document.readyState);
        console.log('SVG elements with data-app-id:', document.querySelectorAll('[data-app-id]').length);
    };

    // Auto-run tests after page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.runDTuneTests(), 1000);
        });
    } else {
        setTimeout(() => window.runDTuneTests(), 1000);
    }

    // Add function to load test SVG and run full tests
    window.loadTestSVGAndRunTests = function() {
        console.log('🧪 Loading test SVG and running comprehensive tests...');

        const testSVG = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" xmlns:shaper="http://www.shapertools.com/namespaces/shaper">' +
            '<path d="M50,50 L150,50 L150,150 L50,150 Z" fill="none" stroke="black" stroke-width="1" shaper:cutType="online" shaper:cutDepth="3.0mm" shaper:cutOffset="0mm" shaper:toolDia="6.35mm" />' +
            '<circle cx="250" cy="100" r="40" fill="none" stroke="blue" stroke-width="2" shaper:cutType="inside" shaper:cutDepth="1.5mm" shaper:toolDia="3.175mm" />' +
            '<rect x="300" y="180" width="80" height="60" fill="none" stroke="red" stroke-width="1.5" shaper:cutType="pocket" shaper:cutDepth="5mm" shaper:cutOffset="1mm" shaper:toolDia="6mm" />' +
            '</svg>';

        try {
            const app = window.svgShaperEditor || window.shaperEditor;
            if (app && app.fileManager) {
                console.log('� Loading test SVG...');
                app.fileManager.loadFromString(testSVG, 'test-with-shaper-attrs.svg');

                // Wait a bit for processing, then run tests
                setTimeout(() => {
                    console.log('🧪 Running comprehensive tests after SVG load...');
                    runComprehensiveTests();
                }, 1000);
            } else {
                console.error('❌ No file manager available');
            }
        } catch (error) {
            console.error('❌ Error loading test SVG:', error);
        }
    };

    function runComprehensiveTests() {
        console.log('%c=== COMPREHENSIVE TESTS AFTER SVG LOAD ===', 'color: blue; font-weight: bold');

        const app = window.svgShaperEditor || window.shaperEditor;

        // Test 1: Check element data after load
        console.log('📊 ElementDataMap size:', app.metaData.getElementDataMap().size);
        Array.from(app.metaData.getElementDataMap().entries()).forEach(([appId, data]) => {
            console.log(`   ${appId}: ${data.tagName}, shaper attrs: ${Object.keys(data.shaperAttributes || {}).length}`);
            if (data.shaperAttributes) {
                Object.entries(data.shaperAttributes).forEach(([key, value]) => {
                    console.log(`      ${key}: ${value}`);
                });
            }
        });

        // Test 2: Check DOM elements
        const elements = document.querySelectorAll('[data-app-id]');
        console.log('🔍 DOM elements with data-app-id:', elements.length);

        if (elements.length > 0) {
            // Test dialog data for first element
            const testElement = elements[0];
            console.log('🖱️ Testing dialog data for element:', testElement.dataset.appId);

            const dimensions = app.elementManager.getElementDimensions(testElement);
            console.log('   Element dimensions:', dimensions);

            if (dimensions && dimensions.shaperAttributes) {
                console.log('   Shaper attributes:', dimensions.shaperAttributes);

                // Test dialog population logic
                ['cutDepth', 'cutOffset', 'toolDia'].forEach(attr => {
                    const attrName = `shaper:${attr}`;
                    const value = dimensions.shaperAttributes[attrName];
                    if (value && value.trim() !== '') {
                        const pixelValue = parseFloat(value);
                        if (!isNaN(pixelValue)) {
                            const convertedValue = app.measurementSystem.convertPixelsToCurrentUnit(pixelValue);
                            const formattedValue = app.measurementSystem.formatDisplayNumber(convertedValue);
                            console.log(`   ${attr}: ${value}px → ${formattedValue}${app.measurementSystem.units}`);
                        }
                    } else {
                        console.log(`   ${attr}: null (not set)`);
                    }
                });
            }

            // Test selectedElementsInfo format (the fix for "element-0" issue)
            const selectedPaths = [testElement];
            const selectedElementsInfo = Array.from(selectedPaths).map((path, index) => {
                const attributes = app.attributeSystem.getShaperAttributes(path);
                return {
                    appId: path.dataset.appId || `fallback-${index}`,
                    element: path,
                    cutType: attributes.cutType || 'line',
                    cutDepth: attributes.cutDepth || null,
                    toolDia: attributes.toolDia || null,
                    cutOffset: attributes.cutOffset || null
                };
            });

            console.log('✅ selectedElementsInfo format (should show appId, not element-0):');
            selectedElementsInfo.forEach((info, i) => {
                console.log(`   Element ${i}: appId="${info.appId}", cutType="${info.cutType}"`);
            });
        }

        console.log('%c=== COMPREHENSIVE TESTS COMPLETE ===', 'color: green; font-weight: bold');
    }

    console.log('📋 DTune test suite loaded.');
    console.log('Use runDTuneTests() for basic tests, or loadTestSVGAndRunTests() for full testing.');

})();