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

        // Dynamic suggestion button configuration
        // Only specify one value (mm OR in), the other gets calculated automatically
        this.suggestionButtons = {
            cutDepth: {
                mm: [
                    { valueMm: 1, buttonText: '1.0' },
                    { valueMm: 2, buttonText: '2.0' },
                    { valueMm: 5, buttonText: '5.0' },
                    { valueMm: 8, buttonText: '8.0' },
                    { valueMm: 10, buttonText: '10.0' },
                    { valueMm: 12, buttonText: '12.0' },
                    { valueMm: 15, buttonText: '15.0' }
                ],
                in: [
                    { valueIn: (1/16), buttonText: '1/16' },
                    { valueIn: (1/8), buttonText: '1/8' },
                    { valueIn: (3/16), buttonText: '3/16' },
                    { valueIn: (1/4), buttonText: '1/4' },
                    { valueIn: (3/8), buttonText: '3/8' },
                    { valueIn: (1/2), buttonText: '1/2' },
                ]
            },
            cutOffset: {
                mm: [
                    { valueMm: 0, buttonText: '0.0' },
                    { valueMm: 0.02, buttonText: '0.02' },
                    { valueMm: 0.1, buttonText: '0.1' },
                    { valueMm: 0.5, buttonText: '0.5' },
                    { valueMm: 1, buttonText: '1.0' },
                    { valueMm: 2, buttonText: '2.0' },
                    { valueMm: 5, buttonText: '5.0' }
                ],
                in: [
                    { valueIn: 0, buttonText: '0.0' },
                    { valueIn: 0.001, buttonText: '0.001' },
                    { valueIn: 0.005, buttonText: '0.005' },
                    { valueIn: 0.01, buttonText: '0.01' },
                    { valueIn: (1/32), buttonText: '1/32' },
                    { valueIn: (1/16), buttonText: '1/16' },
                    { valueIn: (1/8), buttonText: '1/8' }
                ]
            },
            toolDia: {
                mm: [
                    { valueMm: 0.5, buttonText: '0.5' },
                    { valueMm: 3, buttonText: '3.0' },
                    { valueMm: 6, buttonText: '6.0' },
                    { valueMm: 8, buttonText: '8.0' },
                ],
                in: [
                    { valueIn: 0.02, buttonText: '0.02' },
                    { valueIn: (1/8), buttonText: '1/8' },
                    { valueIn: (1/4), buttonText: '1/4' },
                    { valueIn: (5/16), buttonText: '5/16' },
                ]
            }
        };

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

                    // Initialize raw value for focus loss handling
                    if (window.svgShaperEditor && window.svgShaperEditor.initializeRawValue) {
                        window.svgShaperEditor.initializeRawValue(input, formattedValue, this.measurementSystem.units);
                    }
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
     * Create and update suggestion buttons dynamically based on configuration
     *
     * Generates buttons from suggestionButtons object with different sets
     * for mm vs inches based on current unit system.
     */
    updateSuggestionButtons() {
        const currentUnit = this.measurementSystem.units;

        // Process each field that has suggestion buttons
        Object.keys(this.suggestionButtons).forEach(fieldName => {
            const container = document.querySelector(`#${fieldName}`).closest('.input-container').querySelector('.input-buttons');
            if (!container) return;

            // Clear existing buttons
            container.innerHTML = '';

            // Add sign toggle button for cutOffset as first button
            if (fieldName === 'cutOffset') {
                const toggleButton = document.createElement('button');
                toggleButton.type = 'button';
                toggleButton.className = 'value-btn sign-toggle-btn';
                toggleButton.innerHTML = `
                    <svg width="17" height="13" viewBox="0 0 17 13" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12.8837 0.375L16.375 3.875L12.8837 7.375V4.75H6.75V3H12.8837V0.375ZM0.625 9.125L4.11625 5.625V8.25H10.25V10H4.11625V12.625L0.625 9.125Z" fill="currentColor"></path>
                    </svg>
                `;
                toggleButton.title = 'Toggle sign (positive/negative)';
                toggleButton.dataset.target = fieldName;
                toggleButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleInputSign(fieldName);
                });
                container.appendChild(toggleButton);
            }

            // Get configuration for current unit
            const buttonConfigs = this.suggestionButtons[fieldName][currentUnit] || [];

            // Create buttons dynamically
            buttonConfigs.forEach(config => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'value-btn';
                button.dataset.target = fieldName;

                // Calculate missing value using measurement system conversion
                let valueMm, valueIn;
                if (config.valueMm !== undefined) {
                    valueMm = config.valueMm;
                    // Convert from mm to inches
                    valueIn = this.measurementSystem.convertBetweenUnits(valueMm, 'mm', 'in');
                } else {
                    valueIn = config.valueIn;
                    // Convert from inches to mm
                    valueMm = this.measurementSystem.convertBetweenUnits(valueIn, 'in', 'mm');
                }

                // Set both mm and inch values as data attributes
                button.dataset.valueMm = valueMm.toString();
                button.dataset.valueIn = valueIn.toString();

                // Set the value that goes into input field based on current unit
                button.dataset.value = currentUnit === 'mm' ? valueMm.toString() : valueIn.toString();

                // Set display text - for inches, always use HTML fraction formatting if it contains a fraction
                if (currentUnit === 'in' && config.buttonText.includes('/')) {
                    const htmlFraction = this.convertToHTMLFraction(config.buttonText);
                    button.innerHTML = htmlFraction;
                    button.classList.add('fraction');
                } else {
                    // For decimal values, respect the current decimal separator
                    let displayText = config.buttonText;
                    if (displayText.includes('.')) {
                        // Replace decimal point with current decimal separator
                        displayText = displayText.replace('.', this.measurementSystem.decimalSeparator);
                    }
                    button.textContent = displayText;
                }

                container.appendChild(button);
            });
        });

        // Reinitialize button event handlers after creating new buttons
        this.initializeValueButtons();
    }

    /**
     * Convert fraction string to HTML with sup/sub formatting
     *
     * @param {string} fraction - The fraction string to convert
     * @returns {string} HTML formatted fraction
     */
    convertToHTMLFraction(fraction) {
        // Handle slash notation fractions only
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
     * Attaches direct click handlers to each value button for reliable input updates.
     * Uses individual button handlers for maximum reliability.
     */
    initializeValueButtons() {
        // Find all value buttons (excluding sign toggle buttons)
        const valueButtons = document.querySelectorAll('.value-btn:not(.sign-toggle-btn)');

        // Remove any existing listeners and attach new ones
        valueButtons.forEach(button => {
            // Clone button to remove all existing event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            // Add fresh event listener
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('Button clicked:', newButton); // Debug log

                const targetInputId = newButton.dataset.target;
                const value = newButton.dataset.value;
                const targetInput = document.getElementById(targetInputId);

                console.log('Target:', targetInputId, 'Value:', value, 'Input found:', !!targetInput); // Debug log

                if (targetInput && value) {
                    let numericValue = parseFloat(value);

                    // For cutOffset, preserve the current sign if input has negative value
                    if (targetInputId === 'cutOffset') {
                        const currentSign = this.getCurrentOffsetSign();
                        if (currentSign === -1 && numericValue > 0) {
                            numericValue = -numericValue;
                        }
                        console.log('Offset sign preserved:', currentSign, 'Final value:', numericValue); // Debug log
                    }

                    const formattedValue = this.measurementSystem.formatDisplayNumber(numericValue);
                    targetInput.value = formattedValue;

                    console.log('Value set:', formattedValue); // Debug log

                    // Trigger input event to notify other systems
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    console.warn('Failed to set value - missing input or value:', targetInputId, value); // Debug log
                }
            });
        });
    }

    /**
     * Toggle the sign of a numeric input value
     *
     * @param {string} inputId - The ID of the input field to toggle
     */
    toggleInputSign(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        let currentValue = input.value.trim();
        if (!currentValue || currentValue === '') {
            // If empty, set to 0
            input.value = '0';
            return;
        }

        // Handle both decimal separators (. and ,)
        const normalizedValue = currentValue.replace(',', '.');

        // Parse the current numeric value
        const numericValue = parseFloat(normalizedValue);
        if (isNaN(numericValue)) return;

        // Toggle the sign
        const newValue = -numericValue;
        const formattedValue = this.measurementSystem.formatDisplayNumber(newValue);
        input.value = formattedValue;
    }

    /**
     * Get the current sign of the cutOffset input field
     *
     * @returns {number} -1 for negative, 1 for positive/zero
     */
    getCurrentOffsetSign() {
        const input = document.getElementById('cutOffset');
        if (!input) return 1;

        const currentValue = input.value.trim();
        if (!currentValue || currentValue === '') return 1;

        // Handle both decimal separators
        const normalizedValue = currentValue.replace(',', '.');
        const numericValue = parseFloat(normalizedValue);

        return (numericValue < 0) ? -1 : 1;
    }
}