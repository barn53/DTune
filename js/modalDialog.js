/**
 * Modal Dialog Module - Attribute Editing Interface
 *
 * Manages the Cut Planning modal dialog for editing SVG path attributes.
 * Provides form controls, batch editing, and validation for shaper attributes
 * including cut type, depth, offset, and tool diameter.
 *
 * Key Features:
 * - Batch editing for multiple selected paths
 * - Custom cut type slider with visual feedback
 * - Quick-select value buttons for common values
 * - Unit conversion and display formatting
 * - Form validation and error handling
 */
class ModalDialog {
    /**
     * Initialize modal dialog with system dependencies
     *
     * @param {MeasurementSystem} measurementSystem - Unit conversion and validation
     * @param {ElementManager} elementManager - SVG element operations and selection
     */
    constructor(measurementSystem, elementManager) {
        this.measurementSystem = measurementSystem;
        this.elementManager = elementManager;

        // Initialize DRY utilities helper
        this.dryUtils = new DRYUtilities(measurementSystem);

        // Modal dialog elements
        this.modal = null;
        this.selectedElementsInfo = null;

        // Cut type slider components
        this.cutTypeOptions = null;
        this.cutTypeIndicator = null;
        this.cutTypeInput = null;
        this.optionWidth = 0;
    }

    /**
     * Initialize modal dialog DOM elements and event handlers
     *
     * Sets up form controls, slider, and event listeners.
     * Must be called after DOM is fully loaded.
     */
    initialize() {
        // Bind modal dialog elements using DRY utilities
        DRYUtilities.bindElements({
            modal: 'attributeModal'
        }, this);

        // Initialize cut type slider
        this.initializeCutTypeSlider();

        // Initialize value button handlers
        this.initializeValueButtons();
    }

    /**
     * Open attribute editing modal for selected path(s)
     *
     * Displays modal dialog with form populated from primary path's
     * attribute values, and displays modal dialog for editing.
     *
     * @param {Element} path - Primary SVG path element for editing
     * @param {Array} selectedElementsInfo - Array of selected elements with their attributes
     */
    openAttributeModal(path, selectedElementsInfo = null) {
        // Store selected elements info for use in form handling
        this.selectedElementsInfo = selectedElementsInfo;

        // Update batch counter in modal
        const batchCounter = document.getElementById('batchCounter');
        const count = selectedElementsInfo ? selectedElementsInfo.length : 1;
        if (batchCounter) {
            batchCounter.textContent = count;
        }

        // Populate form with primary element's data
        this.populateAttributeForm(path);
        this.modal.style.display = 'flex';

        // With equal-slot slider logic a single positioning pass is sufficient
        const active = Array.from(this.cutTypeOptions || []).findIndex(opt => opt.classList.contains('active'));
        if (active >= 0) this.updateCutTypeUI(active);

        // Log selected elements info for debugging
        if (selectedElementsInfo) {
            console.log('DEBUG openAttributeModal - Planning cuts for elements:', selectedElementsInfo);
        }
        console.log('DEBUG openAttributeModal - Primary path element:', path);
        console.log('DEBUG openAttributeModal - Primary path appId:', path.dataset.appId);
    }

    /**
     * Close attribute modal and clear selection
     *
     * Hides modal dialog, deselects current path, and resets
     * all form fields to empty state for next use.
     */
    closeModal() {
        this.modal.style.display = 'none';
        // Don't clear selection when closing modal - keep elements selected

        // Reset form fields to empty state
        document.getElementById('cutDepth').value = '';
        document.getElementById('cutOffset').value = '';
        document.getElementById('toolDia').value = '';
    }

