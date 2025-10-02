/**
 * MetaData - Centralized Application Data Management
 *
 * Single source of truth for all application state, settings, and data.
 * Manages persistence, access, and synchronization across all subsystems.
 *
 * Key Responsibilities:
 * - Centralized state management with localStorage persistence
 * - SVG data and clone management (original, display, measurement)
 * - Element data cache and shaper attributes
 * - Application settings (units, viewport, gutter, etc.)
 * - File management state (filename, load state)
 * - Export data preparation and coordination
 */
class MetaData {
    /**
     * Initialize MetaData with measurement system integration
     * @param {MeasurementSystem} measurementSystem - For unit conversions
     */
    constructor(measurementSystem) {
        this.measurementSystem = measurementSystem;
        this.loadingFromLocalStorage = false;

        // Batching system for efficient saves
        this.saveTimeout = null;
        this.saveBatchDelayMs = 100; // Batch saves within 100ms

        // Application settings
        this.settings = {
            units: 'mm',                    // Current unit system
            decimalSeparator: '.',          // Current decimal separator
            dpi: 96,                        // DPI for unit conversions
            zoom: 1,                        // Viewport zoom level
            panX: 0,                        // Viewport pan X
            panY: 0,                        // Viewport pan Y
            gutterEnabled: false,           // Gutter overlay enabled
            gutterSizeRawMm: 10            // Gutter size in mm
        };

        // SVG data management
        this.svgData = {
            originalSVG: null,              // Original loaded SVG
            displayCloneSVG: null,          // Display clone with styling
            measurementCloneSVG: null       // Measurement clone for calculations
        };

        // Element data cache
        this.elementData = {
            elementDataMap: new Map(),      // Performance cache for element data
            shaperAttributes: new Map()     // Element shaper attributes
        };

        // Application state
        this.applicationState = {
            currentFileName: null           // Currently loaded file name
        };

        // Load existing data
        this.loadFromLocalStorage();
    }

