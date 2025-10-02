/**
 * localStorage Repair Utility
 * Run this script to fix corrupted localStorage data
 */

function repairLocalStorage() {
    console.log('=== LOCALSTORAGE REPAIR UTILITY ===');

    try {
        const savedSettings = localStorage.getItem('shaperEditorSettings');

        if (!savedSettings) {
            console.log('✅ No localStorage data found - nothing to repair');
            return;
        }

        let settings;
        try {
            settings = JSON.parse(savedSettings);
        } catch (parseError) {
            console.error('❌ localStorage data is corrupted (JSON parse error)');
            console.log('🔧 Clearing localStorage...');
            localStorage.removeItem('shaperEditorSettings');
            console.log('✅ Corrupted localStorage cleared');
            return;
        }

        console.log('📊 Current localStorage data:', settings);

        // Check for corrupted SVG data
        let needsRepair = false;

        if (settings.originalSVG && typeof settings.originalSVG === 'string') {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(settings.originalSVG, 'image/svg+xml');
                const parseError = doc.querySelector('parsererror');

                if (parseError) {
                    console.warn('❌ Corrupted originalSVG detected');
                    settings.originalSVG = null;
                    needsRepair = true;
                }
            } catch (error) {
                console.warn('❌ Invalid originalSVG detected');
                settings.originalSVG = null;
                needsRepair = true;
            }
        }

        // Clear other SVG clones if original is corrupted
        if (needsRepair) {
            settings.displayCloneSVG = null;
            settings.measurementCloneSVG = null;
            settings.fileName = null;
            console.log('🔧 Clearing corrupted SVG data...');
        }

        // Check elementData format
        if (settings.elementData && Array.isArray(settings.elementData)) {
            const hasOldFormat = settings.elementData.some(item =>
                !item.appId || item.appId.startsWith('element-') ||
                (item.data && item.data.id && item.data.id.startsWith('element-'))
            );

            if (hasOldFormat) {
                console.warn('❌ Old format elementData detected');
                settings.elementData = [];
                needsRepair = true;
            }
        }

        if (needsRepair) {
            localStorage.setItem('shaperEditorSettings', JSON.stringify(settings));
            console.log('✅ localStorage repaired!');
            console.log('🔄 Please reload the page for changes to take effect');
        } else {
            console.log('✅ localStorage data looks good - no repair needed');
        }

    } catch (error) {
        console.error('❌ Error during repair:', error);
        console.log('🔧 Clearing all localStorage as last resort...');
        localStorage.clear();
        console.log('✅ localStorage completely cleared');
    }
}

// Auto-run the repair
repairLocalStorage();

// Also provide a manual clear function
function clearAllData() {
    localStorage.clear();
    console.log('🧹 All localStorage cleared. Reload the page.');
}