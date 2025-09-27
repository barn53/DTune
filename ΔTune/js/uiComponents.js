// UI Components Module
// Handles modal dialogs, tooltips, sliders, and other UI elements

class UIComponents {
    constructor(measurementSystem, elementManager) {
        this.measurementSystem = measurementSystem;
        this.elementManager = elementManager;

        // UI elements
        this.modal = null;
        this.tooltip = null;
        this.tooltipHideTimeout = null;
        this.cutTypeOptions = null;
        this.cutTypeIndicator = null;
        this.cutTypeInput = null;
        this.selectedPathInfo = null;

        this.optionWidth = 0;
    }

    // Initialize UI elements
    initializeElements() {
        // Modal elements
        this.modal = document.getElementById('attributeModal');
        this.selectedPathInfo = document.getElementById('selectedPathInfo');

        // Create tooltip
        this.createTooltip();

        // Initialize cut type slider
        this.initializeCutTypeSlider();
    }

    // Modal management
    openAttributeModal(path) {
        this.elementManager.selectPath(path);
        this.populateAttributeForm(path);
        this.modal.style.display = 'flex';
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.elementManager.selectPath(null);

        // Clear form
        document.getElementById('cutDepth').value = '';
        document.getElementById('cutOffset').value = '';
        document.getElementById('toolDia').value = '';
    }

    populateAttributeForm(path) {
        // Update path description
        if (this.selectedPathInfo) {
            this.selectedPathInfo.textContent = this.elementManager.getElementDescription(path);
        }

        // Get shaper attributes from elementData
        const dimensions = this.elementManager.getElementDimensions(path);
        const shaperAttrs = dimensions.shaperAttributes || {};

        // Get cutType
        const cutType = shaperAttrs['shaper:cutType'] || '';

        // Populate measurement input fields from elementData
        ['cutDepth', 'cutOffset', 'toolDia'].forEach(inputId => {
            const input = document.getElementById(inputId);
            const attrName = `shaper:${inputId}`;
            const value = shaperAttrs[attrName];

            if (value && value.trim() !== '') {
                // Parse the stored value with its unit and convert to current units
                const convertedValue = this.measurementSystem.parseValueWithUnits(value, this.measurementSystem.units);
                if (convertedValue !== null) {
                    const formattedValue = this.measurementSystem.formatGridNumber(convertedValue);
                    input.value = formattedValue;
                } else {
                    input.value = '';
                }
            } else {
                input.value = '';
            }
        });

        // Set cut type using the slider
        this.setCutTypeSlider(cutType);

        this.updateDialogUnits();
    }

    updateDialogUnits() {
        const unitLabels = document.querySelectorAll('.input-unit');
        unitLabels.forEach(label => {
            label.textContent = this.measurementSystem.units;
        });
    }

    // Cut type slider
    initializeCutTypeSlider() {
        this.cutTypeOptions = document.querySelectorAll('.cut-type-option');
        this.cutTypeIndicator = document.querySelector('.cut-type-indicator');
        this.cutTypeInput = document.getElementById('cutType');
        this.optionWidth = 100 / this.cutTypeOptions.length;

        // Add click listeners
        this.cutTypeOptions.forEach((option, index) => {
            option.addEventListener('click', () => this.selectCutType(index));
        });
    }

    selectCutType(index) {
        this.cutTypeOptions.forEach(option => option.classList.remove('active'));
        this.cutTypeOptions[index].classList.add('active');

        this.updateCutTypeUI(index);
        this.cutTypeInput.value = this.cutTypeOptions[index].getAttribute('data-type');
    }

    setCutTypeSlider(cutType) {
        const option = Array.from(this.cutTypeOptions).find(opt =>
            opt.getAttribute('data-type') === cutType
        );

        if (option) {
            const index = Array.from(this.cutTypeOptions).indexOf(option);
            this.selectCutType(index);
        }
    }

    updateCutTypeUI(activeIndex) {
        if (this.cutTypeIndicator) {
            this.cutTypeIndicator.style.left = `${activeIndex * this.optionWidth}%`;
            this.cutTypeIndicator.style.width = `${this.optionWidth}%`;
        }
    }

