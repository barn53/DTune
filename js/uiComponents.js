/**
 * UI Components Module - Interactive User Interface Management
 *
 * Manages complex UI elements including modal dialogs, contextual tooltips,
 * custom sliders, and context menus. Provides the interactive layer between
 * user actions and core system functionality.
 *
 * Key Features:
 * - Attribute editing modal with form validation
 * - Smart tooltips with measurement unit awareness
 * - Custom cut-type slider with visual feedback
 * - Context menu for path operations
 * - Touch-friendly interaction patterns
 */
class UIComponents {
    /**
     * Initialize UI components with system dependencies
     *
     * @param {MeasurementSystem} measurementSystem - Unit conversion and validation
     * @param {ElementManager} elementManager - SVG element operations and selection
     */
    constructor(measurementSystem, elementManager) {
        this.measurementSystem = measurementSystem;
        this.elementManager = elementManager;

        // Modal dialog elements
        this.modal = null;
        this.selectedPathInfo = null;

        // Tooltip system for contextual help
        this.tooltip = null;
        this.tooltipHideTimeout = null;

        // Cut type slider components
        this.cutTypeOptions = null;
        this.cutTypeIndicator = null;
        this.cutTypeInput = null;

        // Context menu for path operations
        this.contextMenu = null;
        this.contextMenuVisible = false;

        // Layout calculations
        this.optionWidth = 0;
    }

    /**
     * Initialize all UI component DOM elements and event handlers
     *
     * Sets up modal dialogs, tooltips, context menus, and custom controls.
     * Must be called after DOM is fully loaded.
     */
    initializeElements() {
        // Connect modal dialog elements
        this.modal = document.getElementById('attributeModal');
        this.selectedPathInfo = document.getElementById('selectedPathInfo');

        // Initialize interactive components
        this.createTooltip();
        this.createContextMenu();
        this.initializeCutTypeSlider();
    }