    /**
     * Populate attribute form with path's current values
     *
     * Extracts stored shaper attributes from path's element data and
     * populates form fields with user-readable values. Converts pixel-based
     * storage to current measurement units for display.
     *
     * @param {Element} path - SVG path element to read attributes from
     */
    populateAttributeForm(path) {
        // Extract shaper attributes from cached element data
        const dimensions = this.elementManager.getElementDimensions(path);
        const shaperAttrs = dimensions.shaperAttributes || {};

        // Get cut type for slider positioning
        const cutType = shaperAttrs['shaper:cutType'] || '';

        // Convert pixel-stored values to current units for form display
        ['cutDepth', 'cutOffset', 'toolDia'].forEach(inputId => {
            const input = document.getElementById(inputId);
            const attrName = `shaper:${inputId}`;
            const value = shaperAttrs[attrName];

            if (value && value.trim() !== '') {
                // Convert from pixel storage to current display units
                const pixelValue = DRYUtilities.parseNumericValue(value);
                if (pixelValue !== 0 || value === '0') {
                    const formattedValue = this.measurementSystem.formatDisplayNumber(
                        this.measurementSystem.convertPixelsToCurrentUnit(pixelValue)
                    );
                    input.value = formattedValue;
                } else {
                    input.value = '';
                }
            } else {
                input.value = '';
            }
        });

        // Position cut type slider based on stored value
        this.setCutTypeSlider(cutType);

        // Update unit labels to match current measurement system
        this.updateDialogUnits();
    }

    /**
     * Update unit labels throughout modal dialog
     *
     * Synchronizes all unit display labels with current measurement
     * system setting (inches, millimeters, etc.).
     */
    updateDialogUnits() {
        const unitLabels = document.querySelectorAll('.input-unit');
        unitLabels.forEach(label => {
            label.textContent = this.measurementSystem.units;
        });

        // Update suggestion button values and displays based on current unit
        this.updateSuggestionButtons();
    }

    /**
     * Update suggestion button values and displays based on current unit system
     *
     * Shows appropriate values for mm vs inches with proper fraction display
     * for imperial measurements.
     */
    updateSuggestionButtons() {
        const buttons = document.querySelectorAll('.value-btn');
        const currentUnit = this.measurementSystem.units;

        buttons.forEach(button => {
            // Remove fraction class first
            button.classList.remove('fraction');

            if (currentUnit === 'mm') {
                // Use millimeter values
                const mmValue = button.dataset.valueMm;
                if (mmValue !== undefined) {
                    button.dataset.value = mmValue;
                    button.textContent = parseFloat(mmValue).toFixed(1);
                }
            } else {
                // Use inch values with HTML fraction display
                const inValue = button.dataset.valueIn;
                const fraction = button.dataset.fraction;

                if (inValue !== undefined && fraction !== undefined) {
                    button.dataset.value = inValue;

                    if (fraction === '0') {
                        button.textContent = '0';
                    } else if (this.isCommonFraction(fraction)) {
                        // Convert fraction to HTML format
                        const htmlFraction = this.convertToHTMLFraction(fraction);
                        button.innerHTML = htmlFraction;
                        button.classList.add('fraction');
                    } else {
                        button.textContent = parseFloat(inValue).toFixed(3);
                    }
                }
            }
        });
    }

    /**
     * Convert fraction string to HTML with sup/sub formatting
     *
     * @param {string} fraction - The fraction string to convert
     * @returns {string} HTML formatted fraction
     */
    convertToHTMLFraction(fraction) {
        // Handle common Unicode fractions first
        const unicodeFractions = {
            '⅛': '<sup>1</sup>&frasl;<sub>8</sub>',
            '¼': '<sup>1</sup>&frasl;<sub>4</sub>',
            '⅜': '<sup>3</sup>&frasl;<sub>8</sub>',
            '½': '<sup>1</sup>&frasl;<sub>2</sub>',
            '⅝': '<sup>5</sup>&frasl;<sub>8</sub>',
            '¾': '<sup>3</sup>&frasl;<sub>4</sub>',
            '⅞': '<sup>7</sup>&frasl;<sub>8</sub>'
        };

        if (unicodeFractions[fraction]) {
            return unicodeFractions[fraction];
        }

        // Handle slash notation fractions
        if (fraction.includes('/')) {
            const parts = fraction.split('/');
            if (parts.length === 2) {
                const numerator = parts[0].trim();
                const denominator = parts[1].trim();
                return `<sup>${numerator}</sup>&frasl;<sub>${denominator}</sub>`;
            }
        }

        // Fallback to original fraction string
        return fraction;
    }