    /**
     * Schedule a batched save to localStorage
     * Multiple rapid changes will be batched together for efficiency
     */
    scheduleSave() {
        if (this.loadingFromLocalStorage) return; // Don't save during load

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.saveToLocalStorage();
            this.saveTimeout = null;
        }, this.saveBatchDelayMs);
    }

    /**
     * Force immediate save to localStorage (for explicit saves)
     */
    forceSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.saveToLocalStorage();
    }

    // ============================================================================
    // APPLICATION STATE MANAGEMENT
    // ============================================================================

    /**
     * Set application loading state
     * @param {boolean} isLoading - Whether loading from localStorage
     */
    setLoadingFromLocalStorage(isLoading) {
        this.applicationState.isLoadingFromLocalStorage = isLoading;
    }

    /**
     * Get loading state
     * @returns {boolean} Whether currently loading from localStorage
     */
    isLoadingFromLocalStorage() {
        return this.applicationState.isLoadingFromLocalStorage;
    }

    /**
     * Set current filename
     * @param {string} fileName - Current file name
     */
    setCurrentFileName(fileName) {
        this.applicationState.currentFileName = fileName;
        this.scheduleSave();
    }

    /**
     * Get current filename
     * @returns {string|null} Current filename or null
     */
    getCurrentFileName() {
        return this.applicationState.currentFileName;
    }

    // ============================================================================
    // SVG DATA MANAGEMENT
    // ============================================================================

    /**
     * Set original SVG data with validation
     * @param {string} svgContent - Original SVG content
     */
    setOriginalSVG(svgContent) {
        // Validate SVG content if not null
        if (svgContent !== null && !this.isValidSVGContent(svgContent)) {
            console.warn('Invalid SVG content detected, not storing');
            return;
        }
        this.svgData.originalSVG = svgContent;
        this.scheduleSave();
    }

    /**
     * Validate SVG content
     * @param {string} svgContent - SVG content to validate
     * @returns {boolean} True if valid SVG
     */
    isValidSVGContent(svgContent) {
        if (!svgContent || typeof svgContent !== 'string') {
            return false;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');

            // Check for parser errors
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                return false;
            }

            // Check if it contains an SVG root element
            const svgElement = doc.querySelector('svg');
            return svgElement !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get original SVG data
     * @returns {string|null} Original SVG content
     */
    getOriginalSVG() {
        return this.svgData.originalSVG;
    }

    /**
     * Set display clone SVG
     * @param {string} svgContent - Display clone SVG content
     */
    setDisplayCloneSVG(svgContent) {
        this.svgData.displayCloneSVG = svgContent;
        this.scheduleSave();
    }

    /**
     * Get display clone SVG
     * @returns {string|null} Display clone SVG content
     */
    getDisplayCloneSVG() {
        return this.svgData.displayCloneSVG;
    }

    /**
     * Set measurement clone SVG
     * @param {string} svgContent - Measurement clone SVG content
     */
    setMeasurementCloneSVG(svgContent) {
        this.svgData.measurementCloneSVG = svgContent;
        this.scheduleSave();
    }

    /**
     * Get measurement clone SVG
     * @returns {string|null} Measurement clone SVG content
     */
    getMeasurementCloneSVG() {
        return this.svgData.measurementCloneSVG;
    }

    // ============================================================================
    // ELEMENT DATA MANAGEMENT
    // ============================================================================

    /**
     * Get element data map
     * @returns {Map} Element data cache
     */
    getElementDataMap() {
        return this.elementData.elementDataMap;
    }

    /**
     * Set element data
     * @param {string} elementId - Element ID
     * @param {Object} data - Element data
     */
    setElementData(elementId, data) {
        this.elementData.elementDataMap.set(elementId, data);
        this.scheduleSave();
    }

    /**
     * Set multiple element data entries efficiently
     * @param {Map|Array} elementDataEntries - Map or array of [id, data] pairs
     */
    setElementDataBatch(elementDataEntries) {
        if (elementDataEntries instanceof Map) {
            elementDataEntries.forEach((data, id) => {
                this.elementData.elementDataMap.set(id, data);
            });
        } else if (Array.isArray(elementDataEntries)) {
            elementDataEntries.forEach(([id, data]) => {
                this.elementData.elementDataMap.set(id, data);
            });
        }
        this.scheduleSave();
    }

    /**
     * Get element data
     * @param {string} elementId - Element ID
     * @returns {Object|undefined} Element data
     */
    getElementData(elementId) {
        return this.elementData.elementDataMap.get(elementId);
    }

    /**
     * Clear all element data
     */
    clearElementData() {
        this.elementData.elementDataMap.clear();
        this.elementData.shaperAttributes.clear();
        this.scheduleSave();
    }

    // ============================================================================
    // SETTINGS MANAGEMENT
    // ============================================================================

    /**
     * Set measurement units
     * @param {string} units - 'mm' or 'in'
     */
    setUnits(units) {
        this.settings.units = units;
        this.scheduleSave();
    }

    /**
     * Get measurement units
     * @returns {string} Current units
     */
    getUnits() {
        return this.settings.units;
    }

    /**
     * Set decimal separator
     * @param {string} separator - '.' or ','
     */
    setDecimalSeparator(separator) {
        this.settings.decimalSeparator = separator;
        this.scheduleSave();
    }

    /**
     * Get decimal separator
     * @returns {string} Current decimal separator
     */
    getDecimalSeparator() {
        return this.settings.decimalSeparator;
    }

    /**
     * Set viewport state
     * @param {number} zoom - Zoom level
     * @param {number} panX - Pan X offset
     * @param {number} panY - Pan Y offset
     */
    setViewportState(zoom, panX, panY) {
        this.settings.zoom = zoom;
        this.settings.panX = panX;
        this.settings.panY = panY;
        this.scheduleSave();
    }

    /**
     * Get viewport state
     * @returns {Object} Viewport state {zoom, panX, panY}
     */
    getViewportState() {
        return {
            zoom: this.settings.zoom,
            panX: this.settings.panX,
            panY: this.settings.panY
        };
    }

    /**
     * Set gutter settings
     * @param {boolean} enabled - Whether gutter is enabled
     * @param {number} sizeRawMm - Gutter size in mm
     */
    setGutterSettings(enabled, sizeRawMm) {
        this.settings.gutterEnabled = enabled;
        this.settings.gutterSizeRawMm = sizeRawMm;
        this.scheduleSave();
    }

    /**
     * Get gutter settings
     * @returns {Object} Gutter settings {enabled, sizeRawMm}
     */
    getGutterSettings() {
        return {
            enabled: this.settings.gutterEnabled,
            sizeRawMm: this.settings.gutterSizeRawMm
        };
    }

    // ============================================================================
    // PERSISTENCE MANAGEMENT
    // ============================================================================

    /**
     * Save all data to localStorage
     */
    saveToLocalStorage() {
        try {
            const persistentData = {
                // Application settings
                units: this.settings.units,
                decimalSeparator: this.settings.decimalSeparator,
                dpi: this.settings.dpi,

                // Viewport state
                zoom: this.settings.zoom,
                panX: this.settings.panX,
                panY: this.settings.panY,

                // Gutter settings
                gutterEnabled: this.settings.gutterEnabled,
                gutterSizeRawMm: this.settings.gutterSizeRawMm,

                // SVG data
                originalSVG: this.svgData.originalSVG,
                displayCloneSVG: this.svgData.displayCloneSVG,
                measurementCloneSVG: this.svgData.measurementCloneSVG,

                // File state
                fileName: this.applicationState.currentFileName,

                // Element data
                elementData: Array.from(this.elementData.elementDataMap.entries()).map(([id, data]) => ({
                    appId: id,
                    data: data
                }))
            };

            localStorage.setItem('shaperEditorSettings', JSON.stringify(persistentData));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    /**
     * Save only viewport state (lightweight save for frequent updates)
     */
    saveViewportOnly() {
        try {
            const savedSettings = localStorage.getItem('shaperEditorSettings');
            let settings = savedSettings ? JSON.parse(savedSettings) : {};

            // Update only viewport state
            settings.zoom = this.settings.zoom;
            settings.panX = this.settings.panX;
            settings.panY = this.settings.panY;

            localStorage.setItem('shaperEditorSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save viewport state:', error);
        }
    }

    /**
     * Load all data from localStorage
     */
    loadFromLocalStorage() {
        try {
            const savedSettings = localStorage.getItem('shaperEditorSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);

                // Load application settings
                if (settings.units) this.settings.units = settings.units;
                if (settings.decimalSeparator) this.settings.decimalSeparator = settings.decimalSeparator;
                if (settings.dpi) this.settings.dpi = settings.dpi;

                // Load viewport state
                if (typeof settings.zoom === 'number') this.settings.zoom = settings.zoom;
                if (typeof settings.panX === 'number') this.settings.panX = settings.panX;
                if (typeof settings.panY === 'number') this.settings.panY = settings.panY;

                // Load gutter settings
                if (typeof settings.gutterEnabled === 'boolean') this.settings.gutterEnabled = settings.gutterEnabled;
                if (typeof settings.gutterSizeRawMm === 'number') this.settings.gutterSizeRawMm = settings.gutterSizeRawMm;

                // Load SVG data
                if (settings.originalSVG) this.svgData.originalSVG = settings.originalSVG;
                if (settings.displayCloneSVG) this.svgData.displayCloneSVG = settings.displayCloneSVG;
                if (settings.measurementCloneSVG) this.svgData.measurementCloneSVG = settings.measurementCloneSVG;

                // Load file state
                if (settings.fileName) this.applicationState.currentFileName = settings.fileName;

                // Load element data
                if (settings.elementData && Array.isArray(settings.elementData)) {
                    this.elementData.elementDataMap.clear();
                    settings.elementData.forEach(item => {
                        if (item.appId && item.data) {
                            this.elementData.elementDataMap.set(item.appId, item.data);
                        }
                    });
                }

                return settings;
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
        return null;
    }

    /**
     * Clear all data (reset application state)
     */
    clearAll() {
        // Reset application state
        this.applicationState.isLoadingFromLocalStorage = false;
        this.applicationState.boundaryTooltipActive = false;
        this.applicationState.currentFileName = null;

        // Clear SVG data
        this.svgData.originalSVG = null;
        this.svgData.displayCloneSVG = null;
        this.svgData.measurementCloneSVG = null;

        // Clear element data
        this.elementData.elementDataMap.clear();
        this.elementData.shaperAttributes.clear();

        // Reset settings to defaults
        this.settings.zoom = 1.0;
        this.settings.panX = 0;
        this.settings.panY = 0;

        // Save cleared state
        this.scheduleSave();
    }

    // ============================================================================
    // EXPORT DATA PREPARATION
    // ============================================================================

    /**
     * Prepare comprehensive data for export
     * @returns {Object} All data needed for SVG export with shaper attributes
     */
    prepareExportData() {
        return {
            originalSVG: this.svgData.originalSVG,
            displayCloneSVG: this.svgData.displayCloneSVG,
            measurementCloneSVG: this.svgData.measurementCloneSVG,
            elementDataMap: this.elementData.elementDataMap,
            shaperAttributes: this.elementData.shaperAttributes,
            settings: {
                units: this.settings.units,
                dpi: this.settings.dpi,
                decimalSeparator: this.settings.decimalSeparator
            },
            fileName: this.applicationState.currentFileName
        };
    }

    /**
     * Force clear all localStorage data (for debugging)
     */
    clearLocalStorage() {
        try {
            localStorage.removeItem('shaperEditorSettings');
            console.log('DEBUG: localStorage cleared');
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }

    /**
     * Debug method to check localStorage content
     */
    debugLocalStorage() {
        try {
            const savedSettings = localStorage.getItem('shaperEditorSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                console.log('DEBUG: localStorage content:', settings);
                if (settings.elementData) {
                    console.log('DEBUG: elementData in localStorage:', settings.elementData);
                }
            } else {
                console.log('DEBUG: No localStorage data found');
            }
        } catch (error) {
            console.warn('DEBUG: Error reading localStorage:', error);
        }
    }

    /**
     * Clear corrupted data and reset to clean state
     */
    clearCorruptedData() {
        console.log('Clearing corrupted application data...');

        // Clear SVG data
        this.svgData.originalSVG = null;
        this.svgData.displayCloneSVG = null;
        this.svgData.measurementCloneSVG = null;

        // Clear file state
        this.applicationState.currentFileName = null;

        // Clear element data
        this.elementData.elementDataMap.clear();
        this.elementData.shaperAttributes.clear();

        // Force save to localStorage
        this.forceSave();

        console.log('Corrupted data cleared. Please reload a fresh SVG file.');
    }
}