    /**
     * Open attribute editing modal for selected path
     *
     * Selects the target path element, populates form with current
     * attribute values, and displays modal dialog for editing.
     *
     * @param {Element} path - SVG path element to edit
     */
    openAttributeModal(path) {
        // Note: This method will be called from menu entry, not from element clicks
        // The path should already be selected through the new selection system
        this.populateAttributeForm(path);
        this.modal.style.display = 'flex';
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
        // Display path identification in modal header
        if (this.selectedPathInfo) {
            this.selectedPathInfo.textContent = this.elementManager.getElementDescription(path);
        }

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
                const pixelValue = parseFloat(value);
                if (!isNaN(pixelValue)) {
                    const convertedValue = this.measurementSystem.convertPixelsToCurrentUnit(pixelValue);
                    const formattedValue = this.measurementSystem.formatDisplayNumber(convertedValue);
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
     * @param {string} cutType - Cut type value to match (e.g., 'score', 'cut')
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
     * Calculates position and width based on option layout.
     *
     * @param {number} activeIndex - Index of currently selected option
     */
    updateCutTypeUI(activeIndex) {
        if (this.cutTypeIndicator) {
            this.cutTypeIndicator.style.left = `${activeIndex * this.optionWidth}%`;
            this.cutTypeIndicator.style.width = `${this.optionWidth}%`;
        }
    }

    /**
     * Create tooltip DOM element for contextual information display
     *
     * Generates floating tooltip container and adds to document body.
     * Tooltip is positioned dynamically based on mouse cursor location.
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'shaper-tooltip';
        document.body.appendChild(this.tooltip);
    }

    /**
     * Display contextual tooltip with element information
     *
     * Shows comprehensive tooltip with measurements and shaper attributes.
     * Positions tooltip near cursor while avoiding screen edge clipping.
     * Cancels auto-hide timers for persistent display during hover.
     *
     * @param {Element} path - SVG path element to display information for
     * @param {number} mouseX - Mouse cursor X coordinate for positioning
     * @param {number} mouseY - Mouse cursor Y coordinate for positioning
     */
    showTooltip(path, mouseX, mouseY) {
        if (!this.tooltip) return;

        // Cancel any pending auto-hide to keep tooltip visible during hover
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }

        // Extract element identifier for tooltip header
        const appId = path.dataset.appId || 'unknown';
        const shortId = appId.replace('app-id-', ''); // Clean display format
        let content = `<div class="tooltip-title">Element Info (${shortId})</div>`;

        // Build measurements section with current unit display
        const measurements = this.elementManager.getElementMeasurements(path);
        if (measurements.length > 0) {
            content += '<div class="tooltip-section"><div class="section-title">Measurements</div>';
            measurements.forEach(measurement => {
                content += `
                    <div class="tooltip-measurement">
                        <span class="measurement-name">${measurement.name}:</span>
                        <span class="measurement-value">${measurement.value}</span>
                    </div>`;
            });
            content += '</div>';
        }

        // Build shaper attributes section with interactive hints
        content += '<div class="tooltip-section"><div class="section-title">Shaper Attributes</div>';
        const attributes = this.getShaperAttributes(path);

        if (attributes.length === 0) {
            content += '<div class="no-attributes">No shaper attributes defined<br>- click to change</div>';
        } else {
            attributes.forEach(attr => {
                content += `
                    <div class="tooltip-attribute">
                        <span class="attr-name">${attr.name}:</span>
                        <span class="attr-value">${attr.value}</span>
                    </div>`;
            });
        }
        content += '</div>';

        // Apply content and position tooltip with smooth transition
        this.tooltip.innerHTML = content;
        this.updateTooltipPosition(mouseX, mouseY);
        this.tooltip.style.display = 'block';

        // Use requestAnimationFrame for smooth CSS transition effects
        requestAnimationFrame(() => {
            if (this.tooltip) {
                this.tooltip.classList.add('visible');
            }
        });
    }

    /**
     * Display boundary tooltip with canvas dimensions
     *
     * Shows SVG canvas boundary information with accurate dimensions
     * calculated using measurement clone technique for precision.
     *
     * @param {Element} boundaryPath - SVG boundary path element
     * @param {number} mouseX - Mouse cursor X coordinate for positioning
     * @param {number} mouseY - Mouse cursor Y coordinate for positioning
     */
    showBoundaryTooltip(boundaryPath, mouseX, mouseY) {
        if (!this.tooltip) return;

        // Measure boundary dimensions using clone technique for accuracy
        const svgElement = boundaryPath.closest('svg');
        const fileManager = this.editor ? this.editor.fileManager : null;
        const boundingBox = this.measurementSystem.measureSVGBoundaryWithClone(svgElement, fileManager);

        // Convert measured pixels to current display units
        const displayWidth = this.measurementSystem.convertPixelsToCurrentUnit(boundingBox.width);
        const displayHeight = this.measurementSystem.convertPixelsToCurrentUnit(boundingBox.height);

        // Build boundary-specific tooltip content
        let content = '<div class="tooltip-title">SVG Canvas Boundary</div>';
        content += '<div class="tooltip-section">';
        content += '<div class="section-title">Canvas Dimensions</div>';
        content += `
            <div class="tooltip-measurement">
                <span class="measurement-name">Width:</span>
                <span class="measurement-value">${this.measurementSystem.formatDisplayNumber(displayWidth)}${this.measurementSystem.units}</span>
            </div>
            <div class="tooltip-measurement">
                <span class="measurement-name">Height:</span>
                <span class="measurement-value">${this.measurementSystem.formatDisplayNumber(displayHeight)}${this.measurementSystem.units}</span>
            </div>`;
        content += '</div>';

        // Position and display boundary tooltip
        this.tooltip.innerHTML = content;
        this.updateTooltipPosition(mouseX, mouseY);
        this.tooltip.style.display = 'block';

        // Use requestAnimationFrame for smooth visual transitions
        requestAnimationFrame(() => {
            if (this.tooltip) {
                this.tooltip.classList.add('visible');
            }
        });
    }

    /**
     * Hide tooltip with smooth transition and flicker prevention
     *
     * Uses delayed hiding to prevent flickering when moving between
     * nearby interactive elements. Coordinates with CSS transitions
     * for smooth visual feedback.
     */
    hideTooltip() {
        if (this.tooltip && this.tooltip.classList.contains('visible')) {
            // Cancel any existing timeout to prevent conflicts
            if (this.tooltipHideTimeout) {
                clearTimeout(this.tooltipHideTimeout);
            }

            // Brief delay prevents flickering during rapid hover changes
            this.tooltipHideTimeout = setTimeout(() => {
                if (this.tooltip && this.tooltip.classList.contains('visible')) {
                    this.tooltip.classList.remove('visible');
                    setTimeout(() => {
                        if (this.tooltip && !this.tooltip.classList.contains('visible')) {
                            this.tooltip.style.display = 'none';
                        }
                    }, 300); // Match CSS transition duration
                }
                this.tooltipHideTimeout = null;
            }, 50);
        }
    }

    /**
     * Position tooltip intelligently to avoid viewport clipping
     *
     * Calculates optimal tooltip position relative to cursor while ensuring
     * tooltip remains fully visible within viewport bounds. Uses dynamic
     * positioning strategy that adapts to available screen space.
     *
     * @param {number} mouseX - Mouse cursor X coordinate
     * @param {number} mouseY - Mouse cursor Y coordinate
     */
    updateTooltipPosition(mouseX, mouseY) {
        if (!this.tooltip) return;

        // Temporarily show tooltip for dimension calculation if hidden
        const wasHidden = this.tooltip.style.display === 'none';
        if (wasHidden) {
            this.tooltip.style.visibility = 'hidden';
            this.tooltip.style.display = 'block';
        }

        // Measure tooltip dimensions for positioning calculations
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;

        // Restore previous visibility state
        if (wasHidden) {
            this.tooltip.style.display = 'none';
            this.tooltip.style.visibility = 'visible';
        }

        // Get viewport boundaries
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Start with default positioning (bottom-right of cursor)
        let left = mouseX + 10;
        let top = mouseY - 10;

        // Adjust horizontally if tooltip exceeds right viewport edge
        if (left + tooltipWidth > viewportWidth) {
            left = mouseX - tooltipWidth - 10; // Position left of cursor
        }

        // Adjust vertically if tooltip exceeds bottom viewport edge
        if (top + tooltipHeight > viewportHeight) {
            top = mouseY - tooltipHeight - 10; // Position above cursor
        }

        // Ensure tooltip stays within left viewport boundary
        if (left < 0) {
            left = 5; // Small margin from edge
        }

        // Ensure tooltip stays within top viewport boundary
        if (top < 0) {
            top = 5; // Small margin from edge
        }

        // Apply calculated position
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    /**
     * Refresh tooltip content when measurement settings change
     *
     * Updates tooltip display when decimal separator or unit system changes.
     * Provides seamless user experience during measurement system switches.
     */
    refreshTooltip() {
        const currentPath = this.elementManager.getHoveredPath();
        if (currentPath && this.tooltip && this.tooltip.style.display !== 'none') {
            this.hideTooltip();
            // Use requestAnimationFrame for smooth transition during refresh
            requestAnimationFrame(() => {
                const mousePos = { x: this.lastMouseX || 0, y: this.lastMouseY || 0 };
                this.showTooltip(currentPath, mousePos.x, mousePos.y);
            });
        }
    }

    /**
     * Refresh visible tooltip with updated attribute data
     *
     * Updates tooltip content immediately after attribute changes are saved.
     * Maintains tooltip visibility while refreshing displayed values to
     * reflect current element state.
     */
    refreshTooltipIfVisible() {
        // Only refresh if tooltip is currently visible and active
        if (this.tooltip && this.tooltip.style.display !== 'none' && this.tooltip.classList.contains('visible')) {
            const currentPath = this.elementManager.getHoveredPath() || this.elementManager.getSelectedPath();
            if (currentPath) {
                // Update tooltip content with current attribute values
                const mousePos = { x: this.lastMouseX || 0, y: this.lastMouseY || 0 };
                this.showTooltip(currentPath, mousePos.x, mousePos.y);
            }
        }
    }    /**
     * Extract and format shaper attributes for tooltip display
     *
     * Retrieves shaper attributes from element data cache and formats them
     * for user-friendly display with proper unit conversion. Differentiates
     * between cut type (string) and measurement values (numeric with units).
     *
     * @param {Element} path - SVG path element to extract attributes from
     * @returns {Array} Formatted attribute objects for display
     */
    getShaperAttributes(path) {
        const attributes = [];

        // Extract cached shaper attribute data
        const dimensions = this.elementManager.getElementDimensions(path);
        const shaperAttrs = dimensions.shaperAttributes || {};

        // Check for presence of any defined shaper attributes
        const hasAnyNumericAttribute = ['shaper:cutDepth', 'shaper:cutOffset', 'shaper:toolDia'].some(attrName => {
            return shaperAttrs[attrName] && shaperAttrs[attrName].trim() !== '';
        });

        const hasCutType = shaperAttrs['shaper:cutType'] && shaperAttrs['shaper:cutType'].trim() !== '';

        // Return empty array if no attributes defined (triggers "no attributes" message)
        if (!hasAnyNumericAttribute && !hasCutType) {
            return attributes;
        }

        // Process all shaper attributes with proper formatting
        const shaperAttrNames = ['shaper:cutType', 'shaper:cutDepth', 'shaper:cutOffset', 'shaper:toolDia'];

        shaperAttrNames.forEach(attrName => {
            const value = shaperAttrs[attrName];
            let displayValue;
            let displayName;

            // Create user-friendly attribute names
            displayName = attrName.replace('shaper:', '');
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

            if (value && value.trim() !== '') {
                // Handle cut type as string value
                if (attrName === 'shaper:cutType') {
                    displayValue = value;
                } else {
                    // Convert pixel-stored measurements to current display units
                    const pixelValue = parseFloat(value);
                    if (!isNaN(pixelValue)) {
                        const convertedValue = this.measurementSystem.convertPixelsToCurrentUnit(pixelValue);
                        const formattedValue = this.measurementSystem.formatDisplayNumber(convertedValue);
                        displayValue = `${formattedValue}${this.measurementSystem.units}`;
                    } else {
                        displayValue = value; // Fallback for invalid numeric values
                    }
                }
            } else {
                displayValue = 'not set';
            }

            attributes.push({
                name: displayName,
                value: displayValue
            });
        });

        return attributes;
    }

    /**
     * Handle keyboard shortcuts for modal operations
     *
     * Provides keyboard navigation for modal dialogs with escape-to-close
     * and context-sensitive enter behavior that respects input field focus.
     *
     * @param {KeyboardEvent} event - Keyboard event to process
     */
    handleKeyDown(event) {
        // Escape key always closes modal
        if (event.key === 'Escape') {
            if (this.modal && this.modal.style.display !== 'none') {
                this.closeModal();
            }
        }

        // Enter key saves attributes when modal is open
        if (event.key === 'Enter') {
            if (this.modal && this.modal.style.display !== 'none') {
                // Allow normal Enter behavior in text inputs
                if (event.target.tagName !== 'INPUT') {
                    this.saveAttributes();
                }
            }
        }
    }

    /**
     * Save attributes from modal form to element data
     *
     * This method is dynamically assigned during module initialization
     * to connect with the main application's attribute system. Provides
     * the interface between UI components and core data management.
     */
    saveAttributes() {
        // Implementation provided by svgShaperEditor.js setupModuleConnections()
        // Requires access to main application's attribute management system
    }

    /**
     * Update stored mouse position for tooltip positioning
     *
     * Maintains current cursor location for tooltip refresh operations
     * when attributes change without mouse movement.
     *
     * @param {number} x - Mouse X coordinate in viewport pixels
     * @param {number} y - Mouse Y coordinate in viewport pixels
     */
    setMousePosition(x, y) {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    /**
     * Initialize custom context menu with backdrop and menu items
     *
     * Creates right-click context menu for viewport operations like export,
     * clipboard actions, and view controls. Uses custom styling and SVG
     * icons for consistent visual design.
     */
    createContextMenu() {
        // Create backdrop for modal-like behavior with blur effect
        this.contextMenuBackdrop = document.createElement('div');
        this.contextMenuBackdrop.className = 'context-menu-backdrop';

        // Create main context menu container
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'customContextMenu';
        this.contextMenu.className = 'custom-context-menu';

        // Define context menu structure with actions and icons
        const menuItems = [
            {
                label: 'Export SVG',
                action: 'export',
                icon: 'icons/export.svg'
            },
            {
                label: 'Copy to Clipboard',
                action: 'copy',
                icon: 'icons/clipboard.svg'
            },
            {
                separator: true
            },
            {
                label: 'Zoom to Fit',
                action: 'zoomFit',
                icon: 'icons/fit-to-screen.svg'
            },
            {
                label: 'Center View',
                action: 'center',
                icon: 'icons/center.svg'
            },
            {
                label: 'Zoom 100%',
                action: 'zoom100',
                icon: 'icons/center.svg' // Reuse center icon for consistency
            }
        ];

        // Build menu DOM structure with icons and separators
        menuItems.forEach(item => {
            if (item.separator) {
                // Create visual separator between menu sections
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                this.contextMenu.appendChild(separator);
            } else {
                // Create interactive menu item with icon and label
                const menuItem = document.createElement('button');
                menuItem.className = 'context-menu-item';
                menuItem.dataset.action = item.action;

                // Add SVG icon for visual identification
                const iconImg = document.createElement('img');
                iconImg.className = 'context-menu-icon';
                iconImg.src = item.icon;

                // Add text label for clarity
                const label = document.createElement('span');
                label.textContent = item.label;

                menuItem.appendChild(iconImg);
                menuItem.appendChild(label);

                // Connect click handler for menu action
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleContextMenuAction(item.action);
                    this.hideContextMenu();
                });

                this.contextMenu.appendChild(menuItem);
            }
        });

        // Attach menu elements to document
        document.body.appendChild(this.contextMenuBackdrop);
        document.body.appendChild(this.contextMenu);

        // Initialize context menu event handling
        this.setupContextMenuEvents();
    }

    /**
     * Setup context menu event handlers with selective activation
     *
     * Configures global context menu behavior to show custom menu only
     * in appropriate areas while respecting exclusion zones marked with
     * 'no-context-menu' class.
     */
    setupContextMenuEvents() {
        // Override all default browser context menus
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            // Check for context menu exclusion zones
            let element = e.target;
            while (element) {
                if (element.classList && element.classList.contains('no-context-menu')) {
                    return; // Suppress context menu in excluded areas
                }
                element = element.parentElement;
            }

            // Show custom context menu only in SVG viewport areas
            const svgContainer = document.getElementById('svgContainer');
            const editorSection = document.getElementById('editorSection');

            if ((svgContainer && svgContainer.contains(e.target)) ||
                (editorSection && editorSection.contains(e.target))) {
                this.showContextMenu(e.clientX, e.clientY);
            }
        });        // Auto-hide context menu on outside clicks
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Keyboard shortcut to close context menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
            }
        });
    }

    /**
     * Display context menu at cursor position with viewport clipping prevention
     *
     * Shows context menu backdrop and positions menu at mouse coordinates.
     * Automatically adjusts position if menu would extend beyond viewport
     * boundaries to ensure full menu visibility.
     *
     * @param {number} x - Mouse X coordinate for menu positioning
     * @param {number} y - Mouse Y coordinate for menu positioning
     */
    showContextMenu(x, y) {
        if (!this.contextMenu || !this.contextMenuBackdrop) {
            return;
        }

        // Activate backdrop for modal behavior
        this.contextMenuBackdrop.style.display = 'block';

        // Position menu at cursor location
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = 'block';
        this.contextMenuVisible = true;

        // Prevent menu from extending beyond viewport boundaries
        const rect = this.contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust horizontal position if needed
        if (rect.right > viewportWidth) {
            this.contextMenu.style.left = `${viewportWidth - rect.width - 10}px`;
        }

        // Adjust vertical position if needed
        if (rect.bottom > viewportHeight) {
            this.contextMenu.style.top = `${viewportHeight - rect.height - 10}px`;
        }
    }

    /**
     * Hide context menu and backdrop
     *
     * Dismisses context menu and removes modal backdrop, restoring
     * normal interaction with the application interface.
     */
    hideContextMenu() {
        if (this.contextMenu && this.contextMenuBackdrop) {
            this.contextMenu.style.display = 'none';
            this.contextMenuBackdrop.style.display = 'none';
            this.contextMenuVisible = false;
        }
    }

    /**
     * Execute context menu action via callback system
     *
     * Dispatches menu selection to appropriate application function
     * through callback connections established during initialization.
     * Provides loose coupling between UI and application logic.
     *
     * @param {string} action - Action identifier for menu selection
     */
    handleContextMenuAction(action) {
        // Callback connections established in svgShaperEditor.js setupModuleConnections()
        switch (action) {
            case 'export':
                if (this.onExportSVG) this.onExportSVG();
                break;
            case 'copy':
                if (this.onCopyToClipboard) this.onCopyToClipboard();
                break;
            case 'zoomFit':
                if (this.onZoomToFit) this.onZoomToFit();
                break;
            case 'center':
                if (this.onCenterView) this.onCenterView();
                break;
            case 'zoom100':
                if (this.onZoom100) this.onZoom100();
                break;
        }
    }
}

// Export for use in other modules
window.UIComponents = UIComponents;