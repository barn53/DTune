
// Debug localStorage content
console.log('=== DEBUG localStorage content ===');
const savedSettings = localStorage.getItem('shaperEditorSettings');
if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    console.log('Settings:', settings);
    if (settings.elementData) {
        console.log('ElementData:', settings.elementData);
        settings.elementData.forEach((item, index) => {
            console.log(`Element ${index}:`, item);
        });
    }
} else {
    console.log('No localStorage data found');
}

// Also check if metaData exists
if (typeof window.svgShaperEditor !== 'undefined' && window.svgShaperEditor.metaData) {
    console.log('=== DEBUG MetaData elementDataMap ===');
    const elementDataMap = window.svgShaperEditor.metaData.getElementDataMap();
    console.log('ElementDataMap size:', elementDataMap.size);
    console.log('ElementDataMap entries:', Array.from(elementDataMap.entries()));
}