    /**
     * Check if fraction should be displayed as fraction vs decimal
     *
     * @param {string} fraction - The fraction string to check
     * @returns {boolean} True if should display as fraction
     */
    isCommonFraction(fraction) {
        // Common fractions that look good as Unicode symbols
        const commonFractions = ['⅛', '¼', '⅜', '½', '⅝', '¾', '⅞', '1/16', '3/16', '5/8', '1/32', '1/64'];
        return commonFractions.includes(fraction);
    }

    /**
     * Initialize custom cut type slider control
     *
     * Sets up visual slider with click handlers for cut type selection.
     * Calculates option widths and connects UI to hidden form input.
     * Provides touch-friendly alternative to standard dropdowns.
     */
    initializeCutTypeSlider() {
        this.cutTypeOptions = document.querySelectorAll('.cut-type-option');
        this.cutTypeIndicator = document.querySelector('.cut-type-indicator');
        this.cutTypeInput = document.getElementById('cutType');
        this.optionWidth = 100 / this.cutTypeOptions.length;

        // Connect click handlers for each slider option
        this.cutTypeOptions.forEach((option, index) => {
            option.addEventListener('click', () => this.selectCutType(index));
        });
    }

    /**
     * Select cut type option and update slider visual state
     *
     * Updates slider position, active option highlighting, and underlying
     * form input value. Provides immediate visual feedback for selection.
     *
     * @param {number} index - Zero-based index of cut type option
     */
    selectCutType(index) {
        // Clear previous selection
        this.cutTypeOptions.forEach(option => option.classList.remove('active'));
        this.cutTypeOptions[index].classList.add('active');

        // Update slider visual position
        this.updateCutTypeUI(index);

        // Set hidden form input value
        this.cutTypeInput.value = this.cutTypeOptions[index].getAttribute('data-type');
    }

    /**
     * Set cut type slider position based on stored value
     *
     * Finds slider option matching the provided cut type value and
     * positions slider accordingly. Used when populating form with
     * existing attribute values.
     *
     * @param {string} cutType - Cut type value to match (e.g., 'online', 'inside')
     */
    setCutTypeSlider(cutType) {
        const option = Array.from(this.cutTypeOptions).find(opt =>
            opt.getAttribute('data-type') === cutType
        );

        if (option) {
            const index = Array.from(this.cutTypeOptions).indexOf(option);
            this.selectCutType(index);
        }
    }

    /**
     * Update cut type slider visual indicator position
     *
     * Animates slider indicator to match active option position.
     * Calculates position and width based on actual button dimensions.
     *
     * @param {number} activeIndex - Index of currently selected option
     */
    updateCutTypeUI(activeIndex) {
        if (!this.cutTypeIndicator) return;
        const total = this.cutTypeOptions.length;
        if (activeIndex < 0 || activeIndex >= total) return;

        // Equal slot model: each option gets same horizontal slice (simplest + stable)
        const slotWidthPct = 100 / total;
        const leftPct = slotWidthPct * activeIndex;

        // Direct percentage positioning eliminates layout timing & font metric issues
        this.cutTypeIndicator.style.left = leftPct + '%';
        this.cutTypeIndicator.style.width = slotWidthPct + '%';
    }

    /**
     * Get currently selected elements info for batch operations
     *
     * @returns {Array|null} Array of selected elements or null if single element
     */
    getSelectedElementsInfo() {
        return this.selectedElementsInfo;
    }

    /**
     * Check if modal is currently visible
     *
     * @returns {boolean} True if modal is displayed
     */
    isVisible() {
        return this.modal && this.modal.style.display === 'flex';
    }

    /**
     * Initialize value button click handlers
     *
     * Attaches direct click handlers to each value button for reliable input updates
     */
    initializeValueButtons() {
        const valueButtons = document.querySelectorAll('.value-btn');

        valueButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const targetInputId = button.dataset.target;
                const value = button.dataset.value;
                const targetInput = document.getElementById(targetInputId);

                if (targetInput && value) {
                    const numericValue = parseFloat(value);
                    const formattedValue = this.measurementSystem.formatDisplayNumber(numericValue);
                    targetInput.value = formattedValue;
                }
            });
        });
    }
}