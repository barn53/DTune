// SVG Shaper Editor - Main Application
class SVGShaperEditor {
    constructor() {
        this.svgData = null;
        this.svgElement = null;
        this.selectedPath = null;
        this.hoveredPath = null; // Track currently hovered path for tooltip refresh
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Tooltip element
        this.tooltip = null;

        // Measurement system
        this.units = 'mm'; // Default to millimeters
        this.decimalSeparator = this.detectLocalDecimalSeparator(); // Auto-detect from user's locale
        this.detectedUnits = null; // Will be set when SVG is loaded
        this.dpi = 96; // Standard web DPI
        this.mmPerInch = 25.4;

        this.initializeElements();
        this.bindEvents();
        this.createTooltip();
    }

    initializeElements() {
        console.log('Initializing elements...');

        // Main sections
        this.uploadSection = document.getElementById('uploadSection');
        this.editorSection = document.getElementById('editorSection');

        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');

        console.log('Upload elements found:', {
            uploadArea: !!this.uploadArea,
            fileInput: !!this.fileInput,
            uploadBtn: !!this.uploadBtn
        });

        // SVG display elements
        this.svgContainer = document.getElementById('svgContainer');
        this.svgWrapper = document.getElementById('svgWrapper');
        this.svgContent = document.getElementById('svgContent');
        this.gutterOverlay = document.getElementById('gutterOverlay');

        // Controls
        this.gutterToggle = document.getElementById('gutterToggle');
        this.gutterSize = document.getElementById('gutterSize');
        this.gutterUnitLabel = document.getElementById('gutterUnitLabel');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.unitToggle = document.getElementById('unitToggle');
        this.decimalToggle = document.getElementById('decimalToggle');

        // Modal elements
        this.modal = document.getElementById('attributeModal');
        this.modalContent = document.querySelector('.modal-content');
        this.selectedPathInfo = document.getElementById('selectedPathInfo');
        this.attributeForm = document.getElementById('attributeForm');

        // Buttons
        this.newFileBtn = document.getElementById('newFileBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.zoomFitBtn = document.getElementById('zoomFit');
        this.modalClose = document.getElementById('modalClose');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalSave = document.getElementById('modalSave');
    }

    bindEvents() {
        // File upload events
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('click', (e) => {
            console.log('Upload area clicked, target:', e.target);
            // Only trigger file input if not clicking the button
            if (e.target !== this.uploadBtn) {
                console.log('Triggering file input from upload area');
                if (this.fileInput) {
                    this.fileInput.click();
                } else {
                    console.error('File input element not found');
                }
            }
        });
        this.uploadBtn.addEventListener('click', (e) => {
            console.log('Upload button clicked');
            e.stopPropagation(); // Prevent bubbling to uploadArea
            if (this.fileInput) {
                console.log('Triggering file input click');
                this.fileInput.click();
            } else {
                console.error('File input element not found');
            }
        });
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Toolbar events
        this.newFileBtn.addEventListener('click', () => this.newFile());
        this.exportBtn.addEventListener('click', () => this.exportSVG());
        this.gutterToggle.addEventListener('change', () => this.toggleGutter());
        this.gutterSize.addEventListener('blur', () => this.handleGutterInput());
        this.gutterSize.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleGutterInput();
            }
        });
        this.unitToggle.addEventListener('change', () => this.toggleUnits());
        this.decimalToggle.addEventListener('change', () => this.toggleDecimalSeparator());

        // Zoom and pan events
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.zoomFitBtn.addEventListener('click', () => this.zoomToFit());
        this.svgWrapper.addEventListener('wheel', (e) => this.handleWheel(e));
        this.svgWrapper.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.svgWrapper.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.svgWrapper.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.svgWrapper.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        // Modal events
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.modalCancel.addEventListener('click', () => this.closeModal());
        this.modalSave.addEventListener('click', () => this.saveAttributes());

        // Cut type slider events
        this.initializeCutTypeSlider();

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    // File Upload Functions
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.loadSVGFile(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.loadSVGFile(files[0]);
        }
    }

    loadSVGFile(file) {
        if (!file.type.includes('svg') && !file.name.toLowerCase().endsWith('.svg')) {
            alert('Please select a valid SVG file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.svgData = e.target.result;
                this.parseSVG(this.svgData);
                this.showEditor();
            } catch (error) {
                console.error('Error loading SVG:', error);
                alert('Error loading SVG file. Please check if the file is valid.');
            }
        };
        reader.readAsText(file);
    }

    parseSVG(svgString) {
        // Parse the SVG string and create DOM element
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');

        // Check for parsing errors
        if (doc.querySelector('parsererror')) {
            throw new Error('Invalid SVG file format');
        }

        this.svgElement = doc.documentElement.cloneNode(true);

        // Detect measurement units from the SVG
        this.detectUnits();

        // Display the SVG (overlays will be added in displaySVG)
        this.displaySVG();
    }

    addPathClickHandlers() {
        const paths = this.svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');
        paths.forEach((path, index) => {
            path.setAttribute('data-path-index', index);
            path.style.pointerEvents = 'none'; // Make original non-interactive

            // Create invisible overlay for larger hit area - create completely fresh element
            const overlay = document.createElementNS('http://www.w3.org/2000/svg', path.tagName);

            // Copy only the essential geometric attributes
            if (path.tagName === 'path') {
                overlay.setAttribute('d', path.getAttribute('d'));
            } else if (path.tagName === 'circle') {
                overlay.setAttribute('cx', path.getAttribute('cx'));
                overlay.setAttribute('cy', path.getAttribute('cy'));
                overlay.setAttribute('r', path.getAttribute('r'));
            } else if (path.tagName === 'rect') {
                overlay.setAttribute('x', path.getAttribute('x'));
                overlay.setAttribute('y', path.getAttribute('y'));
                overlay.setAttribute('width', path.getAttribute('width'));
                overlay.setAttribute('height', path.getAttribute('height'));
            } else if (path.tagName === 'ellipse') {
                overlay.setAttribute('cx', path.getAttribute('cx'));
                overlay.setAttribute('cy', path.getAttribute('cy'));
                overlay.setAttribute('rx', path.getAttribute('rx'));
                overlay.setAttribute('ry', path.getAttribute('ry'));
            } else if (path.tagName === 'line') {
                overlay.setAttribute('x1', path.getAttribute('x1'));
                overlay.setAttribute('y1', path.getAttribute('y1'));
                overlay.setAttribute('x2', path.getAttribute('x2'));
                overlay.setAttribute('y2', path.getAttribute('y2'));
            } else if (path.tagName === 'polyline' || path.tagName === 'polygon') {
                overlay.setAttribute('points', path.getAttribute('points'));
            }

            // Set only the overlay-specific attributes
            overlay.setAttribute('class', 'path-overlay');
            overlay.setAttribute('data-original-index', index);
            overlay.setAttribute('fill', 'none');
            overlay.setAttribute('stroke', 'red'); // Temporarily visible for debugging
            overlay.setAttribute('stroke-width', '8');
            overlay.setAttribute('cursor', 'pointer');
            overlay.setAttribute('pointer-events', 'all');
            overlay.setAttribute('opacity', '0.3'); // Temporarily visible for debugging

            console.log('Created clean overlay for path', index, overlay);

            // Insert overlay right after the original path
            path.parentNode.insertBefore(overlay, path.nextSibling);
            console.log('Inserted overlay into DOM');

            // Test if overlay is actually in the DOM and visible
            setTimeout(() => {
                const rect = overlay.getBoundingClientRect();
                console.log('Overlay bounding rect:', rect);
                console.log('Overlay computed style pointer-events:', getComputedStyle(overlay).pointerEvents);
            }, 100);

            // Only add handlers to overlay to prevent conflicts
            overlay.addEventListener('click', (e) => {
                console.log('OVERLAY CLICKED!');
                e.stopPropagation();
                this.selectPath(path);
                this.openAttributeModal(path);
            });

            overlay.addEventListener('mouseenter', (e) => {
                console.log('OVERLAY MOUSE ENTER!', e.target);
                console.log('Mouse enter - adding hover-active class to path:', path);
                console.log('Path classes before:', path.className);
                path.classList.add('hover-active');
                console.log('Path classes after:', path.className);
            });

            overlay.addEventListener('mouseleave', (e) => {
                console.log('OVERLAY MOUSE LEAVE!', e.target);
                path.classList.remove('hover-active');
            });
        });
    }

    displaySVG() {
        // Clear previous content
        this.svgContent.innerHTML = '';

        // Clone and append the SVG element (clean clone without overlays)
        const svgClone = this.svgElement.cloneNode(true);
        this.svgContent.appendChild(svgClone);

        // Add global mouse event debugging to SVG
        svgClone.addEventListener('mousemove', (e) => {
            console.log('Mouse move on SVG, target:', e.target.tagName, e.target.className);
        });

        svgClone.addEventListener('click', (e) => {
            console.log('Click on SVG, target:', e.target.tagName, e.target.className);
        });

        // Reset zoom and pan
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.updateZoomLevel();

        // Add overlays to the displayed SVG clone
        this.addOverlaysToDisplayedSVG(svgClone);

        // Auto-fit the SVG to the container after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.zoomToFit();
        }, 100);
    }

    addOverlaysToDisplayedSVG(svgElement) {
        const paths = svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');
        paths.forEach((path, index) => {
            path.setAttribute('data-path-index', index);
            path.style.pointerEvents = 'none'; // Make original non-interactive

            // Create invisible overlay for larger hit area - create completely fresh element
            const overlay = document.createElementNS('http://www.w3.org/2000/svg', path.tagName);

            // Copy only the essential geometric attributes
            if (path.tagName === 'path') {
                overlay.setAttribute('d', path.getAttribute('d'));
            } else if (path.tagName === 'circle') {
                overlay.setAttribute('cx', path.getAttribute('cx'));
                overlay.setAttribute('cy', path.getAttribute('cy'));
                overlay.setAttribute('r', path.getAttribute('r'));
            } else if (path.tagName === 'rect') {
                overlay.setAttribute('x', path.getAttribute('x'));
                overlay.setAttribute('y', path.getAttribute('y'));
                overlay.setAttribute('width', path.getAttribute('width'));
                overlay.setAttribute('height', path.getAttribute('height'));
            } else if (path.tagName === 'ellipse') {
                overlay.setAttribute('cx', path.getAttribute('cx'));
                overlay.setAttribute('cy', path.getAttribute('cy'));
                overlay.setAttribute('rx', path.getAttribute('rx'));
                overlay.setAttribute('ry', path.getAttribute('ry'));
            } else if (path.tagName === 'line') {
                overlay.setAttribute('x1', path.getAttribute('x1'));
                overlay.setAttribute('y1', path.getAttribute('y1'));
                overlay.setAttribute('x2', path.getAttribute('x2'));
                overlay.setAttribute('y2', path.getAttribute('y2'));
            } else if (path.tagName === 'polyline' || path.tagName === 'polygon') {
                overlay.setAttribute('points', path.getAttribute('points'));
            }

            // Set only the overlay-specific attributes
            overlay.setAttribute('class', 'path-overlay');
            overlay.setAttribute('data-original-index', index);
            overlay.setAttribute('fill', 'none');
            overlay.setAttribute('stroke', 'transparent'); // Invisible overlay
            overlay.setAttribute('stroke-width', '8');
            overlay.setAttribute('cursor', 'pointer');
            overlay.setAttribute('pointer-events', 'all');
            overlay.setAttribute('opacity', '0'); // Invisible overlay

            console.log('Created clean overlay for path', index, overlay);

            // Insert overlay right after the original path
            path.parentNode.insertBefore(overlay, path.nextSibling);
            console.log('Inserted overlay into DOM');

            // Test if overlay is actually in the DOM and visible
            setTimeout(() => {
                const rect = overlay.getBoundingClientRect();
                console.log('Overlay bounding rect:', rect);
                console.log('Overlay computed style pointer-events:', getComputedStyle(overlay).pointerEvents);
            }, 100);

            // Find the corresponding original path for attribute editing
            const originalPath = this.svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon')[index];

            // Only add handlers to overlay to prevent conflicts
            overlay.addEventListener('click', (e) => {
                console.log('OVERLAY CLICKED!');
                e.stopPropagation();
                this.selectPath(originalPath);
                this.openAttributeModal(originalPath);
            });

            overlay.addEventListener('mouseenter', (e) => {
                console.log('OVERLAY MOUSE ENTER!', e.target);
                path.classList.add('hover-active');
                this.hoveredPath = originalPath; // Track hovered path
                // Show tooltip with shaper attributes
                this.showTooltip(originalPath, e.clientX, e.clientY);
            });

            overlay.addEventListener('mousemove', (e) => {
                // Update mouse position tracking
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                // Update tooltip position as mouse moves
                this.updateTooltipPosition(e.clientX, e.clientY);
            });

            overlay.addEventListener('mouseleave', (e) => {
                console.log('OVERLAY MOUSE LEAVE!', e.target);
                path.classList.remove('hover-active');
                this.hoveredPath = null; // Clear hovered path
                this.hideTooltip();
            });
        });
    }

    showEditor() {
        this.uploadSection.style.display = 'none';
        this.editorSection.style.display = 'block';
    }

    newFile() {
        this.uploadSection.style.display = 'block';
        this.editorSection.style.display = 'none';
        this.svgData = null;
        this.svgElement = null;
        this.selectedPath = null;
        this.fileInput.value = '';
        this.closeModal();
    }

    // SVG Display and Interaction Functions
    selectPath(path) {
        // Remove previous selection
        if (this.selectedPath) {
            this.selectedPath.classList.remove('selected');
        }

        // Select new path
        this.selectedPath = path;
        path.classList.add('selected');
    }

    // Zoom and Pan Functions
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 5);
        this.updateTransform();
        this.updateZoomLevel();
        this.updateGutterSize(); // Update gutter for new zoom level
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.1);
        this.updateTransform();
        this.updateZoomLevel();
        this.updateGutterSize(); // Update gutter for new zoom level
    }

    zoomToFit() {
        const svg = this.svgContent.querySelector('svg');
        if (!svg) return;

        const containerRect = this.svgWrapper.getBoundingClientRect();
        const svgRect = svg.getBBox();

        const scaleX = (containerRect.width * 0.9) / svgRect.width;
        const scaleY = (containerRect.height * 0.9) / svgRect.height;

        this.zoom = Math.min(scaleX, scaleY, 2);
        this.panX = 0;
        this.panY = 0;

        this.updateTransform();
        this.updateZoomLevel();
        this.updateGutterSize(); // Update gutter for new zoom level
    }

    handleWheel(event) {
        event.preventDefault();

        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.zoom * delta));

        // Zoom towards mouse position
        const rect = this.svgWrapper.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const zoomPoint = {
            x: (mouseX - this.panX) / this.zoom,
            y: (mouseY - this.panY) / this.zoom
        };

        this.zoom = newZoom;
        this.panX = mouseX - zoomPoint.x * this.zoom;
        this.panY = mouseY - zoomPoint.y * this.zoom;

        this.updateTransform();
        this.updateZoomLevel();
        this.updateGutterSize(); // Update gutter for new zoom level
    }

    handleMouseDown(event) {
        if (event.target.closest('svg path, svg circle, svg rect, svg ellipse, svg line, svg polyline, svg polygon')) {
            return; // Don't start panning if clicking on a path
        }

        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.svgWrapper.classList.add('dragging');
        event.preventDefault();
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        this.panX += deltaX;
        this.panY += deltaY;

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        this.updateTransform();
    }

    handleMouseUp(event) {
        this.isDragging = false;
        this.svgWrapper.classList.remove('dragging');
    }

    updateTransform() {
        this.svgContent.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }

    updateZoomLevel() {
        this.zoomLevel.textContent = Math.round(this.zoom * 100) + '%';
    }

    // Gutter Functions
    toggleGutter() {
        if (this.gutterToggle.checked) {
            this.gutterOverlay.style.display = 'block';
            this.updateGutterSize();
        } else {
            this.gutterOverlay.style.display = 'none';
        }
    }

    handleGutterInput() {
        const inputValue = this.gutterSize.value.trim();

        // Parse unit from input (e.g., "1in", "5mm", "10")
        const parsedValue = this.parseValueWithUnits(inputValue);

        if (parsedValue !== null) {
            // Check if input contains unit different from current
            const unitRegex = /(mm|in|inch)$/i;
            const match = inputValue.match(unitRegex);

            if (match) {
                const inputUnit = match[1].toLowerCase() === 'inch' ? 'in' : match[1].toLowerCase();

                // Switch units if different
                if (inputUnit !== this.units) {
                    this.units = inputUnit;
                    this.unitToggle.checked = (this.units === 'in');
                    console.log(`Auto-switched units to: ${this.units}`);
                }
            }

            // Clean the input to show just the number
            this.gutterSize.value = this.formatGridNumber(parsedValue);
        }

        this.updateGutterSize();
        this.updateUnitDisplay();
    }

    updateGutterSize() {
        if (this.gutterToggle.checked) {
            // Get the gutter size in real units from input
            const gutterValue = parseFloat(this.gutterSize.value) || 10;

            // Convert to pixels based on current zoom and unit system
            const gutterPixels = this.unitsToPixels(gutterValue) * this.zoom;

            this.gutterOverlay.style.backgroundSize = `${gutterPixels}px ${gutterPixels}px`;

            console.log(`Gutter: ${gutterValue}${this.units} = ${gutterPixels}px at ${this.zoom}x zoom`);
        }
    }

    updateUnitDisplay() {
        if (this.gutterUnitLabel) {
            this.gutterUnitLabel.textContent = this.units;
        }

        // Update placeholder
        if (this.gutterSize) {
            this.gutterSize.placeholder = `10`;
        }
    }

    // Attribute Modal Functions
    openAttributeModal(path) {
        this.populateAttributeForm(path);
        this.modal.style.display = 'flex';
    }

    closeModal() {
        this.modal.style.display = 'none';
        if (this.selectedPath) {
            this.selectedPath.classList.remove('selected');
            this.selectedPath = null;
        }
    }

    populateAttributeForm(path) {
        // Show detailed path info with measurements
        this.selectedPathInfo.textContent = this.getElementDescription(path);

        // Get current shaper attributes and convert to current unit system
        const cutType = path.getAttributeNS('http://www.shapertools.com/namespaces/shaper', 'cutType') || '';
        const cutDepth = path.getAttributeNS('http://www.shapertools.com/namespaces/shaper', 'cutDepth') || '';
        const cutOffset = path.getAttributeNS('http://www.shapertools.com/namespaces/shaper', 'cutOffset') || '';
        const toolDia = path.getAttributeNS('http://www.shapertools.com/namespaces/shaper', 'toolDia') || '';

        // Convert values to current unit system and strip units for input fields
        const cutDepthValue = this.convertValueToCurrentUnit(cutDepth);
        const cutOffsetValue = this.convertValueToCurrentUnit(cutOffset);
        const toolDiaValue = this.convertValueToCurrentUnit(toolDia);

        // Populate form fields
        this.setCutTypeSlider(cutType);
        document.getElementById('cutDepth').value = cutDepthValue;
        document.getElementById('cutOffset').value = cutOffsetValue;
        document.getElementById('toolDia').value = toolDiaValue;

        // Update unit displays in dialog
        this.updateDialogUnits();
    }

    stripUnitsFromValue(value) {
        if (!value) return '';
        // Extract numeric part from value like "15mm" -> "15"
        const match = value.match(/^([\d.-]+)/);
        return match ? match[1] : value;
    }

    addUnitsToValue(value) {
        if (!value || !value.trim()) return '';
        // If value is purely numeric, add current units
        if (/^[\d.-]+$/.test(value.trim())) {
            return value.trim() + this.units;
        }
        // If value already has units, return as-is
        return value;
    }

    convertValueToCurrentUnit(valueWithUnits) {
        if (!valueWithUnits) return '';

        // Parse the value and convert to current unit system
        const parsedValue = this.parseValueWithUnits(valueWithUnits, this.units);
        return parsedValue !== null ? this.formatGridNumber(parsedValue) : this.stripUnitsFromValue(valueWithUnits);
    }

    formatGridNumber(value) {
        // Format number to show up to 2 decimal places, but only 1 if second decimal is 0
        const fixed2 = parseFloat(value).toFixed(2);
        const fixed1 = parseFloat(value).toFixed(1);

        // If the 2-decimal version ends in .x0, use the 1-decimal version
        const formattedValue = fixed2.endsWith('0') ? fixed1 : fixed2;

        // Use appropriate decimal separator
        const decimalSeparator = this.getDecimalSeparator();
        return formattedValue.replace('.', decimalSeparator);
    }

    formatAngle(angleDegrees) {
        // Normalize angle to 0-360 degrees
        let normalizedAngle = angleDegrees % 360;
        if (normalizedAngle < 0) {
            normalizedAngle += 360;
        }

        // Format to 1 decimal place for angles
        const formattedValue = normalizedAngle.toFixed(1);

        // Use appropriate decimal separator
        const decimalSeparator = this.getDecimalSeparator();
        return formattedValue.replace('.', decimalSeparator);
    }

    getDecimalSeparator() {
        return this.decimalSeparator;
    }

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
        const option = this.cutTypeOptions[index];
        const cutType = option.getAttribute('data-type');

        // Update UI state
        this.updateCutTypeUI(index);

        // Update form value
        this.cutTypeInput.value = cutType;

        console.log(`Cut type selected: ${cutType || 'none'}`);
    }

    setCutTypeSlider(cutType) {
        // Find option index by data-type
        const targetIndex = Array.from(this.cutTypeOptions)
            .findIndex(option => option.getAttribute('data-type') === cutType);

        if (targetIndex !== -1) {
            this.updateCutTypeUI(targetIndex);
        }

        // Update form value
        this.cutTypeInput.value = cutType;
    }

    updateCutTypeUI(activeIndex) {
        // Remove active class from all options
        this.cutTypeOptions.forEach(opt => opt.classList.remove('active'));

        // Add active class to selected option
        this.cutTypeOptions[activeIndex].classList.add('active');

        // Update indicator position
        this.cutTypeIndicator.style.left = `${activeIndex * this.optionWidth}%`;
        this.cutTypeIndicator.style.width = `${this.optionWidth}%`;
    }

    updateDialogUnits() {
        // Update all input-unit spans in the dialog
        const unitSpans = document.querySelectorAll('.input-unit');
        unitSpans.forEach(span => {
            span.textContent = this.units;
        });
    }

    saveAttributes() {
        if (!this.selectedPath) return;

        const path = this.selectedPath;
        const shaperNamespace = 'http://www.shapertools.com/namespaces/shaper';

        // Save main attributes with units
        const cutType = document.getElementById('cutType').value;
        const cutDepth = this.addUnitsToValue(document.getElementById('cutDepth').value);
        const cutOffset = this.addUnitsToValue(document.getElementById('cutOffset').value);
        const toolDia = this.addUnitsToValue(document.getElementById('toolDia').value);

        this.setShaperAttribute(path, 'cutType', cutType);
        this.setShaperAttribute(path, 'cutDepth', cutDepth);
        this.setShaperAttribute(path, 'cutOffset', cutOffset);
        this.setShaperAttribute(path, 'toolDia', toolDia);

        // Update the SVG data
        this.updateSVGData();

        this.closeModal();
    }

    setShaperAttribute(element, name, value) {
        const shaperNamespace = 'http://www.shapertools.com/namespaces/shaper';
        if (value.trim()) {
            // Ensure the shaper namespace is declared on the root SVG element when we need it
            if (!this.svgElement.hasAttribute('xmlns:shaper')) {
                this.svgElement.setAttribute('xmlns:shaper', shaperNamespace);
            }
            element.setAttributeNS(shaperNamespace, `shaper:${name}`, value);
        } else {
            element.removeAttributeNS(shaperNamespace, name);
        }
    }

    updateSVGData() {
        // Update the stored SVG data with current modifications
        const serializer = new XMLSerializer();
        this.svgData = serializer.serializeToString(this.svgElement);
    }

    // Measurement System Functions
    detectUnits() {
        const unitCounts = { mm: 0, inch: 0, in: 0, px: 0 };

        // Check SVG width/height attributes for unit hints
        const width = this.svgElement.getAttribute('width');
        const height = this.svgElement.getAttribute('height');

        if (width) this.countUnitInString(width, unitCounts);
        if (height) this.countUnitInString(height, unitCounts);

        // Check shaper attributes for unit usage
        const shaperElements = this.svgElement.querySelectorAll('[*|cutDepth], [*|cutOffset], [*|toolDia]');
        shaperElements.forEach(element => {
            const shaperNamespace = 'http://www.shapertools.com/namespaces/shaper';
            const cutDepth = element.getAttributeNS(shaperNamespace, 'cutDepth');
            const cutOffset = element.getAttributeNS(shaperNamespace, 'cutOffset');
            const toolDia = element.getAttributeNS(shaperNamespace, 'toolDia');

            if (cutDepth) this.countUnitInString(cutDepth, unitCounts);
            if (cutOffset) this.countUnitInString(cutOffset, unitCounts);
            if (toolDia) this.countUnitInString(toolDia, unitCounts);
        });

        // Combine inch variants
        unitCounts.inch += unitCounts.in;
        delete unitCounts.in;

        console.log('Unit detection counts:', unitCounts);

        // Determine most common unit (prefer mm if tie)
        let maxCount = 0;
        let detectedUnit = 'mm'; // Default

        Object.entries(unitCounts).forEach(([unit, count]) => {
            if (count > maxCount && unit !== 'px') {
                maxCount = count;
                detectedUnit = unit;
            }
        });

        // Normalize unit names
        if (detectedUnit === 'inch') detectedUnit = 'in';

        this.detectedUnits = detectedUnit;
        this.units = detectedUnit;

        // Update UI
        if (this.unitToggle) {
            this.unitToggle.checked = (this.units === 'in');
        }
        if (this.decimalToggle) {
            this.decimalToggle.checked = (this.decimalSeparator === ',');
        }

        this.updateUnitDisplay();

        console.log(`Detected units: ${this.detectedUnits}, current units: ${this.units}`);
    }

    countUnitInString(str, unitCounts) {
        const units = ['mm', 'inch', 'in', 'px'];
        units.forEach(unit => {
            if (str.toLowerCase().includes(unit)) {
                unitCounts[unit]++;
            }
        });
    }

    changeUnits() {
        const newUnits = this.unitSelector.value;
        this.units = newUnits;
        console.log(`Changed units to: ${this.units}`);

        // Update gutter display
        this.updateGutterSize();
    }

    toggleUnits() {
        const oldUnits = this.units;
        this.units = this.unitToggle.checked ? 'in' : 'mm';
        console.log(`Toggled units from ${oldUnits} to: ${this.units}`);

        // Convert gutter size to new units
        this.convertGutterSize(oldUnits, this.units);

        // Convert any open dialog values
        if (this.modal && this.modal.style.display !== 'none') {
            this.convertDialogValues(oldUnits, this.units);
        }

        // Update gutter display and unit labels
        this.updateGutterSize();
        this.updateUnitDisplay();
        this.updateDialogUnits();
    }

    detectLocalDecimalSeparator() {
        // Detect the user's locale decimal separator
        const testNumber = 1.1;
        const formatted = testNumber.toLocaleString();
        return formatted.includes(',') ? ',' : '.';
    }

    toggleDecimalSeparator() {
        this.decimalSeparator = this.decimalToggle.checked ? ',' : '.';
        console.log(`Toggled decimal separator to: ${this.decimalSeparator}`);

        // Update grid size input with new decimal separator
        if (this.gutterSize && this.gutterSize.value) {
            const currentValue = parseFloat(this.gutterSize.value);
            if (!isNaN(currentValue)) {
                this.gutterSize.value = this.formatGridNumber(currentValue);
            }
        }

        // Update dialog input fields with new decimal separator
        const measurementInputs = ['cutDepth', 'cutOffset', 'toolDia'];
        measurementInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && input.value) {
                const currentValue = parseFloat(input.value);
                if (!isNaN(currentValue)) {
                    input.value = this.formatGridNumber(currentValue);
                }
            }
        });

        // Update any currently displayed measurements in dialog
        if (this.modal && this.modal.style.display !== 'none') {
            // Refresh the dialog display
            const currentPath = this.selectedPath;
            if (currentPath) {
                this.selectedPathInfo.textContent = this.getElementDescription(currentPath);
            }
        }

        // Update tooltip if currently visible
        if (this.tooltip && this.tooltip.style.display !== 'none') {
            // Hide and re-show tooltip to refresh measurements
            const currentPath = this.hoveredPath;
            if (currentPath) {
                this.hideTooltip();
                // Small delay to ensure the tooltip is hidden before showing again
                setTimeout(() => {
                    this.showTooltip(currentPath, this.lastMouseX || 0, this.lastMouseY || 0);
                }, 10);
            }
        }
    }

    convertGutterSize(fromUnit, toUnit) {
        if (fromUnit === toUnit || !this.gutterSize) return;

        const currentValue = parseFloat(this.gutterSize.value);
        if (isNaN(currentValue)) return;

        const convertedValue = this.convertBetweenUnits(currentValue, fromUnit, toUnit);
        this.gutterSize.value = this.formatGridNumber(convertedValue);

        console.log(`Converted gutter size: ${currentValue}${fromUnit} → ${this.formatGridNumber(convertedValue)}${toUnit}`);
    }

    convertDialogValues(fromUnit, toUnit) {
        if (fromUnit === toUnit) return;

        // Convert measurement input fields in the dialog
        const measurementInputs = ['cutDepth', 'cutOffset', 'toolDia'];

        measurementInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && input.value) {
                // Parse the current value (might include units or be just numeric)
                const parsedValue = this.parseValueWithUnits(input.value, fromUnit);
                if (parsedValue !== null) {
                    const convertedValue = this.convertBetweenUnits(parsedValue, fromUnit, toUnit);
                    input.value = this.formatGridNumber(convertedValue);
                    console.log(`Converted ${inputId}: ${input.value}${fromUnit} → ${this.formatGridNumber(convertedValue)}${toUnit}`);
                }
            }
        });
    }

    // Convert pixels to current unit system
    pixelsToUnits(pixels) {
        const pixelsPerMm = this.dpi / this.mmPerInch;
        const pixelsPerInch = this.dpi;

        if (this.units === 'mm') {
            return pixels / pixelsPerMm;
        } else if (this.units === 'in') {
            return pixels / pixelsPerInch;
        }
        return pixels; // fallback to pixels
    }

    // Convert current units to pixels
    unitsToPixels(value) {
        const pixelsPerMm = this.dpi / this.mmPerInch;
        const pixelsPerInch = this.dpi;

        if (this.units === 'mm') {
            return value * pixelsPerMm;
        } else if (this.units === 'in') {
            return value * pixelsPerInch;
        }
        return value; // fallback assuming pixels
    }

    // Format a number with appropriate unit label
    formatWithUnits(value, precision = 1) {
        return `${value.toFixed(precision)}${this.units}`;
    }

    // Parse a value with units and return numeric value in specified target unit
    parseValueWithUnits(valueString, targetUnit = null) {
        if (!valueString || typeof valueString !== 'string') return null;

        const unitRegex = /([\d.-]+)\s*(mm|in|inch|px)?/i;
        const match = valueString.match(unitRegex);

        if (!match) return null;

        const numericValue = parseFloat(match[1]);
        const sourceUnit = (match[2] || '').toLowerCase();
        const target = targetUnit || this.units;

        // Normalize unit names
        const normalizedSource = sourceUnit === 'inch' ? 'in' : sourceUnit;

        // Convert to target unit
        return this.convertBetweenUnits(numericValue, normalizedSource, target);
    }

    // Convert value between different units
    convertBetweenUnits(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;

        // Convert to mm as intermediate
        let valueInMm = value;
        if (fromUnit === 'in') {
            valueInMm = value * this.mmPerInch;
        } else if (fromUnit === 'px') {
            valueInMm = value * this.mmPerInch / this.dpi;
        }
        // If fromUnit is 'mm' or empty, no conversion needed

        // Convert from mm to target unit
        if (toUnit === 'in') {
            return valueInMm / this.mmPerInch;
        } else if (toUnit === 'px') {
            return valueInMm * this.dpi / this.mmPerInch;
        }

        // Default to mm
        return valueInMm;
    }

    // Normalize all shaper attributes in SVG to current unit system
    normalizeUnitsInSVG() {
        const svgClone = this.svgElement.cloneNode(true);
        const shaperNamespace = 'http://www.shapertools.com/namespaces/shaper';
        const elementsWithShaper = svgClone.querySelectorAll('[*|cutDepth], [*|cutOffset], [*|toolDia]');

        elementsWithShaper.forEach(element => {
            // Normalize common measurement attributes
            ['cutDepth', 'cutOffset', 'toolDia', 'feedRate'].forEach(attrName => {
                const value = element.getAttributeNS(shaperNamespace, attrName);
                if (value) {
                    const convertedValue = this.parseValueWithUnits(value, this.units);
                    if (convertedValue !== null) {
                        // Handle special cases
                        if (attrName === 'feedRate' && value.includes('/min')) {
                            element.setAttributeNS(shaperNamespace, `shaper:${attrName}`,
                                `${convertedValue.toFixed(1)}${this.units}/min`);
                        } else {
                            element.setAttributeNS(shaperNamespace, `shaper:${attrName}`,
                                `${convertedValue.toFixed(2)}${this.units}`);
                        }
                    }
                }
            });
        });

        return svgClone;
    }

    // Export Function
    exportSVG() {
        if (!this.svgData) return;

        // Normalize all units to current unit system before export
        const normalizedSVG = this.normalizeUnitsInSVG();
        const serializer = new XMLSerializer();
        const normalizedSVGData = serializer.serializeToString(normalizedSVG);

        const blob = new Blob([normalizedSVGData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `modified-shaper-${this.units}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        console.log(`Exported SVG with all measurements normalized to ${this.units}`);
    }

    // Keyboard Shortcuts
    handleKeyDown(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case '=':
                case '+':
                    event.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                    event.preventDefault();
                    this.zoomOut();
                    break;
                case '0':
                    event.preventDefault();
                    this.zoomToFit();
                    break;
                case 's':
                    event.preventDefault();
                    this.exportSVG();
                    break;
            }
        }

        if (event.key === 'Escape') {
            this.closeModal();
        }
    }

    // Tooltip Functions
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'shaper-tooltip';
        document.body.appendChild(this.tooltip);
    }

    showTooltip(path, mouseX, mouseY) {
        const shaperAttributes = this.getShaperAttributes(path);
        const measurements = this.getElementMeasurements(path);

        // Create tooltip content
        let content = '<div class="tooltip-title">Element Info</div>';

        // Add measurements section
        if (measurements) {
            content += '<div class="tooltip-section"><div class="section-title">Measurements</div>';
            measurements.forEach(measurement => {
                content += `
                    <div class="tooltip-measurement">
                        <span class="measurement-name">${measurement.name}:</span>
                        <span class="measurement-value">${measurement.value}</span>
                    </div>
                `;
            });
            content += '</div>';
        }

        // Add shaper attributes section
        content += '<div class="tooltip-section"><div class="section-title">Shaper Attributes</div>';
        if (shaperAttributes.length === 0) {
            content += '<div class="no-attributes">No shaper attributes defined<br>- click to change</div>';
        } else {
            shaperAttributes.forEach(attr => {
                content += `
                    <div class="tooltip-attribute">
                        <span class="attr-name">${attr.name}:</span>
                        <span class="attr-value">${attr.value}</span>
                    </div>
                `;
            });
        }
        content += '</div>';

        this.tooltip.innerHTML = content;
        // Position tooltip
        this.tooltip.style.left = (mouseX + 15) + 'px';
        this.tooltip.style.top = (mouseY - 10) + 'px';

        // Show tooltip with animation
        this.tooltip.classList.add('visible');
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
        }
    }

    updateTooltipPosition(mouseX, mouseY) {
        if (this.tooltip && this.tooltip.classList.contains('visible')) {
            this.tooltip.style.left = (mouseX + 15) + 'px';
            this.tooltip.style.top = (mouseY - 10) + 'px';
        }
    }

    getShaperAttributes(path) {
        const attributes = [];
        const shaperNamespace = 'http://www.shapertools.com/namespaces/shaper';

        // Check all attributes of the path
        for (let i = 0; i < path.attributes.length; i++) {
            const attr = path.attributes[i];
            if (attr.namespaceURI === shaperNamespace) {
                attributes.push({
                    name: attr.localName,
                    value: attr.value
                });
            }
        }

        return attributes;
    }

    extractPathCoordinates(pathData) {
        const coords = [];
        console.log('Parsing path data:', pathData);

        // Remove path commands and extract just the coordinate pairs
        // Handle commands like M, L, H, V, C, S, Q, T, A, Z
        const cleanData = pathData.replace(/[MmLlHhVvCcSsQqTtAaZz]/g, ' ');
        console.log('Cleaned path data:', cleanData);

        // Extract coordinate pairs with various separators
        const coordPattern = /(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/g;
        let match;

        while ((match = coordPattern.exec(cleanData)) !== null) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            coords.push({ x, y });
            console.log('Found coordinate:', { x, y });
        }

        console.log('Extracted coordinates:', coords);
        return coords;
    }

    getElementDimensions(element) {
        const tagName = element.tagName.toLowerCase();

        try {
            switch (tagName) {
                case 'rect':
                    const rectWidth = parseFloat(element.getAttribute('width') || 0);
                    const rectHeight = parseFloat(element.getAttribute('height') || 0);
                    return { width: rectWidth, height: rectHeight };

                case 'circle':
                    const radius = parseFloat(element.getAttribute('r') || 0);
                    return { width: radius * 2, height: radius * 2, radius: radius };

                case 'ellipse':
                    const rx = parseFloat(element.getAttribute('rx') || 0);
                    const ry = parseFloat(element.getAttribute('ry') || 0);
                    return { width: rx * 2, height: ry * 2, rx: rx, ry: ry };

                case 'line':
                    const x1 = parseFloat(element.getAttribute('x1') || 0);
                    const y1 = parseFloat(element.getAttribute('y1') || 0);
                    const x2 = parseFloat(element.getAttribute('x2') || 0);
                    const y2 = parseFloat(element.getAttribute('y2') || 0);
                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    // Calculate angle in degrees (0° = horizontal right, positive = counterclockwise)
                    const angleRadians = Math.atan2(y2 - y1, x2 - x1);
                    const angleDegrees = angleRadians * (180 / Math.PI);
                    return { length: length, angle: angleDegrees };

                case 'path':
                case 'polyline':
                case 'polygon':
                    // Try getBBox first
                    let bbox = element.getBBox();
                    console.log(`${tagName} getBBox result:`, bbox);

                    // If getBBox returns zero dimensions, try alternative methods
                    if (bbox.width === 0 || bbox.height === 0 || !bbox.width || !bbox.height) {
                        console.log('getBBox failed, trying alternative methods...');

                        // For paths, try manual parsing
                        if (tagName === 'path') {
                            const pathData = element.getAttribute('d');
                            if (pathData) {
                                const coords = this.extractPathCoordinates(pathData);
                                if (coords.length > 0) {
                                    const minX = Math.min(...coords.map(c => c.x));
                                    const maxX = Math.max(...coords.map(c => c.x));
                                    const minY = Math.min(...coords.map(c => c.y));
                                    const maxY = Math.max(...coords.map(c => c.y));

                                    bbox = {
                                        width: maxX - minX,
                                        height: maxY - minY
                                    };
                                    console.log('Manual path parsing result:', bbox);
                                }
                            }
                        }
                    }

                    return { width: bbox.width || 0, height: bbox.height || 0 };

                default:
                    const defaultBbox = element.getBBox();
                    return { width: defaultBbox.width || 0, height: defaultBbox.height || 0 };
            }
        } catch (error) {
            console.warn('Error getting element dimensions:', error);
            return { width: 0, height: 0 };
        }
    }

    getElementDescription(element) {
        const tagName = element.tagName.toLowerCase();

        try {
            const dimensions = this.getElementDimensions(element);

            switch (tagName) {
                case 'rect':
                    const rectWidth = this.pixelsToUnits(dimensions.width);
                    const rectHeight = this.pixelsToUnits(dimensions.height);
                    return `Rectangle - Width: ${this.formatGridNumber(rectWidth)}${this.units}, Height: ${this.formatGridNumber(rectHeight)}${this.units}`;

                case 'circle':
                    const radius = this.pixelsToUnits(dimensions.radius);
                    const diameter = this.pixelsToUnits(dimensions.width);
                    return `Circle: ⌀${this.formatGridNumber(diameter)}${this.units} (Radius: ${this.formatGridNumber(radius)}${this.units})`;

                case 'ellipse':
                    const ellipseWidth = this.pixelsToUnits(dimensions.width);
                    const ellipseHeight = this.pixelsToUnits(dimensions.height);
                    return `Ellipse - Width: ${this.formatGridNumber(ellipseWidth)}${this.units}, Height: ${this.formatGridNumber(ellipseHeight)}${this.units}`;

                case 'line':
                    const lineLength = this.pixelsToUnits(dimensions.length);
                    const lineAngle = dimensions.angle;
                    return `Line - Length: ${this.formatGridNumber(lineLength)}${this.units}, Angle: ${this.formatAngle(lineAngle)}°`;

                case 'polyline':
                case 'polygon':
                    const polyWidth = this.pixelsToUnits(dimensions.width);
                    const polyHeight = this.pixelsToUnits(dimensions.height);
                    const shapeName = tagName === 'polygon' ? 'Polygon' : 'Polyline';
                    return `${shapeName} - Width: ${this.formatGridNumber(polyWidth)}${this.units}, Height: ${this.formatGridNumber(polyHeight)}${this.units}`;

                case 'path':
                default:
                    const pathWidth = this.pixelsToUnits(dimensions.width);
                    const pathHeight = this.pixelsToUnits(dimensions.height);

                    if (pathWidth > 0 && pathHeight > 0) {
                        return `Path - Width: ${this.formatGridNumber(pathWidth)}${this.units}, Height: ${this.formatGridNumber(pathHeight)}${this.units}`;
                    } else {
                        // Fallback: analyze path data if available
                        const pathData = element.getAttribute('d');
                        if (pathData && pathData.trim()) {
                            return `Path: ${pathData.length} characters`;
                        }
                        const elementName = tagName === 'path' ? 'Path' : tagName.charAt(0).toUpperCase() + tagName.slice(1);
                        return `${elementName} Element`;
                    }
            }
        } catch (error) {
            console.warn('Error getting element description:', error);
            return `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} Element`;
        }
    }

    getElementMeasurements(element) {
        const measurements = [];
        const tagName = element.tagName.toLowerCase();

        try {
            const dimensions = this.getElementDimensions(element);

            switch (tagName) {
                case 'rect':
                    const rectWidth = this.pixelsToUnits(dimensions.width);
                    const rectHeight = this.pixelsToUnits(dimensions.height);
                    measurements.push(
                        { name: 'Width', value: this.formatWithUnits(rectWidth, 2) },
                        { name: 'Height', value: this.formatWithUnits(rectHeight, 2) }
                    );
                    break;

                case 'circle':
                    const radius = this.pixelsToUnits(dimensions.radius);
                    const diameter = this.pixelsToUnits(dimensions.width);
                    measurements.push(
                        { name: 'Diameter', value: this.formatWithUnits(diameter, 2) },
                        { name: 'Radius', value: this.formatWithUnits(radius, 2) }
                    );
                    break;

                case 'ellipse':
                    const ellipseWidth = this.pixelsToUnits(dimensions.width);
                    const ellipseHeight = this.pixelsToUnits(dimensions.height);
                    measurements.push(
                        { name: 'Width', value: this.formatWithUnits(ellipseWidth, 2) },
                        { name: 'Height', value: this.formatWithUnits(ellipseHeight, 2) }
                    );
                    break;

                case 'line':
                    const lineLength = this.pixelsToUnits(dimensions.length);
                    const lineAngle = dimensions.angle;
                    measurements.push(
                        { name: 'Length', value: this.formatWithUnits(lineLength, 2) },
                        { name: 'Angle', value: `${this.formatAngle(lineAngle)}°` }
                    );
                    break;

                case 'path':
                case 'polyline':
                case 'polygon':
                    const pathWidth = this.pixelsToUnits(dimensions.width);
                    const pathHeight = this.pixelsToUnits(dimensions.height);

                    if (pathWidth > 0 && pathHeight > 0) {
                        measurements.push(
                            { name: 'Width', value: this.formatWithUnits(pathWidth, 2) },
                            { name: 'Height', value: this.formatWithUnits(pathHeight, 2) }
                        );
                    } else {
                        measurements.push(
                            { name: 'Complex Shape', value: 'Measurements unavailable' }
                        );
                    }
                    break;

                default:
                    measurements.push(
                        { name: 'Element Type', value: tagName.toUpperCase() }
                    );
            }
        } catch (error) {
            console.warn('Error calculating measurements:', error);
            measurements.push(
                { name: 'Measurements', value: 'Error calculating' }
            );
        }

        return measurements;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SVGShaperEditor();
});