    // Tooltip system
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'shaper-tooltip';
        document.body.appendChild(this.tooltip);
    }

    showTooltip(path, mouseX, mouseY) {
        if (!this.tooltip) return;

        // Cancel any pending hide timeout
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }

        // Create tooltip content with app-id
        const appId = path.dataset.appId || 'unknown';
        const shortId = appId.replace('app-id-', ''); // Remove prefix, keep only the suffix
        let content = `<div class="tooltip-title">Element Info (${shortId})</div>`;

        // Add measurements section
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

        // Add shaper attributes section
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

        this.tooltip.innerHTML = content;
        this.updateTooltipPosition(mouseX, mouseY);
        this.tooltip.style.display = 'block';
        // Add visible class for CSS transition
        setTimeout(() => {
            if (this.tooltip) {
                this.tooltip.classList.add('visible');
            }
        }, 10);
    }

    showBoundaryTooltip(boundaryPath, mouseX, mouseY) {
        if (!this.tooltip) return;

        // Get SVG dimensions for boundary info
        const svgElement = boundaryPath.closest('svg');
        const viewBox = svgElement.getAttribute('viewBox');
        let width, height;

        if (viewBox) {
            [, , width, height] = viewBox.split(/[\s,]+/).map(parseFloat);
        } else {
            width = parseFloat(svgElement.getAttribute('width')) || 400;
            height = parseFloat(svgElement.getAttribute('height')) || 300;
        }

        // SVG viewBox dimensions are in user units - treat them as pixel values for conversion
        const displayWidth = this.measurementSystem.pixelsToUnits(width);
        const displayHeight = this.measurementSystem.pixelsToUnits(height); let content = '<div class="tooltip-title">SVG Canvas Boundary</div>';
        content += '<div class="tooltip-section">';
        content += '<div class="section-title">Canvas Dimensions</div>';
        content += `
            <div class="tooltip-measurement">
                <span class="measurement-name">Width:</span>
                <span class="measurement-value">${this.measurementSystem.formatGridNumber(displayWidth)}${this.measurementSystem.units}</span>
            </div>
            <div class="tooltip-measurement">
                <span class="measurement-name">Height:</span>
                <span class="measurement-value">${this.measurementSystem.formatGridNumber(displayHeight)}${this.measurementSystem.units}</span>
            </div>`;
        content += '</div>';

        this.tooltip.innerHTML = content;
        this.updateTooltipPosition(mouseX, mouseY);
        this.tooltip.style.display = 'block';
        // Add visible class for CSS transition
        setTimeout(() => {
            if (this.tooltip) {
                this.tooltip.classList.add('visible');
            }
        }, 10);
    }

    hideTooltip() {
        if (this.tooltip && this.tooltip.classList.contains('visible')) {
            // Cancel any existing timeout
            if (this.tooltipHideTimeout) {
                clearTimeout(this.tooltipHideTimeout);
            }

            // Small delay to prevent flickering when quickly moving between paths
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

    updateTooltipPosition(mouseX, mouseY) {
        if (!this.tooltip) return;

        // Make tooltip temporarily visible to measure dimensions if hidden
        const wasHidden = this.tooltip.style.display === 'none';
        if (wasHidden) {
            this.tooltip.style.visibility = 'hidden';
            this.tooltip.style.display = 'block';
        }

        // Get tooltip dimensions
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;

        // Restore previous visibility state if needed
        if (wasHidden) {
            this.tooltip.style.display = 'none';
            this.tooltip.style.visibility = 'visible';
        }

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Default positioning (tooltip to bottom-right of cursor)
        let left = mouseX + 10;
        let top = mouseY - 10;

        // Check if tooltip would go beyond right edge
        if (left + tooltipWidth > viewportWidth) {
            // Position to the left of cursor instead
            left = mouseX - tooltipWidth - 10;
        }

        // Check if tooltip would go beyond bottom edge
        if (top + tooltipHeight > viewportHeight) {
            // Position above cursor instead
            top = mouseY - tooltipHeight - 10;
        }

        // Ensure tooltip doesn't go beyond left edge
        if (left < 0) {
            left = 5; // Small margin from edge
        }

        // Ensure tooltip doesn't go beyond top edge
        if (top < 0) {
            top = 5; // Small margin from edge
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    // Refresh tooltip content when decimal separator changes
    refreshTooltip() {
        const currentPath = this.elementManager.getHoveredPath();
        if (currentPath && this.tooltip && this.tooltip.style.display !== 'none') {
            this.hideTooltip();
            // Small delay to ensure the tooltip is hidden before showing again
            setTimeout(() => {
                const mousePos = { x: this.lastMouseX || 0, y: this.lastMouseY || 0 };
                this.showTooltip(currentPath, mousePos.x, mousePos.y);
            }, 10);
        }
    }

    // Refresh tooltip if currently visible (for immediate updates after saving)
    refreshTooltipIfVisible() {
        // Check if tooltip is currently visible
        if (this.tooltip && this.tooltip.style.display !== 'none' && this.tooltip.classList.contains('visible')) {
            const currentPath = this.elementManager.getHoveredPath() || this.elementManager.getSelectedPath();
            if (currentPath) {
                // Simply re-show the tooltip with updated content
                const mousePos = { x: this.lastMouseX || 0, y: this.lastMouseY || 0 };
                this.showTooltip(currentPath, mousePos.x, mousePos.y);
            }
        }
    }    // Shaper attributes helper
    getShaperAttributes(path) {
        const attributes = [];
        
        // Get shaper attributes from elementData instead of DOM
        const dimensions = this.elementManager.getElementDimensions(path);
        const shaperAttrs = dimensions.shaperAttributes || {};
        
        // Check if we have any shaper attributes stored in elementData
        const hasAnyNumericAttribute = ['shaper:cutDepth', 'shaper:cutOffset', 'shaper:toolDia'].some(attrName => {
            return shaperAttrs[attrName] && shaperAttrs[attrName].trim() !== '';
        });

        const hasCutType = shaperAttrs['shaper:cutType'] && shaperAttrs['shaper:cutType'].trim() !== '';

        // If no attributes are set at all, return empty array (will show "no attributes" message)
        if (!hasAnyNumericAttribute && !hasCutType) {
            return attributes;
        }

        // Process all shaper attributes from elementData
        const shaperAttrNames = ['shaper:cutDepth', 'shaper:cutOffset', 'shaper:toolDia', 'shaper:cutType'];
        
        shaperAttrNames.forEach(attrName => {
            const value = shaperAttrs[attrName];
            let displayValue;
            let displayName;

            // Extract display name (remove "shaper:" prefix)
            displayName = attrName.replace('shaper:', '');
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

            if (value && value.trim() !== '') {
                // For cutType, show value as-is
                if (attrName === 'shaper:cutType') {
                    displayValue = value;
                } else {
                    // For measurement values, parse value with its original unit and convert to current units
                    const convertedValue = this.measurementSystem.parseValueWithUnits(value, this.measurementSystem.units);
                    if (convertedValue !== null) {
                        const formattedValue = this.measurementSystem.formatGridNumber(convertedValue);
                        displayValue = `${formattedValue}${this.measurementSystem.units}`;
                    } else {
                        displayValue = value; // Show as-is if not parseable
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

    // Keyboard shortcuts
    handleKeyDown(event) {
        // Escape key closes modal
        if (event.key === 'Escape') {
            if (this.modal && this.modal.style.display !== 'none') {
                this.closeModal();
            }
        }

        // Enter key in modal saves attributes
        if (event.key === 'Enter') {
            if (this.modal && this.modal.style.display !== 'none') {
                // Don't save on Enter in text inputs to allow normal behavior
                if (event.target.tagName !== 'INPUT') {
                    this.saveAttributes();
                }
            }
        }
    }

    // Save attributes (this would need to be connected to the main application)
    saveAttributes() {
        // This method is dynamically assigned in svgShaperEditor.js setupModuleConnections()
        // It needs access to the main application's attribute management
    }

    // Public method to set mouse position for tooltip refresh
    setMousePosition(x, y) {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }
}

// Export for use in other modules
window.UIComponents = UIComponents;