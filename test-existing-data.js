/**
 * Simple test for existing loaded data
 * Since you already have SVG data loaded, let's test it
 */

function testExistingData() {
    console.log('%c=== Testing Existing Loaded Data ===', 'color: blue; font-weight: bold');

    const app = window.shaperEditor || window.svgShaperEditor;
    if (!app) {
        console.error('❌ No app found');
        return;
    }

    // Test 1: Check existing element data
    const elementDataMap = app.metaData.getElementDataMap();
    console.log('📊 ElementDataMap size:', elementDataMap.size);

    if (elementDataMap.size === 0) {
        console.log('❌ No element data found - please load an SVG first');
        return;
    }

    // Show all element data
    console.log('📋 Element data details:');
    Array.from(elementDataMap.entries()).forEach(([appId, data]) => {
        console.log(`   ${appId}: ${data.tagName}`);
        if (data.shaperAttributes && Object.keys(data.shaperAttributes).length > 0) {
            Object.entries(data.shaperAttributes).forEach(([key, value]) => {
                console.log(`      ${key}: ${value}`);
            });
        } else {
            console.log('      No shaper attributes');
        }
    });

    // Test 2: Check DOM elements
    const domElements = document.querySelectorAll('[data-app-id]');
    console.log('🔍 DOM elements with data-app-id:', domElements.length);

    if (domElements.length === 0) {
        console.log('❌ No DOM elements with data-app-id found');
        console.log('   This suggests the SVG is in localStorage but not currently displayed');
        return;
    }

    // Test 3: Test dialog data for each element
    console.log('🖱️ Testing dialog data simulation:');
    domElements.forEach((element, index) => {
        const appId = element.dataset.appId;
        console.log(`\n--- Element ${index + 1}: ${appId} ---`);

        // Get element dimensions (this is what the dialog uses)
        const dimensions = app.elementManager.getElementDimensions(element);
        console.log('   Dimensions:', dimensions);

        if (dimensions && dimensions.shaperAttributes) {
            console.log('   Shaper attributes found:');

            // First show cutType (string value: "pocket", "inside", "online", "guide", "none", or null)
            const cutType = dimensions.shaperAttributes['shaper:cutType'];
            if (cutType) {
                console.log(`      cutType: "${cutType}"`);
            } else {
                console.log(`      cutType: null (not set)`);
            }

            // Test the dialog population logic for numeric attributes
            ['cutDepth', 'cutOffset', 'toolDia'].forEach(attr => {
                const attrName = `shaper:${attr}`;
                const value = dimensions.shaperAttributes[attrName];

                if (value && value.trim() !== '') {
                    const pixelValue = parseFloat(value);
                    if (!isNaN(pixelValue)) {
                        const convertedValue = app.measurementSystem.convertPixelsToCurrentUnit(pixelValue);
                        const formattedValue = app.measurementSystem.formatDisplayNumber(convertedValue);
                        console.log(`      ${attr}: ${value}px → ${formattedValue}${app.measurementSystem.units}`);
                    }
                } else {
                    console.log(`      ${attr}: null (not set)`);
                }
            });
        } else {
            console.log('   ❌ No dimensions or shaper attributes');
        }
    });

    // Test 4: Test selectedElementsInfo format (the "element-0" fix)
    console.log('\n🔧 Testing selectedElementsInfo format:');
    const selectedPaths = Array.from(domElements);

    const selectedElementsInfo = selectedPaths.map((path, index) => {
        const attributes = app.attributeSystem.getShaperAttributes(path);
        return {
            appId: path.dataset.appId || `fallback-${index}`, // This should NOT be "element-0"
            element: path,
            cutType: attributes.cutType || null, // Valid values: "pocket", "inside", "online", "guide", "none", or null
            cutDepth: attributes.cutDepth || null,
            toolDia: attributes.toolDia || null,
            cutOffset: attributes.cutOffset || null
        };
    });

        console.log('✅ selectedElementsInfo (should show proper appIds):');
    selectedElementsInfo.forEach((info, i) => {
        console.log(`   Element ${i}: appId="${info.appId}", cutType="${info.cutType}"`);
        if (info.appId.startsWith('element-')) {
            console.error('   ❌ FOUND OLD FORMAT! This element still uses "element-" format');
        } else {
            console.log('   ✅ Proper appId format');
        }
    });

    console.log('\n%c=== Test Complete ===', 'color: green; font-weight: bold');
    console.log('If you see proper appIds above (not "element-0"), the dialog issue is fixed!');
}

// Function to restore SVG from localStorage if available
function restoreSVGFromLocalStorage() {
    console.log('🔄 Attempting to restore SVG from localStorage...');

    const app = window.shaperEditor || window.svgShaperEditor;
    if (!app) {
        console.error('❌ No app found');
        return;
    }

    const originalSVG = app.metaData.getOriginalSVG();
    const displayCloneSVG = app.metaData.getDisplayCloneSVG();

    if (originalSVG) {
        console.log('✅ Found original SVG in localStorage');
        try {
            // Use the stored original SVG to reload
            app.fileManager.parseSVG(originalSVG, app.metaData.getCurrentFileName() || 'restored.svg');
            console.log('✅ SVG restored successfully!');
        } catch (error) {
            console.error('❌ Error restoring SVG:', error);
        }
    } else if (displayCloneSVG) {
        console.log('✅ Found display clone SVG in localStorage');
        try {
            // Use the display clone as fallback
            app.fileManager.parseSVG(displayCloneSVG, app.metaData.getCurrentFileName() || 'restored.svg');
            console.log('✅ SVG restored from display clone!');
        } catch (error) {
            console.error('❌ Error restoring from display clone:', error);
        }
    } else {
        console.log('❌ No SVG content found in localStorage');
        console.log('Element data exists but no SVG content to display');
    }
}

// Make functions available globally
window.testExistingData = testExistingData;
window.restoreSVGFromLocalStorage = restoreSVGFromLocalStorage;
console.log('🧪 Test functions loaded:');
console.log('  - testExistingData() - test current data');
console.log('  - restoreSVGFromLocalStorage() - restore SVG display');