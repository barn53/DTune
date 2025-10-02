/**
 * Debug Script for Dialog Data Issues
 * Run this in the browser console after loading an SVG file
 */

function debugDialogData() {
    console.log('=== DEBUGGING DIALOG DATA ===');

    // 1. Check if app is loaded
    if (!window.svgShaperEditor) {
        console.error('❌ SVG Shaper Editor not loaded');
        return;
    }
    console.log('✅ App loaded');

    // 2. Check MetaData
    const metaData = window.svgShaperEditor.metaData;
    if (!metaData) {
        console.error('❌ MetaData not available');
        return;
    }
    console.log('✅ MetaData available');

    // 3. Check element data map
    const elementDataMap = metaData.getElementDataMap();
    console.log('📊 ElementDataMap size:', elementDataMap.size);
    console.log('📊 ElementDataMap entries:', Array.from(elementDataMap.entries()));

    // 4. Check DOM elements with app IDs
    const elementsWithAppId = document.querySelectorAll('[data-app-id]');
    console.log('🔍 Found elements with data-app-id:', elementsWithAppId.length);

    if (elementsWithAppId.length === 0) {
        console.warn('⚠️ No elements with data-app-id found');
        return;
    }

    // 5. Test each element
    elementsWithAppId.forEach((element, index) => {
        console.log(`\n--- Element ${index + 1} ---`);
        console.log('Element:', element);
        console.log('AppId:', element.dataset.appId);

        // Check if it's in the element data map
        const dimensions = window.svgShaperEditor.elementManager.getElementDimensions(element);
        console.log('Dimensions from elementManager:', dimensions);

        // Check what would happen in the dialog
        if (dimensions && dimensions.shaperAttributes) {
            console.log('Shaper attributes:', dimensions.shaperAttributes);

            // Test form population logic
            ['cutDepth', 'cutOffset', 'toolDia'].forEach(inputId => {
                const attrName = `shaper:${inputId}`;
                const value = dimensions.shaperAttributes[attrName];
                console.log(`${attrName}:`, value);

                if (value && value.trim() !== '') {
                    const pixelValue = parseFloat(value);
                    if (!isNaN(pixelValue)) {
                        const convertedValue = window.svgShaperEditor.measurementSystem.convertPixelsToCurrentUnit(pixelValue);
                        const formattedValue = window.svgShaperEditor.measurementSystem.formatDisplayNumber(convertedValue);
                        console.log(`  → Converted to ${window.svgShaperEditor.measurementSystem.units}:`, formattedValue);
                    }
                }
            });
        } else {
            console.warn('❌ No dimensions or shaper attributes found');
        }
    });

    // 6. Check localStorage
    console.log('\n=== LOCALSTORAGE CHECK ===');
    const savedSettings = localStorage.getItem('shaperEditorSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.log('LocalStorage elementData:', settings.elementData);

        // Check for old format issues
        if (settings.elementData) {
            const hasOldFormat = settings.elementData.some(item =>
                !item.appId || item.appId.startsWith('element-') || (item.data && item.data.id && item.data.id.startsWith('element-'))
            );

            if (hasOldFormat) {
                console.error('❌ Old format detected in localStorage!');
            } else {
                console.log('✅ LocalStorage format looks correct');
            }
        }
    } else {
        console.log('No localStorage data');
    }

    console.log('=== DEBUG COMPLETE ===');
}

// Auto-run if elements are already loaded
if (document.readyState === 'complete') {
    setTimeout(debugDialogData, 500);
} else {
    window.addEventListener('load', () => {
        setTimeout(debugDialogData, 500);
    });
}